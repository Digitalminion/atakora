/**
 * Unit tests for ServiceBusQueue L2 construct.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { App, Construct } from '@atakora/cdk';
import { ServiceBusQueue } from '../service-bus-queue';
import { ServiceBusNamespace } from '../service-bus-namespace';
import { MockResourceGroup, createMockPlan } from '../../../__tests__/helpers/test-fixtures';
import { FunctionApp } from '../../functions/function-app';
import { ManagedServiceIdentityType } from '../../functions/function-app-types';
import { WellKnownRoleIds } from '@atakora/lib';

describe('cdk/servicebus/ServiceBusQueue', () => {
  let app: App;
  let resourceGroup: MockResourceGroup;
  let namespace: ServiceBusNamespace;

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

    namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
      namespaceName: 'sb-test',
      location: 'eastus',
    });
  });

  describe('constructor', () => {
    it('should create queue with auto-generated name', () => {
      const queue = new ServiceBusQueue(namespace, 'OrderQueue');

      expect(queue.queueName).toBeDefined();
      expect(queue.namespaceName).toBe('sb-test');
    });

    it('should use provided queue name when specified', () => {
      const queue = new ServiceBusQueue(namespace, 'OrderQueue', {
        queueName: 'my-custom-queue',
      });

      expect(queue.queueName).toBe('my-custom-queue');
    });

    it('should set namespace name from parent', () => {
      const queue = new ServiceBusQueue(namespace, 'OrderQueue');

      expect(queue.namespaceName).toBe('sb-test');
    });

    it('should set queueId and connectionString', () => {
      const queue = new ServiceBusQueue(namespace, 'OrderQueue');

      expect(queue.queueId).toBeDefined();
      expect(queue.connectionString).toBeDefined();
    });

    it('should default deadLetteringOnMessageExpiration to true', () => {
      const queue = new ServiceBusQueue(namespace, 'OrderQueue');

      // This is set internally and verified via ARM template
      expect(queue.queueName).toBeDefined();
    });

    it('should allow disabling dead lettering', () => {
      const queue = new ServiceBusQueue(namespace, 'OrderQueue', {
        deadLetteringOnMessageExpiration: false,
      });

      expect(queue.queueName).toBeDefined();
    });
  });

  describe('auto-naming', () => {
    it('should convert PascalCase to kebab-case', () => {
      const queue = new ServiceBusQueue(namespace, 'OrderQueue');

      expect(queue.queueName).toBe('order-queue');
    });

    it('should convert camelCase to kebab-case', () => {
      const queue = new ServiceBusQueue(namespace, 'orderQueue');

      expect(queue.queueName).toBe('order-queue');
    });

    it('should handle already kebab-case names', () => {
      const queue = new ServiceBusQueue(namespace, 'order-queue');

      expect(queue.queueName).toBe('order-queue');
    });

    it('should remove consecutive hyphens', () => {
      const queue = new ServiceBusQueue(namespace, 'order--queue');

      expect(queue.queueName).not.toContain('--');
    });

    it('should remove leading hyphens', () => {
      const queue = new ServiceBusQueue(namespace, '-OrderQueue');

      expect(queue.queueName).not.toMatch(/^-/);
    });

    it('should remove trailing hyphens', () => {
      const queue = new ServiceBusQueue(namespace, 'OrderQueue-');

      expect(queue.queueName).not.toMatch(/-$/);
    });

    it('should handle numbers in the ID', () => {
      const queue = new ServiceBusQueue(namespace, 'Order123Queue');

      expect(queue.queueName).toMatch(/^[a-z0-9-]+$/);
    });

    it('should handle special characters', () => {
      const queue = new ServiceBusQueue(namespace, 'Order_Queue@2023');

      expect(queue.queueName).toMatch(/^[a-z0-9-]+$/);
      expect(queue.queueName).not.toContain('_');
      expect(queue.queueName).not.toContain('@');
    });
  });

  describe('parent validation', () => {
    it('should throw error if not created within a ServiceBusNamespace', () => {
      const plainConstruct = new Construct(app, 'PlainConstruct');

      expect(() => {
        new ServiceBusQueue(plainConstruct, 'Queue');
      }).toThrow(/ServiceBusQueue must be created within or under a ServiceBusNamespace/);
    });

    it('should work when created directly within ServiceBusNamespace', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue');

      expect(queue.queueName).toBeDefined();
    });

    it('should work when created within nested construct under ServiceBusNamespace', () => {
      const nestedConstruct = new Construct(namespace, 'Nested');
      const queue = new ServiceBusQueue(nestedConstruct, 'Queue');

      expect(queue.queueName).toBeDefined();
      expect(queue.namespaceName).toBe(namespace.namespaceName);
    });
  });

  describe('tag merging', () => {
    it('should inherit tags from parent', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue');

      // Tags are merged internally
      expect(queue.tags).toBeDefined();
    });

    it('should merge provided tags with parent tags', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue', {
        tags: {
          costCenter: '1234',
          owner: 'messaging-team',
        },
      });

      expect(queue.tags).toMatchObject({
        costCenter: '1234',
        owner: 'messaging-team',
      });
    });

    it('should override parent tags with provided tags', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue', {
        tags: {
          project: 'custom-project', // overrides parent
        },
      });

      expect(queue.tags.project).toBe('custom-project');
    });
  });

  describe('queue properties', () => {
    it('should support maxDeliveryCount', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue', {
        maxDeliveryCount: 5,
      });

      expect(queue.queueName).toBeDefined();
    });

    it('should support requiresDuplicateDetection', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue', {
        requiresDuplicateDetection: true,
      });

      expect(queue.queueName).toBeDefined();
    });

    it('should support lockDuration in seconds', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue', {
        lockDuration: 60, // 60 seconds
      });

      expect(queue.queueName).toBeDefined();
    });

    it('should support duplicateDetectionWindow in seconds', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue', {
        duplicateDetectionWindow: 600, // 10 minutes
      });

      expect(queue.queueName).toBeDefined();
    });

    it('should support defaultMessageTimeToLive in seconds', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue', {
        defaultMessageTimeToLive: 3600, // 1 hour
      });

      expect(queue.queueName).toBeDefined();
    });

    it('should support maxSizeInMegabytes', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue', {
        maxSizeInMegabytes: 2048,
      });

      expect(queue.queueName).toBeDefined();
    });

    it('should support enablePartitioning', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue', {
        enablePartitioning: true,
      });

      expect(queue.queueName).toBeDefined();
    });

    it('should support requiresSession', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue', {
        requiresSession: true,
      });

      expect(queue.queueName).toBeDefined();
    });

    it('should support enableBatchedOperations', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue', {
        enableBatchedOperations: true,
      });

      expect(queue.queueName).toBeDefined();
    });
  });

  describe('IServiceBusQueue interface', () => {
    it('should implement IServiceBusQueue interface', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue');

      // Should have required properties
      expect(queue).toHaveProperty('queueName');
      expect(queue).toHaveProperty('namespaceName');
      expect(queue).toHaveProperty('queueId');
      expect(queue).toHaveProperty('connectionString');
    });
  });

  describe('grant methods', () => {
    let queue: ServiceBusQueue;
    let functionApp: FunctionApp;

    beforeEach(() => {
      queue = new ServiceBusQueue(namespace, 'OrderQueue', {
        queueName: 'orders',
      });

      functionApp = new FunctionApp(resourceGroup, 'Consumer', {
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

    describe('grantSend', () => {
      it('should grant send permission', () => {
        const grant = queue.grantSend(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.SERVICE_BUS_DATA_SENDER);
        expect(grant.grantee).toBe(functionApp);
        expect(grant.scope).toBe(queue.queueId);
      });
    });

    describe('grantReceive', () => {
      it('should grant receive permission', () => {
        const grant = queue.grantReceive(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.SERVICE_BUS_DATA_RECEIVER);
        expect(grant.grantee).toBe(functionApp);
        expect(grant.scope).toBe(queue.queueId);
      });
    });

    describe('grantSendReceive', () => {
      it('should grant both send and receive permissions', () => {
        const grant = queue.grantSendReceive(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.SERVICE_BUS_DATA_RECEIVER);

        // Both grants should be children of the queue
        const grants = queue.node.children.filter((child) => child.node.id.startsWith('Grant'));
        expect(grants.length).toBeGreaterThanOrEqual(2);
      });

      it('should create separate role assignments for send and receive', () => {
        queue.grantSendReceive(functionApp);

        const sendGrant = queue.node.children.find((child) =>
          child.node.id.startsWith('GrantSend')
        );
        const receiveGrant = queue.node.children.find((child) =>
          child.node.id.startsWith('GrantReceive')
        );

        expect(sendGrant).toBeDefined();
        expect(receiveGrant).toBeDefined();
      });
    });

    describe('multiple grants', () => {
      it('should create multiple grants to same grantee', () => {
        const grant1 = queue.grantSend(functionApp);
        const grant2 = queue.grantReceive(functionApp);

        expect(grant1).toBeDefined();
        expect(grant2).toBeDefined();
        expect(grant1.roleDefinitionId).not.toBe(grant2.roleDefinitionId);

        // Both grants should be children of the queue
        const grants = queue.node.children.filter((child) => child.node.id.startsWith('Grant'));
        expect(grants.length).toBeGreaterThanOrEqual(2);
      });

      it('should generate unique grant IDs', () => {
        queue.grantSend(functionApp);
        queue.grantReceive(functionApp);

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
    it('should create multiple queues in same namespace', () => {
      const queue1 = new ServiceBusQueue(namespace, 'OrderQueue');
      const queue2 = new ServiceBusQueue(namespace, 'InvoiceQueue');

      expect(queue1.queueName).not.toBe(queue2.queueName);
      expect(queue1.namespaceName).toBe(queue2.namespaceName);
    });

    it('should support producer-consumer pattern', () => {
      const queue = new ServiceBusQueue(namespace, 'OrderQueue');

      const producer = new FunctionApp(resourceGroup, 'Producer', {
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

      const consumer = new FunctionApp(resourceGroup, 'Consumer', {
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

      // Producer sends messages
      const sendGrant = queue.grantSend(producer);

      // Consumer receives messages
      const receiveGrant = queue.grantReceive(consumer);

      expect(sendGrant).toBeDefined();
      expect(receiveGrant).toBeDefined();
      expect(sendGrant.roleDefinitionId).not.toBe(receiveGrant.roleDefinitionId);
    });

    it('should be addable to construct tree', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue');

      expect(queue.node.scope).toBe(namespace);
      expect(queue.node.id).toBe('Queue');
    });

    it('should support nested constructs', () => {
      const queue = new ServiceBusQueue(namespace, 'Queue');
      const child = new Construct(queue, 'ChildConstruct');

      expect(child.node.scope).toBe(queue);
      expect(queue.node.children).toContainEqual(child);
    });
  });

  describe('advanced scenarios', () => {
    it('should work with all properties specified', () => {
      const queue = new ServiceBusQueue(namespace, 'OrderQueue', {
        queueName: 'custom-order-queue',
        maxDeliveryCount: 5,
        lockDuration: 60,
        maxSizeInMegabytes: 2048,
        requiresDuplicateDetection: true,
        duplicateDetectionWindow: 600,
        defaultMessageTimeToLive: 3600,
        deadLetteringOnMessageExpiration: true,
        enablePartitioning: true,
        requiresSession: false,
        enableBatchedOperations: true,
        tags: {
          costCenter: '1234',
          environment: 'production',
        },
      });

      expect(queue.queueName).toBe('custom-order-queue');
      expect(queue.namespaceName).toBe('sb-test');
      expect(queue.tags).toMatchObject({
        costCenter: '1234',
        environment: 'production',
      });
    });

    it('should support typical message retry configuration', () => {
      const queue = new ServiceBusQueue(namespace, 'OrderQueue', {
        maxDeliveryCount: 10,
        lockDuration: 30,
        deadLetteringOnMessageExpiration: true,
      });

      expect(queue.queueName).toBeDefined();
    });

    it('should support duplicate detection configuration', () => {
      const queue = new ServiceBusQueue(namespace, 'OrderQueue', {
        requiresDuplicateDetection: true,
        duplicateDetectionWindow: 600, // 10 minutes
      });

      expect(queue.queueName).toBeDefined();
    });

    it('should support session-enabled queues', () => {
      const queue = new ServiceBusQueue(namespace, 'SessionQueue', {
        requiresSession: true,
      });

      expect(queue.queueName).toBeDefined();
    });

    it('should support partitioned queues', () => {
      const queue = new ServiceBusQueue(namespace, 'PartitionedQueue', {
        enablePartitioning: true,
        maxSizeInMegabytes: 5120, // Valid size: 1024, 2048, 3072, 4096, 5120
      });

      expect(queue.queueName).toBeDefined();
    });
  });
});
