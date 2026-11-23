/**
 * In-memory sliding-window rate limiter for CMS auth endpoints (RFC-2026-CMS-01).
 *
 * Limits: max 5 attempts per 15-minute window per key (IP). Consecutive
 * windows that exceed the limit trigger a 1-hour lockout.
 *
 * Note: per-instance state — on serverless each instance keeps its own
 * counters. Sufficient as a first perimeter; swap for Redis if the CMS
 * ever runs multi-instance.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 60 * 60 * 1000;

interface Bucket {
  hits: number[]; // timestamps of attempts inside the current window
  lockedUntil: number;
  offenseCount: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so the map doesn't grow unboundedly.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60 * 1000) return;
  lastSweep = now;
  for (const [key, b] of buckets) {
    if (b.lockedUntil < now && b.hits.every((t) => now - t > WINDOW_MS) && b.offenseCount === 0) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the caller may retry (0 when allowed). */
  retryAfterSeconds: number;
  locked: boolean;
}

export function checkAuthRateLimit(key: string, now = Date.now()): RateLimitResult {
  sweep(now);
  let b = buckets.get(key);
  if (!b) {
    b = { hits: [], lockedUntil: 0, offenseCount: 0 };
    buckets.set(key, b);
  }

  if (b.lockedUntil > now) {
    return { allowed: false, locked: true, retryAfterSeconds: Math.ceil((b.lockedUntil - now) / 1000) };
  }

  b.hits = b.hits.filter((t) => now - t < WINDOW_MS);
  if (b.hits.length >= MAX_ATTEMPTS) {
    // Escalating lockout: each consecutive offending window adds an hour.
    b.offenseCount += 1;
    b.lockedUntil = now + LOCKOUT_MS * Math.min(b.offenseCount, 4);
    b.hits = [];
    return { allowed: false, locked: true, retryAfterSeconds: Math.ceil((b.lockedUntil - now) / 1000) };
  }

  b.hits.push(now);
  return { allowed: true, locked: false, retryAfterSeconds: 0 };
}

/** Clear a bucket (e.g. after a successful login). */
export function resetAuthRateLimit(key: string) {
  buckets.delete(key);
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}
