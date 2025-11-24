# ADR-027: Authentication Middleware Pattern

**Status:** Proposed
**Date:** 2025-11-22
**Architect:** Becky (Staff Architect)
**Stakeholders:** Devon (Implementation), Charlie (Testing)

---

## Context

Function handlers need authentication and authorization middleware to validate tokens, extract user context, and enforce access controls. The current authentication system defines providers but doesn't implement runtime middleware.

### Current State

- Authentication configuration defined in `defineAuth()`
- Token validation logic exists
- No middleware integration with Function App runtime
- No request interception

### Problem Statement

We need an authentication middleware pattern that:

1. **Intercepts Requests:** Validate auth before handler execution
2. **Extracts Tokens:** Support multiple token sources (header, cookie, query)
3. **Multi-Provider:** Try multiple auth providers in order
4. **Error Handling:** Clear authentication errors
5. **Performance:** Minimal overhead per request
6. **Testable:** Easy to mock for testing

---

## Decision

Implement **composable authentication middleware** with provider precedence and token extraction strategies.

### Architecture

```typescript
/**
 * Authentication middleware
 */
export function createAuthMiddleware<TAuth extends AuthDefinition>(
  authObject: AuthObject<TAuth>,
  options?: AuthMiddlewareOptions
): AuthMiddleware {
  return async (req: HttpRequest, context: ExecutionContext) => {
    // 1. Extract token from request
    const token = await extractToken(req, options?.tokenExtraction);

    if (!token) {
      if (options?.allowAnonymous) {
        return { authenticated: false, user: null };
      }
      throw new AuthenticationError('No authentication token provided', 'NO_TOKEN');
    }

    // 2. Try providers in order
    const providers = getProvidersByPrecedence(authObject, options?.providerPrecedence);

    for (const provider of providers) {
      try {
        // 3. Validate token with provider
        const result = await provider.validate(token);

        if (result.valid) {
          // 4. Map claims to user context
          const user = await createUserContext(result, provider);

          // 5. Check authorization
          if (options?.authorize) {
            await options.authorize(user, req);
          }

          return {
            authenticated: true,
            user,
            provider: provider.type,
          };
        }
      } catch (error) {
        // Continue to next provider
        context.log.verbose(`Provider ${provider.type} validation failed: ${error.message}`);
      }
    }

    // No provider validated the token
    throw new AuthenticationError('Authentication failed', 'INVALID_TOKEN');
  };
}

/**
 * Middleware options
 */
export interface AuthMiddlewareOptions {
  /**
   * Token extraction strategies
   */
  tokenExtraction?: {
    /**
     * Header names to check (in order)
     */
    headers?: string[];

    /**
     * Cookie names to check (in order)
     */
    cookies?: string[];

    /**
     * Query parameter names (for OAuth callbacks)
     */
    queryParams?: string[];

    /**
     * Custom extraction function
     */
    custom?: (req: HttpRequest) => string | null | Promise<string | null>;
  };

  /**
   * Provider precedence
   */
  providerPrecedence?: string[];

  /**
   * Allow anonymous requests
   */
  allowAnonymous?: boolean;

  /**
   * Authorization check
   */
  authorize?: (user: UserContext, req: HttpRequest) => void | Promise<void>;

  /**
   * Cache validated tokens
   */
  cacheTokens?: {
    enabled: boolean;
    ttl: number; // seconds
  };
}
```

### Token Extraction

```typescript
/**
 * Extract authentication token from request
 */
export async function extractToken(
  req: HttpRequest,
  config?: AuthMiddlewareOptions['tokenExtraction']
): Promise<string | null> {
  const defaultConfig = {
    headers: ['Authorization', 'X-API-Key'],
    cookies: ['auth-token'],
    queryParams: ['token'],
  };

  const extractionConfig = { ...defaultConfig, ...config };

  // 1. Try custom extractor first
  if (extractionConfig.custom) {
    const token = await extractionConfig.custom(req);
    if (token) return token;
  }

  // 2. Try headers
  if (extractionConfig.headers) {
    for (const headerName of extractionConfig.headers) {
      const headerValue = req.headers.get(headerName);
      if (headerValue) {
        // Handle "Bearer {token}" format
        if (headerValue.startsWith('Bearer ')) {
          return headerValue.substring(7);
        }
        return headerValue;
      }
    }
  }

  // 3. Try cookies
  if (extractionConfig.cookies) {
    const cookies = parseCookies(req.headers.get('Cookie') || '');
    for (const cookieName of extractionConfig.cookies) {
      if (cookies[cookieName]) {
        return cookies[cookieName];
      }
    }
  }

  // 4. Try query parameters (least preferred)
  if (extractionConfig.queryParams) {
    const url = new URL(req.url);
    for (const param of extractionConfig.queryParams) {
      const value = url.searchParams.get(param);
      if (value) return value;
    }
  }

  return null;
}

/**
 * Parse cookie header
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};

  for (const cookie of cookieHeader.split(';')) {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  }

  return cookies;
}
```

### Provider Precedence

```typescript
/**
 * Get providers in precedence order
 */
export function getProvidersByPrecedence<TAuth extends AuthDefinition>(
  authObject: AuthObject<TAuth>,
  precedence?: string[]
): ProcessedAuthProvider[] {
  const providers = Object.values(authObject.providers);

  if (!precedence) {
    // Default precedence: primary first, then others
    const primaryProvider = providers.find(p =>
      p.type === authObject.primaryProvider
    );
    const otherProviders = providers.filter(p =>
      p.type !== authObject.primaryProvider
    );

    return primaryProvider
      ? [primaryProvider, ...otherProviders]
      : providers;
  }

  // Custom precedence
  const orderedProviders: ProcessedAuthProvider[] = [];

  for (const providerName of precedence) {
    const provider = providers.find(p => p.type === providerName);
    if (provider) {
      orderedProviders.push(provider);
    }
  }

  // Add any providers not in precedence list
  for (const provider of providers) {
    if (!orderedProviders.includes(provider)) {
      orderedProviders.push(provider);
    }
  }

  return orderedProviders;
}
```

