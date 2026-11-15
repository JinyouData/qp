/* ============================================================
   工具库 · AI 智能助手统一配置（客户端 / 服务端共享）

   2026-11-15 工具库终极 AI 化：三张死表格全部换成在线 AI 助手，
   与 /tools/ai-profit 共用同一个 /api/ai-chat 接口（靠 tool_type 分发）、
   同一个对话框组件、同一份额度账本、同一条去具体平台化红线。

   这里只放「可以下发到浏览器」的元数据；System Prompt 与演示引擎
   放在 lib/ai-prompts.ts，只在服务端引用，不进前端 bundle。
   ============================================================ */

export type ToolType = "profit" | "selection" | "oe-match" | "inventory";

export const TOOL_TYPES: ToolType[] = ["profit", "selection", "oe-match", "inventory"];

/** 每个匿名访客「每天」的免费对话次数（北京时间 00:00 重置） */
export const TRIAL_LIMIT = 3;

/** 核价助手沿用的产品口径（上一版指定，勿随意改字） */
export const TRIAL_LIMIT_MESSAGE =
  "您的免费体验次数已用完，请扫码添加主理人企微，开通正式会员解锁无限次 AI 测算与 312万 OE 码查询。";

/** 三个新诊断助手统一的用尽文案（本次指定） */
export const AI_DIAGNOSIS_LIMIT_MESSAGE =
  "您的免费诊断次数已用完，请联系主理人开通智库专属 AI 席位。";

/**
 * 业务日界按北京时间（UTC+8），服务端与浏览器用同一函数判断，
 * 避免访客本机时区与线上不一致导致「次数看起来没重置」。
 */
