"use client";

import { logout } from "@/app/actions/auth";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoutButton({ collapsed = false }: { collapsed?: boolean }) {
  const label = "Keluar";

  return (
    <form action={logout}>
      {/* Not <Button variant="ghost">: its hover is bg-muted, a light token
          that vanishes under this rail's inherited text-card. */}
      <button
        type="submit"
        title={collapsed ? label : undefined}
        className={cn(
          "flex h-10 w-full items-center rounded-lg text-sm font-medium text-card/90",
          "transition-colors hover:bg-card/10 hover:text-card",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          collapsed ? "justify-center px-0" : "gap-3 px-3",
        )}
      >
        <LogOut className="size-4 shrink-0" />
        <span className={cn(collapsed ? "sr-only" : "truncate")}>{label}</span>
      </button>
    </form>
  );
}
