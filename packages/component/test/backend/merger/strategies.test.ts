/**
 * Unit tests for merge strategies.
 */

import { describe, it, expect } from 'vitest';
import {
  unionStrategy,
  intersectionStrategy,
  maximumStrategy,
  priorityStrategy,
  minimumStrategy,
  objectMergeStrategy,
  MergeStrategyRegistry,
  type MergeContext
} from '../../../src/backend/merger/strategies';

describe('Merge Strategies', () => {
  describe('unionStrategy', () => {
    it('should combine arrays and remove duplicates', () => {
      const context: MergeContext = {
        path: 'test.array',
        sources: ['A', 'B', 'C'],
        priorities: [10, 10, 10]
      };

      const result = unionStrategy(
        [['a', 'b'], ['b', 'c'], ['c', 'd']],
        context
      );

      expect(result.value).toEqual(['a', 'b', 'c', 'd']);
      expect(result.strategyUsed).toBe('union');
      expect(result.contributingSources).toEqual(['A', 'B', 'C']);
    });

    it('should handle empty arrays', () => {
      const context: MergeContext = {
        path: 'test.array',
        sources: ['A', 'B'],
        priorities: [10, 10]
      };

      const result = unionStrategy([[], ['a', 'b']], context);

      expect(result.value).toEqual(['a', 'b']);
    });

    it('should deduplicate objects by JSON serialization', () => {
      const context: MergeContext = {
        path: 'test.objects',
        sources: ['A', 'B'],
        priorities: [10, 10]
      };

      const result = unionStrategy(
        [[{ id: 1, name: 'test' }], [{ id: 1, name: 'test' }, { id: 2, name: 'other' }]],
        context
      );

      expect(result.value).toEqual([
        { id: 1, name: 'test' },
        { id: 2, name: 'other' }
      ]);
    });
  });

  describe('intersectionStrategy', () => {
    it('should return only common elements', () => {
      const context: MergeContext = {
        path: 'test.array',
        sources: ['A', 'B'],
        priorities: [10, 10]
      };

      const result = intersectionStrategy(
        [['a', 'b', 'c'], ['b', 'c', 'd']],
        context
      );

      expect(result.value).toEqual(['b', 'c']);
      expect(result.strategyUsed).toBe('intersection');
    });

    it('should return empty array when no common elements', () => {
      const context: MergeContext = {
        path: 'test.array',
        sources: ['A', 'B'],
        priorities: [10, 10]
      };

      const result = intersectionStrategy(
        [['a', 'b'], ['c', 'd']],
        context
      );

      expect(result.value).toEqual([]);
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });

    it('should handle single array', () => {
      const context: MergeContext = {
        path: 'test.array',
        sources: ['A'],
        priorities: [10]
      };

      const result = intersectionStrategy([['a', 'b', 'c']], context);

      expect(result.value).toEqual(['a', 'b', 'c']);
    });

    it('should work with objects', () => {
      const context: MergeContext = {
        path: 'test.objects',
        sources: ['A', 'B'],
        priorities: [10, 10]
      };

      const obj1 = { id: 1, name: 'test' };
      const obj2 = { id: 2, name: 'other' };

      const result = intersectionStrategy(
        [[obj1, obj2], [obj1]],
        context
      );

      expect(result.value).toEqual([obj1]);
    });
  });

  describe('maximumStrategy', () => {
    it('should return the highest value', () => {
      const context: MergeContext = {
        path: 'test.number',
        sources: ['A', 'B', 'C'],
        priorities: [10, 10, 10]
      };

      const result = maximumStrategy([512, 1024, 256], context);

      expect(result.value).toBe(1024);
      expect(result.strategyUsed).toBe('maximum');
      expect(result.contributingSources).toEqual(['B']);
    });

    it('should include warning when multiple values exist', () => {
      const context: MergeContext = {
        path: 'test.memory',
        sources: ['Component1', 'Component2'],
        priorities: [10, 10]
      };

      const result = maximumStrategy([512, 1024], context);

      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('1024');
      expect(result.warnings![0]).toContain('Component2');
    });

    it('should throw error for empty array', () => {
      const context: MergeContext = {
        path: 'test.number',
        sources: [],
        priorities: []
      };

      expect(() => maximumStrategy([], context)).toThrow();
    });

    it('should handle negative numbers', () => {
      const context: MergeContext = {
        path: 'test.number',
        sources: ['A', 'B'],
        priorities: [10, 10]
      };

      const result = maximumStrategy([-10, -5], context);

      expect(result.value).toBe(-5);
    });
  });

  describe('minimumStrategy', () => {
    it('should return the lowest value', () => {
      const context: MergeContext = {
        path: 'test.number',
        sources: ['A', 'B', 'C'],
        priorities: [10, 10, 10]
      };

      const result = minimumStrategy([512, 1024, 256], context);

      expect(result.value).toBe(256);
      expect(result.contributingSources).toEqual(['C']);
    });
  });

  describe('priorityStrategy', () => {
    it('should select value from highest priority source', () => {
      const context: MergeContext = {
        path: 'test.flag',
        sources: ['Default', 'Component', 'UserOverride'],
        priorities: [10, 20, 30]
      };

      const result = priorityStrategy([false, true, false], context);

      expect(result.value).toBe(false);
      expect(result.strategyUsed).toBe('priority');
      expect(result.contributingSources).toEqual(['UserOverride']);
    });

    it('should warn about overridden values', () => {
      const context: MergeContext = {
        path: 'test.setting',
        sources: ['A', 'B'],
        priorities: [10, 20]
      };

      const result = priorityStrategy(['serverless', 'provisioned'], context);

      expect(result.value).toBe('provisioned');
      expect(result.warnings).toBeDefined();
    });

    it('should warn about conflicts with same priority', () => {
      const context: MergeContext = {
        path: 'test.setting',
        sources: ['A', 'B', 'C'],
        priorities: [20, 20, 10]
      };

      const result = priorityStrategy(['value1', 'value2', 'value3'], context);

      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('Conflict');
      expect(result.warnings![0]).toContain('priority 20');
    });

    it('should handle single value', () => {
      const context: MergeContext = {
        path: 'test.value',
        sources: ['A'],
        priorities: [10]
      };

      const result = priorityStrategy(['only-value'], context);

      expect(result.value).toBe('only-value');
      expect(result.warnings).toBeUndefined();
    });

    it('should work with complex objects', () => {
      const context: MergeContext = {
        path: 'test.config',
        sources: ['A', 'B'],
        priorities: [10, 20]
      };

      const obj1 = { setting: 'a', value: 1 };
      const obj2 = { setting: 'b', value: 2 };

      const result = priorityStrategy([obj1, obj2], context);

      expect(result.value).toEqual(obj2);
    });
  });

  describe('MergeStrategyRegistry', () => {
    it('should register and find custom strategies', () => {
      const registry = new MergeStrategyRegistry();

      const customStrategy = {
        path: 'config.custom',
        handler: (values: ReadonlyArray<unknown>, context: MergeContext) => ({
          value: 'custom-result',
          strategyUsed: 'custom' as const,
          contributingSources: context.sources as string[]
        })
      };

      registry.register(customStrategy);

      const found = registry.find('config.custom');
      expect(found).toBeDefined();
      expect(found?.path).toBe('config.custom');
    });

    it('should support regex patterns', () => {
      const registry = new MergeStrategyRegistry();

      const customStrategy = {
        path: /config\..*\.enabled/,
        handler: (values: ReadonlyArray<unknown>, context: MergeContext) => ({
          value: true,
          strategyUsed: 'custom' as const,
          contributingSources: context.sources as string[]
        })
      };

      registry.register(customStrategy);

      const found = registry.find('config.database.enabled');
      expect(found).toBeDefined();

      const notFound = registry.find('config.database.name');
      expect(notFound).toBeUndefined();
    });

    it('should return all registered strategies', () => {
      const registry = new MergeStrategyRegistry();

      registry.register({
        path: 'a',
        handler: () => ({ value: 'a', strategyUsed: 'custom' as const, contributingSources: [] })
      });

      registry.register({
        path: 'b',
        handler: () => ({ value: 'b', strategyUsed: 'custom' as const, contributingSources: [] })
      });

      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });

    it('should clear all strategies', () => {
      const registry = new MergeStrategyRegistry();

      registry.register({
        path: 'a',
        handler: () => ({ value: 'a', strategyUsed: 'custom' as const, contributingSources: [] })
      });

      registry.clear();

      const all = registry.getAll();
      expect(all).toHaveLength(0);
    });
  });

  describe('objectMergeStrategy', () => {
    it('should deep merge objects using provided strategies', () => {
      const context: MergeContext = {
        path: 'config',
        sources: ['A', 'B'],
        priorities: [10, 20]
      };

      const strategies = new Map();
      strategies.set('config.tags', unionStrategy);
      strategies.set('config.memory', maximumStrategy);

      const obj1 = {
        tags: ['tag1', 'tag2'],
        memory: 512,
        name: 'first'
      };

      const obj2 = {
        tags: ['tag2', 'tag3'],
        memory: 1024,
        name: 'second'
      };

      const result = objectMergeStrategy([obj1, obj2], context, strategies);

      expect(result.value.memory).toBe(1024);
      expect(result.value.name).toBe('second'); // Priority strategy by default
      expect(result.strategyUsed).toBe('custom');
    });

    it('should handle nested objects', () => {
      const context: MergeContext = {
        path: 'config',
        sources: ['A', 'B'],
        priorities: [10, 20]
      };

      const obj1 = {
        database: {
          name: 'db1',
          size: 100
        }
      };

      const obj2 = {
        database: {
          name: 'db2',
          size: 200
        }
      };

      const result = objectMergeStrategy([obj1, obj2], context, new Map());

      expect(result.value.database).toBeDefined();
    });

    it('should handle single object', () => {
      const context: MergeContext = {
        path: 'config',
        sources: ['A'],
        priorities: [10]
      };

      const obj = { name: 'test', value: 123 };

      const result = objectMergeStrategy([obj], context, new Map());

      expect(result.value).toEqual(obj);
      expect(result.value).not.toBe(obj); // Should be a copy
    });

    it('should collect warnings from nested merges', () => {
      const context: MergeContext = {
        path: 'config',
        sources: ['A', 'B'],
        priorities: [10, 20]
      };

      const strategies = new Map();
      strategies.set('config.value', maximumStrategy);

      const obj1 = { value: 100 };
      const obj2 = { value: 200 };

      const result = objectMergeStrategy([obj1, obj2], context, strategies);

      expect(result.warnings).toBeDefined();
    });
  });
});
