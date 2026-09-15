"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/seo/settings", label: "Pengaturan Umum" },
  { href: "/seo/pages", label: "SEO Halaman" },
  { href: "/seo/legal", label: "Halaman Legal" },
];

/** Copy of content-media-tabs.tsx's <nav> pattern — these change the URL,
 *  so they're navigation, not a role="tablist" widget. */
export function SeoTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Bagian SEO" className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {TABS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
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
