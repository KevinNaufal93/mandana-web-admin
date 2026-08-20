import { NextResponse } from "next/server";
import { clearedSessionCookies, isSecureRequest } from "@/lib/auth/cookies";

/**
 * The render-time hard-logout landing pad, and the only reason it has to
 * be a Route Handler: a Server Component cannot delete a cookie, so when
 * lib/auth/dal.ts discovers a revoked session mid-render its only move
 * is to redirect here.
 *
 * Without it you get an infinite loop: the DAL redirects to /login,
 * proxy sees a structurally-valid-but-revoked mdn_at and bounces
 * straight back.
 *
 * proxy.ts short-circuits this path so it does not refresh on the way in.
 */
export async function GET(request: Request): Promise<NextResponse> {
  // A GET that mutates state is CSRF-reachable. The only thing an
  // attacker gains is forcing a logout — annoying, not dangerous — but
  // the check is one line. `none` is a typed-URL/bookmark; our own
  // redirects are `same-origin`.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const reason = new URL(request.url).searchParams.get("reason") ?? "session_ended";
  const safeReason = /^[a-z_]{1,32}$/.test(reason) ? reason : "session_ended";

  const target = new URL("/login", request.url);
  target.searchParams.set("reason", safeReason);

  const response = NextResponse.redirect(target, 303);
  const secure = isSecureRequest(request.headers, new URL(request.url));
  for (const spec of clearedSessionCookies({ secure })) response.cookies.set(spec);
  return response;
}
