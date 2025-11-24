# Complete API Reference

Comprehensive API documentation for @atakora/component v2.0.0

## Table of Contents

- [Schema API](#schema-api)
  - [Field Builders](#field-builders)
  - [Model Builders](#model-builders)
  - [Schema Definition](#schema-definition)
- [Authentication API](#authentication-api)
  - [Auth Providers](#auth-providers)
  - [Token Validation](#token-validation)
  - [Session & MFA](#session--mfa)
- [Backend API](#backend-api)
  - [Backend Definition](#backend-definition)
  - [Attachment Points](#attachment-points)
  - [Environment](#environment)
- [Functions API](#functions-api)
- [Validation API](#validation-api)
- [Common Utilities](#common-utilities)

---

## Schema API

### Field Builders

Access via the `a` namespace from `@atakora/component/schema`.

#### String Fields

```typescript
import { a } from '@atakora/component/schema';

a.string()
  .required()           // Mark field as required
  .optional()           // Mark field as optional (default)
  .min(3)               // Minimum length
  .max(100)             // Maximum length
  .email()              // Validate email format
  .url()                // Validate URL format
  .regex(/pattern/)     // Custom regex validation
  .default('value')     // Default value
  .description('...')   // Field description
  .custom(fn)           // Custom validation function
```

**Example:**

```typescript
email: a.string()
  .required()
  .email()
  .max(255)
  .description('User email address')
```

#### Number Fields

```typescript
a.number()
  .required()
  .optional()
  .min(0)               // Minimum value
  .max(100)             // Maximum value
  .integer()            // Must be integer
  .positive()           // Must be > 0
  .negative()           // Must be < 0
  .default(0)
  .description('...')
  .custom(fn)
```

**Example:**

```typescript
age: a.number()
  .integer()
  .min(0)
  .max(120)
  .description('User age in years')
```

#### Boolean Fields

```typescript
a.boolean()
  .required()
  .optional()
  .default(false)
  .description('...')
```

**Example:**

```typescript
isActive: a.boolean()
  .default(true)
  .description('Account active status')
```

#### DateTime Fields

```typescript
a.datetime()
  .required()
  .optional()
  .default(() => new Date())  // Dynamic default
  .min(new Date('2020-01-01')) // Minimum date
  .max(new Date('2030-12-31')) // Maximum date
  .description('...')
```

**Example:**

```typescript
createdAt: a.datetime()
  .default(() => new Date())
  .description('Record creation timestamp')
```

#### ID Fields

```typescript
a.id()                  // Auto-generated unique ID
  .description('...')
```

**Example:**

```typescript
id: a.id()
```

#### Enum Fields

```typescript
a.enum(['value1', 'value2', 'value3'])
  .required()
  .optional()
  .default('value1')
  .description('...')
```

**Example:**

```typescript
status: a.enum(['active', 'inactive', 'archived'])
  .default('active')
  .description('Account status')

role: a.enum(['admin', 'member', 'viewer'] as const)
  .default('member')
```

#### Array Fields

```typescript
a.array(a.string())     // Array of strings
  .required()
  .optional()
  .min(1)               // Minimum array length
  .max(10)              // Maximum array length
  .default([])
  .description('...')
```

**Example:**

```typescript
tags: a.array(a.string())
  .max(20)
  .description('Project tags')

scores: a.array(a.number().min(0).max(100))
  .description('Test scores')
```

#### Object Fields

```typescript
a.object({
  field1: a.string(),
  field2: a.number(),
})
  .required()
  .optional()
  .description('...')
```

**Example:**

```typescript
address: a.object({
  street: a.string().required(),
  city: a.string().required(),
  state: a.string().required(),
  zip: a.string().required(),
})
  .description('Mailing address')
```

#### JSON Fields

```typescript
a.json()                // Arbitrary JSON data
  .required()
  .optional()
  .schema(zodSchema)    // Optional Zod schema validation
  .description('...')
```

**Example:**

```typescript
metadata: a.json()
  .description('Additional metadata')
```

#### Binary Fields

```typescript
a.binary()              // Binary data (Buffer)
  .required()
  .optional()
  .maxSize(1024 * 1024) // Max size in bytes
  .description('...')
```

**Example:**

```typescript
avatar: a.binary()
  .maxSize(5 * 1024 * 1024) // 5MB max
  .description('User avatar image')
```

#### Reference Fields

```typescript
a.ref('ModelName')      // Reference to another model
  .required()
  .optional()
  .description('...')
```

**Example:**

```typescript
ownerId: a.string().required(),
owner: a.ref('User')
  .optional()
  .description('Reference to owner user')
```

### Model Builders

#### CRUD Models

Access via the `c` namespace from `@atakora/component/schema`.

```typescript
import { c, a } from '@atakora/component/schema';

c.model({
  id: a.id(),
  field1: a.string(),
  field2: a.number(),
})
  .authorization(allow => [
    allow.owner('userId'),
    allow.authenticated(),
    allow.custom(fn),
  ])
  .indexes([
    { fields: ['field1'] },
    { fields: ['field1', 'field2'], type: 'composite' },
  ])
  .partitionKey('field1')
  .ttl(3600)              // Time to live in seconds
  .timestamped(true)      // Auto-add createdAt/updatedAt
```

**Authorization Builders:**

```typescript
.authorization(allow => [
  // Owner-based
  allow.owner('userIdField'),

  // Authentication-based
  allow.authenticated(),
  allow.public(),

  // Operation-specific
  allow.authenticated().read(),
  allow.owner('userId').update().delete(),

  // Role-based
  allow.custom((ctx) => ctx.user.roles.includes('admin')),

  // Record-based
  allow.custom((ctx, record) => record.status === 'published'),
])
```

**Complete Example:**

```typescript
User: c.model({
  id: a.id(),
  email: a.string().required().email(),
  name: a.string().required(),
  role: a.enum(['admin', 'member']).default('member'),
  createdAt: a.datetime().default(() => new Date()),
})
  .authorization(allow => [
    allow.owner('id'),
    allow.custom((ctx) => ctx.user.roles.includes('admin')),
  ])
  .indexes([
    { fields: ['email'], unique: true },
    { fields: ['role', 'createdAt'] },
  ])
```

#### Event Models

Access via the `e` namespace from `@atakora/component/schema`.

```typescript
import { e, a } from '@atakora/component/schema';

e.model({
  field1: a.string(),
  field2: a.number(),
})
  .handler(async (event, context) => {
    // Process event
  })
  .retry({
    maxRetries: 3,
    backoff: 'exponential',
  })
  .deadLetter({
    queueName: 'failed-events',
  })
```

**Example:**

```typescript
UserCreated: e.model({
  userId: a.string().required(),
  email: a.string().required().email(),
  timestamp: a.datetime().default(() => new Date()),
})
  .handler(async (event, context) => {
    // Send welcome email
    await context.services.emailService.send(
      event.email,
      'Welcome!',
      'Welcome to our platform'
    );
  })
  .retry({
    maxRetries: 3,
    backoff: 'exponential',
    initialDelay: 1000,
  })
```

#### Function Models

Access via the `f` namespace from `@atakora/component/schema`.

```typescript
import { f, a } from '@atakora/component/schema';

f.model({
  input: {
    field1: a.string(),
    field2: a.number(),
  },
  output: {
    result: a.string(),
  },
})
  .handler(async (input, context) => {
    // Process and return
    return { result: 'done' };
  })
  .authorization(allow => [
    allow.authenticated(),
  ])
  .rateLimit({
    requestsPerMinute: 100,
  })
```

**Example:**

```typescript
GenerateReport: f.model({
  input: {
    projectId: a.string().required(),
    format: a.enum(['pdf', 'csv', 'json']),
  },
  output: {
    reportUrl: a.string().url().required(),
    generatedAt: a.datetime().required(),
  },
})
  .handler(async (input, context) => {
    const project = await context.database.Project.get(input.projectId);
    const url = await generateReport(project, input.format);
    return {
      reportUrl: url,
      generatedAt: new Date(),
    };
  })
  .authorization(allow => [
    allow.authenticated(),
  ])
```

### Schema Definition

```typescript
import { defineSchema, a, c, e, f } from '@atakora/component/schema';

export const schema = defineSchema({
  schema: a.schema({
    // CRUD models
    User: c.model({ /* ... */ }),
    Project: c.model({ /* ... */ }),

    // Event models
    UserCreated: e.model({ /* ... */ }),
    ProjectUpdated: e.model({ /* ... */ }),

    // Function models
    GenerateReport: f.model({ /* ... */ }),
  }),
});
```

**Schema Helpers:**

```typescript
import {
  getModelNames,
  getCrudModelNames,
  getEventModelNames,
  getFunctionModelNames,
  getModel,
  hasModel,
} from '@atakora/component/schema';

const allModels = getModelNames(schema);
const crudModels = getCrudModelNames(schema);
const eventModels = getEventModelNames(schema);
const functionModels = getFunctionModelNames(schema);

const userModel = getModel(schema, 'User');
const exists = hasModel(schema, 'User');
```

**Type Inference:**

```typescript
import type { InferModelType, InferCreateInput } from '@atakora/component/schema';

// Infer TypeScript type from schema
type User = InferModelType<typeof schema, 'User'>;
// { id: string; email: string; name: string; ... }

// Infer create input type
type CreateUser = InferCreateInput<typeof schema, 'User'>;
// { email: string; name: string; ... } (no id, auto-generated)
```

---

## Authentication API

### Auth Providers

#### Entra ID Provider

```typescript
import { auth } from '@atakora/component/auth';

auth.entra()
  .tenantId(string)               // Azure tenant ID
  .clientId(string)               // App registration client ID
  .audience(string)               // Expected token audience
  .issuer(string)                 // Expected token issuer
  .validateIssuer(boolean)        // Validate issuer claim
  .validateAudience(boolean)      // Validate audience claim
  .clockTolerance(number)         // Clock skew tolerance (seconds)
  .cacheTokens(boolean)           // Enable token caching
  .cacheTTL(number)               // Cache TTL (seconds)
  .primary()                      // Mark as primary provider
  .roles((mapper) => {
    mapper.map('EntraRole', 'appRole');
    mapper.mapDefault('viewer');
  })
```

**Example:**

```typescript
import { defineAuth, auth } from '@atakora/component/auth';

export const authentication = defineAuth({
  Primary: auth.entra()
    .tenantId(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .audience('api://my-app')
    .issuer(`https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`)
    .validateIssuer(true)
    .validateAudience(true)
    .clockTolerance(300)
    .cacheTokens(true)
    .cacheTTL(3600)
    .primary()
    .roles((mapper) => {
      mapper.map('App.Admin', 'admin');
      mapper.map('App.Member', 'member');
      mapper.mapDefault('viewer');
    }),
});
```

#### API Keys Provider

```typescript
auth.apiKey()
  .headerName(string)             // Header name (default: 'x-api-key')
  .validateKey(async (key) => boolean) // Key validation function
  .roles(string[])                // Static roles for API key users
```

**Example:**

```typescript
ApiKey: auth.apiKey()
  .headerName('x-api-key')
  .validateKey(async (key) => {
    const validKeys = await getValidKeysFromKeyVault();
    return validKeys.includes(key);
  })
  .roles(['service', 'automation'])
```

#### Custom Provider

```typescript
auth.custom({
  name: string,
  validate: async (token: string) => {
    // Return user context or throw error
    return {
      userId: string,
      email: string,
      roles: string[],
      claims: Record<string, any>,
    };
  },
  refresh?: async (refreshToken: string) => {
    // Optional: refresh token logic
    return {
      accessToken: string,
      refreshToken: string,
      expiresIn: number,
    };
  },
  revoke?: async (token: string) => {
    // Optional: revoke token logic
  },
})
```

**Example:**

```typescript
Custom: auth.custom({
  name: 'internal-auth',
  validate: async (token) => {
    const decoded = await verifyInternalToken(token);
    return {
      userId: decoded.sub,
      email: decoded.email,
      roles: decoded.roles,
      claims: decoded,
    };
  },
})
```

### Token Validation

```typescript
import {
  decodeJwt,
  validateJwtSignature,
  extractUserId,
  extractEmail,
  isTokenExpired,
  isTokenNotYetValid,
} from '@atakora/component/auth';

// Decode without validation
const payload = decodeJwt(token);

// Validate signature
const valid = await validateJwtSignature(token, publicKey);

// Extract claims
const userId = extractUserId(payload);
const email = extractEmail(payload);

// Check validity
const expired = isTokenExpired(payload);
const notYetValid = isTokenNotYetValid(payload);
```

### Session & MFA

#### Session Configuration

```typescript
import { session } from '@atakora/component/auth';

session()
  .maxAge(number)                 // Session max age (seconds)
  .renewalWindow(number)          // Renewal window before expiry
  .storage({
    type: 'redis',
    connectionString: string,
    keyPrefix: string,
  })
  .maxConcurrentSessions(number)  // Max concurrent sessions per user
  .terminateOldest(boolean)       // Terminate oldest on limit
  .invalidateOn({
    passwordChange: boolean,
    roleChange: boolean,
    logout: boolean,
  })
  .trackActivity(boolean)         // Track user activity
  .idleTimeout(number)            // Idle timeout (seconds)
```

#### MFA Configuration

```typescript
import { mfa } from '@atakora/component/auth';

mfa()
  .enabled(boolean)
  .required(boolean)              // Require MFA for all users
  .requireForRoles(string[])      // Require for specific roles
  .trustedDevices({
    enabled: boolean,
    trustDuration: number,        // How long to trust device (seconds)
  })
  .methods(string[])              // Allowed methods: phone, authenticator, email
  .stepUp({
    operations: string[],         // Operations requiring step-up
    validity: number,             // How long step-up is valid (seconds)
  })
```

**Example:**

```typescript
Primary: auth.entra()
  .tenantId(process.env.AZURE_TENANT_ID!)
  .clientId(process.env.AZURE_CLIENT_ID!)
  .session(
    session()
      .maxAge(28800) // 8 hours
      .storage({
        type: 'redis',
        connectionString: process.env.REDIS_CONNECTION_STRING!,
      })
      .trackActivity(true)
      .idleTimeout(1800) // 30 minutes
  )
  .mfa(
    mfa()
      .enabled(true)
      .requireForRoles(['admin'])
      .methods(['authenticator', 'phone'])
  )
```

### Rate Limiting

```typescript
import {
  createLoginRateLimiter,
  createApiRateLimiter,
  createStrictRateLimiter,
} from '@atakora/component/auth';

// Login rate limiting
const loginLimiter = createLoginRateLimiter({
  windowMs: 900000, // 15 minutes
  maxAttempts: 5,
  blockDuration: 3600000, // 1 hour
});

// API rate limiting
const apiLimiter = createApiRateLimiter({
  windowMs: 60000, // 1 minute
  maxRequests: 100,
  burstSize: 20,
});

// Strict rate limiting
const strictLimiter = createStrictRateLimiter({
  windowMs: 60000,
  maxRequests: 10,
});
```

### Security Audit

```typescript
import {
  createConsoleAuditor,
  createHighRiskAuditor,
  createMultiHandlerAuditor,
} from '@atakora/component/auth';

// Console auditor (development)
const auditor = createConsoleAuditor();

// High-risk event auditor
const riskAuditor = createHighRiskAuditor({
  logToDatabase: true,
  sendAlerts: true,
});

// Multi-handler auditor
const multiAuditor = createMultiHandlerAuditor([
  consoleAuditor,
  databaseAuditor,
  alertAuditor,
]);

// Log security event
await auditor.log({
  type: 'login_success',
  userId: 'user-123',
  timestamp: new Date(),
  metadata: { ip: '1.2.3.4' },
});
```

---

## Backend API

### Backend Definition

```typescript
import { defineBackend } from '@atakora/component/backend';

export const backend = defineBackend({
  schema,                         // Schema definition
  authentication,                 // Auth configuration
  settings: {
    name: string,                 // Backend name
    region: string,               // Azure region
    environment: string,          // Environment: development, staging, production, govcloud
    resourcePrefix: string,       // Resource name prefix
    resourceSuffix: string,       // Resource name suffix

    features: {
      auditLogging: boolean,
      metricsCollection: boolean,
      distributedTracing: boolean,
      autoScaling: boolean,
    },

    cors: {
      allowedOrigins: string[],
      allowedMethods: string[],
      allowedHeaders: string[],
      maxAge: number,
    },

    performance: {
      caching: {
        enabled: boolean,
        ttl: number,
      },
      rateLimit: {
        enabled: boolean,
        requestsPerMinute: number,
        burstSize: number,
      },
    },
  },

  services: (builder) => ({
    serviceName: builder.singleton({
      // Service implementation
    }),
  }),

  functions: {
    functionName: {
      handler: async (context) => { /* ... */ },
      httpTrigger: {
        methods: ['GET', 'POST'],
        route: 'path/{param}',
        authLevel: 'authenticated',
      },
    },
  },
});
```

### Attachment Points

```typescript
import {
  createAttachmentPoint,
  createAttachmentPoints,
} from '@atakora/component/backend';

// Single attachment point
const storage = createAttachmentPoint('storage', {
  validate: (config) => {
    // Validation logic
  },
});

// Multiple attachment points
const attachments = createAttachmentPoints({
  storage: {
    validate: (config) => { /* ... */ },
  },
  compute: {
    validate: (config) => { /* ... */ },
  },
});

// Use in backend
backend.attach.storage({
  accountName: 'myaccount',
  sku: 'Standard_LRS',
});
```

### Environment

```typescript
import {
  detectEnvironment,
  getEnvironmentDefaults,
  getDefaultRegion,
} from '@atakora/component/backend';

// Detect environment
const env = detectEnvironment();
// Returns: 'development', 'staging', 'production', or 'govcloud'

// Get environment defaults
const defaults = getEnvironmentDefaults(env);
// {
//   authEndpoint: '...',
//   resourceManagerEndpoint: '...',
//   encryptionRequired: boolean,
//   auditRequired: boolean,
// }

// Get default region for environment
const region = getDefaultRegion(env);
```

---

## Functions API

### Function Handler

```typescript
import type { FunctionHandler } from '@atakora/component/functions';
import type { Backend } from './backend';

export const handler: FunctionHandler<Backend> = async (context) => {
  // Access request
  const { method, path, params, query, body, headers } = context.request;

  // Access user
  const { id, email, roles } = context.user;

  // Access database
  const user = await context.database.User.get(context.user.id);
  const tasks = await context.database.Task.query({
    filter: { assigneeId: context.user.id },
  });

  // Access services
  await context.services.emailService.send('...', '...', '...');

  // Return response
  return context.response.success({ data: '...' });
  return context.response.created({ id: '...' });
  return context.response.notFound('Not found');
  return context.response.badRequest('Invalid input');
  return context.response.forbidden('Access denied');
  return context.response.error('Internal error');
};
```

### Response Helpers

```typescript
// Success responses
context.response.success(data);           // 200 OK
context.response.created(data);           // 201 Created
context.response.accepted();              // 202 Accepted
context.response.noContent();             // 204 No Content

// Error responses
context.response.badRequest(message);     // 400 Bad Request
context.response.unauthorized(message);   // 401 Unauthorized
context.response.forbidden(message);      // 403 Forbidden
context.response.notFound(message);       // 404 Not Found
context.response.conflict(message);       // 409 Conflict
context.response.error(message);          // 500 Internal Server Error

// Custom response
context.response.custom({
  statusCode: 418,
  body: { message: "I'm a teapot" },
  headers: { 'X-Custom': 'value' },
});
```

---

## Validation API

```typescript
import {
  createValidator,
  validate,
  ValidationError,
} from '@atakora/component/validation';

// Create validator from schema
const validator = createValidator(schema, 'User');

// Validate data
const result = validator.validate({
  email: 'user@example.com',
  name: 'John Doe',
});

if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.error('Invalid:', result.errors);
}

// Validation result type
type ValidationResult<T> = {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
};

type ValidationError = {
  path: string;
  message: string;
  code: string;
};
```

---

## Common Utilities

### Duration

```typescript
import { duration } from '@atakora/component/common';

const oneHour = duration.hours(1);        // 3600 seconds
const oneDay = duration.days(1);          // 86400 seconds
const oneWeek = duration.weeks(1);        // 604800 seconds

// Use in configuration
settings: {
  sessionTimeout: duration.hours(8),
  cacheExpiry: duration.minutes(30),
}
```

### Size

```typescript
import { size } from '@atakora/component/common';

const oneMB = size.megabytes(1);          // 1048576 bytes
const oneGB = size.gigabytes(1);          // 1073741824 bytes

// Use in configuration
settings: {
  maxUploadSize: size.megabytes(10),
  diskQuota: size.gigabytes(100),
}
```

### Threshold

```typescript
import { threshold } from '@atakora/component/common';

const cpuThreshold = threshold.percentage(80);
const memoryThreshold = threshold.absolute(512);

// Use in configuration
settings: {
  autoScale: {
    cpuThreshold: threshold.percentage(70),
    memoryThreshold: threshold.megabytes(512),
  },
}
```

### Network

```typescript
import { network } from '@atakora/component/common';

const subnet = network.subnet('10.0.1.0/24');
const cidr = network.cidr('10.0.0.0', 16);

// Use in configuration
settings: {
  virtualNetwork: {
    addressSpace: network.cidr('10.0.0.0', 16),
    subnets: {
      app: network.subnet('10.0.1.0/24'),
      data: network.subnet('10.0.2.0/24'),
    },
  },
}
```

---

## Type Inference

### Schema Type Inference

```typescript
import type {
  InferModelType,
  InferCreateInput,
  InferUpdateInput,
  InferFilterType,
} from '@atakora/component/schema';

// Full model type
type User = InferModelType<typeof schema, 'User'>;

// Create input (no auto-generated fields)
type CreateUserInput = InferCreateInput<typeof schema, 'User'>;

// Update input (all fields optional)
type UpdateUserInput = InferUpdateInput<typeof schema, 'User'>;

// Filter type (with operators)
type UserFilter = InferFilterType<typeof schema, 'User'>;
```

### Auth Type Inference

```typescript
import type {
  InferAuthProviders,
  InferPrimaryProvider,
  InferProviderNames,
} from '@atakora/component/auth';

// All provider configs
type Providers = InferAuthProviders<typeof authentication>;

// Primary provider
type Primary = InferPrimaryProvider<typeof authentication>;

// Provider names
type Names = InferProviderNames<typeof authentication>;
```

### Backend Type Inference

```typescript
import type { Backend } from './backend';

// Infer from backend
type BackendSchema = Backend['schema'];
type BackendAuth = Backend['authentication'];
type BackendSettings = Backend['settings'];
type BackendServices = Backend['services'];
```

---

## Error Handling

### Schema Errors

```typescript
import { ValidationError } from '@atakora/component/schema';

try {
  const result = validator.validate(data);
  if (!result.success) {
    throw new ValidationError(result.errors);
  }
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.errors);
  }
}
```

### Auth Errors

```typescript
import {
  AuthError,
  TokenValidationError,
  RoleMappingError,
} from '@atakora/component/auth';

try {
  const user = await validateToken(token);
} catch (error) {
  if (error instanceof TokenValidationError) {
    console.error('Invalid token:', error.message);
  } else if (error instanceof RoleMappingError) {
    console.error('Role mapping failed:', error.message);
  }
}
```

### Backend Errors

```typescript
import {
  AttachmentValidationError,
  StorageAttachmentError,
  MonitoringAttachmentError,
} from '@atakora/component/backend';

try {
  backend.attach.storage(config);
} catch (error) {
  if (error instanceof AttachmentValidationError) {
    console.error('Invalid configuration:', error.message);
  }
}
```

---

## Best Practices

### Schema Design

1. **Use descriptive field names** that clearly indicate purpose
2. **Add descriptions** to all fields for documentation
3. **Set appropriate defaults** for optional fields
4. **Use validation** to enforce data quality
5. **Create indexes** for frequently queried fields
6. **Define authorization rules** explicitly

### Authentication

1. **Always validate tokens** on every request
2. **Use MFA** for administrative accounts
3. **Implement rate limiting** to prevent abuse
4. **Log security events** for audit trail
5. **Rotate secrets regularly**
6. **Use environment variables** for sensitive configuration

### Performance

1. **Use caching** for frequently accessed data
2. **Implement pagination** for large result sets
3. **Create appropriate indexes** on Cosmos DB
4. **Use projection** to fetch only needed fields
5. **Avoid cross-partition queries** when possible
6. **Enable auto-scaling** for production workloads

### Security

1. **Always use HTTPS** for all traffic
2. **Validate all input** before processing
3. **Sanitize output** to prevent XSS
4. **Use parameterized queries** to prevent injection
5. **Implement least privilege** access control
6. **Enable audit logging** for compliance

---

## Version Information

- **Package Version:** 2.0.0-alpha.1
- **API Version:** 2.0
- **Schema API Version:** 2.0.0
- **Backend Assembly Version:** 1.0.0

---

## Additional Resources

- [Getting Started Tutorial](../tutorials/getting-started.md)
- [Advanced Features Guide](../guides/advanced-features.md)
- [Troubleshooting Guide](../guides/troubleshooting-comprehensive.md)
- [Example Gallery](../../examples/)

---

**Last Updated:** 2025-01-22
