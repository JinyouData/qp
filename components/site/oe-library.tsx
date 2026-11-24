import Link from "next/link";
import { ArrowRight, Hash } from "lucide-react";

import { Pagination } from "@/components/site/pagination";
import { Card, CardContent } from "@/components/ui/card";
import type { OeEntry } from "@/lib/oe-catalog";

/* ============================================================
   OE 号词条库列表（Server Component）

   - 词条由服务端按页切片后传入，每页都是独立静态 HTML，可被爬虫抓取
   - 统计行 + 卡片网格 + 分页导航；第 1 页固定为 basePath，其余为 pageBase/N
   - 无客户端状态，纯静态链接，保持 SEO 友好
   ============================================================ */

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
  /** 第 1 页地址，独立 OE 页为 /oe，作为 Tab 时为 /cases */
  basePath?: string;
}) {
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
