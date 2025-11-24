# Phase 2 Implementation Plan: Authentication System

**Date**: 2025-01-20
**Author**: Becky (Staff Architect)
**Phase**: 2 of 10
**Duration**: Week 3 (5 business days)
**Status**: Ready to Begin

---

## Executive Summary

Phase 2 implements the authentication system for @atakora/component, building on the solid foundation established in Phase 1. This phase adds `defineAuth()` function and authentication provider builders (Entra ID, API Keys, Custom) with full integration into the schema authorization system.

**Timeline**: 1 week (vs 1 week planned in IMPLEMENTATION_PLAN.md) - On schedule

**Key Deliverables**:

- `defineAuth()` function for authentication configuration
- Azure Entra ID provider (auth.entra())
- API Keys provider (auth.apiKeys())
- Custom auth provider pattern
- Token validation infrastructure
- Role mapping system
- Integration with schema authorization rules
- Full TypeScript type inference
- > 90% test coverage

**Complexity Assessment**: Medium

- Simpler than Phase 1 (fewer builders)
- Well-defined requirements from backend-simple
- Clear integration points with Phase 1 schema system
- Established patterns to follow

---

## 1. Authentication Architecture

### 1.1 Overall Design

**Core Concept**: Multi-provider authentication system where each provider handles authentication and token validation independently, then integrates with schema-level authorization rules.

**Architecture Diagram**:

```
┌─────────────────────────────────────────────────────────┐
│ defineAuth({ ... })                                     │
│   ├─ Primary: auth.entra()                             │
│   ├─ ApiKeys: auth.apiKeys()                           │
│   └─ Custom: auth.custom()                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Auth Object                                             │
│   ├─ Providers (Entra, API Keys, Custom)               │
│   ├─ Token Validation Logic                            │
│   ├─ Role Mapping Rules                                │
│   └─ Session Configuration                             │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Schema Authorization Integration                        │
│   └─ allow.owner(), allow.groups(), allow.auth()       │
└─────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│ Runtime (Function App Middleware)                       │
│   ├─ Extract token from request                        │
│   ├─ Validate token (provider-specific)                │
│   ├─ Map roles (custom logic)                          │
│   ├─ Create user context                               │
│   └─ Enforce authorization rules                       │
└─────────────────────────────────────────────────────────┘
```

**Key Design Decisions**:

1. **Multiple Provider Support**: App can have multiple auth providers (Primary Entra, fallback API keys)
2. **Provider Abstraction**: Each provider implements common interface for validation
3. **Declarative Configuration**: Auth configuration is declarative (no runtime code in definition)
4. **Schema Integration**: Authorization rules reference auth system via user context
5. **Middleware Generation**: Auth configuration drives Function App middleware generation (Phase 7)

### 1.2 Provider Pattern

**Common Provider Interface**:

```typescript
// src/auth/types.ts

export interface AuthProvider {
  type: string;
  validate: TokenValidator;
  mapRoles: RoleMapper;
  config: Record<string, any>;
}

export type TokenValidator = (token: string) => Promise<TokenValidationResult>;

export type RoleMapper = (claims: Record<string, any>) => string[];

export interface TokenValidationResult {
  valid: boolean;
  claims?: Record<string, any>;
  error?: string;
}
```

**Provider Lifecycle**:

1. **Definition**: User defines provider using builder (`auth.entra()`)
2. **Configuration**: Builder collects configuration (tenant ID, client ID, etc.)
3. **Build**: Builder produces provider configuration object
4. **Synthesis**: Configuration used to generate Function App middleware (Phase 7)
5. **Runtime**: Middleware validates tokens and creates user context

### 1.3 Integration with Schema Authorization

**Connection Point**:

```typescript
// Schema defines WHAT is protected
User: c.model({...})
  .authorization(allow => [
    allow.owner('userId'),          // Requires authenticated user
    allow.groups(['admin']).all(),  // Requires user in 'admin' group
  ])

// Auth defines WHO can authenticate
export const authentication = defineAuth({
  Primary: auth.entra()
    .tenant(TENANT_ID)
    .mapRoles(claims => {
      // Map Entra groups to app roles
      const groups = claims.groups || [];
      return groups.map(g => g.name);
    })
});

// Backend connects them
export const backend = defineBackend({
  schema,
  authentication,  // ← Integration point
  ...
});
```

**Runtime Flow**:

1. Request arrives at Function App
2. Middleware extracts bearer token
3. Auth provider validates token → claims
4. Role mapper transforms claims → user roles
5. User context created (id, email, roles)
6. Authorization rules evaluate against user context
7. Request allowed/denied based on rules

---

## 2. API Design

### 2.1 Target API (from backend-simple)

```typescript
import { defineAuth, auth } from '@atakora/component';

export const authentication = defineAuth({
  // Primary provider (Entra ID)
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .audience(process.env.AZURE_AUDIENCE!)
    .validateTokens(async (token, claims) => {
      // Custom token validation logic
      if (claims.iss !== expectedIssuer) {
        return { valid: false, error: 'Invalid issuer' };
      }
      return { valid: true };
    })
    .mapRoles((claims) => {
      // Map Entra groups to app roles
      const groups = claims.groups || [];
      return groups
        .map((g) => g.name)
        .filter((name) => ['admin', 'editor', 'viewer'].includes(name));
    })
    .session((session) => session.duration(hours(8)).sliding(true))
    .mfa((mfa) => mfa.require(['admin']).challenge('totp')),

  // Fallback provider (API Keys)
  ApiKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90))
    .keys([
      { id: 'service-1', secret: process.env.API_KEY_1!, roles: ['service'] },
      { id: 'service-2', secret: process.env.API_KEY_2!, roles: ['service'] },
    ])
    .prefix('atk_'),
});
```

### 2.2 defineAuth() Function

**Signature**:

```typescript
// src/auth/define-auth.ts

export function defineAuth<T extends AuthDefinition>(definition: T): AuthObject<T>;
```

**Input Type**:

```typescript
export type AuthDefinition = Record<string, AuthProviderBuilder>;

// Example:
{
  Primary: EntraIdBuilder,
  ApiKeys: ApiKeysBuilder,
  Custom: CustomAuthBuilder,
}
```

