import type { Metadata } from "next";

import { CasePageView } from "@/components/site/case-page-view";
import { getInsightTotalPages } from "@/lib/insights";
import { buildMetadata, KEYWORDS } from "@/lib/seo";

/* ============================================================
   智库深度观察分页（第 2 页起）

   generateStaticParams 在构建期预生成每页独立 HTML，
   dynamicParams=false 让不存在的页码直接 404。
   /insights 列表页已 301 到 /cases，但 /insights/page/[page]
   不受中间件精确匹配影响，作为深度观察分页的静态入口，
   保证每一页观察都能被搜索引擎完整抓取。
   ============================================================ */

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const total = getInsightTotalPages();
  // 至少返回一个静态路径，避免 Cloudflare Pages 构建器把本路由判为动态
  // （edge runtime 下无法打包 node:fs）。
  return Array.from({ length: total }, (_, i) => ({ page: String(i + 1) }));
}

export function generateMetadata({
  params,
}: {
  params: { page: string };
}): Metadata {
  const page = Number(params.page) || 1;
  return buildMetadata({
    title: `智库深度观察 · 第 ${page} 页`,
    description: `汽配行业深度观察第 ${page} 页：OE 号匹配、VIN 解析、新能源汽配、出海数据合规等一线方法沉淀。`,
    // 第 1 页内容与 /cases 的「智库深度观察」Tab 相同，canonical 指回主列表页
    path: page === 1 ? "/cases" : `/insights/page/${page}`,
    keywords: [KEYWORDS.data, KEYWORDS.oe, KEYWORDS.vin, KEYWORDS.nev, KEYWORDS.compliance],
  });
}

export default function InsightsPaginationPage({
  params,
}: {
  params: { page: string };
}) {
  return (
    <CasePageView
      page={1}
      insightsPage={Number(params.page) || 1}
      defaultTab="articles"
    />
  );
}
