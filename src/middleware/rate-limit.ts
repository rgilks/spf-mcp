import { Context } from 'hono';
import type { Env } from '../index';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (c: Context) => string;
}

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute
  keyGenerator: (c) => c.req.header('cf-connecting-ip') || 'unknown',
};

export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };

  return async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
    const key = finalConfig.keyGenerator!(c);
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;

    try {
      // Get current rate limit data from KV
      const rateLimitKey = `rate_limit:${key}`;
      const rateLimitData = (await c.env.SPFKV.get(rateLimitKey, 'json')) as {
        count: number;
        resetTime: number;
      } | null;

      if (!rateLimitData || rateLimitData.resetTime < now) {
        // First request or window expired
        await c.env.SPFKV.put(
          rateLimitKey,
          JSON.stringify({
            count: 1,
            resetTime: now + finalConfig.windowMs,
          }),
          {
            expirationTtl: Math.ceil(finalConfig.windowMs / 1000),
          },
        );
      } else if (rateLimitData.count >= finalConfig.maxRequests) {
        // Rate limit exceeded
        return c.json(
          {
            success: false,
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000),
          },
          429,
        );
      } else {
        // Increment counter
        await c.env.SPFKV.put(
          rateLimitKey,
          JSON.stringify({
            count: rateLimitData.count + 1,
            resetTime: rateLimitData.resetTime,
          }),
          {
            expirationTtl: Math.ceil((rateLimitData.resetTime - now) / 1000),
          },
        );
      }

      await next();
    } catch (error) {
      console.error('Rate limit error:', error);
      // Fail open - allow request if rate limiting fails
      await next();
    }
  };
}

// Specific rate limits for different endpoints
export const diceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 50, // 50 dice rolls per minute
});

export const sessionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 session operations per minute
});

export const combatRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 combat actions per minute
});
