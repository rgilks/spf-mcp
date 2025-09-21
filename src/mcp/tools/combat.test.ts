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
import {
  createMockContext,
  createMockDOResponse,
  generateTestUUID,
} from '../../test-utils';

describe('Combat MCP Tools', () => {
  const testSessionId = generateTestUUID();
  const testActorId1 = generateTestUUID();
  const testActorId2 = generateTestUUID();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('combatStartHandler', () => {
    it('should start combat with valid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        participants: [testActorId1, testActorId2],
      });

      const mockCombatDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            participants: [testActorId1, testActorId2],
            status: 'idle',
            round: 0,
            turn: 0,
          }),
        ),
      };
      mockCtx.env.CombatDO.get.mockReturnValue(mockCombatDO);
      mockCtx.env.CombatDO.idFromName.mockReturnValue('mock-combat-id');

      await combatStartHandler(mockCtx as any);

      expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          participants: [testActorId1, testActorId2],
          status: 'idle',
          round: 0,
          turn: 0,
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should reject invalid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: 'invalid-uuid',
        participants: ['invalid-uuid'],
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
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        participants: [testActorId1, testActorId2],
      });

      const mockCombatDO = {
        fetch: vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              error: 'Combat start failed',
            }),
            { status: 500 },
          ),
        ),
      };
      mockCtx.env.CombatDO.get.mockReturnValue(mockCombatDO);
      mockCtx.env.CombatDO.idFromName.mockReturnValue('mock-combat-id');

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
    it('should deal initiative cards', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
      });

      const mockCombatDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            dealt: {
              [testActorId1]: { id: 'card1', rank: 'K', suit: 'Spades' },
              [testActorId2]: { id: 'card2', rank: 'Q', suit: 'Hearts' },
            },
            round: 1,
            status: 'round_start',
            turn: 0,
            turnOrder: [testActorId1, testActorId2],
          }),
        ),
      };
      mockCtx.env.CombatDO.get.mockReturnValue(mockCombatDO);
      mockCtx.env.CombatDO.idFromName.mockReturnValue('mock-combat-id');

      await combatDealHandler(mockCtx as any);

      expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          dealt: {
            [testActorId1]: { id: 'card1', rank: 'K', suit: 'Spades' },
            [testActorId2]: { id: 'card2', rank: 'Q', suit: 'Hearts' },
          },
          round: 1,
          status: 'round_start',
          turn: 0,
          turnOrder: [testActorId1, testActorId2],
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle extra draws', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        extraDraws: { [testActorId1]: 1 },
      });

      const mockCombatDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            dealt: {
              [testActorId1]: { id: 'card1', rank: 'K', suit: 'Spades' },
              [testActorId2]: { id: 'card2', rank: 'Q', suit: 'Hearts' },
            },
            round: 1,
            status: 'round_start',
            turn: 0,
            turnOrder: [testActorId1, testActorId2],
          }),
        ),
      };
      mockCtx.env.CombatDO.get.mockReturnValue(mockCombatDO);
      mockCtx.env.CombatDO.idFromName.mockReturnValue('mock-combat-id');

      await combatDealHandler(mockCtx as any);

      expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
    });

    it('should reject invalid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: 'invalid-uuid',
        extraDraws: 'invalid',
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
    it('should put actor on hold', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actorId: testActorId1,
      });

      const mockCombatDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            activeActorId: undefined,
            hold: [testActorId1],
            status: 'on_hold',
          }),
        ),
      };
      mockCtx.env.CombatDO.get.mockReturnValue(mockCombatDO);
      mockCtx.env.CombatDO.idFromName.mockReturnValue('mock-combat-id');

      await combatHoldHandler(mockCtx as any);

      expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          hold: [testActorId1],
          status: 'on_hold',
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should reject invalid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
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
    it('should interrupt with actor on hold', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actorId: testActorId1,
        targetActorId: testActorId2,
      });

      const mockCombatDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            activeActorId: testActorId1,
            hold: [],
            status: 'turn_active',
          }),
        ),
      };
      mockCtx.env.CombatDO.get.mockReturnValue(mockCombatDO);
      mockCtx.env.CombatDO.idFromName.mockReturnValue('mock-combat-id');

      await combatInterruptHandler(mockCtx as any);

      expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          activeActorId: testActorId1,
          hold: [],
          status: 'turn_active',
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should reject invalid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
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
    it('should advance turn', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
      });

      const mockCombatDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            participants: [testActorId1, testActorId2],
            status: 'idle',
            round: 0,
            turn: 0,
          }),
        ),
      };
      mockCtx.env.CombatDO.get.mockReturnValue(mockCombatDO);
      mockCtx.env.CombatDO.idFromName.mockReturnValue('mock-combat-id');

      await combatAdvanceTurnHandler(mockCtx as any);

      expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          participants: [testActorId1, testActorId2],
          status: 'idle',
          round: 0,
          turn: 0,
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should reject invalid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
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
    it('should end round', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
      });

      const mockCombatDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            participants: [testActorId1, testActorId2],
            status: 'idle',
            round: 0,
            turn: 0,
          }),
        ),
      };
      mockCtx.env.CombatDO.get.mockReturnValue(mockCombatDO);
      mockCtx.env.CombatDO.idFromName.mockReturnValue('mock-combat-id');

      await combatEndRoundHandler(mockCtx as any);

      expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          participants: [testActorId1, testActorId2],
          status: 'idle',
          round: 0,
          turn: 0,
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should reject invalid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
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
    it('should return current combat state', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.param.mockReturnValue(testSessionId);

      const mockCombatDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            hold: [],
            participants: [testActorId1, testActorId2],
            round: 0,
            status: 'idle',
            turn: 0,
          }),
        ),
      };
      mockCtx.env.CombatDO.get.mockReturnValue(mockCombatDO);
      mockCtx.env.CombatDO.idFromName.mockReturnValue('mock-combat-id');

      await combatStateHandler(mockCtx as any);

      expect(mockCtx.env.CombatDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          hold: [],
          participants: [testActorId1, testActorId2],
          round: 0,
          status: 'idle',
          turn: 0,
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle combat not started', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.param.mockReturnValue(testSessionId);

      const mockCombatDO = {
        fetch: vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              success: false,
              error: 'Combat not started',
            }),
            { status: 404 },
          ),
        ),
      };
      mockCtx.env.CombatDO.get.mockReturnValue(mockCombatDO);
      mockCtx.env.CombatDO.idFromName.mockReturnValue('mock-combat-id');

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
      const mockCtx = createMockContext();
      mockCtx.req.param.mockReturnValue(undefined);

      await combatStateHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'sessionId parameter required',
        },
        400,
      );
    });
  });
});
