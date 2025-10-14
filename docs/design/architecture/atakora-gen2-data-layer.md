# Atakora Gen 2 - Universal Data Layer

**Extension to**: atakora-gen2-define-api.md
**Created**: 2025-10-14
**Status**: Design Phase

## Overview

The Universal Data Layer extends Atakora Gen 2 with a unified schema definition system that supports both **simple CRUD REST APIs** (`c.model()`) and **GraphQL implementations** (`g.model()`) from a single schema definition.

## Vision

Define your entire data model once, then choose the best access pattern for each model:
- **CRUD models** (`c.model()`) - Generate REST endpoints automatically
- **GraphQL models** (`g.model()`) - Full GraphQL with resolvers, mutations, subscriptions

## The Ideal Data Definition

```typescript
// packages/backend/src/data/schema/resource.ts
import { defineData } from '@atakora/component';
import { a, c, g } from '@atakora/data';

export const data = defineData({
  schema: a.schema({
    // Shared types
    AddressType: a.enum(['Home', 'Work', 'Other']),

    // CRUD models - Simple REST APIs
    Organization: c.model({
      displayName: a.string().required(),
      created: a.datetime(),
      updated: a.datetime(),
    }).authorization(allow => [
      allow.owner(),
      allow.groups(['admins']),
    ]),

    IDP: c.model({
      name: a.string().required(),
      type: a.string().required(),
      config: a.json(),
    }).authorization(allow => [
      allow.groups(['admins']),
    ]),

    Address: c.model({
      type: a.ref('AddressType').required(),
      street1: a.string().required(),
      street2: a.string(),
      city: a.string().required(),
      state: a.string().required(),
      postalCode: a.string().required(),
      country: a.string().required(),
    }),

    // GraphQL models - Complex queries and relationships
    Entity: g.model({
      organization: a.belongsTo('Organization'),
      displayName: a.string().required(),
      idp: a.belongsTo('IDP'),
      addresses: a.hasMany('Address'),
      created: a.datetime(),
      updated: a.datetime(),
    }).authorization(allow => [
      allow.owner(),
      allow.groups(['admins']),
    ]),

    Person: g.model({
      entity: a.belongsTo('Entity').required(),
      firstName: a.string().required(),
      lastName: a.string().required(),
      email: a.email().required(),
      phones: a.hasMany('Phone'),
      addresses: a.hasMany('Address'),
    }).authorization(allow => [
      allow.owner(),
    ]),
  }),

  // Custom mutations with Azure Function handlers
  mutations: {
    initiatePasswordReset: a.mutation()
      .arguments({ email: a.string().required() })
      .returns(a.json())
      .handler(a.handler.function(initPasswordReset))
      .authorization(allow => [allow.guest()]),

    confirmPasswordReset: a.mutation()
      .arguments({
        email: a.string().required(),
        code: a.string().required(),
        password: a.string().required(),
      })
      .returns(a.json())
      .handler(a.handler.function(confirmPasswordReset))
      .authorization(allow => [allow.guest()]),
  },
});
```

## Integration with Gen 2 Backend

```typescript
// packages/backend/src/index.ts
import { defineBackend } from '@atakora/component';
import { data } from './data/schema/resource';
import { processUploadFunction } from './functions/process-upload/resource';

const backend = defineBackend({
  data,  // Universal data layer
  processUploadFunction,
});

export { backend };
```

**That's it.** The data layer automatically:
1. Creates Cosmos DB containers for all models
2. Generates REST CRUD endpoints for `c.model()` types
3. Creates GraphQL schema and resolvers for `g.model()` types
4. Configures App Service for GraphQL API
5. Sets up authentication and authorization
6. Wires custom mutation handlers to Azure Functions

## Schema Builder API

### Core Schema Definition

```typescript
a.schema({
  // Type definitions
  [modelName: string]: ModelDefinition | EnumDefinition
})
```

### Primitive Types

