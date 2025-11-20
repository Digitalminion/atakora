/**
 * Unit tests for StorageQueues L2 construct.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { App, Construct } from '@atakora/cdk';
import { StorageQueues } from '../queues';
import { StorageAccounts } from '../storage-accounts';
import { MockResourceGroup, createMockPlan } from '../../../__tests__/helpers/test-fixtures';
import { FunctionApp } from '../../functions/function-app';
import { ManagedServiceIdentityType } from '../../functions/function-app-types';
import { WellKnownRoleIds } from '@atakora/lib';

describe('cdk/storage/StorageQueues', () => {
  let app: App;
  let resourceGroup: MockResourceGroup;
  let storageAccount: StorageAccounts;

  beforeEach(() => {
    app = new App();
    resourceGroup = new MockResourceGroup(app, 'TestRG', {
      resourceGroupName: 'test-rg',
      location: 'eastus',
    });

    storageAccount = new StorageAccounts(resourceGroup, 'Storage', {
      storageAccountName: 'teststorage',
    });
  });

  describe('constructor', () => {
    it('should create queue with auto-generated name', () => {
      const queue = new StorageQueues(storageAccount, 'OrderQueue');

      expect(queue.queueName).toBeDefined();
      // Queue names: lowercase alphanumeric and hyphens, 3-63 chars
      expect(queue.queueName).toMatch(/^[a-z0-9-]{3,63}$/);
      expect(queue.queueName.length).toBeGreaterThanOrEqual(3);
      expect(queue.queueName.length).toBeLessThanOrEqual(63);
    });

    it('should use provided queue name when specified', () => {
      const queue = new StorageQueues(storageAccount, 'OrderQueue', {
        queueName: 'my-custom-queue',
      });

      expect(queue.queueName).toBe('my-custom-queue');
    });

    it('should set storage account name from parent', () => {
      const queue = new StorageQueues(storageAccount, 'OrderQueue');

      expect(queue.storageAccountName).toBe('teststorage');
    });

    it('should handle metadata when provided', () => {
      const queue = new StorageQueues(storageAccount, 'OrderQueue', {
        metadata: {
          purpose: 'order-processing',
          team: 'backend',
        },
      });

      expect(queue.metadata).toEqual({
        purpose: 'order-processing',
        team: 'backend',
      });
    });

    it('should have undefined metadata when not provided', () => {
      const queue = new StorageQueues(storageAccount, 'OrderQueue');

      expect(queue.metadata).toBeUndefined();
    });

    it('should set queueId and queueUrl', () => {
      const queue = new StorageQueues(storageAccount, 'OrderQueue');

      expect(queue.queueId).toBeDefined();
      expect(queue.queueUrl).toBeDefined();
    });
  });

  describe('auto-naming', () => {
    it('should convert PascalCase to kebab-case', () => {
      const queue = new StorageQueues(storageAccount, 'OrderQueue');

      expect(queue.queueName).toBe('order-queue');
    });

    it('should convert camelCase to kebab-case', () => {
      const queue = new StorageQueues(storageAccount, 'orderQueue');

      expect(queue.queueName).toBe('order-queue');
    });

    it('should handle already kebab-case names', () => {
      const queue = new StorageQueues(storageAccount, 'order-queue');

      expect(queue.queueName).toBe('order-queue');
    });

    it('should remove consecutive hyphens', () => {
      const queue = new StorageQueues(storageAccount, 'order--queue');

      expect(queue.queueName).not.toContain('--');
    });

    it('should remove leading hyphens', () => {
      const queue = new StorageQueues(storageAccount, '-OrderQueue');

      expect(queue.queueName).not.toMatch(/^-/);
    });

    it('should remove trailing hyphens', () => {
      const queue = new StorageQueues(storageAccount, 'OrderQueue-');

      expect(queue.queueName).not.toMatch(/-$/);
    });

    it('should handle short names by prefixing with "queue-"', () => {
      const queue = new StorageQueues(storageAccount, 'ab');

      expect(queue.queueName).toMatch(/^queue-/);
      expect(queue.queueName.length).toBeGreaterThanOrEqual(3);
    });

    it('should truncate long names to 63 characters', () => {
      const longId = 'VeryLongQueueNameThatExceedsTheMaximumAllowedLengthFor AzureStorageQueuesWhichIs63Characters';
      const queue = new StorageQueues(storageAccount, longId);

      expect(queue.queueName.length).toBeLessThanOrEqual(63);
    });

    it('should generate different names for different construct IDs', () => {
      const queue1 = new StorageQueues(storageAccount, 'OrderQueue');
      const queue2 = new StorageQueues(storageAccount, 'InvoiceQueue');

      expect(queue1.queueName).not.toBe(queue2.queueName);
    });

    it('should convert multiple consecutive uppercase letters correctly', () => {
      const queue = new StorageQueues(storageAccount, 'OrderQueueAPI');

      expect(queue.queueName).toBe('order-queue-api');
    });

    it('should handle numbers in the ID', () => {
      const queue = new StorageQueues(storageAccount, 'Order123Queue');

      expect(queue.queueName).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe('parent validation', () => {
    it('should throw error if not created within a StorageAccount', () => {
      const plainConstruct = new Construct(app, 'PlainConstruct');

      expect(() => {
        new StorageQueues(plainConstruct, 'Queue');
      }).toThrow(/StorageQueues must be created within or under a StorageAccount/);
    });

    it('should work when created directly within StorageAccount', () => {
      const queue = new StorageQueues(storageAccount, 'Queue');

      expect(queue.queueName).toBeDefined();
    });

    it('should work when created within nested construct under StorageAccount', () => {
      const nestedConstruct = new Construct(storageAccount, 'Nested');
      const queue = new StorageQueues(nestedConstruct, 'Queue');

      expect(queue.queueName).toBeDefined();
      expect(queue.storageAccountName).toBe(storageAccount.storageAccountName);
    });
  });

  describe('IStorageQueue interface', () => {
    it('should implement IStorageQueue interface', () => {
      const queue = new StorageQueues(storageAccount, 'Queue');

      // Should have required properties
      expect(queue).toHaveProperty('queueName');
      expect(queue).toHaveProperty('storageAccountName');
      expect(queue).toHaveProperty('queueId');
      expect(queue).toHaveProperty('queueUrl');
    });
  });

  describe('grant methods', () => {
    let queue: StorageQueues;
    let functionApp: FunctionApp;

    beforeEach(() => {
      queue = new StorageQueues(storageAccount, 'OrderQueue', {
        queueName: 'orders',
      });

      functionApp = new FunctionApp(resourceGroup, 'Function', {
        plan: createMockPlan(),
        storageAccount: {
          storageAccountId: '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/funcstore',
          storageAccountName: 'funcstore',
        },
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
        },
      });
    });

    describe('grantRead', () => {
      it('should grant queue read access', () => {
        const grant = queue.grantRead(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_QUEUE_DATA_READER);
        expect(grant.grantee).toBe(functionApp);
      });

      it('should grant at storage account scope', () => {
        const grant = queue.grantRead(functionApp);

        // Queue grants are at storage account scope, not queue scope
        expect(grant.scope).toBe(storageAccount.storageAccountId);
      });
    });

    describe('grantProcess', () => {
      it('should grant message processing access', () => {
        const grant = queue.grantProcess(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_QUEUE_DATA_MESSAGE_PROCESSOR);
        expect(grant.scope).toBe(storageAccount.storageAccountId);
      });
    });

    describe('grantSend', () => {
      it('should grant message sending access', () => {
        const grant = queue.grantSend(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_QUEUE_DATA_MESSAGE_SENDER);
        expect(grant.scope).toBe(storageAccount.storageAccountId);
      });
    });

    describe('grantFullAccess', () => {
      it('should grant full queue access', () => {
        const grant = queue.grantFullAccess(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_QUEUE_DATA_CONTRIBUTOR);
        expect(grant.scope).toBe(storageAccount.storageAccountId);
      });
    });

    describe('multiple grants', () => {
      it('should create multiple grants to same grantee', () => {
        const grant1 = queue.grantRead(functionApp);
        const grant2 = queue.grantSend(functionApp);

        expect(grant1).toBeDefined();
        expect(grant2).toBeDefined();
        expect(grant1.roleDefinitionId).not.toBe(grant2.roleDefinitionId);

        // Both grants should be children of the queue
        const grants = queue.node.children.filter((child) => child.node.id.startsWith('Grant'));
        expect(grants.length).toBeGreaterThanOrEqual(2);
      });

      it('should generate unique grant IDs', () => {
        queue.grantRead(functionApp);
        queue.grantProcess(functionApp);
        queue.grantSend(functionApp);

        const grantIds = queue.node.children
          .filter((child) => child.node.id.startsWith('Grant'))
          .map((child) => child.node.id);

        // All grant IDs should be unique
        const uniqueIds = new Set(grantIds);
        expect(uniqueIds.size).toBe(grantIds.length);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should create multiple queues in same storage account', () => {
      const queue1 = new StorageQueues(storageAccount, 'OrderQueue');
      const queue2 = new StorageQueues(storageAccount, 'InvoiceQueue');

      expect(queue1.queueName).not.toBe(queue2.queueName);
      expect(queue1.storageAccountName).toBe(queue2.storageAccountName);
    });

    it('should be addable to construct tree', () => {
      const queue = new StorageQueues(storageAccount, 'Queue');

      expect(queue.node.scope).toBe(storageAccount);
      expect(queue.node.id).toBe('Queue');
    });

    it('should support nested constructs', () => {
      const queue = new StorageQueues(storageAccount, 'Queue');
      const child = new Construct(queue, 'ChildConstruct');

      expect(child.node.scope).toBe(queue);
      expect(queue.node.children).toContainEqual(child);
    });

    it('should handle multiple storage accounts with queues', () => {
      const storage1 = new StorageAccounts(resourceGroup, 'Storage1', {
        storageAccountName: 'storage1',
      });
      const storage2 = new StorageAccounts(resourceGroup, 'Storage2', {
        storageAccountName: 'storage2',
      });

      const queue1 = new StorageQueues(storage1, 'OrderQueue');
      const queue2 = new StorageQueues(storage2, 'OrderQueue');

      // Same queue name but different storage accounts
      expect(queue1.queueName).toBe(queue2.queueName);
      expect(queue1.storageAccountName).not.toBe(queue2.storageAccountName);
    });
  });

  describe('typical usage patterns', () => {
    it('should support producer-consumer pattern', () => {
      const queue = new StorageQueues(storageAccount, 'OrderQueue');

      const producer = new FunctionApp(resourceGroup, 'Producer', {
        plan: createMockPlan(),
        storageAccount: {
          storageAccountId: '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/funcstore',
          storageAccountName: 'funcstore',
        },
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
        },
      });

      const consumer = new FunctionApp(resourceGroup, 'Consumer', {
        plan: createMockPlan(),
        storageAccount: {
          storageAccountId: '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/funcstore',
          storageAccountName: 'funcstore',
        },
        identity: {
          type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
        },
      });

      // Producer can send messages
      const sendGrant = queue.grantSend(producer);

      // Consumer can process messages
      const processGrant = queue.grantProcess(consumer);

      expect(sendGrant).toBeDefined();
      expect(processGrant).toBeDefined();
      expect(sendGrant.roleDefinitionId).not.toBe(processGrant.roleDefinitionId);
    });

    it('should support metadata for queue organization', () => {
      const queue = new StorageQueues(storageAccount, 'OrderQueue', {
        metadata: {
          environment: 'production',
          team: 'backend',
          purpose: 'order-processing',
          retention: '7-days',
        },
      });

      expect(queue.metadata).toEqual({
        environment: 'production',
        team: 'backend',
        purpose: 'order-processing',
        retention: '7-days',
      });
    });
  });

  describe('advanced scenarios', () => {
    it('should work with all properties specified', () => {
      const queue = new StorageQueues(storageAccount, 'OrderQueue', {
        queueName: 'custom-order-queue',
        metadata: {
          purpose: 'order-processing',
          team: 'backend',
        },
      });

      expect(queue.queueName).toBe('custom-order-queue');
      expect(queue.storageAccountName).toBe('teststorage');
      expect(queue.metadata).toEqual({
        purpose: 'order-processing',
        team: 'backend',
      });
    });

    it('should handle special characters in auto-naming', () => {
      const queue = new StorageQueues(storageAccount, 'Order_Queue@2023');

      // Special characters should be converted to hyphens
      expect(queue.queueName).toMatch(/^[a-z0-9-]+$/);
      expect(queue.queueName).not.toContain('_');
      expect(queue.queueName).not.toContain('@');
    });
  });
});
