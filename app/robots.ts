import type { MetadataRoute } from "next";

/**
 * 全站允许所有爬虫抓取（不设置任何 Disallow）。
 * 另为 GEO 显式列出主流 AI 爬虫的 Allow 规则：robots.txt 里更具体的 UA 组
 * 会覆盖 `*` 组，显式声明可避免将来有人误加针对某个 AI 爬虫的 Disallow。
 * Sitemap 必须是可直达的绝对路径，百度 / Google 才会按此地址读取。
 */
const SITEMAP_URL = "https://jinyoudata.com/sitemap.xml";

/** 主流生成式引擎 / AI 搜索爬虫：全部明确放行 */
const AI_CRAWLERS = [
  "GPTBot",           // ChatGPT / OpenAI
  "OAI-SearchBot",    // ChatGPT 搜索索引
  "ChatGPT-User",     // ChatGPT 用户实时访问
  "ClaudeBot",        // Anthropic Claude
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",    // Perplexity
  "Perplexity-User",
  "Bytespider",       // 字节跳动 /豆包
  "Google-Extended",  // Gemini 训练与 grounding（不影响 Google 搜索排名）
  "Applebot-Extended",
  "Amazonbot",
  "CCBot",            // Common Crawl，多个模型的数据源
];

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: SITEMAP_URL,
  };
}
