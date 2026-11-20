import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays, Quote } from "lucide-react";

import { buildMetadata } from "@/lib/seo";
import {
  CASE_STUDIES,
  getAllCaseStudySlugs,
  getCaseStudy,
  type CaseStudyEntry,
} from "@/lib/case-studies";
import {
  JsonLd,
  articleSchema,
  breadcrumbSchema,
  caseProductSchema,
} from "@/components/site/json-ld";
import { BRAND } from "@/lib/brand";
import { WecomCtaButton } from "@/components/site/wecom-dialog";
import { Badge } from "@/components/ui/badge";

/* ============================================================
   案例词条详情页（SEO 独立收录落地点）

   每个 slug 一个静态页：<title> / description / H1 / Article JSON-LD
   四段固定结构：客户痛点与背景 → 数据诊断方案 → 真实量化结果 → 主理人点评
   底部统一企微 CTA，不设表单、不做站外跳转。
   ============================================================ */

// Cloudflare Pages：只发布预渲染页，未列出的 slug 直接 404
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getAllCaseStudySlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const found = getCaseStudy(params.slug);
  if (!found) return { title: "案例不存在" };

  return buildMetadata({
    title: found.title,
    description: found.description,
    path: `/cases/${found.slug}`,
    keywords: found.tags,
    type: "article",
    publishedTime: found.date,
  });
}

/** 四段固定结构 —— 段落数组统一渲染，避免各词条排版漂移 */
const SECTIONS: Array<{
  index: string;
  label: string;
  key: keyof Pick<
    CaseStudyEntry,
    "background" | "diagnosis" | "outcome" | "commentary"
  >;
}> = [
  { index: "01", label: "客户痛点与背景", key: "background" },
  { index: "02", label: "数据诊断方案", key: "diagnosis" },
  { index: "03", label: "真实量化结果", key: "outcome" },
  { index: "04", label: "主理人点评", key: "commentary" },
];

export default function CaseDetailPage({ params }: { params: { slug: string } }) {
  const found = getCaseStudy(params.slug);
  if (!found) notFound();

  const others = CASE_STUDIES.filter((c) => c.slug !== found.slug);

  return (
    <>
      <JsonLd
        data={[
          articleSchema({
            title: found.title,
            description: found.description,
            slug: found.slug,
            path: `/cases/${found.slug}`,
            date: found.date,
            tags: found.tags,
            author: BRAND.thinkTank,
            about: caseProductSchema({
              name: `${found.tags.join(" · ")} · 汽配数据诊断案例`,
              description: found.solution,
              properties: [
                ...found.results.map((r) => ({ name: r.label, value: r.value })),
                // 校验口径里的「OE 号 / 适配关系 / 价格带 / 毛利区间」以文字参数披露：
                // 案例不提供具体 OE 号，不编造数值，只把真实口径写进 additionalProperty。
                { name: "数据校验口径", value: found.solution },
              ],
            }),
          }),
          breadcrumbSchema([
            { name: "首页", url: "/" },
            { name: "客户成果与洞察", url: "/content" },
            { name: found.title, url: `/cases/${found.slug}` },
          ]),
        ]}
      />

      <article>
        {/* 案例头：H1 与 description 与 <title> 同源，保证 SEO 三处一致 */}
        <header className="border-b bg-brand-cream">
          <div className="container-site max-w-3xl pb-14 pt-10 md:pb-20 md:pt-14">
            <Link
              href="/content"
              className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> 返回客户成果
            </Link>

            <div className="mb-3 flex flex-wrap gap-1.5">
              {found.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
            </div>

            <h1 className="text-2xl font-bold leading-tight md:text-4xl">{found.title}</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              {found.description}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" /> {found.date}
              </span>
              <span>{found.author}</span>
              <span className="rounded-full bg-white px-2.5 py-1 font-medium text-brand-orange-ink">
                {found.no}
              </span>
            </div>
          </div>
        </header>

        {/* 正文：四段固定结构。底部留 ≥80px 安全区，避免移动端吸底悬浮条遮挡 Banner 与内链 */}
        <div className="container-site max-w-3xl pb-24 pt-10 md:pb-20 md:pt-14">
          {SECTIONS.map((s) => (
            <section key={s.key} className="mb-12 last:mb-0">
              <div className="mb-5 flex items-baseline gap-3 border-b border-brand-orange/15 pb-3">
                <span className="text-xs font-bold tracking-[0.2em] text-brand-orange-ink">
                  {s.index}
                </span>
                <h2 className="text-xl font-bold md:text-2xl">{s.label}</h2>
              </div>

              <div className="space-y-4 text-[15px] leading-[1.9] text-foreground/90">
                {found[s.key].map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>

              {/* 量化结果板块：把卡片数据可视化呈现一次 */}
              {s.key === "outcome" && (
                <div className="mt-6 grid gap-3 rounded-2xl border border-brand-green/15 bg-brand-green-soft/60 p-5 sm:grid-cols-2">
                  {found.results.map((r) => (
                    <div key={r.label}>
                      <div className="text-3xl font-bold leading-none text-brand-green">
                        {r.value}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">{r.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* 主理人点评板块：客户原话 + 主理人观点 */}
              {s.key === "commentary" && (
                <blockquote className="mt-6 border-l-2 border-brand-orange/40 bg-white/70 px-5 py-4">
                  <Quote className="mb-2 h-4 w-4 text-brand-orange/60" />
                  <p className="text-sm italic leading-relaxed">「{found.quote}」</p>
                  <footer className="mt-3 text-xs not-italic text-muted-foreground">
                    — {found.author}
                  </footer>
                </blockquote>
              )}
            </section>
          ))}

          {/* 合规脚注：与 /content 口径一致 */}
          <p className="mt-10 border-t pt-5 text-xs leading-relaxed text-muted-foreground">
            数据来自已交付的选品与库存诊断项目，经客户授权并脱敏，统计口径以项目交付报告为准；
            不代表你将获得同样结果。
          </p>

          {/* 轻量转化 Banner：白底 + 一根浅灰分割线，去掉巨型二维码卡片 */}
          <div className="mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <p className="text-sm font-medium text-foreground/90 md:text-base">
              想看看你的品类有没有类似的利润空间？
            </p>
            <WecomCtaButton
              size="sm"
              variant="outline"
              label="联系主理人诊断"
              from={`case:${found.slug}`}
              subject={found.title}
              className="shrink-0 self-start rounded-lg px-5 sm:self-auto"
            />
          </div>

          {/* 内链：其他案例词条，帮助搜索引擎发现全部详情页 */}
          {others.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-sm font-semibold">其他案例词条</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {others.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/cases/${c.slug}`}
                    className="group flex items-center justify-between gap-3 rounded-xl border p-4 text-sm transition-shadow hover:shadow-warm-md"
                  >
                    <span className="leading-snug group-hover:text-primary">{c.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </>
  );
}
