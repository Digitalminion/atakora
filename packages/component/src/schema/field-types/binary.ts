/**
 * Binary field type builder
 *
 * @remarks
 * Provides binary field for file uploads and binary data.
 * Typically used for file contents in function inputs.
 */

import { BaseFieldBuilder, type BaseFieldConfig } from './base';

/**
 * Binary field configuration
 */
export interface BinaryFieldConfig extends BaseFieldConfig {
  type: 'binary';
  maxSize?: number; // Maximum size in bytes
  allowedMimeTypes?: string[];
}

/**
 * Binary field builder
 *
 * @remarks
 * Implements fluent API for defining binary fields.
 * Binary fields are used for file uploads and binary data.
 *
 * @example
 * ```typescript
 * // Basic binary field
 * const file = a.binary().required();
 *
 * // With size limit (10MB)
 * const upload = a.binary().maxSize(10 * 1024 * 1024);
 *
 * // With MIME type restrictions
 * const image = a.binary()
 *   .mimeTypes(['image/png', 'image/jpeg', 'image/gif']);
 *
 * // PDF only with size limit
 * const document = a.binary()
 *   .mimeTypes(['application/pdf'])
 *   .maxSize(5 * 1024 * 1024); // 5MB
 * ```
 */
export class BinaryFieldBuilder extends BaseFieldBuilder<Buffer | Uint8Array, BinaryFieldConfig> {
  constructor() {
    super('binary');
  }

  /**
   * Set maximum file size
   *
   * @remarks
   * Binary data cannot exceed this size in bytes.
   *
   * @example
   * ```typescript
   * // 10MB limit
   * const file = a.binary().maxSize(10 * 1024 * 1024);
   *
   * // 100KB limit
   * const thumbnail = a.binary().maxSize(100 * 1024);
   * ```
   *
   * @param bytes - Maximum size in bytes
   */
  maxSize(bytes: number): this {
    this.config.maxSize = bytes;
    this.config.validations.push({
      type: 'custom',
      validator: (value: Buffer | Uint8Array) => value.byteLength <= bytes,
      message: `File size must not exceed ${this.formatBytes(bytes)}`,
    });
    return this;
  }

  /**
   * Set allowed MIME types
   *
   * @remarks
   * Restricts uploaded files to specific MIME types.
   *
   * @example
   * ```typescript
   * // Images only
   * const image = a.binary().mimeTypes(['image/png', 'image/jpeg']);
   *
   * // Documents
   * const doc = a.binary().mimeTypes(['application/pdf', 'application/msword']);
   * ```
   *
   * @param types - Array of allowed MIME types
   */
  mimeTypes(types: string[]): this {
    this.config.allowedMimeTypes = types;
    return this;
  }

  /**
   * Alias for mimeTypes - set allowed content types
   *
   * @param types - Array of allowed content types
   */
  contentTypes(types: string[]): this {
    return this.mimeTypes(types);
  }

  /**
   * Helper to format bytes into human-readable string
   *
   * @internal
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}
