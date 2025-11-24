/**
 * Example Authentication Configuration
 *
 * This file demonstrates complete authentication configuration using
 * both Entra ID and API Keys providers.
 *
 * This example matches the backend-simple reference pattern.
 */

import { defineAuth, auth } from './index';
import { days } from '../common/duration';

// ============================================================================
// Example 1: Basic Entra ID + API Keys
// ============================================================================

export const basicAuth = defineAuth({
  // Primary provider (Entra ID for user authentication)
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID || 'test-tenant-id')
    .clientId(process.env.AZURE_CLIENT_ID || 'test-client-id'),

  // Secondary provider (API Keys for service accounts)
  ApiKeys: auth
    .apiKeys()
    .enable()
    .keys([
      {
        id: 'service-1',
        secret: process.env.API_KEY_1 || 'test-key-1',
        roles: ['service'],
      },
    ]),
});

// ============================================================================
// Example 2: Complete Enterprise Configuration
// ============================================================================

export const enterpriseAuth = defineAuth({
  // Primary: Entra ID with advanced features
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID || 'test-tenant-id')
    .clientId(process.env.AZURE_CLIENT_ID || 'test-client-id')
    .audience(process.env.AZURE_AUDIENCE || 'api://test-app')
    .validateTokens(async (token, claims) => {
      // Custom validation logic
      if (!claims || !claims.iss) {
        return { valid: false, error: 'Invalid token claims' };
      }
      return { valid: true };
    })
    .mapRoles((claims) => {
      // Map Entra groups to app roles
      const groups = claims.groups || [];
      return groups
        .filter((g: any) => typeof g === 'object' && g.name)
        .map((g: any) => g.name)
        .filter((name: string) => ['admin', 'editor', 'viewer'].includes(name));
    }),

  // Secondary: API Keys with rotation and metadata
  ApiKeys: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(90))
    .prefix('atk_')
    .keys([
      {
        id: 'admin-cli',
        secret: process.env.ADMIN_API_KEY || 'admin-key',
        roles: ['admin', 'service'],
        metadata: {
          description: 'Admin CLI tool',
          team: 'platform',
          environment: 'production',
        },
      },
      {
        id: 'monitoring-service',
        secret: process.env.MONITORING_KEY || 'monitoring-key',
        roles: ['monitoring', 'readonly'],
        metadata: {
          description: 'Monitoring and alerting service',
          team: 'ops',
        },
      },
    ]),
});

// ============================================================================
// Example 3: Service Accounts Only
// ============================================================================

export const serviceAuth = defineAuth({
  ServiceAccounts: auth
    .apiKeys()
    .enable()
    .rotateEvery(days(30))
    .keys([
      {
        id: 'data-pipeline',
        secret: process.env.PIPELINE_KEY || 'pipeline-key',
        roles: ['data-write', 'storage-access'],
        metadata: {
          service: 'ETL Pipeline',
          owner: 'data-team',
        },
      },
      {
        id: 'reporting-service',
        secret: process.env.REPORTING_KEY || 'reporting-key',
        roles: ['data-read', 'analytics'],
        metadata: {
          service: 'Reporting Engine',
          owner: 'analytics-team',
        },
      },
      {
        id: 'backup-service',
        secret: process.env.BACKUP_KEY || 'backup-key',
        roles: ['data-read', 'backup'],
        metadata: {
          service: 'Backup System',
          owner: 'ops-team',
        },
      },
    ]),
});

// ============================================================================
// Example 4: Temporary Access Keys
// ============================================================================

export const temporaryAccessAuth = defineAuth({
  // Primary: Regular Entra ID
  Primary: auth
    .entra()
    .tenant(process.env.AZURE_TENANT_ID || 'test-tenant-id')
    .clientId(process.env.AZURE_CLIENT_ID || 'test-client-id'),

  // Temporary access for contractors/partners
  TemporaryAccess: auth
    .apiKeys()
    .enable()
    .keys([
      {
        id: 'contractor-q1-2025',
        secret: process.env.CONTRACTOR_KEY || 'contractor-key',
        roles: ['viewer', 'readonly'],
        expiresAt: '2025-03-31T23:59:59Z',
        metadata: {
          grantedTo: 'contractor@example.com',
          purpose: 'Q1 Audit',
          approver: 'manager@company.com',
        },
      },
    ]),
});

// ============================================================================
// Example 5: Role-Based API Keys
// ============================================================================

export const roleBasedAuth = defineAuth({
  ApiKeys: auth
    .apiKeys()
    .enable()
    .prefix('app_')
    .keys([
      // Admin key - full access
      {
        id: 'admin',
        secret: process.env.ADMIN_KEY || 'admin-key',
        roles: ['admin', 'write', 'read', 'delete'],
      },
      // Editor key - read/write access
      {
        id: 'editor',
        secret: process.env.EDITOR_KEY || 'editor-key',
        roles: ['write', 'read'],
      },
      // Viewer key - read-only access
      {
        id: 'viewer',
        secret: process.env.VIEWER_KEY || 'viewer-key',
        roles: ['read'],
      },
    ]),
});

// ============================================================================
// Type Demonstrations
// ============================================================================

// TypeScript correctly infers all types
const authConfig = enterpriseAuth;

// Access provider configuration with type safety
const primaryProvider = authConfig.providers.Primary;
const apiKeysProvider = authConfig.providers.ApiKeys;

// Type inference works
const primaryType: 'entra-id' = primaryProvider.type as 'entra-id';
const apiKeysType: 'api-keys' = apiKeysProvider.type as 'api-keys';

// Access specific configuration
const apiKeysConfig = apiKeysProvider.config;
// TypeScript knows this has ApiKeysConfig shape

// Get metadata
const providerNames = authConfig._metadata.providerNames;
const primaryProviderName = authConfig.primaryProvider;

// ============================================================================
// Usage in Backend Definition (Preview for Phase 4)
// ============================================================================

/*
import { defineBackend } from '@atakora/component';
import { schema } from './schema';
import { enterpriseAuth } from './auth/example-usage';

export const backend = defineBackend({
  name: 'my-app',
  schema,
  authentication: enterpriseAuth,
  // ... other configuration
});
*/
