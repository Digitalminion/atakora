# Schemas Reference

Complete reference documentation for Atakora's schema systems including field types, manifest schemas, and data model definitions.

## Overview

Atakora uses schemas to define data structures, validate configurations, and generate type-safe code. This section documents all schema-related functionality.

## Schema Types

### Configuration Schemas
- **[Manifest Schema](./Manifest-Schema.md)** - Project manifest structure
  - Package configuration
  - Environment settings
  - Entry points
  - Version management

### Data Schemas
- **[Field Types](./Field-Types.md)** - Schema field type system
  - Primitive types
  - Complex types
  - Validation rules
  - Custom types

## Field Type System

### Primitive Types

```typescript
import { a } from '@atakora/component';

// String fields
email: a.string().email().required()
name: a.string().minLength(1).maxLength(100)
url: a.string().url()
phone: a.string().pattern(/^\+?[1-9]\d{1,14}$/)

// Number fields
age: a.number().min(0).max(120)
price: a.number().decimal(2).positive()
quantity: a.integer().min(1)

// Boolean fields
isActive: a.boolean().default(true)
isVerified: a.boolean()

// Date/Time fields
createdAt: a.datetime().default(() => new Date())
birthday: a.date()
appointmentTime: a.time()
```

### Complex Types

```typescript
// Arrays
tags: a.array(a.string()).minItems(1).maxItems(10)
scores: a.array(a.number()).unique()

// Objects
address: a.object({
  street: a.string().required(),
  city: a.string().required(),
  state: a.string().length(2),
  zip: a.string().pattern(/^\d{5}(-\d{4})?$/)
})

// Enums
status: a.enum(['draft', 'published', 'archived'])
priority: a.enum(['low', 'medium', 'high']).default('medium')

// References
userId: a.ref('User').required()
categoryId: a.ref('Category').nullable()

// JSON fields
metadata: a.json().default({})
settings: a.json().schema(SettingsSchema)

// Binary data
avatar: a.binary().maxSize('5MB')
document: a.binary().mimeTypes(['application/pdf'])
```

## Schema Definitions

### CRUD Model Schema

```typescript
import { c, a } from '@atakora/component';

const User = c.model({
  // Auto-generated fields
  id: a.id(), // UUID v4
  createdAt: a.datetime(),
  updatedAt: a.datetime(),

  // Custom fields
  email: a.string().email().required().unique(),
  name: a.string().required(),
  role: a.enum(['user', 'admin']).default('user'),
  profile: a.object({
    bio: a.string().maxLength(500),
    avatar: a.string().url(),
    preferences: a.json()
  }),

  // Relationships
  organizationId: a.ref('Organization').required(),
  managerId: a.ref('User').nullable()
})
.authorization(allow => [
  allow.owner('id'),
  allow.groups(['admin']).all(),
  allow.authenticated().read()
])
.indexes([
  { fields: ['email'], unique: true },
  { fields: ['organizationId', 'role'] }
]);
```

### Event Model Schema

```typescript
import { e, a } from '@atakora/component';

const OrderPlaced = e.model({
  orderId: a.string().uuid().required(),
  customerId: a.ref('Customer').required(),
  items: a.array(a.object({
    productId: a.ref('Product'),
    quantity: a.integer().positive(),
    price: a.number().decimal(2)
  })).minItems(1),
  total: a.number().decimal(2).positive(),
  timestamp: a.datetime().default(() => new Date())
})
.queue('orders')
.retries(3)
.deadLetter(true);
```

### Function Model Schema

```typescript
import { f, a } from '@atakora/component';

const GenerateReport = f.model({
  input: {
    startDate: a.date().required(),
    endDate: a.date().required(),
    format: a.enum(['pdf', 'excel', 'csv']).default('pdf'),
    filters: a.object({
      department: a.string(),
      status: a.enum(['active', 'inactive']),
      tags: a.array(a.string())
    }).optional()
  },
  output: {
    reportUrl: a.string().url().required(),
    fileSize: a.integer().positive(),
    generatedAt: a.datetime(),
    pageCount: a.integer().positive().optional()
  }
})
.timeout('5m')
.memory('2GB')
.auth('required');
```

## Validation Rules

### Built-in Validators