**Output Type**:

```typescript
export interface AuthObject<T extends AuthDefinition> {
  // Original definition
  definition: T;

  // Processed providers
  providers: {
    [K in keyof T]: ProcessedAuthProvider;
  };

  // Primary provider (first one defined or explicitly marked)
  primaryProvider: keyof T;

  // Metadata
  _metadata: {
    version: string;
    createdAt: string;
    providerNames: (keyof T)[];
  };

  // Internal
  _raw: T;
}
```

**Implementation**:

```typescript
export function defineAuth<T extends AuthDefinition>(definition: T): AuthObject<T> {
  // Validate auth definition
  validateAuthDefinition(definition);

  // Process providers
  const providers = processProviders(definition);

  // Determine primary provider
  const primaryProvider = determinePrimaryProvider(definition);

  // Create auth object
  return {
    definition,
    providers,
    primaryProvider,
    _metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      providerNames: Object.keys(definition),
    },
    _raw: definition,
  };
}
```

### 2.3 Entra ID Provider (auth.entra())

**Builder API**:

```typescript
// src/auth/providers/entra.ts

export class EntraIdBuilder {
  private config: EntraIdConfig = {
    type: 'entra-id',
    tenant: '',
    clientId: '',
  };

  /**
   * Set Azure tenant ID
   */
  tenant(tenantId: string): this {
    this.config.tenant = tenantId;
    return this;
  }

  /**
   * Set Azure client ID (application ID)
   */
  clientId(clientId: string): this {
    this.config.clientId = clientId;
    return this;
  }

  /**
   * Set expected audience for token validation
   */
  audience(audience: string): this {
    this.config.audience = audience;
    return this;
  }

  /**
   * Custom token validation logic
   */
  validateTokens(validator: TokenValidator): this {
    this.config.tokenValidator = validator;
    return this;
  }

  /**
   * Map token claims to application roles
   */
  mapRoles(mapper: RoleMapper): this {
    this.config.roleMapper = mapper;
    return this;
  }

  /**
   * Configure session management
   */
  session(configureFn: (builder: SessionBuilder) => SessionBuilder): this {
    const sessionBuilder = new SessionBuilder();
    this.config.session = configureFn(sessionBuilder)._build();
    return this;
  }

  /**
   * Configure MFA requirements
   */
  mfa(configureFn: (builder: MfaBuilder) => MfaBuilder): this {
    const mfaBuilder = new MfaBuilder();
    this.config.mfa = configureFn(mfaBuilder)._build();
    return this;
  }

  /**
   * @internal
   */
  _build(): EntraIdConfig {
    return { ...this.config };
  }
}

// Factory function
export const entra = () => new EntraIdBuilder();
```

**Configuration Type**:

```typescript
export interface EntraIdConfig {
  type: 'entra-id';
  tenant: string;
  clientId: string;
  audience?: string;
  issuer?: string;
  tokenValidator?: TokenValidator;
  roleMapper?: RoleMapper;
  session?: SessionConfig;
  mfa?: MfaConfig;
}
```

### 2.4 API Keys Provider (auth.apiKeys())

**Builder API**:

```typescript
// src/auth/providers/api-keys.ts

export class ApiKeysBuilder {
  private config: ApiKeysConfig = {
    type: 'api-keys',
    enabled: false,
    keys: [],
  };

  /**
   * Enable API key authentication
   */
  enable(): this {
    this.config.enabled = true;
    return this;
  }

  /**
   * Set automatic key rotation period
   */
  rotateEvery(duration: Duration): this {
    this.config.rotationPeriod = duration;
    return this;
  }

  /**
   * Define API keys
   */
  keys(keys: ApiKey[]): this {
    this.config.keys = keys;
    return this;
  }

  /**
   * Set key prefix for identification
   */
  prefix(prefix: string): this {
    this.config.keyPrefix = prefix;
    return this;
  }

  /**
   * @internal
   */
  _build(): ApiKeysConfig {
    return { ...this.config };
  }
}

// Factory function
export const apiKeys = () => new ApiKeysBuilder();
```

**Configuration Type**:

```typescript
export interface ApiKeysConfig {
  type: 'api-keys';
  enabled: boolean;
  keys: ApiKey[];
  rotationPeriod?: Duration;
  keyPrefix?: string;
}

export interface ApiKey {
  id: string;
  secret: string;
  roles: string[];
  expiresAt?: string;
  metadata?: Record<string, any>;
}
```

### 2.5 Custom Auth Provider

**Builder API**:

```typescript
// src/auth/providers/custom.ts

export class CustomAuthBuilder {
  private config: CustomAuthConfig = {
    type: 'custom',
  };

  /**
   * Set custom token validation function
   */
  validateTokens(validator: TokenValidator): this {
    this.config.tokenValidator = validator;
    return this;
  }

  /**
   * Set custom role mapping function
   */
  mapRoles(mapper: RoleMapper): this {
    this.config.roleMapper = mapper;
    return this;
  }

  /**
   * Set custom authentication header
   */
  header(headerName: string): this {
    this.config.headerName = headerName;
    return this;
  }

  /**
   * @internal
   */
  _build(): CustomAuthConfig {
    return { ...this.config };
  }
}

// Factory function
export const custom = () => new CustomAuthBuilder();
```

### 2.6 Session Configuration

**Nested Builder**:

```typescript
// src/auth/session.ts

export class SessionBuilder {
  private config: SessionConfig = {
    duration: hours(24),
    sliding: false,
  };

  /**
   * Set session duration
   */
  duration(duration: Duration): this {
    this.config.duration = duration;
    return this;
  }

  /**
   * Enable sliding session expiration
   */
  sliding(enabled: boolean): this {
    this.config.sliding = enabled;
    return this;
  }

  /**
   * Set session storage backend
   */
  storage(storage: SessionStorage): this {
    this.config.storage = storage;
    return this;
  }

  /**
   * @internal
   */
  _build(): SessionConfig {
    return { ...this.config };
  }
}
```

### 2.7 MFA Configuration

**Nested Builder**:

