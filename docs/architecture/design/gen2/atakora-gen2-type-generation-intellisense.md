# Atakora Gen 2: Type Generation & IntelliSense

**Status**: Draft
**Created**: 2025-10-14
**Related**: [Gen 2 Core Design](./Atakora-Gen2-Design.md), [Data Layer](./Atakora-Gen2-Data-Layer.md), [Secrets Management](./Atakora-Gen2-Secrets-Config-Management.md)

---

## Overview

This document defines how Atakora generates TypeScript types from backend definitions and provides IntelliSense throughout the development experience. Unlike AWS Amplify which supports only single-backend frontends, **Atakora is designed for enterprise scenarios where a frontend communicates with multiple independent backends**.

### Core Principles

1. **End-to-End Type Safety** - Types flow from backend to frontend automatically
2. **Multi-Backend Support** - One frontend can talk to many backends with full type safety
3. **Zero Manual Codegen** - Types generated during synthesis, not manual CLI commands
4. **IntelliSense Everywhere** - Autocomplete for schemas, secrets, config, backend resources
5. **Framework Agnostic** - Works with React, Vue, Angular, vanilla TypeScript
6. **Committed to Repo** - Generated types checked into Git for immediate availability

---

## Amplify Gen 2 Analysis

### What Amplify Does Well

**1. Single Config File** (`amplify_outputs.json`)

```json
{
  "version": "1",
  "auth": {
    "user_pool_id": "us-east-1_abc123",
    "user_pool_client_id": "xyz789",
    "identity_pool_id": "us-east-1:guid"
  },
  "data": {
    "url": "https://xyz.appsync-api.us-east-1.amazonaws.com/graphql",
    "default_authorization_type": "AMAZON_COGNITO_USER_POOLS",
    "model_introspection": {
      /* schema metadata */
    }
  },
  "storage": {
    "bucket_name": "my-bucket",
    "aws_region": "us-east-1"
  }
}
```

**2. Type Export from Backend**

```typescript
// amplify/data/resource.ts (backend)
const schema = a.schema({
  Todo: a.model({
    content: a.string(),
    isDone: a.boolean(),
  }),
});

export type Schema = ClientSchema<typeof schema>;
```

**3. Frontend Usage**

```typescript
// src/App.tsx (frontend)
import type { Schema } from '../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();
const todos = await client.models.Todo.list();
```

### The Enterprise Problem

**Amplify only supports ONE backend per frontend.**

**Real-world enterprise scenario:**

```
Frontend (Portal)
├── User Service Backend       (authentication, profiles)
├── Order Service Backend      (orders, cart, checkout)
├── Inventory Service Backend  (products, stock)
├── Analytics Service Backend  (tracking, reports)
└── Notification Service       (emails, push, SMS)
```

**Problem with Amplify:**

- Can only configure ONE `amplify_outputs.json`
- Client library singleton design
- No way to talk to multiple backends with type safety
- Forces monolithic backend architecture

**Atakora Solution:**

- Each backend generates its own outputs file
- Frontend can import and use multiple backend clients
- Shared Entra ID authentication across all backends
- Full type safety for each backend

---

## Atakora's Multi-Backend Architecture

### Generated Files Per Backend

When you synthesize a backend, Atakora generates:

```
packages/backend/
├── src/
│   └── index.ts                    # Backend definition
├── .atakora/
│   ├── outputs.json                # Runtime config (like amplify_outputs.json)
│   ├── types.d.ts                  # Generated TypeScript types
│   └── client.ts                   # Generated type-safe client
└── package.json
```

### 1. Backend Outputs File (`outputs.json`)

**Purpose**: Runtime configuration for connecting frontend to backend.

**Location**: `packages/backend/.atakora/outputs.json`

**Format**:

```json
{
  "version": "1",
  "backend": {
    "name": "user-service",
    "instanceId": "backend-userservice-a8b2c4",
    "environment": "nonprod",
    "region": "eastus"
  },
  "auth": {
    "type": "entra-id",
    "tenantId": "12345678-1234-1234-1234-123456789012",
    "clientId": "87654321-4321-4321-4321-210987654321",
    "scopes": ["api://user-service/.default"]
  },
  "endpoints": {
    "api": "https://func-userservice-nonprod.azurewebsites.net/api",
    "graphql": "https://func-userservice-nonprod.azurewebsites.net/api/graphql"
  },
  "data": {
    "models": ["User", "Profile", "Session"],
    "introspection": {
      "User": {
        "fields": {
          "id": { "type": "string", "required": true },
          "email": { "type": "string", "required": true },
          "displayName": { "type": "string", "required": false }
        },
        "operations": ["create", "read", "update", "delete", "list"]
      }
    }
  },
  "storage": {
    "endpoint": "https://stuserservicenonprod.blob.core.windows.net"
  },
  "functions": {
    "sendWelcomeEmail": {
      "url": "https://func-userservice-nonprod.azurewebsites.net/api/send-welcome-email",
      "methods": ["POST"]
    }
  }
}
```

