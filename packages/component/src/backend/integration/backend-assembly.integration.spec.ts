/**
 * Backend Assembly Integration Tests
 *
 * Comprehensive end-to-end tests for the complete backend assembly system.
 * Tests the integration of schema, authentication, environment defaults, and
 * attachment points working together.
 *
 * @module @atakora/component/backend/integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defineBackend } from '../define-backend';
import { defineSchema } from '../../schema/define-schema';
import { c } from '../../schema/crud-model';
import { e } from '../../schema/event-model';
import { f } from '../../schema/function-model';
import { a } from '../../schema/field-types';
import { defineAuth } from '../../auth/define-auth';
import { auth } from '../../auth/providers';
import type { Environment } from '../types';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Save and restore environment variables
 */
class EnvHelper {
  private original: Record<string, string | undefined> = {};

  save(...keys: string[]): void {
    for (const key of keys) {
      this.original[key] = process.env[key];
    }
  }

  set(key: string, value: string): void {
    process.env[key] = value;
  }

  restore(): void {
    for (const [key, value] of Object.entries(this.original)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    this.original = {};
  }
}

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a minimal schema for testing
 */
function createMinimalSchema() {
  return defineSchema({
    schema: {
      User: c.model({
        id: a.id(),
        name: a.string().required(),
      }),
    },
  });
}

/**
 * Create a comprehensive schema for testing
 */
function createComprehensiveSchema() {
  return defineSchema({
    schema: {
      User: c.model({
        id: a.id(),
        email: a.string().required(),
        name: a.string().required(),
        createdAt: a.datetime(),
      }),
      Post: c.model({
        id: a.id(),
        title: a.string().required(),
        content: a.string(),
        authorId: a.string().required(),
        publishedAt: a.datetime(),
      }),
      DataUploaded: e.model({
        fileId: a.string().required(),
        size: a.number().required(),
        uploadedAt: a.datetime(),
      }),
      GenerateReport: f.model({
        input: {
          datasetId: a.string().required(),
        },
        output: {
          reportUrl: a.string().required(),
        },
      }),
    },
  });
}

/**
 * Create a basic auth configuration
 */
function createBasicAuth() {
  return defineAuth({
    Entra: auth
      .entra()
      .tenant('test-tenant-id')
      .clientId('test-client-id')
      .audience('api://test-app'),
  });
}

// ============================================================================
// Test Suite: Minimal Backend Creation
// ============================================================================

describe('Backend Assembly Integration: Minimal Backend', () => {
  const env = new EnvHelper();

  beforeEach(() => {
    env.save('NODE_ENV', 'ENVIRONMENT', 'AZURE_REGION');
  });

  afterEach(() => {
    env.restore();
  });

  it('should create minimal backend with only schema and name', () => {
    // Clear NODE_ENV so it defaults to 'development'
    delete process.env.NODE_ENV;
    delete process.env.ENVIRONMENT;

    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
    });

    // Verify basic properties
    expect(backend.schema.models).toBe(schema.models);
    expect(backend.schema.schema).toBe(schema.schema);
    expect(backend.settings.name).toBe('test-app');
    expect(backend.environment).toBe('development');

    // Verify metadata
    expect(backend._metadata.version).toBe('1.0.0');
    expect(backend._metadata.environment).toBe('development');
    expect(backend._metadata.modelCount).toBe(1);
    expect(backend._metadata.hasAuthentication).toBe(false);
  });

  it('should apply development defaults', () => {
    env.set('NODE_ENV', 'development');
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'dev-app' },
    });

    // Development should have minimal features
    expect(backend.settings.features.monitoring).toBe(false);
    expect(backend.settings.features.networking).toBe(false);
    expect(backend.settings.features.performance).toBe(false);

    // Optional components should be undefined in development
    expect(backend.network).toBeUndefined();
    expect(backend.monitoring).toBeUndefined();
    expect(backend.performance).toBeUndefined();

    // Required components should exist
    expect(backend.storage).toBeDefined();
    expect(backend.storage.database).toBeDefined();
    expect(backend.storage.account).toBeDefined();
    expect(backend.compute).toBeDefined();
    expect(backend.compute.functionApp).toBeDefined();
  });

  it('should use default region when not specified', () => {
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
    });

    expect(backend.settings.region).toBe('eastus');
  });

  it('should use AZURE_REGION environment variable when set', () => {
    env.set('AZURE_REGION', 'westus2');
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
    });

    expect(backend.settings.region).toBe('westus2');
  });

  it('should override region with explicit setting', () => {
    env.set('AZURE_REGION', 'westus2');
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: {
        name: 'test-app',
        region: 'eastus2',
      },
    });

    expect(backend.settings.region).toBe('eastus2');
  });

  it('should generate default resource group name', () => {
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'my-app' },
    });

    expect(backend.settings.resourceGroup).toBe('my-app-rg');
  });

  it('should use custom resource group name when provided', () => {
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: {
        name: 'my-app',
        resourceGroup: 'custom-rg',
      },
    });

    expect(backend.settings.resourceGroup).toBe('custom-rg');
  });

  it('should include environment tag by default', () => {
    // Clear NODE_ENV so it defaults to 'development'
    delete process.env.NODE_ENV;
    delete process.env.ENVIRONMENT;

    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
    });

    expect(backend.settings.tags.environment).toBe('development');
  });

  it('should merge custom tags with environment tag', () => {
    // Clear NODE_ENV so it defaults to 'development'
    delete process.env.NODE_ENV;
    delete process.env.ENVIRONMENT;

    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: {
        name: 'test-app',
        tags: {
          team: 'platform',
          costCenter: 'eng-001',
        },
      },
    });

    expect(backend.settings.tags).toEqual({
      environment: 'development',
      team: 'platform',
      costCenter: 'eng-001',
    });
  });
});

