import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard } from "lucide-react";
import { LogoutButton } from "@/components/shell/logout-button";
import logoTextWhite from "@/public/images/logo/logo_text_white.png";

const NAV_ITEMS = [{ href: "/", label: "Dashboard", icon: LayoutDashboard }];

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-primary text-card md:flex">
      <div className="flex h-16 items-center border-b border-card/10 px-6">
        {/* Logo */}
        <Link href="/">
          <Image
            src={logoTextWhite}
            alt="Mandana Property"
            height={36}
            priority
            className="h-9 w-auto"
          />
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-card/90 transition-colors hover:bg-card/10"
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-card/10 p-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
