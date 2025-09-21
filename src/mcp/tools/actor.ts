import {
  CreateActorRequestSchema,
  UpdateActorRequestSchema,
  MoveActorRequestSchema,
  ApplyEffectRequestSchema,
  RollTraitRequestSchema,
} from '../../schemas';
import type { Env } from '../../index';
import { ZodError } from 'zod';

export async function actorUpsertHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = CreateActorRequestSchema.parse(body);

    // Get Session Durable Object
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));

    const response = await sessionDO.fetch(
      new Request('http://session/actor/create', {
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
    console.error('Actor upsert error:', error);
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

export async function actorPatchHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = UpdateActorRequestSchema.parse(body);

    // Get Session Durable Object
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));

    const response = await sessionDO.fetch(
      new Request('http://session/actor/update', {
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
    console.error('Actor patch error:', error);
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

export async function actorMoveHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = MoveActorRequestSchema.parse(body);

    // Get Session Durable Object
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));

    const response = await sessionDO.fetch(
      new Request('http://session/actor/move', {
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
    console.error('Actor move error:', error);
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

export async function actorApplyEffectHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = ApplyEffectRequestSchema.parse(body);

    // Get Session Durable Object
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));

    const response = await sessionDO.fetch(
      new Request('http://session/actor/applyEffect', {
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
    console.error('Actor apply effect error:', error);
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

export async function actorSpendBennyHandler(c: any) {
  try {
    const body = await c.req.json();
    const { sessionId, actorId, purpose } = body;

    if (!sessionId || !actorId) {
      return c.json(
        {
          success: false,
          error: 'sessionId and actorId required',
        },
        400,
      );
    }

    // Get Session Durable Object
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));

    // Get current actor data
    const getResponse = await sessionDO.fetch(
      new Request(
        `http://session/actor/get?sessionId=${sessionId}&actorId=${actorId}`,
        {
          method: 'GET',
        },
      ),
    );
    const getResult = await getResponse.json();

    if (!getResult.success) {
      return c.json(
        {
          success: false,
          error: 'Actor not found',
        },
        404,
      );
    }

    const actor = getResult.data;

    if (actor.resources.bennies <= 0) {
      return c.json(
        {
          success: false,
          error: 'No Bennies available',
        },
        400,
      );
    }

    // Spend Benny
    const updateResponse = await sessionDO.fetch(
      new Request('http://session/actor/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          actorId,
          patch: {
            resources: {
              ...actor.resources,
              bennies: actor.resources.bennies - 1,
            },
          },
        }),
      }),
    );

    const updateResult = await updateResponse.json();

    if (!updateResult.success) {
      return c.json(
        {
          success: false,
          error: updateResult.error,
        },
        500,
      );
    }

    return c.json({
      success: true,
      data: {
        benniesSpent: 1,
        remainingBennies: actor.resources.bennies - 1,
        purpose,
        explanation: `Spent 1 Benny for ${purpose}`,
      },
      serverTs: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Actor spend benny error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function actorMaintainConvictionHandler(c: any) {
  try {
    const body = await c.req.json();
    const { sessionId, actorId, benniesSpent = 1 } = body;

    if (!sessionId || !actorId) {
      return c.json(
        {
          success: false,
          error: 'sessionId and actorId required',
        },
        400,
      );
    }

    // Get Session Durable Object
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));

    // Get current actor data
    const getResponse = await sessionDO.fetch(
      new Request(
        `http://session/actor/get?sessionId=${sessionId}&actorId=${actorId}`,
        {
          method: 'GET',
        },
      ),
    );
    const getResult = await getResponse.json();

    if (!getResult.success) {
      return c.json(
        {
          success: false,
          error: 'Actor not found',
        },
        404,
      );
    }

    const actor = getResult.data;

    if (actor.resources.bennies < benniesSpent) {
      return c.json(
        {
          success: false,
          error: 'Not enough Bennies',
        },
        400,
      );
    }

    if (actor.resources.conviction <= 0) {
      return c.json(
        {
          success: false,
          error: 'No Conviction to maintain',
        },
        400,
      );
    }

    // Maintain Conviction by spending Bennies
    const updateResponse = await sessionDO.fetch(
      new Request('http://session/actor/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          actorId,
          patch: {
            resources: {
              ...actor.resources,
              bennies: actor.resources.bennies - benniesSpent,
              conviction: actor.resources.conviction, // Keep current conviction
            },
          },
        }),
      }),
    );

    const updateResult = await updateResponse.json();

    if (!updateResult.success) {
      return c.json(
        {
          success: false,
          error: updateResult.error,
        },
        500,
      );
    }

    return c.json({
      success: true,
      data: {
        convictionMaintained: true,
        benniesSpent,
        remainingBennies: actor.resources.bennies - benniesSpent,
        currentConviction: actor.resources.conviction,
        explanation: `Maintained Conviction by spending ${benniesSpent} Benny(ies)`,
      },
      serverTs: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Actor maintain conviction error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function actorRollTraitHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = RollTraitRequestSchema.parse(body);

    // Get Session Durable Object
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));

    const response = await sessionDO.fetch(
      new Request('http://session/actor/rollTrait', {
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
    console.error('Actor roll trait error:', error);
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

export async function actorsListHandler(c: any) {
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
      new Request(`http://session/actors?sessionId=${sessionId}`, {
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
    console.error('Actors list error:', error);
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
