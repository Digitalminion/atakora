/**
 * Unit tests for JSON field builder
 *
 * Tests JSON-specific functionality:
 * - JSON field creation
 * - Object-only constraint
 * - Array-only constraint
 * - Default values
 */

import { describe, it, expect } from 'vitest';
import { JsonFieldBuilder } from './json';

describe('JsonFieldBuilder', () => {
  describe('constructor', () => {
    it('should create json field with correct type', () => {
      const field = new JsonFieldBuilder();
      const config = field._build();

      expect(config.type).toBe('json');
    });

    it('should initialize with empty validations', () => {
      const field = new JsonFieldBuilder();
      const config = field._build();

      expect(config.validations).toEqual([]);
    });
  });

  describe('objectOnly()', () => {
    it('should add objectOnly validation rule', () => {
      const field = new JsonFieldBuilder().objectOnly();
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule).toBeDefined();
      expect(customRule?.message).toBe('Must be a JSON object');
    });

    it('should validate objects correctly', () => {
      const field = new JsonFieldBuilder().objectOnly();
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator({ key: 'value' })).toBe(true);
      expect(customRule.validator({})).toBe(true);
    });

    it('should reject arrays', () => {
      const field = new JsonFieldBuilder().objectOnly();
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator([])).toBe(false);
      expect(customRule.validator([1, 2, 3])).toBe(false);
    });

    it('should reject primitives', () => {
      const field = new JsonFieldBuilder().objectOnly();
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator('string')).toBe(false);
      expect(customRule.validator(123)).toBe(false);
      expect(customRule.validator(true)).toBe(false);
    });

    it('should reject null', () => {
      const field = new JsonFieldBuilder().objectOnly();
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator(null)).toBe(false);
    });

    it('should support method chaining', () => {
      const field = new JsonFieldBuilder().objectOnly();

      expect(field).toBeInstanceOf(JsonFieldBuilder);
    });
  });

  describe('arrayOnly()', () => {
    it('should add arrayOnly validation rule', () => {
      const field = new JsonFieldBuilder().arrayOnly();
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule).toBeDefined();
      expect(customRule?.message).toBe('Must be a JSON array');
    });

    it('should validate arrays correctly', () => {
      const field = new JsonFieldBuilder().arrayOnly();
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator([])).toBe(true);
      expect(customRule.validator([1, 2, 3])).toBe(true);
      expect(customRule.validator(['a', 'b', 'c'])).toBe(true);
    });

    it('should reject objects', () => {
      const field = new JsonFieldBuilder().arrayOnly();
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator({})).toBe(false);
      expect(customRule.validator({ key: 'value' })).toBe(false);
    });

    it('should reject primitives', () => {
      const field = new JsonFieldBuilder().arrayOnly();
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator('string')).toBe(false);
      expect(customRule.validator(123)).toBe(false);
      expect(customRule.validator(true)).toBe(false);
    });

    it('should support method chaining', () => {
      const field = new JsonFieldBuilder().arrayOnly();

      expect(field).toBeInstanceOf(JsonFieldBuilder);
    });
  });

  describe('default values', () => {
    it('should support empty object as default', () => {
      const field = new JsonFieldBuilder().default({});
      const config = field._build();

      expect(config.defaultValue).toEqual({});
    });

    it('should support object with values as default', () => {
      const defaultValue = { key: 'value', nested: { data: 123 } };
      const field = new JsonFieldBuilder().default(defaultValue);
      const config = field._build();

      expect(config.defaultValue).toEqual(defaultValue);
    });

    it('should support empty array as default', () => {
      const field = new JsonFieldBuilder().default([]);
      const config = field._build();

      expect(config.defaultValue).toEqual([]);
    });

    it('should support array with values as default', () => {
      const field = new JsonFieldBuilder().default([1, 2, 3, 'four']);
      const config = field._build();

      expect(config.defaultValue).toEqual([1, 2, 3, 'four']);
    });

    it('should support null as default', () => {
      const field = new JsonFieldBuilder().default(null);
      const config = field._build();

      expect(config.defaultValue).toBe(null);
    });

    it('should support primitive defaults', () => {
      const field = new JsonFieldBuilder().default('string');
      const config = field._build();

      expect(config.defaultValue).toBe('string');
    });

    it('should support complex nested structures', () => {
      const defaultValue = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        metadata: {
          count: 2,
          page: 1,
        },
      };
      const field = new JsonFieldBuilder().default(defaultValue);
      const config = field._build();

      expect(config.defaultValue).toEqual(defaultValue);
    });
  });

  describe('inheritance from BaseFieldBuilder', () => {
    it('should inherit required() method', () => {
      const field = new JsonFieldBuilder().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should inherit optional() method', () => {
      const field = new JsonFieldBuilder().optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should inherit nullable() method', () => {
      const field = new JsonFieldBuilder().nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });
  });

  describe('method chaining', () => {
    it('should support objectOnly with default', () => {
      const field = new JsonFieldBuilder().objectOnly().default({});
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must be a JSON object');
      expect(config.defaultValue).toEqual({});
    });

    it('should support arrayOnly with default', () => {
      const field = new JsonFieldBuilder().arrayOnly().default([]);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must be a JSON array');
      expect(config.defaultValue).toEqual([]);
    });

    it('should support all modifiers', () => {
      const field = new JsonFieldBuilder().objectOnly().required().default({});
      const config = field._build();

      expect(config.isRequired).toBe(true);
      expect(config.defaultValue).toEqual({});
    });
  });

  describe('edge cases', () => {
    it('should handle very large JSON objects', () => {
      const largeObject: any = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`key${i}`] = `value${i}`;
      }
      const field = new JsonFieldBuilder().default(largeObject);
      const config = field._build();

      expect(config.defaultValue).toEqual(largeObject);
      expect(Object.keys(config.defaultValue)).toHaveLength(1000);
    });

    it('should handle deeply nested JSON', () => {
      const deepObject: any = { level: 1 };
      let current = deepObject;
      for (let i = 2; i <= 10; i++) {
        current.nested = { level: i };
        current = current.nested;
      }
      const field = new JsonFieldBuilder().default(deepObject);
      const config = field._build();

      expect(config.defaultValue).toEqual(deepObject);
    });

    it('should handle JSON with special characters', () => {
      const specialObject = {
        'key-with-dash': 'value',
        'key.with.dots': 'value',
        'key with spaces': 'value',
        'key@symbol': 'value',
      };
      const field = new JsonFieldBuilder().default(specialObject);
      const config = field._build();

      expect(config.defaultValue).toEqual(specialObject);
    });

    it('should handle JSON with unicode', () => {
      const unicodeObject = {
        chinese: '你好',
        emoji: '🎉',
        arabic: 'مرحبا',
      };
      const field = new JsonFieldBuilder().default(unicodeObject);
      const config = field._build();

      expect(config.defaultValue).toEqual(unicodeObject);
    });
  });

  describe('real-world scenarios', () => {
    it('should configure metadata field', () => {
      const field = new JsonFieldBuilder().default({});
      const config = field._build();

      expect(config.defaultValue).toEqual({});
    });

    it('should configure settings field with objectOnly', () => {
      const field = new JsonFieldBuilder().objectOnly().default({
        theme: 'dark',
        language: 'en',
      });
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must be a JSON object');
      expect(config.defaultValue.theme).toBe('dark');
    });

    it('should configure optional preferences', () => {
      const field = new JsonFieldBuilder().optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should configure dynamic configuration', () => {
      const field = new JsonFieldBuilder().required().default({});
      const config = field._build();

      expect(config.isRequired).toBe(true);
      expect(config.defaultValue).toEqual({});
    });

    it('should configure API response data', () => {
      const field = new JsonFieldBuilder().arrayOnly().default([]);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must be a JSON array');
      expect(config.defaultValue).toEqual([]);
    });

    it('should configure custom properties bag', () => {
      const field = new JsonFieldBuilder().objectOnly().optional();
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must be a JSON object');
      expect(config.isOptional).toBe(true);
    });
  });
});
