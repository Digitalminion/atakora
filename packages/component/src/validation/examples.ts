/**
 * Validation Engine Examples
 *
 * @remarks
 * This file contains practical examples of using the validation engine.
 * These examples are used in documentation and testing.
 */

import {
  validate,
  validateSchema,
  validateModelInput,
  validateFunction,
  validateEvent,
  validateArray,
  ValidationError,
  type SchemaDefinition,
  type FieldDefinition,
} from './index';

// ============================================================================
// EXAMPLE 1: Basic Field Validation
// ============================================================================

export function exampleBasicFieldValidation() {
  const emailField: FieldDefinition = {
    type: 'email',
    required: true,
  };

  // This would be used in validateField()
  // const result = validateField(emailField, 'user@example.com', 'email');
}

// ============================================================================
// EXAMPLE 2: User Schema Validation
// ============================================================================

export const userSchema: SchemaDefinition = {
  email: {
    type: 'email',
    required: true,
  },
  age: {
    type: 'number',
    required: true,
    validations: [
      { type: 'min', value: 0, message: 'Age cannot be negative' },
      { type: 'max', value: 120, message: 'Age must be realistic' },
      { type: 'integer', message: 'Age must be a whole number' },
    ],
  },
  name: {
    type: 'string',
    required: true,
    validations: [
      { type: 'minLength', value: 2 },
      { type: 'maxLength', value: 100 },
    ],
  },
  bio: {
    type: 'string',
    required: false,
    validations: [{ type: 'maxLength', value: 500 }],
  },
  website: {
    type: 'url',
    required: false,
  },
  isActive: {
    type: 'boolean',
    required: false,
    default: true,
  },
};

export function exampleUserValidation() {
  // Valid user
  const validUser = {
    email: 'john.doe@example.com',
    age: 30,
    name: 'John Doe',
    website: 'https://johndoe.com',
  };

  try {
    const user = validate(userSchema, validUser);
    console.log('Valid user:', user);
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Validation errors:', error.errors);
    }
  }

  // Invalid user - multiple errors
  const invalidUser = {
    email: 'not-an-email',
    age: -5,
    name: 'J', // Too short
    website: 'not-a-url',
  };

  const result = validateSchema(userSchema, invalidUser);
  if (!result.success) {
    console.log('Validation failed with errors:', result.errors);
    // Expected errors:
    // - email: Must be a valid email address
    // - age: Age cannot be negative
    // - name: Must be at least 2 character(s)
    // - website: Must be a valid URL
  }
}

// ============================================================================
// EXAMPLE 3: CRUD Model Validation
// ============================================================================

export function exampleCrudValidation() {
  // CREATE operation - all required fields must be present
  const createData = {
    email: 'user@example.com',
    age: 25,
    name: 'Jane Smith',
  };

  const createResult = validateModelInput(userSchema, createData, 'create');
  if (createResult.success) {
    console.log('Create data valid:', createResult.data);
  }

  // UPDATE operation - only provided fields are validated
  const updateData = {
    age: 26, // Only updating age
  };

  const updateResult = validateModelInput(userSchema, updateData, 'update');
  if (updateResult.success) {
    console.log('Update data valid:', updateResult.data);
  }

  // UPDATE with invalid data
  const invalidUpdate = {
    age: -1, // Invalid: negative age
  };

  const invalidResult = validateModelInput(userSchema, invalidUpdate, 'update');
  if (!invalidResult.success) {
    console.log('Update validation failed:', invalidResult.errors);
  }
}

// ============================================================================
// EXAMPLE 4: Function Input/Output Validation
// ============================================================================

export const generateReportInput: SchemaDefinition = {
  datasetId: {
    type: 'string',
    required: true,
  },
  format: {
    type: 'enum',
    required: false,
    default: 'pdf',
    validations: [
      {
        type: 'format',
        value: ['pdf', 'excel', 'csv'],
      },
    ],
  },
  includeCharts: {
    type: 'boolean',
    required: false,
    default: true,
  },
};

