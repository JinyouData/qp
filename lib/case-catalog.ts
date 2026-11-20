import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/* ============================================================
   案例矩阵 · MDX 内容层（content/cases/*.mdx）

   录入只需六个字段：
     title / tags / pain / solution / results / comment
   系统自动渲染成四板块详情页，并注入 Article Schema、
   进入 sitemap 与 llms.txt。新增一篇 = 新增一个 .mdx 文件。

   兼容扩展字段（可选）：description / date / no / quote /
   author / audienceTags / background / diagnosis / outcome / commentary
   ============================================================ */

const CONTENT_DIR = path.join(process.cwd(), "content", "cases");

export interface CaseMetric {
  value: string;
  label: string;
}

export interface CaseStudyEntry {
  /** URL 段，取自 MDX 文件名 */
  slug: string;
  /** 卡片编号，缺省按排序自动生成 */
  no: string;
  title: string;
  description: string;
  tags: string[];
  audienceTags: string[];
  date: string;
  /** 痛点摘要（卡片用） */
  pain: string;
  /** 方案摘要（卡片用） */
  solution: string;
  results: CaseMetric[];
  quote: string;
  author: string;
  background: string[];
  diagnosis: string[];
  outcome: string[];
  commentary: string[];
}

/** frontmatter 中 pain/solution/comment 支持单段字符串或多段数组 */
function toParagraphs(value: unknown): string[] {
  if (typeof value === "string") {
    const t = value.trim();
    return t ? t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [];
  }
  if (Array.isArray(value)) {
    return value
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim());
  }
  return [];
}

/** results 支持数组、单字符串（"-18% | 退货率"）或对象 */
function toResults(value: unknown): CaseMetric[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          const parts = item.split(/\s*[|｜]\s*/);
          return { value: parts[0].trim(), label: (parts[1] ?? "关键指标").trim() };
        }
        if (item && typeof item === "object") {
          const o = item as Record<string, unknown>;
          return {
            value: String(o.value ?? "").trim(),
            label: String(o.label ?? "关键指标").trim(),
          };
        }
        return null;
      })
      .filter((r): r is CaseMetric => Boolean(r && r.value));
  }
  if (typeof value === "string" && value.trim()) {
    return toResults([value]);
  }
  return [];
}

function firstText(value: unknown): string {
  return toParagraphs(value)[0] ?? "";
}

/** description 缺省由痛点 + 方案 + 结果自动拼装，控制在一个 meta 摘要的长度 */
function buildDescription(
  fm: Record<string, unknown>,
  pain: string[],
  solution: string[],
  results: CaseMetric[]
): string {
  if (typeof fm.description === "string" && fm.description.trim()) {
    return fm.description.trim();
  }
  const head = pain[0] ?? "";
  const plan = solution[0] ?? "";
  const numbers = results.map((r) => `${r.label}${r.value}`).join("、");
  const raw = numbers ? `${head}${plan}结果：${numbers}。` : `${head}${plan}`;
  return raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
}

function readAll(): CaseStudyEntry[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];

  const files = fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .sort();

  const entries = files.map((file, index) => {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
    const { data } = matter(raw);
    const fm = data as Record<string, unknown>;

    const pain = toParagraphs(fm.pain);
    const solution = toParagraphs(fm.solution);
    const comment = toParagraphs(fm.comment);
    const results = toResults(fm.results ?? fm.result);

    // 扩展字段存在时优先用扩展字段，否则由六字段自动派生四板块
    const background = toParagraphs(fm.background).length
      ? toParagraphs(fm.background)
      : pain;
    const diagnosis = toParagraphs(fm.diagnosis).length
      ? toParagraphs(fm.diagnosis)
      : solution;
    const outcome = toParagraphs(fm.outcome).length
      ? toParagraphs(fm.outcome)
      : [
          `项目交付后按同一口径复盘：${results
            .map((r) => `${r.label}${r.value}`)
            .join("，")}。以上数字来自已交付项目，经客户授权后对外披露；不同类目的改善幅度会有差异。`,
        ];
    const commentary = toParagraphs(fm.commentary).length
      ? toParagraphs(fm.commentary)
      : comment;

    const date =
      typeof fm.date === "string" && fm.date.trim()
        ? fm.date.trim()
        : "2026-11-20";

    return {
      slug: file.replace(/\.mdx$/, ""),
      no:
        typeof fm.no === "string" && fm.no.trim()
          ? fm.no.trim()
          : `CASE ${String(index + 1).padStart(2, "0")}`,
      title:
        typeof fm.title === "string" && fm.title.trim()
          ? fm.title.trim()
          : file.replace(/\.mdx$/, ""),
      description: buildDescription(fm, pain, solution, results),
      tags: Array.isArray(fm.tags)
        ? (fm.tags as unknown[]).filter((t): t is string => typeof t === "string")
        : [],
      audienceTags: Array.isArray(fm.audienceTags)
        ? (fm.audienceTags as unknown[]).filter(
            (t): t is string => typeof t === "string"
          )
        : [],
      date,
      pain: pain[0] ?? "",
      solution: solution[0] ?? "",
      results,
      quote:
        typeof fm.quote === "string" && fm.quote.trim()
          ? fm.quote.trim()
          : comment[0] ?? "",
      author:
        typeof fm.author === "string" && fm.author.trim()
          ? fm.author.trim()
          : "金游™数据智库 · 已脱敏案例",
      background,
      diagnosis,
      outcome,
      commentary,
    } satisfies CaseStudyEntry;
  });

  // 新案例在前：按日期降序，同日按文件名
  return entries.sort((a, b) =>
    a.date === b.date ? a.slug.localeCompare(b.slug) : a.date < b.date ? 1 : -1
  );
}

