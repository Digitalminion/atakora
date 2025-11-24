# Schema Definition System

The schema definition system is the core of the @atakora/component package. It provides a fluent API for defining data models that automatically generate infrastructure, APIs, and TypeScript types.

## Overview

The schema system consists of three main components:

1. **Field Types** (`a.*`) - Define individual fields with validation
2. **Model Types** (`c.model`, `e.model`, `f.model`) - Define data models
3. **Schema Definition** (`defineSchema`) - Assemble all models into a schema

## Field Types

Field types are created using the `a` namespace:

```typescript
import { a } from '@atakora/component';

// String fields
email: a.string().required().email();
name: a.string().required().minLength(2).maxLength(100);
url: a.string().url();

// Number fields
age: a.number().min(0).max(120).integer();
price: a.number().positive().required();

// Other types
isActive: a.boolean().default(true);
createdAt: a.datetime().required();
status: a.enum(['pending', 'active', 'archived']).default('pending');
tags: a.array(a.string()).default([]);
metadata: a.json();
```

### Available Field Types

- `a.string()` - String with validation (email, url, length, pattern)
- `a.number()` - Number with min/max/integer validation
- `a.boolean()` - Boolean values
- `a.datetime()` - ISO 8601 datetime strings
- `a.id()` - Auto-generated IDs
- `a.enum(values)` - Enumeration with allowed values
- `a.array(itemType)` - Arrays of any type
- `a.object(schema)` - Nested objects
- `a.json()` - Arbitrary JSON data
- `a.binary()` - Binary data (files)

For complete field type documentation, see the [Field Types API Reference](/docs/reference/schema/field-types.md).

## Model Types

### CRUD Models (`c.model`)

CRUD models create database-backed REST APIs:

```typescript
import { c, a } from '@atakora/component';

User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
  role: a.enum(['user', 'admin']).default('user'),
})
  .authorization((allow) => [
    allow.owner('id'),
    allow.groups(['admin']).all()
  ])
  .indexes(['email'])
  .timestamps(true)
  .softDelete(true);
```

**Auto-generates:**
- `POST /api/users` - Create user
- `GET /api/users/:id` - Get user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users` - List users (with filtering, pagination, sorting)
- Cosmos DB container `users`
- TypeScript types: `User`, `CreateUserInput`, `UpdateUserInput`

### Event Models (`e.model`)

Event models create async event processing pipelines:

```typescript
import { e, a } from '@atakora/component';

DataUploaded: e.model({
  datasetId: a.string().required(),
  fileUrl: a.string().url().required(),
  uploadedAt: a.datetime().required(),
});
```

**Auto-generates:**
- `POST /api/events/data-uploaded` - Publish event
- Azure Storage Queue `data-uploaded`
- Queue processor function
- TypeScript type: `DataUploadedEvent`

### Function Models (`f.model`)

Function models create custom HTTP endpoints:

```typescript
import { f, a } from '@atakora/component';

GenerateReport: f.model({
  input: {
    datasetId: a.string().required(),
    format: a.enum(['pdf', 'excel']).default('pdf'),
  },
  output: {
    reportUrl: a.string().url().required(),
    status: a.enum(['generating', 'completed']).required(),
  },
}).authorization((allow) => [allow.authenticated()]);
```

**Auto-generates:**
- `POST /api/functions/generate-report` - Call function
- Azure Function with HTTP trigger
- Input/output validation
- TypeScript types: `GenerateReportInput`, `GenerateReportOutput`

## Complete Example

```typescript
import { defineSchema, a, c, e, f } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    // CRUD Models - Database-backed REST APIs
    User: c
      .model({
        id: a.id(),
        email: a.string().required().email(),
        name: a.string().required(),
        role: a.enum(['user', 'admin', 'analyst']).default('user'),
        organizationId: a.string().required(),
        isActive: a.boolean().default(true),
      })
      .authorization((allow) => [
        allow.owner('id'),
        allow.groups(['admin']).all()
      ])
      .indexes(['email', 'organizationId']),

    Project: c
      .model({
        id: a.id(),
        name: a.string().required(),
        ownerId: a.string().required(),
        status: a.enum(['active', 'archived']).default('active'),
      })
      .authorization((allow) => [
        allow.owner('ownerId'),
        allow.groups(['admin']).all()
      ])
      .indexes(['ownerId']),

    // Event Models - Async Processing
    DataUploaded: e.model({
      datasetId: a.string().required(),
      fileUrl: a.string().url().required(),
      uploadedAt: a.datetime().required(),
    }),

    DataValidated: e.model({
      datasetId: a.string().required(),
      isValid: a.boolean().required(),
      validationErrors: a.array(a.string()),
    }),

    // Function Models - Custom HTTP Endpoints
    GenerateReport: f.model({
      input: {
        datasetId: a.string().required(),
        format: a.enum(['pdf', 'excel']).default('pdf'),
      },
      output: {
        reportUrl: a.string().url().required(),
        status: a.enum(['generating', 'completed']).required(),
      },
    }),
  }),
});
```

## Type Inference

The schema system automatically generates TypeScript types:

```typescript
import type { InferModelType, InferCreateInput, InferUpdateInput } from '@atakora/component';

