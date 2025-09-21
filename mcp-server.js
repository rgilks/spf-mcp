#!/usr/bin/env node

/**
 * Standalone MCP Server for Cursor Integration
 * Provides a local MCP server that proxies to the deployed application
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const DEPLOYED_URL = 'https://spf-mcp.rob-gilks.workers.dev';

class SavagePathfinderMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'savage-pathfinder',
        version: '1.0.0',
        description:
          'Savage Pathfinder MCP Server for AI-powered tabletop gaming',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );

    this.setupTools();
    this.setupResources();
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${DEPLOYED_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return { response, data };
  }

  setupTools() {
    // Session Management Tools
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'session.create':
            return await this.handleSessionCreate(args);
          case 'session.load':
            return await this.handleSessionLoad(args);
          case 'session.update':
            return await this.handleSessionUpdate(args);
          case 'session.end':
            return await this.handleSessionEnd(args);
          case 'actor.upsert':
            return await this.handleActorUpsert(args);
          case 'actor.patch':
            return await this.handleActorPatch(args);
          case 'actor.move':
            return await this.handleActorMove(args);
          case 'actor.applyEffect':
            return await this.handleActorApplyEffect(args);
          case 'actor.rollTrait':
            return await this.handleActorRollTrait(args);
          case 'combat.start':
            return await this.handleCombatStart(args);
          case 'combat.deal':
            return await this.handleCombatDeal(args);
          case 'combat.hold':
            return await this.handleCombatHold(args);
          case 'combat.interrupt':
            return await this.handleCombatInterrupt(args);
          case 'combat.advanceTurn':
            return await this.handleCombatAdvanceTurn(args);
          case 'combat.endRound':
            return await this.handleCombatEndRound(args);
          case 'dice.roll':
            return await this.handleDiceRoll(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Error calling ${name}: ${error.message}`,
            },
          ],
        };
      }
    });

    // List available tools
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'session.create',
            description: 'Create a new game session with grid configuration',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Session name' },
                grid: {
                  type: 'object',
                  properties: {
                    unit: { type: 'string', enum: ['inch', 'foot', 'meter'] },
                    scale: { type: 'number' },
                    cols: { type: 'integer' },
                    rows: { type: 'integer' },
                  },
                },
                illumination: {
                  type: 'string',
                  enum: ['bright', 'dim', 'dark'],
                },
              },
              required: ['name'],
            },
          },
          {
            name: 'dice.roll',
            description:
              'Roll virtual dice with exploding and optional wild die',
            inputSchema: {
              type: 'object',
              properties: {
                sessionId: {
                  type: 'string',
                  description: 'Session ID for audit trail',
                },
                formula: {
                  type: 'string',
                  description: 'Dice formula (e.g., "2d6+3", "1d20")',
                },
                explode: {
                  type: 'boolean',
                  description: 'Whether dice should explode on max roll',
                },
                wildDie: {
                  type: 'string',
                  description: 'Wild die formula (e.g., "d6")',
                },
              },
              required: ['sessionId', 'formula'],
            },
          },
          {
            name: 'actor.upsert',
            description: 'Create or update an actor (PC, NPC, or creature)',
            inputSchema: {
              type: 'object',
              properties: {
                sessionId: { type: 'string' },
                actor: {
                  type: 'object',
                  description:
                    'Actor data with traits, skills, resources, etc.',
                },
              },
              required: ['sessionId', 'actor'],
            },
          },
          {
            name: 'combat.start',
            description: 'Start combat with a list of participants',
            inputSchema: {
              type: 'object',
              properties: {
                sessionId: { type: 'string' },
                participants: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of actor IDs',
                },
              },
              required: ['sessionId', 'participants'],
            },
          },
          // Add more tools as needed
        ],
      };
    });
  }

  setupResources() {
    this.server.setRequestHandler('resources/list', async () => {
      return {
        resources: [
          {
            uri: 'savage-pathfinder://manifest',
            name: 'MCP Manifest',
            description: 'Server capabilities and tool definitions',
            mimeType: 'application/json',
          },
        ],
      };
    });

    this.server.setRequestHandler('resources/read', async (request) => {
      const { uri } = request.params;

      if (uri === 'savage-pathfinder://manifest') {
        const { data } = await this.makeRequest('/mcp/manifest');
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  // Tool handler methods
  async handleSessionCreate(args) {
    const { data } = await this.makeRequest('/mcp/tool/session.create', {
      method: 'POST',
      body: JSON.stringify(args),
    });

    return {
      content: [
        {
          type: 'text',
          text: data.success
            ? `✅ Session created: ${data.data.sessionId}\nName: ${args.name || 'Unnamed Session'}`
            : `❌ Failed to create session: ${data.error}`,
        },
      ],
    };
  }

  async handleDiceRoll(args) {
    const { data } = await this.makeRequest('/mcp/tool/dice.roll', {
      method: 'POST',
      body: JSON.stringify(args),
    });

    if (data.success) {
      const results = data.data.results.flat();
      return {
        content: [
          {
            type: 'text',
            text: `🎲 ${args.formula}: ${results.join(', ')} = **${data.data.total}**\n🔐 Seed: ${data.data.seed}\n🔒 Hash: ${data.data.hash.substring(0, 16)}...`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `❌ Dice roll failed: ${data.error}`,
          },
        ],
      };
    }
  }

  async handleActorUpsert(args) {
    const { data } = await this.makeRequest('/mcp/tool/actor.upsert', {
      method: 'POST',
      body: JSON.stringify(args),
    });

    return {
      content: [
        {
          type: 'text',
          text: data.success
            ? `✅ Actor created: ${data.data.name} (ID: ${data.data.id})`
            : `❌ Failed to create actor: ${data.error}`,
        },
      ],
    };
  }

  async handleCombatStart(args) {
    const { data } = await this.makeRequest('/mcp/tool/combat.start', {
      method: 'POST',
      body: JSON.stringify(args),
    });

    return {
      content: [
        {
          type: 'text',
          text: data.success
            ? `⚔️ Combat started with ${args.participants.length} participants`
            : `❌ Failed to start combat: ${data.error}`,
        },
      ],
    };
  }

  // Add more handlers for other tools...

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🎲 Savage Pathfinder MCP Server running');
  }
}

// Start the server
const server = new SavagePathfinderMCPServer();
server.run().catch(console.error);
