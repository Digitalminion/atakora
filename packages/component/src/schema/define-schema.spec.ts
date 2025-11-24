/**
 * Tests for Schema Definition System
 *
 * Comprehensive test coverage for:
 * - defineSchema() function
 * - Schema validation
 * - Schema introspection utilities
 * - Edge cases and error handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  defineSchema,
  getModelNames,
  getCrudModelNames,
  getEventModelNames,
  getFunctionModelNames,
  getModel,
  hasModel,
  getSchemaMetadata,
  getSchemaStats,
} from './define-schema';
import { a } from './field-types';
import { c } from './crud-model';
import { e } from './event-model';
import { f } from './function-model';
import type { SchemaObject } from './types';

// ============================================================================
// Test Helper Functions
// ============================================================================

/**
 * Create a simple test schema
 */
function createTestSchema() {
  return defineSchema({
    schema: a.schema({
      User: c
        .model({
          id: a.id(),
          email: a.string().required().email(),
          name: a.string().required(),
          age: a.number().optional(),
        })
        .authorization((allow) => [allow.owner('id')])
        .indexes(['email'])
        .timestamps(true),

      DataUploaded: e.model({
        datasetId: a.string().required(),
        fileUrl: a.string().url().required(),
        uploadedAt: a.datetime().required(),
      }),

      GenerateReport: f
        .model({
          input: {
            datasetId: a.string().required(),
            format: a.enum(['pdf', 'excel'] as const).default('pdf'),
          },
          output: {
            reportUrl: a.string().url().required(),
            status: a.enum(['generating', 'completed'] as const).required(),
          },
        })
        .authorization((allow) => [allow.authenticated()]),
    }),
  });
}

/**
 * Create a minimal schema with one CRUD model
 */
function createMinimalSchema() {
  return defineSchema({
    schema: a.schema({
      Item: c.model({
        id: a.id(),
        name: a.string().required(),
      }),
    }),
  });
}

// ============================================================================
// defineSchema() Tests
// ============================================================================

