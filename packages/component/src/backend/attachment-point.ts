/**
 * Attachment Point System
 *
 * This module implements the attachment point system that allows progressive
 * customization of backend infrastructure. Users can start with smart defaults
 * and selectively override specific configurations.
 *
 * @module @atakora/component/backend/attachment-point
 */

/**
 * Interface for attachment points.
 * Attachment points allow users to progressively customize backend infrastructure
 * by attaching custom configurations to specific resources.
 *
 * @typeParam T - The configuration type for this attachment point
 *
 * @example
 * ```typescript
 * // Attach custom database configuration
 * backend.storage.database.attach(
 *   storage.cosmosDb()
 *     .name('custom-db')
 *     .mode('Serverless')
 * );
 *
 * // Check if configuration is attached
 * if (backend.storage.database.isAttached()) {
 *   console.log('Using custom database config');
 * }
 *
 * // Get current configuration (default or attached)
 * const dbConfig = backend.storage.database.getConfig();
 *
 * // Reset to defaults
 * backend.storage.database.reset();
 * ```
 */
export interface AttachmentPoint<T> {
  /**
   * Attach a custom configuration to this attachment point.
   * Validates the configuration before attaching.
   *
   * @param config - Custom configuration to attach
   * @throws {Error} If configuration is invalid
   */
  attach(config: T): void;

  /**
   * Check if a custom configuration is attached.
   *
   * @returns True if custom configuration is attached, false if using defaults
   */
  isAttached(): boolean;

  /**
   * Get the current configuration.
   * Returns attached configuration if available, otherwise returns default configuration.
   *
   * @returns Current configuration (attached or default)
   */
  getConfig(): T;

  /**
   * Reset to default configuration.
   * Removes any attached custom configuration.
   */
  reset(): void;

  // Internal properties (prefixed with _ to indicate internal use)

  /**
   * Default configuration for this attachment point.
   * @internal
   */
  readonly _default: T;

  /**
   * Attached custom configuration.
   * Undefined if no custom configuration is attached.
   * @internal
   */
  _attached?: T;

  /**
   * Path to this attachment point in the backend object.
   * Used for debugging and tracking attachments.
   * @internal
   */
  readonly _path: string;
}

/**
 * Backend object type for attachment point references.
 * This is a minimal interface to avoid circular dependencies.
 */
export interface BackendObjectRef {
  /**
   * Internal map of all attachments.
   * @internal
   */
  _attachments: Map<string, unknown>;
}

/**
 * Configuration validator function.
 * Used to validate configurations before attaching.
 *
 * @typeParam T - Configuration type to validate
 * @param config - Configuration to validate
 * @returns Error message if invalid, undefined if valid
 */
export type ConfigValidator<T> = (config: T) => string | undefined;

/**
 * Attachment point implementation.
 * Provides the core logic for managing attachments and defaults.
 *
 * @typeParam T - The configuration type for this attachment point
 */
export class AttachmentPointImpl<T> implements AttachmentPoint<T> {
  public readonly _default: T;
  public readonly _path: string;
  public _attached?: T;

  private readonly backend: BackendObjectRef;
  private readonly validator?: ConfigValidator<T>;

  /**
   * Create a new attachment point.
   *
   * @param backend - Reference to the backend object
   * @param path - Path to this attachment point (e.g., 'storage.database')
   * @param defaultConfig - Default configuration
   * @param validator - Optional configuration validator
   */
  constructor(
    backend: BackendObjectRef,
    path: string,
    defaultConfig: T,
    validator?: ConfigValidator<T>
  ) {
    this.backend = backend;
    this._path = path;
    this._default = defaultConfig;
    this.validator = validator;
  }

  /**
   * Attach a custom configuration.
   * Validates the configuration before storing it.
   *
   * @param config - Custom configuration to attach
   * @throws {Error} If configuration is invalid
   */
  public attach(config: T): void {
    // Validate configuration
    this.validateConfig(config);

    // Store attachment
    this._attached = config;
    this.backend._attachments.set(this._path, config);

    // Debug logging
    if (process.env.DEBUG || process.env.ATAKORA_DEBUG) {
      console.debug(`[AttachmentPoint] Attached custom config at ${this._path}`);
    }
  }

