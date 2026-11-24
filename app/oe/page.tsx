import type { Metadata } from "next";

import { OeLibrary } from "@/components/site/oe-library";
import { PageHero } from "@/components/site/page-hero";
import { buildMetadata, KEYWORDS } from "@/lib/seo";
import {
  getAllOeEntries,
  getOeTotalPages,
  OE_PER_PAGE,
} from "@/lib/oe-catalog";

export const dynamic = "force-static";

export const metadata: Metadata = buildMetadata({
  title: "OE 号词条库：适配车型与跨境利润分析",
  description:
    "按 OE 号查询适配车型、黄金毛利带与跨境选品价值：每个词条包含核心卡片、适配对照表、AI 选品总结与结构化数据，内链一线行业洞察。",
  path: "/oe",
  keywords: [KEYWORDS.oe, KEYWORDS.vin, KEYWORDS.data, "OE号词条"],
});

export default function OeIndexPage() {
  const all = getAllOeEntries();
  const totalPages = getOeTotalPages();
  const pageEntries = all.slice(0, OE_PER_PAGE);

  return (
    <>
      <PageHero
        tag="OE CODE LIBRARY"
        title="OE 号词条库"
        desc="按 OE 号看适配车型、黄金毛利带与跨境选品价值。每个词条都是独立可索引的结构化页面。"
      />
      <OeLibrary
        pageEntries={pageEntries}
        totalCount={all.length}
        currentPage={1}
        totalPages={totalPages}
      />
    </>
  );
}
