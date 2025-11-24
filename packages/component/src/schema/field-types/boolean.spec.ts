/**
 * Unit tests for boolean field builder
 *
 * Tests boolean-specific functionality:
 * - Basic boolean field creation
 * - Default values (true/false)
 * - Inheritance from base
 */

import { describe, it, expect } from 'vitest';
import { BooleanFieldBuilder } from './boolean';

describe('BooleanFieldBuilder', () => {
  describe('constructor', () => {
    it('should create boolean field with correct type', () => {
      const field = new BooleanFieldBuilder();
      const config = field._build();

      expect(config.type).toBe('boolean');
    });

    it('should initialize with empty validations', () => {
      const field = new BooleanFieldBuilder();
      const config = field._build();

      expect(config.validations).toEqual([]);
    });
  });

  describe('default values', () => {
    it('should support true as default', () => {
      const field = new BooleanFieldBuilder().default(true);
      const config = field._build();

      expect(config.defaultValue).toBe(true);
    });

    it('should support false as default', () => {
      const field = new BooleanFieldBuilder().default(false);
      const config = field._build();

      expect(config.defaultValue).toBe(false);
    });
  });

  describe('inheritance from BaseFieldBuilder', () => {
    it('should inherit required() method', () => {
      const field = new BooleanFieldBuilder().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should inherit optional() method', () => {
      const field = new BooleanFieldBuilder().optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should inherit nullable() method', () => {
      const field = new BooleanFieldBuilder().nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });

    it('should inherit custom() method', () => {
      const validator = (value: boolean) => value === true;
      const field = new BooleanFieldBuilder().custom(validator, 'Must be true');
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule).toBeDefined();
      expect(customRule?.message).toBe('Must be true');
    });
  });

  describe('method chaining', () => {
    it('should support chaining with default and required', () => {
      const field = new BooleanFieldBuilder().default(true).required();
      const config = field._build();

      expect(config.defaultValue).toBe(true);
      expect(config.isRequired).toBe(true);
    });

    it('should support chaining with default and optional', () => {
      const field = new BooleanFieldBuilder().default(false).optional();
      const config = field._build();

      expect(config.defaultValue).toBe(false);
      expect(config.isOptional).toBe(true);
    });

    it('should support chaining with nullable', () => {
      const field = new BooleanFieldBuilder().nullable().optional();
      const config = field._build();

      expect(config.isNullable).toBe(true);
      expect(config.isOptional).toBe(true);
    });
  });

  describe('real-world scenarios', () => {
    it('should configure isActive field', () => {
      const field = new BooleanFieldBuilder().default(true);
      const config = field._build();

      expect(config.defaultValue).toBe(true);
    });

    it('should configure agreedToTerms field', () => {
      const field = new BooleanFieldBuilder().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should configure optional newsletter subscription', () => {
      const field = new BooleanFieldBuilder().optional().default(false);
      const config = field._build();

      expect(config.isOptional).toBe(true);
      expect(config.defaultValue).toBe(false);
    });

    it('should configure feature flag', () => {
      const field = new BooleanFieldBuilder().default(false);
      const config = field._build();

      expect(config.defaultValue).toBe(false);
    });

    it('should configure isVerified field', () => {
      const field = new BooleanFieldBuilder().default(false).nullable();
      const config = field._build();

      expect(config.defaultValue).toBe(false);
      expect(config.isNullable).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle no default value', () => {
      const field = new BooleanFieldBuilder();
      const config = field._build();

      expect(config.defaultValue).toBeUndefined();
    });

    it('should allow nullable with required', () => {
      const field = new BooleanFieldBuilder().required().nullable();
      const config = field._build();

      expect(config.isRequired).toBe(true);
      expect(config.isNullable).toBe(true);
    });
  });
});