/** 每页展示的案例数：列表页默认只加载前 9 篇，为未来 100+ 案例做准备 */
export const CASES_PER_PAGE = 9;

/** 列表卡片所需的精简数据（避免把长段落传给客户端组件） */
export interface CaseCardData {
  slug: string;
  no: string;
  title: string;
  tags: string[];
  /** 一句话摘要：痛点或方案的首句 */
  summary: string;
  /** 最多两个核心结果数据 */
  results: CaseMetric[];
}

function firstSentence(text: string): string {
  const t = (text ?? "").trim();
  if (!t) return "";
  const m = t.match(/^[^。！？\n]+[。！？]?/);
  return m ? m[0] : t.slice(0, 60);
}

export function toCaseCard(c: CaseStudyEntry): CaseCardData {
  return {
    slug: c.slug,
    no: c.no,
    title: c.title,
    tags: c.tags,
    summary: firstSentence(c.pain || c.solution),
    results: c.results.slice(0, 2),
  };
}

export function getAllCaseCards(): CaseCardData[] {
  return readAll().map(toCaseCard);
}

/** 总页数（至少 1 页） */
export function getCaseTotalPages(): number {
  return Math.max(1, Math.ceil(readAll().length / CASES_PER_PAGE));
}

export function getAllCaseStudies(): CaseStudyEntry[] {
  return readAll();
}

export function getCaseStudy(slug: string): CaseStudyEntry | undefined {
  return readAll().find((c) => c.slug === slug);
}

export function getAllCaseStudySlugs(): string[] {
  return readAll().map((c) => c.slug);
}

/** 全部标签及其案例数，供 /cases 筛选与 llms.txt 目录使用 */
export function getAllTags(): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const c of readAll()) {
    for (const t of c.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag)
  );
}

/** 按标签筛选案例（命中任一标签即保留） */
export function getCasesByTag(tag: string): CaseStudyEntry[] {
  if (!tag) return readAll();
  return readAll().filter((c) => c.tags.includes(tag));
}

/** 相关推荐：按相同标签匹配，按重合度排序，排除自身 */
export function getRelatedCases(slug: string, limit = 3): CaseStudyEntry[] {
  const all = readAll();
  const current = all.find((c) => c.slug === slug);
  if (!current) return [];
  return all
    .filter((c) => c.slug !== slug)
    .map((c) => ({
      case: c,
      overlap: c.tags.filter((t) => current.tags.includes(t)).length,
    }))
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.case.slug.localeCompare(b.case.slug))
    .slice(0, limit)
    .map((x) => x.case);
}

/**
 * 首页案例卡片来自 Supabase cases 表（client/problem/solution），没有 slug。
 * 按语义标签映射到案例词条，避免索引硬编码。
 */
export function slugForLegacyCase(c: {
  client: string;
  problem: string;
  solution: string;
}): string {
  const text = `${c.client}${c.problem}${c.solution}`;
  const rules: Array<{ re: RegExp; tag: string }> = [
    { re: /车灯|退货|装不上|适配/, tag: "车灯" },
    { re: /毛利|亏损|汇率|折算|佣金|制动|改装|侵权|封号/, tag: "改装件" },
    { re: /库存|滞销|周转|SOP|修理厂|脚垫/, tag: "库存" },
  ];
  for (const rule of rules) {
    if (rule.re.test(text)) {
      const hit = readAll().find((x) => x.tags.includes(rule.tag));
      if (hit) return hit.slug;
    }
  }
  return readAll()[0]?.slug ?? "";
}
