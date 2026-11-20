import type { Metadata } from "next";

import { CasePageView } from "@/components/site/case-page-view";
import { getCaseTotalPages } from "@/lib/case-studies";
import { buildMetadata, KEYWORDS } from "@/lib/seo";

/* ============================================================
   案例库分页（第 2 页起）

   generateStaticParams 在构建期预生成每页独立 HTML，
   dynamicParams=false 让不存在的页码直接 404。
   纯静态托管下这是让「分页后的页面依然能被爬虫抓取」的可靠做法。
   ============================================================ */

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const total = getCaseTotalPages();
  // 必须至少返回一个静态路径，否则 Next 会把本路由判为动态，
  // Cloudflare Pages 构建器将要求 edge runtime，而 edge 下无法打包 node:fs。
  // 第 1 页与 /cases 内容相同（canonical 指回 /cases），2..total 为真正的后续页。
  return Array.from({ length: total }, (_, i) => ({
    page: String(i + 1),
  }));
}

export function generateMetadata({
  params,
}: {
  params: { page: string };
}): Metadata {
  const page = Number(params.page) || 2;
  return buildMetadata({
    title: `智库观察 · 第 ${page} 页`,
    description: `汽配诊断案例库第 ${page} 页，按标签筛选车灯、脚垫、刹车片、改装件、库存周转等真实场景，含可查证的量化结果。`,
    // 第 1 页与 /cases 内容相同，canonical 指回主列表页，避免重复收录
    path: page === 1 ? "/cases" : `/cases/page/${page}`,
    keywords: [KEYWORDS.data, KEYWORDS.oe, KEYWORDS.sop, KEYWORDS.compliance],
  });
}

export default function CasesPaginationPage({
  params,
}: {
  params: { page: string };
}) {
  return <CasePageView page={Number(params.page) || 2} />;
}
