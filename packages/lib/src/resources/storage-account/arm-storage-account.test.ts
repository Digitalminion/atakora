import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmStorageAccount } from './arm-storage-account';
import {
  StorageAccountSkuName,
  StorageAccountKind,
  AccessTier,
  TlsVersion,
  PublicNetworkAccess,
  NetworkAclDefaultAction,
} from './types';
import type { ArmStorageAccountProps } from './types';

describe('resources/storage-account/ArmStorageAccount', () => {
  let app: App;
  let stack: SubscriptionStack;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-minion'),
      project: new Project('authr'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
    });
  });

  describe('constructor', () => {
    it('should create storage account with required properties', () => {
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: 'stgtest001',
        location: 'eastus',
        sku: { name: StorageAccountSkuName.STANDARD_LRS },
        kind: StorageAccountKind.STORAGE_V2,
      });

      expect(storage.storageAccountName).toBe('stgtest001');
      expect(storage.name).toBe('stgtest001');
      expect(storage.location).toBe('eastus');
      expect(storage.sku.name).toBe('Standard_LRS');
      expect(storage.kind).toBe('StorageV2');
      expect(storage.tags).toEqual({});
    });

    it('should create storage account with all properties', () => {
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: 'stgtest002',
        location: 'eastus',
        sku: { name: StorageAccountSkuName.STANDARD_GRS },
        kind: StorageAccountKind.STORAGE_V2,
        properties: {
          accessTier: AccessTier.HOT,
          minimumTlsVersion: TlsVersion.TLS1_2,
          allowBlobPublicAccess: false,
          supportsHttpsTrafficOnly: true,
          publicNetworkAccess: PublicNetworkAccess.DISABLED,
        },
        tags: {
          environment: 'test',
        },
      });

      expect(storage.accessTier).toBe('Hot');
      expect(storage.minimumTlsVersion).toBe('TLS1_2');
      expect(storage.allowBlobPublicAccess).toBe(false);
      expect(storage.supportsHttpsTrafficOnly).toBe(true);
      expect(storage.publicNetworkAccess).toBe('Disabled');
    });

    it('should set correct resource type', () => {
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: 'stgtest003',
        location: 'eastus',
        sku: { name: StorageAccountSkuName.STANDARD_LRS },
        kind: StorageAccountKind.STORAGE_V2,
      });

      expect(storage.resourceType).toBe('Microsoft.Storage/storageAccounts');
    });

    it('should set correct API version', () => {
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: 'stgtest004',
        location: 'eastus',
        sku: { name: StorageAccountSkuName.STANDARD_LRS },
        kind: StorageAccountKind.STORAGE_V2,
      });

      expect(storage.apiVersion).toBe('2025-01-01');
    });

    it('should generate resource ID', () => {
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: 'stgtest005',
        location: 'eastus',
        sku: { name: StorageAccountSkuName.STANDARD_LRS },
        kind: StorageAccountKind.STORAGE_V2,
      });

      expect(storage.resourceId).toContain('/storageAccounts/stgtest005');
      expect(storage.storageAccountId).toBe(storage.resourceId);
    });

    it('should have ResourceGroup deployment scope', () => {
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: 'stgtest006',
        location: 'eastus',
        sku: { name: StorageAccountSkuName.STANDARD_LRS },
        kind: StorageAccountKind.STORAGE_V2,
      });

      expect(storage.scope).toBe('resourceGroup');
    });
  });

  describe('validation', () => {
    it('should throw error for empty storage account name', () => {
      expect(() => {
        new ArmStorageAccount(stack, 'Storage', {
          storageAccountName: '',
          location: 'eastus',
          sku: { name: StorageAccountSkuName.STANDARD_LRS },
          kind: StorageAccountKind.STORAGE_V2,
        });
      }).toThrow(/Storage account name cannot be empty/);
    });

    it('should throw error for name shorter than 3 characters', () => {
      expect(() => {
        new ArmStorageAccount(stack, 'Storage', {
          storageAccountName: 'st',
          location: 'eastus',
          sku: { name: StorageAccountSkuName.STANDARD_LRS },
          kind: StorageAccountKind.STORAGE_V2,
        });
      }).toThrow(/must be 3-24 characters/);
    });

    it('should throw error for name longer than 24 characters', () => {
      expect(() => {
        new ArmStorageAccount(stack, 'Storage', {
          storageAccountName: 'a'.repeat(25),
          location: 'eastus',
          sku: { name: StorageAccountSkuName.STANDARD_LRS },
          kind: StorageAccountKind.STORAGE_V2,
        });
      }).toThrow(/must be 3-24 characters/);
    });

    it('should accept name at exactly 3 characters', () => {
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: 'stg',
        location: 'eastus',
        sku: { name: StorageAccountSkuName.STANDARD_LRS },
        kind: StorageAccountKind.STORAGE_V2,
      });

      expect(storage.storageAccountName).toBe('stg');
    });

    it('should accept name at exactly 24 characters', () => {
      const name = 'a'.repeat(24);
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: name,
        location: 'eastus',
        sku: { name: StorageAccountSkuName.STANDARD_LRS },
        kind: StorageAccountKind.STORAGE_V2,
      });

      expect(storage.storageAccountName).toBe(name);
    });

    it('should throw error for name with uppercase letters', () => {
      expect(() => {
        new ArmStorageAccount(stack, 'Storage', {
          storageAccountName: 'StgTest',
          location: 'eastus',
          sku: { name: StorageAccountSkuName.STANDARD_LRS },
          kind: StorageAccountKind.STORAGE_V2,
        });
      }).toThrow(/only lowercase letters and numbers/);
    });

    it('should throw error for name with hyphens', () => {
      expect(() => {
        new ArmStorageAccount(stack, 'Storage', {
          storageAccountName: 'stg-test-001',
          location: 'eastus',
          sku: { name: StorageAccountSkuName.STANDARD_LRS },
          kind: StorageAccountKind.STORAGE_V2,
        });
      }).toThrow(/only lowercase letters and numbers/);
    });

    it('should throw error for name with special characters', () => {
      expect(() => {
        new ArmStorageAccount(stack, 'Storage', {
          storageAccountName: 'stg_test',
          location: 'eastus',
          sku: { name: StorageAccountSkuName.STANDARD_LRS },
          kind: StorageAccountKind.STORAGE_V2,
        });
      }).toThrow(/only lowercase letters and numbers/);
    });

    it('should accept valid lowercase alphanumeric names', () => {
      const validNames = ['stgtest001', 'storage123', 'mystorageaccount', 'stg1234567890'];

      validNames.forEach((name) => {
        const storage = new ArmStorageAccount(stack, `Storage-${name}`, {
          storageAccountName: name,
          location: 'eastus',
          sku: { name: StorageAccountSkuName.STANDARD_LRS },
          kind: StorageAccountKind.STORAGE_V2,
        });

        expect(storage.storageAccountName).toBe(name);
      });
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmStorageAccount(stack, 'Storage', {
          storageAccountName: 'stgtest',
          location: '',
          sku: { name: StorageAccountSkuName.STANDARD_LRS },
          kind: StorageAccountKind.STORAGE_V2,
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error when SKU is not provided', () => {
      expect(() => {
        new ArmStorageAccount(stack, 'Storage', {
          storageAccountName: 'stgtest',
          location: 'eastus',
          kind: StorageAccountKind.STORAGE_V2,
        } as any);
      }).toThrow(/SKU must be provided/);
    });

    it('should throw error when kind is not provided', () => {
      expect(() => {
        new ArmStorageAccount(stack, 'Storage', {
          storageAccountName: 'stgtest',
          location: 'eastus',
          sku: { name: StorageAccountSkuName.STANDARD_LRS },
        } as any);
      }).toThrow(/Kind must be provided/);
    });
  });

  describe('SKU options', () => {
    it('should support Standard_LRS SKU', () => {
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: 'stglrs',
        location: 'eastus',
        sku: { name: StorageAccountSkuName.STANDARD_LRS },
        kind: StorageAccountKind.STORAGE_V2,
      });

      expect(storage.sku.name).toBe('Standard_LRS');
    });

    it('should support Standard_GRS SKU', () => {
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: 'stggrs',
        location: 'eastus',
        sku: { name: StorageAccountSkuName.STANDARD_GRS },
        kind: StorageAccountKind.STORAGE_V2,
      });

      expect(storage.sku.name).toBe('Standard_GRS');
    });

    it('should support Premium_LRS SKU', () => {
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: 'stgpremium',
        location: 'eastus',
        sku: { name: StorageAccountSkuName.PREMIUM_LRS },
        kind: StorageAccountKind.BLOCK_BLOB_STORAGE,
      });

      expect(storage.sku.name).toBe('Premium_LRS');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with minimal properties', () => {
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: 'stgtest',
        location: 'eastus',
        sku: { name: StorageAccountSkuName.STANDARD_LRS },
        kind: StorageAccountKind.STORAGE_V2,
      });

      const template: any = storage.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Storage/storageAccounts',
        apiVersion: '2025-01-01',
        name: 'stgtest',
        location: 'eastus',
        sku: {
          name: 'Standard_LRS',
        },
        kind: 'StorageV2',
        properties: undefined,
        tags: undefined,
      });
    });

    it('should generate ARM template with all properties', () => {
      const storage = new ArmStorageAccount(stack, 'Storage', {
        storageAccountName: 'stgfull',
        location: 'eastus',
        sku: { name: StorageAccountSkuName.STANDARD_GRS },
        kind: StorageAccountKind.STORAGE_V2,
        properties: {
          accessTier: AccessTier.HOT,
          minimumTlsVersion: TlsVersion.TLS1_2,
          allowBlobPublicAccess: false,
          supportsHttpsTrafficOnly: true,
          publicNetworkAccess: PublicNetworkAccess.DISABLED,
          networkAcls: {
            defaultAction: NetworkAclDefaultAction.DENY,
          },
        },
        tags: {
          environment: 'prod',
        },
      });

      const template: any = storage.toArmTemplate();

      expect(template.properties).toMatchObject({
        accessTier: 'Hot',
        minimumTlsVersion: 'TLS1_2',
        allowBlobPublicAccess: false,
        supportsHttpsTrafficOnly: true,
        publicNetworkAccess: 'Disabled',
        networkAcls: {
          defaultAction: 'Deny',
        },
      });
      expect(template.tags).toEqual({ environment: 'prod' });
    });
  });
});
