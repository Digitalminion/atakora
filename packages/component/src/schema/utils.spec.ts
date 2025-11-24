/**
 * Tests for Schema Utility Functions
 *
 * Comprehensive test coverage for:
 * - Field processing
 * - Model processing
 * - Model categorization
 * - Schema validation
 * - Type guards
 */

import { describe, it, expect } from 'vitest';
import {
  processFields,
  processModels,
  extractModelNames,
  validateSchemaDefinition,
  isFieldBuilder,
  isCrudModel,
  isEventModel,
  isFunctionModel,
} from './utils';
import { a } from './field-types';
import { c } from './crud-model';
import { e } from './event-model';
import { f } from './function-model';

// ============================================================================
// processFields() Tests
// ============================================================================

describe('processFields()', () => {
  describe('basic field processing', () => {
    it('should process string field', () => {
      const fields = processFields({
        name: a.string().required(),
      });

      expect(fields.name).toBeDefined();
      expect(fields.name.type).toBe('string');
      expect(fields.name.required).toBe(true);
    });

    it('should process number field', () => {
      const fields = processFields({
        age: a.number().min(0).max(120),
      });

      expect(fields.age).toBeDefined();
      expect(fields.age.type).toBe('number');
      expect(fields.age.min).toBe(0);
      expect(fields.age.max).toBe(120);
    });

    it('should process boolean field', () => {
      const fields = processFields({
        active: a.boolean().default(true),
      });

      expect(fields.active).toBeDefined();
      expect(fields.active.type).toBe('boolean');
      expect(fields.active.default).toBe(true);
    });

    it('should process datetime field', () => {
      const fields = processFields({
        createdAt: a.datetime().required(),
      });

      expect(fields.createdAt).toBeDefined();
      expect(fields.createdAt.type).toBe('datetime');
    });

    it('should process id field', () => {
      const fields = processFields({
        id: a.id().prefix('usr'),
      });

      expect(fields.id).toBeDefined();
      expect(fields.id.type).toBe('id');
      expect(fields.id.prefix).toBe('usr');
    });

    it('should process enum field', () => {
      const fields = processFields({
        role: a.enum(['admin', 'user'] as const).default('user'),
      });

      expect(fields.role).toBeDefined();
      expect(fields.role.type).toBe('enum');
      expect(fields.role.values).toEqual(['admin', 'user']);
      expect(fields.role.default).toBe('user');
    });

    it('should process array field', () => {
      const fields = processFields({
        tags: a.array(a.string()),
      });

      expect(fields.tags).toBeDefined();
      expect(fields.tags.type).toBe('array');
      expect(fields.tags.itemType).toBeDefined();
    });

    it('should process object field', () => {
      const fields = processFields({
        profile: a.object({
          firstName: a.string(),
          lastName: a.string(),
        }),
      });

      expect(fields.profile).toBeDefined();
      expect(fields.profile.type).toBe('object');
      expect(fields.profile.schema).toBeDefined();
    });

    it('should process json field', () => {
      const fields = processFields({
        metadata: a.json(),
      });

      expect(fields.metadata).toBeDefined();
      expect(fields.metadata.type).toBe('json');
    });

    it('should process binary field', () => {
      const fields = processFields({
        file: a.binary().maxSize(1024 * 1024),
      });

      expect(fields.file).toBeDefined();
      expect(fields.file.type).toBe('binary');
      expect((fields.file as any).maxSize).toBe(1024 * 1024);
    });
  });

  describe('multiple fields', () => {
    it('should process multiple fields', () => {
      const fields = processFields({
        id: a.id(),
        name: a.string().required(),
        email: a.string().required().email(),
        age: a.number().optional(),
        active: a.boolean().default(true),
      });

      expect(Object.keys(fields)).toHaveLength(5);
      expect(fields.id.type).toBe('id');
      expect(fields.name.type).toBe('string');
      expect(fields.email.type).toBe('string');
      expect(fields.age.type).toBe('number');
      expect(fields.active.type).toBe('boolean');
    });

    it('should preserve field order', () => {
      const fields = processFields({
        field1: a.string(),
        field2: a.number(),
        field3: a.boolean(),
      });

      const keys = Object.keys(fields);
      expect(keys).toEqual(['field1', 'field2', 'field3']);
    });
  });

  describe('field validation', () => {
    it('should extract validation rules', () => {
      const fields = processFields({
        email: a.string().required().email().minLength(5).maxLength(255),
      });

      expect(fields.email.validations).toBeDefined();
      expect(fields.email.validations.length).toBeGreaterThan(0);
      expect(fields.email.validations.some((v) => v.type === 'required')).toBe(true);
      expect(fields.email.validations.some((v) => v.type === 'email')).toBe(true);
    });

    it('should preserve validation order', () => {
      const fields = processFields({
        password: a.string().required().minLength(8).maxLength(128),
      });

      const validations = fields.password.validations;
      expect(validations[0].type).toBe('required');
      expect(validations[1].type).toBe('minLength');
      expect(validations[2].type).toBe('maxLength');
    });
  });

  describe('field name validation', () => {
    it('should accept valid field names', () => {
      expect(() => {
        processFields({
          name: a.string(),
          firstName: a.string(),
          user_id: a.string(),
          value123: a.string(),
        });
      }).not.toThrow();
    });

    it('should reject empty field name', () => {
      expect(() => {
        processFields({
          '': a.string(),
        });
      }).toThrow('Field name cannot be empty');
    });

    it('should reject field name starting with number', () => {
      expect(() => {
        processFields({
          '1name': a.string(),
        });
      }).toThrow('must start with a letter');
    });

    it('should reject field name with special characters', () => {
      expect(() => {
        processFields({
          'user@name': a.string(), // @ is not allowed
        });
      }).toThrow('can only contain letters, numbers, underscores, hyphens, and dots');
    });

    it('should reject reserved field names', () => {
      expect(() => {
        processFields({
          constructor: a.string(),
        });
      }).toThrow('reserved word');

      expect(() => {
        processFields({
          prototype: a.string(),
        });
      }).toThrow('reserved word');

      // Note: __proto__ cannot be tested this way as it sets the prototype
      // rather than creating a property, so Object.entries won't see it
    });
  });

  describe('error handling', () => {
    it('should throw error for null fields', () => {
      expect(() => {
        processFields(null as any);
      }).toThrow('Fields must be an object');
    });

    it('should throw error for undefined fields', () => {
      expect(() => {
        processFields(undefined as any);
      }).toThrow('Fields must be an object');
    });

    it('should throw error for non-object fields', () => {
      expect(() => {
        processFields('not an object' as any);
      }).toThrow('Fields must be an object');
    });

    it('should throw error for invalid field builder', () => {
      expect(() => {
        processFields({
          name: 'not a builder',
        } as any);
      }).toThrow('Invalid field builder');
    });

    it('should throw error for field without _build method', () => {
      expect(() => {
        processFields({
          name: { type: 'string' },
        } as any);
      }).toThrow('Invalid field builder');
    });
  });
});

