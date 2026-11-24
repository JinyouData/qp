"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Pagination } from "@/components/site/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CaseCardData } from "@/lib/case-studies";

/* ============================================================
   案例库 · 极简目录

   - 卡片只保留四元素：标签 / 标题 / 一句话摘要 / 最多 2 个结果数据
   - 固定高度 + 网格对齐，为 100+ 案例做铺垫
   - 分页由 Server Component 静态预生成（/cases、/cases/page/2…），
     每页独立 HTML，爬虫可抓取；本组件只负责筛选与展示，不碰 useSearchParams
   ============================================================ */

/** 单个案例卡片：从主组件抽出，供折叠区与常规区复用，保证 DOM 结构一致 */
function CaseCard({ c }: { c: CaseCardData }) {
  return (
    <Link
      href={`/cases/${c.slug}`}
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50"
      aria-label={`阅读案例：${c.title}`}
    >
      <Card className="card-hover flex h-full border-brand-orange/10 group-hover:border-brand-green/40">
        <CardContent className="flex h-full flex-col p-5">
          {/* 1) 标签 */}
          <div className="flex h-7 flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold tracking-[0.14em] text-brand-orange-ink">
              {c.no}
            </span>
            {c.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="secondary" className="px-2 py-0.5 text-[11px]">
                {t}
              </Badge>
            ))}
          </div>

          {/* 2) 标题：固定两行 */}
          <h3 className="mt-2 line-clamp-2 min-h-[3rem] text-base font-bold leading-snug group-hover:text-primary">
            {c.title}
          </h3>

          {/* 3) 一句话摘要：固定两行 */}
          <p className="mt-1 line-clamp-2 min-h-[2.75rem] text-sm leading-relaxed text-muted-foreground">
            {c.summary}
          </p>

          {/* 4) 最多两个核心结果 */}
          <div className="mt-3 flex min-h-[3.25rem] items-start gap-6 border-t pt-3">
            {c.results.map((r) => (
              <div key={r.label}>
                <div className="text-xl font-bold leading-none text-brand-green">
                  {r.value}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{r.label}</div>
              </div>
            ))}
          </div>

          {/* 统一底部入口 */}
          <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-brand-green">
            阅读完整案例 <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

export function CaseLibrary({
  /** 当前服务端页的案例（用于无筛选时的默认展示，保证 SSR 与爬虫可见） */
  pageCases,
  /** 全部案例的精简数据，供客户端即时筛选 */
  allCases,
  tags,
  currentPage,
  totalPages,
  /** 分页链接基础路径，如 /cases/page/；第 1 页固定为 /cases */
  pageBase,
}: {
  pageCases: CaseCardData[];
  allCases: CaseCardData[];
  tags: Array<{ tag: string; count: number }>;
  currentPage: number;
  totalPages: number;
  pageBase: string;
}) {
  const [active, setActive] = useState("");
  /** 移动端折叠状态：仅控制 CSS 展示，卡片 DOM 始终存在（SEO 友好） */
  const [expanded, setExpanded] = useState(false);
  const pageHref = (p: number) => (p === 1 ? "/cases" : `${pageBase}${p}`);

  // 标签筛选仅作用于已加载案例；从 URL 读取初始标签，不触发 CSR bailout
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

  // 有标签时：在当前服务端页内即时过滤；无标签时：显示该页完整案例
  const shown = useMemo(
    () => (active ? pageCases.filter((c) => c.tags.includes(active)) : pageCases),
    [active, pageCases]
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
                全部 <span className="ml-1 opacity-70">{allCases.length}</span>
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
                  #{active}：本页匹配 <span className="font-semibold text-foreground">{shown.length}</span> 篇
                </>
              ) : (
                <>共 {allCases.length} 篇案例 · 第 {currentPage}/{totalPages} 页</>
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
            本页没有匹配「{active}」的案例，切换到其他页或清除筛选试试。
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {shown.slice(0, 3).map((c) => (
              <CaseCard key={c.slug} c={c} />
            ))}

            {shown.length > 3 && (
              <div
                className="case-extra-wrap md:contents"
                data-open={expanded ? "true" : "false"}
              >
                <div className="case-extra-inner flex flex-col gap-4 md:contents">
                  {shown.slice(3).map((c) => (
                    <CaseCard key={c.slug} c={c} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 移动端展开/收起：仅折叠 CSS 展示，卡片 DOM 始终在 HTML 中 */}
        {shown.length > 3 && (
          <div className="mt-4 flex justify-center md:hidden">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-green/40 bg-brand-green-soft/50 px-6 text-sm font-semibold text-brand-green transition-colors hover:bg-brand-green-soft"
            >
              {expanded ? (
                <>收起案例 <ArrowUp className="h-4 w-4" /></>
              ) : (
                <>展开更多案例 <ArrowDown className="h-4 w-4" /></>
              )}
            </button>
          </div>
        )}

        {/* 分页：服务端静态链接，保证每一页都能被爬虫抓取；移动端收缩为单行 */}
        {!active && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageHref={pageHref}
            label="案例分页"
          />
        )}
      </div>
    </section>
  );
}
