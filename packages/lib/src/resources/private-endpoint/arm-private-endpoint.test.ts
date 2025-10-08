import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmPrivateEndpoint } from './arm-private-endpoint';
import type { ArmPrivateEndpointProps } from './types';

describe('resources/private-endpoint/ArmPrivateEndpoint', () => {
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
    it('should create private endpoint with required properties', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-storage-blob-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
            groupIds: ['blob'],
          },
        ],
      });

      expect(endpoint.privateEndpointName).toBe('pe-storage-blob-01');
      expect(endpoint.name).toBe('pe-storage-blob-01');
      expect(endpoint.location).toBe('eastus');
      expect(endpoint.subnet.id).toContain('subnets/snet-pe');
      expect(endpoint.privateLinkServiceConnections).toHaveLength(1);
      expect(endpoint.privateLinkServiceConnections[0].groupIds).toEqual(['blob']);
    });

    it('should create private endpoint with multiple group IDs', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-storage-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
            groupIds: ['blob', 'file', 'table'],
          },
        ],
      });

      expect(endpoint.privateLinkServiceConnections[0].groupIds).toEqual(['blob', 'file', 'table']);
    });

    it('should create private endpoint with custom network interface name', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-storage-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
            groupIds: ['blob'],
          },
        ],
        customNetworkInterfaceName: 'nic-pe-storage-01',
      });

      expect(endpoint.customNetworkInterfaceName).toBe('nic-pe-storage-01');
    });

    it('should create private endpoint with request message', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-keyvault-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'keyvault-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.KeyVault/vaults/mykv',
            groupIds: ['vault'],
            requestMessage: 'Please approve this connection',
          },
        ],
      });

      expect(endpoint.privateLinkServiceConnections[0].requestMessage).toBe(
        'Please approve this connection'
      );
    });

    it('should create private endpoint with DNS zone group', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-storage-blob-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
            groupIds: ['blob'],
          },
        ],
        privateDnsZoneGroup: {
          name: 'default',
          privateDnsZoneConfigs: [
            {
              name: 'blob-config',
              privateDnsZoneId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net',
            },
          ],
        },
      });

      expect(endpoint.privateDnsZoneGroup).toBeDefined();
      expect(endpoint.privateDnsZoneGroup?.name).toBe('default');
      expect(endpoint.privateDnsZoneGroup?.privateDnsZoneConfigs).toHaveLength(1);
      expect(endpoint.privateDnsZoneGroup?.privateDnsZoneConfigs[0].name).toBe('blob-config');
    });

    it('should create private endpoint with multiple DNS zone configs', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-storage-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
            groupIds: ['blob'],
          },
        ],
        privateDnsZoneGroup: {
          name: 'default',
          privateDnsZoneConfigs: [
            {
              name: 'blob-config',
              privateDnsZoneId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net',
            },
            {
              name: 'file-config',
              privateDnsZoneId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/privateDnsZones/privatelink.file.core.windows.net',
            },
          ],
        },
      });

      expect(endpoint.privateDnsZoneGroup?.privateDnsZoneConfigs).toHaveLength(2);
    });

    it('should create private endpoint with tags', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-storage-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
            groupIds: ['blob'],
          },
        ],
        tags: {
          Environment: 'Production',
          CostCenter: '12345',
        },
      });

      expect(endpoint.tags).toEqual({
        Environment: 'Production',
        CostCenter: '12345',
      });
    });

    it('should set correct resource type', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-test',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'test-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/test',
            groupIds: ['blob'],
          },
        ],
      });

      expect(endpoint.resourceType).toBe('Microsoft.Network/privateEndpoints');
    });

    it('should set correct API version', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-test',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'test-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/test',
            groupIds: ['blob'],
          },
        ],
      });

      expect(endpoint.apiVersion).toBe('2023-11-01');
    });

    it('should generate resource ID', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-storage-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
            groupIds: ['blob'],
          },
        ],
      });

      expect(endpoint.resourceId).toContain('/privateEndpoints/pe-storage-01');
      expect(endpoint.privateEndpointId).toBe(endpoint.resourceId);
    });

    it('should have ResourceGroup deployment scope', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-test',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'test-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/test',
            groupIds: ['blob'],
          },
        ],
      });

      expect(endpoint.scope).toBe('resourceGroup');
    });
  });

  describe('validation', () => {
    it('should throw error if privateEndpointName is empty', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: '',
          location: 'eastus',
          subnet: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
          },
          privateLinkServiceConnections: [
            {
              name: 'storage-connection',
              privateLinkServiceId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
              groupIds: ['blob'],
            },
          ],
        });
      }).toThrow('Private endpoint name cannot be empty');
    });

    it('should throw error if privateEndpointName exceeds 80 characters', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: 'a'.repeat(81),
          location: 'eastus',
          subnet: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
          },
          privateLinkServiceConnections: [
            {
              name: 'storage-connection',
              privateLinkServiceId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
              groupIds: ['blob'],
            },
          ],
        });
      }).toThrow('Private endpoint name must be 1-80 characters');
    });

    it('should throw error if privateEndpointName has invalid pattern', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: '-invalid-name',
          location: 'eastus',
          subnet: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
          },
          privateLinkServiceConnections: [
            {
              name: 'storage-connection',
              privateLinkServiceId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
              groupIds: ['blob'],
            },
          ],
        });
      }).toThrow('Invalid private endpoint name');
    });

    it('should accept valid privateEndpointName with underscores and periods', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe_storage.blob_01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
            groupIds: ['blob'],
          },
        ],
      });

      expect(endpoint.privateEndpointName).toBe('pe_storage.blob_01');
    });

    it('should throw error if location is empty', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: 'pe-storage-01',
          location: '',
          subnet: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
          },
          privateLinkServiceConnections: [
            {
              name: 'storage-connection',
              privateLinkServiceId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
              groupIds: ['blob'],
            },
          ],
        });
      }).toThrow('Location cannot be empty');
    });

    it('should throw error if subnet ID is empty', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: 'pe-storage-01',
          location: 'eastus',
          subnet: {
            id: '',
          },
          privateLinkServiceConnections: [
            {
              name: 'storage-connection',
              privateLinkServiceId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
              groupIds: ['blob'],
            },
          ],
        });
      }).toThrow('Subnet must be provided with a valid ID');
    });

    it('should throw error if privateLinkServiceConnections is empty', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: 'pe-storage-01',
          location: 'eastus',
          subnet: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
          },
          privateLinkServiceConnections: [],
        });
      }).toThrow('At least one private link service connection must be provided');
    });

    it('should throw error if connection name is empty', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: 'pe-storage-01',
          location: 'eastus',
          subnet: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
          },
          privateLinkServiceConnections: [
            {
              name: '',
              privateLinkServiceId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
              groupIds: ['blob'],
            },
          ],
        });
      }).toThrow('Private link service connection at index 0 must have a name');
    });

    it('should throw error if privateLinkServiceId is empty', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: 'pe-storage-01',
          location: 'eastus',
          subnet: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
          },
          privateLinkServiceConnections: [
            {
              name: 'storage-connection',
              privateLinkServiceId: '',
              groupIds: ['blob'],
            },
          ],
        });
      }).toThrow(
        "Private link service connection 'storage-connection' must have a privateLinkServiceId"
      );
    });

    it('should throw error if groupIds is empty', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: 'pe-storage-01',
          location: 'eastus',
          subnet: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
          },
          privateLinkServiceConnections: [
            {
              name: 'storage-connection',
              privateLinkServiceId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
              groupIds: [],
            },
          ],
        });
      }).toThrow(
        "Private link service connection 'storage-connection' must have at least one groupId"
      );
    });

    it('should throw error if DNS zone group name is empty', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: 'pe-storage-01',
          location: 'eastus',
          subnet: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
          },
          privateLinkServiceConnections: [
            {
              name: 'storage-connection',
              privateLinkServiceId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
              groupIds: ['blob'],
            },
          ],
          privateDnsZoneGroup: {
            name: '',
            privateDnsZoneConfigs: [
              {
                name: 'blob-config',
                privateDnsZoneId:
                  '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net',
              },
            ],
          },
        });
      }).toThrow('Private DNS zone group must have a name');
    });

    it('should throw error if DNS zone configs is empty', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: 'pe-storage-01',
          location: 'eastus',
          subnet: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
          },
          privateLinkServiceConnections: [
            {
              name: 'storage-connection',
              privateLinkServiceId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
              groupIds: ['blob'],
            },
          ],
          privateDnsZoneGroup: {
            name: 'default',
            privateDnsZoneConfigs: [],
          },
        });
      }).toThrow('Private DNS zone group must have at least one configuration');
    });

    it('should throw error if DNS zone config name is empty', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: 'pe-storage-01',
          location: 'eastus',
          subnet: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
          },
          privateLinkServiceConnections: [
            {
              name: 'storage-connection',
              privateLinkServiceId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
              groupIds: ['blob'],
            },
          ],
          privateDnsZoneGroup: {
            name: 'default',
            privateDnsZoneConfigs: [
              {
                name: '',
                privateDnsZoneId:
                  '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net',
              },
            ],
          },
        });
      }).toThrow('Private DNS zone config at index 0 must have a name');
    });

    it('should throw error if DNS zone ID is empty', () => {
      expect(() => {
        new ArmPrivateEndpoint(stack, 'Endpoint', {
          privateEndpointName: 'pe-storage-01',
          location: 'eastus',
          subnet: {
            id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
          },
          privateLinkServiceConnections: [
            {
              name: 'storage-connection',
              privateLinkServiceId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
              groupIds: ['blob'],
            },
          ],
          privateDnsZoneGroup: {
            name: 'default',
            privateDnsZoneConfigs: [
              {
                name: 'blob-config',
                privateDnsZoneId: '',
              },
            ],
          },
        });
      }).toThrow("Private DNS zone config 'blob-config' must have a privateDnsZoneId");
    });
  });

  describe('toArmTemplate', () => {
    it('should generate valid ARM template', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-storage-blob-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
            groupIds: ['blob'],
          },
        ],
      });

      const template = endpoint.toArmTemplate();

      expect(template).toMatchObject({
        type: 'Microsoft.Network/privateEndpoints',
        apiVersion: '2023-11-01',
        name: 'pe-storage-blob-01',
        location: 'eastus',
        properties: {
          subnet: {
            id: expect.stringContaining('subnets/snet-pe'),
          },
          privateLinkServiceConnections: [
            {
              name: 'storage-connection',
              properties: {
                privateLinkServiceId: expect.stringContaining('storageAccounts/mystg'),
                groupIds: ['blob'],
              },
            },
          ],
        },
      });
    });

    it('should include custom network interface name in template', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-storage-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
            groupIds: ['blob'],
          },
        ],
        customNetworkInterfaceName: 'nic-pe-storage-01',
      });

      const template: any = endpoint.toArmTemplate();

      expect(template.properties.customNetworkInterfaceName).toBe('nic-pe-storage-01');
    });

    it('should include tags in template', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-storage-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
            groupIds: ['blob'],
          },
        ],
        tags: {
          Environment: 'Production',
        },
      });

      const template: any = endpoint.toArmTemplate();

      expect(template.tags).toEqual({
        Environment: 'Production',
      });
    });

    it('should include DNS zone group as sub-resource', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-storage-blob-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'storage-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/mystg',
            groupIds: ['blob'],
          },
        ],
        privateDnsZoneGroup: {
          name: 'default',
          privateDnsZoneConfigs: [
            {
              name: 'blob-config',
              privateDnsZoneId:
                '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net',
            },
          ],
        },
      });

      const template: any = endpoint.toArmTemplate();

      expect(template.resources).toBeDefined();
      expect(template.resources).toHaveLength(1);
      expect(template.resources[0]).toMatchObject({
        type: 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups',
        apiVersion: '2023-11-01',
        name: 'pe-storage-blob-01/default',
        properties: {
          privateDnsZoneConfigs: [
            {
              name: 'blob-config',
              properties: {
                privateDnsZoneId: expect.stringContaining('privatelink.blob.core.windows.net'),
              },
            },
          ],
        },
        dependsOn: expect.arrayContaining([expect.stringContaining('pe-storage-blob-01')]),
      });
    });

    it('should include request message in connection if provided', () => {
      const endpoint = new ArmPrivateEndpoint(stack, 'Endpoint', {
        privateEndpointName: 'pe-keyvault-01',
        location: 'eastus',
        subnet: {
          id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/snet-pe',
        },
        privateLinkServiceConnections: [
          {
            name: 'keyvault-connection',
            privateLinkServiceId:
              '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.KeyVault/vaults/mykv',
            groupIds: ['vault'],
            requestMessage: 'Please approve this connection',
          },
        ],
      });

      const template: any = endpoint.toArmTemplate();

      expect(template.properties.privateLinkServiceConnections[0].properties.requestMessage).toBe(
        'Please approve this connection'
      );
    });
  });
});
