#!/usr/bin/env python3
"""从 public/data/oe-index.json 生成 OE sitemap 分片静态文件。

输出：public/sitemap-oe-1.xml ... sitemap-oe-N.xml（每片 10000 条）。
这些是纯静态文件，由 Cloudflare Pages 原样托管，不依赖 Next.js 动态路由。

用法：python3 scripts/gen-oe-sitemap.py
"""

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "data" / "oe-index.json"
OUT_DIR = ROOT / "public"
SITE_URL = "https://jinyoudata.com"
PAGE_SIZE = 10000


def escape_xml(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def main() -> None:
    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    codes = [x.get("oe_code", "") for x in data.get("items", []) if x.get("oe_code")]
    codes = sorted(set(codes))
    pages = max(1, (len(codes) + PAGE_SIZE - 1) // PAGE_SIZE)
    print(f"源 OE 数：{len(codes)}，分片数：{pages}")

    # 清理旧的 OE 分片
    for old in OUT_DIR.glob("sitemap-oe-*.xml"):
        old.unlink()

    now = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for i in range(pages):
        slice_codes = codes[i * PAGE_SIZE : (i + 1) * PAGE_SIZE]
        lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ]
        lines.extend(
            f"<url><loc>{SITE_URL}/oe/{escape_xml(code)}</loc>"
            f"<lastmod>{now}</lastmod><priority>0.7</priority></url>"
            for code in slice_codes
        )
        lines.append("</urlset>")
        out = OUT_DIR / f"sitemap-oe-{i + 1}.xml"
        out.write_text("\n".join(lines), encoding="utf-8")
        print(f"  {out.name}: {len(slice_codes)} URLs")


if __name__ == "__main__":
    main()
