import type { Env } from '../index';

export const handleMcpManifest = (c: any) => {
  const body = {
    name: c.env.MCP_SERVER_NAME || 'spf-mcp',
    version: '0.1.0',
    protocol: 'mcp-1',
    tools: [
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
    ],
  };
  return c.json(body);
};
