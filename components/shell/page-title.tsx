"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavItemActive } from "@/lib/ui/nav-items";

/**
 * The topbar's wayfinding label — not a document heading. Every page under
 * (app) already renders its own <h1> (see app/(app)/page.tsx), so this is
 * deliberately a <p>, kept visually quieter than that h1, to avoid two
 * competing headings on the same page.
 *
 * Client component only because it reads the route via usePathname(); the
 * label list itself comes from the same NAV_ITEMS <AppSidebar> renders, so
 * no copy is duplicated or invented here.
 */
export function PageTitle() {
  const pathname = usePathname();
  const current = NAV_ITEMS.find(({ href }) => isNavItemActive(href, pathname));

  if (!current) return null;

  return <p className="text-sm font-medium text-primary">{current.label}</p>;
}
