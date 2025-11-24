# REST API Examples

[Home](../README.md) > [Examples](./README.md) > REST API

Build production-ready REST APIs with Azure API Management, OpenAPI integration, and authentication.

## Overview

These examples show how to create REST APIs using Atakora, from basic CRUD operations to advanced API gateway patterns with authentication, rate limiting, and versioning.

## Prerequisites

```bash
# Install Atakora CLI
npm install -g @atakora/cli

# Install OpenAPI tools (optional)
npm install -g @apidevtools/swagger-cli
```

## Example 1: Basic CRUD API

Simple REST API with Create, Read, Update, Delete operations.

### Code

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { FunctionApp } from '@atakora/cdk/web';
import { CosmosDBAccount, SqlDatabase, SqlContainer } from '@atakora/cdk/documentdb';
import { ApiManagementService, Api, ApiOperation } from '@atakora/cdk/apimanagement';

const app = new App();
const stack = new Stack(app, 'crud-api-stack');

const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-crud-api-prod',
  location: 'eastus'
});

// Database for CRUD operations
const cosmos = new CosmosDBAccount(stack, 'cosmos', {
  resourceGroupName: resourceGroup.name,
  accountName: 'cosmos-crud-' + Date.now(),
  location: 'eastus',
  consistencyPolicy: {
    defaultConsistencyLevel: 'Session'
  }
});

const database = new SqlDatabase(stack, 'database', {
  resourceGroupName: resourceGroup.name,
  accountName: cosmos.name,
  databaseName: 'cruddb'
});

const itemsContainer = new SqlContainer(stack, 'items', {
  resourceGroupName: resourceGroup.name,
  accountName: cosmos.name,
  databaseName: database.name,
  containerName: 'items',
  partitionKey: {
    paths: ['/category'],
    kind: 'Hash'
  },
  indexingPolicy: {
    indexingMode: 'consistent',
    includedPaths: [{ path: '/*' }]
  }
});

// Functions App for API logic
const apiFunc = new FunctionApp(stack, 'api-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-crud-api-' + Date.now(),
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  appSettings: {
    COSMOS_ENDPOINT: cosmos.documentEndpoint,
    COSMOS_KEY: cosmos.primaryMasterKey,
    COSMOS_DATABASE: database.name,
    COSMOS_CONTAINER: itemsContainer.name
  }
});

// API Management
const apiManagement = new ApiManagementService(stack, 'apim', {
  resourceGroupName: resourceGroup.name,
  serviceName: 'apim-crud-' + Date.now(),
  location: 'eastus',
  publisherEmail: 'admin@example.com',
  publisherName: 'Example Corp',
  sku: {
    name: 'Consumption',
    capacity: 0
  }
});

// Define API
const crudApi = new Api(stack, 'crud-api', {
  resourceGroupName: resourceGroup.name,
  serviceName: apiManagement.name,
  apiId: 'items-api',
  displayName: 'Items API',
  path: 'items',
  protocols: ['https'],
  subscriptionRequired: true
});

// API Operations
const operations = [
  {
    operationId: 'get-items',
    displayName: 'Get All Items',
    method: 'GET',
    urlTemplate: '/',
    description: 'Retrieve all items'
  },
  {
    operationId: 'get-item',
    displayName: 'Get Item by ID',
    method: 'GET',
    urlTemplate: '/{id}',
    description: 'Retrieve a specific item',
    templateParameters: [{
      name: 'id',
      type: 'string',
      required: true
    }]
  },
  {
    operationId: 'create-item',
    displayName: 'Create Item',
    method: 'POST',
    urlTemplate: '/',
    description: 'Create a new item'
  },
  {
    operationId: 'update-item',
    displayName: 'Update Item',
    method: 'PUT',
    urlTemplate: '/{id}',
    description: 'Update an existing item',
    templateParameters: [{
      name: 'id',
      type: 'string',
      required: true
    }]
  },
  {
    operationId: 'delete-item',
    displayName: 'Delete Item',
    method: 'DELETE',
    urlTemplate: '/{id}',
    description: 'Delete an item',
    templateParameters: [{
      name: 'id',
      type: 'string',
      required: true
    }]
  }
];

