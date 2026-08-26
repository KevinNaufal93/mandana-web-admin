"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * These tabs change the URL, so they're navigation, not a role="tablist"
 * widget — same rationale as event-support-tabs.tsx. "Ketersediaan"
 * (`/storage` itself) needs an exact match rather than the `${href}/`
 * prefix check the other five use, or it would light up on every
 * sub-route since they all start with "/storage".
 */
const TABS = [
  { href: "/storage", label: "Ketersediaan", exact: true },
  { href: "/storage/facilities", label: "Fasilitas", exact: false },
  { href: "/storage/unit-types", label: "Tipe Unit", exact: false },
  { href: "/storage/inventory", label: "Inventaris", exact: false },
  { href: "/storage/units", label: "Unit", exact: false },
  { href: "/storage/bookings", label: "Pemesanan", exact: false },
] as const;

export function StorageTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Bagian Smart Storage" className="flex items-center gap-1 overflow-x-auto border-b border-border">
      {TABS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
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
