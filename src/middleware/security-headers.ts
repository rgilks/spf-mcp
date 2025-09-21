import { Context } from 'hono';
import type { Env } from '../index';

export function securityHeaders() {
  return async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
    // Security headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('X-XSS-Protection', '1; mode=block');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // HSTS header (only for HTTPS)
    const protocol = c.req.header('x-forwarded-proto') || 'http';
    if (protocol === 'https') {
      c.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }

    // Content Security Policy - simplified for API
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; connect-src 'self' https:;",
    );

    await next();
  };
}
