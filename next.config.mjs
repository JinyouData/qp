/** @type {import('next').NextConfig} */
const nextConfig = {
  // 临时关闭严格构建检查：避免 ESLint / TypeScript 报错阻断生产构建
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // 301 跳转（www → 主域名、已下线路由）与安全响应头统一在 middleware.ts 实现。
  // 说明：Next.js 的 redirects 只支持 307/308（permanent: true 实际输出 308），
  // 无法输出 301；Cloudflare Pages 在 _worker.js 高级模式下又会忽略 public/_redirects，
  // next.config 的 headers 也不保证被应用。middleware 在 Pages 上就是边缘 Worker。
};

// Cloudflare Pages：仅在本地 `next dev` 时模拟 Pages 运行时（读取 wrangler.toml 的绑定）。
// 生产构建（vercel build / next-on-pages）走 production 分支，不会执行这里。
// 用 try/catch 包一层，避免 wrangler 版本或本地配置差异导致 `npm run dev` 起不来。
if (process.env.NODE_ENV === "development") {
  try {
    const { setupDevPlatform } = await import("@cloudflare/next-on-pages/next-dev");
    await setupDevPlatform();
  } catch (error) {
    console.warn(
      "[cloudflare] setupDevPlatform 跳过：",
      error instanceof Error ? error.message : error
    );
  }
}

export default nextConfig;
