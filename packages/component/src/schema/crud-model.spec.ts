/**
 * CRUD Model Builder Tests
 *
 * Comprehensive tests for CRUD model creation, configuration, and validation.
 */

import { describe, it, expect } from 'vitest';
import { c, CrudModelBuilder } from './crud-model';
import { a } from './field-types';
import type { CrudModelConfig } from './types';

// ============================================================================
// Basic CRUD Model Creation
// ============================================================================

describe('CrudModelBuilder - Basic Creation', () => {
  it('should create a CRUD model with basic fields', () => {
    const User = c.model({
      id: a.id(),
      name: a.string().required(),
      email: a.string().required().email(),
    });

    expect(User).toBeInstanceOf(CrudModelBuilder);
    expect(User._config.type).toBe('crud');
    expect(User._config.fields).toBeDefined();
  });

  it('should process field configurations correctly', () => {
    const User = c.model({
      id: a.id(),
      name: a.string().required(),
      age: a.number().min(0).max(120),
    });

    const config = User._build();

    expect(config.fields.id.type).toBe('id');
    expect(config.fields.name.type).toBe('string');
    expect(config.fields.name.required).toBe(true);
    expect(config.fields.age.type).toBe('number');
    expect(config.fields.age.min).toBe(0);
    expect(config.fields.age.max).toBe(120);
  });

  it('should handle models with no fields', () => {
    const Empty = c.model({});

    const config = Empty._build();
    expect(config.fields).toEqual({});
  });

  it('should handle models with complex field types', () => {
    const Product = c.model({
      id: a.id(),
      name: a.string().required(),
      tags: a.array(a.string()),
      metadata: a.json(),
      createdAt: a.datetime().required(),
      status: a.enum(['active', 'inactive']).default('active'),
    });

    const config = Product._build();

    expect(config.fields.tags.type).toBe('array');
    expect(config.fields.metadata.type).toBe('json');
    expect(config.fields.createdAt.type).toBe('datetime');
    expect(config.fields.status.type).toBe('enum');
    expect(config.fields.status.default).toBe('active');
  });
});

// ============================================================================
// Authorization Configuration
// ============================================================================

describe('CrudModelBuilder - Authorization', () => {
  it('should configure owner-based authorization', () => {
    const Post = c
      .model({
        id: a.id(),
        authorId: a.string().required(),
        title: a.string().required(),
      })
      .authorization((allow) => [allow.owner('authorId')]);

    const config = Post._build();

    expect(config.authorization).toHaveLength(1);
    expect(config.authorization[0].type).toBe('owner');
    expect(config.authorization[0].field).toBe('authorId');
  });

  it('should configure group-based authorization', () => {
    const Document = c
      .model({
        id: a.id(),
        content: a.string(),
      })
      .authorization((allow) => [allow.groups(['admin', 'editor']).all()]);

    const config = Document._build();

    expect(config.authorization).toHaveLength(1);
    expect(config.authorization[0].type).toBe('groups');
    expect(config.authorization[0].groups).toEqual(['admin', 'editor']);
  });

  it('should configure authenticated authorization', () => {
    const Profile = c
      .model({
        id: a.id(),
        bio: a.string(),
      })
      .authorization((allow) => [allow.authenticated(['read'])]);

    const config = Profile._build();

    expect(config.authorization).toHaveLength(1);
    expect(config.authorization[0].type).toBe('authenticated');
    expect(config.authorization[0].operations).toEqual(['read']);
  });

  it('should configure public authorization', () => {
    const Article = c
      .model({
        id: a.id(),
        title: a.string(),
      })
      .authorization((allow) => [allow.public(['read', 'list'])]);

    const config = Article._build();

    expect(config.authorization).toHaveLength(1);
    expect(config.authorization[0].type).toBe('public');
    expect(config.authorization[0].operations).toEqual(['read', 'list']);
  });

  it('should support multiple authorization rules', () => {
    const Document = c
      .model({
        id: a.id(),
        ownerId: a.string().required(),
        content: a.string(),
      })
      .authorization((allow) => [
        allow.owner('ownerId'),
        allow.groups(['admin']).all(),
        allow.authenticated(['read']),
      ]);

    const config = Document._build();

    expect(config.authorization).toHaveLength(3);
    expect(config.authorization[0].type).toBe('owner');
    expect(config.authorization[1].type).toBe('groups');
    expect(config.authorization[2].type).toBe('authenticated');
  });

  it('should default to empty authorization rules', () => {
    const Model = c.model({
      id: a.id(),
    });

    const config = Model._build();
    expect(config.authorization).toEqual([]);
  });
});

// ============================================================================
// Index Configuration
// ============================================================================

