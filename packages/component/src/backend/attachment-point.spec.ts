/**
 * Attachment Point System Tests
 *
 * Comprehensive test suite for the attachment point system that validates:
 * - Attachment and retrieval
 * - Status checking
 * - Reset functionality
 * - Validation logic
 * - Type safety
 * - Error handling
 *
 * @module @atakora/component/backend/attachment-point.spec
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AttachmentPoint,
  AttachmentPointImpl,
  BackendObjectRef,
  createAttachmentPoint,
  createAttachmentPoints,
  ConfigValidator,
} from './attachment-point';

/**
 * Test configuration types
 */
interface TestDatabaseConfig {
  readonly name: string;
  readonly mode: 'Serverless' | 'Autoscale' | 'Provisioned';
  readonly throughput?: number;
}

interface TestStorageConfig {
  readonly name: string;
  readonly sku: string;
  readonly tier: 'Hot' | 'Cool';
}

interface TestFunctionConfig {
  readonly name: string;
  readonly plan: string;
  readonly runtime: string;
}

/**
 * Helper: Create mock backend object
 */
function createMockBackend(): BackendObjectRef {
  return {
    _attachments: new Map<string, unknown>(),
  };
}

/**
 * Helper: Create test database config
 */
function createTestDatabaseConfig(overrides?: Partial<TestDatabaseConfig>): TestDatabaseConfig {
  return {
    name: 'test-db',
    mode: 'Serverless',
    throughput: 400,
    ...overrides,
  };
}

/**
 * Helper: Create test storage config
 */
function createTestStorageConfig(overrides?: Partial<TestStorageConfig>): TestStorageConfig {
  return {
    name: 'test-storage',
    sku: 'Standard_LRS',
    tier: 'Hot',
    ...overrides,
  };
}