**Comparison to Amplify:**

- Similar to `amplify_outputs.json`
- Includes backend name/instanceId for multi-backend support
- Entra ID configuration instead of Cognito
- Model introspection for type generation
- Function endpoint metadata

---

### 2. Generated TypeScript Types (`types.d.ts`)

**Purpose**: Provide compile-time type safety for backend resources.

**Location**: `packages/backend/.atakora/types.d.ts`

**Generated Content**:

```typescript
// Auto-generated by Atakora - DO NOT EDIT
// Generated from: packages/backend/src/index.ts
// Backend: user-service
// Environment: nonprod
// Generated: 2025-10-14T10:23:45Z

// ============================================================================
// Data Models (from defineData)
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Profile {
  id: string;
  userId: string;
  bio?: string;
  avatarUrl?: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
}

// ============================================================================
// CRUD Operations
// ============================================================================

export interface UserOperations {
  create: (input: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => Promise<User>;
  get: (id: string) => Promise<User | null>;
  update: (
    id: string,
    input: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<User>;
  delete: (id: string) => Promise<void>;
  list: (options?: ListOptions) => Promise<User[]>;
}

export interface ProfileOperations {
  create: (input: Omit<Profile, 'id'>) => Promise<Profile>;
  get: (id: string) => Promise<Profile | null>;
  update: (id: string, input: Partial<Omit<Profile, 'id'>>) => Promise<Profile>;
  delete: (id: string) => Promise<void>;
  list: (options?: ListOptions) => Promise<Profile[]>;
}

// ============================================================================
// Functions
// ============================================================================

export interface SendWelcomeEmailInput {
  userId: string;
  email: string;
}

export interface SendWelcomeEmailOutput {
  success: boolean;
  messageId: string;
}

export interface Functions {
  sendWelcomeEmail: (input: SendWelcomeEmailInput) => Promise<SendWelcomeEmailOutput>;
}

// ============================================================================
// Secrets (type-safe access)
// ============================================================================

export interface Secrets {
  SENDGRID_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  SLACK_WEBHOOK_URL?: string;
}

// ============================================================================
// Config (type-safe access)
// ============================================================================

export interface Config {
  maxUploadSizeMb: number;
  allowedOrigins: string[];
  defaultPageSize: number;
}

// ============================================================================
// Backend Reference (for backend code)
// ============================================================================

export interface BackendResources {
  cosmos: {
    endpoint: string;
    databaseName: string;
    containers: {
      users: string;
      profiles: string;
      sessions: string;
    };
  };
  storage: {
    endpoint: string;
    accountName: string;
    containers: {
      avatars: string;
      uploads: string;
    };
  };
  functions: {
    appName: string;
    url: string;
  };
  keyVault: {
    name: string;
    endpoint: string;
  };
}

// ============================================================================
// Client Schema (for frontend)
// ============================================================================

export interface Schema {
  models: {
    User: UserOperations;
    Profile: ProfileOperations;
    Session: SessionOperations;
  };
  functions: Functions;
}
```

---

### 3. Generated Client (`client.ts`)

**Purpose**: Provide a type-safe client for frontend to call backend APIs.

**Location**: `packages/backend/.atakora/client.ts`

**Generated Content**:

```typescript
// Auto-generated by Atakora - DO NOT EDIT
import type { Schema, User, Profile, SendWelcomeEmailInput, SendWelcomeEmailOutput } from './types';

export interface ClientConfig {
  authToken?: string;
  baseUrl?: string;
  onError?: (error: Error) => void;
}

export class UserServiceClient {
  private config: ClientConfig;
  private baseUrl: string;

  constructor(config: ClientConfig = {}) {
    this.config = config;
    // Load from outputs.json by default
    this.baseUrl = config.baseUrl ?? 'https://func-userservice-nonprod.azurewebsites.net/api';
  }

  // Set auth token (from Entra ID login)
  setAuthToken(token: string) {
    this.config.authToken = token;
  }

  // Data models
  get models() {
    return {
      User: {
        create: async (input: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
          return this.request('POST', '/users', input);
        },
        get: async (id: string): Promise<User | null> => {
          return this.request('GET', `/users/${id}`);
        },
        update: async (
          id: string,
          input: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
        ): Promise<User> => {
          return this.request('PATCH', `/users/${id}`, input);
        },
        delete: async (id: string): Promise<void> => {
          return this.request('DELETE', `/users/${id}`);
        },
        list: async (options?: any): Promise<User[]> => {
          return this.request('GET', '/users', null, options);
        },
      },
      Profile: {
        // Similar operations...
      },
    };
  }

  // Functions
  get functions() {
    return {
      sendWelcomeEmail: async (input: SendWelcomeEmailInput): Promise<SendWelcomeEmailOutput> => {
        return this.request('POST', '/send-welcome-email', input);
      },
    };
  }

  // Internal request helper
  private async request(method: string, path: string, body?: any, query?: any): Promise<any> {
    const url = new URL(path, this.baseUrl);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = new Error(`Request failed: ${response.status} ${response.statusText}`);
      if (this.config.onError) {
        this.config.onError(error);
      }
      throw error;
    }

    return response.json();
  }
}

// Export default client instance
export const client = new UserServiceClient();
```

---

## Multi-Backend Frontend Usage

### Scenario: Frontend talks to 3 backends

**Backend Structure:**

```
packages/
├── user-service/         # Backend 1
│   └── .atakora/
│       ├── outputs.json
│       ├── types.d.ts
│       └── client.ts
├── order-service/        # Backend 2
│   └── .atakora/
│       ├── outputs.json
│       ├── types.d.ts
│       └── client.ts
├── inventory-service/    # Backend 3
│   └── .atakora/
│       ├── outputs.json
│       ├── types.d.ts
│       └── client.ts
└── frontend/             # Frontend
    └── src/
        └── App.tsx
```

### Frontend Usage (React Example)

**1. Install Backend Clients**

```json
// packages/frontend/package.json
{
  "dependencies": {
    "@my-org/user-service-client": "workspace:*",
    "@my-org/order-service-client": "workspace:*",
    "@my-org/inventory-service-client": "workspace:*"
  }
}
```

**2. Configure Clients with Shared Auth**

```typescript
// packages/frontend/src/api/index.ts
import { UserServiceClient } from '@my-org/user-service-client';
import { OrderServiceClient } from '@my-org/order-service-client';
import { InventoryServiceClient } from '@my-org/inventory-service-client';
import { PublicClientApplication } from '@azure/msal-browser';

// Single Entra ID configuration for all backends
const msalConfig = {
  auth: {
    clientId: 'your-frontend-app-id',
    authority: 'https://login.microsoftonline.com/your-tenant-id',
  },
};

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize all backend clients
export const userService = new UserServiceClient();
export const orderService = new OrderServiceClient();
export const inventoryService = new InventoryServiceClient();

// Login and set token for all backends
export async function login() {
  const loginResponse = await msalInstance.loginPopup({
    scopes: [
      'api://user-service/.default',
      'api://order-service/.default',
      'api://inventory-service/.default',
    ],
  });

  const token = loginResponse.accessToken;

  // Set token for all clients
  userService.setAuthToken(token);
  orderService.setAuthToken(token);
  inventoryService.setAuthToken(token);
}
```

**3. Use Multiple Backends with Full Type Safety**

```typescript
// packages/frontend/src/components/Dashboard.tsx
import { userService, orderService, inventoryService } from '../api';
import type { User } from '@my-org/user-service-client';
import type { Order } from '@my-org/order-service-client';
import type { Product } from '@my-org/inventory-service-client';

export function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function loadData() {
      // Call User Service
      const currentUser = await userService.models.User.get('current');
      setUser(currentUser);

      // Call Order Service
      const userOrders = await orderService.models.Order.list({
        filter: { userId: currentUser.id },
      });
      setOrders(userOrders);

      // Call Inventory Service
      const availableProducts = await inventoryService.models.Product.list({
        filter: { inStock: true },
      });
      setProducts(availableProducts);
    }

    loadData();
  }, []);

  return (
    <div>
      <h1>Welcome, {user?.displayName}</h1>
      <h2>Your Orders ({orders.length})</h2>
      <h2>Available Products ({products.length})</h2>
    </div>
  );
}
```

**Key Benefits:**

