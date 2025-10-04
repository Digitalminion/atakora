import { describe, it, expect, beforeEach } from 'vitest';
import { Construct } from '../../core/construct';
import { ArmVirtualNetworkLink } from './arm-virtual-network-link';

describe('ArmVirtualNetworkLink', () => {
  let mockScope: Construct;

  beforeEach(() => {
    mockScope = new Construct(null as any, `TestScope-${Math.random()}`);
  });

  describe('constructor', () => {
    it('should create a virtual network link with required properties', () => {
      const link = new ArmVirtualNetworkLink(mockScope, 'TestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        linkName: 'test-link',
        location: 'global',
        virtualNetworkId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
      });

      expect(link.privateDnsZoneName).toBe('privatelink.blob.core.windows.net');
      expect(link.linkName).toBe('test-link');
      expect(link.name).toBe('test-link');
      expect(link.location).toBe('global');
      expect(link.virtualNetworkId).toBe(
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1'
      );
      expect(link.registrationEnabled).toBe(false);
      expect(link.resourceType).toBe('Microsoft.Network/privateDnsZones/virtualNetworkLinks');
      expect(link.apiVersion).toBe('2024-06-01');
    });

    it('should create a virtual network link with registration enabled', () => {
      const link = new ArmVirtualNetworkLink(mockScope, 'TestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        linkName: 'test-link',
        location: 'global',
        virtualNetworkId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
        registrationEnabled: true,
      });

      expect(link.registrationEnabled).toBe(true);
    });

    it('should create resource ID correctly', () => {
      const link = new ArmVirtualNetworkLink(mockScope, 'TestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        linkName: 'my-link',
        location: 'global',
        virtualNetworkId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
      });

      expect(link.resourceId).toBe(
        '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net/virtualNetworkLinks/my-link'
      );
      expect(link.linkId).toBe(link.resourceId);
    });

    it('should handle tags correctly', () => {
      const tags = { Environment: 'Test', Owner: 'TeamA' };
      const link = new ArmVirtualNetworkLink(mockScope, 'TestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        linkName: 'test-link',
        location: 'global',
        virtualNetworkId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
        tags,
      });

      expect(link.tags).toEqual(tags);
    });
  });

  describe('validation', () => {
    it('should throw error for empty Private DNS zone name', () => {
      expect(() => {
        new ArmVirtualNetworkLink(mockScope, 'TestLink', {
          privateDnsZoneName: '',
          linkName: 'test-link',
          location: 'global',
          virtualNetworkId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
        });
      }).toThrow('Private DNS zone name cannot be empty');
    });

    it('should throw error for empty link name', () => {
      expect(() => {
        new ArmVirtualNetworkLink(mockScope, 'TestLink', {
          privateDnsZoneName: 'privatelink.blob.core.windows.net',
          linkName: '',
          location: 'global',
          virtualNetworkId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
        });
      }).toThrow('Virtual network link name cannot be empty');
    });

    it('should throw error for invalid link name pattern', () => {
      expect(() => {
        new ArmVirtualNetworkLink(mockScope, 'TestLink', {
          privateDnsZoneName: 'privatelink.blob.core.windows.net',
          linkName: '-invalid-name',
          location: 'global',
          virtualNetworkId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
        });
      }).toThrow('Virtual network link name must match pattern');
    });

    it('should throw error for non-global location', () => {
      expect(() => {
        new ArmVirtualNetworkLink(mockScope, 'TestLink', {
          privateDnsZoneName: 'privatelink.blob.core.windows.net',
          linkName: 'test-link',
          location: 'eastus',
          virtualNetworkId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
        });
      }).toThrow("Virtual network link location must be 'global'");
    });

    it('should throw error for empty virtual network ID', () => {
      expect(() => {
        new ArmVirtualNetworkLink(mockScope, 'TestLink', {
          privateDnsZoneName: 'privatelink.blob.core.windows.net',
          linkName: 'test-link',
          location: 'global',
          virtualNetworkId: '',
        });
      }).toThrow('Virtual network ID cannot be empty');
    });

    it('should throw error for invalid virtual network ID format', () => {
      expect(() => {
        new ArmVirtualNetworkLink(mockScope, 'TestLink', {
          privateDnsZoneName: 'privatelink.blob.core.windows.net',
          linkName: 'test-link',
          location: 'global',
          virtualNetworkId: 'not-a-valid-resource-id',
        });
      }).toThrow("Virtual network ID must be a valid resource ID containing '/virtualNetworks/'");
    });
  });

  describe('toArmTemplate', () => {
    it('should generate correct ARM template', () => {
      const link = new ArmVirtualNetworkLink(mockScope, 'TestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        linkName: 'test-link',
        location: 'global',
        virtualNetworkId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
        registrationEnabled: false,
        tags: { Environment: 'Test' },
      });

      const template = link.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Network/privateDnsZones/virtualNetworkLinks',
        apiVersion: '2024-06-01',
        name: 'privatelink.blob.core.windows.net/test-link',
        location: 'global',
        properties: {
          virtualNetwork: {
            id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
          },
          registrationEnabled: false,
        },
        tags: { Environment: 'Test' },
      });
    });

    it('should omit tags if empty', () => {
      const link = new ArmVirtualNetworkLink(mockScope, 'TestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        linkName: 'test-link',
        location: 'global',
        virtualNetworkId: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
      });

      const template = link.toArmTemplate();

      expect(template.tags).toBeUndefined();
    });
  });
});
