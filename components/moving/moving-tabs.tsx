"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * These tabs change the URL, so they're navigation, not a role="tablist"
 * widget — same rationale as storage-tabs.tsx. Unlike Storage's
 * "Ketersediaan" tab, no entry here needs `exact` matching: `/moving`
 * itself only redirects (see app/(app)/moving/page.tsx) and is never a
 * tab's own href, so every entry safely uses the `${href}/` prefix check.
 */
const TABS = [
  { href: "/moving/truck-classes", label: "Tipe Truk" },
  { href: "/moving/addons", label: "Add-on" },
  { href: "/moving/settings", label: "Pengaturan" },
  { href: "/moving/leads", label: "Leads" },
] as const;

export function MovingTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Bagian Moving Support" className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {TABS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
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
