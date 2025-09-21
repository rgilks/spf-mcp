import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RngDO } from '../RngDO';

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
  });
});
