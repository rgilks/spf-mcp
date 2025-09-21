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
      mockCtx.env.SessionDO.idFromName.mockReturnValue('mock-session-id');

      await sessionCreateHandler(mockCtx as unknown);

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

      await expect(sessionCreateHandler(mockCtx as unknown)).rejects.toThrow();
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
      mockCtx.env.SessionDO.idFromName.mockReturnValue('mock-session-id');

      await sessionLoadHandler(mockCtx as unknown);

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
      mockCtx.env.SessionDO.idFromName.mockReturnValue('mock-session-id');

      await sessionLoadHandler(mockCtx as unknown);

      expect(mockCtx.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Session not found',
        },
        404,
      );
    });

    it('should reject request without sessionId', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.param.mockReturnValue(undefined);

      await expect(sessionLoadHandler(mockCtx as unknown)).rejects.toThrow(
        'sessionId parameter required',
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
      mockCtx.env.SessionDO.idFromName.mockReturnValue('mock-session-id');

      await sessionUpdateHandler(mockCtx as unknown);

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
      mockCtx.env.SessionDO.idFromName.mockReturnValue('mock-session-id');

      await sessionUpdateHandler(mockCtx as unknown);

      expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
    });

    it('should reject invalid sessionId', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: 'invalid-uuid',
        name: 'Updated Session',
      });

      await expect(sessionUpdateHandler(mockCtx as unknown)).rejects.toThrow();
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
      mockCtx.env.SessionDO.idFromName.mockReturnValue('mock-session-id');

      await sessionEndHandler(mockCtx as unknown);

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

      await expect(sessionEndHandler(mockCtx as unknown)).rejects.toThrow();
    });
  });
});
