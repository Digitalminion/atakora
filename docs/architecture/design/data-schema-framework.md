# Azure Data Schema Framework for Atakora

## Overview and Goals

### Problem Statement

Modern applications require sophisticated data layers that handle CRUD operations, authorization, real-time updates, and complex relationships while maintaining type safety throughout the stack. Developers need a way to define their data models once and have the framework generate all necessary infrastructure, API layers, and type definitions automatically.

Currently in the Azure ecosystem, building such data layers requires manually orchestrating multiple services (Cosmos DB, API Management, Functions, Entra ID) with significant boilerplate code and complex configuration. This leads to:

- Inconsistent authorization patterns across resources
- Manual synchronization between data models and API schemas
- Type safety gaps between backend models and frontend code
- Complex setup for real-time subscriptions
- Repetitive resolver implementation for standard CRUD operations

### Developer Experience Goals

1. **Single Source of Truth**: Define data models once in TypeScript with full type inference
2. **Zero Boilerplate**: Framework generates all CRUD operations, resolvers, and authorization automatically
3. **Type Safety End-to-End**: From schema definition through API to client applications
4. **Progressive Enhancement**: Start simple, add complexity only when needed
5. **Azure-Native Integration**: Leverage Azure services optimally without abstraction leaks
6. **Clear Mental Model**: Developers understand exactly what infrastructure is created

### Technical Goals

1. **Performance**: Optimize for Cosmos DB's distributed architecture
2. **Scalability**: Support serverless scaling with Azure Functions
3. **Security**: Implement row-level security and attribute-based access control
4. **Reliability**: Handle failures gracefully with proper retry logic
5. **Observability**: Built-in monitoring and distributed tracing
6. **Testability**: Support unit, integration, and end-to-end testing

## Core Concepts

### Schema Definition Approach

The framework uses a TypeScript-first approach leveraging Zod for runtime validation and type inference. Schemas are defined as composable TypeScript objects that generate both compile-time types and runtime validators.

```typescript
// Core schema definition pattern
const UserSchema = defineSchema('User', {
  fields: z.object({
    id: z.string().uuid().primaryKey(),
    email: z.string().email().unique(),
    name: z.string().min(1).max(100),
    role: z.enum(['admin', 'user', 'guest']),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().onUpdate(),
  }),

  authorization: {
    create: allow.authenticated(),
    read: allow.owner().or(allow.groups(['admin'])),
    update: allow.owner().or(allow.role('admin')),
    delete: allow.role('admin'),
  },

  indexes: {
    byEmail: ['email'],
    byRole: ['role', 'createdAt'],
  },

  relationships: {
    posts: hasMany('Post', 'authorId'),
    profile: hasOne('Profile', 'userId'),
  },
});
```

### Type Inference Strategy

The framework leverages TypeScript's advanced type system to infer types at multiple levels:

1. **Schema Types**: Zod's type inference provides the base data types
2. **Relationship Types**: Template literal types and conditional types handle relationships
3. **Authorization Context**: Branded types ensure authorization rules are type-safe
4. **API Types**: GraphQL and REST endpoints have fully inferred request/response types

```typescript
// Automatic type inference
type User = InferSchemaType<typeof UserSchema>;
// Results in:
// {
//   id: string;
//   email: string;
//   name: string;
//   role: 'admin' | 'user' | 'guest';
//   createdAt: Date;
//   updatedAt: Date;
//   posts?: Post[];
//   profile?: Profile;
// }
```

### Authorization Model

Authorization follows a declarative, composable pattern with multiple strategies:

1. **Owner-Based**: Users can only access their own records
2. **Role-Based**: Access based on user roles from Entra ID
3. **Group-Based**: Access for members of specific Azure AD groups
4. **Attribute-Based**: Complex rules based on record attributes
5. **Custom Functions**: Arbitrary authorization logic when needed

```typescript
// Composable authorization rules
const authorization = {
  // Simple owner check
  read: allow.owner('userId'),

  // Role-based with OR logic
  update: allow.owner().or(allow.role('moderator')),

  // Complex attribute-based rule
  delete: allow.custom((ctx, record) => {
    return ctx.user.role === 'admin' && record.status !== 'protected';
  }),

  // Field-level authorization
  fields: {
    salary: allow.owner().or(allow.role('hr')),
    ssn: allow.owner().or(allow.groups(['hr-managers'])),
  },
};
```

### Relationship Patterns

The framework supports standard relationship patterns with automatic foreign key management:

1. **One-to-One**: Unique foreign key relationships
2. **One-to-Many**: Standard foreign key with multiple records
3. **Many-to-Many**: Automatic junction table creation
4. **Polymorphic**: Relationships to multiple entity types

```typescript
// Relationship definitions
const PostSchema = defineSchema('Post', {
  fields: z.object({
    id: z.string().uuid().primaryKey(),
    title: z.string(),
    content: z.string(),
    authorId: z.string().uuid(),
    tags: z.array(z.string()),
  }),

  relationships: {
    author: belongsTo('User', 'authorId'),
    comments: hasMany('Comment', 'postId'),
    categories: manyToMany('Category', 'PostCategories'),
  },
});
```

## Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│                  (Web, Mobile, Desktop, CLI)                 │
└─────────────────┬───────────────────────────┬───────────────┘
                  │                           │
                  ▼                           ▼
    ┌─────────────────────────┐ ┌──────────────────────────┐
    │   GraphQL Gateway       │ │    REST API Gateway       │
    │  (API Management)       │ │   (API Management)        │
    └─────────────┬───────────┘ └──────────┬───────────────┘
                  │                         │
                  ▼                         ▼
    ┌────────────────────────────────────────────────────┐
    │            Azure Functions Resolver Layer           │
    │         (Auto-generated CRUD + Custom Logic)        │
    └─────────────────────┬──────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
    ┌─────────┐     ┌──────────┐    ┌────────────┐
    │Cosmos DB│     │  Entra   │    │  Service   │
    │Documents│     │    ID    │    │    Bus     │
    └─────────┘     └──────────┘    └────────────┘
```

### Schema Definition Layer

The schema definition layer provides the developer API for defining data models:

```typescript
// Schema definition components
interface SchemaDefinition {
  // Core field definitions using Zod
  fields: ZodSchema;

  // Authorization rules per operation
  authorization: AuthorizationRules;

  // Database indexes for query optimization
  indexes: IndexDefinitions;

  // Relationships to other entities
  relationships: RelationshipDefinitions;

  // Lifecycle hooks for custom logic
  hooks?: LifecycleHooks;

  // Computed fields derived from data
  computed?: ComputedFields;

  // Validation beyond basic type checking
  validation?: CustomValidation;
}
```

### Synthesis/Generation Layer

The synthesis pipeline transforms schema definitions into Azure resources:

1. **Schema Analysis**: Parse and validate schema definitions
2. **Type Generation**: Generate TypeScript types and validators
3. **GraphQL Schema**: Create GraphQL SDL with resolvers
4. **REST Routes**: Generate OpenAPI spec and route handlers
5. **Database Setup**: Cosmos DB containers and indexes
6. **Functions Code**: Azure Functions for all operations
7. **Authorization Policies**: API Management policies
8. **Client SDKs**: Type-safe client libraries

### Runtime Layer

The runtime layer handles request processing:

1. **API Gateway**: API Management handles routing, rate limiting, caching
2. **Authentication**: Entra ID validates tokens and provides user context
3. **Authorization**: Function middleware enforces access rules
4. **Data Access**: Optimized Cosmos DB queries with caching
5. **Real-time Updates**: Service Bus for event propagation
6. **Monitoring**: Application Insights for observability

### Azure Service Mapping

| Framework Component | Azure Service | Purpose |
|-------------------|---------------|----------|
| Data Storage | Cosmos DB | Document storage with global distribution |
| API Gateway | API Management | GraphQL/REST routing, caching, policies |
| Compute | Azure Functions | Serverless resolver execution |
| Authentication | Entra ID | Identity and access tokens |
| Authorization | RBAC + Functions | Role assignments and custom rules |
| Real-time | Service Bus + SignalR | Event streaming and WebSocket connections |
| Search | Cognitive Search | Full-text and vector search |
| Caching | Redis Cache | Query result caching |
| Monitoring | Application Insights | Logging, metrics, distributed tracing |

## Schema Definition API

### Basic Schema Definition

```typescript
import { defineSchema, z, allow } from '@atakora/data';

// Simple schema with basic CRUD
const TodoSchema = defineSchema('Todo', {
  fields: z.object({
    id: z.string().uuid().primaryKey().default(uuid),
    title: z.string().min(1).max(200),
    completed: z.boolean().default(false),
    userId: z.string().uuid(),
    createdAt: z.date().default(() => new Date()),
  }),

  authorization: {
    // Only authenticated users can create
    create: allow.authenticated(),
    // Users can only see their own todos
    read: allow.owner('userId'),
    // Users can only update their own todos
    update: allow.owner('userId'),
    // Users can only delete their own todos
    delete: allow.owner('userId'),
  },
});
```

### Advanced Schema with Relationships

```typescript
const BlogSchema = defineSchema('Blog', {
  fields: z.object({
    id: z.string().uuid().primaryKey(),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    ownerId: z.string().uuid(),
    isPublic: z.boolean().default(true),
    createdAt: z.date().default(() => new Date()),
  }),

  relationships: {
    owner: belongsTo('User', 'ownerId'),
    posts: hasMany('Post', 'blogId'),
    contributors: manyToMany('User', 'BlogContributors'),
  },

  authorization: {
    create: allow.authenticated(),
    read: allow.if((ctx, blog) =>
      blog.isPublic ||
      blog.ownerId === ctx.user.id ||
      blog.contributors?.includes(ctx.user.id)
    ),
    update: allow.owner('ownerId').or(allow.relationship('contributors')),
    delete: allow.owner('ownerId'),
  },

  indexes: {
    byOwner: ['ownerId', 'createdAt'],
    public: ['isPublic', 'createdAt'],
  },
});
```

### Type Inference Examples

```typescript
// Automatic type inference from schema
type Todo = InferSchemaType<typeof TodoSchema>;
// Result: { id: string; title: string; completed: boolean; userId: string; createdAt: Date; }

// Query builder with full type safety
const todos = await Todo.query()
  .where('userId', '==', currentUser.id)
  .where('completed', '==', false)
  .orderBy('createdAt', 'desc')
  .limit(10)
  .execute();

// Mutations with validation
const newTodo = await Todo.create({
  title: 'Write documentation', // required
  // completed: false, // optional, has default
  userId: currentUser.id, // required
  // createdAt automatically set
});

// Relationships are type-safe
const blogWithPosts = await Blog.query()
  .where('id', '==', blogId)
  .include(['posts', 'owner']) // Type-checked relationship names
  .first();

