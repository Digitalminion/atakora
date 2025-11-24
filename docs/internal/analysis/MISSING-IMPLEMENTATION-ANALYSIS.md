# Missing Implementation Analysis

**Author:** Becky (Staff Architect)
**Date:** 2025-11-23
**Status:** Complete

## Executive Summary

This document provides a comprehensive analysis of what's missing from our current implementation compared to a complete schema-first, auto-generating backend system like AWS Amplify. The analysis is organized by architectural layer with priority ratings and impact assessments.

**Critical Findings:**
- Infrastructure layer: **90% complete** (missing API Management configuration)
- API layer: **10% complete** (missing operations, endpoints, policies)
- Function layer: **5% complete** (missing actual functions, only have host)
- Schema layer: **0% complete** (missing GraphQL/OpenAPI generation)
- Integration layer: **20% complete** (missing auth middleware, function bindings)

---

## 1. Layer-by-Layer Analysis

### 1.1 Infrastructure Layer (Partially Complete)

**What we have:**
```json
{
  "resources": [
    {
      "type": "Microsoft.DocumentDB/databaseAccounts",
      "name": "cosdb-org-my-app-dev-eus-01"
      // ✅ Cosmos DB account
    },
    {
      "type": "Microsoft.DocumentDB/databaseAccounts/sqlDatabases",
      "name": "cosdb-org-my-app-dev-eus-01/my-app"
      // ✅ Database
    },
    {
      "type": "Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers",
      "name": "cosdb-org-my-app-dev-eus-01/my-app/users"
      // ✅ Containers for each model
    },
    {
      "type": "Microsoft.Storage/storageAccounts",
      "name": "stoorgmyappdeveus01"
      // ✅ Storage account
    },
    {
      "type": "Microsoft.KeyVault/vaults",
      "name": "kv-org-my-app-dev-eus-01"
      // ✅ Key Vault
    },
    {
      "type": "Microsoft.Web/serverfarms",
      "name": "aspsrvpl-org-my-app-dev-eus-01"
      // ✅ App Service Plan
    },
    {
      "type": "Microsoft.Web/sites",
      "name": "appsrv-func-org-my-app-dev-eus-01",
      "kind": "functionapp"
      // ✅ Function App (but empty!)
    }
  ]
}
```

**What's missing:**

#### Missing 1.1.1: API Management Instance (CRITICAL)
```json
{
  "type": "Microsoft.ApiManagement/service",
  "apiVersion": "2023-05-01-preview",
  "name": "apim-org-my-app-dev-eus-01",
  "location": "eastus",
  "sku": {
    "name": "Consumption", // or "Developer" for dev, "Standard"/"Premium" for prod
    "capacity": 0
  },
  "properties": {
    "publisherEmail": "admin@example.com",
    "publisherName": "my-app",
    "notificationSenderEmail": "apimgmt-noreply@mail.windowsazure.com"
  }
}
```

**Priority:** 🔴 CRITICAL
**Impact:** Without API Management, we have no API gateway, no rate limiting, no caching, no centralized auth
**User Experience Impact:** Users can't access their backend without writing custom API code

---

#### Missing 1.1.2: API Management Product (HIGH)
```json
{
  "type": "Microsoft.ApiManagement/service/products",
  "apiVersion": "2023-05-01-preview",
  "name": "apim-org-my-app-dev-eus-01/default-product",
  "properties": {
    "displayName": "Default Product",
    "description": "Auto-generated product for backend API",
    "subscriptionRequired": true,
    "approvalRequired": false,
    "state": "published"
  }
}
```

**Priority:** 🟡 HIGH
**Impact:** Products group APIs and control access
**User Experience Impact:** No way to organize APIs or manage subscriptions

---

