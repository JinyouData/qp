import type { Product, Library } from "./types";
import { LIBRARIES, LIBRARY_ORDER } from "./types";

/* ============================================================
   产品详情页内容层
   - 默认模板：由产品已有字段推导（痛点/交付清单/使用步骤/FAQ）
   - 重点产品可定制：在 PRODUCT_EXTRA 里按 slug 覆盖
   新增产品不写这里也能出详情页，写了会更具体。
   ============================================================ */

export interface ProductFaq {
  q: string;
  a: string;
}

export interface ProductDetail {
  /** 你会遇到这些情况（场景痛点） */
  pains: string[];
  /** 拿到手是什么（交付清单） */
  checklist: string[];
  /** 怎么用（步骤） */
  steps: string[];
  /** 本产品专属 FAQ */
  faqs: ProductFaq[];
  /** 交付形式 */
  form: string;
  /** 更新频率 */
  update: string;
  /** 见效周期（不夸大，给区间） */
  timeline: string;
}

/** 按分隔符把 deliverable 拆成清单条目 */
function splitList(text: string): string[] {
  return text
    .split(/[+＋、，,／\/]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 按 CTA 类型给出默认使用步骤 */
function defaultSteps(p: Product): string[] {
  if (p.cta_type === "claim") {
    return [
      "提交表单，添加企业微信，回复【汽配数据】",
      "我们会把资料发给你，并按你的身份给一份使用建议",
      "照着清单在你的业务上跑一遍，卡住的点直接在群里问",
    ];
  }
  if (p.cta_type === "buy") {
    return [
      "扫码添加企业微信，确认你要解决的是不是这个问题",
      "添加后自动收到内部资料库链接，并受邀进入行业交流群",
      "拿到文件后填你自己的数据，第一周先算一个品类做验证",
    ];
  }
  return [
    "提交需求，我们约一次 30 分钟的现状沟通",
    "给你一份针对你情况的诊断结论与推进路线",
    "确认合作范围后进入方案与排期",
  ];
}

/** 按板块给出默认痛点补充 */
function libraryPains(library: Library): string[] {
  switch (library) {
    case "kb":
      return [
        "想判断我们靠不靠谱，但不想先付钱",
        "网上资料太散，不知道哪些能直接用",
      ];
    case "tools":
      return [
        "道理都懂，落到自己数据上就算不明白",
        "请人做太贵，自己做又不知道表格该长什么样",
      ];
    case "data":
      return [
        "查一个 OE 号要翻好几个平台，翻完还是不敢下结论",
        "想按毛利区间筛一遍品类，只能手工拉表慢慢算",
        "数据就摆在那儿，但手上没有一把能查它的钥匙",
      ];
    case "custom":
      return [
        "问题很具体，通用方法套不上去",
        "内部推不动，需要外部视角和陪跑",
      ];
  }
}

function defaultFaqs(p: Product): ProductFaq[] {
  const base: ProductFaq[] = [
    {
      q: "官网能直接付款吗？",
      a: p.cta_type === "buy"
        ? "不能，也刻意不做。官网不接入支付、不跳转任何第三方平台；扫码添加企业微信后，资料与交付全部在企微完成，售后与发票由我们直接对接。"
        : "不涉及付费。添联系主理人后我们直接把资料发给你，不需要在官网付款。",
    },
    {
      q: "多久能拿到？",
      a: p.cta_type === "claim"
        ? "添联系主理人后自动下发，一般当天内就能收到资料库链接。"
        : p.cta_type === "buy"
          ? "添联系主理人后即时获取；需要开票或定制的，1 个工作日内处理。"
          : "提交后 1 个工作日内联系你约沟通时间。",
    },
  ];
  if (p.library === "tools" || p.library === "data") {
    base.push({
      q: "可以开发票吗？",
      a: "可以。联系主理人确认需求后由我们直接开票，无需在第三方平台下单。",
    });
  }
  if (p.library === "custom") {
    base.push({
      q: "数据合规怎么处理？",
      a: "涉及数据的合作先签数据授权与保密协议（DPA），明确来源、用途与留存期限；个人信息一律脱敏后再进入分析与标注环节。",
    });
  }
  return base;
}

/** 重点产品定制内容（没有的产品走默认模板） */
const PRODUCT_EXTRA: Record<string, Partial<ProductDetail>> = {
  /* 2026-11-15 工具库终极 AI 化：选品评分表 / 适配校验表 / 库存周转模板
     连同《核价毛利计算器》全部下线，改为 /tools/ai-* 四个在线对话助手。
     它们没有产品详情页，因此这里不再保留任何表格工具的详情映射。 */
  "data-subscription": {
    pains: [
      "查一个 OE 号要翻好几个平台，翻完还是不敢下结论",
      "想按毛利区间筛一遍品类，只能手工拉表慢慢算",
      "手上有数据需求，但没有一把能查 312 万条数据的钥匙",
    ],
    checklist: [
      "金游智库·专属查询账号（Client 只读，一人一号，网页登录）",
      "312 万条底层 SKU 数据，按 OE 号 / 品牌 / 车型 / 毛利区间自由检索",
      "无限次查询，不按条计费",
    ],
    steps: [
      "开通后先跑一个你正在做的品类，按 OE 号反查适配关系与价格带",
      "用毛利区间筛出 40%-50% 的候选，再回到你的一线判断",
      "把常查的检索条件存成自己的常用视图，每周复用",
    ],
    form: "网页端账号（Client 只读权限）· 一人一号",
    update: "底层数据每周更新，账号有效期内持续可查",
    timeline: "开通当天可查，第一份选品结论约 1 小时",
  },
  "ai-data": {
    pains: [
      "通用大模型答汽配问题经常一本正经地胡说",
      "缺行业语料和标注规则，模型训不出来",
      "评测没有标准，不知道模型到底进步没有",
    ],
    checklist: [
      "行业语料授权（签 DPA，明确来源、范围与期限）",
      "标注规则共建（OE/VIN/适配关系的标注口径与边界）",
      "评测标准共建（题库 + 评分口径 + 回归测试集）",
    ],
    steps: [
      "先对齐场景与数据范围，签数据授权与保密协议",
      "共同确定标注规则，我们出初版，你们校验后定稿",
      "交付语料与标注结果，按评测标准跑回归，迭代",
    ],
    form: "按项目定制交付（语料 / 标注规则 / 评测集）",
    update: "按项目约定迭代",
    timeline: "首轮对齐 1-2 周，交付视数据量而定",
  },
};

/**
 * 产品 → 表单 demand 字段映射（深链预填用）。
 * 注意：必须放在非 "use client" 模块，服务端组件才能直接调用。
 */
export function demandForProduct(p: Product): string {
  if (p.slug === "sop-checklists") return "SOP";
  if (p.slug === "report-briefs" || p.slug === "full-reports") return "报告";
  if (p.slug === "data-subscription") return "数据产品";
  if (p.slug === "ai-data") return "AI合作";
  if (p.slug === "saas-cooperation") return "SaaS";
  switch (p.category) {
    case "knowledge":
      return "知识库";
    case "courses":
      return "数据订阅";
    case "reports":
      return "报告";
    case "consulting":
      return "咨询";
    default:
      return "知识库";
  }
}

/** 板块对比：本板块 vs 相邻板块 */
export function libraryCompare(library: Library): { current: string; lower?: string; higher?: string } {
  const i = LIBRARY_ORDER.indexOf(library);
  return {
    current: LIBRARIES[library].name,
    lower: i > 0 ? LIBRARIES[LIBRARY_ORDER[i - 1]].name : undefined,
    higher: i >= 0 && i < LIBRARY_ORDER.length - 1 ? LIBRARIES[LIBRARY_ORDER[i + 1]].name : undefined,
  };
}

/** 取产品的详情内容（定制优先，缺省用模板推导） */
export function getProductDetail(p: Product): ProductDetail {
  const extra = PRODUCT_EXTRA[p.slug] ?? {};
  return {
    pains: extra.pains ?? [p.problem, ...libraryPains(p.library)],
    checklist: extra.checklist ?? splitList(p.deliverable),
    steps: extra.steps ?? defaultSteps(p),
    faqs: extra.faqs ?? defaultFaqs(p),
    form: extra.form ?? "线上交付（文件 / 表格 / 在线文档）",
    update: extra.update ?? "随业务变化持续更新",
    timeline:
      extra.timeline ?? (p.library === "custom" ? "视项目范围而定" : "上手当天可用"),
  };
}
