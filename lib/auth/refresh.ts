/**
 * Single-slot refresh rotation makes /auth/refresh a *serially consumed*
 * resource: the moment one caller rotates, every other holder of the old
 * token is holding a dead credential. proxy.ts runs on every request —
 * document loads, RSC navigations, and prefetches, which we provably
 * cannot tell apart (Next strips next-router-prefetch/rsc/?_rsc before
 * proxy sees the request). A dashboard with five <Link>s therefore fires
 * several concurrent proxy invocations, and a naive "refresh if near
 * expiry" would send several rotations, of which all but one fail with
 * 401 and log the user out mid-session.
 *
 * Two layers fix that without needing to identify prefetches:
 *
 *   1. in-flight coalescing — concurrent callers holding the same old
 *      token share one POST /auth/refresh and all receive the same new
 *      pair.
 *   2. a short grace cache keyed by the OLD token — a request that
 *      arrives after the rotation but still carrying the stale cookie
 *      (its Set-Cookie hadn't landed yet, or it's a second tab) is
 *      answered from cache instead of being sent to the API to earn a
 *      401.
 *
 * State lives on globalThis, not a module local, so it survives dev HMR
 * re-evaluation of the proxy module and is shared across bundles in one
 * process. This relies on a single Node-runtime process — see the
 * multi-instance caveat in the project plan's residual-risks section; a
 * multi-instance deployment needs this ported to Redis (SETNX lock +
 * short-TTL "rotated" key, same shape).
 */
import { createHash } from "node:crypto";
import { apiRefresh, type AuthTokens } from "@/lib/api/auth-endpoints";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth");

export type RefreshOutcome =
  | { ok: true; tokens: AuthTokens }
  /** The API rejected the refresh token: 7d expiry, logged out elsewhere,
   *  or rotated out by a login on another device. Not recoverable — hard
   *  logout. */
  | { ok: false; reason: "revoked" }
  /** Our egress failed. NOT a logout: the session may be perfectly fine. */
  | { ok: false; reason: "network" };

interface Store {
  inflight: Map<string, Promise<RefreshOutcome>>;
  recent: Map<string, { outcome: RefreshOutcome; at: number }>;
}

const GRACE_MS = 60_000;
const MAX_RECENT = 500;

const g = globalThis as typeof globalThis & { __mandanaRefreshStore?: Store };
const store: Store = (g.__mandanaRefreshStore ??= { inflight: new Map(), recent: new Map() });

/** Hash, not the raw token: this Map ends up in heap dumps and
 *  `--inspect` sessions, and a raw refresh token there is a live
 *  credential. */
const keyOf = (rt: string) => createHash("sha256").update(rt).digest("base64url");

function sweep(now: number) {
  if (store.recent.size < MAX_RECENT) {
    for (const [k, v] of store.recent) if (now - v.at >= GRACE_MS) store.recent.delete(k);
  } else {
    store.recent.clear();
  }
}

export async function refreshSession(oldRefreshToken: string): Promise<RefreshOutcome> {
  const now = Date.now();
  const key = keyOf(oldRefreshToken);
  sweep(now);

  const cached = store.recent.get(key);
  if (cached && now - cached.at < GRACE_MS) return cached.outcome;

  const inflight = store.inflight.get(key);
  if (inflight) return inflight;

  const promise = (async (): Promise<RefreshOutcome> => {
    const result = await apiRefresh(oldRefreshToken);
    let outcome: RefreshOutcome;
    if (result.ok) {
      outcome = { ok: true, tokens: result.data };
    } else if (result.error.kind === "unauthorized" || result.error.kind === "forbidden") {
      // Never log the token, not even truncated.
      log.warn("Refresh token rejected by API — forcing logout");
      outcome = { ok: false, reason: "revoked" };
    } else {
      log.error("Refresh call failed", { kind: result.error.kind });
      outcome = { ok: false, reason: "network" };
    }
    // Cache success and revocation; never cache a network blip — the next
    // request should retry rather than inherit our transient failure.
    if (outcome.ok || outcome.reason === "revoked") {
      store.recent.set(key, { outcome, at: Date.now() });
    }
    return outcome;
  })().finally(() => {
    store.inflight.delete(key);
  });

  store.inflight.set(key, promise);
  return promise;
}
