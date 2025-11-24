/**
 * Multi-Provider Token Support
 *
 * Provides unified token validation across multiple authentication providers
 * including Entra ID, API keys, custom JWT issuers, service tokens, and anonymous access.
 *
 * @remarks
 * This module enables flexible authentication strategies by supporting multiple
 * token formats and validation mechanisms through a common interface.
 *
 * @packageDocumentation
 */

import type { TokenValidationResult, TokenValidator, ValidationContext } from './types';
import { validateJwtSignature, extractBearerToken, decodeJwt, type JWK, type TokenValidationOptions } from './token-validator';

// ============================================================================
// Types
// ============================================================================

/**
 * Token provider types
 */
export type TokenProviderType =
  | 'entra-id'
  | 'api-key'
  | 'custom-jwt'
  | 'service-to-service'
  | 'anonymous'
  | 'session';

/**
 * Base configuration for all token providers
 */
export interface BaseTokenProviderConfig {
  /**
   * Provider type identifier
   */
  readonly type: TokenProviderType;

  /**
   * Provider name for logging and debugging
   */
  readonly name: string;

  /**
   * Enable provider
   * @default true
   */
  readonly enabled?: boolean;
}

/**
 * Entra ID (Azure AD) token provider configuration
 */
export interface EntraIdTokenProviderConfig extends BaseTokenProviderConfig {
  readonly type: 'entra-id';

  /**
   * Expected issuer URL (Azure AD tenant)
   * @example 'https://login.microsoftonline.com/tenant-id/v2.0'
   */
  readonly issuer: string;

  /**
   * Expected audience (application ID)
   * @example 'api://my-application-id'
   */
  readonly audience: string;

  /**
   * Public key or JWKS URL for signature validation
   */
  readonly publicKey: string | JWK | string; // string can be JWKS URL

  /**
   * Validation options
   */
  readonly validationOptions?: TokenValidationOptions;

  /**
   * Custom role mapping function
   */
  readonly mapRoles?: (claims: Record<string, any>) => string[];
}

/**
 * API Key token provider configuration
 */
export interface ApiKeyTokenProviderConfig extends BaseTokenProviderConfig {
  readonly type: 'api-key';

  /**
   * API key prefix for identification
   * @example 'ak_'
   * @default 'ak_'
   */
  readonly prefix?: string;

  /**
   * API key validation function
   * Should return user claims if valid, null otherwise
   */
  readonly validate: (apiKey: string) => Promise<Record<string, any> | null>;

  /**
   * Custom role mapping function
   */
  readonly mapRoles?: (claims: Record<string, any>) => string[];
}

/**
 * Custom JWT provider configuration
 */
export interface CustomJwtProviderConfig extends BaseTokenProviderConfig {
  readonly type: 'custom-jwt';

  /**
   * Expected issuer URL
   */
  readonly issuer: string;

  /**
   * Expected audience (optional)
   */
  readonly audience?: string;

  /**
   * Public key for signature validation
   */
  readonly publicKey: string | JWK;

  /**
   * Validation options
   */
  readonly validationOptions?: TokenValidationOptions;

  /**
   * Custom role mapping function
   */
  readonly mapRoles?: (claims: Record<string, any>) => string[];
}

/**
 * Service-to-service token provider configuration
 */
export interface ServiceTokenProviderConfig extends BaseTokenProviderConfig {
  readonly type: 'service-to-service';

  /**
   * Shared secret or public key for validation
   */
  readonly secret: string | JWK;

  /**
   * Expected issuer (service name)
   */
  readonly issuer: string;

  /**
   * Validation options
   */
  readonly validationOptions?: TokenValidationOptions;
}

/**
 * Anonymous access provider configuration
 */
export interface AnonymousTokenProviderConfig extends BaseTokenProviderConfig {
  readonly type: 'anonymous';

  /**
   * Default roles for anonymous users
   * @default ['anonymous']
   */
  readonly defaultRoles?: string[];
}

/**
 * Session token provider configuration
 */
export interface SessionTokenProviderConfig extends BaseTokenProviderConfig {
  readonly type: 'session';

