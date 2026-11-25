import fs from "node:fs";
import path from "node:path";

/* ============================================================
   OE 号词条 sitemap 分片：/sitemap-oe-1.xml、/sitemap-oe-2.xml …

   每片最多 10000 个 URL，避免单文件超出搜索引擎限制。
   数据源优先级：Supabase oe_entries 表 → 本地 oe-index.json 兜底。
   构建期静态生成，新增词条需重新构建（或后续接入 ISR 定时刷新）。
   ============================================================ */

export const dynamic = "force-static";

const SITE_URL = "https://jinyoudata.com";
const PAGE_SIZE = 10000;

/* OE 号 sitemap 分片在构建期静态生成。
 * 数据源固定为本地 public/data/oe-index.json：
 * - 构建期用 Supabase 网络请求拉取 12.3 万条 × 13 个分片会超时，且 next-on-pages
 *   构建阶段不适合做大规模 API 调用；
 * - sitemap 允许「下次构建更新」，增量词条由详情页 ISR 覆盖即可。
 */
let cachedCodes: string[] | null = null;

function loadAllOeCodesSync(): string[] {
  if (cachedCodes) return cachedCodes;
  const file = path.join(process.cwd(), "public", "data", "oe-index.json");
  if (!fs.existsSync(file)) return (cachedCodes = []);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as {
      items?: Array<{ oe_code: string }>;
    };
    cachedCodes = (parsed.items ?? []).map((x) => x.oe_code).filter(Boolean);
    return cachedCodes;
  } catch {
    return (cachedCodes = []);
  }
}

export function generateStaticParams() {
  const local = loadAllOeCodesSync();
  const pages = Math.max(1, Math.ceil(local.length / PAGE_SIZE));
  return Array.from({ length: pages }, (_, i) => ({ page: String(i + 1) }));
}

export async function GET({
  params,
}: {
  params?: { page?: string };
}) {
  // 构建期预渲染时 Next.js 14 可能不传 params（generateStaticParams 场景），
  // 此时默认渲染第 1 页；运行时由路由正常注入具体页码。
  const page = Math.max(1, Number(params?.page) || 1);
  const codes = loadAllOeCodesSync();
  const slice = codes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const now = new Date().toISOString();

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...slice.map(
      (code) =>
        `<url><loc>${SITE_URL}/oe/${escapeXml(code)}</loc><lastmod>${now}</lastmod><priority>0.7</priority></url>`
    ),
    "</urlset>",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case '"': return "&quot;";
      default: return "&apos;";
    }
  });
}
