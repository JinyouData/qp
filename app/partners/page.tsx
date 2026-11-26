import type { Metadata } from "next";

import { buildMetadata, KEYWORDS } from "@/lib/seo";
import { JsonLd, breadcrumbSchema } from "@/components/site/json-ld";
import Link from "next/link";
import { ArrowRight, Wrench, Bot, ShieldCheck, FileSignature, Database } from "lucide-react";

import { PageHero } from "@/components/site/page-hero";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PartnerContactCard } from "@/components/site/partner-contact-card";

export const metadata: Metadata = buildMetadata({
  title: "数据与 AI 合作",
  description:
    "面向 SaaS 团队与大模型团队的长期商务合作：312 万汽配 OE 号底层数据字典、结构化语料、OE 适配关系图谱与 RAG 检索素材。签 DPA，合规先行。",
  path: "/partners",
  keywords: [KEYWORDS.ai, KEYWORDS.data, KEYWORDS.compliance, KEYWORDS.oe],
});

/* 合作卡片内容：本页唯一数据源，硬编码保证与智库调性一致。
 * 不再从 products 表读取——避免数据库历史行把「AI 数据标注」等
 * 陈旧 C 端话术带回到合作页。 */
const COOPERATION_CARDS = [
  {
    slug: "saas",
    icon: Wrench,
    name: "SaaS 工具合作",
    badge: "数据底座共建",
    desc: "我们提供 312 万汽配 OE 号底层数据字典与评测标准，你出产品研发能力。联合打造真正懂行的汽配 SaaS 工具。",
    points: [
      "312 万 SKU 底层数据字典与 OE 号索引",
      "行业评测标准与「什么算对」的判定规则",
      "种子用户验证与联合运营支持",
    ],
    fit: "适合有成熟产品的 SaaS 团队",
  },
  {
    slug: "ai",
    icon: Bot,
    name: "AI 数据合作",
    badge: "语料与评测",
    desc: "提供结构化汽配语料、OE 适配关系图谱与 RAG 检索素材。帮助大模型解决「汽配幻觉」问题。",
    points: [
      "结构化汽配语料与 OE 适配关系图谱",
      "RAG 检索素材与可追溯来源标注",
      "评测标准共建与专家复核",
    ],
    fit: "适合大模型团队、研究机构与 AI 产品团队",
  },
] as const;

const AI_DELIVERABLES = [
  {
    name: "结构化汽配语料",
    desc: "基于 312 万 SKU 底层库整理的问答、适配关系与品类知识语料，按用途与期限授权，可追溯、可撤回。",
    note: "签 DPA · 明确用途与删除机制",
  },
  {
    name: "OE 适配关系图谱",
    desc: "以 OE 号为节点、车型适配为边的关系图谱，帮助模型理解「这个号到底装在哪」，而不是靠字面猜测。",
    note: "含歧义处理与边界约定",
  },
  {
    name: "RAG 检索素材",
    desc: "可直接接入检索增强流程的切片化素材，带来源标注与置信口径，降低生成环节的幻觉率。",
    note: "按场景定制切片粒度",
  },
  {
    name: "评测标准共建",
    desc: "用真实业务问题做尺子，和你一起搭垂直评测集、定义指标与难度分层，不拿通用榜单糊弄。",
    note: "可联合署名发布",
  },
];

const COMPLIANCE = [
  {
    icon: FileSignature,
    title: "先签协议再谈数据",
    desc: "正式合作协议 + 数据处理附录（DPA），明确用途、期限、转委托与删除机制。",
  },
  {
    icon: ShieldCheck,
    title: "原始数据不出域",
    desc: "客户名称、单号、成交价格等一律脱敏；需要原始数据时走授权审批，留痕可查。",
  },
  {
    icon: Database,
    title: "用途限定",
    desc: "授权只覆盖约定用途。换用途、转授权、再训练都要重新确认，不接受口头承诺。",
  },
];

export default function PartnersPage() {
  return (
    <>
      {/* 结构化数据：面包屑 */}
      <JsonLd
        data={breadcrumbSchema([
          { name: "首页", url: "/" },
          { name: "数据与 AI 合作", url: "/partners" },
        ])}
      />

      <PageHero
        tag="PARTNERS"
        title="数据与 AI 合作：312 万条底层数据，交给懂行的人"
        desc="工具做不好汽配、模型答不准汽配，往往不是技术问题，是缺一套「什么算对」的行业底稿。这套底稿在我们手里。"
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="destructive">
            <Link href="#contact">发起商务洽谈</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="#forms">了解合作形态</Link>
          </Button>
        </div>
      </PageHero>

      <section className="section-pad" id="forms">
        <div className="container-site">
          <SectionHeading tag="合作形态" title="两条合作路径，同一套数据底座" />
          <div className="grid gap-5 md:grid-cols-2">
            {COOPERATION_CARDS.map((c) => (
              <Card key={c.slug} className="card-hover h-full">
                <CardContent className="flex h-full flex-col gap-4 p-6 md:p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-primary">
                      <c.icon className="h-6 w-6" strokeWidth={1.7} />
                    </span>
                    <h3 className="text-lg font-bold">{c.name}</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {c.badge}
                    </Badge>
                  </div>

                  <p className="text-sm leading-loose text-foreground/90">{c.desc}</p>

                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {c.points.map((point) => (
                      <li key={point} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-dashed pt-4">
                    <span className="text-xs text-muted-foreground">{c.fit}</span>
                    <Button asChild size="sm" variant="destructive">
                      <Link href="#contact">
                        提交合作意向 <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad bg-brand-cream">
        <div className="container-site">
          <SectionHeading tag="AI 合作能交付什么" title="四样东西，都可以单独谈" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {AI_DELIVERABLES.map((d) => (
              <Card key={d.name} className="card-hover h-full">
                <CardContent className="flex h-full flex-col gap-2 p-5">
                  <h3 className="text-base font-bold">{d.name}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{d.desc}</p>
                  <p className="mt-auto pt-2 text-xs font-semibold text-brand-orange-ink">{d.note}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad">
        <div className="container-site">
          <SectionHeading
            tag="数据合规"
            title="合规不是走流程，是合作的前提"
            desc="详细条款见服务条款与隐私政策，这里说三个硬原则。"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {COMPLIANCE.map((c) => (
              <Card key={c.title}>
                <CardContent className="flex gap-3 p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <c.icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <div>
                    <h3 className="text-base font-bold">{c.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{c.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 商务名片式联系区块：克制、无大按钮、无重复提示 */}
      <div id="contact">
        <PartnerContactCard />
      </div>
    </>
  );
}
