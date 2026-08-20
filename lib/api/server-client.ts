import "server-only";
import createClient from "openapi-fetch";
import type { paths } from "@/lib/api/schema";
import { verifySession } from "@/lib/auth/dal";
import { parseApiError, type ApiResult } from "@/lib/api/errors";

/**
 * Same trick as mandana-web/lib/api/client.ts: the generated schema keys
 * every path with the server's /api/v1 prefix, but
 * NEXT_PUBLIC_API_BASE_URL already ends in /api/v1. Strip the prefix at
 * the type level so call sites use paths relative to the base URL (e.g.
 * api.GET("/admin/properties")) without a double prefix at runtime.
 */
type StripApiV1<T> = {
  [K in keyof T as K extends `/api/v1${infer Rest}` ? Rest : K]: T[K];
};

type ClientPaths = StripApiV1<paths>;

/**
 * Per-request client. Never hoist this to a module singleton and never
 * call .use() on it for auth: createClient() returns a client whose
 * .use(middleware) mutates a process-global middleware array. A
 * middleware reading a per-request bearer token out of anything but its
 * own closure would, under concurrency, attach request A's token to
 * request B's call — a cross-tenant token leak, and a class of bug that
 * is nearly impossible to reproduce locally.
 *
 * Instead: construct the client per request, with the token baked into
 * `headers`. createClient is just a closure — construction is free.
 *
 * verifySession() redirects to /login when there is no session, so every
 * call site built on this is authenticated by construction.
 */
export async function serverApi() {
  const { accessToken } = await verifySession();
  return createClient<ClientPaths>({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * openapi-fetch hands back {data, error, response}, where `data` is the
 * whole body — for this API that's the {data: ...} envelope, one level
 * too high. And because the generated schema declares `content?: never`
 * on most admin/* responses today, both `data` and `error` are typed
 * loosely, so the cast below is unavoidable until the NestJS side
 * documents its response bodies with @ApiOkResponse. Isolating that cast
 * to this one function is the point.
 */
export function unwrap<T>(result: {
  data?: unknown;
  error?: unknown;
  response: Response;
}): ApiResult<T> {
  if (!result.response.ok) {
    return { ok: false, error: parseApiError(result.response.status, result.error ?? result.data) };
  }
  return { ok: true, data: (result.data as { data: T } | undefined)?.data as T };
}
