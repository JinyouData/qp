"use client";

import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export type MobileFooterGroup = {
  id: string;
  title: string;
  links: { href: string; label: string; external?: boolean }[];
};

/**
 * 移动端（<768px）页脚导航：手风琴折叠，默认只展开第一组。
 * 链接用三列网格排布，5 项压成 2 行（第一行 3 个、第二行 2 个），比两列更紧凑。
 * 每个链接仍保持 min-h-11（44px）触控高度，避免误触。
 * 该组件只在 footer.tsx 的 md:hidden 分支渲染，PC 端不受影响。
 * 仅负责渲染，链接数据由 footer.tsx 传入（与 PC 端口径同源可核对）。
 */
export function FooterAccordion({ groups }: { groups: MobileFooterGroup[] }) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={groups[0]?.id}
      className="space-y-2"
    >
      {groups.map((group) => (
        <AccordionItem
          key={group.id}
          value={group.id}
          className="rounded-lg border border-brand-green/10 bg-card/60 px-3 shadow-none"
        >
          {/* 触控区至少 44px：视觉上仍是紧凑的一行，但点击高度撑到 44px */}
          <AccordionTrigger className="min-h-11 py-2.5 text-[13px] font-semibold hover:text-brand-green">
            {group.title}
          </AccordionTrigger>
          <AccordionContent className="pb-2.5">
            {/* 移动端三列网格：5 个链接 = 第一行 3 个 + 第二行 2 个，共 2 行。
                gap 收紧到 x-1.5 / y-0；链接本身 min-h-11 保证触控面积。 */}
            <ul className="grid grid-cols-3 gap-x-1.5 gap-y-0">
              {group.links.map((l) => (
                <li key={l.href + l.label}>
                  {l.external ? (
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-11 items-center py-1.5 text-[12px] leading-tight transition-colors hover:text-brand-orange-ink"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="flex min-h-11 items-center py-1.5 text-[12px] leading-tight transition-colors hover:text-brand-orange-ink"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
