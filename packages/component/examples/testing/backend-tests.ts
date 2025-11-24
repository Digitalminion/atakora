/**
 * Example: Testing Custom Backends
 *
 * Demonstrates comprehensive testing strategies for backend
 * definitions, attachments, and synthesis output.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defineBackend, defineSchema, defineAuth } from '@atakora/component';
import { storage, compute } from '@atakora/component/builders';
import { a, c, auth } from '@atakora/component';

// Test fixtures
const createTestSchema = () =>
  defineSchema({
    schema: a.schema({
      User: c.model({
        id: a.id(),
        email: a.string().email().required(),
        name: a.string().required()
      }).timestamps(true)
    })
  });

const createTestAuth = () =>
  defineAuth({
    Primary: auth.jwt().issuer('https://test.example.com')
  });

// ============================================================================
// Unit Tests - Backend Configuration
// ============================================================================

describe('Backend Configuration', () => {
  it('should create backend with correct settings', () => {
    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: {
        name: 'test-app',
        environment: 'development'
      }
    });

    expect(backend.settings.name).toBe('test-app');
    expect(backend.environment).toBe('development');
  });

  it('should auto-detect environment from NODE_ENV', () => {
    process.env.NODE_ENV = 'production';

    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: { name: 'test-app' }
    });

    expect(backend.environment).toBe('production');
  });

  it('should enable features based on environment', () => {
    const prodBackend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: {
        name: 'test-app',
        environment: 'production'
      }
    });

    expect(prodBackend.settings.features.monitoring).toBe(true);
    expect(prodBackend.settings.features.networking).toBe(true);

    const devBackend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: {
        name: 'test-app',
        environment: 'development'
      }
    });

    expect(devBackend.settings.features.monitoring).toBe(false);
    expect(devBackend.settings.features.networking).toBe(false);
  });

  it('should track metadata', () => {
    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: { name: 'test-app' }
    });

    expect(backend._metadata.version).toBe('1.0.0');
    expect(backend._metadata.modelCount).toBeGreaterThan(0);
    expect(backend._metadata.hasAuthentication).toBe(true);
  });
});

// ============================================================================
// Unit Tests - Attachment Points
// ============================================================================

describe('Attachment Points', () => {
  let backend: ReturnType<typeof defineBackend>;

  beforeEach(() => {
    backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: { name: 'test-app' }
    });
  });

  describe('Database Attachment', () => {
    it('should attach custom database configuration', () => {
      const config = storage.cosmosDb().name('custom-db').mode('Serverless');

      backend.storage.database.attach(config);

      expect(backend.storage.database.isAttached()).toBe(true);
      expect(backend.storage.database.getConfig()).toEqual(config);
    });

    it('should reset attached database configuration', () => {
      const config = storage.cosmosDb().name('custom-db');

      backend.storage.database.attach(config);
      expect(backend.storage.database.isAttached()).toBe(true);

      backend.storage.database.reset();
      expect(backend.storage.database.isAttached()).toBe(false);
    });

    it('should reject null configuration', () => {
      expect(() => {
        backend.storage.database.attach(null as any);
      }).toThrow('Cannot attach null or undefined configuration');
    });

    it('should track attachment in backend', () => {
      const config = storage.cosmosDb().name('custom-db');

      backend.storage.database.attach(config);

      expect(backend._attachments.has('storage.database')).toBe(true);
    });
  });

  describe('Function App Attachment', () => {
    it('should attach custom function app configuration', () => {
      const config = compute.functionApp()
        .name('custom-func')
        .plan('Premium')
        .sku('EP1');

      backend.compute.functionApp.attach(config);

      expect(backend.compute.functionApp.isAttached()).toBe(true);
    });

    it('should validate function app plan', () => {
      expect(() => {
        backend.compute.functionApp.attach({
          plan: 'InvalidPlan'
        } as any);
      }).toThrow();
    });
  });

  describe('Blob Storage Attachment', () => {
    it('should attach custom blob storage configuration', () => {
      const config = storage.blobStorage()
        .name('customblobs')
        .sku('Standard_GRS')
        .accessTier('Cool');

      backend.storage.blobs.attach(config);

      expect(backend.storage.blobs.isAttached()).toBe(true);
    });
  });
});

// ============================================================================
// Integration Tests - Multi-Environment Configuration
// ============================================================================

describe('Multi-Environment Configuration', () => {
  it('should configure development environment', () => {
    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: {
        name: 'multi-env-app',
        environment: 'development'
      }
    });

    backend.storage.database.attach(
      storage.cosmosDb().mode('Serverless')
    );

    backend.compute.functionApp.attach(
      compute.functionApp().plan('Consumption')
    );

    expect(backend.storage.database.getConfig().mode).toBe('Serverless');
    expect(backend.compute.functionApp.getConfig().plan).toBe('Consumption');
  });

  it('should configure production environment', () => {
    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: {
        name: 'multi-env-app',
        environment: 'production'
      }
    });

    backend.storage.database.attach(
      storage.cosmosDb()
        .mode('Provisioned')
        .throughput({ mode: 'autoscale', maxRU: 20000 })
    );

    backend.compute.functionApp.attach(
      compute.functionApp()
        .plan('Premium')
        .sku('EP2')
        .alwaysOn(true)
    );

    const dbConfig = backend.storage.database.getConfig();
    expect(dbConfig.mode).toBe('Provisioned');
    expect(dbConfig.throughput?.maxRU).toBe(20000);

    const funcConfig = backend.compute.functionApp.getConfig();
    expect(funcConfig.plan).toBe('Premium');
    expect(funcConfig.alwaysOn).toBe(true);
  });
});

// ============================================================================
// Integration Tests - Feature Flags
// ============================================================================

describe('Feature Flags', () => {
  it('should enable monitoring in production', () => {
    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: {
        name: 'test-app',
        environment: 'production'
      }
    });

    expect(backend.monitoring).toBeDefined();
    expect(backend.monitoring?.appInsights).toBeDefined();
    expect(backend.monitoring?.logs).toBeDefined();
  });

  it('should disable networking in development', () => {
    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: {
        name: 'test-app',
        environment: 'development'
      }
    });

    expect(backend.network).toBeUndefined();
  });

  it('should allow explicit feature override', () => {
    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: {
        name: 'test-app',
        environment: 'development',
        features: {
          monitoring: true,  // Override default
          networking: false,
          performance: false
        }
      }
    });

    expect(backend.monitoring).toBeDefined();
    expect(backend.network).toBeUndefined();
  });
});

// ============================================================================
// Integration Tests - Schema Model Access
// ============================================================================

describe('Schema Model Access', () => {
  it('should expose models on backend.schema', () => {
    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: { name: 'test-app' }
    });

    expect(backend.schema.User).toBeDefined();
  });

  it('should provide model attachment points', () => {
    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: { name: 'test-app' }
    });

    expect(backend.schema.User.container).toBeDefined();
  });

  it('should attach model-specific configuration', () => {
    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: { name: 'test-app' }
    });

    const containerConfig = storage.container()
      .name('users')
      .partitionKey('/id')
      .uniqueKeys(['/email']);

    backend.schema.User.container.attach(containerConfig);

    expect(backend.schema.User.container.isAttached()).toBe(true);
  });
});

// ============================================================================
// Snapshot Tests - Configuration Output
// ============================================================================

describe('Configuration Snapshots', () => {
  it('should match development configuration snapshot', () => {
    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: {
        name: 'snapshot-test',
        environment: 'development'
      }
    });

    const snapshot = {
      name: backend.settings.name,
      environment: backend.environment,
      region: backend.settings.region,
      features: backend.settings.features,
      modelCount: backend._metadata.modelCount
    };

    expect(snapshot).toMatchSnapshot();
  });

  it('should match production configuration snapshot', () => {
    const backend = defineBackend({
      schema: createTestSchema(),
      authentication: createTestAuth(),
      settings: {
        name: 'snapshot-test',
        environment: 'production'
      }
    });

    const snapshot = {
      name: backend.settings.name,
      environment: backend.environment,
      features: backend.settings.features,
      hasMonitoring: backend.monitoring !== undefined,
      hasNetworking: backend.network !== undefined
    };

    expect(snapshot).toMatchSnapshot();
  });
});

export { createTestSchema, createTestAuth };
