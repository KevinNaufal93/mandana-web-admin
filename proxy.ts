import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearedSessionCookies,
  isSecureRequest,
  sessionCookies,
  type CookieSpec,
} from "@/lib/auth/cookies";
import { decodeJwtClaims, secondsUntilExpiry } from "@/lib/auth/jwt";
import { refreshSession } from "@/lib/auth/refresh";
import { sanitizeNextPath } from "@/lib/auth/next-path";

/**
 * Runs on the Node runtime (Next 16 default for proxy; the `runtime`
 * segment option throws here).
 *
 * Two jobs, in order:
 *   1. keep the access-token cookie fresh, because Server Components
 *      cannot set cookies and this is therefore the only place a page
 *      render can be preceded by a rotation;
 *   2. optimistically bounce unauthenticated GETs to /login.
 *
 * Job 2 is a pre-filter, NOT the security boundary. Server Functions are
 * POSTs to the page route and a matcher change can silently drop them
 * out of coverage, so lib/auth/dal.ts re-checks everything.
 *
 * NOTE ON PREFETCHES: Next deletes rsc / next-router-prefetch /
 * next-router-state-tree from the request before proxy sees it, and
 * strips ?_rsc from the URL, so there is no way to branch on "is this a
 * prefetch" in here. Rather than pretend otherwise, refreshSession() is
 * built to be safe when several concurrent invocations all ask for the
 * same rotation. See lib/auth/refresh.ts.
 */

export const config = {
  matcher: [
    // Everything except build output and static assets. /api is
    // deliberately INCLUDED so future BFF route handlers get a fresh
    // token too, and because excluding data routes is how you protect a
    // page and forget its data route.
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};

const REFRESH_SKEW_SECONDS = 120;
const LOGIN_PATH = "/login";
const SESSION_END_PATH = "/auth/end";

function apply(response: NextResponse, specs: CookieSpec[] | null): NextResponse {
  // Setting on the RESPONSE alone is sufficient for both the browser AND
  // this same request's render: Next serializes these into an internal
  // header, moves it onto the upstream request without leaking it to the
  // client, and merges it into the cookie store so `await cookies()` in
  // the RSC render sees the NEW values. No request.cookies.set() dance
  // needed.
  if (specs) for (const spec of specs) response.cookies.set(spec);
  return response;
}

function toLogin(request: NextRequest, reason: string): NextResponse {
  const url = new URL(LOGIN_PATH, request.nextUrl);
  url.searchParams.set("reason", reason);
  const from = request.nextUrl.pathname + request.nextUrl.search;
  if (from !== "/" && !from.startsWith(LOGIN_PATH)) url.searchParams.set("next", from);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // The hard-logout route clears cookies; refreshing here first would
  // burn a rotation microseconds before it is deleted. Hands off entirely.
  if (pathname === SESSION_END_PATH) return NextResponse.next();

  const isPublic = pathname === LOGIN_PATH;
  const isNavigation = request.method === "GET" || request.method === "HEAD";
  const secure = isSecureRequest(request.headers, request.nextUrl);

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  let accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

  if (!refreshToken) {
    if (isPublic || !isNavigation) return NextResponse.next();
    return toLogin(request, "unauthenticated");
  }

  let fresh: CookieSpec[] | null = null;
  const claims = decodeJwtClaims(accessToken);
  const stale = !claims || secondsUntilExpiry(claims) <= REFRESH_SKEW_SECONDS;

  if (stale) {
    const outcome = await refreshSession(refreshToken);

    if (outcome.ok) {
      accessToken = outcome.tokens.accessToken;
      fresh = sessionCookies(outcome.tokens, { secure });
    } else if (outcome.reason === "revoked") {
      // 7d expiry, logged out elsewhere, or a login on another device
      // took the single refresh slot. Nothing to salvage.
      const response = isPublic || !isNavigation
        ? NextResponse.next()
        : toLogin(request, "session_ended");
      return apply(response, clearedSessionCookies({ secure }));
    }
    // reason === "network": fall through with whatever we have. Our own
    // egress being down is not grounds for signing someone out; if the
    // token really is dead the render will 401 and lib/auth/dal.ts takes
    // the hard-logout path.
  }

  // Already signed in and landing on /login — bounce to ?next (sanitized)
  // or home, carrying any rotation we just performed so it isn't discarded.
  if (isPublic && isNavigation && accessToken) {
    const target = sanitizeNextPath(request.nextUrl.searchParams.get("next"));
    return apply(NextResponse.redirect(new URL(target, request.nextUrl)), fresh);
  }

  return apply(NextResponse.next(), fresh);
}
