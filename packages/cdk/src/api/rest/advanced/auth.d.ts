/**
 * Authentication and Authorization
 *
 * Comprehensive authentication and authorization support for REST APIs including:
 * - OAuth 2.0 flows (Authorization Code, Client Credentials, Implicit, Device)
 * - Azure AD integration (single-tenant, multi-tenant)
 * - API Key authentication (header, query, cookie)
 * - Client certificate (mTLS)
 * - Role-based access control (RBAC)
 * - Attribute-based access control (ABAC)
 * - JWT validation and token caching
 *
 * @see ADR-015 REST Advanced Features - Section 4
 */
import type { SecurityRequirement } from '../operation';
/**
 * OAuth 2.0 grant types
 */
export type OAuth2GrantType = 'authorization_code' | 'client_credentials' | 'implicit' | 'password' | 'device_code' | 'refresh_token';
/**
 * Authentication scheme types
 */
export type AuthScheme = 'oauth2' | 'azure-ad' | 'api-key' | 'bearer' | 'basic' | 'certificate' | 'jwt';
/**
 * Base authentication configuration
 */
export interface AuthConfig {
    readonly scheme: AuthScheme;
    readonly description?: string;
    readonly required?: boolean;
}
/**
 * OAuth 2.0 configuration base
 */
export interface OAuth2BaseConfig extends AuthConfig {
    readonly scheme: 'oauth2';
    readonly grantType: OAuth2GrantType;
    readonly tokenUrl: string;
    readonly scopes?: readonly string[];
    readonly audience?: string;
}
/**
 * OAuth 2.0 Authorization Code flow configuration
 */
export interface OAuth2AuthorizationCodeConfig extends OAuth2BaseConfig {
    readonly grantType: 'authorization_code';
    readonly authorizationUrl: string;
    readonly refreshUrl?: string;
    readonly pkceRequired?: boolean;
}
/**
 * OAuth 2.0 Client Credentials flow configuration
 */
export interface OAuth2ClientCredentialsConfig extends OAuth2BaseConfig {
    readonly grantType: 'client_credentials';
    readonly clientId: string;
    readonly clientSecretReference?: string;
}
/**
 * OAuth 2.0 Implicit flow configuration
 */
export interface OAuth2ImplicitConfig extends OAuth2BaseConfig {
    readonly grantType: 'implicit';
    readonly authorizationUrl: string;
}
/**
 * OAuth 2.0 Device Code flow configuration
 */
export interface OAuth2DeviceCodeConfig extends OAuth2BaseConfig {
    readonly grantType: 'device_code';
    readonly deviceAuthorizationUrl: string;
}
/**
 * Azure AD tenant type
 */
export type AzureAdTenantType = 'single' | 'multi' | 'organizations' | 'consumers' | 'common';
/**
 * Azure AD authentication configuration
 */
export interface AzureAdAuthConfig extends AuthConfig {
    readonly scheme: 'azure-ad';
    readonly tenantId?: string;
    readonly tenantType: AzureAdTenantType;
    readonly clientId?: string;
    readonly audience?: string;
    readonly scopes?: readonly string[];
    readonly validateIssuer?: boolean;
    readonly cloudInstance?: 'public' | 'government' | 'china' | 'germany';
}
/**
 * API Key location
 */
export type ApiKeyLocation = 'header' | 'query' | 'cookie';
/**
 * API Key authentication configuration
 */
export interface ApiKeyAuthConfig extends AuthConfig {
    readonly scheme: 'api-key';
    readonly location: ApiKeyLocation;
    readonly name: string;
    readonly prefix?: string;
}
/**
 * Bearer token authentication configuration
 */
export interface BearerAuthConfig extends AuthConfig {
    readonly scheme: 'bearer';
    readonly bearerFormat?: 'JWT' | 'opaque';
}
/**
 * Basic authentication configuration
 */
export interface BasicAuthConfig extends AuthConfig {
    readonly scheme: 'basic';
}
/**
 * Client certificate (mTLS) authentication configuration
 */
export interface CertificateAuthConfig extends AuthConfig {
    readonly scheme: 'certificate';
    readonly allowedThumbprints?: readonly string[];
    readonly validateCertificate?: boolean;
    readonly checkRevocation?: boolean;
}
/**
 * JWT validation configuration
 */
export interface JwtValidationConfig {
    readonly validateIssuer?: boolean;
    readonly validIssuers?: readonly string[];
    readonly validateAudience?: boolean;
    readonly validAudiences?: readonly string[];
    readonly validateLifetime?: boolean;
    readonly clockSkew?: number;
    readonly requireExpirationTime?: boolean;
    readonly requireSignedTokens?: boolean;
}
/**
 * JWT authentication configuration
 */
