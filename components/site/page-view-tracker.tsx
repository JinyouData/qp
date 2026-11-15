"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { getStoredUtm } from "@/lib/utm";

/**
 * 轻量 PV 埋点（不影响页面加载）
 *
 * - 监听 pathname + searchParams 变化，每次切换静默打一次 /api/track
 * - referrer 只取来源域名（xiaohongshu.com / douyin.com / direct / internal）
 * - utm_source 优先取当前 URL 参数，其次取首次落地时存下的渠道（首触归因），
 *   方便在小红书发帖时用不同链接区分笔记效果
 * - 发送用 navigator.sendBeacon：浏览器在空闲时投递，不占主线程、不阻塞渲染；
 *   不支持时降级为 keepalive fetch
 * - 全链路 try/catch 吞掉异常：统计失败绝不影响用户浏览
 */

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

    const utmFromUrl = params.get("utm_source");
    let utmSource = utmFromUrl?.trim() || "";
    if (!utmSource) {
      // 首触归因：用户第一次带 utm 进来后，站内后续浏览仍算同一渠道
      try {
        utmSource = getStoredUtm().utm_source?.trim() || "";
      } catch {
        utmSource = "";
      }
    }

    const payload = JSON.stringify({
      type: "page_view",
      path,
      referrer: referrerHost(isInternalNav),
      utm_source: utmSource || null,
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
          if (navigator.sendBeacon("/api/track", blob)) return;
        }
        fetch("/api/track", {
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