operations.forEach(op => {
  new ApiOperation(stack, op.operationId, {
    resourceGroupName: resourceGroup.name,
    serviceName: apiManagement.name,
    apiId: crudApi.apiId,
    ...op
  });
});

stack.addOutput('APIEndpoint', `https://${apiManagement.name}.azure-api.net/${crudApi.path}`);
stack.addOutput('FunctionApp', apiFunc.functionAppName);
stack.addOutput('CosmosEndpoint', cosmos.documentEndpoint);

app.synth();
```

### Function Implementation

```javascript
// GetItems/index.js
const CosmosClient = require('@azure/cosmos').CosmosClient;

module.exports = async function (context, req) {
  const client = new CosmosClient({
    endpoint: process.env.COSMOS_ENDPOINT,
    key: process.env.COSMOS_KEY
  });

  const database = client.database(process.env.COSMOS_DATABASE);
  const container = database.container(process.env.COSMOS_CONTAINER);

  try {
    const { resources } = await container.items.readAll().fetchAll();

    context.res = {
      status: 200,
      body: resources
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: 'Failed to retrieve items' }
    };
  }
};
```

### Cost Estimate
- API Management (Consumption): ~$0.05/10K calls
- Functions (Consumption): ~$0/month
- Cosmos DB: ~$25/month
- Total: ~$25-30/month

## Example 2: OpenAPI-Driven API

API defined by OpenAPI specification with automatic documentation.

### OpenAPI Specification

```yaml
# api-spec.yaml
openapi: 3.0.0
info:
  title: Products API
  version: 1.0.0
  description: Product management API
servers:
  - url: https://api.example.com/v1
paths:
  /products:
    get:
      summary: List products
      operationId: listProducts
      parameters:
        - name: category
          in: query
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            default: 10
      responses:
        '200':
          description: Product list
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Product'
    post:
      summary: Create product
      operationId: createProduct
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Product'
      responses:
        '201':
          description: Product created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
  /products/{productId}:
    get:
      summary: Get product
      operationId: getProduct
      parameters:
        - name: productId
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Product details
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Product'
components:
  schemas:
    Product:
      type: object
      required:
        - name
        - price
      properties:
        id:
          type: string
          readOnly: true
        name:
          type: string
        description:
          type: string
        price:
          type: number
          minimum: 0
        category:
          type: string
        inStock:
          type: boolean
          default: true
```

### Infrastructure Code

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { ApiManagementService } from '@atakora/cdk/apimanagement';
import { FunctionApp } from '@atakora/cdk/web';
import * as fs from 'fs';
import * as yaml from 'js-yaml';

const app = new App();
const stack = new Stack(app, 'openapi-stack');

const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-openapi-prod',
  location: 'eastus'
});

// Load OpenAPI spec
const openApiSpec = yaml.load(fs.readFileSync('./api-spec.yaml', 'utf8'));

// Backend Functions
const backendFunc = new FunctionApp(stack, 'backend', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-products-api-' + Date.now(),
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  appSettings: {
    OPENAPI_SPEC: JSON.stringify(openApiSpec)
  }
});

// API Management with OpenAPI
const apiManagement = new ApiManagementService(stack, 'apim', {
  resourceGroupName: resourceGroup.name,
  serviceName: 'apim-openapi-' + Date.now(),
  location: 'eastus',
  publisherEmail: 'api@example.com',
  publisherName: 'API Team',
  sku: {
    name: 'Developer',
    capacity: 1
  }
});

// Import OpenAPI specification
const api = new Api(stack, 'products-api', {
  resourceGroupName: resourceGroup.name,
  serviceName: apiManagement.name,
  apiId: 'products',
  path: 'v1',
  displayName: 'Products API',
  format: 'openapi+json',
  value: JSON.stringify(openApiSpec),
  serviceUrl: `https://${backendFunc.defaultHostName}/api`
});

