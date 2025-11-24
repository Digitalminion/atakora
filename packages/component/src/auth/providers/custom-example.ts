/**
 * Custom Authentication Provider Usage Examples
 *
 * This file demonstrates various real-world use cases for the custom
 * authentication provider.
 */

import { defineAuth, auth } from '../index';
import type { TokenValidator, RoleMapper } from '../types';

// ============================================================================
// Example 1: Simple Custom Authentication
// ============================================================================

/**
 * Basic custom authentication with a header and simple validation
 */
export const simpleCustomAuth = defineAuth({
  Primary: auth
    .custom()
    .header('X-Custom-Auth')
    .validateTokens(async (token) => {
      // Your custom validation logic
      if (token === 'valid-token') {
        return {
          valid: true,
          claims: {
            sub: 'user-123',
            email: 'user@example.com',
          },
          userId: 'user-123',
          email: 'user@example.com',
        };
      }

      return { valid: false, error: 'Invalid token' };
    })
    .mapRoles((claims) => ['user']),
});

// ============================================================================
// Example 2: Cookie-Based Authentication
// ============================================================================

/**
 * Cookie-based authentication with custom token extraction
 */
export const cookieAuth = defineAuth({
  Primary: auth
    .custom()
    .extractToken((req) => {
      // Extract token from cookies
      return req.cookies?.authToken || null;
    })
    .validateTokens(async (token) => {
      // Validate session token
      // In a real app, you'd look up the session in your store
      return {
        valid: true,
        claims: { sessionId: token, sub: 'user-123' },
        userId: 'user-123',
      };
    })
    .mapRoles(() => ['authenticated']),
});

// ============================================================================
// Example 3: Third-Party Auth Integration
// ============================================================================

/**
 * Integration with a third-party authentication service
 */
const thirdPartyAuthService = {
  async verify(token: string, context?: any) {
    // Mock implementation - replace with actual third-party API call
    return {
      valid: true,
      user: {
        id: 'user-123',
        email: 'user@example.com',
        roles: ['admin', 'editor'],
      },
    };
  },
};

export const thirdPartyAuth = defineAuth({
  Primary: auth
    .custom()
    .validateTokens(async (token, context) => {
      // Call third-party authentication service
      const result = await thirdPartyAuthService.verify(token, {
        ip: context?.ip,
        userAgent: context?.userAgent,
      });

      if (!result.valid) {
        return { valid: false, error: 'Authentication failed' };
      }

      return {
        valid: true,
        claims: result.user,
        userId: result.user.id,
        email: result.user.email,
      };
    })
    .mapRoles((claims) => claims.roles || []),
});

// ============================================================================
// Example 4: Multi-Source Token Extraction
// ============================================================================

/**
 * Extract authentication token from multiple sources with fallback
 */
export const multiSourceAuth = defineAuth({
  Primary: auth
    .custom()
    .extractToken((req) => {
      // Try Authorization header first (Bearer token)
      const authHeader = req.headers?.['authorization'];
      if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }

      // Fallback to cookie
      if (req.cookies?.session) {
        return req.cookies.session;
      }

      // Fallback to query parameter (not recommended for production)
      return req.query?.token || null;
    })
    .validateTokens(async (token) => {
      // Validate the token regardless of source
      return {
        valid: true,
        claims: { sub: 'user-123' },
        userId: 'user-123',
      };
    })
    .mapRoles(() => ['user']),
});

// ============================================================================
// Example 5: API Key Style Authentication
// ============================================================================

/**
 * API key authentication using custom provider
 * (Alternative to the built-in auth.apiKeys() provider)
 */
const apiKeyDatabase = {
  'key-123': { userId: 'service-1', roles: ['service', 'read'] },
  'key-456': { userId: 'admin-cli', roles: ['admin', 'service', 'write'] },
};

export const apiKeyAuth = defineAuth({
  Primary: auth
    .custom()
    .header('X-API-Key')
    .validateTokens(async (token) => {
      // Look up API key in database
      const keyData = apiKeyDatabase[token as keyof typeof apiKeyDatabase];

      if (!keyData) {
        return { valid: false, error: 'Invalid API key' };
      }

      return {
        valid: true,
        claims: {
          sub: keyData.userId,
          roles: keyData.roles,
        },
        userId: keyData.userId,
      };
    })
    .mapRoles((claims) => claims.roles || []),
});

