import { Hono } from 'hono';
import { createJWTService } from './jwt';
import type { Env } from '../index';

const authRouter = new Hono<{ Bindings: Env }>();

// Generate JWT token for MCP client
authRouter.post('/auth/token', async (c) => {
  try {
    const body = await c.req.json();
    const { role, sessionId, apiKey } = body;

    // Validate API key
    if (apiKey !== c.env.API_KEY) {
      return c.json(
        {
          success: false,
          error: 'Invalid API key',
        },
        401,
      );
    }

    // Validate role
    if (!['gm', 'player', 'observer'].includes(role)) {
      return c.json(
        {
          success: false,
          error: 'Invalid role. Must be gm, player, or observer',
        },
        400,
      );
    }

    // Generate user ID
    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Create JWT service
    const jwtService = createJWTService(c.env.JWT_SECRET);

    // Generate token
    const token = await jwtService.generateToken({
      sub: userId,
      role,
      sessionId,
    });

    return c.json({
      success: true,
      data: {
        token,
        userId,
        role,
        sessionId,
        expiresIn: 24 * 60 * 60, // 24 hours
      },
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return c.json(
      {
        success: false,
        error: 'Token generation failed',
      },
      500,
    );
  }
});

// Validate existing token
authRouter.post('/auth/validate', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        {
          success: false,
          error: 'Authorization header required',
        },
        401,
      );
    }

    const token = authHeader.substring(7);
    const jwtService = createJWTService(c.env.JWT_SECRET);

    const payload = await jwtService.verifyToken(token);

    return c.json({
      success: true,
      data: {
        userId: payload.sub,
        role: payload.role,
        sessionId: payload.sessionId,
        valid: true,
      },
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: 'Invalid token',
      },
      401,
    );
  }
});

export { authRouter };
