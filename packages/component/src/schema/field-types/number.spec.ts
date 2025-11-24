/**
 * Unit tests for number field builder
 *
 * Tests number-specific functionality:
 * - Basic number field creation
 * - Constraints (min, max, integer, positive, negative)
 * - Edge cases (zero, negative, decimal, large numbers, Infinity, NaN)
 * - Combined validations
 */

import { describe, it, expect } from 'vitest';
import { NumberFieldBuilder } from './number';

describe('NumberFieldBuilder', () => {
  describe('constructor', () => {
    it('should create number field with correct type', () => {
      const field = new NumberFieldBuilder();
      const config = field._build();

      expect(config.type).toBe('number');
    });

    it('should initialize with empty validations', () => {
      const field = new NumberFieldBuilder();
      const config = field._build();

      expect(config.validations).toEqual([]);
    });
  });

  describe('min()', () => {
    it('should set minimum value', () => {
      const field = new NumberFieldBuilder().min(10);
      const config = field._build();

      expect(config.min).toBe(10);
    });

    it('should add min validation rule', () => {
      const field = new NumberFieldBuilder().min(10);
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'min',
        value: 10,
        message: 'Must be at least 10',
      });
    });

    it('should support method chaining', () => {
      const field = new NumberFieldBuilder().min(10);

      expect(field).toBeInstanceOf(NumberFieldBuilder);
    });

    it('should handle zero as minimum', () => {
      const field = new NumberFieldBuilder().min(0);
      const config = field._build();

      expect(config.min).toBe(0);
    });

    it('should handle negative minimum', () => {
      const field = new NumberFieldBuilder().min(-100);
      const config = field._build();

      expect(config.min).toBe(-100);
    });

    it('should handle decimal minimum', () => {
      const field = new NumberFieldBuilder().min(0.01);
      const config = field._build();

      expect(config.min).toBe(0.01);
    });

    it('should handle very large minimum', () => {
      const field = new NumberFieldBuilder().min(1e10);
      const config = field._build();

      expect(config.min).toBe(1e10);
    });
  });

  describe('max()', () => {
    it('should set maximum value', () => {
      const field = new NumberFieldBuilder().max(100);
      const config = field._build();

      expect(config.max).toBe(100);
    });

    it('should add max validation rule', () => {
      const field = new NumberFieldBuilder().max(100);
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'max',
        value: 100,
        message: 'Must be at most 100',
      });
    });

    it('should support method chaining', () => {
      const field = new NumberFieldBuilder().max(100);

      expect(field).toBeInstanceOf(NumberFieldBuilder);
    });

    it('should handle zero as maximum', () => {
      const field = new NumberFieldBuilder().max(0);
      const config = field._build();

      expect(config.max).toBe(0);
    });

    it('should handle negative maximum', () => {
      const field = new NumberFieldBuilder().max(-10);
      const config = field._build();

      expect(config.max).toBe(-10);
    });

    it('should handle decimal maximum', () => {
      const field = new NumberFieldBuilder().max(99.99);
      const config = field._build();

      expect(config.max).toBe(99.99);
    });
  });

  describe('min() and max() combined', () => {
    it('should support both min and max', () => {
      const field = new NumberFieldBuilder().min(0).max(100);
      const config = field._build();

      expect(config.min).toBe(0);
      expect(config.max).toBe(100);
    });

    it('should add both validation rules', () => {
      const field = new NumberFieldBuilder().min(0).max(100);
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'min',
        value: 0,
        message: 'Must be at least 0',
      });
      expect(config.validations).toContainEqual({
        type: 'max',
        value: 100,
        message: 'Must be at most 100',
      });
    });

    it('should allow min to equal max', () => {
      const field = new NumberFieldBuilder().min(42).max(42);
      const config = field._build();

      expect(config.min).toBe(42);
      expect(config.max).toBe(42);
    });
  });

  describe('integer()', () => {
    it('should set isInteger flag', () => {
      const field = new NumberFieldBuilder().integer();
      const config = field._build();

      expect(config.isInteger).toBe(true);
    });

    it('should add integer validation rule', () => {
      const field = new NumberFieldBuilder().integer();
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'integer',
        message: 'Must be an integer (whole number)',
      });
    });

    it('should support method chaining', () => {
      const field = new NumberFieldBuilder().integer();

      expect(field).toBeInstanceOf(NumberFieldBuilder);
    });

    it('should work with min/max', () => {
      const field = new NumberFieldBuilder().integer().min(1).max(100);
      const config = field._build();

      expect(config.isInteger).toBe(true);
      expect(config.min).toBe(1);
      expect(config.max).toBe(100);
    });
  });

  describe('positive()', () => {
    it('should set isPositive flag', () => {
      const field = new NumberFieldBuilder().positive();
      const config = field._build();

      expect(config.isPositive).toBe(true);
    });

    it('should add positive validation rule', () => {
      const field = new NumberFieldBuilder().positive();
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'positive',
        message: 'Must be a positive number',
      });
    });

    it('should support method chaining', () => {
      const field = new NumberFieldBuilder().positive();

      expect(field).toBeInstanceOf(NumberFieldBuilder);
    });

    it('should work with integer', () => {
      const field = new NumberFieldBuilder().integer().positive();
      const config = field._build();

      expect(config.isInteger).toBe(true);
      expect(config.isPositive).toBe(true);
    });
  });

  describe('negative()', () => {
    it('should set isNegative flag', () => {
      const field = new NumberFieldBuilder().negative();
      const config = field._build();

      expect(config.isNegative).toBe(true);
    });

    it('should add negative validation rule', () => {
      const field = new NumberFieldBuilder().negative();
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'negative',
        message: 'Must be a negative number',
      });
    });

    it('should support method chaining', () => {
      const field = new NumberFieldBuilder().negative();

      expect(field).toBeInstanceOf(NumberFieldBuilder);
    });

    it('should work with integer', () => {
      const field = new NumberFieldBuilder().integer().negative();
      const config = field._build();

      expect(config.isInteger).toBe(true);
      expect(config.isNegative).toBe(true);
    });
  });

  describe('nonNegative()', () => {
    it('should be alias for min(0)', () => {
      const field = new NumberFieldBuilder().nonNegative();
      const config = field._build();

      expect(config.min).toBe(0);
    });

    it('should add min validation rule', () => {
      const field = new NumberFieldBuilder().nonNegative();
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'min',
        value: 0,
        message: 'Must be at least 0',
      });
    });

    it('should support method chaining', () => {
      const field = new NumberFieldBuilder().nonNegative();

      expect(field).toBeInstanceOf(NumberFieldBuilder);
    });
  });

  describe('nonPositive()', () => {
    it('should be alias for max(0)', () => {
      const field = new NumberFieldBuilder().nonPositive();
      const config = field._build();

      expect(config.max).toBe(0);
    });

    it('should add max validation rule', () => {
      const field = new NumberFieldBuilder().nonPositive();
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'max',
        value: 0,
        message: 'Must be at most 0',
      });
    });

    it('should support method chaining', () => {
      const field = new NumberFieldBuilder().nonPositive();

      expect(field).toBeInstanceOf(NumberFieldBuilder);
    });
  });

  describe('default values', () => {
    it('should support zero as default', () => {
      const field = new NumberFieldBuilder().default(0);
      const config = field._build();

      expect(config.defaultValue).toBe(0);
    });

    it('should support positive default', () => {
      const field = new NumberFieldBuilder().default(42);
      const config = field._build();

      expect(config.defaultValue).toBe(42);
    });

    it('should support negative default', () => {
      const field = new NumberFieldBuilder().default(-10);
      const config = field._build();

      expect(config.defaultValue).toBe(-10);
    });

    it('should support decimal default', () => {
      const field = new NumberFieldBuilder().default(3.14159);
      const config = field._build();

      expect(config.defaultValue).toBe(3.14159);
    });

    it('should support very large default', () => {
      const field = new NumberFieldBuilder().default(1e20);
      const config = field._build();

      expect(config.defaultValue).toBe(1e20);
    });

    it('should support very small default', () => {
      const field = new NumberFieldBuilder().default(1e-10);
      const config = field._build();

      expect(config.defaultValue).toBe(1e-10);
    });
  });

  describe('combined validations', () => {
    it('should support integer with range', () => {
      const field = new NumberFieldBuilder().integer().min(1).max(100);
      const config = field._build();

      expect(config.isInteger).toBe(true);
      expect(config.min).toBe(1);
      expect(config.max).toBe(100);
    });

    it('should support positive integer', () => {
      const field = new NumberFieldBuilder().integer().positive();
      const config = field._build();

      expect(config.isInteger).toBe(true);
      expect(config.isPositive).toBe(true);
    });

    it('should support all modifiers', () => {
      const field = new NumberFieldBuilder().integer().min(1).max(100).required().default(10);
      const config = field._build();

      expect(config.isInteger).toBe(true);
      expect(config.min).toBe(1);
      expect(config.max).toBe(100);
      expect(config.isRequired).toBe(true);
      expect(config.defaultValue).toBe(10);
    });
  });

  describe('edge cases', () => {
    it('should handle Infinity as default', () => {
      const field = new NumberFieldBuilder().default(Infinity);
      const config = field._build();

      expect(config.defaultValue).toBe(Infinity);
    });

    it('should handle -Infinity as default', () => {
      const field = new NumberFieldBuilder().default(-Infinity);
      const config = field._build();

      expect(config.defaultValue).toBe(-Infinity);
    });

    it('should handle NaN as default', () => {
      const field = new NumberFieldBuilder().default(NaN);
      const config = field._build();

      expect(config.defaultValue).toBeNaN();
    });

    it('should handle Number.MAX_VALUE', () => {
      const field = new NumberFieldBuilder().max(Number.MAX_VALUE);
      const config = field._build();

      expect(config.max).toBe(Number.MAX_VALUE);
    });

    it('should handle Number.MIN_VALUE', () => {
      const field = new NumberFieldBuilder().min(Number.MIN_VALUE);
      const config = field._build();

      expect(config.min).toBe(Number.MIN_VALUE);
    });

    it('should handle Number.MAX_SAFE_INTEGER', () => {
      const field = new NumberFieldBuilder().max(Number.MAX_SAFE_INTEGER);
      const config = field._build();

      expect(config.max).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle Number.MIN_SAFE_INTEGER', () => {
      const field = new NumberFieldBuilder().min(Number.MIN_SAFE_INTEGER);
      const config = field._build();

      expect(config.min).toBe(Number.MIN_SAFE_INTEGER);
    });

    it('should handle very precise decimals', () => {
      const field = new NumberFieldBuilder().default(0.1 + 0.2); // JavaScript floating point issue
      const config = field._build();

      expect(config.defaultValue).toBeCloseTo(0.3);
    });
  });

  describe('inheritance from BaseFieldBuilder', () => {
    it('should inherit required() method', () => {
      const field = new NumberFieldBuilder().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should inherit optional() method', () => {
      const field = new NumberFieldBuilder().optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should inherit nullable() method', () => {
      const field = new NumberFieldBuilder().nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });

    it('should inherit custom() method', () => {
      const validator = (value: number) => value % 2 === 0;
      const field = new NumberFieldBuilder().custom(validator, 'Must be even');
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule).toBeDefined();
      expect(customRule?.message).toBe('Must be even');
    });
  });

  describe('real-world scenarios', () => {
    it('should configure age field', () => {
      const field = new NumberFieldBuilder().integer().min(0).max(120).required();
      const config = field._build();

      expect(config.isInteger).toBe(true);
      expect(config.min).toBe(0);
      expect(config.max).toBe(120);
      expect(config.isRequired).toBe(true);
    });

    it('should configure price field', () => {
      const field = new NumberFieldBuilder().positive().min(0.01).required();
      const config = field._build();

      expect(config.isPositive).toBe(true);
      expect(config.min).toBe(0.01);
      expect(config.isRequired).toBe(true);
    });

    it('should configure quantity field', () => {
      const field = new NumberFieldBuilder().integer().positive().default(1);
      const config = field._build();

      expect(config.isInteger).toBe(true);
      expect(config.isPositive).toBe(true);
      expect(config.defaultValue).toBe(1);
    });

    it('should configure percentage field', () => {
      const field = new NumberFieldBuilder().min(0).max(100).default(0);
      const config = field._build();

      expect(config.min).toBe(0);
      expect(config.max).toBe(100);
      expect(config.defaultValue).toBe(0);
    });

    it('should configure temperature field', () => {
      const field = new NumberFieldBuilder().min(-273.15); // Absolute zero
      const config = field._build();

      expect(config.min).toBe(-273.15);
    });

    it('should configure year field', () => {
      const field = new NumberFieldBuilder().integer().min(1900).max(2100).required();
      const config = field._build();

      expect(config.isInteger).toBe(true);
      expect(config.min).toBe(1900);
      expect(config.max).toBe(2100);
      expect(config.isRequired).toBe(true);
    });

    it('should configure rating field', () => {
      const field = new NumberFieldBuilder().integer().min(1).max(5).required();
      const config = field._build();

      expect(config.isInteger).toBe(true);
      expect(config.min).toBe(1);
      expect(config.max).toBe(5);
      expect(config.isRequired).toBe(true);
    });
  });
});
