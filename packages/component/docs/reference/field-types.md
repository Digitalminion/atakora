# Field Types Reference

> Complete reference for all available field types and their validation options

## Overview

The Atakora Component schema system provides 11 field types to model different kinds of data. Each field type has specific validation options and modifiers to ensure data integrity.

### Available Field Types

| Field Type       | Purpose            | Example Use Case                 |
| ---------------- | ------------------ | -------------------------------- |
| `a.string()`     | Text data          | Names, emails, URLs              |
| `a.number()`     | Numeric values     | Ages, prices, quantities         |
| `a.boolean()`    | True/false values  | Flags, toggles, status           |
| `a.datetime()`   | Timestamps         | Created dates, scheduled times   |
| `a.id()`         | Auto-generated IDs | Primary keys, unique identifiers |
| `a.enum([])`     | Predefined values  | Status, role, priority           |
| `a.array(type)`  | Lists of items     | Tags, categories, emails         |
| `a.ref('Model')` | Model references   | User ID, project ID, parent ID   |
| `a.object({})`   | Nested objects     | Addresses, settings, metadata    |
| `a.json()`       | Unstructured JSON  | Dynamic config, raw data         |
| `a.binary()`     | File uploads       | Images, PDFs, documents          |

### Common Modifiers

All field types support these modifiers:

- `.required()` - Field must have a value
- `.optional()` - Field can be omitted (default behavior)
- `.nullable()` - Field can be explicitly null
- `.default(value)` - Provide a default value
- `.readOnly()` - Field cannot be set by users
- `.writeOnce()` - Field can only be set during creation

## String Fields

String fields store text data with optional format validation and length constraints.

### Basic Usage

```typescript
import { a } from '@atakora/component';

// Simple string
name: a.string();

// Required string
email: a.string().required();

// With default value
country: a.string().default('USA');
```

### Validation Methods

#### `.email()`

Validates email format (user@domain.com):

```typescript
email: a.string().required().email();

// Valid: "user@example.com"
// Invalid: "not-an-email", "@example.com", "user@"
```

#### `.url()`

Validates URL format (http:// or https://):

```typescript
website: a.string().url();

// Valid: "https://example.com", "http://api.example.com/v1"
// Invalid: "example.com", "ftp://example.com"
```

#### `.uuid()`

Validates UUID v4 format:

```typescript
correlationId: a.string().uuid();

// Valid: "550e8400-e29b-41d4-a716-446655440000"
// Invalid: "not-a-uuid", "123-456"
```

#### `.phone()`

Validates international phone number format:

```typescript
phoneNumber: a.string().phone();

// Valid: "+14155552671", "+442071234567"
// Invalid: "123-4567", "not-a-phone"
```

#### `.min(length)` / `.max(length)`

Sets minimum and maximum character length:

```typescript
// Minimum 3 characters
username: a.string().min(3);

// Maximum 500 characters
bio: a.string().max(500);

// Between 8 and 20 characters
password: a.string().min(8).max(20);
```

#### `.regex(pattern, message?)`

Validates against a custom regular expression:

```typescript
// Postal code format
zipCode: a.string().regex(/^\d{5}(-\d{4})?$/);

// With custom error message
productCode: a.string().regex(/^[A-Z]{3}-\d{4}$/, 'Must be format ABC-1234');

// Alphanumeric usernames
username: a.string().regex(/^[a-zA-Z0-9_]+$/);
```

### Real-World Examples

#### User Profile Fields

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email().max(255),
  firstName: a.string().required().min(1).max(100),
  lastName: a.string().required().min(1).max(100),
  phoneNumber: a.string().phone().optional(),
  website: a.string().url().optional(),
  bio: a.string().max(500).optional(),
});
```

#### Product Fields

```typescript
Product: c.model({
  id: a.id(),
  sku: a
    .string()
    .required()
    .regex(/^[A-Z]{3}-\d{6}$/),
  name: a.string().required().min(1).max(200),
  description: a.string().max(2000).optional(),
  brand: a.string().max(100).optional(),
});
```

## Number Fields

Number fields store numeric values with optional range and type constraints.

### Basic Usage

```typescript
// Simple number
count: a.number();

