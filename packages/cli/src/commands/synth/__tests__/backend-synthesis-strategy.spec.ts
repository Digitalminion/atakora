/**
 * Tests for BackendSynthesisStrategy
 *
 * @module @atakora/cli/commands/synth/__tests__/backend-synthesis-strategy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BackendSynthesisStrategy,
  createBackendSynthesisStrategy,
} from '../backend-synthesis-strategy';
import type { BackendObject } from '@atakora/component';
import type { SynthesisOptions } from '../types';

// Mock BackendAdapter
vi.mock('@atakora/component/synthesis', () => ({
  BackendAdapter: vi.fn().mockImplementation(() => ({
    synthesize: vi.fn().mockResolvedValue({
      version: '2.0.0',
      stacks: {},
      directory: './test-output',
    }),
  })),
}));

describe('BackendSynthesisStrategy', () => {
  let strategy: BackendSynthesisStrategy;

  beforeEach(() => {
    strategy = new BackendSynthesisStrategy();
  });

  describe('validateBackend', () => {
    it('should validate correct backend', () => {
      const backend = {
        schema: {
          models: {
            User: { fields: { id: { type: 'id' } } },
          },
        },
        settings: { name: 'test-app' },
      } as unknown as BackendObject;

      // Access private method for testing
      expect(() => strategy['validateBackend'](backend)).not.toThrow();
    });

    it('should throw for missing schema', () => {
      const backend = {
        settings: { name: 'test' },
      } as unknown as BackendObject;

      expect(() => strategy['validateBackend'](backend)).toThrow(
        'Backend must have a schema property'
      );
    });

    it('should throw for missing settings.name', () => {
      const backend = {
        schema: { models: { User: {} } },
        settings: {},
      } as unknown as BackendObject;

      expect(() => strategy['validateBackend'](backend)).toThrow(
        'Backend settings must include a name'
      );
    });

    it('should throw for empty models', () => {
      const backend = {
        schema: { models: {} },
        settings: { name: 'test' },
      } as unknown as BackendObject;

      expect(() => strategy['validateBackend'](backend)).toThrow(
        'Backend schema must define at least one model'
      );
    });

    it('should validate backend with schema.definition structure', () => {
      const backend = {
        schema: {
          definition: {
            schema: {
              models: {
                User: { fields: { id: { type: 'id' } } },
              },
            },
          },
        },
        settings: { name: 'test-app' },
      } as unknown as BackendObject;

      expect(() => strategy['validateBackend'](backend)).not.toThrow();
    });
  });

  describe('getSummary', () => {
    it('should format success summary', () => {
      const result = {
        success: true,
        outputDirectory: './cdk.out',
        stacks: ['my-app', 'my-app-database'],
        resourceCount: 15,
        errors: [],
      };

      const summary = strategy.getSummary(result);

      expect(summary).toContain('Synthesis complete');
      expect(summary).toContain('./cdk.out');
      expect(summary).toContain('15');
      expect(summary).toContain('my-app.json');
      expect(summary).toContain('my-app-database.json');
    });

    it('should format error summary', () => {
      const result = {
        success: false,
        outputDirectory: './cdk.out',
        stacks: [],
        resourceCount: 0,
        errors: ['Validation failed', 'Missing schema'],
      };

      const summary = strategy.getSummary(result);

      expect(summary).toContain('Synthesis failed');
      expect(summary).toContain('Validation failed');
      expect(summary).toContain('Missing schema');
    });

    it('should show correct stack and resource counts', () => {
      const result = {
        success: true,
        outputDirectory: '/path/to/output',
        stacks: ['stack1', 'stack2', 'stack3'],
        resourceCount: 42,
        errors: [],
      };

      const summary = strategy.getSummary(result);

      expect(summary).toContain('Stacks: 3');
      expect(summary).toContain('Resources: 42');
    });

    it('should list all generated stacks', () => {
      const result = {
        success: true,
        outputDirectory: './output',
        stacks: ['foundation', 'application', 'monitoring'],
        resourceCount: 20,
        errors: [],
      };

      const summary = strategy.getSummary(result);

      expect(summary).toContain('foundation.json');
      expect(summary).toContain('application.json');
      expect(summary).toContain('monitoring.json');
    });
  });

  describe('synthesize', () => {
    it('should return error result for invalid backend', async () => {
      const invalidBackend = {
        settings: { name: 'test' },
      } as unknown as BackendObject;

      const options: SynthesisOptions = {
        output: './test-output',
      };

      const result = await strategy.synthesize(invalidBackend, options);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Backend must have a schema property');
    });

    it('should handle errors gracefully', async () => {
      const backend = {
        schema: { models: {} },
        settings: { name: 'test' },
      } as unknown as BackendObject;

      const options: SynthesisOptions = {
        output: './test-output',
      };

      const result = await strategy.synthesize(backend, options);

      expect(result.success).toBe(false);
      expect(result.stacks).toEqual([]);
      expect(result.resourceCount).toBe(0);
      expect(result.outputDirectory).toBe('./test-output');
    });
  });

  describe('createBackendSynthesisStrategy', () => {
    it('should create a new strategy instance', () => {
      const newStrategy = createBackendSynthesisStrategy();

      expect(newStrategy).toBeInstanceOf(BackendSynthesisStrategy);
    });
  });
});