```typescript
// src/auth/mfa.ts

export class MfaBuilder {
  private config: MfaConfig = {
    required: false,
    challenge: 'totp',
  };

  /**
   * Require MFA for specific roles
   */
  require(roles: string[]): this {
    this.config.required = true;
    this.config.requiredForRoles = roles;
    return this;
  }

  /**
   * Set MFA challenge type
   */
  challenge(type: 'totp' | 'sms' | 'email'): this {
    this.config.challenge = type;
    return this;
  }

  /**
   * Enable remember device
   */
  rememberDevice(days: number): this {
    this.config.rememberDevice = true;
    this.config.rememberDuration = days;
    return this;
  }

  /**
   * @internal
   */
  _build(): MfaConfig {
    return { ...this.config };
  }
}
```

---

## 3. Implementation Modules

### 3.1 Module Breakdown

**File Structure**:

```
src/auth/
├── index.ts                    # Public API exports
├── define-auth.ts              # defineAuth() function
├── types.ts                    # Core type definitions
│
├── providers/
│   ├── index.ts                # Provider exports
│   ├── entra.ts                # EntraIdBuilder
│   ├── api-keys.ts             # ApiKeysBuilder
│   ├── custom.ts               # CustomAuthBuilder
│   └── base.ts                 # Base provider interface
│
├── token-validator.ts          # Token validation utilities
├── role-mapper.ts              # Role mapping utilities
├── session.ts                  # SessionBuilder
├── mfa.ts                      # MfaBuilder
│
├── utils.ts                    # Auth utilities
└── errors.ts                   # Auth-specific errors
```

### 3.2 Core Types (src/auth/types.ts)

```typescript
/**
 * Auth definition input
 */
export type AuthDefinition = Record<string, AuthProviderBuilder>;

/**
 * Auth provider builder (union type)
 */
export type AuthProviderBuilder = EntraIdBuilder | ApiKeysBuilder | CustomAuthBuilder;

/**
 * Processed auth provider
 */
export interface ProcessedAuthProvider {
  type: string;
  config: AuthProviderConfig;
  validate?: TokenValidator;
  mapRoles?: RoleMapper;
}

/**
 * Auth provider config (union)
 */
export type AuthProviderConfig = EntraIdConfig | ApiKeysConfig | CustomAuthConfig;

/**
 * Token validator function
 */
export type TokenValidator = (
  token: string,
  claims?: Record<string, any>
) => Promise<TokenValidationResult>;

/**
 * Role mapper function
 */
export type RoleMapper = (claims: Record<string, any>) => string[];

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  claims?: Record<string, any>;
  userId?: string;
  error?: string;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  duration: Duration;
  sliding: boolean;
  storage?: SessionStorage;
}

/**
 * MFA configuration
 */
export interface MfaConfig {
  required: boolean;
  requiredForRoles?: string[];
  challenge: 'totp' | 'sms' | 'email';
  rememberDevice?: boolean;
  rememberDuration?: number;
}

/**
 * Auth object (returned by defineAuth)
 */
export interface AuthObject<T extends AuthDefinition = AuthDefinition> {
  definition: T;
  providers: {
    [K in keyof T]: ProcessedAuthProvider;
  };
  primaryProvider: keyof T;
  _metadata: AuthMetadata;
  _raw: T;
}

/**
 * Auth metadata
 */
export interface AuthMetadata {
  version: string;
  createdAt: string;
  providerNames: string[];
}
```

### 3.3 Token Validation (src/auth/token-validator.ts)

```typescript
/**
 * Extract bearer token from Authorization header
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Decode JWT without validation (for inspection)
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

    return payload;
  } catch {
    return null;
  }
}

/**
 * Validate JWT signature (placeholder for actual validation)
 */
export async function validateJwtSignature(
  token: string,
  issuer: string,
  audience?: string
): Promise<TokenValidationResult> {
  // This will be implemented in runtime package
  // For component package, we just define the interface
  return {
    valid: true,
    claims: decodeJwt(token) || {},
  };
}

/**
 * Extract user ID from claims
 */
export function extractUserId(claims: Record<string, any>): string | undefined {
  return claims.sub || claims.oid || claims.userId;
}

/**
 * Extract email from claims
 */
export function extractEmail(claims: Record<string, any>): string | undefined {
  return claims.email || claims.upn || claims.preferred_username;
}
```

### 3.4 Role Mapping (src/auth/role-mapper.ts)

```typescript
/**
 * Default role mapper for Entra ID
 */
export function defaultEntraRoleMapper(claims: Record<string, any>): string[] {
  const groups = claims.groups || [];

  if (Array.isArray(groups)) {
    return groups.map((g) => (typeof g === 'string' ? g : g.displayName || g.name));
  }

  return [];
}

/**
 * Default role mapper for API keys
 */
export function defaultApiKeyRoleMapper(key: ApiKey): string[] {
  return key.roles || [];
}

/**
 * Combine multiple role mappers
 */
export function combineRoleMappers(...mappers: RoleMapper[]): RoleMapper {
  return (claims) => {
    const allRoles = mappers.flatMap((mapper) => mapper(claims));
    return [...new Set(allRoles)]; // Deduplicate
  };
}

/**
 * Filter roles by whitelist
 */
export function filterRoles(allowedRoles: string[]): RoleMapper {
  return (claims) => {
    const roles = defaultEntraRoleMapper(claims);
    return roles.filter((role) => allowedRoles.includes(role));
  };
}
```

### 3.5 Utilities (src/auth/utils.ts)

