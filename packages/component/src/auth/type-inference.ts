/**
 * Type Inference Utilities for Authentication System
 *
 * Helper types and functions for inferring TypeScript types from auth definitions.
 * Provides compile-time type safety and IntelliSense support for authentication
 * providers, configs, and user contexts.
 *
 * Mirrors the pattern established in schema/type-inference.ts to maintain
 * consistency across the codebase.
 */

import type {
  AuthDefinition,
  AuthObject,
  ProcessedAuthProvider,
  AuthProviderBuilder,
} from './types';
import type { EntraIdConfig } from './providers/entra';
import type { ApiKeysConfig } from './providers/api-keys';
import type { CustomAuthConfig } from './providers/custom';

// ============================================================================
// Provider Type Inference
// ============================================================================

/**
 * Infer provider config type from builder
 *
 * Extracts the configuration type that will be produced by a provider builder.
 * This enables type-safe access to provider configs.
 *
 * @example
 * ```typescript
 * const builder = auth.entra().tenant('t').clientId('c');
 * type Config = ExtractProviderConfig<typeof builder>;
 * // Config = EntraIdConfig
 * ```
 */
export type ExtractProviderConfig<T> = T extends { _build(): infer Config } ? Config : never;

/**
 * Infer all provider configs from auth definition
 *
 * Maps each provider in the definition to its configuration type.
 * Useful for accessing provider configs in a type-safe manner.
 *
 * @example
 * ```typescript
 * const auth = defineAuth({
 *   Primary: auth.entra().tenant('t').clientId('c'),
 *   ApiKeys: auth.apiKeys().enable().keys([]),
 * });
 *
 * type Configs = ExtractAllConfigs<typeof auth.definition>;
 * // Configs = {
 * //   Primary: EntraIdConfig;
 * //   ApiKeys: ApiKeysConfig;
 * // }
 * ```
 */
export type ExtractAllConfigs<T extends AuthDefinition> = {
  [K in keyof T]: ExtractProviderConfig<T[K]>;
};

/**
 * Infer provider types from auth definition
 *
 * Creates a mapped type of ProcessedAuthProvider with strongly-typed configs.
 * This is the main type used for provider access in AuthObject.
 *
 * @example
 * ```typescript
 * const auth = defineAuth({
 *   Primary: auth.entra().tenant('t').clientId('c'),
 * });
 *
 * type Providers = InferAuthProviders<typeof auth.definition>;
 * // Providers = {
 * //   Primary: ProcessedAuthProvider & { config: EntraIdConfig };
 * // }
 * ```
 */
export type InferAuthProviders<T extends AuthDefinition> = {
  [K in keyof T]: ProcessedAuthProvider & {
    config: ExtractProviderConfig<T[K]>;
  };
};

/**
 * Infer primary provider name from auth definition
 *
 * Extracts the first key from the auth definition as the primary provider.
 * This matches the runtime behavior of determinePrimaryProvider().
 *
 * @example
 * ```typescript
 * const auth = defineAuth({
 *   Primary: auth.entra().tenant('t').clientId('c'),
 *   Secondary: auth.apiKeys().enable().keys([]),
 * });
 *
 * type Primary = InferPrimaryProvider<typeof auth.definition>;
 * // Primary = 'Primary'
 * ```
 */
export type InferPrimaryProvider<T extends AuthDefinition> = keyof T extends infer K ? K : never;

/**
 * Infer provider names as a union type
 *
 * Extracts all provider names from auth definition as a string union.
 * Useful for type-safe provider name checks.
 *
 * @example
 * ```typescript
 * const auth = defineAuth({
 *   Primary: auth.entra().tenant('t').clientId('c'),
 *   ApiKeys: auth.apiKeys().enable().keys([]),
 * });
 *
 * type ProviderNames = InferProviderNames<typeof auth.definition>;
 * // ProviderNames = 'Primary' | 'ApiKeys'
 * ```
 */
export type InferProviderNames<T extends AuthDefinition> = keyof T;

/**
 * Infer provider types as a union
 *
 * Extracts all provider type strings as a union.
 * Useful for runtime type checking.
 *
 * @example
 * ```typescript
 * const auth = defineAuth({
 *   Primary: auth.entra().tenant('t').clientId('c'),
 *   ApiKeys: auth.apiKeys().enable().keys([]),
 * });
 *
 * type Types = InferProviderTypes<typeof auth.definition>;
 * // Types = 'entra-id' | 'api-keys'
 * ```
 */
export type InferProviderTypes<T extends AuthDefinition> = ExtractProviderConfig<
  T[keyof T]
>['type'];

// ============================================================================
// Specific Provider Type Inference
// ============================================================================

