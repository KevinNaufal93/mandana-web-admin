"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CONTENT_BLOCK_TYPES } from "@/lib/content-blocks/types";

/**
 * Copy of storage-tabs.tsx's <nav> pattern — these change the URL, so
 * they're navigation, not a role="tablist" widget. Driven entirely by the
 * type registry: a new content-block type gets a tab for free here, no
 * edit to this file required.
 */
export function ContentMediaTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Jenis konten" className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {CONTENT_BLOCK_TYPES.map(({ slug, label }) => {
        const href = `/content-media/${slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
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
