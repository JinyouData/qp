"use client";

/* ============================================================
   事件追踪（客户端）
   - 同时推送给 GA4 / Plausible（配了哪个走哪个，可同时配）
   - 并用 sendBeacon 打一份到 /api/track，落 Supabase events 表，
     供 /admin 看板算转化率（分析平台只给了大盘，这里给的是自己的库）
   ============================================================ */

import { getStoredRef, getStoredUtm } from "./utm";
import { radarVisitorId } from "./visitor-id";

export type TrackEventName =
  | "form_submit" // 表单提交
  | "wechat_click" // 点击联系主理人 / 复制微信号
  | "third_party_click" // 跳转第三方成交页
  | "asset_download" // 资料下载/领取
  | "consult_click" // 历史咨询点击（保留兼容）
  | "ai_chat_open" // AI 问答打开
  | "oe_search" // 查看 / 检索 OE 号词条（高意向雷达真源之一）
  | "ai_question" // AI 提问（服务端主写，前端保留兼容）
  | "ladder_click"; // 产品阶梯点击

/** 全站唯一的收口动作：联系主理人（弹窗打开即上报 wechat_click） */

export interface TrackProps {
  [key: string]: string | number | boolean | undefined;
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    plausible?: (name: string, opts?: { props?: TrackProps }) => void;
  }
}

/** 统一事件上报入口 */
export function trackEvent(name: TrackEventName, props: TrackProps = {}): void {
  if (typeof window === "undefined") return;

  const payload = { ...props, page: window.location.pathname };

  // 1) GA4
  try {
    window.gtag?.("event", name, payload);
  } catch {}

  // 2) Plausible（自定义事件需先在后台建好同名 goal）
  try {
    window.plausible?.(name, { props: payload });
  } catch {}

  // 3) 自己的库（供后台看板）
  try {
    const stored = getStoredUtm();
    // 分销归因：把首触推广码附到每个事件，官网后台可看哪个渠道在带单。
    // 真正的订单绑定在中控台开户时完成（官网无支付下单，统一收口企微）。
    const ref = getStoredRef();
    // 事件也带统一访客 ID：即使 action_detail 列还没迁移，雷达仍能从 events 兜底聚合
    const unified = { ...payload, visitor_id: radarVisitorId(), ...(ref ? { ref_code: ref } : {}) };
    const body = JSON.stringify({
      event: name,
      props: unified,
      path: window.location.pathname,
      channel: stored.channel,
      referrer: stored.referrer ?? "",
      ts: new Date().toISOString(),
    });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      });
    }
  } catch {}
}

/** 站外跳转：先在分析里记一笔，再开新窗口 */
export function trackOutbound(
  name: TrackEventName,
  url: string,
  props: TrackProps = {}
): void {
  trackEvent(name, { ...props, url, platform: props.platform ?? "" });
}
