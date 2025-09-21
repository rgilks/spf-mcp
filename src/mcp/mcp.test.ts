import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

describe('MCP Server Integration', () => {
  let server: Server;

  beforeEach(async () => {
    // Create a test server instance
    server = new Server(
      {
        name: 'spf-mcp-test',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      },
    );
  });

  afterEach(async () => {
    // Clean up server
    if (server) {
      // Server cleanup if needed
    }
  });

  describe('Tool Listing', () => {
    it('should list all available tools', async () => {
      const response = await server.request({
        method: 'tools/list',
        params: {},
      });

      expect(response).toBeDefined();
      expect(response.tools).toBeDefined();
      expect(Array.isArray(response.tools)).toBe(true);
      expect(response.tools.length).toBeGreaterThan(0);

      // Check for specific tools
      const toolNames = response.tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('session_create');
      expect(toolNames).toContain('dice_roll');
      expect(toolNames).toContain('combat_start');
    });
  });

  describe('Tool Execution', () => {
    it('should handle dice roll tool calls', async () => {
      const response = await server.request({
        method: 'tools/call',
        params: {
          name: 'dice_roll',
          arguments: {
            formula: '2d6+1',
            explode: true,
          },
        },
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
      expect(Array.isArray(response.content)).toBe(true);
    });

    it('should handle session creation tool calls', async () => {
      const response = await server.request({
        method: 'tools/call',
        params: {
          name: 'session_create',
          arguments: {
            name: 'Test Session',
            grid: {
              unit: 'inch',
              scale: 1.0,
              cols: 20,
              rows: 20,
            },
            illumination: 'bright',
            gmRole: 'gpt5',
          },
        },
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should handle validation errors properly', async () => {
      await expect(
        server.request({
          method: 'tools/call',
          params: {
            name: 'session_create',
            arguments: {
              // Missing required fields
              name: 'Test Session',
            },
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle unknown tools gracefully', async () => {
      await expect(
        server.request({
          method: 'tools/call',
          params: {
            name: 'unknown_tool',
            arguments: {},
          },
        }),
      ).rejects.toThrow();
    });

    it('should validate tool parameters', async () => {
      await expect(
        server.request({
          method: 'tools/call',
          params: {
            name: 'dice_roll',
            arguments: {
              // Invalid formula
              formula: 'invalid',
            },
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('Resource Management', () => {
    it('should list available resources', async () => {
      const response = await server.request({
        method: 'resources/list',
        params: {},
      });

      expect(response).toBeDefined();
      expect(response.resources).toBeDefined();
      expect(Array.isArray(response.resources)).toBe(true);
    });
  });
});