- ✅ **Full type safety** for all backends
- ✅ **IntelliSense** for every API call
- ✅ **Single authentication** (Entra ID token works for all)
- ✅ **Independent backends** (each can deploy separately)
- ✅ **Monorepo-friendly** (workspace protocol)
- ✅ **No manual codegen** (types auto-generated during synth)

---

## Type Generation Workflow

### When Types Are Generated

**1. During Synthesis** (Automatic)

```bash
atakora synth

# Outputs:
# ✓ Generated ARM templates
# ✓ Generated types.d.ts
# ✓ Generated client.ts
# ✓ Generated outputs.json
```

**2. Explicit Generation** (On-Demand)

```bash
atakora generate types

# Only regenerates types, no synthesis
```

**3. Watch Mode** (During Development)

```bash
atakora dev --watch

# Watches for changes to defineBackend(), defineData(), etc.
# Automatically regenerates types on change
```

### What Triggers Type Regeneration

Changes to:

- `defineBackend()` configuration
- `defineData()` schema
- `defineCrudApi()` definitions
- `defineFunction()` signatures
- `secrets` declaration
- `config` declaration

### Generated File Locations

```
packages/backend/
├── .atakora/
│   ├── outputs.json           # ✓ Committed to Git
│   ├── types.d.ts             # ✓ Committed to Git
│   └── client.ts              # ✓ Committed to Git
└── package.json
```

**Why Commit Generated Files?**

- ✅ Works immediately after `git clone` (no build step required)
- ✅ CI/CD can validate types
- ✅ Frontend devs don't need to build backend
- ✅ Type safety in PRs
- ⚠️ May cause merge conflicts (rare, auto-resolvable)

---

## IntelliSense Features

### 1. Schema Field Autocomplete

```typescript
// Backend: defineData
export const data = defineData({
  schema: a.schema({
    User: c.model({
      email: a.email().required(),
      displayName: a.string(),
      age: a.number(),
    }),
  }),
});

// Frontend: Full autocomplete
const user = await client.models.User.create({
  email: '|'  // ← IntelliSense shows: email (required), displayName, age
});

user.  // ← IntelliSense shows: id, email, displayName, age, createdAt, updatedAt
```

### 2. Function Signature Autocomplete

```typescript
// Backend: defineFunction
export const sendEmail = defineFunction({
  name: 'send-email',
  handler: async (input: { to: string; subject: string; body: string }) => {
    // ...
  },
});

// Frontend: Full type safety
await client.functions.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  body: '|', // ← IntelliSense knows this is required
});
```

### 3. Backend Resource References

```typescript
// Backend code: IntelliSense for backend resources
import { backend } from './';

const endpoint = backend.cosmos.  // ← Shows: endpoint, databaseName, containers
const storageUrl = backend.storage.  // ← Shows: endpoint, accountName, containers
const functionUrl = backend.functions.  // ← Shows: appName, url
```

### 4. Secret Autocomplete

```typescript
// Backend code
import { getSecret } from '@atakora/component/runtime';

const key = await getSecret('|'); // ← IntelliSense shows: SENDGRID_API_KEY, STRIPE_SECRET_KEY, SLACK_WEBHOOK_URL
```

### 5. Config Autocomplete

```typescript
// Backend code
import { getConfig } from '@atakora/component/runtime';

const maxSize = getConfig('|'); // ← IntelliSense shows: maxUploadSizeMb, allowedOrigins, defaultPageSize
```

---

## Advanced: React Hooks Generation

### Optional React Hooks (Opt-In)

If user wants React-specific hooks, we can generate them:

```bash
atakora generate hooks --framework react

# Generates: packages/backend/.atakora/hooks.ts
```

**Generated Hooks:**

```typescript
// Auto-generated React hooks
import { useQuery, useMutation } from '@tanstack/react-query';
import { client } from './client';
import type { User } from './types';

// List users
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => client.models.User.list(),
  });
}

// Get single user
export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => client.models.User.get(id),
    enabled: !!id,
  });
}

// Create user
export function useCreateUser() {
  return useMutation({
    mutationFn: (input: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) =>
      client.models.User.create(input),
  });
}

// Update user
export function useUpdateUser() {
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<User>) =>
      client.models.User.update(id, input),
  });
}

// Delete user
export function useDeleteUser() {
  return useMutation({
    mutationFn: (id: string) => client.models.User.delete(id),
  });
}
```

**Frontend Usage:**

