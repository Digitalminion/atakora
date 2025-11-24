# Validation Engine

Runtime validation engine for @atakora/component using Zod.

## Overview

The validation engine provides type-safe runtime validation for:

- Model field definitions
- Function inputs and outputs
- Event payloads
- API request data

## Architecture

### Core Components

1. **validator.ts** - Main validation engine
   - Converts field definitions to Zod schemas
   - Executes validation
   - Returns structured results

2. **rules.ts** - Validation rules library
   - String validators (email, url, regex, length)
   - Number validators (min, max, integer, positive)
   - Date validators (min, max, future, past)
   - Array validators (minItems, maxItems, unique)
   - Custom validator support

3. **errors.ts** - Error handling
   - Structured validation errors
   - Field-level error tracking
   - HTTP-friendly error format (400 Bad Request)

## Usage Examples

### Basic Field Validation

```typescript
import { validateField, type FieldDefinition } from '@atakora/component/validation';

const emailField: FieldDefinition = {
  type: 'email',
  required: true,
};

const result = validateField(emailField, 'user@example.com', 'email');

if (result.success) {
  console.log('Valid email:', result.data);
} else {
  console.log('Errors:', result.errors);
}
```

### Schema Validation

```typescript
import { validateSchema, type SchemaDefinition } from '@atakora/component/validation';

const userSchema: SchemaDefinition = {
  email: {
    type: 'email',
    required: true,
  },
  age: {
    type: 'number',
    required: true,
    validations: [{ type: 'min', value: 0 }, { type: 'max', value: 120 }, { type: 'integer' }],
  },
  name: {
    type: 'string',
    required: true,
    validations: [
      { type: 'minLength', value: 2 },
      { type: 'maxLength', value: 100 },
    ],
  },
};

const result = validateSchema(userSchema, {
  email: 'user@example.com',
  age: 25,
  name: 'John Doe',
});
```

### Model Input Validation

```typescript
import { validateModelInput } from '@atakora/component/validation';

// Create mode: all required fields must be present
const createResult = validateModelInput(
  userSchema,
  {
    email: 'user@example.com',
    age: 25,
    name: 'John Doe',
  },
  'create'
);

// Update mode: all fields optional, only validate provided fields
const updateResult = validateModelInput(
  userSchema,
  {
    age: 26, // Only updating age
  },
  'update'
);
```

### Custom Validators

```typescript
const schema: SchemaDefinition = {
  username: {
    type: 'string',
    required: true,
    validations: [
      {
        type: 'custom',
        validator: (val: string) => {
          // Custom validation logic
          return !val.includes('admin') && val.length >= 3;
        },
        message: 'Username cannot contain "admin" and must be at least 3 characters',
      },
    ],
  },
};
```

### Validation with Error Handling

```typescript
import { validate, ValidationError } from '@atakora/component/validation';

try {
  const user = validate(userSchema, inputData);
  // Data is valid, continue processing
  console.log('Valid user:', user);
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation errors
    console.log('Validation failed:', error.errors);

    // Check specific field errors
    if (error.hasFieldError('email')) {
      console.log('Email errors:', error.getFieldErrors('email'));
    }

    // Return HTTP-friendly response
    return {
      statusCode: 400,
      body: JSON.stringify(error.toJSON()),
    };
  }
}
```

### Function Input/Output Validation

```typescript
import { validateFunction } from '@atakora/component/validation';

const inputSchema: SchemaDefinition = {
  datasetId: {
    type: 'string',
    required: true,
  },
  format: {
    type: 'enum',
    required: false,
    default: 'pdf',
    validations: [{ type: 'format', value: ['pdf', 'excel'] }],
  },
};

const outputSchema: SchemaDefinition = {
  reportUrl: {
    type: 'url',
    required: true,
  },
  status: {
    type: 'enum',
    required: true,
    validations: [{ type: 'format', value: ['generating', 'completed'] }],
  },
};

const validation = validateFunction(
  inputSchema,
  outputSchema,
  { datasetId: '123', format: 'pdf' },
  { reportUrl: 'https://example.com/report.pdf', status: 'completed' }
);

if (validation.input.success && validation.output?.success) {
  console.log('Function validation passed');
}
```

