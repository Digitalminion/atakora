/**
 * Attachment System Integration Tests
 *
 * Comprehensive tests for the attachment point system across all backend components.
 * Tests attachment precedence, resolution, validation, and multi-attachment scenarios.
 *
 * @module @atakora/component/backend/integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { defineBackend } from '../define-backend';
import { defineSchema } from '../../schema/define-schema';
import { c } from '../../schema/crud-model';
import { a } from '../../schema/field-types';
import { createAttachmentPoint, type AttachmentPoint } from '../attachment-point';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestSchema() {
  return defineSchema({
    schema: {
      User: c.model({
        id: a.id(),
        name: a.string().required(),
      }),
      Post: c.model({
        id: a.id(),
        title: a.string().required(),
      }),
    },
  });
}

// Mock configuration types for testing
interface DatabaseConfig {
  name: string;
  mode: 'Serverless' | 'Provisioned' | 'Autoscale';
  throughput?: {
    min: number;
    max: number;
  };
}

interface StorageAccountConfig {
  name: string;
  sku: 'Standard_LRS' | 'Standard_ZRS' | 'Standard_GRS';
  tier: 'Standard' | 'Premium';
}

interface FunctionAppConfig {
  name: string;
  plan: 'Consumption' | 'Premium' | 'Dedicated';
  sku?: string;
}

// ============================================================================
// Test Suite: Attachment Point Basics
// ============================================================================

describe('Attachment System Integration: Basic Operations', () => {
  it('should create attachment points for all infrastructure components', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
    });

    // Storage attachment points
    expect(backend.storage.database).toBeDefined();
    expect(backend.storage.account).toBeDefined();

    // Compute attachment points
    expect(backend.compute.functionApp).toBeDefined();

    // Attachment points should have required methods
    expect(backend.storage.database.attach).toBeInstanceOf(Function);
    expect(backend.storage.database.isAttached).toBeInstanceOf(Function);
    expect(backend.storage.database.getConfig).toBeInstanceOf(Function);
    expect(backend.storage.database.reset).toBeInstanceOf(Function);
  });

  it('should create optional attachment points based on features', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: {
        name: 'full-featured-app',
        features: {
          monitoring: true,
          networking: true,
          performance: true,
        },
      },
    });

    // Monitoring attachment points
    expect(backend.monitoring).toBeDefined();
    expect(backend.monitoring?.appInsights).toBeDefined();
    expect(backend.monitoring?.logAnalytics).toBeDefined();

    // Network attachment points
    expect(backend.network).toBeDefined();
    expect(backend.network?.vnet).toBeDefined();
    expect(backend.network?.waf).toBeDefined();

    // Performance attachment points
    expect(backend.performance).toBeDefined();
    expect(backend.performance?.cdn).toBeDefined();
    expect(backend.performance?.cache).toBeDefined();
  });

  it('should not create optional attachment points when features disabled', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: {
        name: 'minimal-app',
        features: {
          monitoring: false,
          networking: false,
          performance: false,
        },
      },
    });

    expect(backend.monitoring).toBeUndefined();
    expect(backend.network).toBeUndefined();
    expect(backend.performance).toBeUndefined();
  });
});

// ============================================================================
// Test Suite: Attachment Operations
// ============================================================================

describe('Attachment System Integration: Attach and Retrieve', () => {
  it('should start with unattached state', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
    });

    expect(backend.storage.database.isAttached()).toBe(false);
    expect(backend.storage.account.isAttached()).toBe(false);
    expect(backend.compute.functionApp.isAttached()).toBe(false);
  });

  it('should return default config when not attached', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
    });

    const config = backend.storage.database.getConfig();
    expect(config).toBeDefined();
    expect(config).toBe(backend.storage.database._default);
  });

  it.skip('should attach custom configuration', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
    });

    const customConfig: DatabaseConfig = {
      name: 'custom-db',
      mode: 'Autoscale',
      throughput: {
        min: 1000,
        max: 10000,
      },
    };

    backend.storage.database.attach(customConfig);

    expect(backend.storage.database.isAttached()).toBe(true);
    expect(backend.storage.database.getConfig()).toBe(customConfig);
  });

  it.skip('should reset to default configuration', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
    });

    const customConfig: DatabaseConfig = {
      name: 'custom-db',
      mode: 'Serverless',
    };

    // Attach custom config
    backend.storage.database.attach(customConfig);
    expect(backend.storage.database.isAttached()).toBe(true);

    // Reset to default
    backend.storage.database.reset();
    expect(backend.storage.database.isAttached()).toBe(false);
    expect(backend.storage.database.getConfig()).toBe(backend.storage.database._default);
  });

  it.skip('should update attachment when attaching again', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'test-app' },
    });

    const config1: DatabaseConfig = {
      name: 'db-v1',
      mode: 'Serverless',
    };

    const config2: DatabaseConfig = {
      name: 'db-v2',
      mode: 'Autoscale',
      throughput: {
        min: 2000,
        max: 20000,
      },
    };

    backend.storage.database.attach(config1);
    expect(backend.storage.database.getConfig()).toBe(config1);

    backend.storage.database.attach(config2);
    expect(backend.storage.database.getConfig()).toBe(config2);
  });
});

// ============================================================================
// Test Suite: Multiple Attachments
// ============================================================================

describe.skip('Attachment System Integration: Multiple Attachments', () => {
  it('should support attaching to multiple components independently', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'multi-attach-app' },
    });

    const dbConfig: DatabaseConfig = {
      name: 'custom-db',
      mode: 'Autoscale',
    };

    const storageConfig: StorageAccountConfig = {
      name: 'customstorage',
      sku: 'Standard_GRS',
      tier: 'Standard',
    };

    const functionConfig: FunctionAppConfig = {
      name: 'custom-functions',
      plan: 'Premium',
      sku: 'EP2',
    };

    // Attach to all components
    backend.storage.database.attach(dbConfig);
    backend.storage.account.attach(storageConfig);
    backend.compute.functionApp.attach(functionConfig);

    // Verify all are attached independently
    expect(backend.storage.database.isAttached()).toBe(true);
    expect(backend.storage.account.isAttached()).toBe(true);
    expect(backend.compute.functionApp.isAttached()).toBe(true);

    expect(backend.storage.database.getConfig()).toBe(dbConfig);
    expect(backend.storage.account.getConfig()).toBe(storageConfig);
    expect(backend.compute.functionApp.getConfig()).toBe(functionConfig);
  });

  it('should support partial attachment (some default, some custom)', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'partial-attach-app' },
    });

    const dbConfig: DatabaseConfig = {
      name: 'custom-db',
      mode: 'Serverless',
    };

    // Only attach database, leave others at default
    backend.storage.database.attach(dbConfig);

    expect(backend.storage.database.isAttached()).toBe(true);
    expect(backend.storage.account.isAttached()).toBe(false);
    expect(backend.compute.functionApp.isAttached()).toBe(false);

    expect(backend.storage.database.getConfig()).toBe(dbConfig);
    expect(backend.storage.account.getConfig()).toBe(backend.storage.account._default);
  });

  it('should support resetting individual attachments', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'reset-app' },
    });

    const dbConfig: DatabaseConfig = { name: 'db1', mode: 'Serverless' };
    const storageConfig: StorageAccountConfig = {
      name: 'storage1',
      sku: 'Standard_LRS',
      tier: 'Standard',
    };

    // Attach both
    backend.storage.database.attach(dbConfig);
    backend.storage.account.attach(storageConfig);

    // Reset only database
    backend.storage.database.reset();

    expect(backend.storage.database.isAttached()).toBe(false);
    expect(backend.storage.account.isAttached()).toBe(true);
  });
});

// ============================================================================
// Test Suite: Attachment Validation
// ============================================================================

describe.skip('Attachment System Integration: Validation', () => {
  it('should reject null configuration', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'validation-app' },
    });

    expect(() => {
      backend.storage.database.attach(null as any);
    }).toThrow('Cannot attach null or undefined');
  });

  it('should reject undefined configuration', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'validation-app' },
    });

    expect(() => {
      backend.storage.database.attach(undefined as any);
    }).toThrow('Cannot attach null or undefined');
  });

  it('should validate configuration type', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'validation-app' },
    });

    // Attach primitive to object attachment point should fail
    expect(() => {
      backend.storage.database.attach('invalid' as any);
    }).toThrow('must be an object');
  });
});

// ============================================================================
// Test Suite: Attachment Tracking
// ============================================================================

describe.skip('Attachment System Integration: Internal Tracking', () => {
  it('should track attachments in internal map', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'tracking-app' },
    });

    const dbConfig: DatabaseConfig = {
      name: 'tracked-db',
      mode: 'Serverless',
    };

    backend.storage.database.attach(dbConfig);

    // Check internal tracking
    expect(backend._attachments).toBeInstanceOf(Map);
    expect(backend._attachments.has('storage.database')).toBe(true);
    expect(backend._attachments.get('storage.database')).toBe(dbConfig);
  });

  it('should remove from tracking when reset', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'tracking-app' },
    });

    const dbConfig: DatabaseConfig = {
      name: 'tracked-db',
      mode: 'Serverless',
    };

    backend.storage.database.attach(dbConfig);
    expect(backend._attachments.has('storage.database')).toBe(true);

    backend.storage.database.reset();
    expect(backend._attachments.has('storage.database')).toBe(false);
  });

  it('should track multiple attachments separately', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'multi-tracking-app' },
    });

    const dbConfig: DatabaseConfig = { name: 'db', mode: 'Serverless' };
    const storageConfig: StorageAccountConfig = {
      name: 'storage',
      sku: 'Standard_LRS',
      tier: 'Standard',
    };

    backend.storage.database.attach(dbConfig);
    backend.storage.account.attach(storageConfig);

    expect(backend._attachments.size).toBe(2);
    expect(backend._attachments.has('storage.database')).toBe(true);
    expect(backend._attachments.has('storage.account')).toBe(true);
  });
});

// ============================================================================
// Test Suite: Attachment Paths
// ============================================================================

describe('Attachment System Integration: Attachment Paths', () => {
  it('should have correct path for storage attachments', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'path-app' },
    });

    expect(backend.storage.database._path).toBe('storage.database');
    expect(backend.storage.account._path).toBe('storage.account');
  });

  it('should have correct path for compute attachments', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'path-app' },
    });

    expect(backend.compute.functionApp._path).toBe('compute.functionApp');
  });

  it('should have correct path for monitoring attachments when enabled', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: {
        name: 'path-app',
        features: { monitoring: true },
      },
    });

    expect(backend.monitoring?.appInsights._path).toBe('monitoring.appInsights');
    expect(backend.monitoring?.logAnalytics._path).toBe('monitoring.logAnalytics');
  });

  it('should have correct path for network attachments when enabled', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: {
        name: 'path-app',
        features: { networking: true },
      },
    });

    expect(backend.network?.vnet._path).toBe('network.vnet');
    expect(backend.network?.waf._path).toBe('network.waf');
  });
});

// ============================================================================
// Test Suite: Environment-Aware Attachments
// ============================================================================

describe.skip('Attachment System Integration: Environment Awareness', () => {
  it('should allow overriding development defaults with attachments', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'dev-override-app' },
      environment: 'development',
    });

    // Development default would be Serverless
    const productionConfig: DatabaseConfig = {
      name: 'production-db',
      mode: 'Autoscale',
      throughput: {
        min: 4000,
        max: 40000,
      },
    };

    backend.storage.database.attach(productionConfig);

    // Attachment should override default
    expect(backend.storage.database.getConfig()).toBe(productionConfig);
    const config = backend.storage.database.getConfig() as DatabaseConfig;
    expect(config.mode).toBe('Autoscale');
  });

  it('should allow downgrading production defaults with attachments', () => {
    const schema = createTestSchema();

    const backend = defineBackend({
      schema,
      settings: { name: 'prod-downgrade-app' },
      environment: 'production',
    });

    // Production default would be Autoscale, downgrade to Serverless
    const devConfig: DatabaseConfig = {
      name: 'dev-db',
      mode: 'Serverless',
    };

    backend.storage.database.attach(devConfig);

    const config = backend.storage.database.getConfig() as DatabaseConfig;
    expect(config.mode).toBe('Serverless');
  });
});

// ============================================================================
// Test Suite: Attachment Point Factory
// ============================================================================

describe('Attachment System Integration: Attachment Point Creation', () => {
  it('should create attachment point with createAttachmentPoint', () => {
    const backend = {
      _attachments: new Map(),
    };

    const defaultConfig: DatabaseConfig = {
      name: 'default-db',
      mode: 'Serverless',
    };

    const attachment = createAttachmentPoint(backend, 'test.database', defaultConfig);

    expect(attachment._path).toBe('test.database');
    expect(attachment._default).toBe(defaultConfig);
    expect(attachment.isAttached()).toBe(false);
    expect(attachment.getConfig()).toBe(defaultConfig);
  });

  it('should create attachment point with validator', () => {
    const backend = {
      _attachments: new Map(),
    };

    const defaultConfig: DatabaseConfig = {
      name: 'default-db',
      mode: 'Serverless',
    };

    const validator = (config: DatabaseConfig) => {
      if (!config.name) return 'Database name is required';
      if (config.mode === 'Autoscale' && !config.throughput) {
        return 'Throughput is required for Autoscale mode';
      }
      return undefined;
    };

    const attachment = createAttachmentPoint(backend, 'test.database', defaultConfig, validator);

    // Valid config should work
    expect(() => {
      attachment.attach({ name: 'valid-db', mode: 'Serverless' });
    }).not.toThrow();

    // Invalid config should fail
    expect(() => {
      attachment.attach({ name: '', mode: 'Serverless' });
    }).toThrow('Database name is required');

    expect(() => {
      attachment.attach({ name: 'test', mode: 'Autoscale' });
    }).toThrow('Throughput is required for Autoscale mode');
  });
});
