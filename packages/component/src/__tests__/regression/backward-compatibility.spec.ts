/**
 * Backward Compatibility Tests - Week 3
 *
 * Ensures no breaking changes in:
 * - Public API surface
 * - Schema definitions
 * - Backend configurations
 * - Authentication patterns
 * - Service interfaces
 */

import { describe, it, expect } from 'vitest';
import { defineSchema } from '../../schema/define-schema';
import { defineBackend } from '../../backend/define-backend';
import { defineAuth } from '../../auth/define-auth';
import { a } from '../../schema/field-types';

describe('Backward Compatibility Tests', () => {
  describe('Schema API Compatibility', () => {
    it('should support v1 schema definition pattern', () => {
      // Original v1 pattern
      const schema = defineSchema({
        User: a
          .model({
            id: a.id(),
            name: a.string().required(),
            email: a.string().required(),
          })
          .crud(),
      });

      expect(schema).toBeDefined();
      expect(schema.models.User).toBeDefined();
      expect(schema.models.User.fields.id).toBeDefined();
      expect(schema.models.User.fields.name).toBeDefined();
      expect(schema.models.User.fields.email).toBeDefined();
    });

    it('should support all original field types', () => {
      const schema = defineSchema({
        AllTypes: a
          .model({
            id: a.id(),
            stringField: a.string(),
            numberField: a.number(),
            booleanField: a.boolean(),
            dateField: a.datetime(),
            enumField: a.enum(['A', 'B', 'C']),
            arrayField: a.array(a.string()),
            objectField: a.object({ nested: a.string() }),
            refField: a.ref('AllTypes'),
          })
          .crud(),
      });

      expect(schema.models.AllTypes).toBeDefined();
      expect(Object.keys(schema.models.AllTypes.fields)).toHaveLength(9);
    });

    it('should support field modifiers from v1', () => {
      const schema = defineSchema({
        User: a
          .model({
            id: a.id(),
            required: a.string().required(),
            withDefault: a.string().default('default-value'),
            nullable: a.string(),
          })
          .crud(),
      });

      expect(schema.models.User.fields.required.isRequired).toBe(true);
      expect(schema.models.User.fields.withDefault.defaultValue).toBe('default-value');
    });

    it('should support model types from v1', () => {
      const schema = defineSchema({
        CrudModel: a.model({ id: a.id(), name: a.string() }).crud(),
        EventModel: a
          .model({ id: a.id(), timestamp: a.datetime(), data: a.string() })
          .event(),
        FunctionModel: a
          .model({
            input: a.object({ value: a.string() }),
            output: a.object({ result: a.string() }),
          })
          .function(),
      });

      expect(schema.models.CrudModel.modelType).toBe('crud');
      expect(schema.models.EventModel.modelType).toBe('event');
      expect(schema.models.FunctionModel.modelType).toBe('function');
    });
  });

  describe('Backend API Compatibility', () => {
    it('should support minimal backend configuration from v1', () => {
      const schema = defineSchema({
        User: a.model({ id: a.id(), name: a.string() }).crud(),
      });

      const backend = defineBackend({
        schema,
        settings: {
          name: 'test-app',
        },
      });

      expect(backend).toBeDefined();
      expect(backend.schema).toBe(schema);
      expect(backend.settings.name).toBe('test-app');
    });

    it('should support backend with authentication', () => {
      const schema = defineSchema({
        User: a.model({ id: a.id(), name: a.string() }).crud(),
      });

      const auth = defineAuth({
        providers: {
          entra: {
            tenantId: 'test-tenant',
            clientId: 'test-client',
            enabled: true,
          },
        },
      });

      const backend = defineBackend({
        schema,
        authentication: auth,
        settings: { name: 'test-app' },
      });

      expect(backend.authentication).toBeDefined();
      expect(backend.authentication?.providers?.entra).toBeDefined();
    });

    it('should support all original settings options', () => {
      const schema = defineSchema({
        User: a.model({ id: a.id() }).crud(),
      });

      const backend = defineBackend({
        schema,
        settings: {
          name: 'test-app',
          region: 'eastus',
          environment: 'production',
        },
      });

      expect(backend.settings.name).toBe('test-app');
      expect(backend.settings.region).toBe('eastus');
      expect(backend.settings.environment).toBe('production');
    });
  });

  describe('Authentication API Compatibility', () => {
    it('should support Entra ID provider configuration', () => {
      const auth = defineAuth({
        providers: {
          entra: {
            tenantId: 'test-tenant',
            clientId: 'test-client',
            enabled: true,
          },
        },
      });

      expect(auth.providers?.entra).toBeDefined();
      expect(auth.providers?.entra?.tenantId).toBe('test-tenant');
      expect(auth.providers?.entra?.clientId).toBe('test-client');
    });

    it('should support API Keys provider configuration', () => {
      const auth = defineAuth({
        providers: {
          apiKeys: {
            keys: [{ id: 'key-1', value: 'secret', name: 'Service 1' }],
            enabled: true,
          },
        },
      });

      expect(auth.providers?.apiKeys).toBeDefined();
      expect(auth.providers?.apiKeys?.keys).toHaveLength(1);
    });

    it('should support multiple providers', () => {
      const auth = defineAuth({
        providers: {
          entra: {
            tenantId: 'test-tenant',
            clientId: 'test-client',
            enabled: true,
          },
          apiKeys: {
            keys: [{ id: 'key-1', value: 'secret', name: 'Service 1' }],
            enabled: true,
          },
        },
      });

      expect(auth.providers?.entra).toBeDefined();
      expect(auth.providers?.apiKeys).toBeDefined();
    });
  });

  describe('Field Types API Compatibility', () => {
    it('should support string field configuration', () => {
      const field = a.string().required().default('test');

      expect(field.fieldType).toBe('string');
      expect(field.isRequired).toBe(true);
      expect(field.defaultValue).toBe('test');
    });

    it('should support number field configuration', () => {
      const field = a.number().required().default(42);

      expect(field.fieldType).toBe('number');
      expect(field.isRequired).toBe(true);
      expect(field.defaultValue).toBe(42);
    });

    it('should support enum field configuration', () => {
      const field = a.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT');

      expect(field.fieldType).toBe('enum');
      expect(field.defaultValue).toBe('DRAFT');
    });

    it('should support array field configuration', () => {
      const field = a.array(a.string());

      expect(field.fieldType).toBe('array');
    });

    it('should support object field configuration', () => {
      const field = a.object({
        nested: a.string(),
        count: a.number(),
      });

      expect(field.fieldType).toBe('object');
    });

    it('should support ref field configuration', () => {
      const field = a.ref('User').required();

      expect(field.fieldType).toBe('ref');
      expect(field.isRequired).toBe(true);
    });
  });

  describe('Export Compatibility', () => {
    it('should export all public APIs', async () => {
      // These imports should work from main package
      const { defineSchema: schemaFn } = await import('../../schema/define-schema');
      const { defineBackend: backendFn } = await import('../../backend/define-backend');
      const { defineAuth: authFn } = await import('../../auth/define-auth');
      const { a: fieldTypes } = await import('../../schema/field-types');

      expect(schemaFn).toBeDefined();
      expect(backendFn).toBeDefined();
      expect(authFn).toBeDefined();
      expect(fieldTypes).toBeDefined();
    });

    it('should maintain function signatures', () => {
      // defineSchema accepts models object
      const schema = defineSchema({
        User: a.model({ id: a.id() }).crud(),
      });
      expect(schema).toBeDefined();

      // defineBackend accepts config object
      const backend = defineBackend({
        schema,
        settings: { name: 'test' },
      });
      expect(backend).toBeDefined();

      // defineAuth accepts config object
      const auth = defineAuth({
        providers: {
          entra: { tenantId: 'test', clientId: 'test', enabled: true },
        },
      });
      expect(auth).toBeDefined();
    });
  });

  describe('Data Structure Compatibility', () => {
    it('should maintain schema structure', () => {
      const schema = defineSchema({
        User: a.model({ id: a.id(), name: a.string() }).crud(),
      });

      expect(schema).toHaveProperty('models');
      expect(schema.models).toHaveProperty('User');
      expect(schema.models.User).toHaveProperty('fields');
      expect(schema.models.User).toHaveProperty('modelType');
    });

    it('should maintain backend structure', () => {
      const schema = defineSchema({
        User: a.model({ id: a.id() }).crud(),
      });

      const backend = defineBackend({
        schema,
        settings: { name: 'test' },
      });

      expect(backend).toHaveProperty('schema');
      expect(backend).toHaveProperty('settings');
      expect(backend.settings).toHaveProperty('name');
      expect(backend.settings).toHaveProperty('region');
      expect(backend.settings).toHaveProperty('environment');
    });
  });

  describe('Default Values Compatibility', () => {
    it('should apply correct defaults for schema', () => {
      const schema = defineSchema({
        User: a.model({ id: a.id() }).crud(),
      });

      expect(schema).toBeDefined();
      expect(schema.models).toBeDefined();
    });

    it('should apply correct defaults for backend settings', () => {
      const schema = defineSchema({
        User: a.model({ id: a.id() }).crud(),
      });

      const backend = defineBackend({
        schema,
        settings: { name: 'test' },
      });

      // Default region should be applied
      expect(backend.settings.region).toBeDefined();

      // Default environment should be applied
      expect(backend.settings.environment).toBeDefined();
    });

    it('should apply correct defaults for field types', () => {
      const stringField = a.string();
      expect(stringField.isRequired).toBe(false);

      const numberField = a.number();
      expect(numberField.isRequired).toBe(false);

      const boolField = a.boolean();
      expect(boolField.isRequired).toBe(false);
    });
  });

  describe('Error Messages Compatibility', () => {
    it('should throw consistent error for missing schema', () => {
      expect(() => {
        defineBackend({
          schema: null as any,
          settings: { name: 'test' },
        });
      }).toThrow();
    });

    it('should throw consistent error for missing settings', () => {
      const schema = defineSchema({
        User: a.model({ id: a.id() }).crud(),
      });

      expect(() => {
        defineBackend({
          schema,
          settings: null as any,
        });
      }).toThrow();
    });

    it('should throw consistent error for invalid model name', () => {
      expect(() => {
        defineSchema({
          'Invalid-Name!': a.model({ id: a.id() }).crud(),
        });
      }).toThrow();
    });
  });

  describe('Type Safety Compatibility', () => {
    it('should maintain type inference for schema', () => {
      const schema = defineSchema({
        User: a
          .model({
            id: a.id(),
            name: a.string(),
            age: a.number(),
          })
          .crud(),
      });

      // TypeScript should infer these types correctly
      type UserFields = typeof schema.models.User.fields;

      expect(schema.models.User.fields.id.fieldType).toBe('id');
      expect(schema.models.User.fields.name.fieldType).toBe('string');
      expect(schema.models.User.fields.age.fieldType).toBe('number');
    });

    it('should maintain type safety for backend config', () => {
      const schema = defineSchema({
        User: a.model({ id: a.id() }).crud(),
      });

      const backend = defineBackend({
        schema,
        settings: {
          name: 'test',
          environment: 'development', // Should only accept valid environments
        },
      });

      expect(backend.settings.environment).toBe('development');
    });
  });

  describe('Nested Structures Compatibility', () => {
    it('should support nested objects in models', () => {
      const schema = defineSchema({
        User: a
          .model({
            id: a.id(),
            profile: a.object({
              firstName: a.string(),
              lastName: a.string(),
              address: a.object({
                street: a.string(),
                city: a.string(),
                country: a.string(),
              }),
            }),
          })
          .crud(),
      });

      expect(schema.models.User.fields.profile.fieldType).toBe('object');
    });

    it('should support arrays of complex types', () => {
      const schema = defineSchema({
        Blog: a
          .model({
            id: a.id(),
            tags: a.array(a.string()),
            comments: a.array(
              a.object({
                author: a.string(),
                text: a.string(),
                timestamp: a.datetime(),
              })
            ),
          })
          .crud(),
      });

      expect(schema.models.Blog.fields.tags.fieldType).toBe('array');
      expect(schema.models.Blog.fields.comments.fieldType).toBe('array');
    });
  });

  describe('Relationship Patterns Compatibility', () => {
    it('should support one-to-many relationships', () => {
      const schema = defineSchema({
        User: a.model({ id: a.id(), name: a.string() }).crud(),
        Post: a
          .model({
            id: a.id(),
            authorId: a.ref('User').required(),
            title: a.string(),
          })
          .crud(),
      });

      expect(schema.models.Post.fields.authorId.fieldType).toBe('ref');
    });

    it('should support self-referencing relationships', () => {
      const schema = defineSchema({
        User: a
          .model({
            id: a.id(),
            managerId: a.ref('User'),
          })
          .crud(),
      });

      expect(schema.models.User.fields.managerId.fieldType).toBe('ref');
    });
  });
});
