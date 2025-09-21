import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  sessionCreateHandler,
  sessionLoadHandler,
  sessionUpdateHandler,
  sessionEndHandler,
} from './session';
import {
  createMockContext,
  createMockDOResponse,
  generateTestUUID,
} from '../../test-utils';

describe('Session MCP Tools', () => {
  const testSessionId = generateTestUUID();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sessionCreateHandler', () => {
    it('should create session with valid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        name: 'Test Session',
        grid: {
          unit: 'inch',
          scale: 1,
          cols: 20,
          rows: 20,
        },
      });

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            id: testSessionId,
            name: 'Test Session',
            status: 'lobby',
          }),
        ),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await sessionCreateHandler(mockCtx as any);

      expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: testSessionId,
          name: 'Test Session',
          status: 'lobby',
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle invalid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        name: 'Test Session',
        grid: {
          unit: 'invalid',
          scale: -1,
          cols: 0,
          rows: 0,
        },
      });

      await sessionCreateHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
        500,
      );
    });
  });

  describe('sessionLoadHandler', () => {
    it('should load session by ID', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.param.mockReturnValue(testSessionId);

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            id: testSessionId,
            name: 'Test Session',
            status: 'lobby',
          }),
        ),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await sessionLoadHandler(mockCtx as any);

      expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: testSessionId,
          name: 'Test Session',
          status: 'lobby',
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle session not found', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.param.mockReturnValue(testSessionId);

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              error: 'Session not found',
            }),
            { status: 404 },
          ),
        ),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await sessionLoadHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith(
        {
          success: false,
          error: { error: 'Session not found' },
        },
        404,
      );
    });

    it('should reject request without sessionId', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.param.mockReturnValue(undefined);

      await sessionLoadHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'sessionId parameter required',
        },
        400,
      );
    });
  });

  describe('sessionUpdateHandler', () => {
    it('should update session with valid patch', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        patch: {
          name: 'Updated Session',
          round: 1,
          status: 'in_progress',
          turn: 2,
        },
      });

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            id: testSessionId,
            name: 'Updated Session',
            round: 1,
            status: 'in_progress',
            turn: 2,
          }),
        ),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await sessionUpdateHandler(mockCtx as any);

      expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: testSessionId,
          name: 'Updated Session',
          round: 1,
          status: 'in_progress',
          turn: 2,
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle partial updates', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        patch: {
          name: 'Updated Session',
        },
      });

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            id: testSessionId,
            name: 'Updated Session',
          }),
        ),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await sessionUpdateHandler(mockCtx as any);

      expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    });

    it('should reject invalid sessionId', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: 'invalid-uuid',
        name: 'Updated Session',
      });

      await sessionUpdateHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
        500,
      );
    });
  });

  describe('sessionEndHandler', () => {
    it('should end session', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
      });

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            id: testSessionId,
            status: 'ended',
          }),
        ),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await sessionEndHandler(mockCtx as any);

      expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: testSessionId,
          status: 'ended',
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should reject invalid sessionId', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: 'invalid-uuid',
      });

      await sessionEndHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.any(String),
        }),
        500,
      );
    });
  });
});
