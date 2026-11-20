import type { Metadata } from "next";

import { CasePageView } from "@/components/site/case-page-view";
import { buildMetadata, KEYWORDS } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata: Metadata = buildMetadata({
  title: "智库观察：真实客户案例与行业深度洞察",
  description:
    "查得到的真实客户案例，看得到的行业深度洞察。平均退货率降低 18%、覆盖 200+ 细分品类、累计诊断 500+ SKU；按标签筛选真实诊断案例，并附 OE 号匹配、VIN 解析等一线观察。",
  path: "/cases",
  keywords: [KEYWORDS.data, KEYWORDS.oe, KEYWORDS.sop, KEYWORDS.compliance],
});

export default function CasesPage() {
  return <CasePageView page={1} />;
}