// Add policies
api.addPolicy({
  format: 'xml',
  value: `
    <policies>
      <inbound>
        <base />
        <rate-limit calls="100" renewal-period="60" />
        <cors>
          <allowed-origins>
            <origin>*</origin>
          </allowed-origins>
          <allowed-methods>
            <method>*</method>
          </allowed-methods>
        </cors>
      </inbound>
      <backend>
        <base />
      </backend>
      <outbound>
        <base />
        <set-header name="X-API-Version" exists-action="override">
          <value>1.0.0</value>
        </set-header>
      </outbound>
      <on-error>
        <base />
      </on-error>
    </policies>
  `
});

stack.addOutput('APIPortal', `https://${apiManagement.name}.developer.azure-api.net`);
stack.addOutput('APIEndpoint', `https://${apiManagement.name}.azure-api.net/v1`);
stack.addOutput('SwaggerUI', `https://${apiManagement.name}.developer.azure-api.net/apis/products`);

app.synth();
```

### Cost Estimate
- API Management (Developer): ~$50/month
- Functions: ~$5/month
- Total: ~$55/month

## Example 3: Authenticated API with JWT

Secure API with JWT authentication and role-based access.

### Code

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { FunctionApp } from '@atakora/cdk/web';
import { ApiManagementService, Api, ApiOperation, NamedValue } from '@atakora/cdk/apimanagement';
import { KeyVault, Secret } from '@atakora/cdk/keyvault';

const app = new App();
const stack = new Stack(app, 'secure-api-stack');

const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-secure-api-prod',
  location: 'eastus'
});

// Key Vault for secrets
const keyVault = new KeyVault(stack, 'kv', {
  resourceGroupName: resourceGroup.name,
  vaultName: 'kv-api-' + Date.now(),
  location: 'eastus',
  sku: {
    name: 'standard',
    family: 'A'
  }
});

// Store JWT signing key
const jwtSecret = new Secret(stack, 'jwt-secret', {
  resourceGroupName: resourceGroup.name,
  vaultName: keyVault.name,
  secretName: 'jwt-signing-key',
  value: process.env.JWT_SIGNING_KEY || 'your-256-bit-secret'
});

// API Functions
const apiFunc = new FunctionApp(stack, 'api-func', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-secure-api-' + Date.now(),
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  identity: {
    type: 'SystemAssigned'
  },
  appSettings: {
    KEY_VAULT_URI: keyVault.vaultUri,
    JWT_SECRET_NAME: 'jwt-signing-key',
    JWT_ISSUER: 'https://auth.example.com',
    JWT_AUDIENCE: 'api.example.com'
  }
});

// Grant function access to Key Vault
keyVault.addAccessPolicy({
  tenantId: apiFunc.identity.tenantId,
  objectId: apiFunc.identity.principalId,
  permissions: {
    secrets: ['get', 'list']
  }
});

// API Management
const apiManagement = new ApiManagementService(stack, 'apim', {
  resourceGroupName: resourceGroup.name,
  serviceName: 'apim-secure-' + Date.now(),
  location: 'eastus',
  publisherEmail: 'security@example.com',
  publisherName: 'Security Team',
  sku: {
    name: 'Standard',
    capacity: 1
  },
  identity: {
    type: 'SystemAssigned'
  }
});

// Store JWT validation key in API Management
const jwtValidationKey = new NamedValue(stack, 'jwt-key', {
  resourceGroupName: resourceGroup.name,
  serviceName: apiManagement.name,
  namedValueId: 'jwt-validation-key',
  displayName: 'JWT Validation Key',
  secret: true,
  value: process.env.JWT_SIGNING_KEY || 'your-256-bit-secret'
});

// Define secure API
const secureApi = new Api(stack, 'secure-api', {
  resourceGroupName: resourceGroup.name,
  serviceName: apiManagement.name,
  apiId: 'secure',
  displayName: 'Secure API',
  path: 'api',
  protocols: ['https'],
  subscriptionRequired: true
});

// JWT validation policy
secureApi.addPolicy({
  format: 'xml',
  value: `
    <policies>
      <inbound>
        <base />
        <validate-jwt header-name="Authorization" failed-validation-httpcode="401" failed-validation-error-message="Unauthorized">
          <openid-config url="https://auth.example.com/.well-known/openid-configuration" />
          <audiences>
            <audience>api.example.com</audience>
          </audiences>
          <issuers>
            <issuer>https://auth.example.com</issuer>
          </issuers>
          <required-claims>
            <claim name="roles" match="any">
              <value>user</value>
              <value>admin</value>
            </claim>
          </required-claims>
        </validate-jwt>
        <set-header name="X-User-Id" exists-action="override">
          <value>@(context.Request.Headers["Authorization"][0].AsJwt()?.Claims["sub"].FirstOrDefault())</value>
        </set-header>
        <set-header name="X-User-Role" exists-action="override">
          <value>@(context.Request.Headers["Authorization"][0].AsJwt()?.Claims["roles"].FirstOrDefault())</value>
        </set-header>
      </inbound>
      <backend>
        <base />
      </backend>
      <outbound>
        <base />
      </outbound>
      <on-error>
        <base />
      </on-error>
    </policies>
  `
});

// Protected endpoints
const protectedOperations = [
  {
    operationId: 'get-user-profile',
    displayName: 'Get User Profile',
    method: 'GET',
    urlTemplate: '/users/profile',
    description: 'Get authenticated user profile'
  },
  {
    operationId: 'update-user-profile',
    displayName: 'Update User Profile',
    method: 'PUT',
    urlTemplate: '/users/profile',
    description: 'Update authenticated user profile'
  },
  {
    operationId: 'admin-only',
    displayName: 'Admin Operation',
    method: 'GET',
    urlTemplate: '/admin/users',
    description: 'Admin-only endpoint',
    policies: `
      <policies>
        <inbound>
          <base />
          <check-header name="X-User-Role" failed-check-httpcode="403" failed-check-error-message="Forbidden">
            <value>admin</value>
          </check-header>
        </inbound>
      </policies>
    `
  }
];

protectedOperations.forEach(op => {
  new ApiOperation(stack, op.operationId, {
    resourceGroupName: resourceGroup.name,
    serviceName: apiManagement.name,
    apiId: secureApi.apiId,
    ...op
  });
});

stack.addOutput('SecureAPIEndpoint', `https://${apiManagement.name}.azure-api.net/api`);
stack.addOutput('DeveloperPortal', `https://${apiManagement.name}.developer.azure-api.net`);

