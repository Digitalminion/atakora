/**
 * Unit tests for BaseBuilder class
 *
 * @remarks
 * Tests the foundational builder pattern implementation used throughout
 * the component package for fluent API construction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BaseBuilder, type BuilderConfig } from './builder';

// Test implementation of BaseBuilder
interface TestConfig {
  name?: string;
  value?: number;
  nested?: {
    enabled?: boolean;
    options?: string[];
  };
  tags?: string[];
}

class TestBuilder extends BaseBuilder<TestConfig> {
  constructor(initialConfig: TestConfig = {}) {
    super(initialConfig);
  }

  name(value: string): this {
    this.config.name = value;
    return this;
  }

  value(num: number): this {
    this.config.value = num;
    return this;
  }

  nested(fn: (config: TestConfig['nested']) => TestConfig['nested']): this {
    this.config.nested = fn(this.config.nested || {});
    return this;
  }

  addTag(tag: string): this {
    if (!this.config.tags) {
      this.config.tags = [];
    }
    this.config.tags.push(tag);
    return this;
  }

  build(): TestConfig {
    this.validate();
    return { ...this.config };
  }

  protected override validate(): void {
    if (this.config.value !== undefined && this.config.value < 0) {
      throw new Error('Value must be non-negative');
    }
  }

  // Expose protected methods for testing
  public testGetConfigClone(): TestConfig {
    return this.getConfigClone();
  }

  public testMerge(additional: Partial<TestConfig>): this {
    return this.merge(additional);
  }

  public testMergeDeep(additional: Partial<TestConfig>): this {
    return this.mergeDeep(additional);
  }
}

describe('BaseBuilder', () => {
  describe('constructor', () => {
    it('should initialize with empty config', () => {
      const builder = new TestBuilder();
      const config = builder.build();

      expect(config).toEqual({});
    });

    it('should initialize with provided config', () => {
      const initialConfig = { name: 'test', value: 42 };
      const builder = new TestBuilder(initialConfig);
      const config = builder.build();

      expect(config).toEqual(initialConfig);
    });

    it('should create a copy of initial config', () => {
      const initialConfig = { name: 'test', value: 42 };
      const builder = new TestBuilder(initialConfig);

      initialConfig.name = 'modified';
      const config = builder.build();

      expect(config.name).toBe('test'); // Not modified
    });
  });

  describe('method chaining', () => {
    it('should return this for method chaining', () => {
      const builder = new TestBuilder();

      const result = builder.name('test');

      expect(result).toBe(builder);
    });

    it('should chain multiple method calls', () => {
      const builder = new TestBuilder();

      const config = builder.name('test').value(100).addTag('tag1').addTag('tag2').build();

      expect(config).toEqual({
        name: 'test',
        value: 100,
        tags: ['tag1', 'tag2'],
      });
    });

    it('should allow method calls in any order', () => {
      const config1 = new TestBuilder().value(50).name('first').build();

      const config2 = new TestBuilder().name('first').value(50).build();

      expect(config1).toEqual(config2);
    });
  });

  describe('.when()', () => {
    it('should apply configuration when condition is true', () => {
      const builder = new TestBuilder();

      const config = builder
        .name('base')
        .when(true, (b) => b.value(100))
        .build();

      expect(config.value).toBe(100);
    });

    it('should skip configuration when condition is false', () => {
      const builder = new TestBuilder();

      const config = builder
        .name('base')
        .when(false, (b) => b.value(100))
        .build();

      expect(config.value).toBeUndefined();
    });

    it('should support nested when conditions', () => {
      const isProd = true;
      const isHighLoad = true;

      const config = new TestBuilder()
        .name('app')
        .when(isProd, (b) => b.value(1000).when(isHighLoad, (b2) => b2.addTag('high-load')))
        .build();

      expect(config).toEqual({
        name: 'app',
        value: 1000,
        tags: ['high-load'],
      });
    });

    it('should maintain chaining after when', () => {
      const config = new TestBuilder()
        .name('test')
        .when(true, (b) => b.value(50))
        .addTag('after-when')
        .build();

      expect(config).toEqual({
        name: 'test',
        value: 50,
        tags: ['after-when'],
      });
    });
  });

  describe('validation', () => {
    it('should call validate on build', () => {
      const builder = new TestBuilder();

      // Valid config
      expect(() => {
        builder.value(10).build();
      }).not.toThrow();
    });

    it('should throw on invalid config', () => {
      const builder = new TestBuilder();

      expect(() => {
        builder.value(-1).build();
      }).toThrow('Value must be non-negative');
    });

    it('should validate even with when conditions', () => {
      const builder = new TestBuilder();

      expect(() => {
        builder
          .name('test')
          .when(true, (b) => b.value(-10))
          .build();
      }).toThrow('Value must be non-negative');
    });
  });

  describe('getConfigClone', () => {
    it('should return deep copy of config', () => {
      const builder = new TestBuilder({
        name: 'test',
        nested: { enabled: true, options: ['a', 'b'] },
      });

      const clone = builder.testGetConfigClone();

      // Modify clone
      clone.name = 'modified';
      clone.nested!.enabled = false;
      clone.nested!.options!.push('c');

      // Original should be unchanged
      const original = builder.build();
      expect(original.name).toBe('test');
      expect(original.nested!.enabled).toBe(true);
      expect(original.nested!.options).toEqual(['a', 'b']);
    });

    it('should handle empty config', () => {
      const builder = new TestBuilder();
      const clone = builder.testGetConfigClone();

      expect(clone).toEqual({});
    });

    it('should handle null and undefined values', () => {
      const builder = new TestBuilder({
        name: undefined,
        value: 0,
        nested: { enabled: undefined },
      });

      const clone = builder.testGetConfigClone();

      expect(clone).toEqual({
        value: 0,
        nested: {},
      });
    });
  });

  describe('merge', () => {
    it('should perform shallow merge', () => {
      const builder = new TestBuilder({ name: 'test', value: 10 });

      builder.testMerge({ value: 20, tags: ['new'] });
      const config = builder.build();

      expect(config).toEqual({
        name: 'test',
        value: 20,
        tags: ['new'],
      });
    });

    it('should override existing properties', () => {
      const builder = new TestBuilder({
        name: 'original',
        nested: { enabled: true, options: ['a'] },
      });

      builder.testMerge({
        nested: { enabled: false },
      });

      const config = builder.build();

      // Shallow merge replaces nested object entirely
      expect(config.nested).toEqual({ enabled: false });
    });

    it('should preserve unspecified properties', () => {
      const builder = new TestBuilder({
        name: 'test',
        value: 100,
        tags: ['original'],
      });

      builder.testMerge({ value: 200 });
      const config = builder.build();

      expect(config.name).toBe('test');
      expect(config.tags).toEqual(['original']);
    });

    it('should return this for chaining', () => {
      const builder = new TestBuilder();
      const result = builder.testMerge({ name: 'test' });

      expect(result).toBe(builder);
    });
  });

  describe('mergeDeep', () => {
    it('should perform deep merge on nested objects', () => {
      const builder = new TestBuilder({
        name: 'test',
        nested: { enabled: true, options: ['a', 'b'] },
      });

      builder.testMergeDeep({
        nested: { enabled: false },
      });

      const config = builder.build();

      // Deep merge preserves options array
      expect(config.nested).toEqual({
        enabled: false,
        options: ['a', 'b'],
      });
    });

    it('should handle multiple levels of nesting', () => {
      interface DeepConfig {
        level1?: {
          level2?: {
            level3?: {
              value?: string;
              count?: number;
            };
          };
        };
      }

      class DeepBuilder extends BaseBuilder<DeepConfig> {
        constructor() {
          super({});
        }
        build(): DeepConfig {
          return this.config;
        }
        public merge(config: Partial<DeepConfig>): this {
          return this.mergeDeep(config);
        }
      }

      const builder = new DeepBuilder();
      builder.merge({
        level1: {
          level2: {
            level3: { value: 'deep', count: 1 },
          },
        },
      });

      builder.merge({
        level1: {
          level2: {
            level3: { count: 2 },
          },
        },
      });

      const config = builder.build();

      expect(config.level1?.level2?.level3).toEqual({
        value: 'deep',
        count: 2,
      });
    });

    it('should handle array replacement', () => {
      const builder = new TestBuilder({
        nested: { options: ['a', 'b'] },
      });

      builder.testMergeDeep({
        nested: { options: ['c', 'd'] },
      });

      const config = builder.build();

      // Arrays are replaced, not merged
      expect(config.nested!.options).toEqual(['c', 'd']);
    });

    it('should return this for chaining', () => {
      const builder = new TestBuilder();
      const result = builder.testMergeDeep({ name: 'test' });

      expect(result).toBe(builder);
    });

    it('should handle undefined values', () => {
      const builder = new TestBuilder({
        name: 'test',
        value: 10,
      });

      builder.testMergeDeep({
        name: undefined,
        nested: { enabled: true },
      });

      const config = builder.build();

      expect(config.name).toBe('test'); // undefined doesn't override
      expect(config.nested).toEqual({ enabled: true });
    });
  });

  describe('BuilderConfig type helper', () => {
    it('should extract config type from builder', () => {
      type ExtractedConfig = BuilderConfig<TestBuilder>;

      const config: ExtractedConfig = {
        name: 'test',
        value: 42,
        nested: { enabled: true, options: ['a'] },
        tags: ['tag1'],
      };

      expect(config.name).toBe('test');
    });
  });

  describe('complex usage scenarios', () => {
    it('should handle builder composition', () => {
      const config = new TestBuilder()
        .name('complex')
        .value(100)
        .when(true, (b) => b.addTag('prod').nested((n) => ({ ...n, enabled: true })))
        .when(false, (b) => b.addTag('dev'))
        .addTag('common')
        .build();

      expect(config).toEqual({
        name: 'complex',
        value: 100,
        nested: { enabled: true },
        tags: ['prod', 'common'],
      });
    });

    it('should support conditional configuration based on existing state', () => {
      const builder = new TestBuilder().name('app').value(50);

      const currentConfig = builder.build();
      const isHighValue = currentConfig.value && currentConfig.value > 40;

      const finalConfig = builder.when(isHighValue, (b) => b.addTag('high-value')).build();

      expect(finalConfig.tags).toContain('high-value');
    });

    it('should handle building multiple times', () => {
      const builder = new TestBuilder().name('test').value(10);

      const config1 = builder.build();
      const config2 = builder.addTag('new').build();

      expect(config1.tags).toBeUndefined();
      expect(config2.tags).toEqual(['new']);
    });
  });

  describe('edge cases', () => {
    it('should handle empty when callback', () => {
      const config = new TestBuilder()
        .name('test')
        .when(true, (b) => b) // No changes
        .build();

      expect(config).toEqual({ name: 'test' });
    });

    it('should handle zero values', () => {
      const config = new TestBuilder().value(0).build();

      expect(config.value).toBe(0);
    });

    it('should handle empty string', () => {
      const config = new TestBuilder().name('').build();

      expect(config.name).toBe('');
    });

    it('should handle false boolean in when', () => {
      let executedCount = 0;

      new TestBuilder()
        .when(false, (b) => {
          executedCount++;
          return b;
        })
        .build();

      expect(executedCount).toBe(0);
    });

    it('should handle true boolean in when', () => {
      let executedCount = 0;

      new TestBuilder()
        .when(true, (b) => {
          executedCount++;
          return b;
        })
        .build();

      expect(executedCount).toBe(1);
    });
  });

  describe('performance', () => {
    it('should handle large number of chained calls efficiently', () => {
      const startTime = Date.now();

      let builder = new TestBuilder().name('perf-test');

      // Chain 1000 operations
      for (let i = 0; i < 1000; i++) {
        builder = builder.addTag(`tag-${i}`);
      }

      const config = builder.build();
      const duration = Date.now() - startTime;

      expect(config.tags).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should handle deep merges efficiently', () => {
      const startTime = Date.now();

      let builder = new TestBuilder();

      // Perform 100 deep merges
      for (let i = 0; i < 100; i++) {
        builder = builder.testMergeDeep({
          nested: { enabled: i % 2 === 0 },
        });
      }

      const config = builder.build();
      const duration = Date.now() - startTime;

      expect(config.nested?.enabled).toBe(false); // Last merge wins
      expect(duration).toBeLessThan(50); // Should complete in < 50ms
    });
  });
});
