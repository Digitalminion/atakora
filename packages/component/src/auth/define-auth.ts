/**
 * Authentication Definition
 *
 * Main function for defining application authentication and authorization.
 */

import type { AuthDefinition, AuthObject, ProcessedAuthProvider, AuthMetadata } from './types';
import { validateAuthDefinition, processProviders, determinePrimaryProvider } from './utils';

// ============================================================================
// Authentication Definition Function
// ============================================================================

/**
 * Define application authentication configuration
 *
 * Creates an authentication object containing all auth providers and their configurations.
 * This is the single source of truth for your application's authentication system.
 *
 * Auto-generates:
 * - Function App middleware
 * - Token validation logic
 * - Role mapping rules
 * - Session management
 * - MFA requirements
 *
 * @param definition - Authentication definition with providers
 * @returns Authentication object with metadata and type information
 *
 * @example
 * ```typescript
 * import { defineAuth, auth } from '@atakora/component';
 *
 * export const authentication = defineAuth({
 *   // Primary provider (Entra ID)
 *   Primary: auth.entra()
 *     .tenant(process.env.AZURE_TENANT_ID!)
 *     .clientId(process.env.AZURE_CLIENT_ID!)
 *     .audience(process.env.AZURE_AUDIENCE!)
 *     .mapRoles(claims => {
 *       const groups = claims.groups || [];
 *       return groups.map(g => g.name);
 *     }),
 *
 *   // Secondary provider (API Keys)
 *   ApiKeys: auth.apiKeys()
 *     .enable()
 *     .keys([
 *       { id: 'service-1', secret: process.env.API_KEY_1!, roles: ['service'] }
 *     ])
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Custom authentication provider
 * export const authentication = defineAuth({
 *   Custom: auth.custom()
 *     .validateTokens(async (token) => {
 *       // Custom token validation logic
 *       const result = await validateWithExternalService(token);
 *       return {
 *         valid: result.valid,
 *         claims: result.claims,
 *         userId: result.sub,
 *         email: result.email
 *       };
 *     })
 *     .mapRoles(claims => {
 *       // Map claims to application roles
 *       return claims.roles || [];
 *     })
 * });
 * ```
 */
export function defineAuth<T extends AuthDefinition>(definition: T): AuthObject<T> {
  // Validate authentication definition
  validateAuthDefinition(definition);

  // Process all providers
  const providers = processProviders(definition) as {
    [K in keyof T]: ProcessedAuthProvider;
  };

  // Determine primary provider (first one defined)
  const primaryProvider = determinePrimaryProvider(definition) as keyof T;

  // Create metadata
  const metadata: AuthMetadata = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    providerNames: Object.keys(definition),
  };

  // Create and return auth object
  const authObject: AuthObject<T> = {
    definition,
    providers,
    primaryProvider,
    _metadata: metadata,
    _raw: definition,
  };

  return authObject;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an object is a valid AuthObject
 *
 * @param obj - Object to check
 * @returns True if valid AuthObject
 */
export function isAuthObject(obj: any): obj is AuthObject<any> {
  return !!(
    obj &&
    typeof obj === 'object' &&
    'definition' in obj &&
    'providers' in obj &&
    'primaryProvider' in obj &&
    '_metadata' in obj &&
    obj._metadata?.version === '1.0.0'
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get authentication provider names from auth object
 *
 * @param auth - Authentication object
 * @returns Array of provider names
 */
export function getAuthProviderNames<T extends AuthDefinition>(auth: AuthObject<T>): (keyof T)[] {
  return Object.keys(auth.providers) as (keyof T)[];
}

/**
 * Get primary authentication provider
 *
 * @param auth - Authentication object
 * @returns Primary provider configuration
 */
export function getPrimaryProvider<T extends AuthDefinition>(
  auth: AuthObject<T>
): ProcessedAuthProvider {
  return auth.providers[auth.primaryProvider];
}

/**
 * Get authentication provider by name
 *
 * @param auth - Authentication object
 * @param name - Provider name
 * @returns Provider configuration or undefined
 */
export function getAuthProvider<T extends AuthDefinition>(
  auth: AuthObject<T>,
  name: keyof T
): ProcessedAuthProvider | undefined {
  return auth.providers[name];
}

/**
 * Check if authentication has a specific provider type
 *
 * @param auth - Authentication object
 * @param type - Provider type to check
 * @returns True if provider type exists
 */
export function hasAuthProviderType<T extends AuthDefinition>(
  auth: AuthObject<T>,
  type: string
): boolean {
  return Object.values(auth.providers).some((p) => p.type === type);
}

/**
 * Get all providers of a specific type
 *
 * @param auth - Authentication object
 * @param type - Provider type
 * @returns Array of matching providers
 */
export function getAuthProvidersByType<T extends AuthDefinition>(
  auth: AuthObject<T>,
  type: string
): ProcessedAuthProvider[] {
  return Object.values(auth.providers).filter((p) => p.type === type);
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate that authentication is properly configured for production
 *
 * @param auth - Authentication object
 * @returns Validation result with any warnings or errors
 */
export function validateAuthForProduction<T extends AuthDefinition>(
  auth: AuthObject<T>
): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for at least one provider
  if (Object.keys(auth.providers).length === 0) {
    errors.push('No authentication providers configured');
  }

  // Check each provider
  for (const [name, provider] of Object.entries(auth.providers)) {
    // Check for token validation
    if (!provider.validate) {
      warnings.push(`Provider "${name}" has no token validation configured`);
    }

    // Check for role mapping
    if (!provider.mapRoles) {
      warnings.push(`Provider "${name}" has no role mapping configured`);
    }

    // Provider-specific checks
    if (provider.type === 'entra-id') {
      const config = provider.config as any;
      if (!config.tenant || !config.clientId) {
        errors.push(`Provider "${name}" (Entra ID) missing tenant or clientId`);
      }
    } else if (provider.type === 'api-keys') {
      const config = provider.config as any;
      if (!config.enabled) {
        warnings.push(`Provider "${name}" (API Keys) is not enabled`);
      }
      if (!config.keys || config.keys.length === 0) {
        errors.push(`Provider "${name}" (API Keys) has no keys configured`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  AuthObject,
  AuthDefinition,
  ProcessedAuthProvider,
  TokenValidator,
  RoleMapper,
  TokenValidationResult,
  UserContext,
  AuthState,
  AuthMetadata,
} from './types';
