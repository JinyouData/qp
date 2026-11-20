"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CaseStudyEntry } from "@/lib/case-studies";

/* ============================================================
   案例库：按标签聚合筛选

   - 标签来自全部案例的 frontmatter，自动聚合，无需手工维护
   - 点击标签即时筛选，并把 ?tag= 写回 URL，便于分享与搜索引擎发现
   - 案例卡片点击进 /cases/[slug] 独立详情页
   ============================================================ */

export function CaseLibrary({
  cases,
  tags,
}: {
  cases: CaseStudyEntry[];
  tags: Array<{ tag: string; count: number }>;
}) {
  // 注意：这里刻意不用 next/navigation 的 useSearchParams —— 它会让静态路由在构建期
  // 退化为纯客户端渲染，导致爬虫在 HTML 里看不到案例列表。改为从 window.location 读取，
  // 页面本身完整静态预渲染全部案例，筛选只在客户端进行。
  const [active, setActive] = useState("");

  useEffect(() => {
    const read = () => new URLSearchParams(window.location.search).get("tag") ?? "";
    setActive(read());
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  function choose(tag: string) {
    setActive(tag);
    const url = tag ? `/cases?tag=${encodeURIComponent(tag)}` : "/cases";
    window.history.replaceState(null, "", url);
  }

  const filtered = useMemo(
    () => (active ? cases.filter((c) => c.tags.includes(active)) : cases),
    [active, cases]
  );

  return (
    <section className="section-pad">
      <div className="container-site">
        {/* 标签筛选条 */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => choose("")}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              active === ""
                ? "border-brand-green bg-brand-green text-white"
                : "border-border bg-card text-muted-foreground hover:border-brand-green/50 hover:text-foreground"
            }`}
            aria-pressed={active === ""}
          >
            全部 <span className="ml-1 opacity-70">{cases.length}</span>
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

        {/* 当前筛选结果计数 */}
        <p className="mb-5 text-xs text-muted-foreground">
          {active ? (
            <>
              标签 <span className="font-semibold text-foreground">#{active}</span> 下共{" "}
              {filtered.length} 篇案例
            </>
          ) : (
            <>共 {filtered.length} 篇已交付案例，按标签筛选查看相关场景</>
          )}
        </p>

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            该标签下暂无案例，试试其他标签。
          </p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.slug}
                href={`/cases/${c.slug}`}
                className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50"
                aria-label={`阅读案例：${c.title}`}
              >
                <Card className="card-hover h-full border-brand-orange/10 group-hover:border-brand-green/40">
                  <CardContent className="flex h-full flex-col gap-4 p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="mr-1 text-[11px] font-bold tracking-[0.16em] text-brand-orange-ink">
                        {c.no}
                      </span>
                      {c.tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary" className="font-medium">
                          {t}
                        </Badge>
                      ))}
                    </div>

                    <h3 className="text-base font-bold leading-snug group-hover:text-primary">
                      {c.title}
                    </h3>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">客户痛点</p>
                      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed">{c.pain}</p>
                    </div>

                    <div className="rounded-xl bg-brand-green-soft/75 px-4 py-3.5">
                      <div className="flex flex-wrap gap-x-8 gap-y-3">
                        {c.results.map((r) => (
                          <div key={r.label}>
                            <div className="text-2xl font-bold leading-none text-brand-green">
                              {r.value}
                            </div>
                            <div className="mt-1.5 text-xs text-muted-foreground">
                              {r.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {c.tags.slice(0, 4).map((t) => (
                        <span key={t} className="text-[11px] text-muted-foreground">
                          #{t}
                        </span>
                      ))}
                    </div>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-green">
                      阅读全文 <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
