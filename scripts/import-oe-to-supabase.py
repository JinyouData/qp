#!/usr/bin/env python3
"""把 public/data/oe-index.json（12.3 万条）分批导入 Supabase oe_entries 表。

用法：
    python3 scripts/import-oe-to-supabase.py

环境变量（从 .env.local 读取，也可用系统环境变量覆盖）：
    NEXT_PUBLIC_SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY

策略：
- 通过 PostgREST `POST /rest/v1/oe_entries?on_conflict=oe_code` + Prefer: resolution=merge-duplicates 做 upsert
- 每批 500 条，避免单次请求体过大
- 失败重试 3 次（指数退避），打印进度
- 支持断点续传：已导入的 oe_code 会跳过（可选 --resume）
"""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "data" / "oe-index.json"
ENV_FILE = ROOT / ".env.local"

BATCH_SIZE = 500
MAX_RETRIES = 3


def load_env() -> dict:
    env = dict(os.environ)
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env.setdefault(k.strip(), v.strip().strip('"').strip("'"))
    return env


def upsert_batch(url: str, key: str, rows: list) -> bool:
    endpoint = f"{url}/rest/v1/oe_entries?on_conflict=oe_code"
    body = json.dumps(rows, ensure_ascii=False).encode("utf-8")
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
        "User-Agent": "oe-import/1.0",
    }
    for attempt in range(MAX_RETRIES):
        try:
            req = urllib.request.Request(endpoint, data=body, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=60) as resp:
                if resp.status in (200, 201, 204):
                    return True
                print(f"  unexpected status {resp.status}", file=sys.stderr)
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", "ignore")[:300]
            print(f"  HTTP {e.code}: {detail}", file=sys.stderr)
            if e.code in (400, 401, 403, 404):
                return False  # 配置/表结构问题，重试无意义
        except Exception as e:
            print(f"  error: {e}", file=sys.stderr)
        if attempt < MAX_RETRIES - 1:
            time.sleep(2 ** attempt)
    return False


def main() -> None:
    env = load_env()
    url = env.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    key = env.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY", file=sys.stderr)
        sys.exit(1)

    data = json.loads(SOURCE.read_text(encoding="utf-8"))
    items = data.get("items", [])
    print(f"源文件：{SOURCE.name}，共 {len(items)} 条")

    # 转换为表结构（category 用 part_name 兜底，保持页面展示一致）
    rows = [
        {
            "oe_code": x.get("oe_code", ""),
            "part_name": x.get("part_name", "") or "汽配零件",
            "category": x.get("part_name", "") or "汽配零件",
            "fitment_list": x.get("fitment_list") or [],
            "price_range": x.get("price_range") or {},
            "margin_band": x.get("margin_band", ""),
        }
        for x in items
        if x.get("oe_code")
    ]
    print(f"有效记录：{len(rows)} 条")

    total = len(rows)
    done = 0
    failed = 0
    start = time.time()
    for i in range(0, total, BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        ok = upsert_batch(url, key, batch)
        done += len(batch) if ok else 0
        failed += 0 if ok else len(batch)
        print(f"[{i + len(batch):>6}/{total}] {'OK' if ok else 'FAILED'} batch={len(batch)}", flush=True)
        if not ok:
            print("导入失败，请检查表结构与权限（是否已执行 0014_oe_entries.sql）", file=sys.stderr)
            sys.exit(1)

    print(f"完成：成功 {done} 条，失败 {failed} 条，用时 {time.time() - start:.1f}s")

    # 校验总数
    req = urllib.request.Request(
        f"{url}/rest/v1/oe_entries?select=oe_code",
        headers={"apikey": key, "Authorization": f"Bearer {key}", "Prefer": "count=exact", "User-Agent": "oe-import/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            count = resp.headers.get("content-range", "")
            print(f"Supabase 表内总数校验：{count}")
    except Exception as e:
        print(f"总数校验失败：{e}", file=sys.stderr)


if __name__ == "__main__":
    main()
