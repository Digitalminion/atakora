"use strict";
/**
 * API Version Management
 *
 * Provides comprehensive API versioning strategies with deprecation support,
 * following ADR-015 specifications.
 *
 * Supports:
 * - Path-based versioning (/v1/users, /v2/users)
 * - Header-based versioning (Api-Version: 2023-01-01)
 * - Query parameter versioning (?api-version=2)
 * - Content negotiation versioning (Accept: application/vnd.api.v2+json)
 *
 * @see ADR-015 REST Advanced Features - Section 1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionFormatValidator = exports.VersionDeprecationManager = exports.ApiVersionManager = void 0;
/**
 * API Version Manager
 *
 * Central class for managing API versions across all strategies.
 *
 * @example
 * ```typescript
 * // Path-based versioning
 * const versioned = ApiVersionManager.pathBased('v1', '/users');
 * // Returns: '/v1/users'
 *
 * // Header-based versioning
 * const config = ApiVersionManager.headerBased('Api-Version');
 *
 * // Query parameter versioning
 * const queryConfig = ApiVersionManager.queryBased('api-version');
 * ```
 */
class ApiVersionManager {
    /**
     * Creates path-based versioning string
     *
     * @param version - Version identifier (e.g., 'v1', '1', '2023-01-01')
     * @param basePath - Base path without version (e.g., '/users')
     * @returns Versioned path (e.g., '/v1/users')
     *
     * @example
     * ```typescript
     * ApiVersionManager.pathBased('v1', '/users');
     * // Returns: '/v1/users'
     *
     * ApiVersionManager.pathBased('2', '/orders');
     * // Returns: '/v2/orders'
     * ```
     */
    static pathBased(version, basePath) {
        // Ensure version starts with 'v' if it's purely numeric
        const normalizedVersion = /^\d+$/.test(version) ? `v${version}` : version;
        // Ensure basePath starts with /
        const normalizedPath = basePath.startsWith('/') ? basePath : `/${basePath}`;
        return `/${normalizedVersion}${normalizedPath}`;
    }
    /**
     * Creates header-based versioning configuration
     *
     * @param headerName - Name of version header (default: 'Api-Version')
     * @returns Version configuration for header-based versioning
     *
     * @example
     * ```typescript
     * const config = ApiVersionManager.headerBased('Api-Version');
     * ```
     */
    static headerBased(headerName = 'Api-Version') {
        return {
            strategy: 'header',
            headerName,
        };
    }
    /**
     * Creates query parameter versioning configuration
     *
     * @param paramName - Name of query parameter (default: 'api-version')
     * @returns Version configuration for query parameter versioning
     *
     * @example
     * ```typescript
     * const config = ApiVersionManager.queryBased('api-version');
     * ```
     */
    static queryBased(paramName = 'api-version') {
        return {
            strategy: 'queryParameter',
            parameterName: paramName,
        };
    }
    /**
     * Creates content negotiation versioning configuration
     *
     * @param mediaType - Media type with version (e.g., 'application/vnd.api')
     * @returns Version configuration for content negotiation
     *
     * @example
     * ```typescript
     * const config = ApiVersionManager.contentNegotiation('application/vnd.api');
     * // Expects: Accept: application/vnd.api.v2+json
     * ```
     */
    static contentNegotiation(mediaType) {
        return {
            strategy: 'contentNegotiation',
            mediaTypePrefix: mediaType,
        };
    }
    /**
     * Applies version to operation path
     *
     * @param operation - REST operation to version
     * @param version - Version to apply
     * @param strategy - Versioning strategy to use
     * @returns Operation with version applied
     */
    static applyVersionToOperation(operation, version, strategy = 'path') {
        switch (strategy) {
            case 'path':
                return {
                    ...operation,
                    path: this.pathBased(version, operation.path),
                };
            case 'header':
                return this.applyHeaderVersion(operation, version);
            case 'queryParameter':
                return this.applyQueryVersion(operation, version);
            case 'contentNegotiation':
                return this.applyContentNegotiationVersion(operation, version);
            default:
                return operation;
        }
    }
    /**
     * Applies header-based versioning to operation
     */
    static applyHeaderVersion(operation, version, headerName = 'Api-Version') {
        const headerProperties = {
            ...operation.headerParameters?.schema.properties,
            [headerName]: {
                type: 'string',
                description: `API version (e.g., ${version})`,
                example: version,
            },
        };
        return {
            ...operation,
            headerParameters: {
                ...operation.headerParameters,
                schema: {
                    ...operation.headerParameters?.schema,
                    type: 'object',
                    properties: headerProperties,
                },
            },
        };
    }
    /**
     * Applies query parameter versioning to operation
     */
    static applyQueryVersion(operation, version, paramName = 'api-version') {
        const queryProperties = {
            ...operation.queryParameters?.schema.properties,
            [paramName]: {
                type: 'string',
                description: 'API version',
                example: version,
                default: version,
            },
        };
        return {
            ...operation,
            queryParameters: {
                ...operation.queryParameters,
                schema: {
                    ...operation.queryParameters?.schema,
                    type: 'object',
                    properties: queryProperties,
                },
            },
        };
    }
    /**
     * Applies content negotiation versioning to operation
     */
    static applyContentNegotiationVersion(operation, version, mediaTypePrefix = 'application/vnd.api') {
        // Modify response content types to include version
        const versionedResponses = {};
        for (const [statusCode, response] of Object.entries(operation.responses)) {
            if (!response?.content) {
                versionedResponses[statusCode] = response;
                continue;
            }
            const versionedContent = {};
            for (const [contentType, mediaType] of Object.entries(response.content)) {
                if (contentType === 'application/json') {
                    // Transform to versioned media type
                    versionedContent[`${mediaTypePrefix}.v${version}+json`] = mediaType;
                }
                else {
                    versionedContent[contentType] = mediaType;
                }
            }
            versionedResponses[statusCode] = {
                ...response,
                content: versionedContent,
            };
        }
        return {
            ...operation,
            responses: versionedResponses,
        };
    }
    /**
     * Generates versioned paths for multiple versions
     *
     * @param operation - Base operation
     * @param versions - Array of versions to generate
     * @param strategy - Versioning strategy
     * @returns Array of versioned operations
     *
     * @example
     * ```typescript
     * const operations = ApiVersionManager.generateVersionedOperations(
     *   baseOperation,
     *   ['v1', 'v2', 'v3'],
     *   'path'
     * );
     * ```
     */
    static generateVersionedOperations(operation, versions, strategy = 'path') {
        return versions.map(version => this.applyVersionToOperation(operation, version, strategy));
    }
}
exports.ApiVersionManager = ApiVersionManager;
/**
 * Version Deprecation Manager
 *
 * Manages version deprecation lifecycle including sunset dates and migration notices.
 *
 * @example
 * ```typescript
 * const manager = new VersionDeprecationManager({
 *   strategy: 'path',
 *   deprecatedVersions: [{
 *     version: 'v1',
 *     deprecatedAt: new Date('2024-01-01'),
 *     sunsetAt: new Date('2024-06-01'),
 *     message: 'Please migrate to v2',
 *     migrationGuide: 'https://docs.example.com/migration-v1-to-v2'
 *   }]
 * });
 * ```
 */
