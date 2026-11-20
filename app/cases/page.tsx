import type { Metadata } from "next";

import { CaseLibrary } from "@/components/site/case-library";
import { JsonLd, breadcrumbSchema } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { buildMetadata, KEYWORDS } from "@/lib/seo";
import { getAllCaseStudies, getAllTags } from "@/lib/case-studies";

export const metadata: Metadata = buildMetadata({
  title: "汽配案例库：按标签筛选的真实数据诊断案例",
  description:
    "按车灯、脚垫、刹车片、改装件、库存周转等标签筛选汽配跨境与国内后市场的真实诊断案例，每篇含痛点、方案与可查证的量化结果。",
  path: "/cases",
  keywords: [KEYWORDS.data, KEYWORDS.oe, KEYWORDS.sop, KEYWORDS.compliance],
});

export default function CasesPage() {
  const cases = getAllCaseStudies();
  const tags = getAllTags();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "首页", url: "/" },
          { name: "案例库", url: "/cases" },
        ])}
      />

      <PageHero
        tag="CASE LIBRARY"
        title="汽配案例库"
        desc="按标签筛选已经跑通的诊断场景。每篇都写明客户痛点、数据方案与可查证的量化结果。"
      />

      <CaseLibrary cases={cases} tags={tags} />
    </>
  );
}
