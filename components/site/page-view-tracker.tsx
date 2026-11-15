"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getStoredUtm } from "@/lib/utm";

/**
 * 轻量 PV 埋点（不影响页面加载）
 *
 * - 监听 pathname + searchParams 变化，每次切换静默打一次 /api/track
 * - referrer 只取来源域名（xiaohongshu.com / douyin.com / direct / internal）
 * - utm_source / medium / campaign：优先取当前 URL 参数，其次取首次落地时
 *   存下的渠道（首触归因），方便在小红书发帖时用不同链接区分笔记效果
 * - visitor_id：localStorage 里生成的匿名 UUID，只用于「同一个人算一次」，
 *   不含任何个人信息，也不与账号绑定（与《隐私政策》口径一致）
 * - 发送用 navigator.sendBeacon：浏览器空闲时投递，不占主线程、不阻塞渲染；
 *   不支持时降级为 keepalive fetch
 * - 全链路 try/catch 吞掉异常：统计失败绝不影响用户浏览
 */

/** 访客 ID 固定存这个 key：一次生成、长期复用，刷新/关页重开都不变 */
const VID_KEY = "jinyou_vid";
/** 老版本用的 key；读到就搬到新 key，避免升级当天把老访客算成两个人 */
const LEGACY_VID_KEY = "qipei_vid";
/** localStorage 被隐私模式禁用时的会话级兜底（至少本次会话内不漂移） */
let cachedVid: string | null = null;
/** 同源默认走 /api/track；站点与中控台分域时可用 NEXT_PUBLIC_TRACK_ENDPOINT 覆盖 */
const ENDPOINT = process.env.NEXT_PUBLIC_TRACK_ENDPOINT || "/api/track";

/** 只保留非 utm_* 的查询参数，避免 path 被渠道参数撑成上千种组合 */
function normalizePath(pathname: string, params: URLSearchParams): string {
  const kept = new URLSearchParams();
  params.forEach((v, k) => {
    if (!k.startsWith("utm_") && k !== "gclid" && k !== "fbclid") kept.append(k, v);
  });
  const qs = kept.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/** 来源域名：外部域名原样返回，站内跳转记 internal，无来源记 direct */
function referrerHost(isInternalNav: boolean): string {
  if (isInternalNav) return "internal";
  const raw = typeof document !== "undefined" ? document.referrer : "";
  if (!raw) return "direct";
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "");
    const self = window.location.hostname.replace(/^www\./, "");
    return host === self ? "internal" : host;
  } catch {
    return "direct";
  }
}

/** 标准 UUID v4（老浏览器没有 crypto.randomUUID 时手动拼一个） */
function newUuid(): string {
  const c: Crypto | undefined =
    typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const b = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(b);
  } else {
    for (let i = 0; i < 16; i += 1) b[i] = Math.floor(Math.random() * 256);
  }
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * 匿名访客 ID：每次上报都先读 localStorage 里的固定 ID，只有第一次才生成。
 * 绝不能在每次请求里现生成 UUID —— 那样 UV 会永远等于 PV。
 * 清缓存 / 换设备 / 换浏览器会变（属预期，与《隐私政策》口径一致）。
 */
function visitorId(): string {
  try {
    let id = localStorage.getItem(VID_KEY);
    if (!id || id.length < 8) {
      const legacy = localStorage.getItem(LEGACY_VID_KEY);
      if (legacy && legacy.length >= 8) id = legacy;
    }
    if (!id || id.length < 8) id = newUuid();
    // 每次都写回：既完成旧 key 迁移，也保证 ID 确实持久化
    localStorage.setItem(VID_KEY, id);
    cachedVid = id;
    return id;
  } catch {
    // 隐私模式禁用 localStorage：用会话级缓存兜底，而不是返回空串
    if (!cachedVid) cachedVid = newUuid();
    return cachedVid;
  }
}

function deviceType(): string {
  if (typeof navigator === "undefined") return "未知";
  return /iphone|android|mobile|ipad|harmony|micromessenger/i.test(navigator.userAgent)
    ? "移动端"
    : "桌面端";
}

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /** 上一次上报的路径，用于去重（React 严格模式下 effect 会跑两次） */
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const path = normalizePath(pathname, params);

    // 同一路径重复触发（严格模式 / 同页参数未变）直接跳过
    if (lastSent.current === path) return;
    const isInternalNav = lastSent.current !== null;
    lastSent.current = path;

    let stored: { utm_source?: string; utm_medium?: string; utm_campaign?: string } = {};
    try {
      stored = getStoredUtm();
    } catch {
      stored = {};
    }

    const utmSource = (params.get("utm_source")?.trim() || stored.utm_source?.trim() || "") as string;
    const utmMedium = (params.get("utm_medium")?.trim() || stored.utm_medium?.trim() || "") as string;
    const utmCampaign =
      (params.get("utm_campaign")?.trim() || stored.utm_campaign?.trim() || "") as string;

    const payload = JSON.stringify({
      type: "page_view",
      path,
      referrer: referrerHost(isInternalNav),
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      visitor_id: visitorId(),
      device: deviceType(),
      ts: new Date().toISOString(),
    });

    // 交给浏览器空闲投递，不等响应、不阻塞渲染
    const schedule = (cb: () => void) => {
      const w = window as unknown as {
        requestIdleCallback?: (fn: () => void, opts?: { timeout: number }) => number;
      };
      if (typeof w.requestIdleCallback === "function") {
        w.requestIdleCallback(cb, { timeout: 2000 });
      } else {
        window.setTimeout(cb, 0);
      }
    };

    schedule(() => {
      try {
        if (typeof navigator !== "undefined" && navigator.sendBeacon) {
          const blob = new Blob([payload], { type: "application/json" });
          if (navigator.sendBeacon(ENDPOINT, blob)) return;
        }
        fetch(ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      } catch {
        /* 统计失败不影响浏览 */
      }
    });
  }, [pathname, searchParams]);

  return null;
}