describe('CrudModelBuilder - Indexes', () => {
  it('should configure database indexes', () => {
    const User = c
      .model({
        id: a.id(),
        email: a.string().required(),
        organizationId: a.string().required(),
      })
      .indexes(['email', 'organizationId']);

    const config = User._build();

    expect(config.indexes).toEqual(['email', 'organizationId']);
  });

  it('should default to empty indexes', () => {
    const Model = c.model({
      id: a.id(),
    });

    const config = Model._build();
    expect(config.indexes).toEqual([]);
  });

  it('should allow single index', () => {
    const User = c
      .model({
        id: a.id(),
        email: a.string().required(),
      })
      .indexes(['email']);

    const config = User._build();
    expect(config.indexes).toEqual(['email']);
  });

  it('should allow empty array of indexes', () => {
    const User = c
      .model({
        id: a.id(),
      })
      .indexes([]);

    const config = User._build();
    expect(config.indexes).toEqual([]);
  });
});

// ============================================================================
// Partition Key Configuration
// ============================================================================

describe('CrudModelBuilder - Partition Key', () => {
  it('should default partition key to "id"', () => {
    const Model = c.model({
      id: a.id(),
    });

    const config = Model._build();
    expect(config.partitionKey).toBe('id');
  });

  it('should allow custom partition key', () => {
    const TenantData = c
      .model({
        id: a.id(),
        tenantId: a.string().required(),
        data: a.string(),
      })
      .partitionKey('tenantId');

    const config = TenantData._build();
    expect(config.partitionKey).toBe('tenantId');
  });

  it('should override partition key when called multiple times', () => {
    const Model = c
      .model({
        id: a.id(),
        field1: a.string(),
        field2: a.string(),
      })
      .partitionKey('field1')
      .partitionKey('field2');

    const config = Model._build();
    expect(config.partitionKey).toBe('field2');
  });
});

// ============================================================================
// Timestamps Configuration
// ============================================================================

describe('CrudModelBuilder - Timestamps', () => {
  it('should default timestamps to false', () => {
    const Model = c.model({
      id: a.id(),
    });

    const config = Model._build();
    expect(config.timestamps).toBe(false);
  });

  it('should enable timestamps', () => {
    const Model = c
      .model({
        id: a.id(),
      })
      .timestamps(true);

    const config = Model._build();
    expect(config.timestamps).toBe(true);
  });

  it('should disable timestamps explicitly', () => {
    const Model = c
      .model({
        id: a.id(),
      })
      .timestamps(true)
      .timestamps(false);

    const config = Model._build();
    expect(config.timestamps).toBe(false);
  });
});

// ============================================================================
// Soft Delete Configuration
// ============================================================================

describe('CrudModelBuilder - Soft Delete', () => {
  it('should default soft delete to false', () => {
    const Model = c.model({
      id: a.id(),
    });

    const config = Model._build();
    expect(config.softDelete).toBe(false);
  });

  it('should enable soft delete', () => {
    const Model = c
      .model({
        id: a.id(),
      })
      .softDelete(true);

    const config = Model._build();
    expect(config.softDelete).toBe(true);
  });

  it('should disable soft delete explicitly', () => {
    const Model = c
      .model({
        id: a.id(),
      })
      .softDelete(true)
      .softDelete(false);

    const config = Model._build();
    expect(config.softDelete).toBe(false);
  });
});

// ============================================================================
// Method Chaining
// ============================================================================

describe('CrudModelBuilder - Method Chaining', () => {
  it('should support fluent API chaining', () => {
    const Model = c
      .model({
        id: a.id(),
        ownerId: a.string().required(),
        organizationId: a.string().required(),
        email: a.string().email(),
      })
      .authorization((allow) => [allow.owner('ownerId')])
      .indexes(['email', 'organizationId'])
      .partitionKey('organizationId')
      .timestamps(true)
      .softDelete(true);

    const config = Model._build();

    expect(config.authorization).toHaveLength(1);
    expect(config.indexes).toEqual(['email', 'organizationId']);
    expect(config.partitionKey).toBe('organizationId');
    expect(config.timestamps).toBe(true);
    expect(config.softDelete).toBe(true);
  });

  it('should return same instance for chaining', () => {
    const initial = c.model({ id: a.id() });
    const afterAuth = initial.authorization((allow) => [allow.authenticated()]);
    const afterIndexes = afterAuth.indexes(['id']);

    expect(afterAuth).toBe(initial);
    expect(afterIndexes).toBe(initial);
  });
});

// ============================================================================
// Auto-Generation Specifications
// ============================================================================

describe('CrudModelBuilder - Auto-Generation Specs', () => {
  it('should specify CRUD type for code generation', () => {
    const User = c.model({
      id: a.id(),
      name: a.string().required(),
    });

    const config = User._build();
    expect(config.type).toBe('crud');
  });

  it('should preserve all configuration for generation', () => {
    const User = c
      .model({
        id: a.id(),
        email: a.string().required().email(),
        ownerId: a.string().required(),
      })
      .authorization((allow) => [allow.owner('ownerId')])
      .indexes(['email'])
      .partitionKey('ownerId')
      .timestamps(true)
      .softDelete(true);

    const config = User._build();

    // Verify all configuration is preserved for code generation
    expect(config).toMatchObject({
      type: 'crud',
      authorization: expect.any(Array),
      indexes: ['email'],
      partitionKey: 'ownerId',
      timestamps: true,
      softDelete: true,
    });
  });
});

