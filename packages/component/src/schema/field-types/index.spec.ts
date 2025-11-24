/**
 * Unit tests for field types index and `a` namespace
 *
 * Tests the public API exported via the `a` namespace:
 * - All field types accessible via a.string(), a.number(), etc.
 * - Factory functions return correct builder instances
 * - Integration tests for common combinations
 * - Type exports
 */

import { describe, it, expect } from 'vitest';
import {
  a,
  StringFieldBuilder,
  NumberFieldBuilder,
  BooleanFieldBuilder,
  DateTimeFieldBuilder,
  IdFieldBuilder,
  EnumFieldBuilder,
  ArrayFieldBuilder,
  RefFieldBuilder,
  ObjectFieldBuilder,
  JsonFieldBuilder,
  BinaryFieldBuilder,
} from './index';

describe('Field Types Index', () => {
  describe('a.string()', () => {
    it('should create StringFieldBuilder instance', () => {
      const field = a.string();

      expect(field).toBeInstanceOf(StringFieldBuilder);
    });

    it('should create independent instances', () => {
      const field1 = a.string();
      const field2 = a.string();

      expect(field1).not.toBe(field2);
    });

    it('should support chaining', () => {
      const field = a.string().required().email();
      const config = field._build();

      expect(config.isRequired).toBe(true);
      expect(config.format).toBe('email');
    });
  });

  describe('a.number()', () => {
    it('should create NumberFieldBuilder instance', () => {
      const field = a.number();

      expect(field).toBeInstanceOf(NumberFieldBuilder);
    });

    it('should create independent instances', () => {
      const field1 = a.number();
      const field2 = a.number();

      expect(field1).not.toBe(field2);
    });

    it('should support chaining', () => {
      const field = a.number().min(0).max(100);
      const config = field._build();

      expect(config.min).toBe(0);
      expect(config.max).toBe(100);
    });
  });

  describe('a.boolean()', () => {
    it('should create BooleanFieldBuilder instance', () => {
      const field = a.boolean();

      expect(field).toBeInstanceOf(BooleanFieldBuilder);
    });

    it('should create independent instances', () => {
      const field1 = a.boolean();
      const field2 = a.boolean();

      expect(field1).not.toBe(field2);
    });

    it('should support chaining', () => {
      const field = a.boolean().default(true).required();
      const config = field._build();

      expect(config.defaultValue).toBe(true);
      expect(config.isRequired).toBe(true);
    });
  });

  describe('a.datetime()', () => {
    it('should create DateTimeFieldBuilder instance', () => {
      const field = a.datetime();

      expect(field).toBeInstanceOf(DateTimeFieldBuilder);
    });

    it('should create independent instances', () => {
      const field1 = a.datetime();
      const field2 = a.datetime();

      expect(field1).not.toBe(field2);
    });

    it('should support chaining', () => {
      const field = a.datetime().future().required();
      const config = field._build();

      expect(config.isFuture).toBe(true);
      expect(config.isRequired).toBe(true);
    });
  });

  describe('a.id()', () => {
    it('should create IdFieldBuilder instance', () => {
      const field = a.id();

      expect(field).toBeInstanceOf(IdFieldBuilder);
    });

    it('should create independent instances', () => {
      const field1 = a.id();
      const field2 = a.id();

      expect(field1).not.toBe(field2);
    });

    it('should support chaining', () => {
      const field = a.id().prefix('user');
      const config = field._build();

      expect(config.prefix).toBe('user');
      expect(config.autoGenerate).toBe(true);
    });
  });

  describe('a.enum()', () => {
    it('should create EnumFieldBuilder instance', () => {
      const field = a.enum(['pending', 'active'] as const);

      expect(field).toBeInstanceOf(EnumFieldBuilder);
    });

    it('should pass values to builder', () => {
      const values = ['low', 'medium', 'high'] as const;
      const field = a.enum(values);
      const config = field._build();

      expect(config.values).toBe(values);
    });

    it('should support chaining', () => {
      const field = a
        .enum(['user', 'admin'] as const)
        .default('user')
        .required();
      const config = field._build();

      expect(config.defaultValue).toBe('user');
      expect(config.isRequired).toBe(true);
    });

    it('should create independent instances', () => {
      const field1 = a.enum(['a', 'b'] as const);
      const field2 = a.enum(['a', 'b'] as const);

      expect(field1).not.toBe(field2);
    });
  });

  describe('a.array()', () => {
    it('should create ArrayFieldBuilder instance', () => {
      const field = a.array(a.string());

      expect(field).toBeInstanceOf(ArrayFieldBuilder);
    });

    it('should pass item type to builder', () => {
      const itemType = a.string();
      const field = a.array(itemType);
      const config = field._build();

      expect(config.itemType).toBe(itemType);
    });

    it('should support chaining', () => {
      const field = a.array(a.string()).minItems(1).maxItems(10);
      const config = field._build();

      expect(config.minItems).toBe(1);
      expect(config.maxItems).toBe(10);
    });

    it('should work with different item types', () => {
      const stringArray = a.array(a.string());
      const numberArray = a.array(a.number());

      expect(stringArray.getItemType()).toBeInstanceOf(StringFieldBuilder);
      expect(numberArray.getItemType()).toBeInstanceOf(NumberFieldBuilder);
    });
  });

  describe('a.ref()', () => {
    it('should create RefFieldBuilder instance', () => {
      const field = a.ref('User');

      expect(field).toBeInstanceOf(RefFieldBuilder);
    });

    it('should pass model name to builder', () => {
      const field = a.ref('User');
      const config = field._build();

      expect(config.modelName).toBe('User');
    });

    it('should support chaining', () => {
      const field = a.ref('User').onDelete('cascade').required();
      const config = field._build();

      expect(config.onDelete).toBe('cascade');
      expect(config.isRequired).toBe(true);
    });

    it('should create independent instances', () => {
      const field1 = a.ref('User');
      const field2 = a.ref('User');

      expect(field1).not.toBe(field2);
    });
  });

  describe('a.object()', () => {
    it('should create ObjectFieldBuilder instance', () => {
      const field = a.object({
        name: a.string(),
      });

      expect(field).toBeInstanceOf(ObjectFieldBuilder);
    });

    it('should pass schema to builder', () => {
      const schema = {
        name: a.string(),
        age: a.number(),
      };
      const field = a.object(schema);
      const config = field._build();

      expect(config.schema).toBe(schema);
    });

    it('should support chaining', () => {
      const field = a
        .object({
          name: a.string(),
        })
        .required()
        .default({});
      const config = field._build();

      expect(config.isRequired).toBe(true);
      expect(config.defaultValue).toEqual({});
    });

    it('should support nested objects', () => {
      const field = a.object({
        address: a.object({
          street: a.string(),
          city: a.string(),
        }),
      });
      const config = field._build();

      expect(config.schema.address).toBeInstanceOf(ObjectFieldBuilder);
    });
  });

  describe('a.json()', () => {
    it('should create JsonFieldBuilder instance', () => {
      const field = a.json();

      expect(field).toBeInstanceOf(JsonFieldBuilder);
    });

    it('should create independent instances', () => {
      const field1 = a.json();
      const field2 = a.json();

      expect(field1).not.toBe(field2);
    });

    it('should support chaining', () => {
      const field = a.json().objectOnly().default({});
      const config = field._build();

      const customRule = config.validations.find((v) => v.type === 'custom');
      expect(customRule?.message).toBe('Must be a JSON object');
      expect(config.defaultValue).toEqual({});
    });
  });

  describe('a.binary()', () => {
    it('should create BinaryFieldBuilder instance', () => {
      const field = a.binary();

      expect(field).toBeInstanceOf(BinaryFieldBuilder);
    });

    it('should create independent instances', () => {
      const field1 = a.binary();
      const field2 = a.binary();

      expect(field1).not.toBe(field2);
    });

    it('should support chaining', () => {
      const field = a.binary().maxSize(1024).mimeTypes(['image/png']);
      const config = field._build();

      expect(config.maxSize).toBe(1024);
      expect(config.allowedMimeTypes).toEqual(['image/png']);
    });
  });

  describe('a.schema()', () => {
    it('should be a placeholder function', () => {
      expect(typeof a.schema).toBe('function');
    });

    it('should return models as-is (placeholder behavior)', () => {
      const models = {
        User: 'user-model',
        Project: 'project-model',
      };
      const result = a.schema(models);

      expect(result).toBe(models);
    });
  });

  describe('integration: common field combinations', () => {
    it('should configure email field', () => {
      const field = a.string().email().required();
      const config = field._build();

      expect(config.type).toBe('string');
      expect(config.format).toBe('email');
      expect(config.isRequired).toBe(true);
    });

    it('should configure username field', () => {
      const field = a.string().min(3).max(20).required();
      const config = field._build();

      expect(config.type).toBe('string');
      expect(config.minLength).toBe(3);
      expect(config.maxLength).toBe(20);
      expect(config.isRequired).toBe(true);
    });

    it('should configure age field', () => {
      const field = a.number().integer().min(0).max(120);
      const config = field._build();

      expect(config.type).toBe('number');
      expect(config.isInteger).toBe(true);
      expect(config.min).toBe(0);
      expect(config.max).toBe(120);
    });

    it('should configure status enum', () => {
      const field = a.enum(['pending', 'active', 'archived'] as const).default('pending');
      const config = field._build();

      expect(config.type).toBe('enum');
      expect(config.values).toEqual(['pending', 'active', 'archived']);
      expect(config.defaultValue).toBe('pending');
    });

    it('should configure tags array', () => {
      const field = a.array(a.string()).default([]);
      const config = field._build();

      expect(config.type).toBe('array');
      expect(config.itemType).toBeInstanceOf(StringFieldBuilder);
      expect(config.defaultValue).toEqual([]);
    });

    it('should configure user reference', () => {
      const field = a.ref('User').required();
      const config = field._build();

      expect(config.type).toBe('ref');
      expect(config.modelName).toBe('User');
      expect(config.isRequired).toBe(true);
    });

    it('should configure address object', () => {
      const field = a.object({
        street: a.string().required(),
        city: a.string().required(),
        zip: a.string().required(),
      });
      const config = field._build();

      expect(config.type).toBe('object');
      expect(Object.keys(config.schema)).toEqual(['street', 'city', 'zip']);
    });

    it('should configure metadata JSON', () => {
      const field = a.json().default({});
      const config = field._build();

      expect(config.type).toBe('json');
      expect(config.defaultValue).toEqual({});
    });

    it('should configure image upload', () => {
      const field = a
        .binary()
        .maxSize(10 * 1024 * 1024)
        .mimeTypes(['image/png', 'image/jpeg']);
      const config = field._build();

      expect(config.type).toBe('binary');
      expect(config.maxSize).toBe(10 * 1024 * 1024);
      expect(config.allowedMimeTypes).toHaveLength(2);
    });
  });

  describe('integration: complex nested structures', () => {
    it('should configure user model with all field types', () => {
      const userFields = {
        id: a.id(),
        email: a.string().email().required(),
        name: a.string().required(),
        age: a.number().integer().min(0).optional(),
        role: a.enum(['user', 'admin'] as const).default('user'),
        tags: a.array(a.string()).default([]),
        settings: a
          .object({
            theme: a.string().default('light'),
            notifications: a.boolean().default(true),
          })
          .default({}),
        metadata: a.json().optional(),
        createdAt: a.datetime().required(),
      };

      expect(userFields.id).toBeInstanceOf(IdFieldBuilder);
      expect(userFields.email).toBeInstanceOf(StringFieldBuilder);
      expect(userFields.name).toBeInstanceOf(StringFieldBuilder);
      expect(userFields.age).toBeInstanceOf(NumberFieldBuilder);
      expect(userFields.role).toBeInstanceOf(EnumFieldBuilder);
      expect(userFields.tags).toBeInstanceOf(ArrayFieldBuilder);
      expect(userFields.settings).toBeInstanceOf(ObjectFieldBuilder);
      expect(userFields.metadata).toBeInstanceOf(JsonFieldBuilder);
      expect(userFields.createdAt).toBeInstanceOf(DateTimeFieldBuilder);
    });

    it('should configure nested array of objects', () => {
      const field = a.array(
        a.object({
          name: a.string().required(),
          value: a.number().required(),
        })
      );
      const config = field._build();

      expect(config.type).toBe('array');
      expect(config.itemType).toBeInstanceOf(ObjectFieldBuilder);
    });

    it('should configure deeply nested object structure', () => {
      const field = a.object({
        user: a.object({
          profile: a.object({
            name: a.string(),
            bio: a.string(),
          }),
          settings: a.object({
            privacy: a.object({
              showEmail: a.boolean(),
            }),
          }),
        }),
      });
      const config = field._build();

      expect(config.schema.user).toBeInstanceOf(ObjectFieldBuilder);
    });
  });

  describe('exported types and classes', () => {
    it('should export all field builder classes', () => {
      expect(StringFieldBuilder).toBeDefined();
      expect(NumberFieldBuilder).toBeDefined();
      expect(BooleanFieldBuilder).toBeDefined();
      expect(DateTimeFieldBuilder).toBeDefined();
      expect(IdFieldBuilder).toBeDefined();
      expect(EnumFieldBuilder).toBeDefined();
      expect(ArrayFieldBuilder).toBeDefined();
      expect(RefFieldBuilder).toBeDefined();
      expect(ObjectFieldBuilder).toBeDefined();
      expect(JsonFieldBuilder).toBeDefined();
      expect(BinaryFieldBuilder).toBeDefined();
    });

    it('should export the a namespace', () => {
      expect(a).toBeDefined();
      expect(typeof a).toBe('object');
    });

    it('should have all factory methods on a namespace', () => {
      expect(typeof a.string).toBe('function');
      expect(typeof a.number).toBe('function');
      expect(typeof a.boolean).toBe('function');
      expect(typeof a.datetime).toBe('function');
      expect(typeof a.id).toBe('function');
      expect(typeof a.enum).toBe('function');
      expect(typeof a.array).toBe('function');
      expect(typeof a.ref).toBe('function');
      expect(typeof a.object).toBe('function');
      expect(typeof a.json).toBe('function');
      expect(typeof a.binary).toBe('function');
      expect(typeof a.schema).toBe('function');
    });
  });
});
