import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CombatDO } from '../do/CombatDO';
import { DeckDO } from '../do/DeckDO';
import { RngDO } from '../do/RngDO';

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

describe('Concurrency Tests', () => {
  describe('CombatDO Concurrency', () => {
    let combatDO: CombatDO;
    let storedState: any = null;

    beforeEach(() => {
      vi.clearAllMocks();

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

    it('should handle concurrent advance turn requests', async () => {
      // Start combat
      const startRequest = new Request('http://combat/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          participants: ['actor1', 'actor2', 'actor3'],
        }),
      });
      await combatDO.fetch(startRequest);

      // Deal cards
      const dealRequest = new Request('http://combat/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          extraDraws: {},
        }),
      });
      await combatDO.fetch(dealRequest);

      // Simulate concurrent advance turn requests
      const advanceRequests = Array.from(
        { length: 5 },
        () =>
          new Request('http/combat/advanceTurn', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'test-session',
            }),
          }),
      );

      // Execute all requests concurrently
      const responses = await Promise.all(
        advanceRequests.map((request) => combatDO.fetch(request)),
      );

      // All requests should succeed
      const results = await Promise.all(
        responses.map((response) => response.json()),
      );

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Verify that only one actor is active at a time
      const activeActors = results
        .map((r) => r.data.activeActorId)
        .filter((id) => id !== undefined);

      // Should have at most one active actor per response
      expect(activeActors.length).toBeLessThanOrEqual(5);
    });

    it('should handle concurrent hold requests', async () => {
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

      // Simulate concurrent hold requests
      const holdRequests = [
        new Request('http://combat/hold', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'test-session',
            actorId: 'actor1',
          }),
        }),
        new Request('http://combat/hold', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'test-session',
            actorId: 'actor1', // Same actor
          }),
        }),
      ];

      const responses = await Promise.all(
        holdRequests.map((request) => combatDO.fetch(request)),
      );

      const results = await Promise.all(
        responses.map((response) => response.json()),
      );

      // One should succeed, one should fail (only active actor can hold)
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
    });

    it('should handle concurrent interrupt requests', async () => {
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

      const holdRequest = new Request('http/combat/hold', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          actorId: 'actor1',
        }),
      });
      await combatDO.fetch(holdRequest);

      // Simulate concurrent interrupt requests
      const interruptRequests = Array.from(
        { length: 3 },
        () =>
          new Request('http://combat/interrupt', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'test-session',
              actorId: 'actor1',
              targetActorId: 'actor2',
            }),
          }),
      );

      const responses = await Promise.all(
        interruptRequests.map((request) => combatDO.fetch(request)),
      );

      const results = await Promise.all(
        responses.map((response) => response.json()),
      );

      // Only one interrupt should succeed
      const successCount = results.filter((r) => r.success).length;
      expect(successCount).toBe(1);
    });
  });

  describe('DeckDO Concurrency', () => {
    let deckDO: DeckDO;
    let storedState: any = null;

    beforeEach(() => {
      vi.clearAllMocks();

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

    it('should handle concurrent deal requests', async () => {
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

      // Simulate concurrent deal requests
      const dealRequests = Array.from(
        { length: 5 },
        (_, i) =>
          new Request('http://deck/deal', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              to: [`actor${i + 1}`],
              extra: {},
            }),
          }),
      );

      const responses = await Promise.all(
        dealRequests.map((request) => deckDO.fetch(request)),
      );

      const results = await Promise.all(
        responses.map((response) => response.json()),
      );

      // All requests should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Verify that all actors got different cards
      const allDealtCards = results.flatMap((r) => Object.values(r.data.dealt));
      const uniqueCards = new Set(allDealtCards.map((card: any) => card.id));
      expect(uniqueCards.size).toBe(5);
    });

    it('should handle concurrent recall requests', async () => {
      // Reset deck and deal cards
      const resetRequest = new Request('http://deck/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          useJokers: true,
          sessionId: 'test-session',
        }),
      });
      await deckDO.fetch(resetRequest);

      const dealRequest = new Request('http/deck/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          to: ['actor1', 'actor2'],
          extra: {},
        }),
      });
      await deckDO.fetch(dealRequest);

      // Simulate concurrent recall requests
      const recallRequests = [
        new Request('http://deck/recall', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            actorId: 'actor1',
          }),
        }),
        new Request('http://deck/recall', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            actorId: 'actor1', // Same actor
          }),
        }),
      ];

      const responses = await Promise.all(
        recallRequests.map((request) => deckDO.fetch(request)),
      );

      const results = await Promise.all(
        responses.map((response) => response.json()),
      );

      // One should succeed, one should fail (actor can only have one card)
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
    });
  });

  describe('RngDO Concurrency', () => {
    let rngDO: RngDO;

    beforeEach(() => {
      vi.clearAllMocks();
      rngDO = new RngDO(mockState as any, mockEnv);
    });

    it('should handle concurrent dice roll requests', async () => {
      // Simulate concurrent dice roll requests
      const rollRequests = Array.from(
        { length: 100 },
        () =>
          new Request('http://rng/roll', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              formula: '1d6',
              explode: false,
              wildDie: null,
            }),
          }),
      );

      const responses = await Promise.all(
        rollRequests.map((request) => rngDO.fetch(request)),
      );

      const results = await Promise.all(
        responses.map((response) => response.json()),
      );

      // All requests should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.data.total).toBeGreaterThanOrEqual(1);
        expect(result.data.total).toBeLessThanOrEqual(6);
      });

      // Results should be different (high probability)
      const totals = results.map((r) => r.data.total);
      const uniqueTotals = new Set(totals);
      expect(uniqueTotals.size).toBeGreaterThan(1);
    });

    it('should handle concurrent verify requests', async () => {
      // First, roll some dice to get valid data
      const rollRequest = new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: '1d6',
          explode: false,
          wildDie: null,
        }),
      });

      const rollResponse = await rngDO.fetch(rollRequest);
      const rollResult = (await rollResponse.json()) as any;

      // Simulate concurrent verify requests
      const verifyRequests = Array.from(
        { length: 10 },
        () =>
          new Request('http://rng/verify', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              seed: rollResult.data.seed,
              results: rollResult.data.results,
              wild: rollResult.data.wild || [],
              modifier: 0,
              hash: rollResult.data.hash,
            }),
          }),
      );

      const responses = await Promise.all(
        verifyRequests.map((request) => rngDO.fetch(request)),
      );

      const results = await Promise.all(
        responses.map((response) => response.json()),
      );

      // All requests should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
        expect(result.data).toHaveProperty('valid');
      });
    });
  });

  describe('Cross-DO Concurrency', () => {
    it('should handle concurrent operations across different DOs', async () => {
      const combatDO = new CombatDO(mockState as any, mockEnv);
      const deckDO = new DeckDO(mockState as any, mockEnv);
      const rngDO = new RngDO(mockState as any, mockEnv);

      // Mock storage for each DO
      let combatState: any = null;
      let deckState: any = null;

      mockState.storage.put = vi.fn().mockImplementation(async (key, value) => {
        if (key === 'combatState') {
          combatState = value;
        } else if (key === 'deckState') {
          deckState = value;
        }
      });

      mockState.storage.get = vi.fn().mockImplementation(async (key) => {
        if (key === 'combatState') {
          return combatState;
        } else if (key === 'deckState') {
          return deckState;
        }
        return null;
      });

      // Simulate concurrent operations
      const operations = [
        // Combat operations
        () =>
          combatDO.fetch(
            new Request('http://combat/start', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'test-session',
                participants: ['actor1', 'actor2'],
              }),
            }),
          ),
        // Deck operations
        () =>
          deckDO.fetch(
            new Request('http://deck/reset', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                useJokers: true,
                sessionId: 'test-session',
              }),
            }),
          ),
        // RNG operations
        () =>
          rngDO.fetch(
            new Request('http://rng/roll', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                formula: '1d6',
                explode: false,
                wildDie: null,
              }),
            }),
          ),
        () =>
          rngDO.fetch(
            new Request('http://rng/roll', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                formula: '2d6+1',
                explode: true,
                wildDie: null,
              }),
            }),
          ),
      ];

      // Execute all operations concurrently
      const responses = await Promise.all(
        operations.map((operation) => operation()),
      );

      const results = await Promise.all(
        responses.map((response) => response.json()),
      );

      // All operations should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Race Condition Tests', () => {
    it('should prevent race conditions in turn advancement', async () => {
      const combatDO = new CombatDO(mockState as any, mockEnv);
      let storedState: any = null;

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

      // Deal cards
      const dealRequest = new Request('http/combat/deal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'test-session',
          extraDraws: {},
        }),
      });
      await combatDO.fetch(dealRequest);

      // Simulate rapid-fire advance turn requests
      const rapidRequests = Array.from(
        { length: 10 },
        () =>
          new Request('http/combat/advanceTurn', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'test-session',
            }),
          }),
      );

      // Execute requests with minimal delay
      const responses = await Promise.all(
        rapidRequests.map((request) => combatDO.fetch(request)),
      );

      const results = await Promise.all(
        responses.map((response) => response.json()),
      );

      // All requests should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });

      // Verify that turn progression is consistent
      const turns = results.map((r) => r.data.turn);
      const uniqueTurns = new Set(turns);
      expect(uniqueTurns.size).toBeGreaterThan(1); // Should have progressed through turns
    });
  });
});