```typescript
/**
 * Validate auth definition structure
 */
export function validateAuthDefinition(definition: AuthDefinition): void {
  if (!definition || typeof definition !== 'object') {
    throw new AuthDefinitionError('Auth definition must be an object');
  }

  const providerNames = Object.keys(definition);
  if (providerNames.length === 0) {
    throw new AuthDefinitionError('At least one auth provider required');
  }

  // Validate provider names (PascalCase)
  providerNames.forEach((name) => {
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(name)) {
      throw new AuthDefinitionError(`Provider name "${name}" must be PascalCase`);
    }
  });
}

/**
 * Process auth providers
 */
export function processProviders(
  definition: AuthDefinition
): Record<string, ProcessedAuthProvider> {
  const processed: Record<string, ProcessedAuthProvider> = {};

  for (const [name, builder] of Object.entries(definition)) {
    processed[name] = processProvider(builder);
  }

  return processed;
}

/**
 * Process single provider
 */
function processProvider(builder: AuthProviderBuilder): ProcessedAuthProvider {
  const config = builder._build();

  return {
    type: config.type,
    config,
    validate: config.tokenValidator,
    mapRoles: config.roleMapper,
  };
}

/**
 * Determine primary provider
 */
export function determinePrimaryProvider(definition: AuthDefinition): string {
  // First provider is primary by default
  // Future: Support explicit @primary annotation
  return Object.keys(definition)[0];
}
```

### 3.6 Error Handling (src/auth/errors.ts)

```typescript
/**
 * Base auth error
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Auth definition error
 */
export class AuthDefinitionError extends AuthError {
  constructor(message: string) {
    super(message, 'AUTH_DEFINITION_ERROR');
    this.name = 'AuthDefinitionError';
  }
}

/**
 * Token validation error
 */
export class TokenValidationError extends AuthError {
  constructor(
    message: string,
    public details?: any
  ) {
    super(message, 'TOKEN_VALIDATION_ERROR');
    this.name = 'TokenValidationError';
  }
}

/**
 * Role mapping error
 */
export class RoleMappingError extends AuthError {
  constructor(message: string) {
    super(message, 'ROLE_MAPPING_ERROR');
    this.name = 'RoleMappingError';
  }
}

/**
 * Create auth error from details
 */
export function createAuthError(
  type: 'definition' | 'validation' | 'roleMapping',
  message: string,
  details?: any
): AuthError {
  switch (type) {
    case 'definition':
      return new AuthDefinitionError(message);
    case 'validation':
      return new TokenValidationError(message, details);
    case 'roleMapping':
      return new RoleMappingError(message);
  }
}
```

---

## 4. Integration Points

### 4.1 Schema Authorization Integration

**Connection via Backend**:

```typescript
// Backend assembly (Phase 4)
export const backend = defineBackend({
  schema, // From Phase 1
  authentication, // From Phase 2 ← Integration point
  settings,
});

// Runtime: User context created from authentication
const userContext = {
  id: extractUserId(claims),
  email: extractEmail(claims),
  roles: auth.mapRoles(claims),
  claims,
  isAuthenticated: true,
};

// Authorization rules evaluate against user context
const isOwner = record.userId === userContext.id; // allow.owner('userId')
const hasRole = userContext.roles.includes('admin'); // allow.groups(['admin'])
```

**Schema Reference**:

```typescript
// Schema uses auth roles via authorization
User: c.model({...})
  .authorization(allow => [
    allow.owner('userId'),           // Checks userContext.id
    allow.groups(['admin']).all(),   // Checks userContext.roles
    allow.authenticated(),           // Checks userContext.isAuthenticated
  ])
```

### 4.2 CRUD Operations Integration

**Runtime Flow**:

```
1. HTTP Request
   ↓
2. Auth Middleware (generated from defineAuth config)
   ├─ Extract token
   ├─ Validate token (provider-specific)
   ├─ Map roles
   └─ Create userContext
   ↓
3. CRUD Handler
   ├─ Receive userContext
   ├─ Load record from DB
   ├─ Evaluate authorization rules:
   │  ├─ allow.owner('userId') → record.userId === userContext.id
   │  └─ allow.groups(['admin']) → userContext.roles.includes('admin')
   ├─ Allow/deny request
   └─ Return response or 403 error
```

### 4.3 Event Processor Integration

**No Direct Integration**: Event processors run in background, triggered by queue messages. Authentication doesn't apply to event processing.

**Service Account Pattern**: Event processors can use service account authentication (API keys) to make authenticated calls to other services.

### 4.4 Function Handler Integration

**Same as CRUD**: Custom function handlers use same authentication middleware and authorization rules:

```typescript
GenerateReport: f.model({...})
  .authorization(allow => [
    allow.authenticated(),      // Must be logged in
    allow.groups(['analyst']),  // Must have analyst role
  ])
```

### 4.5 Context API Integration (Phase 8)

**User Context Structure**:

```typescript
// Phase 8: Context API
interface UserContext {
  id: string;
  email: string;
  name?: string;
  roles: string[];
  groups: string[];
  claims: Record<string, any>;
  isAuthenticated: boolean;

  // Helper methods
  hasRole(role: string): boolean;
  hasAnyRole(roles: string[]): boolean;
  hasAllRoles(roles: string[]): boolean;
  isInGroup(group: string): boolean;
}

// Created by auth middleware from token validation
const userContext = createUserContext(validationResult, authConfig);
```

### 4.6 Middleware Generation (Phase 7)

**Auth Middleware Template**:

```typescript
// Phase 7: Generate middleware from auth config
export function generateAuthMiddleware(authConfig: AuthObject): AzureFunctionMiddleware {
  return async (context, req) => {
    const authHeader = req.headers['authorization'];
    const token = extractBearerToken(authHeader);

    if (!token) {
      return { status: 401, body: 'Missing authentication token' };
    }

    // Validate with primary provider
    const provider = authConfig.providers[authConfig.primaryProvider];
    const result = await provider.validate(token);

    if (!result.valid) {
      return { status: 401, body: result.error || 'Invalid token' };
    }

    // Map roles
    const roles = provider.mapRoles(result.claims);

    // Create user context
    context.user = {
      id: extractUserId(result.claims),
      email: extractEmail(result.claims),
      roles,
      claims: result.claims,
      isAuthenticated: true,
    };

    // Continue to handler
    return null;
  };
}
```

---

## 5. Task Breakdown

### Phase 2 Task List (10 tasks)

#### Task 1: Base Auth Pattern and defineAuth() [Day 1]

**Owner**: Devon-Auth-1
**Files**:

- `src/auth/define-auth.ts`
- `src/auth/types.ts`
- `src/auth/utils.ts`
- `src/auth/errors.ts`
- `src/auth/index.ts`

**Deliverables**:

- `defineAuth()` function implementation
- Core type definitions (AuthDefinition, AuthObject, ProcessedAuthProvider)
- Auth definition validation
- Provider processing logic
- Auth-specific error classes
- Public API exports

**Success Criteria**:

- Can define empty auth configuration
- Validates provider names (PascalCase)
- Processes providers correctly
- Returns AuthObject with metadata
- Throws clear errors for invalid configs

**Testing**: Devon-Auth-1 writes unit tests, Charlie-Auth-1 adds comprehensive tests

---

#### Task 2: Entra ID Provider [Day 2]

**Owner**: Devon-Auth-2
**Files**:

- `src/auth/providers/entra.ts`
- `src/auth/providers/base.ts`
- `src/auth/providers/index.ts`

**Deliverables**:

- EntraIdBuilder class
- Builder methods: tenant(), clientId(), audience(), validateTokens(), mapRoles(), session(), mfa()
- EntraIdConfig type
- Base provider interface
- Factory function: auth.entra()

**Success Criteria**:

- Fluent builder API works
- All configuration options supported
- Integrates with defineAuth()
- Type inference works correctly
- Validation for required fields (tenant, clientId)

**Testing**: Devon-Auth-2 writes unit tests, Charlie-Auth-2 adds comprehensive tests + edge cases

---

#### Task 3: API Keys Provider [Day 2]

**Owner**: Devon-Auth-3 (parallel with Task 2)
**Files**:

- `src/auth/providers/api-keys.ts`

**Deliverables**:

- ApiKeysBuilder class
- Builder methods: enable(), rotateEvery(), keys(), prefix()
- ApiKeysConfig type
- ApiKey interface
- Factory function: auth.apiKeys()

**Success Criteria**:

- Fluent builder API works
- Key configuration supported
- Rotation period configuration
- Integrates with defineAuth()
- Type inference works correctly

**Testing**: Devon-Auth-3 writes unit tests, Charlie-Auth-3 adds comprehensive tests

---

#### Task 4: Token Validation Infrastructure [Day 3]

**Owner**: Devon-Auth-4
**Files**:

- `src/auth/token-validator.ts`

**Deliverables**:

- extractBearerToken() function
- decodeJwt() function
- validateJwtSignature() stub (full implementation in runtime package)
- extractUserId() function
- extractEmail() function
- TokenValidationResult type

**Success Criteria**:

- Can extract bearer tokens from headers
- Can decode JWT payload
- User ID/email extraction works
- Handles malformed tokens gracefully
- Clear error messages

**Testing**: Devon-Auth-4 writes unit tests, Charlie-Auth-4 adds comprehensive tests + edge cases

---

#### Task 5: Role Mapping System [Day 3]

**Owner**: Devon-Auth-4 (continuation)
**Files**:

- `src/auth/role-mapper.ts`

**Deliverables**:

- defaultEntraRoleMapper() function
- defaultApiKeyRoleMapper() function
- combineRoleMappers() utility
- filterRoles() utility
- RoleMapper type

**Success Criteria**:

- Can extract roles from Entra claims
- Can extract roles from API key config
- Mapper composition works
- Role filtering works
- Handles missing/invalid claims

**Testing**: Devon-Auth-4 writes unit tests, Charlie-Auth-4 adds tests

---

#### Task 6: Session Management [Day 4]

**Owner**: Devon-Auth-2 (continuation)
**Files**:

- `src/auth/session.ts`

**Deliverables**:

- SessionBuilder class
- Builder methods: duration(), sliding(), storage()
- SessionConfig type
- SessionStorage interface (for future)

**Success Criteria**:

- Session builder works
- Integrates with Entra provider
- Duration configuration using Duration type
- Type inference works

**Testing**: Devon-Auth-2 writes unit tests, Charlie-Auth-2 adds tests

---

#### Task 7: MFA Configuration [Day 4]

**Owner**: Devon-Auth-2 (continuation)
**Files**:

- `src/auth/mfa.ts`

**Deliverables**:

- MfaBuilder class
- Builder methods: require(), challenge(), rememberDevice()
- MfaConfig type

**Success Criteria**:

- MFA builder works
- Role-based MFA requirements
- Challenge type configuration
- Integrates with Entra provider

**Testing**: Devon-Auth-2 writes unit tests, Charlie-Auth-2 adds tests

---

#### Task 8: Custom Auth Provider [Day 4]

**Owner**: Devon-Auth-3 (continuation)
**Files**:

- `src/auth/providers/custom.ts`

**Deliverables**:

- CustomAuthBuilder class
- Builder methods: validateTokens(), mapRoles(), header()
- CustomAuthConfig type
- Factory function: auth.custom()

**Success Criteria**:

- Custom builder works
- Allows full customization
- Integrates with defineAuth()
- Type inference works

**Testing**: Devon-Auth-3 writes unit tests, Charlie-Auth-3 adds tests

---

#### Task 9: Authorization Integration [Day 5]

**Owner**: Devon-Auth-1 (continuation)
**Files**:

- Update `src/schema/authorization.ts`
- Update `src/schema/types.ts`

**Deliverables**:

- Add auth context types to authorization
- Document integration with user context
- Update AuthorizationRule types for auth reference

**Success Criteria**:

- Authorization rules can reference user context
- Type safety for auth integration
- Clear documentation of runtime integration

**Testing**: Devon-Auth-1 + Charlie-Auth-1 write integration tests

---

#### Task 10: Type Inference for Auth System [Day 5]

**Owner**: Devon-Auth-5
**Files**:

- `src/auth/type-inference.ts`

**Deliverables**:

- InferAuthProviders<T> type
- InferPrimaryProvider<T> type
- Type utilities for extracting provider configs
- Type tests using tsd

**Success Criteria**:

- Can infer provider types from auth definition
- Type inference works correctly
- No type errors in example code
- Type tests pass

**Testing**: Devon-Auth-5 writes type tests, Charlie-Auth-5 validates

---

## 6. Testing Strategy

### 6.1 Unit Tests

**Coverage Target**: >90%

**Unit Test Files** (10 files):

