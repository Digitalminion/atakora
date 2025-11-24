/**
 * Vitest configuration for integration tests
 *
 * This configuration is specifically for integration tests that require
 * Azure emulators (Cosmos DB, Azurite) to be running.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    // Only run integration tests
    include: [
      'src/functions/__tests__/integration/**/*.test.ts',
      'src/functions/__tests__/integration/**/*.spec.ts',
      '**/*.integration.test.ts',
      '**/*.integration.spec.ts',
    ],

    // Exclude other tests
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts',
      '**/*.bench.ts',
      '**/*.unit.test.ts',
      '**/*.unit.spec.ts',
    ],

    // Longer timeouts for integration tests
    testTimeout: 60000, // 60 seconds
    hookTimeout: 60000,
    teardownTimeout: 60000,

    // Setup files for integration tests
    setupFiles: [],

    // Sequential execution for integration tests (to avoid resource contention)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },

    // Mock reset between tests
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,

    // Reporter configuration
    reporters: process.env.CI ? ['verbose', 'json'] : ['verbose'],

    // Output file for CI
    outputFile: process.env.CI
      ? {
          json: './integration-test-results.json',
        }
      : undefined,
  },

  resolve: {
    alias: {
      '@atakora/component': path.resolve(__dirname, './src'),
    },
  },
});
