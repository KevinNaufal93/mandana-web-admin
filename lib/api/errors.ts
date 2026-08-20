/**
 * The API's error envelope is {statusCode, timestamp, path, error} where
 * `error` is string | {message: string|string[], error?: string,
 * statusCode: number}. Three shapes for one field. Normalize once, here,
 * so no call site ever has to reason about the union.
 */
export type ApiError =
  | { kind: "network" }
  | { kind: "unauthorized"; messages: string[] }
  | { kind: "forbidden"; messages: string[] }
  | { kind: "notFound"; messages: string[] }
  | { kind: "validation"; messages: string[] }
  | { kind: "server"; status: number; messages: string[] };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

function extractMessages(body: unknown): string[] {
  const err = (body as { error?: unknown } | null)?.error;
  if (typeof err === "string") return [err];
  if (err && typeof err === "object") {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return [m];
    if (Array.isArray(m)) return m.filter((x): x is string => typeof x === "string");
  }
  return [];
}

export function parseApiError(status: number, body: unknown): ApiError {
  const messages = extractMessages(body);
  if (status === 401) return { kind: "unauthorized", messages };
  if (status === 403) return { kind: "forbidden", messages };
  if (status === 404) return { kind: "notFound", messages };
  if (status === 400 || status === 422) return { kind: "validation", messages };
  return { kind: "server", status, messages };
}