```
src/auth/
├── define-auth.spec.ts          # defineAuth() function
├── utils.spec.ts                # Validation and processing
├── errors.spec.ts               # Error classes
├── token-validator.spec.ts      # Token utilities
├── role-mapper.spec.ts          # Role mapping
├── session.spec.ts              # Session builder
├── mfa.spec.ts                  # MFA builder
├── providers/
│   ├── entra.spec.ts           # Entra builder
│   ├── api-keys.spec.ts        # API keys builder
│   └── custom.spec.ts          # Custom builder
└── type-inference.spec.ts      # Type inference tests
```

**Test Patterns**:

```typescript
// Builder tests
describe('EntraIdBuilder', () => {
  describe('tenant()', () => {
    it('should set tenant ID', () => {
      const builder = auth.entra().tenant('tenant-123');
      const config = builder._build();

      expect(config.tenant).toBe('tenant-123');
    });

    it('should return this for chaining', () => {
      const builder = auth.entra();
      const result = builder.tenant('tenant-123');

      expect(result).toBe(builder);
    });
  });

  describe('_build()', () => {
    it('should return EntraIdConfig', () => {
      const config = auth.entra().tenant('tenant-123').clientId('client-456')._build();

      expect(config.type).toBe('entra-id');
      expect(config.tenant).toBe('tenant-123');
      expect(config.clientId).toBe('client-456');
    });
  });
});

// defineAuth tests
describe('defineAuth', () => {
  it('should process single provider', () => {
    const auth = defineAuth({
      Primary: auth.entra().tenant('tenant-123').clientId('client-456'),
    });

    expect(auth.providers.Primary).toBeDefined();
    expect(auth.primaryProvider).toBe('Primary');
  });

  it('should process multiple providers', () => {
    const auth = defineAuth({
      Primary: auth.entra().tenant('t').clientId('c'),
      ApiKeys: auth.apiKeys().enable().keys([]),
    });

    expect(auth.providers.Primary).toBeDefined();
    expect(auth.providers.ApiKeys).toBeDefined();
    expect(auth.primaryProvider).toBe('Primary');
  });

  it('should validate provider names', () => {
    expect(() => {
      defineAuth({
        'invalid-name': auth.entra().tenant('t').clientId('c'),
      });
    }).toThrow(AuthDefinitionError);
  });
});
```

### 6.2 Integration Tests

**Integration Scenarios**:

```typescript
describe('Auth Integration', () => {
  it('should integrate auth with schema authorization', () => {
    // Define schema with authorization
    const schema = defineSchema({
      schema: a.schema({
        User: c
          .model({
            id: a.id(),
            email: a.string().required(),
          })
          .authorization((allow) => [allow.owner('userId'), allow.groups(['admin']).all()]),
      }),
    });

    // Define auth
    const authentication = defineAuth({
      Primary: auth
        .entra()
        .tenant('tenant-123')
        .clientId('client-456')
        .mapRoles((claims) => claims.groups || []),
    });

    // Both should work together
    expect(schema).toBeDefined();
    expect(authentication).toBeDefined();
    expect(authentication.providers.Primary.mapRoles).toBeDefined();
  });

  it('should handle token validation flow', async () => {
    const auth = defineAuth({
      Primary: auth
        .entra()
        .tenant('tenant-123')
        .clientId('client-456')
        .validateTokens(async (token, claims) => {
          if (claims?.iss !== 'expected-issuer') {
            return { valid: false, error: 'Invalid issuer' };
          }
          return { valid: true };
        })
        .mapRoles((claims) => claims.groups || []),
    });

    // Mock token validation
    const validator = auth.providers.Primary.validate;
    expect(validator).toBeDefined();

    // Test custom validation logic
    const result = await validator('mock-token', { iss: 'wrong-issuer' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid issuer');
  });
});
```

### 6.3 Type Tests

**Type Validation**:

```typescript
import { expectType, expectError } from 'tsd';

describe('Type Inference', () => {
  it('should infer auth provider types', () => {
    const auth = defineAuth({
      Primary: auth.entra().tenant('t').clientId('c'),
      ApiKeys: auth.apiKeys().enable().keys([]),
    });

    // Should infer correct types
    expectType<EntraIdConfig>(auth.providers.Primary.config);
    expectType<ApiKeysConfig>(auth.providers.ApiKeys.config);

    // Should error on wrong types
    expectError<CustomAuthConfig>(auth.providers.Primary.config);
  });

  it('should infer primary provider', () => {
    const auth = defineAuth({
      Primary: auth.entra().tenant('t').clientId('c'),
    });

    expectType<'Primary'>(auth.primaryProvider);
  });
});
```

### 6.4 End-to-End Tests

**E2E Scenario** (Backend Integration):

```typescript
describe('Backend with Auth (E2E)', () => {
  it('should assemble backend with authentication', () => {
    const schema = defineSchema({
      schema: a.schema({
        User: c.model({
          id: a.id(),
          email: a.string().required().email(),
        }),
      }),
    });

    const authentication = defineAuth({
      Primary: auth
        .entra()
        .tenant(process.env.AZURE_TENANT_ID!)
        .clientId(process.env.AZURE_CLIENT_ID!),
    });

    // This will be in Phase 4
    // const backend = defineBackend({
    //   schema,
    //   authentication,
    //   settings: { name: 'test-app' },
    // });

    // For now, just verify auth works standalone
    expect(authentication.providers.Primary).toBeDefined();
    expect(authentication.providers.Primary.config.type).toBe('entra-id');
  });
});
```

---

## 7. Success Criteria

### 7.1 Functional Requirements

**Must Have**:

- ✅ `defineAuth()` function works
- ✅ Entra ID provider fully functional
- ✅ API Keys provider fully functional
- ✅ Custom provider pattern works
- ✅ Token validation utilities implemented
- ✅ Role mapping utilities implemented
- ✅ Session configuration works
- ✅ MFA configuration works
- ✅ Integration with schema authorization documented
- ✅ Type inference works correctly

**Should Have**:

- ✅ Multiple provider support
- ✅ Provider validation (required fields)
- ✅ Clear error messages
- ✅ Example code provided

**Could Have** (Nice to Have):

- OAuth2 generic provider
- SAML provider pattern
- Refresh token handling

