# AWS Amplify Gen 2 Comparison Analysis

**Author:** Becky (Staff Architect)
**Date:** 2025-11-23
**Status:** Complete

## Executive Summary

This document analyzes AWS Amplify Gen 2's schema-first approach and compares it to our Atakora Component package. The analysis reveals that while we have successfully implemented the schema definition layer, we are **completely missing the API and Function generation layers** that make Amplify powerful.

**Critical Finding:** We have the schema definition but not the auto-generation of CRUD APIs, resolver functions, or GraphQL/REST endpoints.

---

## 1. AWS Amplify Gen 2 Architecture

### 1.1 The Complete Flow

```
Schema Definition (TypeScript)
    ↓
defineData({ schema }) + defineAuth({ strategy })
    ↓
AMPLIFY AUTO-GENERATES:
├─ AppSync GraphQL API
│  ├─ GraphQL schema file (.graphql)
│  ├─ Query operations (get, list)
│  ├─ Mutation operations (create, update, delete)
│  └─ Subscription operations (onCreate, onUpdate, onDelete)
├─ DynamoDB Tables
│  ├─ One table per model
│  ├─ Partition key from @model
│  └─ GSIs from @index
├─ Lambda Resolvers
│  ├─ CRUD operation handlers
│  ├─ Custom business logic hooks
│  └─ Authorization middleware
├─ Cognito User Pools (from auth definition)
└─ AppSync Authorization Rules
    ↓
Deployed via CDK (under the hood)
```

### 1.2 Amplify Gen 2 Example

```typescript
// ===== STEP 1: Define Schema =====
import { a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a.model({
    content: a.string(),
    isDone: a.boolean(),
    priority: a.enum(['low', 'medium', 'high']),
    owner: a.string()
  })
  .authorization([a.allow.owner()]), // Auth rules inline

  Project: a.model({
    name: a.string(),
    description: a.string(),
    todos: a.hasMany('Todo', 'projectId') // Relationship
  })
  .authorization([a.allow.authenticated()])
});

// ===== STEP 2: Define Data Backend =====
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  }
});

// ===== THAT'S IT! Amplify generates: =====
// 1. GraphQL API with schema:
//    - type Todo { id: ID!, content: String, isDone: Boolean, priority: Priority, owner: String }
//    - type Query { getTodo(id: ID!): Todo, listTodos: [Todo] }
//    - type Mutation { createTodo(input: CreateTodoInput!): Todo, updateTodo(...), deleteTodo(...) }
//    - type Subscription { onCreateTodo: Todo, onUpdateTodo: Todo, onDeleteTodo: Todo }
//
// 2. DynamoDB Tables:
//    - TodoTable (partition key: id)
//    - ProjectTable (partition key: id)
//
// 3. Lambda Functions:
//    - getTodoResolver
//    - listTodosResolver
//    - createTodoResolver
//    - updateTodoResolver
//    - deleteTodoResolver
//    - (same for Project)
//
// 4. AppSync Resolvers:
//    - Maps GraphQL operations to Lambda functions
//    - Applies authorization rules
//
// 5. Cognito User Pool:
//    - User authentication
//    - JWT token validation
```

### 1.3 What Gets Auto-Generated

**GraphQL Schema File:**
```graphql
# Auto-generated from TypeScript schema
type Todo @model @auth(rules: [{ allow: owner }]) {
  id: ID!
  content: String
  isDone: Boolean
  priority: Priority
  owner: String
}

enum Priority {
  low
  medium
  high
}

type Query {
  getTodo(id: ID!): Todo
  listTodos(filter: TodoFilterInput, limit: Int, nextToken: String): TodoConnection
}

type Mutation {
  createTodo(input: CreateTodoInput!): Todo
  updateTodo(input: UpdateTodoInput!): Todo
  deleteTodo(input: DeleteTodoInput!): Todo
}

type Subscription {
  onCreateTodo(owner: String): Todo @aws_subscribe(mutations: ["createTodo"])
  onUpdateTodo(owner: String): Todo @aws_subscribe(mutations: ["updateTodo"])
  onDeleteTodo(owner: String): Todo @aws_subscribe(mutations: ["deleteTodo"])
}
```

