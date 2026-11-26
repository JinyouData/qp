import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/* ============================================================
   OE 号词条数据层

   三个来源，合并后供 /oe/[oe_code] 静态路由、OE 词条库 Tab、
   sitemap 与 llms.txt 使用（优先级从低到高）：

   1) data/oe-batch/*.json —— 中控台推送的全量 OE 批次
      （oe-initial.json 5000 条 + 每日增量），是词条库的主体数据。
      兼容两种格式：{ items: [...] } 与 { oe_codes: string[] }。

   2) public/data/oe-featured.json —— 从 12.3 万条真实 OE 索引
      按「毛利带优先 + 内容厚度 + 品类限额」挑选的精选词条，
      由 scripts/gen-oe-featured.py 生成。

   3) content/oe/*.mdx —— 人工撰写的词条（含 95760-J9000 演示词条）。
      优先级最高，同名覆盖，方便人工精修。
   ============================================================ */

const CONTENT_DIR = path.join(process.cwd(), "content", "oe");
const FEATURED_FILE = path.join(process.cwd(), "public", "data", "oe-featured.json");
const BATCH_DIR = path.join(process.cwd(), "data", "oe-batch");

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

/** 把 oe-index.json / oe_entries 表的原始行统一映射成页面所需结构 */
function mapRawToEntry(x: FeaturedRaw): OeEntry {
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
    category: asString((x as FeaturedRaw & { category?: string }).category, partName),
    goldenMargin: margin,
    market: "跨境与国内后市场",
    sourceRegion: "国内供应链（312 万 SKU 底层库）",
    retailReference: `底层库价格区间 ¥${price.min}–¥${price.max}，均价 ¥${avg}`,
    isDemo: false,
    fitments,
    aiSummary,
    relatedInsights: [],
  } satisfies OeEntry;
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
  return items.map(mapRawToEntry);
}

/* ---------------- 来源 3：中控台批次（词条库主体数据） ---------------- */

interface BatchItem {
  oe_code: string;
  name?: string;
  fitment_list?: string[];
  margin?: string;
  price_range?: [number, number] | { min: number; max: number; avg?: number };
}

/** 把中控台批次行映射成 OeEntry（字段结构与精选 JSON 不同，单独适配） */
function mapBatchItemToEntry(x: BatchItem): OeEntry | null {
  const code = asString(x.oe_code);
  if (!code) return null;

  let min = 0;
  let max = 0;
  if (Array.isArray(x.price_range)) {
    [min, max] = x.price_range;
  } else if (x.price_range && typeof x.price_range === "object") {
    min = x.price_range.min ?? 0;
    max = x.price_range.max ?? 0;
  }
  const avg = Math.round(((min + max) / 2) * 100) / 100;
  const partName = asString(x.name, "汽配零件");
  const margin = asString(x.margin, "按全成本模型测算");
  const fitments = asStringArray(x.fitment_list).map(splitFitment);
  const specificCount = asStringArray(x.fitment_list).filter((f) => !f.includes("全系")).length;

  const aiSummary = [
    `${code} 归属「${partName}」品类，中控台批次观测到的黄金毛利带为 ${margin}；` +
      `建议价格区间 ¥${min}–¥${max}（中值 ¥${avg}），` +
      `说明该 OE 号在不同渠道间存在可观的价差空间。`,
    `当前批次记录 ${specificCount} 个具体适配车型` +
      `（覆盖 ${new Set(fitments.map((f) => f.brand).filter((b) => b !== "待核")).size} 个品牌方向）。` +
      `上架前仍需按 OE 唯一性 → 年款一致性 → 渠道口径一致性三层校验，` +
      `本页数据来自 312 万 SKU 底层库的统计口径，不构成真实适配声明。`,
  ];

  return {
    oeCode: code,
    partName,
    category: partName,
    goldenMargin: margin,
    market: "跨境与国内后市场",
    sourceRegion: "国内供应链（312 万 SKU 底层库）",
    retailReference: `中控台批次建议价 ¥${min}–¥${max}，中值 ¥${avg}`,
    isDemo: false,
    fitments,
    aiSummary,
    relatedInsights: [],
  };
}