### 7.2 Quality Requirements

**Code Quality**:

- ✅ >90% test coverage
- ✅ All public APIs documented (JSDoc)
- ✅ Consistent naming conventions
- ✅ No `any` types in public APIs
- ✅ Type-safe throughout
- ✅ Error handling comprehensive

**Performance**:

- defineAuth() completes in <10ms
- Provider processing is O(n) where n = number of providers
- No memory leaks

**Developer Experience**:

- IntelliSense works perfectly
- Type errors are clear
- Example code is copy-pasteable
- Error messages are actionable

### 7.3 Documentation Requirements

**Required Documentation**:

- JSDoc comments on all public APIs
- Example usage in each module
- Integration guide (how auth connects to schema)
- Error reference (all error types documented)

**Examples to Include**:

- Simple Entra ID auth
- API keys for service accounts
- Custom auth provider
- Multiple providers
- Role mapping examples
- MFA configuration

### 7.4 Integration Requirements

**Phase 1 Integration**:

- Works with existing schema system
- Works with authorization rules
- Type inference compatible

**Future Phase Integration**:

- Ready for Phase 4 (Backend Assembly)
- Ready for Phase 7 (Middleware Generation)
- Ready for Phase 8 (User Context API)

---

## 8. Risk Assessment

### 8.1 Technical Risks

**Risk 1: Token Validation Complexity** (Medium)

- **Description**: JWT validation is complex (signature verification, expiration, issuer validation)
- **Impact**: Could take longer than planned
- **Mitigation**:
  - Implement validation stubs in component package
  - Full validation in runtime package (later)
  - Focus on API design, not full implementation
- **Status**: Mitigated

**Risk 2: Entra ID Complexity** (Low)

- **Description**: Entra ID has many configuration options
- **Impact**: Might miss some configuration options
- **Mitigation**:
  - Start with core options (tenant, clientId, audience)
  - Add advanced options incrementally
  - Review backend-simple for requirements
- **Status**: Mitigated

**Risk 3: Type Inference Complexity** (Low)

- **Description**: Conditional types for multiple providers might be tricky
- **Impact**: Could slow down Task 10
- **Mitigation**:
  - Leverage patterns from Phase 1
  - Use union types for flexibility
  - Test incrementally
- **Status**: Low risk (Phase 1 success)

### 8.2 Integration Risks

**Risk 1: Schema Authorization Integration** (Low)

- **Description**: Auth system must work with existing authorization rules
- **Impact**: Could require changes to Phase 1 code
- **Mitigation**:
  - Task 9 explicitly handles integration
  - Authorization system already designed for this
  - No breaking changes expected
- **Status**: Low risk

**Risk 2: Backend Assembly Integration** (Low)

- **Description**: Backend will need to accept auth configuration
- **Impact**: Might require interface changes
- **Mitigation**:
  - Design auth API to match backend expectations
  - Phase 4 will handle integration details
  - Keep auth API simple and composable
- **Status**: Low risk

### 8.3 Timeline Risks

**Risk 1: Token Validation Takes Longer** (Medium)

- **Probability**: Medium
- **Impact**: Could delay Task 4 by 1-2 days
- **Mitigation**:
  - Stub complex validation logic
  - Focus on API surface, not full implementation
  - Defer full JWT validation to runtime package
- **Contingency**: If delayed, continue with other tasks in parallel

**Risk 2: Testing Takes Longer** (Low)

- **Probability**: Low
- **Impact**: Could extend Phase 2 by 1 day
- **Mitigation**:
  - Charlie agents work in parallel with Devon agents
  - Prioritize core functionality tests
  - Defer edge case tests if needed
- **Contingency**: Finish edge cases in Phase 3

---

## 9. Dependencies

### 9.1 Phase 1 Dependencies

**Required from Phase 1**:

- ✅ Duration type (from common/duration.ts)
- ✅ Fluent builder patterns (BaseBuilder)
- ✅ Type inference patterns
- ✅ Authorization types (for integration)
- ✅ Export patterns (index.ts structure)

**Status**: All dependencies ready ✅

### 9.2 External Dependencies

**No new external dependencies required**

**Existing dependencies used**:

- TypeScript (already installed)
- Zod (already installed, for validation)

**Future dependencies** (runtime package, not component package):

- `jsonwebtoken` or `jose` for JWT validation (runtime)
- Azure SDK packages (runtime)

### 9.3 Future Phase Dependencies

**Phase 2 provides to later phases**:

- Phase 4: Authentication configuration for backend assembly
- Phase 7: Auth config for middleware generation
- Phase 8: User context types for context API

---

## 10. Milestones

### Day 1 (Monday)

**Milestone 1: Base Auth Pattern Complete**

- ✅ defineAuth() working
- ✅ Types defined
- ✅ Validation working
- ✅ Error handling complete
- **Deliverable**: Can create empty auth definition

### Day 2 (Tuesday)

**Milestone 2: Core Providers Complete**

- ✅ Entra ID provider working
- ✅ API Keys provider working
- ✅ Both providers integrate with defineAuth()
- **Deliverable**: Can configure Entra and API keys

### Day 3 (Wednesday)

**Milestone 3: Validation & Mapping Complete**

- ✅ Token validation utilities working
- ✅ Role mapping utilities working
- ✅ Integration between providers and utilities
- **Deliverable**: Can extract and validate tokens (stub), map roles

### Day 4 (Thursday)

**Milestone 4: Advanced Features Complete**

- ✅ Session management working
- ✅ MFA configuration working
- ✅ Custom auth provider working
- **Deliverable**: All auth features functional

### Day 5 (Friday)

**Milestone 5: Integration & Polish Complete**

- ✅ Schema authorization integration documented
- ✅ Type inference working
- ✅ All tests passing (>90% coverage)
- ✅ Documentation complete
- **Deliverable**: Phase 2 production-ready

---

## 11. Recommended Agent Assignment

Based on Phase 1 success, recommend 5 Devon + 5 Charlie agents:

### Devon Agents (Implementation)

**Devon-Auth-1** (Base + Integration)