**Lambda Resolver Functions:**
```typescript
// Auto-generated CRUD resolver
export const createTodoResolver = async (event: AppSyncResolverEvent) => {
  const { input } = event.arguments;
  const { owner } = event.identity;

  // Validation
  if (!input.content) {
    throw new Error('Content is required');
  }

  // Authorization check
  if (input.owner !== owner) {
    throw new Error('Unauthorized');
  }

  // DynamoDB operation
  const todo = await dynamodb.put({
    TableName: process.env.TODO_TABLE_NAME,
    Item: {
      id: uuid(),
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  });

  return todo;
};
```

**DynamoDB Table (via CDK):**
```typescript
// Auto-generated from schema
new dynamodb.Table(this, 'TodoTable', {
  tableName: 'Todo-dev',
  partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  pointInTimeRecovery: true,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES
});
```

**AppSync API (via CDK):**
```typescript
// Auto-generated from schema
const api = new appsync.GraphqlApi(this, 'Api', {
  name: 'todo-api',
  schema: appsync.SchemaFile.fromAsset('schema.graphql'),
  authorizationConfig: {
    defaultAuthorization: {
      authorizationType: appsync.AuthorizationType.USER_POOL,
      userPoolConfig: { userPool }
    }
  }
});

// Auto-generated resolvers
api.addResolver({
  typeName: 'Mutation',
  fieldName: 'createTodo',
  dataSource: lambdaDataSource,
  requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
  responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
});
```

---

## 2. Atakora Component Package Current State

### 2.1 What We Have

**Schema Definition:**
```typescript
// packages/component/src/schema/define-schema.ts
import { defineSchema, a, c } from '@atakora/component';

const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().email().required(),
      name: a.string().required()
    }),

    Project: c.model({
      id: a.id(),
      name: a.string().required(),
      ownerId: a.ref('User')
    })
  })
});

// ✅ We have schema definition
// ✅ We have field types (string, number, id, ref, etc.)
// ✅ We have model categorization (CRUD, events, functions)
// ✅ We have validation logic
```

**Backend Definition:**
```typescript
// packages/component/src/backend/define-backend.ts
import { defineBackend } from '@atakora/component';

const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    region: 'eastus'
  }
});

// ✅ We have backend assembly
// ✅ We have attachment points for customization
// ✅ We have environment detection
// ✅ We have settings resolution
```

### 2.2 What We're Missing

**EVERYTHING AFTER BACKEND DEFINITION:**

```typescript
// What should happen but doesn't:

backend.synth(); // ❌ This doesn't exist

// Should auto-generate:
// ❌ No Cosmos DB containers (we have Cosmos account, but no containers)
// ❌ No API Management instance
// ❌ No GraphQL schema file
// ❌ No REST API endpoints
// ❌ No CRUD operation functions
// ❌ No resolver functions
// ❌ No function app configuration
// ❌ No authorization middleware
```

### 2.3 Evidence from Generated ARM Template

Looking at `/arm.out/my-app.json`:

```json
{
  "resources": [
    {
      "type": "Microsoft.DocumentDB/databaseAccounts",
      "name": "cosdb-org-my-app-dev-eus-01",
      "properties": { ... }
      // ✅ Cosmos DB account created
    },
    {
      "type": "Microsoft.DocumentDB/databaseAccounts/sqlDatabases",
      "name": "cosdb-org-my-app-dev-eus-01/my-app",
      "properties": { "resource": { "id": "my-app" } }
      // ✅ Database created
    },
    {
      "type": "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers",
      "name": "cosdb-org-my-app-dev-eus-01/my-app/users",
      "properties": {
        "resource": {
          "id": "users",
          "partitionKey": { "paths": ["/id"] }
        }
      }
      // ✅ User container created
    },
    {
      "type": "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers",
      "name": "cosdb-org-my-app-dev-eus-01/my-app/projects",
      // ✅ Project container created
    },
    {
      "type": "Microsoft.Storage/storageAccounts",
      "name": "stoorgmyappdeveus01"
      // ✅ Storage account for functions
    },
    {
      "type": "Microsoft.KeyVault/vaults",
      "name": "kv-org-my-app-dev-eus-01"
      // ✅ Key Vault for secrets
    },
    {
      "type": "Microsoft.Web/serverfarms",
      "name": "aspsrvpl-org-my-app-dev-eus-01"
      // ✅ Function App Service Plan
    },
    {
      "type": "Microsoft.Web/sites",
      "name": "appsrv-func-org-my-app-dev-eus-01",
      "kind": "functionapp",
      "properties": {
        "siteConfig": {
          // ❌ NO FUNCTIONS DEFINED
          // ❌ NO APP SETTINGS FOR COSMOS CONNECTION
        }
      }
    }
    // ❌ NO API MANAGEMENT
    // ❌ NO GRAPHQL SCHEMA
    // ❌ NO FUNCTION DEFINITIONS
  ]
}
```

**Analysis:**
- ✅ We generate infrastructure layer (Cosmos, Storage, KeyVault, Function App host)
- ❌ We DON'T generate API layer (API Management, endpoints)
- ❌ We DON'T generate function layer (actual functions, resolvers)
- ❌ We DON'T generate schema layer (GraphQL/OpenAPI specs)

---

## 3. Comparison: Amplify vs Atakora

### 3.1 Schema Definition

| Feature | Amplify Gen 2 | Atakora | Status |
|---------|---------------|---------|--------|
| TypeScript-first | ✅ `a.string()` | ✅ `a.string()` | ✅ PARITY |
| Field types | ✅ string, number, boolean, enum | ✅ string, number, boolean, enum, id, ref, array, object | ✅ PARITY |
| Relationships | ✅ `a.hasMany()`, `a.belongsTo()` | ✅ `a.ref()` | ⚠️ PARTIAL |
| Validation | ✅ `a.string().required()` | ✅ `a.string().required()` | ✅ PARITY |
| Model types | ✅ `a.model()` | ✅ `c.model()`, `e.model()`, `f.model()` | ✅ BETTER |
| Inline auth rules | ✅ `.authorization([])` | ❌ No inline auth | ⚠️ DIFFERENT |

**Verdict:** Strong parity in schema definition. We actually have more model types (CRUD, events, functions).

### 3.2 Backend Definition

| Feature | Amplify Gen 2 | Atakora | Status |
|---------|---------------|---------|--------|
| Combine schema + auth | ✅ `defineData()` + `defineAuth()` | ✅ `defineBackend()` | ✅ PARITY |
| Environment awareness | ✅ Via Amplify config | ✅ Via settings + env detection | ✅ PARITY |
| Customization points | ⚠️ Limited | ✅ Attachment points | ✅ BETTER |
| Type inference | ✅ Full TypeScript types | ✅ Full TypeScript types | ✅ PARITY |

**Verdict:** Parity in backend definition. Our attachment points are more flexible.

### 3.3 Infrastructure Generation

| Feature | Amplify Gen 2 | Atakora | Status |
|---------|---------------|---------|--------|
| Database tables | ✅ Auto-generated DynamoDB | ✅ Auto-generated Cosmos containers | ✅ PARITY |
| API layer | ✅ Auto-generated AppSync GraphQL | ❌ NO API MANAGEMENT | ❌ CRITICAL GAP |
| CRUD operations | ✅ Auto-generated queries/mutations | ❌ NO OPERATIONS | ❌ CRITICAL GAP |
| Resolver functions | ✅ Auto-generated Lambda functions | ❌ NO FUNCTIONS | ❌ CRITICAL GAP |
| Authorization | ✅ Auto-applied to resolvers | ❌ NO AUTH INTEGRATION | ❌ CRITICAL GAP |
| Real-time (subscriptions) | ✅ Auto-generated subscriptions | ❌ NO SUBSCRIPTIONS | ❌ GAP |