// ============================================================================
// Example 6: Complex Role Mapping
// ============================================================================

/**
 * Complex role mapping based on multiple claim attributes
 */
export const complexRoleAuth = defineAuth({
  Primary: auth
    .custom()
    .validateTokens(async (token) => ({
      valid: true,
      claims: {
        sub: 'user-123',
        email: 'user@example.com',
        permissions: ['read', 'write', 'admin'],
        department: 'engineering',
        isActive: true,
        tier: 'premium',
      },
    }))
    .mapRoles((claims) => {
      const roles: string[] = [];

      // Map permissions to roles
      if (claims.permissions?.includes('admin')) {
        roles.push('admin');
      }
      if (claims.permissions?.includes('write')) {
        roles.push('editor');
      }
      if (claims.permissions?.includes('read')) {
        roles.push('viewer');
      }

      // Add department-based roles
      if (claims.department === 'engineering') {
        roles.push('engineer');
      }
      if (claims.department === 'sales') {
        roles.push('sales');
      }

      // Add status-based roles
      if (claims.isActive) {
        roles.push('active-user');
      }

      // Add tier-based roles
      if (claims.tier === 'premium') {
        roles.push('premium-user');
      }

      return roles;
    }),
});

// ============================================================================
// Example 7: Context-Aware Validation
// ============================================================================

/**
 * Use request context for additional validation
 */
export const contextAwareAuth = defineAuth({
  Primary: auth
    .custom()
    .validateTokens(async (token, context) => {
      // Validate token format
      if (!token || token.length < 10) {
        return { valid: false, error: 'Invalid token format' };
      }

      // Use context for additional validation
      const ip = context?.ip;
      const userAgent = context?.userAgent;

      // In a real app, you might check IP whitelist, rate limiting, etc.
      if (!ip || !userAgent) {
        return { valid: false, error: 'Missing request context' };
      }

      return {
        valid: true,
        claims: {
          sub: 'user-123',
          ip,
          userAgent,
        },
        userId: 'user-123',
      };
    })
    .mapRoles(() => ['user']),
});

// ============================================================================
// Example 8: JWT-Based Custom Auth
// ============================================================================

/**
 * Custom JWT validation (when you need more control than Entra ID provider)
 */
export const customJwtAuth = defineAuth({
  Primary: auth
    .custom()
    .validateTokens(async (token) => {
      // Custom JWT validation logic
      // In a real app, you'd use a JWT library and verify signature
      try {
        // Mock JWT decode
        const parts = token.split('.');
        if (parts.length !== 3) {
          return { valid: false, error: 'Invalid JWT format' };
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));

        // Custom claims validation
        if (payload.exp && payload.exp < Date.now() / 1000) {
          return { valid: false, error: 'Token expired' };
        }

        return {
          valid: true,
          claims: payload,
          userId: payload.sub,
          email: payload.email,
        };
      } catch (error) {
        return { valid: false, error: 'Token validation failed' };
      }
    })
    .mapRoles((claims) => claims.roles || []),
});

// ============================================================================
// Example 9: Mixed Provider Setup
// ============================================================================

/**
 * Use custom auth alongside built-in providers
 */
export const mixedProviderAuth = defineAuth({
  // Primary: Standard Entra ID for user authentication
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID || 'tenant-id')
    .clientId(process.env.AZURE_CLIENT_ID || 'client-id'),

  // ApiKeys: Built-in API keys for service accounts
  ApiKeys: auth
    .apiKeys()
    .enable()
    .keys([
      {
        id: 'service-1',
        secret: process.env.SERVICE_API_KEY || 'secret',
        roles: ['service'],
      },
    ]),

  // Custom: Custom authentication for legacy systems
  Custom: auth
    .custom()
    .header('X-Legacy-Auth')
    .validateTokens(async (token) => {
      // Validate legacy system tokens
      return {
        valid: true,
        claims: { sub: 'legacy-user' },
      };
    })
    .mapRoles(() => ['legacy-user']),
});