if (blogWithPosts) {
  blogWithPosts.posts; // Post[] | undefined
  blogWithPosts.owner; // User | undefined
}
```

### Authorization Rule Syntax

```typescript
// Built-in authorization helpers
const authRules = {
  // Public access
  read: allow.public(),

  // Any authenticated user
  create: allow.authenticated(),

  // Owner check against a field
  update: allow.owner('createdBy'),

  // Role-based (from Entra ID claims)
  delete: allow.roles(['admin', 'moderator']),

  // Group membership (Azure AD groups)
  manage: allow.groups(['content-managers']),

  // Combine with AND logic
  publish: allow.authenticated().and(allow.owner()),

  // Combine with OR logic
  moderate: allow.role('moderator').or(allow.owner()),

  // Custom logic with full context
  archive: allow.custom(async (ctx, record) => {
    const user = await User.get(ctx.user.id);
    return user.permissions.includes('archive') &&
           record.status === 'published' &&
           record.createdAt < daysAgo(30);
  }),

  // Field-level authorization
  fields: {
    email: allow.owner().or(allow.role('admin')),
    salary: allow.role('hr'),
    medicalRecords: allow.groups(['medical-staff']),
  },
};
```

### Relationship Modeling

```typescript
// One-to-Many relationship
const UserPostsSchema = {
  User: defineSchema('User', {
    fields: z.object({
      id: z.string().uuid().primaryKey(),
      name: z.string(),
    }),
    relationships: {
      posts: hasMany('Post', 'authorId'),
    },
  }),

  Post: defineSchema('Post', {
    fields: z.object({
      id: z.string().uuid().primaryKey(),
      title: z.string(),
      authorId: z.string().uuid(),
    }),
    relationships: {
      author: belongsTo('User', 'authorId'),
    },
  }),
};

// Many-to-Many relationship with automatic junction table
const TaggingSchema = {
  Article: defineSchema('Article', {
    fields: z.object({
      id: z.string().uuid().primaryKey(),
      title: z.string(),
    }),
    relationships: {
      tags: manyToMany('Tag', 'ArticleTags', {
        // Optional: Add fields to junction table
        through: z.object({
          addedAt: z.date().default(() => new Date()),
          addedBy: z.string().uuid(),
        }),
      }),
    },
  }),

  Tag: defineSchema('Tag', {
    fields: z.object({
      id: z.string().uuid().primaryKey(),
      name: z.string().unique(),
    }),
    relationships: {
      articles: manyToMany('Article', 'ArticleTags'),
    },
  }),
};

// Polymorphic relationships
const CommentSchema = defineSchema('Comment', {
  fields: z.object({
    id: z.string().uuid().primaryKey(),
    content: z.string(),
    commentableId: z.string().uuid(),
    commentableType: z.enum(['Post', 'Article', 'Video']),
  }),
  relationships: {
    commentable: polymorphic(['Post', 'Article', 'Video'], {
      id: 'commentableId',
      type: 'commentableType',
    }),
  },
});
```

## Synthesis Pipeline

### How Schemas Transform to GraphQL

The synthesis pipeline automatically generates a complete GraphQL schema from data definitions:

```typescript
// Input: Schema definition
const ProductSchema = defineSchema('Product', {
  fields: z.object({
    id: z.string().uuid().primaryKey(),
    name: z.string(),
    price: z.number().positive(),
    inStock: z.boolean(),
  }),
});

// Output: Generated GraphQL SDL
type Product {
  id: ID!
  name: String!
  price: Float!
  inStock: Boolean!
}

type Query {
  getProduct(id: ID!): Product
  listProducts(
    filter: ProductFilter
    limit: Int
    nextToken: String
    sortDirection: SortDirection
  ): ProductConnection!
}

type Mutation {
  createProduct(input: CreateProductInput!): Product!
  updateProduct(id: ID!, input: UpdateProductInput!): Product!
  deleteProduct(id: ID!): Product!
}

type Subscription {
  onCreateProduct(filter: ProductFilter): Product
    @aws_subscribe(mutations: ["createProduct"])
  onUpdateProduct(filter: ProductFilter): Product
    @aws_subscribe(mutations: ["updateProduct"])
  onDeleteProduct(filter: ProductFilter): Product
    @aws_subscribe(mutations: ["deleteProduct"])
}

input ProductFilter {
  id: IDFilter
  name: StringFilter
  price: FloatFilter
  inStock: BooleanFilter
  and: [ProductFilter]
  or: [ProductFilter]
  not: ProductFilter
}

# Plus pagination, sorting, and filter types...
```

### How Cosmos DB Containers are Created

The framework generates optimized Cosmos DB container configurations:

```typescript
// Schema analysis determines container structure
const containerConfig = {
  id: 'products',
  partitionKey: '/tenantId', // Automatic multi-tenancy support
  uniqueKeyPolicy: {
    uniqueKeys: [
      { paths: ['/sku'] }, // From unique field constraints
    ],
  },
  indexingPolicy: {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [
      { path: '/*' },
    ],
    excludedPaths: [
      { path: '/_etag/?' },
    ],
    compositeIndexes: [
      // From defined indexes
      [
        { path: '/category', order: 'ascending' },
        { path: '/price', order: 'descending' },
      ],
    ],
  },
  defaultTtl: -1, // Disabled by default
  conflictResolutionPolicy: {
    mode: 'LastWriterWins',
    conflictResolutionPath: '/_ts',
  },
};

