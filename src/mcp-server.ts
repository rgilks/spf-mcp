import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  Tool,
  Resource,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Import our existing tool handlers
import {
  diceRollHandler,
  diceRollWithConvictionHandler,
} from './mcp/tools/dice';
import {
  sessionCreateHandler,
  sessionLoadHandler,
  sessionUpdateHandler,
  sessionEndHandler,
} from './mcp/tools/session';
import {
  actorUpsertHandler,
  actorPatchHandler,
  actorMoveHandler,
  actorApplyEffectHandler,
  actorRollTraitHandler,
  actorSpendBennyHandler,
  actorMaintainConvictionHandler,
} from './mcp/tools/actor';
import {
  combatStartHandler,
  combatDealHandler,
  combatHoldHandler,
  combatInterruptHandler,
  combatAdvanceTurnHandler,
  combatEndRoundHandler,
} from './mcp/tools/combat';
import {
  combatSetMultiActionHandler,
  combatCreateExtrasGroupHandler,
  combatClearMultiActionHandler,
} from './mcp/tools/combat-enhancements';
import {
  applyDamageHandler,
  soakRollHandler,
  castPowerHandler,
  templateAreaHandler,
} from './mcp/tools/rules';
import {
  supportTestHandler,
  testOfWillHandler,
  commonEdgesHandler,
} from './mcp/tools/support';
import {
  journalAddEntryHandler,
  journalAddCampaignNoteHandler,
  journalSearchHandler,
} from './mcp/tools/journal';