app.synth();
```

### JWT Validation Function

```javascript
// validateToken/index.js
const jwt = require('jsonwebtoken');
const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

let jwtSecret = null;

async function getJwtSecret() {
  if (!jwtSecret) {
    const keyVaultUri = process.env.KEY_VAULT_URI;
    const secretName = process.env.JWT_SECRET_NAME;

    const credential = new DefaultAzureCredential();
    const client = new SecretClient(keyVaultUri, credential);

    const secret = await client.getSecret(secretName);
    jwtSecret = secret.value;
  }
  return jwtSecret;
}

module.exports = async function (context, req) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    context.res = {
      status: 401,
      body: { error: 'No token provided' }
    };
    return;
  }

  try {
    const secret = await getJwtSecret();
    const decoded = jwt.verify(token, secret, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });

    context.res = {
      status: 200,
      body: {
        userId: decoded.sub,
        roles: decoded.roles,
        exp: decoded.exp
      }
    };
  } catch (error) {
    context.res = {
      status: 401,
      body: { error: 'Invalid token' }
    };
  }
};
```

### Cost Estimate
- API Management (Standard): ~$150/month
- Functions: ~$5/month
- Key Vault: ~$0.10/month
- Total: ~$155/month

## Example 4: Rate-Limited API with Subscriptions

API with different subscription tiers and rate limiting.

### Code

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { ApiManagementService, Api, Product, Subscription } from '@atakora/cdk/apimanagement';
import { FunctionApp } from '@atakora/cdk/web';

const app = new App();
const stack = new Stack(app, 'tiered-api-stack');

const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-tiered-api-prod',
  location: 'eastus'
});

// Backend Functions
const backend = new FunctionApp(stack, 'backend', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-tiered-' + Date.now(),
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18'
});

// API Management
const apiManagement = new ApiManagementService(stack, 'apim', {
  resourceGroupName: resourceGroup.name,
  serviceName: 'apim-tiered-' + Date.now(),
  location: 'eastus',
  publisherEmail: 'billing@example.com',
  publisherName: 'Billing Team',
  sku: {
    name: 'Standard',
    capacity: 1
  }
});

// API Definition
const api = new Api(stack, 'api', {
  resourceGroupName: resourceGroup.name,
  serviceName: apiManagement.name,
  apiId: 'data-api',
  displayName: 'Data API',
  path: 'data',
  protocols: ['https'],
  subscriptionRequired: true,
  serviceUrl: `https://${backend.defaultHostName}/api`
});