**Verdict:** We generate database layer correctly, but we're missing the entire API + Function layer.

### 3.4 Generated Artifacts

| Artifact | Amplify Gen 2 | Atakora | Status |
|----------|---------------|---------|--------|
| GraphQL schema file | ✅ `schema.graphql` | ❌ No GraphQL | ❌ GAP |
| OpenAPI spec | ⚠️ Via plugin | ❌ No OpenAPI | ❌ GAP |
| TypeScript types | ✅ Client types | ⚠️ Schema types only | ⚠️ PARTIAL |
| Function code | ✅ CRUD resolvers | ❌ No functions | ❌ CRITICAL GAP |
| Infrastructure code | ✅ CDK (hidden) | ✅ ARM templates | ✅ PARITY |

**Verdict:** We're missing schema file generation and function code generation.

---

## 4. Deep Dive: How Amplify Generates APIs

### 4.1 Amplify's Generation Pipeline

```
Schema AST (TypeScript parsed)
    ↓
Model Analysis
├─ Extract models (Todo, Project)
├─ Extract fields (content, isDone, priority)
├─ Extract relationships (hasMany, belongsTo)
├─ Extract auth rules (.authorization)
└─ Extract indexes (@index)
    ↓
GraphQL Schema Generation
├─ For each model → create GraphQL type
├─ For each field → create GraphQL field
├─ For each model → create Query operations (get, list)
├─ For each model → create Mutation operations (create, update, delete)
├─ For each model → create Subscription operations (onCreate, onUpdate, onDelete)
└─ For each relationship → create connection fields
    ↓
Resolver Generation
├─ For each Query → create Lambda function
├─ For each Mutation → create Lambda function
├─ For each Subscription → create event mapping
└─ Apply authorization middleware
    ↓
AppSync Configuration
├─ Create GraphQL API resource
├─ Attach schema
├─ Create data sources (Lambda, DynamoDB)
├─ Create resolvers (map operations to data sources)
└─ Configure authorization
    ↓
CDK Synthesis
└─ Generate CloudFormation
```

### 4.2 Example: Todo Model Generation

**Input (TypeScript):**
```typescript
const Todo = a.model({
  content: a.string(),
  isDone: a.boolean(),
  priority: a.enum(['low', 'medium', 'high'])
}).authorization([a.allow.owner()]);
```

**Output 1: GraphQL Type**
```graphql
type Todo @model @auth(rules: [{ allow: owner }]) {
  id: ID!
  content: String
  isDone: Boolean
  priority: Priority
  owner: String
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

enum Priority {
  low
  medium
  high
}
```

**Output 2: GraphQL Operations**
```graphql
type Query {
  getTodo(id: ID!): Todo @auth(rules: [{ allow: owner }])
  listTodos(
    filter: TodoFilterInput
    limit: Int
    nextToken: String
  ): TodoConnection @auth(rules: [{ allow: owner }])
}

type Mutation {
  createTodo(input: CreateTodoInput!): Todo @auth(rules: [{ allow: owner }])
  updateTodo(input: UpdateTodoInput!): Todo @auth(rules: [{ allow: owner }])
  deleteTodo(input: DeleteTodoInput!): Todo @auth(rules: [{ allow: owner }])
}

type Subscription {
  onCreateTodo(owner: String): Todo @aws_subscribe(mutations: ["createTodo"])
  onUpdateTodo(owner: String): Todo @aws_subscribe(mutations: ["updateTodo"])
  onDeleteTodo(owner: String): Todo @aws_subscribe(mutations: ["deleteTodo"])
}
```