### Function Integration

```typescript
/**
 * Wrap handler with authentication middleware
 */
export function withAuth<TAuth extends AuthDefinition, TInput, TOutput>(
  handler: AuthenticatedHandler<TInput, TOutput>,
  authObject: AuthObject<TAuth>,
  options?: AuthMiddlewareOptions
): HttpHandler {
  const authMiddleware = createAuthMiddleware(authObject, options);

  return async (req: HttpRequest, context: ExecutionContext) => {
    try {
      // Run authentication middleware
      const authResult = await authMiddleware(req, context);

      // Create authenticated context
      const authContext: AuthenticatedContext<TInput> = {
        ...context,
        user: authResult.user,
        authenticated: authResult.authenticated,
        provider: authResult.provider,
      };

      // Parse request body
      const input = await parseRequestBody<TInput>(req);

      // Call handler with authenticated context
      const output = await handler(input, authContext);

      // Return response
      return {
        status: 200,
        body: JSON.stringify(output),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    } catch (error) {
      return handleAuthError(error);
    }
  };
}

/**
 * Handle authentication errors
 */
function handleAuthError(error: any): HttpResponse {
  if (error instanceof AuthenticationError) {
    return {
      status: 401,
      body: JSON.stringify({
        error: 'Unauthorized',
        message: error.message,
        code: error.code,
      }),
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer',
      },
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      status: 403,
      body: JSON.stringify({
        error: 'Forbidden',
        message: error.message,
        code: error.code,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  // Unknown error
  return {
    status: 500,
    body: JSON.stringify({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  };
}
```

### Token Caching

```typescript
/**
 * Token cache for performance
 */
export class TokenCache {
  private cache: Map<string, CachedToken>;
  private readonly ttl: number;

  constructor(ttl: number = 300) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Get cached token validation result
   */
  get(token: string): UserContext | null {
    const cached = this.cache.get(token);

    if (!cached) return null;

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(token);
      return null;
    }

    return cached.user;
  }

  /**
   * Cache token validation result
   */
  set(token: string, user: UserContext): void {
    this.cache.set(token, {
      user,
      expiresAt: Date.now() + (this.ttl * 1000),
    });

    // Periodic cleanup
    if (this.cache.size > 10000) {
      this.cleanup();
    }
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [token, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(token);
      }
    }
  }
}

interface CachedToken {
  user: UserContext;
  expiresAt: number;
}
```

### Usage Examples

```typescript
// Example 1: Simple authentication
const getUserProfile = withAuth(
  async (input, context) => {
    return {
      userId: context.user.id,
      email: context.user.email,
      roles: context.user.roles,
    };
  },
  authentication
);

// Example 2: Custom token extraction
const getProtectedData = withAuth(
  async (input, context) => {
    return await fetchData(context.user.id);
  },
  authentication,
  {
    tokenExtraction: {
      headers: ['X-Custom-Auth', 'Authorization'],
      cookies: ['session-token'],
    },
  }
);

// Example 3: Authorization check
const deleteUser = withAuth(
  async (input, context) => {
    await performDelete(input.userId);
  },
  authentication,
  {
    authorize: async (user, req) => {
      if (!user.roles.includes('admin')) {
        throw new AuthorizationError('Admin role required');
      }
    },
  }
);

// Example 4: Allow anonymous with optional auth
const getPublicData = withAuth(
  async (input, context) => {
    if (context.authenticated) {
      // Return personalized data
      return getPersonalizedData(context.user.id);
    } else {
      // Return public data
      return getPublicData();
    }
  },
  authentication,
  {
    allowAnonymous: true,
  }
);

// Example 5: Provider precedence
const apiHandler = withAuth(
  async (input, context) => {
    // API keys have priority over Entra ID
    return processApiRequest(input);
  },
  authentication,
  {
    providerPrecedence: ['api-keys', 'entra-id'],
  }
);
```

---

## Alternatives Considered

### Alternative 1: Function-Level Auth Configuration

**Approach:** Configure auth per function, not middleware.

**Rejected:** Repetitive, inconsistent, hard to enforce.

### Alternative 2: Automatic Auth Injection

**Approach:** All functions auto-authenticated.

**Rejected:** Inflexible, can't opt out, poor for public endpoints.

### Alternative 3: Express-Style Middleware Stack

**Approach:** Full middleware pipeline with next().

**Rejected:** Overkill for Azure Functions, adds complexity.

---

## Consequences

### Positive

1. **Composable:** Easy to add auth to any function
2. **Flexible:** Support multiple auth strategies
3. **Performance:** Token caching reduces overhead
4. **Testable:** Easy to mock auth in tests
5. **Consistent:** Same auth handling across functions

### Negative

1. **Wrapper Overhead:** Extra function wrapping
2. **Learning Curve:** Need to understand middleware pattern
3. **Type Complexity:** Generic types for context

---

## Success Criteria

1. ✅ Extract tokens from multiple sources
2. ✅ Try multiple providers in order
3. ✅ Handle auth errors gracefully
4. ✅ Support optional authentication
5. ✅ Cache validated tokens
6. ✅ Clear error messages

---

## Implementation Plan

- Phase 1: Token extraction (2 days)
- Phase 2: Middleware core (2 days)
- Phase 3: Provider precedence (1 day)
- Phase 4: Token caching (2 days)
- Phase 5: Testing (2 days)

**Total:** 9 days

---

**Status:** Proposed
**Implementation Target:** Week 5
