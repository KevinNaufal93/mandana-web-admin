"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CONTENT_BLOCK_TYPES } from "@/lib/content-blocks/types";
import { PAGE_IMAGE_PAGES } from "@/lib/page-images/shared";

/**
 * Copy of storage-tabs.tsx's <nav> pattern — these change the URL, so
 * they're navigation, not a role="tablist" widget. Driven by two
 * registries: a new content-block type gets a tab for free from
 * CONTENT_BLOCK_TYPES, and a new fixed page with its own image slots gets
 * one for free from PAGE_IMAGE_PAGES — no edit to this file required for
 * either.
 */
export function ContentMediaTabs() {
  const pathname = usePathname();
  const tabs = [
    ...CONTENT_BLOCK_TYPES.map(({ slug, label }) => ({ slug, label })),
    ...PAGE_IMAGE_PAGES.map(({ slug, label }) => ({ slug, label })),
  ];

  return (
    <nav aria-label="Jenis konten" className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {tabs.map(({ slug, label }) => {
        const href = `/content-media/${slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-[color,border-color,transform] duration-fast ease-standard active:scale-[0.97]",
              active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-primary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
