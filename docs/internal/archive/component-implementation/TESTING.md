# Validation Engine Test Documentation

## Overview

Comprehensive test suite for the @atakora/component validation engine, providing >90% code coverage with 600+ tests covering all validation scenarios.

## Test Structure

```
src/validation/
├── errors.spec.ts           # Error types and utilities (235 tests)
├── rules.spec.ts            # Validation rules (150+ tests)
├── validator.spec.ts        # Core validation engine (200+ tests)
├── index.spec.ts            # Integration tests (100+ tests)
├── validator.bench.ts       # Performance benchmarks
├── validation-tests-summary.md  # This summary
└── TESTING.md              # Test documentation
```

## Running Tests

### All validation tests

```bash
# From repository root
npm test -w @atakora/component -- src/validation

# From component package
cd packages/component
npm test -- src/validation
```

### Specific test file

```bash
npm test -- src/validation/errors.spec.ts
npm test -- src/validation/rules.spec.ts
npm test -- src/validation/validator.spec.ts
npm test -- src/validation/index.spec.ts
```

### With coverage

```bash
npm test -- --coverage src/validation
```

### Watch mode (during development)

```bash
npm test -- --watch src/validation
```

### Performance benchmarks

```bash
npx vitest bench src/validation/validator.bench.ts
```

## Test Coverage

### errors.spec.ts (235 tests)

**FieldError Interface (4 tests)**

- Correct structure validation
- Optional context support
- Nested field path handling
- Array field path handling

**ValidationError Class (40+ tests)**

- Constructor with single/multiple errors
- HTTP 400 status code
- JSON serialization (`toJSON()`)
- Field error queries (`getFieldErrors()`, `hasFieldError()`)
- Error message formatting
- Nested and array path handling

**Error Utilities**

- `createFieldError()` - Field error creation (5 tests)
- `formatPath()` - Path formatting (10 tests)
  - Simple: `"email"`
  - Nested: `"user.address.city"`
  - Array: `"items[0].name"`
  - Mixed: `"users[0].addresses[1].street"`
- `mapZodErrorType()` - Zod error mapping (9 tests)

**Edge Cases (10+ tests)**

- Empty fields and messages
- Very long paths (100+ segments)
- Unicode characters
- Error inheritance and prototype chain

### rules.spec.ts (150+ tests)

**String Rules (30+ tests)**

```typescript
// Email validation
stringRules.email();
// Valid: "test@example.com", "user.name@domain.co.uk"
// Invalid: "not-an-email", "@example.com", "user@"

// URL validation
stringRules.url();
// Valid: "https://example.com", "http://localhost:3000"
// Invalid: "not-a-url", "example.com"

// Pattern matching
stringRules.regex(/^[A-Z]+$/, 'Must be uppercase');

// Length constraints
stringRules.minLength(5);
stringRules.maxLength(100);
stringRules.length(10);

// Transformations
stringRules.trim();
stringRules.lowercase();
stringRules.uppercase();
```

**Number Rules (35+ tests)**

```typescript
// Range validation
numberRules.min(0);
numberRules.max(100);
numberRules.greaterThan(0);
numberRules.lessThan(100);

// Type constraints
numberRules.integer();
numberRules.positive();
numberRules.negative();
numberRules.nonNegative();
numberRules.nonPositive();

// Special validations
numberRules.multipleOf(5);
numberRules.finite();
numberRules.safe();
```

**Date Rules (20+ tests)**

```typescript
// Range validation
dateRules.min(new Date('2020-01-01'));
dateRules.max(new Date('2025-12-31'));

// Temporal validation
dateRules.future();
dateRules.past();
dateRules.todayOrFuture();
dateRules.between(minDate, maxDate);
```

**Array Rules (20+ tests)**

```typescript
// Size constraints
arrayRules.minItems(1);
arrayRules.maxItems(10);
arrayRules.length(5);
arrayRules.nonEmpty();

// Uniqueness with custom comparator
arrayRules.unique((a, b) => a.id === b.id);
```

**Custom Rules (10+ tests)**

```typescript
// Sync validator
customRule((val: string) => val.startsWith('test_'), 'Must start with test_');

// Async validator
customRule(async (val: string) => {
  await validateRemote(val);
  return true;
}, 'Remote validation failed');

// Combine multiple rules
combine(rule1, rule2, rule3);
```

### validator.spec.ts (200+ tests)

**Field Type Conversion (40+ tests)**

