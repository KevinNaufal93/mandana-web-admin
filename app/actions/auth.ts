"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { apiLogin, apiLogout, apiMe } from "@/lib/api/auth-endpoints";
import { clearSessionTokens, readSessionTokens, writeSessionTokens } from "@/lib/auth/session";
import {
  parseLoginForm,
  type LoginFieldErrors,
  type LoginFormError,
} from "@/lib/auth/login-form";
import { sanitizeNextPath } from "@/lib/auth/next-path";
import { clientIp, clearLoginThrottle, identityKey, isLoginThrottled } from "@/lib/auth/throttle";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth");

export interface LoginFormState {
  fieldErrors?: LoginFieldErrors;
  formError?: LoginFormError;
  /** Echoed back so the input isn't cleared on a failed submit. Never the
   *  password. */
  email?: string;
}

/**
 * The NestJS side returns an identical 401 "Invalid credentials" for
 * unknown email / wrong password / inactive user, but it does NOT run
 * bcrypt when the email is unknown — so the response time still
 * discriminates. Hold every failure to a floor so our surface doesn't
 * leak what the API's copy hides. Cosmetic unless the API is firewalled
 * to this app only.
 */
const FAILURE_FLOOR_MS = 400;

async function floor(startedAt: number): Promise<void> {
  const remaining = FAILURE_FLOOR_MS - (Date.now() - startedAt);
  if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
}

export async function login(
  _previous: LoginFormState | undefined,
  formData: FormData,
): Promise<LoginFormState> {
  const startedAt = Date.now();
  const target = sanitizeNextPath(formData.get("next")?.toString() ?? null);

  const parsed = parseLoginForm({
    email: formData.get("email")?.toString() ?? "",
    password: formData.get("password")?.toString() ?? "",
  });
  if (!parsed.ok) {
    return { fieldErrors: parsed.errors, email: formData.get("email")?.toString() };
  }
  const { email, password } = parsed.value;

  const requestHeaders = await headers();
  const ip = clientIp(requestHeaders);
  const identity = identityKey(ip, email);
  if (isLoginThrottled(ip, identity)) {
    await floor(startedAt);
    return { formError: "RATE_LIMITED", email };
  }

  // Exactly two keys — forbidNonWhitelisted:true turns any extra into a 400.
  const loginResult = await apiLogin({ email, password });
  if (!loginResult.ok) {
    await floor(startedAt);
    if (loginResult.error.kind === "unauthorized") return { formError: "INVALID_CREDENTIALS", email };
    if (loginResult.error.kind === "network") return { formError: "NETWORK", email };
    if (loginResult.error.kind === "validation") return { formError: "INVALID_CREDENTIALS", email };
    log.error("Login failed unexpectedly", { kind: loginResult.error.kind });
    return { formError: "SERVER", email };
  }
  const tokens = loginResult.data;

  // Role gate BEFORE any cookie is written. Credentials being valid is
  // not enough: every admin/* endpoint is @Roles(ADMIN), so an `editor`
  // would get a shell whose every panel 403s.
  const meResult = await apiMe(tokens.accessToken);
  if (!meResult.ok) {
    await apiLogout(tokens.accessToken); // best effort — free the refresh slot
    await floor(startedAt);
    log.error("GET /auth/me failed right after login", { kind: meResult.error.kind });
    return { formError: "SERVER", email };
  }

  if (meResult.data.role !== "admin" || !meResult.data.isActive) {
    // POST /auth/logout nulls users.hashed_refresh_token and blacklists
    // the access token, so we leave no usable credential behind for an
    // account we just refused. Not throttled: the credentials were
    // correct, and this is the user's own account, so it is not an
    // enumeration signal.
    await apiLogout(tokens.accessToken);
    await floor(startedAt);
    return { formError: "NOT_ADMIN", email };
  }

  clearLoginThrottle(ip, identity);
  await writeSessionTokens(tokens);

  // Outside every try/catch — redirect() throws a control-flow exception.
  // From a Server Action this is a 303 the router follows.
  redirect(target);
}

export async function logout(): Promise<never> {
  const { accessToken } = await readSessionTokens();
  if (accessToken) {
    // Best effort, never blocking: the local session must die even if
    // the API is unreachable. On success this also blacklists the access
    // token in Redis, so it dies globally rather than just here.
    const result = await apiLogout(accessToken);
    if (!result.ok) log.warn("Remote logout failed; clearing local session anyway", { kind: result.error.kind });
  }
  await clearSessionTokens();
  redirect("/login?reason=signed_out");
}
