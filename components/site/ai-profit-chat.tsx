"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, RotateCcw, Send, Sparkles, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  QUICK_ASKS,
  TRIAL_LIMIT,
  yuan,
  type CalcResult,
} from "@/lib/ai-profit";
import { AI_TOOLS, todayKey, type ToolType } from "@/lib/ai-tools";
import { WecomDialog } from "./wecom-dialog";

/* ============================================================
   工具库 AI 助手 · 通用极简对话框（四个工具共用）

   2026-11-15：三张死表格换成在线 AI 助手后，对话框按 tool_type
   参数化，复用同一份 UI、同一条 /api/ai-chat 接口与同一份额度账本。

   试用门槛：
   1. 浏览器 localStorage 即时拦截，按「北京时间当天」存次数
   2. 服务端 Supabase 持久化账本裁决，Edge 多实例共享、每天重置 3 次；
      清缓存换 visitorId 仍按出口 IP 的当天累计次数拦截
   前端上报的 used 只用于展示与离线兜底，篡改它无法给自己加次数；
   服务端返回 429 时回滚悬空提问、同步计数并弹企微二维码。
   ============================================================ */

/** v2：按天存 { day, used }；旧版纯数字 key 不再读取，避免旧累计次数卡住新额度 */
const USED_KEY = "jinyou_ai_trial_used_v2";
const VID_KEY = "jinyou_ai_vid";

type Mode = "live" | "mock" | "fallback" | undefined;
type Msg = { role: "user" | "assistant"; text: string; mode?: Mode; calc?: CalcResult };

