/* ============================================================
   全渠道中立 · 脱敏红线（唯一真源）

   规则：官网对外可见的一切文字——营销页面、SEO / OG、案例标签、
   AI 提示词与 AI 回复、以及从 Supabase 读回来的历史文案——
   都不得出现任何具体电商平台名称（中英文均含）。
   我们做的是全渠道智库，只说「跨境平台 / 欧洲平台 / 北美平台」
   这类区域口径，不点名、不站队、不局限单一渠道。

   这里既做「文案出口的最后一道防线」，也供 lib/data.ts 清洗脏数据复用，
   避免两处词表各写一份、日后漂移。
   ============================================================ */

/** 具体平台名（含大小写变体）。新增平台时只改这一处。 */
const PLATFORM =
  "(?:Ozon|Amazon|亚马逊|Temu|TikTok\\s*Shop|TikTok|eBay|AliExpress|速卖通|Shopee|Lazada|Walmart|Wish|SHEIN|Jumia|Avito|Coupang|Mercado\\s*Libre|拼多多|淘宝|天猫|京东|抖音|快手|小红书|微信小店)";

const REPLACERS: Array<[RegExp, string]> = [
  // 并列列举先折叠，避免变成「电商平台 / 电商平台 / 电商平台」
  [
    new RegExp(`${PLATFORM}(?:\\s*(?:/|、|,|，|与|和)\\s*${PLATFORM})+`, "gi"),
    "多个跨境平台",
  ],
  [new RegExp(PLATFORM, "gi"), "跨境平台"],
  // 复合词读起来更顺：跨境平台利润计算 → 跨境利润计算
  [/跨境平台(利润计算|毛利测算|核价|卖家|店铺|后台|类目)/g, "跨境$1"],
  // 中文里残留的「某平台」具体地域简称一律泛化
  [/俄罗斯站|美国站|欧洲站|北美站|东南亚站/g, "目标市场"],
];

/**
 * 把任意文案里的具体平台名替换成中立的区域口径。
 * 只改名词，不动数字、金额与测算结果，因此对算账结果零影响。
 */
export function desensitizePlatforms<T>(value: T): T {
  if (typeof value !== "string") return value;
  return REPLACERS.reduce((acc, [re, to]) => acc.replace(re, to), value as string) as T;
}

/** 给 AI System Prompt 用的红线条款，前后两个 AI 接口共用 */
export const NO_PLATFORM_NAMES_RULE =
  "【全渠道中立 · 红线】回答中不得出现任何具体电商平台的名称（中英文都不行），一律用「跨境平台」「欧洲平台」「北美平台」「目标市场」等区域口径表述；用户原话里带了平台名也要改写成区域口径，不要复述。";
