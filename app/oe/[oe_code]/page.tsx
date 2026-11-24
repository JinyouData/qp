import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  CarFront,
  CircleDollarSign,
  Info,
  MapPin,
  Sparkles,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { JsonLd, breadcrumbSchema } from "@/components/site/json-ld";
import { WecomCtaButton } from "@/components/site/wecom-dialog";
import { buildMetadata, CORE_KEYWORDS, SITE_URL } from "@/lib/seo";
import { getAllOeCodes, getOeEntry, type OeEntry } from "@/lib/oe-catalog";
import { getCaseStudy } from "@/lib/case-studies";
import { getInsight } from "@/lib/insights";

/* ============================================================
   OE 号词条页 /oe/[oe_code]

   - 数据来自 content/oe/*.mdx（gray-matter，服务端读取）
   - 每页独立静态 HTML（force-static + dynamicParams=false），
     generateStaticParams 枚举全部 OE 号，新增 MDX 即自动扩产
   - Product Schema 用 isAccessoryOrSparePartFor 承载适配车型
   - title 用 absolute 覆盖 layout template，严格符合指定格式
   ============================================================ */

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllOeCodes().map((oe_code) => ({ oe_code }));
}

export function generateMetadata({
  params,
}: {
  params: { oe_code: string };
}): Metadata {
  const entry = getOeEntry(params.oe_code);
  if (!entry) return { title: "OE 号词条不存在" };

  const title = `${entry.oeCode} 适配什么车型？跨境利润怎么样？_金游数据智库`;
  const description = `${entry.oeCode}（${entry.partName}）适配车型与跨境利润分析：黄金毛利带 ${entry.goldenMargin}，${entry.market}需求特征、${entry.sourceRegion}供应链口径，以及上架前的 OE 号三层校验要点。`;

  // 保留 buildMetadata 的 canonical / OG / keywords 等，仅用 absolute 覆盖 title
  // 避免 layout 的 `%s | 汽配知识局` template 追加后缀。
  const base = buildMetadata({
    title,
    description,
    path: `/oe/${entry.oeCode}`,
    keywords: [
      entry.oeCode,
      `${entry.oeCode} 适配车型`,
      `${entry.oeCode} 利润`,
      entry.partName,
      "OE号匹配",
      ...CORE_KEYWORDS,
    ],
  });

  return {
    ...base,
    title: { absolute: title },
    openGraph: {
      ...(typeof base.openGraph === "object" ? base.openGraph : {}),
      title,
    },
    twitter: {
      ...(typeof base.twitter === "object" ? base.twitter : {}),
      title,
    },
  };
}

