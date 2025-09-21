import {
  CreateSessionRequestSchema,
  UpdateSessionRequestSchema,
} from '../../schemas';
import type { Env } from '../../index';
import { ZodError } from 'zod';
import type { Context } from 'hono';

export async function sessionCreateHandler(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const input = CreateSessionRequestSchema.parse(body);

    // Get Session Durable Object
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));

    const response = await sessionDO.fetch(
      new Request('http://session/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );

    const result = (await response.json()) as {
      success: boolean;
      data?: unknown;
      error?: string;
      serverTs?: string;
    };

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        response.status as 400 | 500,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Session create error:', error);
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: JSON.stringify(error.issues),
        },
        400,
      );
    }
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function sessionLoadHandler(c: Context<{ Bindings: Env }>) {
  try {
    const sessionId = c.req.param('sessionId');
    if (!sessionId) {
      return c.json(
        {
          success: false,
          error: 'sessionId parameter required',
        },
        400,
      );
    }

    // Get Session Durable Object
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));

    const response = await sessionDO.fetch(
      new Request(`http://session/get?sessionId=${sessionId}`, {
        method: 'GET',
      }),
    );

    const result = (await response.json()) as {
      success: boolean;
      data?: unknown;
      error?: string;
      serverTs?: string;
    };

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        response.status as 400 | 500,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Session load error:', error);
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: JSON.stringify(error.issues),
        },
        400,
      );
    }
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function sessionUpdateHandler(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const input = UpdateSessionRequestSchema.parse(body);

    // Get Session Durable Object
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));

    const response = await sessionDO.fetch(
      new Request('http://session/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );

    const result = (await response.json()) as {
      success: boolean;
      data?: unknown;
      error?: string;
      serverTs?: string;
    };

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        response.status as 400 | 500,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Session update error:', error);
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: JSON.stringify(error.issues),
        },
        400,
      );
    }
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function sessionEndHandler(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { sessionId, reason } = body;

    if (!sessionId) {
      return c.json(
        {
          success: false,
          error: 'sessionId required',
        },
        400,
      );
    }

    // Validate sessionId format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return c.json(
        {
          success: false,
          error: 'Invalid sessionId format',
        },
        400,
      );
    }

    // Get Session Durable Object
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));

    const response = await sessionDO.fetch(
      new Request('http://session/end', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, reason }),
      }),
    );

    const result = (await response.json()) as {
      success: boolean;
      data?: unknown;
      error?: string;
      serverTs?: string;
    };

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        response.status as 400 | 500,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Session end error:', error);
    if (error instanceof ZodError) {
      return c.json(
        {
          success: false,
          error: JSON.stringify(error.issues),
        },
        400,
      );
    }
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}