// ============================================================================
// Complex Scenarios
// ============================================================================

describe('CrudModelBuilder - Complex Scenarios', () => {
  it('should handle complete e-commerce product model', () => {
    const Product = c
      .model({
        id: a.id(),
        sku: a.string().required(),
        name: a.string().required(),
        description: a.string(),
        price: a.number().min(0).required(),
        stock: a.number().integer().min(0).default(0),
        categoryId: a.string().required(),
        tags: a.array(a.string()).default([]),
        images: a.array(a.string().url()).default([]),
        metadata: a.json(),
        isActive: a.boolean().default(true),
        createdAt: a.datetime(),
        updatedAt: a.datetime(),
      })
      .authorization((allow) => [
        allow.groups(['admin', 'product-manager']).all(),
        allow.authenticated(['read', 'list']),
      ])
      .indexes(['sku', 'categoryId', 'isActive'])
      .partitionKey('categoryId')
      .timestamps(true)
      .softDelete(true);

    const config = Product._build();

    expect(config.type).toBe('crud');
    expect(Object.keys(config.fields)).toHaveLength(13);
    expect(config.authorization).toHaveLength(2);
    expect(config.indexes).toEqual(['sku', 'categoryId', 'isActive']);
    expect(config.partitionKey).toBe('categoryId');
    expect(config.timestamps).toBe(true);
    expect(config.softDelete).toBe(true);
  });

  it('should handle multi-tenant user model', () => {
    const User = c
      .model({
        id: a.id(),
        tenantId: a.string().required(),
        email: a.string().required().email(),
        firstName: a.string().required(),
        lastName: a.string().required(),
        role: a.enum(['user', 'admin', 'super-admin']).default('user'),
        isActive: a.boolean().default(true),
        lastLoginAt: a.datetime(),
      })
      .authorization((allow) => [allow.owner('id'), allow.groups(['tenant-admin']).all()])
      .indexes(['email', 'tenantId'])
      .partitionKey('tenantId')
      .timestamps(true);

    const config = User._build();

    expect(config.partitionKey).toBe('tenantId');
    expect(config.indexes).toContain('tenantId');
    expect(config.authorization[0].type).toBe('owner');
    expect(config.authorization[1].type).toBe('groups');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('CrudModelBuilder - Edge Cases', () => {
  it('should handle model with only id field', () => {
    const Minimal = c.model({
      id: a.id(),
    });

    const config = Minimal._build();
    expect(Object.keys(config.fields)).toHaveLength(1);
    expect(config.fields.id.type).toBe('id');
  });

  it('should handle models with nested objects', () => {
    const User = c.model({
      id: a.id(),
      profile: a.object({
        firstName: a.string().required(),
        lastName: a.string().required(),
        age: a.number().min(0),
      }),
    });

    const config = User._build();
    expect(config.fields.profile.type).toBe('object');
  });

  it('should handle models with binary fields', () => {
    const Document = c.model({
      id: a.id(),
      file: a.binary().maxSize(5 * 1024 * 1024), // 5MB
    });

    const config = Document._build();
    expect(config.fields.file.type).toBe('binary');
    expect(config.fields.file.maxSizeBytes).toBe(5 * 1024 * 1024);
  });

  it('should build independent configurations', () => {
    const Model1 = c.model({ id: a.id() }).timestamps(true);
    const Model2 = c.model({ id: a.id() }).timestamps(false);

    const config1 = Model1._build();
    const config2 = Model2._build();

    expect(config1.timestamps).toBe(true);
    expect(config2.timestamps).toBe(false);
  });

  it('should not mutate original configuration on build', () => {
    const Model = c.model({ id: a.id() }).authorization((allow) => [allow.authenticated()]);

    const config1 = Model._build();
    const config2 = Model._build();

    expect(config1).not.toBe(config2);
    expect(config1).toEqual(config2);
  });
});

// ============================================================================
// Type Safety (Compile-time checks)
// ============================================================================

describe('CrudModelBuilder - Type Inference', () => {
  it('should infer correct config type', () => {
    const User = c.model({
      id: a.id(),
      name: a.string().required(),
    });

    const config: CrudModelConfig = User._build();
    expect(config.type).toBe('crud');
  });

  it('should expose readonly _config property', () => {
    const User = c.model({
      id: a.id(),
    });

    expect(User._config).toBeDefined();
    expect(User._config.type).toBe('crud');
    expect(User._config.fields).toBeDefined();
  });
});
