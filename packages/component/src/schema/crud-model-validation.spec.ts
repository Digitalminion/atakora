/**
 * CRUD Model Validation Tests
 *
 * Tests for validation of CRUD model configurations including partition keys,
 * indexes, authorization field references, and other model-level validation rules.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { c, CrudModelBuilder } from './crud-model';
import { a } from './field-types';
import { RefValidationRegistry } from './ref-validation';

// ============================================================================
// Partition Key Validation
// ============================================================================

describe('CRUD Model Validation - Partition Key', () => {
  beforeEach(() => {
    // Reset ref validation registry for each test
    RefValidationRegistry.reset();
  });

  it('should throw error when partition key field does not exist', () => {
    expect(() => {
      c.model({
        id: a.id(),
        name: a.string().required(),
      })
        .partitionKey('nonExistentField')
        ._build();
    }).toThrow('Partition key field "nonExistentField" does not exist in model');
  });

  it('should suggest available fields when partition key is invalid', () => {
    expect(() => {
      c.model({
        id: a.id(),
        name: a.string(),
        email: a.string(),
      })
        .partitionKey('userId')
        ._build();
    }).toThrow(/Available fields: id, name, email/);
  });

  it('should allow valid partition key', () => {
    expect(() => {
      c.model({
        id: a.id(),
        tenantId: a.string().required(),
      })
        .partitionKey('tenantId')
        ._build();
    }).not.toThrow();
  });

  it('should use default partition key when not specified', () => {
    const model = c
      .model({
        id: a.id(),
        name: a.string(),
      })
      ._build();

    expect(model.partitionKey).toBe('id');
  });
});

// ============================================================================
// Index Field Validation
// ============================================================================

describe('CRUD Model Validation - Indexes', () => {
  it('should throw error when index field does not exist', () => {
    expect(() => {
      c.model({
        id: a.id(),
        name: a.string(),
      })
        .indexes(['email'])
        ._build();
    }).toThrow('Index field "email" does not exist in model');
  });

  it('should throw error for multiple non-existent index fields', () => {
    expect(() => {
      c.model({
        id: a.id(),
        name: a.string(),
      })
        .indexes(['email', 'phone', 'address'])
        ._build();
    }).toThrow('Index field "email" does not exist in model');
  });

  it('should allow valid index fields', () => {
    expect(() => {
      c.model({
        id: a.id(),
        email: a.string().email(),
        organizationId: a.string(),
      })
        .indexes(['email', 'organizationId'])
        ._build();
    }).not.toThrow();
  });

  it('should allow empty index array', () => {
    expect(() => {
      c.model({
        id: a.id(),
      })
        .indexes([])
        ._build();
    }).not.toThrow();
  });
});

// ============================================================================
// Authorization Field Validation
// ============================================================================

describe('CRUD Model Validation - Authorization', () => {
  it('should throw error when owner field does not exist', () => {
    expect(() => {
      c.model({
        id: a.id(),
        name: a.string(),
      })
        .authorization((allow) => [allow.owner('userId')])
        ._build();
    }).toThrow('Authorization owner field "userId" does not exist in model');
  });

  it('should suggest available fields for invalid owner field', () => {
    expect(() => {
      c.model({
        id: a.id(),
        name: a.string(),
        email: a.string(),
      })
        .authorization((allow) => [allow.owner('ownerId')])
        ._build();
    }).toThrow(/Available fields: id, name, email/);
  });

  it('should allow valid owner field', () => {
    expect(() => {
      c.model({
        id: a.id(),
        userId: a.string().required(),
      })
        .authorization((allow) => [allow.owner('userId')])
        ._build();
    }).not.toThrow();
  });

  it('should allow group-based authorization', () => {
    expect(() => {
      c.model({
        id: a.id(),
      })
        .authorization((allow) => [allow.groups(['admin', 'editor']).all()])
        ._build();
    }).not.toThrow();
  });

  it('should allow multiple authorization rules', () => {
    expect(() => {
      c.model({
        id: a.id(),
        ownerId: a.string(),
      })
        .authorization((allow) => [
          allow.owner('ownerId'),
          allow.groups(['admin']).all(),
          allow.authenticated(['read']),
          allow.public(['list']),
        ])
        ._build();
    }).not.toThrow();
  });
});

// ============================================================================
// Reserved Field Names
// ============================================================================

describe('CRUD Model Validation - Reserved Field Names', () => {
  it('should throw error for __typename field', () => {
    expect(() => {
      c.model({
        id: a.id(),
        __typename: a.string(),
      })._build();
    }).toThrow('Field name "__typename" is reserved');
  });

  it('should throw error for _id field', () => {
    expect(() => {
      c.model({
        _id: a.string(),
      })._build();
    }).toThrow('Field name "_id" is reserved');
  });

  it('should throw error for _etag field', () => {
    expect(() => {
      c.model({
        id: a.id(),
        _etag: a.string(),
      })._build();
    }).toThrow('Field name "_etag" is reserved');
  });

  it('should list all reserved names in error message', () => {
    expect(() => {
      c.model({
        __typename: a.string(),
      })._build();
    }).toThrow(/Reserved names: __typename, _id, _etag/);
  });
});

// ============================================================================
// Timestamp Field Validation
// ============================================================================

describe('CRUD Model Validation - Timestamps', () => {
  it('should warn when createdAt is not readonly with timestamps enabled', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    c.model({
      id: a.id(),
      createdAt: a.datetime(),
    })
      .timestamps(true)
      ._build();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('createdAt'));

    consoleSpy.mockRestore();
  });

  it('should not warn when createdAt is readonly', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    c.model({
      id: a.id(),
      createdAt: a.datetime().readOnly(),
    })
      .timestamps(true)
      ._build();

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should warn when updatedAt is not readonly with timestamps enabled', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    c.model({
      id: a.id(),
      updatedAt: a.datetime(),
    })
      .timestamps(true)
      ._build();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('updatedAt'));

    consoleSpy.mockRestore();
  });
});

// ============================================================================
// Complex Validation Scenarios
// ============================================================================

describe('CRUD Model Validation - Complex Scenarios', () => {
  it('should validate model with all features', () => {
    expect(() => {
      c.model({
        id: a.id().readOnly(),
        tenantId: a.string().required(),
        ownerId: a.string().required(),
        email: a.string().email().required(),
        name: a.string().required(),
        status: a.enum(['active', 'inactive'] as const).default('active'),
        createdAt: a.datetime().readOnly(),
        updatedAt: a.datetime().readOnly(),
      })
        .partitionKey('tenantId')
        .indexes(['email', 'status'])
        .authorization((allow) => [allow.owner('ownerId'), allow.groups(['admin']).all()])
        .timestamps(true)
        .softDelete(true)
        ._build();
    }).not.toThrow();
  });

  it('should validate model with ref fields', () => {
    expect(() => {
      c.model({
        id: a.id(),
        userId: a.ref('User').required(),
        projectId: a.ref('Project').nullable(),
        parentId: a.ref('Task').onDelete('cascade'),
      })._build();
    }).not.toThrow();
  });

  it('should validate model with computed fields', () => {
    expect(() => {
      c.model({
        id: a.id(),
        firstName: a.string().required(),
        lastName: a.string().required(),
        fullName: a.string().computed(() => ''),
        age: a.number().computed(() => 0),
      })._build();
    }).not.toThrow();
  });

  it('should catch multiple validation errors', () => {
    // This should fail on partition key validation first
    expect(() => {
      c.model({
        id: a.id(),
        name: a.string(),
      })
        .partitionKey('invalidField')
        .indexes(['anotherInvalid'])
        .authorization((allow) => [allow.owner('nonExistent')])
        ._build();
    }).toThrow('Partition key field "invalidField" does not exist');
  });
});

// ============================================================================
// Method Chaining Validation
// ============================================================================

describe('CRUD Model Validation - Method Chaining', () => {
  it('should validate after all chained methods', () => {
    expect(() => {
      c.model({
        id: a.id(),
        name: a.string(),
      })
        .timestamps(true)
        .softDelete(true)
        .partitionKey('invalidKey')
        ._build();
    }).toThrow('Partition key field "invalidKey" does not exist');
  });

  it('should handle multiple calls to same method', () => {
    const model = c
      .model({
        id: a.id(),
        field1: a.string(),
        field2: a.string(),
      })
      .partitionKey('field1')
      .partitionKey('field2') // Should override
      ._build();

    expect(model.partitionKey).toBe('field2');
  });

  it('should validate final state after overrides', () => {
    expect(() => {
      c.model({
        id: a.id(),
        validField: a.string(),
      })
        .partitionKey('validField') // Valid
        .partitionKey('invalidField') // Invalid, should fail
        ._build();
    }).toThrow('Partition key field "invalidField" does not exist');
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('CRUD Model Validation - Edge Cases', () => {
  it('should handle empty model', () => {
    expect(() => {
      c.model({})._build();
    }).not.toThrow();
  });

  it('should handle model with only computed fields', () => {
    expect(() => {
      c.model({
        computed1: a.string().computed(() => 'value1'),
        computed2: a.number().computed(() => 42),
      })._build();
    }).not.toThrow();
  });

  it('should handle model with only readonly fields', () => {
    expect(() => {
      c.model({
        id: a.id().readOnly(),
        createdAt: a.datetime().readOnly(),
        systemField: a.string().readOnly(),
      })._build();
    }).not.toThrow();
  });

  it('should validate deeply nested object fields', () => {
    expect(() => {
      c.model({
        id: a.id(),
        profile: a.object({
          personal: a.object({
            name: a.string().required(),
            age: a.number().min(0).max(120),
          }),
          contact: a.object({
            email: a.string().email(),
            phone: a.string(),
          }),
        }),
      })._build();
    }).not.toThrow();
  });

  it('should handle field names with special characters', () => {
    expect(() => {
      c.model({
        id: a.id(),
        'user-name': a.string(),
        'email.address': a.string(),
        field_with_underscore: a.string(),
      })
        .indexes(['user-name', 'email.address'])
        ._build();
    }).not.toThrow();
  });
});