// Required number
age: a.number().required();

// With default value
credits: a.number().default(0);
```

### Validation Methods

#### `.min(value)` / `.max(value)`

Sets minimum and maximum values:

```typescript
// Minimum 0
age: a.number().min(0);

// Maximum 100
percentage: a.number().max(100);

// Between 1 and 5
rating: a.number().min(1).max(5);
```

#### `.integer()`

Requires whole numbers only (no decimals):

```typescript
// Integer quantity
quantity: a.number().integer();

// Year (integer with range)
year: a.number().integer().min(1900).max(2100);

// Item count
itemCount: a.number().integer().min(0);
```

#### `.positive()`

Requires values greater than zero:

```typescript
// Positive price
price: a.number().positive();

// Positive integer
stockQuantity: a.number().integer().positive();
```

#### `.negative()`

Requires values less than zero:

```typescript
// Negative adjustment
adjustment: a.number().negative();

// Temperature below freezing
temperature: a.number().negative();
```

### Real-World Examples

#### Product Pricing

```typescript
Product: c.model({
  id: a.id(),
  name: a.string().required(),
  price: a.number().positive().required(),
  discount: a.number().min(0).max(100).default(0), // Percentage
  stockQuantity: a.number().integer().min(0).default(0),
  weight: a.number().positive().optional(), // In kg
});
```

#### Analytics Metrics

```typescript
Metrics: c.model({
  id: a.id(),
  pageViews: a.number().integer().min(0).default(0),
  bounceRate: a.number().min(0).max(100), // Percentage
  avgSessionDuration: a.number().positive(), // In seconds
  conversionRate: a.number().min(0).max(100),
});
```

## Boolean Fields

Boolean fields store true/false values.

### Basic Usage

```typescript
// Simple boolean
isActive: a.boolean();

// With default value
isVerified: a.boolean().default(false);

// Required boolean
agreedToTerms: a.boolean().required();
```

### Real-World Examples

#### User Settings

```typescript
UserSettings: c.model({
  id: a.id(),
  userId: a.ref('User').required(),
  emailNotifications: a.boolean().default(true),
  smsNotifications: a.boolean().default(false),
  darkMode: a.boolean().default(false),
  twoFactorEnabled: a.boolean().default(false),
});
```

#### Feature Flags

```typescript
FeatureFlags: c.model({
  id: a.id(),
  newDashboard: a.boolean().default(false),
  betaFeatures: a.boolean().default(false),
  maintenanceMode: a.boolean().default(false),
});
```

## DateTime Fields

DateTime fields store ISO 8601 timestamp strings.

### Basic Usage

```typescript
// Simple datetime
createdAt: a.datetime();

// Required datetime
scheduledFor: a.datetime().required();

// With default (current time)
timestamp: a.datetime().default(() => new Date().toISOString());
```

### Validation Methods

#### `.future()`

Requires dates in the future:

```typescript
// Future dates only
expiresAt: a.datetime().future();

// Future appointment
appointmentDate: a.datetime().required().future();
```

#### `.past()`

Requires dates in the past:

```typescript
// Past dates only
birthDate: a.datetime().past();

// Historical event
occurredAt: a.datetime().required().past();
```

#### `.min(date)` / `.max(date)`

Sets date range constraints:

```typescript
// After specific date
startDate: a.datetime().min('2025-01-01T00:00:00Z');

// Before specific date
endDate: a.datetime().max('2025-12-31T23:59:59Z');

// Within range
eventDate: a.datetime().min('2025-06-01T00:00:00Z').max('2025-06-30T23:59:59Z');
```

### Real-World Examples

#### Event Management

```typescript
Event: c.model({
  id: a.id(),
  name: a.string().required(),
  startDate: a.datetime().required().future(),
  endDate: a.datetime().required().future(),
  createdAt: a.datetime().required(),
  updatedAt: a.datetime().optional(),
});
```

#### User Activity

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  birthDate: a.datetime().past().optional(),
  createdAt: a.datetime().required(),
  lastLoginAt: a.datetime().optional(),
  emailVerifiedAt: a.datetime().optional(),
});
```

