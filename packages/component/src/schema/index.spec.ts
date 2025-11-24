/**
 * Integration Tests for Schema API
 *
 * End-to-end tests for the complete schema definition workflow:
 * - Full schema creation using all exports
 * - Type-safe model access
 * - Schema introspection
 * - Complex real-world scenarios
 * - API consistency and usability
 */

import { describe, it, expect } from 'vitest';
import {
  // Schema definition
  defineSchema,
  getModelNames,
  getCrudModelNames,
  getEventModelNames,
  getFunctionModelNames,
  getModel,
  hasModel,
  getSchemaMetadata,
  getSchemaStats,

  // Field builders
  a,

  // Model builders
  c,
  e,
  f,

  // Utilities
  processFields,
  processModels,
  extractModelNames,
  validateSchemaDefinition,
  isFieldBuilder,
  isCrudModel,
  isEventModel,
  isFunctionModel,

  // Constants
  SCHEMA_API_VERSION,
} from './index';

// ============================================================================
// Complete Schema API Integration
// ============================================================================

describe('Schema API Integration', () => {
  describe('complete schema workflow', () => {
    it('should support full schema definition from imports', () => {
      // This test verifies that all required exports work together
      const schema = defineSchema({
        schema: a.schema({
          // CRUD Model
          User: c
            .model({
              id: a.id(),
              email: a.string().required().email(),
              name: a.string().required(),
              role: a.enum(['admin', 'user', 'guest'] as const).default('user'),
              profile: a.object({
                bio: a.string(),
                avatarUrl: a.string().url(),
              }),
              tags: a.array(a.string()),
              metadata: a.json(),
              createdAt: a.datetime(),
            })
            .authorization((allow) => [allow.owner('id'), allow.groups(['admin']).all()])
            .indexes(['email', 'role'])
            .timestamps(true)
            .softDelete(true),

          // Event Model
          DataUploaded: e.model({
            datasetId: a.string().required(),
            fileUrl: a.string().url().required(),
            fileSize: a.number().required(),
            uploadedBy: a.string().required(),
            uploadedAt: a.datetime().required(),
          }),

          // Function Model
          GenerateReport: f
            .model({
              input: {
                datasetId: a.string().required(),
                format: a.enum(['pdf', 'excel', 'csv'] as const).default('pdf'),
                includeCharts: a.boolean().default(true),
                dateRange: a.object({
                  start: a.datetime().required(),
                  end: a.datetime().required(),
                }),
              },
              output: {
                reportUrl: a.string().url().required(),
                status: a.enum(['generating', 'completed', 'failed'] as const).required(),
                generatedAt: a.datetime().required(),
                fileSize: a.number(),
              },
            })
            .authorization((allow) => [allow.authenticated()]),
        }),
      });

      // Verify schema structure
      expect(schema).toBeDefined();
      expect(schema.models).toBeDefined();
      expect(schema._metadata).toBeDefined();

      // Verify all models are present
      expect(hasModel(schema, 'User')).toBe(true);
      expect(hasModel(schema, 'DataUploaded')).toBe(true);
      expect(hasModel(schema, 'GenerateReport')).toBe(true);

      // Verify categorization
      const stats = getSchemaStats(schema);
      expect(stats.crudModels).toBe(1);
      expect(stats.eventModels).toBe(1);
      expect(stats.functionModels).toBe(1);
      expect(stats.totalModels).toBe(3);
    });

    it('should provide type-safe model access', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({
            id: a.id(),
            email: a.string().required().email(),
          }),
        }),
      });

      // Access via schema.models
      const userModel = schema.models.User;
      expect(userModel).toBeDefined();
      expect(userModel.name).toBe('User');
      expect(userModel.config.type).toBe('crud');

      // Access via getModel utility
      const userModel2 = getModel(schema, 'User');
      expect(userModel2).toEqual(userModel);
    });

    it('should allow accessing original model definitions', () => {
      const UserModel = c.model({
        id: a.id(),
        email: a.string().required(),
      });

      const schema = defineSchema({
        schema: a.schema({
          User: UserModel,
        }),
      });

      // Original definition is accessible via schema.schema
      expect(schema.schema.User).toBeDefined();
      expect(schema.schema.User._config).toEqual(UserModel._config);
    });
  });

  describe('real-world schema examples', () => {
    it('should handle e-commerce schema', () => {
      const schema = defineSchema({
        schema: a.schema({
          // Products
          Product: c
            .model({
              id: a.id().prefix('prod'),
              name: a.string().required().minLength(1).maxLength(255),
              description: a.string(),
              price: a.number().required().min(0),
              category: a.string().required(),
              inStock: a.boolean().default(true),
              tags: a.array(a.string()),
              images: a.array(a.string().url()),
            })
            .indexes(['category', 'price'])
            .timestamps(true),

          // Orders
          Order: c
            .model({
              id: a.id().prefix('ord'),
              userId: a.string().required(),
              items: a.array(
                a.object({
                  productId: a.string().required(),
                  quantity: a.number().required().min(1),
                  price: a.number().required(),
                })
              ),
              total: a.number().required().min(0),
              status: a
                .enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const)
                .default('pending'),
              shippingAddress: a.object({
                street: a.string().required(),
                city: a.string().required(),
                state: a.string().required(),
                zipCode: a.string().required(),
                country: a.string().required(),
              }),
            })
            .authorization((allow) => [
              allow.owner('userId'),
              allow.groups(['admin', 'staff']).all(),
            ])
            .indexes(['userId', 'status'])
            .timestamps(true),

          // Events
          OrderPlaced: e.model({
            orderId: a.string().required(),
            userId: a.string().required(),
            total: a.number().required(),
            itemCount: a.number().required(),
          }),

          OrderShipped: e.model({
            orderId: a.string().required(),
            trackingNumber: a.string().required(),
            carrier: a.string().required(),
          }),

          // Functions
          CalculateShipping: f.model({
            input: {
              weight: a.number().required().min(0),
              destination: a.object({
                country: a.string().required(),
                zipCode: a.string().required(),
              }),
            },
            output: {
              cost: a.number().required(),
              estimatedDays: a.number().required(),
              carrier: a.string().required(),
            },
          }),

          ProcessRefund: f
            .model({
              input: {
                orderId: a.string().required(),
                amount: a.number().required().min(0),
                reason: a.string().required(),
              },
              output: {
                refundId: a.string().required(),
                status: a.enum(['pending', 'completed', 'failed'] as const).required(),
                processedAt: a.datetime().required(),
              },
            })
            .authorization((allow) => [allow.groups(['admin', 'support']).all()]),
        }),
      });

      // Verify schema stats
      const stats = getSchemaStats(schema);
      expect(stats.crudModels).toBe(2); // Product, Order
      expect(stats.eventModels).toBe(2); // OrderPlaced, OrderShipped
      expect(stats.functionModels).toBe(2); // CalculateShipping, ProcessRefund
      expect(stats.totalModels).toBe(6);

      // Verify model access
      expect(hasModel(schema, 'Product')).toBe(true);
      expect(hasModel(schema, 'Order')).toBe(true);
      expect(hasModel(schema, 'OrderPlaced')).toBe(true);
      expect(hasModel(schema, 'OrderShipped')).toBe(true);
      expect(hasModel(schema, 'CalculateShipping')).toBe(true);
      expect(hasModel(schema, 'ProcessRefund')).toBe(true);
    });

    it('should handle content management system schema', () => {
      const schema = defineSchema({
        schema: a.schema({
          Article: c
            .model({
              id: a.id(),
              title: a.string().required().minLength(1).maxLength(255),
              slug: a.string().required(),
              content: a.string().required(),
              excerpt: a.string(),
              authorId: a.string().required(),
              status: a.enum(['draft', 'published', 'archived'] as const).default('draft'),
              publishedAt: a.datetime(),
              tags: a.array(a.string()),
              metadata: a.json(),
            })
            .authorization((allow) => [
              allow.owner('authorId'),
              allow.groups(['editor', 'admin']).all(),
              allow.public(['read', 'list']),
            ])
            .indexes(['slug', 'authorId', 'status'])
            .timestamps(true)
            .softDelete(true),

          Comment: c
            .model({
              id: a.id(),
              articleId: a.string().required(),
              authorId: a.string().required(),
              content: a.string().required().maxLength(1000),
              status: a.enum(['pending', 'approved', 'rejected'] as const).default('pending'),
            })
            .authorization((allow) => [
              allow.owner('authorId'),
              allow.groups(['moderator', 'admin']).all(),
            ])
            .indexes(['articleId', 'status'])
            .timestamps(true)
            .softDelete(true),

          ArticlePublished: e.model({
            articleId: a.string().required(),
            title: a.string().required(),
            authorId: a.string().required(),
            publishedAt: a.datetime().required(),
          }),

          GenerateSitemap: f
            .model({
              input: {
                includeArchived: a.boolean().default(false),
              },
              output: {
                sitemapUrl: a.string().url().required(),
                articleCount: a.number().required(),
                generatedAt: a.datetime().required(),
              },
            })
            .authorization((allow) => [allow.groups(['admin']).all()]),
        }),
      });

      const stats = getSchemaStats(schema);
      expect(stats.totalModels).toBe(4);
      expect(stats.crudModels).toBe(2);
      expect(stats.eventModels).toBe(1);
      expect(stats.functionModels).toBe(1);
    });
  });

  describe('schema introspection', () => {
    it('should provide comprehensive model information', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c
            .model({
              id: a.id(),
              email: a.string().required().email(),
            })
            .indexes(['email']),

          UserCreated: e.model({
            userId: a.string().required(),
          }),
        }),
      });

      // Get all model names
      const allNames = getModelNames(schema);
      expect(allNames).toHaveLength(2);
      expect(allNames).toContain('User');
      expect(allNames).toContain('UserCreated');

      // Get categorized names
      const crudNames = getCrudModelNames(schema);
      const eventNames = getEventModelNames(schema);
      expect(crudNames).toEqual(['User']);
      expect(eventNames).toEqual(['UserCreated']);

      // Get specific models
      const userModel = getModel(schema, 'User');
      expect(userModel?.metadata.isCrud).toBe(true);

      const eventModel = getModel(schema, 'UserCreated');
      expect(eventModel?.metadata.isEvent).toBe(true);

      // Get metadata
      const metadata = getSchemaMetadata(schema);
      expect(metadata.version).toBe('1.0.0');
      expect(metadata.models.crud).toEqual(['User']);
      expect(metadata.models.events).toEqual(['UserCreated']);
    });

    it('should provide schema statistics', () => {
      const schema = defineSchema({
        schema: a.schema({
          Model1: c.model({ id: a.id() }),
          Model2: c.model({ id: a.id() }),
          Event1: e.model({ data: a.string() }),
          Func1: f.model({ input: {}, output: {} }),
        }),
      });

      const stats = getSchemaStats(schema);
      expect(stats.totalModels).toBe(4);
      expect(stats.crudModels).toBe(2);
      expect(stats.eventModels).toBe(1);
      expect(stats.functionModels).toBe(1);
      expect(stats.models.crud).toEqual(['Model1', 'Model2']);
      expect(stats.models.events).toEqual(['Event1']);
      expect(stats.models.functions).toEqual(['Func1']);
    });
  });

  describe('utility functions', () => {
    it('should process fields independently', () => {
      const fields = processFields({
        name: a.string().required(),
        age: a.number().min(0),
      });

      expect(fields.name.type).toBe('string');
      expect(fields.name.required).toBe(true);
      expect(fields.age.type).toBe('number');
    });

    it('should process models independently', () => {
      const models = processModels({
        User: c.model({ id: a.id() }),
        Event: e.model({ data: a.string() }),
      });

      expect(models.User.metadata.isCrud).toBe(true);
      expect(models.Event.metadata.isEvent).toBe(true);
    });

    it('should extract model names', () => {
      const models = processModels({
        User: c.model({ id: a.id() }),
        Post: c.model({ id: a.id() }),
        Event: e.model({ data: a.string() }),
      });

      const names = extractModelNames(models);
      expect(names.crud).toEqual(['User', 'Post']);
      expect(names.events).toEqual(['Event']);
    });

    it('should validate schema definitions', () => {
      expect(() => {
        validateSchemaDefinition({
          schema: { User: c.model({ id: a.id() }) },
        });
      }).not.toThrow();

      expect(() => {
        validateSchemaDefinition({ schema: {} });
      }).toThrow();
    });

    it('should provide type guards', () => {
      const field = a.string();
      const crudModel = c.model({ id: a.id() });
      const eventModel = e.model({ data: a.string() });
      const funcModel = f.model({ input: {}, output: {} });

      expect(isFieldBuilder(field)).toBe(true);
      expect(isCrudModel(crudModel)).toBe(true);
      expect(isEventModel(eventModel)).toBe(true);
      expect(isFunctionModel(funcModel)).toBe(true);

      // Cross-checks
      expect(isCrudModel(field)).toBe(false);
      expect(isFieldBuilder(crudModel)).toBe(false);
    });
  });

  describe('API version', () => {
    it('should export schema API version', () => {
      expect(SCHEMA_API_VERSION).toBe('2.0.0');
    });
  });

  describe('edge cases', () => {
    it('should handle schema with single model', () => {
      const schema = defineSchema({
        schema: a.schema({
          OnlyModel: c.model({ id: a.id() }),
        }),
      });

      expect(getModelNames(schema)).toHaveLength(1);
      expect(getSchemaStats(schema).totalModels).toBe(1);
    });

    it('should handle schema with many models of same type', () => {
      const models: Record<string, any> = {};
      for (let i = 0; i < 20; i++) {
        models[`Model${i}`] = c.model({ id: a.id() });
      }

      const schema = defineSchema({ schema: a.schema(models) });

      expect(getCrudModelNames(schema)).toHaveLength(20);
      expect(getEventModelNames(schema)).toHaveLength(0);
      expect(getFunctionModelNames(schema)).toHaveLength(0);
    });

    it('should handle models with complex configurations', () => {
      const schema = defineSchema({
        schema: a.schema({
          ComplexModel: c
            .model({
              id: a.id().prefix('cmplx'),
              nested: a.object({
                deep: a.object({
                  deeper: a.object({
                    value: a.string(),
                  }),
                }),
              }),
              matrix: a.array(a.array(a.array(a.number()))),
              enums: a.enum(['a', 'b', 'c', 'd', 'e'] as const),
            })
            .authorization((allow) => [
              allow.owner('id'),
              allow.groups(['admin']).all(),
              allow.authenticated(['read']),
              allow.public(['list']),
            ])
            .indexes(['id', 'nested'])
            .partitionKey('id')
            .timestamps(true)
            .softDelete(true),
        }),
      });

      const model = getModel(schema, 'ComplexModel');
      expect(model).toBeDefined();
      expect(model?.config.type).toBe('crud');

      if (model?.config.type === 'crud') {
        expect(model.config.authorization).toHaveLength(4);
        expect(model.config.indexes).toHaveLength(2);
        expect(model.config.timestamps).toBe(true);
        expect(model.config.softDelete).toBe(true);
      }
    });
  });

  describe('error scenarios', () => {
    it('should throw error for invalid schema definition', () => {
      expect(() => {
        defineSchema(null as any);
      }).toThrow('Schema definition is required');
    });

    it('should throw error for missing models', () => {
      expect(() => {
        defineSchema({ schema: {} });
      }).toThrow('Schema must contain at least one model');
    });

    it('should return undefined for non-existent model', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({ id: a.id() }),
        }),
      });

      expect(getModel(schema, 'NonExistent')).toBeUndefined();
      expect(hasModel(schema, 'NonExistent')).toBe(false);
    });
  });

  describe('API consistency', () => {
    it('should have consistent naming for CRUD operations', () => {
      // All CRUD-related functions should use "Crud" in name
      expect(getCrudModelNames).toBeDefined();
      expect(isCrudModel).toBeDefined();
    });

    it('should have consistent naming for event operations', () => {
      // All event-related functions should use "Event" in name
      expect(getEventModelNames).toBeDefined();
      expect(isEventModel).toBeDefined();
    });

    it('should have consistent naming for function operations', () => {
      // All function-related functions should use "Function" in name
      expect(getFunctionModelNames).toBeDefined();
      expect(isFunctionModel).toBeDefined();
    });

    it('should provide both singular and categorized access patterns', () => {
      const schema = defineSchema({
        schema: a.schema({
          User: c.model({ id: a.id() }),
        }),
      });

      // Singular access
      expect(getModel(schema, 'User')).toBeDefined();
      expect(hasModel(schema, 'User')).toBe(true);

      // Categorized access
      expect(getModelNames(schema)).toContain('User');
      expect(getCrudModelNames(schema)).toContain('User');
    });
  });
});
