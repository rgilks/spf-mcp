import type { Env } from '../../index';
import { ZodError } from 'zod';

export async function supportTestHandler(c: any) {
  try {
    const body = await c.req.json();
    const { sessionId, supporterId, supportedId, skill, difficulty = 4 } = body;

    if (!sessionId || !supporterId || !supportedId || !skill) {
      return c.json(
        {
          success: false,
          error: 'sessionId, supporterId, supportedId, and skill required',
        },
        400,
      );
    }

    // Get supporter data
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));
    const actorResponse = await sessionDO.fetch(
      new Request(
        `http://session/actor/get?sessionId=${sessionId}&actorId=${supporterId}`,
        {
          method: 'GET',
        },
      ),
    );
    const actorResult = await actorResponse.json();

    if (!actorResult.success) {
      return c.json(
        {
          success: false,
          error: 'Supporter not found',
        },
        404,
      );
    }

    const supporter = actorResult.data;

    // Find the skill die
    const skillData = supporter.skills.find(
      (s: any) => s.name.toLowerCase() === skill.toLowerCase(),
    );
    if (!skillData) {
      return c.json(
        {
          success: false,
          error: `Supporter does not have ${skill} skill`,
        },
        400,
      );
    }

    // Roll for support test
    const rngDO = c.env.RngDO.get(c.env.RngDO.idFromName(`rng-${sessionId}`));

    const rollResponse = await rngDO.fetch(
      new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: `${skillData.die}+1d6`, // Skill + Wild Die
          explode: true,
          wildDie: 'd6',
        }),
      }),
    );

    const rollResult = await rollResponse.json();
    const total = rollResult.data.total;
    const success = total >= difficulty;
    const raises = Math.max(0, Math.floor((total - difficulty) / 4));

    return c.json({
      success: true,
      data: {
        roll: {
          dice: rollResult.data.results.flat(),
          total,
          targetNumber: difficulty,
          success,
          raises,
        },
        supportBonus: success ? 1 + raises : 0, // +1 for success, +1 per raise
        explanation: success
          ? `Support test succeeded! +${1 + raises} bonus to supported actor`
          : 'Support test failed. No bonus.',
      },
      serverTs: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Support test error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function testOfWillHandler(c: any) {
  try {
    const body = await c.req.json();
    const { sessionId, actorId, difficulty = 4, opposedBy } = body;

    if (!sessionId || !actorId) {
      return c.json(
        {
          success: false,
          error: 'sessionId and actorId required',
        },
        400,
      );
    }

    // Get actor data
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));
    const actorResponse = await sessionDO.fetch(
      new Request(
        `http://session/actor/get?sessionId=${sessionId}&actorId=${actorId}`,
        {
          method: 'GET',
        },
      ),
    );
    const actorResult = await actorResponse.json();

    if (!actorResult.success) {
      return c.json(
        {
          success: false,
          error: 'Actor not found',
        },
        404,
      );
    }

    const actor = actorResult.data;

    // Roll for actor
    const rngDO = c.env.RngDO.get(c.env.RngDO.idFromName(`rng-${sessionId}`));

    const spiritDie = actor.traits.Spirit || 'd6';
    const actorRollResponse = await rngDO.fetch(
      new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: `${spiritDie}+1d6`, // Spirit + Wild Die
          explode: true,
          wildDie: 'd6',
        }),
      }),
    );

    const actorRollResult = await actorRollResponse.json();
    const actorTotal = actorRollResult.data.total;
    const actorSuccess = actorTotal >= difficulty;
    const actorRaises = Math.max(0, Math.floor((actorTotal - difficulty) / 4));

    let opponentTotal = 0;
    let opponentSuccess = false;
    let opponentRaises = 0;
    let opponentRollResult: any = null;

    // If opposed, roll for opponent
    if (opposedBy) {
      const opponentResponse = await sessionDO.fetch(
        new Request(
          `http://session/actor/get?sessionId=${sessionId}&actorId=${opposedBy}`,
          {
            method: 'GET',
          },
        ),
      );
      const opponentResult = await opponentResponse.json();

      if (opponentResult.success) {
        const opponent = opponentResult.data;
        const opponentSpiritDie = opponent.traits.Spirit || 'd6';

        const opponentRollResponse = await rngDO.fetch(
          new Request('http://rng/roll', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              formula: `${opponentSpiritDie}+1d6`, // Spirit + Wild Die
              explode: true,
              wildDie: 'd6',
            }),
          }),
        );

        opponentRollResult = await opponentRollResponse.json();
        opponentTotal = opponentRollResult.data.total;
        opponentSuccess = opponentTotal >= difficulty;
        opponentRaises = Math.max(
          0,
          Math.floor((opponentTotal - difficulty) / 4),
        );
      }
    }

    const result = opposedBy
      ? actorTotal > opponentTotal
        ? 'success'
        : actorTotal < opponentTotal
          ? 'failure'
          : 'tie'
      : actorSuccess
        ? 'success'
        : 'failure';

    return c.json({
      success: true,
      data: {
        actorRoll: {
          dice: actorRollResult.data.results.flat(),
          total: actorTotal,
          targetNumber: difficulty,
          success: actorSuccess,
          raises: actorRaises,
        },
        opponentRoll: opposedBy
          ? {
              dice: opponentRollResult?.data?.results?.flat() || [],
              total: opponentTotal,
              targetNumber: difficulty,
              success: opponentSuccess,
              raises: opponentRaises,
            }
          : undefined,
        result,
        explanation: opposedBy
          ? `Test of Will: ${result === 'success' ? 'Actor wins opposed roll' : result === 'failure' ? 'Opponent wins opposed roll' : 'Tie'}`
          : `Test of Will: ${result === 'success' ? 'Succeeded' : 'Failed'}`,
      },
      serverTs: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Test of Will error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function commonEdgesHandler(c: any) {
  try {
    const body = await c.req.json();
    const { sessionId, actorId, edge, context = 'general' } = body;

    if (!sessionId || !actorId || !edge) {
      return c.json(
        {
          success: false,
          error: 'sessionId, actorId, and edge required',
        },
        400,
      );
    }

    // Get actor data
    const sessionDO = c.env.SessionDO.get(c.env.SessionDO.idFromName('global'));
    const actorResponse = await sessionDO.fetch(
      new Request(
        `http://session/actor/get?sessionId=${sessionId}&actorId=${actorId}`,
        {
          method: 'GET',
        },
      ),
    );
    const actorResult = await actorResponse.json();

    if (!actorResult.success) {
      return c.json(
        {
          success: false,
          error: 'Actor not found',
        },
        404,
      );
    }

    const actor = actorResult.data;

    // Check if actor has the edge
    if (!actor.edges || !actor.edges.includes(edge)) {
      return c.json(
        {
          success: false,
          error: 'Actor does not have this edge',
        },
        400,
      );
    }

    // Apply edge effects based on context
    const edgeEffects = getEdgeEffect(edge, context);

    if (!edgeEffects) {
      return c.json(
        {
          success: false,
          error: 'Unknown edge or no effect for this context',
        },
        400,
      );
    }

    return c.json({
      success: true,
      data: {
        edge,
        ...edgeEffects,
      },
      serverTs: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Common edges error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

// Helper function to get edge effects
function getEdgeEffect(edge: string, context: string): any {
  const edgeMap: Record<string, Record<string, any>> = {
    'Level Headed': {
      initiative: {
        effect: 'extra_initiative_draw',
        extraDraws: 1,
        explanation:
          'Level Headed: Draw an extra initiative card and keep the best.',
      },
    },
    'Improved Level Headed': {
      initiative: {
        effect: 'extra_initiative_draw',
        extraDraws: 2,
        explanation:
          'Improved Level Headed: Draw two extra initiative cards and keep the best.',
      },
    },
    Quick: {
      initiative: {
        effect: 'extra_initiative_draw',
        extraDraws: 1,
        explanation: 'Quick: Draw an extra initiative card and keep the best.',
      },
    },
    'Improved Quick': {
      initiative: {
        effect: 'extra_initiative_draw',
        extraDraws: 2,
        explanation:
          'Improved Quick: Draw two extra initiative cards and keep the best.',
      },
    },
    Alertness: {
      general: {
        effect: 'notice_bonus',
        bonus: 2,
        explanation: 'Alertness: +2 to Notice rolls.',
      },
    },
    'Combat Reflexes': {
      combat: {
        effect: 'unshake_bonus',
        bonus: 1,
        explanation: 'Combat Reflexes: +1 to unshake rolls.',
      },
    },
    Dodge: {
      combat: {
        effect: 'parry_bonus',
        bonus: 1,
        explanation: 'Dodge: +1 to Parry.',
      },
    },
    'Improved Dodge': {
      combat: {
        effect: 'parry_bonus',
        bonus: 2,
        explanation: 'Improved Dodge: +2 to Parry.',
      },
    },
    Toughness: {
      general: {
        effect: 'toughness_bonus',
        bonus: 1,
        explanation: 'Toughness: +1 to Toughness.',
      },
    },
    'Improved Toughness': {
      general: {
        effect: 'toughness_bonus',
        bonus: 2,
        explanation: 'Improved Toughness: +2 to Toughness.',
      },
    },
  };

  return edgeMap[edge]?.[context] || null;
}
