"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ============================================================
   智库洞察 · 双 Tab 切换

   两个 Tab 的内容在 Server Component 端就完整渲染进 HTML，
   爬虫能抓到全部内容；切换只是显示/隐藏，不影响 SEO。
   ============================================================ */

export function InsightsTabs({
  cases,
  articles,
  defaultTab = "cases",
  casesLabel = "客户案例库",
  articlesLabel = "行业深度观察",
}: {
  cases: ReactNode;
  articles: ReactNode;
  defaultTab?: "cases" | "articles";
  casesLabel?: string;
  articlesLabel?: string;
}) {
  const [tab, setTab] = useState<"cases" | "articles">(defaultTab);

  return (
    <>
      <div className="border-b border-brand-green/15 bg-card">
        <div className="container-site">
          <div className="flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {(
              [
                ["cases", casesLabel],
                ["articles", articlesLabel],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-pressed={tab === key}
                className={cn(
                  "min-h-14 shrink-0 border-b-2 px-1 text-sm font-semibold transition-colors md:text-base",
                  tab === key
                    ? "border-brand-green text-brand-green"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={tab === "cases" ? "block" : "hidden"}>{cases}</div>
      <div className={tab === "articles" ? "block" : "hidden"}>{articles}</div>
    </>
  );
}
