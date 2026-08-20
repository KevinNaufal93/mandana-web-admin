"use client";

import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="ghost" size="sm" className="w-full justify-start gap-2">
        <LogOut className="size-4" />
        Keluar
      </Button>
    </form>
  );
}
