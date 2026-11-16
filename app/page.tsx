import Link from "next/link";
import {
  ArrowRight, BookOpen, CheckCircle2, Database, Quote, ShieldCheck, Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/site/section-heading";
import { HeroDataBoard } from "@/components/site/hero-data-board";
import { DataDashboard } from "@/components/site/data-dashboard";
import { WecomCtaButton } from "@/components/site/wecom-dialog";
import { getCases } from "@/lib/data";

/* 首页只做两件事：用数据证明，用加微收口。 */

/* ---------- 数字统计信任区（底层数据资产口径，只用自有数据） ---------- */
const TRUST_STATS = [
  { value: "3,124,045", label: "底层 SKU 库" },
  { value: "931", label: "源头供应商直连" },
  { value: "2,219+", label: "主流品牌覆盖" },
  { value: "28.03%", label: "平均毛利空间" },
];

/* ---------- 方法论：汽配数据三层校验法 ---------- */
const METHOD_STEPS = [
  {
    step: "第一层",
    name: "交叉验证",
    desc: "同一条适配/价格数据至少来自两个独立来源（平台前台 + 供应商目录 + 自有成交记录），对不上就标记为存疑，不进库。",
    color: "bg-brand-green",
  },
  {
    step: "第二层",
    name: "一线回测",
    desc: "存疑与高频条目送回自有云仓与修理厂场景实测，用真实装车/退货结果校准，而不是只靠文档推断。",
    color: "bg-brand-orange",
  },
  {
    step: "第三层",
    name: "专家复核",
    desc: "由 5 年以上品类经验的工程师做最终复核并署名，每条数据可追溯到「谁在什么时候依据什么确认的」。",
    color: "bg-brand-red",
  },
];

/* PC 端原文案，同时也是弹窗 subject / 埋点口径，保持不变 */
const HERO_OFFER = "免费领取：Top 50 高毛利选品清单（内测版）";
/* 手机端（<768px）精简文案：一行装得下、绝不折行 */
const HERO_OFFER_MOBILE = "免费领取 Top 50 清单";

/* ---------- 首屏下方的「三库产品矩阵」轻量导航 ----------
   承接看完数据卡片后的购买意图，把客户直接分流到服务目录的三个板块。
   PC = 3 张并排细长卡；手机 = 1 列 3 行极简卡（同一套 DOM，靠响应式文字切换）。
   三个入口统一跳 /products，并用页脚同款锚点直达对应板块。 */
const PRODUCT_MATRIX = [
  {
    no: "01",
    title: "知识库",
    pcDesc: "构建认知（免费领）",
    mobileTitle: "知识库·免费领",
    cta: "查看免费资料",
    mobileCta: "领取",
    href: "/products#lib-kb",
    icon: BookOpen,
    featured: false,
  },
  {
    no: "02",
    title: "工具库",
    pcDesc: "AI 助手 · 每天免费 3 次",
    mobileTitle: "工具库·免费测",
    cta: "体验AI工具",
    mobileCta: "体验",
    href: "/products#lib-tools",
    icon: Sparkles,
    featured: false,
  },
  {
    no: "03",
    title: "数据库",
    pcDesc: "智库专属系统",
    mobileTitle: "数据库·会员制(¥999/年)",
    cta: "了解系统详情",
    mobileCta: "了解",
    href: "/products#lib-data",
    icon: Database,
    featured: true,
  },
];

export default async function HomePage() {
  const cases = await getCases();
  const homeCases = cases.slice(0, 3);

  return (
    <>
      {/* ========== Hero：唯一主目标 ========== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF7EE] via-[#FCFAF6] to-background">
        <div className="container-site py-16 md:py-20">
          <div className="grid items-center gap-12 md:grid-cols-[1.15fr_1fr] md:gap-10">
            <div>
              <Badge variant="accent" className="mb-6 md:mb-4">
                JINYOU DATA · 汽配行业数据智库
              </Badge>

              {/* 主标题：手机端收敛字号、加字距、去掉粗橙下划线，只靠「深灰 + 品牌橙 + 字重」形成对比；
                  md: 起完全还原 PC 原有表现（含下划线）。 */}
              <h1 className="text-[28px] font-bold leading-[1.35] tracking-[0.03em] text-foreground md:text-5xl md:leading-[1.25] md:tracking-normal">
                用数据洞察，
                <span className="relative ml-[0.12em] inline-block font-extrabold text-brand-orange md:font-bold">
                  化繁为金
                  <span className="absolute -bottom-1 left-0 hidden h-2 w-full rounded-full bg-brand-orange/30 md:block" />
                </span>
              </h1>

              {/* 副标题：手机端缩小字号、加大行高、减淡颜色，并在「拆解」后强制断成两段留白；
                  md: 起两段重新 inline 拼回原来那一整句，PC 文案一字不变。 */}
              <p className="mt-7 max-w-xl text-sm leading-loose text-gray-600 md:mt-5 md:text-lg md:leading-relaxed md:text-muted-foreground">
                <span className="block md:inline">基于 312 万条真实汽配交易大盘与 900+ 源头供应商，为你拆解</span>
                <span className="mt-2 block md:mt-0 md:inline"> 40%-50% 黄金毛利区间，只给能落地的选品依据与合规 SOP。</span>
              </p>

              {/* 首屏唯一按钮：手机端短文案一行不折、小圆角 rounded-xl、靠 py 撑开点击区；
                  PC 端仍是原来的全圆长按钮。点击只弹企微名片，不跳页、不填表。 */}
              <div className="mt-9 md:mt-8">
                <WecomCtaButton
                  size="lg"
                  variant="orange"
                  label={
                    <>
                      <span className="md:hidden">{HERO_OFFER_MOBILE}</span>
                      <span className="hidden md:inline">{HERO_OFFER}</span>
                    </>
                  }
                  from="home-hero"
                  subject={HERO_OFFER}
                  className="h-auto w-full rounded-xl py-4 text-center text-base font-bold leading-snug shadow-warm-lg md:h-16 md:w-auto md:whitespace-normal md:rounded-full md:px-10 md:py-0 md:text-xl"
                />
                <p className="mt-4 text-xs text-gray-500 md:mt-3 md:text-muted-foreground">
                  点击扫码，直接获取内测资料
                </p>
              </div>

              {/* 信任徽章：手机端纵向 3 行、条目间距加大、文字减淡不抢主按钮；
                  PC 端恢复横向 flex-wrap 原样式。 */}
              <ul className="mt-9 flex flex-col gap-y-3 text-[13px] text-gray-500 md:mt-6 md:flex-row md:flex-wrap md:gap-x-5 md:gap-y-2 md:text-sm md:text-muted-foreground">
                {["不卖货 · 不代运营", "官网不处理支付", "数据合规第一天就有"].map((t, i) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <CheckCircle2
                      className={`h-4 w-4 ${i % 2 === 0 ? "text-brand-green" : "text-brand-orange"}`}
                    />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* 右侧视觉：纯前端绘制的悬浮数据看板（保持不动） */}
            <HeroDataBoard />
          </div>
        </div>
      </section>

      {/* ========== 三库产品矩阵：轻量导航，承接首屏后的购买意图 ========== */}
      <section aria-label="金游智库产品矩阵导航" className="bg-white">
        <div className="container-site py-5 md:py-6">
          {/* md:mb-5 给第三张卡的浮动价签留出与标题行的安全间距 */}
          <div className="mb-3 flex items-baseline justify-between gap-3 md:mb-5">
            <h2 className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-brand-green">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-orange" />
              金游智库 · 产品矩阵
            </h2>
            <p className="hidden text-xs text-muted-foreground sm:block">
              按你的需要，直接进对应板块
            </p>
          </div>

          <nav aria-label="三库入口" className="grid gap-2 md:grid-cols-3 md:gap-3">
            {PRODUCT_MATRIX.map((m) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.no}
                  href={m.href}
                  className={`group relative flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange md:px-4 ${
                    m.featured
                      ? "border-brand-green bg-brand-green text-white hover:shadow-warm-md"
                      : "border-brand-green/15 bg-white text-foreground hover:border-brand-green/45 hover:shadow-warm"
                  }`}
                >
                  {/* 价签浮在卡片上沿外侧，不参与 flex 流，三张卡内容才能统一垂直居中 */}
                  {m.featured && (
                    <span className="absolute -top-2.5 right-3 z-10 hidden rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-bold leading-tight text-white shadow-sm md:block">
                      ¥999/年
                    </span>
                  )}

                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg md:h-10 md:w-10 ${
                      m.featured ? "bg-white/15 text-white" : "bg-brand-green-soft text-brand-green"
                    }`}
                  >
                    <Icon className="h-4 w-4 md:h-5 md:w-5" strokeWidth={1.9} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span
                        className={`hidden text-[10px] font-bold tracking-[0.15em] md:inline ${
                          m.featured ? "text-white/60" : "text-brand-green/55"
                        }`}
                      >
                        {m.no}
                      </span>
                      <span className="text-[13px] font-bold md:hidden">{m.mobileTitle}</span>
                      <span className="hidden text-base font-bold md:inline">{m.title}</span>
                    </span>
                    <span
                      className={`mt-0.5 hidden text-xs md:block ${
                        m.featured ? "text-white/75" : "text-muted-foreground"
                      }`}
                    >
                      {m.pcDesc}
                    </span>
                  </span>

                  <span
                    className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-3 text-[11px] font-semibold transition-colors md:h-9 md:px-4 md:text-[13px] ${
                      m.featured
                        ? "border-white/45 bg-white text-brand-green group-hover:bg-white/90"
                        : "border-brand-orange/35 bg-white text-brand-orange-ink group-hover:border-brand-orange/70 group-hover:bg-brand-orange-soft"
                    }`}
                  >
                    <span className="md:hidden">{m.mobileCta}</span>
                    <span className="hidden md:inline">{m.cta}</span>
                    <ArrowRight className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      {/* ========== 数字统计信任区（保持不动） ========== */}
      <section className="border-y bg-white/60">
        <div className="container-site py-10">
          <p className="mb-6 text-center text-sm font-semibold tracking-wide text-muted-foreground">
            底层数据资产 · 自有库全量盘点口径，不讲空话
          </p>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {TRUST_STATS.map((s) => (
              <Card key={s.label} className="card-hover h-full">
                <CardContent className="flex flex-col items-center justify-center gap-1.5 p-5 text-center">
                  <div className="whitespace-nowrap font-bold text-brand-green text-[clamp(20px,5.2vw,36px)] leading-tight">
                    {s.value}
                  </div>
                  <div className="text-xs text-muted-foreground md:text-sm">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 真实交易大盘洞察：三张纯代码图表，不再重复大数字 ========== */}
      <section className="section-pad border-y border-brand-green/10 bg-brand-green-soft/35">
        <div className="container-site">
          <SectionHeading tag="金游™ 智库 · 11 个月真实大盘" title="金游智库 · 底层大盘洞察" />

          <DataDashboard />

          <p className="mt-8 text-center text-[15px] font-semibold text-brand-green md:text-base">
            不凭直觉选品，用真实数据帮你找蓝海。
          </p>

          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 shrink-0 text-brand-green" />
            数据口径：11 个月连续观测 · 161.8 万+ 去重商品 · 312 万条底层 SKU · 每条结论均可回溯原始记录
          </p>
        </div>
      </section>

      {/* ========== 极简横向服务 Banner（替代原「四层产品」） ========== */}
      <section className="border-y border-brand-orange/20 bg-brand-cream">
        <div className="container-site flex flex-col items-start gap-5 py-8 md:flex-row md:items-center md:justify-between md:gap-10 md:py-10">
          <p className="text-base font-medium leading-relaxed md:text-lg">
            知识库建认知，工具库做落地，数据库看利润。
          </p>
          <Button asChild variant="outline" size="default" className="shrink-0">
            <Link href="/products">
              查看完整服务目录 <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      {/* ========== 案例证据 ========== */}
      <section className="section-pad bg-white/60">
        <div className="container-site">
          <SectionHeading
            tag="案例证据"
            title="不吹牛，只看结果数据"
            desc="以下案例均经客户授权并脱敏，标注了统计口径与时间范围。"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {homeCases.map((c) => (
              <Card key={c.id} className="card-hover h-full">
                <CardContent className="flex h-full flex-col gap-3 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-brand-green">
                    <Quote className="h-4 w-4" />
                    {c.client}
                  </div>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-semibold text-muted-foreground">问题：</span>
                      {c.problem}
                    </p>
                    <p>
                      <span className="font-semibold text-muted-foreground">方案：</span>
                      {c.solution}
                    </p>
                  </div>
                  <div className="mt-auto grid grid-cols-2 gap-2 border-t border-dashed pt-3">
                    {c.metrics.map((m) => (
                      <div key={m.label}>
                        <div className="text-lg font-bold text-brand-red">{m.value}</div>
                        <div className="text-xs text-muted-foreground">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ========== 方法论：浅绿底 + 白卡 ========== */}
      <section className="section-pad border-y border-brand-green/10 bg-brand-green-soft/45">
        <div className="container-site">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <span className="mb-2 block text-xs font-semibold tracking-[0.25em] text-brand-orange-ink">
              命名化方法论
            </span>
            <h2 className="text-2xl font-bold md:text-3xl">
              汽配数据三层校验法
            </h2>
            <p className="mt-3 text-sm text-muted-foreground md:text-[15px]">
              汽配数据的坑不在「有没有」，而在「准不准」。一条适配数据错了，
              后面选品、报价、客服全错。三层校验是我们所有数据产品的底座。
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {METHOD_STEPS.map((s) => (
              <div key={s.step} className="card-hover card-hover-green rounded-xl border border-brand-green/10 bg-white p-5 shadow-warm">
                <span className={`mb-3 inline-block rounded-full ${s.color} px-3 py-1 text-xs font-bold text-white`}>
                  {s.step}
                </span>
                <h3 className="text-lg font-bold">{s.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-brand-green" />
            完整方法论与校验记录模板，添加主理人后随知识库一并开放
          </p>
        </div>
      </section>
    </>
  );
}