  /**
   * Session validation function
   * Should return session claims if valid, null otherwise
   */
  readonly validate: (sessionId: string) => Promise<Record<string, any> | null>;

  /**
   * Custom role mapping function
   */
  readonly mapRoles?: (claims: Record<string, any>) => string[];
}

/**
 * Union type of all provider configurations
 */
export type TokenProviderConfig =
  | EntraIdTokenProviderConfig
  | ApiKeyTokenProviderConfig
  | CustomJwtProviderConfig
  | ServiceTokenProviderConfig
  | AnonymousTokenProviderConfig
  | SessionTokenProviderConfig;

/**
 * Multi-provider validation options
 */
export interface MultiProviderOptions {
  /**
   * Providers to attempt in order
   */
  providers: TokenProviderConfig[];

  /**
   * Strategy when multiple providers validate successfully
   * @default 'first-match'
   */
  strategy?: 'first-match' | 'all-match' | 'priority';

  /**
   * Allow anonymous access if no providers match
   * @default false
   */
  allowAnonymous?: boolean;

  /**
   * Cache validation results
   * @default true
   */
  enableCache?: boolean;
}

// ============================================================================
// Provider Implementations
// ============================================================================

/**
 * Entra ID token provider implementation
 */
export class EntraIdTokenProvider {
  constructor(private readonly config: EntraIdTokenProviderConfig) {}

  async validate(token: string, context?: ValidationContext): Promise<TokenValidationResult> {
    if (!this.config.enabled) {
      return {
        valid: false,
        error: 'Provider is disabled',
      };
    }

    try {
      // Validate JWT signature with Entra ID
      const result = await validateJwtSignature(
        token,
        this.config.issuer,
        this.config.audience,
        this.config.publicKey as string | JWK,
        this.config.validationOptions
      );

      // Apply custom role mapping if provided
      if (result.valid && result.claims && this.config.mapRoles) {
        const roles = this.config.mapRoles(result.claims);
        result.claims.roles = roles;
      }

      return result;
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Token validation failed',
      };
    }
  }

  getType(): TokenProviderType {
    return 'entra-id';
  }

  getName(): string {
    return this.config.name;
  }
}

/**
 * API Key token provider implementation
 */
export class ApiKeyTokenProvider {
  private readonly prefix: string;

  constructor(private readonly config: ApiKeyTokenProviderConfig) {
    this.prefix = config.prefix || 'ak_';
  }

  async validate(token: string, context?: ValidationContext): Promise<TokenValidationResult> {
    if (!this.config.enabled) {
      return {
        valid: false,
        error: 'Provider is disabled',
      };
    }

    // Check if token has API key prefix
    if (!token.startsWith(this.prefix)) {
      return {
        valid: false,
        error: 'Invalid API key format',
      };
    }

    try {
      // Validate API key
      const claims = await this.config.validate(token);

      if (!claims) {
        return {
          valid: false,
          error: 'Invalid API key',
        };
      }

      // Apply custom role mapping if provided
      let roles = claims.roles || [];
      if (this.config.mapRoles) {
        roles = this.config.mapRoles(claims);
      }

      return {
        valid: true,
        claims: { ...claims, roles },
        userId: claims.sub || claims.userId || claims.id,
        email: claims.email,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'API key validation failed',
      };
    }
  }

  getType(): TokenProviderType {
    return 'api-key';
  }

  getName(): string {
    return this.config.name;
  }
}

/**
 * Custom JWT provider implementation
 */
export class CustomJwtTokenProvider {
  constructor(private readonly config: CustomJwtProviderConfig) {}

  async validate(token: string, context?: ValidationContext): Promise<TokenValidationResult> {
    if (!this.config.enabled) {
      return {
        valid: false,
        error: 'Provider is disabled',
      };
    }

    try {
      // Validate JWT signature with custom issuer
      const result = await validateJwtSignature(
        token,
        this.config.issuer,
        this.config.audience,
        this.config.publicKey,
        this.config.validationOptions
      );

      // Apply custom role mapping if provided
      if (result.valid && result.claims && this.config.mapRoles) {
        const roles = this.config.mapRoles(result.claims);
        result.claims.roles = roles;
      }

      return result;
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Token validation failed',
      };
    }
  }

  getType(): TokenProviderType {
    return 'custom-jwt';
  }

  getName(): string {
    return this.config.name;
  }
}