#### Missing 1.1.3: API Management Backend (HIGH)
```json
{
  "type": "Microsoft.ApiManagement/service/backends",
  "apiVersion": "2023-05-01-preview",
  "name": "apim-org-my-app-dev-eus-01/functions-backend",
  "properties": {
    "description": "Azure Functions backend",
    "url": "[concat('https://', reference(resourceId('Microsoft.Web/sites', 'appsrv-func-org-my-app-dev-eus-01')).defaultHostName)]",
    "protocol": "http",
    "resourceId": "[concat('https://management.azure.com', resourceId('Microsoft.Web/sites', 'appsrv-func-org-my-app-dev-eus-01'))]",
    "credentials": {
      "header": {
        "x-functions-key": ["{{function-key}}"]
      }
    }
  }
}
```

**Priority:** 🟡 HIGH
**Impact:** Backend connects API Management to Function App
**User Experience Impact:** API Management can't route to functions

---

### 1.2 API Layer (Almost Completely Missing)

**Current state:** 0% complete
**What we need:**

#### Missing 1.2.1: API Definition (CRITICAL)
```json
{
  "type": "Microsoft.ApiManagement/service/apis",
  "apiVersion": "2023-05-01-preview",
  "name": "apim-org-my-app-dev-eus-01/my-app-api",
  "properties": {
    "displayName": "My App API",
    "description": "Auto-generated API from schema",
    "path": "api",
    "protocols": ["https"],
    "subscriptionRequired": true,
    "isCurrent": true,
    "apiVersion": "v1",
    "apiVersionSetId": "[resourceId('Microsoft.ApiManagement/service/apiVersionSets', 'apim-org-my-app-dev-eus-01', 'my-app-versions')]"
  }
}
```

**Priority:** 🔴 CRITICAL
**Impact:** No API = no endpoints
**User Experience Impact:** Users can't make API calls

**Generation Logic:**
```typescript
// For each schema, generate ONE API
// API path: /api or /{apiVersion}
// API name: {backend.settings.name}-api
```

---

#### Missing 1.2.2: API Operations for Each Model (CRITICAL)

**For User model:**
```json
[
  {
    "type": "Microsoft.ApiManagement/service/apis/operations",
    "name": "apim-org-my-app-dev-eus-01/my-app-api/getUser",
    "properties": {
      "displayName": "Get User",
      "method": "GET",
      "urlTemplate": "/users/{id}",
      "templateParameters": [
        { "name": "id", "type": "string", "required": true }
      ],
      "responses": [
        { "statusCode": 200, "description": "User found" },
        { "statusCode": 404, "description": "User not found" },
        { "statusCode": 500, "description": "Internal error" }
      ]
    }
  },
  {
    "type": "Microsoft.ApiManagement/service/apis/operations",
    "name": "apim-org-my-app-dev-eus-01/my-app-api/listUsers",
    "properties": {
      "displayName": "List Users",
      "method": "GET",
      "urlTemplate": "/users",
      "request": {
        "queryParameters": [
          { "name": "limit", "type": "integer", "defaultValue": 20 },
          { "name": "continuationToken", "type": "string" }
        ]
      },
      "responses": [
        { "statusCode": 200, "description": "Users list" }
      ]
    }
  },
  {
    "type": "Microsoft.ApiManagement/service/apis/operations",
    "name": "apim-org-my-app-dev-eus-01/my-app-api/createUser",
    "properties": {
      "displayName": "Create User",
      "method": "POST",
      "urlTemplate": "/users",
      "request": {
        "representations": [
          {
            "contentType": "application/json",
            "schemaId": "CreateUserInput",
            "typeName": "CreateUserInput"
          }
        ]
      },
      "responses": [
        { "statusCode": 201, "description": "User created" },
        { "statusCode": 400, "description": "Validation error" }
      ]
    }
  },
  {
    "type": "Microsoft.ApiManagement/service/apis/operations",
    "name": "apim-org-my-app-dev-eus-01/my-app-api/updateUser",
    "properties": {
      "displayName": "Update User",
      "method": "PUT",
      "urlTemplate": "/users/{id}",
      "templateParameters": [
        { "name": "id", "type": "string", "required": true }
      ]
    }
  },
  {
    "type": "Microsoft.ApiManagement/service/apis/operations",
    "name": "apim-org-my-app-dev-eus-01/my-app-api/deleteUser",
    "properties": {
      "displayName": "Delete User",
      "method": "DELETE",
      "urlTemplate": "/users/{id}",
      "templateParameters": [
        { "name": "id", "type": "string", "required": true }
      ]
    }
  }
]
```

