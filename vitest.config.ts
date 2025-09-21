import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/setup.ts'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,js}'],
      exclude: [
        'src/**/*.test.{ts,js}',
        'src/**/*.spec.{ts,js}',
        'node_modules/**',
        'dist/**',
        'coverage/**',
      ],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
    testNamePattern: '^(?!.*\\b(skip|todo|only)\\b).*',
    include: ['src/**/*.{test,spec}.{ts,js}'],
    exclude: ['node_modules/**', 'dist/**', 'coverage/**'],
  },
});