/**
 * Service-to-service token provider implementation
 */
export class ServiceTokenProvider {
  constructor(private readonly config: ServiceTokenProviderConfig) {}

  async validate(token: string, context?: ValidationContext): Promise<TokenValidationResult> {
    if (!this.config.enabled) {
      return {
        valid: false,
        error: 'Provider is disabled',
      };
    }

    try {
      // Validate service token
      const result = await validateJwtSignature(
        token,
        this.config.issuer,
        undefined, // Service tokens typically don't have audience
        this.config.secret,
        this.config.validationOptions
      );

      // Service tokens get special 'service' role
      if (result.valid && result.claims) {
        result.claims.roles = [...(result.claims.roles || []), 'service'];
      }

      return result;
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Service token validation failed',
      };
    }
  }

  getType(): TokenProviderType {
    return 'service-to-service';
  }

  getName(): string {
    return this.config.name;
  }
}

/**
 * Anonymous access provider implementation
 */
export class AnonymousTokenProvider {
  private readonly defaultRoles: string[];

  constructor(private readonly config: AnonymousTokenProviderConfig) {
    this.defaultRoles = config.defaultRoles || ['anonymous'];
  }

  async validate(token: string, context?: ValidationContext): Promise<TokenValidationResult> {
    if (!this.config.enabled) {
      return {
        valid: false,
        error: 'Provider is disabled',
      };
    }

    // Anonymous provider always succeeds if enabled
    return {
      valid: true,
      claims: {
        roles: this.defaultRoles,
        anonymous: true,
      },
      userId: 'anonymous',
    };
  }

  getType(): TokenProviderType {
    return 'anonymous';
  }

  getName(): string {
    return this.config.name;
  }
}

/**
 * Session token provider implementation
 */
export class SessionTokenProvider {
  constructor(private readonly config: SessionTokenProviderConfig) {}

  async validate(token: string, context?: ValidationContext): Promise<TokenValidationResult> {
    if (!this.config.enabled) {
      return {
        valid: false,
        error: 'Provider is disabled',
      };
    }

    try {
      // Validate session
      const claims = await this.config.validate(token);

      if (!claims) {
        return {
          valid: false,
          error: 'Invalid session',
        };
      }

      // Apply custom role mapping if provided
      let roles = claims.roles || [];
      if (this.config.mapRoles) {
        roles = this.config.mapRoles(claims);
      }

      return {
        valid: true,
        claims: { ...claims, roles },
        userId: claims.sub || claims.userId || claims.id,
        email: claims.email,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message || 'Session validation failed',
      };
    }
  }

  getType(): TokenProviderType {
    return 'session';
  }

  getName(): string {
    return this.config.name;
  }
}

// ============================================================================
// Multi-Provider Validator
// ============================================================================

/**
 * Token provider interface
 */
export interface ITokenProvider {
  validate(token: string, context?: ValidationContext): Promise<TokenValidationResult>;
  getType(): TokenProviderType;
  getName(): string;
}

/**
 * Multi-provider token validator
 *
 * @remarks
 * Attempts validation against multiple providers in order, supporting
 * flexible authentication strategies for complex scenarios.
 *
 * @example
 * ```typescript
 * const validator = new MultiProviderTokenValidator({
 *   providers: [
 *     {
 *       type: 'entra-id',
 *       name: 'Azure AD',
 *       issuer: 'https://login.microsoftonline.com/tenant-id/v2.0',
 *       audience: 'api://my-app',
 *       publicKey: publicKeyJwk
 *     },
 *     {
 *       type: 'api-key',
 *       name: 'API Keys',
 *       validate: async (key) => await lookupApiKey(key)
 *     }
 *   ],
 *   strategy: 'first-match',
 *   allowAnonymous: false
 * });
 *
 * const result = await validator.validate(token);
 * ```
 */
