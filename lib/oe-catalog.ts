import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/* ============================================================
   OE 号词条数据层

   两个来源，合并后供 /oe/[oe_code] 静态路由、/oe 索引页、
   sitemap 与 llms.txt 使用：

   1) content/oe/*.mdx —— 人工撰写的词条（含 95760-J9000 演示词条）。
      文件名即 OE 号，frontmatter 字段见示例文件。优先级最高，
      同名会被 MDX 覆盖，方便人工精修。

   2) public/data/oe-featured.json —— 从 12.3 万条真实 OE 索引
      （oe-index.json）按「毛利带优先 + 内容厚度 + 品类限额」挑选的
      精选词条，由 scripts/gen-oe-featured.py 生成。真实数据不编造
      年份，AI 总结按真实毛利/价格/适配数生成。
   ============================================================ */

const CONTENT_DIR = path.join(process.cwd(), "content", "oe");
const FEATURED_FILE = path.join(process.cwd(), "public", "data", "oe-featured.json");

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

/* ---------------------- 来源 1：MDX ---------------------- */

function readMdxEntries(): OeEntry[] {
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
    });
}

/* ---------------- 来源 2：真实精选 JSON ---------------- */

interface FeaturedRaw {
  oe_code: string;
  part_name: string;
  fitment_list: string[];
  price_range: { min: number; max: number; avg: number; currency: string };
  margin_band: string;
}

/** 把「大众帕萨特」「奥迪A4L」这类中文适配串粗拆成品牌 + 车型 */
function splitFitment(text: string): OeFitment {
  const knownBrands = [
    "大众", "奥迪", "斯柯达", "保时捷", "丰田", "本田", "日产", "马自达", "现代", "起亚",
    "福特", "雪佛兰", "别克", "凯迪拉克", "宝马", "奔驰", "标致", "雪铁龙", "雷诺", "沃尔沃",
    "三菱", "铃木", "雷克萨斯", "讴歌", "英菲尼迪", "捷豹", "路虎", "特斯拉", "比亚迪",
    "吉利", "长安", "哈弗", "长城", "奇瑞", "传祺", "荣威", "名爵", "红旗", "五菱",
  ];
  const brand = knownBrands.find((b) => text.startsWith(b)) ?? "待核";
  const model = brand === "待核" ? text : text.slice(brand.length).trim();
  return {
    brand,
    model: model || "待核",
    years: "以 VIN 核验为准",
    note: "适配关系按 OE 号与年款校验后确认",
  };
}

function readFeaturedEntries(): OeEntry[] {
  if (!fs.existsSync(FEATURED_FILE)) return [];
  let parsed: { items?: FeaturedRaw[] };
  try {
    parsed = JSON.parse(fs.readFileSync(FEATURED_FILE, "utf8"));
  } catch {
    return [];
  }
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  return items.map((x) => {
    const price = x.price_range ?? { min: 0, max: 0, avg: 0, currency: "CNY" };
    const fitments = asStringArray(x.fitment_list).map(splitFitment);
    const specificCount = asStringArray(x.fitment_list).filter((f) => !f.includes("全系")).length;
    const span = Math.round((price.max - price.min) * 100) / 100;
    const avg = Math.round(price.avg * 100) / 100;
    const partName = asString(x.part_name, "汽配零件");
    const margin = asString(x.margin_band, "按全成本模型测算");

    const aiSummary = [
      `${x.oe_code} 归属「${partName}」品类，底层库观测到的黄金毛利带为 ${margin}；` +
        `价格区间 ¥${price.min}–¥${price.max}（均价 ¥${avg}，跨度 ¥${span}），` +
        `说明该 OE 号在不同渠道间存在可观的价差空间。`,
      `当前索引记录 ${specificCount} 个具体适配车型${fitments.length > specificCount ? `（另含 ${fitments.length - specificCount} 条全系泛化匹配）` : ""}，` +
        `覆盖 ${new Set(fitments.map((f) => f.brand).filter((b) => b !== "待核")).size} 个品牌方向。` +
        `上架前仍需按 OE 唯一性 → 年款一致性 → 渠道口径一致性三层校验，` +
        `本页数据来自 312 万 SKU 底层库的统计口径，不构成真实适配声明。`,
    ];

    return {
      oeCode: asString(x.oe_code),
      partName,
      category: partName,
      goldenMargin: margin,
      market: "跨境与国内后市场",
      sourceRegion: "国内供应链（312 万 SKU 底层库）",
      retailReference: `底层库价格区间 ¥${price.min}–¥${price.max}，均价 ¥${avg}`,
      isDemo: false,
      fitments,
      aiSummary,
      relatedInsights: [],
    } satisfies OeEntry;
  });
}

/* ---------------------- 合并与导出 ---------------------- */

let cached: OeEntry[] | null = null;

function readAll(): OeEntry[] {
  if (cached) return cached;
  const featured = readFeaturedEntries();
  const mdx = readMdxEntries();
  // MDX 优先：同 OE 号以人工撰写的版本覆盖精选数据
  const byCode = new Map<string, OeEntry>();
  for (const e of featured) byCode.set(e.oeCode, e);
  for (const e of mdx) byCode.set(e.oeCode, e);
  cached = Array.from(byCode.values()).sort((a, b) => a.oeCode.localeCompare(b.oeCode));
  return cached;
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
