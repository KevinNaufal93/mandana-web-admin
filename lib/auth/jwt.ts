/**
 * Decode-only JWT helpers.
 *
 * We do not have the API's HS256 signing secret in this app, so nothing
 * here verifies anything. Every value read out of a token is an UNTRUSTED
 * HINT — usable for deciding when to refresh and for optimistic routing,
 * and for nothing else. Authorization that actually gates data is decided
 * by the API (which does verify) or by getCurrentUser() in
 * lib/auth/dal.ts, which asks the API who the caller really is.
 *
 * Hand-rolled rather than adding `jose`: the only thing jose would add
 * over these ~20 lines is signature verification, which is exactly the
 * thing we cannot do without the API's secret.
 */

export interface JwtClaims {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export function decodeJwtClaims(token: string | undefined | null): JwtClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let payload: unknown;
  try {
    // Node's "base64url" decoder tolerates the missing '=' padding that
    // JWTs always have. It never throws on garbage — it produces junk
    // bytes, and JSON.parse is what rejects them. Both land in this catch.
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== "object") return null;

  const c = payload as Record<string, unknown>;
  if (typeof c.exp !== "number" || typeof c.sub !== "string") return null;
  return {
    sub: c.sub,
    email: typeof c.email === "string" ? c.email : "",
    role: typeof c.role === "string" ? c.role : "",
    iat: typeof c.iat === "number" ? c.iat : 0,
    exp: c.exp,
  };
}

/** Negative once expired. */
export function secondsUntilExpiry(claims: JwtClaims, nowMs = Date.now()): number {
  return claims.exp - Math.floor(nowMs / 1000);
}