export function todayKey(now: Date = new Date()): string {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export interface QuickAsk {
  label: string;
  prompt: string;
}

export interface AiToolConfig {
  type: ToolType;
  path: string;
  /** 完整名称（对话框状态条 / 页面标题） */
  name: string;
  /** 卡片标题 */
  cardTitle: string;
  cardDesc: string;
  cardBadge: string;
  cardButton: string;
  /** 卡片图标名（library-sections 里映射 lucide 组件） */
  icon: "sparkles" | "scan" | "shield" | "boxes";
  heroTag: string;
  heroDesc: string;
  subtitle: string;
  emptyTitle: string;
  emptyHint: string;
  placeholder: string;
  quickAsks: QuickAsk[];
  loadingText: string;
  limitMessage: string;
  /** 只有核价助手需要展示毛利测算明细表 */
  showCalc: boolean;
  footerNote: string;
  seo: { title: string; description: string; keywords: string[] };
  h2: string;
  h2Desc: string;
  rules: Array<{ title: string; desc: string }>;
  scenes: Array<{ name: string; use: string }>;
}

export const AI_TOOLS: Record<ToolType, AiToolConfig> = {
  /* ---------------- 01 · 核价助手（沿用既有页面与口径） ---------------- */
  profit: {
    type: "profit",
    path: "/tools/ai-profit",
    name: "AI 跨境利润测算助手",
    cardTitle: "AI 跨境利润测算助手",
    cardDesc:
      "说清采购价、运费、目标市场与售价，按全渠道统一口径自动扣减头程、尾程、平台佣金 15%、退货损耗 5%，给出真实毛利与风险提醒。",
    cardBadge: "活工具 · 每天免费 3 次",
    cardButton: "立即免费测算",
    icon: "sparkles",
    heroTag: "工具库 · AI 核价",
    heroDesc:
      "别再靠一张死 Excel 拍脑袋定价。用大白话说清你的货、目标市场和定价，先算真实毛利，再看风险。全渠道统一口径，每位访客每天免费体验 3 次。",
    subtitle: "头程 · 尾程 · 佣金 15% · 退货损耗 5%，一次算清",
    emptyTitle: "用大白话说清你的货和目标市场",
    emptyHint:
      "例如「欧洲平台卖车灯，采购价 85 元，预估售价 320 元」。缺的数字我会按默认口径估，并标注出来。",
    placeholder: "例如：北美平台卖刹车片，采购 60 元，售价 260 元，头程 20 元，能赚多少？",
    quickAsks: [], // 由 lib/ai-profit.ts 的 QUICK_ASKS 提供，避免两处维护
    loadingText: "正在按固定口径测算…",
    limitMessage: TRIAL_LIMIT_MESSAGE,
    showCalc: true,
    footerNote: "结果为估算，不替代正式报价；官网不处理支付，资料与开通均由主理人在企业微信交付。",
    seo: {
      title: "AI核价助手｜跨境利润计算与汽配毛利测算",
      description: "按全渠道统一口径计算真实毛利的 AI 核价工具。",
      keywords: ["AI核价", "跨境利润计算", "多平台毛利测算"],
    },
    h2: "AI核价能算什么：多平台、多区域的统一毛利口径",
    h2Desc: "把采购价、运费和预估售价说清楚，助手按统一口径逐项扣减并给出毛利、毛利率与风险提示。",
    rules: [],
    scenes: [],
  },

  /* ---------------- 02 · 选品与竞品诊断 ---------------- */
  selection: {
    type: "selection",
    path: "/tools/ai-selection",
    name: "AI 选品与竞品诊断助手",
    cardTitle: "AI 选品与竞品诊断助手",
    cardDesc: "输入想做的车型或配件，AI 帮你分析竞争度、退货风险与利润空间，并给出上架建议。",
    cardBadge: "AI 诊断 · 免费体验",
    cardButton: "立即免费体验",
    icon: "scan",
    heroTag: "工具库 · AI 选品",
    heroDesc:
      "别再靠感觉进货。说出想做的车型或配件，助手按预设的「汽配出海竞争红黑榜」给出竞争度、退货风险、利润空间三项打分和上架建议。每位访客每天免费诊断 3 次。",
    subtitle: "竞争度 · 退货风险 · 利润空间，一次看清",
    emptyTitle: "说说你想做的车型或配件",
    emptyHint:
      "例如「想做 19 款亚洲龙的大灯」或「刹车片还值不值得进」。我会按竞争红黑榜逐项打分，并给上架建议。",
    placeholder: "例如：想做 SUV 车灯，最近竞争是不是很激烈？还能进吗？",
    quickAsks: [
      { label: "车灯类目还能进吗", prompt: "想做 SUV 车灯类目，帮我分析竞争度和利润空间" },
      { label: "刹车片打分", prompt: "刹车片这个类目，竞争度、退货风险和利润空间分别打几分？" },
      { label: "易损件怎么选", prompt: "刚起步想做易损件，哪些细分品类竞争小、退货风险低？" },
      { label: "新能源配件值得做吗", prompt: "新能源三电相关配件现在值得切入吗？给个上架建议" },
    ],
    loadingText: "正在对照竞争红黑榜打分…",
    limitMessage: AI_DIAGNOSIS_LIMIT_MESSAGE,
    showCalc: false,
    footerNote: "打分为经验规则估算，不是实时成交数据；完整价格带与竞争格局需开通金游智库专属查询账号。",
    seo: {
      title: "AI选品诊断｜汽配竞争度与利润空间打分",
      description:
        "AI 选品与竞品诊断助手：输入想做的车型或配件，按汽配出海竞争红黑榜给出竞争度、退货风险、利润空间三项打分与上架建议，每位访客每天免费诊断 3 次。",
      keywords: ["AI选品", "汽配选品诊断", "竞争度分析", "汽配退货风险", "跨境选品打分"],
    },
    h2: "AI 选品诊断怎么打分：竞争、退货、利润三条线",
    h2Desc: "把想做的车型或配件说清楚，助手先按品类规则给出三项评分，再落到「能进 / 小批量测 / 先别碰」的动作建议；分数由系统按规则计算，AI 只做解释。",
    rules: [
      { title: "竞争度", desc: "看同质化程度、价格带拥挤度与头部集中度；越卷越要靠适配数据做差异化。" },
      { title: "退货风险", desc: "看适配错配、年款改款、左右件与规格歧义；退货率高的类目利润要先打折。" },
      { title: "利润空间", desc: "看客单价、物流占比与售后成本；三项任一偏低都不建议一次压大货。" },
    ],
    scenes: [
      { name: "新车灯 / 灯具", use: "高适配敏感类目，重点核对年款与接线规格" },
      { name: "制动与易损件", use: "复购稳定但同质化重，靠规格齐全度拉开差距" },
      { name: "新能源相关件", use: "竞争尚未饱和，但认证、质保与适配门槛更高" },
    ],
  },

  /* ---------------- 03 · OE 码匹配与避坑 ---------------- */
  "oe-match": {
    type: "oe-match",
    path: "/tools/ai-oe-match",
    name: "AI OE 码匹配与避坑助手",
    cardTitle: "AI OE 码匹配与避坑助手",
    cardDesc: "输入车型与配件，AI 提示高发错配风险，并引导获取精准 OE 号匹配方案。",
    cardBadge: "AI 避坑 · 免费体验",
    cardButton: "体验 AI 诊断",
    icon: "shield",
    heroTag: "工具库 · AI 适配",
    heroDesc:
      "发错一个件，赔进去的是运费、退货和评分。说出车型与配件，助手先列出这个组合的高发错配风险与核对动作，再告诉你要不要查完整 OE 库。每位访客每天免费诊断 3 次。",
    subtitle: "改款 · 接线 · 左右件 · 高低配，先避坑再上架",
    emptyTitle: "说说车型年款和配件",
    emptyHint:
      "例如「19 款丰田亚洲龙大灯」。我会先提示这个组合最容易装错的地方，再给你一份上架前的核对清单。",
    placeholder: "例如：19 款丰田亚洲龙大灯，装车总说不匹配，问题一般出在哪？",
    quickAsks: [
      { label: "19 款亚洲龙大灯", prompt: "19 款丰田亚洲龙大灯，适配上有什么高发错配风险？" },
      { label: "中期改款怎么核对", prompt: "同一车型中期改款，配件怎么核对才不会发错？" },
      { label: "左右件与高低配", prompt: "左右件和高低配版本，上架前要核哪些字段？" },
      { label: "OE 号后 6 位", prompt: "为什么建议核对 OE 号后 6 位？完整 OE 库要怎么开通？" },
    ],
    loadingText: "正在排查高发错配风险…",
    limitMessage: AI_DIAGNOSIS_LIMIT_MESSAGE,
    showCalc: false,
    footerNote: "提示为经验规则，不构成适配结论；精准 OE 号、替代件与适配车型需开通金游智库专属查询账号。",
    seo: {
      title: "AI OE码匹配助手｜汽配适配错配风险诊断",
      description:
        "AI OE 码匹配与避坑助手：输入车型与配件，自动提示中期改款、接线差异、左右件与高低配等高发错配风险，给出上架前核对清单与精准 OE 号匹配方案，每天免费诊断 3 次。",
      keywords: ["OE码匹配", "汽配适配查询", "适配错配风险", "车型年款核对", "AI适配诊断"],
    },
    h2: "AI 适配诊断能挡住哪些错配",
    h2Desc: "适配错配不是「查一下零件号」就完事：改款、接线、左右件、高低配各有各的坑。助手按车型与配件组合列出最该先核的几项，把风险挡在发货之前。",
    rules: [
      { title: "年款与改款", desc: "同一车名跨中期改款常换灯体与插头，按车名发货最容易错。" },
      { title: "规格与接口", desc: "卤素 / LED、带不带 AFS、插头针脚数，决定能不能装、能不能亮。" },
      { title: "左右与配置", desc: "左右件不通用，高低配外观近似但 OE 号不同，务必逐位核对。" },
    ],
    scenes: [
      { name: "灯具类", use: "改款与接线差异最集中，优先核对 OE 号后 6 位" },
      { name: "制动与底盘件", use: "按车型年款与底盘代号双重校验，避免孔距不符" },
      { name: "电子电器件", use: "针脚、协议与配置版本差异，光看外形会踩坑" },
    ],
  },

  /* ---------------- 04 · 库存健康与清仓 ---------------- */
  inventory: {
    type: "inventory",
    path: "/tools/ai-inventory",
    name: "AI 库存健康与清仓顾问",
    cardTitle: "AI 库存健康与清仓顾问",
    cardDesc: "输入你的滞销 SKU 和成本，AI 生成 90 天阶梯清仓方案（促销 / 批发 / 拆件）。",
    cardBadge: "AI 顾问 · 免费体验",
    cardButton: "咨询 AI 顾问",
    icon: "boxes",
    heroTag: "工具库 · AI 库存",
    heroDesc:
      "压在仓库里的不是货，是现金。说出滞销 SKU、数量和成本，助手按 90 天生成按周推进的阶梯清仓方案，连每一步的折价与保本线一起算给你。每位访客每天免费咨询 3 次。",
    subtitle: "90 天 · 按周推进 · 促销 / 批发 / 拆件，回款算得清",
    emptyTitle: "说说压在手里的货",
    emptyHint:
      "例如「雨刷 300 条，成本 12 元，放了 5 个月」。数量和成本给我，我按周排一份 90 天清仓计划。",
    placeholder: "例如：刹车片 200 套，成本 60 元，库龄 6 个月，怎么分阶段清掉？",
    quickAsks: [
      { label: "雨刷 300 条怎么清", prompt: "雨刷 300 条，成本 12 元，库龄 5 个月，给一份 90 天清仓方案" },
      { label: "刹车片压了 6 个月", prompt: "刹车片 200 套，成本 60 元，库龄 6 个月，要不要直接批发处理？" },
      { label: "什么时候该拆件", prompt: "滞销配件什么情况下该拆件卖，能不能给个判断标准？" },
      { label: "清仓保本线怎么算", prompt: "清仓打折最多能打到几折才不亏现金？帮我算保本线" },
    ],
    loadingText: "正在排 90 天清仓节奏…",
    limitMessage: AI_DIAGNOSIS_LIMIT_MESSAGE,
    showCalc: false,
    footerNote: "折价与回款为按成本推算的估算值，不替代财务核算；官网不处理支付，方案由主理人一对一复核。",
    seo: {
      title: "AI库存清仓顾问｜90天阶梯清仓方案与折价测算",
      description:
        "AI 库存健康与清仓顾问：输入滞销 SKU、数量与成本，自动生成按周推进的 90 天阶梯清仓方案（促销 / 批发 / 拆件）与折价、保本线测算，每天免费咨询 3 次。",
      keywords: ["AI库存清仓", "滞销SKU处理", "90天清仓方案", "汽配库存周转", "阶梯折价测算"],
    },
    h2: "90 天清仓怎么排：先促销，再批发，最后拆件",
    h2Desc: "清仓最怕一上来就砍到骨折。助手把 90 天分成四段，逐段给动作与折价区间，并按你给的成本算出每段的回款与保本线；数字由系统算，AI 只负责解释与提醒。",
    rules: [
      { title: "第 1–2 周 · 促销", desc: "小幅让利试水，先看真实动销，不急着动价格底线。" },
      { title: "第 3–8 周 · 组合与批发", desc: "按周加深折价，同步找批量走货渠道，优先回现金。" },
      { title: "第 9–13 周 · 拆件 / 止损", desc: "剩余尾货按可拆件价值处理，算清继续仓储是否还划算。" },
    ],
    scenes: [
      { name: "易损件尾货", use: "周转快、通用性强，促销段通常就能走掉大半" },
      { name: "车型专属件", use: "受众窄，尽早转批发，拖越久越难回本" },
      { name: "高值电子件", use: "质保与适配敏感，拆件前先评估检测与售后成本" },
    ],
  },
};

/** 给 /api/ai-chat 做参数校验用的白名单 */
export function isToolType(v: unknown): v is ToolType {
  return typeof v === "string" && (TOOL_TYPES as string[]).includes(v);
}
