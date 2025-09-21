import { Context } from 'hono';
import type { Env } from '../index';

// Test-only authentication middleware that bypasses auth in test environment
export async function testAuthMiddleware(
  c: Context<{ Bindings: Env }>,
  next: () => Promise<void>,
) {
  // Only allow in test environment
  if (process.env.NODE_ENV !== 'test') {
    console.error(
      'Test authentication middleware used in non-test environment',
    );
    return c.json(
      {
        success: false,
        error: 'Authentication required',
      },
      401,
    );
  }

  // In test environment, create a mock user
  const mockUser = {
    id: 'test-user',
    role: 'gm' as const,
    sessionId: '12345678-1234-1234-8234-123456789abc',
  };

  (c as any).set('user', mockUser);
  await next();
}
