/**
 * Integration tests for validation API
 */

import { describe, it, expect } from 'vitest';
import {
  // Core validation
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
  // Error types
  ValidationError,
  createFieldError,
  formatPath,
  mapZodErrorType,
  // Rules
  stringRules,
  numberRules,
  dateRules,
  arrayRules,
  objectRules,
  customRule,
  combine,
  // Version
  VALIDATION_VERSION,
  // Types
  type FieldDefinition,
  type FieldType,
  type Validation,
  type SchemaDefinition,
  type FieldError,
  type ValidationErrorType,
  type ValidationResult,
  type CustomValidator,
} from './index';

describe('Validation API exports', () => {
  it('should export all core validation functions', () => {
    expect(fieldToZodSchema).toBeDefined();
    expect(schemaToZodSchema).toBeDefined();
    expect(validateField).toBeDefined();
    expect(validateSchema).toBeDefined();
    expect(validate).toBeDefined();
    expect(validateModelInput).toBeDefined();
    expect(validateFunction).toBeDefined();
    expect(validateEvent).toBeDefined();
    expect(createValidator).toBeDefined();
    expect(createAsyncValidator).toBeDefined();
    expect(validatePartial).toBeDefined();
    expect(validateArray).toBeDefined();
  });

  it('should export all error types and utilities', () => {
    expect(ValidationError).toBeDefined();
    expect(createFieldError).toBeDefined();
    expect(formatPath).toBeDefined();
    expect(mapZodErrorType).toBeDefined();
  });

  it('should export all validation rules', () => {
    expect(stringRules).toBeDefined();
    expect(numberRules).toBeDefined();
    expect(dateRules).toBeDefined();
    expect(arrayRules).toBeDefined();
    expect(objectRules).toBeDefined();
    expect(customRule).toBeDefined();
    expect(combine).toBeDefined();
  });

  it('should export version', () => {
    expect(VALIDATION_VERSION).toBeDefined();
    expect(typeof VALIDATION_VERSION).toBe('string');
  });
});

describe('Integration: Complete validation workflow', () => {
  it('should validate simple user registration', () => {
    const schema: SchemaDefinition = {
      email: { type: 'email', required: true },
      password: {
        type: 'string',
        required: true,
        validations: [{ type: 'minLength', value: 8 }],
      },
      age: {
        type: 'number',
        required: true,
        validations: [{ type: 'min', value: 18 }, { type: 'integer' }],
      },
    };

    const validData = {
      email: 'user@example.com',
      password: 'SecurePassword123',
      age: 25,
    };

    const result = validateSchema(schema, validData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
      expect(result.data.password).toBe('SecurePassword123');
      expect(result.data.age).toBe(25);
    }
  });

  it('should validate and return multiple errors', () => {
    const schema: SchemaDefinition = {
      email: { type: 'email', required: true },
      password: {
        type: 'string',
        required: true,
        validations: [{ type: 'minLength', value: 8 }],
      },
      age: {
        type: 'number',
        required: true,
        validations: [{ type: 'min', value: 18 }],
      },
    };

    const invalidData = {
      email: 'not-an-email',
      password: 'short',
      age: 15,
    };

    const result = validateSchema(schema, invalidData);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(3);
      expect(result.errors.some((e) => e.field === 'email')).toBe(true);
      expect(result.errors.some((e) => e.field === 'password')).toBe(true);
      expect(result.errors.some((e) => e.field === 'age')).toBe(true);
    }
  });

  it('should throw ValidationError with validate()', () => {
    const schema: SchemaDefinition = {
      email: { type: 'email', required: true },
    };

    try {
      validate(schema, { email: 'invalid' });
      expect.fail('Should have thrown ValidationError');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      if (error instanceof ValidationError) {
        expect(error.statusCode).toBe(400);
        expect(error.errors.length).toBeGreaterThan(0);
        const json = error.toJSON();
        expect(json.error).toBe('ValidationError');
      }
    }
  });
});

