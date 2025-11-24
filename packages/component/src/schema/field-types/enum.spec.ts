/**
 * Unit tests for enum field builder
 *
 * Tests enum-specific functionality:
 * - Enum field creation with values
 * - Default value selection
 * - Type inference for union types
 * - Invalid value handling
 * - Validation rules
 */

import { describe, it, expect } from 'vitest';
import { EnumFieldBuilder } from './enum';

describe('EnumFieldBuilder', () => {
  describe('constructor', () => {
    it('should create enum field with correct type', () => {
      const field = new EnumFieldBuilder(['pending', 'active', 'archived'] as const);
      const config = field._build();

      expect(config.type).toBe('enum');
    });

    it('should store enum values', () => {
      const values = ['pending', 'active', 'archived'] as const;
      const field = new EnumFieldBuilder(values);
      const config = field._build();

      expect(config.values).toBe(values);
    });

    it('should add validation rule for allowed values', () => {
      const values = ['pending', 'active'] as const;
      const field = new EnumFieldBuilder(values);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule).toBeDefined();
      expect(customRule?.message).toBe('Must be one of: pending, active');
    });

    it('should throw error for empty values array', () => {
      expect(() => new EnumFieldBuilder([] as any)).toThrow('Enum must have at least one value');
    });

    it('should throw error for null values', () => {
      expect(() => new EnumFieldBuilder(null as any)).toThrow('Enum must have at least one value');
    });

    it('should throw error for undefined values', () => {
      expect(() => new EnumFieldBuilder(undefined as any)).toThrow(
        'Enum must have at least one value'
      );
    });
  });

  describe('getValues()', () => {
    it('should return enum values', () => {
      const values = ['pending', 'active', 'archived'] as const;
      const field = new EnumFieldBuilder(values);

      expect(field.getValues()).toBe(values);
    });

    it('should return original array reference', () => {
      const values = ['low', 'medium', 'high'] as const;
      const field = new EnumFieldBuilder(values);

      expect(field.getValues()).toBe(values);
    });
  });

  describe('validation', () => {
    it('should validate allowed values correctly', () => {
      const values = ['pending', 'active', 'archived'] as const;
      const field = new EnumFieldBuilder(values);
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator('pending')).toBe(true);
      expect(customRule.validator('active')).toBe(true);
      expect(customRule.validator('archived')).toBe(true);
      expect(customRule.validator('invalid')).toBe(false);
    });

    it('should be case-sensitive', () => {
      const values = ['pending', 'active'] as const;
      const field = new EnumFieldBuilder(values);
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator('Pending')).toBe(false);
      expect(customRule.validator('ACTIVE')).toBe(false);
    });

    it('should handle single value enum', () => {
      const values = ['only'] as const;
      const field = new EnumFieldBuilder(values);
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator('only')).toBe(true);
      expect(customRule.validator('other')).toBe(false);
    });

    it('should handle many values', () => {
      const values = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;
      const field = new EnumFieldBuilder(values);
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator('a')).toBe(true);
      expect(customRule.validator('g')).toBe(true);
      expect(customRule.validator('h')).toBe(false);
    });
  });

  describe('default values', () => {
    it('should support default value from enum', () => {
      const field = new EnumFieldBuilder(['pending', 'active', 'archived'] as const).default(
        'pending'
      );
      const config = field._build();

      expect(config.defaultValue).toBe('pending');
    });

    it('should support any enum value as default', () => {
      const field = new EnumFieldBuilder(['low', 'medium', 'high'] as const).default('medium');
      const config = field._build();

      expect(config.defaultValue).toBe('medium');
    });

    it('should allow first value as default', () => {
      const field = new EnumFieldBuilder(['user', 'admin', 'analyst'] as const).default('user');
      const config = field._build();

      expect(config.defaultValue).toBe('user');
    });

    it('should allow last value as default', () => {
      const field = new EnumFieldBuilder(['user', 'admin', 'analyst'] as const).default('analyst');
      const config = field._build();

      expect(config.defaultValue).toBe('analyst');
    });
  });

  describe('inheritance from BaseFieldBuilder', () => {
    it('should inherit required() method', () => {
      const field = new EnumFieldBuilder(['pending', 'active'] as const).required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should inherit optional() method', () => {
      const field = new EnumFieldBuilder(['pending', 'active'] as const).optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should inherit nullable() method', () => {
      const field = new EnumFieldBuilder(['pending', 'active'] as const).nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });
  });

  describe('method chaining', () => {
    it('should support chaining with default and required', () => {
      const field = new EnumFieldBuilder(['pending', 'active'] as const)
        .default('pending')
        .required();
      const config = field._build();

      expect(config.defaultValue).toBe('pending');
      expect(config.isRequired).toBe(true);
    });

    it('should support chaining with optional', () => {
      const field = new EnumFieldBuilder(['low', 'medium', 'high'] as const)
        .optional()
        .default('medium');
      const config = field._build();

      expect(config.isOptional).toBe(true);
      expect(config.defaultValue).toBe('medium');
    });

    it('should support all modifiers', () => {
      const field = new EnumFieldBuilder(['user', 'admin'] as const)
        .default('user')
        .required()
        .nullable();
      const config = field._build();

      expect(config.defaultValue).toBe('user');
      expect(config.isRequired).toBe(true);
      expect(config.isNullable).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle values with special characters', () => {
      const values = ['in-progress', 'not_started', 'done!'] as const;
      const field = new EnumFieldBuilder(values);
      const config = field._build();

      expect(config.values).toBe(values);
    });

    it('should handle values with spaces', () => {
      const values = ['not started', 'in progress', 'completed'] as const;
      const field = new EnumFieldBuilder(values);
      const config = field._build();

      expect(config.values).toBe(values);
    });

    it('should handle empty string as value', () => {
      const values = ['', 'value1', 'value2'] as const;
      const field = new EnumFieldBuilder(values);
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator('')).toBe(true);
    });

    it('should handle unicode values', () => {
      const values = ['待处理', '进行中', '已完成'] as const;
      const field = new EnumFieldBuilder(values);
      const config = field._build();

      expect(config.values).toBe(values);
    });

    it('should handle emoji values', () => {
      const values = ['✅', '❌', '⏸️'] as const;
      const field = new EnumFieldBuilder(values);
      const config = field._build();

      expect(config.values).toBe(values);
    });

    it('should handle numeric string values', () => {
      const values = ['1', '2', '3', '4', '5'] as const;
      const field = new EnumFieldBuilder(values);
      const config = field._build();

      const customRule: any = config.validations.find((v) => v.type === 'custom');
      expect(customRule.validator('3')).toBe(true);
      expect(customRule.validator(3 as any)).toBe(false); // Must be string
    });
  });

  describe('real-world scenarios', () => {
    it('should configure status enum', () => {
      const field = new EnumFieldBuilder(['pending', 'active', 'archived'] as const)
        .default('pending')
        .required();
      const config = field._build();

      expect(config.values).toEqual(['pending', 'active', 'archived']);
      expect(config.defaultValue).toBe('pending');
      expect(config.isRequired).toBe(true);
    });

    it('should configure role enum', () => {
      const field = new EnumFieldBuilder(['user', 'admin', 'analyst'] as const).default('user');
      const config = field._build();

      expect(config.values).toEqual(['user', 'admin', 'analyst']);
      expect(config.defaultValue).toBe('user');
    });

    it('should configure priority enum', () => {
      const field = new EnumFieldBuilder(['low', 'medium', 'high', 'critical'] as const).required();
      const config = field._build();

      expect(config.values).toEqual(['low', 'medium', 'high', 'critical']);
      expect(config.isRequired).toBe(true);
    });

    it('should configure visibility enum', () => {
      const field = new EnumFieldBuilder(['public', 'private', 'unlisted'] as const)
        .default('private')
        .required();
      const config = field._build();

      expect(config.values).toEqual(['public', 'private', 'unlisted']);
      expect(config.defaultValue).toBe('private');
    });

    it('should configure payment status', () => {
      const field = new EnumFieldBuilder([
        'pending',
        'processing',
        'succeeded',
        'failed',
      ] as const).default('pending');
      const config = field._build();

      expect(config.values).toEqual(['pending', 'processing', 'succeeded', 'failed']);
      expect(config.defaultValue).toBe('pending');
    });

    it('should configure optional category', () => {
      const field = new EnumFieldBuilder([
        'electronics',
        'clothing',
        'books',
        'other',
      ] as const).optional();
      const config = field._build();

      expect(config.values).toEqual(['electronics', 'clothing', 'books', 'other']);
      expect(config.isOptional).toBe(true);
    });
  });

  describe('validation error messages', () => {
    it('should include all values in error message', () => {
      const field = new EnumFieldBuilder(['pending', 'active'] as const);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must be one of: pending, active');
    });

    it('should format single value correctly', () => {
      const field = new EnumFieldBuilder(['only'] as const);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must be one of: only');
    });

    it('should format multiple values correctly', () => {
      const field = new EnumFieldBuilder(['a', 'b', 'c', 'd'] as const);
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must be one of: a, b, c, d');
    });
  });
});
