import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 已彻底下线 / 已改名的路由，统一返回 301 永久重定向：
 * - /cases                    内容已合并进 /content
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
 *
 * 为什么不用 next.config 的 redirects：
 * Next.js 的 redirects 只支持 307/308（permanent: true → 308），无法输出 301；
 * 同时 Cloudflare Pages 在 `_worker.js` 高级模式下会忽略 public/_redirects。
 * 因此这里用 middleware 显式返回 301 永久重定向，并保留原查询串。
 */
const RETIRED: Record<string, string> = {
  "/cases": "/content",
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

export const config = {
  matcher: [
    "/cases",
    "/cases/:path*",
    "/admin",
    "/admin/:path*",
    "/courses",
    "/courses/:path*",
    "/products/courses",
    "/products/annual-pass",
    "/products/corporate-training",
    "/ai-lab",
    "/ai-lab/:path*",
    "/products/toolkit-pricing",
    "/products/toolkit-selection",
    "/products/toolkit-fitment",
    "/products/toolkit-inventory",
  ],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const key = Object.keys(RETIRED).find(
    (k) => pathname === k || pathname.startsWith(`${k}/`)
  );
  const target = request.nextUrl.clone();
  target.pathname = key ? RETIRED[key] : "/";
  return NextResponse.redirect(target, 301);
}
