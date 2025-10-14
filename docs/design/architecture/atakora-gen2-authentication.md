# Atakora Gen 2 - Authentication & Authorization

**Part of**: Atakora Gen 2 Design
**Created**: 2025-10-14
**Status**: Design Phase

## Overview

Zero-config authentication with Entra ID (Azure AD) by default, with flexibility for custom providers. Authorization is declarative and enforced at the schema level.

## Philosophy

**Secure by Default, Simple by Design**

1. **Zero-config for common case** - Entra ID works out of the box
2. **Declarative authorization** - Define rules in schema, not scattered in code
3. **Type-safe** - User context is strongly typed
4. **Multi-provider** - Support Entra ID, custom JWT, API keys
5. **Granular control** - Model-level, field-level, operation-level rules

## Core Concepts

### Authentication (Who are you?)

```typescript
// Authentication answers: "Who is this user?"
// Handled automatically by Azure App Service Authentication (EasyAuth)

const user = {
  id: '12345678-1234-1234-1234-123456789abc',
  email: 'developer@company.com',
  name: 'Jane Developer',
  groups: ['developers', 'admins'],
  provider: 'entra-id',  // or 'custom', 'api-key', 'managed-identity'
};
```

### Authorization (What can you do?)

```typescript
// Authorization answers: "Can this user perform this action?"
// Defined declaratively in schema

const model = c.model({
  title: a.string().required(),
  content: a.string(),
}).authorization(allow => [
  allow.owner(),              // Only the owner can access
  allow.groups(['admins']),   // Admins can access everything
]);
```

## Default Authentication: Entra ID

By default, `defineBackend()` configures Entra ID authentication with zero configuration:

```typescript
// packages/backend/index.ts
import { defineBackend } from '@atakora/backend';
import { feedbackApi } from './crud/feedback/resource';

const backend = defineBackend({
  feedbackApi,
});

export { backend };
```

**What happens automatically:**

1. ✅ **Function App** configured with EasyAuth (App Service Authentication)
2. ✅ **Entra ID** app registration created automatically
3. ✅ **Token validation** handled by Azure platform
4. ✅ **User context** injected into all functions
5. ✅ **Groups claim** included in JWT
6. ✅ **CORS** configured for your frontend domains

**Generated infrastructure:**

```typescript
// Auto-configured by defineBackend()
{
  functionApp: {
    authSettings: {
      enabled: true,
      defaultProvider: 'AzureActiveDirectory',
      unauthenticatedClientAction: 'RedirectToLoginPage',
      tokenStoreEnabled: true,
      azureActiveDirectory: {
        clientId: '${generated-app-registration-id}',
        tenantId: '${manifest.tenantId}',
        allowedAudiences: ['api://${app-id}'],
      },
    },
  },
}
```

## User Context

Every function automatically receives user context:

```typescript
// In any function
import { defineFunction } from '@atakora/backend';

export const myFunction = defineFunction({
  name: 'my-function',
  entry: './handler.ts',
  runtime: 20,
  trigger: { type: 'http', methods: ['POST'] },
});

// handler.ts
import { Handler } from '@atakora/backend';

export const handler: Handler = async (context) => {
  // User context is automatically available
  const { user } = context;

  console.log(user.id);         // '12345678-1234-1234-1234-123456789abc'
  console.log(user.email);      // 'developer@company.com'
  console.log(user.name);       // 'Jane Developer'
  console.log(user.groups);     // ['developers', 'admins']
  console.log(user.claims);     // Full JWT claims

  // Check authorization
  if (user.isInGroup('admins')) {
    // Admin-only logic
  }

  if (user.isAuthenticated) {
    // Authenticated user logic
  }

  return {
    statusCode: 200,
    body: { message: `Hello ${user.name}!` },
  };
};
```

## Authorization Patterns

### 1. Owner-Based Authorization

Resources are scoped to the user who created them:

```typescript
export const data = defineData({
  schema: a.schema({
    // Only the owner can read/update/delete their feedback
    Feedback: c.model({
      rating: a.number().required(),
      comment: a.string(),
    }).authorization(allow => [
      allow.owner(),
    ]),
  }),
});
```

**How it works:**

