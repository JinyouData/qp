"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeCheck, Boxes, Check, ChevronDown, Database, ScanSearch, Sparkles, Store } from "lucide-react";

import { LIBRARIES, LIBRARY_ORDER, type Library, type Product } from "@/lib/types";
import { AI_TOOLS, type ToolType } from "@/lib/ai-tools";
import { ProductIcon } from "./icon";
import { ProductCta } from "./product-cta";
import { WecomCtaButton } from "./wecom-dialog";

/** 板块主题色：数据库用品牌绿实心，其余两库用轻底 */
const THEME: Record<Library, { chip: string; ring: string; icon: string; accent: string }> = {
  kb: {
    chip: "bg-secondary text-primary",
    ring: "border-border bg-card",
    icon: "bg-secondary text-primary",
    accent: "text-primary",
  },
  tools: {
    chip: "bg-brand-orange-soft text-brand-orange-ink",
    ring: "border-border bg-card",
    icon: "bg-brand-orange-soft text-brand-orange-ink",
    accent: "text-brand-orange-ink",
  },
  data: {
    chip: "bg-white/15 text-white ring-1 ring-white/30",
    ring: "border-brand-green",
    icon: "bg-brand-green text-white",
    accent: "text-brand-green",
  },
  custom: {
    chip: "bg-brand-red-soft text-brand-red",
    ring: "border-border bg-card",
    icon: "bg-brand-red-soft text-brand-red",
    accent: "text-brand-red",
  },
};

/** 数据库板块要单独强调的三个硬指标 */
const DATA_POINTS = [
  { icon: Database, title: "312 万 SKU", desc: "底层商品与价格数据，按 OE 号 / 品牌 / 车型 / 毛利区间检索" },
  { icon: ScanSearch, title: "OE 号匹配", desc: "一条 OE 号反查适配车型、替代件与真实成交价带" },
  { icon: Store, title: "万家供货商评级", desc: "按交付、退货、报价稳定性给供货商打分，选货不再靠听说" },
];

function LibCard({ product, accent }: { product: Product; accent: string }) {
  return (
    <article className="flex flex-col gap-2.5 rounded-xl border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary`}>
          <ProductIcon name={product.icon} className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <Link
            href={`/products/${product.slug}`}
            className="block text-sm font-bold leading-snug underline-offset-4 hover:underline"
          >
            {product.name}
          </Link>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{product.positioning}</p>
        </div>
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-dashed pt-3">
        <span className={`text-sm font-bold ${accent}`}>{product.price}</span>
        <ProductCta product={product} />
      </div>
    </article>
  );
}

/** 四个 AI 助手的图标映射（全部用站内已验证过的 lucide 图标） */
const AI_ICONS = {
  sparkles: Sparkles,
  scan: ScanSearch,
  shield: BadgeCheck,
  boxes: Boxes,
} as const;

/**
 * 工具库首位：AI 核价助手（在线体验入口）。
 * col-span-full 让它在 PC 端独占一整行、视觉权重最高，
 * 下面 3 张 AI 助手卡正好排成一行 3 列；手机端自动变单列。
 * 2026-11-15：三张死表格全部换成在线 AI 助手，排版保持 1 + 3 不变。
 */
