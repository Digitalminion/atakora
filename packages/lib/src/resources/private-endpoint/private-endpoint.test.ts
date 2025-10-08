import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { PrivateEndpoint } from './private-endpoint';
import type { PrivateEndpointProps, ISubnet, IPrivateDnsZone, IPrivateLinkResource } from './types';

describe('resources/private-endpoint/PrivateEndpoint', () => {
  let app: App;
  let stack: SubscriptionStack;

  // Mock subnet
  const mockSubnet: ISubnet = {
    subnetId:
      '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
  };

  // Mock storage account
  const mockStorageAccount: IPrivateLinkResource = {
    resourceId:
      '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
  };

  // Mock DNS zone
  const mockDnsZone: IPrivateDnsZone = {
    zoneId:
      '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net',
  };

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-products'),
      project: new Project('colorai'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
    });
  });

  describe('constructor', () => {
    it('should create private endpoint with minimal properties', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      expect(endpoint.privateEndpointName).toBeDefined();
      expect(endpoint.location).toBe('eastus'); // from stack
      expect(endpoint.subnetId).toBe(mockSubnet.subnetId);
      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create private endpoint with explicit name', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        privateEndpointName: 'pe-storage-blob-01',
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      expect(endpoint.privateEndpointName).toBe('pe-storage-blob-01');
    });

    it('should create private endpoint with explicit location', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        location: 'westus',
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      expect(endpoint.location).toBe('westus');
    });

    it('should create private endpoint with subnet ID string', () => {
      const subnetId =
        '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe';

      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: subnetId,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      expect(endpoint.subnetId).toBe(subnetId);
    });

    it('should create private endpoint with resource ID string', () => {
      const resourceId =
        '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg';

      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: resourceId,
        groupIds: ['blob'],
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create private endpoint with multiple group IDs', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob', 'file', 'table'],
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create private endpoint with custom connection name', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
        connectionName: 'my-custom-connection',
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create private endpoint with request message', () => {
      const endpoint = new PrivateEndpoint(stack, 'KeyVaultEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId:
          '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.KeyVault/vaults/mykv',
        groupIds: ['vault'],
        requestMessage: 'Please approve this connection',
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create private endpoint with custom NIC name', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
        customNetworkInterfaceName: 'nic-pe-storage-01',
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create private endpoint with DNS zone integration', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
        privateDnsZoneId: mockDnsZone,
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create private endpoint with DNS zone ID string', () => {
      const dnsZoneId =
        '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net';

      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
        privateDnsZoneId: dnsZoneId,
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create private endpoint with custom DNS zone group name', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
        privateDnsZoneId: mockDnsZone,
        dnsZoneGroupName: 'custom-dns-group',
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create private endpoint with tags', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
        tags: {
          Environment: 'Production',
          CostCenter: '12345',
        },
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should auto-generate name using stack context', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      // Name should be auto-generated
      expect(endpoint.privateEndpointName).toBeDefined();
      expect(endpoint.privateEndpointName.length).toBeGreaterThan(0);
    });

    it('should inherit location from stack when not provided', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      expect(endpoint.location).toBe('eastus');
    });
  });

  describe('validation', () => {
    it('should throw error if subnet is not provided', () => {
      expect(() => {
        new PrivateEndpoint(stack, 'StorageEndpoint', {
          subnet: undefined as any,
          privateLinkServiceId: mockStorageAccount,
          groupIds: ['blob'],
        });
      }).toThrow('Subnet is required for private endpoint');
    });

    it('should throw error if privateLinkServiceId is not provided', () => {
      expect(() => {
        new PrivateEndpoint(stack, 'StorageEndpoint', {
          subnet: mockSubnet,
          privateLinkServiceId: undefined as any,
          groupIds: ['blob'],
        });
      }).toThrow('Private link service ID is required for private endpoint');
    });

    it('should throw error if groupIds is not provided', () => {
      expect(() => {
        new PrivateEndpoint(stack, 'StorageEndpoint', {
          subnet: mockSubnet,
          privateLinkServiceId: mockStorageAccount,
          groupIds: undefined as any,
        });
      }).toThrow('At least one group ID is required for private endpoint');
    });

    it('should throw error if groupIds is empty array', () => {
      expect(() => {
        new PrivateEndpoint(stack, 'StorageEndpoint', {
          subnet: mockSubnet,
          privateLinkServiceId: mockStorageAccount,
          groupIds: [],
        });
      }).toThrow('At least one group ID is required for private endpoint');
    });
  });

  describe('fromEndpointId', () => {
    it('should create private endpoint from endpoint ID', () => {
      const endpointId =
        '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/privateEndpoints/pe-storage-01';

      const endpoint = PrivateEndpoint.fromEndpointId(stack, 'ImportedEndpoint', endpointId);

      expect(endpoint.privateEndpointId).toBe(endpointId);
      expect(endpoint.privateEndpointName).toBe('pe-storage-01');
    });

    it('should extract name from resource ID', () => {
      const endpointId =
        '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/privateEndpoints/my-endpoint';

      const endpoint = PrivateEndpoint.fromEndpointId(stack, 'ImportedEndpoint', endpointId);

      expect(endpoint.privateEndpointName).toBe('my-endpoint');
    });
  });

  describe('addDnsZoneGroup', () => {
    it('should add DNS zone group with IPrivateDnsZone', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      // This should not throw
      endpoint.addDnsZoneGroup(mockDnsZone);
    });

    it('should add DNS zone group with zone ID string', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      const dnsZoneId =
        '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net';

      // This should not throw
      endpoint.addDnsZoneGroup(dnsZoneId);
    });

    it('should add DNS zone group with custom group name', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      // This should not throw
      endpoint.addDnsZoneGroup(mockDnsZone, 'custom-group');
    });

    it('should add DNS zone group with custom config name', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      // This should not throw
      endpoint.addDnsZoneGroup(mockDnsZone, 'default', 'custom-config');
    });
  });

  describe('resource properties', () => {
    it('should expose privateEndpointName property', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        privateEndpointName: 'pe-storage-01',
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      expect(endpoint.privateEndpointName).toBe('pe-storage-01');
    });

    it('should expose location property', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        location: 'westus',
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      expect(endpoint.location).toBe('westus');
    });

    it('should expose privateEndpointId property', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      expect(endpoint.privateEndpointId).toBeDefined();
      expect(endpoint.privateEndpointId).toContain('/privateEndpoints/');
    });

    it('should expose subnetId property', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      expect(endpoint.subnetId).toBe(mockSubnet.subnetId);
    });
  });

  describe('integration scenarios', () => {
    it('should create endpoint for Storage Account blob', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageBlobEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
        privateDnsZoneId: mockDnsZone,
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create endpoint for Storage Account file', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageFileEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['file'],
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create endpoint for Key Vault', () => {
      const keyVaultId =
        '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.KeyVault/vaults/mykv';

      const endpoint = new PrivateEndpoint(stack, 'KeyVaultEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: keyVaultId,
        groupIds: ['vault'],
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create endpoint for Cosmos DB SQL', () => {
      const cosmosDbId =
        '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/mycosmosdb';

      const endpoint = new PrivateEndpoint(stack, 'CosmosDbEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: cosmosDbId,
        groupIds: ['Sql'],
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create endpoint for SQL Server', () => {
      const sqlServerId =
        '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Sql/servers/mysqlserver';

      const endpoint = new PrivateEndpoint(stack, 'SqlServerEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: sqlServerId,
        groupIds: ['sqlServer'],
      });

      expect(endpoint.privateEndpointId).toBeDefined();
    });

    it('should create multiple endpoints for same resource with different group IDs', () => {
      const endpoint1 = new PrivateEndpoint(stack, 'StorageBlobEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
      });

      const endpoint2 = new PrivateEndpoint(stack, 'StorageFileEndpoint', {
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['file'],
      });

      expect(endpoint1.privateEndpointId).toBeDefined();
      expect(endpoint2.privateEndpointId).toBeDefined();
      expect(endpoint1.privateEndpointId).not.toBe(endpoint2.privateEndpointId);
    });

    it('should create endpoint with full configuration', () => {
      const endpoint = new PrivateEndpoint(stack, 'StorageEndpoint', {
        privateEndpointName: 'pe-storage-blob-prod-01',
        location: 'eastus',
        subnet: mockSubnet,
        privateLinkServiceId: mockStorageAccount,
        groupIds: ['blob'],
        connectionName: 'storage-blob-connection',
        customNetworkInterfaceName: 'nic-pe-storage-blob-01',
        privateDnsZoneId: mockDnsZone,
        dnsZoneGroupName: 'storage-dns-group',
        tags: {
          Environment: 'Production',
          CostCenter: '12345',
          Application: 'ColorAI',
        },
      });

      expect(endpoint.privateEndpointName).toBe('pe-storage-blob-prod-01');
      expect(endpoint.location).toBe('eastus');
      expect(endpoint.privateEndpointId).toBeDefined();
    });
  });
});