/**
 * Infer Entra ID providers from auth definition
 *
 * Filters auth definition to only Entra ID providers.
 *
 * @example
 * ```typescript
 * const auth = defineAuth({
 *   Primary: auth.entra().tenant('t').clientId('c'),
 *   ApiKeys: auth.apiKeys().enable().keys([]),
 * });
 *
 * type EntraProviders = InferEntraIdProviders<typeof auth.definition>;
 * // EntraProviders = { Primary: EntraIdConfig }
 * ```
 */
export type InferEntraIdProviders<T extends AuthDefinition> = {
  [K in keyof T as ExtractProviderConfig<T[K]> extends EntraIdConfig
    ? K
    : never]: ExtractProviderConfig<T[K]>;
};

/**
 * Infer API Keys providers from auth definition
 *
 * Filters auth definition to only API Keys providers.
 */
export type InferApiKeysProviders<T extends AuthDefinition> = {
  [K in keyof T as ExtractProviderConfig<T[K]> extends ApiKeysConfig
    ? K
    : never]: ExtractProviderConfig<T[K]>;
};

/**
 * Infer Custom providers from auth definition
 *
 * Filters auth definition to only Custom providers.
 */
export type InferCustomProviders<T extends AuthDefinition> = {
  [K in keyof T as ExtractProviderConfig<T[K]> extends CustomAuthConfig
    ? K
    : never]: ExtractProviderConfig<T[K]>;
};

// ============================================================================
// Type Guards for Runtime Type Narrowing
// ============================================================================

/**
 * Type guard for Entra ID provider
 *
 * Checks if a provider is an Entra ID provider at runtime and narrows
 * the TypeScript type accordingly.
 *
 * @param provider - Provider to check
 * @returns True if provider is Entra ID
 *
 * @example
 * ```typescript
 * const provider = auth.providers.Primary;
 * if (isEntraIdProvider(provider)) {
 *   // provider.config is now typed as EntraIdConfig
 *   console.log(provider.config.tenant);
 * }
 * ```
 */
export function isEntraIdProvider(
  provider: ProcessedAuthProvider
): provider is ProcessedAuthProvider & { config: EntraIdConfig } {
  return provider.type === 'entra-id';
}

/**
 * Type guard for API Keys provider
 *
 * Checks if a provider is an API Keys provider at runtime and narrows
 * the TypeScript type accordingly.
 *
 * @param provider - Provider to check
 * @returns True if provider is API Keys
 *
 * @example
 * ```typescript
 * const provider = auth.providers.ApiKeys;
 * if (isApiKeysProvider(provider)) {
 *   // provider.config is now typed as ApiKeysConfig
 *   console.log(provider.config.keys.length);
 * }
 * ```
 */
export function isApiKeysProvider(
  provider: ProcessedAuthProvider
): provider is ProcessedAuthProvider & { config: ApiKeysConfig } {
  return provider.type === 'api-keys';
}

/**
 * Type guard for Custom auth provider
 *
 * Checks if a provider is a Custom provider at runtime and narrows
 * the TypeScript type accordingly.
 *
 * @param provider - Provider to check
 * @returns True if provider is Custom
 *
 * @example
 * ```typescript
 * const provider = auth.providers.Custom;
 * if (isCustomProvider(provider)) {
 *   // provider.config is now typed as CustomAuthConfig
 *   console.log(provider.config.headerName);
 * }
 * ```
 */
export function isCustomProvider(
  provider: ProcessedAuthProvider
): provider is ProcessedAuthProvider & { config: CustomAuthConfig } {
  return provider.type === 'custom';
}

/**
 * Type guard for specific provider type
 *
 * Generic type guard that checks for any provider type.
 * Useful for custom provider types or dynamic checking.
 *
 * @param provider - Provider to check
 * @param type - Provider type to check for
 * @returns True if provider matches type
 *
 * @example
 * ```typescript
 * if (isProviderType(provider, 'entra-id')) {
 *   // Handle Entra ID provider
 * }
 * ```
 */
export function isProviderType(provider: ProcessedAuthProvider, type: string): boolean {
  return provider.type === type;
}

// ============================================================================
// Provider Config Type Guards
// ============================================================================

/**
 * Type guard for Entra ID config
 *
 * Checks if a config object is an Entra ID configuration.
 *
 * @param config - Config to check
 * @returns True if config is EntraIdConfig
 */
export function isEntraIdConfig(config: any): config is EntraIdConfig {
  return Boolean(config && config.type === 'entra-id');
}

/**
 * Type guard for API Keys config
 *
 * Checks if a config object is an API Keys configuration.
 *
 * @param config - Config to check
 * @returns True if config is ApiKeysConfig
 */
export function isApiKeysConfig(config: any): config is ApiKeysConfig {
  return Boolean(config && config.type === 'api-keys');
}

/**
 * Type guard for Custom auth config
 *
 * Checks if a config object is a Custom auth configuration.
 *
 * @param config - Config to check
 * @returns True if config is CustomAuthConfig
 */
export function isCustomConfig(config: any): config is CustomAuthConfig {
  return Boolean(config && config.type === 'custom');
}

