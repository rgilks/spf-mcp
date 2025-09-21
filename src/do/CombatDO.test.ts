import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatDO } from './CombatDO';

// Mock DurableObjectState
const mockState = {
  storage: {
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
};

// Mock environment
const createMockEnv = () => ({
  DeckDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockImplementation(async (req) => {
        const url = new URL(req.url);
        const path = url.pathname;

        if (path.includes('/deal')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                dealt: {
                  actor1: { rank: 'K', suit: 'Spades', id: 'card1' },
                  actor2: { rank: 'Q', suit: 'Hearts', id: 'card2' },
                  actor3: { rank: 'J', suit: 'Diamonds', id: 'card3' },
                },
              },
            }),
          );
        }

        if (path.includes('/state')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                dealt: {
                  actor1: { rank: 'K', suit: 'Spades', id: 'card1' },
                  actor2: { rank: 'Q', suit: 'Hearts', id: 'card2' },
                  actor3: { rank: 'J', suit: 'Diamonds', id: 'card3' },
                },
                lastJokerRound: -1,
              },
            }),
          );
        }

        if (path.includes('/reset')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: { reset: true },
            }),
          );
        }

        return new Response(JSON.stringify({ success: true, data: {} }));
      }),
    }),
    idFromName: vi.fn(),
  },
});