## ID Fields

ID fields are auto-generated unique identifiers.

### Basic Usage

```typescript
// Auto-generated ID
id: a.id();

// With custom prefix
id: a.id().prefix('user'); // Generates: user_abc123xyz

// Auto-increment ID (for legacy systems)
id: a.id().autoIncrement();
```

### Real-World Examples

```typescript
User: c.model({
  id: a.id().prefix('usr'), // usr_randomstring
  email: a.string().required().email(),
  name: a.string().required(),
});

Product: c.model({
  id: a.id().prefix('prod'), // prod_randomstring
  sku: a.string().required(),
  name: a.string().required(),
});
```

## Enum Fields

Enum fields restrict values to a predefined set of strings.

### Basic Usage

```typescript
// Simple enum
status: a.enum(['pending', 'active', 'archived']);

// With default value
role: a.enum(['user', 'admin', 'analyst']).default('user');

// Required enum
priority: a.enum(['low', 'medium', 'high']).required();
```

### Real-World Examples

#### User Roles and Status

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  role: a.enum(['user', 'admin', 'analyst', 'viewer']).default('user'),
  status: a.enum(['pending', 'active', 'suspended', 'deleted']).default('pending'),
});
```

#### Order Processing

```typescript
Order: c.model({
  id: a.id(),
  orderNumber: a.string().required(),
  status: a.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).default('pending'),
  priority: a.enum(['standard', 'express', 'overnight']).default('standard'),
});
```

#### Content Management

```typescript
Article: c.model({
  id: a.id(),
  title: a.string().required(),
  status: a.enum(['draft', 'review', 'published', 'archived']).default('draft'),
  visibility: a.enum(['public', 'private', 'unlisted']).default('private'),
});
```

## Array Fields

Array fields contain multiple values of a specific type.

### Basic Usage

```typescript
// Array of strings
tags: a.array(a.string());

// Array with default empty array
categories: a.array(a.string()).default([]);

// Required array
emails: a.array(a.string().email()).required();
```

### Validation Methods

#### `.minItems(count)` / `.maxItems(count)`

Sets minimum and maximum array size:

```typescript
// At least 1 item
tags: a.array(a.string()).minItems(1);

// Maximum 10 items
categories: a.array(a.string()).maxItems(10);

// Between 1 and 5 items
phoneNumbers: a.array(a.string().phone()).minItems(1).maxItems(5);
```

#### `.unique()`

Requires all items to be unique (no duplicates):

```typescript
// Unique user IDs
userIds: a.array(a.string()).unique();

// Unique tags
tags: a.array(a.string()).unique();
```

#### `.nonEmpty()`

Shorthand for `.minItems(1)`:

```typescript
// Must have at least one item
tags: a.array(a.string()).nonEmpty();
```

### Real-World Examples

#### Product Tags

```typescript
Product: c.model({
  id: a.id(),
  name: a.string().required(),
  tags: a.array(a.string()).unique().default([]),
  categories: a.array(a.string()).minItems(1).maxItems(5),
  images: a.array(a.string().url()).maxItems(10).default([]),
});
```

#### User Roles and Permissions

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  roles: a.array(a.enum(['admin', 'editor', 'viewer'])).default(['viewer']),
  permissions: a.array(a.string()).unique().default([]),
  emailAddresses: a.array(a.string().email()).minItems(1).maxItems(3),
});
```

## Reference Fields

Reference fields store the ID of another model (foreign key relationships).

### Basic Usage

```typescript
// Basic reference
userId: a.ref('User').required();

// Optional reference
parentId: a.ref('Category').optional();

// Reference with delete behavior
projectId: a.ref('Project').onDelete('cascade');
```

### Delete Behaviors

#### `onDelete('cascade')`

Delete this record when the referenced record is deleted:

```typescript
Comment: c.model({
  id: a.id(),
  userId: a.ref('User').onDelete('cascade'), // Delete comment when user deleted
  text: a.string().required(),
});
```

#### `onDelete('set_null')`

Set this field to null when the referenced record is deleted:

```typescript
Task: c.model({
  id: a.id(),
  assignedTo: a.ref('User').onDelete('set_null').nullable(), // Set to null when user deleted
  title: a.string().required(),
});
```

#### `onDelete('restrict')`

Prevent deletion of referenced record if this field references it:

```typescript
Invoice: c.model({
  id: a.id(),
  customerId: a.ref('Customer').onDelete('restrict'), // Can't delete customer with invoices
  amount: a.number().positive().required(),
});
```

### Real-World Examples

#### Blog System

```typescript
Post: c.model({
  id: a.id(),
  authorId: a.ref('User').required().onDelete('restrict'), // Can't delete author with posts
  categoryId: a.ref('Category').optional().onDelete('set_null'),
  title: a.string().required(),
  content: a.string().required(),
});

Comment: c.model({
  id: a.id(),
  postId: a.ref('Post').required().onDelete('cascade'), // Delete comments with post
  userId: a.ref('User').required().onDelete('cascade'), // Delete comments when user deleted
  text: a.string().required(),
});
```

#### E-Commerce

```typescript
Order: c.model({
  id: a.id(),
  customerId: a.ref('Customer').required().onDelete('restrict'),
  addressId: a.ref('Address').optional().onDelete('set_null'),
  status: a.enum(['pending', 'processing', 'shipped', 'delivered']).default('pending'),
});

OrderItem: c.model({
  id: a.id(),
  orderId: a.ref('Order').required().onDelete('cascade'),
  productId: a.ref('Product').required().onDelete('restrict'),
  quantity: a.number().integer().positive().required(),
});
```

## Object Fields

Object fields have a defined schema for nested properties.

### Basic Usage

```typescript
// Simple object
address: a.object({
  street: a.string().required(),
  city: a.string().required(),
  state: a.string().required(),
  zip: a.string().required(),
});

// Object with default value
settings: a.object({
  theme: a.enum(['light', 'dark']).default('light'),
  notifications: a.boolean().default(true),
}).default({});
```

### Real-World Examples

#### User Address

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  shippingAddress: a
    .object({
      street: a.string().required(),
      city: a.string().required(),
      state: a.string().required(),
      zipCode: a
        .string()
        .regex(/^\d{5}(-\d{4})?$/)
        .required(),
      country: a.string().default('USA'),
    })
    .optional(),
  billingAddress: a
    .object({
      street: a.string().required(),
      city: a.string().required(),
      state: a.string().required(),
      zipCode: a.string().required(),
    })
    .optional(),
});
```

#### Product Dimensions

```typescript
Product: c.model({
  id: a.id(),
  name: a.string().required(),
  dimensions: a
    .object({
      length: a.number().positive().required(),
      width: a.number().positive().required(),
      height: a.number().positive().required(),
      unit: a.enum(['cm', 'in']).default('cm'),
    })
    .optional(),
  weight: a
    .object({
      value: a.number().positive().required(),
      unit: a.enum(['kg', 'lb']).default('kg'),
    })
    .optional(),
});
```

## JSON Fields

JSON fields store unstructured or dynamic JSON data.

### Basic Usage

```typescript
// Simple JSON field
metadata: a.json();

// With default empty object
config: a.json().default({});