// ============================================================================
// processModels() Tests
// ============================================================================

describe('processModels()', () => {
  describe('basic model processing', () => {
    it('should process CRUD model', () => {
      const models = processModels({
        User: c.model({
          id: a.id(),
          name: a.string().required(),
        }),
      });

      expect(models.User).toBeDefined();
      expect(models.User.name).toBe('User');
      expect(models.User.config.type).toBe('crud');
      expect(models.User.metadata.isCrud).toBe(true);
    });

    it('should process event model', () => {
      const models = processModels({
        DataUploaded: e.model({
          fileUrl: a.string().url(),
        }),
      });

      expect(models.DataUploaded).toBeDefined();
      expect(models.DataUploaded.name).toBe('DataUploaded');
      expect(models.DataUploaded.config.type).toBe('event');
      expect(models.DataUploaded.metadata.isEvent).toBe(true);
    });

    it('should process function model', () => {
      const models = processModels({
        ProcessData: f.model({
          input: { data: a.string() },
          output: { result: a.string() },
        }),
      });

      expect(models.ProcessData).toBeDefined();
      expect(models.ProcessData.name).toBe('ProcessData');
      expect(models.ProcessData.config.type).toBe('function');
      expect(models.ProcessData.metadata.isFunction).toBe(true);
    });

    it('should process multiple models', () => {
      const models = processModels({
        User: c.model({ id: a.id(), name: a.string() }),
        DataUploaded: e.model({ fileUrl: a.string() }),
        ProcessData: f.model({
          input: { x: a.string() },
          output: { y: a.string() },
        }),
      });

      expect(Object.keys(models)).toHaveLength(3);
      expect(models.User.metadata.isCrud).toBe(true);
      expect(models.DataUploaded.metadata.isEvent).toBe(true);
      expect(models.ProcessData.metadata.isFunction).toBe(true);
    });
  });

  describe('model metadata', () => {
    it('should set correct metadata for CRUD model', () => {
      const models = processModels({
        User: c.model({ id: a.id(), name: a.string() }),
      });

      expect(models.User.metadata.isCrud).toBe(true);
      expect(models.User.metadata.isEvent).toBe(false);
      expect(models.User.metadata.isFunction).toBe(false);
    });

    it('should set correct metadata for event model', () => {
      const models = processModels({
        UserCreated: e.model({ userId: a.string() }),
      });

      expect(models.UserCreated.metadata.isCrud).toBe(false);
      expect(models.UserCreated.metadata.isEvent).toBe(true);
      expect(models.UserCreated.metadata.isFunction).toBe(false);
    });

    it('should set correct metadata for function model', () => {
      const models = processModels({
        Transform: f.model({
          input: { x: a.string() },
          output: { y: a.string() },
        }),
      });

      expect(models.Transform.metadata.isCrud).toBe(false);
      expect(models.Transform.metadata.isEvent).toBe(false);
      expect(models.Transform.metadata.isFunction).toBe(true);
    });
  });

  describe('model name validation', () => {
    it('should accept valid PascalCase names', () => {
      expect(() => {
        processModels({
          User: c.model({ id: a.id() }),
          UserProfile: c.model({ id: a.id() }),
          DataUploadEvent: e.model({ data: a.string() }),
          Model3D: c.model({ id: a.id() }),
        });
      }).not.toThrow();
    });

    it('should reject empty model name', () => {
      expect(() => {
        processModels({
          '': c.model({ id: a.id() }),
        });
      }).toThrow('Model name cannot be empty');
    });

    it('should reject model name not starting with uppercase', () => {
      expect(() => {
        processModels({
          user: c.model({ id: a.id() }),
        });
      }).toThrow('must start with an uppercase letter');
    });

    it('should reject model name with special characters', () => {
      expect(() => {
        processModels({
          'User-Profile': c.model({ id: a.id() }),
        });
      }).toThrow('can only contain letters and numbers');
    });

    it('should reject model name with underscores', () => {
      expect(() => {
        processModels({
          User_Profile: c.model({ id: a.id() }),
        });
      }).toThrow('can only contain letters and numbers');
    });

    it('should reject reserved model names', () => {
      const reservedNames = ['Schema', 'Model', 'Builder', 'Config', 'Type'];

      reservedNames.forEach((name) => {
        expect(() => {
          processModels({
            [name]: c.model({ id: a.id() }),
          });
        }).toThrow('reserved word');
      });
    });
  });

  describe('error handling', () => {
    it('should throw error for null models', () => {
      expect(() => {
        processModels(null as any);
      }).toThrow('Models must be an object');
    });

    it('should throw error for undefined models', () => {
      expect(() => {
        processModels(undefined as any);
      }).toThrow('Models must be an object');
    });

    it('should throw error for non-object models', () => {
      expect(() => {
        processModels('not an object' as any);
      }).toThrow('Models must be an object');
    });

    it('should throw error for invalid model builder', () => {
      expect(() => {
        processModels({
          User: { name: 'not a builder' },
        } as any);
      }).toThrow('Invalid model builder');
    });

    it('should throw error for model without _config', () => {
      expect(() => {
        processModels({
          User: { type: 'crud' },
        } as any);
      }).toThrow('Invalid model builder');
    });
  });
});