describe('Integration: Model CRUD validation', () => {
  const userSchema: SchemaDefinition = {
    id: { type: 'uuid', required: true },
    email: { type: 'email', required: true },
    name: { type: 'string', required: true },
    bio: { type: 'string', required: false },
    createdAt: { type: 'datetime', required: true },
  };

  it('should validate create operation', () => {
    const createData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'john@example.com',
      name: 'John Doe',
      createdAt: new Date().toISOString(),
    };

    const result = validateModelInput(userSchema, createData, 'create');

    expect(result.success).toBe(true);
  });

  it('should reject incomplete create data', () => {
    const incompleteData = {
      email: 'john@example.com',
    };

    const result = validateModelInput(userSchema, incompleteData, 'create');

    expect(result.success).toBe(false);
  });

  it('should validate partial update operation', () => {
    const updateData = {
      name: 'Jane Doe',
      bio: 'Software engineer',
    };

    const result = validateModelInput(userSchema, updateData, 'update');

    expect(result.success).toBe(true);
  });

  it('should validate single field update', () => {
    const updateData = {
      email: 'newemail@example.com',
    };

    const result = validateModelInput(userSchema, updateData, 'update');

    expect(result.success).toBe(true);
  });

  it('should reject invalid partial update', () => {
    const invalidUpdate = {
      email: 'not-an-email',
    };

    const result = validateModelInput(userSchema, invalidUpdate, 'update');

    expect(result.success).toBe(false);
  });
});

describe('Integration: Function input/output validation', () => {
  it('should validate function with valid input and output', () => {
    const inputSchema: SchemaDefinition = {
      userId: { type: 'uuid', required: true },
      action: { type: 'string', required: true },
    };

    const outputSchema: SchemaDefinition = {
      success: { type: 'boolean', required: true },
      timestamp: { type: 'datetime', required: true },
    };

    const input = {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      action: 'login',
    };

    const output = {
      success: true,
      timestamp: new Date(),
    };

    const result = validateFunction(inputSchema, outputSchema, input, output);

    expect(result.input.success).toBe(true);
    expect(result.output?.success).toBe(true);
  });

  it('should detect invalid function input', () => {
    const inputSchema: SchemaDefinition = {
      count: {
        type: 'number',
        required: true,
        validations: [{ type: 'positive' }],
      },
    };

    const outputSchema: SchemaDefinition = {
      result: { type: 'number', required: true },
    };

    const result = validateFunction(inputSchema, outputSchema, { count: -5 });

    expect(result.input.success).toBe(false);
  });

  it('should detect invalid function output', () => {
    const inputSchema: SchemaDefinition = {
      x: { type: 'number', required: true },
    };

    const outputSchema: SchemaDefinition = {
      result: { type: 'number', required: true },
    };

    const result = validateFunction(inputSchema, outputSchema, { x: 5 }, { result: 'invalid' });

    expect(result.input.success).toBe(true);
    expect(result.output?.success).toBe(false);
  });
});

describe('Integration: Event validation', () => {
  it('should validate domain event', () => {
    const eventSchema: SchemaDefinition = {
      eventType: { type: 'string', required: true },
      aggregateId: { type: 'uuid', required: true },
      timestamp: { type: 'datetime', required: true },
      payload: { type: 'json', required: true },
    };

    const event = {
      eventType: 'user.created',
      aggregateId: '550e8400-e29b-41d4-a716-446655440000',
      timestamp: new Date(),
      payload: {
        email: 'user@example.com',
        name: 'John Doe',
      },
    };

    const result = validateEvent(eventSchema, event);

    expect(result.success).toBe(true);
  });

  it('should validate integration event with custom rules', () => {
    const eventSchema: SchemaDefinition = {
      source: { type: 'string', required: true },
      eventType: { type: 'string', required: true },
      data: { type: 'json', required: true },
      version: {
        type: 'string',
        required: true,
        validations: [
          {
            type: 'custom',
            validator: (val: string) => /^\d+\.\d+\.\d+$/.test(val),
            message: 'Must be semantic version (e.g., 1.0.0)',
          },
        ],
      },
    };

    const event = {
      source: 'payment-service',
      eventType: 'payment.completed',
      data: { amount: 100, currency: 'USD' },
      version: '1.2.3',
    };

    const result = validateEvent(eventSchema, event);

    expect(result.success).toBe(true);
  });

  it('should reject invalid event version', () => {
    const eventSchema: SchemaDefinition = {
      version: {
        type: 'string',
        required: true,
        validations: [
          {
            type: 'custom',
            validator: (val: string) => /^\d+\.\d+\.\d+$/.test(val),
            message: 'Must be semantic version',
          },
        ],
      },
    };

    const result = validateEvent(eventSchema, { version: 'invalid' });

    expect(result.success).toBe(false);
  });
});

describe('Integration: Array validation', () => {
  it('should validate array of entities', () => {
    const itemSchema: SchemaDefinition = {
      id: { type: 'uuid', required: true },
      name: { type: 'string', required: true },
      quantity: {
        type: 'number',
        required: true,
        validations: [{ type: 'integer' }, { type: 'positive' }],
      },
    };

    const items = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Item 1',
        quantity: 5,
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Item 2',
        quantity: 10,
      },
    ];

    const result = validateArray(itemSchema, items);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toHaveLength(2);
    }
  });

  it('should return errors with array indices', () => {
    const itemSchema: SchemaDefinition = {
      price: {
        type: 'number',
        required: true,
        validations: [{ type: 'positive' }],
      },
    };

    const items = [{ price: 10 }, { price: -5 }, { price: 20 }];

    const result = validateArray(itemSchema, items);

    expect(result.success).toBe(false);
    if (!result.success) {
      const errorAtIndex1 = result.errors.find((e) => e.field.startsWith('[1]'));
      expect(errorAtIndex1).toBeDefined();
    }
  });
});