**Output 3: Input Types**
```graphql
input CreateTodoInput {
  content: String
  isDone: Boolean
  priority: Priority
}

input UpdateTodoInput {
  id: ID!
  content: String
  isDone: Boolean
  priority: Priority
}

input DeleteTodoInput {
  id: ID!
}

input TodoFilterInput {
  id: IDFilterInput
  content: StringFilterInput
  isDone: BooleanFilterInput
  priority: PriorityFilterInput
  and: [TodoFilterInput]
  or: [TodoFilterInput]
  not: TodoFilterInput
}
```

**Output 4: Lambda Resolver**
```typescript
// createTodoResolver.ts (auto-generated)
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { AppSyncResolverEvent } from 'aws-lambda';
import { v4 as uuid } from 'uuid';

const dynamodb = new DynamoDBClient({});
const TABLE_NAME = process.env.TODO_TABLE_NAME!;

export const handler = async (event: AppSyncResolverEvent<{ input: CreateTodoInput }>) => {
  const { input } = event.arguments;
  const { username } = event.identity as { username: string };

  // Validation
  if (!input) {
    throw new Error('Input is required');
  }

  // Authorization: Set owner automatically
  const todo = {
    id: uuid(),
    ...input,
    owner: username,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // DynamoDB Put
  await dynamodb.putItem({
    TableName: TABLE_NAME,
    Item: {
      id: { S: todo.id },
      content: { S: todo.content || '' },
      isDone: { BOOL: todo.isDone || false },
      priority: { S: todo.priority || 'low' },
      owner: { S: todo.owner },
      createdAt: { S: todo.createdAt },
      updatedAt: { S: todo.updatedAt }
    }
  });

  return todo;
};
```

**Output 5: AppSync Resolver Configuration**
```typescript
// Auto-generated CDK code
const createTodoResolver = api.addResolver({
  typeName: 'Mutation',
  fieldName: 'createTodo',
  dataSource: lambdaDataSource,
  requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
  responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
});
```

---

## 5. What Atakora Should Generate

### 5.1 For Each CRUD Model

**Given this schema:**
```typescript
const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().email().required(),
      name: a.string().required()
    })
  })
});
```

**We should auto-generate:**

**1. Cosmos DB Container** (✅ WE ALREADY DO THIS)
```json
{
  "type": "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers",
  "name": "cosdb-org-my-app-dev-eus-01/my-app/users",
  "properties": {
    "resource": {
      "id": "users",
      "partitionKey": { "paths": ["/id"], "kind": "Hash" }
    }
  }
}
```

