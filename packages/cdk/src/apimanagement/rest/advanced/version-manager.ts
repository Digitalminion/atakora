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
export type VersioningStrategy =
  | 'path'                // /v1/users, /v2/users
  | 'header'              // Api-Version: 2023-01-01
  | 'queryParameter'      // ?api-version=2
  | 'contentNegotiation'  // Accept: application/vnd.api.v2+json
  | 'custom';             // Custom extraction logic

/**
 * Version format types
 */
export type VersionFormat =
  | 'numeric'       // 1, 2, 3
  | 'semver'        // 1.0.0, 2.1.0
  | 'date'          // 2023-01-01
  | 'prefixed';     // v1, v2

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
export class ApiVersionManager {
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
  static pathBased(version: string, basePath: string): string {
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
  static headerBased(headerName: string = 'Api-Version'): VersionConfig {
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
  static queryBased(paramName: string = 'api-version'): VersionConfig {
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
  static contentNegotiation(mediaType: string): VersionConfig {
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
  static applyVersionToOperation(
    operation: IRestOperation,
    version: string,
    strategy: VersioningStrategy = 'path'
  ): IRestOperation {
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
  private static applyHeaderVersion(
    operation: IRestOperation,
    version: string,
    headerName: string = 'Api-Version'
  ): IRestOperation {
    const headerProperties = {
      ...operation.headerParameters?.schema.properties,
      [headerName]: {
        type: 'string' as const,
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
          type: 'object' as const,
          properties: headerProperties,
        },
      },
    };
  }

  /**
   * Applies query parameter versioning to operation
   */
  private static applyQueryVersion(
    operation: IRestOperation,
    version: string,
    paramName: string = 'api-version'
  ): IRestOperation {
    const queryProperties = {
      ...operation.queryParameters?.schema.properties,
      [paramName]: {
        type: 'string' as const,
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
          type: 'object' as const,
          properties: queryProperties,
        },
      },
    };
  }

  /**
   * Applies content negotiation versioning to operation
   */
  private static applyContentNegotiationVersion(
    operation: IRestOperation,
    version: string,
    mediaTypePrefix: string = 'application/vnd.api'
  ): IRestOperation {
    // Modify response content types to include version
    const versionedResponses: any = {};

    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (!response?.content) {
        versionedResponses[statusCode] = response;
        continue;
      }

      const versionedContent: any = {};

      for (const [contentType, mediaType] of Object.entries(response.content)) {
        if (contentType === 'application/json') {
          // Transform to versioned media type
          versionedContent[`${mediaTypePrefix}.v${version}+json`] = mediaType;
        } else {
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
  static generateVersionedOperations(
    operation: IRestOperation,
    versions: readonly string[],
    strategy: VersioningStrategy = 'path'
  ): readonly IRestOperation[] {
    return versions.map(version =>
      this.applyVersionToOperation(operation, version, strategy)
    );
  }
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
export class VersionDeprecationManager {
  constructor(private readonly config: ApiVersioningConfig) {}

  /**
   * Checks if a version is deprecated
   *
   * @param version - Version to check
   * @returns True if version is deprecated
   */
  isDeprecated(version: string): boolean {
    return this.config.deprecatedVersions?.some(v => v.version === version) || false;
  }

  /**
   * Gets deprecation information for a version
   *
   * @param version - Version to check
   * @returns Deprecation info or undefined if not deprecated
   */
  getDeprecationInfo(version: string): DeprecatedVersion | undefined {
    return this.config.deprecatedVersions?.find(v => v.version === version);
  }

  /**
   * Checks if a version has reached its sunset date
   *
   * @param version - Version to check
   * @returns True if version has been sunset
   */
  isSunset(version: string): boolean {
    const info = this.getDeprecationInfo(version);
    if (!info?.sunsetAt) return false;

    return new Date() >= info.sunsetAt;
  }

  /**
   * Gets days until sunset
   *
   * @param version - Version to check
   * @returns Number of days until sunset, or null if no sunset date
   */
  getDaysUntilSunset(version: string): number | null {
    const info = this.getDeprecationInfo(version);
    if (!info?.sunsetAt) return null;

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
  getDeprecationHeaders(version: string): Record<string, string> {
    const info = this.getDeprecationInfo(version);
    if (!info) return {};

    const headers: Record<string, string> = {
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
  deprecateVersion(
    version: string,
    sunsetDate?: Date,
    message?: string,
    migrationGuide?: string
  ): void {
    const deprecated: DeprecatedVersion = {
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
    (this.config as any).deprecatedVersions = [...filtered, deprecated];
  }
}

/**
 * Version format validator
 */
export class VersionFormatValidator {
  /**
   * Validates version string against format
   *
   * @param version - Version string to validate
   * @param format - Expected format
   * @returns True if version matches format
   */
  static validate(version: string, format: VersionFormat): boolean {
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
  static normalize(version: string, format: VersionFormat): string {
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
  static compare(v1: string, v2: string, format: VersionFormat): number {
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
          if (p1 !== p2) return p1 < p2 ? -1 : 1;
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
