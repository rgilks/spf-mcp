import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  combatStartHandler,
  combatDealHandler,
  combatHoldHandler,
  combatInterruptHandler,
  combatAdvanceTurnHandler,
  combatEndRoundHandler,
  combatStateHandler,
} from './combat';

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
    CombatDO: {
      get: vi.fn().mockReturnValue({
        fetch: vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                sessionId: 'test-session',
                status: 'idle',
                round: 0,
                turn: 0,
                participants: ['actor1', 'actor2'],
              },
              serverTs: '2024-01-01T00:00:00Z',
            }),
          ),
        ),
      }),
      idFromName: vi.fn(),
    },
  },
  json: vi.fn().mockReturnValue(new Response()),
});

describe('combatStartHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start combat with participants', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      participants: ['actor1', 'actor2', 'actor3'],
      options: {},
    });

    await combatStartHandler(mockCtx as any);

    expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
    expect(mockCtx.env.CombatDO.get().fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: {
        sessionId: 'test-session',
        status: 'idle',
        round: 0,
        turn: 0,
        participants: ['actor1', 'actor2'],
      },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should start combat with options', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      participants: ['actor1'],
      options: { customRule: 'test' },
    });

    await combatStartHandler(mockCtx as any);

    expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
  });

  it('should reject invalid input', async () => {
    const mockCtx = createMockContext({
      sessionId: 'invalid-uuid',
      participants: [], // Invalid empty array
    });

    await combatStartHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });

  it('should handle CombatDO failure', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      participants: ['actor1', 'actor2'],
    });

    mockCtx.env.CombatDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Combat start failed',
        }),
        { status: 500 },
      ),
    );

    await combatStartHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Combat start failed',
      },
      500,
    );
  });
});

describe('combatDealHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deal initiative cards', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      extraDraws: {},
    });

    mockCtx.env.CombatDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: 'test-session',
            status: 'round_start',
            round: 1,
            turn: 0,
            dealt: {
              actor1: { rank: 'K', suit: 'Spades', id: 'card1' },
              actor2: { rank: 'Q', suit: 'Hearts', id: 'card2' },
            },
            turnOrder: ['actor1', 'actor2'],
          },
          serverTs: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    await combatDealHandler(mockCtx as any);

    expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: {
        sessionId: 'test-session',
        status: 'round_start',
        round: 1,
        turn: 0,
        dealt: {
          actor1: { rank: 'K', suit: 'Spades', id: 'card1' },
          actor2: { rank: 'Q', suit: 'Hearts', id: 'card2' },
        },
        turnOrder: ['actor1', 'actor2'],
      },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should handle extra draws', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      extraDraws: { actor1: 1 }, // Level Headed Edge
    });

    await combatDealHandler(mockCtx as any);

    expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
  });

  it('should reject invalid input', async () => {
    const mockCtx = createMockContext({
      sessionId: 'invalid-uuid',
      extraDraws: 'invalid', // Should be object
    });

    await combatDealHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });
});

describe('combatHoldHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should put actor on hold', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor1',
    });

    mockCtx.env.CombatDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: 'test-session',
            status: 'on_hold',
            activeActorId: undefined,
            hold: ['actor1'],
          },
          serverTs: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    await combatHoldHandler(mockCtx as any);

    expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: {
        sessionId: 'test-session',
        status: 'on_hold',
        activeActorId: undefined,
        hold: ['actor1'],
      },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should reject invalid input', async () => {
    const mockCtx = createMockContext({
      sessionId: 'invalid-uuid',
      actorId: 'invalid-uuid',
    });

    await combatHoldHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });
});

describe('combatInterruptHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should interrupt with actor on hold', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      actorId: 'actor1',
      targetActorId: 'actor2',
    });

    mockCtx.env.CombatDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: 'test-session',
            status: 'turn_active',
            activeActorId: 'actor1',
            hold: [],
          },
          serverTs: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    await combatInterruptHandler(mockCtx as any);

    expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: {
        sessionId: 'test-session',
        status: 'turn_active',
        activeActorId: 'actor1',
        hold: [],
      },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should reject invalid input', async () => {
    const mockCtx = createMockContext({
      sessionId: 'invalid-uuid',
      actorId: 'invalid-uuid',
      targetActorId: 'invalid-uuid',
    });

    await combatInterruptHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });
});

describe('combatAdvanceTurnHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should advance to next turn', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
    });

    mockCtx.env.CombatDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: 'test-session',
            status: 'turn_active',
            round: 1,
            turn: 1,
            activeActorId: 'actor2',
          },
          serverTs: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    await combatAdvanceTurnHandler(mockCtx as any);

    expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: {
        sessionId: 'test-session',
        status: 'turn_active',
        round: 1,
        turn: 1,
        activeActorId: 'actor2',
      },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should handle end of round', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
    });

    mockCtx.env.CombatDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: 'test-session',
            status: 'round_end',
            round: 1,
            turn: 3,
            activeActorId: undefined,
          },
          serverTs: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    await combatAdvanceTurnHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: {
        sessionId: 'test-session',
        status: 'round_end',
        round: 1,
        turn: 3,
        activeActorId: undefined,
      },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should reject invalid input', async () => {
    const mockCtx = createMockContext({
      sessionId: 'invalid-uuid',
    });

    await combatAdvanceTurnHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });
});

describe('combatEndRoundHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should end round and reset for next round', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
    });

    mockCtx.env.CombatDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: 'test-session',
            status: 'round_start',
            round: 2,
            turn: 0,
            activeActorId: undefined,
            hold: [],
          },
          serverTs: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    await combatEndRoundHandler(mockCtx as any);

    expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: {
        sessionId: 'test-session',
        status: 'round_start',
        round: 2,
        turn: 0,
        activeActorId: undefined,
        hold: [],
      },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should handle joker reshuffle', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
    });

    await combatEndRoundHandler(mockCtx as any);

    expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
  });

  it('should reject invalid input', async () => {
    const mockCtx = createMockContext({
      sessionId: 'invalid-uuid',
    });

    await combatEndRoundHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });
});

describe('combatStateHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return current combat state', async () => {
    const mockCtx = createMockContext({}, { sessionId: 'test-session' });

    mockCtx.env.CombatDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: 'test-session',
            status: 'idle',
            round: 0,
            turn: 0,
            participants: ['actor1', 'actor2'],
            hold: [],
          },
          serverTs: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    await combatStateHandler(mockCtx as any);

    expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: {
        sessionId: 'test-session',
        status: 'idle',
        round: 0,
        turn: 0,
        participants: ['actor1', 'actor2'],
        hold: [],
      },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should handle combat not started', async () => {
    const mockCtx = createMockContext({}, { sessionId: 'test-session' });

    mockCtx.env.CombatDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Combat not started',
        }),
        { status: 404 },
      ),
    );

    await combatStateHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Combat not started',
      },
      404,
    );
  });

  it('should reject request without sessionId', async () => {
    const mockCtx = createMockContext({});

    await combatStateHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'sessionId required in header or body',
      },
      400,
    );
  });
});