describe('defineSchema()', () => {
  describe('basic schema creation', () => {
    it('should create a schema with CRUD models', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({
            id: a.id(),
            email: a.string().required().email(),
            name: a.string().required(),
          }),
        }),
      });

      expect(schema).toBeDefined();
      expect(schema.models).toBeDefined();
      expect(schema._metadata).toBeDefined();
      expect(schema._raw).toBeDefined();
    });

    it('should create a schema with event models', () => {
      const schema = defineSchema({
        schema: a.schema({
          DataUploaded: e.model({
            datasetId: a.string().required(),
            fileUrl: a.string().url().required(),
          }),
        }),
      });

      expect(schema).toBeDefined();
      expect(schema.models.DataUploaded).toBeDefined();
      expect(schema.models.DataUploaded.config.type).toBe('event');
    });

    it('should create a schema with function models', () => {
      const schema = defineSchema({
        schema: a.schema({
          ProcessData: f.model({
            input: {
              dataId: a.string().required(),
            },
            output: {
              result: a.string().required(),
            },
          }),
        }),
      });

      expect(schema).toBeDefined();
      expect(schema.models.ProcessData).toBeDefined();
      expect(schema.models.ProcessData.config.type).toBe('function');
    });

    it('should create a schema with mixed model types', () => {
      const schema = createTestSchema();

      expect(schema).toBeDefined();
      expect(Object.keys(schema.models)).toHaveLength(3);
      expect(schema.models.User).toBeDefined();
      expect(schema.models.DataUploaded).toBeDefined();
      expect(schema.models.GenerateReport).toBeDefined();
    });

    it('should preserve original schema definition in _raw', () => {
      const definition = {
        schema: a.schema({
          User: c.model({
            id: a.id(),
            name: a.string().required(),
          }),
        }),
      };

      const schema = defineSchema(definition);

      expect(schema._raw).toEqual(definition);
    });

    it('should include schema property with original models', () => {
      const models = {
        User: c.model({
          id: a.id(),
          name: a.string().required(),
        }),
      };

      const schema = defineSchema({
        schema: a.schema(models),
      });

      expect(schema.schema).toBeDefined();
      expect(schema.schema.User).toBeDefined();
    });
  });

  describe('schema validation', () => {
    it('should throw error if schema definition is missing', () => {
      expect(() => {
        defineSchema(null as any);
      }).toThrow('Schema definition is required');
    });

    it('should throw error if schema property is missing', () => {
      expect(() => {
        defineSchema({} as any);
      }).toThrow('Schema definition must include a "schema" property');
    });

    it('should throw error if schema is not an object', () => {
      expect(() => {
        defineSchema({ schema: 'not an object' } as any);
      }).toThrow('Schema must be an object');
    });

    it('should throw error if schema is empty', () => {
      expect(() => {
        defineSchema({ schema: {} });
      }).toThrow('Schema must contain at least one model');
    });

    it('should throw error for duplicate model names (case-insensitive)', () => {
      expect(() => {
        defineSchema({
          schema: a.schema({
            User: c.model({ id: a.id(), name: a.string() }),
            user: c.model({ id: a.id(), email: a.string() }),
          }),
        });
      }).toThrow('Schema contains duplicate model names');
    });
  });

  describe('schema metadata', () => {
    it('should include version in metadata', () => {
      const schema = createMinimalSchema();

      expect(schema._metadata.version).toBe('1.0.0');
    });

    it('should include createdAt timestamp in metadata', () => {
      const schema = createMinimalSchema();

      expect(schema._metadata.createdAt).toBeDefined();
      expect(new Date(schema._metadata.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should categorize models in metadata', () => {
      const schema = createTestSchema();

      expect(schema._metadata.models).toBeDefined();
      expect(schema._metadata.models.crud).toContain('User');
      expect(schema._metadata.models.events).toContain('DataUploaded');
      expect(schema._metadata.models.functions).toContain('GenerateReport');
    });

    it('should handle schema with only CRUD models', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({ id: a.id(), name: a.string() }),
          Post: c.model({ id: a.id(), title: a.string() }),
        }),
      });

      expect(schema._metadata.models.crud).toHaveLength(2);
      expect(schema._metadata.models.events).toHaveLength(0);
      expect(schema._metadata.models.functions).toHaveLength(0);
    });

    it('should handle schema with only event models', () => {
      const schema = defineSchema({
        schema: a.schema({
          UserCreated: e.model({ userId: a.string() }),
          UserDeleted: e.model({ userId: a.string() }),
        }),
      });

      expect(schema._metadata.models.crud).toHaveLength(0);
      expect(schema._metadata.models.events).toHaveLength(2);
      expect(schema._metadata.models.functions).toHaveLength(0);
    });

    it('should handle schema with only function models', () => {
      const schema = defineSchema({
        schema: a.schema({
          ProcessA: f.model({ input: { x: a.string() }, output: { y: a.string() } }),
          ProcessB: f.model({ input: { a: a.number() }, output: { b: a.number() } }),
        }),
      });

      expect(schema._metadata.models.crud).toHaveLength(0);
      expect(schema._metadata.models.events).toHaveLength(0);
      expect(schema._metadata.models.functions).toHaveLength(2);
    });
  });

  describe('model processing', () => {
    it('should process field definitions correctly', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({
            id: a.id(),
            email: a.string().required().email(),
            age: a.number().min(0).max(120),
          }),
        }),
      });

      const userModel = schema.models.User;
      expect(userModel.config.type).toBe('crud');
      expect(userModel.config.fields).toBeDefined();
      expect(userModel.config.fields.email).toBeDefined();
      expect(userModel.config.fields.email.type).toBe('string');
      // Check that email validation exists
      const hasRequiredValidation = userModel.config.fields.email.validations.some(
        (v) => v.type === 'required'
      );
      expect(hasRequiredValidation).toBe(true);
    });

    it('should process CRUD model configuration', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c
            .model({
              id: a.id(),
              name: a.string().required(),
            })
            .indexes(['name'])
            .partitionKey('organizationId')
            .timestamps(true)
            .softDelete(true),
        }),
      });

      const userConfig = schema.models.User.config;
      expect(userConfig.type).toBe('crud');
      if (userConfig.type === 'crud') {
        expect(userConfig.indexes).toContain('name');
        expect(userConfig.partitionKey).toBe('organizationId');
        expect(userConfig.timestamps).toBe(true);
        expect(userConfig.softDelete).toBe(true);
      }
    });

    it('should process event model configuration', () => {
      const schema = defineSchema({
        schema: a.schema({
          DataUploaded: e.model({
            fileUrl: a.string().url().required(),
            uploadedAt: a.datetime().required(),
          }),
        }),
      });

      const eventConfig = schema.models.DataUploaded.config;
      expect(eventConfig.type).toBe('event');
      if (eventConfig.type === 'event') {
        expect(eventConfig.fields).toBeDefined();
        expect(eventConfig.fields.fileUrl).toBeDefined();
      }
    });

    it('should process function model configuration', () => {
      const schema = defineSchema({
        schema: a.schema({
          GenerateReport: f
            .model({
              input: {
                datasetId: a.string().required(),
              },
              output: {
                reportUrl: a.string().url().required(),
              },
            })
            .authorization((allow) => [allow.authenticated()]),
        }),
      });

      const funcConfig = schema.models.GenerateReport.config;
      expect(funcConfig.type).toBe('function');
      if (funcConfig.type === 'function') {
        expect(funcConfig.input).toBeDefined();
        expect(funcConfig.output).toBeDefined();
        expect(funcConfig.authorization).toBeDefined();
      }
    });

    it('should set correct metadata flags for each model type', () => {
      const schema = createTestSchema();

      expect(schema.models.User.metadata.isCrud).toBe(true);
      expect(schema.models.User.metadata.isEvent).toBe(false);
      expect(schema.models.User.metadata.isFunction).toBe(false);

      expect(schema.models.DataUploaded.metadata.isCrud).toBe(false);
      expect(schema.models.DataUploaded.metadata.isEvent).toBe(true);
      expect(schema.models.DataUploaded.metadata.isFunction).toBe(false);

      expect(schema.models.GenerateReport.metadata.isCrud).toBe(false);
      expect(schema.models.GenerateReport.metadata.isEvent).toBe(false);
      expect(schema.models.GenerateReport.metadata.isFunction).toBe(true);
    });
  });
});

