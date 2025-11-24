/**
 * Tests for validation engine
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  fieldToZodSchema,
  schemaToZodSchema,
  validateField,
  validateSchema,
  validate,
  validateModelInput,
  validateFunction,
  validateEvent,
  createValidator,
  createAsyncValidator,
  validatePartial,
  validateArray,
  type FieldDefinition,
  type SchemaDefinition,
} from './validator';
import { ValidationError } from './errors';

describe('fieldToZodSchema', () => {
  describe('basic types', () => {
    it('should convert string field', () => {
      const field: FieldDefinition = { type: 'string', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse(123).success).toBe(false);
    });

    it('should convert number field', () => {
      const field: FieldDefinition = { type: 'number', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(123).success).toBe(true);
      expect(schema.safeParse('hello').success).toBe(false);
    });

    it('should convert boolean field', () => {
      const field: FieldDefinition = { type: 'boolean', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(true).success).toBe(true);
      expect(schema.safeParse(false).success).toBe(true);
      expect(schema.safeParse('true').success).toBe(false);
    });

    it('should convert date field', () => {
      const field: FieldDefinition = { type: 'date', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(new Date()).success).toBe(true);
      expect(schema.safeParse('2024-01-01').success).toBe(true); // Coercible
    });

    it('should convert datetime field', () => {
      const field: FieldDefinition = { type: 'datetime', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(new Date()).success).toBe(true);
      expect(schema.safeParse('2024-01-01T10:00:00Z').success).toBe(true);
    });

    it('should convert json field', () => {
      const field: FieldDefinition = { type: 'json', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse({ key: 'value' }).success).toBe(true);
      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
      expect(schema.safeParse('string').success).toBe(true);
    });

    it('should convert array field', () => {
      const field: FieldDefinition = { type: 'array', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
      expect(schema.safeParse([]).success).toBe(true);
      expect(schema.safeParse('not array').success).toBe(false);
    });

    it('should convert object field', () => {
      const field: FieldDefinition = { type: 'object', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse({ key: 'value' }).success).toBe(true);
      expect(schema.safeParse({}).success).toBe(true);
      expect(schema.safeParse([]).success).toBe(false);
    });
  });

  describe('special string types', () => {
    it('should validate email field', () => {
      const field: FieldDefinition = { type: 'email', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('test@example.com').success).toBe(true);
      expect(schema.safeParse('not-an-email').success).toBe(false);
    });

    it('should validate url field', () => {
      const field: FieldDefinition = { type: 'url', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('https://example.com').success).toBe(true);
      expect(schema.safeParse('not-a-url').success).toBe(false);
    });

    it('should validate uuid field', () => {
      const field: FieldDefinition = { type: 'uuid', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
      expect(schema.safeParse('not-a-uuid').success).toBe(false);
    });
  });

  describe('enum field', () => {
    it('should validate enum values', () => {
      const field: FieldDefinition = {
        type: 'enum',
        required: true,
        validations: [{ type: 'format', value: ['red', 'green', 'blue'] }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('red').success).toBe(true);
      expect(schema.safeParse('yellow').success).toBe(false);
    });

    it('should fallback to string if no enum values', () => {
      const field: FieldDefinition = { type: 'enum', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('any string').success).toBe(true);
    });
  });

  describe('required vs optional', () => {
    it('should handle required fields', () => {
      const field: FieldDefinition = { type: 'string', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(false);
    });

    it('should handle optional fields', () => {
      const field: FieldDefinition = { type: 'string', required: false };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);
    });

    it('should treat undefined required as optional', () => {
      const field: FieldDefinition = { type: 'string' };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(undefined).success).toBe(true);
    });
  });

  describe('nullable', () => {
    it('should handle nullable fields', () => {
      const field: FieldDefinition = { type: 'string', nullable: true, required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse(null).success).toBe(true);
    });

    it('should reject null on non-nullable fields', () => {
      const field: FieldDefinition = { type: 'string', required: true };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(null).success).toBe(false);
    });
  });

  describe('default values', () => {
    it('should apply default for missing values', () => {
      const field: FieldDefinition = { type: 'string', default: 'default value' };
      const schema = fieldToZodSchema(field);

      const result = schema.parse(undefined);
      expect(result).toBe('default value');
    });

    it('should not override provided values', () => {
      const field: FieldDefinition = { type: 'string', default: 'default' };
      const schema = fieldToZodSchema(field);

      const result = schema.parse('provided');
      expect(result).toBe('provided');
    });

    it('should handle default with various types', () => {
      const fields: FieldDefinition[] = [
        { type: 'number', default: 42 },
        { type: 'boolean', default: true },
        { type: 'array', default: [1, 2, 3] },
      ];

      fields.forEach((field) => {
        const schema = fieldToZodSchema(field);
        const result = schema.parse(undefined);
        expect(result).toEqual(field.default);
      });
    });
  });

  describe('string validations', () => {
    it('should apply minLength validation', () => {
      const field: FieldDefinition = {
        type: 'string',
        required: true,
        validations: [{ type: 'minLength', value: 5 }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse('hi').success).toBe(false);
    });

    it('should apply maxLength validation', () => {
      const field: FieldDefinition = {
        type: 'string',
        required: true,
        validations: [{ type: 'maxLength', value: 10 }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse('this is too long').success).toBe(false);
    });

    it('should apply pattern validation', () => {
      const field: FieldDefinition = {
        type: 'string',
        required: true,
        validations: [{ type: 'pattern', value: /^[A-Z]+$/ }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('HELLO').success).toBe(true);
      expect(schema.safeParse('hello').success).toBe(false);
    });

    it('should apply multiple string validations', () => {
      const field: FieldDefinition = {
        type: 'string',
        required: true,
        validations: [
          { type: 'minLength', value: 5 },
          { type: 'maxLength', value: 10 },
        ],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('hello').success).toBe(true);
      expect(schema.safeParse('hi').success).toBe(false);
      expect(schema.safeParse('this is too long').success).toBe(false);
    });
  });

  describe('number validations', () => {
    it('should apply min validation', () => {
      const field: FieldDefinition = {
        type: 'number',
        required: true,
        validations: [{ type: 'min', value: 10 }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(10).success).toBe(true);
      expect(schema.safeParse(5).success).toBe(false);
    });

    it('should apply max validation', () => {
      const field: FieldDefinition = {
        type: 'number',
        required: true,
        validations: [{ type: 'max', value: 100 }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(100).success).toBe(true);
      expect(schema.safeParse(150).success).toBe(false);
    });

    it('should apply integer validation', () => {
      const field: FieldDefinition = {
        type: 'number',
        required: true,
        validations: [{ type: 'integer' }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(10).success).toBe(true);
      expect(schema.safeParse(10.5).success).toBe(false);
    });

    it('should apply positive validation', () => {
      const field: FieldDefinition = {
        type: 'number',
        required: true,
        validations: [{ type: 'positive' }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(10).success).toBe(true);
      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(-5).success).toBe(false);
    });

    it('should apply negative validation', () => {
      const field: FieldDefinition = {
        type: 'number',
        required: true,
        validations: [{ type: 'negative' }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(-10).success).toBe(true);
      expect(schema.safeParse(0).success).toBe(false);
      expect(schema.safeParse(5).success).toBe(false);
    });
  });

  describe('date validations', () => {
    it('should apply date min validation', () => {
      const minDate = new Date('2020-01-01');
      const field: FieldDefinition = {
        type: 'date',
        required: true,
        validations: [{ type: 'min', value: minDate }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(new Date('2021-01-01')).success).toBe(true);
      expect(schema.safeParse(new Date('2019-01-01')).success).toBe(false);
    });

    it('should apply date max validation', () => {
      const maxDate = new Date('2025-12-31');
      const field: FieldDefinition = {
        type: 'date',
        required: true,
        validations: [{ type: 'max', value: maxDate }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse(new Date('2024-01-01')).success).toBe(true);
      expect(schema.safeParse(new Date('2026-01-01')).success).toBe(false);
    });
  });

  describe('array validations', () => {
    it('should apply minItems validation', () => {
      const field: FieldDefinition = {
        type: 'array',
        required: true,
        validations: [{ type: 'minItems', value: 2 }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse([1, 2]).success).toBe(true);
      expect(schema.safeParse([1]).success).toBe(false);
    });

    it('should apply maxItems validation', () => {
      const field: FieldDefinition = {
        type: 'array',
        required: true,
        validations: [{ type: 'maxItems', value: 3 }],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse([1, 2, 3]).success).toBe(true);
      expect(schema.safeParse([1, 2, 3, 4]).success).toBe(false);
    });
  });

  describe('custom validations', () => {
    it('should apply custom validator', () => {
      const field: FieldDefinition = {
        type: 'string',
        required: true,
        validations: [
          {
            type: 'custom',
            validator: (val: string) => val.startsWith('test_'),
            message: 'Must start with test_',
          },
        ],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('test_value').success).toBe(true);
      expect(schema.safeParse('invalid').success).toBe(false);
    });

    it('should apply multiple custom validators', () => {
      const field: FieldDefinition = {
        type: 'string',
        required: true,
        validations: [
          {
            type: 'custom',
            validator: (val: string) => val.length > 5,
            message: 'Too short',
          },
          {
            type: 'custom',
            validator: (val: string) => val.includes('@'),
            message: 'Must contain @',
          },
        ],
      };
      const schema = fieldToZodSchema(field);

      expect(schema.safeParse('test@example').success).toBe(true);
      expect(schema.safeParse('test').success).toBe(false);
      expect(schema.safeParse('longvalue').success).toBe(false);
    });
  });
});

describe('schemaToZodSchema', () => {
  it('should convert simple schema', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
      age: { type: 'number', required: true },
    };

    const zodSchema = schemaToZodSchema(schema);
    const result = zodSchema.safeParse({ name: 'John', age: 30 });

    expect(result.success).toBe(true);
  });

  it('should reject invalid data', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
      age: { type: 'number', required: true },
    };

    const zodSchema = schemaToZodSchema(schema);
    const result = zodSchema.safeParse({ name: 'John', age: 'invalid' });

    expect(result.success).toBe(false);
  });

  it('should handle optional fields', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
      nickname: { type: 'string', required: false },
    };

    const zodSchema = schemaToZodSchema(schema);
    const result = zodSchema.safeParse({ name: 'John' });

    expect(result.success).toBe(true);
  });

  it('should apply validations to all fields', () => {
    const schema: SchemaDefinition = {
      email: { type: 'email', required: true },
      age: {
        type: 'number',
        required: true,
        validations: [
          { type: 'min', value: 0 },
          { type: 'max', value: 120 },
        ],
      },
    };

    const zodSchema = schemaToZodSchema(schema);

    expect(zodSchema.safeParse({ email: 'test@example.com', age: 25 }).success).toBe(true);
    expect(zodSchema.safeParse({ email: 'invalid', age: 25 }).success).toBe(false);
    expect(zodSchema.safeParse({ email: 'test@example.com', age: 150 }).success).toBe(false);
  });
});

describe('validateField', () => {
  it('should validate valid field data', () => {
    const field: FieldDefinition = { type: 'email', required: true };
    const result = validateField(field, 'test@example.com', 'email');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('test@example.com');
    }
  });

  it('should return errors for invalid data', () => {
    const field: FieldDefinition = { type: 'email', required: true };
    const result = validateField(field, 'not-an-email', 'email');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('email');
    }
  });

  it('should handle nested field errors', () => {
    const field: FieldDefinition = {
      type: 'array',
      required: true,
      validations: [{ type: 'minItems', value: 2 }],
    };
    const result = validateField(field, [1], 'items');

    expect(result.success).toBe(false);
  });

  it('should use default field name', () => {
    const field: FieldDefinition = { type: 'string', required: true };
    const result = validateField(field, 123);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].field).toBe('field');
    }
  });
});

describe('validateSchema', () => {
  it('should validate valid schema data', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
      email: { type: 'email', required: true },
      age: { type: 'number', required: true },
    };

    const result = validateSchema(schema, {
      name: 'John',
      email: 'john@example.com',
      age: 30,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('John');
      expect(result.data.email).toBe('john@example.com');
      expect(result.data.age).toBe(30);
    }
  });

  it('should return all field errors', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
      email: { type: 'email', required: true },
      age: { type: 'number', required: true },
    };

    const result = validateSchema(schema, {
      name: 123,
      email: 'invalid-email',
      age: 'not-a-number',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      const fields = result.errors.map((e) => e.field);
      expect(fields).toContain('name');
      expect(fields).toContain('email');
      expect(fields).toContain('age');
    }
  });

  it('should handle missing required fields', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
      email: { type: 'email', required: true },
    };

    const result = validateSchema(schema, { name: 'John' });

    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.errors.find((e) => e.field === 'email');
      expect(emailError).toBeDefined();
    }
  });

  it('should allow missing optional fields', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
      nickname: { type: 'string', required: false },
    };

    const result = validateSchema(schema, { name: 'John' });

    expect(result.success).toBe(true);
  });

  it('should apply default values', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
      role: { type: 'string', default: 'user' },
    };

    const result = validateSchema(schema, { name: 'John' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('user');
    }
  });

  it('should handle complex nested validation errors', () => {
    const schema: SchemaDefinition = {
      email: { type: 'email', required: true },
      age: {
        type: 'number',
        required: true,
        validations: [
          { type: 'min', value: 18 },
          { type: 'max', value: 100 },
        ],
      },
    };

    const result = validateSchema(schema, {
      email: 'test@example.com',
      age: 150,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const ageError = result.errors.find((e) => e.field === 'age');
      expect(ageError).toBeDefined();
    }
  });
});

describe('validate', () => {
  it('should return data for valid input', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
      age: { type: 'number', required: true },
    };

    const data = validate(schema, { name: 'John', age: 30 });

    expect(data.name).toBe('John');
    expect(data.age).toBe(30);
  });

  it('should throw ValidationError for invalid input', () => {
    const schema: SchemaDefinition = {
      email: { type: 'email', required: true },
    };

    expect(() => {
      validate(schema, { email: 'invalid' });
    }).toThrow(ValidationError);
  });

  it('should throw with multiple errors', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
      email: { type: 'email', required: true },
    };

    try {
      validate(schema, { name: 123, email: 'invalid' });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      if (error instanceof ValidationError) {
        expect(error.errors.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('validateModelInput', () => {
  const schema: SchemaDefinition = {
    name: { type: 'string', required: true },
    email: { type: 'email', required: true },
    age: { type: 'number', required: true },
  };

  describe('create mode', () => {
    it('should require all required fields', () => {
      const result = validateModelInput(schema, { name: 'John' }, 'create');

      expect(result.success).toBe(false);
    });

    it('should validate complete data', () => {
      const result = validateModelInput(
        schema,
        { name: 'John', email: 'john@example.com', age: 30 },
        'create'
      );

      expect(result.success).toBe(true);
    });

    it('should use create mode by default', () => {
      const result = validateModelInput(schema, { name: 'John' });

      expect(result.success).toBe(false);
    });
  });

  describe('update mode', () => {
    it('should allow partial data', () => {
      const result = validateModelInput(schema, { name: 'John' }, 'update');

      expect(result.success).toBe(true);
    });

    it('should validate provided fields', () => {
      const result = validateModelInput(schema, { email: 'invalid' }, 'update');

      expect(result.success).toBe(false);
    });

    it('should allow empty updates', () => {
      const result = validateModelInput(schema, {}, 'update');

      expect(result.success).toBe(true);
    });
  });
});

describe('validateFunction', () => {
  it('should validate input only', () => {
    const inputSchema: SchemaDefinition = {
      param: { type: 'string', required: true },
    };
    const outputSchema: SchemaDefinition = {
      result: { type: 'number', required: true },
    };

    const result = validateFunction(inputSchema, outputSchema, { param: 'test' });

    expect(result.input.success).toBe(true);
    expect(result.output).toBeUndefined();
  });

  it('should validate both input and output', () => {
    const inputSchema: SchemaDefinition = {
      param: { type: 'string', required: true },
    };
    const outputSchema: SchemaDefinition = {
      result: { type: 'number', required: true },
    };

    const result = validateFunction(inputSchema, outputSchema, { param: 'test' }, { result: 42 });

    expect(result.input.success).toBe(true);
    expect(result.output?.success).toBe(true);
  });

  it('should return errors for invalid input', () => {
    const inputSchema: SchemaDefinition = {
      param: { type: 'number', required: true },
    };
    const outputSchema: SchemaDefinition = {};

    const result = validateFunction(inputSchema, outputSchema, { param: 'invalid' });

    expect(result.input.success).toBe(false);
  });

  it('should return errors for invalid output', () => {
    const inputSchema: SchemaDefinition = {};
    const outputSchema: SchemaDefinition = {
      result: { type: 'number', required: true },
    };

    const result = validateFunction(inputSchema, outputSchema, {}, { result: 'invalid' });

    expect(result.output?.success).toBe(false);
  });
});

describe('validateEvent', () => {
  it('should validate event payload', () => {
    const schema: SchemaDefinition = {
      eventType: { type: 'string', required: true },
      data: { type: 'json', required: true },
    };

    const result = validateEvent(schema, {
      eventType: 'user.created',
      data: { userId: '123' },
    });

    expect(result.success).toBe(true);
  });

  it('should return errors for invalid payload', () => {
    const schema: SchemaDefinition = {
      eventType: { type: 'string', required: true },
      timestamp: { type: 'datetime', required: true },
    };

    const result = validateEvent(schema, { eventType: 'test' });

    expect(result.success).toBe(false);
  });
});

describe('createValidator', () => {
  it('should create reusable validator function', () => {
    const schema: SchemaDefinition = {
      email: { type: 'email', required: true },
    };

    const validator = createValidator(schema);

    const result1 = validator({ email: 'test@example.com' });
    const result2 = validator({ email: 'invalid' });

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(false);
  });

  it('should validate with same schema multiple times', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
    };

    const validator = createValidator(schema);

    const results = ['John', 'Jane', 'Bob'].map((name) => validator({ name }));

    expect(results.every((r) => r.success)).toBe(true);
  });
});

describe('createAsyncValidator', () => {
  it('should create async validator function', async () => {
    const schema: SchemaDefinition = {
      email: { type: 'email', required: true },
    };

    const validator = createAsyncValidator(schema);

    const result = await validator({ email: 'test@example.com' });

    expect(result.success).toBe(true);
  });

  it('should return promise for validation', async () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
    };

    const validator = createAsyncValidator(schema);

    const promise = validator({ name: 'John' });

    expect(promise).toBeInstanceOf(Promise);
    const result = await promise;
    expect(result.success).toBe(true);
  });
});

describe('validatePartial', () => {
  const schema: SchemaDefinition = {
    name: { type: 'string', required: true },
    email: { type: 'email', required: true },
    age: { type: 'number', required: true },
  };

  it('should validate only provided fields', () => {
    const result = validatePartial(schema, { name: 'John' });

    expect(result.success).toBe(true);
  });

  it('should validate multiple provided fields', () => {
    const result = validatePartial(schema, {
      name: 'John',
      email: 'john@example.com',
    });

    expect(result.success).toBe(true);
  });

  it('should return errors for invalid provided fields', () => {
    const result = validatePartial(schema, { email: 'invalid' });

    expect(result.success).toBe(false);
  });

  it('should allow empty object', () => {
    const result = validatePartial(schema, {});

    expect(result.success).toBe(true);
  });

  it('should reject non-object data', () => {
    const result = validatePartial(schema, 'not an object');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].field).toBe('root');
    }
  });

  it('should reject null', () => {
    const result = validatePartial(schema, null);

    expect(result.success).toBe(false);
  });
});

describe('validateArray', () => {
  const itemSchema: SchemaDefinition = {
    name: { type: 'string', required: true },
    age: { type: 'number', required: true },
  };

  it('should validate array of valid items', () => {
    const result = validateArray(itemSchema, [
      { name: 'John', age: 30 },
      { name: 'Jane', age: 25 },
    ]);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it('should return errors with correct array indices', () => {
    const result = validateArray(itemSchema, [
      { name: 'John', age: 30 },
      { name: 'Invalid', age: 'not-a-number' },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      const errorFields = result.errors.map((e) => e.field);
      expect(errorFields.some((f) => f.startsWith('[1]'))).toBe(true);
    }
  });

  it('should validate empty array', () => {
    const result = validateArray(itemSchema, []);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(0);
    }
  });

  it('should reject non-array data', () => {
    const result = validateArray(itemSchema, 'not an array');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].field).toBe('root');
      expect(result.errors[0].message).toContain('array');
    }
  });

  it('should collect errors from multiple items', () => {
    const result = validateArray(itemSchema, [
      { name: 123, age: 'invalid' },
      { name: 456, age: 'invalid' },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(2);
    }
  });
});

describe('Performance', () => {
  it('should validate simple field quickly', () => {
    const field: FieldDefinition = { type: 'string', required: true };

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      validateField(field, 'test value', 'field');
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // Should complete 1000 validations in < 100ms
  });

  it('should validate schema quickly', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
      email: { type: 'email', required: true },
      age: { type: 'number', required: true },
    };

    const data = { name: 'John', email: 'john@example.com', age: 30 };

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      validateSchema(schema, data);
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(200); // Should complete 1000 validations in < 200ms
  });

  it('should handle large schema efficiently', () => {
    const schema: SchemaDefinition = {};
    for (let i = 0; i < 100; i++) {
      schema[`field${i}`] = { type: 'string', required: false };
    }

    const data: Record<string, string> = {};
    for (let i = 0; i < 100; i++) {
      data[`field${i}`] = `value${i}`;
    }

    const start = performance.now();
    validateSchema(schema, data);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // Should validate 100 fields in < 100ms
  });
});

describe('Edge cases', () => {
  it('should handle empty schema', () => {
    const schema: SchemaDefinition = {};
    const result = validateSchema(schema, {});

    expect(result.success).toBe(true);
  });

  it('should handle schema with all optional fields', () => {
    const schema: SchemaDefinition = {
      field1: { type: 'string', required: false },
      field2: { type: 'number', required: false },
    };
    const result = validateSchema(schema, {});

    expect(result.success).toBe(true);
  });

  it('should handle very long strings', () => {
    const field: FieldDefinition = { type: 'string', required: true };
    const longString = 'x'.repeat(10000);

    const result = validateField(field, longString, 'field');

    expect(result.success).toBe(true);
  });

  it('should handle unicode characters', () => {
    const field: FieldDefinition = { type: 'string', required: true };
    const unicode = '你好世界 🌍 مرحبا';

    const result = validateField(field, unicode, 'field');

    expect(result.success).toBe(true);
  });

  it('should handle deeply nested validation errors', () => {
    const field: FieldDefinition = {
      type: 'array',
      required: true,
      validations: [{ type: 'minItems', value: 5 }],
    };

    const result = validateField(field, [[[[[]]]]], 'deep');

    expect(result.success).toBe(false);
  });
});
