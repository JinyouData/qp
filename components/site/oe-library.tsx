import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Hash } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { OeEntry } from "@/lib/oe-catalog";

/* ============================================================
   OE 号词条库列表（Server Component）

   - 词条由服务端按页切片后传入，每页都是独立静态 HTML，可被爬虫抓取
   - 统计行 + 卡片网格 + 紧凑分页导航；第 1 页固定为 basePath
   - 分页只显示「首尾页 + 当前页前后各 1 页」，中间用省略号收缩，
     避免 84 页全平铺占满整屏（截图反馈：太影响观感）
   - 无客户端状态，纯静态链接，保持 SEO 友好
   ============================================================ */

/** 生成收缩后的页码序列：1 … 5 6 7 … 84（数字或省略号） */
function compactPages(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

export function OeLibrary({
  pageEntries,
  totalCount,
  currentPage,
  totalPages,
  pageBase,
  basePath = "/oe",
}: {
  pageEntries: OeEntry[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  /** 分页链接基础路径，如 /cases/oe/page/；第 1 页固定为 basePath */
  pageBase: string;
  /** 第 1 页地址，独立 OE 页为 /oe，作为 Tab 时为 /cases */
  basePath?: string;
}) {
  const pageHref = (p: number) => (p === 1 ? basePath : `${pageBase}${p}`);
  const pages = compactPages(currentPage, totalPages);

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
            {pageEntries.map((e) => (
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

        {totalPages > 1 && (
          <nav
            className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
            aria-label="OE 号词条分页"
          >
            {currentPage > 1 ? (
              <Link
                href={pageHref(currentPage - 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs text-muted-foreground hover:border-brand-green/50 hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> 上一页
              </Link>
            ) : (
              <span className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs text-muted-foreground/40">
                <ChevronLeft className="h-3.5 w-3.5" /> 上一页
              </span>
            )}

            {pages.map((p, i) =>
              p === "…" ? (
                <span
                  key={`ellipsis-${i}`}
                  className="inline-flex h-9 w-7 items-center justify-center text-xs text-muted-foreground/50"
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={pageHref(p)}
                  aria-current={p === currentPage ? "page" : undefined}
                  className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-xs ${
                    p === currentPage
                      ? "border-brand-green bg-brand-green text-white"
                      : "text-muted-foreground hover:border-brand-green/50 hover:text-foreground"
                  }`}
                >
                  {p}
                </Link>
              )
            )}

            {currentPage < totalPages ? (
              <Link
                href={pageHref(currentPage + 1)}
                className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs text-muted-foreground hover:border-brand-green/50 hover:text-foreground"
              >
                下一页 <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <span className="inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs text-muted-foreground/40">
                下一页 <ChevronRight className="h-3.5 w-3.5" />
              </span>
            )}
          </nav>
        )}
      </div>
    </section>
  );
}