```typescript
a.string()              // String field
a.integer()             // Integer number
a.float()               // Floating point number
a.boolean()             // Boolean
a.datetime()            // ISO 8601 datetime
a.date()                // ISO 8601 date
a.time()                // ISO 8601 time
a.email()               // Email with validation
a.url()                 // URL with validation
a.json()                // JSON object
a.id()                  // Auto-generated ID
```

### Type Modifiers

```typescript
.required()             // Field is required
.default(value)         // Default value
.unique()               // Unique constraint
.min(n)                 // Minimum value/length
.max(n)                 // Maximum value/length
.regex(pattern)         // Regex validation
```

### Complex Types

```typescript
a.enum(['value1', 'value2'])           // Enum type
a.ref('TypeName')                      // Reference to another type
a.array(a.string())                    // Array of strings
a.belongsTo('ModelName')               // Foreign key relationship
a.hasOne('ModelName')                  // One-to-one relationship
a.hasMany('ModelName')                 // One-to-many relationship
```

### Relationships

```typescript
// One-to-many
Organization: c.model({
  entities: a.hasMany('Entity'),
}),
Entity: g.model({
  organization: a.belongsTo('Organization'),
}),

// One-to-one
User: g.model({
  profile: a.hasOne('Profile'),
}),
Profile: g.model({
  user: a.belongsTo('User'),
}),

// Many-to-many (through join model)
Student: g.model({
  enrollments: a.hasMany('Enrollment'),
}),
Course: g.model({
  enrollments: a.hasMany('Enrollment'),
}),
Enrollment: g.model({
  student: a.belongsTo('Student'),
  course: a.belongsTo('Course'),
}),
```

## CRUD Models (`c.model()`)

CRUD models generate simple REST endpoints for basic operations.

### Generated REST Endpoints

For a CRUD model `Organization`:

```
POST   /api/organization              - Create
GET    /api/organization/:id          - Read one
GET    /api/organization              - List all (with pagination)
PATCH  /api/organization/:id          - Update
DELETE /api/organization/:id          - Delete
```

### Query Parameters

```
GET /api/organization?limit=50&offset=0&sort=created:desc&filter=displayName:contains:Acme
```

### Example Usage

```typescript
// Create
POST /api/organization
{
  "displayName": "Acme Corp",
  "created": "2025-10-14T12:00:00Z"
}

// List with filter
GET /api/organization?filter=displayName:contains:Acme

// Update
PATCH /api/organization/123
{
  "displayName": "Acme Corporation"
}
```

## GraphQL Models (`g.model()`)

GraphQL models generate a full GraphQL schema with queries, mutations, and subscriptions.

### Generated GraphQL Schema

For GraphQL models `Entity` and `Person`:

```graphql
type Entity {
  id: ID!
  organization: Organization
  displayName: String!
  idp: IDP
  addresses: [Address!]!
  created: DateTime
  updated: DateTime
}

type Person {
  id: ID!
  entity: Entity!
  firstName: String!
  lastName: String!
  email: String!
  phones: [Phone!]!
  addresses: [Address!]!
}

type Query {
  getEntity(id: ID!): Entity
  listEntities(limit: Int, nextToken: String, filter: EntityFilterInput): EntityConnection!
  getPerson(id: ID!): Person
  listPersons(limit: Int, nextToken: String, filter: PersonFilterInput): PersonConnection!
}

type Mutation {
  createEntity(input: CreateEntityInput!): Entity!
  updateEntity(input: UpdateEntityInput!): Entity!
  deleteEntity(id: ID!): Entity

  createPerson(input: CreatePersonInput!): Person!
  updatePerson(input: UpdatePersonInput!): Person!
  deletePerson(id: ID!): Person

  # Custom mutations
  initiatePasswordReset(email: String!): JSON!
  confirmPasswordReset(email: String!, code: String!, password: String!): JSON!
}

type Subscription {
  onCreateEntity(filter: EntityFilterInput): Entity
  onUpdateEntity(filter: EntityFilterInput): Entity
  onDeleteEntity(filter: EntityFilterInput): Entity
}
```

### GraphQL Endpoint

```
POST /graphql
```

### Example Queries

