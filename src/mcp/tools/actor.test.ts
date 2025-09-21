import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  actorUpsertHandler,
  actorPatchHandler,
  actorMoveHandler,
  actorApplyEffectHandler,
  actorRollTraitHandler,
  actorsListHandler,
} from './actor';

// Mock Hono context
const createMockContext = (
  body: any,
  headers: Record<string, string> = {},
) => ({
  req: {
    json: vi.fn().mockResolvedValue(body),
    header: vi
      .fn()
      .mockImplementation((name: string) => headers[name] || body[name]),
  },
  env: {
    SessionDO: {
      get: vi.fn().mockReturnValue({
        fetch: vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              data: { id: 'actor-123', name: 'Test Character' },
              serverTs: '2024-01-01T00:00:00Z',
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
  },
  json: vi.fn().mockReturnValue(new Response()),
});

describe('actorUpsertHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create actor with valid input', async () => {
    const mockCtx = createMockContext({
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
    });

    await actorUpsertHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    expect(mockCtx.env.SessionDO.get().fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 'actor-123', name: 'Test Character' },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should create NPC actor', async () => {
    const mockCtx = createMockContext({
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
    });

    await actorUpsertHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
  });

  it('should reject invalid actor data', async () => {
    const mockCtx = createMockContext({
      sessionId: 'invalid-uuid',
      actor: {
        type: 'invalid',
        name: '',
        wildCard: 'not-boolean',
      },
    });

    await actorUpsertHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });

  it('should handle SessionDO failure', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actor: {
        type: 'pc',
        name: 'Test Character',
        wildCard: true,
        traits: { Agility: 'd8' },
        skills: [{ name: 'Fighting', die: 'd8' }],
        resources: { bennies: 3, conviction: 0, powerPoints: 10 },
        status: { shaken: false, stunned: false, fatigue: 0, wounds: 0 },
        defense: { parry: 6, toughness: 7, armor: 2 },
        reach: 1,
        size: 0,
      },
    });

    mockCtx.env.SessionDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Actor creation failed',
        }),
        { status: 500 },
      ),
    );

    await actorUpsertHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Actor creation failed',
      },
      500,
    );
  });
});

describe('actorPatchHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should patch actor with valid data', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor-123',
      patch: {
        name: 'Updated Character',
        resources: { bennies: 2 },
        status: { wounds: 1 },
      },
    });

    await actorPatchHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 'actor-123', name: 'Test Character' },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should handle partial patches', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor-123',
      patch: {
        name: 'Only Name Updated',
      },
    });

    await actorPatchHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
  });

  it('should reject invalid patch data', async () => {
    const mockCtx = createMockContext({
      sessionId: 'invalid-uuid',
      actorId: 'invalid-uuid',
      patch: {
        name: '', // Invalid empty name
      },
    });

    await actorPatchHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });
});

describe('actorMoveHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should move actor to new position', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor-123',
      to: { x: 15, y: 20, facing: 90 },
      reason: 'Player movement',
    });

    await actorMoveHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 'actor-123', name: 'Test Character' },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should reject invalid position data', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor-123',
      to: { x: 'invalid', y: 20, facing: 90 }, // Invalid x
      reason: 'Player movement',
    });

    await actorMoveHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });
});

describe('actorApplyEffectHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should apply damage effect', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor-123',
      effect: {
        type: 'damage',
        payload: { amount: 8, ap: 2 },
      },
    });

    await actorApplyEffectHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: { id: 'actor-123', name: 'Test Character' },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should apply healing effect', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor-123',
      effect: {
        type: 'healing',
        payload: { amount: 5 },
      },
    });

    await actorApplyEffectHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
  });

  it('should apply condition effect', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor-123',
      effect: {
        type: 'condition',
        payload: { condition: 'shaken', duration: 1 },
      },
    });

    await actorApplyEffectHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
  });

  it('should apply resource effect', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor-123',
      effect: {
        type: 'resource',
        payload: { resource: 'bennies', amount: -1 },
      },
    });

    await actorApplyEffectHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
  });

  it('should reject invalid effect type', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor-123',
      effect: {
        type: 'invalid',
        payload: {},
      },
    });

    await actorApplyEffectHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });
});

describe('actorRollTraitHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should roll trait dice', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor-123',
      trait: 'Fighting',
      mods: [0],
      rollMode: 'open',
    });

    await actorRollTraitHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: {
        formula: '1d6',
        results: [[4]],
        total: 4,
        seed: 'test-seed',
        hash: 'test-hash',
      },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should handle different traits', async () => {
    const traits = [
      'Fighting',
      'Shooting',
      'Spellcasting',
      'Notice',
      'Stealth',
    ];

    for (const trait of traits) {
      const mockCtx = createMockContext({
        sessionId: 'test-session',
        actorId: 'actor-123',
        trait,
        mods: [0],
        rollMode: 'open',
      });

      await actorRollTraitHandler(mockCtx as any);

      expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    }
  });

  it('should handle modifiers', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor-123',
      trait: 'Fighting',
      mods: [-2, 1], // Multiple modifiers
      rollMode: 'open',
    });

    await actorRollTraitHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
  });

  it('should handle secret rolls', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor-123',
      trait: 'Notice',
      mods: [0],
      rollMode: 'secret',
    });

    await actorRollTraitHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
  });

  it('should reject invalid trait roll data', async () => {
    const mockCtx = createMockContext({
      sessionId: 'invalid-uuid',
      actorId: 'invalid-uuid',
      trait: '', // Invalid empty trait
    });

    await actorRollTraitHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });
});

describe('actorsListHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list actors for session', async () => {
    const mockCtx = createMockContext({}, { sessionId: 'test-session' });

    mockCtx.env.SessionDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [
            { id: 'actor1', name: 'Character 1' },
            { id: 'actor2', name: 'Character 2' },
          ],
          serverTs: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    await actorsListHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: [
        { id: 'actor1', name: 'Character 1' },
        { id: 'actor2', name: 'Character 2' },
      ],
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should handle empty actor list', async () => {
    const mockCtx = createMockContext({}, { sessionId: 'test-session' });

    mockCtx.env.SessionDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [],
          serverTs: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    await actorsListHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: [],
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should reject request without sessionId', async () => {
    const mockCtx = createMockContext({});

    await actorsListHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'sessionId required in header or body',
      },
      400,
    );
  });

  it('should handle SessionDO failure', async () => {
    const mockCtx = createMockContext({}, { sessionId: 'test-session' });

    mockCtx.env.SessionDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to list actors',
        }),
        { status: 500 },
      ),
    );

    await actorsListHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Failed to list actors',
      },
      500,
    );
  });
});