export interface JwtAuthConfig extends AuthConfig {
    readonly scheme: 'jwt';
    readonly issuer?: string;
    readonly audience?: string;
    readonly validation?: JwtValidationConfig;
    readonly tokenCaching?: TokenCachingConfig;
}
/**
 * Token caching configuration
 */
export interface TokenCachingConfig {
    readonly enabled: boolean;
    readonly ttl?: number;
    readonly maxSize?: number;
    readonly strategy?: 'memory' | 'distributed';
}
/**
 * Authorization rule type
 */
export type AuthRuleType = 'role' | 'claim' | 'scope' | 'policy' | 'custom';
/**
 * Base authorization rule
 */
export interface AuthRule {
    readonly type: AuthRuleType;
    readonly description?: string;
}
/**
 * Role-based authorization rule
 */
export interface RoleAuthRule extends AuthRule {
    readonly type: 'role';
    readonly role: string;
    readonly requireAll?: boolean;
}
/**
 * Claim-based authorization rule
 */
export interface ClaimAuthRule extends AuthRule {
    readonly type: 'claim';
    readonly claimType: string;
    readonly claimValue?: string | readonly string[];
    readonly matchType?: 'exact' | 'contains' | 'regex';
}
/**
 * Scope-based authorization rule
 */
export interface ScopeAuthRule extends AuthRule {
    readonly type: 'scope';
    readonly scope: string;
    readonly requireAll?: boolean;
}
/**
 * Policy-based authorization rule
 */
export interface PolicyAuthRule extends AuthRule {
    readonly type: 'policy';
    readonly policyName: string;
    readonly policyVersion?: string;
}
/**
 * Custom authorization rule
 */
export interface CustomAuthRule extends AuthRule {
    readonly type: 'custom';
    readonly evaluator: string;
}
/**
 * Combined authentication and authorization configuration
 */
export interface AuthenticationConfig {
    readonly authentication: AuthConfig;
    readonly authorization?: readonly AuthRule[];
    readonly fallbackToAnonymous?: boolean;
}
/**
 * OAuth 2.0 configuration builder
 *
 * Provides factory methods for creating OAuth 2.0 authentication configurations.
 *
 * @example
 * ```typescript
 * // Authorization Code flow
 * const config = OAuth2Config.authorizationCode({
 *   tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
 *   authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
 *   scopes: ['user.read', 'offline_access'],
 *   pkceRequired: true
 * });
 * ```
 */
export declare class OAuth2Config {
    /**
     * Creates Authorization Code flow configuration
     *
     * @param config - Authorization code configuration
     * @returns OAuth2 authentication config
     */
    static authorizationCode(config: Omit<OAuth2AuthorizationCodeConfig, 'scheme' | 'grantType'>): OAuth2AuthorizationCodeConfig;
    /**
     * Creates Client Credentials flow configuration
     *
     * @param config - Client credentials configuration
     * @returns OAuth2 authentication config
     */
    static clientCredentials(config: Omit<OAuth2ClientCredentialsConfig, 'scheme' | 'grantType'>): OAuth2ClientCredentialsConfig;
    /**
     * Creates Implicit flow configuration
     *
     * @param config - Implicit flow configuration
     * @returns OAuth2 authentication config
     */
    static implicit(config: Omit<OAuth2ImplicitConfig, 'scheme' | 'grantType'>): OAuth2ImplicitConfig;
    /**
     * Creates Device Code flow configuration
     *
     * @param config - Device code configuration
     * @returns OAuth2 authentication config
     */
    static deviceFlow(config: Omit<OAuth2DeviceCodeConfig, 'scheme' | 'grantType'>): OAuth2DeviceCodeConfig;
}
/**
 * Azure AD authentication configuration builder
 *
 * Provides factory methods for Azure Active Directory integration.
 *
 * @example
 * ```typescript
 * // Single tenant
 * const config = AzureADAuth.configure('contoso.onmicrosoft.com', {
 *   clientId: 'app-client-id',
 *   scopes: ['api://app-id/user.read']
 * });
 *
 * // Multi-tenant
 * const multiTenantConfig = AzureADAuth.multiTenant({
 *   audience: 'api://app-id',
 *   validateIssuer: true
 * });
 * ```
 */