describe('AttachmentPointImpl', () => {
  describe('constructor', () => {
    it('should create attachment point with default config', () => {
      const backend = createMockBackend();
      const defaultConfig = createTestDatabaseConfig();
      const attachment = new AttachmentPointImpl(backend, 'storage.database', defaultConfig);

      expect(attachment._path).toBe('storage.database');
      expect(attachment._default).toEqual(defaultConfig);
      expect(attachment._attached).toBeUndefined();
    });

    it('should create attachment point with validator', () => {
      const backend = createMockBackend();
      const defaultConfig = createTestDatabaseConfig();
      const validator: ConfigValidator<TestDatabaseConfig> = (config) => {
        if (!config.name) return 'Name is required';
        return undefined;
      };

      const attachment = new AttachmentPointImpl(
        backend,
        'storage.database',
        defaultConfig,
        validator
      );

      expect(attachment._path).toBe('storage.database');
      expect(attachment._default).toEqual(defaultConfig);
    });
  });

  describe('attach()', () => {
    let backend: BackendObjectRef;
    let attachment: AttachmentPoint<TestDatabaseConfig>;
    let defaultConfig: TestDatabaseConfig;

    beforeEach(() => {
      backend = createMockBackend();
      defaultConfig = createTestDatabaseConfig();
      attachment = new AttachmentPointImpl(backend, 'storage.database', defaultConfig);
    });

    it('should attach custom configuration', () => {
      const customConfig = createTestDatabaseConfig({
        name: 'custom-db',
        mode: 'Autoscale',
        throughput: 4000,
      });

      attachment.attach(customConfig);

      expect(attachment._attached).toEqual(customConfig);
      expect(backend._attachments.get('storage.database')).toEqual(customConfig);
    });

    it('should update attached configuration when called multiple times', () => {
      const config1 = createTestDatabaseConfig({ name: 'db1' });
      const config2 = createTestDatabaseConfig({ name: 'db2' });

      attachment.attach(config1);
      expect(attachment._attached).toEqual(config1);

      attachment.attach(config2);
      expect(attachment._attached).toEqual(config2);
    });

    it('should throw error for null configuration', () => {
      expect(() => {
        attachment.attach(null as unknown as TestDatabaseConfig);
      }).toThrow('Cannot attach null or undefined configuration');
    });

    it('should throw error for undefined configuration', () => {
      expect(() => {
        attachment.attach(undefined as unknown as TestDatabaseConfig);
      }).toThrow('Cannot attach null or undefined configuration');
    });

    it('should validate configuration type matches default type', () => {
      expect(() => {
        attachment.attach('invalid' as unknown as TestDatabaseConfig);
      }).toThrow('must be an object');
    });

    it('should run custom validator and throw on validation error', () => {
      const validator: ConfigValidator<TestDatabaseConfig> = (config) => {
        if (config.mode === 'Autoscale' && !config.throughput) {
          return 'Throughput is required for Autoscale mode';
        }
        return undefined;
      };

      const attachmentWithValidator = new AttachmentPointImpl(
        backend,
        'storage.database',
        defaultConfig,
        validator
      );

      const invalidConfig = createTestDatabaseConfig({
        mode: 'Autoscale',
        throughput: undefined,
      });

      expect(() => {
        attachmentWithValidator.attach(invalidConfig);
      }).toThrow('Throughput is required for Autoscale mode');
    });

    it('should pass validation for valid configuration', () => {
      const validator: ConfigValidator<TestDatabaseConfig> = (config) => {
        if (!config.name) return 'Name is required';
        return undefined;
      };

      const attachmentWithValidator = new AttachmentPointImpl(
        backend,
        'storage.database',
        defaultConfig,
        validator
      );

      const validConfig = createTestDatabaseConfig({ name: 'valid-db' });

      expect(() => {
        attachmentWithValidator.attach(validConfig);
      }).not.toThrow();
    });
  });

  describe('isAttached()', () => {
    let backend: BackendObjectRef;
    let attachment: AttachmentPoint<TestDatabaseConfig>;

    beforeEach(() => {
      backend = createMockBackend();
      const defaultConfig = createTestDatabaseConfig();
      attachment = new AttachmentPointImpl(backend, 'storage.database', defaultConfig);
    });

    it('should return false when no configuration is attached', () => {
      expect(attachment.isAttached()).toBe(false);
    });

    it('should return true when configuration is attached', () => {
      const customConfig = createTestDatabaseConfig({ name: 'custom-db' });
      attachment.attach(customConfig);

      expect(attachment.isAttached()).toBe(true);
    });

    it('should return false after reset', () => {
      const customConfig = createTestDatabaseConfig({ name: 'custom-db' });
      attachment.attach(customConfig);
      attachment.reset();

      expect(attachment.isAttached()).toBe(false);
    });
  });

  describe('getConfig()', () => {
    let backend: BackendObjectRef;
    let attachment: AttachmentPoint<TestDatabaseConfig>;
    let defaultConfig: TestDatabaseConfig;

    beforeEach(() => {
      backend = createMockBackend();
      defaultConfig = createTestDatabaseConfig();
      attachment = new AttachmentPointImpl(backend, 'storage.database', defaultConfig);
    });

    it('should return default configuration when nothing is attached', () => {
      const config = attachment.getConfig();

      expect(config).toEqual(defaultConfig);
      expect(config).toBe(defaultConfig); // Same reference
    });

    it('should return attached configuration when attached', () => {
      const customConfig = createTestDatabaseConfig({ name: 'custom-db' });
      attachment.attach(customConfig);

      const config = attachment.getConfig();

      expect(config).toEqual(customConfig);
      expect(config).toBe(customConfig); // Same reference
    });

    it('should return default configuration after reset', () => {
      const customConfig = createTestDatabaseConfig({ name: 'custom-db' });
      attachment.attach(customConfig);
      attachment.reset();

      const config = attachment.getConfig();

      expect(config).toEqual(defaultConfig);
      expect(config).toBe(defaultConfig);
    });

    it('should return updated configuration after multiple attachments', () => {
      const config1 = createTestDatabaseConfig({ name: 'db1' });
      const config2 = createTestDatabaseConfig({ name: 'db2' });

      attachment.attach(config1);
      expect(attachment.getConfig()).toEqual(config1);

      attachment.attach(config2);
      expect(attachment.getConfig()).toEqual(config2);
    });
  });

  describe('reset()', () => {
    let backend: BackendObjectRef;
    let attachment: AttachmentPoint<TestDatabaseConfig>;

    beforeEach(() => {
      backend = createMockBackend();
      const defaultConfig = createTestDatabaseConfig();
      attachment = new AttachmentPointImpl(backend, 'storage.database', defaultConfig);
    });

    it('should clear attached configuration', () => {
      const customConfig = createTestDatabaseConfig({ name: 'custom-db' });
      attachment.attach(customConfig);

      attachment.reset();

      expect(attachment._attached).toBeUndefined();
    });

    it('should remove configuration from backend attachments map', () => {
      const customConfig = createTestDatabaseConfig({ name: 'custom-db' });
      attachment.attach(customConfig);

      expect(backend._attachments.has('storage.database')).toBe(true);

      attachment.reset();

      expect(backend._attachments.has('storage.database')).toBe(false);
    });

    it('should be idempotent (can reset multiple times)', () => {
      const customConfig = createTestDatabaseConfig({ name: 'custom-db' });
      attachment.attach(customConfig);

      attachment.reset();
      attachment.reset();
      attachment.reset();

      expect(attachment._attached).toBeUndefined();
      expect(attachment.isAttached()).toBe(false);
    });

    it('should not affect default configuration', () => {
      const defaultConfig = createTestDatabaseConfig();
      const attachment = new AttachmentPointImpl(backend, 'storage.database', defaultConfig);

      const customConfig = createTestDatabaseConfig({ name: 'custom-db' });
      attachment.attach(customConfig);
      attachment.reset();

      expect(attachment.getConfig()).toEqual(defaultConfig);
    });
  });

  describe('internal properties', () => {
    it('should expose _default as readonly', () => {
      const backend = createMockBackend();
      const defaultConfig = createTestDatabaseConfig();
      const attachment = new AttachmentPointImpl(backend, 'storage.database', defaultConfig);

      expect(attachment._default).toEqual(defaultConfig);
      expect(attachment._default).toBe(defaultConfig);
    });

    it('should expose _path as readonly', () => {
      const backend = createMockBackend();
      const defaultConfig = createTestDatabaseConfig();
      const attachment = new AttachmentPointImpl(backend, 'storage.database', defaultConfig);

      expect(attachment._path).toBe('storage.database');
    });

    it('should expose _attached as mutable (for internal use)', () => {
      const backend = createMockBackend();
      const defaultConfig = createTestDatabaseConfig();
      const attachment = new AttachmentPointImpl(backend, 'storage.database', defaultConfig);

      expect(attachment._attached).toBeUndefined();

      const customConfig = createTestDatabaseConfig({ name: 'custom-db' });
      attachment.attach(customConfig);

      expect(attachment._attached).toEqual(customConfig);
    });
  });
});