// ============================================================================
// Utility Types for Better IntelliSense
// ============================================================================

/**
 * Expand type for better IntelliSense display
 *
 * Forces TypeScript to expand type aliases for better IDE tooltips.
 *
 * @example
 * ```typescript
 * type MyType = Expand<InferAuthProviders<typeof authDef>>;
 * // Hovering shows full expanded type instead of alias
 * ```
 */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

/**
 * Extract provider config by name
 *
 * Gets the config type for a specific provider name.
 *
 * @example
 * ```typescript
 * type PrimaryConfig = ProviderConfigByName<typeof authDef, 'Primary'>;
 * // PrimaryConfig = EntraIdConfig
 * ```
 */
export type ProviderConfigByName<
  T extends AuthDefinition,
  Name extends keyof T,
> = ExtractProviderConfig<T[Name]>;

/**
 * Extract provider by name
 *
 * Gets the full provider type for a specific provider name.
 *
 * @example
 * ```typescript
 * type PrimaryProvider = ProviderByName<typeof auth, 'Primary'>;
 * // PrimaryProvider = ProcessedAuthProvider & { config: EntraIdConfig }
 * ```
 */
export type ProviderByName<
  T extends AuthObject<any>,
  Name extends keyof T['providers'],
> = T['providers'][Name];

/**
 * Extract all provider names as array type
 *
 * Creates a readonly array type of all provider names.
 *
 * @example
 * ```typescript
 * type Names = ProviderNamesArray<typeof auth>;
 * // Names = readonly ['Primary', 'ApiKeys']
 * ```
 */
export type ProviderNamesArray<T extends AuthObject<any>> = ReadonlyArray<keyof T['providers']>;

/**
 * Check if auth has specific provider
 *
 * Type-level check for provider existence.
 *
 * @example
 * ```typescript
 * type HasPrimary = HasProvider<typeof auth, 'Primary'>;
 * // HasPrimary = true
 *
 * type HasOther = HasProvider<typeof auth, 'Other'>;
 * // HasOther = false
 * ```
 */
export type HasProvider<
  T extends AuthObject<any>,
  Name extends string,
> = Name extends keyof T['providers'] ? true : false;

/**
 * Make specific providers optional
 *
 * Creates a new auth definition type with some providers optional.
 *
 * @example
 * ```typescript
 * type OptionalApiKeys = OptionalProviders<typeof authDef, 'ApiKeys'>;
 * // ApiKeys provider is now optional
 * ```
 */
export type OptionalProviders<T extends AuthDefinition, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Make specific providers required
 *
 * Creates a new auth definition type with some providers required.
 *
 * @example
 * ```typescript
 * type RequiredPrimary = RequireProviders<typeof authDef, 'Primary'>;
 * // Primary provider is now required
 * ```
 */
export type RequireProviders<T extends AuthDefinition, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

// ============================================================================
// Provider Filter Types
// ============================================================================

/**
 * Filter providers by type
 *
 * Creates a type with only providers of a specific type.
 *
 * @example
 * ```typescript
 * type EntraProviders = FilterProvidersByType<typeof auth, 'entra-id'>;
 * // Only Entra ID providers
 * ```
 */
export type FilterProvidersByType<T extends AuthObject<any>, Type extends string> = {
  [K in keyof T['providers'] as T['providers'][K] extends { config: { type: Type } }
    ? K
    : never]: T['providers'][K];
};

/**
 * Get provider names by type
 *
 * Extracts provider names that match a specific type.
 *
 * @example
 * ```typescript
 * type EntraNames = ProviderNamesByType<typeof auth, 'entra-id'>;
 * // Union of Entra ID provider names
 * ```
 */
export type ProviderNamesByType<
  T extends AuthObject<any>,
  Type extends string,
> = keyof FilterProvidersByType<T, Type>;

// ============================================================================
// Builder Type Inference
// ============================================================================

/**
 * Infer builder type from config
 *
 * Reverse inference: get builder type from config type.
 * Useful for factory functions and type composition.
 *
 * @example
 * ```typescript
 * type Builder = InferBuilderFromConfig<EntraIdConfig>;
 * // Builder = EntraIdBuilder
 * ```
 */
export type InferBuilderFromConfig<T> = T extends EntraIdConfig
  ? import('./providers/entra').EntraIdBuilder
  : T extends ApiKeysConfig
    ? import('./providers/api-keys').ApiKeysBuilder
    : T extends CustomAuthConfig
      ? import('./providers/custom').CustomAuthBuilder
      : never;

/**
 * Extract all builder types from definition
 *
 * Maps provider names to their builder types.
 *
 * @example
 * ```typescript
 * type Builders = ExtractBuilders<typeof authDef>;
 * // { Primary: EntraIdBuilder, ApiKeys: ApiKeysBuilder }
 * ```
 */
export type ExtractBuilders<T extends AuthDefinition> = {
  [K in keyof T]: T[K];
};