function AiToolCard() {
  const cfg = AI_TOOLS.profit;
  return (
    <Link
      href={cfg.path}
      className="group col-span-full flex flex-col gap-4 rounded-2xl border-2 border-brand-green/30 bg-brand-green-soft p-5 transition-colors hover:border-brand-green/60 hover:bg-brand-green-soft/70 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-green text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold">{cfg.cardTitle}</h3>
            <span className="rounded-full bg-brand-orange px-2 py-0.5 text-[10px] font-bold text-white">
              {cfg.cardBadge}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{cfg.cardDesc}</p>
        </div>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-brand-green px-4 py-2 text-xs font-bold text-white sm:self-auto">
        {cfg.cardButton} <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

/** 三个新 AI 助手的小卡：图标 / 描述 / 按钮全部来自统一配置 */
function AiMiniCard({ tool }: { tool: Exclude<ToolType, "profit"> }) {
  const cfg = AI_TOOLS[tool];
  const Icon = AI_ICONS[cfg.icon];
  return (
    <Link
      href={cfg.path}
      className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-brand-green/50 hover:bg-brand-green-soft/40"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green-soft text-brand-green">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold leading-snug">{cfg.cardTitle}</h3>
          <span className="mt-1.5 inline-block rounded-full bg-brand-orange-soft px-2 py-0.5 text-[10px] font-bold text-brand-orange-ink">
            {cfg.cardBadge}
          </span>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{cfg.cardDesc}</p>
      <span className="mt-auto inline-flex items-center gap-1 border-t border-dashed pt-3 text-xs font-bold text-brand-green">
        {cfg.cardButton} <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

/**
 * 知识库 / 工具库手风琴。
 *
 * 默认状态由 CSS 按视口决定（data-state="auto"）：
 *   - >=768px：两个板块都展开，保持 PC 端大气平铺
 *   - <768px：知识库 / 工具库都默认收起，先露标题、卖点与价签，点标题再看清单
 * 这样服务端直出的 HTML 在任何屏宽都是对的，水合前不会先摊开再突然收起。
 * 用户点过标题栏后切到 data-state="manual"，此后完全由 React 状态接管，
 * 断点是 Tailwind 的 md（768px），与 CSS 媒体查询保持一致。
 */
function useAccordion(mobileDefaultOpen: boolean, sectionId: string) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => {
      setIsMobile(mq.matches);
      // 页脚有 /products#lib-tools 这类锚点：手机上跳过去时自动展开，
      // 否则用户会落到一个只显示标题的空板块上。
      const targeted = window.location.hash === `#${sectionId}`;
      // 断点变化时回到该屏宽的默认状态，避免手机上收起后转横屏仍是收起
      setManualOpen(targeted ? true : null);
    };
    sync();
    mq.addEventListener("change", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [sectionId]);

  const autoOpen = isMobile ? mobileDefaultOpen : true;
  const open = manualOpen ?? autoOpen;

  const toggle = () => {
    // 不依赖可能还没跑完的 effect，直接读当前视口，避免首次点击「点了没反应」
    const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    const current = manualOpen ?? (mobile ? mobileDefaultOpen : true);
    setManualOpen(!current);
  };

  return { open, state: manualOpen === null ? "auto" : "manual", toggle };
}

function CollapsibleLibrary({
  libKey,
  index,
  items,
  theme,
  mobileDefaultOpen,
}: {
  libKey: Library;
  index: number;
  items: Product[];
  theme: (typeof THEME)[Library];
  mobileDefaultOpen: boolean;
}) {
  const lib = LIBRARIES[libKey];
  const sectionId = `lib-${libKey}`;
  const { open, state, toggle } = useAccordion(mobileDefaultOpen, sectionId);
  const bodyId = `acc-${libKey}-body`;
  const titleId = `acc-${libKey}-title`;

  return (
    <section id={sectionId} className="scroll-mt-24">
      <div
        className={`acc-block rounded-2xl border p-5 shadow-warm sm:p-6 ${theme.ring}`}
        data-state={state}
        data-open={String(open)}
        data-mobile-default={mobileDefaultOpen ? "open" : "closed"}
      >
        {/* 整行标题栏都是触控区：序号 / 名称 / 简介 / 价签 / 折叠箭头全都保留 */}
        <h2 className="w-full">
          <button
            id={titleId}
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={`${open ? "收起" : "展开"}${lib.name}`}
            className="group flex w-full cursor-pointer select-none flex-wrap items-center gap-x-3 gap-y-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/60 focus-visible:ring-offset-2"
          >
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${theme.chip}`}>
              0{index + 1}
            </span>
            <span className="text-xl font-bold md:text-2xl">{lib.name}</span>
            <span className={`text-sm font-semibold ${theme.accent}`}>{lib.tagline}</span>
            <span className="ml-auto flex shrink-0 items-center gap-2">
              <span className="whitespace-nowrap rounded-full bg-secondary px-3 py-1 text-xs font-bold text-primary">
                {lib.price}
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card transition-colors group-hover:border-brand-green/50 group-hover:bg-brand-green-soft">
                {/* 收起时朝下（点开展开），展开时旋转 180° 朝上（点上收起） */}
                <ChevronDown className="acc-chevron h-4 w-4 text-brand-green" aria-hidden />
              </span>
            </span>
          </button>
        </h2>

        {/* 收起时这行也保留，不展开也能看懂这个板块卖什么 */}
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{lib.note}</p>

        {/* 工具库的活样本：折叠态也可见，点进 AI 核价助手免费体验 */}
        {libKey === "tools" && (
          <Link
            href="/tools/ai-profit"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-brand-green/30 bg-brand-green-soft px-3 py-1.5 text-xs font-semibold text-brand-green transition-colors hover:border-brand-green/60"
          >
            <Sparkles className="h-3.5 w-3.5" />
            免费体验 4 个 AI 助手
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}

        <div id={bodyId} role="region" aria-labelledby={titleId} className="acc-body">
          <div className="acc-inner">
            {/* 统一 3 列：知识库 6 项 = 2 行 × 3 列；
                工具库 = 首位跨整行的 AI 核价助手 + 第二行 3 张 AI 助手卡；
                手机端一律单列纵向，不留空缺。 */}
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              {libKey === "tools" ? (
                <>
                  <AiToolCard />
                  <AiMiniCard tool="selection" />
                  <AiMiniCard tool="oe-match" />
                  <AiMiniCard tool="inventory" />
                </>
              ) : (
                items.map((p) => (
                  <LibCard key={p.id} product={p} accent={theme.accent} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LibrarySections({ products }: { products: Product[] }) {
  return (
    <div className="space-y-6">
      {LIBRARY_ORDER.map((key, index) => {
        const lib = LIBRARIES[key];
        const theme = THEME[key];
        const items = products.filter((p) => p.library === key);
        const isData = key === "data";

        if (!isData) {
          return (
            <CollapsibleLibrary
              key={key}
              libKey={key}
              index={index}
              items={items}
              theme={theme}
              mobileDefaultOpen={false}
            />
          );
        }

        return (
          <section key={key} id={`lib-${key}`} className="scroll-mt-24">
            <div className="relative overflow-hidden rounded-3xl border-2 border-brand-green bg-brand-green p-6 text-white shadow-warm ring-4 ring-brand-green/10 sm:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl"
              />

              {/* 板块头 */}
              <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${theme.chip}`}
                >
                  0{index + 1}
                </span>
                <h2 className="text-xl font-bold text-white md:text-2xl">{lib.name}</h2>
                <span className="text-sm font-semibold text-white/90">{lib.tagline}</span>
                <span className="rounded-full bg-brand-orange px-2.5 py-1 text-[11px] font-bold text-white">
                  核心板块
                </span>
                <span className="ml-auto rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-green">
                  ¥999 / 年
                </span>
              </div>

              <p className="relative mt-2 max-w-3xl text-sm leading-relaxed text-white/80">
                {lib.note}
              </p>

              <div className="relative mt-6 grid gap-3 sm:grid-cols-3">
                {DATA_POINTS.map((pt) => (
                  <div key={pt.title} className="rounded-xl bg-white/10 p-4 ring-1 ring-white/15">
                    <pt.icon className="h-5 w-5 text-white/90" strokeWidth={1.75} />
                    <p className="mt-2 text-base font-bold text-white">{pt.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/75">{pt.desc}</p>
                  </div>
                ))}
              </div>

              <div className="relative mt-5 rounded-2xl bg-white p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-foreground">
                      {items[0]?.name ?? "金游智库·专属查询账号"}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {items[0]?.deliverable ??
                        "金游智库 Client 只读账号（一人一号）+ 312 万 SKU 检索 + OE 号匹配 + 万家供货商评级"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-brand-red">¥999</p>
                    <p className="text-xs text-muted-foreground">每年 · 一人一号</p>
                  </div>
                </div>

                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {[
                    "312 万 SKU 无限次查询，不按条计费",
                    "OE 号反查适配与替代件，出结论有据可依",
                    "万家供货商评级，选货先看分数",
                    "网页端登录，开通当天可查",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-xs text-foreground/85">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-green" />
                      {t}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {items[0] ? (
                    <ProductCta product={items[0]} variant="orange" />
                  ) : (
                    <WecomCtaButton
                      variant="orange"
                      label="开通金游智库账号"
                      from="products-data"
                      subject="数据库"
                    />
                  )}
                  <Link
                    href="/products/data-subscription"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-green underline-offset-4 hover:underline"
                  >
                    先看能查到什么 <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