  /**
   * Check if a custom configuration is attached.
   *
   * @returns True if attached, false if using defaults
   */
  public isAttached(): boolean {
    return this._attached !== undefined;
  }

  /**
   * Get current configuration (attached or default).
   *
   * @returns Current configuration
   */
  public getConfig(): T {
    return this._attached ?? this._default;
  }

  /**
   * Reset to default configuration.
   * Removes attached configuration.
   */
  public reset(): void {
    this._attached = undefined;
    this.backend._attachments.delete(this._path);

    // Debug logging
    if (process.env.DEBUG || process.env.ATAKORA_DEBUG) {
      console.debug(`[AttachmentPoint] Reset to default config at ${this._path}`);
    }
  }

  /**
   * Validate configuration before attaching.
   *
   * @param config - Configuration to validate
   * @throws {Error} If configuration is invalid
   */
  private validateConfig(config: T): void {
    // Basic validation - ensure config exists
    if (config === null || config === undefined) {
      throw new Error(`Cannot attach null or undefined configuration to ${this._path}`);
    }

    // Type validation - ensure config is an object if default is an object
    if (typeof this._default === 'object' && this._default !== null) {
      if (typeof config !== 'object' || config === null) {
        throw new Error(
          `Configuration for ${this._path} must be an object, received ${typeof config}`
        );
      }
    }

    // Run custom validator if provided
    if (this.validator) {
      const error = this.validator(config);
      if (error) {
        throw new Error(`Invalid configuration for ${this._path}: ${error}`);
      }
    }
  }
}

/**
 * Factory function to create attachment points.
 * Provides a convenient way to create attachment points with type inference.
 *
 * @typeParam T - Configuration type
 * @param backend - Reference to the backend object
 * @param path - Path to this attachment point
 * @param defaultConfig - Default configuration
 * @param validator - Optional configuration validator
 * @returns New attachment point instance
 *
 * @example
 * ```typescript
 * const databaseAttachment = createAttachmentPoint(
 *   backend,
 *   'storage.database',
 *   storage.cosmosDb().name('default-db').mode('Serverless'),
 *   (config) => {
 *     if (!config.name) return 'Database name is required';
 *     return undefined;
 *   }
 * );
 * ```
 */
export function createAttachmentPoint<T>(
  backend: BackendObjectRef,
  path: string,
  defaultConfig: T,
  validator?: ConfigValidator<T>
): AttachmentPoint<T> {
  return new AttachmentPointImpl(backend, path, defaultConfig, validator);
}

/**
 * Helper function to create multiple attachment points at once.
 * Useful for creating attachment point groups.
 *
 * @typeParam T - Record type mapping paths to configurations
 * @param backend - Reference to the backend object
 * @param pathPrefix - Common prefix for all paths
 * @param configs - Map of attachment paths to default configurations
 * @returns Map of attachment points
 *
 * @example
 * ```typescript
 * const storageAttachments = createAttachmentPoints(backend, 'storage', {
 *   database: storage.cosmosDb().name('default-db'),
 *   account: storage.account().name('default-storage')
 * });
 *
 * // Access as: storageAttachments.database, storageAttachments.account
 * ```
 */
export function createAttachmentPoints<T extends Record<string, unknown>>(
  backend: BackendObjectRef,
  pathPrefix: string,
  configs: T
): { [K in keyof T]: AttachmentPoint<T[K]> } {
  const result: Record<string, AttachmentPoint<unknown>> = {};

  for (const [key, defaultConfig] of Object.entries(configs)) {
    const path = pathPrefix ? `${pathPrefix}.${key}` : key;
    result[key] = createAttachmentPoint(backend, path, defaultConfig);
  }

  return result as { [K in keyof T]: AttachmentPoint<T[K]> };
}
