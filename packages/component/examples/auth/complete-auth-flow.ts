/**
 * Complete Authentication Flow Example
 *
 * Demonstrates:
 * - Backend with multi-provider authentication
 * - Token validation middleware
 * - OAuth 2.0 introspection
 * - Rate limiting
 * - Protected function handlers
 * - Role-based authorization
 * - Custom authorization logic
 *
 * @example Running the example
 * ```bash
 * npm run example:auth
 * ```
 */

import { defineBackend } from '../../src/backend/define-backend';
import { defineAuth } from '../../src/auth/define-auth';
import { entra } from '../../src/auth/providers/entra';
import { apiKeys } from '../../src/auth/providers/api-keys';
import { TokenIntrospector, createEntraIntrospector } from '../../src/auth/token-introspection';
import {
  createAuthMiddleware,
  requireAuthentication,
  requireRoles,
  optionalAuthentication,
} from '../../src/functions/middleware/auth-middleware';
import { minutes, hours } from '../../src/common/duration';
import { AuthRateLimiter } from '../../src/auth/rate-limiter';

// ============================================================================
// Step 1: Define Authentication Providers
// ============================================================================

/**
 * Define authentication using multiple providers:
 * - Entra ID (Azure AD) for employee access
 * - API Keys for service-to-service communication
 */
const auth = defineAuth({
  // Primary provider: Entra ID for employee authentication
  entra: entra({
    tenantId: process.env.AZURE_TENANT_ID!,
    clientId: process.env.AZURE_CLIENT_ID!,
    audience: 'api://my-application',
    issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,

    // Map Entra ID roles to application roles
    roleMapper: (claims) => {
      const roles: string[] = [];

      // Extract roles from Azure AD groups
      if (claims.roles && Array.isArray(claims.roles)) {
        roles.push(...claims.roles);
      }

      // Extract roles from groups claim
      if (claims.groups && Array.isArray(claims.groups)) {
        // Map Azure AD groups to application roles
        const groupRoleMap: Record<string, string> = {
          'engineering-group-id': 'engineer',
          'admin-group-id': 'admin',
          'support-group-id': 'support',
        };

        for (const groupId of claims.groups) {
          if (groupRoleMap[groupId]) {
            roles.push(groupRoleMap[groupId]);
          }
        }
      }

      // Everyone gets 'user' role
      roles.push('user');

      return [...new Set(roles)]; // Deduplicate
    },
  }),

  // Secondary provider: API Keys for service accounts
  apiKeys: apiKeys({
    keys: [
      {
        id: 'service-1',
        secret: process.env.SERVICE_1_API_KEY!,
        roles: ['service', 'read'],
        metadata: {
          description: 'Service account for automated jobs',
        },
      },
      {
        id: 'admin-service',
        secret: process.env.ADMIN_API_KEY!,
        roles: ['service', 'admin', 'read', 'write'],
        metadata: {
          description: 'Admin service account',
        },
      },
    ],
  }),
});

// ============================================================================
// Step 2: Set Up Token Introspection (for opaque tokens)
// ============================================================================

/**
 * Create introspector for Entra ID opaque tokens
 * This is used when you need to validate opaque tokens that aren't JWTs
 */
const introspector = createEntraIntrospector({
  tenantId: process.env.AZURE_TENANT_ID!,
  clientId: process.env.AZURE_CLIENT_ID!,
  clientSecret: process.env.AZURE_CLIENT_SECRET!,
  cacheDuration: minutes(5), // Cache for 5 minutes
  cacheMaxSize: 1000,
});

// ============================================================================
// Step 3: Configure Rate Limiting
// ============================================================================

/**
 * Create rate limiter to prevent brute force attacks
 */
const rateLimiter = new AuthRateLimiter({
  maxAttempts: 5,
  windowMs: minutes(15),
  blockDuration: hours(1),
  progressiveDelay: true,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
});

// ============================================================================
// Step 4: Create Authentication Middleware
// ============================================================================

/**
 * Middleware for Entra ID authentication with JWT validation
 */
const entrAuthMiddleware = createAuthMiddleware({
  validator: auth.providers.entra.validate,
  roleMapper: (claims) => auth.providers.entra.mapRoles(claims),
  providerName: 'entra',
  extraction: {
    fromHeader: true,
    fromCookie: true,
  },
  rateLimiting: {
    enabled: true,
    rateLimiter,
  },
});

