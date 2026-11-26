"use client";

/* ============================================================
   高意向客户雷达：统一匿名访客 ID
   - PV 埋点用 localStorage 的 jinyou_vid
   - AI 限流用另一套 jinyou_ai_vid（旧版留下，继续承担每天 3 次额度）
   两套 ID 不打通的话，同一个人「查 OE + 问 AI」会在雷达里裂成两个访客。
   本工具只做单向补写：缺 jinyou_vid 时把 jinyou_ai_vid 的值复制过去；
   **绝不修改 jinyou_ai_vid**，否则会重置客户的当日试用额度。
   ============================================================ */

const PV_KEY = "jinyou_vid";
const AI_KEY = "jinyou_ai_vid";
const LEGACY_PV_KEY = "qipei_vid";

/** 标准 UUID v4（老浏览器没有 crypto.randomUUID 时手动拼一个） */
export function newUuid(): string {
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

/** 雷达/埋点统一使用的访客 ID；隐私模式下用会话级缓存兜底 */
let cachedVid: string | null = null;

export function radarVisitorId(): string {
  try {
    let id = localStorage.getItem(PV_KEY);
    if (!id || id.length < 8) {
      id = localStorage.getItem(LEGACY_PV_KEY) || localStorage.getItem(AI_KEY) || "";
    }
    if (!id || id.length < 8) id = newUuid();
    localStorage.setItem(PV_KEY, id);   // 每次写回，完成旧 key 迁移
    cachedVid = id;
    return id;
  } catch {
    if (!cachedVid) cachedVid = newUuid();
    return cachedVid;
  }
}