class VersionDeprecationManager {
    constructor(config) {
        this.config = config;
    }
    /**
     * Checks if a version is deprecated
     *
     * @param version - Version to check
     * @returns True if version is deprecated
     */
    isDeprecated(version) {
        return this.config.deprecatedVersions?.some(v => v.version === version) || false;
    }
    /**
     * Gets deprecation information for a version
     *
     * @param version - Version to check
     * @returns Deprecation info or undefined if not deprecated
     */
    getDeprecationInfo(version) {
        return this.config.deprecatedVersions?.find(v => v.version === version);
    }
    /**
     * Checks if a version has reached its sunset date
     *
     * @param version - Version to check
     * @returns True if version has been sunset
     */
    isSunset(version) {
        const info = this.getDeprecationInfo(version);
        if (!info?.sunsetAt)
            return false;
        return new Date() >= info.sunsetAt;
    }
    /**
     * Gets days until sunset
     *
     * @param version - Version to check
     * @returns Number of days until sunset, or null if no sunset date
     */
    getDaysUntilSunset(version) {
        const info = this.getDeprecationInfo(version);
        if (!info?.sunsetAt)
            return null;
        const now = new Date();
        const sunset = info.sunsetAt;
        const diffTime = sunset.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }
    /**
     * Generates deprecation warning headers
     *
     * @param version - Version to generate headers for
     * @returns Object with header names and values
     */
    getDeprecationHeaders(version) {
        const info = this.getDeprecationInfo(version);
        if (!info)
            return {};
        const headers = {
            'Deprecation': 'true',
            'X-API-Deprecation-Date': info.deprecatedAt.toISOString(),
        };
        if (info.sunsetAt) {
            headers['Sunset'] = info.sunsetAt.toUTCString();
        }
        if (info.migrationGuide) {
            headers['Link'] = `<${info.migrationGuide}>; rel="deprecation"`;
        }
        if (info.message) {
            headers['X-API-Deprecation-Info'] = info.message;
        }
        return headers;
    }
    /**
     * Marks a version as deprecated
     *
     * @param version - Version to deprecate
     * @param sunsetDate - When version will be sunset
     * @param message - Deprecation message
     * @param migrationGuide - URL to migration guide
     */
    deprecateVersion(version, sunsetDate, message, migrationGuide) {
        const deprecated = {
            version,
            deprecatedAt: new Date(),
            sunsetAt: sunsetDate,
            message,
            migrationGuide,
        };
        // Note: This would need to update the config in a mutable way
        // In practice, this should return a new config or use a mutable config object
        const existingDeprecated = this.config.deprecatedVersions || [];
        // Remove existing deprecation for this version if present
        const filtered = existingDeprecated.filter(d => d.version !== version);
        // This is a limitation of readonly config - in practice you'd need
        // to create a new manager with updated config
        this.config.deprecatedVersions = [...filtered, deprecated];
    }
}
exports.VersionDeprecationManager = VersionDeprecationManager;
/**
 * Version format validator
 */
