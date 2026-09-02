import { getCurrentUser } from "@/lib/auth/dal";
import { UserMenuDropdown } from "@/components/shell/user-menu-dropdown";
import { initials } from "@/lib/format";

/**
 * The one session-dependent piece of the (app) shell — deliberately kept
 * to this single component and rendered inside a <Suspense> in
 * app/(app)/layout.tsx, so a slow GET /auth/me streams in without
 * blocking the sidebar/topbar chrome around it.
 *
 * Stays a Server Component for the fetch; the interactive dropdown itself
 * lives in <UserMenuDropdown>, a client component that receives the
 * already-fetched identity as plain, serializable props.
 */
export async function UserMenu() {
  const user = await getCurrentUser();
  return (
    <UserMenuDropdown name={user.name} email={user.email} initials={initials(user.name)} photo={user.photo} />
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden sm:block">
        <div className="h-3.5 w-24 rounded bg-card/10" />
        <div className="mt-1.5 h-3 w-32 rounded bg-card/10" />
      </div>
      <div className="size-9 rounded-full bg-card/10" />
    </div>
  );
}