// Full model type
type User = InferModelType<typeof schema.models.User>;
// → { id: string, email: string, name: string, role: 'user' | 'admin' | 'analyst', ... }

// Create input (omits id, timestamps)
type CreateUserInput = InferCreateInput<typeof schema.models.User>;
// → { email: string, name: string, role?: 'user' | 'admin' | 'analyst', ... }

// Update input (all optional)
type UpdateUserInput = InferUpdateInput<typeof schema.models.User>;
// → { email?: string, name?: string, role?: 'user' | 'admin' | 'analyst', ... }

// Event type
type DataUploadedEvent = InferEventType<typeof schema.models.DataUploaded>;
// → { datasetId: string, fileUrl: string, uploadedAt: string }

// Function types
type GenerateReportInput = InferFunctionInput<typeof schema.models.GenerateReport>;
type GenerateReportOutput = InferFunctionOutput<typeof schema.models.GenerateReport>;
```

## Schema Introspection

The schema object provides introspection utilities:

```typescript
import {
  getModelNames,
  getCrudModelNames,
  getEventModelNames,
  getModel,
  getSchemaStats,
} from '@atakora/component';

// Get all model names
const allModels = getModelNames(schema); // ['User', 'Project', 'DataUploaded', ...]

// Get CRUD models only
const crudModels = getCrudModelNames(schema); // ['User', 'Project']

// Get events only
const events = getEventModelNames(schema); // ['DataUploaded', 'DataValidated']

// Get specific model
const userModel = getModel(schema, 'User');

// Get statistics
const stats = getSchemaStats(schema);
// → { totalModels: 5, crudModels: 2, eventModels: 2, functionModels: 1 }
```

## Authorization

Authorization rules control access to models:

```typescript
.authorization(allow => [
  // Owner access - users can access their own records
  allow.owner('userId'),

  // Group access - specific groups have access
  allow.groups(['admin']).all(),
  allow.groups(['editor']).update(),
  allow.groups(['viewer']).read(),

  // Authenticated access - any authenticated user
  allow.authenticated(['read', 'list']),

  // Public access - no authentication required
  allow.public(['read']),
])
```

For complete authorization documentation, see the [Authorization Integration Guide](/docs/guides/authentication/authorization-integration.md).

## Validation

Field-level validation is defined inline:

```typescript
User: c.model({
  // Required string
  email: a.string().required().email(),

  // Length constraints
  name: a.string().required().minLength(2).maxLength(100),

  // Number constraints
  age: a.number().min(0).max(120).integer(),

  // Pattern matching
  phone: a.string().pattern(/^\+?[1-9]\d{1,14}$/),

  // Default values
  role: a.enum(['user', 'admin']).default('user'),
  isActive: a.boolean().default(true),
});
```

## Best Practices

1. **Use PascalCase for model names**: `User`, `Project`, `DataUploaded`
2. **Use camelCase for field names**: `userId`, `firstName`, `createdAt`
3. **Define authorization on CRUD models**: Control who can access what
4. **Add indexes for frequently queried fields**: Improve query performance
5. **Use enums for fixed sets of values**: Ensure data integrity
6. **Provide default values where appropriate**: Reduce boilerplate in client code
7. **Use descriptive event names**: `DataUploaded`, not `Event1`
8. **Document complex models**: Add TSDoc comments for clarity

## Related Documentation

- [Field Types API Reference](/docs/reference/schema/field-types.md)
- [Authorization Integration Guide](/docs/guides/authentication/authorization-integration.md)
- [Schema Testing Guide](/docs/contributing/technical/testing/schema-testing.md)
- [Backend Pattern Guide](/docs/guides/patterns/backend/overview.md)