// ============================================================================
// extractModelNames() Tests
// ============================================================================

describe('extractModelNames()', () => {
  it('should categorize CRUD models', () => {
    const models = processModels({
      User: c.model({ id: a.id() }),
      Post: c.model({ id: a.id() }),
    });

    const names = extractModelNames(models);

    expect(names.crud).toEqual(['User', 'Post']);
    expect(names.events).toHaveLength(0);
    expect(names.functions).toHaveLength(0);
  });

  it('should categorize event models', () => {
    const models = processModels({
      UserCreated: e.model({ userId: a.string() }),
      UserDeleted: e.model({ userId: a.string() }),
    });

    const names = extractModelNames(models);

    expect(names.crud).toHaveLength(0);
    expect(names.events).toEqual(['UserCreated', 'UserDeleted']);
    expect(names.functions).toHaveLength(0);
  });

  it('should categorize function models', () => {
    const models = processModels({
      ProcessA: f.model({ input: { x: a.string() }, output: { y: a.string() } }),
      ProcessB: f.model({ input: { a: a.number() }, output: { b: a.number() } }),
    });

    const names = extractModelNames(models);

    expect(names.crud).toHaveLength(0);
    expect(names.events).toHaveLength(0);
    expect(names.functions).toEqual(['ProcessA', 'ProcessB']);
  });

  it('should categorize mixed models', () => {
    const models = processModels({
      User: c.model({ id: a.id() }),
      Post: c.model({ id: a.id() }),
      UserCreated: e.model({ userId: a.string() }),
      PostCreated: e.model({ postId: a.string() }),
      GenerateReport: f.model({ input: { id: a.string() }, output: { url: a.string() } }),
    });

    const names = extractModelNames(models);

    expect(names.crud).toEqual(['User', 'Post']);
    expect(names.events).toEqual(['UserCreated', 'PostCreated']);
    expect(names.functions).toEqual(['GenerateReport']);
  });

  it('should handle empty models object', () => {
    const names = extractModelNames({});

    expect(names.crud).toHaveLength(0);
    expect(names.events).toHaveLength(0);
    expect(names.functions).toHaveLength(0);
  });

  it('should preserve model order within categories', () => {
    const models = processModels({
      C: c.model({ id: a.id() }),
      B: c.model({ id: a.id() }),
      A: c.model({ id: a.id() }),
    });

    const names = extractModelNames(models);

    expect(names.crud).toEqual(['C', 'B', 'A']);
  });
});