// MCP Tool Definitions
const tools: Tool[] = [
  // Session management
  {
    name: 'session_create',
    description: 'Create a new game session with grid configuration.',
    inputSchema: {
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
    name: 'session_load',
    description: 'Load an existing game session.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'session_update',
    description: 'Update session properties.',
    inputSchema: {
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
    name: 'session_end',
    description: 'End a game session.',
    inputSchema: {
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
    name: 'actor_upsert',
    description: 'Create or update an actor (PC, NPC, or creature).',
    inputSchema: {
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
    name: 'actor_patch',
    description: 'Update specific properties of an actor.',
    inputSchema: {
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
    name: 'actor_move',
    description: 'Move an actor to a new position on the battlemap.',
    inputSchema: {
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
    name: 'actor_apply_effect',
    description:
      'Apply damage, healing, conditions, or resource changes to an actor.',
    inputSchema: {
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
    name: 'actor_roll_trait',
    description: 'Roll a trait die for an actor with optional modifiers.',
    inputSchema: {
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
  {
    name: 'actor_spend_benny',
    description: 'Spend a Benny for various purposes.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        actorId: { type: 'string' },
        purpose: { type: 'string' },
      },
      required: ['sessionId', 'actorId', 'purpose'],
    },
  },
  {
    name: 'actor_maintain_conviction',
    description: 'Maintain conviction with PP cost.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        actorId: { type: 'string' },
        ppCost: { type: 'number' },
      },
      required: ['sessionId', 'actorId', 'ppCost'],
    },
  },
  // Combat management
  {
    name: 'combat_start',
    description: 'Start combat with a list of participants.',
    inputSchema: {
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
    name: 'combat_deal',
    description: 'Deal initiative cards to combat participants.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        extraDraws: { type: 'object' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'combat_hold',
    description: 'Put the active actor on hold to interrupt later.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        actorId: { type: 'string' },
      },
      required: ['sessionId', 'actorId'],
    },
  },
  {
    name: 'combat_interrupt',
    description: 'Interrupt with an actor who is on hold.',
    inputSchema: {
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
    name: 'combat_advance_turn',
    description: 'Advance to the next turn in combat.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'combat_end_round',
    description: 'End the current round and prepare for the next.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
      },
      required: ['sessionId'],
    },
  },
  // Dice rolling
  {
    name: 'dice_roll',
    description: 'Roll virtual dice with exploding and optional wild die.',
    inputSchema: {
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
    name: 'dice_roll_with_conviction',
    description:
      'Roll dice with Conviction bonuses (+d6 per Conviction point).',
    inputSchema: {
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
    name: 'combat_set_multi_action',
    description:
      'Set multi-action penalties for an actor (-2 per additional action).',
    inputSchema: {
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
    name: 'combat_create_extras_group',
    description: 'Create a group of Extras that share initiative cards.',
    inputSchema: {
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
    name: 'combat_clear_multi_action',
    description: 'Clear multi-action penalties for an actor.',
    inputSchema: {
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
    name: 'journal_add_entry',
    description: 'Add a new journal entry for the session.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        entryType: {
          type: 'string',
          enum: ['combat', 'exploration', 'social', 'downtime', 'narrative'],
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
    name: 'journal_add_campaign_note',
    description: 'Add a campaign note (NPCs, locations, plot, etc.).',
    inputSchema: {
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
    name: 'journal_search',
    description: 'Search across journal entries and campaign notes.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        query: { type: 'string' },
        entryType: {
          type: 'string',
          enum: ['combat', 'exploration', 'social', 'downtime', 'narrative'],
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
  // Rules engine
  {
    name: 'rules_apply_damage',
    description: 'Calculate and apply damage with wound/shaken status.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        attackerId: { type: 'string' },
        defenderId: { type: 'string' },
        damageRoll: { type: 'number' },
        ap: { type: 'number', default: 0 },
        damageType: { type: 'string' },
      },
      required: ['sessionId', 'attackerId', 'defenderId', 'damageRoll'],
    },
  },
  {
    name: 'rules_soak_roll',
    description: 'Spend Benny to reduce damage.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        actorId: { type: 'string' },
        damageAmount: { type: 'number' },
        benniesSpent: { type: 'number', minimum: 1 },
      },
      required: ['sessionId', 'actorId', 'damageAmount', 'benniesSpent'],
    },
  },
  {
    name: 'rules_cast_power',
    description: 'Cast powers with PP costs and shorting penalties.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        casterId: { type: 'string' },
        power: { type: 'string' },
        ppCost: { type: 'number' },
        shorting: { type: 'number', default: 0 },
        modifiers: { type: 'array', items: { type: 'number' }, default: [] },
        targets: { type: 'array', items: { type: 'string' }, default: [] },
      },
      required: ['sessionId', 'casterId', 'power', 'ppCost'],
    },
  },
  {
    name: 'rules_template_area',
    description: 'Calculate area template coverage.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        origin: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
            facing: { type: 'number' },
          },
          required: ['x', 'y', 'facing'],
        },
        template: {
          type: 'string',
          enum: ['SBT', 'MBT', 'LBT', 'Cone', 'Stream'],
        },
        angle: { type: 'number' },
        reach: { type: 'number' },
        grid: { type: 'string', enum: ['square', 'hex'], default: 'square' },
        snap: { type: 'boolean', default: true },
      },
      required: ['sessionId', 'origin', 'template', 'reach'],
    },
  },
  // Support tools
  {
    name: 'support_test',
    description: 'Help another character with skill test.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        helperId: { type: 'string' },
        targetId: { type: 'string' },
        skill: { type: 'string' },
        modifier: { type: 'number', default: 0 },
      },
      required: ['sessionId', 'helperId', 'targetId', 'skill'],
    },
  },
  {
    name: 'support_test_of_will',
    description: 'Test of Will against fear, intimidation.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        actorId: { type: 'string' },
        difficulty: { type: 'number' },
        modifier: { type: 'number', default: 0 },
      },
      required: ['sessionId', 'actorId', 'difficulty'],
    },
  },
  {
    name: 'support_common_edges',
    description: 'Apply common edge effects.',
    inputSchema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        actorId: { type: 'string' },
        edge: { type: 'string' },
        context: { type: 'string' },
      },
      required: ['sessionId', 'actorId', 'edge', 'context'],
    },
  },
];

