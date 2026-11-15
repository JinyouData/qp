import type { Metadata } from "next";

import { buildMetadata, KEYWORDS } from "@/lib/seo";
import { AI_TOOLS } from "@/lib/ai-tools";
import { AiToolPage } from "@/components/site/ai-tool-page";

const cfg = AI_TOOLS.inventory;

export const metadata: Metadata = buildMetadata({
  title: cfg.seo.title,
  description: cfg.seo.description,
  path: cfg.path,
  keywords: [...cfg.seo.keywords, KEYWORDS.data, KEYWORDS.sop],
});

export default function AiInventoryPage() {
  return <AiToolPage tool="inventory" />;
}