// Automatic sharding strategy for large datasets
if (estimatedSize > LARGE_DATASET_THRESHOLD) {
  containerConfig.throughput = {
    autoscale: {
      maxThroughput: 4000,
    },
  };
}
```

### How Authorization is Enforced

Authorization is enforced at multiple layers for defense in depth:

```typescript
// 1. API Management Policy (First layer)
const apiPolicy = `
<policies>
  <inbound>
    <validate-jwt header-name="Authorization"
                  failed-validation-httpcode="401"
                  failed-validation-error-message="Unauthorized">
      <openid-config url="https://login.microsoftonline.com/{tenant}/.well-known/openid-configuration" />
      <audiences>
        <audience>{api-audience}</audience>
      </audiences>
      <required-claims>
        <claim name="scp" match="any">
          <value>Product.Read</value>
          <value>Product.Write</value>
        </claim>
      </required-claims>
    </validate-jwt>
  </inbound>
</policies>
`;

// 2. Function Middleware (Second layer)
export const authorizationMiddleware = async (
  context: Context,
  operation: Operation,
  record?: Document
): Promise<void> => {
  const user = context.user;
  const authRule = schema.authorization[operation];

  // Evaluate authorization rules
  const authorized = await authRule.evaluate(context, record);

  if (!authorized) {
    throw new ForbiddenError(`Not authorized for ${operation}`);
  }

  // Field-level filtering
  if (record && schema.authorization.fields) {
    for (const [field, rule] of Object.entries(schema.authorization.fields)) {
      if (!(await rule.evaluate(context, record))) {
        delete record[field];
      }
    }
  }
};

// 3. Cosmos DB Row-Level Security (Third layer via queries)
const secureQuery = (userId: string, baseQuery: Query) => {
  // Automatically add owner filters for non-admin users
  if (!isAdmin(userId)) {
    baseQuery.where('ownerId', '==', userId);
  }
  return baseQuery;
};
```

### How Real-time Works

Real-time subscriptions are implemented using Azure Service Bus and SignalR:

```typescript
// 1. Change detection in Functions
export const afterWrite = async (
  context: Context,
  operation: 'create' | 'update' | 'delete',
  record: Document
): Promise<void> => {
  // Publish to Service Bus topic
  await serviceBusClient.send({
    body: {
      operation,
      entityType: schema.name,
      record,
      timestamp: new Date().toISOString(),
    },
    subject: `${schema.name}.${operation}`,
    applicationProperties: {
      tenantId: context.tenantId,
      userId: context.user?.id,
    },
  });
};

// 2. SignalR Function processes Service Bus messages
export const broadcastChanges = async (
  message: ServiceBusMessage,
  context: Context
): Promise<void> => {
  const { operation, entityType, record } = message.body;

  // Get active subscriptions for this entity
  const subscriptions = await getActiveSubscriptions(entityType);

  for (const subscription of subscriptions) {
    // Check subscription filters
    if (matchesFilter(record, subscription.filter)) {
      // Check authorization for this subscriber
      if (await authorizeSubscription(subscription, record)) {
        // Send via SignalR
        await signalR.send(subscription.connectionId, {
          type: `on${capitalize(operation)}${entityType}`,
          payload: record,
        });
      }
    }
  }
};

// 3. Client subscription
const subscription = client.subscribe({
  onCreateProduct: (product: Product) => {
    console.log('New product created:', product);
  },
  onUpdateProduct: (product: Product) => {
    console.log('Product updated:', product);
  },
});
```

## Azure Service Integration

### Cosmos DB Design Patterns

The framework implements several Cosmos DB best practices:

```typescript
// 1. Partition Strategy
interface PartitionStrategy {
  // Single-tenant: Use entity type as partition
  singleTenant: () => '/entityType';

  // Multi-tenant: Use tenant ID for isolation
  multiTenant: () => '/tenantId';

  // High-scale: Synthetic partition key
  highScale: () => '/partitionKey'; // Generated from hash

  // Hierarchical: Composite key
  hierarchical: () => '/tenantId/userId';
}

// 2. Document Structure with metadata
interface CosmosDocument<T> {
  // User fields
  ...T;

  // System metadata
  _metadata: {
    entityType: string;
    version: number;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
    ttl?: number;
  };

  // Cosmos DB system fields
  id: string;
  _etag?: string;
  _ts?: number;
  _self?: string;
}

// 3. Optimistic concurrency control
export const updateWithRetry = async <T>(
  id: string,
  updateFn: (doc: T) => T,
  maxRetries = 3
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const doc = await container.item(id).read<T>();
      const updated = updateFn(doc.resource);

      const result = await container
        .item(id)
        .replace(updated, { accessCondition: { type: 'IfMatch', condition: doc.etag } });

      return result.resource;
    } catch (error) {
      if (error.code === 412 && i < maxRetries - 1) {
        // Precondition failed, retry
        await delay(Math.pow(2, i) * 100);
        continue;
      }
      throw error;
    }
  }
};

