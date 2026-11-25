/* ============================================================
   OE 号词条 · Edge 运行时数据读取

   严格只使用 fetch（Supabase REST API），不含任何 node:fs / node:path，
   供 Edge Runtime 下的 /oe/[oe_code] 动态页面使用。
   构建期的本地数据读取（generateStaticParams / sitemap / llms.txt）
   仍由 lib/oe-catalog.ts 负责，两者职责完全隔离。
   ============================================================ */

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

interface OeRow {
  oe_code: string;
  part_name: string;
  category?: string;
  fitment_list: string[];
  price_range: { min: number; max: number; avg: number; currency?: string };
  margin_band: string;
}

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v)
    ? (v as unknown[]).filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    : [];
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

/** 把 Supabase 行映射成页面所需结构 */
function mapRowToEntry(x: OeRow): OeEntry {
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
    category: asString(x.category, partName),
    goldenMargin: margin,
    market: "跨境与国内后市场",
    sourceRegion: "国内供应链（312 万 SKU 底层库）",
    retailReference: `底层库价格区间 ¥${price.min}–¥${price.max}，均价 ¥${avg}`,
    isDemo: false,
    fitments,
    aiSummary,
    relatedInsights: [],
  };
}

/** 从 Supabase 按 OE 号查询；失败返回 null，由页面 notFound */
export async function getOeEntryAsync(code: string): Promise<OeEntry | null> {
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
      cache: "no-store", // 缓存交给 Cloudflare Cache（revalidate）
    });
    if (!res.ok) return null;
    const rows = (await res.json()) as OeRow[];
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return mapRowToEntry(rows[0]);
  } catch {
    return null;
  }
}