**Priority:** 🔴 CRITICAL
**Impact:** No operations = no CRUD functionality
**User Experience Impact:** Users can't perform any database operations via API

**Generation Logic:**
```typescript
// For each CRUD model:
// - GET    /{modelName}s/{id}       → getModel
// - GET    /{modelName}s            → listModels
// - POST   /{modelName}s            → createModel
// - PUT    /{modelName}s/{id}       → updateModel
// - PATCH  /{modelName}s/{id}       → updateModel (partial)
// - DELETE /{modelName}s/{id}       → deleteModel
```

---

#### Missing 1.2.3: Operation Policies (HIGH)

**For each operation:**
```xml
<!-- GET /users/{id} policy -->
<policies>
  <inbound>
    <base />
    <!-- Validate JWT token -->
    <validate-jwt header-name="Authorization" failed-validation-httpcode="401">
      <openid-config url="https://login.microsoftonline.com/{tenantId}/v2.0/.well-known/openid-configuration" />
      <audiences>
        <audience>{clientId}</audience>
      </audiences>
    </validate-jwt>

    <!-- Rate limiting -->
    <rate-limit calls="100" renewal-period="60" />

    <!-- Set backend -->
    <set-backend-service backend-id="functions-backend" />

    <!-- Rewrite URL to function route -->
    <rewrite-uri template="/api/getUser?id={id}" />
  </inbound>

  <backend>
    <base />
  </backend>

  <outbound>
    <base />
    <!-- Cache response -->
    <cache-store duration="60" />
  </outbound>

  <on-error>
    <base />
  </on-error>
</policies>
```

**Priority:** 🟡 HIGH
**Impact:** No policies = no auth, no rate limiting, no caching
**User Experience Impact:** Insecure API, poor performance, no protection

---

#### Missing 1.2.4: API Schemas (MEDIUM)

**Input/Output type schemas:**
```json
{
  "type": "Microsoft.ApiManagement/service/schemas",
  "name": "apim-org-my-app-dev-eus-01/CreateUserInput",
  "properties": {
    "contentType": "application/vnd.oai.openapi.components+json",
    "document": {
      "components": {
        "schemas": {
          "CreateUserInput": {
            "type": "object",
            "required": ["email", "name"],
            "properties": {
              "email": {
                "type": "string",
                "format": "email"
              },
              "name": {
                "type": "string",
                "minLength": 1
              }
            }
          }
        }
      }
    }
  }
}
```

**Priority:** 🟢 MEDIUM
**Impact:** No schemas = no validation, no API documentation
**User Experience Impact:** Poor API documentation, no client-side validation

---

### 1.3 Function Layer (Almost Completely Missing)

**Current state:** 5% complete (Function App host exists, but no functions)
**What we need:**

#### Missing 1.3.1: Function Definitions in host.json (CRITICAL)

**Current Function App configuration:**
```json
{
  "type": "Microsoft.Web/sites",
  "name": "appsrv-func-org-my-app-dev-eus-01",
  "kind": "functionapp",
  "properties": {
    "siteConfig": {
      "appSettings": [
        // ❌ Missing Cosmos connection strings
        // ❌ Missing function runtime settings
        // ❌ Missing environment variables
      ]
      // ❌ Missing function definitions
    }
  }
}
```

**What we need:**
```json
{
  "type": "Microsoft.Web/sites/config",
  "apiVersion": "2022-09-01",
  "name": "appsrv-func-org-my-app-dev-eus-01/appsettings",
  "properties": {
    "AzureWebJobsStorage": "[concat('DefaultEndpointsProtocol=https;AccountName=', 'stoorgmyappdeveus01', ';AccountKey=', listKeys(resourceId('Microsoft.Storage/storageAccounts', 'stoorgmyappdeveus01'), '2023-01-01').keys[0].value)]",
    "COSMOS_ENDPOINT": "[reference(resourceId('Microsoft.DocumentDB/databaseAccounts', 'cosdb-org-my-app-dev-eus-01')).documentEndpoint]",
    "COSMOS_KEY": "[listKeys(resourceId('Microsoft.DocumentDB/databaseAccounts', 'cosdb-org-my-app-dev-eus-01'), '2023-04-15').primaryMasterKey]",
    "DATABASE_NAME": "my-app",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "WEBSITE_NODE_DEFAULT_VERSION": "~20",
    "FUNCTIONS_EXTENSION_VERSION": "~4"
  }
}
```

