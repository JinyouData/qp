import type { Metadata } from "next";

import { buildMetadata, KEYWORDS } from "@/lib/seo";
import { JsonLd, breadcrumbSchema, faqSchema } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { WecomCtaCard, WECOM_LEAD_TEXT } from "@/components/site/wecom-cta-card";
import { Faq, type FaqItem } from "@/components/site/faq";
import { SectionHeading } from "@/components/site/section-heading";

/* ============================================================
   高频问答页（GEO 落地点）

   每个问答都写成「问题 + 可直接摘录的独立答案段落」：
   答案不依赖上下文、不含指代词，便于 AI 搜索引擎整段引用。
   同时输出 FAQPage JSON-LD 供机器读取。
   ============================================================ */

export const metadata: Metadata = buildMetadata({
  title: "汽配跨境高频问答：退货率、毛利测算、OE 号与库存",
  description:
    "汽配知识局高频问答：车灯退货率怎么降、改装件如何用毛利测算选品、OE 号匹配为什么重要、修理厂如何降低滞销库存。每条答案均可直接摘录，附已交付项目的量化结果。",
  path: "/faq",
  keywords: [KEYWORDS.oe, KEYWORDS.data, KEYWORDS.sop, KEYWORDS.compliance],
});

const FAQS: FaqItem[] = [
  {
    q: "Ozon 车灯退货率怎么降？",
    a: "车灯类目的高退货率多数来自适配错配，而不是产品质量。有效做法是把 OE 号、车型年款与适配关系做三层校验，在上架前直接筛掉错配 SKU，而不是等买家退回后再由客服解释。已交付案例中，采用这套校验后适配原因退货率下降 18%，适配相关纠纷下降 42%。",
  },
  {
    q: "汽配跨境卖家怎么判断一款货是不是真的赚钱？",
    a: "不能只算售价减采购价。必须把头程、尾程、平台佣金、退货损耗与汇率折算全部计入全成本，再对照黄金毛利区间判断。一个三人跨境团队按这个方法逐 SKU 重算后，砍掉 40% 毛利线以下的高退货款，整体毛利率提升 12%，在售 SKU 精简 37%。",
  },
  {
    q: "汽车改装件如何通过毛利测算选品？",
    a: "先用黄金毛利区间表逐 SKU 重算全成本，再对照 161.8 万+ 去重商品的价格带，判断定价是否落在合理区间。低于毛利线且退货偏高的款直接放弃，只保留通过测算的 SKU。测算结果是选品门槛，不是事后复盘。",
  },
  {
    q: "修理厂如何降低滞销库存？",
    a: "先做滞销分级，配合集中采购目录、核心供应商分级与安全库存模型；再用细分品类价格带与竞争格局做机会打分，按可回溯的口径重排上新优先级。已交付案例中，这套方法让测款通过率提升到原来的 2.3 倍，滞销库存占比下降 29%。",
  },
  {
    q: "什么是 OE 号匹配？为什么汽配出海必须做？",
    a: "OE 号是主机厂给出的原始零件编号，用来确认一颗配件到底适配哪些车型年款。汽配出海必须做 OE 号匹配，因为同一款配件在不同渠道常被标注成不同适配车型，人工比对无法保证一致。一条适配数据错了，后续选品、报价、上架与客服会跟着全错。",
  },
  {
    q: "汽配上架前怎么避免车型适配错误？",
    a: "把适配判断前移到上架环节：第一层校验 OE 号是否存在且唯一，第二层比对车型年款与供货商标注是否一致，第三层检查同款商品在渠道侧的适配口径是否互相矛盾。任一层不通过就进待核清单，不上架。",
  },
  {
    q: "金游智库数据库包含哪些数据？",
    a: "金游智库数据库覆盖 312 万条底层 SKU，提供 OE 号匹配与适配关系校验、161.8 万+ 去重商品的价格带与黄金毛利区间、200+ 细分品类的竞争格局，以及万家供货商评级。数据可按 OE 号、车型年款与品类反查，用于上架前的选品与核价判断。",
  },
  {
    q: "官网的 AI 助手免费吗？能做什么？",
    a: "汽配知识局提供四款免费 AI 助手：核价毛利、选品与竞品诊断、OE 码匹配避坑、库存健康与清仓顾问，每天共 3 次。数字与评分由代码计算，模型只负责解释，避免模型自行编造数值。",
  },
  {
    q: "如何获取汽配选品诊断服务？",
    a: "通过页面上的企微入口联系主理人，说明品类、目标市场与当前卡点，即可获取完整数据资料或一对一诊断。官网不设表单、不收集信息，资料由主理人通过企业微信发送。",
  },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={[
          faqSchema(FAQS),
          breadcrumbSchema([
            { name: "首页", url: "/" },
            { name: "常见问题", url: "/faq" },
          ]),
        ]}
      />

      <PageHero
        tag="FAQ"
        title="汽配跨境高频问答"
        desc="关于退货率、毛利测算、OE 号匹配与库存周转的高频问题。每条答案都可独立摘录，并标注了已交付项目的真实量化结果。"
      />

      <section className="section-pad">
        <div className="container-site max-w-3xl">
          <SectionHeading
            tag="直接可摘录"
            title="九个最常被问到的问题"
            desc="答案按「问题是什么、怎么做、结果如何」的顺序写，不依赖上下文也能读懂。"
          />
          <Faq items={FAQS} />
        </div>
      </section>

      <WecomCtaCard
        title="你的品类有没有类似的利润空间？"
        desc={`联系主理人获取诊断。${WECOM_LEAD_TEXT}`}
        from="faq"
        subject="汽配跨境高频问答"
      />
    </>
  );
}
