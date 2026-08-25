import { PageTitle } from "@/components/shell/page-title";

export function AppTopbar({ children }: { children: React.ReactNode }) {
  return (
    // shadow-[...] is layered under the existing hairline border for a soft
    // lift off the canvas below — border alone gave a crisp edge with no
    // depth. Color is --primary (29 59 49) at low alpha, matched by hand
    // since arbitrary shadow values can't carry a CSS var's own opacity.
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 shadow-[0_1px_3px_rgba(29,59,49,0.08)]">
      <PageTitle />
      {children}
    </header>
  );
}
