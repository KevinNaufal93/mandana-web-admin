/**
 * The four auth endpoints, on raw fetch.
 *
 * Deliberately NOT on openapi-fetch, for two reasons specific to this API:
 *
 *  1. The generated schema types every response as `content?: never`
 *     (every AuthController_* op), so openapi-fetch resolves `data` to
 *     `never`. It gives us nothing on the response side that we don't
 *     have to hand-write anyway.
 *  2. proxy.ts imports refreshSession() → this module. Keeping the proxy
 *     bundle's dependency surface at "global fetch" is worth more than the
 *     request-body typing openapi-fetch would add for two endpoints.
 *
 * Response types below are hand-written from the API contract
 * (mandana-api/src/modules/auth). When the NestJS side gains
 * @ApiOkResponse({type: ...}) decorators, regenerate the schema and these
 * can be derived instead.
 *
 * No `server-only` here — proxy.ts imports this module too.
 */
import { parseApiError, type ApiResult } from "@/lib/api/errors";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface CurrentUser {
  id: string;
  createdAt: string;
  updatedAt: string;
  email: string;
  name: string;
  role: "admin" | "editor";
  isActive: boolean;
  title: string | null;
  phone: string | null;
  whatsapp: string | null;
  photoMediaAssetId: string | null;
}

/**
 * NEXT_PUBLIC_ deliberately, matching mandana-web: Amplify Hosting was
 * confirmed not to forward non-NEXT_PUBLIC_ console vars into the SSR
 * compute's process.env (see mandana-web/next.config.ts). Not a secret —
 * the browser never calls the API directly under this app's BFF design,
 * but the value is a public URL either way.
 */
function baseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!url) throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  return url.replace(/\/$/, "");
}

const TIMEOUT_MS = 10_000;

async function call<T>(
  path: string,
  init: { method: string; body?: unknown; bearer?: string; expectEmpty?: boolean },
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      method: init.method,
      headers: {
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(init.bearer ? { Authorization: `Bearer ${init.bearer}` } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Swallow the cause on purpose: an undici error can carry the full
    // request init, and this module's request inits contain bearer tokens.
    return { ok: false, error: { kind: "network" } };
  }

  if (init.expectEmpty && response.status === 204) {
    return { ok: true, data: undefined as T };
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, error: parseApiError(response.status, body) };
  }
  return { ok: true, data: (body as { data: T }).data };
}

/**
 * The global ValidationPipe runs with forbidNonWhitelisted:true — ANY key
 * beyond email/password is a 400, not a silent ignore. Never spread a
 * form object in here.
 */
export function apiLogin(credentials: { email: string; password: string }) {
  return call<AuthTokens>("/auth/login", {
    method: "POST",
    body: { email: credentials.email, password: credentials.password },
  });
}

export function apiRefresh(refreshToken: string) {
  return call<AuthTokens>("/auth/refresh", { method: "POST", body: { refreshToken } });
}

export function apiLogout(accessToken: string) {
  return call<void>("/auth/logout", { method: "POST", bearer: accessToken, expectEmpty: true });
}

export function apiMe(accessToken: string) {
  return call<CurrentUser>("/auth/me", { method: "GET", bearer: accessToken });
}
