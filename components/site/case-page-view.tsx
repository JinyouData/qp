import { CaseLibrary } from "@/components/site/case-library";
import { CaseMetrics, TestimonialsStrip } from "@/components/site/case-results-strip";
import { InsightsLibrary } from "@/components/site/insights-library";
import { InsightsTabs } from "@/components/site/insights-tabs";
import { JsonLd, breadcrumbSchema } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import {
  CASES_PER_PAGE,
  getAllCaseCards,
  getAllTags,
  getCaseTotalPages,
} from "@/lib/case-studies";
import {
  getAllInsightTags,
  getAllInsights,
  getInsightTotalPages,
  INSIGHTS_PER_PAGE,
} from "@/lib/insights";

/* ============================================================
   案例库页面视图（Server Component）

   分页由服务端计算并静态预生成：
   - /cases          第 1 页
   - /cases/page/2   第 2 页（generateStaticParams 预渲染）
   每页是独立 HTML，爬虫可抓取；客户端只做标签即时筛选。
   ============================================================ */

export function CasePageView({
  page,
  insightsPage = 1,
  defaultTab = "cases",
}: {
  page: number;
  /** 深度观察页码；默认第 1 页，与案例分页解耦 */
  insightsPage?: number;
  defaultTab?: "cases" | "articles";
}) {
  const allCases = getAllCaseCards();
  const tags = getAllTags();
  const totalPages = getCaseTotalPages();
  const current = Math.min(Math.max(1, page), totalPages);
  const pageCases = allCases.slice(
    (current - 1) * CASES_PER_PAGE,
    current * CASES_PER_PAGE
  );

  // 深度观察与案例库共用同一页号：服务端切片，保证每页独立 HTML 可被抓取
  const allInsights = getAllInsights();
  const insightTags = getAllInsightTags();
  const insightTotalPages = getInsightTotalPages();
  const insightCurrent = Math.min(Math.max(1, insightsPage), insightTotalPages);
  const pageInsights = allInsights.slice(
    (insightCurrent - 1) * INSIGHTS_PER_PAGE,
    insightCurrent * INSIGHTS_PER_PAGE
  );

  const breadcrumb =
    current === 1
      ? [{ name: "首页", url: "/" }, { name: "智库观察", url: "/cases" }]
      : [
          { name: "首页", url: "/" },
          { name: "智库观察", url: "/cases" },
          { name: `第 ${current} 页`, url: `/cases/page/${current}` },
        ];

  return (
    <>
      <JsonLd data={breadcrumbSchema(breadcrumb)} />

      <PageHero
        tag="INSIGHTS & CASES"
        title="智库观察"
        desc="查得到的真实客户案例，看得到的行业深度洞察。"
      >
        <CaseMetrics />
      </PageHero>

      <TestimonialsStrip />

      <InsightsTabs
        defaultTab={defaultTab}
        casesLabel="客户案例库"
        articlesLabel="智库深度观察"
        cases={
          <CaseLibrary
            pageCases={pageCases}
            allCases={allCases}
            tags={tags}
            currentPage={current}
            totalPages={totalPages}
            pageBase="/cases/page/"
          />
        }
        articles={
          <InsightsLibrary
            pageItems={pageInsights}
            allItems={allInsights}
            tags={insightTags}
            currentPage={insightCurrent}
            totalPages={insightTotalPages}
            pageBase="/insights/page/"
          />
        }
      />
    </>
  );
}
