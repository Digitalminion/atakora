import { describe, it, expect, beforeEach } from 'vitest';
import { Construct } from '../../core/construct';
import { VirtualNetworkLink } from './virtual-network-link';
import type { IVirtualNetwork } from '../virtual-network/types';

describe('VirtualNetworkLink', () => {
  let mockScope: Construct;

  beforeEach(() => {
    mockScope = new Construct(null as any, `TestScope-${Math.random()}`);
  });

  const mockVirtualNetwork: IVirtualNetwork = {
    vnetName: 'test-vnet',
    vnetId:
      '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
    location: 'eastus',
    addressSpace: ['10.0.0.0/16'],
  };

  describe('constructor', () => {
    it('should create link with string virtual network ID', () => {
      const link = new VirtualNetworkLink(mockScope, 'TestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        virtualNetwork:
          '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1',
      });

      expect(link.linkName).toBeDefined();
      expect(link.location).toBe('global');
      expect(link.virtualNetworkId).toBe(
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1'
      );
      expect(link.registrationEnabled).toBe(false);
    });

    it('should create link with IVirtualNetwork reference', () => {
      const link = new VirtualNetworkLink(mockScope, 'TestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        virtualNetwork: mockVirtualNetwork,
      });

      expect(link.virtualNetworkId).toBe(mockVirtualNetwork.vnetId);
    });

    it('should use provided link name', () => {
      const link = new VirtualNetworkLink(mockScope, 'TestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        linkName: 'my-custom-link',
        virtualNetwork: mockVirtualNetwork,
      });

      expect(link.linkName).toBe('my-custom-link');
    });

    it('should auto-generate link name from ID', () => {
      const link = new VirtualNetworkLink(mockScope, 'MyTestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        virtualNetwork: mockVirtualNetwork,
      });

      expect(link.linkName).toBe('mytestlink');
    });

    it('should handle special characters in auto-generated name', () => {
      const link = new VirtualNetworkLink(mockScope, 'My_Test-Link-123', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        virtualNetwork: mockVirtualNetwork,
      });

      expect(link.linkName).toBe('my-test-link-123');
    });

    it('should enable registration when specified', () => {
      const link = new VirtualNetworkLink(mockScope, 'TestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        virtualNetwork: mockVirtualNetwork,
        registrationEnabled: true,
      });

      expect(link.registrationEnabled).toBe(true);
    });

    it('should expose resource IDs correctly', () => {
      const link = new VirtualNetworkLink(mockScope, 'TestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        linkName: 'my-link',
        virtualNetwork: mockVirtualNetwork,
      });

      expect(link.resourceId).toContain('virtualNetworkLinks/my-link');
      expect(link.linkId).toBe(link.resourceId);
    });
  });

  describe('name generation', () => {
    it('should prepend link- if name starts with invalid character', () => {
      const link = new VirtualNetworkLink(mockScope, '-invalid', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        virtualNetwork: mockVirtualNetwork,
      });

      expect(link.linkName).toMatch(/^[a-z0-9]/);
    });

    it('should truncate names longer than 80 characters', () => {
      const longId = 'a'.repeat(100);
      const link = new VirtualNetworkLink(mockScope, longId, {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        virtualNetwork: mockVirtualNetwork,
      });

      expect(link.linkName.length).toBeLessThanOrEqual(80);
    });

    it('should remove consecutive hyphens', () => {
      const link = new VirtualNetworkLink(mockScope, 'test---link', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        virtualNetwork: mockVirtualNetwork,
      });

      expect(link.linkName).not.toContain('---');
    });
  });

  describe('location validation', () => {
    it('should accept location=global', () => {
      const link = new VirtualNetworkLink(mockScope, 'TestLink', {
        privateDnsZoneName: 'privatelink.blob.core.windows.net',
        location: 'global',
        virtualNetwork: mockVirtualNetwork,
      });

      expect(link.location).toBe('global');
    });

    it('should throw error for non-global location', () => {
      expect(() => {
        new VirtualNetworkLink(mockScope, 'TestLink', {
          privateDnsZoneName: 'privatelink.blob.core.windows.net',
          location: 'eastus' as any,
          virtualNetwork: mockVirtualNetwork,
        });
      }).toThrow("Virtual network link location must be 'global'");
    });
  });

  describe('fromLinkId', () => {
    it('should import existing link by resource ID', () => {
      const linkId =
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/privateDnsZones/privatelink.blob.core.windows.net/virtualNetworkLinks/my-link';
      const imported = VirtualNetworkLink.fromLinkId(mockScope, 'ImportedLink', linkId);

      expect(imported.linkId).toBe(linkId);
      expect(imported.resourceId).toBe(linkId);
      expect(imported.linkName).toBe('my-link');
      expect(imported.location).toBe('global');
    });

    it('should throw error for invalid resource ID format', () => {
      expect(() => {
        VirtualNetworkLink.fromLinkId(mockScope, 'ImportedLink', 'invalid-id');
      }).toThrow('Invalid virtual network link resource ID');
    });
  });
});
