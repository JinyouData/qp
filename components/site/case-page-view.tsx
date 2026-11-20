import { CaseLibrary } from "@/components/site/case-library";
import { JsonLd, breadcrumbSchema } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import {
  CASES_PER_PAGE,
  getAllCaseCards,
  getAllTags,
  getCaseTotalPages,
} from "@/lib/case-studies";

/* ============================================================
   案例库页面视图（Server Component）

   分页由服务端计算并静态预生成：
   - /cases          第 1 页
   - /cases/page/2   第 2 页（generateStaticParams 预渲染）
   每页是独立 HTML，爬虫可抓取；客户端只做标签即时筛选。
   ============================================================ */

export function CasePageView({ page }: { page: number }) {
  const allCases = getAllCaseCards();
  const tags = getAllTags();
  const totalPages = getCaseTotalPages();
  const current = Math.min(Math.max(1, page), totalPages);
  const pageCases = allCases.slice(
    (current - 1) * CASES_PER_PAGE,
    current * CASES_PER_PAGE
  );

  const breadcrumb =
    current === 1
      ? [{ name: "首页", url: "/" }, { name: "案例库", url: "/cases" }]
      : [
          { name: "首页", url: "/" },
          { name: "案例库", url: "/cases" },
          { name: `第 ${current} 页`, url: `/cases/page/${current}` },
        ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumb)} />

      <PageHero
        tag="CASE LIBRARY"
        title="汽配案例库"
        desc="按标签筛选已经跑通的诊断场景。每篇都写明客户痛点、数据方案与可查证的量化结果。"
      />

      <CaseLibrary
        pageCases={pageCases}
        allCases={allCases}
        tags={tags}
        currentPage={current}
        totalPages={totalPages}
        pageBase="/cases/page/"
      />
    </>
  );
}
