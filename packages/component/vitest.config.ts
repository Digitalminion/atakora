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
      'src/**/*.spec.ts', // Inline tests
    ],

    // Exclude patterns
    exclude: ['node_modules/**', 'dist/**', '**/*.d.ts'],

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
        '**/*example*.ts', // Example files (not production code)
        '**/*-example.ts', // Example files (not production code)
        '**/example-*.ts', // Example files (not production code)
        '**/*.old.ts', // Deprecated files
        '**/messaging/**/*.ts', // Future feature, not yet implemented
      ],

      // Coverage thresholds
      // Phase 1 targets: 90% for critical runtime code
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },

      // Per-file thresholds
      perFile: true,

      // Skip full coverage check for certain files
      skipFull: false,

      // Clean coverage directory before running
      clean: true,
    },

    // Test timeout (increased for integration tests with emulators)
    testTimeout: 30000, // 30 seconds

    // Hook timeout (setup/teardown may need time for emulators)
    hookTimeout: 30000,

    // Teardown timeout
    teardownTimeout: 30000,

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
