/**
 * Tests for Backend Merger Strategies
 *
 * @remarks
 * Comprehensive test suite for configuration merge strategies.
 * Tests cover:
 * - Union strategy (array merging with deduplication)
 * - Intersection strategy (common elements)
 * - Maximum/Minimum strategies (numeric comparisons)
 * - Priority strategy (conflict resolution by priority)
 * - Object merge strategy (deep merging)
 * - Strategy registry (custom strategy registration and lookup)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  unionStrategy,
  intersectionStrategy,
  maximumStrategy,
  minimumStrategy,
  priorityStrategy,
  objectMergeStrategy,
  MergeStrategyRegistry,
  type MergeContext,
  type MergeResult,
  type CustomMergeFunction,
} from './strategies';

// ============================================================================
// Test Fixtures
// ============================================================================

function createContext(path: string, sources: string[], priorities?: number[]): MergeContext {
  return {
    path,
    sources,
    priorities: priorities ?? sources.map(() => 10),
    metadata: {},
  };
}

// ============================================================================
// Union Strategy Tests
// ============================================================================

describe('unionStrategy', () => {
  it('should union multiple arrays with deduplication', () => {
    const values = [
      ['a', 'b', 'c'],
      ['b', 'c', 'd'],
      ['c', 'd', 'e'],
    ];
    const context = createContext('config.tags', ['source1', 'source2', 'source3']);

    const result = unionStrategy(values, context);

    expect(result.value).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(result.strategyUsed).toBe('union');
    expect(result.contributingSources).toEqual(['source1', 'source2', 'source3']);
  });

  it('should handle empty arrays', () => {
    const values = [[], [], []];
    const context = createContext('config.tags', ['source1', 'source2', 'source3']);

    const result = unionStrategy(values, context);

    expect(result.value).toEqual([]);
    expect(result.strategyUsed).toBe('union');
  });

  it('should handle single array', () => {
    const values = [['a', 'b', 'c']];
    const context = createContext('config.tags', ['source1']);

    const result = unionStrategy(values, context);

    expect(result.value).toEqual(['a', 'b', 'c']);
  });

  it('should deduplicate within same array', () => {
    const values = [['a', 'a', 'b', 'b', 'c']];
    const context = createContext('config.tags', ['source1']);

    const result = unionStrategy(values, context);

    expect(result.value).toEqual(['a', 'b', 'c']);
  });

  it('should handle complex objects using JSON serialization', () => {
    const values = [
      [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      [
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
      ],
    ];
    const context = createContext('config.users', ['source1', 'source2']);

    const result = unionStrategy(values, context);

    expect(result.value).toHaveLength(3);
    expect(result.value).toContainEqual({ id: 1, name: 'Alice' });
    expect(result.value).toContainEqual({ id: 2, name: 'Bob' });
    expect(result.value).toContainEqual({ id: 3, name: 'Charlie' });
  });

  it('should not produce warnings for successful union', () => {
    const values = [['a'], ['b'], ['c']];
    const context = createContext('config.tags', ['source1', 'source2', 'source3']);

    const result = unionStrategy(values, context);

    expect(result.warnings).toBeUndefined();
  });
});

// ============================================================================
// Intersection Strategy Tests
// ============================================================================

describe('intersectionStrategy', () => {
  it('should find common elements across all arrays', () => {
    const values = [
      ['a', 'b', 'c', 'd'],
      ['b', 'c', 'd', 'e'],
      ['c', 'd', 'e', 'f'],
    ];
    const context = createContext('config.required', ['source1', 'source2', 'source3']);

    const result = intersectionStrategy(values, context);

    expect(result.value).toEqual(['c', 'd']);
    expect(result.strategyUsed).toBe('intersection');
  });

  it('should handle empty intersection result', () => {
    const values = [
      ['a', 'b'],
      ['c', 'd'],
      ['e', 'f'],
    ];
    const context = createContext('config.required', ['source1', 'source2', 'source3']);

    const result = intersectionStrategy(values, context);

    expect(result.value).toEqual([]);
    expect(result.warnings).toBeDefined();
    // Check that a warning about empty result exists (last warning)
    expect(result.warnings![result.warnings!.length - 1]).toContain('resulted in empty array');
  });

  it('should handle single array', () => {
    const values = [['a', 'b', 'c']];
    const context = createContext('config.required', ['source1']);

    const result = intersectionStrategy(values, context);

    expect(result.value).toEqual(['a', 'b', 'c']);
    expect(result.contributingSources).toEqual(['source1']);
  });

  it('should handle empty input', () => {
    const values: string[][] = [];
    const context = createContext('config.required', []);

    const result = intersectionStrategy(values, context);

    expect(result.value).toEqual([]);
    expect(result.contributingSources).toEqual([]);
  });

  it('should generate warnings for missing values', () => {
    const values = [
      ['a', 'b', 'c'],
      ['b', 'c', 'd'],
    ];
    const context = createContext('config.required', ['source1', 'source2']);

    const result = intersectionStrategy(values, context);

    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBeGreaterThan(0);
    expect(result.warnings!.some((w) => w.includes('not present'))).toBe(true);
  });

  it('should handle complex objects', () => {
    const values = [
      [{ id: 1 }, { id: 2 }, { id: 3 }],
      [{ id: 2 }, { id: 3 }, { id: 4 }],
      [{ id: 3 }, { id: 4 }, { id: 5 }],
    ];
    const context = createContext('config.objects', ['source1', 'source2', 'source3']);

    const result = intersectionStrategy(values, context);

    expect(result.value).toEqual([{ id: 3 }]);
  });
});

// ============================================================================
// Maximum Strategy Tests
// ============================================================================

describe('maximumStrategy', () => {
  it('should select the maximum value', () => {
    const values = [512, 1024, 256, 768];
    const context = createContext('config.memory', ['source1', 'source2', 'source3', 'source4']);

    const result = maximumStrategy(values, context);

    expect(result.value).toBe(1024);
    expect(result.strategyUsed).toBe('maximum');
    expect(result.contributingSources).toEqual(['source2']);
  });

  it('should handle single value', () => {
    const values = [512];
    const context = createContext('config.memory', ['source1']);

    const result = maximumStrategy(values, context);

    expect(result.value).toBe(512);
    expect(result.warnings).toBeUndefined();
  });

  it('should throw error for empty array', () => {
    const values: number[] = [];
    const context = createContext('config.memory', []);

    expect(() => maximumStrategy(values, context)).toThrow('Cannot find maximum of empty array');
  });

  it('should generate warning for overridden values', () => {
    const values = [512, 1024];
    const context = createContext('config.memory', ['source1', 'source2']);

    const result = maximumStrategy(values, context);

    expect(result.warnings).toBeDefined();
    expect(result.warnings![0]).toContain('Selected maximum value 1024');
    expect(result.warnings![0]).toContain('Other values: 512');
  });

  it('should handle negative numbers', () => {
    const values = [-10, -5, -20, -1];
    const context = createContext('config.value', ['source1', 'source2', 'source3', 'source4']);

    const result = maximumStrategy(values, context);

    expect(result.value).toBe(-1);
    expect(result.contributingSources).toEqual(['source4']);
  });

  it('should handle equal maximum values (select first)', () => {
    const values = [100, 200, 200, 150];
    const context = createContext('config.value', ['source1', 'source2', 'source3', 'source4']);

    const result = maximumStrategy(values, context);

    expect(result.value).toBe(200);
    expect(result.contributingSources).toEqual(['source2']);
  });
});

// ============================================================================
// Minimum Strategy Tests
// ============================================================================

describe('minimumStrategy', () => {
  it('should select the minimum value', () => {
    const values = [512, 1024, 256, 768];
    const context = createContext('config.memory', ['source1', 'source2', 'source3', 'source4']);

    const result = minimumStrategy(values, context);

    expect(result.value).toBe(256);
    expect(result.strategyUsed).toBe('maximum'); // Note: uses 'maximum' type for consistency
    expect(result.contributingSources).toEqual(['source3']);
  });

  it('should handle single value', () => {
    const values = [512];
    const context = createContext('config.memory', ['source1']);

    const result = minimumStrategy(values, context);

    expect(result.value).toBe(512);
    expect(result.warnings).toBeUndefined();
  });

  it('should throw error for empty array', () => {
    const values: number[] = [];
    const context = createContext('config.memory', []);

    expect(() => minimumStrategy(values, context)).toThrow('Cannot find minimum of empty array');
  });

  it('should generate warning for overridden values', () => {
    const values = [512, 256];
    const context = createContext('config.memory', ['source1', 'source2']);

    const result = minimumStrategy(values, context);

    expect(result.warnings).toBeDefined();
    expect(result.warnings![0]).toContain('Selected minimum value 256');
    expect(result.warnings![0]).toContain('Other values: 512');
  });

  it('should handle negative numbers', () => {
    const values = [-10, -5, -20, -1];
    const context = createContext('config.value', ['source1', 'source2', 'source3', 'source4']);

    const result = minimumStrategy(values, context);

    expect(result.value).toBe(-20);
    expect(result.contributingSources).toEqual(['source3']);
  });
});

// ============================================================================
// Priority Strategy Tests
// ============================================================================

describe('priorityStrategy', () => {
  it('should select value from highest priority source', () => {
    const values = ['development', 'production', 'staging'];
    const context = createContext(
      'config.environment',
      ['source1', 'source2', 'source3'],
      [10, 30, 20] // source2 has highest priority
    );

    const result = priorityStrategy(values, context);

    expect(result.value).toBe('production');
    expect(result.strategyUsed).toBe('priority');
    expect(result.contributingSources).toEqual(['source2']);
  });

  it('should handle single value', () => {
    const values = ['development'];
    const context = createContext('config.environment', ['source1'], [10]);

    const result = priorityStrategy(values, context);

    expect(result.value).toBe('development');
    expect(result.warnings).toBeUndefined();
  });

  it('should throw error for empty values', () => {
    const values: string[] = [];
    const context = createContext('config.environment', [], []);

    expect(() => priorityStrategy(values, context)).toThrow('Cannot select from empty values');
  });

  it('should warn on conflicts with same priority', () => {
    const values = ['valueA', 'valueB', 'valueC'];
    const context = createContext(
      'config.setting',
      ['source1', 'source2', 'source3'],
      [20, 20, 10] // source1 and source2 have same priority but different values
    );

    const result = priorityStrategy(values, context);

    expect(result.value).toBe('valueA'); // First one with highest priority
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('Conflict'))).toBe(true);
    expect(result.warnings!.some((w) => w.includes('Multiple sources with priority 20'))).toBe(
      true
    );
  });

  it('should not warn when same priority has same values', () => {
    const values = ['valueA', 'valueA', 'valueB'];
    const context = createContext(
      'config.setting',
      ['source1', 'source2', 'source3'],
      [20, 20, 10]
    );

    const result = priorityStrategy(values, context);

    expect(result.value).toBe('valueA');
    expect(result.warnings).toBeDefined();
    // Should only warn about overriding lower priority, not about conflict
    expect(result.warnings!.every((w) => !w.includes('Conflict'))).toBe(true);
  });

  it('should warn about overridden lower priority values', () => {
    const values = ['valueA', 'valueB'];
    const context = createContext('config.setting', ['source1', 'source2'], [30, 10]);

    const result = priorityStrategy(values, context);

    expect(result.value).toBe('valueA');
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('overriding'))).toBe(true);
  });

  it('should not warn when lower priority has same value', () => {
    const values = ['valueA', 'valueA'];
    const context = createContext('config.setting', ['source1', 'source2'], [30, 10]);

    const result = priorityStrategy(values, context);

    expect(result.value).toBe('valueA');
    expect(result.warnings).toBeUndefined(); // No warning since values are the same
  });

  it('should handle complex object values', () => {
    const values = [
      { sku: 'basic', tier: 'B1' },
      { sku: 'premium', tier: 'P1' },
      { sku: 'standard', tier: 'S1' },
    ];
    const context = createContext(
      'config.appServicePlan',
      ['source1', 'source2', 'source3'],
      [10, 30, 20]
    );

    const result = priorityStrategy(values, context);

    expect(result.value).toEqual({ sku: 'premium', tier: 'P1' });
  });
});

// ============================================================================
// Object Merge Strategy Tests
// ============================================================================

describe('objectMergeStrategy', () => {
  it('should merge multiple objects', () => {
    const values = [
      { a: 1, b: 2 },
      { b: 3, c: 4 },
      { c: 5, d: 6 },
    ];
    const context = createContext('config', ['source1', 'source2', 'source3'], [10, 20, 30]);
    const strategies = new Map();

    const result = objectMergeStrategy(values, context, strategies);

    // Priority strategy by default - highest priority wins
    expect(result.value).toEqual({ a: 1, b: 3, c: 5, d: 6 });
    expect(result.strategyUsed).toBe('custom');
  });

  it('should handle single object', () => {
    const values = [{ a: 1, b: 2, c: 3 }];
    const context = createContext('config', ['source1']);
    const strategies = new Map();

    const result = objectMergeStrategy(values, context, strategies);

    expect(result.value).toEqual({ a: 1, b: 2, c: 3 });
    expect(result.contributingSources).toEqual(['source1']);
  });

  it('should throw error for empty array', () => {
    const values: Record<string, unknown>[] = [];
    const context = createContext('config', []);
    const strategies = new Map();

    expect(() => objectMergeStrategy(values, context, strategies)).toThrow(
      'Cannot merge empty object array'
    );
  });

  it('should apply custom strategies for specific properties', () => {
    const values = [
      { tags: ['a', 'b'], memory: 512 },
      { tags: ['b', 'c'], memory: 1024 },
    ];
    const context = createContext('config', ['source1', 'source2']);
    const strategies = new Map([
      ['config.tags', unionStrategy as any],
      ['config.memory', maximumStrategy as any],
    ]);

    const result = objectMergeStrategy(values, context, strategies);

    expect(result.value.tags).toEqual(['a', 'b', 'c']);
    expect(result.value.memory).toBe(1024);
  });

  it('should apply wildcard strategies', () => {
    const values = [{ enabled: true }, { enabled: false }];
    const context = createContext('config', ['source1', 'source2'], [10, 20]);
    const strategies = new Map([['*.enabled', priorityStrategy as any]]);

    const result = objectMergeStrategy(values, context, strategies);

    expect(result.value.enabled).toBe(false); // Higher priority (source2)
  });

  it('should collect warnings from nested merges', () => {
    const values = [{ memory: 512 }, { memory: 1024 }];
    const context = createContext('config', ['source1', 'source2']);
    const strategies = new Map([['config.memory', maximumStrategy as any]]);

    const result = objectMergeStrategy(values, context, strategies);

    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBeGreaterThan(0);
  });

  it('should handle undefined values in objects', () => {
    const values = [
      { a: 1, b: undefined, c: 3 },
      { a: undefined, b: 2, c: undefined },
    ];
    const context = createContext('config', ['source1', 'source2']);
    const strategies = new Map();

    const result = objectMergeStrategy(values, context, strategies);

    expect(result.value).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('should handle merge errors gracefully', () => {
    const values = [{ invalid: 'test' }, { invalid: 'test2' }];
    const context = createContext('config', ['source1', 'source2']);
    const strategies = new Map([
      [
        'config.invalid',
        (() => {
          throw new Error('Test error');
        }) as any,
      ],
    ]);

    const result = objectMergeStrategy(values, context, strategies);

    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('Failed to merge property'))).toBe(true);
  });
});

// ============================================================================
// MergeStrategyRegistry Tests
// ============================================================================

describe('MergeStrategyRegistry', () => {
  let registry: MergeStrategyRegistry;

  beforeEach(() => {
    registry = new MergeStrategyRegistry();
  });

  it('should register and find custom strategy by exact path', () => {
    const customFn: CustomMergeFunction = {
      path: 'config.custom.property',
      handler: (values, context) => ({
        value: values[0],
        strategyUsed: 'custom',
        contributingSources: [context.sources[0]],
      }),
      description: 'Test strategy',
    };

    registry.register(customFn);

    const found = registry.find('config.custom.property');
    expect(found).toBe(customFn);
  });

  it('should find custom strategy by regex pattern', () => {
    const customFn: CustomMergeFunction = {
      path: /config\..*\.enabled$/,
      handler: (values, context) => ({
        value: values[0],
        strategyUsed: 'custom',
        contributingSources: [context.sources[0]],
      }),
      description: 'Enable pattern strategy',
    };

    registry.register(customFn);

    const found1 = registry.find('config.feature.enabled');
    const found2 = registry.find('config.monitoring.enabled');
    const notFound = registry.find('config.feature.disabled');

    expect(found1).toBe(customFn);
    expect(found2).toBe(customFn);
    expect(notFound).toBeUndefined();
  });

  it('should return undefined for unregistered path', () => {
    const found = registry.find('config.unknown.path');
    expect(found).toBeUndefined();
  });

  it('should list all registered strategies', () => {
    const fn1: CustomMergeFunction = {
      path: 'path1',
      handler: () => ({ value: 1, strategyUsed: 'custom', contributingSources: [] }),
    };
    const fn2: CustomMergeFunction = {
      path: 'path2',
      handler: () => ({ value: 2, strategyUsed: 'custom', contributingSources: [] }),
    };

    registry.register(fn1);
    registry.register(fn2);

    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all).toContain(fn1);
    expect(all).toContain(fn2);
  });

  it('should clear all registered strategies', () => {
    const fn1: CustomMergeFunction = {
      path: 'path1',
      handler: () => ({ value: 1, strategyUsed: 'custom', contributingSources: [] }),
    };

    registry.register(fn1);
    expect(registry.getAll()).toHaveLength(1);

    registry.clear();
    expect(registry.getAll()).toHaveLength(0);
    expect(registry.find('path1')).toBeUndefined();
  });

  it('should prefer exact match over regex pattern', () => {
    const exactFn: CustomMergeFunction = {
      path: 'config.exact',
      handler: () => ({ value: 'exact', strategyUsed: 'custom', contributingSources: [] }),
    };
    const patternFn: CustomMergeFunction = {
      path: /config\..*/,
      handler: () => ({ value: 'pattern', strategyUsed: 'custom', contributingSources: [] }),
    };

    registry.register(patternFn);
    registry.register(exactFn);

    const found = registry.find('config.exact');
    expect(found).toBe(exactFn);
  });

  it('should handle regex with special characters', () => {
    const customFn: CustomMergeFunction = {
      path: /config\.tags\[\d+\]\.name/,
      handler: () => ({ value: 'matched', strategyUsed: 'custom', contributingSources: [] }),
    };

    registry.register(customFn);

    const found1 = registry.find('config.tags[0].name');
    const found2 = registry.find('config.tags[5].name');
    const notFound = registry.find('config.tags.name');

    expect(found1).toBe(customFn);
    expect(found2).toBe(customFn);
    expect(notFound).toBeUndefined();
  });
});
