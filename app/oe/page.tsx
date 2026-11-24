import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Hash } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PageHero } from "@/components/site/page-hero";
import { buildMetadata, KEYWORDS } from "@/lib/seo";
import { getAllOeEntries } from "@/lib/oe-catalog";

export const dynamic = "force-static";

export const metadata: Metadata = buildMetadata({
  title: "OE 号词条库：适配车型与跨境利润分析",
  description:
    "按 OE 号查询适配车型、黄金毛利带与跨境选品价值：每个词条包含核心卡片、适配对照表、AI 选品总结与结构化数据，内链一线行业洞察。",
  path: "/oe",
  keywords: [KEYWORDS.oe, KEYWORDS.vin, KEYWORDS.data, "OE号词条"],
});

export default function OeIndexPage() {
  const entries = getAllOeEntries();

  return (
    <>
      <PageHero
        tag="OE CODE LIBRARY"
        title="OE 号词条库"
        desc="按 OE 号看适配车型、黄金毛利带与跨境选品价值。每个词条都是独立可索引的结构化页面。"
      />

      <section className="section-pad">
        <div className="container-site">
          <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="h-4 w-4" /> 共 {entries.length} 个 OE 号词条
          </div>

          {entries.length === 0 ? (
            <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              词条正在整理中，添加主理人企微，更新后第一时间发你。
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((e) => (
                <li key={e.oeCode}>
                  <Link href={`/oe/${e.oeCode}`} className="block h-full">
                    <Card className="card-hover h-full">
                      <CardContent className="flex h-full flex-col p-5">
                        <div className="text-xs text-muted-foreground">{e.category}</div>
                        <h2 className="mt-1 font-mono text-lg font-bold break-all">{e.oeCode}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">{e.partName}</p>
                        <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs">
                          <span className="font-semibold text-brand-green">{e.goldenMargin}</span>
                          <span className="inline-flex items-center gap-1 text-primary">
                            查看词条 <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
