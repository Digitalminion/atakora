/**
 * Vitest configuration for @atakora/component package
 *
 * Configures test environment, coverage reporting, and test patterns
 * for the component package.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',

    // Test file patterns
    include: [
      '__tests__/**/*.test.ts',
      '__tests__/**/*.spec.ts',
      'test/**/*.test.ts',
      'test/**/*.spec.ts',
    ],

    // Exclude patterns
    exclude: [
      'node_modules/**',
      'dist/**',
      '**/*.d.ts',
    ],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Include source files
      include: ['src/**/*.ts'],

      // Exclude from coverage
      exclude: [
        'node_modules/',
        'dist/',
        '__tests__/',
        'test/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        '**/types.ts',
        '**/index.ts', // Re-export files
        'src/crud/functions/*.ts', // Template functions
      ],

      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },

      // Per-file thresholds
      perFile: true,

      // Skip full coverage check for certain files
      skipFull: false,

      // Clean coverage directory before running
      clean: true,
    },

    // Test timeout
    testTimeout: 10000, // 10 seconds

    // Hook timeout
    hookTimeout: 10000,

    // Teardown timeout
    teardownTimeout: 10000,

    // Setup files
    setupFiles: [],

    // Mock reset between tests
    mockReset: true,
    clearMocks: true,
    restoreMocks: true,

    // Reporter configuration
    reporters: process.env.CI ? ['verbose', 'json'] : ['verbose'],

    // Output file for CI
    outputFile: process.env.CI
      ? {
          json: './test-results.json',
        }
      : undefined,

    // Benchmark configuration (for performance tests)
    benchmark: {
      include: ['__tests__/**/*.bench.ts'],
      reporters: ['verbose'],
    },
  },

  resolve: {
    alias: {
      '@atakora/component': path.resolve(__dirname, './src'),
    },
  },
});