// Product Tiers
const freeProduct = new Product(stack, 'free-tier', {
  resourceGroupName: resourceGroup.name,
  serviceName: apiManagement.name,
  productId: 'free',
  displayName: 'Free Tier',
  description: 'Limited access for evaluation',
  subscriptionRequired: true,
  approvalRequired: false,
  subscriptionsLimit: 1,
  state: 'published'
});

const standardProduct = new Product(stack, 'standard-tier', {
  resourceGroupName: resourceGroup.name,
  serviceName: apiManagement.name,
  productId: 'standard',
  displayName: 'Standard Tier',
  description: 'Standard access for regular users',
  subscriptionRequired: true,
  approvalRequired: true,
  state: 'published'
});

const premiumProduct = new Product(stack, 'premium-tier', {
  resourceGroupName: resourceGroup.name,
  serviceName: apiManagement.name,
  productId: 'premium',
  displayName: 'Premium Tier',
  description: 'Unlimited access for power users',
  subscriptionRequired: true,
  approvalRequired: true,
  state: 'published'
});

// Associate API with products
[freeProduct, standardProduct, premiumProduct].forEach(product => {
  product.associateApi(api.apiId);
});

// Product-specific policies
freeProduct.addPolicy({
  format: 'xml',
  value: `
    <policies>
      <inbound>
        <rate-limit calls="10" renewal-period="60" />
        <quota calls="100" renewal-period="86400" />
        <base />
      </inbound>
    </policies>
  `
});

standardProduct.addPolicy({
  format: 'xml',
  value: `
    <policies>
      <inbound>
        <rate-limit calls="100" renewal-period="60" />
        <quota calls="10000" renewal-period="86400" />
        <base />
      </inbound>
    </policies>
  `
});

premiumProduct.addPolicy({
  format: 'xml',
  value: `
    <policies>
      <inbound>
        <rate-limit calls="1000" renewal-period="60" />
        <!-- No quota limit for premium -->
        <base />
      </inbound>
    </policies>
  `
});

// Create sample subscriptions
const freeSubscription = new Subscription(stack, 'free-sub', {
  resourceGroupName: resourceGroup.name,
  serviceName: apiManagement.name,
  subscriptionId: 'free-sample',
  displayName: 'Free Sample Subscription',
  productId: freeProduct.productId,
  state: 'active'
});

stack.addOutput('APIEndpoint', `https://${apiManagement.name}.azure-api.net/data`);
stack.addOutput('DeveloperPortal', `https://${apiManagement.name}.developer.azure-api.net`);
stack.addOutput('FreeTierKey', freeSubscription.primaryKey);