/** Product 结构化数据：适配车型写入 isAccessoryOrSparePartFor */
function oeProductSchema(entry: OeEntry) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${entry.oeCode} ${entry.partName}`,
    description: `${entry.oeCode} 适配车型与跨境利润分析，黄金毛利带 ${entry.goldenMargin}。`,
    sku: entry.oeCode,
    category: entry.category,
    brand: { "@type": "Brand", name: "金游数据智库" },
    isAccessoryOrSparePartFor: entry.fitments.map((f) => ({
      "@type": "Car",
      name: `${f.brand} ${f.model} ${f.years}`.trim(),
      brand: { "@type": "Brand", name: f.brand },
      model: f.model,
      // 真实索引不含年款，只有明确的 4 位年份才写入，避免非法 schema 值
      ...(/^\d{4}(-\d{4})?$/.test(f.years) ? { vehicleModelDate: f.years } : {}),
    })),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "CNY",
      availability: "https://schema.org/InStock",
      url: `${SITE_URL}/contact`,
    },
    additionalProperty: [
      { "@type": "PropertyValue", name: "黄金毛利带", value: entry.goldenMargin },
      { "@type": "PropertyValue", name: "主要市场", value: entry.market },
      { "@type": "PropertyValue", name: "源头供应链", value: entry.sourceRegion },
    ],
  };
}

/** 相关行业洞察：同时查深度观察与案例库，按配置顺序展示 */
function relatedLinks(entry: OeEntry) {
  return entry.relatedInsights
    .map((slug) => {
      const insight = getInsight(slug);
      if (insight) {
        return { slug, title: insight.meta.title, href: `/insights/${slug}`, kind: "深度观察" };
      }
      const study = getCaseStudy(slug);
      if (study) {
        return { slug, title: study.title, href: `/cases/${slug}`, kind: "客户案例" };
      }
      return null;
    })
    .filter((x): x is { slug: string; title: string; href: string; kind: string } => x !== null);
}

export default function OeCodePage({ params }: { params: { oe_code: string } }) {
  const entry = getOeEntry(params.oe_code);
  if (!entry) notFound();

  const related = relatedLinks(entry);

  return (
    <>
      <JsonLd
        data={[
          oeProductSchema(entry),
          breadcrumbSchema([
            { name: "首页", url: "/" },
            { name: "OE 号词条库", url: "/oe" },
            { name: entry.oeCode, url: `/oe/${entry.oeCode}` },
          ]),
        ]}
      />

      {/* 面包屑 */}
      <div className="border-b bg-brand-cream">
        <div className="container-site flex items-center gap-2 py-3 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">首页</Link>
          <span>/</span>
          <Link href="/oe" className="hover:text-primary">OE 号词条库</Link>
          <span>/</span>
          <span className="font-medium text-foreground">{entry.oeCode}</span>
        </div>
      </div>

      <section className="section-pad">
        <div className="container-site grid gap-8 lg:grid-cols-[1fr_340px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[11px]">OE 号词条</Badge>
              <span className="text-xs text-muted-foreground">{entry.category}</span>
              {entry.isDemo && (
                <span className="rounded-full bg-brand-orange-soft px-2.5 py-1 text-[11px] font-semibold text-brand-orange-ink">
                  模板演示数据
                </span>
              )}
            </div>

            <h1 className="mt-4 break-all text-xl font-bold leading-tight sm:text-3xl">
              {entry.oeCode} 适配车型与跨境利润分析
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {entry.partName} · 黄金毛利带 {entry.goldenMargin} · {entry.market}
            </p>

            {/* 核心卡片 */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Card>
                <CardContent className="flex items-start gap-3 p-5">
                  <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" strokeWidth={1.6} />
                  <div>
                    <div className="text-xs text-muted-foreground">配件名称</div>
                    <div className="mt-1 text-lg font-bold">{entry.partName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{entry.category}</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-start gap-3 p-5">
                  <CircleDollarSign className="mt-0.5 h-5 w-5 shrink-0 text-brand-orange-ink" strokeWidth={1.6} />
                  <div>
                    <div className="text-xs text-muted-foreground">黄金毛利带</div>
                    <div className="mt-1 text-lg font-bold text-brand-green">{entry.goldenMargin}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      按全成本模型测算，实际以核价复核为准
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 适配表格 */}
            <div className="mt-8">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <CarFront className="h-5 w-5 text-brand-green" strokeWidth={1.6} />
                适配车型对照表
              </h2>
              <div className="mt-4 overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-secondary/60 text-left">
                    <tr>
                      <th className="px-4 py-3 font-semibold">品牌</th>
                      <th className="px-4 py-3 font-semibold">车型</th>
                      <th className="px-4 py-3 font-semibold">年份</th>
                      <th className="px-4 py-3 font-semibold">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entry.fitments.map((f, i) => (
                      <tr key={`${f.brand}-${f.model}-${i}`} className="border-t">
                        <td className="px-4 py-3 font-medium">{f.brand}</td>
                        <td className="px-4 py-3">{f.model}</td>
                        <td className="px-4 py-3">{f.years}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{f.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                适配关系需按 OE 号、车型年款、渠道口径三层校验后再上架；演示数据不作为真实适配声明。
              </p>
            </div>

            {/* AI 总结区 */}
            <div className="mt-8">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Sparkles className="h-5 w-5 text-brand-orange-ink" strokeWidth={1.6} />
                AI 选品价值总结
              </h2>
              <div className="mt-4 space-y-4 rounded-lg border bg-brand-green-soft/40 p-5">
                {entry.aiSummary.map((para, i) => (
                  <p key={i} className="text-sm leading-relaxed text-foreground/90">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧 sticky 信息卡 */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardContent className="space-y-4 p-5 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">主要市场</div>
                  <div className="mt-1 flex items-center gap-1.5 font-semibold">
                    <MapPin className="h-4 w-4 text-brand-green" strokeWidth={1.6} />
                    {entry.market}
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="text-xs text-muted-foreground">源头供应链</div>
                  <div className="mt-1 font-semibold">{entry.sourceRegion}</div>
                </div>
                <div className="border-t pt-4">
                  <div className="text-xs text-muted-foreground">零售参考口径</div>
                  <div className="mt-1 text-xs leading-relaxed">{entry.retailReference}</div>
                </div>
                <div className="border-t pt-4">
                  <BadgeCheck className="mb-2 h-5 w-5 text-brand-green" strokeWidth={1.6} />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    三层校验：OE 唯一性 → 年款一致性 → 渠道口径一致性。任一层不通过，不上架。
                  </p>
                </div>
                <div className="border-t pt-4">
                  <WecomCtaButton
                    size="default"
                    label="联系主理人查底价"
                    from={`oe:${entry.oeCode}`}
                    subject={`${entry.oeCode} 底价与适配数据查询`}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </section>

      {/* 相关行业洞察 + 留资 */}
      <section className="section-pad bg-brand-cream">
        <div className="container-site">
          <h2 className="text-xl font-bold sm:text-2xl">该 OE 号的相关行业洞察</h2>
          {related.length > 0 ? (
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={r.href}
                    className="card-hover flex h-full items-start justify-between gap-3 rounded-lg border bg-card p-4 text-sm font-semibold leading-snug hover:text-primary"
                  >
                    <span>
                      <span className="mr-2 text-[11px] font-normal text-muted-foreground">{r.kind}</span>
                      {r.title}
                    </span>
                    <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">暂无关联洞察，持续更新中。</p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-lg border bg-card p-5">
            <div className="mr-auto">
              <div className="font-semibold">想查这个 OE 号的真实底价与适配数据？</div>
              <p className="mt-1 text-xs text-muted-foreground">
                加主理人企微，按 OE 号查 312 万 SKU 底层库与供货商评级。
              </p>
            </div>
            <WecomCtaButton
              size="default"
              label="联系主理人查底价"
              from={`oe:${entry.oeCode}:bottom`}
              subject={`${entry.oeCode} 底价与适配数据查询`}
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/oe"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> 返回 OE 号词条库
            </Link>
            <Link
              href="/tools/ai-oe-match"
              className="inline-flex items-center gap-1 text-sm text-brand-green hover:underline"
            >
              用 AI OE 码匹配助手做风险提示 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
