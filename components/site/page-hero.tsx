import { cn } from "@/lib/utils";

/** 二级页面统一页头 */
export function PageHero({
  tag,
  title,
  mobileTitle,
  desc,
  descClassName,
  children,
  aside,
  className,
}: {
  tag?: string;
  title: string;
  /** 移动端（<768px）替代标题，用于精简长标题避免孤行；PC 仍用 title */
  mobileTitle?: string;
  desc?: string;
  /** 覆盖副标题的 margin-top（移动端可传更小值让首屏更紧凑） */
  descClassName?: string;
  children?: React.ReactNode;
  /** 可选右侧视觉区（md 以上显示，移动端自动隐藏，保证窄屏平衡） */
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-brand-orange/10 bg-gradient-to-b from-[#FFF7EE] via-[#FCFAF6] to-background", className)}>
      <div
        className={cn(
          "container-site py-12 md:py-16",
          aside && "md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,360px)] md:items-center md:gap-10"
        )}
      >
        <div className="min-w-0">
          {tag && (
            <span className="mb-3 inline-block rounded-full bg-white px-3 py-1 text-xs font-semibold tracking-[0.2em] text-brand-orange-ink">
              {tag}
            </span>
          )}
          <h1 className="max-w-3xl text-3xl font-bold leading-tight md:text-4xl">
            {mobileTitle ? (
              <>
                <span className="md:hidden">{mobileTitle}</span>
                <span className="hidden md:inline">{title}</span>
              </>
            ) : (
              title
            )}
          </h1>
          {desc && (
            <p
              className={cn(
                "mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground md:text-base",
                descClassName
              )}
            >
              {desc}
            </p>
          )}
          {children && <div className="mt-6">{children}</div>}
        </div>

        {aside && <div className="mt-10 md:mt-0">{aside}</div>}
      </div>
    </section>
  );
}
