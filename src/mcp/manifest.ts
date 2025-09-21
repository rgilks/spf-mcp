import type { Env } from '../index';

export const handleMcpManifest = (c: any) => {
  const body = {
    name: c.env.MCP_SERVER_NAME || 'spf-mcp',
    version: '0.1.0',
    protocol: 'mcp-1',
    tools: [
      // Session management
      {
        name: 'session.create',
        description: 'Create a new game session with grid configuration.',
        input_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            grid: {
              type: 'object',
              properties: {
                unit: { type: 'string', enum: ['inch', 'meter', 'square'] },
                scale: { type: 'number' },
                cols: { type: 'number' },
                rows: { type: 'number' },
              },
              required: ['unit', 'scale', 'cols', 'rows'],
            },
            illumination: {
              type: 'string',
              enum: ['bright', 'dim', 'dark'],
              default: 'bright',
            },
            gmRole: {
              type: 'string',
              enum: ['gpt5', 'human', 'hybrid'],
              default: 'gpt5',
            },
          },
          required: ['name', 'grid'],
        },
      },
      {
        name: 'session.load',
        description: 'Load an existing game session.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'session.update',
        description: 'Update session properties.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            patch: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                status: {
                  type: 'string',
                  enum: ['lobby', 'in_progress', 'paused', 'ended'],
                },
                round: { type: 'number' },
                turn: { type: 'number' },
                activeActorId: { type: 'string' },
                illumination: {
                  type: 'string',
                  enum: ['bright', 'dim', 'dark'],
                },
              },
            },
          },
          required: ['sessionId', 'patch'],
        },
      },
      {
        name: 'session.end',
        description: 'End a game session.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            reason: { type: 'string' },
          },
          required: ['sessionId'],
        },
      },
      // Actor management
      {
        name: 'actor.upsert',
        description: 'Create or update an actor (PC, NPC, or creature).',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            actor: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['pc', 'npc', 'creature'] },
                name: { type: 'string' },
                wildCard: { type: 'boolean' },
                traits: { type: 'object' },
                skills: { type: 'array' },
                edges: { type: 'array' },
                hindrances: { type: 'array' },
                powers: { type: 'array' },
                resources: { type: 'object' },
                status: { type: 'object' },
                defense: { type: 'object' },
                gear: { type: 'array' },
                position: { type: 'object' },
                reach: { type: 'number' },
                size: { type: 'number' },
              },
              required: [
                'type',
                'name',
                'wildCard',
                'traits',
                'skills',
                'resources',
                'status',
                'defense',
              ],
            },
          },
          required: ['sessionId', 'actor'],
        },
      },
      {
        name: 'actor.patch',
        description: 'Update specific properties of an actor.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            actorId: { type: 'string' },
            patch: { type: 'object' },
          },
          required: ['sessionId', 'actorId', 'patch'],
        },
      },
      {
        name: 'actor.move',
        description: 'Move an actor to a new position on the battlemap.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            actorId: { type: 'string' },
            to: {
              type: 'object',
              properties: {
                x: { type: 'number' },
                y: { type: 'number' },
                facing: { type: 'number' },
              },
              required: ['x', 'y', 'facing'],
            },
            reason: { type: 'string' },
          },
          required: ['sessionId', 'actorId', 'to', 'reason'],
        },
      },
      {
        name: 'actor.applyEffect',
        description:
          'Apply damage, healing, conditions, or resource changes to an actor.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            actorId: { type: 'string' },
            effect: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['damage', 'healing', 'condition', 'resource'],
                },
                payload: { type: 'object' },
              },
              required: ['type', 'payload'],
            },
          },
          required: ['sessionId', 'actorId', 'effect'],
        },
      },
      {
        name: 'actor.rollTrait',
        description: 'Roll a trait die for an actor with optional modifiers.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            actorId: { type: 'string' },
            trait: { type: 'string' },
            mods: { type: 'array', items: { type: 'number' }, default: [] },
            rollMode: {
              type: 'string',
              enum: ['open', 'secret'],
              default: 'open',
            },
          },
          required: ['sessionId', 'actorId', 'trait'],
        },
      },
      // Combat management
      {
        name: 'combat.start',
        description: 'Start combat with a list of participants.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            participants: { type: 'array', items: { type: 'string' } },
            options: { type: 'object' },
          },
          required: ['sessionId', 'participants'],
        },
      },
      {
        name: 'combat.deal',
        description: 'Deal initiative cards to combat participants.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            extraDraws: { type: 'object' },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'combat.hold',
        description: 'Put the active actor on hold to interrupt later.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            actorId: { type: 'string' },
          },
          required: ['sessionId', 'actorId'],
        },
      },
      {
        name: 'combat.interrupt',
        description: 'Interrupt with an actor who is on hold.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            actorId: { type: 'string' },
            targetActorId: { type: 'string' },
          },
          required: ['sessionId', 'actorId', 'targetActorId'],
        },
      },
      {
        name: 'combat.advanceTurn',
        description: 'Advance to the next turn in combat.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
          required: ['sessionId'],
        },
      },
      {
        name: 'combat.endRound',
        description: 'End the current round and prepare for the next.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
          required: ['sessionId'],
        },
      },
      // Dice rolling
      {
        name: 'dice.roll',
        description: 'Roll virtual dice with exploding and optional wild die.',
        input_schema: {
          type: 'object',
          properties: {
            formula: { type: 'string' },
            explode: { type: 'boolean', default: true },
            wildDie: { type: ['string', 'null'], default: null },
            seed: { type: ['string', 'null'] },
          },
          required: ['formula'],
        },
      },
    ],
    resources: [
      { name: 'session.get', href: '/mcp/session/{id}' },
      { name: 'actors.list', href: '/mcp/session/{id}/actors' },
      { name: 'combat.state', href: '/mcp/combat/{id}/state' },
    ],
  };
  return c.json(body);
};
