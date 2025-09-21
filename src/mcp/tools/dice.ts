import { DiceRollRequestSchema } from '../../schemas';
import { ZodError } from 'zod';
import { SpfMcpError } from '../errors';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export async function diceRollHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = DiceRollRequestSchema.parse(body);

    // Get sessionId from headers or body
    const sessionId = c.req.header('sessionId') || body.sessionId;
    if (!sessionId) {
      throw new SpfMcpError(
        ErrorCode.InvalidParams,
        'sessionId required in header or body',
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
      throw new SpfMcpError(
        ErrorCode.InternalError,
        result.error || 'Dice roll failed',
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Dice roll error:', error);
    if (error instanceof ZodError) {
      throw new SpfMcpError(
        ErrorCode.InvalidParams,
        'Invalid dice roll parameters',
        { issues: error.issues },
      );
    }
    if (error instanceof SpfMcpError) {
      throw error;
    }
    throw new SpfMcpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

export async function diceRollWithConvictionHandler(c: any) {
  try {
    const body = await c.req.json();
    const { formula, explode, wildDie, seed, actorId, conviction } = body;

    if (!actorId) {
      throw new SpfMcpError(
        ErrorCode.InvalidParams,
        'actorId required for conviction rolls',
      );
    }

    // Get sessionId from headers or body
    const sessionId = c.req.header('sessionId') || body.sessionId;
    if (!sessionId) {
      throw new SpfMcpError(
        ErrorCode.InvalidParams,
        'sessionId required in header or body',
      );
    }

    // Get RNG Durable Object for this session
    const rngDO = c.env.RngDO.get(c.env.RngDO.idFromName(`rng-${sessionId}`));

    // Call the RNG DO to roll dice with conviction
    const response = await rngDO.fetch(
      new Request('http://rng/rollWithConviction', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula,
          explode,
          wildDie,
          seed,
          conviction: conviction || 0,
        }),
      }),
    );

    const result = await response.json();

    if (!result.success) {
      throw new SpfMcpError(
        ErrorCode.InternalError,
        result.error || 'Dice roll with conviction failed',
      );
    }

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Dice roll with conviction error:', error);
    if (error instanceof SpfMcpError) {
      throw error;
    }
    throw new SpfMcpError(
      ErrorCode.InternalError,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
