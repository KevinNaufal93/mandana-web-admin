import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSessionTokens } from "@/lib/auth/session";
import { decodeJwtClaims } from "@/lib/auth/jwt";
import { apiMe, type CurrentUser } from "@/lib/api/auth-endpoints";
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
 * the live role — none of which the cookie can tell us.
 *
 * Also enforces the admin-only rule: `editor` has zero privileges on
 * every admin/* endpoint, so an editor holding a session would see a
 * shell whose every panel 403s. Ending the session is the honest outcome.
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

  if (result.data.role !== "admin" || !result.data.isActive) {
    redirect("/auth/end?reason=not_admin");
  }
  return result.data;
});
