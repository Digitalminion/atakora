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
import type { IRestOperation } from '../operation';
/**
 * API versioning configuration
 */
export interface ApiVersioningConfig {
    readonly strategy: VersioningStrategy;
    readonly defaultVersion?: string;
    readonly deprecatedVersions?: readonly DeprecatedVersion[];
    readonly versionFormat?: VersionFormat;
}
/**
 * Versioning strategy types
 */
export type VersioningStrategy = 'path' | 'header' | 'queryParameter' | 'contentNegotiation' | 'custom';
/**
 * Version format types
 */
export type VersionFormat = 'numeric' | 'semver' | 'date' | 'prefixed';
/**
 * Deprecated version configuration
 */
export interface DeprecatedVersion {
    readonly version: string;
    readonly deprecatedAt: Date;
    readonly sunsetAt?: Date;
    readonly message?: string;
    readonly migrationGuide?: string;
}
/**
 * Version configuration for strategies
 */
export interface VersionConfig {
    readonly strategy: VersioningStrategy;
    readonly headerName?: string;
    readonly parameterName?: string;
    readonly mediaTypePrefix?: string;
    readonly supportedVersions?: readonly string[];
    readonly defaultVersion?: string;
}
/**
 * Path-based versioning configuration
 */
export interface PathVersioningConfig {
    readonly pattern?: RegExp;
    readonly prefix?: string;
}
/**
 * Header-based versioning configuration
 */
export interface HeaderVersioningConfig {
    readonly headerName: string;
    readonly supportedVersions: readonly string[];
    readonly defaultVersion?: string;
}
/**
 * Query parameter versioning configuration
 */
export interface QueryVersioningConfig {
    readonly parameterName: string;
    readonly supportedVersions: readonly string[];
    readonly defaultVersion?: string;
}
/**
 * Content negotiation versioning configuration
 */
export interface ContentVersioningConfig {
    readonly mediaTypePrefix: string;
    readonly supportedVersions: readonly string[];
}
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
export declare class ApiVersionManager {
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
    static pathBased(version: string, basePath: string): string;
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
    static headerBased(headerName?: string): VersionConfig;
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
    static queryBased(paramName?: string): VersionConfig;
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
    static contentNegotiation(mediaType: string): VersionConfig;
    /**
     * Applies version to operation path
     *
     * @param operation - REST operation to version
     * @param version - Version to apply
     * @param strategy - Versioning strategy to use
     * @returns Operation with version applied
     */
    static applyVersionToOperation(operation: IRestOperation, version: string, strategy?: VersioningStrategy): IRestOperation;
    /**
     * Applies header-based versioning to operation
     */
    private static applyHeaderVersion;
    /**
     * Applies query parameter versioning to operation
     */
    private static applyQueryVersion;
    /**
     * Applies content negotiation versioning to operation
     */
    private static applyContentNegotiationVersion;
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
    static generateVersionedOperations(operation: IRestOperation, versions: readonly string[], strategy?: VersioningStrategy): readonly IRestOperation[];
}
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
export declare class VersionDeprecationManager {
    private readonly config;
    constructor(config: ApiVersioningConfig);
    /**
     * Checks if a version is deprecated
     *
     * @param version - Version to check
     * @returns True if version is deprecated
     */
    isDeprecated(version: string): boolean;
    /**
     * Gets deprecation information for a version
     *
     * @param version - Version to check
     * @returns Deprecation info or undefined if not deprecated
     */
    getDeprecationInfo(version: string): DeprecatedVersion | undefined;
    /**
     * Checks if a version has reached its sunset date
     *
     * @param version - Version to check
     * @returns True if version has been sunset
     */
    isSunset(version: string): boolean;
    /**
     * Gets days until sunset
     *
     * @param version - Version to check
     * @returns Number of days until sunset, or null if no sunset date
     */
    getDaysUntilSunset(version: string): number | null;
    /**
     * Generates deprecation warning headers
     *
     * @param version - Version to generate headers for
     * @returns Object with header names and values
     */
    getDeprecationHeaders(version: string): Record<string, string>;
    /**
     * Marks a version as deprecated
     *
     * @param version - Version to deprecate
     * @param sunsetDate - When version will be sunset
     * @param message - Deprecation message
     * @param migrationGuide - URL to migration guide
     */
    deprecateVersion(version: string, sunsetDate?: Date, message?: string, migrationGuide?: string): void;
}
/**
 * Version format validator
 */
export declare class VersionFormatValidator {
    /**
     * Validates version string against format
     *
     * @param version - Version string to validate
     * @param format - Expected format
     * @returns True if version matches format
     */
    static validate(version: string, format: VersionFormat): boolean;
    /**
     * Normalizes version to specified format
     *
     * @param version - Version to normalize
     * @param format - Target format
     * @returns Normalized version
     */
    static normalize(version: string, format: VersionFormat): string;
    /**
     * Compares two versions
     *
     * @param v1 - First version
     * @param v2 - Second version
     * @param format - Version format
     * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
     */
    static compare(v1: string, v2: string, format: VersionFormat): number;
}
//# sourceMappingURL=version-manager.d.ts.map