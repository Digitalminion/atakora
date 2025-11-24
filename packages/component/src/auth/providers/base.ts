/**
 * Base Provider Interfaces
 *
 * Common interfaces and types that all authentication providers implement.
 */

import type { AuthProviderConfig } from '../types';

// ============================================================================
// Base Provider Interface
// ============================================================================

/**
 * Base interface that all authentication provider builders must implement
 *
 * @remarks
 * This interface ensures all providers follow a consistent pattern and can be
 * processed by the defineAuth function.
 */
export interface BaseAuthProviderBuilder {
  /**
   * Build the provider configuration
   *
   * @internal
   * @returns Provider configuration object
   */
  _build(): AuthProviderConfig;
}

/**
 * Type guard to check if an object is a valid provider builder
 *
 * @param obj - Object to check
 * @returns True if object is a provider builder
 */
export function isProviderBuilder(obj: any): obj is BaseAuthProviderBuilder {
  return obj && typeof obj === 'object' && typeof obj._build === 'function';
}