1. On `CREATE`: Automatically adds `owner: user.id` field
2. On `READ`: Filters to only show records where `owner === user.id`
3. On `UPDATE/DELETE`: Checks `owner === user.id` before allowing

**Auto-generated schema:**

```typescript
{
  rating: number,
  comment: string,
  owner: string,        // Auto-added
  createdAt: DateTime,  // Auto-added
  updatedAt: DateTime,  // Auto-added
}
```

### 2. Group-Based Authorization

Resources scoped by Azure AD group membership:

```typescript
export const data = defineData({
  schema: a.schema({
    // Only admins can manage organizations
    Organization: c.model({
      name: a.string().required(),
      domain: a.string(),
    }).authorization(allow => [
      allow.groups(['admins']),
    ]),
  }),
});
```

**How it works:**

1. Checks if `user.groups` includes `'admins'`
2. If yes, allow operation
3. If no, return 403 Forbidden

### 3. Multi-Level Authorization

Combine multiple rules (OR logic):

```typescript
export const data = defineData({
  schema: a.schema({
    Document: c.model({
      title: a.string().required(),
      content: a.string(),
    }).authorization(allow => [
      allow.owner(),                    // Owner can do anything
      allow.groups(['admins']),         // Admins can do anything
      allow.groups(['viewers']).read(), // Viewers can only read
    ]),
  }),
});
```

### 4. Guest Access (Unauthenticated)

Allow public access to certain resources:

```typescript
export const data = defineData({
  schema: a.schema({
    BlogPost: c.model({
      title: a.string().required(),
      content: a.string(),
      published: a.boolean(),
    }).authorization(allow => [
      allow.guest().read(),             // Anyone can read
      allow.groups(['authors']).write(), // Only authors can write
    ]),
  }),
});
```

### 5. Authenticated Users

Any authenticated user can access:

```typescript
export const data = defineData({
  schema: a.schema({
    PublicResource: c.model({
      name: a.string().required(),
    }).authorization(allow => [
      allow.authenticated(),  // Any logged-in user
    ]),
  }),
});
```

### 6. Custom Authorization

Complex logic with custom functions:

```typescript
export const data = defineData({
  schema: a.schema({
    Project: c.model({
      name: a.string().required(),
      teamId: a.string(),
      visibility: a.enum(['private', 'team', 'public']),
    }).authorization(allow => [
      allow.custom(({ user, record, operation }) => {
        // Owner always has access
        if (record.owner === user.id) return true;

        // Public projects can be read by anyone
        if (record.visibility === 'public' && operation === 'read') {
          return true;
        }

        // Team members can access team projects
        if (record.visibility === 'team') {
          return user.teams.includes(record.teamId);
        }

        return false;
      }),
    ]),
  }),
});
```

## Field-Level Authorization

Control access to individual fields:

```typescript
export const data = defineData({
  schema: a.schema({
    User: c.model({
      name: a.string().required(),
      email: a.string().required(),

      // Only admins and owner can see email
      emailVerified: a.boolean()
        .authorization(allow => [
          allow.owner(),
          allow.groups(['admins']),
        ]),

      // Only admins can see internal notes
      internalNotes: a.string()
        .authorization(allow => [
          allow.groups(['admins']),
        ]),
    }).authorization(allow => [
      allow.authenticated().read(),  // Anyone can read user profiles
      allow.owner().update(),        // But only owner can update
    ]),
  }),
});
```

## Operation-Level Authorization

Different rules for different operations:

```typescript
export const data = defineData({
  schema: a.schema({
    Article: c.model({
      title: a.string().required(),
      content: a.string(),
      published: a.boolean(),
    }).authorization(allow => [
      allow.guest().read(),                    // Anyone can read
      allow.groups(['authors']).create(),      // Authors can create
      allow.owner().update().delete(),         // Owner can update/delete
      allow.groups(['editors']).update(),      // Editors can update all
      allow.groups(['admins']).delete(),       // Admins can delete all
    ]),
  }),
});
```

## Custom Mutations with Authorization

Custom business logic with auth:

```typescript
export const data = defineData({
  schema: a.schema({
    Organization: c.model({
      name: a.string().required(),
      memberCount: a.number(),
    }).authorization(allow => [
      allow.owner(),
      allow.groups(['admins']),
    ]),
  }),

  mutations: {
    // Custom mutation with auth
    addUserToOrganization: a.mutation()
      .arguments({
        organizationId: a.id().required(),
        userId: a.id().required(),
      })
      .returns(a.ref('Organization'))
      .handler(a.handler.function(addUserFunction))
      .authorization(allow => [
        allow.groups(['admins']),  // Only admins can add users
      ]),

    // Public mutation (password reset)
    initiatePasswordReset: a.mutation()
      .arguments({
        email: a.string().required(),
      })
      .returns(a.boolean())
      .handler(a.handler.function(resetPasswordFunction))
      .authorization(allow => [
        allow.guest(),  // Unauthenticated users can reset password
      ]),
  },
});
```

## Custom Authentication Providers

### JWT Provider (Auth0, Firebase, Okta, etc.)

```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  authentication: {
    provider: 'jwt',
    jwt: {
      issuer: 'https://auth.example.com',
      audience: 'api://colorai',
      jwksUri: 'https://auth.example.com/.well-known/jwks.json',

      // Map JWT claims to user context
      claimsMapping: {
        userId: 'sub',
        email: 'email',
        name: 'name',
        groups: 'https://example.com/claims/groups',
      },
    },
  },
});
```

### Multiple Providers

Support both Entra ID and custom JWT:

```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  authentication: {
    providers: [
      {
        name: 'entra-id',
        type: 'azure-ad',
        tenantId: '${manifest.tenantId}',
        clientId: '${auto-generated}',
      },
      {
        name: 'auth0',
        type: 'jwt',
        issuer: 'https://example.auth0.com/',
        audience: 'api://colorai',
        jwksUri: 'https://example.auth0.com/.well-known/jwks.json',
      },
    ],

    // Define which provider to use for which endpoints
    routing: {
      '/api/internal/*': 'entra-id',    // Internal APIs use Entra ID
      '/api/public/*': 'auth0',          // Public APIs use Auth0
    },
  },
});
```

### API Key Authentication

For service-to-service calls:

```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  authentication: {
    providers: [
      { type: 'entra-id' },  // Default for users
      {
        type: 'api-key',
        header: 'X-API-Key',
        vault: 'api-keys',  // Key Vault secret name
      },
    ],
  },
});

// In schema
export const data = defineData({
  schema: a.schema({
    WebhookEvent: c.model({
      type: a.string(),
      payload: a.json(),
    }).authorization(allow => [
      allow.apiKey(),  // Allow API key auth
    ]),
  }),
});
```

## Managed Identity (Service-to-Service)

Functions calling other Azure services:

```typescript
export const processUpload = defineFunction({
  name: 'process-upload',
  entry: './handler.ts',
  runtime: 20,
  trigger: { type: 'blob', path: 'uploads/{name}' },

  // Automatically gets managed identity
  permissions: {
    cosmos: ['read', 'write'],
    storage: ['read', 'write'],
    keyVault: ['get', 'list'],
  },
});
```

**Generated infrastructure:**

1. Function App has system-assigned managed identity
2. RBAC roles assigned to managed identity
3. Functions use `DefaultAzureCredential` (no connection strings!)

## Frontend Integration

### Entra ID (MSAL.js)

```typescript
// frontend/lib/auth.ts
import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: 'YOUR_CLIENT_ID',  // From backend output
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    redirectUri: 'http://localhost:3000',
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

// Login
const loginRequest = {
  scopes: ['api://YOUR_APP_ID/user_impersonation'],
};

const result = await msalInstance.loginPopup(loginRequest);
const accessToken = result.accessToken;

// Call API
const response = await fetch('https://api.colorai.com/api/feedback', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});
```

### Custom JWT Provider

```typescript
// frontend/lib/auth.ts
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react';

function App() {
  return (
    <Auth0Provider
      domain="example.auth0.com"
      clientId="YOUR_CLIENT_ID"
      redirectUri={window.location.origin}
      audience="api://colorai"
    >
      <MyApp />
    </Auth0Provider>
  );
}

function MyComponent() {
  const { getAccessTokenSilently } = useAuth0();

  const callApi = async () => {
    const token = await getAccessTokenSilently();

    const response = await fetch('https://api.colorai.com/api/feedback', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  };
}
```

## Generated Client SDK (Type-Safe)