// ============================================================================
// Test Suite: Schema + Backend Integration
// ============================================================================

describe('Backend Assembly Integration: Schema Integration', () => {
  it('should integrate comprehensive schema with backend', () => {
    const schema = createComprehensiveSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'comprehensive-app' },
    });

    // Verify schema is preserved
    expect(backend.schema.models).toBe(schema.models);
    expect(backend.schema.schema).toBe(schema.schema);
    expect(backend._metadata.modelCount).toBe(4);

    // Verify model attachment points are created
    expect(backend.models).toBeDefined();
    expect(backend.models.User).toBeDefined();
    expect(backend.models.Post).toBeDefined();
    expect(backend.models.DataUploaded).toBeDefined();
    expect(backend.models.GenerateReport).toBeDefined();
  });

  it('should handle schema with only CRUD models', () => {
    const schema = defineSchema({
      schema: {
        Product: c.model({
          id: a.id(),
          name: a.string().required(),
          price: a.number().required(),
        }),
        Category: c.model({
          id: a.id(),
          name: a.string().required(),
        }),
      },
    });

    const backend = defineBackend({
      schema,
      settings: { name: 'crud-app' },
    });

    expect(backend._metadata.modelCount).toBe(2);
    expect(backend.models.Product).toBeDefined();
    expect(backend.models.Category).toBeDefined();
  });

  it('should handle schema with only event models', () => {
    const schema = defineSchema({
      schema: {
        OrderPlaced: e.model({
          orderId: a.string().required(),
          total: a.number().required(),
        }),
        PaymentProcessed: e.model({
          paymentId: a.string().required(),
          amount: a.number().required(),
        }),
      },
    });

    const backend = defineBackend({
      schema,
      settings: { name: 'event-app' },
    });

    expect(backend._metadata.modelCount).toBe(2);
    expect(backend.models.OrderPlaced).toBeDefined();
    expect(backend.models.PaymentProcessed).toBeDefined();
  });
});

// ============================================================================
// Test Suite: Auth + Backend Integration
// ============================================================================

describe('Backend Assembly Integration: Authentication Integration', () => {
  it('should integrate auth with backend', () => {
    const schema = createMinimalSchema();
    const authentication = createBasicAuth();

    const backend = defineBackend({
      schema,
      authentication,
      settings: { name: 'auth-app' },
    });

    // Verify auth is preserved
    expect(backend.authentication).toBe(authentication);
    expect(backend._metadata.hasAuthentication).toBe(true);
  });

  it('should work without authentication', () => {
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'no-auth-app' },
    });

    expect(backend.authentication).toBeUndefined();
    expect(backend._metadata.hasAuthentication).toBe(false);
  });
});

// ============================================================================
// Test Suite: Multi-Environment Testing
// ============================================================================

describe('Backend Assembly Integration: Multi-Environment', () => {
  const env = new EnvHelper();

  beforeEach(() => {
    env.save('NODE_ENV');
  });

  afterEach(() => {
    env.restore();
  });

  it('development: serverless, no network, minimal monitoring', () => {
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'dev-app' },
      environment: 'development',
    });

    expect(backend.environment).toBe('development');
    expect(backend.settings.features.monitoring).toBe(false);
    expect(backend.settings.features.networking).toBe(false);
    expect(backend.settings.features.performance).toBe(false);
    expect(backend.network).toBeUndefined();
    expect(backend.monitoring).toBeUndefined();
    expect(backend.performance).toBeUndefined();
  });

  it('staging: provisioned, network, full monitoring', () => {
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'staging-app' },
      environment: 'staging',
    });

    expect(backend.environment).toBe('staging');
    expect(backend.settings.features.monitoring).toBe(true);
    expect(backend.settings.features.networking).toBe(true);
    expect(backend.settings.features.performance).toBe(false);
    expect(backend.network).toBeDefined();
    expect(backend.monitoring).toBeDefined();
    expect(backend.performance).toBeUndefined();
  });

  it('production: autoscale, network, monitoring, performance', () => {
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'prod-app' },
      environment: 'production',
    });

    expect(backend.environment).toBe('production');
    expect(backend.settings.features.monitoring).toBe(true);
    expect(backend.settings.features.networking).toBe(true);
    expect(backend.settings.features.performance).toBe(true);
    expect(backend.network).toBeDefined();
    expect(backend.monitoring).toBeDefined();
    expect(backend.performance).toBeDefined();
  });

  it('should detect environment from NODE_ENV', () => {
    env.set('NODE_ENV', 'production');
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'auto-detect-app' },
    });

    expect(backend.environment).toBe('production');
    expect(backend.settings.features.monitoring).toBe(true);
  });

  it('should allow explicit environment override', () => {
    env.set('NODE_ENV', 'development');
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'override-app' },
      environment: 'production',
    });

    expect(backend.environment).toBe('production');
    expect(backend.settings.features.monitoring).toBe(true);
  });
});