/** 遍历 data/oe-batch/ 下所有 JSON，合并中控台推送的初始批次与每日增量 */
function readBatchEntries(): OeEntry[] {
  if (!fs.existsSync(BATCH_DIR)) return [];
  const byCode = new Map<string, OeEntry>();
  try {
    const files = fs.readdirSync(BATCH_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      let parsed: { items?: BatchItem[]; oe_codes?: string[] };
      try {
        parsed = JSON.parse(fs.readFileSync(path.join(BATCH_DIR, file), "utf8"));
      } catch {
        continue; // 单个批次损坏不影响其他文件
      }
      if (Array.isArray(parsed.items)) {
        for (const item of parsed.items) {
          const entry = mapBatchItemToEntry(item);
          if (entry && !byCode.has(entry.oeCode)) byCode.set(entry.oeCode, entry);
        }
      }
      // 高频批次只有 oe_codes 数组，补全默认字段，保证总数正确
      if (Array.isArray(parsed.oe_codes)) {
        for (const code of parsed.oe_codes) {
          if (typeof code !== "string" || !code.trim() || byCode.has(code)) continue;
          const entry = mapBatchItemToEntry({ oe_code: code });
          if (entry) byCode.set(entry.oeCode, entry);
        }
      }
    }
  } catch {
    return [];
  }
  return Array.from(byCode.values());
}

/* ---------------------- 合并与导出 ---------------------- */

let cached: OeEntry[] | null = null;

function readAll(): OeEntry[] {
  if (cached) return cached;
  // 优先级从低到高：批次 → 精选 → 人工 MDX（高优先级覆盖同 OE 号）
  const batches = readBatchEntries();
  const featured = readFeaturedEntries();
  const mdx = readMdxEntries();
  const byCode = new Map<string, OeEntry>();
  for (const e of batches) byCode.set(e.oeCode, e);
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

/** 每页展示的 OE 词条数：与客户案例库 CASES_PER_PAGE 保持一致 */
export const OE_PER_PAGE = 6;

export function getOeTotalPages(): number {
  return Math.max(1, Math.ceil(readAll().length / OE_PER_PAGE));
}

/* ============================================================
   Supabase 实时查询（ISR 动态渲染数据源，Edge 兼容）

   - 仅用 fetch，不依赖 node:fs；next-on-pages Edge 运行时可用
   - 构建期预渲染的高频页走本地数据；其余 OE 号首次访问时
     由本函数从 oe_entries 表实时查询，再由 Cloudflare Cache 缓存 24h
   - 运行时不降级到 node:fs；仅构建期用本地数据兜底，保证预渲染页不 404
   ============================================================ */

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * 读取高频 OE 号批次（构建期 generateStaticParams 使用，node:fs 仅在构建执行）。
 *
 * 兼容两种批次格式，确保中控台每日推送的批次都能自动成为预渲染候选：
 *   1) 手工批次 high-frequency.json：{ oe_codes: string[] }
 *   2) AI 内容工厂批次 *.json：{ items: [{ oe_code, ... }] }
 *
 * 合并后去重，按文件修改时间倒序（最新批次优先），最多返回 100 条。
 */
export function getHighFrequencyOeCodes(): string[] {
  const dir = path.join(process.cwd(), "data", "oe-batch");
  if (!fs.existsSync(dir)) return getAllOeCodes(); // 兜底：没有批次目录时退回全量

  const codes: string[] = [];
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({ file: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime); // 最新批次优先

    for (const { file } of files) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as {
        oe_codes?: string[];
        items?: Array<{ oe_code?: string }>;
      };
      if (Array.isArray(parsed.oe_codes)) {
        codes.push(...parsed.oe_codes.filter((x): x is string => typeof x === "string" && !!x));
      }
      if (Array.isArray(parsed.items)) {
        codes.push(
          ...parsed.items
            .map((x) => x?.oe_code)
            .filter((x): x is string => typeof x === "string" && !!x),
        );
      }
    }
  } catch {
    return getAllOeCodes();
  }

  const unique = Array.from(new Set(codes));
  return unique.length > 0 ? unique.slice(0, 100) : getAllOeCodes();
}

/** 从 Supabase 按 OE 号查询；失败返回 null，由调用方降级 */
export async function getOeEntryFromSupabase(code: string): Promise<OeEntry | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const url = `${SUPABASE_URL}/rest/v1/oe_entries?oe_code=eq.${encodeURIComponent(code)}&select=*&limit=1`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "User-Agent": "oe-isr/1.0",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store", // 缓存交给 Cloudflare Cache（revalidate），避免双层缓存不一致
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as FeaturedRaw[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return mapRawToEntry(rows[0]);
  } catch {
    return null;
  }
}

/**
 * 页面统一入口。
 *
 * 运行时（Edge）：严格只走 Supabase REST API，绝不触碰 node:fs。
 * 构建期（phase-production-build）：Supabase 不可达时用本地数据兜底，
 * 保证 100 个预渲染高频页不会因为数据库未就绪而变成 404。
 *
 * 两条路径通过 NEXT_PHASE 严格隔离，运行时的动态页面没有 fs 回退。
 */
export async function getOeEntryAsync(code: string): Promise<OeEntry | null> {
  const remote = await getOeEntryFromSupabase(code);
  if (remote) return remote;

  // 仅构建阶段允许本地兜底；Edge 运行时 process.env.NEXT_PHASE 不存在
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return getOeEntry(code) ?? null;
  }
  return null;
}