// ============================================================================
// Schema Introspection Tests
// ============================================================================

describe('Schema Introspection', () => {
  let testSchema: SchemaObject;

  beforeEach(() => {
    testSchema = createTestSchema();
  });

  describe('getModelNames()', () => {
    it('should return all model names', () => {
      const names = getModelNames(testSchema);

      expect(names).toHaveLength(3);
      expect(names).toContain('User');
      expect(names).toContain('DataUploaded');
      expect(names).toContain('GenerateReport');
    });

    it('should return empty array for empty schema', () => {
      const emptySchema = {
        models: {},
        _metadata: {
          version: '1.0.0',
          createdAt: '',
          models: { crud: [], events: [], functions: [] },
        },
        _raw: {},
        schema: {},
      };
      const names = getModelNames(emptySchema);

      expect(names).toHaveLength(0);
    });

    it('should preserve model name order', () => {
      const names = getModelNames(testSchema);
      const keys = Object.keys(testSchema.models);

      expect(names).toEqual(keys);
    });
  });

  describe('getCrudModelNames()', () => {
    it('should return only CRUD model names', () => {
      const names = getCrudModelNames(testSchema);

      expect(names).toHaveLength(1);
      expect(names).toContain('User');
      expect(names).not.toContain('DataUploaded');
      expect(names).not.toContain('GenerateReport');
    });

    it('should return empty array when no CRUD models exist', () => {
      const schema = defineSchema({
        schema: a.schema({
          Event1: e.model({ data: a.string() }),
        }),
      });

      const names = getCrudModelNames(schema);
      expect(names).toHaveLength(0);
    });

    it('should return all CRUD models from multi-model schema', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({ id: a.id(), name: a.string() }),
          Post: c.model({ id: a.id(), title: a.string() }),
          Comment: c.model({ id: a.id(), text: a.string() }),
        }),
      });

      const names = getCrudModelNames(schema);
      expect(names).toHaveLength(3);
    });
  });

  describe('getEventModelNames()', () => {
    it('should return only event model names', () => {
      const names = getEventModelNames(testSchema);

      expect(names).toHaveLength(1);
      expect(names).toContain('DataUploaded');
      expect(names).not.toContain('User');
      expect(names).not.toContain('GenerateReport');
    });

    it('should return empty array when no event models exist', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({ id: a.id(), name: a.string() }),
        }),
      });

      const names = getEventModelNames(schema);
      expect(names).toHaveLength(0);
    });

    it('should return all event models from multi-event schema', () => {
      const schema = defineSchema({
        schema: a.schema({
          UserCreated: e.model({ userId: a.string() }),
          UserDeleted: e.model({ userId: a.string() }),
          UserUpdated: e.model({ userId: a.string() }),
        }),
      });

      const names = getEventModelNames(schema);
      expect(names).toHaveLength(3);
    });
  });

  describe('getFunctionModelNames()', () => {
    it('should return only function model names', () => {
      const names = getFunctionModelNames(testSchema);

      expect(names).toHaveLength(1);
      expect(names).toContain('GenerateReport');
      expect(names).not.toContain('User');
      expect(names).not.toContain('DataUploaded');
    });

    it('should return empty array when no function models exist', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({ id: a.id(), name: a.string() }),
        }),
      });

      const names = getFunctionModelNames(schema);
      expect(names).toHaveLength(0);
    });

    it('should return all function models from multi-function schema', () => {
      const schema = defineSchema({
        schema: a.schema({
          ProcessA: f.model({ input: { x: a.string() }, output: { y: a.string() } }),
          ProcessB: f.model({ input: { a: a.number() }, output: { b: a.number() } }),
          ProcessC: f.model({ input: { p: a.boolean() }, output: { q: a.boolean() } }),
        }),
      });

      const names = getFunctionModelNames(schema);
      expect(names).toHaveLength(3);
    });
  });

  describe('getModel()', () => {
    it('should return model by name', () => {
      const model = getModel(testSchema, 'User');

      expect(model).toBeDefined();
      expect(model?.name).toBe('User');
      expect(model?.config.type).toBe('crud');
    });

    it('should return undefined for non-existent model', () => {
      const model = getModel(testSchema, 'NonExistent');

      expect(model).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      const model1 = getModel(testSchema, 'User');
      const model2 = getModel(testSchema, 'user');

      expect(model1).toBeDefined();
      expect(model2).toBeUndefined();
    });

    it('should return correct model for each type', () => {
      const userModel = getModel(testSchema, 'User');
      const eventModel = getModel(testSchema, 'DataUploaded');
      const funcModel = getModel(testSchema, 'GenerateReport');

      expect(userModel?.metadata.isCrud).toBe(true);
      expect(eventModel?.metadata.isEvent).toBe(true);
      expect(funcModel?.metadata.isFunction).toBe(true);
    });
  });

  describe('hasModel()', () => {
    it('should return true for existing model', () => {
      expect(hasModel(testSchema, 'User')).toBe(true);
      expect(hasModel(testSchema, 'DataUploaded')).toBe(true);
      expect(hasModel(testSchema, 'GenerateReport')).toBe(true);
    });

    it('should return false for non-existent model', () => {
      expect(hasModel(testSchema, 'NonExistent')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(hasModel(testSchema, 'User')).toBe(true);
      expect(hasModel(testSchema, 'user')).toBe(false);
    });

    it('should work with empty string', () => {
      expect(hasModel(testSchema, '')).toBe(false);
    });
  });

  describe('getSchemaMetadata()', () => {
    it('should return schema metadata', () => {
      const metadata = getSchemaMetadata(testSchema);

      expect(metadata).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.createdAt).toBeDefined();
      expect(metadata.models).toBeDefined();
    });

    it('should return metadata with correct model categorization', () => {
      const metadata = getSchemaMetadata(testSchema);

      expect(metadata.models.crud).toContain('User');
      expect(metadata.models.events).toContain('DataUploaded');
      expect(metadata.models.functions).toContain('GenerateReport');
    });

    it('should be immutable (return reference to internal metadata)', () => {
      const metadata = getSchemaMetadata(testSchema);

      expect(metadata).toBe(testSchema._metadata);
    });
  });

  describe('getSchemaStats()', () => {
    it('should return correct statistics', () => {
      const stats = getSchemaStats(testSchema);

      expect(stats.totalModels).toBe(3);
      expect(stats.crudModels).toBe(1);
      expect(stats.eventModels).toBe(1);
      expect(stats.functionModels).toBe(1);
    });

    it('should return statistics for CRUD-only schema', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({ id: a.id(), name: a.string() }),
          Post: c.model({ id: a.id(), title: a.string() }),
        }),
      });

      const stats = getSchemaStats(schema);

      expect(stats.totalModels).toBe(2);
      expect(stats.crudModels).toBe(2);
      expect(stats.eventModels).toBe(0);
      expect(stats.functionModels).toBe(0);
    });

    it('should include model name lists', () => {
      const stats = getSchemaStats(testSchema);

      expect(stats.models.crud).toContain('User');
      expect(stats.models.events).toContain('DataUploaded');
      expect(stats.models.functions).toContain('GenerateReport');
    });

    it('should calculate total correctly for large schema', () => {
      const schema = defineSchema({
        schema: a.schema({
          Model1: c.model({ id: a.id(), name: a.string() }),
          Model2: c.model({ id: a.id(), name: a.string() }),
          Event1: e.model({ data: a.string() }),
          Event2: e.model({ data: a.string() }),
          Func1: f.model({ input: { x: a.string() }, output: { y: a.string() } }),
          Func2: f.model({ input: { x: a.string() }, output: { y: a.string() } }),
        }),
      });

      const stats = getSchemaStats(schema);

      expect(stats.totalModels).toBe(6);
      expect(stats.crudModels).toBe(2);
      expect(stats.eventModels).toBe(2);
      expect(stats.functionModels).toBe(2);
    });
  });
});

