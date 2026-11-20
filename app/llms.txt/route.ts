import { getAllCaseStudies } from "@/lib/case-studies";

/* ============================================================
   llms.txt · 自动生成（GEO 核心文件）

   案例目录段从 content/cases/*.mdx 自动读取：
   新增一篇案例 MDX → 上线后本文件自动多一行摘要，无需手工维护。
   其余核心页面为稳定入口，集中在此统一说明。
   ============================================================ */

export const dynamic = "force-static";

const CORE_LINKS: Array<[string, string, string]> = [
  ["首页", "/", "汽配知识局是谁、三大板块（知识库 / 工具库 / 数据库）分别提供什么。"],
  ["关于我们", "/about", "团队的成立背景、数据口径与服务边界。"],
  ["知识库", "/knowledge", "有哪些避坑指南、行业报告、SOP 与案例可以直接查。"],
  ["客户成果与案例库", "/cases", "三项量化指标、客户原声，以及按车灯、脚垫、刹车片、库存周转等标签筛选的全部诊断案例；已合并原 /content。"],
  ["常见问题 FAQ", "/faq", "退货率、毛利测算、OE 号匹配、库存周转等高频问题的可摘录答案。"],
  ["汽配行业洞察", "/insights", "VIN 解析、OE 匹配、新能源汽配等深度文章。"],
  ["服务目录", "/products", "全部数据产品、报告、SOP 与咨询服务的总入口。"],
  ["避坑指南", "/products/knowledge-base", "汽配选品与上架前必须避开的坑清单。"],
  ["合规 SOP 清单", "/products/sop-checklists", "出海合规与门店运营可复用的 SOP 模板。"],
  ["行业报告", "/products/full-reports", "细分品类价格带、竞争格局与出海数据合规报告。"],
  ["金游智库·专属查询账号", "/products/data-subscription", "312 万 SKU 数据库、OE 号匹配与供货商评级账号怎么开通。"],
  ["咨询方案", "/consulting", "定制数据诊断、选品与库存项目的服务范围。"],
  ["AI 核价助手", "/tools/ai-profit", "给定采购价与售价，如何测算跨境全成本毛利。"],
  ["AI 选品与竞品诊断助手", "/tools/ai-selection", "一个细分品类值不值得进，怎么打分判断。"],
  ["AI OE 码匹配与避坑助手", "/tools/ai-oe-match", "OE 号怎么查、适配关系怎么校验才不会装不上。"],
  ["AI 库存健康与清仓顾问", "/tools/ai-inventory", "滞销库存怎么分级、怎么分流清仓。"],
  ["联系主理人", "/contact", "如何获取完整数据资料与一对一诊断服务。"],
];

export function GET() {
  const cases = getAllCaseStudies();
  const lines: string[] = [];

  lines.push(
    "汽配知识局（JINYOU DATA · 金游™，运营主体：深圳市元卦科技有限公司）是专注汽配跨境与国内后市场的数据智库，提供三大板块服务：知识库（避坑指南、合规 SOP、行业报告与脱敏案例）、工具库（四款免费 AI 助手：核价毛利、选品诊断、OE 码匹配避坑、库存清仓顾问）、数据库（312 万 SKU 的 OE 号匹配与适配校验、161.8 万+ 去重商品价格带与黄金毛利区间、200+ 细分品类竞争格局、万家供货商评级），面向跨境卖家、修理厂与经销体系提供可查证、可回溯的汽配数据。"
  );
  lines.push("");
  lines.push("# 核心页面");
  lines.push("");
  for (const [name, path, note] of CORE_LINKS) {
    lines.push(`- [${name}](https://jinyoudata.com${path})：${note}`);
  }
  lines.push("");
  lines.push(`# 案例目录（共 ${cases.length} 篇，由 content/cases/*.mdx 自动生成）`);
  lines.push("");
  for (const c of cases) {
    const summary = (c.solution || c.pain).slice(0, 64).replace(/\s+/g, " ");
    lines.push(
      `- [${c.title}](https://jinyoudata.com/cases/${c.slug})：${summary}｜标签：${c.tags.join("、")}`
    );
  }
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
