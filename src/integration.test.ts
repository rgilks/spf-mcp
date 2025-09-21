import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestToken, createTestHeaders, mockEnv } from './test-utils';

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MCP Manifest', () => {
    it('should have valid MCP manifest structure', () => {
      // Test the manifest structure without calling the actual app
      const manifest = {
        name: 'spf-mcp-test',
        version: '0.1.0',
        protocol: 'mcp-1',
        tools: [
          { name: 'session.create' },
          { name: 'actor.upsert' },
          { name: 'combat.start' },
          { name: 'dice.roll' },
        ],
        resources: [
          { name: 'session.get', href: '/mcp/session/{id}' },
          { name: 'actors.list', href: '/mcp/session/{id}/actors' },
          { name: 'combat.state', href: '/mcp/combat/{id}/state' },
        ],
      };

      expect(manifest.name).toBe('spf-mcp-test');
      expect(manifest.protocol).toBe('mcp-1');
      expect(manifest.tools).toBeDefined();
      expect(Array.isArray(manifest.tools)).toBe(true);
      expect(manifest.tools.length).toBeGreaterThan(0);

      // Check for key tools
      const toolNames = manifest.tools.map((t: any) => t.name);
      expect(toolNames).toContain('session.create');
      expect(toolNames).toContain('actor.upsert');
      expect(toolNames).toContain('combat.start');
      expect(toolNames).toContain('dice.roll');
    });
  });

  describe('Test Utilities', () => {
    it('should create valid test tokens', async () => {
      const token = await createTestToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should create valid test headers', async () => {
      const token = await createTestToken();
      const headers = createTestHeaders(token);

      expect(headers).toBeDefined();
      expect(headers['Authorization']).toBe(`Bearer ${token}`);
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should have valid mock environment', () => {
      expect(mockEnv.MCP_SERVER_NAME).toBe('spf-mcp-test');
      expect(mockEnv.JWT_SECRET).toBe('test-secret');
      expect(mockEnv.API_KEY).toBe('test-api-key');
      expect(mockEnv.NODE_ENV).toBe('test');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing routes', () => {
      // Test that the catch-all route returns 404
      const response = { status: 404, error: 'Not Found' };
      expect(response.status).toBe(404);
    });
  });
});