```graphql
# Get entity with relationships
query GetEntity {
  getEntity(id: "123") {
    displayName
    organization {
      displayName
    }
    addresses {
      street1
      city
      state
    }
  }
}

# List with filter
query ListEntities {
  listEntities(
    filter: { displayName: { contains: "Acme" } }
    limit: 10
  ) {
    items {
      id
      displayName
    }
    nextToken
  }
}

# Custom mutation
mutation InitiateReset {
  initiatePasswordReset(email: "user@example.com") {
    success
    message
  }
}
```

## Authorization System

### Authorization Rules

```typescript
.authorization(allow => [
  allow.owner(),                    // Owner can access their own data
  allow.groups(['admins']),         // Admin group has access
  allow.groups(['editors', 'viewers']), // Multiple groups
  allow.guest(),                    // Unauthenticated access
  allow.authenticated(),            // Any authenticated user
  allow.custom((ctx) => {           // Custom logic
    return ctx.user.role === 'manager';
  }),
])
```

### Field-Level Authorization

```typescript
Person: g.model({
  firstName: a.string().required(),
  lastName: a.string().required(),
  email: a.email().required(),
  ssn: a.string().authorization(allow => [
    allow.groups(['admins']),  // Only admins can see SSN
  ]),
}).authorization(allow => [
  allow.owner(),
  allow.groups(['admins']),
])
```

### Operation-Level Authorization

```typescript
Person: g.model({
  firstName: a.string().required(),
  lastName: a.string().required(),
}).authorization(allow => [
  allow.owner().to(['read', 'update']),        // Owner can read/update
  allow.groups(['admins']).to(['create', 'read', 'update', 'delete']),
  allow.authenticated().to(['read']),           // Anyone can read
])
```

## Custom Mutations with Azure Functions

### Define Mutation with Handler

```typescript
mutations: {
  initiatePasswordReset: a.mutation()
    .arguments({ email: a.string().required() })
    .returns(a.json())
    .handler(a.handler.function(initPasswordReset))
    .authorization(allow => [allow.guest()]),
}
```

### Function Handler Implementation

```typescript
// packages/backend/src/functions/init-password-reset/resource.ts
import { defineFunction } from '@atakora/component';

export const initPasswordReset = defineFunction({
  name: 'init-password-reset',
  entry: './handler.ts',
  runtime: 20,

  environment: {
    USER_POOL_ID: '${backend.userPool.id}',
    JWT_SECRET: '${backend.secrets.jwtSecret}',
  },
});
```

```typescript
// packages/backend/src/functions/init-password-reset/handler.ts
import { AzureFunction, Context } from '@azure/functions';

const handler: AzureFunction = async function (
  context: Context,
  args: { email: string }
): Promise<any> {
  const { email } = args;

  // Generate reset code
  const code = generateResetCode();

  // Store code in Cosmos DB
  await storeResetCode(email, code);

  // Send email
  await sendResetEmail(email, code);

  return {
    success: true,
    message: 'Password reset email sent',
  };
};

export default handler;
```

## Implementation Architecture

### Phase 1: Schema Builder

```typescript
// packages/data/src/schema/builder.ts

export class SchemaBuilder {
  private models: Map<string, ModelDefinition> = new Map();
  private enums: Map<string, EnumDefinition> = new Map();

  schema(definitions: Record<string, any>): SchemaDefinition {
    for (const [name, def] of Object.entries(definitions)) {
      if (def._type === 'c.model') {
        this.models.set(name, { ...def, accessPattern: 'crud' });
      } else if (def._type === 'g.model') {
        this.models.set(name, { ...def, accessPattern: 'graphql' });
      } else if (def._type === 'enum') {
        this.enums.set(name, def);
      }
    }

    return {
      models: this.models,
      enums: this.enums,
    };
  }
}

// Field builders
export const a = {
  schema: (defs: any) => new SchemaBuilder().schema(defs),
  string: () => new StringField(),
  integer: () => new IntegerField(),
  datetime: () => new DateTimeField(),
  email: () => new EmailField(),
  enum: (values: string[]) => new EnumField(values),
  ref: (typeName: string) => new ReferenceField(typeName),
  belongsTo: (modelName: string) => new BelongsToField(modelName),
  hasOne: (modelName: string) => new HasOneField(modelName),
  hasMany: (modelName: string) => new HasManyField(modelName),
  json: () => new JsonField(),
  mutation: () => new MutationBuilder(),
  handler: {
    function: (fn: any) => new FunctionHandler(fn),
  },
};

// Model builders
export const c = {
  model: (fields: any) => new CrudModel(fields),
};

export const g = {
  model: (fields: any) => new GraphQLModel(fields),
};
```

