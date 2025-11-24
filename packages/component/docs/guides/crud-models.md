# CRUD Models Complete Guide

> Learn how to create database-backed REST APIs with full CRUD operations

## What You'll Learn

- What CRUD models are and how they work
- How to create your first CRUD model
- How to configure fields and validation
- How to set up authorization rules
- How to optimize with indexes and partition keys
- How to use timestamps and soft delete
- Real-world patterns for common use cases

## Prerequisites

Before you begin, you should:

- Understand [schema basics](../getting-started/your-first-schema.md)
- Know the available [field types](../reference/field-types.md)
- Have basic familiarity with REST APIs and databases

## What are CRUD Models?

CRUD models are database-backed data models that automatically generate:

- **REST API endpoints** for Create, Read, Update, Delete, and List operations
- **Azure Cosmos DB containers** for data storage
- **TypeScript type definitions** for type-safe access
- **Validation logic** for data integrity
- **Authorization rules** for access control

When you define a CRUD model, you get a full REST API without writing any backend code:

```
POST   /api/{model-name}         - Create a new record
GET    /api/{model-name}/:id     - Read a single record
PUT    /api/{model-name}/:id     - Update a record
DELETE /api/{model-name}/:id     - Delete a record
GET    /api/{model-name}         - List records (with filtering, pagination, sorting)
```

## Creating Your First CRUD Model

Let's start with a simple `User` model:

```typescript
import { defineSchema, a, c } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().required().email(),
      firstName: a.string().required(),
      lastName: a.string().required(),
      createdAt: a.datetime().required(),
    }),
  }),
});
```

**What just happened?**

- `c.model()` creates a CRUD model
- Fields define the data structure
- Automatic REST API is generated
- Cosmos DB container is created on deployment

## Field Configuration

### Required Fields

Every CRUD model should have an `id` field for the primary key:

```typescript
User: c.model({
  id: a.id(), // Auto-generated unique identifier
  email: a.string().required().email(),
  name: a.string().required(),
});
```

### Optional Fields

Fields are optional by default unless marked as `.required()`:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),

  // Optional fields
  phoneNumber: a.string().phone().optional(),
  bio: a.string().max(500), // optional by default
  website: a.string().url(),
});
```

### Default Values

Provide sensible defaults for fields:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),

  // Fields with defaults
  status: a.enum(['pending', 'active', 'suspended']).default('pending'),
  credits: a.number().default(0),
  isVerified: a.boolean().default(false),
  tags: a.array(a.string()).default([]),
});
```

### Validation Rules

Apply validation rules to ensure data quality:

```typescript
User: c.model({
  id: a.id(),

  // Email validation
  email: a.string().required().email().max(255),

  // Length constraints
  username: a.string().required().min(3).max(20),

  // Number constraints
  age: a.number().min(18).max(120),

  // Pattern matching
  zipCode: a.string().regex(/^\d{5}(-\d{4})?$/),
});
```

## Authorization Rules

Authorization controls who can access your data and what operations they can perform.

### Owner-Based Access

Users can only access their own records:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
}).authorization((allow) => [
  allow.owner('id'), // Users can only access their own record
]);
```

**How it works:**

- The `owner('id')` rule checks if the authenticated user's ID matches the record's `id` field
- Users can create, read, update, and delete only their own records

### Group-Based Access

Grant access to specific user groups:

```typescript
Document: c.model({
  id: a.id(),
  title: a.string().required(),
  content: a.string().required(),
}).authorization((allow) => [
  allow.groups(['admin', 'editor']).all(), // Full access for admins and editors
]);
```

**How it works:**

- Only users with `admin` or `editor` roles can access documents
- `.all()` grants all operations (create, read, update, delete, list)

### Operation-Specific Access

Control access per operation:

```typescript
Article: c.model({
  id: a.id(),
  title: a.string().required(),
  content: a.string().required(),
}).authorization((allow) => [
  allow.public(['read', 'list']), // Anyone can read
  allow.authenticated(['create']), // Logged-in users can create
  allow.groups(['editor']).update(), // Editors can update
  allow.groups(['admin']).delete(), // Only admins can delete
]);
```

**Available operations:**

- `create` - Create new records
- `read` - Read individual records
- `update` - Update existing records
- `delete` - Delete records
- `list` - List/query multiple records

### Authenticated Users

Allow any logged-in user to access:

```typescript
Profile: c.model({
  id: a.id(),
  userId: a.string().required(),
  bio: a.string(),
}).authorization((allow) => [
  allow.authenticated(['read', 'list']), // Any logged-in user can read
]);
```

### Public Access

Allow unauthenticated access:

```typescript
BlogPost: c.model({
  id: a.id(),
  title: a.string().required(),
  content: a.string().required(),
  publishedAt: a.datetime(),
}).authorization((allow) => [
  allow.public(['read', 'list']), // Anyone can read blog posts
]);
```

### Combining Authorization Rules

You can combine multiple rules for fine-grained control:

```typescript
Post: c.model({
  id: a.id(),
  authorId: a.string().required(),
  title: a.string().required(),
  content: a.string().required(),
  status: a.enum(['draft', 'published']).default('draft'),
}).authorization((allow) => [
  allow.owner('authorId'), // Authors can manage their posts
  allow.groups(['admin']).all(), // Admins can do anything
  allow.authenticated(['read']), // Logged-in users can read
  allow.public(['read', 'list']), // Public can read published posts
]);
```

**Rule evaluation:**

- Rules are evaluated in order
- First matching rule grants access
- If no rules match, access is denied

## Indexes and Partition Keys

Indexes improve query performance for frequently searched fields.

### Adding Indexes

Index fields that you'll query often:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  organizationId: a.string().required(),
  status: a.enum(['active', 'inactive']).default('active'),
}).indexes(['email', 'organizationId', 'status']);
```

