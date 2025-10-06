/**
 * E2E Test: Private Endpoint Integration
 *
 * @remarks
 * This E2E test validates the complete Private Endpoint workflow:
 * - Storage Account creation
 * - Virtual Network and Subnet setup
 * - Private Endpoint creation with proper references
 * - ARM template structure validation
 *
 * Verifies the bug fix for: Private endpoints missing subnet IDs and connection details
 * Related bug task: [1211551574717809]
 * Subtask: [1211551702891424] - Add E2E test for Private Endpoint
 *
 * @packageDocumentation
 */

import { describe, it, expect } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { ResourceGroup } from '../resource-group/resource-group';
import { VirtualNetwork } from '../virtual-network/virtual-network';
import { Subnet } from '../subnet/subnet';
import { StorageAccount } from '../storage-account/storage-account';
import { PrivateEndpoint } from './private-endpoint';
import { ArmPrivateEndpoint } from './arm-private-endpoint';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';

describe('E2E: Private Endpoint with Storage Account + Subnet', () => {
  describe('Complete Infrastructure Stack', () => {
    it('should create Storage Account + VNet + Subnet + Private Endpoint', () => {
      const app = new App();

      const stack = new SubscriptionStack(app, 'E2EStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('eastus'),
        organization: Organization.fromValue('digital-products'),
        project: new Project('pe-test'),
        environment: Environment.fromValue('nonprod'),
        instance: Instance.fromNumber(1),
      });

      // Create resource group
      const resourceGroup = new ResourceGroup(stack, 'NetworkRG', {
        tags: { purpose: 'private-endpoint-testing' },
      });

      // Create virtual network
      const vnet = new VirtualNetwork(resourceGroup, 'TestVNet', {
        addressSpace: '10.0.0.0/16',
      });

      // Create subnet for private endpoints
      const subnet = new Subnet(vnet, 'PrivateEndpointSubnet', {
        addressPrefix: '10.0.1.0/24',
        privateEndpointNetworkPolicies: 'Disabled',
      });

      // Create storage account
      const storageAccount = new StorageAccount(resourceGroup, 'TestStorage', {
        publicNetworkAccess: 'Disabled',
      });

      // Create private endpoint
      const privateEndpoint = new PrivateEndpoint(resourceGroup, 'StorageBlobEndpoint', {
        subnet: subnet,
        privateLinkServiceId: storageAccount.storageAccountId,
        groupIds: ['blob'],
        tags: { purpose: 'storage-private-access' },
      });

      // Verify all constructs were created
      expect(resourceGroup).toBeDefined();
      expect(vnet).toBeDefined();
      expect(subnet).toBeDefined();
      expect(storageAccount).toBeDefined();
      expect(privateEndpoint).toBeDefined();

      // Verify Private Endpoint properties
      expect(privateEndpoint.subnetId).toBe(subnet.subnetId);
      expect(privateEndpoint.subnetId).toContain('/subnets/');
      expect(privateEndpoint.privateEndpointName).toBeDefined();
      expect(privateEndpoint.location).toBe('eastus');
      expect(privateEndpoint.privateEndpointId).toBeDefined();
      expect(privateEndpoint.privateEndpointId).toContain('/privateEndpoints/');
    });

    it('should create multiple Private Endpoints for different service groups', () => {
      const app = new App();

      const stack = new SubscriptionStack(app, 'MultiEndpointStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('eastus'),
        organization: Organization.fromValue('digital-products'),
        project: new Project('multi-pe'),
        environment: Environment.fromValue('nonprod'),
        instance: Instance.fromNumber(1),
      });

      const resourceGroup = new ResourceGroup(stack, 'NetworkRG');
      const vnet = new VirtualNetwork(resourceGroup, 'TestVNet', {
        addressSpace: '10.0.0.0/16',
      });
      const subnet = new Subnet(vnet, 'PrivateEndpointSubnet', {
        addressPrefix: '10.0.1.0/24',
      });
      const storageAccount = new StorageAccount(resourceGroup, 'TestStorage', {
        publicNetworkAccess: 'Disabled',
      });

      // Create separate endpoints for blob and file services
      const blobEndpoint = new PrivateEndpoint(resourceGroup, 'StorageBlobEndpoint', {
        subnet: subnet,
        privateLinkServiceId: storageAccount.storageAccountId,
        groupIds: ['blob'],
      });

      const fileEndpoint = new PrivateEndpoint(resourceGroup, 'StorageFileEndpoint', {
        subnet: subnet,
        privateLinkServiceId: storageAccount.storageAccountId,
        groupIds: ['file'],
      });

      // Verify both endpoints were created with unique IDs
      expect(blobEndpoint.privateEndpointId).toBeDefined();
      expect(fileEndpoint.privateEndpointId).toBeDefined();
      expect(blobEndpoint.privateEndpointId).not.toBe(fileEndpoint.privateEndpointId);

      // Verify both reference the same subnet
      expect(blobEndpoint.subnetId).toBe(subnet.subnetId);
      expect(fileEndpoint.subnetId).toBe(subnet.subnetId);
    });
  });

  describe('ARM Template Structure - Bug Fix Validation', () => {
    it('should include subnet reference in ARM template (fixes missing subnet bug)', () => {
      const stack = new SubscriptionStack(new App(), 'TestStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('eastus'),
        organization: Organization.fromValue('digital-products'),
        project: new Project('test'),
        environment: Environment.fromValue('nonprod'),
        instance: Instance.fromNumber(1),
      });

      const subnetId = '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet';
      const storageId = '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststg';

      const armPrivateEndpoint = new ArmPrivateEndpoint(stack, 'TestPE', {
        privateEndpointName: 'pe-test-01',
        location: 'eastus',
        subnet: {
          id: subnetId,
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId: storageId,
            groupIds: ['blob'],
          },
        ],
      });

      const template = armPrivateEndpoint.toArmTemplate();

      // BUG FIX VERIFICATION: Subnet must be present in ARM template
      expect(template.properties.subnet).toBeDefined();
      expect(template.properties.subnet.id).toBe(subnetId);
    });

    it('should include privateLinkServiceConnections in ARM template (fixes missing connections bug)', () => {
      const stack = new SubscriptionStack(new App(), 'TestStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('eastus'),
        organization: Organization.fromValue('digital-products'),
        project: new Project('test'),
        environment: Environment.fromValue('nonprod'),
        instance: Instance.fromNumber(1),
      });

      const subnetId = '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet';
      const storageId = '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststg';

      const armPrivateEndpoint = new ArmPrivateEndpoint(stack, 'TestPE', {
        privateEndpointName: 'pe-test-01',
        location: 'eastus',
        subnet: {
          id: subnetId,
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId: storageId,
            groupIds: ['blob'],
          },
        ],
      });

      const template = armPrivateEndpoint.toArmTemplate();

      // BUG FIX VERIFICATION: privateLinkServiceConnections must be present and configured
      expect(template.properties.privateLinkServiceConnections).toBeDefined();
      expect(Array.isArray(template.properties.privateLinkServiceConnections)).toBe(true);
      expect(template.properties.privateLinkServiceConnections.length).toBe(1);

      const connection = template.properties.privateLinkServiceConnections[0];
      expect(connection.name).toBe('storage-connection');
      expect(connection.properties.privateLinkServiceId).toBe(storageId);
    });

    it('should include groupIds in privateLinkServiceConnections (fixes missing groupIds bug)', () => {
      const stack = new SubscriptionStack(new App(), 'TestStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('eastus'),
        organization: Organization.fromValue('digital-products'),
        project: new Project('test'),
        environment: Environment.fromValue('nonprod'),
        instance: Instance.fromNumber(1),
      });

      const subnetId = '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet';
      const storageId = '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststg';

      const armPrivateEndpoint = new ArmPrivateEndpoint(stack, 'TestPE', {
        privateEndpointName: 'pe-test-01',
        location: 'eastus',
        subnet: {
          id: subnetId,
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId: storageId,
            groupIds: ['blob'],
          },
        ],
      });

      const template = armPrivateEndpoint.toArmTemplate();

      // BUG FIX VERIFICATION: groupIds must be present in the connection
      const connection = template.properties.privateLinkServiceConnections[0];
      expect(connection.properties.groupIds).toBeDefined();
      expect(Array.isArray(connection.properties.groupIds)).toBe(true);
      expect(connection.properties.groupIds).toContain('blob');
    });

    it('should support multiple groupIds for a single Private Endpoint', () => {
      const stack = new SubscriptionStack(new App(), 'TestStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('eastus'),
        organization: Organization.fromValue('digital-products'),
        project: new Project('test'),
        environment: Environment.fromValue('nonprod'),
        instance: Instance.fromNumber(1),
      });

      const subnetId = '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet';
      const storageId = '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststg';

      const armPrivateEndpoint = new ArmPrivateEndpoint(stack, 'TestPE', {
        privateEndpointName: 'pe-test-01',
        location: 'eastus',
        subnet: {
          id: subnetId,
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId: storageId,
            groupIds: ['blob', 'file', 'table'],
          },
        ],
      });

      const template = armPrivateEndpoint.toArmTemplate();

      const connection = template.properties.privateLinkServiceConnections[0];
      expect(connection.properties.groupIds).toEqual(['blob', 'file', 'table']);
    });

    it('should generate complete ARM template for production deployment', () => {
      const stack = new SubscriptionStack(new App(), 'TestStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('eastus'),
        organization: Organization.fromValue('digital-products'),
        project: new Project('test'),
        environment: Environment.fromValue('nonprod'),
        instance: Instance.fromNumber(1),
      });

      const subnetId = '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Network/virtualNetworks/test-vnet/subnets/test-subnet';
      const storageId = '/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststg';

      const armPrivateEndpoint = new ArmPrivateEndpoint(stack, 'TestPE', {
        privateEndpointName: 'pe-storage-blob-prod-01',
        location: 'eastus',
        subnet: {
          id: subnetId,
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-blob-connection',
            privateLinkServiceId: storageId,
            groupIds: ['blob'],
          },
        ],
        tags: {
          Environment: 'Production',
          CostCenter: '12345',
          Application: 'ColorAI',
        },
      });

      const template = armPrivateEndpoint.toArmTemplate();

      // Comprehensive validation
      expect(template.type).toBe('Microsoft.Network/privateEndpoints');
      expect(template.apiVersion).toBeDefined();
      expect(template.name).toBe('pe-storage-blob-prod-01');
      expect(template.location).toBe('eastus');
      expect(template.properties).toBeDefined();

      // Verify subnet reference
      expect(template.properties.subnet).toBeDefined();
      expect(template.properties.subnet.id).toBe(subnetId);

      // Verify privateLinkServiceConnections
      expect(template.properties.privateLinkServiceConnections).toBeDefined();
      expect(Array.isArray(template.properties.privateLinkServiceConnections)).toBe(true);
      expect(template.properties.privateLinkServiceConnections.length).toBe(1);

      const connection = template.properties.privateLinkServiceConnections[0];
      expect(connection.name).toBe('storage-blob-connection');
      expect(connection.properties.privateLinkServiceId).toBe(storageId);
      expect(connection.properties.groupIds).toContain('blob');

      // Verify tags
      expect(template.tags).toBeDefined();
      expect(template.tags.Environment).toBe('Production');
      expect(template.tags.CostCenter).toBe('12345');
      expect(template.tags.Application).toBe('ColorAI');
    });
  });
});