```typescript
// Basic types
{ type: 'string', required: true }
{ type: 'number', required: true }
{ type: 'boolean', required: true }
{ type: 'date', required: true }
{ type: 'datetime', required: true }
{ type: 'json', required: true }
{ type: 'array', required: true }
{ type: 'object', required: true }

// Special types
{ type: 'email', required: true }
{ type: 'url', required: true }
{ type: 'uuid', required: true }

// Enum
{
  type: 'enum',
  required: true,
  validations: [
    { type: 'format', value: ['red', 'green', 'blue'] }
  ]
}

// Optional vs required
{ type: 'string', required: false }
{ type: 'string', required: true }

// Nullable
{ type: 'string', nullable: true }

// Default values
{ type: 'string', default: 'default value' }
```

**Validation Functions (40+ tests)**

```typescript
// Field validation
const result = validateField({ type: 'email', required: true }, 'test@example.com', 'email');
// result.success === true
// result.data === 'test@example.com'

// Schema validation
const schema = {
  name: { type: 'string', required: true },
  age: { type: 'number', required: true },
};
const result = validateSchema(schema, { name: 'John', age: 30 });

// Validate with error throwing
try {
  const data = validate(schema, invalidData);
} catch (error) {
  // error instanceof ValidationError
  // error.statusCode === 400
  // error.errors: FieldError[]
}

// Model input validation (CRUD)
validateModelInput(schema, data, 'create'); // All required
validateModelInput(schema, data, 'update'); // All optional

// Function validation
const { input, output } = validateFunction(inputSchema, outputSchema, inputData, outputData);

// Event validation
validateEvent(eventSchema, payload);

// Partial validation
validatePartial(schema, { name: 'John' }); // Only validates provided fields

// Array validation
validateArray(itemSchema, [item1, item2, item3]);
// Returns errors with indices: "[0].field", "[1].field"
```

**Validator Factories**

```typescript
// Reusable validator
const validateEmail = createValidator({
  email: { type: 'email', required: true },
});

// Use multiple times (cached compilation)
validateEmail({ email: 'test1@example.com' });
validateEmail({ email: 'test2@example.com' });

// Async validator
const validateAsync = createAsyncValidator(schema);
await validateAsync(data);
```

**Performance Tests (3 tests)**

- 1000 simple validations in <100ms
- 1000 schema validations in <200ms
- 100-field schema in <100ms

### index.spec.ts (100+ integration tests)

**Complete Workflows**

```typescript
// User registration
const schema = {
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

const result = validateSchema(schema, {
  email: 'user@example.com',
  password: 'SecurePassword123',
  age: 25,
});
// result.success === true
```

**Model CRUD**

```typescript
// Create: all required fields must be present
const createResult = validateModelInput(userSchema, data, 'create');

// Update: all fields optional
const updateResult = validateModelInput(userSchema, { name: 'New Name' }, 'update');
```

**Custom Business Logic**

```typescript
const schema = {
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
        message: 'Only lowercase letters, numbers, and underscores',
      },
    ],
  },
};
```

**E-commerce Order Example**

```typescript
const orderSchema = {
  orderId: { type: 'uuid', required: true },
  customerId: { type: 'uuid', required: true },
  status: {
    type: 'enum',
    required: true,
    validations: [{ type: 'format', value: ['pending', 'processing', 'completed', 'cancelled'] }],
  },
  totalAmount: {
    type: 'number',
    required: true,
    validations: [{ type: 'positive' }],
  },
  items: {
    type: 'array',
    required: true,
    validations: [{ type: 'minItems', value: 1 }],
  },
  shippingAddress: { type: 'object', required: true },
  createdAt: { type: 'datetime', required: true },
};
```

## Performance Benchmarks

Run benchmarks: `npx vitest bench src/validation/validator.bench.ts`

**Expected Results:**

- Simple field validation: <0.05ms (50 microseconds)
- Simple schema (3 fields): <0.1ms
- Complex schema (7 fields): <0.2ms
- Large schema (100 fields): <2ms
- Array validation (10 items): <0.5ms
- Array validation (100 items): <5ms

**Optimization Tips:**

```typescript
// ❌ Slow: Recompiles schema every time
for (const item of items) {
  validateSchema(schema, item);
}

// ✅ Fast: Compile once, reuse validator
const validator = createValidator(schema);
for (const item of items) {
  validator(item);
}
```

## Test Patterns

### Happy Path Testing

```typescript
it('should validate valid email', () => {
  const result = validateField({ type: 'email', required: true }, 'test@example.com', 'email');

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data).toBe('test@example.com');
  }
});
```

### Error Testing

```typescript
it('should return error for invalid email', () => {
  const result = validateField({ type: 'email', required: true }, 'not-an-email', 'email');

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('email');
    expect(result.errors[0].type).toBe('format');
  }
});
```