**Priority:** 🔴 CRITICAL
**Impact:** Functions can't connect to Cosmos DB
**User Experience Impact:** Functions fail at runtime

---

#### Missing 1.3.2: Function Code Generation (CRITICAL)

**For User model, we need 5 functions:**

**getUser function:**
```typescript
// functions/getUser/index.ts
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
  try {
    const id = request.params.id;

    if (!id) {
      return {
        status: 400,
        jsonBody: { error: 'User ID is required' }
      };
    }

    const { resource: user } = await container.item(id, id).read();

    if (!user) {
      return {
        status: 404,
        jsonBody: { error: 'User not found' }
      };
    }

    return {
      status: 200,
      jsonBody: user
    };
  } catch (error: any) {
    context.error('Error in getUser:', error);

    if (error.code === 404) {
      return {
        status: 404,
        jsonBody: { error: 'User not found' }
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Internal server error' }
    };
  }
}

app.http('getUser', {
  methods: ['GET'],
  route: 'users/{id}',
  authLevel: 'anonymous',
  handler: getUser
});
```

**listUsers function:**
```typescript
// functions/listUsers/index.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!
});

const database = cosmosClient.database(process.env.DATABASE_NAME!);
const container = database.container('users');

export async function listUsers(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const limit = parseInt(request.query.get('limit') || '20', 10);
    const continuationToken = request.query.get('continuationToken');

    const querySpec = {
      query: 'SELECT * FROM c ORDER BY c._ts DESC',
    };

    const { resources: users, continuationToken: nextToken } = await container.items
      .query(querySpec, {
        maxItemCount: limit,
        continuationToken: continuationToken || undefined,
      })
      .fetchNext();

    return {
      status: 200,
      jsonBody: {
        items: users,
        continuationToken: nextToken,
        hasMore: !!nextToken,
      }
    };
  } catch (error: any) {
    context.error('Error in listUsers:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' }
    };
  }
}

app.http('listUsers', {
  methods: ['GET'],
  route: 'users',
  authLevel: 'anonymous',
  handler: listUsers
});
```

**createUser function:**
```typescript
// functions/createUser/index.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!
});

const database = cosmosClient.database(process.env.DATABASE_NAME!);
const container = database.container('users');

interface CreateUserInput {
  email: string;
  name: string;
}

export async function createUser(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const input: CreateUserInput = await request.json() as CreateUserInput;

    // Validation (generated from schema)
    if (!input.email || !input.name) {
      return {
        status: 400,
        jsonBody: {
          error: 'Validation failed',
          details: {
            email: !input.email ? 'Email is required' : undefined,
            name: !input.name ? 'Name is required' : undefined,
          }
        }
      };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      return {
        status: 400,
        jsonBody: {
          error: 'Validation failed',
          details: { email: 'Invalid email format' }
        }
      };
    }

    // Create user
    const user = {
      id: uuidv4(),
      email: input.email,
      name: input.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const { resource: createdUser } = await container.items.create(user);

    return {
      status: 201,
      jsonBody: createdUser
    };
  } catch (error: any) {
    context.error('Error in createUser:', error);

    if (error.code === 409) {
      return {
        status: 409,
        jsonBody: { error: 'User already exists' }
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Internal server error' }
    };
  }
}

app.http('createUser', {
  methods: ['POST'],
  route: 'users',
  authLevel: 'anonymous',
  handler: createUser
});
```

