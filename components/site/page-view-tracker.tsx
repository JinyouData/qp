"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getStoredRef, getStoredUtm } from "@/lib/utm";
import { radarVisitorId } from "@/lib/visitor-id";
import { trackEvent } from "@/lib/analytics";

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

    const vid = radarVisitorId();

    // 查看 OE 词条 = 一次真实检索动作：搜索词挂在同一条 PV 上，
    // PV 不重复计数；同时写一份 events 兜底（迁移未执行时雷达仍看得到）。
    const oeMatch = pathname.match(/^\/oe\/([^/?]+)/);
    const actionDetail = oeMatch
      ? { kind: "oe_search", detail: decodeURIComponent(oeMatch[1]).slice(0, 80) }
      : null;
    if (actionDetail) {
      trackEvent("oe_search", { detail: actionDetail.detail, visitor_id: vid });
    }

    const payload = JSON.stringify({
      type: "page_view",
      path,
      referrer: referrerHost(isInternalNav),
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      visitor_id: vid,
      // 分销首触：推广码随 PV 落到 action_detail，官网后台可按渠道看流量
      action_detail: actionDetail || (getStoredRef()
        ? { kind: "ref_visit", detail: getStoredRef() } : null),
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
