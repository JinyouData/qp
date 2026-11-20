import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 全站入口中间件，三件事：
 * 1) www.jinyoudata.com/* → https://jinyoudata.com/*（301，保留路径与查询串）
 * 2) 已下线 / 改名路由 → 新地址（301，保留查询串）
 * 3) 统一补安全响应头（HSTS / X-Frame-Options / X-Content-Type-Options / CSP）
 *
 * 为什么不用 next.config 的 redirects / headers：
 * Next.js redirects 只支持 307/308（permanent: true → 308），无法输出 301；
 * Cloudflare Pages 在 `_worker.js` 高级模式下也会忽略 public/_redirects，
 * next.config 的 headers 同样不保证被应用。middleware 在 Pages 上就是边缘 Worker，
 * 是这里唯一能稳定生效的位置。
 */

/** 主域名（与 lib/seo.ts 的 SITE_URL 保持一致；这里必须是字面量，middleware 不读 .env.local） */
const CANONICAL_HOST = "jinyoudata.com";

/**
 * 已彻底下线 / 已改名的路由：
 * - /content                  已合并进 /cases（指标 + 证言 + 案例库），301 跳转
 * - /cases                    案例库列表页（标签筛选），与 /cases/[slug] 详情页一并放行
 * - /admin                    线索看板随全站表单下线一并关闭（表单已无数据来源，且含输入框）
 * - /courses                  培训课程体系已砍掉，改为「数据订阅与会员版」
 * - /products/courses         同上（原课程产品详情）
 * - /products/annual-pass     年度知识通行证已下线（原权益含课程与社群答疑）
 * - /products/corporate-training  企业内训已砍掉，改为按项目的「定制咨询」
 * - /ai-lab                   AI 核价助手 MVP 体验页已正式改名为 /tools/ai-profit
 * - /products/toolkit-pricing 《核价毛利计算器》→ AI 核价助手
 * - /products/toolkit-selection 《选品评分表》→ AI 选品与竞品诊断助手
 * - /products/toolkit-fitment   《适配校验表》→ AI OE 码匹配与避坑助手
 * - /products/toolkit-inventory 《库存周转模板》→ AI 库存健康与清仓顾问
 */
const RETIRED: Record<string, string> = {
  // /content 已合并进 /cases（指标 + 证言 + 案例库统一到一个页面）
  "/content": "/cases",
  // "/cases" 不在下线表：它是按标签筛选的案例库，/cases/[slug] 是案例详情页
  "/admin": "/",
  "/courses": "/products/data-subscription",
  "/products/courses": "/products/data-subscription",
  "/products/annual-pass": "/products/data-subscription",
  "/products/corporate-training": "/consulting",
  "/ai-lab": "/tools/ai-profit",
  "/products/toolkit-pricing": "/tools/ai-profit",
  "/products/toolkit-selection": "/tools/ai-selection",
  "/products/toolkit-fitment": "/tools/ai-oe-match",
  "/products/toolkit-inventory": "/tools/ai-inventory",
};

/**
 * CSP：App Router 需要 inline 的 `__next_f` 数据脚本，故 script-src 必须留 unsafe-inline；
 * 字体已自托管（app/fonts.css），图片全部同源。GA4 / Plausible 目前未启用，
 * 但保留白名单，避免以后在 Cloudflare 配了环境变量后被 CSP 静默拦掉。
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://plausible.io",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://plausible.io",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  // 全站匹配（含 www 主机判定与安全头）；排除 Next 构建产物即可。
  matcher: ["/((?!_next/static|_next/image).*)"],
};

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  // 1) www → 主域名，301 永久跳转，路径与查询串原样保留
  if (host === `www.${CANONICAL_HOST}`) {
    const incoming = new URL(request.url);
    const canonical = new URL(`${incoming.pathname}${incoming.search}`, `https://${CANONICAL_HOST}`);
    return withSecurityHeaders(NextResponse.redirect(canonical.toString(), 301));
  }

  // 2) 已下线 / 改名路由 → 新地址，301，保留查询串
  const { pathname } = request.nextUrl;

  // /cases 已升级为按标签聚合的案例库列表页，/cases/[slug] 为案例详情页，均正常放行。

  const key = Object.keys(RETIRED).find(
    (k) => pathname === k || pathname.startsWith(`${k}/`)
  );
  if (key) {
    const target = request.nextUrl.clone();
    target.pathname = RETIRED[key];
    return withSecurityHeaders(NextResponse.redirect(target, 301));
  }

  // 3) 其余请求照常放行，统一补安全头
  return withSecurityHeaders(NextResponse.next());
}
