/**
 * Common Utilities for Fluent APIs
 *
 * @remarks
 * This module provides foundational utilities for building fluent APIs
 * in the Atakora framework. These utilities are used throughout the
 * component library for type-safe, expressive infrastructure definitions.
 *
 * ## Available Utilities
 *
 * ### Duration Helpers
 * Create and convert time durations with support for ISO 8601 and ARM formats:
 * - `milliseconds()`, `seconds()`, `minutes()`, `hours()`, `days()`
 *
 * ### Threshold Builders
 * Build comparison expressions for monitoring and alerts:
 * - `greaterThan()`, `lessThan()`, `between()`, `equals()`, `olderThan()`
 *
 * ### Size Utilities
 * Handle storage size calculations with proper unit conversions:
 * - `bytes()`, `kilobytes()`, `megabytes()`, `gigabytes()`, `terabytes()`
 *
 * ### Network Helpers
 * Validate and format network configurations:
 * - `ipAddress()`, `cidr()`, `subnet()`
 *
 * @example
 * ```typescript
 * import {
 *   seconds,
 *   minutes,
 *   greaterThan,
 *   megabytes,
 *   cidr
 * } from '@atakora/component/common';
 *
 * // Duration examples
 * const timeout = seconds(30);
 * const retention = days(7);
 *
 * // Threshold examples
 * const cpuAlert = greaterThan(80);
 * const staleData = olderThan(days(30));
 *
 * // Size examples
 * const cacheSize = megabytes(512);
 *
 * // Network examples
 * const subnet = cidr('10.0.0.0', 24);
 * ```
 *
 * @packageDocumentation
 */

// Duration utilities
export {
  type Duration,
  milliseconds,
  seconds,
  minutes,
  hours,
  days
} from './duration';

// Threshold builders
export {
  type Threshold,
  greaterThan,
  lessThan,
  between,
  equals,
  olderThan
} from './threshold';

// Size utilities
export {
  type Size,
  bytes,
  kilobytes,
  megabytes,
  gigabytes,
  terabytes
} from './size';

// Network utilities
export {
  IPAddress,
  CIDR,
  ipAddress,
  cidr,
  subnet
} from './network';

// Importing the functions for the default export object
import {
  milliseconds as _milliseconds,
  seconds as _seconds,
  minutes as _minutes,
  hours as _hours,
  days as _days
} from './duration';

import {
  greaterThan as _greaterThan,
  lessThan as _lessThan,
  between as _between,
  equals as _equals,
  olderThan as _olderThan
} from './threshold';

import {
  bytes as _bytes,
  kilobytes as _kilobytes,
  megabytes as _megabytes,
  gigabytes as _gigabytes,
  terabytes as _terabytes
} from './size';

import {
  ipAddress as _ipAddress,
  cidr as _cidr,
  subnet as _subnet
} from './network';

// Default export with all utilities grouped by category
const helpers = {
  // Duration
  milliseconds: _milliseconds,
  seconds: _seconds,
  minutes: _minutes,
  hours: _hours,
  days: _days,

  // Threshold
  greaterThan: _greaterThan,
  lessThan: _lessThan,
  between: _between,
  equals: _equals,
  olderThan: _olderThan,

  // Size
  bytes: _bytes,
  kilobytes: _kilobytes,
  megabytes: _megabytes,
  gigabytes: _gigabytes,
  terabytes: _terabytes,

  // Network
  ipAddress: _ipAddress,
  cidr: _cidr,
  subnet: _subnet
};

export default helpers;