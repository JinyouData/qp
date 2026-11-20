/* ============================================================
   案例库顶部成果条（原 /content 的核心资产并入 /cases）

   三项硬指标 + 客户证言，放在标签筛选上方。
   数据口径与已交付项目一致，客户名称已脱敏。
   ============================================================ */

const METRICS = [
  {
    value: "18%",
    label: "平均退货率降低",
    note: "已交付卖家的适配错配排查后均值",
  },
  {
    value: "200+",
    label: "覆盖细分品类",
    note: "已完成价格带与竞争格局诊断的类目",
  },
  {
    value: "500+",
    label: "累计诊断 SKU",
    note: "已完成逐 SKU 毛利与适配校验的商品",
  },
];

const TESTIMONIALS = [
  {
    quote: "以前每个月都在处理「装不上」的退货，上架前能查到适配关系之后，这类单子基本没了。",
    author: "欧洲平台车灯卖家 · L 先生",
  },
  {
    quote: "第一次看到每个 SKU 的真实毛利，才发现有三分之一的款是白干。砍掉之后利润反而涨了。",
    author: "跨境卖家 · W 女士",
  },
  {
    quote: "不用再赌爆款了，先看数据再决定进不进，库存周转明显轻了。",
    author: "店铺负责人 · C 先生",
  },
];

/** 三项量化指标（供 PageHero children 使用） */
export function CaseMetrics() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        {METRICS.map((m) => (
          <div
            key={m.label}
            className="rounded-2xl border border-brand-orange/15 bg-card p-5 shadow-warm"
          >
            <div className="text-3xl font-bold leading-none text-brand-green md:text-4xl">
              {m.value}
            </div>
            <div className="mt-2.5 text-sm font-semibold">{m.label}</div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{m.note}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs font-normal leading-relaxed text-gray-400">
        数据来自已交付的选品诊断项目；客户名称与可识别信息均已脱敏。
      </p>
    </>
  );
}

/** 客户证言条（位于指标下方、标签筛选上方） */
export function TestimonialsStrip() {
  return (
    <section className="border-b border-brand-orange/10 bg-white">
      <div className="container-site py-8 md:py-10">
        <h2 className="mb-5 text-xs font-bold tracking-[0.18em] text-brand-orange-ink">
          客户原声
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <blockquote
              key={t.author}
              className="border-l-2 border-brand-green/40 pl-4 text-sm italic leading-relaxed text-foreground/85"
            >
              「{t.quote}」
              <footer className="mt-2 text-xs not-italic text-muted-foreground">
                — {t.author}
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