export class MultiProviderTokenValidator {
  private readonly providers: ITokenProvider[];
  private readonly strategy: 'first-match' | 'all-match' | 'priority';
  private readonly allowAnonymous: boolean;

  constructor(private readonly options: MultiProviderOptions) {
    this.strategy = options.strategy || 'first-match';
    this.allowAnonymous = options.allowAnonymous || false;

    // Create provider instances
    this.providers = options.providers
      .filter((config) => config.enabled !== false)
      .map((config) => this.createProvider(config));
  }

  /**
   * Validate token against configured providers
   *
   * @param token - Token to validate
   * @param context - Additional validation context
   * @returns Validation result from matching provider
   */
  async validate(token: string, context?: ValidationContext): Promise<TokenValidationResult> {
    // Extract bearer token if needed
    const actualToken = token.startsWith('Bearer ') ? extractBearerToken(token) : token;

    if (!actualToken) {
      if (this.allowAnonymous) {
        return this.createAnonymousResult();
      }
      return {
        valid: false,
        error: 'No token provided',
      };
    }

    // Attempt validation with each provider
    const results: Array<{ provider: ITokenProvider; result: TokenValidationResult }> = [];

    for (const provider of this.providers) {
      const result = await provider.validate(actualToken, context);

      if (result.valid) {
        // Add provider metadata to claims
        if (result.claims) {
          result.claims._provider = provider.getName();
          result.claims._providerType = provider.getType();
        }

        if (this.strategy === 'first-match') {
          // Return immediately on first successful validation
          return result;
        }

        results.push({ provider, result });
      }
    }

    // Handle strategy-specific logic
    if (this.strategy === 'all-match') {
      // All providers must validate successfully
      if (results.length === this.providers.length) {
        // Return result from first provider
        return results[0].result;
      }
    } else if (this.strategy === 'priority') {
      // Return result from highest priority (first) successful provider
      if (results.length > 0) {
        return results[0].result;
      }
    }

    // No providers validated successfully
    if (this.allowAnonymous) {
      return this.createAnonymousResult();
    }

    return {
      valid: false,
      error: 'Token validation failed for all providers',
    };
  }

  /**
   * Create a provider instance from configuration
   */
  private createProvider(config: TokenProviderConfig): ITokenProvider {
    switch (config.type) {
      case 'entra-id':
        return new EntraIdTokenProvider(config);
      case 'api-key':
        return new ApiKeyTokenProvider(config);
      case 'custom-jwt':
        return new CustomJwtTokenProvider(config);
      case 'service-to-service':
        return new ServiceTokenProvider(config);
      case 'anonymous':
        return new AnonymousTokenProvider(config);
      case 'session':
        return new SessionTokenProvider(config);
      default:
        throw new Error(`Unknown provider type: ${(config as any).type}`);
    }
  }

  /**
   * Create anonymous validation result
   */
  private createAnonymousResult(): TokenValidationResult {
    return {
      valid: true,
      claims: {
        roles: ['anonymous'],
        anonymous: true,
        _provider: 'Anonymous',
        _providerType: 'anonymous',
      },
      userId: 'anonymous',
    };
  }

  /**
   * Get list of enabled providers
   */
  getProviders(): ITokenProvider[] {
    return this.providers;
  }
}

/**
 * Create a multi-provider token validator
 *
 * @param options - Multi-provider configuration
 * @returns Validator instance
 *
 * @example
 * ```typescript
 * const validator = createMultiProviderValidator({
 *   providers: [
 *     { type: 'entra-id', name: 'Azure AD', issuer: '...', audience: '...', publicKey: '...' },
 *     { type: 'api-key', name: 'API Keys', validate: async (key) => {...} }
 *   ]
 * });
 * ```
 */
export function createMultiProviderValidator(
  options: MultiProviderOptions
): MultiProviderTokenValidator {
  return new MultiProviderTokenValidator(options);
}
