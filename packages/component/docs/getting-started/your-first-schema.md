# Your First Schema

> Learn how to create your first data model using the Atakora Component schema system

## What You'll Learn

- What a schema is and why it matters
- How to install and set up the component library
- How to define your first data model with fields and validation
- How to work with common field types
- How to test and validate your schema

## Prerequisites

Before you begin, make sure you have:

- Node.js 18.x or later installed
- TypeScript 5.0 or later
- A code editor (VS Code recommended for best TypeScript support)
- Basic familiarity with TypeScript and object-oriented programming

## What is a Schema?

A **schema** is the single source of truth for your application's data structure. It defines:

- What data models exist (e.g., User, Product, Order)
- What fields each model contains
- What validation rules apply to each field
- How models relate to each other

The Atakora Component schema system automatically generates:

- REST API endpoints for your models
- Database containers in Azure Cosmos DB
- TypeScript type definitions
- Validation logic
- OpenAPI documentation

This means you write the schema once, and the infrastructure writes itself.

## Step 1: Install @atakora/component

First, install the component library in your project:

```bash
npm install @atakora/component
```

Or if you're using yarn:

```bash
yarn add @atakora/component
```

## Step 2: Create Your First Model

Let's create a simple `User` model to demonstrate the core concepts. Create a new file called `schema.ts`:

```typescript
import { defineSchema, a, c } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().required().email(),
      name: a.string().required(),
      age: a.number().optional(),
      createdAt: a.datetime().required(),
    }),
  }),
});
```

Let's break down what each part does:

- **`defineSchema()`**: The main function that creates your schema
- **`a.schema()`**: Container for all your models
- **`c.model()`**: Creates a CRUD model (database-backed with REST API)
- **`a.id()`**: Auto-generated unique identifier
- **Field types**: `a.string()`, `a.number()`, `a.datetime()` define the field types

## Step 3: Understanding Field Types

The schema system provides multiple field types for different kinds of data:

### String Fields

String fields store text data and support various validation options:

```typescript
// Basic string
name: a.string().required();

// Email validation
email: a.string().required().email();

// URL validation
website: a.string().url();

// Length constraints
username: a.string().min(3).max(20).required();

// Custom regex pattern
zipCode: a.string().regex(/^\d{5}(-\d{4})?$/);
```

### Number Fields

Number fields store numeric values with optional constraints:

```typescript
// Basic number
age: a.number().optional();

// Range constraints
rating: a.number().min(1).max(5).required();

// Integer only
quantity: a.number().integer().required();

// Positive numbers only
price: a.number().positive().required();
```

### DateTime Fields

DateTime fields store ISO 8601 timestamp strings:

```typescript
// Required timestamp
createdAt: a.datetime().required();

// Optional timestamp
updatedAt: a.datetime().optional();

// Future dates only
scheduledFor: a.datetime().future();

// Past dates only
birthDate: a.datetime().past();
```

### Boolean Fields

Boolean fields store true/false values:

```typescript
// With default value
isActive: a.boolean().default(true);

// Required boolean
agreedToTerms: a.boolean().required();
```

### Enum Fields

Enum fields restrict values to a predefined set:

```typescript
// Status enum
status: a.enum(['pending', 'active', 'archived']).default('pending');

// Role enum
role: a.enum(['user', 'admin', 'analyst']).required();
```

## Step 4: Add Validation Rules

All fields support common validation modifiers:

### Required vs Optional

By default, fields are optional unless you specify otherwise:

```typescript
// Optional field (default)
middleName: a.string();

// Required field
firstName: a.string().required();

// Explicitly optional
lastName: a.string().optional();
```

### Default Values

You can provide default values for optional fields:

```typescript
// String default
country: a.string().default('USA');

// Number default
credits: a.number().default(0);

// Boolean default
isVerified: a.boolean().default(false);

// Array default
tags: a.array(a.string()).default([]);
```

### Combining Validation Rules

You can chain multiple validation rules together:

```typescript
// Email that's required and has max length
email: a.string().required().email().max(255);

// Age between 18 and 120
age: a.number().min(18).max(120).required();

// Username with length and pattern constraints
username: a.string()
  .required()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_]+$/);
```

## Step 5: Create a More Complete Example

Let's expand our User model with more realistic fields:

