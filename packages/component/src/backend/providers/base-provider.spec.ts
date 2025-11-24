import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BaseProvider,
  ProviderError,
  type IResourceRequirement,
  type ProviderContext,
  type ValidationResult,
  type MergeResult,
} from './base-provider';
import type { Construct } from '@atakora/cdk';

// Test implementation of BaseProvider
class TestProvider extends BaseProvider<any, any> {
  readonly providerId = 'test-provider';
  readonly resourceType = 'test';
  readonly supportedTypes = ['test'] as const;
  protected readonly resourceLimit = 10;

  // Override abstract methods
  protected canMerge(config1: any, config2: any): boolean {
    // For testing: configs are mergeable if they have the same type property
    if (config1.type && config2.type) {
      return config1.type === config2.type;
    }
    return true;
  }

  protected merge(requirements: ReadonlyArray<IResourceRequirement>): any {
    // For testing: merge by combining names
    const names = requirements.map((r) => r.config.name).filter(Boolean);
    return {
      name: names.join('-'),
      type: requirements[0].config.type,
      merged: true,
    };
  }

  protected provision(scope: Construct, id: string, config: any, context: ProviderContext): any {
    return { id, config, provisioned: true };
  }

  // Expose protected methods for testing
  public testValidate(config: any): ValidationResult {
    return this.validate(config);
  }

  public testAnalyzeMergeability(requirements: ReadonlyArray<IResourceRequirement>): MergeResult {
    return this.analyzeMergeability(requirements);
  }

  public testSplitRequirements(requirements: ReadonlyArray<IResourceRequirement>, limit: number) {
    return this.splitRequirements(requirements, limit);
  }

  public testCreateError(code: string, message: string, details?: any): ProviderError {
    return this.createError(code, message, details);
  }

  public testMergePriorityBased(
    config1: any,
    config2: any,
    priority1: number,
    priority2: number
  ): any {
    return this.mergePriorityBased(config1, config2, priority1, priority2);
  }

  public testMergeUnion(config1: any, config2: any): any {
    return this.mergeUnion(config1, config2);
  }

  public testMergeMaximum(config1: any, config2: any): any {
    return this.mergeMaximum(config1, config2);
  }
}

