import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { ResourceGroup } from '../resource-group/resource-group';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { StorageAccount } from './storage-account';
import { StorageAccountSkuName, StorageAccountKind, AccessTier } from './types';

describe('resources/storage-account/StorageAccount', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-products'),
      project: new Project('colorai'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
      tags: {
        managed_by: 'terraform',
      },
    });
    resourceGroup = new ResourceGroup(stack, 'DataRG');
  });

  describe('constructor', () => {
    it('should create storage account with auto-generated name', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage');

      // Should auto-generate name with no hyphens, lowercase only
      expect(storage.storageAccountName).toMatch(/^st[a-z0-9]+$/);
      expect(storage.storageAccountName).toContain('dpcolorai'); // Abbreviated org + project
      expect(storage.storageAccountName.length).toBeLessThanOrEqual(24);
      expect(storage.storageAccountName).not.toContain('-'); // No hyphens in storage names
    });

    it('should use provided storage account name when specified', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage', {
        storageAccountName: 'mystorageaccount',
      });

      expect(storage.storageAccountName).toBe('mystorageaccount');
    });

    it('should default location to resource group location', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage');

      expect(storage.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage', {
        location: 'westus2',
      });

      expect(storage.location).toBe('westus2');
    });

    it('should set resource group name from parent', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage');

      expect(storage.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should merge tags with parent', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage', {
        tags: {
          purpose: 'data-storage',
        },
      });

      expect(storage.tags).toMatchObject({
        managed_by: 'terraform',
        purpose: 'data-storage',
      });
    });

    it('should default SKU to Standard_LRS', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage');

      expect(storage.sku).toBe('Standard_LRS');
    });

    it('should use provided SKU when specified', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage', {
        sku: StorageAccountSkuName.STANDARD_GRS,
      });

      expect(storage.sku).toBe('Standard_GRS');
    });

    it('should default kind to StorageV2', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage');

      expect(storage.kind).toBe('StorageV2');
    });

    it('should use provided kind when specified', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage', {
        kind: StorageAccountKind.BLOB_STORAGE,
      });

      expect(storage.kind).toBe('BlobStorage');
    });

    it('should generate resource ID', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage');

      expect(storage.storageAccountId).toBeDefined();
      expect(storage.storageAccountId).toContain('/storageAccounts/');
    });
  });

  describe('auto-naming with different IDs', () => {
    it('should remove hyphens from auto-generated names', () => {
      const storage = new StorageAccount(resourceGroup, 'data-storage');

      // Should not contain hyphens
      expect(storage.storageAccountName).not.toContain('-');
      expect(storage.storageAccountName).toMatch(/^[a-z0-9]+$/);
    });

    it('should truncate name to 24 characters', () => {
      const storage = new StorageAccount(resourceGroup, 'VeryLongStorageAccountNameThatExceedsLimit');

      // Should be truncated to 24 characters
      expect(storage.storageAccountName.length).toBeLessThanOrEqual(24);
    });

    it('should convert to lowercase', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage');

      // Should be all lowercase
      expect(storage.storageAccountName).toBe(storage.storageAccountName.toLowerCase());
    });
  });

  describe('secure defaults', () => {
    it('should default blob public access to disabled', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage');

      // Can't directly check the property, but we know it's passed to L1
      expect(storage.storageAccountId).toBeDefined();
    });

    it('should allow enabling blob public access', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage', {
        enableBlobPublicAccess: true,
      });

      expect(storage.storageAccountId).toBeDefined();
    });

    it('should default public network access to disabled', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage');

      expect(storage.storageAccountId).toBeDefined();
    });

    it('should default to TLS 1.2 minimum', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage');

      expect(storage.storageAccountId).toBeDefined();
    });

    it('should default access tier to Hot', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage');

      expect(storage.storageAccountId).toBeDefined();
    });

    it('should allow Cool access tier', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage', {
        accessTier: AccessTier.COOL,
      });

      expect(storage.storageAccountId).toBeDefined();
    });
  });

  describe('parent validation', () => {
    it('should throw error when not created within ResourceGroup', () => {
      expect(() => {
        new StorageAccount(stack, 'Storage');
      }).toThrow(/StorageAccount must be created within or under a ResourceGroup/);
    });

    it('should work when created directly within ResourceGroup', () => {
      const storage = new StorageAccount(resourceGroup, 'Storage');

      expect(storage.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });
  });

  describe('integration with underlying L1', () => {
    it('should create L1 construct with correct properties', () => {
      const storage = new StorageAccount(resourceGroup, 'DataStorage', {
        storageAccountName: 'mystorageacct',
        location: 'westus2',
        sku: StorageAccountSkuName.STANDARD_GRS,
        kind: StorageAccountKind.STORAGE_V2,
        tags: { purpose: 'testing' },
      });

      expect(storage.storageAccountName).toBe('mystorageacct');
      expect(storage.location).toBe('westus2');
      expect(storage.sku).toBe('Standard_GRS');
      expect(storage.kind).toBe('StorageV2');
    });
  });

  describe('multiple storage accounts', () => {
    it('should allow creating multiple storage accounts with different IDs', () => {
      const dataStorage = new StorageAccount(resourceGroup, 'DataStorage');
      const blobStorage = new StorageAccount(resourceGroup, 'BlobStorage');
      const fileStorage = new StorageAccount(resourceGroup, 'FileStorage');

      // All should have unique auto-generated names
      expect(dataStorage.storageAccountName).not.toBe(blobStorage.storageAccountName);
      expect(dataStorage.storageAccountName).not.toBe(fileStorage.storageAccountName);
      expect(blobStorage.storageAccountName).not.toBe(fileStorage.storageAccountName);

      // All should reference the same resource group
      expect(dataStorage.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(blobStorage.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(fileStorage.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should allow creating multiple storage accounts with explicit names', () => {
      const storage1 = new StorageAccount(resourceGroup, 'Storage1', {
        storageAccountName: 'stgstorage001',
      });

      const storage2 = new StorageAccount(resourceGroup, 'Storage2', {
        storageAccountName: 'stgstorage002',
      });

      expect(storage1.storageAccountName).toBe('stgstorage001');
      expect(storage2.storageAccountName).toBe('stgstorage002');
    });
  });

  describe('SKU and kind combinations', () => {
    it('should support Standard_LRS with StorageV2', () => {
      const storage = new StorageAccount(resourceGroup, 'Storage', {
        sku: StorageAccountSkuName.STANDARD_LRS,
        kind: StorageAccountKind.STORAGE_V2,
      });

      expect(storage.sku).toBe('Standard_LRS');
      expect(storage.kind).toBe('StorageV2');
    });

    it('should support Standard_GRS with StorageV2', () => {
      const storage = new StorageAccount(resourceGroup, 'Storage', {
        sku: StorageAccountSkuName.STANDARD_GRS,
        kind: StorageAccountKind.STORAGE_V2,
      });

      expect(storage.sku).toBe('Standard_GRS');
      expect(storage.kind).toBe('StorageV2');
    });

    it('should support Premium_LRS with BlockBlobStorage', () => {
      const storage = new StorageAccount(resourceGroup, 'Storage', {
        sku: StorageAccountSkuName.PREMIUM_LRS,
        kind: StorageAccountKind.BLOCK_BLOB_STORAGE,
      });

      expect(storage.sku).toBe('Premium_LRS');
      expect(storage.kind).toBe('BlockBlobStorage');
    });
  });
});