**When to index:**

- Fields used in filters (WHERE clauses)
- Fields used for sorting
- Fields used for uniqueness checks
- Foreign keys (reference fields)

**When NOT to index:**

- Fields that change frequently
- Large text fields
- Fields rarely queried

### Partition Keys

Partition keys distribute data across physical partitions for scalability:

```typescript
User: c.model({
  id: a.id(),
  organizationId: a.string().required(),
  email: a.string().required().email(),
}).partitionKey('organizationId'); // Partition by organization
```

**Choosing a partition key:**

- Should have high cardinality (many unique values)
- Should distribute data evenly
- Should match your query patterns

**Examples:**

- Multi-tenant apps: Use `organizationId` or `tenantId`
- User data: Use `userId` or region
- Time-series data: Use date ranges

**Default partition key:**

- If not specified, `id` is used as the partition key

### Composite Indexes

For complex queries, you might need composite indexes:

```typescript
Order: c.model({
  id: a.id(),
  customerId: a.string().required(),
  status: a.enum(['pending', 'processing', 'shipped']).default('pending'),
  createdAt: a.datetime().required(),
})
  .indexes(['customerId', 'status', 'createdAt'])
  .partitionKey('customerId');
```

This optimizes queries like:

- "Get all orders for customer X"
- "Get pending orders for customer X"
- "Get orders for customer X created after date Y"

## Timestamps and Soft Delete

### Automatic Timestamps

Enable automatic creation and update timestamps:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
}).timestamps(true); // Adds createdAt and updatedAt
```

**What this does:**

- Adds `createdAt` field (set on record creation)
- Adds `updatedAt` field (updated on every modification)
- Both are ISO 8601 datetime strings
- Fields are managed automatically - you can't set them manually

### Manual Timestamps

If you want more control, define timestamps yourself:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  createdAt: a.datetime().required(), // Manual timestamp
  updatedAt: a.datetime().optional(),
});
```

### Soft Delete

Enable soft delete to mark records as deleted instead of removing them:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
}).softDelete(true); // Adds deletedAt field
```

**What this does:**

- Adds `deletedAt` field (null for active records)
- DELETE operations set `deletedAt` to current timestamp instead of removing the record
- LIST and READ operations automatically filter out deleted records
- You can still query deleted records explicitly if needed

**Why use soft delete:**

- Maintain audit trails
- Allow "undelete" functionality
- Comply with data retention policies
- Preserve referential integrity

## Real-World Examples

### Example 1: E-Commerce Product

```typescript
Product: c.model({
  id: a.id(),
  sku: a
    .string()
    .required()
    .regex(/^[A-Z]{3}-\d{6}$/),
  name: a.string().required().min(1).max(200),
  description: a.string().max(2000).optional(),

  // Pricing
  price: a.number().positive().required(),
  compareAtPrice: a.number().positive().optional(),
  currency: a.string().default('USD'),

  // Inventory
  stockQuantity: a.number().integer().min(0).default(0),
  lowStockThreshold: a.number().integer().min(0).default(10),

  // Categorization
  categoryId: a.ref('Category').required(),
  tags: a.array(a.string()).default([]),

  // Status
  status: a.enum(['draft', 'active', 'archived']).default('draft'),
  publishedAt: a.datetime().optional(),

  // Organization
  sellerId: a.string().required(),
})
  .authorization((allow) => [
    allow.owner('sellerId'), // Sellers manage their products
    allow.groups(['admin']).all(), // Admins can do anything
    allow.public(['read', 'list']), // Public can browse products
  ])
  .indexes(['sku', 'categoryId', 'sellerId', 'status'])
  .partitionKey('sellerId')
  .timestamps(true)
  .softDelete(true);