- Day 1: Task 1 (Base auth pattern)
- Day 5: Task 9 (Authorization integration)
- **Skills**: Architecture, integration, type systems
- **Priority**: Critical path tasks

**Devon-Auth-2** (Entra ID)

- Day 2: Task 2 (Entra provider)
- Day 4: Task 6 (Session), Task 7 (MFA)
- **Skills**: Azure services, authentication
- **Priority**: Core provider

**Devon-Auth-3** (API Keys + Custom)

- Day 2: Task 3 (API keys provider)
- Day 4: Task 8 (Custom provider)
- **Skills**: API design, security
- **Priority**: Secondary providers

**Devon-Auth-4** (Validation + Mapping)

- Day 3: Task 4 (Token validation), Task 5 (Role mapping)
- **Skills**: Security, JWT, validation
- **Priority**: Core utilities

**Devon-Auth-5** (Type Inference)

- Day 5: Task 10 (Type inference)
- **Skills**: TypeScript advanced types, testing
- **Priority**: Type system

### Charlie Agents (Testing)

**Charlie-Auth-1** (Base + Integration Tests)

- Follows Devon-Auth-1
- Tasks 1, 9 testing

**Charlie-Auth-2** (Entra Provider Tests)

- Follows Devon-Auth-2
- Tasks 2, 6, 7 testing

**Charlie-Auth-3** (API Keys + Custom Tests)

- Follows Devon-Auth-3
- Tasks 3, 8 testing

**Charlie-Auth-4** (Validation + Mapping Tests)

- Follows Devon-Auth-4
- Tasks 4, 5 testing

**Charlie-Auth-5** (Type Tests + Integration)

- Follows Devon-Auth-5
- Task 10 testing + overall integration tests

---

## 12. Next Steps

### Immediate Actions (Today)

1. **Create tasks** in Digital Minion task system
   - Create parent task: "Phase 2: Authentication System"
   - Create 10 subtasks (one per task above)
   - Assign to Devon agents

2. **Review with team**
   - Ensure all Devon agents understand their tasks
   - Clarify any questions about requirements
   - Agree on API naming and patterns

3. **Set up test infrastructure**
   - Ensure test framework ready (vitest)
   - Create test file templates
   - Set up type testing (tsd)

### Week Start (Monday Morning)

1. **Devon-Auth-1** starts Task 1 (Base auth pattern)
2. **All other agents** prepare
   - Review Phase 1 patterns
   - Read IMPLEMENTATION_PLAN.md
   - Review this Phase 2 plan

### Daily Standups

**Morning**:

- What was completed yesterday?
- What's planned for today?
- Any blockers?

**Evening**:

- What was completed today?
- What tests are passing?
- Any issues discovered?

### End of Week (Friday EOD)

1. **Code review** of all Phase 2 code
2. **Test coverage** verification (>90%)
3. **Documentation** review (all public APIs documented)
4. **Integration testing** (works with Phase 1)
5. **Create PHASE2_REVIEW.md** (similar to PHASE1_REVIEW.md)

---

## Appendix A: Example Usage

### Example 1: Simple Entra ID Auth

```typescript
import { defineAuth, auth } from '@atakora/component';

export const authentication = defineAuth({
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .audience(process.env.AZURE_AUDIENCE!),
});
```

### Example 2: Entra with Custom Role Mapping

```typescript
export const authentication = defineAuth({
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .mapRoles((claims) => {
      // Map Azure AD groups to application roles
      const groups = claims.groups || [];
      const roleMap = {
        'admin-group-id': 'admin',
        'editor-group-id': 'editor',
        'viewer-group-id': 'viewer',
      };

      return groups.map((groupId) => roleMap[groupId]).filter(Boolean);
    }),
});
```

### Example 3: Multiple Providers

```typescript
export const authentication = defineAuth({
  Primary: auth.entra().tenant(process.env.AZURE_TENANT_ID!).clientId(process.env.AZURE_CLIENT_ID!),

  ApiKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90))
    .keys([
      {
        id: 'service-1',
        secret: process.env.API_KEY_SERVICE_1!,
        roles: ['service'],
      },
      {
        id: 'admin-cli',
        secret: process.env.API_KEY_ADMIN!,
        roles: ['admin', 'service'],
      },
    ])
    .prefix('atk_'),
});
```

### Example 4: Custom Auth Provider

```typescript
export const authentication = defineAuth({
  Primary: auth
    .custom()
    .header('X-Custom-Auth')
    .validateTokens(async (token) => {
      // Custom validation logic
      const user = await customAuthService.validate(token);

      if (!user) {
        return { valid: false, error: 'Invalid token' };
      }

      return {
        valid: true,
        claims: {
          sub: user.id,
          email: user.email,
          roles: user.roles,
        },
      };
    })
    .mapRoles((claims) => claims.roles || []),
});
```

### Example 5: Entra with Session and MFA

```typescript
export const authentication = defineAuth({
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .session((session) => session.duration(hours(8)).sliding(true))
    .mfa((mfa) => mfa.require(['admin', 'finance']).challenge('totp').rememberDevice(30)),
});
```

---

## Appendix B: Type Inference Examples

### Infer Provider Types

```typescript
const auth = defineAuth({
  Primary: auth.entra().tenant('t').clientId('c'),
  ApiKeys: auth.apiKeys().enable().keys([]),
});

// Infer auth object type
type AuthType = typeof auth;
// → AuthObject<{ Primary: EntraIdBuilder, ApiKeys: ApiKeysBuilder }>

// Infer provider config types
type PrimaryConfig = typeof auth.providers.Primary.config;
// → EntraIdConfig

type ApiKeysConfig = typeof auth.providers.ApiKeys.config;
// → ApiKeysConfig
```

### Infer Primary Provider

```typescript
type PrimaryProvider = typeof auth.primaryProvider;
// → 'Primary'
```

---

## Document History

| Version | Date       | Author                  | Changes              |
| ------- | ---------- | ----------------------- | -------------------- |
| 1.0     | 2025-01-20 | Becky (Staff Architect) | Initial Phase 2 plan |

---

**Status**: Ready to Begin
**Next Phase**: Phase 3 (Model Builders - complete remaining features)