```typescript
import { useUsers, useCreateUser } from '@my-org/user-service-client/hooks';

export function UserList() {
  const { data: users, isLoading } = useUsers();
  const createUser = useCreateUser();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {users?.map(user => <div key={user.id}>{user.displayName}</div>)}
      <button onClick={() => createUser.mutate({ email: 'new@example.com' })}>
        Add User
      </button>
    </div>
  );
}
```

---

## Type Generation Implementation

### How It Works Under the Hood

**1. Schema Introspection**

During synthesis, Atakora walks the `defineData()` schema and extracts:

- Model names
- Field names and types
- Required/optional fields
- Relationships
- Authorization rules (used for client validation)

**2. TypeScript AST Generation**

Using TypeScript Compiler API:

```typescript
// packages/lib/src/codegen/type-generator.ts
import ts from 'typescript';

export function generateTypes(schema: Schema): string {
  const sourceFile = ts.createSourceFile(
    'types.d.ts',
    '',
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );

  // Generate interface for each model
  const interfaces = schema.models.map((model) => {
    const properties = model.fields.map((field) =>
      ts.factory.createPropertySignature(
        undefined,
        ts.factory.createIdentifier(field.name),
        field.optional ? ts.factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
        createTypeNode(field.type)
      )
    );

    return ts.factory.createInterfaceDeclaration(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createIdentifier(model.name),
      undefined,
      undefined,
      properties
    );
  });

  // Print to string
  const printer = ts.createPrinter();
  return interfaces
    .map((node) => printer.printNode(ts.EmitHint.Unspecified, node, sourceFile))
    .join('\n\n');
}
```

**3. Client Generation**

Generate client code using template strings with type information:

```typescript
// packages/lib/src/codegen/client-generator.ts
export function generateClient(schema: Schema, backendName: string): string {
  return `
import type { Schema, ${schema.models.map((m) => m.name).join(', ')} } from './types';

export class ${capitalize(backendName)}Client {
  // ... generated client code
}
  `.trim();
}
```

**4. Outputs File Generation**

Generate `outputs.json` from deployed resources:

```typescript
// packages/lib/src/synthesis/outputs.ts
export function generateOutputs(backend: Backend, deployment: Deployment): OutputsFile {
  return {
    version: '1',
    backend: {
      name: backend.name,
      instanceId: backend.instanceId,
      environment: backend.environment,
      region: backend.region,
    },
    auth: {
      type: 'entra-id',
      tenantId: deployment.auth.tenantId,
      clientId: deployment.auth.clientId,
      scopes: [`api://${backend.name}/.default`],
    },
    endpoints: {
      api: deployment.functions.url,
      graphql: deployment.graphql?.url,
    },
    data: {
      models: backend.data.models.map((m) => m.name),
      introspection: generateIntrospection(backend.data),
    },
    // ...
  };
}
```

---

## Comparison: Amplify vs Atakora

| Feature                   | AWS Amplify Gen 2             | Atakora Gen 2                     |
| ------------------------- | ----------------------------- | --------------------------------- |
| **Multi-Backend Support** | ❌ Single backend only        | ✅ Multiple backends per frontend |
| **Type Generation**       | ✅ Automatic                  | ✅ Automatic                      |
| **Outputs File**          | ✅ `amplify_outputs.json`     | ✅ `outputs.json` per backend     |
| **Client Library**        | ✅ `generateClient<Schema>()` | ✅ Per-backend typed clients      |
| **Auth Integration**      | Cognito only                  | Entra ID + custom JWT             |
| **Framework Support**     | React, Vue, Angular           | Any TypeScript framework          |
| **React Hooks**           | ✅ Built-in                   | ✅ Opt-in generation              |
| **IntelliSense**          | ✅ Full                       | ✅ Full                           |
| **Committed Types**       | ❌ Runtime only               | ✅ Committed to repo              |
| **Watch Mode**            | ✅ Via sandbox                | ✅ Via `atakora dev --watch`      |
| **Monorepo Support**      | ⚠️ Limited                    | ✅ First-class                    |

---

## Developer Experience Examples

### Example 1: Adding a New Field

**Backend Change:**

```typescript
// packages/backend/src/index.ts
export const data = defineData({
  schema: a.schema({
    User: c.model({
      email: a.email().required(),
      displayName: a.string(),
      phoneNumber: a.string(), // ← New field
    }),
  }),
});
```

**What Happens:**

1. Save file
2. `atakora dev --watch` detects change
3. Types regenerated automatically
4. Frontend immediately gets IntelliSense for `phoneNumber`

**Frontend:**

```typescript
// IntelliSense now shows phoneNumber
const user = await client.models.User.create({
  email: 'test@example.com',
  displayName: 'Test User',
  phoneNumber: '+1234567890', // ← New field available!
});
```

### Example 2: Adding a New Function

**Backend:**

```typescript
export const generateReport = defineFunction({
  name: 'generate-report',
  handler: async (input: { startDate: Date; endDate: Date }) => {
    // ...
    return { reportUrl: 'https://...' };
  },
});
```

**What Happens:**

1. Synthesis regenerates types
2. `client.functions.generateReport` now available
3. Full type safety for input and output

**Frontend:**

```typescript
const result = await client.functions.generateReport({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-12-31'),
});