```typescript
// String validators
.email()           // Valid email format
.url()            // Valid URL format
.uuid()           // Valid UUID v4
.pattern(/regex/) // Custom regex pattern
.minLength(n)     // Minimum length
.maxLength(n)     // Maximum length
.length(n)        // Exact length

// Number validators
.min(n)           // Minimum value
.max(n)           // Maximum value
.positive()       // Greater than 0
.negative()       // Less than 0
.integer()        // Whole numbers only
.decimal(n)       // Decimal places

// Array validators
.minItems(n)      // Minimum items
.maxItems(n)      // Maximum items
.unique()         // Unique items only

// Common validators
.required()       // Field is required
.optional()       // Field is optional
.nullable()       // Can be null
.default(value)   // Default value
.transform(fn)    // Transform value
.validate(fn)     // Custom validation
```

### Custom Validators

```typescript
const PhoneNumber = a.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .transform(value => value.replace(/\D/g, ''))
  .validate(value => {
    if (value.length < 10) {
      throw new Error('Phone number must be at least 10 digits');
    }
    return true;
  });

const FutureDate = a.datetime()
  .validate(value => {
    if (value <= new Date()) {
      throw new Error('Date must be in the future');
    }
    return true;
  });
```

## Schema Composition

### Extending Schemas

```typescript
// Base schema
const BaseEntity = {
  id: a.id(),
  createdAt: a.datetime(),
  updatedAt: a.datetime(),
  createdBy: a.ref('User'),
  updatedBy: a.ref('User')
};

// Extended schema
const Product = c.model({
  ...BaseEntity,
  name: a.string().required(),
  description: a.string(),
  price: a.number().decimal(2).positive(),
  inventory: a.integer().min(0)
});
```

### Schema Inheritance

```typescript
// Define base model
const Vehicle = c.model({
  make: a.string().required(),
  model: a.string().required(),
  year: a.integer().min(1900).max(new Date().getFullYear() + 1)
});

// Extend with additional fields
const Car = Vehicle.extend({
  doors: a.integer().min(2).max(5),
  fuelType: a.enum(['gasoline', 'diesel', 'electric', 'hybrid'])
});

const Motorcycle = Vehicle.extend({
  engineSize: a.integer().positive(),
  type: a.enum(['sport', 'cruiser', 'touring', 'dirt'])
});
```

## Type Inference

Schemas automatically generate TypeScript types:

```typescript
// Schema definition
const UserSchema = c.model({
  id: a.id(),
  email: a.string().email().required(),
  name: a.string().required(),
  age: a.number().optional()
});

// Inferred types
type User = {
  id: string;
  email: string;
  name: string;
  age?: number;
  createdAt: Date;
  updatedAt: Date;
};

type CreateUserInput = {
  email: string;
  name: string;
  age?: number;
};

type UpdateUserInput = {
  email?: string;
  name?: string;
  age?: number;
};
```

## Manifest Schema

### Project Manifest Structure

```json
{
  "$schema": "https://atakora.dev/schemas/manifest.json",
  "organization": "MyOrganization",
  "project": "MyProject",
  "version": "1.0.0",
  "description": "Project description",
  "author": {
    "name": "John Doe",
    "email": "john@example.com"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/org/repo.git"
  },
  "packages": [
    {
      "name": "backend",
      "path": "./packages/backend",
      "entry": "./bin/app.ts",
      "environment": "production",
      "config": {
        "subscription": "prod-subscription-id",
        "resourceGroup": "rg-myapp-prod",
        "location": "eastus"
      }
    }
  ],
  "defaults": {
    "package": "backend",
    "environment": "development"
  }
}
```

## Best Practices

1. **Use Specific Types**: Choose the most specific field type for your data
2. **Add Validation**: Always add appropriate validation rules
3. **Document Fields**: Use descriptions for complex fields
4. **Provide Defaults**: Set sensible defaults where appropriate
5. **Create Reusable Types**: Extract common patterns into reusable schemas
6. **Validate Early**: Validate data at the schema level, not in business logic
7. **Use Type Inference**: Let TypeScript infer types from schemas

## Schema Migration

### Handling Schema Changes

```typescript
// Version 1
const UserV1 = c.model({
  name: a.string().required()
});

// Version 2 - Add new field with default
const UserV2 = c.model({
  name: a.string().required(),
  email: a.string().email().default('') // New field with default
});

// Version 3 - Rename field with migration
const UserV3 = c.model({
  fullName: a.string().required(), // Renamed from 'name'
  email: a.string().email().required()
})
.migration((data) => ({
  fullName: data.name, // Map old field to new
  email: data.email
}));
```

## Related Documentation

- [Backend Schema Guide](../backend/Schema.md) - Backend schema patterns
- [Validation Guide](../../guides/validation/overview.md) - Validation system
- [Type Generation](../Integration/OpenAPI-Type-Generation.md) - Type generation from schemas
- [API Reference](../api/README.md) - Complete API documentation