describe('CombatDO', () => {
  let combatDO: CombatDO;
  let mockEnv: any;
  let storedState: any = null;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv = createMockEnv();

    // Mock storage to actually store and retrieve state
    mockState.storage.put = vi.fn().mockImplementation(async (key, value) => {
      if (key === 'combatState') {
        storedState = value;
      }
    });

    mockState.storage.get = vi.fn().mockImplementation(async (key) => {
      if (key === 'combatState') {
        return storedState;
      }
      return null;
    });

    combatDO = new CombatDO(mockState as any, mockEnv);
  });

  describe('handleStart', () => {
    it('should start combat with participants', async () => {
      const request = new Request('http://combat/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          participants: ['actor1', 'actor2', 'actor3'],
          options: {},
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('sessionId', 'test-session');
      expect(result.data).toHaveProperty('status', 'idle');
      expect(result.data).toHaveProperty('round', 0);
      expect(result.data).toHaveProperty('turn', 0);
      expect(result.data).toHaveProperty('participants');
      expect(result.data.participants).toEqual(['actor1', 'actor2', 'actor3']);
      expect(result.data).toHaveProperty('hold');
      expect(Array.isArray(result.data.hold)).toBe(true);
    });

    it('should handle start with options', async () => {
      const request = new Request('http://combat/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          participants: ['actor1'],
          options: { customRule: 'test' },
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data.participants).toEqual(['actor1']);
    });
  });

  describe('handleDeal', () => {
    beforeEach(async () => {
      // Start combat first
      const startRequest = new Request('http://combat/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          participants: ['actor1', 'actor2', 'actor3'],
        }),
      });
      await combatDO.fetch(startRequest);
    });

    it('should deal initiative cards and sort by value', async () => {
      const request = new Request('http://combat/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          extraDraws: {},
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('status', 'round_start');
      expect(result.data).toHaveProperty('round', 1);
      expect(result.data).toHaveProperty('turn', 0);
      expect(result.data).toHaveProperty('dealt');
      expect(result.data).toHaveProperty('turnOrder');
      expect(result.data.turnOrder).toEqual(['actor1', 'actor2', 'actor3']); // K > Q > J
      expect(result.data).toHaveProperty('activeActorId', 'actor1');
    });

    it('should handle extra draws for specific actors', async () => {
      const request = new Request('http://combat/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          extraDraws: { actor1: 1 }, // Level Headed Edge
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(mockEnv.DeckDO.get().fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should reject deal if combat not started', async () => {
      // Create new combat DO without starting
      const newCombatDO = new CombatDO(mockState as any, mockEnv);
      storedState = null; // Reset state

      const request = new Request('http://combat/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          extraDraws: {},
        }),
      });

      const response = await newCombatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Combat not started');
    });

    it('should handle deck deal failure', async () => {
      // Mock deck failure
      mockEnv.DeckDO.get().fetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: 'Deck error',
          }),
        ),
      );

      const request = new Request('http://combat/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          extraDraws: {},
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to deal cards');
    });
  });

  describe('handleHold', () => {
    beforeEach(async () => {
      // Start combat and deal cards
      const startRequest = new Request('http://combat/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          participants: ['actor1', 'actor2'],
        }),
      });
      await combatDO.fetch(startRequest);

      const dealRequest = new Request('http://combat/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          extraDraws: {},
        }),
      });
      await combatDO.fetch(dealRequest);
    });

    it('should put active actor on hold', async () => {
      const request = new Request('http://combat/hold', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor1', // Currently active
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('status', 'on_hold');
      expect(result.data).toHaveProperty('hold');
      expect(result.data.hold).toContain('actor1');
      expect(result.data).toHaveProperty('activeActorId', undefined);
    });

    it('should reject hold if not active actor', async () => {
      const request = new Request('http://combat/hold', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor2', // Not currently active
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Only the active actor can go on hold');
    });

    it('should reject hold if combat not started', async () => {
      const newCombatDO = new CombatDO(mockState as any, mockEnv);
      storedState = null;

      const request = new Request('http://combat/hold', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor1',
        }),
      });

      const response = await newCombatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Combat not started');
    });
  });

  describe('handleInterrupt', () => {
    beforeEach(async () => {
      // Start combat, deal cards, and put actor on hold
      const startRequest = new Request('http://combat/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          participants: ['actor1', 'actor2'],
        }),
      });
      await combatDO.fetch(startRequest);

      const dealRequest = new Request('http/combat/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          extraDraws: {},
        }),
      });
      await combatDO.fetch(dealRequest);

      const holdRequest = new Request('http://combat/hold', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor1',
        }),
      });
      await combatDO.fetch(holdRequest);
    });

    it('should interrupt with actor on hold', async () => {
      const request = new Request('http://combat/interrupt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor1',
          targetActorId: 'actor2',
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('status', 'turn_active');
      expect(result.data).toHaveProperty('activeActorId', 'actor1');
      expect(result.data).toHaveProperty('hold');
      expect(result.data.hold).not.toContain('actor1');
    });

    it('should reject interrupt if actor not on hold', async () => {
      const request = new Request('http://combat/interrupt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor2', // Not on hold
          targetActorId: 'actor1',
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Actor is not on hold');
    });
  });

  describe('handleAdvanceTurn', () => {
    beforeEach(async () => {
      // Start combat and deal cards
      const startRequest = new Request('http://combat/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          participants: ['actor1', 'actor2', 'actor3'],
        }),
      });
      await combatDO.fetch(startRequest);

      const dealRequest = new Request('http://combat/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          extraDraws: {},
        }),
      });
      await combatDO.fetch(dealRequest);
    });

    it('should advance to next actor in turn order', async () => {
      const request = new Request('http://combat/advanceTurn', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('status', 'turn_active');
      expect(result.data).toHaveProperty('activeActorId', 'actor2'); // Next in order
      expect(result.data).toHaveProperty('turn', 1);
    });

    it('should handle end of round when all actors have acted', async () => {
      // Advance through all actors
      for (let i = 0; i < 3; i++) {
        const request = new Request('http://combat/advanceTurn', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'test-session',
          }),
        });
        await combatDO.fetch(request);
      }

      // One more advance should end the round
      const request = new Request('http://combat/advanceTurn', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('status', 'round_end');
      expect(result.data).toHaveProperty('activeActorId', undefined);
    });

    it('should process hold actors at end of round', async () => {
      // Put an actor on hold first
      const holdRequest = new Request('http://combat/hold', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor1',
        }),
      });
      await combatDO.fetch(holdRequest);

      // Advance through remaining actors
      for (let i = 0; i < 2; i++) {
        const request = new Request('http://combat/advanceTurn', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'test-session',
          }),
        });
        await combatDO.fetch(request);
      }

      // Next advance should activate hold actor
      const request = new Request('http://combat/advanceTurn', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('status', 'turn_active');
      expect(result.data).toHaveProperty('activeActorId', 'actor1');
    });

    it('should reject advance turn in invalid state', async () => {
      // Reset to idle state
      storedState = {
        sessionId: 'test-session',
        status: 'idle',
        round: 0,
        turn: 0,
        participants: ['actor1'],
        hold: [],
      };

      const request = new Request('http://combat/advanceTurn', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot advance turn in current state');
    });
  });

  describe('handleEndRound', () => {
    beforeEach(async () => {
      // Start combat
      const startRequest = new Request('http://combat/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          participants: ['actor1', 'actor2'],
        }),
      });
      await combatDO.fetch(startRequest);
    });

    it('should end round and reset for next round', async () => {
      const request = new Request('http://combat/endRound', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('status', 'round_start');
      expect(result.data).toHaveProperty('turn', 0);
      expect(result.data).toHaveProperty('activeActorId', undefined);
      expect(result.data).toHaveProperty('hold');
      expect(Array.isArray(result.data.hold)).toBe(true);
    });

    it('should shuffle deck if Joker was dealt this round', async () => {
      // Mock deck state with Joker dealt this round
      mockEnv.DeckDO.get().fetch = vi.fn().mockImplementation(async (req) => {
        const url = new URL(req.url);
        if (url.pathname.includes('/state')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: {
                dealt: {},
                lastJokerRound: 1, // Joker was dealt this round
              },
            }),
          );
        }
        if (url.pathname.includes('/reset')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: { reset: true },
            }),
          );
        }
        return new Response(JSON.stringify({ success: true, data: {} }));
      });

      // Set current round to 1
      storedState.round = 1;

      const request = new Request('http://combat/endRound', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
        }),
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      // Verify deck reset was called
      expect(mockEnv.DeckDO.get().fetch).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  describe('handleGetState', () => {
    it('should return current combat state', async () => {
      // Start combat first
      const startRequest = new Request('http://combat/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          participants: ['actor1', 'actor2'],
        }),
      });
      await combatDO.fetch(startRequest);

      const request = new Request('http://combat/state', {
        method: 'GET',
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('sessionId', 'test-session');
      expect(result.data).toHaveProperty('status', 'idle');
      expect(result.data).toHaveProperty('participants');
    });

    it('should return error if combat not started', async () => {
      const newCombatDO = new CombatDO(mockState as any, mockEnv);
      storedState = null;

      const request = new Request('http://combat/state', {
        method: 'GET',
      });

      const response = await newCombatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Combat not started');
    });
  });

  describe('sortByCardValue', () => {
    it('should sort participants by card value correctly', () => {
      const participants = ['actor1', 'actor2', 'actor3', 'actor4'];
      const dealt = {
        actor1: { rank: 'K', suit: 'Spades', id: 'card1' },
        actor2: { rank: 'A', suit: 'Hearts', id: 'card2' },
        actor3: { rank: 'J', suit: 'Diamonds', id: 'card3' },
        actor4: { rank: 'K', suit: 'Hearts', id: 'card4' },
      };

      // Access private method through any cast
      const sorted = (combatDO as any).sortByCardValue(participants, dealt);

      // A > K > J, and K Spades > K Hearts
      expect(sorted).toEqual(['actor2', 'actor1', 'actor4', 'actor3']);
    });

    it('should handle Jokers correctly', () => {
      const participants = ['actor1', 'actor2', 'actor3'];
      const dealt = {
        actor1: { rank: 'A', suit: 'Spades', id: 'card1' },
        actor2: { rank: 'Joker', suit: null, id: 'card2' },
        actor3: { rank: 'K', suit: 'Hearts', id: 'card3' },
      };

      const sorted = (combatDO as any).sortByCardValue(participants, dealt);

      // Joker should be first
      expect(sorted).toEqual(['actor2', 'actor1', 'actor3']);
    });

    it('should handle missing cards gracefully', () => {
      const participants = ['actor1', 'actor2', 'actor3'];
      const dealt = {
        actor1: { rank: 'K', suit: 'Spades', id: 'card1' },
        // actor2 missing card
        actor3: { rank: 'J', suit: 'Diamonds', id: 'card3' },
      };

      const sorted = (combatDO as any).sortByCardValue(participants, dealt);

      // Should not crash and should handle missing cards
      expect(sorted).toHaveLength(3);
      expect(sorted).toContain('actor1');
      expect(sorted).toContain('actor2');
      expect(sorted).toContain('actor3');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const request = new Request('http://combat/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      });

      const response = await combatDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unknown endpoints', async () => {
      const request = new Request('http://combat/unknown', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await combatDO.fetch(request);

      expect(response.status).toBe(404);
    });
  });
});
