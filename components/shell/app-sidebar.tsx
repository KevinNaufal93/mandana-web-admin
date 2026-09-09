"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/shell/sidebar-provider";
import { SidebarToggle } from "@/components/shell/sidebar-toggle";
import { cn } from "@/lib/utils";
import { visibleNavItems, isNavItemActive } from "@/lib/ui/nav-items";
import type { AccessModule } from "@/lib/rbac/modules";
import logoTextWhite from "@/public/images/logo/logo_text_white.png";
import logoMark from "@/public/images/logo/logo_pure_transparent.png";

/**
 * Client component only because it reads the collapse state from context
 * and the current route. `modules` is the one piece of session data it
 * needs (to filter which links to render) — fetched by the server wrapper
 * <AppSidebarNav> in a <Suspense> (see app/(app)/layout.tsx) and passed
 * down as a plain prop, same split as <UserMenu>/<UserMenuDropdown>.
 */
export function AppSidebar({ modules }: { modules: AccessModule[] }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const items = visibleNavItems(modules);

  return (
    <aside
      data-state={collapsed ? "collapsed" : "expanded"}
      className={cn(
        // relative: anchors the watermark mark below. The flat border-r
        // that used to sit here rendered at zero contrast (--border equals
        // --primary, this rail's own fill), so it did nothing — a soft
        // primary-tinted shadow actually separates the rail from the
        // canvas instead. Hardcoded rgb mirrors --primary (29 59 49);
        // arbitrary shadow values can't reference a CSS var's own alpha.
        "relative hidden shrink-0 flex-col overflow-hidden bg-primary text-card shadow-[6px_0_24px_-8px_rgba(29,59,49,0.35)] md:flex",
        // Only the width animates. Transitioning `all` here would also
        // animate the shadow and the child colors and turn every hover
        // into a 200ms fade.
        "transition-[width] duration-slow ease-standard motion-reduce:transition-none",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* h-16 matches <AppTopbar> so the two bottom borders line up. Stays
          toggle-only even collapsed: the wordmark doesn't survive a 4rem
          rail, and cramming a second element into this row would break
          that alignment. The mark gets its own slot below instead. */}
      <div
        className={cn(
          // border-on-dark, not border-card/10 (an equivalent magic value
          // that predates this token) — see globals.css's --border comment
          // for why border-border itself is unusable on this bg-primary
          // rail.
          "flex h-16 shrink-0 items-center border-b border-border-on-dark",
          collapsed ? "justify-center px-2" : "justify-between gap-2 px-6",
        )}
      >
        {!collapsed && (
          <Link href="/" className="min-w-0">
            <Image
              src={logoTextWhite}
              alt="Mandana Property"
              height={36}
              priority
              className="h-9 w-auto"
            />
          </Link>
        )}
        <SidebarToggle />
      </div>

      {/* Collapsed-only: the wordmark's replacement while the rail is too
          narrow for it. Own row rather than sharing the header above, so
          the h-16/topbar alignment above never has to flex for it. */}
      {collapsed && (
        <div className="flex shrink-0 justify-center py-3">
          <Link href="/">
            <Image src={logoMark} alt="Mandana Property" className="h-6 w-auto opacity-90" />
          </Link>
        </div>
      )}

      {/* Decorative bleed of the same mark, expanded state only — the rail
          has a lot of unbroken height below 3 nav items; this fills it
          without inventing content. z-0 against z-10 on nav/footer below
          keeps it behind the real UI; -z-10 would drop it fully behind
          this aside's own bg-primary fill instead, which would hide it. */}
      {!collapsed && (
        <Image
          src={logoMark}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-12 -left-12 z-0 h-64 w-auto opacity-[0.05]"
        />
      )}

      <nav
        className={cn(
          "relative z-10 flex flex-1 flex-col gap-1 py-4",
          collapsed ? "px-2" : "px-4",
        )}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active = isNavItemActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center rounded-lg text-sm font-medium transition-[background-color,color,transform] duration-fast ease-standard active:scale-[0.97]",
                // Active gets its own fill instead of sharing hover's
                // bg-card/10 — the two used to be visually identical, so
                // there was no way to tell "current page" from "page I'm
                // pointing at". Accent is this app's warm tan token; this
                // is where its "you are here" meaning starts — <PageTitle>
                // in the topbar reuses the same signal.
                active
                  ? "bg-accent/18 text-accent"
                  : "text-card/90 hover:bg-card/10 hover:text-card",
                collapsed ? "justify-center px-0" : "gap-3 px-3",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {/* Kept in the tree when collapsed, not dropped: the link still
                  needs an accessible name once the text is off-screen. */}
              <span className={cn(collapsed ? "sr-only" : "truncate")}>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