// ============================================================================
// Edge Cases and Complex Scenarios
// ============================================================================

describe('Edge Cases', () => {
  describe('complex field configurations', () => {
    it('should handle nested object fields', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({
            id: a.id(),
            profile: a.object({
              firstName: a.string().required(),
              lastName: a.string().required(),
              age: a.number().optional(),
            }),
          }),
        }),
      });

      expect(schema.models.User).toBeDefined();
      const fields = schema.models.User.config.fields;
      expect(fields.profile.type).toBe('object');
    });

    it('should handle array fields', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({
            id: a.id(),
            tags: a.array(a.string()),
          }),
        }),
      });

      expect(schema.models.User).toBeDefined();
      const fields = schema.models.User.config.fields;
      expect(fields.tags.type).toBe('array');
    });

    it('should handle enum fields', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({
            id: a.id(),
            role: a.enum(['admin', 'user', 'guest'] as const).default('user'),
          }),
        }),
      });

      expect(schema.models.User).toBeDefined();
      const fields = schema.models.User.config.fields;
      expect(fields.role.type).toBe('enum');
      if (fields.role.type === 'enum') {
        expect(fields.role.values).toEqual(['admin', 'user', 'guest']);
      }
    });

    it('should handle fields with multiple validations', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({
            id: a.id(),
            password: a
              .string()
              .required()
              .minLength(8)
              .maxLength(128)
              .regex(/[A-Z]/, 'Must contain uppercase'),
          }),
        }),
      });

      expect(schema.models.User).toBeDefined();
      const fields = schema.models.User.config.fields;
      expect(fields.password.validations.length).toBeGreaterThan(1);
    });
  });

  describe('authorization rules', () => {
    it('should handle multiple authorization rules', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c
            .model({
              id: a.id(),
              name: a.string().required(),
            })
            .authorization((allow) => [allow.owner('id'), allow.groups(['admin']).all()]),
        }),
      });

      const userConfig = schema.models.User.config;
      if (userConfig.type === 'crud') {
        expect(userConfig.authorization).toHaveLength(2);
      }
    });

    it('should handle authorization on function models', () => {
      const schema = defineSchema({
        schema: a.schema({
          ProcessData: f
            .model({
              input: { data: a.string() },
              output: { result: a.string() },
            })
            .authorization((allow) => [allow.authenticated(), allow.groups(['processors']).all()]),
        }),
      });

      const funcConfig = schema.models.ProcessData.config;
      if (funcConfig.type === 'function') {
        expect(funcConfig.authorization).toHaveLength(2);
      }
    });
  });

  describe('large schemas', () => {
    it('should handle schema with many models efficiently', () => {
      const models: Record<string, any> = {};

      // Create 50 models
      for (let i = 0; i < 50; i++) {
        models[`Model${i}`] = c.model({
          id: a.id(),
          name: a.string().required(),
        });
      }

      const schema = defineSchema({
        schema: a.schema(models),
      });

      expect(Object.keys(schema.models)).toHaveLength(50);
      expect(getCrudModelNames(schema)).toHaveLength(50);
    });

    it('should handle models with many fields', () => {
      const fields: Record<string, any> = { id: a.id() };

      // Create 30 fields
      for (let i = 0; i < 30; i++) {
        fields[`field${i}`] = a.string();
      }

      const schema = defineSchema({
        schema: a.schema({
          LargeModel: c.model(fields),
        }),
      });

      expect(schema.models.LargeModel).toBeDefined();
      const modelFields = schema.models.LargeModel.config.fields;
      expect(Object.keys(modelFields).length).toBeGreaterThanOrEqual(30);
    });
  });

  describe('special characters and naming', () => {
    it('should accept models with numbers in names', () => {
      const schema = defineSchema({
        schema: a.schema({
          User2: c.model({ id: a.id(), name: a.string() }),
          Model3D: c.model({ id: a.id(), name: a.string() }),
        }),
      });

      expect(schema.models.User2).toBeDefined();
      expect(schema.models.Model3D).toBeDefined();
    });

    it('should handle very long model names', () => {
      const longName = 'A'.repeat(100);
      const schema = defineSchema({
        schema: a.schema({
          [longName]: c.model({ id: a.id(), name: a.string() }),
        }),
      });

      expect(schema.models[longName]).toBeDefined();
    });
  });
});