describe('createAttachmentPoint', () => {
  it('should create attachment point with default config', () => {
    const backend = createMockBackend();
    const defaultConfig = createTestDatabaseConfig();

    const attachment = createAttachmentPoint(backend, 'storage.database', defaultConfig);

    expect(attachment._path).toBe('storage.database');
    expect(attachment._default).toEqual(defaultConfig);
  });

  it('should create attachment point with validator', () => {
    const backend = createMockBackend();
    const defaultConfig = createTestDatabaseConfig();
    const validator: ConfigValidator<TestDatabaseConfig> = (config) => {
      if (!config.name) return 'Name is required';
      return undefined;
    };

    const attachment = createAttachmentPoint(backend, 'storage.database', defaultConfig, validator);

    const invalidConfig = createTestDatabaseConfig({ name: '' as any });

    expect(() => {
      attachment.attach(invalidConfig);
    }).toThrow('Name is required');
  });

  it('should create functional attachment point', () => {
    const backend = createMockBackend();
    const defaultConfig = createTestDatabaseConfig();

    const attachment = createAttachmentPoint(backend, 'storage.database', defaultConfig);

    expect(attachment.isAttached()).toBe(false);
    expect(attachment.getConfig()).toEqual(defaultConfig);

    const customConfig = createTestDatabaseConfig({ name: 'custom-db' });
    attachment.attach(customConfig);

    expect(attachment.isAttached()).toBe(true);
    expect(attachment.getConfig()).toEqual(customConfig);
  });
});

describe('createAttachmentPoints', () => {
  it('should create multiple attachment points', () => {
    const backend = createMockBackend();
    const configs = {
      database: createTestDatabaseConfig(),
      storage: createTestStorageConfig(),
    };

    const attachments = createAttachmentPoints(backend, 'resources', configs);

    expect(attachments.database._path).toBe('resources.database');
    expect(attachments.storage._path).toBe('resources.storage');
  });

  it('should create attachment points with correct default configs', () => {
    const backend = createMockBackend();
    const configs = {
      database: createTestDatabaseConfig({ name: 'db1' }),
      storage: createTestStorageConfig({ name: 'storage1' }),
    };

    const attachments = createAttachmentPoints(backend, 'resources', configs);

    expect(attachments.database.getConfig()).toEqual(configs.database);
    expect(attachments.storage.getConfig()).toEqual(configs.storage);
  });

  it('should create functional attachment points', () => {
    const backend = createMockBackend();
    const configs = {
      database: createTestDatabaseConfig(),
      storage: createTestStorageConfig(),
    };

    const attachments = createAttachmentPoints(backend, 'resources', configs);

    // Test database attachment
    const customDb = createTestDatabaseConfig({ name: 'custom-db' });
    attachments.database.attach(customDb);
    expect(attachments.database.isAttached()).toBe(true);
    expect(attachments.database.getConfig()).toEqual(customDb);

    // Test storage attachment
    const customStorage = createTestStorageConfig({ name: 'custom-storage' });
    attachments.storage.attach(customStorage);
    expect(attachments.storage.isAttached()).toBe(true);
    expect(attachments.storage.getConfig()).toEqual(customStorage);
  });

  it('should handle empty path prefix', () => {
    const backend = createMockBackend();
    const configs = {
      database: createTestDatabaseConfig(),
    };

    const attachments = createAttachmentPoints(backend, '', configs);

    expect(attachments.database._path).toBe('database');
  });
});