**updateUser function:**
```typescript
// functions/updateUser/index.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!
});

const database = cosmosClient.database(process.env.DATABASE_NAME!);
const container = database.container('users');

interface UpdateUserInput {
  email?: string;
  name?: string;
}

export async function updateUser(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;
    const input: UpdateUserInput = await request.json() as UpdateUserInput;

    if (!id) {
      return {
        status: 400,
        jsonBody: { error: 'User ID is required' }
      };
    }

    // Get existing user
    const { resource: existingUser } = await container.item(id, id).read();

    if (!existingUser) {
      return {
        status: 404,
        jsonBody: { error: 'User not found' }
      };
    }

    // Merge updates
    const updatedUser = {
      ...existingUser,
      ...(input.email && { email: input.email }),
      ...(input.name && { name: input.name }),
      updatedAt: new Date().toISOString(),
    };

    // Replace user
    const { resource: result } = await container.item(id, id).replace(updatedUser);

    return {
      status: 200,
      jsonBody: result
    };
  } catch (error: any) {
    context.error('Error in updateUser:', error);

    if (error.code === 404) {
      return {
        status: 404,
        jsonBody: { error: 'User not found' }
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Internal server error' }
    };
  }
}

app.http('updateUser', {
  methods: ['PUT', 'PATCH'],
  route: 'users/{id}',
  authLevel: 'anonymous',
  handler: updateUser
});
```

**deleteUser function:**
```typescript
// functions/deleteUser/index.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!
});

const database = cosmosClient.database(process.env.DATABASE_NAME!);
const container = database.container('users');

export async function deleteUser(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const id = request.params.id;

    if (!id) {
      return {
        status: 400,
        jsonBody: { error: 'User ID is required' }
      };
    }

    await container.item(id, id).delete();

    return {
      status: 204,
      body: ''
    };
  } catch (error: any) {
    context.error('Error in deleteUser:', error);

    if (error.code === 404) {
      return {
        status: 404,
        jsonBody: { error: 'User not found' }
      };
    }

    return {
      status: 500,
      jsonBody: { error: 'Internal server error' }
    };
  }
}

app.http('deleteUser', {
  methods: ['DELETE'],
  route: 'users/{id}',
  authLevel: 'anonymous',
  handler: deleteUser
});
```

**Priority:** 🔴 CRITICAL
**Impact:** No functions = no API functionality
**User Experience Impact:** API returns 404 for all requests

**Generation Pattern:**
```
For each CRUD model:
  Generate 5 functions:
    - get{Model}      (GET /{models}/{id})
    - list{Models}    (GET /{models})
    - create{Model}   (POST /{models})
    - update{Model}   (PUT/PATCH /{models}/{id})
    - delete{Model}   (DELETE /{models}/{id})
```

---

#### Missing 1.3.3: Function Packaging (HIGH)

**We need to generate:**
```
functions/
├─ package.json
├─ tsconfig.json
├─ host.json
├─ local.settings.json
├─ getUser/
│  ├─ index.ts
│  └─ function.json
├─ listUsers/
│  ├─ index.ts
│  └─ function.json
├─ createUser/
│  ├─ index.ts
│  └─ function.json
├─ updateUser/
│  ├─ index.ts
│  └─ function.json
└─ deleteUser/
   ├─ index.ts
   └─ function.json
```

