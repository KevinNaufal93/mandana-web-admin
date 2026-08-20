/**
 * Minimal structured logger — no dependency (winston/pino), matching this
 * repo's hand-rolled-over-library convention (see lib/property-filters.ts
 * in mandana-web). Isomorphic: every call site so far is either a Route
 * Handler, a Server Action, or a 'use client' component, and plain
 * console calls work fine in all of them, so one module covers both
 * without a server/client split.
 *
 * The point isn't behavior (it's still console.* underneath) — it's a
 * single place for the "[scope] message" shape and future call-site meta,
 * instead of that being hand-typed differently at every console.error.
 */

type LogMeta = Record<string, unknown>;

export interface Logger {
  warn(message: string, meta?: LogMeta): void;
  error(message: string, meta?: LogMeta): void;
}

export function createLogger(scope: string): Logger {
  const prefixed = (message: string) => `[${scope}] ${message}`;

  return {
    warn(message, meta) {
      if (meta) console.warn(prefixed(message), meta);
      else console.warn(prefixed(message));
    },
    error(message, meta) {
      if (meta) console.error(prefixed(message), meta);
      else console.error(prefixed(message));
    },
  };
}
