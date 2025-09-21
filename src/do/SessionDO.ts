import {
  Session,
  Actor,
  CreateSessionRequestSchema,
  UpdateSessionRequestSchema,
  CreateActorRequestSchema,
  MoveActorRequestSchema,
  ApplyEffectRequestSchema,
  RollTraitRequestSchema,
} from '../schemas';
import { v4 as uuidv4 } from 'uuid';
import type { Env } from '../index';

export class SessionDO {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Actor routes must come first (more specific)
      if (request.method === 'POST' && path.endsWith('/actor/create')) {
        return await this.handleCreateActor(request);
      } else if (request.method === 'POST' && path.endsWith('/actor/update')) {
        return await this.handleUpdate(request);
      } else if (request.method === 'POST' && path.endsWith('/actor/move')) {
        return await this.handleMoveActor(request);
      } else if (
        request.method === 'POST' &&
        path.endsWith('/actor/applyEffect')
      ) {
        return await this.handleApplyEffect(request);
      } else if (
        request.method === 'POST' &&
        path.endsWith('/actor/rollTrait')
      ) {
        return await this.handleRollTrait(request);
      } else if (request.method === 'GET' && path.endsWith('/actors')) {
        return await this.handleGetActors(request);
      } else if (request.method === 'POST' && path.endsWith('/create')) {
        return await this.handleCreate(request);
      } else if (request.method === 'GET' && path.endsWith('/get')) {
        return await this.handleGet(request);
      } else if (request.method === 'POST' && path.endsWith('/update')) {
        return await this.handleUpdate(request);
      } else if (request.method === 'POST' && path.endsWith('/end')) {
        return await this.handleEnd(request);
      } else {
        return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('SessionDO error:', error);
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

  private async handleCreate(request: Request): Promise<Response> {
    const body = await request.json();
    const input = CreateSessionRequestSchema.parse(body);

    const sessionId = uuidv4();
    const now = new Date().toISOString();

    // Create RNG and Deck DOs for this session
    const rngId = uuidv4();
    const deckId = uuidv4();

    const session: Session = {
      id: sessionId,
      name: input.name,
      status: 'lobby',
      rulesetVersion: '1.0.0',
      initiativeDeckId: deckId,
      rngId: rngId,
      round: 0,
      turn: 0,
      activeActorId: undefined,
      gridUnit: input.grid.unit,
      gridScale: input.grid.scale,
      cols: input.grid.cols,
      rows: input.grid.rows,
      illumination: input.illumination,
      createdAt: now,
      updatedAt: now,
    };

    // Store in D1 database
    await this.env.DB.prepare(
      `
      INSERT INTO sessions (id, name, status, rulesetVersion, initiativeDeckId, rngId, round, turn, 
                           gridUnit, gridScale, cols, rows, illumination, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
      .bind(
        session.id,
        session.name,
        session.status,
        session.rulesetVersion,
        session.initiativeDeckId,
        session.rngId,
        session.round,
        session.turn,
        session.gridUnit,
        session.gridScale,
        session.cols,
        session.rows,
        session.illumination,
        session.createdAt,
        session.updatedAt,
      )
      .run();

    // Initialize deck
    const deckDO = this.env.DeckDO.get(
      this.env.DeckDO.idFromName(`deck-${sessionId}`),
    );
    await deckDO.fetch(
      new Request('http://deck/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, useJokers: true }),
      }),
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: { sessionId },
        serverTs: now,
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleGet(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'sessionId parameter required',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    const result = await this.env.DB.prepare(
      `
      SELECT * FROM sessions WHERE id = ?
    `,
    )
      .bind(sessionId)
      .first();

    if (!result) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Session not found',
        }),
        { status: 404, headers: { 'content-type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleUpdate(request: Request): Promise<Response> {
    const body = await request.json();
    const input = UpdateSessionRequestSchema.parse(body);

    const now = new Date().toISOString();

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];

    if (input.patch.name !== undefined) {
      updates.push('name = ?');
      values.push(input.patch.name);
    }
    if (input.patch.status !== undefined) {
      updates.push('status = ?');
      values.push(input.patch.status);
    }
    if (input.patch.round !== undefined) {
      updates.push('round = ?');
      values.push(input.patch.round);
    }
    if (input.patch.turn !== undefined) {
      updates.push('turn = ?');
      values.push(input.patch.turn);
    }
    if (input.patch.activeActorId !== undefined) {
      updates.push('activeActorId = ?');
      values.push(input.patch.activeActorId);
    }
    if (input.patch.illumination !== undefined) {
      updates.push('illumination = ?');
      values.push(input.patch.illumination);
    }

    if (updates.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No fields to update',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    updates.push('updatedAt = ?');
    values.push(now);
    values.push(input.sessionId);

    const query = `UPDATE sessions SET ${updates.join(', ')} WHERE id = ?`;
    await this.env.DB.prepare(query)
      .bind(...values)
      .run();

    // Get updated session
    const result = await this.env.DB.prepare(
      `
      SELECT * FROM sessions WHERE id = ?
    `,
    )
      .bind(input.sessionId)
      .first();

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        serverTs: now,
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleEnd(request: Request): Promise<Response> {
    const body = await request.json();
    const { sessionId, reason } = body as {
      sessionId: string;
      reason?: string;
    };

    const now = new Date().toISOString();

    await this.env.DB.prepare(
      `
      UPDATE sessions SET status = 'ended', updatedAt = ? WHERE id = ?
    `,
    )
      .bind(now, sessionId)
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        data: { ended: true, reason },
        serverTs: now,
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleCreateActor(request: Request): Promise<Response> {
    const body = await request.json();
    const input = CreateActorRequestSchema.parse(body);

    const actorId = uuidv4();
    const now = new Date().toISOString();

    const actor: Actor = {
      id: actorId,
      sessionId: input.sessionId,
      type: input.actor.type,
      name: input.actor.name,
      wildCard: input.actor.wildCard,
      traits: input.actor.traits,
      skills: input.actor.skills,
      edges: input.actor.edges,
      hindrances: input.actor.hindrances,
      powers: input.actor.powers,
      resources: input.actor.resources,
      status: input.actor.status,
      defense: input.actor.defense,
      gear: input.actor.gear,
      position: input.actor.position,
      reach: input.actor.reach,
      size: input.actor.size,
    };

    // Store in D1 database
    await this.env.DB.prepare(
      `
      INSERT INTO actors (id, sessionId, type, name, wildCard, traits, skills, edges, hindrances, 
                         powers, resources, status, defense, gear, position, reach, size)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    )
      .bind(
        actor.id,
        actor.sessionId,
        actor.type,
        actor.name,
        actor.wildCard,
        JSON.stringify(actor.traits),
        JSON.stringify(actor.skills),
        JSON.stringify(actor.edges),
        JSON.stringify(actor.hindrances),
        JSON.stringify(actor.powers),
        JSON.stringify(actor.resources),
        JSON.stringify(actor.status),
        JSON.stringify(actor.defense),
        JSON.stringify(actor.gear),
        JSON.stringify(actor.position),
        actor.reach,
        actor.size,
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        data: actor,
        serverTs: now,
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleGetActors(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'sessionId parameter required',
        }),
        { status: 400, headers: { 'content-type': 'application/json' } },
      );
    }

