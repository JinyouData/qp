import type { Metadata } from "next";

import { CasePageView } from "@/components/site/case-page-view";
import { getOeTotalPages } from "@/lib/oe-catalog";
import { buildMetadata, KEYWORDS } from "@/lib/seo";

/* ============================================================
   智库观察 · OE 号词条库 Tab 分页（第 2 页起）

   generateStaticParams 在构建期预生成每页独立 HTML，
   dynamicParams=false 让不存在的页码直接 404。
   页面复用 CasePageView 并以 defaultTab="oe" 自动选中 OE Tab，
   三个 Tab 的内容依然完整存在于每页 HTML 中，爬虫可抓取。
   ============================================================ */

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const total = getOeTotalPages();
  return Array.from({ length: total }, (_, i) => ({ page: String(i + 1) }));
}

export function generateMetadata({
  params,
}: {
  params: { page: string };
}): Metadata {
  const page = Number(params.page) || 2;
  return buildMetadata({
    title: `OE 号词条库 · 第 ${page} 页`,
    description: `OE 号词条库第 ${page} 页，按 OE 号查询适配车型、黄金毛利带与跨境选品价值，含 AI 选品总结与结构化数据。`,
    // 第 1 页内容与 /cases 相同，canonical 指回主列表页，避免重复收录
    path: page === 1 ? "/cases" : `/cases/oe/page/${page}`,
    keywords: [KEYWORDS.oe, KEYWORDS.vin, KEYWORDS.data, "OE号词条"],
  });
}

export default function OeTabPaginationPage({
  params,
}: {
  params: { page: string };
}) {
  return (
    <CasePageView
      page={1}
      oePage={Number(params.page) || 1}
      defaultTab="oe"
    />
  );
}
