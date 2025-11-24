/**
 * Tests for Backend Assembly System
 *
 * @remarks
 * Comprehensive test suite for defineBackend() function and related utilities.
 * Tests cover:
 * - Minimal backend creation
 * - Schema and authentication integration
 * - Settings validation
 * - Environment detection and override
 * - Type inference
 * - Error cases
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineSchema, a, c, e, f } from '../schema';
import { defineAuth, auth } from '../auth';
import {
  defineBackend,
  isBackendObject,
  getBackendMetadata,
  getEnabledFeatures,
  isFeatureEnabled,
} from './define-backend';
import type { BackendObject } from './types';

// ============================================================================
// Test Fixtures
// ============================================================================

// Simple schema for testing
const testSchema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().required().email(),
      name: a.string().required(),
    }),
    DataUploaded: e.model({
      datasetId: a.string().required(),
      fileUrl: a.string().url().required(),
    }),
    GenerateReport: f.model({
      input: {
        datasetId: a.string().required(),
      },
      output: {
        reportUrl: a.string().url().required(),
      },
    }),
  }),
});

// Simple auth for testing
const testAuth = defineAuth({
  Entra: auth.entra().tenant('test-tenant-id').clientId('test-client-id').audience('api://test'),
});

// ============================================================================
// Environment Helpers
// ============================================================================

describe('defineBackend() - Core Functionality', () => {
  let originalNodeEnv: string | undefined;
  let originalEnvironment: string | undefined;

  beforeEach(() => {
    // Save original environment variables
    originalNodeEnv = process.env.NODE_ENV;
    originalEnvironment = process.env.ENVIRONMENT;

    // Reset to development for consistent tests
    delete process.env.NODE_ENV;
    delete process.env.ENVIRONMENT;
  });

  afterEach(() => {
    // Restore original environment variables
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }

    if (originalEnvironment !== undefined) {
      process.env.ENVIRONMENT = originalEnvironment;
    } else {
      delete process.env.ENVIRONMENT;
    }

    delete process.env.AZURE_REGION;
  });

  // ============================================================================
  // Basic Creation Tests
  // ============================================================================

  describe('Basic Backend Creation', () => {
    it('should create minimal backend with only schema and name', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: {
          name: 'test-app',
        },
      });

      expect(backend).toBeDefined();
      expect(backend.schema.models).toBe(testSchema.models);
      expect(backend.schema.schema).toBe(testSchema.schema);
      expect(backend.settings.name).toBe('test-app');
      expect(backend.authentication).toBeUndefined();
    });

    it('should create backend with schema and authentication', () => {
      const backend = defineBackend({
        schema: testSchema,
        authentication: testAuth,
        settings: {
          name: 'test-app',
        },
      });

      expect(backend).toBeDefined();
      expect(backend.schema.models).toBe(testSchema.models);
      expect(backend.schema.schema).toBe(testSchema.schema);
      expect(backend.authentication).toBe(testAuth);
      expect(backend.settings.name).toBe('test-app');
    });

    it('should create backend with all settings', () => {
      const backend = defineBackend({
        schema: testSchema,
        authentication: testAuth,
        settings: {
          name: 'my-app',
          region: 'westus2',
          resourceGroup: 'custom-rg',
          tags: {
            team: 'platform',
            costCenter: 'eng-001',
          },
          features: {
            monitoring: true,
            networking: true,
            performance: false,
          },
        },
      });

      expect(backend.settings.name).toBe('my-app');
      expect(backend.settings.region).toBe('westus2');
      expect(backend.settings.resourceGroup).toBe('custom-rg');
      expect(backend.settings.tags.team).toBe('platform');
      expect(backend.settings.tags.costCenter).toBe('eng-001');
      expect(backend.settings.features.monitoring).toBe(true);
      expect(backend.settings.features.networking).toBe(true);
      expect(backend.settings.features.performance).toBe(false);
    });
  });

  // ============================================================================
  // Validation Tests
  // ============================================================================

  describe('Input Validation', () => {
    it('should throw error if schema is missing', () => {
      expect(() =>
        defineBackend({
          schema: null as any,
          settings: { name: 'test' },
        })
      ).toThrow('Backend config.schema is required');
    });

    it('should throw error if settings are missing', () => {
      expect(() =>
        defineBackend({
          schema: testSchema,
          settings: null as any,
        })
      ).toThrow('Backend config.settings is required');
    });

    it('should throw error if name is missing', () => {
      expect(() =>
        defineBackend({
          schema: testSchema,
          settings: {} as any,
        })
      ).toThrow('Backend settings.name is required');
    });

    it('should throw error if name is empty string', () => {
      expect(() =>
        defineBackend({
          schema: testSchema,
          settings: { name: '' },
        })
      ).toThrow('Backend settings.name is required');
    });

    it('should throw error if name is whitespace only', () => {
      expect(() =>
        defineBackend({
          schema: testSchema,
          settings: { name: '   ' },
        })
      ).toThrow('Backend settings.name is required');
    });

    it('should throw error if name contains invalid characters', () => {
      expect(() =>
        defineBackend({
          schema: testSchema,
          settings: { name: 'my app!' },
        })
      ).toThrow('must contain only alphanumeric characters, hyphens, and underscores');
    });

    it('should allow valid names with hyphens and underscores', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'my-app_123' },
      });

      expect(backend.settings.name).toBe('my-app_123');
    });
  });

  // ============================================================================
  // Environment Detection Tests
  // ============================================================================

  describe('Environment Detection', () => {
    it('should default to development environment', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.environment).toBe('development');
    });

    it('should detect production from NODE_ENV', () => {
      process.env.NODE_ENV = 'production';

      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.environment).toBe('production');
    });

    it('should detect production from prod alias', () => {
      process.env.NODE_ENV = 'prod';

      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.environment).toBe('production');
    });

    it('should detect staging from NODE_ENV', () => {
      process.env.NODE_ENV = 'staging';

      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.environment).toBe('staging');
    });

    it('should detect staging from stage alias', () => {
      process.env.NODE_ENV = 'stage';

      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.environment).toBe('staging');
    });

    it('should detect staging from test alias', () => {
      process.env.NODE_ENV = 'test';

      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.environment).toBe('staging');
    });

    it('should detect development from dev alias', () => {
      process.env.NODE_ENV = 'dev';

      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.environment).toBe('development');
    });

    it('should use ENVIRONMENT variable if NODE_ENV is not set', () => {
      process.env.ENVIRONMENT = 'production';

      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.environment).toBe('production');
    });

    it('should allow explicit environment override', () => {
      process.env.NODE_ENV = 'development';

      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
        environment: 'production',
      });

      expect(backend.environment).toBe('production');
    });
  });

  // ============================================================================
  // Settings Resolution Tests
  // ============================================================================

  describe('Settings Resolution', () => {
    it('should use default region if not specified', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.settings.region).toBe('eastus');
    });

    it('should use AZURE_REGION environment variable', () => {
      process.env.AZURE_REGION = 'westus';

      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.settings.region).toBe('westus');
    });

    it('should prefer explicit region over environment variable', () => {
      process.env.AZURE_REGION = 'westus';

      const backend = defineBackend({
        schema: testSchema,
        settings: {
          name: 'test',
          region: 'eastus2',
        },
      });

      expect(backend.settings.region).toBe('eastus2');
    });

    it('should generate default resource group name', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'my-app' },
      });

      expect(backend.settings.resourceGroup).toBe('my-app-rg');
    });

    it('should use custom resource group name if provided', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: {
          name: 'my-app',
          resourceGroup: 'custom-rg',
        },
      });

      expect(backend.settings.resourceGroup).toBe('custom-rg');
    });

    it('should add environment tag automatically', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.settings.tags.environment).toBe('development');
    });

    it('should merge user tags with environment tag', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: {
          name: 'test',
          tags: {
            team: 'platform',
            costCenter: 'eng-001',
          },
        },
      });

      expect(backend.settings.tags.environment).toBe('development');
      expect(backend.settings.tags.team).toBe('platform');
      expect(backend.settings.tags.costCenter).toBe('eng-001');
    });
  });

  // ============================================================================
  // Feature Flags Tests
  // ============================================================================

  describe('Feature Flags', () => {
    it('should disable all features in development by default', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.settings.features.monitoring).toBe(false);
      expect(backend.settings.features.networking).toBe(false);
      expect(backend.settings.features.performance).toBe(false);
    });

    it('should enable monitoring in staging by default', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
        environment: 'staging',
      });

      expect(backend.settings.features.monitoring).toBe(true);
      expect(backend.settings.features.networking).toBe(true);
      expect(backend.settings.features.performance).toBe(false);
    });

    it('should enable all features in production by default', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
        environment: 'production',
      });

      expect(backend.settings.features.monitoring).toBe(true);
      expect(backend.settings.features.networking).toBe(true);
      expect(backend.settings.features.performance).toBe(true);
    });

    it('should allow explicit feature override in development', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: {
          name: 'test',
          features: {
            monitoring: true,
          },
        },
      });

      expect(backend.settings.features.monitoring).toBe(true);
    });

    it('should allow disabling features in production', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: {
          name: 'test',
          features: {
            networking: false,
          },
        },
        environment: 'production',
      });

      expect(backend.settings.features.networking).toBe(false);
      expect(backend.settings.features.monitoring).toBe(true); // Still enabled by default
    });
  });

  // ============================================================================
  // Infrastructure Attachment Points Tests
  // ============================================================================

  describe('Infrastructure Attachment Points', () => {
    it('should create storage attachment points', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.storage).toBeDefined();
      expect(backend.storage.account).toBeDefined();
      expect(backend.storage.database).toBeDefined();
    });

    it('should create compute attachment points', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.compute).toBeDefined();
      expect(backend.compute.functionApp).toBeDefined();
    });

    it('should not create network attachment points in development', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.network).toBeUndefined();
    });

    it('should create network attachment points when enabled', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: {
          name: 'test',
          features: { networking: true },
        },
      });

      expect(backend.network).toBeDefined();
      expect(backend.network!.vnet).toBeDefined();
      expect(backend.network!.waf).toBeDefined();
      expect(backend.network!.ddos).toBeDefined();
    });

    it('should not create monitoring attachment points in development', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.monitoring).toBeUndefined();
    });

    it('should create monitoring attachment points when enabled', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: {
          name: 'test',
          features: { monitoring: true },
        },
      });

      expect(backend.monitoring).toBeDefined();
      expect(backend.monitoring!.appInsights).toBeDefined();
      expect(backend.monitoring!.logAnalytics).toBeDefined();
      expect(backend.monitoring!.alerts).toBeDefined();
    });

    it('should not create performance attachment points in development', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.performance).toBeUndefined();
    });

    it('should create performance attachment points when enabled', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: {
          name: 'test',
          features: { performance: true },
        },
      });

      expect(backend.performance).toBeDefined();
      expect(backend.performance!.cdn).toBeDefined();
      expect(backend.performance!.cache).toBeDefined();
      expect(backend.performance!.rateLimit).toBeDefined();
    });
  });

  // ============================================================================
  // Schema Integration Tests
  // ============================================================================

  describe('Schema Integration', () => {
    it('should create model attachment points for all models', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.models).toBeDefined();
      expect(backend.models.User).toBeDefined();
      expect(backend.models.DataUploaded).toBeDefined();
      expect(backend.models.GenerateReport).toBeDefined();
    });

    it('should preserve schema reference', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.schema.models).toBe(testSchema.models);
      expect(backend.schema.schema).toBe(testSchema.schema);
    });
  });

  // ============================================================================
  // Metadata Tests
  // ============================================================================

  describe('Backend Metadata', () => {
    it('should generate metadata', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend._metadata).toBeDefined();
      expect(backend._metadata.version).toBe('1.0.0');
      expect(backend._metadata.environment).toBe('development');
      expect(backend._metadata.modelCount).toBe(3);
      expect(backend._metadata.hasAuthentication).toBe(false);
      expect(backend._metadata.createdAt).toBeInstanceOf(Date);
    });

    it('should include authentication in metadata when present', () => {
      const backend = defineBackend({
        schema: testSchema,
        authentication: testAuth,
        settings: { name: 'test' },
      });

      expect(backend._metadata.hasAuthentication).toBe(true);
    });

    it('should list enabled features in metadata', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: {
          name: 'test',
          features: {
            monitoring: true,
            performance: true,
          },
        },
      });

      expect(backend._metadata.enabledFeatures).toContain('monitoring');
      expect(backend._metadata.enabledFeatures).toContain('performance');
      expect(backend._metadata.enabledFeatures).not.toContain('networking');
    });
  });

  // ============================================================================
  // Helper Functions Tests
  // ============================================================================

  describe('Helper Functions', () => {
    it('isBackendObject should identify valid backend objects', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(isBackendObject(backend)).toBe(true);
    });

    it('isBackendObject should reject invalid objects', () => {
      expect(isBackendObject(null)).toBe(false);
      expect(isBackendObject(undefined)).toBe(false);
      expect(isBackendObject({})).toBe(false);
      expect(isBackendObject({ schema: testSchema })).toBe(false);
    });

    it('getBackendMetadata should return metadata', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      const metadata = getBackendMetadata(backend);
      expect(metadata).toBe(backend._metadata);
    });

    it('getEnabledFeatures should return array of enabled features', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: {
          name: 'test',
          features: { monitoring: true },
        },
      });

      const features = getEnabledFeatures(backend);
      expect(features).toEqual(['monitoring']);
    });

    it('isFeatureEnabled should check feature status', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: {
          name: 'test',
          features: { monitoring: true },
        },
      });

      expect(isFeatureEnabled(backend, 'monitoring')).toBe(true);
      expect(isFeatureEnabled(backend, 'networking')).toBe(false);
      expect(isFeatureEnabled(backend, 'performance')).toBe(false);
    });
  });

  // ============================================================================
  // Attachment Point Placeholder Tests
  // ============================================================================

  describe('Attachment Point Placeholders', () => {
    it('should provide placeholder attachment points', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      expect(backend.storage.account.isAttached()).toBe(false);
      expect(backend.storage.account.getConfig()).toBeDefined();
    });

    it('should allow attaching custom configuration', () => {
      const backend = defineBackend({
        schema: testSchema,
        settings: { name: 'test' },
      });

      // Attachment should work now (not throw error)
      expect(() => backend.storage.account.attach({})).not.toThrow();
      expect(backend.storage.account.isAttached()).toBe(true);
    });
  });
});
