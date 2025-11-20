/**
 * Size Utilities for Fluent APIs
 *
 * @remarks
 * Provides type-safe storage size values with proper unit conversions.
 * Handles conversions between bytes, kilobytes, megabytes, gigabytes, and terabytes.
 *
 * @example
 * ```typescript
 * import { megabytes, gigabytes } from '@atakora/component/common';
 *
 * // Create size values
 * const cacheSize = megabytes(512);
 * const diskSpace = gigabytes(100);
 *
 * // Convert between units
 * console.log(cacheSize.toBytes());     // 536870912
 * console.log(diskSpace.toMegabytes()); // 102400
 *
 * // Human-readable output
 * console.log(cacheSize.toString()); // "512 MB"
 * ```
 *
 * @packageDocumentation
 */

/**
 * Represents a storage size value with unit conversions
 *
 * @public
 */
export interface Size {
  /**
   * The numeric value of the size
   */
  readonly value: number;

  /**
   * The unit of the size
   */
  readonly unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB';

  /**
   * Convert to bytes
   */
  toBytes(): number;

  /**
   * Convert to kilobytes
   */
  toKilobytes(): number;

  /**
   * Convert to megabytes
   */
  toMegabytes(): number;

  /**
   * Convert to gigabytes
   */
  toGigabytes(): number;

  /**
   * Get human-readable string representation
   */
  toString(): string;
}

/**
 * Implementation of Size interface
 * @internal
 */
class SizeImpl implements Size {
  constructor(
    readonly value: number,
    readonly unit: 'B' | 'KB' | 'MB' | 'GB' | 'TB'
  ) {}

  toBytes(): number {
    const conversions = {
      B: 1,
      KB: 1024,
      MB: 1048576,
      GB: 1073741824,
      TB: 1099511627776
    };
    return this.value * conversions[this.unit];
  }

  toKilobytes(): number {
    return this.toBytes() / 1024;
  }

  toMegabytes(): number {
    return this.toBytes() / 1048576;
  }

  toGigabytes(): number {
    return this.toBytes() / 1073741824;
  }

  toString(): string {
    return `${this.value} ${this.unit}`;
  }
}

/**
 * Create a size in bytes
 *
 * @param value - Number of bytes
 * @returns Size object
 *
 * @example
 * ```typescript
 * const small = bytes(1024);
 * console.log(small.toKilobytes()); // 1
 * console.log(small.toString());    // "1024 B"
 * ```
 *
 * @public
 */
export function bytes(value: number): Size {
  return new SizeImpl(value, 'B');
}

/**
 * Create a size in kilobytes
 *
 * @param value - Number of kilobytes
 * @returns Size object
 *
 * @example
 * ```typescript
 * const config = kilobytes(64);
 * console.log(config.toBytes());  // 65536
 * console.log(config.toString()); // "64 KB"
 * ```
 *
 * @public
 */
export function kilobytes(value: number): Size {
  return new SizeImpl(value, 'KB');
}

/**
 * Create a size in megabytes
 *
 * @param value - Number of megabytes
 * @returns Size object
 *
 * @example
 * ```typescript
 * const cache = megabytes(256);
 * console.log(cache.toKilobytes()); // 262144
 * console.log(cache.toString());    // "256 MB"
 * ```
 *
 * @public
 */
export function megabytes(value: number): Size {
  return new SizeImpl(value, 'MB');
}

/**
 * Create a size in gigabytes
 *
 * @param value - Number of gigabytes
 * @returns Size object
 *
 * @example
 * ```typescript
 * const storage = gigabytes(100);
 * console.log(storage.toMegabytes()); // 102400
 * console.log(storage.toString());    // "100 GB"
 * ```
 *
 * @public
 */
export function gigabytes(value: number): Size {
  return new SizeImpl(value, 'GB');
}

/**
 * Create a size in terabytes
 *
 * @param value - Number of terabytes
 * @returns Size object
 *
 * @example
 * ```typescript
 * const bigData = terabytes(5);
 * console.log(bigData.toGigabytes()); // 5120
 * console.log(bigData.toString());    // "5 TB"
 * ```
 *
 * @public
 */
export function terabytes(value: number): Size {
  return new SizeImpl(value, 'TB');
}