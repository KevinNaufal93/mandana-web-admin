"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavItemActive } from "@/lib/ui/nav-items";

/**
 * The topbar's wayfinding label — not a document heading. Every page under
 * (app) already renders its own <h1> (see app/(app)/page.tsx), so this is
 * deliberately a <p>, kept visually quieter than that h1 (text-base vs.
 * text-2xl — still a comfortable 1.5x step down), to avoid two competing
 * headings on the same page.
 *
 * text-accent rather than the topbar's inherited light text: the sidebar
 * already uses --accent as its "this is where you are" signal (the active
 * nav pill), so the topbar's title picks up the same meaning instead of
 * introducing a second, competing use of the color.
 *
 * Client component only because it reads the route via usePathname(); the
 * label list itself comes from the same NAV_ITEMS <AppSidebar> renders, so
 * no copy is duplicated or invented here.
 */
export function PageTitle() {
  const pathname = usePathname();
  const current = NAV_ITEMS.find(({ href }) => isNavItemActive(href, pathname));

  if (!current) return null;

  return <p className="text-base font-semibold text-accent">{current.label}</p>;
}
