import Link from "next/link";
import { ArrowRight, Database, ShieldAlert, Sparkles } from "lucide-react";

import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo";
import { AI_TOOLS, type ToolType } from "@/lib/ai-tools";
import { JsonLd, breadcrumbSchema } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { AiAssistantChat } from "@/components/site/ai-profit-chat";

/**
 * 工具库三个新 AI 助手的共享页面骨架。
 * 版式与 /tools/ai-profit 保持一致（用户已确认的排版），
 * 文案、快捷提问、口径说明与场景卡全部由 AI_TOOLS 注入。
 * 页面本身不写死任何具体渠道名称，遵守全渠道中立红线。
 */
export function AiToolPage({ tool }: { tool: Exclude<ToolType, "profit"> }) {
  const cfg = AI_TOOLS[tool];

  const appSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: cfg.name,
    url: absoluteUrl(cfg.path),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: cfg.seo.description,
    featureList: [
      "按内置规则引擎给出结论，数字由系统计算",
      "每天免费对话 3 次，无需注册",
      "风险提醒与下一步动作清单",
      "底层数据查询引导至金游智库专属查询账号",
    ],
    provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CNY",
      description: "每位访客每天免费体验 3 次",
    },
  };

  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "首页", url: "/" },
            { name: "服务目录", url: "/products" },
            { name: cfg.name, url: cfg.path },
          ]),
          appSchema,
        ]}
      />

      <PageHero tag={cfg.heroTag} title={cfg.name} desc={cfg.heroDesc} />

      <section className="section-pad">
        <div className="container-site max-w-4xl">
          <AiAssistantChat tool={tool} />
        </div>
      </section>

      <section className="section-pad bg-brand-cream">
        <div className="container-site max-w-4xl">
          <SectionHeading
            tag="诊断口径"
            title="结论怎么来的，都写清楚"
            desc="打分、风险与折价由系统按预设规则计算，AI 只负责解释与提醒，避免模型编造数据。结果为估算，不替代正式决策。"
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {cfg.rules.map((r, i) => (
              <div key={r.title} className="rounded-2xl border bg-card p-5">
                {i === 0 ? (
                  <Sparkles className="h-5 w-5 text-brand-green" strokeWidth={1.75} />
                ) : i === 1 ? (
                  <ShieldAlert className="h-5 w-5 text-brand-green" strokeWidth={1.75} />
                ) : (
                  <Database className="h-5 w-5 text-brand-green" strokeWidth={1.75} />
                )}
                <p className="mt-3 text-sm font-bold">{r.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-5">
            <p className="text-sm leading-relaxed">
              想查真实价格带、竞争格局、OE 号适配与供货商评级？那不是 AI 能猜的，得查底账。
            </p>
            <Link
              href="/products/data-subscription"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green underline-offset-4 hover:underline"
            >
              了解金游智库查询账号 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-site max-w-4xl">
          <h2 className="text-xl font-bold sm:text-2xl">{cfg.h2}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{cfg.h2Desc}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {cfg.scenes.map((s) => (
              <div key={s.name} className="rounded-xl border bg-card p-4">
                <p className="text-sm font-bold text-brand-green">{s.name}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{s.use}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            结论为规则估算，不替代正式报价与财务核算；完整底层数据需通过金游智库数据库查询账号获取。
          </p>
        </div>
      </section>
    </>
  );
}
