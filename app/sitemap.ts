import fs from "node:fs";
import path from "node:path";
import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";
import { getAllInsights, getInsightTotalPages } from "@/lib/insights";
import { getAllCaseStudySlugs, getCaseTotalPages } from "@/lib/case-studies";
import { FALLBACK_PRODUCTS } from "@/lib/data";

/**
 * 站点地图在构建期静态生成。
 * 路由不是手写清单，而是递归遍历 app/ 下所有 page.tsx 自动推导：
 * 新增页面 / 新增产品 slug / 新增洞察文章，都会自动进入 sitemap。
 */
export const dynamic = "force-static";

const APP_DIR = path.join(process.cwd(), "app");
const PAGE_FILE = /^page\.(tsx?|jsx?|mdx)$/;
const DYNAMIC_SEGMENT = /\[[^\]]+\]/;

/** 动态段 [slug] 的真实值来源；新增动态目录时在此登记即可 */
const DYNAMIC_SOURCES: Record<string, () => string[]> = {
  "/products/[slug]": () => FALLBACK_PRODUCTS.map((p) => p.slug),
  "/insights/[slug]": () => getAllInsights().map((i) => i.slug),
  "/cases/[slug]": () => getAllCaseStudySlugs(),
  // 案例库分页：第 1 页由 /cases 承担，这里展开 2..total，供爬虫逐页发现
  "/cases/page/[page]": () =>
    Array.from({ length: Math.max(0, getCaseTotalPages() - 1) }, (_, i) => String(i + 2)),
  // 深度观察分页：第 1 页由 /cases 的 Tab 承担，这里展开 2..total
  "/insights/page/[page]": () =>
    Array.from({ length: Math.max(0, getInsightTotalPages() - 1) }, (_, i) => String(i + 2)),
  // 注：page/1 的 canonical 指回 /cases，故不在 sitemap 重复登记
};

interface DiscoveredRoute {
  route: string;
  noindex: boolean;
}

/**
 * 递归扫描 app/ 目录：
 * - 目录里有 page.tsx 即为一个有效路由
 * - (group) 路由组不产生 URL 片段；_ 开头的私有目录与 api/ 不进 sitemap
 * - 页面自己声明 noindex: true 的跳过，避免 sitemap 与 robots 指令互相矛盾
 */
function discoverRoutes(dir = APP_DIR, segments: string[] = []): DiscoveredRoute[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out: DiscoveredRoute[] = [];

  const page = entries.find((e) => e.isFile() && PAGE_FILE.test(e.name));
  if (page) {
    const source = fs.readFileSync(path.join(dir, page.name), "utf8");
    out.push({
      route: `/${segments.join("/")}`,
      noindex: /\bnoindex\s*:\s*true\b/.test(source),
    });
  }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith("_") || e.name.startsWith(".") || e.name === "api") continue;
    const isGroup = /^\(.+\)$/.test(e.name);
    out.push(
      ...discoverRoutes(path.join(dir, e.name), isGroup ? segments : [...segments, e.name])
    );
  }

  return out;
}

/** 把 [slug] 展开成真实 URL；未登记来源的动态路由不猜测，避免生成 404 条目 */
function allIndexableRoutes(): string[] {
  const urls = new Set<string>();

  // 已 301 到 /cases 的旧入口不进 sitemap（避免把权重导向跳转页）
  const REDIRECTED_TO_CASES = new Set<string>(["/content", "/insights"]);

  for (const { route, noindex } of discoverRoutes()) {
    if (noindex || REDIRECTED_TO_CASES.has(route)) continue;
    if (!DYNAMIC_SEGMENT.test(route)) {
      urls.add(route);
      continue;
    }
    const source = DYNAMIC_SOURCES[route];
    if (!source) continue;
    for (const slug of source()) {
      if (slug) urls.add(route.replace(DYNAMIC_SEGMENT, slug));
    }
  }

  const rank = (p: string) => (p === "/" ? 0 : p.startsWith("/products") ? 1 : 2);
  return Array.from(urls).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/** 首页 1.0；产品中心与全部产品详情页 0.8；其余页面 0.5 */
function priorityOf(route: string): number {
  if (route === "/") return 1.0;
  // 工具库四个 AI 助手是重点落地页，与产品详情页同级权重
  if (route === "/products" || route.startsWith("/products/") || route.startsWith("/tools/")) return 0.8;
  // 案例词条是 SEO 独立收录落地点，优先级高于普通内页
  if (route === "/cases" || route.startsWith("/cases/")) return 0.7;
  // 深度观察分页与文章详情同为 SEO 收录重点
  if (route.startsWith("/insights/")) return 0.7;
  return 0.5;
}

function changeFrequencyOf(route: string): MetadataRoute.Sitemap[number]["changeFrequency"] {
  if (route === "/" || route === "/insights" || route.startsWith("/cases")) return "weekly";
  if (route === "/privacy" || route === "/terms") return "yearly";
  return "monthly";
}

export default function sitemap(): MetadataRoute.Sitemap {
  // 每次构建刷新为当前时间；推代码上线即等于更新 lastmod
  const now = new Date();

  return allIndexableRoutes().map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: changeFrequencyOf(route),
    priority: priorityOf(route),
  }));
}
