/**
 * Authentication Providers
 *
 * This module exports all authentication provider builders and their
 * configuration types.
 */

// Base Provider Interface
export type { BaseAuthProviderBuilder } from './base';
export { isProviderBuilder } from './base';

// API Keys Provider
export { ApiKeysBuilder, apiKeys } from './api-keys';
export type { ApiKeysConfig } from './api-keys';

// Entra ID Provider
export { EntraIdBuilder, entra } from './entra';
export type { EntraIdConfig } from './entra';

// Custom Provider
export { CustomAuthBuilder, custom } from './custom';
export type { CustomAuthConfig, TokenExtractor } from './custom';

// Import factory functions for auth namespace
import { apiKeys } from './api-keys';
import { entra } from './entra';
import { custom } from './custom';

// Export as 'auth' namespace for convenient usage
export const auth = {
  apiKeys,
  entra,
  custom,
};
