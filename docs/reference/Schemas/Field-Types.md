# Field Types API Reference

The field type system provides a fluent API for defining schema fields with validation. This reference documents all available field types and their methods.

## Overview

All field types support:

- **Required/Optional modifiers**: `.required()`, `.optional()`
- **Default values**: `.default(value)`
- **Nullable support**: `.nullable()`
- **Custom validation**: `.custom(validator, message)`
- **Method chaining**: All methods return `this` for fluent API

## Available Field Types

### String Fields

```typescript
import { a } from '@atakora/component/schema';

// Basic string
const name = a.string().required();

// Email validation
const email = a.string().required().email();

// URL validation
const website = a.string().url();

// Length constraints
const username = a.string().min(3).max(20).required();

// Pattern matching
const zipCode = a.string().regex(/^\d{5}(-\d{4})?$/);

// UUID validation
const correlationId = a.string().uuid();

// Phone number validation
const phone = a.string().phone();
```

#### String Methods

- `email()` - Validates email format
- `url()` - Validates URL format
- `uuid()` - Validates UUID format
- `phone()` - Validates phone number format
- `min(length)` - Minimum string length
- `max(length)` - Maximum string length
- `minLength(length)` - Alias for min
- `maxLength(length)` - Alias for max
- `regex(pattern)` - Pattern matching
- `pattern(pattern)` - Alias for regex

### Number Fields

```typescript
// Basic number
const count = a.number().required();

// With constraints
const age = a.number().min(0).max(120);

// Integer only
const quantity = a.number().integer().positive();

// Positive decimal
const price = a.number().positive().min(0.01);

// Percentage
const percentage = a.number().min(0).max(100);
```

#### Number Methods

- `min(value)` - Minimum value
- `max(value)` - Maximum value
- `integer()` - Integer values only
- `positive()` - Positive values only
- `negative()` - Negative values only
- `nonNegative()` - Zero or positive
- `nonPositive()` - Zero or negative

### Boolean Fields

```typescript
// With default value
const isActive = a.boolean().default(true);

// Required boolean
const agreedToTerms = a.boolean().required();

// Optional boolean
const receiveNewsletter = a.boolean().optional();
```

### DateTime Fields

```typescript
// Basic datetime (ISO 8601 strings)
const createdAt = a.datetime().required();

// Future date only
const scheduledFor = a.datetime().future();

// Past date only
const birthDate = a.datetime().past();

// Date range
const eventDate = a.datetime()
  .min(new Date('2024-01-01'))
  .max(new Date('2024-12-31'));

// Nullable datetime
const deletedAt = a.datetime().nullable();
```

#### DateTime Methods

- `min(date)` - Minimum date
- `max(date)` - Maximum date
- `future()` - Must be future date
- `past()` - Must be past date

### ID Fields

```typescript
// Auto-generated ID
const id = a.id();

// ID with prefix (generates: user_abc123xyz)
const userId = a.id().prefix('user');

// Manual ID (not auto-generated)
const externalId = a.id().manual().required();
```

#### ID Methods

- `prefix(prefix)` - Add prefix to generated IDs
- `manual()` - Disable auto-generation
- `auto()` - Enable auto-generation (default)

### Enum Fields

```typescript
// Basic enum
const status = a.enum(['pending', 'active', 'archived']);

// With default value
const role = a.enum(['user', 'admin', 'analyst']).default('user');

// Required enum
const priority = a.enum(['low', 'medium', 'high', 'critical']).required();
```

### Array Fields

```typescript
// Array of strings
const tags = a.array(a.string()).default([]);

// Array with constraints
const emails = a.array(a.string().email()).minItems(1).maxItems(5);

// Array with unique items
const userIds = a.array(a.string()).unique();

// Non-empty array
const categories = a.array(a.string()).nonEmpty();
```

#### Array Methods

- `minItems(count)` - Minimum array length
- `maxItems(count)` - Maximum array length
- `unique()` - Enforce unique items
- `nonEmpty()` - Must have at least one item

### Reference Fields

```typescript
// Basic reference (foreign key)
const projectId = a.ref('Project').required();

// Reference with cascade delete
const ownerId = a.ref('User').onDelete('cascade');

// Optional reference
const parentId = a.ref('Category').optional();

// Reference with set_null behavior
const managerId = a.ref('User').onDelete('set_null').nullable();
```

#### Reference Methods

- `onDelete(action)` - Behavior on referenced record deletion
  - `'cascade'` - Delete this record too
  - `'restrict'` - Prevent deletion if referenced
  - `'set_null'` - Set to null (requires nullable)

### Object Fields

```typescript
// Nested object with schema
const address = a.object({
  street: a.string().required(),
  city: a.string().required(),
  state: a.string().required(),
  zip: a.string().required(),
});

// Nested settings
const settings = a
  .object({
    theme: a.enum(['light', 'dark']).default('light'),
    notifications: a.object({
      email: a.boolean().default(true),
      sms: a.boolean().default(false),
    }),
  })
  .default({});
```

