"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * These tabs change the URL, so they're navigation, not a role="tablist"
 * widget — a Radix Tabs wrapper around <Link>s would give the wrong ARIA
 * for no behavior. Copy of components/event-support/event-support-tabs.tsx.
 */
const TABS = [
  { href: "/articles/posts", label: "Artikel" },
  { href: "/articles/categories", label: "Kategori" },
];

export function ArticlesTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Bagian Article Management" className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {TABS.map(({ href, label }) => {
        // `${href}/` (not a bare startsWith) so "Artikel" never lights up
        // for some future "/articles/posts-something" sibling.
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-[color,border-color,transform] duration-fast ease-standard active:scale-[0.97]",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-primary",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
