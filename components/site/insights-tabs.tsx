"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ============================================================
   智库洞察 · 三 Tab 切换

   三个 Tab 的内容在 Server Component 端就完整渲染进 HTML，
   爬虫能抓到全部内容；切换只是显示/隐藏，不影响 SEO。
   - 客户案例库
   - 智库深度观察
   - OE 号词条库
   ============================================================ */

export type InsightTab = "cases" | "articles" | "oe";

export function InsightsTabs({
  cases,
  articles,
  oe,
  defaultTab = "cases",
  casesLabel = "客户案例库",
  articlesLabel = "智库深度观察",
  oeLabel = "OE 号词条库",
}: {
  cases: ReactNode;
  articles: ReactNode;
  oe?: ReactNode;
  defaultTab?: InsightTab;
  casesLabel?: string;
  articlesLabel?: string;
  oeLabel?: string;
}) {
  const [tab, setTab] = useState<InsightTab>(defaultTab);

  const tabs: Array<[InsightTab, string, ReactNode]> = [
    ["cases", casesLabel, cases],
    ["articles", articlesLabel, articles],
  ];
  if (oe) tabs.push(["oe", oeLabel, oe]);

  return (
    <>
      <div className="border-b border-brand-green/15 bg-card">
        <div className="container-site">
          <div className="flex gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map(([key, label]) => (
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

      {tabs.map(([key, , content]) => (
        <div key={key} className={tab === key ? "block" : "hidden"}>
          {content}
        </div>
      ))}
    </>
  );
}
