"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationHelper = exports.SecurityRequirementBuilder = exports.AuthorizationRules = exports.JwtAuth = exports.CertificateAuth = exports.BasicAuth = exports.BearerAuth = exports.ApiKeyAuth = exports.AzureADAuth = exports.OAuth2Config = void 0;
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
class OAuth2Config {
    /**
     * Creates Authorization Code flow configuration
     *
     * @param config - Authorization code configuration
     * @returns OAuth2 authentication config
     */
    static authorizationCode(config) {
        return {
            scheme: 'oauth2',
            grantType: 'authorization_code',
            ...config,
        };
    }
    /**
     * Creates Client Credentials flow configuration
     *
     * @param config - Client credentials configuration
     * @returns OAuth2 authentication config
     */
    static clientCredentials(config) {
        return {
            scheme: 'oauth2',
            grantType: 'client_credentials',
            ...config,
        };
    }
    /**
     * Creates Implicit flow configuration
     *
     * @param config - Implicit flow configuration
     * @returns OAuth2 authentication config
     */
    static implicit(config) {
        return {
            scheme: 'oauth2',
            grantType: 'implicit',
            ...config,
        };
    }
    /**
     * Creates Device Code flow configuration
     *
     * @param config - Device code configuration
     * @returns OAuth2 authentication config
     */
    static deviceFlow(config) {
        return {
            scheme: 'oauth2',
            grantType: 'device_code',
            ...config,
        };
    }
}
exports.OAuth2Config = OAuth2Config;
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
class AzureADAuth {
    /**
     * Configures single-tenant Azure AD authentication
     *
     * @param tenantId - Azure AD tenant ID or domain
     * @param options - Additional Azure AD options
     * @returns Azure AD authentication config
     */
    static configure(tenantId, options) {
        return {
            scheme: 'azure-ad',
            tenantType: 'single',
            tenantId,
            validateIssuer: true,
            cloudInstance: 'public',
            ...options,
        };
    }
    /**
     * Configures multi-tenant Azure AD authentication
     *
     * @param options - Azure AD options
     * @returns Azure AD authentication config
     */
    static multiTenant(options) {
        return {
            scheme: 'azure-ad',
            tenantType: 'multi',
            validateIssuer: false,
            cloudInstance: 'public',
            ...options,
        };
    }
    /**
     * Configures Azure AD for organizations
     *
     * @param options - Azure AD options
     * @returns Azure AD authentication config
     */
    static organizations(options) {
        return {
            scheme: 'azure-ad',
            tenantType: 'organizations',
            validateIssuer: true,
            cloudInstance: 'public',
            ...options,
        };
    }
    /**
     * Configures Azure AD for consumers (Microsoft accounts)
     *
     * @param options - Azure AD options
     * @returns Azure AD authentication config
     */
    static consumers(options) {
        return {
            scheme: 'azure-ad',
            tenantType: 'consumers',
            validateIssuer: true,
            cloudInstance: 'public',
            ...options,
        };
    }
    /**
     * Configures Azure AD for Azure Government cloud
     *
     * @param tenantId - Azure AD tenant ID
     * @param options - Azure AD options
     * @returns Azure AD authentication config
     */
    static government(tenantId, options) {
        return {
            scheme: 'azure-ad',
            tenantType: 'single',
            tenantId,
            cloudInstance: 'government',
            validateIssuer: true,
            ...options,
        };
    }
}
exports.AzureADAuth = AzureADAuth;
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
class ApiKeyAuth {
    /**
     * Configures header-based API key authentication
     *
     * @param headerName - Name of the header containing the API key
     * @param prefix - Optional prefix (e.g., "Bearer")
     * @returns API key authentication config
     */
    static header(headerName, prefix) {
        return {
            scheme: 'api-key',
            location: 'header',
            name: headerName,
            prefix,
        };
    }
    /**
     * Configures query parameter API key authentication
     *
     * @param paramName - Name of the query parameter containing the API key
     * @returns API key authentication config
     */
    static query(paramName) {
        return {
            scheme: 'api-key',
            location: 'query',
            name: paramName,
        };
    }
    /**
     * Configures cookie-based API key authentication
     *
     * @param cookieName - Name of the cookie containing the API key
     * @returns API key authentication config
     */
    static cookie(cookieName) {
        return {
            scheme: 'api-key',
            location: 'cookie',
            name: cookieName,
        };
    }
}
exports.ApiKeyAuth = ApiKeyAuth;
/**
 * Bearer token authentication configuration builder
 *
 * @example
 * ```typescript
 * const jwtAuth = BearerAuth.jwt();
 * const opaqueAuth = BearerAuth.opaque();
 * ```
 */
class BearerAuth {
    /**
     * Configures JWT bearer token authentication
     *
     * @returns Bearer authentication config
     */
    static jwt() {
        return {
            scheme: 'bearer',
            bearerFormat: 'JWT',
        };
    }
    /**
     * Configures opaque bearer token authentication
     *
     * @returns Bearer authentication config
     */
    static opaque() {
        return {
            scheme: 'bearer',
            bearerFormat: 'opaque',
        };
    }
}
exports.BearerAuth = BearerAuth;
/**
 * Basic authentication configuration builder
 *
 * @example
 * ```typescript
 * const basicAuth = BasicAuth.configure();
 * ```
 */
