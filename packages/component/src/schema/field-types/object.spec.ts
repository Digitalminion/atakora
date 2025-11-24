/**
 * Unit tests for object field builder
 *
 * Tests object-specific functionality:
 * - Nested object schema
 * - Type inference for nested properties
 * - Required/optional nested fields
 * - Schema validation
 */

import { describe, it, expect } from 'vitest';
import { ObjectFieldBuilder } from './object';
import { StringFieldBuilder } from './string';
import { NumberFieldBuilder } from './number';
import { BooleanFieldBuilder } from './boolean';

describe('ObjectFieldBuilder', () => {
  describe('constructor', () => {
    it('should create object field with correct type', () => {
      const schema = {
        name: new StringFieldBuilder(),
      };
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(config.type).toBe('object');
    });

    it('should store schema', () => {
      const schema = {
        name: new StringFieldBuilder(),
        age: new NumberFieldBuilder(),
      };
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(config.schema).toBe(schema);
    });

    it('should initialize with empty validations', () => {
      const schema = {
        name: new StringFieldBuilder(),
      };
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(config.validations).toEqual([]);
    });

    it('should throw error for null schema', () => {
      expect(() => new ObjectFieldBuilder(null as any)).toThrow(
        'Object field must have a schema definition'
      );
    });

    it('should throw error for undefined schema', () => {
      expect(() => new ObjectFieldBuilder(undefined as any)).toThrow(
        'Object field must have a schema definition'
      );
    });

    it('should throw error for non-object schema', () => {
      expect(() => new ObjectFieldBuilder('not an object' as any)).toThrow(
        'Object field must have a schema definition'
      );
    });
  });

  describe('getSchema()', () => {
    it('should return schema', () => {
      const schema = {
        name: new StringFieldBuilder(),
        age: new NumberFieldBuilder(),
      };
      const field = new ObjectFieldBuilder(schema);

      expect(field.getSchema()).toBe(schema);
    });

    it('should return original schema reference', () => {
      const schema = {
        email: new StringFieldBuilder().email(),
      };
      const field = new ObjectFieldBuilder(schema);

      expect(field.getSchema()).toBe(schema);
    });
  });

  describe('simple schemas', () => {
    it('should handle single property schema', () => {
      const schema = {
        name: new StringFieldBuilder(),
      };
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(config.schema).toBe(schema);
      expect(Object.keys(config.schema)).toEqual(['name']);
    });

    it('should handle multiple properties', () => {
      const schema = {
        name: new StringFieldBuilder(),
        age: new NumberFieldBuilder(),
        isActive: new BooleanFieldBuilder(),
      };
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(Object.keys(config.schema)).toEqual(['name', 'age', 'isActive']);
    });
  });

  describe('nested schemas', () => {
    it('should handle nested object', () => {
      const schema = {
        user: new ObjectFieldBuilder({
          name: new StringFieldBuilder(),
          email: new StringFieldBuilder().email(),
        }),
      };
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(config.schema.user).toBeInstanceOf(ObjectFieldBuilder);
    });

    it('should handle deeply nested objects', () => {
      const schema = {
        address: new ObjectFieldBuilder({
          street: new StringFieldBuilder(),
          city: new StringFieldBuilder(),
          location: new ObjectFieldBuilder({
            lat: new NumberFieldBuilder(),
            lng: new NumberFieldBuilder(),
          }),
        }),
      };
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(config.schema.address).toBeInstanceOf(ObjectFieldBuilder);
    });
  });

  describe('default values', () => {
    it('should support empty object as default', () => {
      const schema = {
        name: new StringFieldBuilder(),
      };
      const field = new ObjectFieldBuilder(schema).default({});
      const config = field._build();

      expect(config.defaultValue).toEqual({});
    });

    it('should support object with values as default', () => {
      const schema = {
        name: new StringFieldBuilder(),
        age: new NumberFieldBuilder(),
      };
      const defaultValue = { name: 'John', age: 30 };
      const field = new ObjectFieldBuilder(schema).default(defaultValue);
      const config = field._build();

      expect(config.defaultValue).toEqual(defaultValue);
    });

    it('should support nested object default', () => {
      const schema = {
        settings: new ObjectFieldBuilder({
          theme: new StringFieldBuilder(),
          notifications: new BooleanFieldBuilder(),
        }),
      };
      const defaultValue = {
        settings: { theme: 'light', notifications: true },
      };
      const field = new ObjectFieldBuilder(schema).default(defaultValue);
      const config = field._build();

      expect(config.defaultValue).toEqual(defaultValue);
    });
  });

  describe('inheritance from BaseFieldBuilder', () => {
    it('should inherit required() method', () => {
      const schema = { name: new StringFieldBuilder() };
      const field = new ObjectFieldBuilder(schema).required();
      const config = field._build();

      expect(config.isRequired).toBe(true);
    });

    it('should inherit optional() method', () => {
      const schema = { name: new StringFieldBuilder() };
      const field = new ObjectFieldBuilder(schema).optional();
      const config = field._build();

      expect(config.isOptional).toBe(true);
    });

    it('should inherit nullable() method', () => {
      const schema = { name: new StringFieldBuilder() };
      const field = new ObjectFieldBuilder(schema).nullable();
      const config = field._build();

      expect(config.isNullable).toBe(true);
    });
  });

  describe('method chaining', () => {
    it('should support chaining with default and required', () => {
      const schema = { name: new StringFieldBuilder() };
      const field = new ObjectFieldBuilder(schema).default({}).required();
      const config = field._build();

      expect(config.defaultValue).toEqual({});
      expect(config.isRequired).toBe(true);
    });

    it('should support all modifiers', () => {
      const schema = { name: new StringFieldBuilder() };
      const field = new ObjectFieldBuilder(schema).default({}).required().nullable();
      const config = field._build();

      expect(config.defaultValue).toEqual({});
      expect(config.isRequired).toBe(true);
      expect(config.isNullable).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty schema', () => {
      const schema = {};
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(config.schema).toBe(schema);
      expect(Object.keys(config.schema)).toEqual([]);
    });

    it('should handle schema with field builders having modifiers', () => {
      const schema = {
        email: new StringFieldBuilder().email().required(),
        age: new NumberFieldBuilder().min(0).max(120).optional(),
      };
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(config.schema.email).toBeInstanceOf(StringFieldBuilder);
      expect(config.schema.age).toBeInstanceOf(NumberFieldBuilder);
    });
  });

  describe('real-world scenarios', () => {
    it('should configure address object', () => {
      const schema = {
        street: new StringFieldBuilder().required(),
        city: new StringFieldBuilder().required(),
        state: new StringFieldBuilder().required(),
        zip: new StringFieldBuilder().required(),
      };
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(Object.keys(config.schema)).toEqual(['street', 'city', 'state', 'zip']);
    });

    it('should configure settings object with defaults', () => {
      const schema = {
        theme: new StringFieldBuilder(),
        notifications: new BooleanFieldBuilder(),
        language: new StringFieldBuilder(),
      };
      const field = new ObjectFieldBuilder(schema).default({
        theme: 'light',
        notifications: true,
        language: 'en',
      });
      const config = field._build();

      expect(config.defaultValue).toBeDefined();
      expect(config.defaultValue.theme).toBe('light');
    });

    it('should configure nested notification preferences', () => {
      const schema = {
        email: new BooleanFieldBuilder().default(true),
        sms: new BooleanFieldBuilder().default(false),
        push: new BooleanFieldBuilder().default(true),
      };
      const field = new ObjectFieldBuilder(schema).default({
        email: true,
        sms: false,
        push: true,
      });
      const config = field._build();

      expect(config.defaultValue).toBeDefined();
    });

    it('should configure user profile object', () => {
      const schema = {
        firstName: new StringFieldBuilder().required(),
        lastName: new StringFieldBuilder().required(),
        bio: new StringFieldBuilder().optional().max(500),
        avatar: new StringFieldBuilder().url().optional(),
      };
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(Object.keys(config.schema)).toHaveLength(4);
    });

    it('should configure location coordinates', () => {
      const schema = {
        lat: new NumberFieldBuilder().required().min(-90).max(90),
        lng: new NumberFieldBuilder().required().min(-180).max(180),
        altitude: new NumberFieldBuilder().optional(),
      };
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(config.schema.lat).toBeInstanceOf(NumberFieldBuilder);
      expect(config.schema.lng).toBeInstanceOf(NumberFieldBuilder);
      expect(config.schema.altitude).toBeInstanceOf(NumberFieldBuilder);
    });

    it('should configure complex nested settings', () => {
      const schema = {
        display: new ObjectFieldBuilder({
          theme: new StringFieldBuilder().default('light'),
          fontSize: new NumberFieldBuilder().default(14),
        }),
        privacy: new ObjectFieldBuilder({
          profileVisible: new BooleanFieldBuilder().default(true),
          showEmail: new BooleanFieldBuilder().default(false),
        }),
      };
      const field = new ObjectFieldBuilder(schema);
      const config = field._build();

      expect(config.schema.display).toBeInstanceOf(ObjectFieldBuilder);
      expect(config.schema.privacy).toBeInstanceOf(ObjectFieldBuilder);
    });
  });
});
