import type { Env } from '../index';
import type { Context } from 'hono';

export const handleMcpManifest = (c: Context<{ Bindings: Env }>) => {
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
      {
        name: 'dice.rollWithConviction',
        description:
          'Roll dice with Conviction bonuses (+d6 per Conviction point).',
        input_schema: {
          type: 'object',
          properties: {
            formula: { type: 'string' },
            explode: { type: 'boolean', default: true },
            wildDie: { type: ['string', 'null'], default: null },
            seed: { type: ['string', 'null'] },
            actorId: { type: 'string' },
            conviction: { type: 'number', default: 0 },
          },
          required: ['formula', 'actorId'],
        },
      },
      // Combat enhancements
      {
        name: 'combat.setMultiAction',
        description:
          'Set multi-action penalties for an actor (-2 per additional action).',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            actorId: { type: 'string' },
            actions: { type: 'number', minimum: 1, maximum: 3 },
            description: { type: 'string' },
          },
          required: ['sessionId', 'actorId', 'actions', 'description'],
        },
      },
      {
        name: 'combat.createExtrasGroup',
        description: 'Create a group of Extras that share initiative cards.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            groupName: { type: 'string' },
            actorIds: { type: 'array', items: { type: 'string' } },
            sharedCard: { type: 'boolean', default: true },
          },
          required: ['sessionId', 'groupName', 'actorIds'],
        },
      },
      {
        name: 'combat.clearMultiAction',
        description: 'Clear multi-action penalties for an actor.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            actorId: { type: 'string' },
          },
          required: ['sessionId', 'actorId'],
        },
      },
      // Journal management
      {
        name: 'journal.addEntry',
        description: 'Add a new journal entry for the session.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            entryType: {
              type: 'string',
              enum: [
                'combat',
                'exploration',
                'social',
                'downtime',
                'narrative',
              ],
            },
            title: { type: 'string' },
            content: { type: 'string' },
            actorId: { type: 'string' },
            location: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            metadata: { type: 'object' },
          },
          required: ['sessionId', 'entryType', 'title', 'content'],
        },
      },
      {
        name: 'journal.addCampaignNote',
        description: 'Add a campaign note (NPCs, locations, plot, etc.).',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            category: {
              type: 'string',
              enum: ['npcs', 'locations', 'plot', 'loot', 'clues'],
            },
            title: { type: 'string' },
            content: { type: 'string' },
            metadata: { type: 'object' },
          },
          required: ['sessionId', 'category', 'title', 'content'],
        },
      },
      {
        name: 'journal.search',
        description: 'Search across journal entries and campaign notes.',
        input_schema: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
            query: { type: 'string' },
            entryType: {
              type: 'string',
              enum: [
                'combat',
                'exploration',
                'social',
                'downtime',
                'narrative',
              ],
            },
            category: {
              type: 'string',
              enum: ['npcs', 'locations', 'plot', 'loot', 'clues'],
            },
            actorId: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            startDate: { type: 'string' },
            endDate: { type: 'string' },
          },
          required: ['sessionId'],
        },
      },
    ],
    resources: [
      { name: 'session.get', href: '/mcp/session/{id}' },
      { name: 'actors.list', href: '/mcp/session/{id}/actors' },
      { name: 'combat.state', href: '/mcp/combat/{id}/state' },
      { name: 'journal.entries', href: '/mcp/journal/{id}/entries' },
      {
        name: 'journal.campaignNotes',
        href: '/mcp/journal/{id}/campaignNotes',
      },
      { name: 'journal.export', href: '/mcp/journal/{id}/export' },
    ],
  };
  return c.json(body);
};
