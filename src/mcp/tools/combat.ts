import {
  CombatStartRequestSchema,
  CombatDealRequestSchema,
  CombatHoldRequestSchema,
  CombatInterruptRequestSchema,
} from '../../schemas';
import type { Env } from '../../index';

export async function combatStartHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = CombatStartRequestSchema.parse(body);

    // Get Combat Durable Object for this session
    const combatDO = c.env.CombatDO.get(
      c.env.CombatDO.idFromName(`combat-${input.sessionId}`),
    );

    const response = await combatDO.fetch(
      new Request('http://combat/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );

    const result = await response.json();

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        response.status,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Combat start error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function combatDealHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = CombatDealRequestSchema.parse(body);

    // Get Combat Durable Object for this session
    const combatDO = c.env.CombatDO.get(
      c.env.CombatDO.idFromName(`combat-${input.sessionId}`),
    );

    const response = await combatDO.fetch(
      new Request('http://combat/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );

    const result = await response.json();

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        response.status,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Combat deal error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function combatHoldHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = CombatHoldRequestSchema.parse(body);

    // Get Combat Durable Object for this session
    const combatDO = c.env.CombatDO.get(
      c.env.CombatDO.idFromName(`combat-${input.sessionId}`),
    );

    const response = await combatDO.fetch(
      new Request('http://combat/hold', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );

    const result = await response.json();

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        response.status,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Combat hold error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function combatInterruptHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = CombatInterruptRequestSchema.parse(body);

    // Get Combat Durable Object for this session
    const combatDO = c.env.CombatDO.get(
      c.env.CombatDO.idFromName(`combat-${input.sessionId}`),
    );

    const response = await combatDO.fetch(
      new Request('http://combat/interrupt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      }),
    );

    const result = await response.json();

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        response.status,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Combat interrupt error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function combatAdvanceTurnHandler(c: any) {
  try {
    const body = await c.req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return c.json(
        {
          success: false,
          error: 'sessionId required',
        },
        400,
      );
    }

    // Get Combat Durable Object for this session
    const combatDO = c.env.CombatDO.get(
      c.env.CombatDO.idFromName(`combat-${sessionId}`),
    );

    const response = await combatDO.fetch(
      new Request('http://combat/advanceTurn', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }),
    );

    const result = await response.json();

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        response.status,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Combat advance turn error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function combatEndRoundHandler(c: any) {
  try {
    const body = await c.req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return c.json(
        {
          success: false,
          error: 'sessionId required',
        },
        400,
      );
    }

    // Get Combat Durable Object for this session
    const combatDO = c.env.CombatDO.get(
      c.env.CombatDO.idFromName(`combat-${sessionId}`),
    );

    const response = await combatDO.fetch(
      new Request('http://combat/endRound', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }),
    );

    const result = await response.json();

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        response.status,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Combat end round error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function combatStateHandler(c: any) {
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

    // Get Combat Durable Object for this session
    const combatDO = c.env.CombatDO.get(
      c.env.CombatDO.idFromName(`combat-${sessionId}`),
    );

    const response = await combatDO.fetch(
      new Request('http://combat/state', {
        method: 'GET',
      }),
    );

    const result = await response.json();

    if (!result.success) {
      return c.json(
        {
          success: false,
          error: result.error,
        },
        response.status,
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Combat state error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}