```typescript
import { defineSchema, a, c } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      // Auto-generated ID
      id: a.id(),

      // Basic profile information
      email: a.string().required().email().max(255),
      firstName: a.string().required().min(1).max(100),
      lastName: a.string().required().min(1).max(100),

      // Optional fields
      phoneNumber: a.string().phone().optional(),
      bio: a.string().max(500).optional(),

      // Enum for user status
      status: a.enum(['pending', 'active', 'suspended', 'deleted']).default('pending'),

      // Enum for role
      role: a.enum(['user', 'admin', 'analyst']).default('user'),

      // Boolean flags
      isEmailVerified: a.boolean().default(false),
      receiveNotifications: a.boolean().default(true),

      // Timestamps
      createdAt: a.datetime().required(),
      lastLoginAt: a.datetime().optional(),
    }),
  }),
});
```

## Step 6: Test Your Schema

To verify your schema is correctly defined, you can access it and check its metadata:

```typescript
// Get schema metadata
const metadata = schema._metadata;
console.log('Schema version:', metadata.version);
console.log('CRUD models:', metadata.models.crud);

// Access a specific model
const userModel = schema.models.User;
console.log('User model type:', userModel.type); // 'crud'
console.log('User fields:', Object.keys(userModel.fields));

// Check field configuration
const emailField = userModel.fields.email;
console.log('Email validations:', emailField.validations);
```

### Expected Output

When you run this code, you should see something like:

```
Schema version: 1.0.0
CRUD models: ['User']
User model type: crud
User fields: ['id', 'email', 'firstName', 'lastName', 'phoneNumber', 'bio', 'status', 'role', 'isEmailVerified', 'receiveNotifications', 'createdAt', 'lastLoginAt']
Email validations: [
  { type: 'required', message: 'This field is required' },
  { type: 'email', message: 'Must be a valid email address' },
  { type: 'maxLength', value: 255, message: 'Must be at most 255 characters' }
]
```

## Step 7: Type Safety with TypeScript

One of the powerful features of the schema system is automatic type inference. TypeScript knows the exact shape of your models:

```typescript
// TypeScript infers the User type from the schema
type User = typeof schema.models.User;

// You get full autocomplete and type checking
const createUser = (data: any) => {
  // TypeScript knows what fields exist and their types
  const email: string = data.email;
  const age: number | undefined = data.age;
  const status: 'pending' | 'active' | 'suspended' | 'deleted' = data.status;
};
```

## Common Patterns

### Model with Timestamps

Enable automatic timestamp management:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
}).timestamps(true); // Automatically adds createdAt and updatedAt
```

### Model with Soft Delete

Enable soft delete to mark records as deleted instead of removing them:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
}).softDelete(true); // Adds deletedAt field and filters deleted records
```

### Model with Custom Indexes

Improve query performance by indexing frequently queried fields:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  organizationId: a.string().required(),
  name: a.string().required(),
}).indexes(['email', 'organizationId']); // Index these fields for faster queries
```

## Troubleshooting

### Error: "Field cannot be both required and optional"

This happens when you call both `.required()` and `.optional()` on the same field. Choose one:

```typescript
// Bad
email: a.string().required().optional();

// Good - pick one
email: a.string().required();
// or
email: a.string().optional();
```

### Error: "Invalid email format"

The `.email()` validator checks for basic email format. Make sure your test data includes a valid email:

```typescript
// Valid
email: 'user@example.com';

// Invalid
email: 'not-an-email';
email: '@example.com';
email: 'user@';
```

### Type Inference Not Working

If TypeScript isn't giving you autocomplete, make sure you're using the `typeof` operator correctly:

```typescript
// Correct
type User = typeof schema.models.User;

// Incorrect
type User = schema.models.User; // This gets the processed model, not the type
```

## Next Steps

Now that you understand the basics of schema definition, you can:

- [Set up authentication](./authentication-setup.md) - Add user authentication to your schema
- [Learn about CRUD models](../guides/crud-models.md) - Deep dive into database-backed models
- [Explore all field types](../reference/field-types.md) - Complete reference for all available field types
- [Configure authorization](../guides/authorization-patterns.md) - Control who can access your data

## Summary

You've learned how to:

- Install the @atakora/component library
- Define a schema with CRUD models
- Use common field types (string, number, datetime, boolean, enum)
- Add validation rules to fields
- Test your schema and verify its structure
- Leverage TypeScript type inference for type safety

The schema you've created is the foundation for your entire backend. In the next guides, you'll learn how to add authorization, authentication, and more advanced features.