### Array Validation

```typescript
import { validateArray } from '@atakora/component/validation';

const itemSchema: SchemaDefinition = {
  id: { type: 'string', required: true },
  quantity: { type: 'number', required: true },
};

const result = validateArray(itemSchema, [
  { id: 'item1', quantity: 5 },
  { id: 'item2', quantity: 10 },
]);

if (result.success) {
  console.log('All items valid:', result.data);
} else {
  // Errors include array indices
  // e.g., "[0].quantity: Must be a positive number"
  console.log('Validation errors:', result.errors);
}
```

## Validation Rules

### String Rules

- `email()` - Valid email format
- `url()` - Valid URL format
- `uuid()` - UUID format
- `regex(pattern, message?)` - Custom regex
- `minLength(min)` - Minimum length
- `maxLength(max)` - Maximum length
- `trim()` - Trim whitespace
- `lowercase()` - Convert to lowercase
- `uppercase()` - Convert to uppercase

### Number Rules

- `min(value)` - Minimum value
- `max(value)` - Maximum value
- `greaterThan(value)` - Strictly greater than
- `lessThan(value)` - Strictly less than
- `integer()` - Must be integer
- `positive()` - Must be positive (> 0)
- `negative()` - Must be negative (< 0)
- `multipleOf(value)` - Must be multiple of value

### Date Rules

- `min(date)` - Minimum date
- `max(date)` - Maximum date
- `future()` - Must be in future
- `past()` - Must be in past
- `between(min, max)` - Within date range

### Array Rules

- `minItems(min)` - Minimum array length
- `maxItems(max)` - Maximum array length
- `nonEmpty()` - Array must not be empty
- `unique(compareFn?)` - All items must be unique

## Error Format

Validation errors follow a consistent structure:

```typescript
{
  field: string;        // Path to field (e.g., "email", "user.address.city")
  message: string;      // Human-readable error message
  type: ValidationErrorType;  // Error type (e.g., "email", "min", "required")
  context?: Record<string, any>;  // Additional error context
}
```

Example error response:

```json
{
  "error": "ValidationError",
  "message": "Validation failed: 2 error(s)",
  "statusCode": 400,
  "errors": [
    {
      "field": "email",
      "message": "Must be a valid email address",
      "type": "format"
    },
    {
      "field": "age",
      "message": "Must be at least 0",
      "type": "min",
      "context": { "min": 0 }
    }
  ]
}
```

## Performance Considerations

1. **Schema Compilation**: Zod schemas are compiled once and reused
2. **Lazy Validation**: Only validates fields that are present
3. **Error Aggregation**: Returns all errors, not just the first one
4. **Type Caching**: TypeScript types are inferred at compile-time

## Integration Points

### Field Types → Zod Schemas

Field definitions are automatically converted to Zod schemas:

```typescript
{
  type: 'email',
  required: true,
}
// Converts to:
z.string().email()
```

### Model Definitions → Validation Schemas

Model schemas are validated on all CRUD operations:

- Create: All required fields validated
- Update: Only provided fields validated
- Delete: ID validation only

### Runtime Validation in API Handlers

Validation runs automatically in:

- HTTP request handlers (Express, Azure Functions)
- Event processors (before processing)
- Function inputs/outputs (before and after execution)

## Type Safety

All validation functions are fully typed:

```typescript
const result = validateSchema<User>(userSchema, data);
//    ^? ValidationResult<User>

if (result.success) {
  const user = result.data;
  //    ^? User (fully typed)
}
```

## Testing

See `__tests__/validation/` for comprehensive test suite covering:

- All field types
- All validation rules
- Error handling
- Edge cases
- Performance benchmarks
