import { describe, it, expect, beforeEach, vi } from 'vitest';
import app from '../index';

// Mock environment
const mockEnv = {
  DB: {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue({ id: 'test-session' }),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    }),
  },
  SPFKV: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  R2: {
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
  CombatDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { status: 'idle', round: 0, turn: 0, participants: [] },
          }),
        ),
      ),
    }),
    idFromName: vi.fn(),
  },
  DeckDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { cards: [], discard: [], dealt: {} },
          }),
        ),
      ),
    }),
    idFromName: vi.fn(),
  },
  RngDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              formula: '2d6',
              results: [[3, 4]],
              total: 7,
              seed: 'test',
              hash: 'hash',
            },
          }),
        ),
      ),
    }),
    idFromName: vi.fn(),
  },
  SessionDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockImplementation(async (req) => {
        const url = new URL(req.url);
        const path = url.pathname;

        if (path.includes('/get')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: { id: 'test-session', name: 'Test Session' },
              serverTs: new Date().toISOString(),
            }),
            {
              headers: { 'content-type': 'application/json' },
            },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            data: { sessionId: 'test-session' },
            serverTs: new Date().toISOString(),
          }),
          {
            headers: { 'content-type': 'application/json' },
          },
        );
      }),
    }),
    idFromName: vi.fn(),
  },
  MCP_SERVER_NAME: 'spf-mcp-test',
};

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MCP Manifest', () => {
    it('should return valid MCP manifest', async () => {
      const request = new Request('http://localhost/mcp/manifest');
      const response = await app.fetch(request, mockEnv);
      const manifest = await response.json();

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

  describe('Dice Rolling', () => {
    it('should roll dice with sessionId', async () => {
      const request = new Request('http://localhost/mcp/tool/dice.roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: '2d6+1',
          sessionId: 'test-session',
        }),
      });

      const response = await app.fetch(request, mockEnv);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('formula', '2d6');
      expect(result.data).toHaveProperty('total', 7);
    });

    it('should reject dice roll without sessionId', async () => {
      const request = new Request('http://localhost/mcp/tool/dice.roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: '2d6+1',
        }),
      });

      const response = await app.fetch(request, mockEnv);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('sessionId required');
    });
  });

  describe('Session Management', () => {
    it('should create a new session', async () => {
      const request = new Request('http://localhost/mcp/tool/session.create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Session',
          grid: {
            unit: 'inch',
            scale: 1.0,
            cols: 20,
            rows: 20,
          },
          illumination: 'bright',
        }),
      });

      const response = await app.fetch(request, mockEnv);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('sessionId');
    });

    it('should load an existing session', async () => {
      const request = new Request('http://localhost/mcp/session/test-session');
      const response = await app.fetch(request, mockEnv);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'test-session');
    });
  });

  describe('Actor Management', () => {
    it('should create an actor', async () => {
      const request = new Request('http://localhost/mcp/tool/actor.upsert', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actor: {
            type: 'pc',
            name: 'Test Character',
            wildCard: true,
            traits: { Agility: 'd8', Smarts: 'd6' },
            skills: [{ name: 'Fighting', die: 'd8' }],
            resources: { bennies: 3, conviction: 0, powerPoints: 10 },
            status: { shaken: false, stunned: false, fatigue: 0, wounds: 0 },
            defense: { parry: 6, toughness: 7, armor: 2 },
          },
        }),
      });

      const response = await app.fetch(request, mockEnv);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('name', 'Test Character');
    });
  });

  describe('Combat Management', () => {
    it('should start combat', async () => {
      const request = new Request('http://localhost/mcp/tool/combat.start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          participants: ['actor1', 'actor2'],
        }),
      });

      const response = await app.fetch(request, mockEnv);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('status', 'idle');
      expect(result.data).toHaveProperty('participants');
    });

    it('should deal initiative cards', async () => {
      const request = new Request('http://localhost/mcp/tool/combat.deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          extraDraws: {},
        }),
      });

      const response = await app.fetch(request, mockEnv);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('dealt');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON', async () => {
      const request = new Request('http://localhost/mcp/tool/dice.roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      });

      const response = await app.fetch(request, mockEnv);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing routes', async () => {
      const request = new Request('http://localhost/mcp/tool/nonexistent');
      const response = await app.fetch(request, mockEnv);

      expect(response.status).toBe(404);
    });
  });
});