export const generateReportOutput: SchemaDefinition = {
  reportUrl: {
    type: 'url',
    required: true,
  },
  status: {
    type: 'enum',
    required: true,
    validations: [
      {
        type: 'format',
        value: ['generating', 'completed', 'failed'],
      },
    ],
  },
  generatedAt: {
    type: 'datetime',
    required: true,
  },
};

export function exampleFunctionValidation() {
  const input = {
    datasetId: 'dataset_123',
    format: 'pdf',
    includeCharts: true,
  };

  const output = {
    reportUrl: 'https://storage.azure.com/reports/report_456.pdf',
    status: 'completed',
    generatedAt: new Date().toISOString(),
  };

  const validation = validateFunction(generateReportInput, generateReportOutput, input, output);

  if (validation.input.success && validation.output?.success) {
    console.log('Function validation passed');
    console.log('Input:', validation.input.data);
    console.log('Output:', validation.output.data);
  } else {
    if (!validation.input.success) {
      console.error('Input validation failed:', validation.input.errors);
    }
    if (validation.output && !validation.output.success) {
      console.error('Output validation failed:', validation.output.errors);
    }
  }
}

// ============================================================================
// EXAMPLE 5: Event Payload Validation
// ============================================================================

export const dataUploadedEvent: SchemaDefinition = {
  datasetId: {
    type: 'string',
    required: true,
  },
  fileUrl: {
    type: 'url',
    required: true,
  },
  fileSize: {
    type: 'number',
    required: true,
    validations: [{ type: 'positive' }],
  },
  uploadedBy: {
    type: 'string',
    required: true,
  },
  uploadedAt: {
    type: 'datetime',
    required: true,
  },
  metadata: {
    type: 'json',
    required: false,
  },
};

export function exampleEventValidation() {
  const eventPayload = {
    datasetId: 'dataset_789',
    fileUrl: 'https://storage.azure.com/uploads/data.csv',
    fileSize: 1024000,
    uploadedBy: 'user_123',
    uploadedAt: new Date().toISOString(),
    metadata: {
      originalFilename: 'data.csv',
      contentType: 'text/csv',
    },
  };

  const result = validateEvent(dataUploadedEvent, eventPayload);

  if (result.success) {
    console.log('Event payload valid:', result.data);
    // Event can be published to queue
  } else {
    console.error('Invalid event payload:', result.errors);
    // Handle validation errors
  }
}

// ============================================================================
// EXAMPLE 6: Custom Validators
// ============================================================================

export const usernameSchema: SchemaDefinition = {
  username: {
    type: 'string',
    required: true,
    validations: [
      {
        type: 'minLength',
        value: 3,
        message: 'Username must be at least 3 characters',
      },
      {
        type: 'maxLength',
        value: 20,
        message: 'Username must be at most 20 characters',
      },
      {
        type: 'pattern',
        value: /^[a-zA-Z0-9_]+$/,
        message: 'Username can only contain letters, numbers, and underscores',
      },
      {
        type: 'custom',
        validator: (val: string) => {
          // Custom validation: cannot contain certain reserved words
          const reserved = ['admin', 'root', 'system'];
          return !reserved.some((word) => val.toLowerCase().includes(word));
        },
        message: 'Username cannot contain reserved words (admin, root, system)',
      },
    ],
  },
};

export function exampleCustomValidation() {
  // Valid username
  const validUsername = { username: 'john_doe_123' };
  const validResult = validateSchema(usernameSchema, validUsername);
  if (validResult.success) {
    console.log('Valid username:', validResult.data);
  }

  // Invalid - contains reserved word
  const invalidUsername = { username: 'admin_user' };
  const invalidResult = validateSchema(usernameSchema, invalidUsername);
  if (!invalidResult.success) {
    console.log('Invalid username:', invalidResult.errors);
  }
}