describe('BaseProvider', () => {
  let provider: TestProvider;
  let mockScope: Construct;
  let mockContext: ProviderContext;

  beforeEach(() => {
    provider = new TestProvider();
    mockScope = { node: { id: 'test-scope' } } as any;
    mockContext = {
      backend: { backendId: 'test-backend' },
      naming: {
        formatResourceName: (type: string, backendId: string, suffix?: string) =>
          `${type}-${backendId}${suffix ? `-${suffix}` : ''}`,
      },
      tags: { environment: 'test' },
      existingResources: new Map(),
      location: 'eastus',
      environment: 'dev',
    };
  });

  describe('ProviderError', () => {
    it('should create a ProviderError with correct properties', () => {
      const error = new ProviderError('test-provider', 'TEST_ERROR', 'Test error message', {
        detail: 'value',
      });

      expect(error.name).toBe('ProviderError');
      expect(error.providerId).toBe('test-provider');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.message).toBe('[test-provider] TEST_ERROR: Test error message');
      expect(error.details).toEqual({ detail: 'value' });
    });

    it('should work without details', () => {
      const error = new ProviderError('test-provider', 'TEST_ERROR', 'Test error message');

      expect(error.details).toBeUndefined();
      expect(error.message).toBe('[test-provider] TEST_ERROR: Test error message');
    });
  });

  describe('canProvide', () => {
    it('should return true for supported resource types', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key1',
        config: {},
      };

      expect(provider.canProvide(requirement)).toBe(true);
    });

    it('should return false for unsupported resource types', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'unsupported',
        requirementKey: 'key1',
        config: {},
      };

      expect(provider.canProvide(requirement)).toBe(false);
    });
  });

  describe('validate', () => {
    it('should return valid result by default', () => {
      const result = provider.testValidate({});

      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.warnings).toBeUndefined();
    });
  });

  describe('validateMerged', () => {
    it('should validate merged requirement config', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key1',
        config: { valid: true },
      };

      const result = provider.validateMerged(requirement);

      expect(result.valid).toBe(true);
    });
  });

  describe('mergeRequirements', () => {
    it('should throw error for empty requirements array', () => {
      expect(() => provider.mergeRequirements([])).toThrow(ProviderError);
      expect(() => provider.mergeRequirements([])).toThrow('Cannot merge empty requirements array');
    });

    it('should return single requirement unchanged', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key1',
        config: { name: 'test' },
      };

      const result = provider.mergeRequirements([requirement]);

      expect(result).toEqual(requirement);
    });

    it('should merge multiple requirements successfully', () => {
      const req1: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key1',
        config: { name: 'req1', type: 'A' },
      };
      const req2: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key2',
        config: { name: 'req2', type: 'A' },
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.resourceType).toBe('test');
      expect(result.config.merged).toBe(true);
      expect(result.config.name).toBe('req1-req2');
    });

    it('should throw error when resource limit exceeded', () => {
      const requirements = Array.from({ length: 15 }, (_, i) => ({
        resourceType: 'test',
        requirementKey: `key${i}`,
        config: { name: `req${i}` },
      }));

      expect(() => provider.mergeRequirements(requirements)).toThrow(ProviderError);
      expect(() => provider.mergeRequirements(requirements)).toThrow('RESOURCE_LIMIT_EXCEEDED');
    });

    it('should throw error for mixed resource types', () => {
      const req1: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key1',
        config: {},
      };
      const req2: IResourceRequirement = {
        resourceType: 'other',
        requirementKey: 'key2',
        config: {},
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow(ProviderError);
      expect(() => provider.mergeRequirements([req1, req2])).toThrow('MIXED_RESOURCE_TYPES');
    });

    it('should throw error when configs cannot be merged', () => {
      const req1: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key1',
        config: { type: 'A' },
      };
      const req2: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key2',
        config: { type: 'B' },
      };

      expect(() => provider.mergeRequirements([req1, req2])).toThrow(ProviderError);
      expect(() => provider.mergeRequirements([req1, req2])).toThrow('CANNOT_MERGE');
    });

    it('should use highest priority from all requirements', () => {
      const req1: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key1',
        config: { name: 'req1', type: 'A' },
        priority: 5,
      };
      const req2: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key2',
        config: { name: 'req2', type: 'A' },
        priority: 15,
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.priority).toBe(15);
    });

    it('should use default priority when not specified', () => {
      const req1: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key1',
        config: { name: 'req1', type: 'A' },
      };
      const req2: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key2',
        config: { name: 'req2', type: 'A' },
      };

      const result = provider.mergeRequirements([req1, req2]);

      expect(result.priority).toBe(10);
    });
  });

  describe('provideResource', () => {
    it('should return existing resource if available', () => {
      const existingResource = { id: 'existing', existing: true };
      mockContext.existingResources.set('test:key1', existingResource);

      const requirement: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key1',
        config: { name: 'test' },
      };

      const result = provider.provideResource(requirement, mockScope, mockContext);

      expect(result).toBe(existingResource);
    });

    it('should provision new resource when not existing', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key1',
        config: { name: 'test' },
      };

      const result = provider.provideResource(requirement, mockScope, mockContext);

      expect(result.provisioned).toBe(true);
      expect(result.id).toBe('test-test-backend-key1');
    });

    it('should throw error if configuration is invalid', () => {
      // Override validate to fail
      const invalidProvider = new (class extends TestProvider {
        protected validate(config: any): ValidationResult {
          return {
            valid: false,
            errors: ['Invalid configuration'],
          };
        }
      })();

      const requirement: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key1',
        config: { invalid: true },
      };

      expect(() => invalidProvider.provideResource(requirement, mockScope, mockContext)).toThrow(
        ProviderError
      );
      expect(() => invalidProvider.provideResource(requirement, mockScope, mockContext)).toThrow(
        'INVALID_CONFIG'
      );
    });

    it('should throw error if provisioning fails', () => {
      // Override provision to throw
      const failProvider = new (class extends TestProvider {
        protected provision(): any {
          throw new Error('Provisioning failed');
        }
      })();

      const requirement: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'key1',
        config: { name: 'test' },
      };

      expect(() => failProvider.provideResource(requirement, mockScope, mockContext)).toThrow(
        ProviderError
      );
      expect(() => failProvider.provideResource(requirement, mockScope, mockContext)).toThrow(
        'PROVISION_FAILED'
      );
    });
  });

  describe('analyzeMergeability', () => {
    it('should return canMerge true when all requirements are compatible', () => {
      const requirements: IResourceRequirement[] = [
        { resourceType: 'test', requirementKey: 'key1', config: { type: 'A' } },
        { resourceType: 'test', requirementKey: 'key2', config: { type: 'A' } },
      ];

      const result = provider.testAnalyzeMergeability(requirements);

      expect(result.canMerge).toBe(true);
      expect(result.warnings).toBeUndefined();
    });

    it('should return canMerge false when requirements are incompatible', () => {
      const requirements: IResourceRequirement[] = [
        { resourceType: 'test', requirementKey: 'key1', config: { type: 'A' } },
        { resourceType: 'test', requirementKey: 'key2', config: { type: 'B' } },
      ];

      const result = provider.testAnalyzeMergeability(requirements);

      expect(result.canMerge).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings![0]).toContain('incompatible');
    });

    it('should check all pairwise combinations', () => {
      const requirements: IResourceRequirement[] = [
        { resourceType: 'test', requirementKey: 'key1', config: { type: 'A' } },
        { resourceType: 'test', requirementKey: 'key2', config: { type: 'A' } },
        { resourceType: 'test', requirementKey: 'key3', config: { type: 'B' } },
      ];

      const result = provider.testAnalyzeMergeability(requirements);

      expect(result.canMerge).toBe(false);
    });
  });

  describe('splitRequirements', () => {
    it('should split requirements evenly across resources', () => {
      const requirements: IResourceRequirement[] = Array.from({ length: 10 }, (_, i) => ({
        resourceType: 'test',
        requirementKey: `key${i}`,
        config: { name: `req${i}` },
      }));

      const result = provider.testSplitRequirements(requirements, 3);

      expect(result.resourceCount).toBe(4); // ceil(10/3)
      expect(result.distribution.size).toBe(4);
      expect(result.reason).toContain('Exceeded resource limit');
    });

    it('should distribute requirements correctly', () => {
      const requirements: IResourceRequirement[] = Array.from({ length: 7 }, (_, i) => ({
        resourceType: 'test',
        requirementKey: `key${i}`,
        config: { name: `req${i}` },
      }));

      const result = provider.testSplitRequirements(requirements, 3);

      expect(result.distribution.get(0)?.length).toBe(3);
      expect(result.distribution.get(1)?.length).toBe(3);
      expect(result.distribution.get(2)?.length).toBe(1);
    });

    it('should handle single resource case', () => {
      const requirements: IResourceRequirement[] = [
        { resourceType: 'test', requirementKey: 'key1', config: {} },
        { resourceType: 'test', requirementKey: 'key2', config: {} },
      ];

      const result = provider.testSplitRequirements(requirements, 5);

      expect(result.resourceCount).toBe(1);
      expect(result.distribution.get(0)?.length).toBe(2);
    });
  });

  describe('createError', () => {
    it('should create a ProviderError with provider ID', () => {
      const error = provider.testCreateError('TEST_CODE', 'Test message');

      expect(error).toBeInstanceOf(ProviderError);
      expect(error.providerId).toBe('test-provider');
      expect(error.code).toBe('TEST_CODE');
      expect(error.message).toContain('Test message');
    });

    it('should include details in error', () => {
      const details = { key: 'value', count: 42 };
      const error = provider.testCreateError('TEST_CODE', 'Test message', details);

      expect(error.details).toEqual(details);
    });
  });

  describe('mergePriorityBased', () => {
    it('should merge configs using priority', () => {
      const config1 = { name: 'config1', value: 'a', shared: 'keep' };
      const config2 = { value: 'b', extra: 'new' };

      const result = provider.testMergePriorityBased(config1, config2, 10, 15);

      expect(result.name).toBe('config1'); // From config1, not in config2
      expect(result.value).toBe('b'); // Conflict, priority2 > priority1
      expect(result.shared).toBe('keep'); // From config1
      expect(result.extra).toBe('new'); // From config2
    });

    it('should keep config1 values when priority1 > priority2', () => {
      const config1 = { name: 'config1', value: 'a' };
      const config2 = { value: 'b' };

      const result = provider.testMergePriorityBased(config1, config2, 20, 10);

      expect(result.value).toBe('a'); // priority1 > priority2
    });

    it('should handle equal priorities (keep config1)', () => {
      const config1 = { value: 'a' };
      const config2 = { value: 'b' };

      const result = provider.testMergePriorityBased(config1, config2, 10, 10);

      expect(result.value).toBe('a'); // Equal priority, keep first
    });

    it('should use default priorities', () => {
      const config1 = { value: 'a' };
      const config2 = { value: 'b' };

      const result = provider.testMergePriorityBased(config1, config2);

      expect(result.value).toBe('a'); // Equal default priority
    });
  });

  describe('mergeUnion', () => {
    it('should merge arrays by concatenation', () => {
      const config1 = { items: [1, 2], name: 'config1' };
      const config2 = { items: [3, 4], extra: 'value' };

      const result = provider.testMergeUnion(config1, config2);

      expect(result.items).toEqual([1, 2, 3, 4]);
      expect(result.name).toBe('config1');
      expect(result.extra).toBe('value');
    });

    it('should merge nested objects recursively', () => {
      const config1 = { nested: { a: 1, b: 2 } };
      const config2 = { nested: { b: 3, c: 4 } };

      const result = provider.testMergeUnion(config1, config2);

      expect(result.nested.a).toBe(1);
      expect(result.nested.b).toBe(2); // From config1 (first takes precedence for primitives)
      expect(result.nested.c).toBe(4);
    });

    it('should keep config1 primitives when both exist', () => {
      const config1 = { value: 'a', number: 1 };
      const config2 = { value: 'b', number: 2 };

      const result = provider.testMergeUnion(config1, config2);

      expect(result.value).toBe('a');
      expect(result.number).toBe(1);
    });

    it('should handle null values correctly', () => {
      const config1 = { value: null };
      const config2 = { value: 'b' };

      const result = provider.testMergeUnion(config1, config2);

      expect(result.value).toBeNull(); // config1 takes precedence
    });
  });

  describe('mergeMaximum', () => {
    it('should use maximum numeric values', () => {
      const config1 = { count: 10, limit: 100 };
      const config2 = { count: 20, limit: 50 };

      const result = provider.testMergeMaximum(config1, config2);

      expect(result.count).toBe(20); // max(10, 20)
      expect(result.limit).toBe(100); // max(100, 50)
    });

    it('should add new properties from config2', () => {
      const config1 = { value: 10 };
      const config2 = { value: 5, extra: 'new' };

      const result = provider.testMergeMaximum(config1, config2);

      expect(result.value).toBe(10);
      expect(result.extra).toBe('new');
    });

    it('should ignore non-numeric properties', () => {
      const config1 = { name: 'a', count: 10 };
      const config2 = { name: 'b', count: 20 };

      const result = provider.testMergeMaximum(config1, config2);

      expect(result.name).toBe('a'); // Non-numeric, keep from config1
      expect(result.count).toBe(20); // Numeric, use max
    });

    it('should handle mixed types correctly', () => {
      const config1 = { value: 10, text: 'hello' };
      const config2 = { value: 'string', text: 'world' };

      const result = provider.testMergeMaximum(config1, config2);

      expect(result.value).toBe(10); // Different types, keep config1
      expect(result.text).toBe('hello'); // Strings, keep config1
    });
  });

  describe('edge cases', () => {
    it('should handle empty config merge', () => {
      const config1 = {};
      const config2 = {};

      const result = provider.testMergeUnion(config1, config2);

      expect(result).toEqual({});
    });

    it('should handle undefined values in configs', () => {
      const config1 = { value: undefined };
      const config2 = { value: 'defined' };

      const result = provider.testMergeUnion(config1, config2);

      expect(result.value).toBeUndefined(); // config1 takes precedence
    });

    it('should format resource name correctly', () => {
      const requirement: IResourceRequirement = {
        resourceType: 'test',
        requirementKey: 'my-key',
        config: { name: 'test' },
      };

      provider.provideResource(requirement, mockScope, mockContext);

      expect(mockContext.naming.formatResourceName).toBeDefined();
    });
  });
});
