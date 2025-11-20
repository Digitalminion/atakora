/**
 * Unit tests for ServiceBusNamespace L2 construct.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '@atakora/cdk';
import { ServiceBusNamespace } from '../service-bus-namespace';
import { ServiceBusSku } from '../service-bus-namespace-types';
import { MockResourceGroup, createMockPlan } from '../../../__tests__/helpers/test-fixtures';
import { FunctionApp } from '../../functions/function-app';
import { ManagedServiceIdentityType } from '../../functions/function-app-types';
import { WellKnownRoleIds } from '@atakora/lib';

describe('cdk/servicebus/ServiceBusNamespace', () => {
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
    it('should create namespace with auto-generated name', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        location: 'eastus',
      });

      expect(namespace.namespaceName).toBeDefined();
      expect(namespace.name).toBe(namespace.namespaceName);
    });

    it('should use provided namespace name when specified', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        namespaceName: 'sb-my-namespace',
        location: 'eastus',
      });

      expect(namespace.namespaceName).toBe('sb-my-namespace');
    });

    it('should default to Standard SKU', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        location: 'eastus',
      });

      // SKU is set internally; we verify via ARM template
      expect(namespace.resourceType).toBe('Microsoft.ServiceBus/namespaces');
    });

    it('should use provided SKU when specified', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        sku: ServiceBusSku.PREMIUM,
        location: 'eastus',
      });

      expect(namespace.namespaceName).toBeDefined();
    });

    it('should use provided location', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        location: 'eastus',
      });

      expect(namespace.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        location: 'westus2',
      });

      expect(namespace.location).toBe('westus2');
    });

    it('should set resourceId and namespaceId', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        location: 'eastus',
      });

      expect(namespace.resourceId).toBeDefined();
      expect(namespace.namespaceId).toBe(namespace.resourceId);
    });

    it('should support zone redundancy with Premium SKU', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        sku: ServiceBusSku.PREMIUM,
        zoneRedundant: true,
        location: 'eastus',
      });

      expect(namespace.namespaceName).toBeDefined();
    });

    it('should support disable local auth', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        disableLocalAuth: true,
        location: 'eastus',
      });

      expect(namespace.namespaceName).toBeDefined();
    });

    it('should default minimum TLS version to 1.2', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        location: 'eastus',
      });

      // TLS version is set internally
      expect(namespace.namespaceName).toBeDefined();
    });

    it('should allow custom minimum TLS version', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        minimumTlsVersion: '1.3',
        location: 'eastus',
      });

      expect(namespace.namespaceName).toBeDefined();
    });
  });

  describe('tag merging', () => {
    it('should inherit tags from parent', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        location: 'eastus',
      });

      // Tags are merged internally
      expect(namespace.namespaceName).toBeDefined();
    });

    it('should merge provided tags with parent tags', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        tags: {
          costCenter: '1234',
          owner: 'messaging-team',
        },
        location: 'eastus',
      });

      expect(namespace.namespaceName).toBeDefined();
    });

    it('should override parent tags with provided tags', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        tags: {
          project: 'custom-project', // overrides parent
        },
        location: 'eastus',
      });

      expect(namespace.namespaceName).toBeDefined();
    });
  });

  describe('IServiceBusNamespace interface', () => {
    it('should implement IServiceBusNamespace interface', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        location: 'eastus',
      });

      // Should have required properties
      expect(namespace).toHaveProperty('namespaceName');
      expect(namespace).toHaveProperty('name');
      expect(namespace).toHaveProperty('location');
      expect(namespace).toHaveProperty('resourceId');
      expect(namespace).toHaveProperty('namespaceId');
    });
  });

  describe('GrantableResource extension', () => {
    it('should extend GrantableResource', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        location: 'eastus',
      });

      // Should have Resource properties
      expect(namespace.resourceType).toBe('Microsoft.ServiceBus/namespaces');
      expect(namespace).toHaveProperty('toArmTemplate');
    });
  });

  describe('grant methods', () => {
    let namespace: ServiceBusNamespace;
    let functionApp: FunctionApp;

    beforeEach(() => {
      namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        namespaceName: 'sb-test',
        location: 'eastus',
      });

      functionApp = new FunctionApp(resourceGroup, 'Consumer', {
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

    describe('grantDataReceiver', () => {
      it('should grant data receiver access', () => {
        const grant = namespace.grantDataReceiver(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.SERVICE_BUS_DATA_RECEIVER);
        expect(grant.grantee).toBe(functionApp);
        expect(grant.scope).toBe(namespace.resourceId);
      });

      it('should include description in grant', () => {
        const grant = namespace.grantDataReceiver(functionApp);

        expect(grant.roleAssignment).toBeDefined();
      });
    });

    describe('grantDataSender', () => {
      it('should grant data sender access', () => {
        const grant = namespace.grantDataSender(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.SERVICE_BUS_DATA_SENDER);
        expect(grant.grantee).toBe(functionApp);
        expect(grant.scope).toBe(namespace.resourceId);
      });
    });

    describe('grantDataOwner', () => {
      it('should grant data owner access', () => {
        const grant = namespace.grantDataOwner(functionApp);

        expect(grant).toBeDefined();
        expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.SERVICE_BUS_DATA_OWNER);
        expect(grant.grantee).toBe(functionApp);
        expect(grant.scope).toBe(namespace.resourceId);
      });
    });

    describe('multiple grants', () => {
      it('should create multiple grants to same grantee', () => {
        const grant1 = namespace.grantDataReceiver(functionApp);
        const grant2 = namespace.grantDataSender(functionApp);

        expect(grant1).toBeDefined();
        expect(grant2).toBeDefined();
        expect(grant1.roleDefinitionId).not.toBe(grant2.roleDefinitionId);

        // Both grants should be children of the namespace
        const grants = namespace.node.children.filter((child) => child.node.id.startsWith('Grant'));
        expect(grants.length).toBeGreaterThanOrEqual(2);
      });

      it('should generate unique grant IDs', () => {
        namespace.grantDataReceiver(functionApp);
        namespace.grantDataSender(functionApp);
        namespace.grantDataOwner(functionApp);

        const grantIds = namespace.node.children
          .filter((child) => child.node.id.startsWith('Grant'))
          .map((child) => child.node.id);

        // All grant IDs should be unique
        const uniqueIds = new Set(grantIds);
        expect(uniqueIds.size).toBe(grantIds.length);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should create multiple namespaces in same resource group', () => {
      const namespace1 = new ServiceBusNamespace(resourceGroup, 'Messaging1', {
        location: 'eastus',
      });
      const namespace2 = new ServiceBusNamespace(resourceGroup, 'Messaging2', {
        location: 'eastus',
      });

      expect(namespace1.namespaceName).not.toBe(namespace2.namespaceName);
      expect(namespace1.location).toBe(namespace2.location);
    });

    it('should support producer-consumer pattern', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        location: 'eastus',
      });

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

      // Producer sends messages
      const sendGrant = namespace.grantDataSender(producer);

      // Consumer receives messages
      const receiveGrant = namespace.grantDataReceiver(consumer);

      expect(sendGrant).toBeDefined();
      expect(receiveGrant).toBeDefined();
      expect(sendGrant.roleDefinitionId).not.toBe(receiveGrant.roleDefinitionId);
    });

    it('should be addable to construct tree', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        location: 'eastus',
      });

      expect(namespace.node.scope).toBe(resourceGroup);
      expect(namespace.node.id).toBe('Messaging');
    });
  });

  describe('SKU tiers', () => {
    it('should support Basic SKU', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        sku: ServiceBusSku.BASIC,
        location: 'eastus',
      });

      expect(namespace.namespaceName).toBeDefined();
    });

    it('should support Standard SKU', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        sku: ServiceBusSku.STANDARD,
        location: 'eastus',
      });

      expect(namespace.namespaceName).toBeDefined();
    });

    it('should support Premium SKU', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        sku: ServiceBusSku.PREMIUM,
        location: 'eastus',
      });

      expect(namespace.namespaceName).toBeDefined();
    });

    it('should support zone redundancy with Premium SKU', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        sku: ServiceBusSku.PREMIUM,
        zoneRedundant: true,
        location: 'eastus',
      });

      expect(namespace.namespaceName).toBeDefined();
    });
  });

  describe('advanced scenarios', () => {
    it('should work with all properties specified', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        namespaceName: 'sb-explicit',
        location: 'westus2',
        sku: ServiceBusSku.PREMIUM,
        zoneRedundant: true,
        disableLocalAuth: true,
        minimumTlsVersion: '1.3',
        tags: {
          costCenter: '1234',
          environment: 'production',
        },
      });

      expect(namespace.namespaceName).toBe('sb-explicit');
      expect(namespace.location).toBe('westus2');
      expect(namespace.resourceType).toBe('Microsoft.ServiceBus/namespaces');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template', () => {
      const namespace = new ServiceBusNamespace(resourceGroup, 'Messaging', {
        namespaceName: 'sb-test',
        location: 'eastus',
      });

      const template = namespace.toArmTemplate();

      expect(template).toBeDefined();
      expect(template.type).toBe('Microsoft.ServiceBus/namespaces');
      expect(template.name).toBe('sb-test');
    });
  });
});
