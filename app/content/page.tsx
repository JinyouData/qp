import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CASE_STUDIES } from "@/lib/case-studies";
import { buildMetadata, KEYWORDS } from "@/lib/seo";
import { JsonLd, breadcrumbSchema } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/* ============================================================
   客户成果与数据洞察（原内容归档页，2026-11-08 重构）
   定位：对外信任页。只写已经交付的结果，不写待办与设想。
   不设表单、不设转化卡片，联系入口只在导航与悬浮条。
   ============================================================ */

export const metadata: Metadata = buildMetadata({
  title: "客户成果与数据洞察",
  description:
    "不是理论，是已经跑通的选品与降退货逻辑。平均退货率降低 18%、覆盖 200+ 细分品类、累计诊断 500+ SKU，附已交付卖家的真实反馈与量化结果。",
  path: "/content",
  keywords: [KEYWORDS.data, KEYWORDS.oe, KEYWORDS.sop, KEYWORDS.compliance],
});

/** 顶部三项硬指标：全部为已完成交付的口径 */
const METRICS = [
  {
    value: "18%",
    label: "平均退货率降低",
    note: "已交付卖家的适配错配排查后均值",
  },
  {
    value: "200+",
    label: "覆盖细分品类",
    note: "已完成价格带与竞争格局诊断的类目",
  },
  {
    value: "500+",
    label: "累计诊断 SKU",
    note: "已完成逐 SKU 毛利与适配校验的商品",
  },
];

export default function ContentPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "首页", url: "/" },
          { name: "客户成果与数据洞察", url: "/content" },
        ])}
      />

      <PageHero
        tag="CLIENT RESULTS"
        title="客户成果与数据洞察"
        desc="不是理论，是已经跑通的选品与降退货逻辑。以下是部分卖家的真实反馈。"
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {METRICS.map((m) => (
            <div
              key={m.label}
              className="rounded-2xl border border-brand-orange/15 bg-card p-5 shadow-warm"
            >
              <div className="text-3xl font-bold leading-none text-brand-green md:text-4xl">
                {m.value}
              </div>
              <div className="mt-2.5 text-sm font-semibold">{m.label}</div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.note}</p>
            </div>
          ))}
        </div>
        {/* 合规脚注：保持极弱视觉权重，不抢上方三个核心数据卡片的焦点 */}
        <p className="mt-4 text-xs font-normal leading-relaxed text-gray-400">
          数据来自已交付的选品诊断项目；客户名称与可识别信息均已脱敏。
        </p>
      </PageHero>

      {/* 核心案例区：只呈现已发生的结果 */}
      <section className="section-pad">
        <div className="container-site">
          <SectionHeading
            tag="已交付案例"
            title="三个已经跑通的场景"
            desc="客户身份、遇到的问题、调用了金游数据智库的哪部分数据、最后落到什么数字，都在下面。"
          />
          <div className="grid gap-5 lg:grid-cols-3">
            {CASE_STUDIES.map((c) => (
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
                      {c.audienceTags.map((t) => (
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
                      <p className="mt-1.5 text-sm leading-relaxed">{c.pain}</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">我们的数据方案</p>
                      <p className="mt-1.5 text-sm leading-relaxed">{c.solution}</p>
                    </div>

                    <div className="rounded-xl bg-brand-green-soft/75 px-4 py-3.5">
                      <div className="flex flex-wrap gap-x-8 gap-y-3">
                        {c.results.map((r) => (
                          <div key={r.label}>
                            <div className="text-2xl font-bold leading-none text-brand-green">
                              {r.value}
                            </div>
                            <div className="mt-1.5 text-xs text-muted-foreground">{r.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <blockquote className="mt-auto border-l-2 border-brand-orange/40 pl-3 text-sm italic leading-relaxed">
                      「{c.quote}」
                      <footer className="mt-2 text-xs not-italic text-muted-foreground">
                        — {c.author}
                      </footer>
                    </blockquote>

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-green">
                      阅读全文 <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
