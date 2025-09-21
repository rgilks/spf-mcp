import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DeckDO } from '../DeckDO';

// Mock DurableObjectState
const mockState = {
  storage: {
    put: vi.fn(),
    get: vi.fn().mockResolvedValue(null), // Start with no stored state
    delete: vi.fn(),
    list: vi.fn(),
  },
};

// Mock environment
const mockEnv = {};

describe('DeckDO', () => {
  let deckDO: DeckDO;
  let storedState: any = null;

  beforeAll(() => {
    // Mock storage to actually store and retrieve state
    mockState.storage.put = vi.fn().mockImplementation(async (key, value) => {
      if (key === 'deckState') {
        storedState = value;
      }
    });

    mockState.storage.get = vi.fn().mockImplementation(async (key) => {
      if (key === 'deckState') {
        return storedState;
      }
      return null;
    });

    deckDO = new DeckDO(mockState as any, mockEnv);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Don't reset storedState here - let it persist between tests
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
      const result = await response.json();

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
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.cards).toHaveLength(52); // 52 cards, no jokers

      const jokers = result.data.cards.filter(
        (card: any) => card.rank === 'Joker',
      );
      expect(jokers).toHaveLength(0);
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
      await deckDO.fetch(resetRequest);
    });

    it('should deal cards to participants', async () => {
      const request = new Request('http://deck/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: ['actor1', 'actor2'],
          extra: {},
        }),
      });

      const response = await deckDO.fetch(request);
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('dealt');
      expect(result.data.dealt).toHaveProperty('actor1');
      expect(result.data.dealt).toHaveProperty('actor2');
      expect(result.data.dealt.actor1).toHaveProperty('rank');
      expect(result.data.dealt.actor1).toHaveProperty('suit');
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
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data.dealt.actor1).toBeDefined();
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
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('recalled');
      expect(result.data.recalled).toHaveProperty('rank');
      expect(result.data.recalled).toHaveProperty('suit');
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
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('No card found for actor');
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
      const result = await response.json();

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('cards');
      expect(result.data).toHaveProperty('discard');
      expect(result.data).toHaveProperty('dealt');
    });

    it('should return error if no deck initialized', async () => {
      const request = new Request('http://deck/state', {
        method: 'GET',
      });

      const response = await deckDO.fetch(request);
      const result = await response.json();

      expect(result.success).toBe(false);
      expect(result.error).toContain('No deck initialized');
    });
  });
});
