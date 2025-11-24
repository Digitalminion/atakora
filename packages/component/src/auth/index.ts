/**
 * Authentication System Public API
 *
 * @packageDocumentation
 */

// ============================================================================
// Main Function
// ============================================================================

export { defineAuth } from './define-auth';

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Core types
  AuthDefinition,
  AuthObject,
  AuthMetadata,
  ProcessedAuthProvider,
  AuthProvider,
  AuthProviderBuilder,
  AuthProviderConfig,

  // Token validation
  TokenValidator,
  TokenValidationResult,
  ValidationContext,

  // Role mapping
  RoleMapper,

  // Session and MFA
  SessionConfig,
  MfaConfig,

  // User context
  UserContext,
  AuthState,

  // API Keys
  ApiKey,
} from './types';

export type {
  // JWT types
  JwtPayload,
  // Token validation options
  TokenValidationOptions,
} from './token-validator';

// ============================================================================
// Helper Functions
// ============================================================================

export {
  // Auth object helpers
  isAuthObject,
  getAuthProviderNames,
  getPrimaryProvider,
  getAuthProvider,
  hasAuthProviderType,
  getAuthProvidersByType,
  validateAuthForProduction,
} from './define-auth';

export {
  // Validation utilities
  validateAuthDefinition,
  isValidProviderName,
  validateRequiredFields,
  validateConfigValue,

  // Processing utilities
  processProviders,
  processProvider,
  determinePrimaryProvider,

  // Provider utilities
  getProviderTypes,
  hasProviderType,
  getProviderByName,
  getProviderByType,

  // Token utilities
  extractBearerToken,
  parseJwtClaims,
  isTokenExpired,
} from './utils';

// ============================================================================
// Token Validation Utilities
// ============================================================================

export {
  // Token extraction and decoding
  decodeJwt,
  validateJwtSignature,

  // Claim extraction
  extractUserId,
  extractEmail,

  // Token validity checks
  isTokenNotYetValid,
  // isTokenExpired is already exported from utils
} from './token-validator';

// ============================================================================
// Role Mapping Utilities
// ============================================================================

export {
  // Default role mappers
  defaultEntraRoleMapper,
  defaultApiKeyRoleMapper,

  // Mapper composition
  combineRoleMappers,

  // Role filtering
  filterRoles,
  createFilteredMapper,

  // Role transformation
  transformRoles,
  createTransformedMapper,

  // Group mapping
  mapGroupsToRoles,
  mapGroupsToRolesWithFallback,

  // Utility mappers
  staticRoles,
  emptyRoles,
  conditionalRoles,
} from './role-mapper';

// ============================================================================
// Error Classes
// ============================================================================

export {
  AuthError,
  AuthDefinitionError,
  TokenValidationError,
  RoleMappingError,
  ProviderConfigError,
  SessionConfigError,
  MfaConfigError,
  createAuthError,
  formatAuthError,
  AuthErrorMessages,
} from './errors';

// ============================================================================
// Authentication Providers
// ============================================================================

// API Keys Provider
export { ApiKeysBuilder, apiKeys } from './providers/api-keys';
export type { ApiKeysConfig } from './providers/api-keys';

// Entra ID Provider
export { EntraIdBuilder, entra } from './providers/entra';
export type { EntraIdConfig } from './providers/entra';

// Custom Provider
export { CustomAuthBuilder, custom } from './providers/custom';
export type { CustomAuthConfig, TokenExtractor } from './providers/custom';

// Provider namespace for convenient usage
export { auth } from './providers';

// ============================================================================
// Session and MFA Configuration Builders
// ============================================================================

export { SessionBuilder, session } from './session';
export { MfaBuilder, mfa } from './mfa';

// ============================================================================
// Rate Limiting
// ============================================================================

export {
  AuthRateLimiter,
  createLoginRateLimiter,
  createApiRateLimiter,
  createStrictRateLimiter,
} from './rate-limiter';

export type { RateLimitConfig, RateLimitResult } from './rate-limiter';

// ============================================================================
// Security Audit Logging
// ============================================================================

export {
  SecurityAuditor,
  createConsoleAuditor,
  createHighRiskAuditor,
  createMultiHandlerAuditor,
} from './audit';

export type {
  SecurityEvent,
  SecurityEventType,
  RiskLevel,
  SecurityEventHandler,
  SecurityAuditorOptions,
} from './audit';

// ============================================================================
// User Context and Authorization Integration (Task 9)
// ============================================================================

export type { ExtendedUserContext, UserContext as BaseUserContext } from './user-context';

export {
  createUserContext,
  getAnonymousUserContext,
  isExtendedUserContext,
  isUserContext,
} from './user-context';

export type {
  AuthorizationRuntimeContext,
  AuthorizationRule as AuthAuthorizationRule,
} from './authorization-integration';

export {
  checkOwnership,
  checkGroups,
  checkAuthenticated,
  checkPublic,
  evaluateAuthorizationRule,
  evaluateAuthorizationRules,
} from './authorization-integration';

// ============================================================================
// Token Introspection (OAuth 2.0 RFC 7662)
// ============================================================================

export {
  TokenIntrospector,
  createEntraIntrospector,
  createOAuthIntrospector,
} from './token-introspection';

export type {
  TokenIntrospectionConfig,
  IntrospectionResponse,
  IntrospectionResult,
} from './token-introspection';

// ============================================================================
// Token Cache (Week 2)
// ============================================================================

export { TokenCache } from './token-cache';
export type { TokenCacheOptions, CacheStats } from './token-cache';

// ============================================================================
// Type Inference Utilities
// ============================================================================

export type {
  // Provider type extraction
  ExtractProviderConfig,
  ExtractAllConfigs,
  InferAuthProviders,
  InferPrimaryProvider,
  InferProviderNames,
  InferProviderTypes,

  // Specific provider filters
  InferEntraIdProviders,
  InferApiKeysProviders,
  InferCustomProviders,

  // Utility types
  ProviderConfigByName,
  ProviderByName,
  ProviderNamesArray,
  HasProvider,
  OptionalProviders,
  RequireProviders,

  // Provider filters
  FilterProvidersByType,
  ProviderNamesByType,

  // Builder inference
  InferBuilderFromConfig,
  ExtractBuilders,

  // Utility
  Expand as AuthExpand,
} from './type-inference';

export {
  // Type guards for providers
  isEntraIdProvider,
  isApiKeysProvider,
  isCustomProvider,
  isProviderType,

  // Type guards for configs
  isEntraIdConfig,
  isApiKeysConfig,
  isCustomConfig,
} from './type-inference';

// ============================================================================
// Note for Provider Implementations
// ============================================================================

/**
 * Authentication provider builders:
 * - auth.entra() - Entra ID provider ✅ (Task 2)
 * - auth.apiKeys() - API Keys provider ✅ (Task 3)
 * - auth.custom() - Custom auth provider ✅ (Task 8)
 *
 * These extend the AuthProviderBuilder union type.
 *
 * Authorization Integration: ✅ (Task 9)
 * - User context creation and helpers
 * - Authorization rule evaluation utilities
 * - Runtime integration between auth and authz
 */
