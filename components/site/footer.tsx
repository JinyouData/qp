import Link from "next/link";

import { BRAND } from "@/lib/brand";
import { BrandLogo } from "./brand-logo";
import { FooterAccordion, type MobileFooterGroup } from "./footer-accordion";

/**
 * PC 端三列页脚（国际 SaaS 规范）：
 * - 左侧 Logo 介绍区占 50%（2:1:1），右侧「智库服务」「内容与信任」各占 25%
 * - 「查询资料权限」归入「内容与信任」末位
 * - 「SaaS与AI合作」紧跟「定制咨询」，企业级服务排在一起
 * - 「AI 核价助手」已删除（工具库内已有入口）
 * - 「支持与合规」列已彻底删除，隐私政策 / 服务条款下沉到版权行
 */
type FooterLink = { href: string; label: string; external?: boolean };

const COLS: { title: string; links: FooterLink[] }[] = [
  {
    title: "智库服务",
    links: [
      { href: "/products", label: "服务目录" },
      { href: "/products#lib-kb", label: "知识库" },
      { href: "/products#lib-tools", label: "工具库" },
      { href: "/products#lib-data", label: "数据库" },
      { href: "/consulting", label: "定制咨询" },
      { href: "/partners", label: "SaaS与AI合作" },
    ],
  },
  {
    title: "内容与信任",
    links: [
      { href: "/cases", label: "智库观察" },
      { href: "/about", label: "关于我们" },
      { href: "/access", label: "查询资料权限" },
      { href: "https://vip.jinyoudata.com/login", label: "智库登录", external: true },
    ],
  },
];

/**
 * 移动端专用导航（<768px）：与 PC 端两组分类口径一致。
 * - 「AI 核价助手」已删除（工具库里已有入口）
 * - 「查询资料权限」归入「内容与信任」末位
 * - 「SaaS与AI合作」紧跟「定制咨询」
 * - 隐私政策 / 服务条款统一在底部版权行呈现，不再单独出现在手风琴里
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
      { href: "/partners", label: "SaaS与AI合作" },
    ],
  },
  {
    id: "content",
    title: "内容与信任",
    links: [
      { href: "/cases", label: "智库观察" },
      { href: "/about", label: "关于我们" },
      { href: "/access", label: "查询资料权限" },
      { href: "https://vip.jinyoudata.com/login", label: "智库登录", external: true },
    ],
  },
];

export function Footer() {
  /* pb-[84px]：移动端吸底 CTA 常驻，滚到底时版权行仍在其上方约 25px。
     PC 端不需要（lg:pb-0）。 */
  return (
    <footer className="border-t border-brand-green/10 bg-brand-cream pb-[84px] text-muted-foreground lg:pb-0">
      <div className="container-site py-6 md:py-12">
        {/* ========== PC：三列页脚（Logo 50% + 两列各 25%，2:1:1） ========== */}
        <div className="hidden gap-10 md:grid md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center">
              <BrandLogo />
            </Link>
            <p className="max-w-[26rem] text-sm font-semibold leading-relaxed text-brand-green">
              用数据洞察，化繁为金。
            </p>
            <p className="footer-intro mt-2 max-w-[28rem] text-sm leading-relaxed">
              专注汽配跨境的数据智库。提供查得到的<span className="whitespace-nowrap">知识库</span>、用得上的<span className="whitespace-nowrap">工具库</span>、看透利润的<span className="whitespace-nowrap">数据库</span>。
            </p>
            <p className="mt-5 text-xs">
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
                    {l.external ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm transition-colors hover:text-brand-orange-ink"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm transition-colors hover:text-brand-orange-ink">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ========== 移动端：极简品牌行 + 手风琴导航 ========== */}
        <div className="md:hidden">
          <Link href="/" className="inline-flex min-h-11 items-center">
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

        {/* ========== 底部版权行：文案与法务链接合并，居中、极小、浅灰 ========== */}
        <div className="mt-5 border-t border-border pt-4 text-center md:mt-10 md:pt-6">
          {/* PC：完整版权 + 公司名 + 法务链接 */}
          <p className="hidden break-words text-xs leading-relaxed text-gray-400 md:block">
            © 2026 {BRAND.name} · 金游™ 出品 | {BRAND.legalEntity} 保留所有权利 |{" "}
            <Link
              href="/privacy"
              className="underline-offset-2 transition-colors hover:text-brand-orange-ink hover:underline"
            >
              隐私政策
            </Link>
            {" · "}
            <Link
              href="/terms"
              className="underline-offset-2 transition-colors hover:text-brand-orange-ink hover:underline"
            >
              服务条款
            </Link>
          </p>
          {/* 移动端：极简单行版权，任何机型都不折行，避免孤字 */}
          <p className="whitespace-nowrap text-[11px] leading-relaxed text-gray-400 md:hidden">
            © 2026 {BRAND.name}·保留所有权利{" "}
            <Link
              href="/privacy"
              className="underline-offset-2 transition-colors hover:text-brand-orange-ink hover:underline"
            >
              隐私政策
            </Link>
            ·
            <Link
              href="/terms"
              className="underline-offset-2 transition-colors hover:text-brand-orange-ink hover:underline"
            >
              服务条款
            </Link>
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-400 md:text-xs">
            本站为知识资产与数据展示平台
          </p>
        </div>
      </div>
    </footer>
  );
}
