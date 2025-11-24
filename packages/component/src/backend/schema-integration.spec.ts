/**
 * Tests for Schema Integration System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defineSchema, a, c, e, f } from '../schema';
import { defineBackend } from './define-backend';
import {
  isSchemaObject,
  hasSchemaIntegration,
  validateSchemaStructure,
  integrateSchema,
  getModel,
  hasModel,
  getModelNames,
  getModelsByType,
  getModelCounts,
  getOriginalSchema,
  getSchemaMetadata,
  createModelAccessor,
  categorizeModels,
} from './schema-integration';

// ============================================================================
// Test Fixtures
// ============================================================================

const createTestSchema = () => {
  return defineSchema({
    schema: a.schema({
      User: c.model({
        id: a.id(),
        email: a.string().required().email(),
        name: a.string().required(),
      }),

      Post: c.model({
        id: a.id(),
        title: a.string().required(),
        content: a.string().required(),
      }),

      UserCreated: e.model({
        userId: a.string().required(),
        timestamp: a.datetime().required(),
      }),

      PostPublished: e.model({
        postId: a.string().required(),
        timestamp: a.datetime().required(),
      }),

      GenerateReport: f.model({
        input: {
          userId: a.string().required(),
        },
        output: {
          reportUrl: a.string().required(),
        },
      }),
    }),
  });
};

const createTestBackend = () => {
  const schema = createTestSchema();
  return defineBackend({
    schema,
    settings: {
      name: 'test-backend',
    },
  });
};

// ============================================================================
// Type Guards
// ============================================================================

describe('isSchemaObject', () => {
  it('should return true for valid schema object', () => {
    const schema = createTestSchema();
    expect(isSchemaObject(schema)).toBe(true);
  });

  it('should return false for null', () => {
    expect(isSchemaObject(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isSchemaObject(undefined)).toBe(false);
  });

  it('should return false for plain object', () => {
    expect(isSchemaObject({})).toBe(false);
  });

  it('should return false for object missing schema', () => {
    expect(isSchemaObject({ models: {}, _metadata: { version: '1.0.0' } })).toBe(false);
  });

  it('should return false for object missing models', () => {
    expect(isSchemaObject({ schema: {}, _metadata: { version: '1.0.0' } })).toBe(false);
  });

  it('should return false for object missing metadata', () => {
    expect(isSchemaObject({ schema: {}, models: {} })).toBe(false);
  });
});

describe('hasSchemaIntegration', () => {
  it('should return true for backend with valid schema', () => {
    const backend = createTestBackend();
    expect(hasSchemaIntegration(backend)).toBe(true);
  });

  it('should validate schema structure', () => {
    const backend = createTestBackend();
    expect(backend.schema).toBeDefined();
    expect(backend.schema.models).toBeDefined();
    expect(backend.schema._metadata).toBeDefined();
  });
});

// ============================================================================
// Schema Validation
// ============================================================================

describe('validateSchemaStructure', () => {
  it('should validate valid schema without errors', () => {
    const schema = createTestSchema();
    expect(() => validateSchemaStructure(schema)).not.toThrow();
  });

  it('should throw if schema is null', () => {
    expect(() => validateSchemaStructure(null as any)).toThrow('Schema is required');
  });

  it('should throw if schema is undefined', () => {
    expect(() => validateSchemaStructure(undefined as any)).toThrow('Schema is required');
  });

  it('should throw if schema has invalid structure', () => {
    expect(() => validateSchemaStructure({} as any)).toThrow('Invalid schema object structure');
  });

  it('should throw if schema has no models', () => {
    const invalidSchema = {
      schema: {},
      models: {},
      _metadata: {
        version: '1.0.0',
        createdAt: '',
        models: { crud: [], events: [], functions: [] },
      },
    };
    expect(() => validateSchemaStructure(invalidSchema as any)).toThrow(
      'Schema must have at least one model defined'
    );
  });

  it('should throw if model name is invalid', () => {
    // Schema system validates model names during defineSchema()
    // so we need to test with an already-invalid schema object
    expect(() =>
      defineSchema({
        schema: a.schema({
          'invalid-name': c.model({
            id: a.id(),
          }),
        }),
      })
    ).toThrow('must start with');
  });

  it('should throw if model has invalid configuration', () => {
    const invalidSchema = {
      schema: {},
      models: {
        User: { config: null },
      },
      _metadata: { version: '1.0.0' },
    };
    expect(() => validateSchemaStructure(invalidSchema as any)).toThrow(
      'missing configuration or type'
    );
  });

  it('should throw if model has invalid type', () => {
    const invalidSchema = {
      schema: {},
      models: {
        User: {
          name: 'User',
          config: { type: 'invalid' },
          metadata: { isCrud: false, isEvent: false, isFunction: false },
        },
      },
      _metadata: { version: '1.0.0' },
    };
    expect(() => validateSchemaStructure(invalidSchema as any)).toThrow('invalid type');
  });
});

// ============================================================================
// Schema Integration
// ============================================================================

describe('integrateSchema', () => {
  it('should integrate schema with backend', () => {
    const schema = createTestSchema();
    const backend = createTestBackend();

    expect(() => integrateSchema(schema, backend)).not.toThrow();
  });

  it('should throw if backend is null', () => {
    const schema = createTestSchema();
    expect(() => integrateSchema(schema, null as any)).toThrow('Backend object is required');
  });

  it('should validate schema during integration', () => {
    const invalidSchema = {} as any;
    const backend = createTestBackend();

    expect(() => integrateSchema(invalidSchema, backend)).toThrow();
  });
});

// ============================================================================
// Model Access Helpers
// ============================================================================

describe('getModel', () => {
  it('should retrieve existing model', () => {
    const backend = createTestBackend();
    const userModel = getModel(backend, 'User');

    expect(userModel).toBeDefined();
    expect(userModel.name).toBe('User');
    expect(userModel.config.type).toBe('crud');
  });

  it('should retrieve event model', () => {
    const backend = createTestBackend();
    const eventModel = getModel(backend, 'UserCreated');

    expect(eventModel).toBeDefined();
    expect(eventModel.name).toBe('UserCreated');
    expect(eventModel.config.type).toBe('event');
  });

  it('should retrieve function model', () => {
    const backend = createTestBackend();
    const functionModel = getModel(backend, 'GenerateReport');

    expect(functionModel).toBeDefined();
    expect(functionModel.name).toBe('GenerateReport');
    expect(functionModel.config.type).toBe('function');
  });

  it('should throw for non-existent model', () => {
    const backend = createTestBackend();
    expect(() => getModel(backend, 'NonExistent' as any)).toThrow('Model "NonExistent" not found');
  });

  it('should list available models in error', () => {
    const backend = createTestBackend();
    expect(() => getModel(backend, 'NonExistent' as any)).toThrow('Available models:');
  });
});

describe('hasModel', () => {
  it('should return true for existing model', () => {
    const backend = createTestBackend();
    expect(hasModel(backend, 'User')).toBe(true);
  });

  it('should return true for event model', () => {
    const backend = createTestBackend();
    expect(hasModel(backend, 'UserCreated')).toBe(true);
  });

  it('should return true for function model', () => {
    const backend = createTestBackend();
    expect(hasModel(backend, 'GenerateReport')).toBe(true);
  });

  it('should return false for non-existent model', () => {
    const backend = createTestBackend();
    expect(hasModel(backend, 'NonExistent')).toBe(false);
  });
});

describe('getModelNames', () => {
  it('should return all model names', () => {
    const backend = createTestBackend();
    const names = getModelNames(backend);

    expect(names).toContain('User');
    expect(names).toContain('Post');
    expect(names).toContain('UserCreated');
    expect(names).toContain('PostPublished');
    expect(names).toContain('GenerateReport');
    expect(names).toHaveLength(5);
  });

  it('should return empty array for backend without schema', () => {
    const backend = createTestBackend();
    // Manually break schema integration
    (backend as any).schema = null;

    const names = getModelNames(backend);
    expect(names).toEqual([]);
  });
});

describe('getModelsByType', () => {
  it('should return CRUD models', () => {
    const backend = createTestBackend();
    const crudModels = getModelsByType(backend, 'crud');

    expect(crudModels).toContain('User');
    expect(crudModels).toContain('Post');
    expect(crudModels).toHaveLength(2);
  });

  it('should return event models', () => {
    const backend = createTestBackend();
    const eventModels = getModelsByType(backend, 'event');

    expect(eventModels).toContain('UserCreated');
    expect(eventModels).toContain('PostPublished');
    expect(eventModels).toHaveLength(2);
  });

  it('should return function models', () => {
    const backend = createTestBackend();
    const functionModels = getModelsByType(backend, 'function');

    expect(functionModels).toContain('GenerateReport');
    expect(functionModels).toHaveLength(1);
  });

  it('should return empty array for backend without schema', () => {
    const backend = createTestBackend();
    (backend as any).schema = null;

    const models = getModelsByType(backend, 'crud');
    expect(models).toEqual([]);
  });
});

describe('getModelCounts', () => {
  it('should return correct counts for all model types', () => {
    const backend = createTestBackend();
    const counts = getModelCounts(backend);

    expect(counts.crud).toBe(2);
    expect(counts.event).toBe(2);
    expect(counts.function).toBe(1);
  });

  it('should return zero counts for backend without schema', () => {
    const backend = createTestBackend();
    (backend as any).schema = null;

    const counts = getModelCounts(backend);
    expect(counts).toEqual({ crud: 0, event: 0, function: 0 });
  });

  it('should handle schema with only CRUD models', () => {
    const schema = defineSchema({
      schema: a.schema({
        User: c.model({ id: a.id() }),
        Post: c.model({ id: a.id() }),
      }),
    });

    const backend = defineBackend({
      schema,
      settings: { name: 'crud-only' },
    });

    const counts = getModelCounts(backend);
    expect(counts.crud).toBe(2);
    expect(counts.event).toBe(0);
    expect(counts.function).toBe(0);
  });
});

describe('getOriginalSchema', () => {
  it('should return original schema definition', () => {
    const backend = createTestBackend();
    const original = getOriginalSchema(backend);

    expect(original).toBeDefined();
    expect(original.User).toBeDefined();
    expect(original.Post).toBeDefined();
  });

  it('should preserve schema structure', () => {
    const backend = createTestBackend();
    const original = getOriginalSchema(backend);

    // Original schema should match what we put in
    expect(Object.keys(original)).toContain('User');
    expect(Object.keys(original)).toContain('Post');
  });

  it('should throw for backend without schema', () => {
    const backend = createTestBackend();
    (backend as any).schema = null;

    expect(() => getOriginalSchema(backend)).toThrow(
      'Backend does not have valid schema integration'
    );
  });
});

describe('getSchemaMetadata', () => {
  it('should return schema metadata', () => {
    const backend = createTestBackend();
    const metadata = getSchemaMetadata(backend);

    expect(metadata).toBeDefined();
    expect(metadata.version).toBeDefined();
    expect(metadata.models).toBeDefined();
  });

  it('should include categorized model lists', () => {
    const backend = createTestBackend();
    const metadata = getSchemaMetadata(backend);

    expect(metadata.models.crud).toContain('User');
    expect(metadata.models.crud).toContain('Post');
    expect(metadata.models.events).toContain('UserCreated');
    expect(metadata.models.events).toContain('PostPublished');
    expect(metadata.models.functions).toContain('GenerateReport');
  });

  it('should throw for backend without schema', () => {
    const backend = createTestBackend();
    (backend as any).schema = null;

    expect(() => getSchemaMetadata(backend)).toThrow(
      'Backend does not have valid schema integration'
    );
  });
});

// ============================================================================
// Type-Safe Model Access
// ============================================================================

describe('createModelAccessor', () => {
  it('should create accessor function', () => {
    const backend = createTestBackend();
    const models = createModelAccessor(backend);

    const userModel = models('User');
    expect(userModel.name).toBe('User');
    expect(userModel.config.type).toBe('crud');
  });

  it('should work with event models', () => {
    const backend = createTestBackend();
    const models = createModelAccessor(backend);

    const eventModel = models('UserCreated');
    expect(eventModel.name).toBe('UserCreated');
    expect(eventModel.config.type).toBe('event');
  });

  it('should work with function models', () => {
    const backend = createTestBackend();
    const models = createModelAccessor(backend);

    const functionModel = models('GenerateReport');
    expect(functionModel.name).toBe('GenerateReport');
    expect(functionModel.config.type).toBe('function');
  });

  it('should throw for non-existent model', () => {
    const backend = createTestBackend();
    const models = createModelAccessor(backend);

    expect(() => models('NonExistent' as any)).toThrow();
  });
});

describe('categorizeModels', () => {
  it('should categorize all models', () => {
    const backend = createTestBackend();
    const categorized = categorizeModels(backend);

    expect(categorized.crud).toContain('User');
    expect(categorized.crud).toContain('Post');
    expect(categorized.events).toContain('UserCreated');
    expect(categorized.events).toContain('PostPublished');
    expect(categorized.functions).toContain('GenerateReport');
  });

  it('should return correct counts', () => {
    const backend = createTestBackend();
    const categorized = categorizeModels(backend);

    expect(categorized.crud).toHaveLength(2);
    expect(categorized.events).toHaveLength(2);
    expect(categorized.functions).toHaveLength(1);
  });

  it('should return empty arrays for backend without schema', () => {
    const backend = createTestBackend();
    (backend as any).schema = null;

    const categorized = categorizeModels(backend);
    expect(categorized).toEqual({ crud: [], events: [], functions: [] });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Schema Integration - Full Flow', () => {
  it('should maintain type inference through backend', () => {
    const backend = createTestBackend();

    // Schema should be accessible
    expect(backend.schema).toBeDefined();

    // Models should be accessible
    expect(backend.schema.models.User).toBeDefined();
    expect(backend.schema.models.Post).toBeDefined();

    // Type should be preserved
    expect(backend.schema.models.User.config.type).toBe('crud');
  });

  it('should provide multiple ways to access models', () => {
    const backend = createTestBackend();

    // Direct access
    const userDirect = backend.schema.models.User;

    // Via helper
    const userHelper = getModel(backend, 'User');

    // Via accessor
    const models = createModelAccessor(backend);
    const userAccessor = models('User');

    // All should be the same
    expect(userDirect).toBe(userHelper);
    expect(userHelper).toBe(userAccessor);
  });

  it('should support safe existence checks', () => {
    const backend = createTestBackend();

    if (hasModel(backend, 'User')) {
      const model = getModel(backend, 'User');
      expect(model.name).toBe('User');
    }

    if (!hasModel(backend, 'NonExistent')) {
      // This should execute
      expect(true).toBe(true);
    }
  });

  it('should provide metadata access', () => {
    const backend = createTestBackend();

    const metadata = getSchemaMetadata(backend);
    const counts = getModelCounts(backend);
    const categorized = categorizeModels(backend);

    expect(metadata.models.crud.length).toBe(counts.crud);
    expect(metadata.models.events.length).toBe(counts.event);
    expect(metadata.models.functions.length).toBe(counts.function);

    expect(categorized.crud).toEqual(metadata.models.crud);
    expect(categorized.events).toEqual(metadata.models.events);
    expect(categorized.functions).toEqual(metadata.models.functions);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Schema Integration - Edge Cases', () => {
  it('should handle schema with single model', () => {
    const schema = defineSchema({
      schema: a.schema({
        User: c.model({ id: a.id() }),
      }),
    });

    const backend = defineBackend({
      schema,
      settings: { name: 'single-model' },
    });

    expect(getModelNames(backend)).toEqual(['User']);
    expect(getModelCounts(backend)).toEqual({ crud: 1, event: 0, function: 0 });
  });

  it('should handle schema with many models', () => {
    const schema = defineSchema({
      schema: a.schema({
        Model1: c.model({ id: a.id() }),
        Model2: c.model({ id: a.id() }),
        Model3: c.model({ id: a.id() }),
        Event1: e.model({ data: a.string() }),
        Event2: e.model({ data: a.string() }),
        Func1: f.model({ input: {}, output: {} }),
      }),
    });

    const backend = defineBackend({
      schema,
      settings: { name: 'many-models' },
    });

    expect(getModelNames(backend)).toHaveLength(6);
    expect(getModelCounts(backend)).toEqual({ crud: 3, event: 2, function: 1 });
  });

  it('should preserve original schema reference', () => {
    const schema = createTestSchema();
    const backend = defineBackend({
      schema,
      settings: { name: 'preserve-ref' },
    });

    expect(backend.schema.models).toBe(schema.models);
    expect(backend.schema.schema).toBe(schema.schema);
    expect(getOriginalSchema(backend)).toBe(schema.schema);
  });
});
