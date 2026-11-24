import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

/* ============================================================
   共用分页导航（Server / Client 组件均可使用）

   - 移动端：上一页 / 第 N / M 页 / 下一页，单行，不铺页码
   - PC 端：收缩页码 1 … 4 [5] 6 … 84（当前页 ±2，首尾常显）
   - 全部为静态 <Link>，每页独立 HTML 可被爬虫抓取
   ============================================================ */

/** 生成要显示的页码，中间用 "…" 省略（字符串项） */
function pageItems(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current - 2, current - 1, current, current + 1, current + 2]);
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out: Array<number | "…"> = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({
  currentPage,
  totalPages,
  pageHref,
  label = "分页导航",
}: {
  currentPage: number;
  totalPages: number;
  /** 页码 → URL，第 1 页通常指回列表页主路径 */
  pageHref: (page: number) => string;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const prevLink = hasPrev ? (
    <Link
      href={pageHref(currentPage - 1)}
      className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm text-muted-foreground hover:border-brand-green/50 hover:text-foreground sm:px-4"
    >
      <ChevronLeft className="h-4 w-4" /> 上一页
    </Link>
  ) : (
    <span className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm text-muted-foreground/40 sm:px-4">
      <ChevronLeft className="h-4 w-4" /> 上一页
    </span>
  );

  const nextLink = hasNext ? (
    <Link
      href={pageHref(currentPage + 1)}
      className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm text-muted-foreground hover:border-brand-green/50 hover:text-foreground sm:px-4"
    >
      下一页 <ChevronRight className="h-4 w-4" />
    </Link>
  ) : (
    <span className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 text-sm text-muted-foreground/40 sm:px-4">
      下一页 <ChevronRight className="h-4 w-4" />
    </span>
  );

  return (
    <nav className="mt-10 flex justify-center" aria-label={label}>
      {/* 移动端：单行极简 */}
      <div className="flex items-center gap-2 md:hidden">
        {prevLink}
        <span className="whitespace-nowrap text-sm text-muted-foreground">
          第 {currentPage} / {totalPages} 页
        </span>
        {nextLink}
      </div>

      {/* PC 端：收缩页码 */}
      <div className="hidden flex-wrap items-center justify-center gap-2 md:flex">
        {prevLink}
        {pageItems(currentPage, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="inline-flex h-11 w-9 items-center justify-center text-sm text-muted-foreground/60">
              …
            </span>
          ) : (
            <Link
              key={p}
              href={pageHref(p)}
              aria-current={p === currentPage ? "page" : undefined}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-lg border text-sm ${
                p === currentPage
                  ? "border-brand-green bg-brand-green text-white"
                  : "text-muted-foreground hover:border-brand-green/50 hover:text-foreground"
              }`}
            >
              {p}
            </Link>
          )
        )}
        {nextLink}
      </div>
    </nav>
  );
}