// 4. Efficient querying with continuation tokens
export const paginatedQuery = async <T>(
  query: string,
  parameters: any[],
  continuationToken?: string
): Promise<PagedResult<T>> => {
  const querySpec = {
    query,
    parameters: parameters.map((value, index) => ({
      name: `@param${index}`,
      value,
    })),
  };

  const { resources, continuationToken: nextToken } = await container
    .items
    .query(querySpec, {
      maxItemCount: 100,
      continuationToken,
    })
    .fetchNext();

  return {
    items: resources,
    nextToken,
  };
};
```

### API Management Configuration

The framework generates comprehensive API Management configurations:

```typescript
// Generated API Management configuration
const apiManagementConfig = {
  api: {
    name: 'data-api',
    displayName: 'Data API',
    description: 'Auto-generated data API',
    protocols: ['https'],
    path: 'api',
    subscriptionRequired: true,
    authenticationSettings: {
      oAuth2: {
        authorizationServerId: 'entra-id',
      },
    },
  },

  products: [
    {
      name: 'standard',
      displayName: 'Standard API Access',
      description: 'Standard tier with rate limiting',
      subscriptionRequired: true,
      approvalRequired: false,
      subscriptionsLimit: 1,
      state: 'published',
    },
  ],

  policies: {
    inbound: [
      'validate-jwt',
      'cors',
      'rate-limit-by-key',
      'cache-lookup',
    ],
    backend: [
      'forward-request',
    ],
    outbound: [
      'cache-store',
      'set-header name="X-Powered-By" value="Atakora"',
    ],
    onError: [
      'json-error-response',
    ],
  },

  operations: generateOperations(schemas),

  backends: [
    {
      name: 'functions-backend',
      url: 'https://{functions-app}.azurewebsites.net/api',
      protocol: 'http',
      credentials: {
        header: {
          'x-functions-key': '{master-key}',
        },
      },
    },
  ],
};
```

### Azure Functions for Resolvers

The framework generates optimized Azure Functions:

```typescript
// Generated Function for GraphQL resolver
export const graphqlResolver: AzureFunction = async (
  context: Context,
  req: HttpRequest
): Promise<void> => {
  try {
    // Parse GraphQL request
    const { query, variables, operationName } = req.body;

    // Get user context from token
    const user = await validateToken(req.headers.authorization);

    // Execute with context
    const result = await graphql({
      schema: generatedSchema,
      source: query,
      variableValues: variables,
      operationName,
      contextValue: {
        user,
        dataSources: {
          cosmosDB: new CosmosDataSource(),
          cache: new RedisCache(),
        },
        requestId: context.invocationId,
      },
    });

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: result,
    };
  } catch (error) {
    context.log.error('GraphQL execution error:', error);
    context.res = {
      status: error.statusCode || 500,
      body: { errors: [formatError(error)] },
    };
  }
};

