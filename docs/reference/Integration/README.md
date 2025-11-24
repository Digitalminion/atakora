# Integration Reference

Documentation for integrating Atakora with external systems including Azure Functions, OpenAPI specifications, and type generation.

## Overview

Atakora provides powerful integration capabilities for working with Azure Functions, OpenAPI specifications, and automatic type generation. This section covers all integration points and APIs.

## Integration Points

### Azure Functions
- **[Azure Functions Handlers](./Azure-Functions-Handlers.md)** - Function handler types and patterns
  - HTTP triggers
  - Queue triggers
  - Timer triggers
  - Event Grid triggers
  - Cosmos DB triggers

### OpenAPI Integration
- **[OpenAPI Synthesis](./OpenAPI-Synthesis.md)** - Generate infrastructure from OpenAPI specs
  - API Management integration
  - Route generation
  - Policy creation
  - Schema validation

### Type Generation
- **[OpenAPI Type Generation](./OpenAPI-Type-Generation.md)** - Generate TypeScript types from OpenAPI
  - Request/response types
  - Model interfaces
  - Validation schemas
  - Client SDKs

## Azure Functions Integration

### Handler Patterns

```typescript
import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { FunctionHandler } from '@atakora/lib/functions';

// HTTP Trigger
export const httpHandler: FunctionHandler<HttpRequest> = async (context, req) => {
  const name = req.query.name || req.body?.name || 'World';

  return {
    status: 200,
    body: `Hello, ${name}!`
  };
};

// Queue Trigger
export const queueHandler: FunctionHandler<string> = async (context, message) => {
  context.log('Processing queue message:', message);
  // Process message
};

// Timer Trigger
export const timerHandler: FunctionHandler<Timer> = async (context, timer) => {
  context.log('Timer triggered at:', new Date().toISOString());
  // Scheduled task
};
```

### Binding Configuration

```typescript
import { FunctionApp } from '@atakora/cdk/web';
import { StorageAccount } from '@atakora/cdk/storage';

const functionApp = new FunctionApp(this, 'FunctionApp', {
  // Function app configuration
});

// Add function with bindings
functionApp.addFunction('ProcessOrder', {
  handler: 'handlers/order.process',
  trigger: {
    type: 'httpTrigger',
    methods: ['POST'],
    route: 'orders'
  },
  bindings: [
    {
      type: 'queue',
      direction: 'out',
      name: 'orderQueue',
      queueName: 'orders',
      connection: 'AzureWebJobsStorage'
    }
  ]
});
```

## OpenAPI Integration

### Import OpenAPI Specification

```typescript
import { RestApi } from '@atakora/cdk/apimanagement';
import { OpenApiImporter } from '@atakora/lib/openapi';

// Import OpenAPI spec
const api = OpenApiImporter.fromFile('./api/openapi.yaml');

// Generate API Management instance
const apiManagement = new RestApi(this, 'API', {
  definition: api,
  cors: {
    allowedOrigins: ['https://app.example.com'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Generate backend functions
api.generateFunctions(functionApp, {
  handlerPath: './src/handlers',
  middleware: ['auth', 'validation']
});
```

### OpenAPI Extensions

Atakora supports Azure-specific OpenAPI extensions:

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0

paths:
  /users/{id}:
    get:
      x-azure-function: getUserById
      x-azure-settings:
        authorization: bearer
        cache: 300
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        200:
          description: User found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

components:
  schemas:
    User:
      x-azure-cosmos-db:
        container: users
        partitionKey: /tenantId
      type: object
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
```

## Type Generation

### Generate Types from OpenAPI

```typescript
import { generateTypes } from '@atakora/lib/openapi';

// Generate TypeScript types
await generateTypes({
  input: './api/openapi.yaml',
  output: './src/types/api.ts',
  options: {
    // Include request/response types
    includeRequests: true,
    includeResponses: true,

    // Generate validation schemas
    generateValidation: true,

    // Generate mock data factories
    generateMocks: true,

    // Custom type mappings
    typeMappings: {
      'date-time': 'Date',
      'uuid': 'string'
    }
  }
});
```

### Generated Type Examples

```typescript
// Generated from OpenAPI schema
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetUserByIdRequest {
  params: {
    id: string;
  };
}

export interface GetUserByIdResponse {
  status: 200;
  body: User;
}

// Validation schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Mock factories
export const mockUser = (overrides?: Partial<User>): User => ({
  id: faker.datatype.uuid(),
  email: faker.internet.email(),
  name: faker.name.fullName(),
  createdAt: faker.date.past(),
  updatedAt: faker.date.recent(),
  ...overrides
});
```

## Integration Patterns

### API Gateway Pattern

```typescript
// Define API with OpenAPI
const api = OpenApiImporter.fromFile('./api.yaml');

// Create API Management
const apiGateway = new ApiManagement(this, 'Gateway', {
  sku: { name: 'Consumption' }
});

// Add API from OpenAPI
const apiInstance = apiGateway.addApi('MyAPI', {
  definition: api,
  path: 'v1'
});

// Create backend functions
const functions = api.generateFunctions(functionApp);

// Link API to functions
apiInstance.linkBackend(functions);
```

### Event-Driven Pattern

```typescript
// Define event schema
interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
  total: number;
}

// Create event handler
const processOrder: FunctionHandler<OrderCreatedEvent> = async (context, event) => {
  context.log('Processing order:', event.orderId);

  // Business logic
  await validateOrder(event);
  await chargePayment(event);
  await notifyCustomer(event);
};

// Configure function with event trigger
functionApp.addFunction('ProcessOrder', {
  handler: processOrder,
  trigger: {
    type: 'eventGridTrigger'
  }
});
```

### Microservices Pattern

```typescript
// Service discovery via OpenAPI
const services = {
  users: OpenApiImporter.fromUrl('https://api.example.com/users/openapi.json'),
  orders: OpenApiImporter.fromUrl('https://api.example.com/orders/openapi.json'),
  inventory: OpenApiImporter.fromUrl('https://api.example.com/inventory/openapi.json')
};

// Generate unified API gateway
const gateway = new ApiManagement(this, 'Gateway');

Object.entries(services).forEach(([name, service]) => {
  gateway.addApi(name, {
    definition: service,
    path: name,
    policies: ['rate-limit', 'cache']
  });
});
```

## Best Practices

1. **Version Your APIs**: Use semantic versioning in OpenAPI specs
2. **Validate Schemas**: Always validate against OpenAPI schema
3. **Generate Types**: Keep types in sync with API definitions
4. **Use Extensions**: Leverage Azure-specific extensions
5. **Handle Errors**: Implement proper error handling in functions
6. **Monitor Performance**: Use Application Insights for monitoring
7. **Secure Endpoints**: Implement authentication and authorization

## Troubleshooting

### Common Issues

**Type Generation Fails**
```bash
# Validate OpenAPI spec first
npx @apidevtools/swagger-cli validate api.yaml

# Then regenerate types
atakora generate-types --input api.yaml --output types/
```

**Function Binding Errors**
```bash
# Check function app settings
az functionapp config appsettings list \
  --name func-myapp-prod \
  --resource-group rg-myapp-prod
```

**API Import Issues**
```bash
# Validate OpenAPI compatibility
az apim api import validate \
  --specification-path api.yaml \
  --specification-format OpenApi
```

## Related Documentation

- [Azure Functions Guide](../../guides/azure-functions.md) - Complete Functions guide
- [REST API Guide](../../guides/rest-api.md) - Building REST APIs
- [API Reference](../api/README.md) - API documentation
- [Backend Reference](../backend/README.md) - Backend framework