// MCP Resource Definitions
const resources: Resource[] = [
  {
    uri: 'session://{sessionId}',
    name: 'Game Session',
    description: 'Access to a specific game session data',
    mimeType: 'application/json',
  },
  {
    uri: 'actors://{sessionId}',
    name: 'Session Actors',
    description: 'List of all actors in a session',
    mimeType: 'application/json',
  },
  {
    uri: 'combat://{sessionId}',
    name: 'Combat State',
    description: 'Current combat state for a session',
    mimeType: 'application/json',
  },
  {
    uri: 'journal://{sessionId}/entries',
    name: 'Journal Entries',
    description: 'Journal entries for a session',
    mimeType: 'application/json',
  },
  {
    uri: 'journal://{sessionId}/campaign-notes',
    name: 'Campaign Notes',
    description: 'Campaign notes for a session',
    mimeType: 'application/json',
  },
];

// Create MCP Server
const server = new Server(
  {
    name: 'spf-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

// Tool handler mapping
const toolHandlers = new Map([
  ['session_create', sessionCreateHandler],
  ['session_load', sessionLoadHandler],
  ['session_update', sessionUpdateHandler],
  ['session_end', sessionEndHandler],
  ['actor_upsert', actorUpsertHandler],
  ['actor_patch', actorPatchHandler],
  ['actor_move', actorMoveHandler],
  ['actor_apply_effect', actorApplyEffectHandler],
  ['actor_roll_trait', actorRollTraitHandler],
  ['actor_spend_benny', actorSpendBennyHandler],
  ['actor_maintain_conviction', actorMaintainConvictionHandler],
  ['combat_start', combatStartHandler],
  ['combat_deal', combatDealHandler],
  ['combat_hold', combatHoldHandler],
  ['combat_interrupt', combatInterruptHandler],
  ['combat_advance_turn', combatAdvanceTurnHandler],
  ['combat_end_round', combatEndRoundHandler],
  ['combat_set_multi_action', combatSetMultiActionHandler],
  ['combat_create_extras_group', combatCreateExtrasGroupHandler],
  ['combat_clear_multi_action', combatClearMultiActionHandler],
  ['dice_roll', diceRollHandler],
  ['dice_roll_with_conviction', diceRollWithConvictionHandler],
  ['journal_add_entry', journalAddEntryHandler],
  ['journal_add_campaign_note', journalAddCampaignNoteHandler],
  ['journal_search', journalSearchHandler],
  ['rules_apply_damage', applyDamageHandler],
  ['rules_soak_roll', soakRollHandler],
  ['rules_cast_power', castPowerHandler],
  ['rules_template_area', templateAreaHandler],
  ['support_test', supportTestHandler],
  ['support_test_of_will', testOfWillHandler],
  ['support_common_edges', commonEdgesHandler],
]);

// Register request handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources,
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  // Handle resource reading
  const uri = new URL(request.params.uri);
  const sessionId = uri.pathname.split('/')[1];

  // This would need to be implemented based on your resource structure
  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: 'application/json',
        text: JSON.stringify({ message: 'Resource not implemented yet' }),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const handler = toolHandlers.get(name);
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  // Create a mock Hono context for the handler
  const mockContext = {
    req: {
      json: () => Promise.resolve(args),
      header: (name: string) => {
        if (name === 'sessionId' && args.sessionId) {
          return args.sessionId;
        }
        return undefined;
      },
    },
    json: (data: any, status?: number) => {
      if (status && status >= 400) {
        throw new Error(data.error || 'Tool execution failed');
      }
      return data;
    },
    env: {
      // Mock environment - this would need to be properly configured
      SessionDO: null,
      CombatDO: null,
      DeckDO: null,
      RngDO: null,
      DB: null,
      SPFKV: null,
      R2: null,
      MCP_SERVER_NAME: 'spf-mcp',
      JWT_SECRET: process.env.JWT_SECRET || '',
      API_KEY: process.env.API_KEY || '',
    },
  };

  try {
    const result = await handler(mockContext as any);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result),
        },
      ],
    };
  } catch (error) {
    throw new Error(
      `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Savage Pathfinder MCP Server running on stdio');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}

export { server };