console.log(result.reportUrl); // ← Type-safe!
```

---

## CI/CD Integration

### Type Checking in CI

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: npm install

      - name: Generate types (if not committed)
        run: npm run generate:types

      - name: Type check frontend
        run: npm run typecheck --workspace=frontend

      - name: Type check backend
        run: npm run typecheck --workspace=backend
```

**If types are committed** (recommended):

- Skip `generate:types` step
- Types always in sync with code
- Faster CI builds

**If types are not committed**:

- Must generate during CI
- Slower builds
- Risk of type/code mismatch

---

## Migration from Gen 1

### Gen 1 (Manual Types)

```typescript
// Gen 1 - Manual type definitions
interface User {
  id: string;
  email: string;
}

// Gen 1 - Manual fetch calls
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com' }),
});
const user: User = await response.json();
```

### Gen 2 (Auto-Generated Types)

```typescript
// Gen 2 - Types auto-generated from backend
import { client } from '@my-org/backend-client';
import type { User } from '@my-org/backend-client';

// Gen 2 - Type-safe client
const user = await client.models.User.create({
  email: 'test@example.com',
});
```

**Migration Steps:**

1. Backend generates types: `atakora synth`
2. Install client package: `npm install @my-org/backend-client`
3. Replace manual fetch with typed client
4. Remove manual type definitions
5. Enjoy IntelliSense and type safety!

---

## Future Enhancements

### V2 Features (Post-Launch)

1. **GraphQL Schema Generation**
   - Generate GraphQL schema from `defineData()`
   - Support for subscriptions
   - Apollo Client integration

2. **OpenAPI Spec Generation**
   - Generate OpenAPI 3.0 spec from APIs
   - Swagger UI integration
   - Postman collection generation

3. **Zod Schema Export**
   - Export Zod schemas for runtime validation
   - Use in form libraries (react-hook-form)
   - Server-side validation

4. **Mock Data Generation**
   - Generate mock data for testing
   - Faker.js integration
   - Type-safe mocks

5. **Visual Studio Code Extension**
   - Inline type information
   - Jump to backend definition
   - Automatic import suggestions
   - Real-time validation

6. **Client SDK for Other Languages**
   - Python client generation
   - C# client generation
   - Java client generation
   - Go client generation

---

## Summary

### Key Takeaways

1. **Multi-Backend First** - Unlike Amplify, Atakora supports multiple backends per frontend
2. **Zero Manual Codegen** - Types generated automatically during synthesis
3. **Shared Authentication** - Single Entra ID token works across all backends
4. **Full Type Safety** - End-to-end types from backend to frontend
5. **IntelliSense Everywhere** - Autocomplete for schemas, secrets, config, resources
6. **Committed Types** - Generated files checked into Git for immediate availability
7. **Framework Agnostic** - Works with any TypeScript framework
8. **Enterprise Ready** - Monorepo-friendly, multi-backend support

### Developer Experience

**Before (Gen 1):**

- Manual type definitions
- Manual fetch calls
- No IntelliSense
- Types out of sync with backend
- Single backend only

**After (Gen 2):**

- Auto-generated types
- Type-safe clients
- Full IntelliSense
- Types always in sync
- Multiple backends supported

**Time Savings**: ~2 hours per API, ~8 hours per backend setup

---

## Related Documents

- [Gen 2 Core Design](./Atakora-Gen2-Design.md)
- [Data Layer](./Atakora-Gen2-Data-Layer.md)
- [Secrets Management](./Atakora-Gen2-Secrets-Config-Management.md)
- [Authentication](./Atakora-Gen2-Authentication.md)
- [Deployment & State Management](./atakora-gen2-deployment-state.md) (TODO)
- [Local Development](./atakora-gen2-local-development.md) (TODO)

---

**Last Updated**: 2025-10-14
**Status**: Draft - Ready for Review
