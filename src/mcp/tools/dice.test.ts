import { describe, it, expect, beforeEach, vi } from 'vitest';
import { diceRollHandler } from './dice';
import {
  createMockContext,
  createMockDOResponse,
  generateTestUUID,
} from '../../test-utils';

describe('Dice MCP Tools', () => {
  const testSessionId = generateTestUUID();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('diceRollHandler', () => {
    it('should roll dice with valid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        formula: '1d6',
        explode: true,
        wildDie: null,
        seed: 'test-seed',
      });
      mockCtx.req.header.mockReturnValue(testSessionId);

      const mockRngDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            total: 8,
            rolls: [6],
            modifier: 2,
            reason: 'Test roll',
          }),
        ),
      };
      mockCtx.env.RngDO.get.mockReturnValue(mockRngDO);

      await diceRollHandler(mockCtx as any);

      expect(mockCtx.env.RngDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          total: 8,
          rolls: [6],
          modifier: 2,
          reason: 'Test roll',
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle missing sessionId', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        formula: '1d6',
        explode: true,
        wildDie: null,
      });
      mockCtx.req.header.mockReturnValue(undefined);

      await diceRollHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'sessionId required in header or body',
        },
        400,
      );
    });

    it('should handle RNG errors', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        formula: '1d6',
        explode: true,
        wildDie: null,
      });
      mockCtx.req.header.mockReturnValue(testSessionId);

      const mockRngDO = {
        fetch: vi
          .fn()
          .mockResolvedValue(
            createMockDOResponse('RNG service unavailable', false, 500),
          ),
      };
      mockCtx.env.RngDO.get.mockReturnValue(mockRngDO);

      await diceRollHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'RNG service unavailable',
        },
        500,
      );
    });

    it('should handle invalid JSON', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockRejectedValue(new Error('Invalid JSON'));

      await diceRollHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Invalid JSON',
        },
        500,
      );
    });

    it('should handle network errors', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        formula: '1d6',
        explode: true,
        wildDie: null,
      });
      mockCtx.req.header.mockReturnValue(testSessionId);

      const mockRngDO = {
        fetch: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      mockCtx.env.RngDO.get.mockReturnValue(mockRngDO);

      await diceRollHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Network error',
        },
        500,
      );
    });

    it('should pass through all RNG parameters', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        formula: '2d6+1',
        explode: true,
        wildDie: 'd6',
        seed: 'test-seed',
      });
      mockCtx.req.header.mockReturnValue(testSessionId);

      const mockRngDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            total: 10,
            rolls: [4, 2],
            modifier: 3,
            reason: 'Combat roll',
          }),
        ),
      };
      mockCtx.env.RngDO.get.mockReturnValue(mockRngDO);

      await diceRollHandler(mockCtx as any);

      expect(mockRngDO.fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
        }),
      );

      const fetchCall = mockRngDO.fetch.mock.calls[0][0];
      expect(fetchCall.url).toBe('http://rng/roll');
      expect(fetchCall.method).toBe('POST');
    });
  });
});
