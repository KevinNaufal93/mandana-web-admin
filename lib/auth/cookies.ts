/**
 * Cookie names + attribute construction. Pure and dependency-free on
 * purpose: proxy.ts writes these via NextResponse.cookies, Server Actions
 * and Route Handlers write the same specs via next/headers cookies(). One
 * shape, two writers — a mismatch in path/secure/sameSite between the two
 * would make clearing silently fail (the browser only overwrites an exact
 * name+domain+path match).
 *
 * No `server-only` here — proxy.ts (Edge/Node proxy runtime, not a Server
 * Component) imports this module directly.
 */
import { decodeJwtClaims } from "@/lib/auth/jwt";

export const ACCESS_COOKIE = "mdn_at";
export const REFRESH_COOKIE = "mdn_rt";

/**
 * API TTLs (env-driven server-side, currently 15m/7d). Used only as
 * ceilings/fallbacks — the real value comes from the token's own `exp`, so
 * a server-side TTL change needs no deploy here.
 */
const ACCESS_TTL_CEILING_S = 60 * 30;
const REFRESH_TTL_CEILING_S = 60 * 60 * 24 * 7;

export interface CookieSpec {
  name: string;
  value: string;
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
}

function ageFromToken(token: string, ceiling: number): number {
  const claims = decodeJwtClaims(token);
  if (!claims) return ceiling;
  const remaining = claims.exp - Math.floor(Date.now() / 1000);
  return Math.min(ceiling, Math.max(0, remaining));
}

export function sessionCookies(
  tokens: { accessToken: string; refreshToken: string },
  opts: { secure: boolean },
): CookieSpec[] {
  const base = { httpOnly: true, sameSite: "lax", path: "/", secure: opts.secure } as const;
  return [
    { ...base, name: ACCESS_COOKIE, value: tokens.accessToken, maxAge: ageFromToken(tokens.accessToken, ACCESS_TTL_CEILING_S) },
    { ...base, name: REFRESH_COOKIE, value: tokens.refreshToken, maxAge: ageFromToken(tokens.refreshToken, REFRESH_TTL_CEILING_S) },
  ];
}

export function clearedSessionCookies(opts: { secure: boolean }): CookieSpec[] {
  const base = { httpOnly: true, sameSite: "lax", path: "/", secure: opts.secure } as const;
  return [
    { ...base, name: ACCESS_COOKIE, value: "", maxAge: 0 },
    { ...base, name: REFRESH_COOKIE, value: "", maxAge: 0 },
  ];
}

/**
 * `secure: true` on http://localhost is silently dropped by some browsers
 * and would make login appear to "work" then bounce straight back to
 * /login — the single most confusing dev failure in this whole module. So
 * derive it from the actual request scheme instead of NODE_ENV: `next
 * start` on http://localhost:3001 is NODE_ENV=production but must still be
 * insecure.
 *
 * AUTH_COOKIE_SECURE is an explicit escape hatch for a TLS-terminating
 * proxy that doesn't set x-forwarded-proto.
 */
export function isSecureRequest(
  h: { get(name: string): string | null },
  fallbackUrl?: { protocol: string },
): boolean {
  const override = process.env.AUTH_COOKIE_SECURE;
  if (override === "true") return true;
  if (override === "false") return false;
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto) return proto === "https";
  // Server Actions always carry Origin (Next's own CSRF check requires it).
  const origin = h.get("origin");
  if (origin) return origin.startsWith("https://");
  return fallbackUrl?.protocol === "https:";
}