function newVid(): string {
  try {
    const c = globalThis.crypto;
    if (c && typeof c.randomUUID === "function") return c.randomUUID();
  } catch {
    // 老浏览器降级
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function readUsed(): number {
  try {
    const raw = localStorage.getItem(USED_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { day?: string; used?: number };
    if (parsed?.day !== todayKey()) return 0; // 跨天自动重置
    const n = Number(parsed.used ?? 0);
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), TRIAL_LIMIT) : 0;
  } catch {
    return 0;
  }
}

function writeUsed(n: number) {
  try {
    localStorage.setItem(USED_KEY, JSON.stringify({ day: todayKey(), used: n }));
  } catch {
    // 隐私模式下 localStorage 不可用：服务端账本仍权威，不影响限流
  }
}

function CalcTable({ calc }: { calc: CalcResult }) {
  if (!calc.ok) return null;
  const positive = calc.grossProfit >= 0;
  return (
    <div className="mt-3 rounded-xl border bg-card/70 p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        测算明细 · 人民币 · 系统计算
      </p>
      <dl className="grid gap-1 text-xs">
        {calc.lines.map((l) => (
          <div key={l.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">
              {l.label}
              {l.note ? ` · ${l.note}` : ""}
            </dt>
            <dd className={l.amount < 0 ? "tabular-nums" : "font-semibold tabular-nums text-brand-green"}>
              {l.amount < 0 ? "−" : ""}
              {yuan(Math.abs(l.amount))}
            </dd>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-dashed pt-2">
          <dt className="font-bold">毛利 / 毛利率</dt>
          <dd className={`font-bold tabular-nums ${positive ? "text-brand-green" : "text-brand-red"}`}>
            {calc.grossProfit < 0 ? "−" : ""}
            {yuan(Math.abs(calc.grossProfit))} · {(calc.grossMargin * 100).toFixed(2)}%
          </dd>
        </div>
      </dl>
      {calc.assumed.length > 0 && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          估算假设：{calc.assumed.join("；")}
        </p>
      )}
    </div>
  );
}

/**
 * 通用对话框。tool 决定标题、快捷提问、占位文案、限流弹窗文案与是否展示测算表。
 * AiProfitChat 是核价助手的薄封装，保持既有页面的 import 不变。
 */
export function AiAssistantChat({ tool = "profit" }: { tool?: ToolType }) {
  const cfg = AI_TOOLS[tool];
  const quickAsks = tool === "profit" ? QUICK_ASKS : cfg.quickAsks;

  const [ready, setReady] = useState(false);
  const [vid, setVid] = useState("");
  const [used, setUsed] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [limitNotice, setLimitNotice] = useState(cfg.limitMessage);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // 计数与匿名 ID 都放 localStorage，避免 SSR 水合不一致
  useEffect(() => {
    let v = localStorage.getItem(VID_KEY);
    if (!v) {
      v = newVid();
      localStorage.setItem(VID_KEY, v);
    }
    setVid(v);
    setUsed(readUsed());
    setReady(true);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || loading || !ready) return;
    setError("");

    if (used >= TRIAL_LIMIT) {
      setLimitNotice(cfg.limitMessage);
      setLimitOpen(true);
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, visitorId: vid, used, tool_type: tool }),
      });
      const data = await res.json();

      if (res.status === 429 || data.error === "trial_limit") {
        // 服务端说次数已用完：回滚这条悬空提问，同步计数并弹二维码
        setMessages((prev) => prev.slice(0, -1));
        setUsed(TRIAL_LIMIT);
        writeUsed(TRIAL_LIMIT);
        setLimitNotice(typeof data.message === "string" ? data.message : cfg.limitMessage);
        setLimitOpen(true);
        return;
      }
      if (!res.ok || !data.reply) {
        throw new Error(typeof data.reply === "string" ? data.reply : "服务暂时不可用");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.reply, mode: data.mode, calc: cfg.showCalc ? data.calc : undefined },
      ]);
      const next =
        typeof data.remaining === "number" ? TRIAL_LIMIT - data.remaining : used + 1;
      setUsed(next);
      writeUsed(next);
      // 第 3 次回答照常展示，随后立刻弹出开通提示
      if (next >= TRIAL_LIMIT) {
        setLimitNotice(cfg.limitMessage);
        setLimitOpen(true);
      }
    } catch (e) {
      setError(`${e instanceof Error ? e.message : "网络异常"}（本次不计次数）`);
    } finally {
      setLoading(false);
    }
  }

  function resetTrial() {
    const v = newVid();
    localStorage.setItem(VID_KEY, v);
    localStorage.removeItem(USED_KEY);
    setVid(v);
    setUsed(0);
    setMessages([]);
    setError("");
    setLimitOpen(false);
    setInput("");
  }

  const remaining = Math.max(TRIAL_LIMIT - used, 0);
  // 让本地测试一眼看清：这次回复是真调了模型，还是走了内置演示引擎
  const lastMode = [...messages].reverse().find((m) => m.role === "assistant")?.mode;

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-warm sm:p-6">
      {/* 状态条 */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-green-soft text-brand-green">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">{cfg.name}</p>
          <p className="text-xs text-muted-foreground">{cfg.subtitle}</p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
            {remaining > 0 ? `每天免费 · 还剩 ${remaining} 次` : "今日免费次数已用完"}
          </span>
          {lastMode && (
            <span className="text-[10px] text-muted-foreground">
              {lastMode === "live"
                ? "已接入大模型 · 真实回复"
                : "规则引擎 · 结论按内置规则计算"}
            </span>
          )}
        </div>
      </div>

      {/* 消息区 */}
      <div
        ref={listRef}
        className="my-4 max-h-[440px] min-h-[220px] space-y-3 overflow-y-auto pr-1"
        aria-live="polite"
      >
        {messages.length === 0 && (
          <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
            <Bot className="h-8 w-8 text-brand-green/60" strokeWidth={1.5} />
            <p className="text-sm font-semibold">{cfg.emptyTitle}</p>
            <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{cfg.emptyHint}</p>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "assistant" && (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-green-soft text-brand-green">
                <Bot className="h-4 w-4" />
              </span>
            )}
            <div
              className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[78%] ${
                m.role === "user"
                  ? "bg-brand-green text-white"
                  : "border bg-muted/50 text-foreground"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.role === "assistant" && cfg.showCalc && m.calc && <CalcTable calc={m.calc} />}
              {m.role === "assistant" && m.mode && m.mode !== "live" && (
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                  当前未连接大模型：上游密钥未配置或暂不可用，结论由内置规则计算；测算与限流不受影响。
                </p>
              )}
            </div>
            {m.role === "user" && (
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                <UserRound className="h-4 w-4" />
              </span>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {cfg.loadingText}
          </div>
        )}
      </div>

      {/* 快捷提问 */}
      <div className="flex flex-wrap gap-2 border-t pt-4">
        {quickAsks.map((q) => (
          <button
            key={q.label}
            type="button"
            onClick={() => void ask(q.prompt)}
            disabled={loading}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand-green/50 hover:bg-brand-green-soft disabled:opacity-50"
          >
            {q.label}
          </button>
        ))}
      </div>

      {/* 输入区 */}
      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void ask(input);
            }
          }}
          rows={2}
          maxLength={1000}
          placeholder={cfg.placeholder}
          className="min-h-[64px] flex-1 resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-brand-green/50"
        />
        <Button variant="orange" onClick={() => void ask(input)} disabled={loading || !input.trim()} className="h-11 shrink-0">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          <span className="hidden sm:inline">发送</span>
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-brand-red">{error}</p>}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>{cfg.footerNote}</span>
        {process.env.NODE_ENV === "development" && (
          <button
            type="button"
            onClick={resetTrial}
            className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 font-medium hover:bg-secondary"
          >
            <RotateCcw className="h-3 w-3" /> 重置本地试用次数（仅开发环境可见）
          </button>
        )}
      </div>

      <WecomDialog
        open={limitOpen}
        onOpenChange={setLimitOpen}
        from={`ai-chat-trial-limit:${tool}`}
        subject={cfg.name}
        notice={limitNotice}
      />
    </div>
  );
}

/** 核价助手页面用的薄封装（保持既有 import 不变） */
export function AiProfitChat() {
  return <AiAssistantChat tool="profit" />;
}
