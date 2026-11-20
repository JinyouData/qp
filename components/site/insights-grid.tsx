import Link from "next/link";
import { ArrowRight, Clock, CalendarDays } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAllInsights, estimateReadingTime } from "@/lib/insights";

/* ============================================================
   行业深度观察 · 文章网格（只读展示版）

   供「汽配案例库」页的第二个 Tab 内嵌。文章详情仍由
   /insights/[slug] 渲染，但列表与内容都被搜索引擎在 /cases 抓到。
   ============================================================ */

export function InsightsGrid() {
  const items = getAllInsights();

  return (
    <section className="section-pad">
      <div className="container-site">
        <div className="mb-6">
          <h2 className="text-xl font-bold md:text-2xl">行业深度观察</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {items.length} 篇 · OE 号匹配、VIN 解析、新能源汽配、出海合规的一线方法
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((i) => (
            <Card key={i.slug} className="card-hover group">
              <Link href={`/insights/${i.slug}`} className="block h-full">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {i.tags.slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[11px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="text-lg font-bold leading-snug group-hover:text-primary">
                    {i.title}
                  </h3>
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                    {i.description}
                  </p>
                  <div className="mt-auto flex items-center gap-4 pt-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" /> {i.date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> 约 {i.readingTime ?? estimateReadingTime(i.words)} 分钟
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 text-primary">
                      阅读 <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