    const result = await this.env.DB.prepare(
      `
      SELECT * FROM actors WHERE sessionId = ? ORDER BY name
    `,
    )
      .bind(sessionId)
      .all();

    return new Response(
      JSON.stringify({
        success: true,
        data: result.results,
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleMoveActor(request: Request): Promise<Response> {
    const body = await request.json();
    const input = MoveActorRequestSchema.parse(body);

    // Update actor position in database
    await this.env.DB.prepare(
      `
      UPDATE actors SET position = ?, updatedAt = ? WHERE id = ? AND sessionId = ?
      `,
    )
      .bind(
        JSON.stringify(input.to),
        new Date().toISOString(),
        input.actorId,
        input.sessionId,
      )
      .run();

    return new Response(
      JSON.stringify({
        success: true,
        data: { moved: true, reason: input.reason },
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleApplyEffect(request: Request): Promise<Response> {
    const body = await request.json();
    const input = ApplyEffectRequestSchema.parse(body);

    // For now, just return success - actual effect application would be implemented
    return new Response(
      JSON.stringify({
        success: true,
        data: { effectApplied: true, effect: input.effect },
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }

  private async handleRollTrait(request: Request): Promise<Response> {
    const body = await request.json();
    const input = RollTraitRequestSchema.parse(body);

    // Get RNG DO and roll dice
    const rngDO = this.env.RngDO.get(
      this.env.RngDO.idFromName(`rng-${input.sessionId}`),
    );

    const response = await rngDO.fetch(
      new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: '1d6', // Default trait die - would be determined by trait
          explode: true,
          wildDie: null,
        }),
      }),
    );

    const result = (await response.json()) as {
      success: boolean;
      data?: unknown;
      error?: string;
      serverTs?: string;
    };

    return new Response(
      JSON.stringify({
        success: true,
        data: result.data,
        serverTs: new Date().toISOString(),
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    );
  }
}