describe('Integration tests', () => {
  describe('backend attachment tracking', () => {
    it('should track all attachments in backend map', () => {
      const backend = createMockBackend();

      const db = createAttachmentPoint(backend, 'storage.database', createTestDatabaseConfig());

      const storage = createAttachmentPoint(backend, 'storage.account', createTestStorageConfig());

      // Attach configs
      db.attach(createTestDatabaseConfig({ name: 'custom-db' }));
      storage.attach(createTestStorageConfig({ name: 'custom-storage' }));

      // Check backend tracks all attachments
      expect(backend._attachments.size).toBe(2);
      expect(backend._attachments.has('storage.database')).toBe(true);
      expect(backend._attachments.has('storage.account')).toBe(true);
    });

    it('should clean up backend map on reset', () => {
      const backend = createMockBackend();

      const db = createAttachmentPoint(backend, 'storage.database', createTestDatabaseConfig());

      const storage = createAttachmentPoint(backend, 'storage.account', createTestStorageConfig());

      // Attach configs
      db.attach(createTestDatabaseConfig({ name: 'custom-db' }));
      storage.attach(createTestStorageConfig({ name: 'custom-storage' }));

      expect(backend._attachments.size).toBe(2);

      // Reset one
      db.reset();
      expect(backend._attachments.size).toBe(1);
      expect(backend._attachments.has('storage.database')).toBe(false);
      expect(backend._attachments.has('storage.account')).toBe(true);

      // Reset other
      storage.reset();
      expect(backend._attachments.size).toBe(0);
    });
  });

  describe('type safety scenarios', () => {
    it('should maintain type safety across different config types', () => {
      const backend = createMockBackend();

      const dbAttachment = createAttachmentPoint(
        backend,
        'storage.database',
        createTestDatabaseConfig()
      );

      const storageAttachment = createAttachmentPoint(
        backend,
        'storage.account',
        createTestStorageConfig()
      );

      // TypeScript ensures we can't mix config types
      const dbConfig = createTestDatabaseConfig({ name: 'db' });
      const storageConfig = createTestStorageConfig({ name: 'storage' });

      dbAttachment.attach(dbConfig);
      storageAttachment.attach(storageConfig);

      // Verify types are preserved
      const retrievedDbConfig = dbAttachment.getConfig();
      const retrievedStorageConfig = storageAttachment.getConfig();

      expect(retrievedDbConfig.mode).toBe('Serverless');
      expect(retrievedStorageConfig.sku).toBe('Standard_LRS');
    });
  });

  describe('usage patterns', () => {
    it('should support progressive enhancement pattern', () => {
      const backend = createMockBackend();

      // Start with defaults
      const db = createAttachmentPoint(
        backend,
        'storage.database',
        createTestDatabaseConfig({ name: 'default-db', mode: 'Serverless' })
      );

      // Initially uses defaults
      expect(db.getConfig().name).toBe('default-db');
      expect(db.getConfig().mode).toBe('Serverless');

      // Progressively enhance
      db.attach(
        createTestDatabaseConfig({
          name: 'production-db',
          mode: 'Autoscale',
          throughput: 4000,
        })
      );

      // Now uses custom config
      expect(db.getConfig().name).toBe('production-db');
      expect(db.getConfig().mode).toBe('Autoscale');
    });

    it('should support environment-specific configurations', () => {
      const backend = createMockBackend();

      const db = createAttachmentPoint(
        backend,
        'storage.database',
        createTestDatabaseConfig({ name: 'dev-db', mode: 'Serverless' })
      );

      // Development uses defaults
      expect(db.getConfig().mode).toBe('Serverless');

      // Production attaches different config
      if (process.env.NODE_ENV === 'production') {
        db.attach(
          createTestDatabaseConfig({
            name: 'prod-db',
            mode: 'Autoscale',
            throughput: 10000,
          })
        );
      }

      // Config reflects environment
      const config = db.getConfig();
      expect(config.name).toBeDefined();
    });
  });
});
