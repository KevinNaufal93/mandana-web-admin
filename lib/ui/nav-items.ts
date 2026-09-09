import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  PartyPopper,
  Warehouse,
  Truck,
  Images,
  Users,
  ShieldCheck,
} from "lucide-react";
import type { AccessModule } from "@/lib/rbac/modules";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** RBAC gate for this link — see requireModule()/requireAdmin() in
   *  lib/auth/dal.ts, which is the actual security boundary. Filtering
   *  this list (visibleNavItems()) only keeps the rail honest about what
   *  the viewer can reach; it is not itself an access control. */
  module: AccessModule;
}

/**
 * Single source of truth for the primary nav. <AppSidebar> renders these
 * as links; <PageTitle> matches the current route against the same list
 * so the topbar's label can never drift out of sync with the rail's.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { href: "/properties", label: "Mandana Property", icon: Building2, module: "properties" },
  { href: "/event-support", label: "Mandana Living", icon: PartyPopper, module: "event-support" },
  { href: "/storage", label: "Mandana Space", icon: Warehouse, module: "storage" },
  { href: "/moving", label: "Mandana Move", icon: Truck, module: "moving" },
  { href: "/content-media", label: "Content Media Management", icon: Images, module: "content-media" },
  { href: "/users", label: "User Management", icon: Users, module: "users" },
  // Top-level, not /users/rbac: isNavItemActive is a prefix match, so
  // nesting under /users would leave the User Management link active too.
  { href: "/rbac", label: "Roles & Permissions", icon: ShieldCheck, module: "rbac" },
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

/**
 * What <AppSidebar> actually renders: NAV_ITEMS filtered to the viewer's
 * granted modules. Convenience only — the real gate on each page is
 * requireModule()/requireAdmin() in lib/auth/dal.ts.
 */
export function visibleNavItems(modules: AccessModule[]): NavItem[] {
  return NAV_ITEMS.filter((item) => modules.includes(item.module));
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
