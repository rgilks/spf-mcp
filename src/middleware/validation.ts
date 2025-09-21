import { Context } from 'hono';
import { z } from 'zod';
import type { Env } from '../index';

export function validateInput<T>(schema: z.ZodSchema<T>) {
  return async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
    try {
      const body = await c.req.json();
      const validatedData = schema.parse(body);

      // Store validated data in context
      (c as any).set('validatedData', validatedData);

      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json(
          {
            success: false,
            error: 'Validation failed',
            details: (error as any).errors.map((err: any) => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
          400,
        );
      }

      return c.json(
        {
          success: false,
          error: 'Invalid request body',
        },
        400,
      );
    }
  };
}

export function sanitizeInput() {
  return async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
    try {
      const body = await c.req.json();

      // Recursively sanitize strings
      const sanitize = (obj: any): any => {
        if (typeof obj === 'string') {
          // Remove potentially dangerous characters
          return obj
            .replace(/[<>]/g, '') // Remove < and >
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();
        }

        if (Array.isArray(obj)) {
          return obj.map(sanitize);
        }

        if (obj && typeof obj === 'object') {
          const sanitized: any = {};
          for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitize(value);
          }
          return sanitized;
        }

        return obj;
      };

      const sanitizedBody = sanitize(body);
      (c as any).set('sanitizedData', sanitizedBody);

      await next();
    } catch (error) {
      console.error('Input sanitization error:', error);
      await next();
    }
  };
}

export function validateSessionId() {
  return async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
    const sessionId = c.req.param('sessionId') || c.req.query('sessionId');

    if (!sessionId) {
      return c.json(
        {
          success: false,
          error: 'Session ID required',
        },
        400,
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return c.json(
        {
          success: false,
          error: 'Invalid session ID format',
        },
        400,
      );
    }

    await next();
  };
}
