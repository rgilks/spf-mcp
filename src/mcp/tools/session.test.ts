import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sessionCreateHandler,
  sessionLoadHandler,
  sessionUpdateHandler,
  sessionEndHandler,
} from './session';

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
              data: { sessionId: 'test-session' },
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

describe('sessionCreateHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create session with valid input', async () => {
    const mockCtx = createMockContext({
      name: 'Test Session',
      grid: {
        unit: 'inch',
        scale: 1.0,
        cols: 20,
        rows: 20,
      },
      illumination: 'bright',
      gmRole: 'gpt5',
    });

    await sessionCreateHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    expect(mockCtx.env.SessionDO.get().fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: { sessionId: 'test-session' },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should create session with minimal input', async () => {
    const mockCtx = createMockContext({
      name: 'Minimal Session',
      grid: {
        unit: 'square',
        scale: 1.0,
        cols: 10,
        rows: 10,
      },
    });

    await sessionCreateHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: { sessionId: 'test-session' },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should handle SessionDO failure', async () => {
    const mockCtx = createMockContext({
      name: 'Test Session',
      grid: {
        unit: 'inch',
        scale: 1.0,
        cols: 20,
        rows: 20,
      },
    });

    mockCtx.env.SessionDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Session creation failed',
        }),
        { status: 500 },
      ),
    );

    await sessionCreateHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Session creation failed',
      },
      500,
    );
  });

  it('should handle invalid input', async () => {
    const mockCtx = createMockContext({
      name: '', // Invalid empty name
      grid: {
        unit: 'invalid', // Invalid unit
        scale: -1, // Invalid scale
        cols: 0, // Invalid cols
        rows: 0, // Invalid rows
      },
    });

    await sessionCreateHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });
});

describe('sessionLoadHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load session by ID', async () => {
    const mockCtx = createMockContext({}, { sessionId: 'test-session' });

    mockCtx.env.SessionDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'test-session',
            name: 'Test Session',
            status: 'lobby',
          },
          serverTs: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    await sessionLoadHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: {
        id: 'test-session',
        name: 'Test Session',
        status: 'lobby',
      },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should handle session not found', async () => {
    const mockCtx = createMockContext({}, { sessionId: 'nonexistent' });

    mockCtx.env.SessionDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Session not found',
        }),
        { status: 404 },
      ),
    );

    await sessionLoadHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Session not found',
      },
      404,
    );
  });

  it('should reject request without sessionId', async () => {
    const mockCtx = createMockContext({});

    await sessionLoadHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'sessionId required in header or body',
      },
      400,
    );
  });
});

describe('sessionUpdateHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update session with valid patch', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      patch: {
        name: 'Updated Session',
        status: 'in_progress',
        round: 1,
        turn: 2,
      },
    });

    mockCtx.env.SessionDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: 'test-session',
            name: 'Updated Session',
            status: 'in_progress',
            round: 1,
            turn: 2,
          },
          serverTs: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    await sessionUpdateHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: {
        id: 'test-session',
        name: 'Updated Session',
        status: 'in_progress',
        round: 1,
        turn: 2,
      },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should handle partial updates', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      patch: {
        name: 'Only Name Updated',
      },
    });

    await sessionUpdateHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
  });

  it('should reject invalid sessionId', async () => {
    const mockCtx = createMockContext({
      sessionId: 'invalid-uuid',
      patch: {
        name: 'Updated',
      },
    });

    await sessionUpdateHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String),
      }),
      400,
    );
  });
});

describe('sessionEndHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should end session with reason', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      reason: 'Game completed',
    });

    mockCtx.env.SessionDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { ended: true, reason: 'Game completed' },
          serverTs: '2024-01-01T00:00:00Z',
        }),
      ),
    );

    await sessionEndHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    expect(mockCtx.json).toHaveBeenCalledWith({
      success: true,
      data: { ended: true, reason: 'Game completed' },
      serverTs: '2024-01-01T00:00:00Z',
    });
  });

  it('should end session without reason', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
    });

    await sessionEndHandler(mockCtx as any);

    expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
  });

  it('should handle SessionDO failure', async () => {
    const mockCtx = createMockContext({
      sessionId: 'test-session',
      reason: 'Game completed',
    });

    mockCtx.env.SessionDO.get().fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to end session',
        }),
        { status: 500 },
      ),
    );

    await sessionEndHandler(mockCtx as any);

    expect(mockCtx.json).toHaveBeenCalledWith(
      {
        success: false,
        error: 'Failed to end session',
      },
      500,
    );
  });
});
