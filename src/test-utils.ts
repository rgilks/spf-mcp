import { vi } from 'vitest';

// Generate valid UUIDs for testing
export function generateTestUUID(): string {
  return '550e8400-e29b-41d4-a716-446655440000';
}

export function generateTestUUIDs(count: number): string[] {
  const base = '550e8400-e29b-41d4-a716-44665544000';
  return Array.from(
    { length: count },
    (_, i) => `${base}${i.toString().padStart(2, '0')}`,
  );
}

// Mock Hono context factory
export function createMockContext(overrides: any = {}) {
  const mockCtx = {
    req: {
      json: vi.fn(),
      param: vi.fn(),
      header: vi.fn(),
    },
    json: vi.fn(),
    env: {
      CombatDO: {
        get: vi.fn(),
        idFromName: vi.fn(),
      },
      SessionDO: {
        get: vi.fn(),
        idFromName: vi.fn().mockReturnValue('global-session-id'),
      },
      DeckDO: {
        get: vi.fn(),
        idFromName: vi.fn(),
      },
      RngDO: {
        get: vi.fn(),
        idFromName: vi.fn(),
      },
      DB: {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            first: vi.fn(),
            all: vi.fn(),
            run: vi.fn(),
          }),
        }),
      },
    },
    ...overrides,
  };

  return mockCtx;
}

// Mock Durable Object response factory
export function createMockDOResponse(data: any, success = true, status = 200) {
  return {
    json: vi.fn().mockResolvedValue({
      success,
      data: success ? data : undefined,
      error: success ? undefined : data,
      serverTs: '2024-01-01T00:00:00Z',
    }),
    status,
  };
}

// Mock fetch response factory
export function createMockFetchResponse(
  data: any,
  success = true,
  status = 200,
) {
  return Promise.resolve({
    json: () =>
      Promise.resolve({
        success,
        data,
        serverTs: '2024-01-01T00:00:00Z',
      }),
    status,
  });
}
