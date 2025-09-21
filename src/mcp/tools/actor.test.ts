import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  actorUpsertHandler,
  actorRollTraitHandler,
  actorApplyEffectHandler,
  actorMoveHandler,
  actorsListHandler,
} from './actor';
import {
  createMockContext,
  createMockDOResponse,
  generateTestUUID,
} from '../../test-utils';

describe('Actor MCP Tools', () => {
  const testSessionId = generateTestUUID();
  const testActorId = generateTestUUID();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('actorUpsertHandler', () => {
    it('should create actor with valid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actor: {
          type: 'pc',
          name: 'Test Actor',
          wildCard: true,
          traits: {
            strength: 'd6',
            agility: 'd8',
          },
          skills: [],
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
            parry: 4,
            toughness: 6,
            armor: 0,
          },
          position: { x: 0, y: 0, facing: 0 },
        },
      });

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            id: testActorId,
            name: 'Test Actor',
            traits: {
              strength: { die: 'd6', mod: 0 },
              agility: { die: 'd8', mod: 1 },
            },
            position: { x: 0, y: 0, facing: 0 },
          }),
        ),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);
      mockCtx.env.SessionDO.idFromName.mockReturnValue('mock-session-id');

      await actorUpsertHandler(mockCtx as any);

      expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: testActorId,
          name: 'Test Actor',
          traits: {
            strength: {
              die: 'd6',
              mod: 0,
            },
            agility: {
              die: 'd8',
              mod: 1,
            },
          },
          position: { x: 0, y: 0, facing: 0 },
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should reject invalid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: 'invalid-uuid',
        actor: {
          id: 'invalid-uuid',
          name: 'Test Actor',
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
  });

  describe('actorRollTraitHandler', () => {
    it('should roll trait with valid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actorId: testActorId,
        trait: 'strength',
        mods: [2],
        rollMode: 'open',
      });

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            total: 8,
            rolls: [6],
            modifier: 2,
            reason: 'Test roll',
          }),
        ),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);
      mockCtx.env.SessionDO.idFromName.mockReturnValue('mock-session-id');

      await actorRollTraitHandler(mockCtx as any);

      expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
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

    it('should reject invalid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: 'invalid-uuid',
        actorId: 'invalid-uuid',
        trait: 'strength',
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

  describe('actorApplyEffectHandler', () => {
    it('should apply effect with valid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actorId: testActorId,
        effect: {
          type: 'damage',
          payload: { value: 2, reason: 'Combat damage' },
        },
      });

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            id: testActorId,
            status: {
              shaken: false,
              stunned: false,
              fatigue: 0,
              wounds: 2,
            },
          }),
        ),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);
      mockCtx.env.SessionDO.idFromName.mockReturnValue('mock-session-id');

      await actorApplyEffectHandler(mockCtx as any);

      expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: testActorId,
          status: {
            shaken: false,
            stunned: false,
            fatigue: 0,
            wounds: 2,
          },
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should reject invalid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: 'invalid-uuid',
        actorId: 'invalid-uuid',
        effect: {
          type: 'damage',
          value: 2,
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

  describe('actorMoveHandler', () => {
    it('should move actor with valid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: testSessionId,
        actorId: testActorId,
        to: { x: 10, y: 5, facing: 90 },
        reason: 'Player movement',
      });

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            id: testActorId,
            position: { x: 10, y: 5, facing: 90 },
          }),
        ),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);
      mockCtx.env.SessionDO.idFromName.mockReturnValue('mock-session-id');

      await actorMoveHandler(mockCtx as any);

      expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          id: testActorId,
          position: { x: 10, y: 5, facing: 90 },
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should reject invalid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.json.mockResolvedValue({
        sessionId: 'invalid-uuid',
        actorId: 'invalid-uuid',
        position: { x: 10, y: 5, facing: 90 },
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

  describe('actorListHandler', () => {
    it('should list actors with valid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.param.mockReturnValue(testSessionId);

      const mockSessionDO = {
        fetch: vi.fn().mockResolvedValue(
          createMockDOResponse({
            actors: [
              {
                id: testActorId,
                name: 'Test Actor',
                position: { x: 0, y: 0, facing: 0 },
              },
            ],
          }),
        ),
      };
      mockCtx.env.SessionDO.get.mockReturnValue(mockSessionDO);
      mockCtx.env.SessionDO.idFromName.mockReturnValue('mock-session-id');

      await actorsListHandler(mockCtx as any);

      expect(mockCtx.env.SessionDO.get).toHaveBeenCalled();
      expect(mockCtx.json).toHaveBeenCalledWith({
        success: true,
        data: {
          actors: [
            {
              id: testActorId,
              name: 'Test Actor',
              position: { x: 0, y: 0, facing: 0 },
            },
          ],
        },
        serverTs: '2024-01-01T00:00:00Z',
      });
    });

    it('should reject invalid input', async () => {
      const mockCtx = createMockContext();
      mockCtx.req.param.mockReturnValue(undefined);

      await actorsListHandler(mockCtx as any);

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