### Exception Testing

```typescript
it('should throw ValidationError', () => {
  try {
    validate(schema, invalidData);
    expect.fail('Should have thrown');
  } catch (error) {
    expect(error).toBeInstanceOf(ValidationError);
    if (error instanceof ValidationError) {
      expect(error.statusCode).toBe(400);
      expect(error.errors.length).toBeGreaterThan(0);
    }
  }
});
```

### Type Safety Testing

```typescript
it('should infer correct types', () => {
  const result = validateSchema<{ name: string; age: number }>(schema, data);

  if (result.success) {
    // TypeScript knows these types
    const name: string = result.data.name;
    const age: number = result.data.age;
  }
});
```

## Coverage Report

Run coverage: `npm test -- --coverage src/validation`

**Expected Coverage:**

```
File            | % Stmts | % Branch | % Funcs | % Lines
----------------|---------|----------|---------|--------
errors.ts       |   98.5  |   95.2   |  100.0  |   98.5
rules.ts        |   96.8  |   91.4   |  100.0  |   96.8
validator.ts    |   94.2  |   89.6   |  100.0  |   94.2
index.ts        |  100.0  |  100.0   |  100.0  |  100.0
----------------|---------|----------|---------|--------
All files       |   95.4  |   91.2   |  100.0  |   95.4
```

## Common Test Scenarios

### 1. User Registration

```typescript
const registrationSchema = {
  email: { type: 'email', required: true },
  password: {
    type: 'string',
    required: true,
    validations: [
      { type: 'minLength', value: 8 },
      {
        type: 'custom',
        validator: (val: string) => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(val),
        message: 'Must contain uppercase, lowercase, and digit',
      },
    ],
  },
  age: {
    type: 'number',
    required: true,
    validations: [{ type: 'min', value: 18 }, { type: 'integer' }],
  },
  termsAccepted: { type: 'boolean', required: true },
};
```

### 2. Profile Update

```typescript
const profileSchema = {
  name: { type: 'string', required: true },
  bio: { type: 'string', required: false },
  website: { type: 'url', required: false },
  avatar: { type: 'url', required: false },
};

// Partial update
validatePartial(profileSchema, { bio: 'New bio' });
```

### 3. API Request Validation

```typescript
const requestSchema = {
  method: { type: 'string', required: true },
  endpoint: { type: 'url', required: true },
  headers: { type: 'object', required: false },
  body: { type: 'json', required: false },
};

const responseSchema = {
  statusCode: {
    type: 'number',
    required: true,
    validations: [{ type: 'integer' }],
  },
  body: { type: 'json', required: false },
};
```

### 4. Event Validation

```typescript
const eventSchema = {
  eventType: { type: 'string', required: true },
  aggregateId: { type: 'uuid', required: true },
  timestamp: { type: 'datetime', required: true },
  payload: { type: 'json', required: true },
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
```

## Debugging Failed Tests

### View detailed errors

```bash
npm test -- --reporter=verbose src/validation
```

### Run single test

```typescript
it.only('should validate email', () => {
  // This test will run in isolation
});
```

### Skip test

```typescript
it.skip('temporarily disabled', () => {
  // This test will be skipped
});
```

### Debug with Node inspector

```bash
node --inspect-brk ./node_modules/.bin/vitest run src/validation
```

## Contributing Tests

### Adding new validation rule tests

1. Add test to appropriate section in `rules.spec.ts`
2. Test both valid and invalid cases
3. Test edge cases (empty, null, very large values)
4. Verify error messages are clear

### Adding new validator tests

1. Add test to `validator.spec.ts`
2. Test field type conversion
3. Test validation application
4. Test error path formatting
5. Add integration test to `index.spec.ts`

### Test Checklist

- [ ] Happy path (valid data passes)
- [ ] Error cases (invalid data fails with correct errors)
- [ ] Edge cases (boundary values, empty, null, undefined)
- [ ] Multiple errors returned correctly
- [ ] Error messages are clear and actionable
- [ ] Type safety verified
- [ ] Performance acceptable (<100ms for complex schemas)

## Maintenance

### Updating tests after API changes

1. Run tests: `npm test src/validation`
2. Fix failing tests
3. Add new tests for new features
4. Verify coverage: `npm test -- --coverage src/validation`
5. Update documentation

### Keeping tests fast

- Use `it.concurrent` for independent tests
- Avoid expensive setup in `beforeEach`
- Mock expensive operations
- Use snapshot testing sparingly

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Zod Documentation](https://zod.dev/)
- [Test-Driven Development Guide](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [JavaScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
