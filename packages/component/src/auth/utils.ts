/**
 * Utility Functions for Authentication System
 *
 * Provides validation, processing, and helper functions for
 * authentication configuration and runtime operations.
 */

import type { AuthDefinition, AuthProviderBuilder, ProcessedAuthProvider } from './types';
import { AuthDefinitionError, AuthErrorMessages, createAuthError } from './errors';

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate authentication definition structure
 *
 * @param definition - Authentication definition to validate
 * @throws {AuthDefinitionError} If validation fails
 *
 * @example
 * ```typescript
 * validateAuthDefinition({
 *   Primary: auth.entra(),
 *   ApiKeys: auth.apiKeys()
 * });
 * ```
 */
export function validateAuthDefinition(definition: AuthDefinition): void {
  // Check for empty definition
  if (!definition || typeof definition !== 'object') {
    throw new AuthDefinitionError(AuthErrorMessages.EMPTY_DEFINITION);
  }

  const providerNames = Object.keys(definition);

  // Check for at least one provider
  if (providerNames.length === 0) {
    throw new AuthDefinitionError(AuthErrorMessages.NO_PROVIDERS);
  }

  // Validate each provider name
  const seenNames = new Set<string>();
  for (const name of providerNames) {
    // Check for duplicates
    if (seenNames.has(name)) {
      throw new AuthDefinitionError(AuthErrorMessages.DUPLICATE_PROVIDER(name));
    }
    seenNames.add(name);

    // Validate PascalCase naming
    if (!isValidProviderName(name)) {
      throw new AuthDefinitionError(AuthErrorMessages.INVALID_PROVIDER_NAME(name));
    }

    // Validate provider is a builder object
    const provider = definition[name];
    if (!provider || typeof provider !== 'object') {
      throw createAuthError(
        'provider',
        `Provider "${name}" must be a valid authentication provider builder`,
        { provider: name, type: typeof provider }
      );
    }

    // Check for _build method (all builders must have this)
    if (typeof (provider as any)._build !== 'function') {
      throw createAuthError(
        'provider',
        `Provider "${name}" is not a valid authentication provider builder. Use auth.entra(), auth.apiKeys(), or auth.custom()`,
        { provider: name }
      );
    }
  }
}

/**
 * Check if provider name follows PascalCase convention
 *
 * @param name - Provider name to check
 * @returns True if valid PascalCase
 */
export function isValidProviderName(name: string): boolean {
  // Must start with uppercase letter
  // Can contain letters and numbers
  // No spaces or special characters except numbers
  const pascalCaseRegex = /^[A-Z][a-zA-Z0-9]*$/;
  return pascalCaseRegex.test(name);
}

// ============================================================================
// Processing Functions
// ============================================================================

/**
 * Process all authentication providers
 *
 * @param definition - Authentication definition with providers
 * @returns Processed providers map
 * @throws {AuthError} If processing fails
 */
export function processProviders(
  definition: AuthDefinition
): Record<string, ProcessedAuthProvider> {
  const processed: Record<string, ProcessedAuthProvider> = {};

  for (const [name, builder] of Object.entries(definition)) {
    try {
      processed[name] = processProvider(name, builder);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw createAuthError('provider', AuthErrorMessages.PROVIDER_BUILD_FAILED(name, message), {
        provider: name,
        error: message,
      });
    }
  }

  return processed;
}

/**
 * Process a single authentication provider
 *
 * @param name - Provider name
 * @param builder - Provider builder instance
 * @returns Processed provider
 */
