/**
 * Unit tests for reference field builder
 *
 * Tests ref-specific functionality:
 * - Reference field creation
 * - Model name validation
 * - Delete behavior (cascade, set_null, restrict)
 * - Edge cases (circular references)
 */

import { describe, it, expect } from 'vitest';
import { RefFieldBuilder } from './ref';

describe('RefFieldBuilder', () => {
  describe('constructor', () => {
    it('should create ref field with correct type', () => {
      const field = new RefFieldBuilder('User');
      const config = field._build();

      expect(config.type).toBe('ref');
    });

    it('should store model name', () => {
      const field = new RefFieldBuilder('User');
      const config = field._build();

      expect(config.modelName).toBe('User');
    });

    it('should initialize with empty validations', () => {
      const field = new RefFieldBuilder('User');
      const config = field._build();

      expect(config.validations).toEqual([]);
    });

    it('should throw error for empty model name', () => {
      expect(() => new RefFieldBuilder('')).toThrow(
        'Reference field must specify a valid model name'
      );
    });

    it('should throw error for null model name', () => {
      expect(() => new RefFieldBuilder(null as any)).toThrow(
        'Reference field must specify a valid model name'
      );
    });

    it('should throw error for undefined model name', () => {
      expect(() => new RefFieldBuilder(undefined as any)).toThrow(
        'Reference field must specify a valid model name'
      );
    });
  });

  describe('getModelName()', () => {
    it('should return model name', () => {
      const field = new RefFieldBuilder('User');

      expect(field.getModelName()).toBe('User');
    });

    it('should return exact model name provided', () => {
      const field = new RefFieldBuilder('CustomModel');

      expect(field.getModelName()).toBe('CustomModel');
    });
  });

  describe('onDelete()', () => {
    it('should set cascade delete behavior', () => {
      const field = new RefFieldBuilder('User').onDelete('cascade');
      const config = field._build();

      expect(config.onDelete).toBe('cascade');
    });

    it('should set set_null delete behavior', () => {
      const field = new RefFieldBuilder('User').onDelete('set_null');
      const config = field._build();

      expect(config.onDelete).toBe('set_null');
    });

    it('should set restrict delete behavior', () => {
      const field = new RefFieldBuilder('User').onDelete('restrict');
      const config = field._build();

      expect(config.onDelete).toBe('restrict');
    });

    it('should auto-mark as nullable when set_null is used', () => {
      const field = new RefFieldBuilder('User').onDelete('set_null');
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });

    it('should not auto-mark as nullable for cascade', () => {
      const field = new RefFieldBuilder('User').onDelete('cascade');
      const config = field._build();

      expect(config.isNullable).toBeUndefined();
    });

    it('should not auto-mark as nullable for restrict', () => {
      const field = new RefFieldBuilder('User').onDelete('restrict');
      const config = field._build();

      expect(config.isNullable).toBeUndefined();
    });

    it('should support method chaining', () => {
      const field = new RefFieldBuilder('User').onDelete('cascade');

      expect(field).toBeInstanceOf(RefFieldBuilder);
    });

    it('should allow overriding delete behavior', () => {
      const field = new RefFieldBuilder('User').onDelete('cascade').onDelete('set_null');
      const config = field._build();

      expect(config.onDelete).toBe('set_null');
    });
  });

  describe('combined configurations', () => {
    it('should support onDelete with required', () => {
      const field = new RefFieldBuilder('User').onDelete('cascade').required();
      const config = field._build();

      expect(config.onDelete).toBe('cascade');
      expect(config.isRequired).toBe(true);
    });

    it('should support onDelete(set_null) with explicit nullable', () => {
      const field = new RefFieldBuilder('User').onDelete('set_null').nullable();
      const config = field._build();

      expect(config.onDelete).toBe('set_null');
      expect(config.isNullable).toBe(true);
    });

    it('should support optional reference', () => {
      const field = new RefFieldBuilder('Category').optional();
      const config = field._build();

      expect(config.modelName).toBe('Category');
      expect(config.isOptional).toBe(true);
    });
  });

  describe('inheritance from BaseFieldBuilder', () => {
    it('should inherit required() method', () => {
      const field = new RefFieldBuilder('User').required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should inherit optional() method', () => {
      const field = new RefFieldBuilder('User').optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should inherit nullable() method', () => {
      const field = new RefFieldBuilder('User').nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });

    it('should inherit default() method', () => {
      const field = new RefFieldBuilder('User').default('user_123');
      const config = field._build();

      expect(config.defaultValue).toBe('user_123');
    });
  });

  describe('edge cases', () => {
    it('should handle self-referencing model', () => {
      const field = new RefFieldBuilder('Category'); // For parent category
      const config = field._build();

      expect(config.modelName).toBe('Category');
    });

    it('should handle model names with numbers', () => {
      const field = new RefFieldBuilder('User2');
      const config = field._build();

      expect(config.modelName).toBe('User2');
    });

    it('should handle model names with underscores', () => {
      const field = new RefFieldBuilder('User_Profile');
      const config = field._build();

      expect(config.modelName).toBe('User_Profile');
    });

    it('should handle camelCase model names', () => {
      const field = new RefFieldBuilder('userProfile');
      const config = field._build();

      expect(config.modelName).toBe('userProfile');
    });

    it('should handle PascalCase model names', () => {
      const field = new RefFieldBuilder('UserProfile');
      const config = field._build();

      expect(config.modelName).toBe('UserProfile');
    });
  });

  describe('real-world scenarios', () => {
    it('should configure user reference', () => {
      const field = new RefFieldBuilder('User').required();
      const config = field._build();

      expect(config.modelName).toBe('User');
      expect(config.isRequired).toBe(true);
    });

    it('should configure project reference with cascade delete', () => {
      const field = new RefFieldBuilder('Project').onDelete('cascade');
      const config = field._build();

      expect(config.modelName).toBe('Project');
      expect(config.onDelete).toBe('cascade');
    });

    it('should configure optional parent category', () => {
      const field = new RefFieldBuilder('Category').optional();
      const config = field._build();

      expect(config.modelName).toBe('Category');
      expect(config.isOptional).toBe(true);
    });

    it('should configure nullable manager reference', () => {
      const field = new RefFieldBuilder('User').onDelete('set_null').nullable();
      const config = field._build();

      expect(config.modelName).toBe('User');
      expect(config.onDelete).toBe('set_null');
      expect(config.isNullable).toBe(true);
    });

    it('should configure owner reference with restrict', () => {
      const field = new RefFieldBuilder('User').onDelete('restrict').required();
      const config = field._build();

      expect(config.modelName).toBe('User');
      expect(config.onDelete).toBe('restrict');
      expect(config.isRequired).toBe(true);
    });

    it('should configure organization reference', () => {
      const field = new RefFieldBuilder('Organization').required();
      const config = field._build();

      expect(config.modelName).toBe('Organization');
      expect(config.isRequired).toBe(true);
    });

    it('should configure optional team reference', () => {
      const field = new RefFieldBuilder('Team').optional().onDelete('set_null');
      const config = field._build();

      expect(config.modelName).toBe('Team');
      expect(config.isOptional).toBe(true);
      expect(config.onDelete).toBe('set_null');
      expect(config.isNullable).toBe(true);
    });
  });

  describe('delete behavior scenarios', () => {
    it('should configure cascade for dependent records', () => {
      // Comments should be deleted when user is deleted
      const field = new RefFieldBuilder('User').onDelete('cascade').required();
      const config = field._build();

      expect(config.onDelete).toBe('cascade');
      expect(config.isRequired).toBe(true);
    });

    it('should configure set_null for optional references', () => {
      // Project can exist without manager
      const field = new RefFieldBuilder('User').onDelete('set_null').nullable();
      const config = field._build();

      expect(config.onDelete).toBe('set_null');
      expect(config.isNullable).toBe(true);
    });

    it('should configure restrict for protected references', () => {
      // Cannot delete user if they own projects
      const field = new RefFieldBuilder('User').onDelete('restrict').required();
      const config = field._build();

      expect(config.onDelete).toBe('restrict');
      expect(config.isRequired).toBe(true);
    });
  });
});
