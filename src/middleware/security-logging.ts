import { Context } from 'hono';
import type { Env } from '../index';

interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'invalid_token' | 'suspicious_activity';
  ip: string;
  userAgent: string;
  timestamp: string;
  details: Record<string, any>;
}

export function securityLogging() {
  return async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
    const startTime = Date.now();
    const ip =
      c.req.header('cf-connecting-ip') ||
      c.req.header('x-forwarded-for') ||
      'unknown';
    const userAgent = c.req.header('user-agent') || 'unknown';

    await next();

    const duration = Date.now() - startTime;
    const status = c.res.status;

    // Log security events
    if (status === 401) {
      await logSecurityEvent(c, {
        type: 'auth_failure',
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
        details: {
          path: c.req.path,
          method: c.req.method,
          status,
          duration,
        },
      });
    } else if (status === 429) {
      await logSecurityEvent(c, {
        type: 'rate_limit',
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
        details: {
          path: c.req.path,
          method: c.req.method,
          status,
          duration,
        },
      });
    }

    // Log suspicious activity (very long requests, unusual patterns)
    if (duration > 10000) {
      // 10 seconds
      await logSecurityEvent(c, {
        type: 'suspicious_activity',
        ip,
        userAgent,
        timestamp: new Date().toISOString(),
        details: {
          path: c.req.path,
          method: c.req.method,
          status,
          duration,
          reason: 'long_request',
        },
      });
    }
  };
}

async function logSecurityEvent(
  c: Context<{ Bindings: Env }>,
  event: SecurityEvent,
): Promise<void> {
  try {
    // Store in KV for security monitoring
    const logKey = `security:${event.type}:${Date.now()}:${Math.random().toString(36).substring(2)}`;
    await c.env.SPFKV.put(logKey, JSON.stringify(event), {
      expirationTtl: 30 * 24 * 60 * 60, // 30 days
    });

    // Also log to console for immediate monitoring
    console.warn(`🚨 Security Event: ${event.type}`, {
      ip: event.ip,
      path: event.details.path,
      method: event.details.method,
      status: event.details.status,
    });
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}
