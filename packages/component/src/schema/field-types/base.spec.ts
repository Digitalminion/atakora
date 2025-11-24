/**
 * Unit tests for base field builder
 *
 * Tests common functionality inherited by all field types:
 * - Required/optional modifiers
 * - Default values
 * - Nullable support
 * - Custom validation
 * - Configuration merging
 */

import { describe, it, expect } from 'vitest';
import { BaseFieldBuilder, type BaseFieldConfig } from './base';

// Concrete implementation for testing base functionality
class TestFieldBuilder extends BaseFieldBuilder<string, BaseFieldConfig> {
  constructor() {
    super('test');
  }
}

describe('BaseFieldBuilder', () => {
  describe('constructor', () => {
    it('should initialize with correct type', () => {
      const field = new TestFieldBuilder();
      const config = field._build();

      expect(config.type).toBe('test');
      expect(config.validations).toEqual([]);
    });

    it('should return correct type from _getType()', () => {
      const field = new TestFieldBuilder();

      expect(field._getType()).toBe('test');
    });
  });

  describe('required()', () => {
    it('should mark field as required', () => {
      const field = new TestFieldBuilder().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
      expect(config.isOptional).toBe(false);
    });

    it('should add required validation rule', () => {
      const field = new TestFieldBuilder().required();
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'required',
        message: 'This field is required',
      });
    });

    it('should support method chaining', () => {
      const field = new TestFieldBuilder().required();

      expect(field).toBeInstanceOf(TestFieldBuilder);
    });

    it('should override optional when called after optional()', () => {
      const field = new TestFieldBuilder().optional().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
      expect(config.isOptional).toBe(false);
    });
  });

  describe('optional()', () => {
    it('should mark field as optional', () => {
      const field = new TestFieldBuilder().optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
      expect(config.isRequired).toBe(false);
    });

    it('should add optional validation rule', () => {
      const field = new TestFieldBuilder().optional();
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'optional',
      });
    });

    it('should support method chaining', () => {
      const field = new TestFieldBuilder().optional();

      expect(field).toBeInstanceOf(TestFieldBuilder);
    });

    it('should override required when called after required()', () => {
      const field = new TestFieldBuilder().required().optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
      expect(config.isRequired).toBe(false);
    });
  });

  describe('nullable()', () => {
    it('should mark field as nullable', () => {
      const field = new TestFieldBuilder().nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });

    it('should add nullable validation rule', () => {
      const field = new TestFieldBuilder().nullable();
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'nullable',
      });
    });

    it('should support method chaining', () => {
      const field = new TestFieldBuilder().nullable();

      expect(field).toBeInstanceOf(TestFieldBuilder);
    });

    it('should work with required', () => {
      const field = new TestFieldBuilder().required().nullable();
      const config = field._build();

      expect(config.isRequired).toBe(true);
      expect(config.isNullable).toBe(true);
    });

    it('should work with optional', () => {
      const field = new TestFieldBuilder().optional().nullable();
      const config = field._build();

      expect(config.isOptional).toBe(true);
      expect(config.isNullable).toBe(true);
    });
  });

  describe('default()', () => {
    it('should set default value', () => {
      const field = new TestFieldBuilder().default('test-value');
      const config = field._build();

      expect(config.defaultValue).toBe('test-value');
    });

    it('should support method chaining', () => {
      const field = new TestFieldBuilder().default('test-value');

      expect(field).toBeInstanceOf(TestFieldBuilder);
    });

    it('should allow null as default value', () => {
      const field = new TestFieldBuilder().default(null as any);
      const config = field._build();

      expect(config.defaultValue).toBe(null);
    });

    it('should allow undefined as default value', () => {
      const field = new TestFieldBuilder().default(undefined as any);
      const config = field._build();

      expect(config.defaultValue).toBe(undefined);
    });

    it('should work with required', () => {
      const field = new TestFieldBuilder().required().default('test');
      const config = field._build();

      expect(config.isRequired).toBe(true);
      expect(config.defaultValue).toBe('test');
    });

    it('should work with optional', () => {
      const field = new TestFieldBuilder().optional().default('test');
      const config = field._build();

      expect(config.isOptional).toBe(true);
      expect(config.defaultValue).toBe('test');
    });
  });

  describe('custom()', () => {
    it('should add custom validation rule', () => {
      const validator = (value: string) => value.length > 5;
      const field = new TestFieldBuilder().custom(validator);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule).toBeDefined();
      expect(customRule?.message).toBe('Custom validation failed');
    });

    it('should use custom error message when provided', () => {
      const validator = (value: string) => value.length > 5;
      const field = new TestFieldBuilder().custom(validator, 'Must be longer than 5 characters');
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must be longer than 5 characters');
    });

    it('should support method chaining', () => {
      const validator = (value: string) => value.length > 5;
      const field = new TestFieldBuilder().custom(validator);

      expect(field).toBeInstanceOf(TestFieldBuilder);
    });

    it('should allow multiple custom validations', () => {
      const validator1 = (value: string) => value.length > 5;
      const validator2 = (value: string) => value.length < 20;
      const field = new TestFieldBuilder()
        .custom(validator1, 'Too short')
        .custom(validator2, 'Too long');
      const config = field._build();

      const customRules = config.validations.filter((v) => v.type === 'custom');
      expect(customRules).toHaveLength(2);
      expect(customRules[0].message).toBe('Too short');
      expect(customRules[1].message).toBe('Too long');
    });

    it('should store validator function', () => {
      const validator = (value: string) => value.length > 5;
      const field = new TestFieldBuilder().custom(validator);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom') as any;
      expect(customRule.validator).toBe(validator);
    });
  });

  describe('_build()', () => {
    it('should return complete configuration', () => {
      const field = new TestFieldBuilder().required().nullable().default('test-default');
      const config = field._build();

      expect(config).toMatchObject({
        type: 'test',
        isRequired: true,
        isNullable: true,
        defaultValue: 'test-default',
      });
      expect(config.validations.length).toBeGreaterThan(0);
    });

    it('should preserve validation order', () => {
      const field = new TestFieldBuilder()
        .required()
        .nullable()
        .custom(() => true, 'Custom');
      const config = field._build();

      expect(config.validations[0].type).toBe('required');
      expect(config.validations[1].type).toBe('nullable');
      expect(config.validations[2].type).toBe('custom');
    });
  });

  describe('method chaining', () => {
    it('should support complex chaining', () => {
      const validator = (value: string) => value.startsWith('test_');
      const field = new TestFieldBuilder()
        .required()
        .nullable()
        .default('test_default')
        .custom(validator, 'Must start with test_');

      const config = field._build();

      expect(config.isRequired).toBe(true);
      expect(config.isNullable).toBe(true);
      expect(config.defaultValue).toBe('test_default');
      expect(config.validations).toHaveLength(3);
    });

    it('should return same instance for all chainable methods', () => {
      const field = new TestFieldBuilder();
      const required = field.required();
      const nullable = required.nullable();
      const withDefault = nullable.default('test');

      expect(required).toBe(field);
      expect(nullable).toBe(field);
      expect(withDefault).toBe(field);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string as default', () => {
      const field = new TestFieldBuilder().default('');
      const config = field._build();

      expect(config.defaultValue).toBe('');
    });

    it('should handle boolean false as default', () => {
      const field = new TestFieldBuilder().default(false as any);
      const config = field._build();

      expect(config.defaultValue).toBe(false);
    });

    it('should handle number 0 as default', () => {
      const field = new TestFieldBuilder().default(0 as any);
      const config = field._build();

      expect(config.defaultValue).toBe(0);
    });

    it('should allow calling required multiple times', () => {
      const field = new TestFieldBuilder().required().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
      // Each call adds a validation rule
      const requiredRules = config.validations.filter((v) => v.type === 'required');
      expect(requiredRules.length).toBeGreaterThanOrEqual(1);
    });

    it('should allow calling optional multiple times', () => {
      const field = new TestFieldBuilder().optional().optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should allow calling nullable multiple times', () => {
      const field = new TestFieldBuilder().nullable().nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });
  });
});
