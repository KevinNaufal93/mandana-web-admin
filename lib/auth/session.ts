import "server-only";
import { cookies, headers } from "next/headers";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearedSessionCookies,
  isSecureRequest,
  sessionCookies,
} from "@/lib/auth/cookies";
import { decodeJwtClaims, type JwtClaims } from "@/lib/auth/jwt";
import type { AuthTokens } from "@/lib/api/auth-endpoints";

export interface SessionTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

export async function readSessionTokens(): Promise<SessionTokens> {
  const store = await cookies();
  return {
    accessToken: store.get(ACCESS_COOKIE)?.value ?? null,
    refreshToken: store.get(REFRESH_COOKIE)?.value ?? null,
  };
}

export async function readAccessClaims(): Promise<JwtClaims | null> {
  const { accessToken } = await readSessionTokens();
  return decodeJwtClaims(accessToken);
}

/**
 * Callable ONLY from a Server Function or Route Handler. `cookies().set()`
 * throws during Server Component render (Next 16 docs:
 * app/api-reference/functions/cookies), which is the whole reason refresh
 * lives in proxy.ts and not in the API client.
 */
export async function writeSessionTokens(tokens: AuthTokens): Promise<void> {
  const store = await cookies();
  const secure = isSecureRequest(await headers());
  for (const c of sessionCookies(tokens, { secure })) store.set(c);
}

export async function clearSessionTokens(): Promise<void> {
  const store = await cookies();
  const secure = isSecureRequest(await headers());
  // Overwrite with maxAge:0 rather than .delete() — .delete() does not let
  // us restate secure/sameSite/path, and a browser only replaces a cookie
  // on an exact name+domain+path match. Same specs in, same specs out.
  for (const c of clearedSessionCookies({ secure })) store.set(c);
}