### Phase 2: Data Component

```typescript
// packages/component/src/data/define-data.ts

import { Construct } from '@atakora/cdk';
import { SchemaDefinition } from '@atakora/data';

export interface DataConfig {
  schema: SchemaDefinition;
  mutations?: Record<string, MutationDefinition>;
}

export class DataLayer extends Construct {
  readonly componentType = 'data-layer' as const;

  readonly schema: SchemaDefinition;
  readonly crudApis: Map<string, CrudApi> = new Map();
  readonly graphqlSchema: GraphQLSchema;

  constructor(config: DataConfig) {
    super();

    this.schema = config.schema;

    // Generate CRUD APIs for c.model()
    for (const [name, model] of config.schema.models.entries()) {
      if (model.accessPattern === 'crud') {
        const api = this.generateCrudApi(name, model);
        this.crudApis.set(name, api);
      }
    }

    // Generate GraphQL schema for g.model()
    this.graphqlSchema = this.generateGraphQLSchema(config);
  }

  private generateCrudApi(name: string, model: ModelDefinition): CrudApi {
    return defineCrudApi({
      name: name.toLowerCase(),
      entityName: name,
      entityNamePlural: pluralize(name),
      schema: this.convertToJsonSchema(model.fields),
      authorization: model.authorization,
    });
  }

  private generateGraphQLSchema(config: DataConfig): GraphQLSchema {
    const builder = new GraphQLSchemaBuilder();

    // Add types
    for (const [name, model] of config.schema.models.entries()) {
      if (model.accessPattern === 'graphql') {
        builder.addType(name, model);
      }
    }

    // Add custom mutations
    if (config.mutations) {
      for (const [name, mutation] of Object.entries(config.mutations)) {
        builder.addMutation(name, mutation);
      }
    }

    return builder.build();
  }
}

export function defineData(config: DataConfig): DataLayer {
  return new DataLayer(config);
}
```

### Phase 3: Backend Integration

```typescript
// packages/component/src/backend/backend.ts

export class Backend extends Construct {
  // ... existing code

  private dataLayer?: DataLayer;

  addComponent(component: Component): void {
    switch (component.componentType) {
      case 'data-layer':
        this.addDataLayer(component as DataLayer);
        break;
      // ... other cases
    }
  }

  private addDataLayer(data: DataLayer): void {
    this.dataLayer = data;

    // Create Cosmos DB containers for all models
    for (const [name, model] of data.schema.models.entries()) {
      this.createContainer(name, model);
    }

    // Add CRUD APIs to Function App
    for (const [name, api] of data.crudApis.entries()) {
      this.addCrudApi(api);
    }

    // Create GraphQL App Service
    if (data.graphqlSchema) {
      this.createGraphQLService(data.graphqlSchema);
    }
  }

  private createGraphQLService(schema: GraphQLSchema): void {
    // Create App Service Plan
    const plan = new AppServicePlan(this.stack, 'graphql-plan', {
      sku: { name: 'B1', tier: 'Basic' },
    });

    // Create Web App
    const app = new WebSites(this.stack, 'graphql-api', {
      serverFarmId: plan.id,
      siteConfig: {
        appSettings: [
          { name: 'COSMOS_ENDPOINT', value: this.cosmos.endpoint },
          { name: 'COSMOS_KEY', value: this.cosmos.primaryKey },
        ],
      },
    });

    // Deploy GraphQL server (Apollo Server on Node.js)
    this.deployGraphQLServer(app, schema);
  }
}
```

