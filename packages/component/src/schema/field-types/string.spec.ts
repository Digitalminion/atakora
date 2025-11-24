/**
 * Unit tests for string field builder
 *
 * Tests string-specific functionality:
 * - Basic string field creation
 * - Validation methods (email, url, uuid, phone)
 * - Length constraints (min, max)
 * - Pattern matching (regex)
 * - Edge cases and error handling
 */

import { describe, it, expect } from 'vitest';
import { StringFieldBuilder } from './string';

describe('StringFieldBuilder', () => {
  describe('constructor', () => {
    it('should create string field with correct type', () => {
      const field = new StringFieldBuilder();
      const config = field._build();

      expect(config.type).toBe('string');
    });

    it('should initialize with empty validations', () => {
      const field = new StringFieldBuilder();
      const config = field._build();

      expect(config.validations).toEqual([]);
    });
  });

  describe('min()', () => {
    it('should set minimum length', () => {
      const field = new StringFieldBuilder().min(5);
      const config = field._build();

      expect(config.minLength).toBe(5);
    });

    it('should add minLength validation rule', () => {
      const field = new StringFieldBuilder().min(5);
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'minLength',
        value: 5,
        message: 'Must be at least 5 characters',
      });
    });

    it('should use singular "character" for min(1)', () => {
      const field = new StringFieldBuilder().min(1);
      const config = field._build();

      const validation = config.validations.find((v) => v.type === 'minLength');
      expect(validation?.message).toBe('Must be at least 1 character');
    });

    it('should use plural "characters" for min > 1', () => {
      const field = new StringFieldBuilder().min(10);
      const config = field._build();

      const validation = config.validations.find((v) => v.type === 'minLength');
      expect(validation?.message).toBe('Must be at least 10 characters');
    });

    it('should support method chaining', () => {
      const field = new StringFieldBuilder().min(5);

      expect(field).toBeInstanceOf(StringFieldBuilder);
    });

    it('should handle min(0)', () => {
      const field = new StringFieldBuilder().min(0);
      const config = field._build();

      expect(config.minLength).toBe(0);
    });
  });

  describe('max()', () => {
    it('should set maximum length', () => {
      const field = new StringFieldBuilder().max(100);
      const config = field._build();

      expect(config.maxLength).toBe(100);
    });

    it('should add maxLength validation rule', () => {
      const field = new StringFieldBuilder().max(100);
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'maxLength',
        value: 100,
        message: 'Must be at most 100 characters',
      });
    });

    it('should use singular "character" for max(1)', () => {
      const field = new StringFieldBuilder().max(1);
      const config = field._build();

      const validation = config.validations.find((v) => v.type === 'maxLength');
      expect(validation?.message).toBe('Must be at most 1 character');
    });

    it('should support method chaining', () => {
      const field = new StringFieldBuilder().max(100);

      expect(field).toBeInstanceOf(StringFieldBuilder);
    });
  });

  describe('minLength() and maxLength() aliases', () => {
    it('minLength should work same as min', () => {
      const field = new StringFieldBuilder().minLength(5);
      const config = field._build();

      expect(config.minLength).toBe(5);
    });

    it('maxLength should work same as max', () => {
      const field = new StringFieldBuilder().maxLength(100);
      const config = field._build();

      expect(config.maxLength).toBe(100);
    });
  });

  describe('min() and max() combined', () => {
    it('should support both min and max', () => {
      const field = new StringFieldBuilder().min(3).max(20);
      const config = field._build();

      expect(config.minLength).toBe(3);
      expect(config.maxLength).toBe(20);
    });

    it('should add both validation rules', () => {
      const field = new StringFieldBuilder().min(3).max(20);
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'minLength',
        value: 3,
        message: 'Must be at least 3 characters',
      });
      expect(config.validations).toContainEqual({
        type: 'maxLength',
        value: 20,
        message: 'Must be at most 20 characters',
      });
    });
  });

  describe('email()', () => {
    it('should set format to email', () => {
      const field = new StringFieldBuilder().email();
      const config = field._build();

      expect(config.format).toBe('email');
    });

    it('should set email pattern', () => {
      const field = new StringFieldBuilder().email();
      const config = field._build();

      expect(config.pattern).toBeDefined();
      expect(config.pattern).toBeInstanceOf(RegExp);
    });

    it('should add email validation rule', () => {
      const field = new StringFieldBuilder().email();
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'email',
        message: 'Must be a valid email address',
      });
    });

    it('should support method chaining', () => {
      const field = new StringFieldBuilder().email();

      expect(field).toBeInstanceOf(StringFieldBuilder);
    });

    it('should work with required', () => {
      const field = new StringFieldBuilder().email().required();
      const config = field._build();

      expect(config.format).toBe('email');
      expect(config.isRequired).toBe(true);
    });
  });

  describe('url()', () => {
    it('should set format to url', () => {
      const field = new StringFieldBuilder().url();
      const config = field._build();

      expect(config.format).toBe('url');
    });

    it('should set url pattern', () => {
      const field = new StringFieldBuilder().url();
      const config = field._build();

      expect(config.pattern).toBeDefined();
      expect(config.pattern).toBeInstanceOf(RegExp);
    });

    it('should add url validation rule', () => {
      const field = new StringFieldBuilder().url();
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'url',
        message: 'Must be a valid URL starting with http:// or https://',
      });
    });

    it('should support method chaining', () => {
      const field = new StringFieldBuilder().url();

      expect(field).toBeInstanceOf(StringFieldBuilder);
    });
  });

  describe('uuid()', () => {
    it('should set format to uuid', () => {
      const field = new StringFieldBuilder().uuid();
      const config = field._build();

      expect(config.format).toBe('uuid');
    });

    it('should set uuid pattern', () => {
      const field = new StringFieldBuilder().uuid();
      const config = field._build();

      expect(config.pattern).toBeDefined();
      expect(config.pattern).toBeInstanceOf(RegExp);
    });

    it('should add pattern validation rule for uuid', () => {
      const field = new StringFieldBuilder().uuid();
      const config = field._build();

      const patternRule = config.validations.find((v) => v.type === 'pattern');
      expect(patternRule).toBeDefined();
      expect(patternRule?.message).toBe('Must be a valid UUID');
    });

    it('should support method chaining', () => {
      const field = new StringFieldBuilder().uuid();

      expect(field).toBeInstanceOf(StringFieldBuilder);
    });
  });

  describe('phone()', () => {
    it('should set format to phone', () => {
      const field = new StringFieldBuilder().phone();
      const config = field._build();

      expect(config.format).toBe('phone');
    });

    it('should set phone pattern', () => {
      const field = new StringFieldBuilder().phone();
      const config = field._build();

      expect(config.pattern).toBeDefined();
      expect(config.pattern).toBeInstanceOf(RegExp);
    });

    it('should add pattern validation rule for phone', () => {
      const field = new StringFieldBuilder().phone();
      const config = field._build();

      const patternRule = config.validations.find((v) => v.type === 'pattern');
      expect(patternRule).toBeDefined();
      expect(patternRule?.message).toBe('Must be a valid phone number');
    });

    it('should support method chaining', () => {
      const field = new StringFieldBuilder().phone();

      expect(field).toBeInstanceOf(StringFieldBuilder);
    });
  });

  describe('regex()', () => {
    it('should set custom pattern', () => {
      const pattern = /^[A-Z]{3}-\d{4}$/;
      const field = new StringFieldBuilder().regex(pattern);
      const config = field._build();

      expect(config.pattern).toBe(pattern);
    });

    it('should add regex validation rule with default message', () => {
      const pattern = /^[A-Z]{3}-\d{4}$/;
      const field = new StringFieldBuilder().regex(pattern);
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'regex',
        pattern,
        message: 'Must match the required pattern',
      });
    });

    it('should add regex validation rule with custom message', () => {
      const pattern = /^[A-Z]{3}-\d{4}$/;
      const field = new StringFieldBuilder().regex(pattern, 'Must be format ABC-1234');
      const config = field._build();

      expect(config.validations).toContainEqual({
        type: 'regex',
        pattern,
        message: 'Must be format ABC-1234',
      });
    });

    it('should support method chaining', () => {
      const field = new StringFieldBuilder().regex(/test/);

      expect(field).toBeInstanceOf(StringFieldBuilder);
    });
  });

  describe('combined validations', () => {
    it('should support email with length constraints', () => {
      const field = new StringFieldBuilder().email().min(5).max(100);
      const config = field._build();

      expect(config.format).toBe('email');
      expect(config.minLength).toBe(5);
      expect(config.maxLength).toBe(100);
    });

    it('should support url with required', () => {
      const field = new StringFieldBuilder().url().required();
      const config = field._build();

      expect(config.format).toBe('url');
      expect(config.isRequired).toBe(true);
    });

    it('should support regex with default value', () => {
      const field = new StringFieldBuilder().regex(/^TEST-/).default('TEST-default');
      const config = field._build();

      expect(config.pattern).toBeDefined();
      expect(config.defaultValue).toBe('TEST-default');
    });

    it('should support all modifiers together', () => {
      const field = new StringFieldBuilder()
        .min(10)
        .max(50)
        .required()
        .nullable()
        .default('test-value');
      const config = field._build();

      expect(config.minLength).toBe(10);
      expect(config.maxLength).toBe(50);
      expect(config.isRequired).toBe(true);
      expect(config.isNullable).toBe(true);
      expect(config.defaultValue).toBe('test-value');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string default', () => {
      const field = new StringFieldBuilder().default('');
      const config = field._build();

      expect(config.defaultValue).toBe('');
    });

    it('should handle very long string default', () => {
      const longString = 'a'.repeat(10000);
      const field = new StringFieldBuilder().default(longString);
      const config = field._build();

      expect(config.defaultValue).toBe(longString);
      expect(config.defaultValue.length).toBe(10000);
    });

    it('should handle special characters in default', () => {
      const field = new StringFieldBuilder().default('test@#$%^&*(){}[]|\\:";\'<>?,./');
      const config = field._build();

      expect(config.defaultValue).toBe('test@#$%^&*(){}[]|\\:";\'<>?,./');
    });

    it('should handle unicode in default', () => {
      const field = new StringFieldBuilder().default('Hello 世界 🌍');
      const config = field._build();

      expect(config.defaultValue).toBe('Hello 世界 🌍');
    });

    it('should handle newlines and tabs in default', () => {
      const field = new StringFieldBuilder().default('line1\nline2\tindented');
      const config = field._build();

      expect(config.defaultValue).toBe('line1\nline2\tindented');
    });

    it('should allow min to equal max', () => {
      const field = new StringFieldBuilder().min(10).max(10);
      const config = field._build();

      expect(config.minLength).toBe(10);
      expect(config.maxLength).toBe(10);
    });

    it('should allow multiple regex patterns (last one wins)', () => {
      const pattern1 = /^A/;
      const pattern2 = /^B/;
      const field = new StringFieldBuilder().regex(pattern1).regex(pattern2);
      const config = field._build();

      expect(config.pattern).toBe(pattern2);
    });

    it('should allow format to be overridden', () => {
      const field = new StringFieldBuilder().email().url();
      const config = field._build();

      // Last format wins
      expect(config.format).toBe('url');
    });
  });

  describe('inheritance from BaseFieldBuilder', () => {
    it('should inherit required() method', () => {
      const field = new StringFieldBuilder().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should inherit optional() method', () => {
      const field = new StringFieldBuilder().optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should inherit nullable() method', () => {
      const field = new StringFieldBuilder().nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });

    it('should inherit default() method', () => {
      const field = new StringFieldBuilder().default('test');
      const config = field._build();

      expect(config.defaultValue).toBe('test');
    });

    it('should inherit custom() method', () => {
      const validator = (value: string) => value.startsWith('test');
      const field = new StringFieldBuilder().custom(validator, 'Must start with test');
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule).toBeDefined();
      expect(customRule?.message).toBe('Must start with test');
    });
  });

  describe('real-world scenarios', () => {
    it('should configure username field', () => {
      const field = new StringFieldBuilder().min(3).max(20).required();
      const config = field._build();

      expect(config.minLength).toBe(3);
      expect(config.maxLength).toBe(20);
      expect(config.isRequired).toBe(true);
    });

    it('should configure email field', () => {
      const field = new StringFieldBuilder().email().required();
      const config = field._build();

      expect(config.format).toBe('email');
      expect(config.isRequired).toBe(true);
    });

    it('should configure optional bio field', () => {
      const field = new StringFieldBuilder().max(500).optional();
      const config = field._build();

      expect(config.maxLength).toBe(500);
      expect(config.isOptional).toBe(true);
    });

    it('should configure postal code field', () => {
      const field = new StringFieldBuilder().regex(
        /^\d{5}(-\d{4})?$/,
        'Must be a valid postal code'
      );
      const config = field._build();

      const regexRule = config.validations.find((v) => v.type === 'regex');
      expect(regexRule?.message).toBe('Must be a valid postal code');
    });

    it('should configure slug field', () => {
      const field = new StringFieldBuilder()
        .regex(/^[a-z0-9-]+$/, 'Must be lowercase alphanumeric with hyphens')
        .min(1)
        .max(100)
        .required();
      const config = field._build();

      expect(config.minLength).toBe(1);
      expect(config.maxLength).toBe(100);
      expect(config.isRequired).toBe(true);
    });
  });
});