app.synth();
```

### Cost Estimate
- API Management (Standard): ~$150/month
- Functions: ~$5/month
- Total: ~$155/month

## Example 5: GraphQL API

GraphQL API with Azure Functions and API Management.

### Code

```typescript
import { App, Stack } from '@atakora/cdk';
import { ResourceGroup } from '@atakora/cdk/resourcegroup';
import { FunctionApp } from '@atakora/cdk/web';
import { ApiManagementService, Api, ApiOperation } from '@atakora/cdk/apimanagement';

const app = new App();
const stack = new Stack(app, 'graphql-stack');

const resourceGroup = new ResourceGroup(stack, 'rg', {
  name: 'rg-graphql-prod',
  location: 'eastus'
});

// GraphQL Functions
const graphqlFunc = new FunctionApp(stack, 'graphql', {
  resourceGroupName: resourceGroup.name,
  functionAppName: 'func-graphql-' + Date.now(),
  location: 'eastus',
  runtime: 'node',
  runtimeVersion: '18',
  appSettings: {
    GRAPHQL_ENDPOINT: '/api/graphql',
    GRAPHQL_PLAYGROUND: 'true',
    NODE_ENV: 'production'
  }
});

// API Management for GraphQL
const apiManagement = new ApiManagementService(stack, 'apim', {
  resourceGroupName: resourceGroup.name,
  serviceName: 'apim-graphql-' + Date.now(),
  location: 'eastus',
  publisherEmail: 'graphql@example.com',
  publisherName: 'GraphQL Team',
  sku: {
    name: 'Consumption',
    capacity: 0
  }
});

// GraphQL API
const graphqlApi = new Api(stack, 'graphql-api', {
  resourceGroupName: resourceGroup.name,
  serviceName: apiManagement.name,
  apiId: 'graphql',
  displayName: 'GraphQL API',
  path: 'graphql',
  protocols: ['https'],
  subscriptionRequired: false
});

// GraphQL endpoint
new ApiOperation(stack, 'graphql-op', {
  resourceGroupName: resourceGroup.name,
  serviceName: apiManagement.name,
  apiId: graphqlApi.apiId,
  operationId: 'graphql',
  displayName: 'GraphQL',
  method: 'POST',
  urlTemplate: '/',
  description: 'GraphQL endpoint'
});

// GraphQL Playground (development)
new ApiOperation(stack, 'playground-op', {
  resourceGroupName: resourceGroup.name,
  serviceName: apiManagement.name,
  apiId: graphqlApi.apiId,
  operationId: 'playground',
  displayName: 'GraphQL Playground',
  method: 'GET',
  urlTemplate: '/playground',
  description: 'GraphQL Playground UI'
});

// Add CORS policy for GraphQL
graphqlApi.addPolicy({
  format: 'xml',
  value: `
    <policies>
      <inbound>
        <cors>
          <allowed-origins>
            <origin>*</origin>
          </allowed-origins>
          <allowed-methods>
            <method>POST</method>
            <method>GET</method>
            <method>OPTIONS</method>
          </allowed-methods>
          <allowed-headers>
            <header>*</header>
          </allowed-headers>
        </cors>
        <base />
      </inbound>
    </policies>
  `
});

stack.addOutput('GraphQLEndpoint', `https://${apiManagement.name}.azure-api.net/graphql`);
stack.addOutput('GraphQLPlayground', `https://${apiManagement.name}.azure-api.net/graphql/playground`);

app.synth();
```

### GraphQL Function Implementation

```javascript
// graphql/index.js
const { ApolloServer, gql } = require('apollo-server-azure-functions');

const typeDefs = gql`
  type Query {
    hello: String
    users: [User]
    user(id: ID!): User
  }

  type Mutation {
    createUser(input: CreateUserInput!): User
    updateUser(id: ID!, input: UpdateUserInput!): User
    deleteUser(id: ID!): Boolean
  }

  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: String!
  }

  input CreateUserInput {
    name: String!
    email: String!
  }

  input UpdateUserInput {
    name: String
    email: String
  }
`;

