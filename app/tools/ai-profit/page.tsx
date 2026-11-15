import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Database, ShieldAlert } from "lucide-react";

import { absoluteUrl, buildMetadata, KEYWORDS, SITE_NAME, SITE_URL } from "@/lib/seo";
import { JsonLd, breadcrumbSchema } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { AiProfitChat } from "@/components/site/ai-profit-chat";

/* 正式版：已进入 sitemap、允许全量索引。
   Title / Description / H2 覆盖「AI核价」「跨境利润计算」「多平台毛利测算」等核心词。
   【全渠道中立红线】全页不出现任何具体电商平台名称，只用区域 / 全渠道口径。 */
export const metadata: Metadata = buildMetadata({
  title: "AI核价助手｜跨境利润计算与汽配毛利测算",
  description:
    "AI核价助手：用大白话说清采购价、运费、目标市场与预估售价，自动算清头程、尾程、平台佣金 15%、退货损耗 5% 之后的真实毛利，并提示跨境风险。全渠道统一口径，支持多平台毛利测算、汽配跨境选品核价，每位访客每天免费体验 3 次。",
  path: "/tools/ai-profit",
  keywords: [
    "AI核价",
    "跨境利润计算",
    "多平台毛利测算",
    "汽配跨境利润计算",
    "AI跨境利润测算助手",
    "汽配核价工具",
    KEYWORDS.data,
    KEYWORDS.oe,
  ],
});

const RULES = [
  {
    icon: Calculator,
    title: "头程 / 尾程",
    desc: "你给了就按你的数；没给头程按采购价 12%（或 1kg≈¥28）估，尾程按售价 8% 估，回复里会标注「估算」。",
  },
  {
    icon: ShieldAlert,
    title: "佣金 15% + 退货损耗 5%",
    desc: "两项固定按预估售价计提，合计先吃掉两成售价。毛利 = 售价 − 采购 − 头程 − 尾程 − 佣金 − 退货损耗。",
  },
  {
    icon: Database,
    title: "OE 码不在这里查",
    desc: "适配车型、替代件、供货商评级属于底层数据，需开通金游智库专属查询账号（312 万 SKU、OE 号匹配）。",
  },
];

/** 只按区域 / 场景描述，全渠道中立，不点名任何渠道 */
const MARKETS = [
  { name: "欧洲平台", use: "车灯、刹车片等品类的外币售价折算与头程时效风险" },
  { name: "北美平台", use: "海外仓配、佣金与合规标题改写场景的毛利校验" },
  { name: "低客单价渠道", use: "活动降价下的佣金与退货损耗敏感性测算" },
];

/** 工具页结构化数据：让搜索引擎把它识别为可在线使用的应用，而不是一篇普通文章 */
const APP_SCHEMA: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "AI跨境利润测算助手（AI核价）",
  url: absoluteUrl("/tools/ai-profit"),
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "面向汽配跨境卖家的 AI 核价工具：按采购价、头程、尾程、平台佣金 15%、退货损耗 5% 计算真实毛利，全渠道统一口径，支持多平台毛利测算，并提示汇率、退货率与适配错配风险。",
  featureList: [
    "毛利与毛利率自动测算",
    "头程 / 尾程缺省估算并标注",
    "平台佣金 15% 与退货损耗 5% 固定计提",
    "跨境风险提醒与 OE 码查询引导",
  ],
  provider: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "CNY",
    description: "每位访客每天免费体验 3 次",
  },
};

export default function AiProfitPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbSchema([
            { name: "首页", url: "/" },
            { name: "服务目录", url: "/products" },
            { name: "AI核价助手", url: "/tools/ai-profit" },
          ]),
          APP_SCHEMA,
        ]}
      />

      <PageHero
        tag="工具库 · AI 核价"
        title="AI 跨境利润测算助手"
        desc="别再靠一张死 Excel 拍脑袋定价。用大白话说清你的货、目标市场和定价，先算真实毛利，再看风险。全渠道统一口径，每位访客每天免费体验 3 次。"
      />

      <section className="section-pad">
        <div className="container-site max-w-4xl">
          <AiProfitChat />
        </div>
      </section>

      <section className="section-pad bg-brand-cream">
        <div className="container-site max-w-4xl">
          <SectionHeading
            tag="测算口径"
            title="每个数字怎么来的，都写清楚"
            desc="数字由代码按固定口径计算，AI 只负责解释与风险提醒，避免出现「模型算错账」。结果为估算，不替代正式报价。"
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {RULES.map((r) => (
              <div key={r.title} className="rounded-2xl border bg-card p-5">
                <r.icon className="h-5 w-5 text-brand-green" strokeWidth={1.75} />
                <p className="mt-3 text-sm font-bold">{r.title}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-5">
            <p className="text-sm leading-relaxed">
              想查 OE 码适配、真实成交价带和供货商评级？那不是 AI 能猜的，得查底账。
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

      {/* 关键词落地段：让「AI核价 / 跨境利润计算 / 多平台毛利测算」有对应正文，
          而不是只堆在 meta 里；同时给访客明确的使用场景。 */}
      <section className="section-pad">
        <div className="container-site max-w-4xl">
          <h2 className="text-xl font-bold sm:text-2xl">
            AI核价能算什么：多平台、多区域的统一毛利口径
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            同一个配件在不同市场、不同渠道，吃掉利润的项目完全不同。把采购价、运费和预估售价说清楚，助手会按统一口径逐项扣减并给出毛利、毛利率与风险提示；数字由系统计算，AI 只做解释，不会自己编账。
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {MARKETS.map((p) => (
              <div key={p.name} className="rounded-xl border bg-card p-4">
                <p className="text-sm font-bold text-brand-green">{p.name}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.use}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            测算结果为估算，不替代正式报价；OE 号适配、真实成交价带与供货商评级需通过金游智库数据库查询账号获取。
          </p>
        </div>
      </section>
    </>
  );
}