class BasicAuth {
    /**
     * Configures HTTP Basic authentication
     *
     * @returns Basic authentication config
     */
    static configure() {
        return {
            scheme: 'basic',
        };
    }
}
exports.BasicAuth = BasicAuth;
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
class CertificateAuth {
    /**
     * Configures client certificate authentication
     *
     * @param options - Certificate validation options
     * @returns Certificate authentication config
     */
    static configure(options) {
        return {
            scheme: 'certificate',
            validateCertificate: true,
            checkRevocation: true,
            ...options,
        };
    }
}
exports.CertificateAuth = CertificateAuth;
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
class JwtAuth {
    /**
     * Configures JWT authentication
     *
     * @param options - JWT configuration options
     * @returns JWT authentication config
     */
    static configure(options) {
        return {
            scheme: 'jwt',
            validation: {
                validateIssuer: true,
                validateAudience: true,
                validateLifetime: true,
                requireExpirationTime: true,
                requireSignedTokens: true,
                clockSkew: 300, // 5 minutes
            },
            ...options,
        };
    }
}
exports.JwtAuth = JwtAuth;
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
class AuthorizationRules {
    /**
     * Creates a role requirement rule
     *
     * @param role - Required role name
     * @param requireAll - Require all roles if multiple
     * @returns Role authorization rule
     */
    static requireRole(role, requireAll) {
        return {
            type: 'role',
            role,
            requireAll,
        };
    }
    /**
     * Creates a claim requirement rule
     *
     * @param claimType - Type of claim to check
     * @param claimValue - Optional expected value(s)
     * @param matchType - How to match the claim value
     * @returns Claim authorization rule
     */
    static requireClaim(claimType, claimValue, matchType = 'exact') {
        return {
            type: 'claim',
            claimType,
            claimValue,
            matchType,
        };
    }
    /**
     * Creates a scope requirement rule
     *
     * @param scope - Required OAuth scope
     * @param requireAll - Require all scopes if multiple
     * @returns Scope authorization rule
     */
    static requireScope(scope, requireAll) {
        return {
            type: 'scope',
            scope,
            requireAll,
        };
    }
    /**
     * Creates a policy requirement rule
     *
     * @param policyName - Name of the policy to evaluate
     * @param policyVersion - Optional policy version
     * @returns Policy authorization rule
     */
    static requirePolicy(policyName, policyVersion) {
        return {
            type: 'policy',
            policyName,
            policyVersion,
        };
    }
    /**
     * Creates a custom authorization rule
     *
     * @param evaluator - Custom policy expression
     * @returns Custom authorization rule
     */
    static custom(evaluator) {
        return {
            type: 'custom',
            evaluator,
        };
    }
}
exports.AuthorizationRules = AuthorizationRules;
/**
 * Security requirement builder
 *
 * Converts authentication configurations to OpenAPI security requirements.
 */
class SecurityRequirementBuilder {
    /**
     * Creates a security requirement from auth config
     *
     * @param name - Security scheme name
     * @param scopes - Required scopes (for OAuth2)
     * @returns Security requirement
     */
    static create(name, scopes = []) {
        return { [name]: [...scopes] };
    }
    /**
     * Creates OAuth2 security requirement
     *
     * @param schemeName - Name of the OAuth2 scheme
     * @param scopes - Required OAuth scopes
     * @returns Security requirement
     */
    static oauth2(schemeName, scopes) {
        return { [schemeName]: [...scopes] };
    }
    /**
     * Creates API key security requirement
     *
     * @param schemeName - Name of the API key scheme
     * @returns Security requirement
     */
    static apiKey(schemeName) {
        return { [schemeName]: [] };
    }
    /**
     * Creates multiple security requirements (AND logic)
     *
     * @param requirements - Multiple security requirements
     * @returns Combined security requirement
     */
    static combine(...requirements) {
        return Object.assign({}, ...requirements);
    }
}
exports.SecurityRequirementBuilder = SecurityRequirementBuilder;
/**
 * Authentication helper for building complete authentication configurations
 */
class AuthenticationHelper {
    /**
     * Creates a complete authentication configuration
     *
     * @param auth - Authentication config
     * @param authorization - Optional authorization rules
     * @returns Complete authentication configuration
     */
    static configure(auth, authorization) {
        return {
            authentication: auth,
            authorization,
        };
    }
    /**
     * Creates authentication with role-based access control
     *
     * @param auth - Authentication config
     * @param roles - Required roles
     * @returns Authentication configuration with RBAC
     */
    static withRoles(auth, ...roles) {
        return {
            authentication: auth,
            authorization: roles.map(role => AuthorizationRules.requireRole(role)),
        };
    }
    /**
     * Creates authentication with scope-based access control
     *
     * @param auth - Authentication config
     * @param scopes - Required scopes
     * @returns Authentication configuration with scope checks
     */
    static withScopes(auth, ...scopes) {
        return {
            authentication: auth,
            authorization: scopes.map(scope => AuthorizationRules.requireScope(scope)),
        };
    }
    /**
     * Creates authentication with claims-based access control
     *
     * @param auth - Authentication config
     * @param claims - Required claims as key-value pairs
     * @returns Authentication configuration with claims checks
     */
    static withClaims(auth, claims) {
        return {
            authentication: auth,
            authorization: Object.entries(claims).map(([type, value]) => AuthorizationRules.requireClaim(type, value)),
        };
    }
    /**
     * Creates authentication that falls back to anonymous access
     *
     * @param auth - Authentication config
     * @returns Authentication configuration allowing anonymous fallback
     */
    static allowAnonymous(auth) {
        return {
            authentication: auth,
            fallbackToAnonymous: true,
        };
    }
}
exports.AuthenticationHelper = AuthenticationHelper;
