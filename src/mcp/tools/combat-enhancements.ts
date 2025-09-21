import {
  SetMultiActionRequestSchema,
  CreateExtrasGroupRequestSchema,
  MultiActionPenaltySchema,
  ExtrasGroupSchema,
} from '../../schemas';
import type { Env } from '../../index';
import { ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export async function combatSetMultiActionHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = SetMultiActionRequestSchema.parse(body);

    // Get Combat Durable Object for this session
    const combatDO = c.env.CombatDO.get(
      c.env.CombatDO.idFromName(`combat-${input.sessionId}`),
    );

    const response = await combatDO.fetch(
      new Request('http://combat/setMultiAction', {
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

    // Auto-generate journal entry for multi-action
    await autoGenerateJournalEntry(c.env, {
      sessionId: input.sessionId,
      actorId: input.actorId,
      entryType: 'combat',
      title: `Multi-Action: ${input.actions} action(s)`,
      content: `${input.description}. Penalty: -${(input.actions - 1) * 2} to all trait rolls.`,
      location: 'Combat',
      tags: ['multi-action', 'penalty'],
      metadata: {
        actions: input.actions,
        penalty: (input.actions - 1) * 2,
        description: input.description,
      },
    });

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Combat set multi-action error:', error);
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

export async function combatCreateExtrasGroupHandler(c: any) {
  try {
    const body = await c.req.json();
    const input = CreateExtrasGroupRequestSchema.parse(body);

    // Get Combat Durable Object for this session
    const combatDO = c.env.CombatDO.get(
      c.env.CombatDO.idFromName(`combat-${input.sessionId}`),
    );

    const response = await combatDO.fetch(
      new Request('http://combat/createExtrasGroup', {
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

    // Auto-generate journal entry for extras grouping
    await autoGenerateJournalEntry(c.env, {
      sessionId: input.sessionId,
      entryType: 'combat',
      title: `Extras Group Created: ${input.groupName}`,
      content: `Created group "${input.groupName}" with ${input.actorIds.length} actors. ${input.sharedCard ? 'Will share initiative card.' : 'Will get individual cards.'}`,
      location: 'Combat',
      tags: ['extras', 'grouping', 'initiative'],
      metadata: {
        groupName: input.groupName,
        actorCount: input.actorIds.length,
        sharedCard: input.sharedCard,
        actorIds: input.actorIds,
      },
    });

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Combat create extras group error:', error);
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

export async function combatClearMultiActionHandler(c: any) {
  try {
    const body = await c.req.json();
    const { sessionId, actorId } = body;

    if (!sessionId || !actorId) {
      return c.json(
        {
          success: false,
          error: 'sessionId and actorId required',
        },
        400,
      );
    }

    // Get Combat Durable Object for this session
    const combatDO = c.env.CombatDO.get(
      c.env.CombatDO.idFromName(`combat-${sessionId}`),
    );

    const response = await combatDO.fetch(
      new Request('http://combat/clearMultiAction', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId, actorId }),
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

    // Auto-generate journal entry for clearing multi-action
    await autoGenerateJournalEntry(c.env, {
      sessionId,
      actorId,
      entryType: 'combat',
      title: 'Multi-Action Cleared',
      content: 'Actor returned to single action per turn.',
      location: 'Combat',
      tags: ['multi-action', 'clear'],
      metadata: { action: 'clear_multi_action' },
    });

    return c.json({
      success: true,
      data: result.data,
      serverTs: result.serverTs,
    });
  } catch (error) {
    console.error('Combat clear multi-action error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

export async function combatGetStateHandler(c: any) {
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
    console.error('Combat get state error:', error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
}

// Helper function to auto-generate journal entries
async function autoGenerateJournalEntry(
  env: Env,
  entryData: {
    sessionId: string;
    actorId?: string;
    entryType: 'combat' | 'exploration' | 'social' | 'downtime' | 'narrative';
    title: string;
    content: string;
    location?: string;
    tags?: string[];
    metadata?: any;
  },
) {
  const entryId = uuidv4();
  const now = new Date().toISOString();

  const journalEntry = {
    id: entryId,
    sessionId: entryData.sessionId,
    entryType: entryData.entryType,
    title: entryData.title,
    content: entryData.content,
    timestamp: now,
    actorId: entryData.actorId,
    location: entryData.location,
    tags: entryData.tags || [],
    metadata: entryData.metadata || {},
  };

  // Store in database
  await env.DB.prepare(
    `
    INSERT INTO journal_entries (id, sessionId, entryType, title, content, timestamp, actorId, location, tags, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  )
    .bind(
      journalEntry.id,
      journalEntry.sessionId,
      journalEntry.entryType,
      journalEntry.title,
      journalEntry.content,
      journalEntry.timestamp,
      journalEntry.actorId,
      journalEntry.location,
      JSON.stringify(journalEntry.tags),
      JSON.stringify(journalEntry.metadata),
    )
    .run();

  // Log the auto-generated journal entry
  await logAction(env, {
    sessionId: entryData.sessionId,
    actorId: entryData.actorId,
    kind: 'journal',
    payload: {
      action: 'auto_generate_entry',
      entryId,
      entryType: entryData.entryType,
    },
    by: 'system',
    autoGenerated: true,
  });
}

// Helper function to log actions
async function logAction(
  env: Env,
  logData: {
    sessionId: string;
    actorId?: string;
    kind: string;
    payload: any;
    by: string;
    autoGenerated?: boolean;
  },
) {
  const logId = uuidv4();
  const logEntry = {
    id: logId,
    sessionId: logData.sessionId,
    actorId: logData.actorId || null,
    ts: new Date().toISOString(),
    kind: logData.kind,
    payload: logData.payload,
    by: logData.by,
    seed: null,
    hash: null,
    journalEntryId: null,
    autoGenerated: logData.autoGenerated || false,
  };

  await env.DB.prepare(
    `
    INSERT INTO action_logs (id, sessionId, actorId, ts, kind, payload, by, seed, hash, journalEntryId, autoGenerated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  )
    .bind(
      logEntry.id,
      logEntry.sessionId,
      logEntry.actorId,
      logEntry.ts,
      logEntry.kind,
      JSON.stringify(logEntry.payload),
      logEntry.by,
      logEntry.seed,
      logEntry.hash,
      logEntry.journalEntryId,
      logEntry.autoGenerated ? 1 : 0,
    )
    .run();
}
