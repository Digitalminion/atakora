/**
 * Tests for Entry Point Detector
 *
 * Verifies that the detector correctly identifies CDK apps, component backends,
 * and handles edge cases with appropriate confidence levels.
 */

import { describe, it, expect } from 'vitest';
import { EntryPointDetector, createEntryPointDetector } from '../entry-point-detector';

describe('EntryPointDetector', () => {
  const detector = new EntryPointDetector();

  describe('CDK App Detection', () => {
    it('should detect CDK app from exports.app', () => {
      const module = {
        app: {
          synth: () => {},
          node: {},
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('cdk-app');
      expect(result.confidence).toBe('high');
      expect(result.entryPoint).toBe(module.app);
      expect(result.reason).toContain('synth()');
    });

    it('should detect CDK app from default export', () => {
      const module = {
        default: {
          synth: () => {},
          node: {},
          stacks: [],
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('cdk-app');
      expect(result.confidence).toBe('high');
      expect(result.entryPoint).toBe(module.default);
    });

    it('should detect CDK app with stacks property', () => {
      const module = {
        app: {
          synth: () => Promise.resolve({}),
          node: { id: 'app' },
          stacks: [{ name: 'Stack1' }],
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('cdk-app');
      expect(result.entryPoint).toBe(module.app);
    });

    it('should not detect object without synth method', () => {
      const module = {
        app: {
          node: {},
          // Missing synth() method
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('unknown');
    });

    it('should not detect object without node property', () => {
      const module = {
        app: {
          synth: () => {},
          // Missing node property
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('unknown');
    });

    it('should require synth to be a function', () => {
      const module = {
        app: {
          synth: 'not-a-function',
          node: {},
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('unknown');
    });
  });

  describe('Component Backend Detection', () => {
    it('should detect backend from exports.backend', () => {
      const module = {
        backend: {
          schema: { models: {} },
          settings: { name: 'my-app' },
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('component-backend');
      expect(result.confidence).toBe('high');
      expect(result.entryPoint).toBe(module.backend);
      expect(result.reason).toContain('schema');
    });

    it('should detect backend from default export', () => {
      const module = {
        default: {
          schema: { models: {} },
          settings: { name: 'my-app', environment: 'dev' },
          authentication: {},
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('component-backend');
      expect(result.confidence).toBe('high');
      expect(result.entryPoint).toBe(module.default);
    });

    it('should detect backend with full configuration', () => {
      const module = {
        backend: {
          schema: { models: { User: {} } },
          settings: {
            name: 'my-app',
            region: 'eastus',
            tags: { env: 'prod' }
          },
          authentication: { provider: 'entra-id' },
          storage: {},
          compute: {},
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('component-backend');
      expect(result.entryPoint).toBe(module.backend);
    });

    it('should not detect object without schema', () => {
      const module = {
        backend: {
          // Missing schema property
          settings: { name: 'my-app' },
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('unknown');
    });

    it('should not detect object without settings', () => {
      const module = {
        backend: {
          schema: { models: {} },
          // Missing settings property
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('unknown');
    });

    it('should not detect object with settings but no name', () => {
      const module = {
        backend: {
          schema: { models: {} },
          settings: {
            region: 'eastus',
            // Missing name
          },
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('unknown');
    });

    it('should require settings.name to be a string', () => {
      const module = {
        backend: {
          schema: { models: {} },
          settings: { name: 123 }, // name is not a string
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('unknown');
    });

    it('should require schema to be an object', () => {
      const module = {
        backend: {
          schema: 'not-an-object',
          settings: { name: 'my-app' },
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('unknown');
    });

    it('should require settings to be an object', () => {
      const module = {
        backend: {
          schema: { models: {} },
          settings: 'not-an-object',
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('unknown');
    });
  });

  describe('Priority and Edge Cases', () => {
    it('should prioritize CDK app over backend', () => {
      const module = {
        app: { synth: () => {}, node: {} },
        backend: { schema: {}, settings: { name: 'test' } },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('cdk-app');
      expect(result.entryPoint).toBe(module.app);
    });

    it('should prioritize exports.app over default export', () => {
      const module = {
        app: { synth: () => {}, node: {} },
        default: { synth: () => {}, node: {} },
      };

      const result = detector.detect(module);
      expect(result.entryPoint).toBe(module.app);
    });

    it('should prioritize exports.backend over default export', () => {
      const module = {
        backend: { schema: {}, settings: { name: 'test' } },
        default: { schema: {}, settings: { name: 'test2' } },
      };

      const result = detector.detect(module);
      expect(result.entryPoint).toBe(module.backend);
    });

    it('should return unknown for empty module', () => {
      const result = detector.detect({});
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe('low');
      expect(result.entryPoint).toBeNull();
    });

    it('should return unknown for null default', () => {
      const result = detector.detect({ default: null });
      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe('low');
    });

    it('should return unknown for undefined default', () => {
      const result = detector.detect({ default: undefined });
      expect(result.type).toBe('unknown');
    });

    it('should handle null module gracefully', () => {
      const result = detector.detect(null);
      expect(result.type).toBe('unknown');
      expect(result.entryPoint).toBeNull();
    });

    it('should handle undefined module gracefully', () => {
      const result = detector.detect(undefined);
      expect(result.type).toBe('unknown');
    });

    it('should handle primitive values', () => {
      const result = detector.detect('not-an-object');
      expect(result.type).toBe('unknown');
    });

    it('should handle arrays', () => {
      const result = detector.detect([]);
      expect(result.type).toBe('unknown');
    });
  });

  describe('getDescription', () => {
    it('should provide description for CDK app', () => {
      const result = {
        type: 'cdk-app' as const,
        entryPoint: {} as any,
        confidence: 'high' as const,
        reason: 'test'
      };
      const description = detector.getDescription(result);
      expect(description).toContain('CDK-style app');
    });

    it('should provide description for component backend', () => {
      const result = {
        type: 'component-backend' as const,
        entryPoint: {} as any,
        confidence: 'high' as const,
        reason: 'test'
      };
      const description = detector.getDescription(result);
      expect(description).toContain('component-style backend');
    });

    it('should provide helpful message for unknown type', () => {
      const result = {
        type: 'unknown' as const,
        entryPoint: null,
        confidence: 'low' as const,
        reason: 'test'
      };
      const description = detector.getDescription(result);
      expect(description).toContain('exports.app');
      expect(description).toContain('exports.backend');
      expect(description).toContain('defineBackend');
    });
  });

  describe('Factory Function', () => {
    it('should create detector instance', () => {
      const detector = createEntryPointDetector();
      expect(detector).toBeInstanceOf(EntryPointDetector);
    });

    it('should create functional detector', () => {
      const detector = createEntryPointDetector();
      const module = {
        app: { synth: () => {}, node: {} },
      };
      const result = detector.detect(module);
      expect(result.type).toBe('cdk-app');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle CDK app with async synth', () => {
      const module = {
        app: {
          synth: async () => Promise.resolve({ stacks: [] }),
          node: { id: 'root' },
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('cdk-app');
    });

    it('should handle backend with minimal config', () => {
      const module = {
        backend: {
          schema: { models: {} },
          settings: { name: 'minimal-app' },
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('component-backend');
    });

    it('should handle backend with complex settings', () => {
      const module = {
        backend: {
          schema: {
            models: { User: {}, Post: {} },
            events: {},
          },
          settings: {
            name: 'complex-app',
            region: 'westus2',
            organization: 'acme',
            tags: { project: 'alpha' },
            features: {
              monitoring: true,
              networking: true,
            },
          },
          authentication: { provider: 'custom' },
        },
      };

      const result = detector.detect(module);
      expect(result.type).toBe('component-backend');
    });
  });
});
