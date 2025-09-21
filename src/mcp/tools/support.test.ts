import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  supportTestHandler,
  testOfWillHandler,
  commonEdgesHandler,
} from './support';
import {
  createMockContext,
  createMockDOResponse,
  generateTestUUID,
} from '../../test-utils';

describe('Support MCP Tools', () => {
  const testSessionId = generateTestUUID();
  const testActorId1 = generateTestUUID();
  const testActorId2 = generateTestUUID();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('supportTestHandler', () => {
    it('should perform support test successfully', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        supporterId: testActorId1,
        supportedId: testActorId2,
        skill: 'Fighting',
        difficulty: 4,
      });

      const mockSupporter = {
        id: testActorId1,
        skills: [{ name: 'Fighting', die: 'd8' }],
        wildCard: true,
      };

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(createMockDOResponse(mockSupporter)),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      const mockRngDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            results: [[6, 4]], // d8 + d6 = 10
            total: 10,
          }),
        ),
      };
      mockCtx.env.RngDO.get.mockReturnValue(mockRngDO);

      await supportTestHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          roll: {
            dice: [6, 4],
            total: 10,
            targetNumber: 4,
            success: true,
            raises: 1, // 10 - 4 = 6, so 1 raise
          },
          supportBonus: 2, // +1 for success + 1 for raise
          explanation: 'Support test succeeded! +2 bonus to supported actor',
        },
        serverTs: expect.any(String),
      });
    });

    it('should handle support test failure', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        supporterId: testActorId1,
        supportedId: testActorId2,
        skill: 'Fighting',
        difficulty: 4,
      });

      const mockSupporter = {
        id: testActorId1,
        skills: [{ name: 'Fighting', die: 'd8' }],
        wildCard: true,
      };

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(createMockDOResponse(mockSupporter)),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      const mockRngDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            results: [[2, 1]], // d8 + d6 = 3
            total: 3,
          }),
        ),
      };
      mockCtx.env.RngDO.get.mockReturnValue(mockRngDO);

      await supportTestHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          roll: {
            dice: [2, 1],
            total: 3,
            targetNumber: 4,
            success: false,
            raises: 0,
          },
          supportBonus: 0,
          explanation: 'Support test failed. No bonus.',
        },
        serverTs: expect.any(String),
      });
    });
  });

  describe('testOfWillHandler', () => {
    it('should perform test of will successfully', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actorId: testActorId1,
        difficulty: 4,
        opposedBy: testActorId2,
      });

      const mockActor = {
        id: testActorId1,
        traits: { Spirit: 'd8' },
        wildCard: true,
      };

      const mockOpponent = {
        id: testActorId2,
        traits: { Spirit: 'd6' },
        wildCard: true,
      };

      const mockSessionDO = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce(createMockDOResponse(mockActor)) // Get actor
          .mockResolvedValueOnce(createMockDOResponse(mockOpponent)), // Get opponent
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      const mockRngDO = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce(
            createMockDOResponse({
              results: [[6, 4]], // Actor: d8 + d6 = 10
              total: 10,
            }),
          )
          .mockResolvedValueOnce(
            createMockDOResponse({
              results: [[4, 3]], // Opponent: d6 + d6 = 7
              total: 7,
            }),
          ),
      };
      mockCtx.env.RngDO.get.mockReturnValue(mockRngDO);

      await testOfWillHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          actorRoll: {
            dice: [6, 4],
            total: 10,
            targetNumber: 4,
            success: true,
            raises: 1,
          },
          opponentRoll: {
            dice: [4, 3],
            total: 7,
            targetNumber: 4,
            success: true,
            raises: 0,
          },
          result: 'success', // 10 > 7
          explanation: 'Test of Will: Actor wins opposed roll',
        },
        serverTs: expect.any(String),
      });
    });
  });

  describe('commonEdgesHandler', () => {
    it('should apply Level Headed edge correctly', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actorId: testActorId1,
        edge: 'Level Headed',
        context: 'initiative',
      });

      const mockActor = {
        id: testActorId1,
        edges: ['Level Headed'],
        wildCard: true,
      };

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(createMockDOResponse(mockActor)),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await commonEdgesHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          edge: 'Level Headed',
          effect: 'extra_initiative_draw',
          extraDraws: 1,
          explanation:
            'Level Headed: Draw an extra initiative card and keep the best.',
        },
        serverTs: expect.any(String),
      });
    });

    it('should apply Quick edge correctly', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actorId: testActorId1,
        edge: 'Quick',
        context: 'initiative',
      });

      const mockActor = {
        id: testActorId1,
        edges: ['Quick'],
        wildCard: true,
      };

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(createMockDOResponse(mockActor)),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await commonEdgesHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          edge: 'Quick',
          effect: 'extra_initiative_draw',
          extraDraws: 1,
          explanation:
            'Quick: Draw an extra initiative card and keep the best.',
        },
        serverTs: expect.any(String),
      });
    });

    it('should apply Improved Level Headed edge correctly', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actorId: testActorId1,
        edge: 'Improved Level Headed',
        context: 'initiative',
      });

      const mockActor = {
        id: testActorId1,
        edges: ['Improved Level Headed'],
        wildCard: true,
      };

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(createMockDOResponse(mockActor)),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await commonEdgesHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          edge: 'Improved Level Headed',
          effect: 'extra_initiative_draw',
          extraDraws: 2,
          explanation:
            'Improved Level Headed: Draw two extra initiative cards and keep the best.',
        },
        serverTs: expect.any(String),
      });
    });

    it('should handle unknown edge', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actorId: testActorId1,
        edge: 'Unknown Edge',
        context: 'general',
      });

      const mockActor = {
        id: testActorId1,
        edges: ['Unknown Edge'],
        wildCard: true,
      };

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(createMockDOResponse(mockActor)),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await commonEdgesHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Unknown edge or no effect for this context',
        },
        400,
      );
    });
  });
});
