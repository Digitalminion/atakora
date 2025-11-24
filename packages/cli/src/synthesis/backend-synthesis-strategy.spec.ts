/**
 * Backend Synthesis Strategy Tests
 *
 * Tests for the backend synthesis strategy that handles component-style
 * backend synthesis in the CLI.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackendSynthesisStrategy } from './backend-synthesis-strategy';

// Mock BackendAdapter
vi.mock('@atakora/component/synthesis', () => ({
  BackendAdapter: vi.fn().mockImplementation(() => ({
    synthesize: vi.fn(),
  })),
}));

describe('BackendSynthesisStrategy', () => {
  let strategy: BackendSynthesisStrategy;

  beforeEach(() => {
    strategy = new BackendSynthesisStrategy();
  });

  describe('Backend Validation', () => {
    it('should validate backend with all required fields', () => {
      const backend = {
        schema: { models: {} },
        settings: { name: 'test-app' },
      };

      const result = strategy.validateBackend(backend);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject null backend', () => {
      const result = strategy.validateBackend(null);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('null or undefined');
    });

    it('should reject backend without schema', () => {
      const backend = {
        settings: { name: 'test-app' },
      };

      const result = strategy.validateBackend(backend);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('schema');
    });

    it('should reject backend without settings', () => {
      const backend = {
        schema: { models: {} },
      };

      const result = strategy.validateBackend(backend);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('settings');
    });

    it('should reject backend with non-object settings', () => {
      const backend = {
        schema: { models: {} },
        settings: 'not an object',
      };

      const result = strategy.validateBackend(backend);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('object');
    });

    it('should reject backend without settings.name', () => {
      const backend = {
        schema: { models: {} },
        settings: {},
      };

      const result = strategy.validateBackend(backend);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('name');
    });
  });

  describe('Summary Formatting', () => {
    it('should format success summary correctly', () => {
      const result = {
        success: true,
        stackCount: 1,
        resourceCount: 10,
        directory: './arm.out',
      };

      const summary = strategy.getSummary(result);

      expect(summary).toContain('✓');
      expect(summary).toContain('1 stack');
      expect(summary).toContain('10 resources');
      expect(summary).toContain('./arm.out');
    });

    it('should pluralize stacks correctly', () => {
      const result = {
        success: true,
        stackCount: 3,
        resourceCount: 42,
        directory: './arm.out',
      };

      const summary = strategy.getSummary(result);

      expect(summary).toContain('3 stacks');
      expect(summary).toContain('42 resources');
    });

    it('should format failure summary correctly', () => {
      const result = {
        success: false,
        error: new Error('Synthesis failed'),
      };

      const summary = strategy.getSummary(result);

      expect(summary).toContain('✗');
      expect(summary).toContain('Synthesis failed');
    });

    it('should handle missing error message', () => {
      const result = {
        success: false,
        error: undefined,
      };

      const summary = strategy.getSummary(result);

      expect(summary).toContain('Unknown error');
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed error for missing dependencies', () => {
      const error = new Error('Cannot find module "@atakora/component"');

      const detailedError = strategy.getDetailedError(error);

      expect(detailedError).toContain('dependencies');
      expect(detailedError).toContain('npm install');
    });

    it('should provide detailed error for schema issues', () => {
      const error = new Error('Invalid schema: missing model definition');

      const detailedError = strategy.getDetailedError(error);

      expect(detailedError).toContain('schema');
      expect(detailedError).toContain('defineSchema');
    });

    it('should provide detailed error for validation failures', () => {
      const error = new Error('Template validation failed: size limit exceeded');

      const detailedError = strategy.getDetailedError(error);

      expect(detailedError).toContain('validation');
      expect(detailedError).toContain('--skip-validation');
    });

    it('should handle non-Error objects', () => {
      const detailedError = strategy.getDetailedError('String error');

      expect(detailedError).toContain('Unknown error');
      expect(detailedError).toContain('String error');
    });

    it('should include stack trace in debug mode', () => {
      const originalDebug = process.env.DEBUG;
      process.env.DEBUG = '1';

      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:10:5';

      const detailedError = strategy.getDetailedError(error);

      expect(detailedError).toContain('Stack trace');
      expect(detailedError).toContain(error.stack);

      process.env.DEBUG = originalDebug;
    });

    it('should suggest enabling debug mode when not active', () => {
      const originalDebug = process.env.DEBUG;
      delete process.env.DEBUG;

      const error = new Error('Test error');

      const detailedError = strategy.getDetailedError(error);

      expect(detailedError).toContain('DEBUG=1');

      process.env.DEBUG = originalDebug;
    });
  });
});