// ============================================================================
// Test Suite: Feature Flag Overrides
// ============================================================================

describe('Backend Assembly Integration: Feature Flags', () => {
  it('should enable monitoring in development when explicitly set', () => {
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: {
        name: 'dev-monitoring-app',
        features: {
          monitoring: true,
        },
      },
      environment: 'development',
    });

    expect(backend.settings.features.monitoring).toBe(true);
    expect(backend.monitoring).toBeDefined();
    expect(backend.monitoring?.appInsights).toBeDefined();
    expect(backend.monitoring?.logAnalytics).toBeDefined();
  });

  it('should disable monitoring in production when explicitly set', () => {
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: {
        name: 'prod-no-monitoring-app',
        features: {
          monitoring: false,
        },
      },
      environment: 'production',
    });

    expect(backend.settings.features.monitoring).toBe(false);
    expect(backend.monitoring).toBeUndefined();
  });

  it('should allow selective feature enablement', () => {
    const schema = createMinimalSchema();

    const backend = defineBackend({
      schema,
      settings: {
        name: 'selective-app',
        features: {
          monitoring: true,
          networking: false,
          performance: false,
        },
      },
      environment: 'production',
    });

    expect(backend.settings.features.monitoring).toBe(true);
    expect(backend.settings.features.networking).toBe(false);
    expect(backend.settings.features.performance).toBe(false);
    expect(backend.monitoring).toBeDefined();
    expect(backend.network).toBeUndefined();
    expect(backend.performance).toBeUndefined();
  });
});

// ============================================================================
// Test Suite: Complete Integration Flow
// ============================================================================

describe('Backend Assembly Integration: Complete Flow', () => {
  it('should create production backend with schema and auth', () => {
    const schema = createComprehensiveSchema();
    const authentication = createBasicAuth();

    const backend = defineBackend({
      schema,
      authentication,
      settings: {
        name: 'prod-complete-app',
        region: 'westus',
        tags: {
          team: 'platform',
          environment: 'production',
        },
      },
      environment: 'production',
    });

    // Verify all components
    expect(backend.schema.models).toBe(schema.models);
    expect(backend.schema.schema).toBe(schema.schema);
    expect(backend.authentication).toBe(authentication);
    expect(backend.environment).toBe('production');
    expect(backend.settings.name).toBe('prod-complete-app');
    expect(backend.settings.region).toBe('westus');

    // Verify metadata
    expect(backend._metadata.modelCount).toBe(4);
    expect(backend._metadata.hasAuthentication).toBe(true);
    expect(backend._metadata.environment).toBe('production');
    expect(backend._metadata.enabledFeatures).toEqual(['monitoring', 'networking', 'performance']);

    // Verify infrastructure
    expect(backend.storage).toBeDefined();
    expect(backend.compute).toBeDefined();
    expect(backend.network).toBeDefined();
    expect(backend.monitoring).toBeDefined();
    expect(backend.performance).toBeDefined();

    // Verify models
    expect(backend.models.User).toBeDefined();
    expect(backend.models.Post).toBeDefined();
    expect(backend.models.DataUploaded).toBeDefined();
    expect(backend.models.GenerateReport).toBeDefined();
  });
});

// ============================================================================
// Test Suite: Error Handling
// ============================================================================

describe('Backend Assembly Integration: Error Handling', () => {
  it('should throw error when schema is missing', () => {
    expect(() => {
      defineBackend({
        schema: undefined as any,
        settings: { name: 'test-app' },
      });
    }).toThrow('Backend config.schema is required');
  });

  it('should throw error when settings are missing', () => {
    const schema = createMinimalSchema();

    expect(() => {
      defineBackend({
        schema,
        settings: undefined as any,
      });
    }).toThrow('Backend config.settings is required');
  });

  it('should throw error when name is missing', () => {
    const schema = createMinimalSchema();

    expect(() => {
      defineBackend({
        schema,
        settings: { name: '' },
      });
    }).toThrow('Backend settings.name is required');
  });

  it('should throw error when name has invalid characters', () => {
    const schema = createMinimalSchema();

    expect(() => {
      defineBackend({
        schema,
        settings: { name: 'invalid name!' },
      });
    }).toThrow('must contain only alphanumeric characters');
  });

  it('should allow hyphens and underscores in name', () => {
    const schema = createMinimalSchema();

    expect(() => {
      defineBackend({
        schema,
        settings: { name: 'my-app_name123' },
      });
    }).not.toThrow();
  });
});
