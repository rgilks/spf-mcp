#!/usr/bin/env node

/**
 * Simple MCP Proxy for Savage Pathfinder Server
 * Connects Cursor to the deployed SPF MCP server
 */

const SERVER_URL =
  process.env.SPF_SERVER_URL || 'https://spf-mcp.rob-gilks.workers.dev';

// Simple JSON-RPC handler
process.stdin.setEncoding('utf8');
process.stdout.setEncoding('utf8');

let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk;

  // Process complete JSON-RPC messages
  let newlineIndex;
  while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
    const line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);

    if (line.trim()) {
      handleMessage(line.trim());
    }
  }
});

async function makeRequest(endpoint, options = {}) {
  const url = `${SERVER_URL}${endpoint}`;
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

async function handleMessage(message) {
  let request;
  try {
    request = JSON.parse(message);

    let response;

    switch (request.method) {
      case 'initialize':
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
              resources: {},
            },
            serverInfo: {
              name: 'savage-pathfinder',
              version: '1.0.0',
            },
          },
        };
        break;

      case 'tools/list':
        const { data: manifest } = await makeRequest('/mcp/manifest');
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            tools: manifest.tools || [],
          },
        };
        break;

      case 'tools/call':
        const { name, arguments: args } = request.params;
        const toolResponse = await handleToolCall(name, args);
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: toolResponse,
        };
        break;

      case 'resources/list':
        response = {
          jsonrpc: '2.0',
          id: request.id,
          result: {
            resources: [
              {
                uri: 'savage-pathfinder://manifest',
                name: 'Server Manifest',
                description: 'Available tools and capabilities',
                mimeType: 'application/json',
              },
            ],
          },
        };
        break;

      case 'resources/read':
        if (request.params.uri === 'savage-pathfinder://manifest') {
          const { data: manifestData } = await makeRequest('/mcp/manifest');
          response = {
            jsonrpc: '2.0',
            id: request.id,
            result: {
              contents: [
                {
                  uri: request.params.uri,
                  mimeType: 'application/json',
                  text: JSON.stringify(manifestData, null, 2),
                },
              ],
            },
          };
        } else {
          throw new Error(`Unknown resource: ${request.params.uri}`);
        }
        break;

      default:
        response = {
          jsonrpc: '2.0',
          id: request.id,
          error: {
            code: -32601,
            message: `Method not found: ${request.method}`,
          },
        };
    }

    console.log(JSON.stringify(response));
  } catch (error) {
    console.error(`Error handling message: ${error.message}`, {
      error: error.stack,
    });

    const errorResponse = {
      jsonrpc: '2.0',
      id: request?.id || null,
      error: {
        code: -32603,
        message: error.message,
      },
    };

    console.log(JSON.stringify(errorResponse));
  }
}

async function handleToolCall(toolName, args) {
  try {
    const endpoint = `/mcp/tool/${toolName}`;
    const { data } = await makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(args),
    });

    if (data.success) {
      let resultText;

      switch (toolName) {
        case 'session.create':
          resultText = `✅ **Session Created**\n• ID: \`${data.data.sessionId}\`\n• Name: ${args.name || 'Unnamed Session'}\n• Status: Ready for players`;
          break;

        case 'dice.roll':
          const results = data.data.results.flat();
          resultText = `🎲 **Dice Roll: ${args.formula}**\n• Rolls: ${results.join(', ')}\n• **Total: ${data.data.total}**\n• Seed: \`${data.data.seed}\`\n• Hash: \`${data.data.hash.substring(0, 16)}...\``;
          break;

        case 'actor.upsert':
          resultText = `👤 **Actor Created**\n• Name: ${data.data.name}\n• ID: \`${data.data.id}\`\n• Type: ${data.data.type.toUpperCase()}\n• Status: Ready for adventure`;
          break;

        case 'combat.start':
          resultText = `⚔️ **Combat Started**\n• Participants: ${args.participants.length}\n• Status: Initiative needed\n• Round: 0`;
          break;

        case 'combat.deal':
          const cardCount = data.data?.dealt
            ? Object.keys(data.data.dealt).length
            : 0;
          resultText = `🃏 **Initiative Dealt**\n• Cards dealt to ${cardCount} participants\n• Ready to begin combat`;
          break;

        default:
          resultText = `✅ **${toolName}** completed successfully\n\`\`\`json\n${JSON.stringify(data.data, null, 2)}\n\`\`\``;
      }

      return {
        content: [
          {
            type: 'text',
            text: resultText,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **${toolName} failed**\n\`\`\`\n${data.error}\n\`\`\``,
          },
        ],
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ **Error calling ${toolName}**\n\`\`\`\n${error.message}\n\`\`\``,
        },
      ],
    };
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

console.error('🎲 Savage Pathfinder MCP Proxy started');
