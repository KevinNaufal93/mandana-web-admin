import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Building2, PartyPopper, Warehouse, Truck, Images, Users } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Single source of truth for the primary nav. <AppSidebar> renders these
 * as links; <PageTitle> matches the current route against the same list
 * so the topbar's label can never drift out of sync with the rail's.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Property Management", icon: Building2 },
  { href: "/event-support", label: "Event Support", icon: PartyPopper },
  { href: "/storage", label: "Smart Storage", icon: Warehouse },
  { href: "/moving", label: "Moving Support", icon: Truck },
  { href: "/content-media", label: "Content Media Management", icon: Images },
  { href: "/users", label: "User Management", icon: Users },
];

/**
 * "/" only matches the dashboard itself; every other entry stays matched
 * for its own sub-routes (e.g. /properties/[id]). Shared by the sidebar's
 * active-link styling and the topbar's page title so both agree on what
 * counts as "current".
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export interface TitleOnlyRoute {
  href: string;
  label: string;
}

/**
 * Routes that need a topbar title but must NOT appear in the sidebar rail.
 * The notification bell is /notifications' only entry point, so listing it
 * a second time in NAV_ITEMS would be redundant navigation for a page nobody
 * is meant to browse to directly. Kept as its own list (rather than adding
 * an `inNav: boolean` flag to NAV_ITEMS) so NAV_ITEMS stays exactly what
 * <AppSidebar> renders, unchanged.
 */
export const TITLE_ONLY_ROUTES: TitleOnlyRoute[] = [{ href: "/notifications", label: "Notifikasi" }];
