import { Context } from 'hono';
import { verify } from 'hono/jwt';
import type { Env } from '../index';

export interface AuthUser {
  id: string;
  role: 'gm' | 'player' | 'observer';
  sessionId?: string;
}

export type AuthContext = Context<{
  Bindings: Env;
  Variables: { user: AuthUser };
}>;

export async function authMiddleware(
  c: AuthContext,
  next: () => Promise<void>,
) {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        {
          success: false,
          error: 'Authorization header required with Bearer token',
        },
        401,
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    if (!c.env.JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set');
      return c.json(
        {
          success: false,
          error: 'Server configuration error',
        },
        500,
      );
    }

    const payload = await verify(token, c.env.JWT_SECRET);

    if (!payload || typeof payload !== 'object') {
      return c.json(
        {
          success: false,
          error: 'Invalid token',
        },
        401,
      );
    }

    // Extract user information from token
    const user: AuthUser = {
      id: payload.sub as string,
      role: payload.role as 'gm' | 'player' | 'observer',
      sessionId: payload.sessionId as string,
    };

    // Store user in context
    c.set('user', user);

    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json(
      {
        success: false,
        error: 'Authentication failed',
      },
      401,
    );
  }
}

export function requireRole(requiredRole: 'gm' | 'player' | 'observer') {
  return async (c: AuthContext, next: () => Promise<void>) => {
    const user = c.get('user');

    if (!user) {
      return c.json(
        {
          success: false,
          error: 'Authentication required',
        },
        401,
      );
    }

    // Check role hierarchy: GM > Player > Observer
    const roleHierarchy = { gm: 3, player: 2, observer: 1 };
    const userLevel = roleHierarchy[user.role];
    const requiredLevel = roleHierarchy[requiredRole];

    if (userLevel < requiredLevel) {
      return c.json(
        {
          success: false,
          error: `Insufficient permissions. Required: ${requiredRole}, Current: ${user.role}`,
        },
        403,
      );
    }

    await next();
  };
}

export function requireSessionAccess() {
  return async (c: AuthContext, next: () => Promise<void>) => {
    const user = c.get('user');
    const sessionId = c.req.param('sessionId') || c.req.query('sessionId');

    if (!user) {
      return c.json(
        {
          success: false,
          error: 'Authentication required',
        },
        401,
      );
    }

    // GMs can access any session, others need to be in the session
    if (user.role !== 'gm' && user.sessionId !== sessionId) {
      return c.json(
        {
          success: false,
          error: 'Access denied to this session',
        },
        403,
      );
    }

    await next();
  };
}