/**
 * Middleware for API Key authentication
 */
const apiKeyMiddleware = createAuthMiddleware({
  validator: auth.providers.apiKeys.validate,
  roleMapper: (claims) => auth.providers.apiKeys.mapRoles(claims),
  providerName: 'apiKeys',
  extraction: {
    fromCustomHeader: true,
    customHeaderName: 'x-api-key',
    fromQuery: true,
    queryParamName: 'api_key',
  },
});

/**
 * Middleware for OAuth 2.0 introspection (opaque tokens)
 */
const oauthMiddleware = createAuthMiddleware({
  validator: async (token, context) => {
    return await introspector.introspect(token);
  },
  roleMapper: (claims) => claims.roles || [],
  providerName: 'oauth',
  extraction: {
    fromHeader: true,
  },
  rateLimiting: {
    enabled: true,
    rateLimiter,
  },
});

// ============================================================================
// Step 5: Define Protected Function Handlers
// ============================================================================

/**
 * Public endpoint - no authentication required
 */
const publicHandler = optionalAuthentication(
  auth.providers.entra.validate,
  (claims) => auth.providers.entra.mapRoles(claims),
  'entra'
)(async (input, context) => {
  if (context.user.isAuthenticated) {
    return {
      message: `Hello, ${context.user.email || context.user.id}!`,
      authenticated: true,
      roles: context.user.roles,
    };
  } else {
    return {
      message: 'Hello, guest!',
      authenticated: false,
    };
  }
});

/**
 * Protected endpoint - requires authentication
 */
const protectedHandler = requireAuthentication(
  auth.providers.entra.validate,
  (claims) => auth.providers.entra.mapRoles(claims),
  'entra'
)(async (input, context) => {
  return {
    message: 'This is protected content',
    user: {
      id: context.user.id,
      email: context.user.email,
      roles: context.user.roles,
    },
    timestamp: new Date().toISOString(),
  };
});

/**
 * Admin-only endpoint - requires 'admin' role
 */
const adminHandler = requireRoles(
  auth.providers.entra.validate,
  ['admin'],
  (claims) => auth.providers.entra.mapRoles(claims),
  'entra'
)(async (input, context) => {
  return {
    message: 'Admin access granted',
    user: context.user.id,
    action: 'view-admin-dashboard',
  };
});

/**
 * Multi-role endpoint - requires 'admin' OR 'moderator' OR 'editor' role
 */
const editorHandler = requireRoles(
  auth.providers.entra.validate,
  ['admin', 'moderator', 'editor'],
  (claims) => auth.providers.entra.mapRoles(claims),
  'entra'
)(async (input: { documentId: string }, context) => {
  return {
    message: 'Document edited successfully',
    documentId: input.documentId,
    editedBy: context.user.id,
    timestamp: new Date().toISOString(),
  };
});

/**
 * Custom authorization - only allow users from engineering department
 */
const engineeringHandler = createAuthMiddleware({
  validator: auth.providers.entra.validate,
  roleMapper: (claims) => auth.providers.entra.mapRoles(claims),
  providerName: 'entra',
  authorization: {
    customCheck: (user) => {
      // Custom business logic: Check department claim
      return user.claims.department === 'engineering';
    },
  },
})(async (input, context) => {
  return {
    message: 'Engineering resource accessed',
    user: context.user.id,
    department: context.user.claims.department,
  };
});

/**
 * Service-to-service endpoint - requires API key
 */
const serviceHandler = requireAuthentication(
  auth.providers.apiKeys.validate,
  (claims) => auth.providers.apiKeys.mapRoles(claims),
  'apiKeys'
)(async (input: { jobId: string }, context) => {
  return {
    message: 'Job processed',
    jobId: input.jobId,
    processedBy: context.user.id,
    timestamp: new Date().toISOString(),
  };
});

/**
 * OAuth endpoint using introspection for opaque tokens
 */
const oauthHandler = oauthMiddleware(async (input, context) => {
  return {
    message: 'OAuth access granted',
    user: {
      id: context.user.id,
      email: context.user.email,
      scopes: context.user.claims.scope?.split(' ') || [],
    },
    fromCache: context.user.claims.fromCache,
  };
});

// ============================================================================
// Step 6: Define Backend with Protected Endpoints
// ============================================================================

