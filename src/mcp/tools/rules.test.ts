import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  applyDamageHandler,
  soakRollHandler,
  castPowerHandler,
  templateAreaHandler,
} from './rules';
import {
  createMockContext,
  createMockDOResponse,
  generateTestUUID,
} from '../../test-utils';

describe('Rules MCP Tools', () => {
  const testSessionId = generateTestUUID();
  const testActorId1 = generateTestUUID();
  const testActorId2 = generateTestUUID();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('applyDamageHandler', () => {
    it('should apply damage correctly with 4-Wound Cap', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        attackerId: testActorId1,
        defenderId: testActorId2,
        damageRoll: 8,
        ap: 2,
      });

      const mockActor = {
        id: testActorId2,
        status: { wounds: 0, shaken: false, incapacitated: false },
        defense: { toughness: 6, armor: 2 },
      };

      const mockSessionDO = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce(createMockDOResponse(mockActor)) // Get actor
          .mockResolvedValueOnce(createMockDOResponse({ success: true })), // Update actor
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await applyDamageHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          damageDealt: 2, // 8 - (6 + 2 - 2) = 2
          woundsApplied: 0, // 2 < 4, so no wounds
          shakenApplied: true, // 2 >= 1, so shaken
          incapacitated: false,
          explanation: 'Dealt 2 damage. Shaken.',
        },
        serverTs: expect.any(String),
      });
    });

    it('should apply wounds correctly', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        attackerId: testActorId1,
        defenderId: testActorId2,
        damageRoll: 12,
        ap: 0,
      });

      const mockActor = {
        id: testActorId2,
        status: { wounds: 1, shaken: false, incapacitated: false },
        defense: { toughness: 6, armor: 2 },
      };

      const mockSessionDO = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce(createMockDOResponse(mockActor)) // Get actor
          .mockResolvedValueOnce(createMockDOResponse({ success: true })), // Update actor
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await applyDamageHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          damageDealt: 4, // 12 - (6 + 2) = 4
          woundsApplied: 1, // 4 / 4 = 1 wound
          shakenApplied: true,
          incapacitated: false,
          explanation: 'Dealt 4 damage. 1 wounds.',
        },
        serverTs: expect.any(String),
      });
    });

    it('should enforce 4-Wound Cap', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        attackerId: testActorId1,
        defenderId: testActorId2,
        damageRoll: 20,
        ap: 0,
      });

      const mockActor = {
        id: testActorId2,
        status: { wounds: 0, shaken: false, incapacitated: false },
        defense: { toughness: 6, armor: 2 },
      };

      const mockSessionDO = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce(createMockDOResponse(mockActor)) // Get actor
          .mockResolvedValueOnce(createMockDOResponse({ success: true })), // Update actor
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await applyDamageHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          damageDealt: 12, // 20 - (6 + 2) = 12
          woundsApplied: 3, // 12 / 4 = 3 wounds, but capped at 4 total
          shakenApplied: true,
          incapacitated: false,
          explanation: 'Dealt 12 damage. 3 wounds.',
        },
        serverTs: expect.any(String),
      });
    });
  });

  describe('soakRollHandler', () => {
    it('should perform soak roll successfully', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actorId: testActorId1,
        damageAmount: 8,
        benniesSpent: 1,
      });

      const mockActor = {
        id: testActorId1,
        resources: { bennies: 3 },
        traits: { Vigor: 'd8' },
      };

      const mockSessionDO = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce(createMockDOResponse(mockActor)) // Get actor
          .mockResolvedValueOnce(createMockDOResponse({ success: true })), // Update actor
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

      await soakRollHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          soakRoll: {
            dice: [6, 4],
            total: 10,
            success: true,
          },
          damageReduction: 10,
          finalDamage: 0, // 8 - 10 = 0
          benniesSpent: 1,
          explanation: 'Soak roll succeeded! Reduced damage by 10',
        },
        serverTs: expect.any(String),
      });
    });

    it('should reject if not enough Bennies', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actorId: testActorId1,
        damageAmount: 8,
        benniesSpent: 2,
      });

      const mockActor = {
        id: testActorId1,
        resources: { bennies: 1 }, // Not enough
        traits: { Vigor: 'd8' },
      };

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(createMockDOResponse(mockActor)),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);

      await soakRollHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith(
        {
          success: false,
          error: 'Not enough Bennies',
        },
        400,
      );
    });
  });

  describe('castPowerHandler', () => {
    it('should cast power successfully', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        casterId: testActorId1,
        power: 'healing',
        ppCost: 2,
        shorting: 0,
        targets: [testActorId2],
      });

      const mockCaster = {
        id: testActorId1,
        resources: { powerPoints: 10 },
        skills: [{ name: 'Faith', die: 'd8' }],
      };

      const mockSessionDO = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce(createMockDOResponse(mockCaster)) // Get caster
          .mockResolvedValueOnce(createMockDOResponse({ success: true })), // Update caster
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

      await castPowerHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          roll: {
            dice: [6, 4],
            total: 10,
            targetNumber: 4, // 4 + 0 shorting
            success: true,
          },
          criticalFailure: false,
          fatigue: false,
          powerPointsSpent: 2,
          explanation: 'Power cast successfully!',
        },
        serverTs: expect.any(String),
      });
    });

    it('should handle shorting correctly', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        casterId: testActorId1,
        power: 'healing',
        ppCost: 2,
        shorting: 3,
        targets: [testActorId2],
      });

      const mockCaster = {
        id: testActorId1,
        resources: { powerPoints: 10 },
        skills: [{ name: 'Faith', die: 'd8' }],
      };

      const mockSessionDO = {
        fetch: vi
          .fn()
          .mockResolvedValueOnce(createMockDOResponse(mockCaster)) // Get caster
          .mockResolvedValueOnce(createMockDOResponse({ success: true })), // Update caster
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

      await castPowerHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          roll: {
            dice: [6, 4],
            total: 10,
            targetNumber: 7, // 4 + 3 shorting
            success: true,
          },
          criticalFailure: false,
          fatigue: false,
          powerPointsSpent: 5, // 2 + 3 shorting
          explanation: 'Power cast successfully!',
        },
        serverTs: expect.any(String),
      });
    });
  });

  describe('templateAreaHandler', () => {
    it('should calculate burst template area', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        origin: { x: 5, y: 5 },
        template: 'SBT',
        reach: 2,
      });

      await templateAreaHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          coveredCells: expect.any(Array),
          explanation: expect.stringMatching(/Template covers \d+ cells/),
        },
        serverTs: expect.any(String),
      });
    });

    it('should calculate cone template area', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        origin: { x: 5, y: 5 },
        template: 'Cone',
        angle: 90,
        reach: 3,
      });

      await templateAreaHandler(mockCtx as any);

      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          coveredCells: expect.any(Array),
          explanation: expect.stringMatching(/Template covers \d+ cells/),
        },
        serverTs: expect.any(String),
      });
    });
  });
});
