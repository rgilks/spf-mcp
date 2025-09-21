import { sign } from 'hono/jwt';
import { vi } from 'vitest';
import type { Env } from './index';

export function generateTestUUID(): string {
  return '12345678-1234-1234-8234-123456789abc';
}

export async function createTestToken(
  role: 'gm' | 'player' | 'observer' = 'gm',
  sessionId?: string,
) {
  const secret = 'test-secret';
  const now = Math.floor(Date.now() / 1000);

  return await sign(
    {
      sub: 'test-user',
      role,
      sessionId,
      iat: now,
      exp: now + 24 * 60 * 60, // 24 hours
    },
    secret,
  );
}

export function createTestHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

export function createMockContext(overrides: any = {}) {
  const mockReq = {
    json: vi.fn(),
    param: vi.fn(),
    query: vi.fn(),
    header: vi.fn(),
  };

  const mockCtx = {
    req: mockReq,
    env: {
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            run: vi.fn().mockResolvedValue({ success: true }),
            first: vi.fn().mockResolvedValue({ id: generateTestUUID() }),
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
          fetch: vi.fn().mockResolvedValue(createMockDOResponse({})),
        }),
        idFromName: vi.fn(),
      },
      DeckDO: {
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue(createMockDOResponse({})),
        }),
        idFromName: vi.fn(),
      },
      RngDO: {
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue(createMockDOResponse({})),
        }),
        idFromName: vi.fn(),
      },
      SessionDO: {
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue(createMockDOResponse({})),
        }),
        idFromName: vi.fn(),
      },
      MCP_SERVER_NAME: 'spf-mcp-test',
      JWT_SECRET: 'test-secret',
      API_KEY: 'test-api-key',
    } as unknown as Env,
    json: vi.fn(),
    text: vi.fn(),
    ...overrides,
  };

  return mockCtx;
}

export function createMockDOResponse(data: any, success = true) {
  return new Response(
    JSON.stringify({
      success,
      data,
      serverTs: '2024-01-01T00:00:00Z',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
