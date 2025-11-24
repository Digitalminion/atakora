/**
 * Storage Attachments Tests
 *
 * @module @atakora/component/backend/attachments/storage
 */

import { describe, it, expect } from 'vitest';
import {
  validateStorageAccountConfig,
  validateDatabaseConfig,
  validateQueueConfig,
  createDefaultStorageConfig,
  createDefaultDatabaseConfig,
  type StorageAccountConfig,
  type DatabaseConfig,
  type QueueConfig,
} from './storage';

describe('Storage Attachments', () => {
  describe('validateStorageAccountConfig()', () => {
    it('should validate valid storage account config', () => {
      const config: StorageAccountConfig = {
        name: 'mystorageaccount',
        sku: 'Standard_LRS',
        tier: 'Hot',
      };

      const errors = validateStorageAccountConfig(config);
      expect(errors).toEqual([]);
    });

    it('should error on short storage account name', () => {
      const config: StorageAccountConfig = {
        name: 'ab',
        sku: 'Standard_LRS',
        tier: 'Hot',
      };

      const errors = validateStorageAccountConfig(config);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.includes('3 and 24'))).toBe(true);
    });

    it('should error on long storage account name', () => {
      const config: StorageAccountConfig = {
        name: 'a'.repeat(25),
        sku: 'Standard_LRS',
        tier: 'Hot',
      };

      const errors = validateStorageAccountConfig(config);
      expect(errors.some((e) => e.includes('3 and 24'))).toBe(true);
    });

    it('should error on invalid characters in name', () => {
      const config: StorageAccountConfig = {
        name: 'My-Storage-Account',
        sku: 'Standard_LRS',
        tier: 'Hot',
      };

      const errors = validateStorageAccountConfig(config);
      expect(errors.some((e) => e.includes('lowercase letters and numbers'))).toBe(true);
    });

    it('should error on Premium_LRS with non-Hot tier', () => {
      const config: StorageAccountConfig = {
        sku: 'Premium_LRS',
        tier: 'Cool',
      };

      const errors = validateStorageAccountConfig(config);
      expect(errors.some((e) => e.includes('Premium_LRS'))).toBe(true);
    });

    it('should validate network rules', () => {
      const config: StorageAccountConfig = {
        sku: 'Standard_LRS',
        tier: 'Hot',
        networkRules: {
          defaultAction: 'Deny',
          allowAzureServices: false,
        },
      };

      const errors = validateStorageAccountConfig(config);
      expect(errors.some((e) => e.includes('Azure services'))).toBe(true);
    });

    it('should validate container names', () => {
      const config: StorageAccountConfig = {
        sku: 'Standard_LRS',
        tier: 'Hot',
        containers: [
          { name: 'ab' }, // too short
          { name: 'InvalidName' }, // uppercase
        ],
      };

      const errors = validateStorageAccountConfig(config);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should allow valid container names', () => {
      const config: StorageAccountConfig = {
        sku: 'Standard_LRS',
        tier: 'Hot',
        containers: [{ name: 'my-container' }, { name: 'container123' }],
      };

      const errors = validateStorageAccountConfig(config);
      expect(errors).toEqual([]);
    });
  });

  describe('validateDatabaseConfig()', () => {
    it('should validate valid serverless config', () => {
      const config: DatabaseConfig = {
        mode: 'Serverless',
        consistency: 'Session',
      };

      const errors = validateDatabaseConfig(config);
      expect(errors).toEqual([]);
    });

    it('should validate valid autoscale config', () => {
      const config: DatabaseConfig = {
        mode: 'Autoscale',
        consistency: 'Session',
        throughput: {
          min: 1000,
          max: 10000,
        },
      };

      const errors = validateDatabaseConfig(config);
      expect(errors).toEqual([]);
    });

    it('should error on throughput with serverless', () => {
      const config: DatabaseConfig = {
        mode: 'Serverless',
        throughput: {
          min: 400,
        },
      };

      const errors = validateDatabaseConfig(config);
      expect(errors.some((e) => e.includes('Serverless'))).toBe(true);
    });

    it('should error on max throughput with provisioned', () => {
      const config: DatabaseConfig = {
        mode: 'Provisioned',
        throughput: {
          min: 400,
          max: 1000,
        },
      };

      const errors = validateDatabaseConfig(config);
      expect(errors.some((e) => e.includes('Provisioned'))).toBe(true);
    });

    it('should error on autoscale without max', () => {
      const config: DatabaseConfig = {
        mode: 'Autoscale',
        throughput: {
          min: 1000,
        },
      };

      const errors = validateDatabaseConfig(config);
      expect(errors.some((e) => e.includes('max throughput'))).toBe(true);
    });

    it('should error on throughput below 400 RU/s', () => {
      const config: DatabaseConfig = {
        mode: 'Provisioned',
        throughput: {
          min: 200,
        },
      };

      const errors = validateDatabaseConfig(config);
      expect(errors.some((e) => e.includes('400 RU/s'))).toBe(true);
    });

    it('should error on max less than min throughput', () => {
      const config: DatabaseConfig = {
        mode: 'Autoscale',
        throughput: {
          min: 5000,
          max: 1000,
        },
      };

      const errors = validateDatabaseConfig(config);
      expect(errors.some((e) => e.includes('greater than minimum'))).toBe(true);
    });

    it('should error on multi-region without regions', () => {
      const config: DatabaseConfig = {
        mode: 'Serverless',
        enableMultiRegion: true,
      };

      const errors = validateDatabaseConfig(config);
      expect(errors.some((e) => e.includes('at least 2 regions'))).toBe(true);
    });

    it('should validate backup retention', () => {
      const config: DatabaseConfig = {
        mode: 'Serverless',
        backup: {
          enabled: true,
          type: 'Periodic',
          retentionDays: 800, // too long
        },
      };

      const errors = validateDatabaseConfig(config);
      expect(errors.some((e) => e.includes('720 days'))).toBe(true);
    });

    it('should validate container partition key', () => {
      const config: DatabaseConfig = {
        mode: 'Serverless',
        databases: [
          {
            name: 'mydb',
            containers: [
              {
                name: 'users',
                partitionKey: 'id', // missing leading /
              },
            ],
          },
        ],
      };

      const errors = validateDatabaseConfig(config);
      expect(errors.some((e) => e.includes('start with /'))).toBe(true);
    });

    it('should validate container TTL', () => {
      const config: DatabaseConfig = {
        mode: 'Serverless',
        databases: [
          {
            name: 'mydb',
            containers: [
              {
                name: 'cache',
                partitionKey: '/id',
                ttl: -5, // invalid
              },
            ],
          },
        ],
      };

      const errors = validateDatabaseConfig(config);
      expect(errors.some((e) => e.includes('TTL'))).toBe(true);
    });

    it('should allow valid TTL values', () => {
      const config: DatabaseConfig = {
        mode: 'Serverless',
        databases: [
          {
            name: 'mydb',
            containers: [
              { name: 'cache1', partitionKey: '/id', ttl: -1 }, // no expiration
              { name: 'cache2', partitionKey: '/id', ttl: 0 }, // disabled
              { name: 'cache3', partitionKey: '/id', ttl: 3600 }, // 1 hour
            ],
          },
        ],
      };

      const errors = validateDatabaseConfig(config);
      expect(errors).toEqual([]);
    });
  });

  describe('validateQueueConfig()', () => {
    it('should validate valid queue config', () => {
      const config: QueueConfig = {
        name: 'my-queue',
      };

      const errors = validateQueueConfig(config);
      expect(errors).toEqual([]);
    });

    it('should error on missing name', () => {
      const config: QueueConfig = {
        name: '',
      };

      const errors = validateQueueConfig(config);
      expect(errors.some((e) => e.includes('required'))).toBe(true);
    });

    it('should error on short queue name', () => {
      const config: QueueConfig = {
        name: 'ab',
      };

      const errors = validateQueueConfig(config);
      expect(errors.some((e) => e.includes('3 and 63'))).toBe(true);
    });

    it('should error on invalid queue name', () => {
      const config: QueueConfig = {
        name: 'InvalidQueue',
      };

      const errors = validateQueueConfig(config);
      expect(errors.some((e) => e.includes('lowercase'))).toBe(true);
    });

    it('should validate visibility timeout range', () => {
      const config: QueueConfig = {
        name: 'my-queue',
        visibilityTimeout: 700000, // too long
      };

      const errors = validateQueueConfig(config);
      expect(errors.some((e) => e.includes('7 days'))).toBe(true);
    });

    it('should validate max delivery count', () => {
      const config: QueueConfig = {
        name: 'my-queue',
        maxDeliveryCount: 0,
      };

      const errors = validateQueueConfig(config);
      expect(errors.some((e) => e.includes('at least 1'))).toBe(true);
    });

    it('should validate message TTL range', () => {
      const config: QueueConfig = {
        name: 'my-queue',
        messageTtl: 700000, // too long
      };

      const errors = validateQueueConfig(config);
      expect(errors.some((e) => e.includes('7 days'))).toBe(true);
    });
  });

  describe('createDefaultStorageConfig()', () => {
    it('should create development defaults', () => {
      const config = createDefaultStorageConfig('development');

      expect(config.sku).toBe('Standard_LRS');
      expect(config.tier).toBe('Hot');
      expect(config.httpsOnly).toBe(true);
      expect(config.allowBlobPublicAccess).toBe(true);
      expect(config.networkRules).toBeUndefined();
    });

    it('should create staging defaults', () => {
      const config = createDefaultStorageConfig('staging');

      expect(config.sku).toBe('Standard_ZRS');
      expect(config.networkRules?.defaultAction).toBe('Deny');
      expect(config.networkRules?.allowAzureServices).toBe(true);
    });

    it('should create production defaults', () => {
      const config = createDefaultStorageConfig('production');

      expect(config.sku).toBe('Standard_ZRS');
      expect(config.networkRules?.defaultAction).toBe('Deny');
      expect(config.allowBlobPublicAccess).toBe(false);
    });

    it('should merge overrides', () => {
      const config = createDefaultStorageConfig('production', {
        sku: 'Standard_GRS',
        tier: 'Cool',
      });

      expect(config.sku).toBe('Standard_GRS');
      expect(config.tier).toBe('Cool');
    });
  });

  describe('createDefaultDatabaseConfig()', () => {
    it('should create development defaults', () => {
      const config = createDefaultDatabaseConfig('development');

      expect(config.mode).toBe('Serverless');
      expect(config.consistency).toBe('Session');
      expect(config.throughput).toBeUndefined();
    });

    it('should create staging defaults', () => {
      const config = createDefaultDatabaseConfig('staging');

      expect(config.mode).toBe('Autoscale');
      expect(config.throughput).toEqual({ min: 1000, max: 10000 });
      expect(config.backup?.enabled).toBe(true);
      expect(config.backup?.type).toBe('Periodic');
    });

    it('should create production defaults', () => {
      const config = createDefaultDatabaseConfig('production');

      expect(config.mode).toBe('Autoscale');
      expect(config.throughput).toEqual({ min: 4000, max: 40000 });
      expect(config.enableMultiRegion).toBe(true);
      expect(config.regions).toEqual(['eastus', 'westus']);
      expect(config.backup?.type).toBe('Continuous');
      expect(config.enableAnalyticalStore).toBe(true);
    });

    it('should merge overrides', () => {
      const config = createDefaultDatabaseConfig('production', {
        mode: 'Provisioned',
        throughput: { min: 10000 },
      });

      expect(config.mode).toBe('Provisioned');
      expect(config.throughput?.min).toBe(10000);
    });
  });
});
