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

interface OeRow {
  oe_code: string;
}

/** 构建期从 Supabase 拉取全部 oe_code；失败则读本地索引兜底 */
async function loadAllOeCodes(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    try {
      const res = await fetch(
        `${url}/rest/v1/oe_entries?select=oe_code&order=oe_code.asc`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "User-Agent": "sitemap-oe/1.0",
          },
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as OeRow[];
        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((r) => r.oe_code).filter(Boolean);
        }
      }
    } catch {
      // 降级到本地索引
    }
  }

  const file = path.join(process.cwd(), "public", "data", "oe-index.json");
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as {
      items?: Array<{ oe_code: string }>;
    };
    return (parsed.items ?? []).map((x) => x.oe_code).filter(Boolean);
  } catch {
    return [];
  }
}

export function generateStaticParams() {
  // 先按本地索引估算总页数，保证构建期有静态路径可预生成；
  // 运行时若 Supabase 数据更多，超出范围的页码会 404（下次构建补齐）。
  const local = loadAllOeCodesSync();
  const pages = Math.max(1, Math.ceil(local.length / PAGE_SIZE));
  return Array.from({ length: pages }, (_, i) => ({ page: String(i + 1) }));
}

function loadAllOeCodesSync(): string[] {
  const file = path.join(process.cwd(), "public", "data", "oe-index.json");
  if (!fs.existsSync(file)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as {
      items?: Array<{ oe_code: string }>;
    };
    return (parsed.items ?? []).map((x) => x.oe_code).filter(Boolean);
  } catch {
    return [];
  }
}

export async function GET({
  params,
}: {
  params: { page: string };
}) {
  const page = Math.max(1, Number(params.page) || 1);
  const codes = await loadAllOeCodes();
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
