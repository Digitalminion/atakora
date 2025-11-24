/**
 * Unit tests for array field builder
 *
 * Tests array-specific functionality:
 * - Array field creation with item type
 * - Size constraints (minItems, maxItems)
 * - Uniqueness constraint
 * - Non-empty constraint
 * - Edge cases (empty array, nested arrays)
 */

import { describe, it, expect } from 'vitest';
import { ArrayFieldBuilder } from './array';
import { StringFieldBuilder } from './string';
import { NumberFieldBuilder } from './number';

describe('ArrayFieldBuilder', () => {
  describe('constructor', () => {
    it('should create array field with correct type', () => {
      const itemType = new StringFieldBuilder();
      const field = new ArrayFieldBuilder(itemType);
      const config = field._build();

      expect(config.type).toBe('array');
    });

    it('should store item type', () => {
      const itemType = new StringFieldBuilder();
      const field = new ArrayFieldBuilder(itemType);
      const config = field._build();

      expect(config.itemType).toBe(itemType);
    });

    it('should initialize with empty validations', () => {
      const itemType = new StringFieldBuilder();
      const field = new ArrayFieldBuilder(itemType);
      const config = field._build();

      expect(config.validations).toEqual([]);
    });

    it('should work with number item type', () => {
      const itemType = new NumberFieldBuilder();
      const field = new ArrayFieldBuilder(itemType);
      const config = field._build();

      expect(config.itemType).toBe(itemType);
    });
  });

  describe('getItemType()', () => {
    it('should return item type', () => {
      const itemType = new StringFieldBuilder();
      const field = new ArrayFieldBuilder(itemType);

      expect(field.getItemType()).toBe(itemType);
    });

    it('should return original item type reference', () => {
      const itemType = new NumberFieldBuilder();
      const field = new ArrayFieldBuilder(itemType);

      expect(field.getItemType()).toBe(itemType);
    });
  });

  describe('minItems()', () => {
    it('should set minimum items', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).minItems(1);
      const config = field._build();

      expect(config.minItems).toBe(1);
    });

    it('should add minItems validation rule', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).minItems(2);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule).toBeDefined();
      expect(customRule?.message).toBe('Must contain at least 2 items');
    });

    it('should use singular "item" for minItems(1)', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).minItems(1);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must contain at least 1 item');
    });

    it('should use plural "items" for minItems > 1', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).minItems(5);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must contain at least 5 items');
    });

    it('should validate array length correctly', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).minItems(2);
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator([1])).toBe(false);
      expect(customRule.validator([1, 2])).toBe(true);
      expect(customRule.validator([1, 2, 3])).toBe(true);
    });

    it('should support method chaining', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).minItems(1);

      expect(field).toBeInstanceOf(ArrayFieldBuilder);
    });

    it('should handle minItems(0)', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).minItems(0);
      const config = field._build();

      expect(config.minItems).toBe(0);
    });
  });

  describe('maxItems()', () => {
    it('should set maximum items', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).maxItems(10);
      const config = field._build();

      expect(config.maxItems).toBe(10);
    });

    it('should add maxItems validation rule', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).maxItems(5);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule).toBeDefined();
      expect(customRule?.message).toBe('Must contain at most 5 items');
    });

    it('should use singular "item" for maxItems(1)', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).maxItems(1);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must contain at most 1 item');
    });

    it('should validate array length correctly', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).maxItems(3);
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator([1, 2])).toBe(true);
      expect(customRule.validator([1, 2, 3])).toBe(true);
      expect(customRule.validator([1, 2, 3, 4])).toBe(false);
    });

    it('should support method chaining', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).maxItems(10);

      expect(field).toBeInstanceOf(ArrayFieldBuilder);
    });
  });

  describe('minItems() and maxItems() combined', () => {
    it('should support both min and max', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).minItems(1).maxItems(10);
      const config = field._build();

      expect(config.minItems).toBe(1);
      expect(config.maxItems).toBe(10);
    });

    it('should add both validation rules', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).minItems(1).maxItems(10);
      const config = field._build();

      expect(config.validations).toHaveLength(2);
    });

    it('should allow min to equal max', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).minItems(5).maxItems(5);
      const config = field._build();

      expect(config.minItems).toBe(5);
      expect(config.maxItems).toBe(5);
    });
  });

  describe('unique()', () => {
    it('should set unique flag', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).unique();
      const config = field._build();

      expect(config.unique).toBe(true);
    });

    it('should add unique validation rule', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).unique();
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule).toBeDefined();
      expect(customRule?.message).toBe('Array items must be unique');
    });

    it('should validate uniqueness correctly', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).unique();
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator([1, 2, 3])).toBe(true);
      expect(customRule.validator([1, 2, 2, 3])).toBe(false);
      expect(customRule.validator([1, 1])).toBe(false);
    });

    it('should handle empty array as unique', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).unique();
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator([])).toBe(true);
    });

    it('should support method chaining', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).unique();

      expect(field).toBeInstanceOf(ArrayFieldBuilder);
    });
  });

  describe('nonEmpty()', () => {
    it('should be alias for minItems(1)', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).nonEmpty();
      const config = field._build();

      expect(config.minItems).toBe(1);
    });

    it('should add minItems validation', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).nonEmpty();
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must contain at least 1 item');
    });

    it('should support method chaining', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).nonEmpty();

      expect(field).toBeInstanceOf(ArrayFieldBuilder);
    });
  });

  describe('default values', () => {
    it('should support empty array as default', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).default([]);
      const config = field._build();

      expect(config.defaultValue).toEqual([]);
    });

    it('should support array with values as default', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).default(['tag1', 'tag2']);
      const config = field._build();

      expect(config.defaultValue).toEqual(['tag1', 'tag2']);
    });

    it('should support number array default', () => {
      const field = new ArrayFieldBuilder(new NumberFieldBuilder()).default([1, 2, 3]);
      const config = field._build();

      expect(config.defaultValue).toEqual([1, 2, 3]);
    });
  });

  describe('combined validations', () => {
    it('should support minItems with unique', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).minItems(1).unique();
      const config = field._build();

      expect(config.minItems).toBe(1);
      expect(config.unique).toBe(true);
    });

    it('should support all constraints together', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder())
        .minItems(1)
        .maxItems(10)
        .unique();
      const config = field._build();

      expect(config.minItems).toBe(1);
      expect(config.maxItems).toBe(10);
      expect(config.unique).toBe(true);
    });

    it('should support all modifiers', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder())
        .minItems(1)
        .maxItems(5)
        .unique()
        .required()
        .default([]);
      const config = field._build();

      expect(config.minItems).toBe(1);
      expect(config.maxItems).toBe(5);
      expect(config.unique).toBe(true);
      expect(config.isRequired).toBe(true);
      expect(config.defaultValue).toEqual([]);
    });
  });

  describe('inheritance from BaseFieldBuilder', () => {
    it('should inherit required() method', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should inherit optional() method', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should inherit nullable() method', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle nested arrays', () => {
      const innerArray = new ArrayFieldBuilder(new StringFieldBuilder());
      const field = new ArrayFieldBuilder(innerArray);
      const config = field._build();

      expect(config.itemType).toBe(innerArray);
    });

    it('should handle very large maxItems', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).maxItems(1000000);
      const config = field._build();

      expect(config.maxItems).toBe(1000000);
    });

    it('should handle complex item types', () => {
      const complexItem = new StringFieldBuilder().email().required();
      const field = new ArrayFieldBuilder(complexItem);
      const config = field._build();

      expect(config.itemType).toBe(complexItem);
    });
  });

  describe('real-world scenarios', () => {
    it('should configure tags array', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).default([]);
      const config = field._build();

      expect(config.itemType).toBeInstanceOf(StringFieldBuilder);
      expect(config.defaultValue).toEqual([]);
    });

    it('should configure email list', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder().email())
        .minItems(1)
        .maxItems(5)
        .unique();
      const config = field._build();

      expect(config.minItems).toBe(1);
      expect(config.maxItems).toBe(5);
      expect(config.unique).toBe(true);
    });

    it('should configure ratings array', () => {
      const field = new ArrayFieldBuilder(
        new NumberFieldBuilder().integer().min(1).max(5)
      ).nonEmpty();
      const config = field._build();

      expect(config.minItems).toBe(1);
    });

    it('should configure unique user IDs', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).unique().required();
      const config = field._build();

      expect(config.unique).toBe(true);
      expect(config.isRequired).toBe(true);
    });

    it('should configure optional categories', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).optional().default([]);
      const config = field._build();

      expect(config.isOptional).toBe(true);
      expect(config.defaultValue).toEqual([]);
    });

    it('should configure limited attachment list', () => {
      const field = new ArrayFieldBuilder(new StringFieldBuilder()).maxItems(10).default([]);
      const config = field._build();

      expect(config.maxItems).toBe(10);
      expect(config.defaultValue).toEqual([]);
    });
  });
});
