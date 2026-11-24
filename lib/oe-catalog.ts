import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/* ============================================================
   OE 号词条数据层：content/oe/*.mdx

   每个文件对应一个 OE 号词条页（/oe/[oe_code]）。
   文件名即 OE 号（大小写保留，URL 中区分大小写）。
   frontmatter 字段见 content/oe/95760-J9000.mdx。
   新增词条只需加 MDX 文件，sitemap / llms.txt / 静态路由自动扩展。
   ============================================================ */

const CONTENT_DIR = path.join(process.cwd(), "content", "oe");

export interface OeFitment {
  brand: string;
  model: string;
  years: string;
  note?: string;
}

export interface OeEntry {
  oeCode: string;
  partName: string;
  category: string;
  goldenMargin: string;
  market: string;
  sourceRegion: string;
  retailReference: string;
  isDemo: boolean;
  fitments: OeFitment[];
  aiSummary: string[];
  relatedInsights: string[];
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? (v as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
}

function readAll(): OeEntry[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
      const { data } = matter(raw);
      const fm = data as Record<string, unknown>;
      const fitments: OeFitment[] = Array.isArray(fm.fitments)
        ? (fm.fitments as unknown[]).map((item) => {
            const f = (item ?? {}) as Record<string, unknown>;
            return {
              brand: asString(f.brand, "待核"),
              model: asString(f.model, "待核"),
              years: asString(f.years, "待核"),
              note: asString(f.note),
            };
          })
        : [];

      return {
        oeCode: asString(fm.oe_code, file.replace(/\.mdx$/, "")),
        partName: asString(fm.part_name, "汽配零件"),
        category: asString(fm.category, "汽配零件"),
        goldenMargin: asString(fm.golden_margin, "按全成本模型测算"),
        market: asString(fm.market, "跨境市场"),
        sourceRegion: asString(fm.source_region, "国内供应链"),
        retailReference: asString(fm.retail_reference, "按核定成本与渠道价测算"),
        isDemo: fm.is_demo === true,
        fitments,
        aiSummary: asStringArray(fm.ai_summary),
        relatedInsights: asStringArray(fm.related_insights),
      } satisfies OeEntry;
    })
    .sort((a, b) => a.oeCode.localeCompare(b.oeCode));
}

export function getAllOeCodes(): string[] {
  return readAll().map((e) => e.oeCode);
}

export function getOeEntry(code: string): OeEntry | null {
  return readAll().find((e) => e.oeCode === code) ?? null;
}

export function getAllOeEntries(): OeEntry[] {
  return readAll();
}
