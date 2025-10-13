# Data Component

Schema-driven GraphQL API infrastructure for Atakora.

## Installation

```bash
npm install @atakora/component
```

## Usage

```typescript
import { DataStack } from '@atakora/component/data';
import { defineSchema, Fields, allow, hasMany, z } from '@atakora/lib/schema/atakora';
import { ResourceGroupStack, ServiceBusNamespace } from '@atakora/cdk';

// Define your data schemas
const UserSchema = defineSchema('User', {
  fields: z.object({
    id: Fields.id(),
    email: Fields.email().unique().build(),
    name: z.string().min(1).max(100),
    role: z.enum(['admin', 'user']).default('user'),
    createdAt: Fields.createdAt(),
    updatedAt: Fields.updatedAt()
  }),
  authorization: {
    create: allow.authenticated(),
    read: allow.public(),
    update: allow.owner('id'),
    delete: allow.role('admin')
  },
  relationships: {
    posts: hasMany('Post', 'authorId')
  }
});

const PostSchema = defineSchema('Post', {
  fields: z.object({
    id: Fields.id(),
    title: z.string().min(1).max(200),
    content: z.string().min(10),
    authorId: z.string().uuid(),
    status: z.enum(['draft', 'published']).default('draft'),
    createdAt: Fields.createdAt(),
    updatedAt: Fields.updatedAt()
  }),
  authorization: {
    create: allow.authenticated(),
    read: allow.if((context, post) =>
      post.status === 'published' || post.authorId === context.user?.id
    ),
    update: allow.owner('authorId'),
    delete: allow.owner('authorId')
  }
});

// Create infrastructure stack
const stack = new ResourceGroupStack(app, 'DataStack', {
  resourceGroupName: 'rg-myapp-data',
  location: 'eastus'
});

// Create Cosmos DB account (or use existing)
const cosmosAccount = new CosmosDBAccount(stack, 'Database', {
  databaseAccountName: 'cosmos-myapp'
});

// Optional: Create Service Bus for events
const serviceBus = new ServiceBusNamespace(stack, 'Messaging', {
  sku: 'Standard'
});

// Create Data Stack - automatically synthesizes all infrastructure
const dataStack = new DataStack(stack, 'Data', {
  schemas: [UserSchema, PostSchema],
  cosmosAccount,
  serviceBusNamespace: serviceBus,
  enableEvents: true,
  enableGraphQL: true
});

// Access synthesized resources
const userContainer = dataStack.getContainer('User');
const postContainer = dataStack.getContainer('Post');
const userTopic = dataStack.getTopic('User');
const resolvers = dataStack.getResolvers();
```

## What Gets Created

The `DataStack` automatically synthesizes:

### 1. Cosmos DB Infrastructure
- Database for your entities
- Containers with:
  - Partition keys from schema metadata
  - Indexes from `indexes` configuration
  - Unique key policies from `unique` fields
  - TTL configuration
  - Proper throughput settings

### 2. Service Bus Infrastructure (if `enableEvents: true`)
- Topics for each entity (e.g., `user-events`, `post-events`)
- Event types: `created`, `updated`, `deleted`
- Subscriptions based on relationships
- SQL filters for cross-entity events

### 3. GraphQL API (if `enableGraphQL: true`)
- Query resolvers: `getUser`, `listUsers`, `getPost`, `listPosts`
- Mutation resolvers: `createUser`, `updateUser`, `deleteUser`, etc.
- Relationship resolvers: `User.posts`, `Post.author`
- Computed field resolvers
- Authorization middleware applied from schema rules

### 4. Azure Functions
- Function handlers for each resolver
- Cosmos DB bindings
- Authorization middleware integration
- Event triggers for mutations

### 5. Real-Time Subscriptions (if `enableRealtime: true`)
- SignalR Service for WebSocket connections
- Subscription resolvers for real-time updates
- Hub connections for each entity

## Features

### Type-Safe Schema Definition
- Zod-based runtime validation
- Full TypeScript type inference
- Field metadata for database mapping
- Relationship modeling (hasOne, hasMany, belongsTo, manyToMany, polymorphic)

### Declarative Authorization
- Public, authenticated, owner-based, role-based, group-based
- Custom authorization functions
- Field-level authorization
- Composable with `.and()`, `.or()`, `.not()`

### Lifecycle Hooks
- `beforeCreate`, `afterCreate`
- `beforeUpdate`, `afterUpdate`
- `beforeDelete`, `afterDelete`
- Access to authorization context

### Computed Fields
- Derived fields calculated on demand
- Caching support with TTL
- Access to related data

### Custom Validation
- Field-level validation beyond type checking
- Async validation (e.g., uniqueness checks)
- Detailed error messages with codes

## Generated Client SDK

Use the code generator to create type-safe client SDKs:

```typescript
import { generateManySDK } from '@atakora/lib/codegen';

const { code } = generateManySDK([UserSchema, PostSchema], {
  clientType: 'fetch',
  includeRetry: true
});

// Generates type-safe client with:
// - client.User.get(id)
// - client.User.list({ where: { role: { equals: 'admin' } } })
// - client.User.create({ email, name, role })
// - client.Post.query({ title: { contains: 'hello' } })
```

## React Hooks

Generate React hooks for your schemas:

```typescript
import { generateManyHooks } from '@atakora/lib/codegen';

const { code } = generateManyHooks([UserSchema, PostSchema], {
  stateLibrary: 'react-query'
});

// Generates:
// - useUser(id)
// - useUserList(filter, sort)
// - useCreateUser()
// - useUpdateUser()
// - useDeleteUser()
```

## Architecture

```
Schema Definitions
      ↓
DataStackSynthesizer
      ↓
  ┌───┴───┬───────┬────────┐
  ↓       ↓       ↓        ↓
Cosmos  Service  GraphQL  SignalR
  DB     Bus     API      Service
  ↓       ↓       ↓        ↓
Generated Infrastructure (ARM)
```

## Next Steps

1. Define your schemas using the Atakora schema DSL
2. Create a `DataStack` with your schemas
3. Deploy with `atakora synth && atakora deploy`
4. Generate client SDKs and React hooks
5. Build your application with type-safe APIs

## Learn More

- [Schema DSL Guide](../../../lib/docs/atakora-schema-dsl-guide.md)
- [Authorization Guide](../../../lib/docs/authorization-guide.md)
- [Runtime SDK Guide](../../../lib/docs/atakora-runtime-sdk-guide.md)
- [Examples](../../../lib/src/schema/atakora/examples.ts)
