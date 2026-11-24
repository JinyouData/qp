#!/usr/bin/env python3
"""从 public/data/oe-index.json（12.3 万条真实 OE 索引）挑选精选词条。

策略（毛利带优先 + 内容厚度门槛 + 品类多样性）：
1. 先过滤出「有内容可写」的条目：具体适配车型 >= 2（排除“XX 全系”这类泛化项）
   且价格区间跨度 >= 10 元，避免生成只有一句话的薄页面。
2. 按毛利带降序（>=80% > 70%-80% > 60%-70% > ...）、
   具体适配车型数、价格跨度、均价排序。
3. 每个 part_name 最多 40 条，避免页面高度同质化。
4. 默认输出前 500 条到 public/data/oe-featured.json，供构建期数据层读取。

用法：python3 scripts/gen-oe-featured.py [数量，默认 500]
"""

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "data" / "oe-index.json"
OUTPUT = ROOT / "public" / "data" / "oe-featured.json"

BAND_SCORE = {
    "≥80%": 5,
    "70%-80%": 4,
    "60%-70%": 3,
    "50%-60%": 2,
    "40%-50%": 1,
    "30%-40%": 0,
}
MIN_SPECIFIC_FITMENTS = 2
MIN_PRICE_SPAN = 10.0
PER_PART_CAP = 40


def specific_fitments(item: dict) -> list:
    return [f for f in (item.get("fitment_list") or []) if "全系" not in f]


def price_span(item: dict) -> float:
    p = item.get("price_range") or {}
    return float(p.get("max", 0)) - float(p.get("min", 0))


def main() -> None:
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 500

    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    items = source.get("items", [])
    print(f"源索引：{len(items)} 条，生成于 {source.get('meta', {}).get('built_at', '未知')}")

    thick = [
        x
        for x in items
        if len(specific_fitments(x)) >= MIN_SPECIFIC_FITMENTS
        and price_span(x) >= MIN_PRICE_SPAN
    ]
    print(f"厚度门槛后：{len(thick)} 条")

    thick.sort(
        key=lambda x: (
            BAND_SCORE.get(x.get("margin_band", ""), 0),
            len(specific_fitments(x)),
            price_span(x),
            (x.get("price_range") or {}).get("avg", 0),
        ),
        reverse=True,
    )

    picked = []
    seen = Counter()
    for item in thick:
        part = item.get("part_name") or "其他配件"
        if seen[part] >= PER_PART_CAP:
            continue
        picked.append(item)
        seen[part] += 1
        if len(picked) >= limit:
            break

    OUTPUT.write_text(
        json.dumps(
            {
                "meta": {
                    "source": "oe-index.json",
                    "built_at": source.get("meta", {}).get("built_at"),
                    "strategy": "毛利带优先 + 适配完整度 + 品类限额",
                    "count": len(picked),
                    "filters": {
                        "min_specific_fitments": MIN_SPECIFIC_FITMENTS,
                        "min_price_span": MIN_PRICE_SPAN,
                        "per_part_cap": PER_PART_CAP,
                    },
                },
                "items": picked,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    print(f"已写入 {OUTPUT.relative_to(ROOT)}：{len(picked)} 条")
    print("毛利带分布：", dict(Counter(x["margin_band"] for x in picked)))
    print("品类数：", len(seen))


if __name__ == "__main__":
    main()
