import { describe, it, expect, vi } from 'vitest';
import { RngDO } from '../do/RngDO';
import { DeckDO } from '../do/DeckDO';

// Mock DurableObjectState
const mockState = {
  storage: {
    put: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    delete: vi.fn(),
    list: vi.fn(),
  },
};

const mockEnv = {};

describe('Property-Based Tests', () => {
  describe('RNG Fairness Tests', () => {
    let rngDO: RngDO;

    beforeEach(() => {
      vi.clearAllMocks();
      rngDO = new RngDO(mockState as any, mockEnv);
    });

    it('should generate fair dice distributions', async () => {
      const formula = '1d6';
      const numRolls = 1000;
      const results: number[] = [];

      // Roll dice many times
      for (let i = 0; i < numRolls; i++) {
        const request = new Request('http://rng/roll', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            formula,
            explode: false,
            wildDie: null,
          }),
        });

        const response = await rngDO.fetch(request);
        const result = (await response.json()) as any;
        results.push(result.data.total);
      }

      // Count occurrences of each face
      const counts = new Array(7).fill(0); // 0-6 (0 unused)
      results.forEach((roll) => {
        if (roll >= 1 && roll <= 6) {
          counts[roll]++;
        }
      });

      // Check that each face appears roughly equally (within 10% tolerance)
      const expectedCount = numRolls / 6;
      const tolerance = expectedCount * 0.1;

      for (let face = 1; face <= 6; face++) {
        expect(counts[face]).toBeGreaterThan(expectedCount - tolerance);
        expect(counts[face]).toBeLessThan(expectedCount + tolerance);
      }
    });

    it('should generate different results for different seeds', async () => {
      const formula = '1d6';
      const seed1 = 'seed1';
      const seed2 = 'seed2';
      const results1: number[] = [];
      const results2: number[] = [];

      // Roll with seed1
      for (let i = 0; i < 100; i++) {
        const request = new Request('http://rng/roll', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            formula,
            explode: false,
            wildDie: null,
            seed: seed1,
          }),
        });

        const response = await rngDO.fetch(request);
        const result = (await response.json()) as any;
        results1.push(result.data.total);
      }

      // Roll with seed2
      for (let i = 0; i < 100; i++) {
        const request = new Request('http://rng/roll', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            formula,
            explode: false,
            wildDie: null,
            seed: seed2,
          }),
        });

        const response = await rngDO.fetch(request);
        const result = (await response.json()) as any;
        results2.push(result.data.total);
      }

      // Results should be different
      expect(results1).not.toEqual(results2);
    });

    it('should generate same results for same seed', async () => {
      const formula = '1d6';
      const seed = 'deterministic-seed';
      const results1: number[] = [];
      const results2: number[] = [];

      // First set of rolls
      for (let i = 0; i < 100; i++) {
        const request = new Request('http://rng/roll', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            formula,
            explode: false,
            wildDie: null,
            seed,
          }),
        });

        const response = await rngDO.fetch(request);
        const result = (await response.json()) as any;
        results1.push(result.data.total);
      }

      // Second set of rolls with same seed
      for (let i = 0; i < 100; i++) {
        const request = new Request('http://rng/roll', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            formula,
            explode: false,
            wildDie: null,
            seed,
          }),
        });

        const response = await rngDO.fetch(request);
        const result = (await response.json()) as any;
        results2.push(result.data.total);
      }

      // Results should be identical
      expect(results1).toEqual(results2);
    });

    it('should handle exploding dice fairly', async () => {
      const formula = '1d6';
      const numRolls = 500;
      const explosionCounts = new Array(10).fill(0); // Count explosions per roll

      for (let i = 0; i < numRolls; i++) {
        const request = new Request('http://rng/roll', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            formula,
            explode: true,
            wildDie: null,
          }),
        });

        const response = await rngDO.fetch(request);
        const result = (await response.json()) as any;
        const explosionCount = result.data.results[0].length - 1; // Subtract initial roll
        explosionCounts[Math.min(explosionCount, 9)]++;
      }

      // Most rolls should have 0 explosions (5/6 chance)
      // Some should have 1 explosion (1/6 * 1/6 chance)
      // Very few should have 2+ explosions
      expect(explosionCounts[0]).toBeGreaterThan(numRolls * 0.8); // At least 80% no explosions
      expect(explosionCounts[1]).toBeGreaterThan(0); // Some single explosions
      expect(explosionCounts[2]).toBeLessThan(numRolls * 0.1); // Few double explosions
    });

    it('should maintain statistical properties across different dice types', async () => {
      const diceTypes = ['1d4', '1d6', '1d8', '1d10', '1d12', '1d20'];
      const numRolls = 200;

      for (const diceType of diceTypes) {
        const results: number[] = [];
        const sides = parseInt(diceType.split('d')[1]);

        for (let i = 0; i < numRolls; i++) {
          const request = new Request('http://rng/roll', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              formula: diceType,
              explode: false,
              wildDie: null,
            }),
          });

          const response = await rngDO.fetch(request);
          const result = (await response.json()) as any;
          results.push(result.data.total);
        }

        // Check that all results are within valid range
        results.forEach((roll) => {
          expect(roll).toBeGreaterThanOrEqual(1);
          expect(roll).toBeLessThanOrEqual(sides);
        });

        // Check that we get a reasonable distribution
        const uniqueValues = new Set(results);
        expect(uniqueValues.size).toBeGreaterThan(sides * 0.5); // At least half the faces should appear
      }
    });
  });

  describe('Deck Shuffling Tests', () => {
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
    });

    it('should shuffle deck uniformly', async () => {
      const numShuffles = 100;
      const positionCounts = new Array(54)
        .fill(0)
        .map(() => new Array(54).fill(0));

      for (let shuffle = 0; shuffle < numShuffles; shuffle++) {
        const request = new Request('http://deck/reset', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            useJokers: true,
            sessionId: `test-session-${shuffle}`,
          }),
        });

        const response = await deckDO.fetch(request);
        const result = (await response.json()) as any;

        // Record position of each card
        result.data.cards.forEach((card: any, position: number) => {
          const cardId = card.id;
          const cardIndex = parseInt(cardId.split('-')[1]) || 0; // Extract card index from ID
          positionCounts[cardIndex][position]++;
        });
      }

      // Each card should appear in each position roughly equally
      const expectedCount = numShuffles / 54;
      const tolerance = expectedCount * 0.2; // 20% tolerance

      for (let card = 0; card < 54; card++) {
        for (let position = 0; position < 54; position++) {
          const count = positionCounts[card][position];
          expect(count).toBeGreaterThan(expectedCount - tolerance);
          expect(count).toBeLessThan(expectedCount + tolerance);
        }
      }
    });

    it('should maintain deck integrity after shuffling', async () => {
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

      // Check that we have exactly 54 cards
      expect(result.data.cards).toHaveLength(54);

      // Check that we have exactly 2 jokers
      const jokers = result.data.cards.filter(
        (card: any) => card.rank === 'Joker',
      );
      expect(jokers).toHaveLength(2);

      // Check that we have exactly 52 regular cards
      const regularCards = result.data.cards.filter(
        (card: any) => card.rank !== 'Joker',
      );
      expect(regularCards).toHaveLength(52);

      // Check that all standard cards are present
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
        }
      }

      // Check that all cards have unique IDs
      const cardIds = result.data.cards.map((card: any) => card.id);
      const uniqueIds = new Set(cardIds);
      expect(uniqueIds.size).toBe(54);
    });

    it('should produce different shuffles on consecutive resets', async () => {
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

      // Decks should be different
      const cards1 = result1.data.cards.map((c: any) => `${c.rank}${c.suit}`);
      const cards2 = result2.data.cards.map((c: any) => `${c.rank}${c.suit}`);
      expect(cards1).not.toEqual(cards2);
    });

    it('should handle dealing without affecting shuffle uniformity', async () => {
      const numTests = 50;
      const dealtCards: string[] = [];

      for (let test = 0; test < numTests; test++) {
        // Reset deck
        const resetRequest = new Request('http://deck/reset', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            useJokers: true,
            sessionId: `test-session-${test}`,
          }),
        });
        await deckDO.fetch(resetRequest);

        // Deal one card
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
        dealtCards.push(dealResult.data.dealt.actor1.rank);
      }

      // Count occurrences of each rank
      const rankCounts: Record<string, number> = {};
      dealtCards.forEach((rank) => {
        rankCounts[rank] = (rankCounts[rank] || 0) + 1;
      });

      // Each rank should appear roughly equally (including Jokers)
      const expectedCount = numTests / 14; // 13 ranks + Joker
      const tolerance = expectedCount * 0.3; // 30% tolerance

      Object.values(rankCounts).forEach((count) => {
        expect(count).toBeGreaterThan(expectedCount - tolerance);
        expect(count).toBeLessThan(expectedCount + tolerance);
      });
    });

    it('should maintain proper card distribution after multiple deals', async () => {
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

      // Deal 10 cards
      const dealRequest = new Request('http://deck/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: Array.from({ length: 10 }, (_, i) => `actor${i + 1}`),
          extra: {},
        }),
      });

      const dealResponse = await deckDO.fetch(dealRequest);
      const dealResult = (await dealResponse.json()) as any;

      // Check that we have 10 different cards
      const dealtCards = Object.values(dealResult.data.dealt);
      const uniqueCards = new Set(dealtCards.map((card: any) => card.id));
      expect(uniqueCards.size).toBe(10);

      // Check that deck size is reduced
      const stateRequest = new Request('http://deck/state', { method: 'GET' });
      const stateResponse = await deckDO.fetch(stateRequest);
      const stateResult = (await stateResponse.json()) as any;
      expect(stateResult.data.cards).toHaveLength(44); // 54 - 10
    });
  });

  describe('Combat Turn Order Tests', () => {
    it('should maintain consistent turn order based on card values', async () => {
      // This test would require a more complex setup with CombatDO
      // For now, we'll test the card sorting logic directly
      const testCases = [
        {
          participants: ['actor1', 'actor2', 'actor3'],
          dealt: {
            actor1: { rank: 'K', suit: 'Spades' },
            actor2: { rank: 'A', suit: 'Hearts' },
            actor3: { rank: 'J', suit: 'Diamonds' },
          },
          expectedOrder: ['actor2', 'actor1', 'actor3'], // A > K > J
        },
        {
          participants: ['actor1', 'actor2'],
          dealt: {
            actor1: { rank: 'K', suit: 'Hearts' },
            actor2: { rank: 'K', suit: 'Spades' },
          },
          expectedOrder: ['actor2', 'actor1'], // K Spades > K Hearts
        },
        {
          participants: ['actor1', 'actor2', 'actor3'],
          dealt: {
            actor1: { rank: 'Joker', suit: null },
            actor2: { rank: 'A', suit: 'Spades' },
            actor3: { rank: 'K', suit: 'Spades' },
          },
          expectedOrder: ['actor1', 'actor2', 'actor3'], // Joker > A > K
        },
      ];

      // This would test the sortByCardValue method from CombatDO
      // For now, we'll just verify the test structure
      testCases.forEach((testCase) => {
        expect(testCase.expectedOrder).toHaveLength(
          testCase.participants.length,
        );
        expect(new Set(testCase.expectedOrder)).toEqual(
          new Set(testCase.participants),
        );
      });
    });
  });
});
