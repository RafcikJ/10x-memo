/**
 * Rate Limiter Service (In-Memory MVP)
 *
 * Provides application-level rate limiting for auth operations.
 *
 * Limits:
 * - 5 requests per 15 minutes per email+IP combination
 * - 10 requests per 15 minutes per IP (global protection)
 *
 * Note: In-memory storage means limits reset on server restart.
 * For production, consider using Redis or Supabase table for persistence.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp in ms
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // seconds until reset
}

// In-memory stores (will reset on server restart)
const emailIpStore = new Map<string, RateLimitEntry>();
const ipStore = new Map<string, RateLimitEntry>();

// Configuration
const EMAIL_IP_LIMIT = 5;
const IP_GLOBAL_LIMIT = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Extract client IP from request headers
 * Handles common proxy headers (x-forwarded-for, x-real-ip)
 */
function getClientIP(request: Request): string {
  // Try x-forwarded-for (most common with proxies)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take first IP in chain (client IP)
    return forwarded.split(",")[0].trim();
  }

  // Try x-real-ip
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Fallback (may not be accurate)
  return "unknown";
}

/**
 * Check rate limit for a specific key in store
 */
function checkLimit(store: Map<string, RateLimitEntry>, key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // No entry or expired entry - allow and create new
  if (!entry || now > entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return { allowed: true, retryAfter: 0 };
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  entry.count += 1;
  store.set(key, entry);

  return { allowed: true, retryAfter: 0 };
}

/**
 * Check rate limit for email + IP combination
 * Returns whether request should be allowed
 *
 * @example
 * ```ts
 * const result = await checkRateLimit(request, "user@example.com");
 * if (!result.allowed) {
 *   return new Response(JSON.stringify({
 *     error: "rate_limit_exceeded",
 *     retry_after: result.retryAfter
 *   }), { status: 429 });
 * }
 * ```
 */
export async function checkRateLimit(request: Request, email: string): Promise<RateLimitResult> {
  const ip = getClientIP(request);

  // Check email+IP combination first (more restrictive)
  const emailIpKey = `${ip}:${email.toLowerCase()}`;
  const emailIpResult = checkLimit(emailIpStore, emailIpKey, EMAIL_IP_LIMIT);

  if (!emailIpResult.allowed) {
    return emailIpResult;
  }

  // Check global IP limit (prevents abuse from single IP)
  const ipResult = checkLimit(ipStore, ip, IP_GLOBAL_LIMIT);

  return ipResult;
}

/**
 * Clear expired entries periodically to prevent memory leak
 * Call this from a scheduled task if needed
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();

  // Clean email+IP store
  for (const [key, entry] of emailIpStore.entries()) {
    if (now > entry.resetAt) {
      emailIpStore.delete(key);
    }
  }

  // Clean IP store
  for (const [key, entry] of ipStore.entries()) {
    if (now > entry.resetAt) {
      ipStore.delete(key);
    }
  }
}

/**
 * Get current rate limit stats (for debugging/monitoring)
 */
export function getRateLimitStats() {
  return {
    emailIpEntries: emailIpStore.size,
    ipEntries: ipStore.size,
    limits: {
      emailIpLimit: EMAIL_IP_LIMIT,
      ipGlobalLimit: IP_GLOBAL_LIMIT,
      windowMinutes: WINDOW_MS / (60 * 1000),
    },
  };
}
