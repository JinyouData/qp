import fs from "node:fs";
import path from "node:path";

/* ============================================================
   Sitemap 索引：/sitemap-index.xml

   当 OE 词条数超过 5 万时，主 sitemap.xml 只保留非 OE 路由，
   OE 词条拆到 sitemap-oe-1.xml、sitemap-oe-2.xml …（每片 1 万条）。
   本索引统一引用主 sitemap 与所有 OE 分片，robots.txt 指向本文件。
   ============================================================ */

export const dynamic = "force-static";

const SITE_URL = "https://jinyoudata.com";
const OE_SITEMAP_THRESHOLD = 50000;
const PAGE_SIZE = 10000;

function localOeCount(): number {
  const file = path.join(process.cwd(), "public", "data", "oe-index.json");
  if (!fs.existsSync(file)) return 0;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { oe_count?: number; items?: unknown[] };
    return parsed.oe_count ?? parsed.items?.length ?? 0;
  } catch {
    return 0;
  }
}

export function GET() {
  const count = localOeCount();
  const pages = count > OE_SITEMAP_THRESHOLD ? Math.ceil(count / PAGE_SIZE) : 0;
  const now = new Date().toISOString();

  const locs = [
    `<sitemap><loc>${SITE_URL}/sitemap.xml</loc><lastmod>${now}</lastmod></sitemap>`,
    ...Array.from({ length: pages }, (_, i) => {
      const n = i + 1;
      return `<sitemap><loc>${SITE_URL}/sitemap-oe-${n}.xml</loc><lastmod>${now}</lastmod></sitemap>`;
    }),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...locs,
    "</sitemapindex>",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
