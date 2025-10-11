/**
 * Blob trigger builder utilities for Azure Functions.
 *
 * @packageDocumentation
 */

import type { BlobTriggerConfig } from '../function-app-types';

/**
 * Builder for creating Blob trigger configurations.
 *
 * @remarks
 * Provides a fluent API for building blob trigger configurations for Azure Blob Storage.
 *
 * @example
 * ```typescript
 * const trigger = BlobTrigger.create()
 *   .withPath('samples-workitems/{name}')
 *   .withConnection('MyStorageConnection')
 *   .withDataType('binary')
 *   .build();
 * ```
 */
export class BlobTrigger {
  private path?: string;
  private connection?: string;
  private dataType?: 'binary' | 'string';

  /**
   * Creates a new Blob trigger builder.
   *
   * @returns New BlobTrigger builder instance
   */
  public static create(): BlobTrigger {
    return new BlobTrigger();
  }

  /**
   * Sets the blob path pattern to monitor.
   *
   * @param path - Blob path pattern (e.g., 'samples-workitems/{name}')
   * @returns This builder for chaining
   *
   * @remarks
   * Path can include parameters in curly braces like {name} or {name}.{ext}
   *
   * @example
   * ```typescript
   * .withPath('samples-workitems/{name}')
   * .withPath('images/{name}.{ext}')
   * ```
   */
  public withPath(path: string): this {
    this.path = path;
    return this;
  }

  /**
   * Sets the container to monitor.
   *
   * @param container - Container name
   * @param blobPath - Optional blob path within container
   * @returns This builder for chaining
   *
   * @example
   * ```typescript
   * .withContainer('uploads')
   * .withContainer('uploads', '{name}.jpg')
   * ```
   */
  public withContainer(container: string, blobPath?: string): this {
    this.path = blobPath ? `${container}/${blobPath}` : `${container}/{name}`;
    return this;
  }

  /**
   * Sets the storage account connection string app setting name.
   *
   * @param connection - App setting name containing the connection string
   * @returns This builder for chaining
   *
   * @remarks
   * Defaults to 'AzureWebJobsStorage' if not specified.
   *
   * @example
   * ```typescript
   * .withConnection('MyStorageConnection')
   * ```
   */
  public withConnection(connection: string): this {
    this.connection = connection;
    return this;
  }

  /**
   * Sets the data type for blob content.
   *
   * @param dataType - 'binary' for Buffer or 'string' for string
   * @returns This builder for chaining
   *
   * @remarks
   * Defaults to 'binary'.
   *
   * @example
   * ```typescript
   * .withDataType('string')
   * ```
   */
  public withDataType(dataType: 'binary' | 'string'): this {
    this.dataType = dataType;
    return this;
  }

  /**
   * Sets data type to binary (Buffer).
   *
   * @returns This builder for chaining
   */
  public asBinary(): this {
    this.dataType = 'binary';
    return this;
  }

  /**
   * Sets data type to string.
   *
   * @returns This builder for chaining
   */
  public asString(): this {
    this.dataType = 'string';
    return this;
  }

  /**
   * Builds the Blob trigger configuration.
   *
   * @returns Blob trigger configuration object
   *
   * @throws {Error} If path is not set
   */
  public build(): BlobTriggerConfig {
    if (!this.path) {
      throw new Error('Blob path must be set for blob trigger');
    }

    return {
      type: 'blob',
      path: this.path,
      connection: this.connection,
      dataType: this.dataType,
    };
  }
}

/**
 * Helper function to create a blob trigger configuration.
 *
 * @param path - Blob path pattern
 * @param options - Optional configuration
 * @returns Complete blob trigger configuration
 *
 * @example
 * ```typescript
 * const trigger = blobTrigger('samples-workitems/{name}', {
 *   connection: 'MyStorageConnection',
 *   dataType: 'binary'
 * });
 * ```
 */
export function blobTrigger(
  path: string,
  options: {
    connection?: string;
    dataType?: 'binary' | 'string';
  } = {}
): BlobTriggerConfig {
  return {
    type: 'blob',
    path,
    connection: options.connection,
    dataType: options.dataType,
  };
}