**host.json:**
```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

**package.json:**
```json
{
  "name": "my-app-functions",
  "version": "1.0.0",
  "description": "Auto-generated Azure Functions for my-app backend",
  "scripts": {
    "build": "tsc",
    "start": "func start",
    "deploy": "func azure functionapp publish appsrv-func-org-my-app-dev-eus-01"
  },
  "dependencies": {
    "@azure/functions": "^4.0.0",
    "@azure/cosmos": "^4.0.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Priority:** 🟡 HIGH
**Impact:** Functions can't be deployed
**User Experience Impact:** Manual deployment steps required

---

### 1.4 Schema Layer (Completely Missing)

**Current state:** 0% complete
**What we need:**

#### Missing 1.4.1: OpenAPI Specification (HIGH)

**We should generate:**
```yaml
openapi: 3.0.0
info:
  title: My App API
  version: 1.0.0
  description: Auto-generated API from schema
servers:
  - url: https://apim-org-my-app-dev-eus-01.azure-api.net/api
    description: Azure API Management endpoint
paths:
  /users/{id}:
    get:
      operationId: getUser
      summary: Get User by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: User not found
    put:
      operationId: updateUser
      summary: Update User
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateUserInput'
      responses:
        '200':
          description: User updated
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
    delete:
      operationId: deleteUser
      summary: Delete User
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '204':
          description: User deleted
  /users:
    get:
      operationId: listUsers
      summary: List Users
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: continuationToken
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Users list
          content:
            application/json:
              schema:
                type: object
                properties:
                  items:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  continuationToken:
                    type: string
                  hasMore:
                    type: boolean
    post:
      operationId: createUser
      summary: Create User
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserInput'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
        - name
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time
    CreateUserInput:
      type: object
      required:
        - email
        - name
      properties:
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 1
    UpdateUserInput:
      type: object
      properties:
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 1
```

**Priority:** 🟡 HIGH
**Impact:** No API documentation, no client SDK generation
**User Experience Impact:** Developers don't know how to use the API

---

#### Missing 1.4.2: GraphQL Schema (MEDIUM - Phase 2)

**We could generate:**
```graphql
# schema.graphql
type User {
  id: ID!
  email: String!
  name: String!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Query {
  getUser(id: ID!): User
  listUsers(limit: Int, continuationToken: String): UserConnection!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): User!
}

input CreateUserInput {
  email: String!
  name: String!
}

input UpdateUserInput {
  email: String
  name: String
}

type UserConnection {
  items: [User!]!
  continuationToken: String
  hasMore: Boolean!
}

scalar DateTime
```

**Priority:** 🟢 MEDIUM (Phase 2)
**Impact:** No GraphQL support
**User Experience Impact:** Users who prefer GraphQL can't use it

---

#### Missing 1.4.3: TypeScript Client Types (MEDIUM)

**We should generate:**
```typescript
// types/api.ts
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  name: string;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
}

export interface UserConnection {
  items: User[];
  continuationToken?: string;
  hasMore: boolean;
}

// Generated API client
export class MyAppApiClient {
  constructor(private baseUrl: string, private apiKey: string) {}

  async getUser(id: string): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users/${id}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get user: ${response.statusText}`);
    }

    return response.json();
  }

  async listUsers(options?: { limit?: number; continuationToken?: string }): Promise<UserConnection> {
    const params = new URLSearchParams();
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.continuationToken) params.set('continuationToken', options.continuationToken);

    const response = await fetch(`${this.baseUrl}/users?${params}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list users: ${response.statusText}`);
    }

    return response.json();
  }

  async createUser(input: CreateUserInput): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.apiKey
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.statusText}`);
    }

    return response.json();
  }

  async updateUser(id: string, input: UpdateUserInput): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': this.apiKey
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(`Failed to update user: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteUser(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete user: ${response.statusText}`);
    }
  }
}
```

**Priority:** 🟢 MEDIUM
**Impact:** No type-safe client
**User Experience Impact:** Users write their own API clients

---

### 1.5 Integration Layer (Mostly Missing)

#### Missing 1.5.1: Authentication Middleware (HIGH)

**We should generate middleware for functions:**
```typescript
// functions/shared/authMiddleware.ts
import { InvocationContext } from '@azure/functions';
import * as jwt from 'jsonwebtoken';
import * as jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/discovery/v2.0/keys`
});

function getKey(header: any, callback: any) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    }
  });
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  roles: string[];
}

export async function validateToken(token: string): Promise<AuthenticatedUser> {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      audience: process.env.AZURE_CLIENT_ID,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
      algorithms: ['RS256']
    }, (err, decoded: any) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          userId: decoded.oid || decoded.sub,
          email: decoded.email || decoded.preferred_username,
          roles: decoded.roles || []
        });
      }
    });
  });
}

export async function authMiddleware(
  request: any,
  context: InvocationContext
): Promise<{ user: AuthenticatedUser } | { error: string; status: number }> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or invalid authorization header', status: 401 };
  }

  const token = authHeader.substring(7);

  try {
    const user = await validateToken(token);
    return { user };
  } catch (error) {
    context.error('Auth validation failed:', error);
    return { error: 'Invalid token', status: 401 };
  }
}
```

**Usage in functions:**
```typescript
// functions/getUser/index.ts (with auth)
import { authMiddleware, AuthenticatedUser } from '../shared/authMiddleware';

