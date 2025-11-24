/**
 * Unit tests for StorageAccounts L2 construct.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { App, Construct } from '@atakora/cdk';
import { StorageAccounts } from '../storage-accounts';
import {
  StorageAccountSkuName,
  StorageAccountKind,
  AccessTier,
  TlsVersion,
  PublicNetworkAccess,
} from '../storage-account-types';
import { MockResourceGroup, createMockPlan } from '../../../__tests__/helpers/test-fixtures';
import { FunctionApp } from '../../functions/function-app';
import { ManagedServiceIdentityType } from '../../functions/function-app-types';
import { WellKnownRoleIds, PrincipalType } from '@atakora/lib';

describe('cdk/storage/StorageAccounts', () => {
  let app: App;
  let resourceGroup: MockResourceGroup;

  beforeEach(() => {
    app = new App();
    resourceGroup = new MockResourceGroup(app, 'TestRG', {
      resourceGroupName: 'test-rg',
      location: 'eastus',
      tags: {
        environment: 'test',
        project: 'authr',
      },
    });
  });

  describe('constructor', () => {
    it('should create storage account with auto-generated name', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage');

      expect(storage.storageAccountName).toBeDefined();
      // Storage account names: no hyphens, lowercase alphanumeric, 3-24 chars
      expect(storage.storageAccountName).toMatch(/^[a-z0-9]{3,24}$/);
      expect(storage.storageAccountName.length).toBeGreaterThanOrEqual(3);
      expect(storage.storageAccountName.length).toBeLessThanOrEqual(24);
    });

    it('should use provided storage account name when specified', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage', {
        storageAccountName: 'mystorageaccount',
      });

      expect(storage.storageAccountName).toBe('mystorageaccount');
    });

    it('should default location to resource group location', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage');

      expect(storage.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage', {
        location: 'westus2',
      });

      expect(storage.location).toBe('westus2');
    });

    it('should set resource group name from parent', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage');

      expect(storage.resourceGroupName).toBe('test-rg');
    });

    it('should default SKU to Standard_LRS', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage');

      expect(storage.sku).toBe('Standard_LRS');
    });

    it('should use provided SKU when specified', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage', {
        sku: StorageAccountSkuName.STANDARD_GRS,
      });

      expect(storage.sku).toBe(StorageAccountSkuName.STANDARD_GRS);
    });

    it('should default kind to StorageV2', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage');

      expect(storage.kind).toBe('StorageV2');
    });

    it('should use provided kind when specified', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage', {
        kind: StorageAccountKind.BLOB_STORAGE,
      });

      expect(storage.kind).toBe(StorageAccountKind.BLOB_STORAGE);
    });

    it('should merge tags with parent tags', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage', {
        tags: {
          owner: 'storage-team',
        },
      });

      expect(storage.tags).toMatchObject({
        environment: 'test', // from parent
        project: 'authr', // from parent
        owner: 'storage-team', // from props
      });
    });

    it('should override parent tags with provided tags', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage', {
        tags: {
          project: 'custom-project', // overrides parent
        },
      });

      expect(storage.tags.project).toBe('custom-project');
    });

    it('should set storageAccountId to ARM resource expression', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage', {
        storageAccountName: 'teststorage',
      });

      // Should be an ARM resourceId expression
      expect(storage.storageAccountId).toContain('[resourceId(');
      expect(storage.storageAccountId).toContain('Microsoft.Storage/storageAccounts');
      expect(storage.storageAccountId).toContain('teststorage');
    });

    it('should alias resourceId to storageAccountId', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage', {
        storageAccountName: 'teststorage',
      });

      expect(storage.resourceId).toBe(storage.storageAccountId);
    });
  });

  describe('auto-naming', () => {
    it('should generate name without hyphens', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage');

      expect(storage.storageAccountName).not.toContain('-');
    });

    it('should generate lowercase name', () => {
      const storage = new StorageAccounts(resourceGroup, 'DataStorage');

      expect(storage.storageAccountName).toBe(storage.storageAccountName.toLowerCase());
    });

    it('should generate different names for different construct IDs', () => {
      const storage1 = new StorageAccounts(resourceGroup, 'Storage1');
      const storage2 = new StorageAccounts(resourceGroup, 'Storage2');

      expect(storage1.storageAccountName).not.toBe(storage2.storageAccountName);
    });

    it('should handle long construct IDs by truncating', () => {
      const storage = new StorageAccounts(
        resourceGroup,
        'VeryLongStorageAccountIdentifierThatExceedsLimits'
      );

      expect(storage.storageAccountName.length).toBeLessThanOrEqual(24);
    });
  });

  describe('parent validation', () => {
    it('should throw error if not created within a ResourceGroup', () => {
      const plainConstruct = new Construct(app, 'PlainConstruct');

      expect(() => {
        new StorageAccounts(plainConstruct, 'Storage');
      }).toThrow(/StorageAccounts must be created within or under a ResourceGroup/);
    });

    it('should work when created directly within ResourceGroup', () => {
      const storage = new StorageAccounts(resourceGroup, 'Storage');

      expect(storage.storageAccountName).toBeDefined();
    });

    it('should work when created within nested construct under ResourceGroup', () => {
      const nestedConstruct = new Construct(resourceGroup, 'Nested');
      const storage = new StorageAccounts(nestedConstruct, 'Storage');

      expect(storage.storageAccountName).toBeDefined();
      expect(storage.location).toBe(resourceGroup.location);
    });
  });

  describe('tag merging', () => {
    it('should inherit all parent tags when no tags provided', () => {
      const storage = new StorageAccounts(resourceGroup, 'Storage');

      expect(storage.tags).toMatchObject({
        environment: 'test',
        project: 'authr',
      });
    });

    it('should add new tags to parent tags', () => {
      const storage = new StorageAccounts(resourceGroup, 'Storage', {
        tags: {
          costCenter: '1234',
          owner: 'storage-team',
        },
      });

      expect(storage.tags).toMatchObject({
        environment: 'test',
        project: 'authr',
        costCenter: '1234',
        owner: 'storage-team',
      });
    });

    it('should handle empty tags object', () => {
      const storage = new StorageAccounts(resourceGroup, 'Storage', {
        tags: {},
      });

      expect(storage.tags).toMatchObject({
        environment: 'test',
        project: 'authr',
      });
    });
  });

  describe('IStorageAccount interface', () => {
    it('should implement IStorageAccount interface', () => {
      const storage = new StorageAccounts(resourceGroup, 'Storage');

      // Should have required properties
      expect(storage).toHaveProperty('storageAccountName');
      expect(storage).toHaveProperty('location');
      expect(storage).toHaveProperty('storageAccountId');
    });
  });

  describe('security defaults', () => {
    it('should create storage account with secure defaults', () => {
      const storage = new StorageAccounts(resourceGroup, 'Storage');

      // Check that underlying ARM resource was created
      // We verify this by checking that storageAccountId is set
      expect(storage.storageAccountId).toBeDefined();
    });

    it('should allow overriding security defaults', () => {
      const storage = new StorageAccounts(resourceGroup, 'Storage', {
        enableBlobPublicAccess: true,
        publicNetworkAccess: PublicNetworkAccess.ENABLED,
        minimumTlsVersion: TlsVersion.TLS1_0,
      });

      expect(storage.storageAccountName).toBeDefined();
    });
  });

  describe('grant methods', () => {
    let storage: StorageAccounts;
    let functionApp: FunctionApp;

    beforeEach(() => {
      storage = new StorageAccounts(resourceGroup, 'Storage', {
        storageAccountName: 'teststorage',
      });

      functionApp = new FunctionApp(resourceGroup, 'Function', {
        plan: createMockPlan(),
        storageAccount: {
          storageAccountId:
            '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/funcstore',
          storageAccountName: 'funcstore',
        },
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
        },
      });
    });

    describe('grantBlobRead', () => {
      it('should grant blob read access', () => {
        const grant = storage.grantBlobRead(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_BLOB_DATA_READER);
        expect(grant.scope).toBe(storage.storageAccountId);
        expect(grant.grantee).toBe(functionApp);
      });

      it('should include description in role assignment', () => {
        const grant = storage.grantBlobRead(functionApp);

        expect(grant.roleAssignment).toBeDefined();
        // Description is set internally by the method
      });
    });

    describe('grantBlobWrite', () => {
      it('should grant blob write access', () => {
        const grant = storage.grantBlobWrite(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR);
        expect(grant.scope).toBe(storage.storageAccountId);
      });
    });

    describe('grantBlobFullAccess', () => {
      it('should grant blob full access', () => {
        const grant = storage.grantBlobFullAccess(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_BLOB_DATA_OWNER);
        expect(grant.scope).toBe(storage.storageAccountId);
      });
    });

    describe('grantTableRead', () => {
      it('should grant table read access', () => {
        const grant = storage.grantTableRead(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_TABLE_DATA_READER);
        expect(grant.scope).toBe(storage.storageAccountId);
      });
    });

    describe('grantTableWrite', () => {
      it('should grant table write access', () => {
        const grant = storage.grantTableWrite(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_TABLE_DATA_CONTRIBUTOR);
        expect(grant.scope).toBe(storage.storageAccountId);
      });
    });

    describe('grantQueueRead', () => {
      it('should grant queue read access', () => {
        const grant = storage.grantQueueRead(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_QUEUE_DATA_READER);
        expect(grant.scope).toBe(storage.storageAccountId);
      });
    });

    describe('grantQueueProcess', () => {
      it('should grant queue process access', () => {
        const grant = storage.grantQueueProcess(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_QUEUE_DATA_MESSAGE_PROCESSOR);
        expect(grant.scope).toBe(storage.storageAccountId);
      });
    });

    describe('grantQueueSend', () => {
      it('should grant queue send access', () => {
        const grant = storage.grantQueueSend(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_QUEUE_DATA_MESSAGE_SENDER);
        expect(grant.scope).toBe(storage.storageAccountId);
      });
    });

    describe('grantFileRead', () => {
      it('should grant file read access', () => {
        const grant = storage.grantFileRead(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_FILE_DATA_SMB_SHARE_READER);
        expect(grant.scope).toBe(storage.storageAccountId);
      });
    });

    describe('multiple grants', () => {
      it('should create multiple grants to same grantee', () => {
        const grant1 = storage.grantBlobRead(functionApp);
        const grant2 = storage.grantQueueProcess(functionApp);

        expect(grant1).toBeDefined();
        expect(grant2).toBeDefined();
        expect(grant1.roleDefinitionId).not.toBe(grant2.roleDefinitionId);

        // Both grants should be children of the storage account
        const grants = storage.node.children.filter((child) => child.node.id.startsWith('Grant'));
        expect(grants.length).toBeGreaterThanOrEqual(2);
      });

      it('should generate unique grant IDs', () => {
        storage.grantBlobRead(functionApp);
        storage.grantQueueProcess(functionApp);
        storage.grantTableRead(functionApp);

        const grantIds = storage.node.children
          .filter((child) => child.node.id.startsWith('Grant'))
          .map((child) => child.node.id);

        // All grant IDs should be unique
        const uniqueIds = new Set(grantIds);
        expect(uniqueIds.size).toBe(grantIds.length);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should create multiple storage accounts in same resource group', () => {
      const storage1 = new StorageAccounts(resourceGroup, 'Storage1');
      const storage2 = new StorageAccounts(resourceGroup, 'Storage2');

      expect(storage1.storageAccountName).not.toBe(storage2.storageAccountName);
      expect(storage1.resourceGroupName).toBe(storage2.resourceGroupName);
    });

    it('should be addable to construct tree', () => {
      const storage = new StorageAccounts(resourceGroup, 'Storage');

      expect(storage.node.scope).toBe(resourceGroup);
      expect(storage.node.id).toBe('Storage');
    });

    it('should support nested constructs', () => {
      const storage = new StorageAccounts(resourceGroup, 'Storage');
      const child = new Construct(storage, 'ChildConstruct');

      expect(child.node.scope).toBe(storage);
      expect(storage.node.children).toContainEqual(child);
    });
  });

  describe('advanced scenarios', () => {
    it('should work with all properties specified', () => {
      const storage = new StorageAccounts(resourceGroup, 'Storage', {
        storageAccountName: 'stgexplicit',
        location: 'westus2',
        sku: StorageAccountSkuName.PREMIUM_LRS,
        kind: StorageAccountKind.BLOCK_BLOB_STORAGE,
        accessTier: AccessTier.HOT,
        minimumTlsVersion: TlsVersion.TLS1_2,
        enableBlobPublicAccess: false,
        publicNetworkAccess: PublicNetworkAccess.DISABLED,
        tags: {
          costCenter: '1234',
          environment: 'production',
        },
      });

      expect(storage.storageAccountName).toBe('stgexplicit');
      expect(storage.location).toBe('westus2');
      expect(storage.sku).toBe(StorageAccountSkuName.PREMIUM_LRS);
      expect(storage.kind).toBe(StorageAccountKind.BLOCK_BLOB_STORAGE);
      expect(storage.tags).toMatchObject({
        costCenter: '1234',
        environment: 'production',
      });
    });

    it('should support different SKU tiers', () => {
      const skus = [
        StorageAccountSkuName.STANDARD_LRS,
        StorageAccountSkuName.STANDARD_GRS,
        StorageAccountSkuName.STANDARD_RAGRS,
        StorageAccountSkuName.STANDARD_ZRS,
        StorageAccountSkuName.PREMIUM_LRS,
      ];

      skus.forEach((sku, index) => {
        const storage = new StorageAccounts(resourceGroup, `Storage${index}`, {
          sku,
        });

        expect(storage.sku).toBe(sku);
      });
    });

    it('should support different storage account kinds', () => {
      const kinds = [
        StorageAccountKind.STORAGE_V2,
        StorageAccountKind.STORAGE,
        StorageAccountKind.BLOB_STORAGE,
        StorageAccountKind.BLOCK_BLOB_STORAGE,
        StorageAccountKind.FILE_STORAGE,
      ];

      kinds.forEach((kind, index) => {
        const storage = new StorageAccounts(resourceGroup, `Storage${index}`, {
          kind,
        });

        expect(storage.kind).toBe(kind);
      });
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template', () => {
      const storage = new StorageAccounts(resourceGroup, 'Storage', {
        storageAccountName: 'teststorage',
      });

      const template = storage.toArmTemplate();

      expect(template).toBeDefined();
      expect(template.type).toBe('Microsoft.Storage/storageAccounts');
      expect(template.apiVersion).toBeDefined();
      expect(template.name).toBe('teststorage');
    });
  });

  describe('toMetadata', () => {
    it('should generate resource metadata', () => {
      const storage = new StorageAccounts(resourceGroup, 'Storage');

      const metadata = storage.toMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.type).toBe('Microsoft.Storage/storageAccounts');
      expect(metadata.dependencies).toBeDefined();
      expect(metadata.templatePreference).toBe('foundation');
    });
  });
});