const backend = defineBackend({
  name: 'secure-api',

  // Attach authentication
  auth,

  // Define function endpoints
  functions: {
    // Public endpoints
    '/public/info': {
      handler: publicHandler,
      method: 'GET',
    },

    // Protected endpoints (require authentication)
    '/api/profile': {
      handler: protectedHandler,
      method: 'GET',
    },

    '/api/documents/:id': {
      handler: protectedHandler,
      method: 'GET',
    },

    // Admin endpoints (require admin role)
    '/admin/dashboard': {
      handler: adminHandler,
      method: 'GET',
    },

    '/admin/users': {
      handler: adminHandler,
      method: 'GET',
    },

    // Editor endpoints (require editor, moderator, or admin role)
    '/api/documents/:id/edit': {
      handler: editorHandler,
      method: 'POST',
    },

    // Department-specific endpoints
    '/engineering/tools': {
      handler: engineeringHandler,
      method: 'GET',
    },

    // Service endpoints (require API key)
    '/service/process-job': {
      handler: serviceHandler,
      method: 'POST',
    },

    // OAuth endpoints (opaque token introspection)
    '/oauth/resource': {
      handler: oauthHandler,
      method: 'GET',
    },
  },
});

// ============================================================================
// Step 7: Testing the Authentication Flow
// ============================================================================

/**
 * Example test scenarios
 */
export async function testAuthFlow() {
  console.log('=== Testing Complete Authentication Flow ===\n');

  // Test 1: Public endpoint without authentication
  console.log('Test 1: Public endpoint (no auth)');
  try {
    const result = await publicHandler(
      {},
      {
        user: { isAuthenticated: false, id: 'anonymous', roles: [], claims: {} } as any,
      }
    );
    console.log('✓ Success:', result);
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
  }

  // Test 2: Public endpoint with authentication
  console.log('\nTest 2: Public endpoint (with auth)');
  try {
    const result = await publicHandler(
      {},
      {
        user: {
          isAuthenticated: true,
          id: 'user-123',
          email: 'john@example.com',
          roles: ['user'],
          claims: {},
        } as any,
      }
    );
    console.log('✓ Success:', result);
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
  }

  // Test 3: Protected endpoint with valid authentication
  console.log('\nTest 3: Protected endpoint (valid auth)');
  try {
    const result = await protectedHandler(
      {},
      {
        user: {
          isAuthenticated: true,
          id: 'user-123',
          email: 'john@example.com',
          roles: ['user'],
          claims: {},
        } as any,
      }
    );
    console.log('✓ Success:', result);
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
  }

  // Test 4: Admin endpoint with admin role
  console.log('\nTest 4: Admin endpoint (admin role)');
  try {
    const result = await adminHandler(
      {},
      {
        user: {
          isAuthenticated: true,
          id: 'admin-456',
          email: 'admin@example.com',
          roles: ['admin', 'user'],
          claims: {},
        } as any,
      }
    );
    console.log('✓ Success:', result);
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
  }

  // Test 5: Editor endpoint with editor role
  console.log('\nTest 5: Editor endpoint (editor role)');
  try {
    const result = await editorHandler(
      { documentId: 'doc-123' },
      {
        user: {
          isAuthenticated: true,
          id: 'editor-789',
          email: 'editor@example.com',
          roles: ['editor', 'user'],
          claims: {},
        } as any,
      }
    );
    console.log('✓ Success:', result);
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
  }

  // Test 6: Service endpoint with API key
  console.log('\nTest 6: Service endpoint (API key)');
  try {
    const result = await serviceHandler(
      { jobId: 'job-123' },
      {
        user: {
          isAuthenticated: true,
          id: 'service-1',
          roles: ['service', 'read'],
          claims: {},
        } as any,
      }
    );
    console.log('✓ Success:', result);
  } catch (error: any) {
    console.log('✗ Failed:', error.message);
  }

  console.log('\n=== All Tests Complete ===');
}

// ============================================================================
// Step 8: Export for Use
// ============================================================================

export {
  backend,
  auth,
  introspector,
  rateLimiter,
  publicHandler,
  protectedHandler,
  adminHandler,
  editorHandler,
  engineeringHandler,
  serviceHandler,
  oauthHandler,
};

// Run tests if executed directly
if (require.main === module) {
  testAuthFlow().catch(console.error);
}