export async function getUser(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  // Validate authentication
  const authResult = await authMiddleware(request, context);

  if ('error' in authResult) {
    return {
      status: authResult.status,
      jsonBody: { error: authResult.error }
    };
  }

  const user = authResult.user;

  // Authorization check (if model has owner field)
  // ... rest of function
}
```

**Priority:** 🟡 HIGH
**Impact:** No authentication = insecure API
**User Experience Impact:** Anyone can access the API

---

#### Missing 1.5.2: Cosmos DB Bindings (MEDIUM)

**Instead of manual Cosmos SDK usage, we could use bindings:**
```json
{
  "bindings": [
    {
      "authLevel": "anonymous",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["get"],
      "route": "users/{id}"
    },
    {
      "type": "cosmosDB",
      "direction": "in",
      "name": "user",
      "databaseName": "my-app",
      "collectionName": "users",
      "id": "{id}",
      "partitionKey": "{id}",
      "connectionStringSetting": "CosmosDBConnection"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

**Simplified function code:**
```typescript
export async function getUser(
  context: InvocationContext,
  req: HttpRequest,
  user: any  // Cosmos binding auto-fetches user
): Promise<void> {
  if (!user) {
    context.res = {
      status: 404,
      body: { error: 'User not found' }
    };
    return;
  }

  context.res = {
    status: 200,
    body: user
  };
}
```

**Priority:** 🟢 MEDIUM (optimization)
**Impact:** Less boilerplate code
**User Experience Impact:** Simpler generated functions

---

## 2. Priority Matrix

| Component | Priority | Complexity | Impact | Effort |
|-----------|----------|------------|--------|--------|
| API Management Instance | 🔴 CRITICAL | Low | High | 1 day |
| API Operations | 🔴 CRITICAL | Medium | High | 2 days |
| Function Code Generation | 🔴 CRITICAL | High | High | 5 days |
| Function App Settings | 🔴 CRITICAL | Low | High | 1 day |
| OpenAPI Schema | 🟡 HIGH | Medium | Medium | 2 days |
| Operation Policies | 🟡 HIGH | Medium | Medium | 2 days |
| Auth Middleware | 🟡 HIGH | High | High | 3 days |
| Function Packaging | 🟡 HIGH | Medium | Medium | 2 days |
| TypeScript Client | 🟢 MEDIUM | Medium | Low | 2 days |
| GraphQL Schema | 🟢 MEDIUM | High | Low | 5 days |
| Cosmos Bindings | 🟢 LOW | Low | Low | 1 day |

**Total Critical Path:** ~9 days (API Management + Operations + Functions + Settings)
**Total High Priority:** ~9 days (Policies + Auth + Packaging + OpenAPI)
**Total Medium Priority:** ~7 days (Client + GraphQL)

**Estimated Total:** ~25 days for complete implementation

---

## 3. Implementation Phases

### Phase 1: MVP (Critical Path - 9 days)

**Goal:** Get basic CRUD API working end-to-end

**Deliverables:**
1. API Management instance generation
2. API operations for each CRUD model
3. CRUD function code generation
4. Function App configuration (app settings, connection strings)
5. Basic error handling

**Success Criteria:**
- `GET /api/users` returns list of users
- `POST /api/users` creates a new user
- `GET /api/users/{id}` returns a specific user
- `PUT /api/users/{id}` updates a user
- `DELETE /api/users/{id}` deletes a user

### Phase 2: Production-Ready (High Priority - 9 days)

**Goal:** Make API secure and documented

**Deliverables:**
1. Operation policies (auth, rate limiting, caching)
2. Authentication middleware
3. Function packaging and deployment
4. OpenAPI specification generation
5. Error handling and logging

**Success Criteria:**
- API requires authentication
- API has rate limiting
- API responses are cached
- OpenAPI spec can be imported into Postman
- Functions can be deployed via CLI

### Phase 3: Developer Experience (Medium Priority - 7 days)

**Goal:** Improve developer ergonomics

**Deliverables:**
1. TypeScript client generation
2. GraphQL schema generation (optional)
3. Cosmos DB bindings (optimization)
4. Better error messages
5. Local development support

**Success Criteria:**
- Generated TypeScript client is type-safe
- GraphQL queries work alongside REST
- Local development with emulators
- Clear error messages with remediation steps

---

## 4. Generation Logic

### 4.1 API Operations Generation

```typescript
// For each CRUD model in schema
for (const modelName of getCrudModelNames(schema)) {
  const model = getModel(schema, modelName);
  const pluralName = pluralize(modelName);
  const basePath = `/${pluralName.toLowerCase()}`;

  // Generate operations
  const operations = [
    {
      operationId: `get${modelName}`,
      method: 'GET',
      path: `${basePath}/{id}`,
      functionName: `get${modelName}`,
    },
    {
      operationId: `list${pluralName}`,
      method: 'GET',
      path: basePath,
      functionName: `list${pluralName}`,
    },
    {
      operationId: `create${modelName}`,
      method: 'POST',
      path: basePath,
      functionName: `create${modelName}`,
    },
    {
      operationId: `update${modelName}`,
      method: 'PUT',
      path: `${basePath}/{id}`,
      functionName: `update${modelName}`,
    },
    {
      operationId: `delete${modelName}`,
      method: 'DELETE',
      path: `${basePath}/{id}`,
      functionName: `delete${modelName}`,
    },
  ];

  // Generate ARM resources for each operation
  for (const op of operations) {
    generateApiOperation(op, model);
  }
}
```

### 4.2 Function Code Generation

```typescript
// For each operation
function generateFunctionCode(operation, model) {
  const template = getFunctionTemplate(operation.method);

  // Customize template with model-specific logic
  const code = template
    .replace('{{MODEL_NAME}}', model.name)
    .replace('{{CONTAINER_NAME}}', model.containerName)
    .replace('{{VALIDATION}}', generateValidation(model))
    .replace('{{COSMOS_QUERY}}', generateCosmosQuery(operation, model));

  // Write function code
  writeFile(`functions/${operation.functionName}/index.ts`, code);

  // Write function.json
  writeFile(`functions/${operation.functionName}/function.json`,
    generateFunctionJson(operation));
}
```

---

## 5. Recommendations

### 5.1 Immediate Actions

1. **Implement BackendSynthesizer** (Week 1)
   - Orchestrate all generation layers
   - Connect Component package to CDK constructs

2. **Implement ApiSynthesizer** (Week 1)
   - Generate API Management instance
   - Generate API operations

3. **Implement FunctionSynthesizer** (Week 2)
   - Generate function code from templates
   - Generate function.json files
   - Configure Function App settings

4. **Test End-to-End** (Week 2)
   - Deploy generated infrastructure
   - Test CRUD operations
   - Validate ARM templates

### 5.2 Success Validation

**Test Case: User CRUD**
```typescript
// 1. Define schema
const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().email().required(),
      name: a.string().required()
    })
  })
});

// 2. Define backend
const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'test-app' }
});

// 3. Synthesize (THIS SHOULD WORK)
backend.synth();

// 4. Deploy
// $ atakora deploy

// 5. Test API
// $ curl https://apim-org-test-app-dev-eus-01.azure-api.net/api/users
// Should return: { "items": [], "hasMore": false }
```

---

## 6. Conclusion

**What's missing:**
- 90% of API layer (API Management + operations + policies)
- 95% of Function layer (function code + configuration)
- 100% of Schema layer (OpenAPI + GraphQL + client types)
- 80% of Integration layer (auth middleware + bindings)

**What we have:**
- 90% of Infrastructure layer (Cosmos + Storage + Function App host)
- 100% of Schema definition layer
- 100% of Backend definition layer

**Critical path:** API Management + Function generation = ~9 days

**Total effort:** ~25 days for complete feature parity with Amplify

**Recommendation:** Focus on Phase 1 (MVP) to get basic CRUD working, then iterate on quality and features.
