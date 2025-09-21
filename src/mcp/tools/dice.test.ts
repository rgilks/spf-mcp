import { describe, it, expect, beforeEach, vi } from 'vitest';
import { diceRollHandler } from './dice';

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
    RngDO: {
      get: vi.fn().mockReturnValue({
        fetch: vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              success: true,
              data: {
                formula: '2d6+1',
                results: [[3, 4]],
                total: 8,
                seed: 'test-seed',
                hash: 'test-hash',
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

describe('diceRollHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should roll dice with sessionId in body', async () => {
    const mockCtx = createMockContext({
      formula: '2d6+1',
      explode: true,
      wildDie: null,
      sessionId: 'test-session',
    });

    await diceRollHandler(mockCtx as any);

    expect(mockCtx.req.json).toHaveBeenCalled();
    expect(mockCtx.env.RngDO.get).toHaveBeenCalledWith(
      mockCtx.env.RngDO.idFromName('rng-test-session'),
    );
    expect(mockCtx.env.RngDO.get().fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: {
        formula: '2d6+1',
        results: [[3, 4]],
        total: 8,
        seed: 'test-seed',
        hash: 'test-hash',
      },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should roll dice with sessionId in header', async () => {
    const mockCtx = createMockContext(
      {
        formula: '1d20',
        explode: false,
        wildDie: null,
      },
      { sessionId: 'test-session' },
    );

    await diceRollHandler(mockCtx as any);

    expect(mockCtx.req.header).toHaveBeenCalledWith('sessionId');
    expect(mockCtx.env.RngDO.get).toHaveBeenCalled();
  });

  it('should reject request without sessionId', async () => {
    const mockCtx = createMockContext({
      formula: '2d6+1',
      explode: true,
      wildDie: null,
    });

    await diceRollHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'sessionId required in header or body',
      },
      400,
    );
  });

  it('should handle RNG DO failure', async () => {
    const mockCtx = createMockContext({
      formula: '2d6+1',
      explode: true,
      wildDie: null,
      sessionId: 'test-session',
    });

    mockCtx.env.RngDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'RNG error',
        }),
        { status: 500 },
      ),
    );

    await diceRollHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'RNG error',
      },
      500,
    );
  });

  it('should handle invalid JSON', async () => {
    const mockCtx = {
      req: {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        header: vi.fn(),
      },
      env: {
        RngDO: {
          get: vi.fn(),
          idFromName: vi.fn(),
        },
      },
      json: vi.fn(),
    };

    await diceRollHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Invalid JSON',
      },
      500,
    );
  });

  it('should handle different dice formulas', async () => {
    const testCases = [
      { formula: '1d6', explode: true, wildDie: null },
      { formula: '2d8+3', explode: false, wildDie: 'd6' },
      { formula: '3d10!!', explode: true, wildDie: null },
      { formula: '1d20-1', explode: false, wildDie: null },
    ];

    for (const testCase of testCases) {
      const mockCtx = createMockContext({
        ...testCase,
        sessionId: 'test-session',
      });

      await diceRollHandler(mockCtx as any);

      expect(mockCtx.env.RngDO.get().fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
        }),
      );
    }
  });

  it('should pass through all RNG parameters', async () => {
    const mockCtx = createMockContext({
      formula: '2d6+1',
      explode: true,
      wildDie: 'd6',
      seed: 'custom-seed',
      sessionId: 'test-session',
    });

    await diceRollHandler(mockCtx as any);

    const fetchCall = mockCtx.env.RngDO.get().fetch.mock.calls[0][0];
    const requestBody = JSON.parse(fetchCall.body);

    expect(requestBody).toEqual({
      formula: '2d6+1',
      explode: true,
      wildDie: 'd6',
      seed: 'custom-seed',
    });
  });

  it('should handle network errors gracefully', async () => {
    const mockCtx = createMockContext({
      formula: '2d6+1',
      explode: true,
      wildDie: null,
      sessionId: 'test-session',
    });

    mockCtx.env.RngDO.get().fetch = vi
      .fn()
      .mockRejectedValue(new Error('Network error'));

    await diceRollHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Network error',
      },
      500,
    );
  });
});