### Phase 4: GraphQL Server Generation

```typescript
// packages/data/src/graphql/server-generator.ts

export class GraphQLServerGenerator {
  generate(schema: SchemaDefinition, mutations: MutationDefinitions): string {
    const typeDefs = this.generateTypeDefs(schema);
    const resolvers = this.generateResolvers(schema, mutations);

    return `
import { ApolloServer } from 'apollo-server-azure-functions';
import { CosmosClient } from '@azure/cosmos';

const typeDefs = \`${typeDefs}\`;

const resolvers = ${JSON.stringify(resolvers, null, 2)};

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    user: req.user,
    cosmos: client,
  }),
});

export default server.createHandler();
    `;
  }

  private generateTypeDefs(schema: SchemaDefinition): string {
    let typeDefs = '';

    for (const [name, model] of schema.models.entries()) {
      if (model.accessPattern === 'graphql') {
        typeDefs += this.generateTypeDefinition(name, model);
      }
    }

    typeDefs += this.generateQueryType(schema);
    typeDefs += this.generateMutationType(schema);

    return typeDefs;
  }
}
```

## Migration from Separate Definitions

### Before (Separate CRUD and Functions)

```typescript
// Multiple files
import { defineCrudApi } from '@atakora/component';
import { defineFunction } from '@atakora/component';

export const organizationApi = defineCrudApi({
  name: 'organization',
  schema: { /* ... */ },
});

export const resetPasswordFn = defineFunction({
  name: 'reset-password',
  trigger: { type: 'http' },
});
```

### After (Unified Schema)

```typescript
// Single file
import { defineData } from '@atakora/component';
import { a, c, g } from '@atakora/data';

export const data = defineData({
  schema: a.schema({
    Organization: c.model({ /* ... */ }),
    Person: g.model({ /* ... */ }),
  }),
  mutations: {
    resetPassword: a.mutation()
      .handler(a.handler.function(resetPasswordFn)),
  },
});
```

## Benefits

1. **Single Source of Truth** - Define schema once, use everywhere
2. **Flexibility** - Choose CRUD or GraphQL per model
3. **Type Safety** - Full TypeScript support across schema
4. **Relationships** - Built-in support for complex relationships
5. **Authorization** - Fine-grained access control at model and field level
6. **Custom Logic** - Azure Functions for custom mutations
7. **Consistency** - Unified API for all data access patterns

## Implementation Timeline

### Week 1-2: Schema Builder
- [ ] Implement field type builders (`a.string()`, `a.integer()`, etc.)
- [ ] Add relationship builders (`a.belongsTo()`, `a.hasMany()`)
- [ ] Create model builders (`c.model()`, `g.model()`)
- [ ] Add authorization builders

### Week 3-4: CRUD Generation
- [ ] Generate REST endpoints from `c.model()`
- [ ] Implement query parameters (filter, sort, pagination)
- [ ] Add Cosmos DB persistence layer
- [ ] Implement authorization middleware

### Week 5-6: GraphQL Generation
- [ ] Generate GraphQL schema from `g.model()`
- [ ] Create resolvers for queries and mutations
- [ ] Implement relationship resolvers
- [ ] Add subscription support

### Week 7-8: Custom Mutations
- [ ] Implement `a.mutation()` builder
- [ ] Wire mutations to Azure Functions
- [ ] Add argument validation
- [ ] Implement authorization for mutations

### Week 9-10: Integration & Testing
- [ ] Integrate with `defineBackend()`
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation and examples

## Success Metrics

- **Schema Definition Time**: < 10 minutes per model
- **CRUD Endpoint Generation**: 100% automatic
- **GraphQL Schema Generation**: 100% automatic
- **Type Safety**: 100% TypeScript coverage
- **Authorization Coverage**: Model and field level

---

**Next Steps:**
1. Review and approve this data layer design
2. Begin Week 1-2 implementation (schema builder)
3. Create example schemas for testing
4. Integrate with existing Gen 2 architecture