describe('Integration: Custom validators', () => {
  it('should validate with custom business logic', () => {
    const schema: SchemaDefinition = {
      username: {
        type: 'string',
        required: true,
        validations: [
          { type: 'minLength', value: 3 },
          { type: 'maxLength', value: 20 },
          {
            type: 'custom',
            validator: (val: string) => !val.includes('admin'),
            message: 'Username cannot contain "admin"',
          },
          {
            type: 'custom',
            validator: (val: string) => /^[a-z0-9_]+$/.test(val),
            message: 'Username can only contain lowercase letters, numbers, and underscores',
          },
        ],
      },
    };

    expect(validateSchema(schema, { username: 'john_doe' }).success).toBe(true);
    expect(validateSchema(schema, { username: 'admin_user' }).success).toBe(false);
    expect(validateSchema(schema, { username: 'John-Doe' }).success).toBe(false);
    expect(validateSchema(schema, { username: 'ab' }).success).toBe(false);
  });

  it('should validate complex business rules', () => {
    const orderSchema: SchemaDefinition = {
      items: {
        type: 'array',
        required: true,
        validations: [
          { type: 'minItems', value: 1 },
          {
            type: 'custom',
            validator: (items: any[]) => items.every((item) => item.quantity > 0),
            message: 'All items must have positive quantity',
          },
        ],
      },
      totalAmount: {
        type: 'number',
        required: true,
        validations: [
          { type: 'positive' },
          {
            type: 'custom',
            validator: (amount: number) => amount >= 10,
            message: 'Minimum order amount is $10',
          },
        ],
      },
    };

    const validOrder = {
      items: [
        { name: 'Item 1', quantity: 2 },
        { name: 'Item 2', quantity: 1 },
      ],
      totalAmount: 50,
    };

    const invalidOrder = {
      items: [{ name: 'Item 1', quantity: 0 }],
      totalAmount: 5,
    };

    expect(validateSchema(orderSchema, validOrder).success).toBe(true);
    expect(validateSchema(orderSchema, invalidOrder).success).toBe(false);
  });
});

describe('Integration: Validator factory pattern', () => {
  it('should create reusable validator', () => {
    const emailSchema: SchemaDefinition = {
      email: { type: 'email', required: true },
    };

    const validateEmail = createValidator(emailSchema);

    const validEmails = ['test@example.com', 'user@domain.co.uk', 'name+tag@example.com'];

    const results = validEmails.map((email) => validateEmail({ email }));

    expect(results.every((r) => r.success)).toBe(true);
  });

  it('should create async validator', async () => {
    const schema: SchemaDefinition = {
      userId: { type: 'uuid', required: true },
    };

    const validateUserId = createAsyncValidator(schema);

    const result = await validateUserId({ userId: '550e8400-e29b-41d4-a716-446655440000' });

    expect(result.success).toBe(true);
  });
});

describe('Integration: Error handling and messages', () => {
  it('should provide clear error messages', () => {
    const schema: SchemaDefinition = {
      email: { type: 'email', required: true },
      age: {
        type: 'number',
        required: true,
        validations: [{ type: 'min', value: 18, message: 'You must be at least 18 years old' }],
      },
    };

    const result = validateSchema(schema, { email: 'invalid', age: 15 });

    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.errors.find((e) => e.field === 'email');
      const ageError = result.errors.find((e) => e.field === 'age');

      expect(emailError?.message).toBeDefined();
      expect(ageError?.message).toBe('You must be at least 18 years old');
    }
  });

  it('should format complex field paths correctly', () => {
    const nestedSchema: SchemaDefinition = {
      user: { type: 'object', required: true },
    };

    // This would ideally test nested validation, but our current implementation
    // doesn't support deeply nested schema definitions yet
    expect(formatPath(['user', 'profile', 'address', 'city'])).toBe('user.profile.address.city');
    expect(formatPath(['items', 0, 'variants', 1, 'sku'])).toBe('items[0].variants[1].sku');
  });

  it('should create field errors with context', () => {
    const error = createFieldError('age', 'Must be at least 18', 'min', {
      min: 18,
      actual: 15,
    });

    expect(error.field).toBe('age');
    expect(error.message).toBe('Must be at least 18');
    expect(error.type).toBe('min');
    expect(error.context?.min).toBe(18);
    expect(error.context?.actual).toBe(15);
  });

  it('should map Zod error codes correctly', () => {
    expect(mapZodErrorType('invalid_type')).toBe('type');
    expect(mapZodErrorType('too_small')).toBe('min');
    expect(mapZodErrorType('too_big')).toBe('max');
    expect(mapZodErrorType('custom')).toBe('custom');
    expect(mapZodErrorType('unknown_code')).toBe('unknown');
  });
});