class VersionFormatValidator {
    /**
     * Validates version string against format
     *
     * @param version - Version string to validate
     * @param format - Expected format
     * @returns True if version matches format
     */
    static validate(version, format) {
        switch (format) {
            case 'numeric':
                return /^\d+$/.test(version);
            case 'semver':
                return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(version);
            case 'date':
                return /^\d{4}-\d{2}-\d{2}$/.test(version);
            case 'prefixed':
                return /^v\d+$/.test(version);
            default:
                return true;
        }
    }
    /**
     * Normalizes version to specified format
     *
     * @param version - Version to normalize
     * @param format - Target format
     * @returns Normalized version
     */
    static normalize(version, format) {
        switch (format) {
            case 'numeric':
                // Remove 'v' prefix if present
                return version.replace(/^v/, '');
            case 'prefixed':
                // Add 'v' prefix if not present and version is numeric
                return /^\d+$/.test(version) ? `v${version}` : version;
            default:
                return version;
        }
    }
    /**
     * Compares two versions
     *
     * @param v1 - First version
     * @param v2 - Second version
     * @param format - Version format
     * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
     */
    static compare(v1, v2, format) {
        switch (format) {
            case 'numeric':
            case 'prefixed': {
                const n1 = parseInt(v1.replace(/^v/, ''), 10);
                const n2 = parseInt(v2.replace(/^v/, ''), 10);
                return n1 < n2 ? -1 : n1 > n2 ? 1 : 0;
            }
            case 'semver': {
                const parts1 = v1.split(/[.-]/);
                const parts2 = v2.split(/[.-]/);
                for (let i = 0; i < 3; i++) {
                    const p1 = parseInt(parts1[i] || '0', 10);
                    const p2 = parseInt(parts2[i] || '0', 10);
                    if (p1 !== p2)
                        return p1 < p2 ? -1 : 1;
                }
                return 0;
            }
            case 'date':
                return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
            default:
                return v1.localeCompare(v2);
        }
    }
}
exports.VersionFormatValidator = VersionFormatValidator;
