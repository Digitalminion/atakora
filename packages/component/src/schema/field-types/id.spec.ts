/**
 * Unit tests for ID field builder
 *
 * Tests ID-specific functionality:
 * - Basic ID field creation
 * - Auto-generation
 * - Prefix support
 * - Manual ID assignment
 */

import { describe, it, expect } from 'vitest';
import { IdFieldBuilder } from './id';

describe('IdFieldBuilder', () => {
  describe('constructor', () => {
    it('should create id field with correct type', () => {
      const field = new IdFieldBuilder();
      const config = field._build();

      expect(config.type).toBe('id');
    });

    it('should initialize with autoGenerate enabled', () => {
      const field = new IdFieldBuilder();
      const config = field._build();

      expect(config.autoGenerate).toBe(true);
    });

    it('should initialize with empty validations', () => {
      const field = new IdFieldBuilder();
      const config = field._build();

      expect(config.validations).toEqual([]);
    });
  });

  describe('prefix()', () => {
    it('should set prefix value', () => {
      const field = new IdFieldBuilder().prefix('user');
      const config = field._build();

      expect(config.prefix).toBe('user');
    });

    it('should support short prefixes', () => {
      const field = new IdFieldBuilder().prefix('usr');
      const config = field._build();

      expect(config.prefix).toBe('usr');
    });

    it('should support longer prefixes', () => {
      const field = new IdFieldBuilder().prefix('project');
      const config = field._build();

      expect(config.prefix).toBe('project');
    });

    it('should support method chaining', () => {
      const field = new IdFieldBuilder().prefix('user');

      expect(field).toBeInstanceOf(IdFieldBuilder);
    });

    it('should maintain autoGenerate when prefix is set', () => {
      const field = new IdFieldBuilder().prefix('user');
      const config = field._build();

      expect(config.autoGenerate).toBe(true);
      expect(config.prefix).toBe('user');
    });

    it('should allow overriding prefix', () => {
      const field = new IdFieldBuilder().prefix('user').prefix('admin');
      const config = field._build();

      expect(config.prefix).toBe('admin');
    });
  });

  describe('manual()', () => {
    it('should disable auto-generation', () => {
      const field = new IdFieldBuilder().manual();
      const config = field._build();

      expect(config.autoGenerate).toBe(false);
    });

    it('should support method chaining', () => {
      const field = new IdFieldBuilder().manual();

      expect(field).toBeInstanceOf(IdFieldBuilder);
    });

    it('should work with prefix', () => {
      const field = new IdFieldBuilder().prefix('ext').manual();
      const config = field._build();

      expect(config.prefix).toBe('ext');
      expect(config.autoGenerate).toBe(false);
    });

    it('should work with required', () => {
      const field = new IdFieldBuilder().manual().required();
      const config = field._build();

      expect(config.autoGenerate).toBe(false);
      expect(config.isRequired).toBe(true);
    });
  });

  describe('combined configurations', () => {
    it('should support prefix with required', () => {
      const field = new IdFieldBuilder().prefix('user').required();
      const config = field._build();

      expect(config.prefix).toBe('user');
      expect(config.isRequired).toBe(true);
      expect(config.autoGenerate).toBe(true);
    });

    it('should support manual with optional', () => {
      const field = new IdFieldBuilder().manual().optional();
      const config = field._build();

      expect(config.autoGenerate).toBe(false);
      expect(config.isOptional).toBe(true);
    });

    it('should support all modifiers', () => {
      const field = new IdFieldBuilder().prefix('ext').manual().required().nullable();
      const config = field._build();

      expect(config.prefix).toBe('ext');
      expect(config.autoGenerate).toBe(false);
      expect(config.isRequired).toBe(true);
      expect(config.isNullable).toBe(true);
    });
  });

  describe('default values', () => {
    it('should support default value with manual ID', () => {
      const field = new IdFieldBuilder().manual().default('default-id');
      const config = field._build();

      expect(config.autoGenerate).toBe(false);
      expect(config.defaultValue).toBe('default-id');
    });

    it('should support default value with prefix', () => {
      const field = new IdFieldBuilder().prefix('user').default('user_123');
      const config = field._build();

      expect(config.prefix).toBe('user');
      expect(config.defaultValue).toBe('user_123');
    });
  });

  describe('inheritance from BaseFieldBuilder', () => {
    it('should inherit required() method', () => {
      const field = new IdFieldBuilder().required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should inherit optional() method', () => {
      const field = new IdFieldBuilder().optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should inherit nullable() method', () => {
      const field = new IdFieldBuilder().nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });

    it('should inherit default() method', () => {
      const field = new IdFieldBuilder().default('test-id');
      const config = field._build();

      expect(config.defaultValue).toBe('test-id');
    });

    it('should inherit custom() method', () => {
      const validator = (value: string) => value.startsWith('user_');
      const field = new IdFieldBuilder().custom(validator, 'Must start with user_');
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule).toBeDefined();
      expect(customRule?.message).toBe('Must start with user_');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string prefix', () => {
      const field = new IdFieldBuilder().prefix('');
      const config = field._build();

      expect(config.prefix).toBe('');
    });

    it('should handle special characters in prefix', () => {
      const field = new IdFieldBuilder().prefix('user-v2');
      const config = field._build();

      expect(config.prefix).toBe('user-v2');
    });

    it('should handle uppercase prefix', () => {
      const field = new IdFieldBuilder().prefix('USER');
      const config = field._build();

      expect(config.prefix).toBe('USER');
    });

    it('should handle numeric prefix', () => {
      const field = new IdFieldBuilder().prefix('123');
      const config = field._build();

      expect(config.prefix).toBe('123');
    });
  });

  describe('real-world scenarios', () => {
    it('should configure standard auto-generated id', () => {
      const field = new IdFieldBuilder();
      const config = field._build();

      expect(config.autoGenerate).toBe(true);
      expect(config.prefix).toBeUndefined();
    });

    it('should configure user id with prefix', () => {
      const field = new IdFieldBuilder().prefix('user');
      const config = field._build();

      expect(config.prefix).toBe('user');
      expect(config.autoGenerate).toBe(true);
    });

    it('should configure project id', () => {
      const field = new IdFieldBuilder().prefix('proj');
      const config = field._build();

      expect(config.prefix).toBe('proj');
      expect(config.autoGenerate).toBe(true);
    });

    it('should configure order id', () => {
      const field = new IdFieldBuilder().prefix('order');
      const config = field._build();

      expect(config.prefix).toBe('order');
      expect(config.autoGenerate).toBe(true);
    });

    it('should configure external id for imports', () => {
      const field = new IdFieldBuilder().manual().required();
      const config = field._build();

      expect(config.autoGenerate).toBe(false);
      expect(config.isRequired).toBe(true);
    });

    it('should configure optional external reference', () => {
      const field = new IdFieldBuilder().manual().optional();
      const config = field._build();

      expect(config.autoGenerate).toBe(false);
      expect(config.isOptional).toBe(true);
    });
  });
});
