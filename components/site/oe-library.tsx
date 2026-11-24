"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Hash } from "lucide-react";
import { useState } from "react";

import { Pagination } from "@/components/site/pagination";
import { Card, CardContent } from "@/components/ui/card";
import type { OeEntry } from "@/lib/oe-catalog";

/* ============================================================
   OE 号词条库列表（Client Component）

   - 词条由服务端按页切片后传入，每页都是独立静态 HTML，可被爬虫抓取
   - 移动端初始只显示前 3 条，其余 CSS 折叠但 DOM 始终保留（SEO 友好），
     点击「展开更多词条」平滑展开；PC 端用 md:contents 恢复完整网格
   - 统计行 + 卡片网格 + 分页导航；第 1 页固定为 basePath，其余为 pageBase/N
   ============================================================ */

function OeCard({ entry }: { entry: OeEntry }) {
  return (
    <li>
      <Link href={`/oe/${entry.oeCode}`} className="block h-full">
        <Card className="card-hover h-full">
          <CardContent className="flex h-full flex-col p-5">
            <div className="text-xs text-muted-foreground">{entry.category}</div>
            <h2 className="mt-1 font-mono text-lg font-bold break-all">{entry.oeCode}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{entry.partName}</p>
            <div className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs">
              <span className="font-semibold text-brand-green">{entry.goldenMargin}</span>
              <span className="inline-flex items-center gap-1 text-primary">
                查看词条 <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}

export function OeLibrary({
  pageEntries,
  totalCount,
  currentPage,
  totalPages,
  pageBase,
  basePath = "/cases/oe/page/1",
}: {
  pageEntries: OeEntry[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  /** 分页链接基础路径，如 /cases/oe/page/；第 1 页固定为 basePath */
  pageBase: string;
  /** 第 1 页地址 */
  basePath?: string;
}) {
  /** 移动端折叠状态：仅控制 CSS 展示，卡片 DOM 始终存在（SEO 友好） */
  const [expanded, setExpanded] = useState(false);
  const pageHref = (p: number) => (p === 1 ? basePath : `${pageBase}${p}`);

  return (
    <section className="section-pad">
      <div className="container-site">
        <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Hash className="h-4 w-4" />
          <span>
            共 {totalCount} 个 OE 号词条 · 第 {currentPage}/{totalPages} 页
          </span>
        </div>

        {pageEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            词条正在整理中，添加主理人企微，更新后第一时间发你。
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageEntries.slice(0, 3).map((e) => (
              <OeCard key={e.oeCode} entry={e} />
            ))}

            {pageEntries.length > 3 && (
              <div
                className="case-extra-wrap md:contents"
                data-open={expanded ? "true" : "false"}
              >
                <div className="case-extra-inner flex flex-col gap-4 md:contents">
                  {pageEntries.slice(3).map((e) => (
                    <OeCard key={e.oeCode} entry={e} />
                  ))}
                </div>
              </div>
            )}
          </ul>
        )}

        {/* 移动端展开/收起：仅折叠 CSS 展示，卡片 DOM 始终在 HTML 中 */}
        {pageEntries.length > 3 && (
          <div className="mt-4 flex justify-center md:hidden">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-brand-green/40 bg-brand-green-soft/50 px-6 text-sm font-semibold text-brand-green transition-colors hover:bg-brand-green-soft"
            >
              {expanded ? (
                <>收起词条 <ArrowUp className="h-4 w-4" /></>
              ) : (
                <>展开更多词条 <ArrowDown className="h-4 w-4" /></>
              )}
            </button>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageHref={pageHref}
          label="OE 号词条分页"
        />
      </div>
    </section>
  );
}