```

### Example 2: Multi-Tenant Task Management

```typescript
Task: c.model({
  id: a.id(),
  organizationId: a.string().required(),
  projectId: a.ref('Project').onDelete('cascade'),

  // Task details
  title: a.string().required().min(1).max(200),
  description: a.string().max(5000).optional(),

  // Assignment
  assignedTo: a.ref('User').optional().onDelete('set_null'),
  createdBy: a.ref('User').required().onDelete('restrict'),

  // Status
  status: a.enum(['todo', 'in_progress', 'review', 'done']).default('todo'),
  priority: a.enum(['low', 'medium', 'high', 'urgent']).default('medium'),

  // Dates
  dueDate: a.datetime().optional(),
  completedAt: a.datetime().optional(),

  // Metadata
  tags: a.array(a.string()).default([]),
  estimatedHours: a.number().positive().optional(),
  actualHours: a.number().positive().optional(),
})
  .authorization((allow) => [
    // Organization members can read all tasks
    allow.authenticated(['read', 'list']),

    // Assigned users can update their tasks
    allow.owner('assignedTo').update(),

    // Task creators can manage their tasks
    allow.owner('createdBy'),

    // Project managers can do anything
    allow.groups(['project_manager', 'admin']).all(),
  ])
  .indexes(['organizationId', 'projectId', 'assignedTo', 'status', 'priority', 'dueDate'])
  .partitionKey('organizationId')
  .timestamps(true)
  .softDelete(true);
```

### Example 3: Blog Platform

```typescript
Article: c.model({
  id: a.id(),

  // Content
  title: a.string().required().min(1).max(200),
  slug: a
    .string()
    .required()
    .regex(/^[a-z0-9-]+$/),
  excerpt: a.string().max(300).optional(),
  content: a.string().required(),

  // Author
  authorId: a.ref('User').required().onDelete('restrict'),

  // Publishing
  status: a.enum(['draft', 'published', 'archived']).default('draft'),
  publishedAt: a.datetime().optional(),

  // Categorization
  categoryId: a.ref('Category').optional().onDelete('set_null'),
  tags: a.array(a.string()).unique().default([]),

  // SEO
  metaTitle: a.string().max(60).optional(),
  metaDescription: a.string().max(160).optional(),

  // Engagement
  viewCount: a.number().integer().min(0).default(0),
  likeCount: a.number().integer().min(0).default(0),

  // Featured
  isFeatured: a.boolean().default(false),
  featuredImage: a.string().url().optional(),
})
  .authorization((allow) => [
    // Authors manage their own articles
    allow.owner('authorId'),

    // Editors can edit any article
    allow.groups(['editor', 'admin']).all(),

    // Anyone can read published articles
    allow.public(['read', 'list']),
  ])
  .indexes(['slug', 'authorId', 'categoryId', 'status', 'publishedAt', 'isFeatured'])
  .partitionKey('id')
  .timestamps(true)
  .softDelete(true);
```

### Example 4: User Profile with Nested Data

```typescript
UserProfile: c.model({
  id: a.id(),
  userId: a.ref('User').required().onDelete('cascade'),

  // Personal information
  displayName: a.string().required().min(1).max(100),
  bio: a.string().max(500).optional(),
  avatar: a.string().url().optional(),

  // Contact
  email: a.string().email().required(),
  phoneNumber: a.string().phone().optional(),

  // Address (nested object)
  address: a
    .object({
      street: a.string().optional(),
      city: a.string().optional(),
      state: a.string().optional(),
      zipCode: a
        .string()
        .regex(/^\d{5}(-\d{4})?$/)
        .optional(),
      country: a.string().default('USA'),
    })
    .optional(),

  // Social links (nested object)
  socialLinks: a
    .object({
      twitter: a.string().url().optional(),
      linkedin: a.string().url().optional(),
      github: a.string().url().optional(),
    })
    .optional(),

  // Preferences (nested object)
  preferences: a
    .object({
      emailNotifications: a.boolean().default(true),
      smsNotifications: a.boolean().default(false),
      theme: a.enum(['light', 'dark', 'auto']).default('auto'),
      language: a.string().default('en'),
    })
    .default({}),

  // Privacy
  isPublic: a.boolean().default(true),

  // Verification
  isVerified: a.boolean().default(false),
  verifiedAt: a.datetime().optional(),
})
  .authorization((allow) => [
    // Users manage their own profile
    allow.owner('userId'),

    // Anyone can view public profiles
    allow.public(['read']),

    // Admins can manage any profile
    allow.groups(['admin']).all(),
  ])
  .indexes(['userId', 'email', 'isPublic'])
  .partitionKey('userId')
  .timestamps(true);
