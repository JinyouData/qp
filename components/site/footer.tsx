import Link from "next/link";

import { BRAND } from "@/lib/brand";
import { BrandLogo } from "./brand-logo";
import { FooterAccordion, type MobileFooterGroup } from "./footer-accordion";

/** PC 端四列页脚：保持原有完整链接，不受移动端瘦身影响。 */
const COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "智库服务",
    links: [
      { href: "/products", label: "服务目录" },
      { href: "/products#lib-kb", label: "知识库" },
      { href: "/products#lib-tools", label: "工具库" },
      { href: "/tools/ai-profit", label: "AI 核价助手" },
      { href: "/products#lib-data", label: "数据库" },
      { href: "/consulting", label: "定制咨询" },
      { href: "/partners", label: "SaaS与AI合作" },
    ],
  },
  {
    title: "内容与信任",
    links: [
      { href: "/insights", label: "汽配行业洞察" },
      { href: "/content", label: "客户成果与洞察" },
      { href: "/about", label: "关于我们" },
    ],
  },
  {
    title: "支持与合规",
    links: [
      { href: "/access", label: "查询我的资料权限" },
      { href: "/privacy", label: "隐私政策" },
      { href: "/terms", label: "服务条款" },
    ],
  },
];

/**
 * 移动端专用导航（<768px）：只保留两组，默认展开「智库服务」。
 * 与 PC 端的差异是有意的产品决策：
 * - 去掉「AI 核价助手」（工具库里已有入口）与低频的「SaaS与AI合作」
 * - 「支持与合规」三条按精简要求删/下沉后为空组，用户确认后整体取消
 * - 隐私政策 / 服务条款移到最底部 © 同行，以 12px 浅灰小字呈现
 */
const MOBILE_GROUPS: MobileFooterGroup[] = [
  {
    id: "services",
    title: "智库服务",
    links: [
      { href: "/products", label: "服务目录" },
      { href: "/products#lib-kb", label: "知识库" },
      { href: "/products#lib-tools", label: "工具库" },
      { href: "/products#lib-data", label: "数据库" },
      { href: "/consulting", label: "定制咨询" },
    ],
  },
  {
    id: "content",
    title: "内容与信任",
    links: [
      { href: "/insights", label: "汽配行业洞察" },
      { href: "/content", label: "客户成果与洞察" },
      { href: "/about", label: "关于我们" },
    ],
  },
];

export function Footer() {
  /* pb-[84px]：移动端吸底 CTA 常驻，滚到底时版权行仍在其上方约 25px。
     PC 端不需要（lg:pb-0）。 */
  return (
    <footer className="border-t border-brand-green/10 bg-brand-cream pb-[84px] text-muted-foreground lg:pb-0">
      <div className="container-site py-6 md:py-12">
        {/* ========== PC：四列完整页脚（原样保留） ========== */}
        <div className="hidden gap-10 md:grid md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center">
              <BrandLogo />
            </Link>
            <p className="text-sm font-semibold leading-relaxed text-brand-green">
              用数据洞察，化繁为金。
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              专注汽配跨境的数据智库。提供查得到的知识库、用得上的工具库、看透利润的数据库。
            </p>
            <p className="mt-3 text-xs">
              📮
              <a
                href={BRAND.emailHref}
                className="ml-1 underline-offset-2 transition-colors hover:text-brand-orange-ink hover:underline"
              >
                {BRAND.email}
              </a>
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-semibold text-foreground">{col.title}</h4>
              <ul className="space-y-1.5">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-sm transition-colors hover:text-brand-orange-ink">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ========== 移动端：极简品牌行 + 手风琴导航 ========== */}
        <div className="md:hidden">
          <Link href="/" className="inline-flex items-center">
            <BrandLogo />
          </Link>
          <p className="mt-2.5 text-xs leading-relaxed">
            <span className="font-semibold text-brand-green">用数据洞察，化繁为金。</span>{" "}
            专注汽配跨境的数据智库。
          </p>
          <div className="mt-3">
            <FooterAccordion groups={MOBILE_GROUPS} />
          </div>
        </div>

        {/* ========== 版权行 ========== */}
        <div className="mt-5 border-t border-border pt-4 text-center md:mt-10 md:pt-6">
          {/* PC：原完整版权声明 */}
          <div className="hidden md:block">
            <p className="break-words text-xs leading-relaxed text-gray-400">
              © 2026 {BRAND.name} · 金游™ 出品 |{" "}
              <span className="whitespace-nowrap">{BRAND.legalEntity} 保留所有权利</span>
            </p>
            <p className="mt-2 break-words text-xs leading-relaxed text-gray-400">
              本站为知识资产与数据展示平台
            </p>
          </div>

          {/* 移动端：© 与合规小链接同一行，12px 浅灰 */}
          <div className="md:hidden">
            <p className="flex flex-wrap items-center justify-center gap-x-1.5 text-[12px] leading-relaxed text-gray-400">
              <span className="whitespace-nowrap">© 2026 {BRAND.name} · 保留所有权利</span>
              <span className="text-gray-300">|</span>
              <Link
                href="/privacy"
                className="underline-offset-2 transition-colors hover:text-brand-orange-ink hover:underline"
              >
                隐私政策
              </Link>
              <span className="text-gray-300">·</span>
              <Link
                href="/terms"
                className="underline-offset-2 transition-colors hover:text-brand-orange-ink hover:underline"
              >
                服务条款
              </Link>
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-gray-400">
              本站为知识资产与数据展示平台
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