describe('Integration: Partial validation workflow', () => {
  const profileSchema: SchemaDefinition = {
    name: { type: 'string', required: true },
    email: { type: 'email', required: true },
    bio: { type: 'string', required: true },
    website: { type: 'url', required: false },
  };

  it('should validate partial profile update', () => {
    const partialUpdate = {
      bio: 'Updated bio text',
    };

    const result = validatePartial(profileSchema, partialUpdate);

    expect(result.success).toBe(true);
  });

  it('should validate multiple fields in partial update', () => {
    const partialUpdate = {
      name: 'New Name',
      website: 'https://example.com',
    };

    const result = validatePartial(profileSchema, partialUpdate);

    expect(result.success).toBe(true);
  });

  it('should reject invalid fields in partial update', () => {
    const partialUpdate = {
      email: 'not-an-email',
      website: 'not-a-url',
    };

    const result = validatePartial(profileSchema, partialUpdate);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});

describe('Integration: Type safety', () => {
  it('should infer correct types from validation', () => {
    const schema: SchemaDefinition = {
      name: { type: 'string', required: true },
      age: { type: 'number', required: true },
    };

    const result = validateSchema<{ name: string; age: number }>(schema, {
      name: 'John',
      age: 30,
    });

    if (result.success) {
      // TypeScript should infer these types correctly
      const name: string = result.data.name;
      const age: number = result.data.age;

      expect(typeof name).toBe('string');
      expect(typeof age).toBe('number');
    }
  });

  it('should handle ValidationResult type correctly', () => {
    const schema: SchemaDefinition = {
      value: { type: 'number', required: true },
    };

    const result: ValidationResult<{ value: number }> = validateSchema(schema, { value: 42 });

    if (result.success) {
      expect(result.data.value).toBe(42);
    } else {
      expect(result.errors).toBeDefined();
    }
  });
});

describe('Integration: Complete end-to-end scenarios', () => {
  it('should validate e-commerce order', () => {
    const orderSchema: SchemaDefinition = {
      orderId: { type: 'uuid', required: true },
      customerId: { type: 'uuid', required: true },
      status: {
        type: 'enum',
        required: true,
        validations: [
          { type: 'format', value: ['pending', 'processing', 'completed', 'cancelled'] },
        ],
      },
      totalAmount: {
        type: 'number',
        required: true,
        validations: [{ type: 'positive' }],
      },
      createdAt: { type: 'datetime', required: true },
      shippingAddress: { type: 'object', required: true },
      items: {
        type: 'array',
        required: true,
        validations: [{ type: 'minItems', value: 1 }],
      },
    };

    const order = {
      orderId: '550e8400-e29b-41d4-a716-446655440000',
      customerId: '550e8400-e29b-41d4-a716-446655440001',
      status: 'pending',
      totalAmount: 99.99,
      createdAt: new Date(),
      shippingAddress: {
        street: '123 Main St',
        city: 'Springfield',
        zip: '12345',
      },
      items: [{ productId: '123', quantity: 2, price: 49.99 }],
    };

    const result = validateSchema(orderSchema, order);

    expect(result.success).toBe(true);
  });

  it('should validate API request/response cycle', () => {
    const requestSchema: SchemaDefinition = {
      method: { type: 'string', required: true },
      endpoint: { type: 'url', required: true },
      headers: { type: 'object', required: false },
      body: { type: 'json', required: false },
    };

    const responseSchema: SchemaDefinition = {
      statusCode: {
        type: 'number',
        required: true,
        validations: [{ type: 'integer' }],
      },
      body: { type: 'json', required: false },
      headers: { type: 'object', required: false },
    };

    const request = {
      method: 'POST',
      endpoint: 'https://api.example.com/users',
      body: { name: 'John', email: 'john@example.com' },
    };

    const response = {
      statusCode: 201,
      body: { id: '123', name: 'John', email: 'john@example.com' },
    };

    const validation = validateFunction(requestSchema, responseSchema, request, response);

    expect(validation.input.success).toBe(true);
    expect(validation.output?.success).toBe(true);
  });
});