```

## Best Practices

### 1. Always Use ID Fields

Every model should have an `id` field:

```typescript
// Good
User: c.model({
  id: a.id(),
  name: a.string().required(),
});

// Bad - missing ID
User: c.model({
  name: a.string().required(),
});
```

### 2. Index Frequently Queried Fields

Add indexes for fields you'll query often:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  organizationId: a.string().required(),
}).indexes(['email', 'organizationId']); // These will be queried often
```

### 3. Use Appropriate Partition Keys

Choose partition keys that:

- Distribute data evenly
- Match your query patterns
- Have high cardinality

```typescript
// Good for multi-tenant app
Task: c.model({
  id: a.id(),
  organizationId: a.string().required(),
  // ...
}).partitionKey('organizationId');

// Bad - too many tasks per user
Task: c.model({
  id: a.id(),
  userId: a.string().required(),
  // ...
}).partitionKey('userId'); // Hot partition problem
```

### 4. Use Soft Delete for Important Data

Enable soft delete for data that:

- Might need to be restored
- Is referenced by other records
- Requires audit trails

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
}).softDelete(true); // Don't permanently delete users
```

### 5. Leverage Automatic Timestamps

Use automatic timestamps to track record history:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
}).timestamps(true); // Track creation and updates automatically
```

### 6. Apply Appropriate Authorization

Always configure authorization rules:

```typescript
// Good - explicit authorization
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
}).authorization((allow) => [allow.owner('id'), allow.groups(['admin']).all()]);

// Bad - no authorization (anyone can access)
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
});
```

### 7. Use References for Relationships

Use `a.ref()` for foreign keys:

```typescript
Comment: c.model({
  id: a.id(),
  postId: a.ref('Post').onDelete('cascade'), // Delete comments with post
  userId: a.ref('User').onDelete('restrict'), // Prevent deleting users with comments
  text: a.string().required(),
});
```

### 8. Validate Data Properly

Add validation rules to ensure data quality:

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email().max(255), // Validate email format and length
  username: a
    .string()
    .required()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/),
  age: a.number().min(18).max(120), // Reasonable age range
});
```

## Common Patterns

### Pattern: Owner + Admin Access

Most common pattern - users own their data, admins manage everything:

```typescript
.authorization(allow => [
  allow.owner('userId'),          // Users manage their own data
  allow.groups(['admin']).all(),  // Admins can do anything
])
```

### Pattern: Public Read, Authenticated Write

Good for content platforms:

```typescript
.authorization(allow => [
  allow.public(['read', 'list']),      // Anyone can view
  allow.authenticated(['create']),      // Logged-in users can create
  allow.owner('authorId'),              // Authors manage their content
  allow.groups(['moderator']).all(),    // Moderators can manage any content
])
```

### Pattern: Multi-Tenant Isolation

Ensure tenant data isolation:

```typescript
Task: c.model({
  id: a.id(),
  organizationId: a.string().required(),
  // ...
})
  .partitionKey('organizationId') // Physical isolation
  .indexes(['organizationId']) // Fast queries within tenant
  .authorization((allow) => [allow.authenticated(['read', 'create', 'update'])]);
```

### Pattern: Hierarchical Access

Parent-child relationships:

```typescript
Comment: c.model({
  id: a.id(),
  postId: a.ref('Post').required().onDelete('cascade'),
  userId: a.ref('User').required(),
  // ...
}).authorization((allow) => [
  allow.owner('userId'), // Comment author
  allow.groups(['moderator']).all(), // Moderators
]);
```

## Troubleshooting

See the [Schema Errors troubleshooting guide](../troubleshooting/schema-errors.md) for common issues and solutions.

## Next Steps

Now that you understand CRUD models, explore:

- [Authorization patterns](./authorization-patterns.md) - Advanced access control patterns
- [Field types reference](../reference/field-types.md) - Complete field type documentation
- [Schema validation](../troubleshooting/schema-errors.md) - Debug schema issues

## Summary

You've learned:

- CRUD models generate full REST APIs automatically
- Field configuration with types and validation
- Authorization rules for access control (owner, groups, authenticated, public)
- Indexes and partition keys for performance
- Timestamps and soft delete for data management
- Real-world patterns for common use cases
- Best practices for building production-ready models

CRUD models are the foundation of your backend. Master them, and you can build sophisticated, scalable APIs with minimal code.
