import {
  DiceRoll,
  DiceRollRequestSchema,
  DiceRollResponseSchema,
} from '../schemas';
import { v4 as uuidv4 } from 'uuid';

export class RngDO {
  state: DurableObjectState;
  env: any;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (request.method === 'POST' && path.endsWith('/roll')) {
        return await this.handleRoll(request);
      } else if (request.method === 'POST' && path.endsWith('/verify')) {
        return await this.handleVerify(request);
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('RngDO error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'content-type': 'application/json' },
        },
      );
    }
  }

  private async handleRoll(request: Request): Promise<Response> {
    const body = await request.json();
    const input = DiceRollRequestSchema.parse(body);

    // Generate cryptographically secure seed if not provided
    const seed = input.seed || this.generateSecureSeed();

    // Create deterministic PRNG from seed
    const prng = this.createPRNG(seed);

    // Parse dice formula (e.g., "2d6+1", "1d8!!")
    const parsed = this.parseDiceFormula(input.formula);
    if (!parsed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid dice formula. Use format like "2d6+1" or "1d8!!"',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    const results: number[][] = [];
    const allRolls: number[] = [];

    // Roll main dice
    for (let i = 0; i < parsed.count; i++) {
      const dieRolls = this.rollDie(parsed.sides, input.explode, prng);
      results.push(dieRolls);
      allRolls.push(...dieRolls);
    }

    // Roll wild die if specified
    let wildRolls: number[] | undefined;
    if (input.wildDie) {
      const wildSides = parseInt(input.wildDie.slice(1));
      wildRolls = this.rollDie(wildSides, input.explode, prng);
    }

    // Calculate total
    const mainTotal = allRolls.reduce((sum, roll) => sum + roll, 0);
    const wildTotal = wildRolls
      ? wildRolls.reduce((sum, roll) => sum + roll, 0)
      : 0;
    const total =
      (wildRolls ? Math.max(mainTotal, wildTotal) : mainTotal) +
      parsed.modifier;

    // Create audit hash
    const hash = await this.createHash(
      seed,
      results,
      wildRolls,
      parsed.modifier,
    );

    const response: DiceRoll = {
      formula: input.formula,
      results,
      wild: wildRolls,
      modifier: parsed.modifier,
      total,
      seed,
      hash,
    };

    // Log the roll for audit trail
    await this.logRoll(response);

    return new Response(
      JSON.stringify({
        success: true,
        data: response,
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleVerify(request: Request): Promise<Response> {
    const body = await request.json();
    const { seed, results, wild, modifier, hash } = body as any;

    if (!seed || !results || !hash) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: seed, results, hash',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    // Recreate hash from provided data
    const expectedHash = await this.createHash(
      seed,
      results,
      wild,
      modifier || 0,
    );
    const isValid = expectedHash === hash;

    return new Response(
      JSON.stringify({
        success: true,
        data: { valid: isValid, expectedHash, providedHash: hash },
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private generateSecureSeed(): string {
    // Use crypto.getRandomValues for secure random generation
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    );
  }

  private createPRNG(seed: string): () => number {
    // Convert hex seed to number
    let state = parseInt(seed.slice(0, 8), 16) || 0x9e3779b9;

    return () => {
      // Xorshift32 algorithm for deterministic PRNG
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return (state >>> 0) / 0xffffffff;
    };
  }

  private parseDiceFormula(
    formula: string,
  ): { count: number; sides: number; modifier: number } | null {
    // Support formats like "2d6+1", "1d8!!", "3d4-2"
    const match = formula.match(/^(\d+)d(\d+)(!!)?([+-]\d+)?$/i);
    if (!match) return null;

    const count = parseInt(match[1], 10);
    const sides = parseInt(match[2], 10);
    const modifier = match[4] ? parseInt(match[4], 10) : 0;

    return { count, sides, modifier };
  }

  private rollDie(
    sides: number,
    explode: boolean,
    prng: () => number,
  ): number[] {
    const rolls: number[] = [];
    let roll = 1 + Math.floor(prng() * sides);
    rolls.push(roll);

    if (explode) {
      while (roll === sides) {
        roll = 1 + Math.floor(prng() * sides);
        rolls.push(roll);
      }
    }

    return rolls;
  }

  private async createHash(
    seed: string,
    results: number[][],
    wild: number[] | undefined,
    modifier: number,
  ): Promise<string> {
    const data = {
      seed,
      results,
      wild,
      modifier,
      timestamp: Date.now(),
    };

    const encoder = new TextEncoder();
    const dataStr = JSON.stringify(data);
    const dataBuffer = encoder.encode(dataStr);

    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  private async logRoll(roll: DiceRoll): Promise<void> {
    // Store roll in action log for audit trail
    const logId = uuidv4();
    const logEntry = {
      id: logId,
      sessionId: 'system', // Will be set by caller
      actorId: null,
      ts: new Date().toISOString(),
      kind: 'dice' as const,
      payload: roll,
      by: 'system',
      seed: roll.seed,
      hash: roll.hash,
    };

    // Store in Durable Object storage for audit
    await this.state.storage.put(`roll:${logId}`, logEntry);
  }
}