```typescript
// Auto-generated from schema
import { createClient } from '@atakora/client';

const client = createClient({
  endpoint: 'https://api.colorai.com',

  // Auth is handled automatically
  auth: {
    getToken: () => msalInstance.acquireTokenSilent(request),
  },
});

// Type-safe CRUD operations
const feedback = await client.feedback.create({
  rating: 5,
  comment: 'Great product!',
});
// ✅ TypeScript knows the shape of feedback

const allFeedback = await client.feedback.list();
// ✅ Filtered to only show user's own feedback (owner rule)

// Custom mutations
await client.mutations.addUserToOrganization({
  organizationId: 'org-123',
  userId: 'user-456',
});
// ✅ Type-safe arguments and return type
```

## Security Best Practices

### 1. Token Validation

All tokens are validated:
- ✅ Signature verified
- ✅ Issuer checked
- ✅ Audience validated
- ✅ Expiration enforced
- ✅ Not-before time checked

### 2. HTTPS Only

All endpoints enforce HTTPS:

```typescript
// Auto-configured
{
  functionApp: {
    httpsOnly: true,
    minimumTlsVersion: '1.2',
  },
}
```

### 3. CORS Configuration

Strict CORS by default:

```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  cors: {
    allowedOrigins: [
      'https://colorai.com',
      'https://app.colorai.com',
      process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
    ].filter(Boolean),
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowCredentials: true,
  },
});
```

### 4. Rate Limiting

Automatic rate limiting per user:

```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  rateLimit: {
    authenticated: {
      windowMs: 15 * 60 * 1000,  // 15 minutes
      max: 100,  // 100 requests per window
    },
    unauthenticated: {
      windowMs: 15 * 60 * 1000,
      max: 20,  // Stricter for guest access
    },
  },
});
```

### 5. Secrets in Key Vault

Never hardcode secrets:

```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  authentication: {
    provider: 'jwt',
    jwt: {
      issuer: 'https://auth.example.com',
      audience: 'api://colorai',

      // Client secret stored in Key Vault
      clientSecret: '${keyVault.secrets.auth-client-secret}',
    },
  },
});
```

## Authorization Flow

### CRUD API Request Flow

```
1. User makes request to /api/feedback
   ↓
2. Azure App Service validates JWT token
   ↓
3. User context extracted from token
   ↓
4. Request routed to CRUD handler
   ↓
5. Handler checks authorization rules from schema
   ↓
6. If authorized:
   - Apply data filters (e.g., owner === user.id)
   - Execute query against Cosmos
   - Return results
   ↓
7. If not authorized:
   - Return 403 Forbidden
```

### Custom Function Flow

```
1. User makes request to /api/my-function
   ↓
2. Azure App Service validates JWT token
   ↓
3. User context extracted and injected into function
   ↓
4. Function handler receives context.user
   ↓
5. Custom logic with manual auth checks
   ↓
6. Return response
```

## Implementation

### Auth Middleware (Generated)

```typescript
// packages/lib/src/auth/middleware.ts

export interface User {
  id: string;
  email: string;
  name: string;
  groups: string[];
  claims: Record<string, any>;
  isAuthenticated: boolean;
  isInGroup(group: string): boolean;
}

export class AuthMiddleware {
  constructor(private config: AuthConfig) {}

  /**
   * Extract user from Azure App Service headers
   */
  async getUser(request: HttpRequest): Promise<User> {
    // Azure App Service injects claims as headers
    const claims = this.parseClaimHeaders(request.headers);

    if (!claims) {
      return this.createGuestUser();
    }

    return {
      id: claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'],
      email: claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
      name: claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'],
      groups: this.parseGroups(claims),
      claims,
      isAuthenticated: true,
      isInGroup(group: string) {
        return this.groups.includes(group);
      },
    };
  }

  private parseClaimHeaders(headers: Record<string, string>): Record<string, any> | null {
    const claimHeader = headers['x-ms-client-principal'];
    if (!claimHeader) return null;

    const decoded = Buffer.from(claimHeader, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }

  private parseGroups(claims: Record<string, any>): string[] {
    const groupsClaim = claims['groups'] || claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'];
    if (!groupsClaim) return [];

    return Array.isArray(groupsClaim) ? groupsClaim : [groupsClaim];
  }

  private createGuestUser(): User {
    return {
      id: '',
      email: '',
      name: 'Guest',
      groups: [],
      claims: {},
      isAuthenticated: false,
      isInGroup() { return false; },
    };
  }
}
```

