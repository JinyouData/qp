import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/* ============================================================
   MDX 内容层：content/insights/*.mdx
   - 服务端读取（fs + gray-matter），供列表页、详情页、sitemap 使用
   - 每个 mdx 的 frontmatter：title / description / date / tags / author
   ============================================================ */

const CONTENT_DIR = path.join(process.cwd(), "content", "insights");

export interface InsightFrontmatter {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  tags: string[];
  author?: string;
  /** 阅读时长（分钟），可选 */
  readingTime?: number;
}

export interface Insight extends InsightFrontmatter {
  slug: string;
  /** 正文字数，用于估算阅读时长 */
  words: number;
}

function readAll(): Insight[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith(".mdx"));

  return files
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
      const { data, content } = matter(raw);
      const fm = data as Partial<InsightFrontmatter>;
      return {
        slug: file.replace(/\.mdx$/, ""),
        title: fm.title ?? file.replace(/\.mdx$/, ""),
        description: fm.description ?? "",
        date: fm.date ?? "1970-01-01",
        tags: fm.tags ?? [],
        author: fm.author,
        readingTime: fm.readingTime,
        words: content.replace(/\s+/g, "").length,
      } satisfies Insight;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getAllInsights(): Insight[] {
  return readAll();
}

/** 深度观察每页文章数（与案例库每页数量一致，便于两个 Tab 的 UI 对齐） */
export const INSIGHTS_PER_PAGE = 6;

/** 全部深度观察标签：{ tag, count }，按出现次数降序、同次数按名称排序 */
export function getAllInsightTags(): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of readAll()) {
    for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Array.from(counts, ([tag, count]) => ({ tag, count })).sort(
    (a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "zh-CN")
  );
}

/** 深度观察总页数（至少 1 页） */
export function getInsightTotalPages(): number {
  return Math.max(1, Math.ceil(readAll().length / INSIGHTS_PER_PAGE));
}

export function getInsightSlugs(): string[] {
  return readAll().map((i) => i.slug);
}

export function getInsight(slug: string): { meta: Insight; body: string } | null {
  const file = path.join(CONTENT_DIR, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const { data, content } = matter(fs.readFileSync(file, "utf8"));
  const meta = readAll().find((i) => i.slug === slug);
  if (!meta) return null;
  void data;
  return { meta, body: content };
}

/** 估算中文阅读时长：每分钟 400 字 */
export function estimateReadingTime(words: number): number {
  return Math.max(1, Math.round(words / 400));
}