// ============================================================================
// validateSchemaDefinition() Tests
// ============================================================================

describe('validateSchemaDefinition()', () => {
  it('should accept valid schema definition', () => {
    expect(() => {
      validateSchemaDefinition({
        schema: {
          User: c.model({ id: a.id() }),
        },
      });
    }).not.toThrow();
  });

  it('should accept schema with multiple models', () => {
    expect(() => {
      validateSchemaDefinition({
        schema: {
          User: c.model({ id: a.id() }),
          Post: c.model({ id: a.id() }),
          Comment: c.model({ id: a.id() }),
        },
      });
    }).not.toThrow();
  });

  it('should throw error for null definition', () => {
    expect(() => {
      validateSchemaDefinition(null as any);
    }).toThrow('Schema definition is required');
  });

  it('should throw error for undefined definition', () => {
    expect(() => {
      validateSchemaDefinition(undefined as any);
    }).toThrow('Schema definition is required');
  });

  it('should throw error for missing schema property', () => {
    expect(() => {
      validateSchemaDefinition({} as any);
    }).toThrow('Schema definition must include a "schema" property');
  });

  it('should throw error for non-object schema', () => {
    expect(() => {
      validateSchemaDefinition({ schema: 'not an object' } as any);
    }).toThrow('Schema must be an object');
  });

  it('should throw error for empty schema', () => {
    expect(() => {
      validateSchemaDefinition({ schema: {} });
    }).toThrow('Schema must contain at least one model');
  });

  it('should throw error for duplicate model names (case-insensitive)', () => {
    expect(() => {
      validateSchemaDefinition({
        schema: {
          User: c.model({ id: a.id() }),
          user: c.model({ id: a.id() }),
        },
      });
    }).toThrow('duplicate model names');
  });

  it('should detect duplicate with different casing', () => {
    expect(() => {
      validateSchemaDefinition({
        schema: {
          UserProfile: c.model({ id: a.id() }),
          userProfile: c.model({ id: a.id() }),
          USERPROFILE: c.model({ id: a.id() }),
        },
      });
    }).toThrow('duplicate model names');
  });
});

// ============================================================================
// Type Guard Tests
// ============================================================================

