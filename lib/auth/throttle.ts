/**
 * Per-instance, in-memory login throttle. This is NOT a real limiter
 * across replicas — it resets on cold start and each instance keeps its
 * own counters. It is a speed bump, not a security control. Same shape
 * and same caveat as the IP limiter in
 * mandana-web/app/api/moving/route-distance/route.ts.
 *
 * It exists because POST /auth/login on the NestJS side has NO rate
 * limiting at all, and the API is reachable directly — so this only
 * protects the path that goes through us. The real control is
 * @nestjs/throttler on the API side (see the project plan's API
 * follow-ups).
 *
 * Keyed on hash(ip + "|" + email), never on email alone: an email-only
 * bucket lets anyone with a botnet lock a known admin out of their own
 * panel, which turns a brute-force defence into a denial-of-service tool.
 * The per-IP bucket is what caps credential-stuffing volume from one
 * source.
 */
import { createHash } from "node:crypto";

const WINDOW_MS = 15 * 60_000;
const MAX_PER_IDENTITY = 5;
const MAX_PER_IP = 20;
const MAX_BUCKETS = 10_000;

interface Bucket { count: number; resetAt: number }

const g = globalThis as typeof globalThis & { __mandanaLoginBuckets?: Map<string, Bucket> };
const buckets: Map<string, Bucket> = (g.__mandanaLoginBuckets ??= new Map());

function hit(key: string, max: number, now: number): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > max;
}

function sweep(now: number) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  if (buckets.size >= MAX_BUCKETS) buckets.clear(); // last resort: bound memory
}

/** x-forwarded-for is spoofable unless the platform overwrites it. Assume
 *  it is, and treat the per-IP bucket as best-effort. */
export function clientIp(h: { get(name: string): string | null }): string {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

export function identityKey(ip: string, email: string): string {
  return createHash("sha256").update(`${ip}|${email}`).digest("base64url");
}

export function isLoginThrottled(ip: string, identity: string): boolean {
  const now = Date.now();
  sweep(now);
  // Evaluate both so both counters advance — no short-circuit.
  const identityTripped = hit(`id:${identity}`, MAX_PER_IDENTITY, now);
  const ipTripped = hit(`ip:${ip}`, MAX_PER_IP, now);
  return identityTripped || ipTripped;
}

export function clearLoginThrottle(ip: string, identity: string): void {
  buckets.delete(`id:${identity}`);
  buckets.delete(`ip:${ip}`);
}
