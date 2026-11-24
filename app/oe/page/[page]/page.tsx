import type { Metadata } from "next";

import { OeLibrary } from "@/components/site/oe-library";
import { PageHero } from "@/components/site/page-hero";
import { JsonLd, breadcrumbSchema } from "@/components/site/json-ld";
import {
  getAllOeEntries,
  getOeTotalPages,
  OE_PER_PAGE,
} from "@/lib/oe-catalog";
import { buildMetadata, KEYWORDS } from "@/lib/seo";

/* ============================================================
   OE 号词条库分页（第 2 页起）

   generateStaticParams 在构建期预生成每页独立 HTML，
   dynamicParams=false 让不存在的页码直接 404。
   纯静态托管下这是让「分页后的页面依然能被爬虫抓取」的可靠做法。
   ============================================================ */

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const total = getOeTotalPages();
  // 必须至少返回一个静态路径，否则 Next 会把本路由判为动态，
  // Cloudflare Pages 构建器将要求 edge runtime，而 edge 下无法打包 node:fs。
  // 第 1 页与 /oe 内容相同（canonical 指回 /oe），2..total 为真正的后续页。
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
    // 第 1 页与 /oe 内容相同，canonical 指回主列表页，避免重复收录
    path: page === 1 ? "/oe" : `/oe/page/${page}`,
    keywords: [KEYWORDS.oe, KEYWORDS.vin, KEYWORDS.data, "OE号词条"],
  });
}

export default function OePaginationPage({
  params,
}: {
  params: { page: string };
}) {
  const all = getAllOeEntries();
  const totalPages = getOeTotalPages();
  const page = Math.min(Math.max(1, Number(params.page) || 1), totalPages);
  const pageEntries = all.slice((page - 1) * OE_PER_PAGE, page * OE_PER_PAGE);

  const breadcrumb =
    page === 1
      ? [{ name: "首页", url: "/" }, { name: "OE 号词条库", url: "/oe" }]
      : [
          { name: "首页", url: "/" },
          { name: "OE 号词条库", url: "/oe" },
          { name: `第 ${page} 页`, url: `/oe/page/${page}` },
        ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumb)} />
      <PageHero
        tag="OE CODE LIBRARY"
        title="OE 号词条库"
        desc="按 OE 号看适配车型、黄金毛利带与跨境选品价值。每个词条都是独立可索引的结构化页面。"
      />
      <OeLibrary
        pageEntries={pageEntries}
        totalCount={all.length}
        currentPage={page}
        totalPages={totalPages}
      />
    </>
  );
}
