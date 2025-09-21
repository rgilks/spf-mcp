import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RngDO } from './RngDO';

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
const mockEnv = {};

describe('RngDO', () => {
  let rngDO: RngDO;

  beforeEach(() => {
    vi.clearAllMocks();
    rngDO = new RngDO(mockState as any, mockEnv);
  });

  describe('handleRoll', () => {
    it('should roll dice with valid formula', async () => {
      const request = new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: '2d6+1',
          explode: true,
          wildDie: null,
        }),
      });

      const response = await rngDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('formula', '2d6+1');
      expect(result.data).toHaveProperty('results');
      expect(result.data).toHaveProperty('total');
      expect(result.data).toHaveProperty('seed');
      expect(result.data).toHaveProperty('hash');
      expect(Array.isArray(result.data.results)).toBe(true);
      expect(result.data.results).toHaveLength(2); // 2 dice
    });

    it('should handle exploding dice', async () => {
      const request = new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: '1d6',
          explode: true,
          wildDie: null,
        }),
      });

      const response = await rngDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data.results[0].length).toBeGreaterThanOrEqual(1);
    });

    it('should handle wild die', async () => {
      const request = new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: '1d6',
          explode: true,
          wildDie: 'd6',
        }),
      });

      const response = await rngDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('wild');
      expect(Array.isArray(result.data.wild)).toBe(true);
    });

    it('should reject invalid formula', async () => {
      const request = new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: 'invalid',
          explode: true,
          wildDie: null,
        }),
      });

      const response = await rngDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid dice formula');
    });

    it('should use provided seed for deterministic results', async () => {
      const seed = 'test-seed-123';
      const request = new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: '1d6',
          explode: false,
          wildDie: null,
          seed,
        }),
      });

      const response = await rngDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data.seed).toBe(seed);
    });

    it('should handle complex dice formulas', async () => {
      const testCases = [
        { formula: '3d6+2', expectedDice: 3 },
        { formula: '1d20-1', expectedDice: 1 },
        { formula: '2d8!!+1d4', expectedDice: 3 },
        { formula: '4d6k3', expectedDice: 4 },
      ];

      for (const testCase of testCases) {
        const request = new Request('http://rng/roll', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            formula: testCase.formula,
            explode: false,
            wildDie: null,
          }),
        });

        const response = await rngDO.fetch(request);
        const result = (await response.json()) as any;

        expect(result.success).toBe(true);
        expect(result.data.results).toHaveLength(testCase.expectedDice);
      }
    });

    it('should generate different results for different seeds', async () => {
      const request1 = new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: '1d6',
          explode: false,
          wildDie: null,
          seed: 'seed1',
        }),
      });

      const request2 = new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: '1d6',
          explode: false,
          wildDie: null,
          seed: 'seed2',
        }),
      });

      const response1 = await rngDO.fetch(request1);
      const response2 = await rngDO.fetch(request2);
      const result1 = (await response1.json()) as any;
      const result2 = (await response2.json()) as any;

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data.seed).toBe('seed1');
      expect(result2.data.seed).toBe('seed2');
      // Results should be different (high probability)
      expect(result1.data.total).not.toBe(result2.data.total);
    });

    it('should generate same results for same seed', async () => {
      const seed = 'deterministic-seed';
      const request = new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          formula: '1d6',
          explode: false,
          wildDie: null,
          seed,
        }),
      });

      const response1 = await rngDO.fetch(request);
      const response2 = await rngDO.fetch(request);
      const result1 = (await response1.json()) as any;
      const result2 = (await response2.json()) as any;

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data.total).toBe(result2.data.total);
      expect(result1.data.results).toEqual(result2.data.results);
    });
  });

  describe('handleVerify', () => {
    it('should verify valid roll data', async () => {
      const request = new Request('http://rng/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          seed: 'test-seed',
          results: [[1, 2, 3]],
          wild: [4, 5],
          modifier: 2,
          hash: 'some-hash',
        }),
      });

      const response = await rngDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('valid');
      expect(result.data).toHaveProperty('expectedHash');
      expect(result.data).toHaveProperty('providedHash');
    });

    it('should reject missing required fields', async () => {
      const request = new Request('http://rng/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          seed: 'test-seed',
          // Missing results and hash
        }),
      });

      const response = await rngDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should detect tampered roll data', async () => {
      const request = new Request('http://rng/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          seed: 'test-seed',
          results: [[6, 6, 6]], // Suspiciously high rolls
          wild: [6],
          modifier: 0,
          hash: 'tampered-hash',
        }),
      });

      const response = await rngDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const request = new Request('http://rng/roll', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid json',
      });

      const response = await rngDO.fetch(request);
      const result = (await response.json()) as any;

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle unknown endpoints', async () => {
      const request = new Request('http://rng/unknown', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await rngDO.fetch(request);

      expect(response.status).toBe(404);
    });

    it('should handle malformed dice formulas', async () => {
      const malformedFormulas = [
        'd6', // Missing count
        '2d', // Missing sides
        '2d6+', // Incomplete modifier
        '2d6++1', // Double operator
        '2d6d8', // Invalid syntax
        '', // Empty formula
      ];

      for (const formula of malformedFormulas) {
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

        expect(result.success).toBe(false);
        expect(result.error).toContain('Invalid dice formula');
      }
    });
  });
});
