/* ============================================================
   案例词条系统 · 对外兼容层

   真正的数据源已迁移到 content/cases/*.mdx，由 lib/case-catalog.ts
   通过 gray-matter 读取。本文件保留原有导出名，避免改动
   /content、/cases/[slug]、sitemap.ts 等所有调用方。

   新增案例只需在 content/cases/ 下放一个 .mdx 文件。
   ============================================================ */

export {
  getAllCaseStudies,
  getAllCaseCards,
  getCaseStudy,
  getAllCaseStudySlugs,
  getAllTags,
  getCasesByTag,
  getRelatedCases,
  getCaseTotalPages,
  slugForLegacyCase,
  CASES_PER_PAGE,
} from "./case-catalog";

export type { CaseMetric, CaseCardData, CaseStudyEntry } from "./case-catalog";

import { getAllCaseStudies } from "./case-catalog";
import type { CaseStudyEntry } from "./case-catalog";

/** 兼容旧调用：CASE_STUDIES 为全部 MDX 案例的数组快照 */
export const CASE_STUDIES: CaseStudyEntry[] = getAllCaseStudies();
