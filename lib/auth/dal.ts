import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSessionTokens } from "@/lib/auth/session";
import { decodeJwtClaims } from "@/lib/auth/jwt";
import { apiMe, type CurrentUser } from "@/lib/api/auth-endpoints";
import type { AccessModule } from "@/lib/rbac/modules";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth");

/**
 * Data Access Layer, per the Next 16 authentication guide
 * (docs/01-app/02-guides/authentication.md, "Creating a Data Access
 * Layer").
 *
 * React cache() memoizes per render pass, so the layout, the user menu
 * and the page all share ONE GET /auth/me.
 *
 * proxy.ts is an optimistic pre-filter, not a security boundary — Server
 * Functions are POSTs to the page route and can bypass a proxy matcher
 * entirely. Every page and every action calls in here.
 */

export interface Session {
  accessToken: string;
  userId: string;
  /** From the unverified token. Optimistic only — never gate data on
   *  this. Use getCurrentUser().role instead. */
  claimedRole: string;
}

export const verifySession = cache(async (): Promise<Session> => {
  const { accessToken } = await readSessionTokens();
  const claims = decodeJwtClaims(accessToken);
  if (!accessToken || !claims) {
    redirect("/login?reason=unauthenticated");
  }
  return { accessToken, userId: claims.sub, claimedRole: claims.role };
});

/**
 * The real authorization boundary. Asks the API who we are; the API
 * verifies the signature, checks the Redis logout blacklist, and returns
 * the live role and RBAC-granted modules — none of which the cookie can
 * tell us.
 *
 * Also enforces the base access rule: an inactive account, or one with no
 * modules granted at all, would see a shell with nothing to show. In
 * practice this only fires for a deactivated account — 'dashboard' is
 * always-on for every other active user (see AccessModule). Per-module
 * gating beyond that is requireModule()/requireAdmin() below, not this
 * function — ending the session here is reserved for "this account can
 * see nothing," not "this account can't see this one page."
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const { accessToken } = await verifySession();
  const result = await apiMe(accessToken);

  if (!result.ok) {
    if (result.error.kind === "unauthorized" || result.error.kind === "forbidden") {
      // proxy already guaranteed >=120s of access-token life, so a 401
      // here is not expiry — it's revocation (logout elsewhere, or a
      // login on another device stealing the single refresh slot). Hard
      // logout. Cannot clear cookies mid-render, hence the Route Handler
      // bounce.
      redirect("/auth/end?reason=session_ended");
    }
    log.error("GET /auth/me failed", { kind: result.error.kind });
    throw new Error("Gagal memuat data pengguna."); // → nearest error.tsx
  }

  if (!result.data.isActive || result.data.modules.length === 0) {
    redirect("/auth/end?reason=no_access");
  }
  return result.data;
});

/**
 * Per-page RBAC gate. Every page under app/(app)/ (other than the
 * dashboard itself, which every active user can reach) opens with this
 * instead of a bare getCurrentUser() — see the plan's module catalog for
 * which page uses which module. Redirects to the dashboard rather than
 * ending the session: the account is legitimately active, it just can't
 * see this one module, which can change the moment an admin edits the
 * matrix (no re-login required — see RbacService.getGrantedModules).
 *
 * Hiding the sidebar link for an ungranted module (lib/ui/nav-items.ts) is
 * a convenience, not the security boundary — this is.
 */
export async function requireModule(module: AccessModule): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user.modules.includes(module)) redirect("/");
  return user;
}

/**
 * For the handful of surfaces that must stay hard-role-gated rather than
 * RBAC-grantable — User Management and the RBAC page itself. Mirrors the
 * API's own belt-and-braces choice to keep @Roles(UserRole.ADMIN) on
 * UsersAdminController and RbacController instead of @RequireModule().
 */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
