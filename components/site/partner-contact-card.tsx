/* eslint-disable @next/next/no-img-element */

import { WecomCtaButton } from "@/components/site/wecom-dialog";
import { WECOM } from "@/lib/brand";

/* ============================================================
   合作页专属 · 商务名片式联系区块

   克制原则：
   - 不用大色块、不用大按钮、不重复提示文案；
   - 一根细分割线与上方内容隔开，融入页面底色；
   - PC 左右布局（左文字 / 右小二维码），移动端上下紧凑排列；
   - 二维码是唯一主转化路径，文字链仅作轻量辅助。
   ============================================================ */

export function PartnerContactCard() {
  return (
    <section className="section-pad !py-12 md:!py-14">
      <div className="container-site">
        <div className="border-t border-border/70 pt-10 md:pt-12">
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between md:gap-12">
            {/* 左侧：文字说明 */}
            <div className="max-w-xl">
              <span className="text-[11px] font-semibold tracking-[0.2em] text-muted-foreground">
                BUSINESS COOPERATION
              </span>
              <h2 className="mt-3 text-xl font-bold leading-snug md:text-2xl">
                寻找长期共赢的商务合作
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                如果您有成熟的 SaaS 产品、大模型语料需求或渠道资源，欢迎扫码联系主理人。
                <span className="whitespace-nowrap">（备注：商务合作，优先通过）</span>
              </p>
              <WecomCtaButton
                size="sm"
                variant="link"
                label="或点击这里联系主理人 →"
                from="partners-contact-link"
                subject="商务合作洽谈（SaaS / AI 数据 / 渠道资源）"
                className="mt-3 h-auto p-0 text-xs font-medium text-brand-green no-underline hover:underline"
              />
            </div>

            {/* 右侧：小尺寸二维码（唯一主转化路径） */}
            <div className="shrink-0">
              <img
                src={WECOM.qr}
                alt="主理人企业微信二维码"
                width={128}
                height={128}
                className="h-32 w-32 rounded-md border border-border/60 bg-white object-contain p-1"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
