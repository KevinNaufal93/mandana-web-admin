"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSidebar } from "@/components/shell/sidebar-provider";
import { cn } from "@/lib/utils";

export function SidebarToggle({ className }: { className?: string }) {
  const { collapsed, toggle } = useSidebar();
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const label = collapsed ? "Buka sidebar" : "Tutup sidebar";

  return (
    <button
      type="button"
      onClick={toggle}
      // Not <Button variant="ghost">: that variant's hover is bg-muted, a
      // light token meant for the light chrome, and it disappears against
      // the dark sidebar.
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-card/80",
        "transition-colors hover:bg-card/10 hover:text-card",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      // aria-expanded describes the rail this button controls; the title is
      // what a mouse user gets, since the icon carries no text.
      aria-expanded={!collapsed}
      aria-label={label}
      title={`${label} (Ctrl/⌘ + B)`}
    >
      <Icon className="size-4" />
    </button>
  );
}
