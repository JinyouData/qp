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
  links: { href: string; label: string }[];
};

/**
 * 移动端（<768px）页脚导航：手风琴折叠，默认只展开第一组。
 * 链接用两列网格排布，把 5 项压成 3 行，避免 PC 端四列内容在窄屏堆成长列表。
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
            <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {group.links.map((l) => (
                <li key={l.href + l.label}>
                  <Link
                    href={l.href}
                    className="flex min-h-11 items-center py-2 text-[13px] leading-tight transition-colors hover:text-brand-orange-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