export function processProvider(name: string, builder: AuthProviderBuilder): ProcessedAuthProvider {
  // Call the internal _build method to get configuration
  const config = (builder as any)._build();

  if (!config || !config.type) {
    throw createAuthError(
      'provider',
      `Provider "${name}" build failed: missing type in configuration`,
      { provider: name }
    );
  }

  // Extract validation and role mapping functions if they exist
  const configAny = config as any;
  const validate = configAny.tokenValidator || configAny.validate;
  const mapRoles = configAny.roleMapper || configAny.mapRoles;

  // Create processed provider
  const processed: ProcessedAuthProvider = {
    type: config.type,
    config: { ...config } as any,
    ...(validate && { validate }),
    ...(mapRoles && { mapRoles }),
  };

  // Clean up internal properties from config
  const processedConfigAny = processed.config as any;
  delete processedConfigAny.tokenValidator;
  delete processedConfigAny.validate;
  delete processedConfigAny.roleMapper;
  delete processedConfigAny.mapRoles;

  return processed;
}

/**
 * Determine the primary authentication provider
 *
 * @param definition - Authentication definition
 * @returns Name of primary provider (first one defined)
 */
export function determinePrimaryProvider(definition: AuthDefinition): string {
  const providerNames = Object.keys(definition);

  if (providerNames.length === 0) {
    throw new AuthDefinitionError(AuthErrorMessages.NO_PROVIDERS);
  }

  // Return first provider as primary
  // In future, we could support explicit primary marking
  return providerNames[0];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract provider types from processed providers
 *
 * @param providers - Processed providers map
 * @returns Array of provider types
 */
export function getProviderTypes(providers: Record<string, ProcessedAuthProvider>): string[] {
  return Object.values(providers).map((p) => p.type);
}

/**
 * Check if a provider type is enabled
 *
 * @param providers - Processed providers map
 * @param type - Provider type to check
 * @returns True if provider type exists
 */
export function hasProviderType(
  providers: Record<string, ProcessedAuthProvider>,
  type: string
): boolean {
  return Object.values(providers).some((p) => p.type === type);
}

/**
 * Get provider by name
 *
 * @param providers - Processed providers map
 * @param name - Provider name
 * @returns Provider or undefined
 */
export function getProviderByName(
  providers: Record<string, ProcessedAuthProvider>,
  name: string
): ProcessedAuthProvider | undefined {
  return providers[name];
}

/**
 * Get provider by type
 *
 * @param providers - Processed providers map
 * @param type - Provider type
 * @returns First provider of given type or undefined
 */
export function getProviderByType(
  providers: Record<string, ProcessedAuthProvider>,
  type: string
): ProcessedAuthProvider | undefined {
  return Object.values(providers).find((p) => p.type === type);
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate required configuration fields
 *
 * @param config - Configuration object
 * @param required - Required field names
 * @param provider - Provider name for error context
 * @throws {ProviderConfigError} If required fields are missing
 */
export function validateRequiredFields(
  config: Record<string, any>,
  required: string[],
  provider: string
): void {
  for (const field of required) {
    if (!config[field]) {
      throw createAuthError(
        'provider',
        AuthErrorMessages.MISSING_REQUIRED_CONFIG(provider, field),
        { provider, field, config }
      );
    }
  }
}

/**
 * Validate configuration value
 *
 * @param value - Value to validate
 * @param validator - Validation function
 * @param provider - Provider name
 * @param field - Field name
 * @throws {ProviderConfigError} If validation fails
 */
export function validateConfigValue(
  value: any,
  validator: (v: any) => boolean,
  provider: string,
  field: string
): void {
  if (!validator(value)) {
    throw createAuthError(
      'provider',
      AuthErrorMessages.INVALID_CONFIG_VALUE(provider, field, value),
      { provider, field, value }
    );
  }
}

// ============================================================================
// Token Helpers
// ============================================================================

/**
 * Extract bearer token from authorization header
 *
 * @param authHeader - Authorization header value
 * @returns Token or null if not found
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Parse JWT claims without validation (for debugging)
 * Note: This does NOT validate the token, only extracts claims
 *
 * @param token - JWT token
 * @returns Claims object or null if invalid format
 */
export function parseJwtClaims(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Check if token is expired based on exp claim
 *
 * @param claims - JWT claims object
 * @returns True if expired
 */
export function isTokenExpired(claims: Record<string, any>): boolean {
  if (!claims.exp) return false;

  const now = Math.floor(Date.now() / 1000);
  return claims.exp < now;
}