// ============================================================================
// EXAMPLE 7: Array Validation
// ============================================================================

export const orderItemSchema: SchemaDefinition = {
  productId: {
    type: 'string',
    required: true,
  },
  quantity: {
    type: 'number',
    required: true,
    validations: [{ type: 'integer' }, { type: 'positive' }],
  },
  price: {
    type: 'number',
    required: true,
    validations: [{ type: 'positive' }],
  },
};

export function exampleArrayValidation() {
  const items = [
    { productId: 'prod_1', quantity: 2, price: 19.99 },
    { productId: 'prod_2', quantity: 1, price: 49.99 },
    { productId: 'prod_3', quantity: 5, price: 9.99 },
  ];

  const result = validateArray(orderItemSchema, items);

  if (result.success) {
    console.log('All items valid:', result.data);
  } else {
    console.error('Some items invalid:', result.errors);
    // Errors will include array indices like:
    // "[0].price: Must be positive"
    // "[1].quantity: Must be an integer"
  }
}

// ============================================================================
// EXAMPLE 8: Nested Object Validation
// ============================================================================

export const addressSchema: SchemaDefinition = {
  street: {
    type: 'string',
    required: true,
  },
  city: {
    type: 'string',
    required: true,
  },
  state: {
    type: 'string',
    required: true,
    validations: [{ type: 'length', value: 2 }],
  },
  zipCode: {
    type: 'string',
    required: true,
    validations: [
      {
        type: 'pattern',
        value: /^\d{5}(-\d{4})?$/,
        message: 'Must be a valid ZIP code (e.g., 12345 or 12345-6789)',
      },
    ],
  },
};

export const customerSchema: SchemaDefinition = {
  name: {
    type: 'string',
    required: true,
  },
  email: {
    type: 'email',
    required: true,
  },
  shippingAddress: {
    type: 'object',
    required: true,
    // Note: Nested validation would need to be handled separately
  },
  billingAddress: {
    type: 'object',
    required: false,
  },
};

// ============================================================================
// EXAMPLE 9: Date/DateTime Validation
// ============================================================================

export const appointmentSchema: SchemaDefinition = {
  title: {
    type: 'string',
    required: true,
  },
  scheduledFor: {
    type: 'datetime',
    required: true,
    validations: [
      {
        type: 'min',
        value: new Date(),
        message: 'Appointment must be in the future',
      },
    ],
  },
  duration: {
    type: 'number',
    required: true,
    validations: [
      { type: 'min', value: 15, message: 'Minimum duration is 15 minutes' },
      { type: 'max', value: 480, message: 'Maximum duration is 8 hours' },
    ],
  },
};

// ============================================================================
// EXAMPLE 10: Error Handling Patterns
// ============================================================================

export function exampleErrorHandling() {
  const data = {
    email: 'invalid-email',
    age: -5,
  };

  try {
    const user = validate(userSchema, data);
    console.log('User:', user);
  } catch (error) {
    if (error instanceof ValidationError) {
      // HTTP-friendly error response
      const errorResponse = error.toJSON();
      console.log('Error response:', errorResponse);

      // Check specific fields
      if (error.hasFieldError('email')) {
        console.log('Email errors:', error.getFieldErrors('email'));
      }

      // Return to client
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorResponse),
      };
    }
  }
}

// ============================================================================
// Run all examples
// ============================================================================

export function runAllExamples() {
  console.log('\n=== User Validation ===');
  exampleUserValidation();

  console.log('\n=== CRUD Validation ===');
  exampleCrudValidation();

  console.log('\n=== Function Validation ===');
  exampleFunctionValidation();

  console.log('\n=== Event Validation ===');
  exampleEventValidation();

  console.log('\n=== Custom Validation ===');
  exampleCustomValidation();

  console.log('\n=== Array Validation ===');
  exampleArrayValidation();

  console.log('\n=== Error Handling ===');
  exampleErrorHandling();
}

// Uncomment to run examples:
// runAllExamples();
