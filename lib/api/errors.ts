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
  /**
   * 409. Distinct from `server` because this API uses 409 for rules the
   * operator can act on, not for faults: deleting a category that still
   * has items, PATCHing an event item that is no longer a draft,
   * archiving an item with a live booking, confirming a booking whose
   * stock ran out. Each of those wants its own copy at the call site, and
   * the stock one wants to render as a warning rather than a failure.
   *
   * Adding this member is behavior-neutral for existing consumers: none
   * of them switch exhaustively on `kind`, and every one falls through to
   * `messages.join(" ")`, which `conflict` still satisfies (a properties
   * 409 rendered the same way before this member existed, via `server`).
   */
  | { kind: "conflict"; messages: string[] }
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
  if (status === 409) return { kind: "conflict", messages };
  if (status === 400 || status === 422) return { kind: "validation", messages };
  return { kind: "server", status, messages };
}
