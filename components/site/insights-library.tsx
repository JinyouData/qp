"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Insight } from "@/lib/insights";

/** 与 lib/insights 中同逻辑；此处内联避免把 node:fs 打进客户端 bundle */
function estimateReadingTime(words: number): number {
  return Math.max(1, Math.round(words / 400));
}

/* ============================================================
   智库深度观察 · 可筛选文章列表（客户端交互版）

   与 CaseLibrary 的 UI 完全对齐：
   - 顶部横向标签胶囊（含「全部 X」），点击写入 ?tag=
   - 统计行「共 X 篇观察 · 第 N/M 页」
   - 文章卡片网格（保留日期 / 阅读时长）
   - 底部分页：服务端静态链接，每页独立 HTML，爬虫可完整抓取
   卡片 DOM 始终存在（筛选只是隐藏），不影响 SEO。
   ============================================================ */

function InsightCard({ item }: { item: Insight }) {
  return (
    <Card className="card-hover group h-full">
      <Link href={`/insights/${item.slug}`} className="block h-full">
        <CardContent className="flex h-full flex-col p-5">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="secondary" className="text-[11px]">
                {t}
              </Badge>
            ))}
          </div>
          <h3 className="text-lg font-bold leading-snug group-hover:text-primary">
            {item.title}
          </h3>
          <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
            {item.description}
          </p>
          <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {item.date}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> 约{" "}
              {item.readingTime ?? estimateReadingTime(item.words)} 分钟
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-primary">
              阅读 <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}

export function InsightsLibrary({
  /** 当前服务端页的文章（无筛选时展示，保证 SSR 与爬虫可见） */
  pageItems,
  /** 全部文章精简数据，供统计行使用 */
  allItems,
  tags,
  currentPage,
  totalPages,
  /** 分页链接基础路径，如 /insights/page/；第 1 页固定为 /insights（经中间件 301 到 /cases） */
  pageBase,
}: {
  pageItems: Insight[];
  allItems: Insight[];
  tags: Array<{ tag: string; count: number }>;
  currentPage: number;
  totalPages: number;
  pageBase: string;
}) {
  const [active, setActive] = useState("");
  const pageHref = (p: number) => (p === 1 ? "/cases" : `${pageBase}${p}`);

  // 从 URL 读取初始标签，不触发 CSR bailout
  useEffect(() => {
    const read = () => new URLSearchParams(window.location.search).get("tag") ?? "";
    setActive(read());
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  function choose(tag: string) {
    setActive(tag);
    const url = tag
      ? `${pageHref(currentPage)}?tag=${encodeURIComponent(tag)}`
      : pageHref(currentPage);
    window.history.replaceState(null, "", url);
  }

  // 标签筛选仅作用于当前服务端页，与 CaseLibrary 行为一致
  const shown = useMemo(
    () => (active ? pageItems.filter((i) => i.tags.includes(active)) : pageItems),
    [active, pageItems]
  );

  return (
    <section className="section-pad">
      <div className="container-site">
        {/* 标签筛选：横向可滑动胶囊，不换行、不撑高页面 */}
        <div className="mb-6">
          <div className="-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max items-center gap-2">
              <button
                type="button"
                onClick={() => choose("")}
                className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  active === ""
                    ? "border-brand-green bg-brand-green text-white"
                    : "border-border bg-card text-muted-foreground hover:border-brand-green/50 hover:text-foreground"
                }`}
                aria-pressed={active === ""}
              >
                全部 <span className="ml-1 opacity-70">{allItems.length}</span>
              </button>
              {tags.map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => choose(tag)}
                  className={`min-h-11 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    active === tag
                      ? "border-brand-green bg-brand-green text-white"
                      : "border-border bg-card text-muted-foreground hover:border-brand-green/50 hover:text-foreground"
                  }`}
                  aria-pressed={active === tag}
                >
                  #{tag} <span className="ml-1 opacity-70">{count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {active ? (
                <>
                  #{active}：本页匹配{" "}
                  <span className="font-semibold text-foreground">{shown.length}</span> 篇
                </>
              ) : (
                <>
                  共 {allItems.length} 篇观察 · 第 {currentPage}/{totalPages} 页
                </>
              )}
            </span>
            {active && (
              <button
                type="button"
                onClick={() => choose("")}
                className="inline-flex items-center gap-1 text-brand-green hover:underline"
              >
                <X className="h-3 w-3" /> 清除筛选
              </button>
            )}
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            本页没有匹配「{active}」的观察，切换到其他页或清除筛选试试。
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {shown.map((item) => (
              <InsightCard key={item.slug} item={item} />
            ))}
          </div>
        )}

        {/* 分页：服务端静态链接，保证每一页都能被爬虫抓取 */}
        {!active && totalPages > 1 && (
          <nav className="mt-10 flex justify-center" aria-label="深度观察分页">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {currentPage > 1 ? (
                <Link
                  href={pageHref(currentPage - 1)}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-4 text-sm text-muted-foreground hover:border-brand-green/50 hover:text-foreground"
                >
                  <ChevronLeft className="h-4 w-4" /> 上一页
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-4 text-sm text-muted-foreground/40">
                  <ChevronLeft className="h-4 w-4" /> 上一页
                </span>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageHref(p)}
                  aria-current={p === currentPage ? "page" : undefined}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border text-sm ${
                    p === currentPage
                      ? "border-brand-green bg-brand-green text-white"
                      : "text-muted-foreground hover:border-brand-green/50 hover:text-foreground"
                  }`}
                >
                  {p}
                </Link>
              ))}

              {currentPage < totalPages ? (
                <Link
                  href={pageHref(currentPage + 1)}
                  className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-4 text-sm text-muted-foreground hover:border-brand-green/50 hover:text-foreground"
                >
                  下一页 <ChevronRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-4 text-sm text-muted-foreground/40">
                  下一页 <ChevronRight className="h-4 w-4" />
                </span>
              )}
            </div>
          </nav>
        )}
      </div>
    </section>
  );
}
