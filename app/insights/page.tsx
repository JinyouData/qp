import type { Metadata } from "next";

import { CasePageView } from "@/components/site/case-page-view";
import { buildMetadata, KEYWORDS } from "@/lib/seo";

/* ============================================================
   /insights 旧列表页

   已通过 middleware 301 到 /cases（两个 Tab 统一在 /cases 展示），
   文件保留仅为 /insights/[slug] 父路由的目录结构完整性。
   分页入口见 /insights/page/[page]。
   ============================================================ */

export const dynamic = "force-static";

export const metadata: Metadata = buildMetadata({
  title: "智库观察：真实客户案例与行业深度洞察",
  description:
    "本页已合并至 /cases：客户案例库与智库深度观察统一在同一入口，按标签筛选、分页浏览。",
  path: "/cases",
  keywords: [KEYWORDS.data, KEYWORDS.oe, KEYWORDS.vin, KEYWORDS.nev, KEYWORDS.compliance],
});

export default function InsightsPage() {
  return <CasePageView page={1} insightsPage={1} defaultTab="articles" />;
}
