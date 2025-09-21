import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionDO } from './SessionDO';

// Mock DurableObjectState
const mockState = {
  storage: {
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
};

// Mock environment
const createMockEnv = () => ({
  DB: {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi.fn().mockResolvedValue({
          id: 'test-session',
          name: 'Test Session',
          status: 'lobby',
          rulesetVersion: '1.0.0',
          round: 0,
          turn: 0,
          gridUnit: 'inch',
          gridScale: 1.0,
          cols: 20,
          rows: 20,
          illumination: 'bright',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }),
        all: vi.fn().mockResolvedValue({
          results: [
            {
              id: 'actor1',
              sessionId: 'test-session',
              type: 'pc',
              name: 'Test Character',
              wildCard: true,
              traits: '{"Agility":"d8","Smarts":"d6"}',
              skills: '[{"name":"Fighting","die":"d8"}]',
              resources: '{"bennies":3,"conviction":0,"powerPoints":10}',
              status: '{"shaken":false,"stunned":false,"fatigue":0,"wounds":0}',
              defense: '{"parry":6,"toughness":7,"armor":2}',
              position: '{"x":10,"y":10,"facing":0}',
              reach: 1,
              size: 0,
            },
          ],
        }),
      }),
    }),
  },
  DeckDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { reset: true },
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
              formula: '1d6',
              results: [[4]],
              total: 4,
              seed: 'test-seed',
              hash: 'test-hash',
            },
          }),
        ),
      ),
    }),
    idFromName: vi.fn(),
  },
});

