import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAllCaseCards } from "@/lib/case-studies";

/* ============================================================
   案例网格（只读展示版，供「智库洞察」的案例 Tab 内嵌）

   与 /cases 的极简卡片保持同一视觉口径；这里展示全部案例，
   不做筛选与分页，让爬虫在 /insights 也能抓到完整案例清单。
   ============================================================ */

export function CaseGridSimple() {
  const cases = getAllCaseCards();

  return (
    <section className="section-pad">
      <div className="container-site">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold md:text-2xl">客户案例库</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              共 {cases.length} 篇已交付案例 · 痛点、方案与可查证的量化结果
            </p>
          </div>
          <Link
            href="/cases"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-brand-green hover:underline"
          >
            进入完整案例库 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {cases.map((c) => (
            <Link
              key={c.slug}
              href={`/cases/${c.slug}`}
              className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50"
              aria-label={`阅读案例：${c.title}`}
            >
              <Card className="card-hover flex h-full border-brand-orange/10 group-hover:border-brand-green/40">
                <CardContent className="flex h-full flex-col p-5">
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
                  <h3 className="mt-2 line-clamp-2 min-h-[3rem] text-base font-bold leading-snug group-hover:text-primary">
                    {c.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 min-h-[2.75rem] text-sm leading-relaxed text-muted-foreground">
                    {c.summary}
                  </p>
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
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold text-brand-green">
                    阅读完整案例 <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