export declare class AzureADAuth {
    /**
     * Configures single-tenant Azure AD authentication
     *
     * @param tenantId - Azure AD tenant ID or domain
     * @param options - Additional Azure AD options
     * @returns Azure AD authentication config
     */
    static configure(tenantId: string, options?: Partial<Omit<AzureAdAuthConfig, 'scheme' | 'tenantId' | 'tenantType'>>): AzureAdAuthConfig;
    /**
     * Configures multi-tenant Azure AD authentication
     *
     * @param options - Azure AD options
     * @returns Azure AD authentication config
     */
    static multiTenant(options?: Partial<Omit<AzureAdAuthConfig, 'scheme' | 'tenantType'>>): AzureAdAuthConfig;
    /**
     * Configures Azure AD for organizations
     *
     * @param options - Azure AD options
     * @returns Azure AD authentication config
     */
    static organizations(options?: Partial<Omit<AzureAdAuthConfig, 'scheme' | 'tenantType'>>): AzureAdAuthConfig;
    /**
     * Configures Azure AD for consumers (Microsoft accounts)
     *
     * @param options - Azure AD options
     * @returns Azure AD authentication config
     */
    static consumers(options?: Partial<Omit<AzureAdAuthConfig, 'scheme' | 'tenantType'>>): AzureAdAuthConfig;
    /**
     * Configures Azure AD for Azure Government cloud
     *
     * @param tenantId - Azure AD tenant ID
     * @param options - Azure AD options
     * @returns Azure AD authentication config
     */
    static government(tenantId: string, options?: Partial<Omit<AzureAdAuthConfig, 'scheme' | 'tenantId' | 'tenantType' | 'cloudInstance'>>): AzureAdAuthConfig;
}
/**
 * API Key authentication configuration builder
 *
 * Provides factory methods for API key authentication in different locations.
 *
 * @example
 * ```typescript
 * // Header-based API key
 * const headerAuth = ApiKeyAuth.header('X-API-Key');
 *
 * // Query parameter API key
 * const queryAuth = ApiKeyAuth.query('api_key');
 *
 * // Cookie-based API key
 * const cookieAuth = ApiKeyAuth.cookie('session_token');
 * ```
 */
export declare class ApiKeyAuth {
    /**
     * Configures header-based API key authentication
     *
     * @param headerName - Name of the header containing the API key
     * @param prefix - Optional prefix (e.g., "Bearer")
     * @returns API key authentication config
     */
    static header(headerName: string, prefix?: string): ApiKeyAuthConfig;
    /**
     * Configures query parameter API key authentication
     *
     * @param paramName - Name of the query parameter containing the API key
     * @returns API key authentication config
     */
    static query(paramName: string): ApiKeyAuthConfig;
    /**
     * Configures cookie-based API key authentication
     *
     * @param cookieName - Name of the cookie containing the API key
     * @returns API key authentication config
     */
    static cookie(cookieName: string): ApiKeyAuthConfig;
}
/**
 * Bearer token authentication configuration builder
 *
 * @example
 * ```typescript
 * const jwtAuth = BearerAuth.jwt();
 * const opaqueAuth = BearerAuth.opaque();
 * ```
 */
export declare class BearerAuth {
    /**
     * Configures JWT bearer token authentication
     *
     * @returns Bearer authentication config
     */
    static jwt(): BearerAuthConfig;
    /**
     * Configures opaque bearer token authentication
     *
     * @returns Bearer authentication config
     */
    static opaque(): BearerAuthConfig;
}
/**
 * Basic authentication configuration builder
 *
 * @example
 * ```typescript
 * const basicAuth = BasicAuth.configure();
 * ```
 */
export declare class BasicAuth {
    /**
     * Configures HTTP Basic authentication
     *
     * @returns Basic authentication config
     */
    static configure(): BasicAuthConfig;
}
/**
 * Client certificate (mTLS) authentication configuration builder
 *
 * @example
 * ```typescript
 * const certAuth = CertificateAuth.configure({
 *   validateCertificate: true,
 *   checkRevocation: true,
 *   allowedThumbprints: ['ABC123...']
 * });
 * ```
 */
export declare class CertificateAuth {
    /**
     * Configures client certificate authentication
     *
     * @param options - Certificate validation options
     * @returns Certificate authentication config
     */
    static configure(options?: Partial<Omit<CertificateAuthConfig, 'scheme'>>): CertificateAuthConfig;
}
/**
 * JWT authentication configuration builder
 *
 * @example
 * ```typescript
 * const jwtAuth = JwtAuth.configure({
 *   issuer: 'https://my-issuer.com',
 *   audience: 'api://my-api',
 *   validation: {
 *     validateIssuer: true,
 *     validateAudience: true,
 *     validateLifetime: true
 *   }
 * });
 * ```
 */