### JSON Fields

```typescript
// Unstructured JSON
const metadata = a.json().default({});

// Optional JSON
const preferences = a.json().optional();

// Object-only JSON
const config = a.json().objectOnly();

// Array-only JSON
const data = a.json().arrayOnly();
```

#### JSON Methods

- `objectOnly()` - Accept only JSON objects
- `arrayOnly()` - Accept only JSON arrays

### Binary Fields

```typescript
// Basic binary field
const file = a.binary().required();

// Image with size limit (10MB)
const image = a
  .binary()
  .maxSize(10 * 1024 * 1024)
  .mimeTypes(['image/png', 'image/jpeg', 'image/gif']);

// PDF only with size limit (5MB)
const document = a
  .binary()
  .mimeTypes(['application/pdf'])
  .maxSize(5 * 1024 * 1024);
```

#### Binary Methods

- `maxSize(bytes)` - Maximum file size in bytes
- `mimeTypes(types)` - Allowed MIME types

## Type Inference

All field types support TypeScript type inference:

```typescript
import { a, type InferFieldType, type InferFieldTypes } from '@atakora/component/schema';

// Single field type inference
const email = a.string().required().email();
type EmailType = InferFieldType<typeof email>; // string

const status = a.enum(['pending', 'active', 'archived']);
type StatusType = InferFieldType<typeof status>; // 'pending' | 'active' | 'archived'

// Multiple fields type inference
const userFields = {
  id: a.id(),
  email: a.string().required().email(),
  role: a.enum(['user', 'admin']).default('user'),
  age: a.number().min(0).max(120),
};

type UserType = InferFieldTypes<typeof userFields>;
// {
//   id: string;
//   email: string;
//   role: 'user' | 'admin';
//   age: number;
// }
```

## Common Modifiers

All field types support these modifiers:

### Required/Optional

```typescript
// Required field (must be provided)
const name = a.string().required();

// Optional field (can be undefined)
const nickname = a.string().optional();
```

### Default Values

```typescript
// Provide default value
const status = a.enum(['active', 'inactive']).default('active');
const tags = a.array(a.string()).default([]);
const settings = a.json().default({});
```

### Nullable

```typescript
// Allow null as a value
const deletedAt = a.datetime().nullable();
const parentId = a.ref('Category').nullable();
```

### Custom Validation

```typescript
// Add custom validation
const age = a.number()
  .custom((value) => value >= 18, 'Must be 18 or older')
  .custom((value) => value <= 100, 'Must be 100 or younger');

const email = a.string()
  .email()
  .custom((value) => !value.endsWith('@example.com'),
          'Example emails not allowed');
```

## Complete Example

```typescript
import { a, type InferFieldTypes } from '@atakora/component/schema';

// Define a user model
const userModel = {
  // Identity
  id: a.id(),
  email: a.string().required().email(),
  username: a.string().required().min(3).max(20),

  // Profile
  firstName: a.string().required(),
  lastName: a.string().required(),
  bio: a.string().max(500),
  avatar: a.string().url(),

  // Status
  role: a.enum(['user', 'admin', 'analyst']).default('user'),
  isActive: a.boolean().default(true),

  // Settings
  preferences: a
    .object({
      theme: a.enum(['light', 'dark', 'auto']).default('auto'),
      notifications: a.object({
        email: a.boolean().default(true),
        sms: a.boolean().default(false),
      }),
    })
    .default({}),

  // Metadata
  tags: a.array(a.string()).default([]),
  metadata: a.json().default({}),

  // Relationships
  organizationId: a.ref('Organization').required(),

  // Timestamps
  createdAt: a.datetime().required(),
  updatedAt: a.datetime().required(),
  lastLoginAt: a.datetime(),
};

// Infer TypeScript type
type User = InferFieldTypes<typeof userModel>;
```

## Implementation Details

### Base Field Builder

All field types extend `BaseFieldBuilder<TValue, TConfig>` which provides:

- Common modifiers (`.required()`, `.optional()`, `.nullable()`, `.default()`)
- Custom validation support
- Configuration building via `._build()`
- Type information via `._getType()`

### Validation Rules

Validation rules are stored in the `validations` array on the field configuration. Each rule has:

- `type`: The validation type (e.g., 'required', 'email', 'min', 'max')
- `message`: Optional custom error message
- Additional properties specific to the validation type

### Method Chaining

All field type methods return `this` to enable method chaining:

```typescript
const email = a
  .string()
  .required()     // returns this
  .email()        // returns this
  .maxLength(255); // returns this
```

## Best Practices

1. **Use appropriate field types** - Don't use strings for numbers or dates
2. **Add validation constraints** - Prevent invalid data at the schema level
3. **Provide defaults where appropriate** - Reduce boilerplate in client code
4. **Use enums for fixed sets** - Better type safety than strings
5. **Document complex validations** - Add comments explaining business rules
6. **Use references for relationships** - Maintain data integrity
7. **Consider nullable vs optional** - They have different meanings