### Authorization Enforcer (Generated)

```typescript
// packages/lib/src/auth/enforcer.ts

export class AuthorizationEnforcer {
  /**
   * Check if user can perform operation on model
   */
  async authorize(
    user: User,
    model: ModelSchema,
    operation: 'create' | 'read' | 'update' | 'delete',
    record?: any,
  ): Promise<boolean> {
    const rules = model.authorizationRules;

    for (const rule of rules) {
      if (await this.evaluateRule(user, rule, operation, record)) {
        return true;  // OR logic - any rule passing is enough
      }
    }

    return false;
  }

  private async evaluateRule(
    user: User,
    rule: AuthorizationRule,
    operation: string,
    record?: any,
  ): Promise<boolean> {
    // Check if rule applies to this operation
    if (rule.operations && !rule.operations.includes(operation)) {
      return false;
    }

    switch (rule.type) {
      case 'owner':
        return record?.owner === user.id;

      case 'groups':
        return rule.groups.some(group => user.isInGroup(group));

      case 'guest':
        return true;  // Anyone (including unauthenticated)

      case 'authenticated':
        return user.isAuthenticated;

      case 'custom':
        return await rule.handler({ user, record, operation });

      case 'api-key':
        return user.provider === 'api-key';

      default:
        return false;
    }
  }

  /**
   * Apply data filters based on authorization rules
   */
  applyDataFilters(user: User, model: ModelSchema, query: CosmosQuery): CosmosQuery {
    const rules = model.authorizationRules;

    // If any rule allows full access, no filter needed
    if (rules.some(r => r.type === 'groups' && r.groups.some(g => user.isInGroup(g)))) {
      return query;  // Admin access
    }

    // If owner rule exists, filter by owner
    if (rules.some(r => r.type === 'owner')) {
      query.where('owner', '=', user.id);
    }

    return query;
  }
}
```

## Configuration Reference

```typescript
interface AuthenticationConfig {
  // Single provider (simple)
  provider?: 'entra-id' | 'jwt' | 'api-key';

  // Multiple providers (advanced)
  providers?: Array<{
    name: string;
    type: 'entra-id' | 'jwt' | 'api-key' | 'managed-identity';
    config: EntraIdConfig | JwtConfig | ApiKeyConfig;
  }>;

  // Entra ID config
  entraId?: {
    tenantId: string;
    clientId?: string;  // Auto-generated if not provided
    allowedGroups?: string[];
  };

  // JWT config
  jwt?: {
    issuer: string;
    audience: string;
    jwksUri: string;
    claimsMapping?: {
      userId?: string;
      email?: string;
      name?: string;
      groups?: string;
    };
  };

  // API key config
  apiKey?: {
    header: string;  // e.g., 'X-API-Key'
    vault: string;   // Key Vault secret name
  };

  // CORS
  cors?: {
    allowedOrigins: string[];
    allowedMethods?: string[];
    allowCredentials?: boolean;
  };

  // Rate limiting
  rateLimit?: {
    authenticated?: {
      windowMs: number;
      max: number;
    };
    unauthenticated?: {
      windowMs: number;
      max: number;
    };
  };
}
```

## Summary

**Authentication is:**
- ✅ **Zero-config** - Entra ID works out of the box
- ✅ **Declarative** - Rules in schema, not scattered in code
- ✅ **Type-safe** - User context is strongly typed
- ✅ **Flexible** - Support multiple providers
- ✅ **Secure** - Best practices enforced by default

**Authorization supports:**
- ✅ **Owner-based** - Resources scoped to creator
- ✅ **Group-based** - Role-based access control
- ✅ **Guest access** - Public resources
- ✅ **Field-level** - Hide sensitive fields
- ✅ **Operation-level** - Different rules per CRUD operation
- ✅ **Custom logic** - Complex business rules

**Next Steps:**
1. Implement AuthMiddleware and AuthorizationEnforcer
2. Add Entra ID app registration to synthesis
3. Generate typed client SDK with auth
4. Add auth examples to documentation
5. Test with real Entra ID tenant
