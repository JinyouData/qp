import type { Metadata } from "next";

import { CasePageView } from "@/components/site/case-page-view";
import { buildMetadata, KEYWORDS } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata: Metadata = buildMetadata({
  title: "汽配案例库：按标签筛选的真实数据诊断案例",
  description:
    "按车灯、脚垫、刹车片、改装件、库存周转等标签筛选汽配跨境与国内后市场的真实诊断案例，每篇含痛点、方案与可查证的量化结果。",
  path: "/cases",
  keywords: [KEYWORDS.data, KEYWORDS.oe, KEYWORDS.sop, KEYWORDS.compliance],
});

export default function CasesPage() {
  return <CasePageView page={1} />;
}
