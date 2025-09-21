import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import { DeckDO } from './DeckDO';

// Mock storage that actually stores data
const mockStorage = new Map<string, any>();

// Mock DurableObjectState
const mockState = {
  storage: {
    put: vi.fn().mockImplementation(async (key, value) => {
      console.log('Mock storage put called with key:', key, 'value:', value);
      mockStorage.set(key, value);
    }),
    get: vi.fn().mockImplementation(async (key) => {
      console.log(
        'Mock storage get called with key:',
        key,
        'returning:',
        mockStorage.get(key),
      );
      return mockStorage.get(key) || null;
    }),
    delete: vi.fn().mockImplementation(async (key) => {
      mockStorage.delete(key);
    }),
    list: vi.fn().mockResolvedValue([]),
  },
};

// Mock environment
const mockEnv = {};

describe('DeckDO', () => {
  let deckDO: DeckDO;

  beforeAll(() => {
    deckDO = new DeckDO(mockState as any, mockEnv);
  });

  beforeEach(() => {
    // Clear mock storage before each test
    mockStorage.clear();
  });

  describe('handleReset', () => {
    it('should create a standard deck with jokers', async () => {
      const request = new Request('http://deck/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          useJokers: true,
          sessionId: 'test-session',
        }),
      });

      const response = await deckDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('cards');
      expect(result.data).toHaveProperty('discard');
      expect(result.data).toHaveProperty('dealt');
      expect(Array.isArray(result.data.cards)).toBe(true);
      expect(result.data.cards).toHaveLength(54); // 52 cards + 2 jokers

      // Check for jokers
      const jokers = result.data.cards.filter(
        (card: any) => card.rank === 'Joker',
      );
      expect(jokers).toHaveLength(2);

      // Check for all standard cards
      const ranks = [
        'A',
        'K',
        'Q',
        'J',
        '10',
        '9',
        '8',
        '7',
        '6',
        '5',
        '4',
        '3',
        '2',
      ];
      const suits = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];

      for (const suit of suits) {
        for (const rank of ranks) {
          const card = result.data.cards.find(
            (c: any) => c.rank === rank && c.suit === suit,
          );
          expect(card).toBeDefined();
          expect(card.id).toBeDefined();
        }
      }
    });

    it('should create a deck without jokers', async () => {
      const request = new Request('http://deck/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          useJokers: false,
          sessionId: 'test-session',
        }),
      });

      const response = await deckDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data.cards).toHaveLength(52); // 52 cards, no jokers

      const jokers = result.data.cards.filter(
        (card: any) => card.rank === 'Joker',
      );
      expect(jokers).toHaveLength(0);
    });

    it('should shuffle deck on reset', async () => {
      // Reset deck twice and compare order
      const request1 = new Request('http://deck/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          useJokers: true,
          sessionId: 'test-session-1',
        }),
      });

      const request2 = new Request('http://deck/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          useJokers: true,
          sessionId: 'test-session-2',
        }),
      });

      const response1 = await deckDO.fetch(request1);
      const response2 = await deckDO.fetch(request2);
      const result1 = (await response1.json()) as any;
      const result2 = (await response2.json()) as any;

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Decks should be different (high probability)
      const cards1 = result1.data.cards.map((c: any) => `${c.rank}${c.suit}`);
      const cards2 = result2.data.cards.map((c: any) => `${c.rank}${c.suit}`);
      expect(cards1).not.toEqual(cards2);
    });
  });

  describe('handleDeal', () => {
    beforeEach(async () => {
      // Reset deck first
      const resetRequest = new Request('http://deck/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          useJokers: true,
          sessionId: 'test-session',
        }),
      });
      const resetResponse = await deckDO.fetch(resetRequest);
      const resetResult = (await resetResponse.json()) as any;

      if (!resetResult.success) {
        throw new Error(
          `Reset failed: ${JSON.stringify(resetResult, null, 2)}`,
        );
      }
    });

    it('should deal cards to participants', async () => {
      // Create a fresh DeckDO instance for this test
      const freshDeckDO = new DeckDO(mockState as any, mockEnv);

      // Reset deck first
      const resetRequest = new Request('http://deck/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          useJokers: true,
          sessionId: 'test-session',
        }),
      });
      const resetResponse = await freshDeckDO.fetch(resetRequest);
      const resetResult = (await resetResponse.json()) as any;

      if (!resetResult.success) {
        throw new Error(
          `Reset failed: ${JSON.stringify(resetResult, null, 2)}`,
        );
      }

      // Check what's in the mock storage
      const storedData = mockStorage.get('deckState');
      if (!storedData) {
        throw new Error('No data stored in mock storage after reset');
      }

      const request = new Request('http://deck/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: ['actor1', 'actor2'],
          extra: {},
        }),
      });

      const response = await freshDeckDO.fetch(request);
      const result = (await response.json()) as any;

      if (!result.success) {
        throw new Error(`Deal failed: ${JSON.stringify(result, null, 2)}`);
      }
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('dealt');
      expect(result.data.dealt).toHaveProperty('actor1');
      expect(result.data.dealt).toHaveProperty('actor2');
      expect(result.data.dealt.actor1).toHaveProperty('rank');
      expect(result.data.dealt.actor1).toHaveProperty('suit');
      expect(result.data.dealt.actor1).toHaveProperty('id');

      // Cards should be different
      expect(result.data.dealt.actor1.rank).not.toBe(
        result.data.dealt.actor2.rank,
      );
    });

    it('should handle extra draws for specific actors', async () => {
      const request = new Request('http://deck/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: ['actor1'],
          extra: { actor1: 1 }, // Level Headed Edge
        }),
      });

      const response = await deckDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data.dealt.actor1).toBeDefined();
    });

    it('should reduce deck size when dealing', async () => {
      // Get initial deck size
      const stateRequest = new Request('http://deck/state', { method: 'GET' });
      const stateResponse = await deckDO.fetch(stateRequest);
      const stateResult = (await stateResponse.json()) as any;
      const initialSize = stateResult.data.cards.length;

      // Deal cards
      const dealRequest = new Request('http://deck/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: ['actor1', 'actor2'],
          extra: {},
        }),
      });
      await deckDO.fetch(dealRequest);

      // Check deck size reduced
      const newStateResponse = await deckDO.fetch(stateRequest);
      const newStateResult = (await newStateResponse.json()) as any;
      const newSize = newStateResult.data.cards.length;

      expect(newSize).toBe(initialSize - 2);
    });

    it('should handle dealing to many participants', async () => {
      const participants = Array.from(
        { length: 10 },
        (_, i) => `actor${i + 1}`,
      );

      const request = new Request('http://deck/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: participants,
          extra: {},
        }),
      });

      const response = await deckDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(Object.keys(result.data.dealt)).toHaveLength(10);

      // All actors should have different cards
      const dealtCards = Object.values(result.data.dealt);
      const uniqueCards = new Set(dealtCards.map((card: any) => card.id));
      expect(uniqueCards.size).toBe(10);
    });

    it('should reject deal if deck not initialized', async () => {
      // Create new deck DO without initializing
      const newDeckDO = new DeckDO(mockState as any, mockEnv);
      storedState = null;

      const request = new Request('http://deck/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: ['actor1'],
          extra: {},
        }),
      });

      const response = await newDeckDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('No deck initialized');
    });
  });

  describe('handleRecall', () => {
    beforeEach(async () => {
      // Reset and deal cards first
      const resetRequest = new Request('http://deck/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          useJokers: true,
          sessionId: 'test-session',
        }),
      });
      await deckDO.fetch(resetRequest);

      const dealRequest = new Request('http://deck/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: ['actor1'],
          extra: {},
        }),
      });
      await deckDO.fetch(dealRequest);
    });

    it('should recall a dealt card', async () => {
      const request = new Request('http://deck/recall', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          actorId: 'actor1',
        }),
      });

      const response = await deckDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('recalled');
      expect(result.data.recalled).toHaveProperty('rank');
      expect(result.data.recalled).toHaveProperty('suit');
      expect(result.data.recalled).toHaveProperty('id');
    });

    it('should reject recall for actor without card', async () => {
      const request = new Request('http://deck/recall', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          actorId: 'nonexistent',
        }),
      });

      const response = await deckDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('No card found for actor');
    });

    it('should remove card from dealt when recalled', async () => {
      // Get initial dealt state
      const stateRequest = new Request('http://deck/state', { method: 'GET' });
      const stateResponse = await deckDO.fetch(stateRequest);
      const stateResult = (await stateResponse.json()) as any;
      const initialDealt = Object.keys(stateResult.data.dealt).length;

      // Recall card
      const recallRequest = new Request('http://deck/recall', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          actorId: 'actor1',
        }),
      });
      await deckDO.fetch(recallRequest);

      // Check dealt state
      const newStateResponse = await deckDO.fetch(stateRequest);
      const newStateResult = (await newStateResponse.json()) as any;
      const newDealt = Object.keys(newStateResult.data.dealt).length;

      expect(newDealt).toBe(initialDealt - 1);
      expect(newStateResult.data.dealt.actor1).toBeUndefined();
    });
  });

  describe('handleGetState', () => {
    it('should return deck state after reset', async () => {
      // Reset deck first
      const resetRequest = new Request('http://deck/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          useJokers: true,
          sessionId: 'test-session',
        }),
      });
      await deckDO.fetch(resetRequest);

      const request = new Request('http://deck/state', {
        method: 'GET',
      });

      const response = await deckDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('cards');
      expect(result.data).toHaveProperty('discard');
      expect(result.data).toHaveProperty('dealt');
      expect(result.data).toHaveProperty('lastJokerRound');
      expect(result.data).toHaveProperty('updatedAt');
    });

    it('should return error if no deck initialized', async () => {
      const newDeckDO = new DeckDO(mockState as any, mockEnv);
      storedState = null;

      const request = new Request('http://deck/state', {
        method: 'GET',
      });

      const response = await newDeckDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('No deck initialized');
    });

    it('should track joker rounds correctly', async () => {
      // Reset deck
      const resetRequest = new Request('http://deck/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          useJokers: true,
          sessionId: 'test-session',
        }),
      });
      await deckDO.fetch(resetRequest);

      // Deal cards until we get a joker
      let jokerFound = false;
      let round = 0;

      while (!jokerFound && round < 10) {
        const dealRequest = new Request('http://deck/deal', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            to: ['actor1'],
            extra: {},
          }),
        });

        const dealResponse = await deckDO.fetch(dealRequest);
        const dealResult = (await dealResponse.json()) as any;

        if (dealResult.data.dealt.actor1.rank === 'Joker') {
          jokerFound = true;
        }
        round++;
      }

      // Check state
      const stateRequest = new Request('http://deck/state', { method: 'GET' });
      const stateResponse = await deckDO.fetch(stateRequest);
      const stateResult = (await stateResponse.json()) as any;

      if (jokerFound) {
        expect(stateResult.data.lastJokerRound).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const request = new Request('http://deck/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      });

      const response = await deckDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unknown endpoints', async () => {
      const request = new Request('http://deck/unknown', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await deckDO.fetch(request);

      expect(response.status).toBe(404);
    });

    it('should handle missing required fields', async () => {
      const request = new Request('http://deck/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          // Missing 'to' field
          extra: {},
        }),
      });

      const response = await deckDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
