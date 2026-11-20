import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, CalendarDays } from "lucide-react";

import { buildMetadata, KEYWORDS } from "@/lib/seo";
import { getAllInsights, estimateReadingTime } from "@/lib/insights";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { JsonLd, breadcrumbSchema } from "@/components/site/json-ld";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { InsightsTabs } from "@/components/site/insights-tabs";
import { CaseGridSimple } from "@/components/site/case-grid-simple";

export const metadata: Metadata = buildMetadata({
  title: "智库观察：真实客户案例与行业深度洞察",
  description:
    "金游数据智库统一内容入口：客户案例库的真实诊断结果，以及 OE 号匹配、VIN 解析、新能源汽配、出海数据合规等一线深度观察。本页已合并至 /cases。",
  path: "/cases",
  keywords: [KEYWORDS.data, KEYWORDS.oe, KEYWORDS.vin, KEYWORDS.nev, KEYWORDS.compliance, KEYWORDS.ai],
});

export default function InsightsPage() {
  const items = getAllInsights();

  const articles = (
    <section className="section-pad">
      <div className="container-site">
        <SectionHeading
          tag="全部文章"
          title={`共 ${items.length} 篇 · 持续更新`}
          desc="按主题阅读。每篇都配有可落地的清单或表格，读完就能用在自己的数据上。"
        />

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

        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            文章正在整理中，添加主理人企微，更新后第一时间发你。
          </p>
        ) : null}
      </div>
    </section>
  );

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "首页", url: "/" },
            { name: "智库洞察", url: "/insights" },
          ]),
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "汽配行业深度观察",
            itemListElement: items.map((i, idx) => ({
              "@type": "ListItem",
              position: idx + 1,
              url: `/insights/${i.slug}`,
              name: i.title,
            })),
          },
        ]}
      />

      <PageHero
        tag="INSIGHTS & CASES"
        title="智库洞察"
        desc="内容中心：客户案例库与行业深度观察。前者是已经跑通的诊断结果，后者是一线方法沉淀。"
      />

      <InsightsTabs cases={<CaseGridSimple />} articles={articles} />
    </>
  );
}