describe('Type Guards', () => {
  describe('isFieldBuilder()', () => {
    it('should return true for field builders', () => {
      expect(isFieldBuilder(a.string())).toBe(true);
      expect(isFieldBuilder(a.number())).toBe(true);
      expect(isFieldBuilder(a.boolean())).toBe(true);
      expect(isFieldBuilder(a.datetime())).toBe(true);
      expect(isFieldBuilder(a.id())).toBe(true);
      expect(isFieldBuilder(a.enum(['a', 'b']))).toBe(true);
      expect(isFieldBuilder(a.array(a.string()))).toBe(true);
      expect(isFieldBuilder(a.object({}))).toBe(true);
      expect(isFieldBuilder(a.json())).toBe(true);
      expect(isFieldBuilder(a.binary())).toBe(true);
    });

    it('should return false for non-field builders', () => {
      expect(isFieldBuilder(null)).toBe(false);
      expect(isFieldBuilder(undefined)).toBe(false);
      expect(isFieldBuilder('string')).toBe(false);
      expect(isFieldBuilder(123)).toBe(false);
      expect(isFieldBuilder({})).toBe(false);
      expect(isFieldBuilder({ type: 'string' })).toBe(false);
    });

    it('should return false for model builders', () => {
      expect(isFieldBuilder(c.model({ id: a.id() }))).toBe(false);
      expect(isFieldBuilder(e.model({ data: a.string() }))).toBe(false);
      expect(isFieldBuilder(f.model({ input: {}, output: {} }))).toBe(false);
    });
  });

  describe('isCrudModel()', () => {
    it('should return true for CRUD models', () => {
      const model = c.model({ id: a.id(), name: a.string() });
      expect(isCrudModel(model)).toBe(true);
    });

    it('should return false for event models', () => {
      const model = e.model({ data: a.string() });
      expect(isCrudModel(model)).toBe(false);
    });

    it('should return false for function models', () => {
      const model = f.model({
        input: { x: a.string() },
        output: { y: a.string() },
      });
      expect(isCrudModel(model)).toBe(false);
    });

    it('should return false for non-models', () => {
      expect(isCrudModel(null)).toBe(false);
      expect(isCrudModel(undefined)).toBe(false);
      expect(isCrudModel('string')).toBe(false);
      expect(isCrudModel({})).toBe(false);
    });

    it('should return false for field builders', () => {
      expect(isCrudModel(a.string())).toBe(false);
    });
  });

  describe('isEventModel()', () => {
    it('should return true for event models', () => {
      const model = e.model({ data: a.string() });
      expect(isEventModel(model)).toBe(true);
    });

    it('should return false for CRUD models', () => {
      const model = c.model({ id: a.id(), name: a.string() });
      expect(isEventModel(model)).toBe(false);
    });

    it('should return false for function models', () => {
      const model = f.model({
        input: { x: a.string() },
        output: { y: a.string() },
      });
      expect(isEventModel(model)).toBe(false);
    });

    it('should return false for non-models', () => {
      expect(isEventModel(null)).toBe(false);
      expect(isEventModel(undefined)).toBe(false);
      expect(isEventModel('string')).toBe(false);
      expect(isEventModel({})).toBe(false);
    });

    it('should return false for field builders', () => {
      expect(isEventModel(a.string())).toBe(false);
    });
  });

  describe('isFunctionModel()', () => {
    it('should return true for function models', () => {
      const model = f.model({
        input: { x: a.string() },
        output: { y: a.string() },
      });
      expect(isFunctionModel(model)).toBe(true);
    });

    it('should return false for CRUD models', () => {
      const model = c.model({ id: a.id(), name: a.string() });
      expect(isFunctionModel(model)).toBe(false);
    });

    it('should return false for event models', () => {
      const model = e.model({ data: a.string() });
      expect(isFunctionModel(model)).toBe(false);
    });

    it('should return false for non-models', () => {
      expect(isFunctionModel(null)).toBe(false);
      expect(isFunctionModel(undefined)).toBe(false);
      expect(isFunctionModel('string')).toBe(false);
      expect(isFunctionModel({})).toBe(false);
    });

    it('should return false for field builders', () => {
      expect(isFunctionModel(a.string())).toBe(false);
    });
  });

  describe('type guard combinations', () => {
    it('should be mutually exclusive for models', () => {
      const crudModel = c.model({ id: a.id() });
      const eventModel = e.model({ data: a.string() });
      const funcModel = f.model({ input: {}, output: {} });

      expect(
        isCrudModel(crudModel) && !isEventModel(crudModel) && !isFunctionModel(crudModel)
      ).toBe(true);
      expect(
        !isCrudModel(eventModel) && isEventModel(eventModel) && !isFunctionModel(eventModel)
      ).toBe(true);
      expect(
        !isCrudModel(funcModel) && !isEventModel(funcModel) && isFunctionModel(funcModel)
      ).toBe(true);
    });
  });
});
