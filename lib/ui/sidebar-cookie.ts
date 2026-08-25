/**
 * Sidebar collapse state, persisted in a cookie.
 *
 * A cookie rather than localStorage because the *server* has to know the
 * width before it renders: app/(app)/layout.tsx reads this and hands the
 * initial state to <SidebarProvider>, so the first paint is already the
 * right width. localStorage is only readable after hydration, which would
 * mean every navigation flashes the expanded rail before snapping shut.
 *
 * Written from the client (document.cookie), so — unlike the auth cookies
 * in lib/auth/cookies.ts — this one is deliberately NOT httpOnly. It holds
 * a UI preference and nothing else; treat it as untrusted input and run it
 * through parseSidebarState() on the way in.
 *
 * No `server-only`: both the server layout and the client provider import
 * this module.
 */

export const SIDEBAR_COOKIE = "mdn_sidebar";

/** One year. A UI preference has no reason to expire with the session. */
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type SidebarState = "expanded" | "collapsed";

/** Anything that isn't the literal "collapsed" falls back to expanded. */
export function parseSidebarState(value: string | undefined): SidebarState {
  return value === "collapsed" ? "collapsed" : "expanded";
}

/**
 * A `document.cookie` assignment string. `secure` is a parameter for the
 * same reason isSecureRequest() exists in lib/auth/cookies.ts: browsers
 * silently drop a Secure cookie on http://localhost, which would make the
 * preference appear to save and then reset on the next load.
 */
export function sidebarCookieString(state: SidebarState, opts: { secure: boolean }): string {
  return [
    `${SIDEBAR_COOKIE}=${state}`,
    "path=/",
    `max-age=${SIDEBAR_COOKIE_MAX_AGE}`,
    "samesite=lax",
    ...(opts.secure ? ["secure"] : []),
  ].join("; ");
}
