import { DiceRollRequestSchema } from '../../schemas';
import type { Env } from '../../index';

export async function diceRollHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = DiceRollRequestSchema.parse(body);

    // Get sessionId from headers or body
    const sessionId = c.req.header('sessionId') || body.sessionId;
    if (!sessionId) {
      return c.json(
        {
          success: false,
          error: 'sessionId required in header or body',
        },
        400,
      );
    }

    // Get RNG Durable Object for this session
    const rngDO = c.env.RngDO.get(c.env.RngDO.idFromName(`rng-${sessionId}`));

    // Call the RNG DO to roll dice
    const response = await rngDO.fetch(
      new Request('http://rng/roll', {
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
    console.error('Dice roll error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}