describe('SessionDO', () => {
  let sessionDO: SessionDO;
  let mockEnv: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = createMockEnv();
    sessionDO = new SessionDO(mockState as any, mockEnv);
  });

  describe('handleCreate', () => {
    it('should create a new session with valid input', async () => {
      const request = new Request('http://session/create', {
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
          gmRole: 'gpt5',
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('sessionId');
      expect(result.data.sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(result).toHaveProperty('serverTs');

      // Verify database insert was called
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sessions'),
      );
      expect(mockEnv.DB.prepare().bind().run).toHaveBeenCalled();

      // Verify deck initialization
      expect(mockEnv.DeckDO.get).toHaveBeenCalled();
      expect(mockEnv.DeckDO.get().fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should create session with default values', async () => {
      const request = new Request('http://session/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Minimal Session',
          grid: {
            unit: 'square',
            scale: 1.0,
            cols: 10,
            rows: 10,
          },
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('sessionId');
    });

    it('should reject invalid input', async () => {
      const request = new Request('http://session/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: '', // Invalid: empty name
          grid: {
            unit: 'invalid', // Invalid unit
            scale: -1, // Invalid scale
            cols: 0, // Invalid cols
            rows: 0, // Invalid rows
          },
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('handleGet', () => {
    it('should return session by ID', async () => {
      const request = new Request('http://session/get?sessionId=test-session', {
        method: 'GET',
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'test-session');
      expect(result.data).toHaveProperty('name', 'Test Session');
      expect(result.data).toHaveProperty('status', 'lobby');
      expect(result).toHaveProperty('serverTs');

      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM sessions WHERE id = ?'),
      );
    });

    it('should return error if sessionId missing', async () => {
      const request = new Request('http://session/get', {
        method: 'GET',
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('sessionId parameter required');
    });

    it('should return error if session not found', async () => {
      mockEnv.DB.prepare().bind().first = vi.fn().mockResolvedValue(null);

      const request = new Request('http://session/get?sessionId=nonexistent', {
        method: 'GET',
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Session not found');
    });
  });

  describe('handleUpdate', () => {
    it('should update session with valid patch', async () => {
      const request = new Request('http://session/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          patch: {
            name: 'Updated Session',
            status: 'in_progress',
            round: 1,
            turn: 2,
            illumination: 'dim',
          },
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id', 'test-session');
      expect(result).toHaveProperty('serverTs');

      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE sessions SET'),
      );
    });

    it('should handle partial updates', async () => {
      const request = new Request('http://session/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          patch: {
            name: 'Only Name Updated',
          },
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('name = ?'),
      );
    });

    it('should reject invalid sessionId', async () => {
      const request = new Request('http://session/update', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'invalid-uuid',
          patch: {
            name: 'Updated',
          },
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('handleEnd', () => {
    it('should end session with reason', async () => {
      const request = new Request('http://session/end', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          reason: 'Game completed',
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('ended', true);
      expect(result.data).toHaveProperty('reason', 'Game completed');
      expect(result).toHaveProperty('serverTs');

      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE sessions SET status = 'ended'"),
      );
    });
  });

  describe('handleCreateActor', () => {
    it('should create actor with valid input', async () => {
      const request = new Request('http://session/actor/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actor: {
            type: 'pc',
            name: 'Test Character',
            wildCard: true,
            traits: {
              Agility: 'd8',
              Smarts: 'd6',
              Spirit: 'd8',
              Strength: 'd10',
              Vigor: 'd8',
            },
            skills: [
              { name: 'Fighting', die: 'd10' },
              { name: 'Shooting', die: 'd6' },
            ],
            resources: {
              bennies: 3,
              conviction: 0,
              powerPoints: 10,
            },
            status: {
              shaken: false,
              stunned: false,
              fatigue: 0,
              wounds: 0,
            },
            defense: {
              parry: 7,
              toughness: 8,
              armor: 2,
            },
            gear: [{ name: 'Longsword', ap: 0, damage: 'Str+d8' }],
            position: { x: 10, y: 10, facing: 0 },
            reach: 1,
            size: 0,
          },
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('id');
      expect(result.data).toHaveProperty('sessionId', 'test-session');
      expect(result.data).toHaveProperty('name', 'Test Character');
      expect(result.data).toHaveProperty('type', 'pc');
      expect(result.data).toHaveProperty('wildCard', true);
      expect(result).toHaveProperty('serverTs');

      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO actors'),
      );
    });

    it('should create NPC actor', async () => {
      const request = new Request('http://session/actor/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actor: {
            type: 'npc',
            name: 'Goblin Warrior',
            wildCard: false,
            traits: {
              Agility: 'd8',
              Smarts: 'd4',
              Spirit: 'd6',
              Strength: 'd6',
              Vigor: 'd6',
            },
            skills: [{ name: 'Fighting', die: 'd6' }],
            resources: {
              bennies: 1,
              conviction: 0,
              powerPoints: 0,
            },
            status: {
              shaken: false,
              stunned: false,
              fatigue: 0,
              wounds: 0,
            },
            defense: {
              parry: 5,
              toughness: 5,
              armor: 0,
            },
            reach: 1,
            size: -1,
          },
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('type', 'npc');
      expect(result.data).toHaveProperty('wildCard', false);
    });

    it('should reject invalid actor data', async () => {
      const request = new Request('http://session/actor/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'invalid-uuid',
          actor: {
            type: 'invalid',
            name: '',
            wildCard: 'not-boolean',
          },
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('handleGetActors', () => {
    it('should return actors for session', async () => {
      const request = new Request(
        'http://session/actors?sessionId=test-session',
        {
          method: 'GET',
        },
      );

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id', 'actor1');
      expect(result.data[0]).toHaveProperty('name', 'Test Character');
      expect(result).toHaveProperty('serverTs');

      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM actors WHERE sessionId = ?'),
      );
    });

    it('should return error if sessionId missing', async () => {
      const request = new Request('http://session/actors', {
        method: 'GET',
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('sessionId parameter required');
    });
  });

  describe('handleMoveActor', () => {
    it('should move actor to new position', async () => {
      const request = new Request('http://session/actor/move', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor1',
          to: { x: 15, y: 20, facing: 90 },
          reason: 'Player movement',
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('moved', true);
      expect(result.data).toHaveProperty('reason', 'Player movement');
      expect(result).toHaveProperty('serverTs');

      expect(mockEnv.DB.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE actors SET position = ?'),
      );
    });

    it('should reject invalid position data', async () => {
      const request = new Request('http://session/actor/move', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor1',
          to: { x: 'invalid', y: 20, facing: 90 }, // Invalid x
          reason: 'Player movement',
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('handleApplyEffect', () => {
    it('should apply damage effect', async () => {
      const request = new Request('http://session/actor/applyEffect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor1',
          effect: {
            type: 'damage',
            payload: { amount: 8, ap: 2 },
          },
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('effectApplied', true);
      expect(result.data).toHaveProperty('effect');
      expect(result.data.effect.type).toBe('damage');
    });

    it('should apply healing effect', async () => {
      const request = new Request('http://session/actor/applyEffect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor1',
          effect: {
            type: 'healing',
            payload: { amount: 5 },
          },
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data.effect.type).toBe('healing');
    });

    it('should reject invalid effect type', async () => {
      const request = new Request('http://session/actor/applyEffect', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor1',
          effect: {
            type: 'invalid',
            payload: {},
          },
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('handleRollTrait', () => {
    it('should roll trait dice', async () => {
      const request = new Request('http://session/actor/rollTrait', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor1',
          trait: 'Fighting',
          mods: [0],
          rollMode: 'open',
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('formula', '1d6');
      expect(result.data).toHaveProperty('results');
      expect(result.data).toHaveProperty('total', 4);
      expect(result.data).toHaveProperty('seed', 'test-seed');
      expect(result.data).toHaveProperty('hash', 'test-hash');
      expect(result).toHaveProperty('serverTs');

      expect(mockEnv.RngDO.get).toHaveBeenCalled();
      expect(mockEnv.RngDO.get().fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should reject invalid trait roll data', async () => {
      const request = new Request('http://session/actor/rollTrait', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'invalid-uuid',
          actorId: 'invalid-uuid',
          trait: '', // Invalid empty trait
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const request = new Request('http://session/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unknown endpoints', async () => {
      const request = new Request('http://session/unknown', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await sessionDO.fetch(request);

      expect(response.status).toBe(404);
    });

    it('should handle database errors gracefully', async () => {
      mockEnv.DB.prepare().bind().run = vi
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const request = new Request('http://session/create', {
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
        }),
      });

      const response = await sessionDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