// Generated CRUD Functions
export const createEntity: AzureFunction = async (
  context: Context,
  req: HttpRequest
): Promise<void> => {
  const schema = schemas[req.params.entityType];

  // Validate input
  const validation = schema.fields.safeParse(req.body);
  if (!validation.success) {
    context.res = {
      status: 400,
      body: { errors: validation.error.errors },
    };
    return;
  }

  // Check authorization
  await authorizationMiddleware(context, 'create');

  // Run hooks
  const data = await runHooks('beforeCreate', validation.data, context);

  // Create in Cosmos DB
  const document = {
    ...data,
    id: data.id || generateId(),
    _metadata: {
      entityType: schema.name,
      version: 1,
      createdAt: new Date().toISOString(),
      createdBy: context.user?.id,
    },
  };

  const created = await cosmosClient
    .database(DATABASE_NAME)
    .container(schema.container)
    .items
    .create(document);

  // Run after hooks
  await runHooks('afterCreate', created.resource, context);

  // Publish event
  await publishEvent('create', created.resource);

  context.res = {
    status: 201,
    body: created.resource,
  };
};
```

### Entra ID / RBAC Integration

The framework integrates deeply with Azure's identity system:

```typescript
// Entra ID token validation and claims extraction
interface EntraIDIntegration {
  // Validate JWT tokens from Entra ID
  validateToken: async (token: string) => {
    const decoded = await verifyJWT(token, {
      issuer: `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
      audience: API_AUDIENCE,
    });

    return {
      id: decoded.oid,
      email: decoded.email,
      name: decoded.name,
      roles: decoded.roles || [],
      groups: decoded.groups || [],
      scopes: decoded.scp?.split(' ') || [],
      appId: decoded.appid,
      tenantId: decoded.tid,
    };
  };

  // Check group membership
  checkGroupMembership: async (userId: string, groupId: string) => {
    const client = new GraphClient({
      tenantId: TENANT_ID,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
    });

    return await client
      .api(`/users/${userId}/memberOf`)
      .filter(`id eq '${groupId}'`)
      .get();
  };

  // Get user's effective permissions
  getEffectivePermissions: async (userId: string, resourceId: string) => {
    // Get direct role assignments
    const directRoles = await getRoleAssignments(userId, resourceId);

    // Get group-based assignments
    const groups = await getUserGroups(userId);
    const groupRoles = await Promise.all(
      groups.map(g => getRoleAssignments(g.id, resourceId))
    );

    // Combine and deduplicate
    return [...new Set([...directRoles, ...groupRoles.flat()])];
  };
}

// RBAC role definitions for data operations
const dataRoleDefinitions = {
  DataReader: {
    id: '/providers/Microsoft.Authorization/roleDefinitions/data-reader',
    permissions: ['read', 'list'],
  },
  DataContributor: {
    id: '/providers/Microsoft.Authorization/roleDefinitions/data-contributor',
    permissions: ['read', 'list', 'create', 'update'],
  },
  DataOwner: {
    id: '/providers/Microsoft.Authorization/roleDefinitions/data-owner',
    permissions: ['read', 'list', 'create', 'update', 'delete'],
  },
};
```

## Technical Decisions

### Zod vs Alternatives

**Decision**: Use Zod as the primary schema validation library.

**Alternatives Considered**:
- **Joi**: More mature but lacks TypeScript-first design
- **Yup**: Popular but inferior type inference
- **io-ts**: Powerful but complex API
- **Custom validator**: Full control but significant development effort

**Why Zod**:
1. **Superior Type Inference**: Automatically derives TypeScript types from schemas
2. **Composable API**: Schemas can be composed and extended naturally
3. **Transform Pipeline**: Built-in support for data transformation
4. **Error Messages**: Excellent error reporting with customization
5. **Performance**: Competitive performance with minimal overhead
6. **Active Development**: Well-maintained with regular updates

### GraphQL vs REST vs Both

**Decision**: Support both GraphQL and REST with GraphQL as primary.

**Rationale**:
1. **GraphQL Primary**:
   - Natural fit for relational data
   - Client-specified queries reduce over-fetching
   - Strong typing aligns with TypeScript
   - Subscription support built-in

2. **REST Support**:
   - Some enterprises mandate REST
   - Better caching strategies
   - Simpler for basic CRUD
   - File uploads more straightforward

**Implementation Strategy**:
```typescript
// Single schema generates both
const schema = defineSchema('Product', {...});

// Generates GraphQL
schema.toGraphQL(); // Type definitions + resolvers

// Generates REST
schema.toREST(); // OpenAPI spec + route handlers

// Shared business logic
const resolver = createResolver(schema); // Used by both
```

### Code Generation vs Runtime

**Decision**: Hybrid approach with build-time generation and runtime validation.

**Build-Time Generation**:
- TypeScript types and interfaces
- GraphQL SDL and basic resolvers
- OpenAPI specifications
- Client SDK boilerplate
- Azure resource definitions

**Runtime Handling**:
- Authorization evaluation
- Data validation
- Query building
- Relationship resolution
- Custom business logic

**Benefits**:
- Type safety without runtime overhead
- Flexibility for dynamic behavior
- Optimal performance
- Better debugging experience

### Schema Storage Approach

**Decision**: Store schemas in TypeScript files with synthesis at build time.

**Storage Options Evaluated**:
1. **TypeScript files** (chosen): Version controlled, type-safe, IDE support
2. **JSON files**: Portable but no type safety
3. **Database**: Dynamic but complex deployment
4. **Configuration service**: Centralized but added dependency

**Schema Evolution Strategy**:
```typescript
// Versioned schemas for backward compatibility
const UserSchemaV1 = defineSchema('User', {
  version: 1,
  fields: z.object({
    id: z.string(),
    name: z.string(),
  }),
});

const UserSchemaV2 = defineSchema('User', {
  version: 2,
  fields: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(), // New field
  }),
  migrations: {
    from: 1,
    up: (doc) => ({ ...doc, email: null }),
    down: (doc) => {
      const { email, ...rest } = doc;
      return rest;
    },
  },
});
```

## Implementation Roadmap

### Phase 1: Core Schema and Basic CRUD (Weeks 1-4)

**Goals**: Establish foundation with basic CRUD operations

**Deliverables**:
1. Schema definition API with Zod integration
2. Type generation from schemas
3. Basic CRUD operations for Cosmos DB
4. Simple authorization (authenticated/public)
5. Azure Functions for resolvers
6. Unit tests for core functionality

**Milestones**:
- Week 1: Schema API and type generation
- Week 2: Cosmos DB integration and CRUD
- Week 3: Azure Functions setup
- Week 4: Basic authorization and testing

### Phase 2: Relationships and Authorization (Weeks 5-8)

**Goals**: Add relationship support and sophisticated authorization

**Deliverables**:
1. Relationship definitions (1:1, 1:N, N:M)
2. Automatic foreign key management
3. Relationship resolution in queries
4. Role-based authorization with Entra ID
5. Field-level authorization
6. Owner-based access control

**Milestones**:
- Week 5: Relationship schema API
- Week 6: Query builder with joins
- Week 7: Entra ID integration
- Week 8: Authorization rule engine

### Phase 3: API Layer and Real-time (Weeks 9-12)

**Goals**: Complete API layer with real-time capabilities

**Deliverables**:
1. GraphQL schema generation
2. GraphQL resolvers with DataLoader
3. REST API generation with OpenAPI
4. Service Bus integration for events
5. SignalR for real-time subscriptions
6. API Management configuration

**Milestones**:
- Week 9: GraphQL generation and resolvers
- Week 10: REST API generation
- Week 11: Service Bus and SignalR
- Week 12: API Management setup

### Phase 4: Performance and Scale (Weeks 13-16)

**Goals**: Optimize for production workloads

**Deliverables**:
1. Redis Cache integration
2. Query optimization with indexes
3. Batch operations support
4. Connection pooling and retry logic
5. Monitoring with Application Insights
6. Performance testing suite

**Milestones**:
- Week 13: Caching layer
- Week 14: Query optimization
- Week 15: Monitoring and alerting
- Week 16: Load testing and tuning

## Example Usage

### Complete Working Example

Let's build a simple blog platform to demonstrate the framework:

```typescript
// 1. Define schemas with relationships
import { defineSchema, z, allow, hasMany, belongsTo, manyToMany } from '@atakora/data';

const BlogSchemas = {
  User: defineSchema('User', {
    fields: z.object({
      id: z.string().uuid().primaryKey().default(() => crypto.randomUUID()),
      email: z.string().email().unique(),
      name: z.string().min(2).max(100),
      bio: z.string().max(500).optional(),
      role: z.enum(['admin', 'author', 'reader']).default('reader'),
      avatarUrl: z.string().url().optional(),
      createdAt: z.date().default(() => new Date()),
    }),

    relationships: {
      posts: hasMany('Post', 'authorId'),
      comments: hasMany('Comment', 'userId'),
      likedPosts: manyToMany('Post', 'PostLikes'),
    },

    authorization: {
      create: allow.public(), // Anyone can register
      read: allow.public(), // Public profiles
      update: allow.owner().or(allow.role('admin')),
      delete: allow.role('admin'),
      fields: {
        email: allow.owner().or(allow.role('admin')),
      },
    },
  }),

  Post: defineSchema('Post', {
    fields: z.object({
      id: z.string().uuid().primaryKey().default(() => crypto.randomUUID()),
      title: z.string().min(1).max(200),
      slug: z.string().unique(),
      content: z.string().min(10),
      excerpt: z.string().max(300).optional(),
      status: z.enum(['draft', 'published', 'archived']).default('draft'),
      authorId: z.string().uuid(),
      publishedAt: z.date().optional(),
      tags: z.array(z.string()).default([]),
      metadata: z.object({
        readTime: z.number().optional(),
        views: z.number().default(0),
      }).optional(),
      createdAt: z.date().default(() => new Date()),
      updatedAt: z.date().onUpdate(),
    }),

    relationships: {
      author: belongsTo('User', 'authorId'),
      comments: hasMany('Comment', 'postId'),
      likes: manyToMany('User', 'PostLikes'),
      categories: manyToMany('Category', 'PostCategories'),
    },

    authorization: {
      create: allow.authenticated(),
      read: allow.if((ctx, post) =>
        post.status === 'published' ||
        post.authorId === ctx.user?.id ||
        ctx.user?.role === 'admin'
      ),
      update: allow.owner('authorId').or(allow.role('admin')),
      delete: allow.owner('authorId').or(allow.role('admin')),
    },

    indexes: {
      byAuthor: ['authorId', 'status', 'publishedAt'],
      byStatus: ['status', 'publishedAt'],
      bySlug: ['slug'],
    },

    hooks: {
      beforeCreate: async (data, ctx) => {
        // Auto-generate slug from title
        data.slug = data.slug || generateSlug(data.title);
        return data;
      },
      afterUpdate: async (data, ctx) => {
        // Update search index
        await updateSearchIndex(data);
      },
    },
  }),

  Comment: defineSchema('Comment', {
    fields: z.object({
      id: z.string().uuid().primaryKey().default(() => crypto.randomUUID()),
      content: z.string().min(1).max(1000),
      userId: z.string().uuid(),
      postId: z.string().uuid(),
      parentId: z.string().uuid().optional(), // For nested comments
      edited: z.boolean().default(false),
      createdAt: z.date().default(() => new Date()),
      updatedAt: z.date().onUpdate(),
    }),

    relationships: {
      user: belongsTo('User', 'userId'),
      post: belongsTo('Post', 'postId'),
      parent: belongsTo('Comment', 'parentId'),
      replies: hasMany('Comment', 'parentId'),
    },

    authorization: {
      create: allow.authenticated(),
      read: allow.public(),
      update: allow.owner('userId'),
      delete: allow.owner('userId').or(allow.role('admin')),
    },
  }),

  Category: defineSchema('Category', {
    fields: z.object({
      id: z.string().uuid().primaryKey().default(() => crypto.randomUUID()),
      name: z.string().unique(),
      slug: z.string().unique(),
      description: z.string().optional(),
      parentId: z.string().uuid().optional(),
    }),

    relationships: {
      posts: manyToMany('Post', 'PostCategories'),
      parent: belongsTo('Category', 'parentId'),
      children: hasMany('Category', 'parentId'),
    },

    authorization: {
      create: allow.role('admin'),
      read: allow.public(),
      update: allow.role('admin'),
      delete: allow.role('admin'),
    },
  }),
};
```

### Developer Workflow

```typescript
// 2. Generate infrastructure and types
import { AtokoraDataStack } from '@atakora/data-cdk';

export class BlogStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Deploy complete data layer
    new AtokoraDataStack(this, 'BlogData', {
      schemas: BlogSchemas,
      database: {
        cosmosDb: {
          throughput: { autoscale: { maxThroughput: 4000 } },
          multiRegion: false,
        },
      },
      api: {
        graphql: true,
        rest: true,
        realtime: true,
      },
      authentication: {
        provider: 'entraId',
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
      },
      monitoring: {
        applicationInsights: true,
        alerts: true,
      },
    });
  }
}

// 3. Use generated TypeScript client
import { BlogClient, User, Post } from './generated/blog-client';

const client = new BlogClient({
  endpoint: 'https://blog-api.azurewebsites.net',
  auth: { token: await getAccessToken() },
});

// Type-safe queries
const posts = await client.post.list({
  filter: {
    status: { eq: 'published' },
    author: {
      role: { in: ['admin', 'author'] },
    },
  },
  orderBy: [{ publishedAt: 'DESC' }],
  include: ['author', 'categories'],
  limit: 10,
});

// Type-safe mutations
const newPost = await client.post.create({
  title: 'Introduction to Atakora Data Framework',
  content: '...', // Required field
  tags: ['azure', 'typescript', 'graphql'], // Optional with default
  // authorId is automatically set from auth context
});

// Real-time subscriptions
const unsubscribe = client.post.subscribe({
  onCreate: (post) => {
    console.log('New post published:', post.title);
    // Update UI
  },
  filter: {
    status: { eq: 'published' },
  },
});
```

### Generated Outputs

The framework generates multiple artifacts:

```typescript
// generated/types.ts - Full TypeScript types
export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
  role: 'admin' | 'author' | 'reader';
  avatarUrl?: string;
  createdAt: Date;
  posts?: Post[];
  comments?: Comment[];
  likedPosts?: Post[];
}

// generated/graphql-schema.graphql
type Query {
  getUser(id: ID!): User
  listUsers(filter: UserFilter, limit: Int, nextToken: String): UserConnection!

  getPost(id: ID!): Post
  listPosts(filter: PostFilter, limit: Int, nextToken: String): PostConnection!
  # ... more queries
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): User!

  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): Post!
  publishPost(id: ID!): Post!
  # ... more mutations
}

type Subscription {
  onCreatePost(filter: PostFilter): Post
  onUpdatePost(filter: PostFilter): Post
  onDeletePost(filter: PostFilter): Post
}

// generated/openapi.yaml
openapi: 3.0.0
info:
  title: Blog API
  version: 1.0.0
paths:
  /users:
    get:
      operationId: listUsers
      parameters:
        - name: filter
          in: query
          schema:
            $ref: '#/components/schemas/UserFilter'
        - name: limit
          in: query
          schema:
            type: integer
        - name: nextToken
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserConnection'
    post:
      operationId: createUser
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserInput'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
  # ... more endpoints

// generated/arm-template.json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "resources": [
    {
      "type": "Microsoft.DocumentDB/databaseAccounts",
      "apiVersion": "2021-04-15",
      "name": "[parameters('cosmosDbAccountName')]",
      "location": "[parameters('location')]",
      "properties": {
        "databaseAccountOfferType": "Standard",
        "consistencyPolicy": {
          "defaultConsistencyLevel": "Session"
        },
        "locations": [
          {
            "locationName": "[parameters('location')]",
            "failoverPriority": 0,
            "isZoneRedundant": false
          }
        ]
      }
    },
    {
      "type": "Microsoft.Web/sites",
      "apiVersion": "2021-02-01",
      "name": "[parameters('functionAppName')]",
      "location": "[parameters('location')]",
      "kind": "functionapp",
      "properties": {
        "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', parameters('appServicePlanName'))]"
      }
    },
    {
      "type": "Microsoft.ApiManagement/service",
      "apiVersion": "2021-08-01",
      "name": "[parameters('apiManagementName')]",
      "location": "[parameters('location')]",
      "sku": {
        "name": "Consumption",
        "capacity": 0
      }
    }
    // ... more resources
  ]
}
```

## Open Questions

### Technical Unknowns

1. **Multi-region Cosmos DB Sync**: How to handle cross-region consistency for real-time subscriptions?
2. **Large File Handling**: Should the framework handle blob storage for large files automatically?
3. **Search Integration**: When to use Cosmos DB queries vs Azure Cognitive Search?
4. **Offline Support**: Should the framework generate offline-capable clients?
5. **Testing Strategy**: How to provide testing utilities for schemas and authorization rules?

### Design Alternatives

1. **Schema Format**: Should we support GraphQL SDL as an alternative to Zod definitions?
2. **Database Choice**: Should we support Azure SQL Database as an alternative to Cosmos DB?
3. **Authorization Engine**: Build custom engine vs use Open Policy Agent (OPA)?
4. **Code Generation**: Generate at build time vs runtime with caching?
5. **Client Libraries**: Generate native SDKs vs use generic GraphQL/REST clients?

### Integration Points with Atakora

1. **Construct Integration**: How do data schemas integrate with existing Atakora constructs?
2. **Stack Composition**: Can data stacks be composed with other infrastructure stacks?
3. **Cross-Stack References**: How to reference data resources from other stacks?
4. **Deployment Pipeline**: How does schema migration work with Atakora deployment?
5. **Configuration Management**: How to handle environment-specific configuration?

### Government Cloud Considerations

1. **Service Availability**: Which services have Government cloud equivalents?
2. **Compliance**: How to ensure ITAR/FedRAMP compliance in generated code?
3. **Network Isolation**: How to support air-gapped environments?
4. **Encryption**: How to handle encryption key management in Government cloud?
5. **Audit Logging**: What additional audit requirements exist for Government cloud?

### Performance Optimization

1. **Query Compilation**: Should we pre-compile common queries?
2. **Caching Strategy**: What should be cached and for how long?
3. **Batch Operations**: How to optimize batch inserts/updates?
4. **Index Management**: How to automatically suggest optimal indexes?
5. **Connection Pooling**: How to manage connection pools across Functions?

### Developer Experience

1. **Migration Tools**: How to handle schema evolution and data migration?
2. **Local Development**: How to provide a local development environment?
3. **Debugging**: How to enable debugging of generated code?
4. **Documentation**: Should we auto-generate API documentation?
5. **Playground**: Should we provide a GraphQL playground in development?

## Conclusion

This Azure Data Schema Framework for Atakora provides a comprehensive solution for building type-safe, scalable data layers on Azure. By leveraging TypeScript, Zod, and native Azure services, it offers developers a familiar and powerful way to define data models while generating all the necessary infrastructure and API layers automatically.

The framework's progressive enhancement approach allows teams to start simple and add sophistication as needed, while the deep Azure integration ensures optimal use of cloud services. With built-in support for authorization, real-time updates, and relationships, it addresses the common needs of modern applications while maintaining the flexibility for custom requirements.

The implementation roadmap provides a clear path forward, with each phase delivering tangible value while building toward the complete solution. Open questions have been identified to guide future architectural decisions and ensure the framework evolves to meet emerging needs.

This design maintains consistency with Atakora's existing patterns while introducing powerful new capabilities for data-driven applications on Azure.