export declare class JwtAuth {
    /**
     * Configures JWT authentication
     *
     * @param options - JWT configuration options
     * @returns JWT authentication config
     */
    static configure(options: Partial<Omit<JwtAuthConfig, 'scheme'>>): JwtAuthConfig;
}
/**
 * Authorization rules builder
 *
 * Provides factory methods for creating RBAC and ABAC rules.
 *
 * @example
 * ```typescript
 * const rules = [
 *   AuthorizationRules.requireRole('admin'),
 *   AuthorizationRules.requireClaim('department', 'engineering'),
 *   AuthorizationRules.requireScope('api.write'),
 *   AuthorizationRules.requirePolicy('MinimumAgePolicy')
 * ];
 * ```
 */
export declare class AuthorizationRules {
    /**
     * Creates a role requirement rule
     *
     * @param role - Required role name
     * @param requireAll - Require all roles if multiple
     * @returns Role authorization rule
     */
    static requireRole(role: string, requireAll?: boolean): RoleAuthRule;
    /**
     * Creates a claim requirement rule
     *
     * @param claimType - Type of claim to check
     * @param claimValue - Optional expected value(s)
     * @param matchType - How to match the claim value
     * @returns Claim authorization rule
     */
    static requireClaim(claimType: string, claimValue?: string | readonly string[], matchType?: 'exact' | 'contains' | 'regex'): ClaimAuthRule;
    /**
     * Creates a scope requirement rule
     *
     * @param scope - Required OAuth scope
     * @param requireAll - Require all scopes if multiple
     * @returns Scope authorization rule
     */
    static requireScope(scope: string, requireAll?: boolean): ScopeAuthRule;
    /**
     * Creates a policy requirement rule
     *
     * @param policyName - Name of the policy to evaluate
     * @param policyVersion - Optional policy version
     * @returns Policy authorization rule
     */
    static requirePolicy(policyName: string, policyVersion?: string): PolicyAuthRule;
    /**
     * Creates a custom authorization rule
     *
     * @param evaluator - Custom policy expression
     * @returns Custom authorization rule
     */
    static custom(evaluator: string): CustomAuthRule;
}
/**
 * Security requirement builder
 *
 * Converts authentication configurations to OpenAPI security requirements.
 */
export declare class SecurityRequirementBuilder {
    /**
     * Creates a security requirement from auth config
     *
     * @param name - Security scheme name
     * @param scopes - Required scopes (for OAuth2)
     * @returns Security requirement
     */
    static create(name: string, scopes?: readonly string[]): SecurityRequirement;
    /**
     * Creates OAuth2 security requirement
     *
     * @param schemeName - Name of the OAuth2 scheme
     * @param scopes - Required OAuth scopes
     * @returns Security requirement
     */
    static oauth2(schemeName: string, scopes: readonly string[]): SecurityRequirement;
    /**
     * Creates API key security requirement
     *
     * @param schemeName - Name of the API key scheme
     * @returns Security requirement
     */
    static apiKey(schemeName: string): SecurityRequirement;
    /**
     * Creates multiple security requirements (AND logic)
     *
     * @param requirements - Multiple security requirements
     * @returns Combined security requirement
     */
    static combine(...requirements: SecurityRequirement[]): SecurityRequirement;
}
/**
 * Authentication helper for building complete authentication configurations
 */
export declare class AuthenticationHelper {
    /**
     * Creates a complete authentication configuration
     *
     * @param auth - Authentication config
     * @param authorization - Optional authorization rules
     * @returns Complete authentication configuration
     */
    static configure(auth: AuthConfig, authorization?: readonly AuthRule[]): AuthenticationConfig;
    /**
     * Creates authentication with role-based access control
     *
     * @param auth - Authentication config
     * @param roles - Required roles
     * @returns Authentication configuration with RBAC
     */
    static withRoles(auth: AuthConfig, ...roles: string[]): AuthenticationConfig;
    /**
     * Creates authentication with scope-based access control
     *
     * @param auth - Authentication config
     * @param scopes - Required scopes
     * @returns Authentication configuration with scope checks
     */
    static withScopes(auth: AuthConfig, ...scopes: string[]): AuthenticationConfig;
    /**
     * Creates authentication with claims-based access control
     *
     * @param auth - Authentication config
     * @param claims - Required claims as key-value pairs
     * @returns Authentication configuration with claims checks
     */
    static withClaims(auth: AuthConfig, claims: Record<string, string | readonly string[]>): AuthenticationConfig;
    /**
     * Creates authentication that falls back to anonymous access
     *
     * @param auth - Authentication config
     * @returns Authentication configuration allowing anonymous fallback
     */
    static allowAnonymous(auth: AuthConfig): AuthenticationConfig;
}
//# sourceMappingURL=auth.d.ts.map