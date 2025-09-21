import { SignJWT } from 'jose';
import { vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';

export const createTestToken = (payload: any = {}) => {
  const secret = new TextEncoder().encode('test-secret');
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
};

export const createTestHeaders = (token?: string) => ({
  Authorization: `Bearer ${token || createTestToken()}`,
  'Content-Type': 'application/json',
});

export const createMockResponse = (data: any, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export const createErrorResponse = (error: string, status = 400) =>
  createMockResponse(
    {
      success: false,
      error,
      serverTs: new Date().toISOString(),
    },
    status,
  );

export const createSuccessResponse = (data: any) =>
  createMockResponse({
    success: true,
    data,
    serverTs: '2024-01-01T00:00:00Z', // Fixed timestamp for tests
  });

export const generateTestUUID = () => uuidv4();

export const createMockContext = () => ({
  req: {
    json: vi.fn(),
    param: vi.fn(),
    header: vi.fn(),
  },
  json: vi.fn(),
  env: mockEnv,
});

export const createMockDOResponse = (data: any, success = true) =>
  createMockResponse({
    success,
    data,
    serverTs: '2024-01-01T00:00:00Z', // Fixed timestamp for tests
  });

export const mockEnv = {
  MCP_SERVER_NAME: 'spf-mcp-test',
  JWT_SECRET: 'test-secret',
  API_KEY: 'test-api-key',
  NODE_ENV: 'test',
  DB: {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        run: vi.fn().mockResolvedValue({ success: true }),
        first: vi
          .fn()
          .mockResolvedValue({ id: '12345678-1234-1234-8234-123456789abc' }),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    }),
  },
  SPFKV: {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  R2: {
    put: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
  CombatDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue(
        createSuccessResponse({
          status: 'idle',
          round: 0,
          turn: 0,
          participants: [],
        }),
      ),
    }),
    idFromName: vi.fn().mockReturnValue('mock-deck-id'),
  },
  DeckDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi
        .fn()
        .mockResolvedValue(
          createSuccessResponse({ cards: [], discard: [], dealt: {} }),
        ),
    }),
    idFromName: vi.fn().mockReturnValue('mock-deck-id'),
  },
  RngDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue(
        createSuccessResponse({
          formula: '1d6',
          results: [[4]],
          total: 4,
          seed: 'test-seed',
          hash: 'test-hash',
        }),
      ),
    }),
    idFromName: vi.fn().mockReturnValue('mock-rng-id'),
  },
  SessionDO: {
    get: vi.fn().mockReturnValue({
      fetch: vi.fn().mockResolvedValue(
        createSuccessResponse({
          sessionId: '12345678-1234-1234-8234-123456789abc',
        }),
      ),
    }),
    idFromName: vi.fn().mockReturnValue('mock-deck-id'),
  },
};
