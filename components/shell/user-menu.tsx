import { getCurrentUser } from "@/lib/auth/dal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

/**
 * The one session-dependent piece of the (app) shell — deliberately kept
 * to this single component and rendered inside a <Suspense> in
 * app/(app)/layout.tsx, so a slow GET /auth/me streams in without
 * blocking the sidebar/topbar chrome around it.
 */
export async function UserMenu() {
  const user = await getCurrentUser();
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-none text-primary">{user.name}</p>
        <p className="text-xs text-muted-foreground">{user.email}</p>
      </div>
      <Avatar className="size-9">
        <AvatarFallback className="bg-primary text-card font-medium">
          {initials(user.name)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:block">
        <div className="h-3.5 w-24 rounded bg-muted" />
        <div className="mt-1.5 h-3 w-32 rounded bg-muted" />
      </div>
      <div className="size-9 rounded-full bg-muted" />
    </div>
  );
}