const resolvers = {
  Query: {
    hello: () => 'Hello from GraphQL!',
    users: async () => {
      // Fetch from database
      return [];
    },
    user: async (_, { id }) => {
      // Fetch by ID
      return null;
    }
  },
  Mutation: {
    createUser: async (_, { input }) => {
      // Create user
      return { id: '1', ...input, createdAt: new Date().toISOString() };
    },
    updateUser: async (_, { id, input }) => {
      // Update user
      return { id, ...input };
    },
    deleteUser: async (_, { id }) => {
      // Delete user
      return true;
    }
  }
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  playground: process.env.GRAPHQL_PLAYGROUND === 'true',
  introspection: true
});

exports.graphqlHandler = server.createHandler();
```

### Cost Estimate
- API Management (Consumption): ~$0.05/10K calls
- Functions: ~$5/month
- Total: ~$5-10/month

## Testing Your APIs

### Using cURL

```bash
# Basic request
curl https://api.example.com/items

# With API key
curl -H "Ocp-Apim-Subscription-Key: YOUR_KEY" https://api.example.com/items

# POST with data
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
  -d '{"name":"Item 1","price":9.99}' \
  https://api.example.com/items
```

### Using Postman

1. Import OpenAPI specification
2. Set environment variables for API keys
3. Test all endpoints
4. Generate documentation

### Integration Tests

```typescript
// api.test.ts
import axios from 'axios';

describe('API Tests', () => {
  const apiUrl = process.env.API_URL;
  const apiKey = process.env.API_KEY;

  test('GET /items returns list', async () => {
    const response = await axios.get(`${apiUrl}/items`, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      }
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
  });

  test('POST /items creates item', async () => {
    const newItem = { name: 'Test Item', price: 19.99 };

    const response = await axios.post(`${apiUrl}/items`, newItem, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(201);
    expect(response.data.name).toBe(newItem.name);
  });
});
```

## Best Practices

### 1. Version Your APIs

```typescript
const v1Api = new Api(stack, 'v1-api', {
  path: 'v1',
  displayName: 'API v1',
  apiRevision: '1'
});

const v2Api = new Api(stack, 'v2-api', {
  path: 'v2',
  displayName: 'API v2',
  apiRevision: '2'
});
```

### 2. Implement Caching

```xml
<policies>
  <inbound>
    <cache-lookup vary-by-developer="false" vary-by-developer-groups="false">
      <vary-by-header>Accept</vary-by-header>
      <vary-by-query-parameter>category</vary-by-query-parameter>
    </cache-lookup>
  </inbound>
  <outbound>
    <cache-store duration="300" />
  </outbound>
</policies>
```

### 3. Add Request Validation

```xml
<policies>
  <inbound>
    <validate-content unspecified-content-type-action="prevent" max-size="102400" size-exceeded-action="prevent">
      <content type="application/json" validate-as="json" action="prevent" />
    </validate-content>
  </inbound>
</policies>
```

### 4. Monitor API Health

```typescript
const healthCheck = new ApiOperation(stack, 'health', {
  operationId: 'health-check',
  method: 'GET',
  urlTemplate: '/health',
  responses: [{
    statusCode: 200,
    description: 'Service is healthy'
  }]
});
```

## Clean Up

```bash
# Remove all resources
atakora destroy

# Verify deletion
az group exists --name rg-crud-api-prod
```

## Next Steps

- Review [Microservices Examples](./Microservices.md) for distributed APIs
- Explore [Authentication Examples](./Authentication.md) for advanced security
- Check [API Best Practices](../guides/patterns/backend/Best-Practices.md)

---

**Need help?** See [API Troubleshooting](../troubleshooting/API-Issues.md) or [Common Issues](../troubleshooting/Common-Issues.md)