**2. GraphQL Schema** (❌ WE DON'T DO THIS)
```graphql
type User {
  id: ID!
  email: String!
  name: String!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type Query {
  getUser(id: ID!): User
  listUsers(limit: Int, nextToken: String): UserConnection
}

type Mutation {
  createUser(input: CreateUserInput!): User
  updateUser(input: UpdateUserInput!): User
  deleteUser(id: ID!): User
}

input CreateUserInput {
  email: String!
  name: String!
}

input UpdateUserInput {
  id: ID!
  email: String
  name: String
}
```

**3. REST API Endpoints** (❌ WE DON'T DO THIS)
```
GET    /api/users         → listUsers
GET    /api/users/:id     → getUser
POST   /api/users         → createUser
PUT    /api/users/:id     → updateUser
PATCH  /api/users/:id     → updateUser
DELETE /api/users/:id     → deleteUser
```

**4. API Management Configuration** (❌ WE DON'T DO THIS)
```json
{
  "type": "Microsoft.ApiManagement/service",
  "name": "apim-org-my-app-dev-eus-01",
  "properties": {
    "publisherEmail": "admin@example.com",
    "publisherName": "my-app"
  },
  "sku": { "name": "Consumption", "capacity": 0 }
}
```

**5. API Operations** (❌ WE DON'T DO THIS)
```json
{
  "type": "Microsoft.ApiManagement/service/apis/operations",
  "name": "apim-org-my-app-dev-eus-01/users-api/getUser",
  "properties": {
    "displayName": "Get User",
    "method": "GET",
    "urlTemplate": "/users/{id}",
    "responses": [
      { "statusCode": 200, "description": "User found" },
      { "statusCode": 404, "description": "User not found" }
    ]
  }
}
```

**6. Azure Function Definitions** (❌ WE DON'T DO THIS)
```typescript
// functions/getUser/index.ts (auto-generated)
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!
});

const database = cosmosClient.database(process.env.DATABASE_NAME!);
const container = database.container('users');

export async function getUser(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const id = request.params.id;

  if (!id) {
    return { status: 400, jsonBody: { error: 'User ID is required' } };
  }

  try {
    const { resource: user } = await container.item(id, id).read();

    if (!user) {
      return { status: 404, jsonBody: { error: 'User not found' } };
    }

    return { status: 200, jsonBody: user };
  } catch (error) {
    context.error('Error fetching user:', error);
    return { status: 500, jsonBody: { error: 'Internal server error' } };
  }
}

app.http('getUser', {
  methods: ['GET'],
  route: 'users/{id}',
  authLevel: 'anonymous',
  handler: getUser
});
```

**7. Function App Configuration** (❌ WE DON'T DO THIS)
```json
{
  "type": "Microsoft.Web/sites/config",
  "name": "appsrv-func-org-my-app-dev-eus-01/appsettings",
  "properties": {
    "COSMOS_ENDPOINT": "[reference(resourceId('Microsoft.DocumentDB/databaseAccounts', 'cosdb-org-my-app-dev-eus-01')).documentEndpoint]",
    "COSMOS_KEY": "[listKeys(resourceId('Microsoft.DocumentDB/databaseAccounts', 'cosdb-org-my-app-dev-eus-01'), '2023-04-15').primaryMasterKey]",
    "DATABASE_NAME": "my-app",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "WEBSITE_NODE_DEFAULT_VERSION": "~20"
  }
}
```

---

## 6. Azure vs AWS Service Mapping

### 6.1 Service Equivalents

| AWS Service | Azure Service | Purpose |
|-------------|---------------|---------|
| AppSync | API Management + Functions | GraphQL API |
| API Gateway | API Management | REST API |
| DynamoDB | Cosmos DB | NoSQL database |
| Lambda | Azure Functions | Serverless compute |
| Cognito | Entra ID / Azure AD B2C | Authentication |
| S3 | Blob Storage | Object storage |
| CloudFormation | ARM Templates | Infrastructure as Code |

### 6.2 GraphQL on Azure

**Option 1: API Management + Functions (Recommended)**
```
GraphQL Request
    ↓
API Management (GraphQL passthrough)
    ↓
Azure Functions (GraphQL server)
├─ Apollo Server / GraphQL Yoga
├─ Schema resolvers
└─ Cosmos DB queries
```

**Option 2: Functions Only**
```
GraphQL Request
    ↓
Azure Functions (GraphQL server)
├─ Apollo Server / GraphQL Yoga
├─ Schema resolvers
└─ Cosmos DB queries
```

**Option 3: Container Apps + Functions**
```
GraphQL Request
    ↓
Container Apps (GraphQL server)
├─ Apollo Server container
├─ Auto-scaling
└─ Azure Functions for resolvers
```

**Recommendation:** Option 1 (API Management + Functions)
- API Management provides caching, rate limiting, auth
- Functions provide serverless compute
- Best balance of features and cost

### 6.3 REST on Azure

**Architecture:**
```
REST Request
    ↓
API Management
├─ Rate limiting
├─ Caching
├─ Authentication
└─ Request transformation
    ↓
Azure Functions (HTTP triggers)
├─ CRUD operation handlers
├─ Validation
├─ Authorization
└─ Cosmos DB operations
```

---

## 7. Implementation Gap Analysis

### 7.1 What We Need to Build

**Missing Components:**

1. **API Layer Synthesizer**
   - Input: Schema models
   - Output: API Management ARM resources + Operations

2. **Function Layer Synthesizer**
   - Input: Schema models
   - Output: Function code + Function App configuration

3. **Schema File Generator**
   - Input: Schema models
   - Output: GraphQL schema file OR OpenAPI spec

4. **Resolver Generator**
   - Input: Schema models + operations
   - Output: Function code for CRUD operations

5. **Authorization Integrator**
   - Input: Auth definition + operations
   - Output: Function middleware + API policies

### 7.2 Architecture for Missing Components

```
packages/component/src/synthesis/
├─ backend-synthesizer.ts       ← Main orchestrator
├─ data-synthesizer.ts          ← Schema → Cosmos (✅ exists in lib)
├─ api-synthesizer.ts           ← Schema → API Management (❌ missing)
├─ function-synthesizer.ts      ← Schema → Functions (❌ missing)
├─ schema-generator.ts          ← Schema → GraphQL/OpenAPI (❌ missing)
├─ resolver-generator.ts        ← Operations → Function code (❌ missing)
└─ auth-integrator.ts           ← Auth → Middleware (❌ missing)
```

### 7.3 Synthesis Pipeline (Should Be)

```typescript
// packages/component/src/synthesis/backend-synthesizer.ts

export class BackendSynthesizer {
  synthesize(backend: BackendObject): SynthesisResult {
    const app = new App();
    const stack = new Stack(app, backend.settings.name);

    // 1. Generate data layer (Cosmos DB + containers)
    const dataResources = this.dataSynthesizer.synthesize(
      backend.schema,
      stack
    );

    // 2. Generate API layer (API Management + operations)
    const apiResources = this.apiSynthesizer.synthesize(
      backend.schema,
      stack,
      dataResources
    );

    // 3. Generate function layer (Functions + code)
    const functionResources = this.functionSynthesizer.synthesize(
      backend.schema,
      stack,
      dataResources,
      apiResources
    );

    // 4. Generate schema files (GraphQL/OpenAPI)
    const schemaFiles = this.schemaGenerator.generate(
      backend.schema,
      apiResources
    );

    // 5. Apply authentication
    this.authIntegrator.integrate(
      backend.authentication,
      functionResources,
      apiResources
    );

    // 6. Synthesize to ARM templates
    return app.synth();
  }
}
```

---

## 8. GraphQL vs REST Decision

### 8.1 Option A: GraphQL (Like Amplify)

**Pros:**
- ✅ Single endpoint for all operations
- ✅ Client-specified response shape
- ✅ Type-safe queries
- ✅ Real-time subscriptions
- ✅ Relationship traversal

**Cons:**
- ⚠️ More complex to implement
- ⚠️ Requires GraphQL server (Apollo, Yoga)
- ⚠️ Larger bundle size
- ⚠️ Learning curve for users

**Implementation:**
```
Schema → GraphQL schema → Apollo Server in Functions → Cosmos DB
```

### 8.2 Option B: REST (Traditional)

**Pros:**
- ✅ Simple to implement
- ✅ Well-understood by developers
- ✅ Native HTTP trigger support in Azure Functions
- ✅ Better caching support
- ✅ Smaller bundle size

**Cons:**
- ⚠️ Multiple endpoints per resource
- ⚠️ Over-fetching or under-fetching data
- ⚠️ No built-in subscriptions
- ⚠️ Relationship traversal requires multiple requests

**Implementation:**
```
Schema → REST endpoints → HTTP-triggered Functions → Cosmos DB
```

### 8.3 Option C: Both (Recommended)

**Strategy:**
- Start with REST (simpler, faster to implement)
- Add GraphQL later (progressive enhancement)
- Let users choose via configuration

**Backend definition:**
```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    api: {
      type: 'rest', // or 'graphql' or 'both'
      endpoint: '/api'
    }
  }
});
```

**Recommendation:** Start with REST, add GraphQL in Phase 2.

---

## 9. Success Criteria

**How to validate parity with Amplify:**

1. ✅ **Schema Definition**: Can users define data models in TypeScript?
   - YES - We have this

2. ✅ **Backend Definition**: Can users combine schema + auth + settings?
   - YES - We have this

3. ❌ **Auto-Generate Database**: Does schema → database containers work?
   - YES - We have this

4. ❌ **Auto-Generate API**: Does schema → API endpoints work?
   - NO - This is the critical gap

5. ❌ **Auto-Generate Functions**: Does schema → CRUD functions work?
   - NO - This is the critical gap

6. ❌ **Auto-Generate Schema Files**: Does schema → GraphQL/OpenAPI work?
   - NO - This is the critical gap

7. ❌ **Authorization Integration**: Does auth → function middleware work?
   - NO - This is the critical gap

8. ⚠️ **Customization**: Can users override defaults?
   - PARTIAL - Attachment points exist, but nothing to attach to

**Current Score: 3/8 (37.5%)**

**Target Score: 8/8 (100%)**

---

## 10. Recommendations

### 10.1 Immediate Actions (Critical)

1. ✅ **Implement API Synthesizer**
   - Generate API Management instance
   - Generate API operations from schema
   - Map operations to function backends

2. ✅ **Implement Function Synthesizer**
   - Generate function code for CRUD operations
   - Generate function.json for each operation
   - Configure function app settings

3. ✅ **Implement Schema Generator**
   - Start with OpenAPI (simpler than GraphQL)
   - Generate REST API spec from schema
   - Add GraphQL in Phase 2

4. ✅ **Implement Resolver Generator**
   - Generate TypeScript function code
   - Cosmos DB SDK integration
   - Error handling and validation

5. ✅ **Implement Auth Integrator**
   - Apply auth to function triggers
   - Generate middleware from auth definition
   - Integrate with API Management policies

### 10.2 Implementation Priority

**Phase 1: Basic CRUD (MVP)**
- REST API generation
- CRUD function generation
- OpenAPI schema generation

**Phase 2: Advanced Features**
- GraphQL schema generation
- Custom resolvers
- Subscriptions (via SignalR)

**Phase 3: Optimization**
- Caching
- Batching
- Performance monitoring

### 10.3 Architecture Decision

**API Approach:** Start with REST, add GraphQL later
**Rationale:**
- REST is simpler to implement
- REST is well-understood
- REST has better Azure Functions integration
- GraphQL can be added progressively

**Function Approach:** HTTP-triggered Azure Functions
**Rationale:**
- Native Azure Functions support
- Simple deployment model
- Easy to test locally
- Scales automatically

**Schema Approach:** OpenAPI first, GraphQL second
**Rationale:**
- OpenAPI is standard for REST
- Better tooling support
- Easier to validate
- GraphQL can be layered on top

---

## 11. Conclusion

**What we learned from Amplify:**
- Schema-first design is powerful
- Auto-generation reduces boilerplate
- Type safety end-to-end is critical
- Default CRUD operations are essential
- Customization must be possible

**What we're missing:**
- API Management generation
- Function code generation
- Schema file generation (GraphQL/OpenAPI)
- Authorization integration
- Complete synthesis orchestration

**What we need to build:**
- BackendSynthesizer (orchestrator)
- ApiSynthesizer (API Management)
- FunctionSynthesizer (CRUD functions)
- SchemaGenerator (OpenAPI/GraphQL)
- AuthIntegrator (middleware)

**Bottom line:** We have the foundation (schema + backend definition), but we're missing the auto-generation layer that makes schema-first development powerful. This is the critical gap between our current state and Amplify's functionality.

**Next steps:**
1. Design BackendSynthesizer architecture
2. Implement REST API generation (Phase 1)
3. Implement CRUD function generation (Phase 1)
4. Add GraphQL support (Phase 2)