// Object-only JSON (not arrays or primitives)
settings: a.json().objectOnly();
```

### When to Use

Use `a.json()` when:

- The structure is truly dynamic and unpredictable
- You're storing third-party data with varying schemas
- The data changes frequently and schema updates are impractical

Use `a.object()` when:

- You know the structure in advance
- You want validation on nested fields
- You need TypeScript type safety

### Real-World Examples

#### Dynamic Metadata

```typescript
Product: c.model({
  id: a.id(),
  name: a.string().required(),
  // Structured data - use object
  pricing: a.object({
    basePrice: a.number().positive().required(),
    currency: a.string().default('USD'),
  }),
  // Unstructured data - use JSON
  metadata: a.json().default({}), // Could be anything
  customAttributes: a.json().objectOnly().optional(),
});
```

#### Integration Data

```typescript
WebhookEvent: c.model({
  id: a.id(),
  source: a.string().required(),
  eventType: a.string().required(),
  // Payload structure varies by event type
  payload: a.json().required(),
  headers: a.json().objectOnly().optional(),
});
```

## Binary Fields

Binary fields are used for file uploads and binary data.

### Basic Usage

```typescript
// Simple binary field
file: a.binary();

// Required file
avatar: a.binary().required();

// With size limit (10MB)
document: a.binary().maxSize(10 * 1024 * 1024);
```

### Validation Methods

#### `.maxSize(bytes)`

Sets maximum file size in bytes:

```typescript
// 5MB limit
avatar: a.binary().maxSize(5 * 1024 * 1024);

// 100MB limit
video: a.binary().maxSize(100 * 1024 * 1024);
```

#### `.mimeTypes(types)`

Restricts allowed MIME types:

```typescript
// Images only
avatar: a.binary()
  .mimeTypes(['image/png', 'image/jpeg', 'image/gif'])
  .maxSize(5 * 1024 * 1024);

// PDF only
document: a.binary()
  .mimeTypes(['application/pdf'])
  .maxSize(10 * 1024 * 1024);

// Videos
video: a.binary()
  .mimeTypes(['video/mp4', 'video/quicktime'])
  .maxSize(100 * 1024 * 1024);
```

### Real-World Examples

#### User Profile

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  avatar: a
    .binary()
    .mimeTypes(['image/png', 'image/jpeg'])
    .maxSize(5 * 1024 * 1024)
    .optional(),
});
```

#### Document Management

```typescript
Document: c.model({
  id: a.id(),
  title: a.string().required(),
  fileType: a.enum(['pdf', 'word', 'excel']).required(),
  file: a
    .binary()
    .mimeTypes([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ])
    .maxSize(50 * 1024 * 1024)
    .required(),
});
```

## Common Patterns

### Combining Multiple Validations

You can chain multiple validation methods:

```typescript
email: a.string().required().email().max(255).default('user@example.com');

price: a.number().required().positive().min(0.01).max(999999.99);

tags: a.array(a.string()).unique().minItems(1).maxItems(10).default([]);
```

### Optional vs Nullable vs Required

```typescript
// Optional - field can be omitted entirely
middleName: a.string().optional(); // Can be undefined

// Nullable - field must be present but can be null
deletedAt: a.datetime().nullable(); // Can be null

// Required - field must have a value
email: a.string().required(); // Must have a value

// Required but nullable
status: a.string().required().nullable(); // Must be present, can be null
```

### Default Values

```typescript
// Static default
country: a.string().default('USA');

// Default empty array
tags: a.array(a.string()).default([]);

// Default object
settings: a.object({
  theme: a.string().default('light'),
}).default({});

// Computed default (current timestamp)
createdAt: a.datetime().default(() => new Date().toISOString());
```

## Summary

You now have a complete reference for all 11 field types:

- **String**: Text with format validation (email, URL, regex)
- **Number**: Numeric values with range constraints
- **Boolean**: True/false flags
- **DateTime**: ISO 8601 timestamps
- **ID**: Auto-generated identifiers
- **Enum**: Predefined string values
- **Array**: Lists of typed items
- **Ref**: References to other models
- **Object**: Nested structured data
- **JSON**: Unstructured dynamic data
- **Binary**: File uploads

Each field type has specific modifiers for validation and all share common modifiers like `.required()`, `.optional()`, `.nullable()`, and `.default()`.

## Next Steps

- [Create CRUD models](../guides/crud-models.md) - Build database-backed REST APIs
- [Set up authorization](../guides/authorization-patterns.md) - Control data access
- [Handle validation errors](../troubleshooting/schema-errors.md) - Debug common issues
