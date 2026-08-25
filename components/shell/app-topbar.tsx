import { PageTitle } from "@/components/shell/page-title";

export function AppTopbar({ children }: { children: React.ReactNode }) {
  return (
    // bg-primary, not bg-card: the topbar is now the second half of one
    // continuous dark-green chrome frame with <AppSidebar>, rather than a
    // separate plain white bar next to a richly-treated rail. No border-b
    // border-border here — that would be the same dead-border bug already
    // fixed on the sidebar (--border equals --primary, zero contrast
    // against a bg-primary surface) — a shadow does the separation instead.
    // Color is --primary (29 59 49) at low alpha, matched by hand since
    // arbitrary shadow values can't carry a CSS var's own opacity.
    <header className="flex h-16 shrink-0 items-center justify-between bg-primary px-6 shadow-[0_4px_16px_-4px_rgba(29,59,49,0.35)]">
      <PageTitle />
      {children}
    </header>
  );
}
