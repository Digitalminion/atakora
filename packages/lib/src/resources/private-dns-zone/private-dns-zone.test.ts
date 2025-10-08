import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { ResourceGroup } from '../resource-group/resource-group';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { PrivateDnsZone } from './private-dns-zone';

describe('resources/private-dns-zone/PrivateDnsZone', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-minion'),
      project: new Project('authr'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
      tags: {
        managed_by: 'terraform',
      },
    });
    resourceGroup = new ResourceGroup(stack, 'NetworkRG');
  });

  describe('constructor', () => {
    it('should create Private DNS zone with explicit zone name', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
      });

      expect(zone.zoneName).toBe('privatelink.blob.core.windows.net');
      expect(zone.location).toBe('global');
    });

    it('should default location to global', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'VaultDnsZone', {
        zoneName: 'privatelink.vaultcore.azure.net',
      });

      expect(zone.location).toBe('global');
    });

    it('should accept explicit global location', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
        location: 'global',
      });

      expect(zone.location).toBe('global');
    });

    it('should set resource group name from parent', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
      });

      expect(zone.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should merge tags with parent', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
        tags: {
          purpose: 'blob-storage-connectivity',
        },
      });

      expect(zone.tags).toMatchObject({
        managed_by: 'terraform',
        purpose: 'blob-storage-connectivity',
      });
    });

    it('should generate resource ID', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
      });

      expect(zone.zoneId).toBeDefined();
      expect(zone.zoneId).toContain('/privateDnsZones/');
    });
  });

  describe('zone name requirements', () => {
    it('should require zone name to be provided', () => {
      expect(() => {
        new PrivateDnsZone(resourceGroup, 'Zone', {
          zoneName: undefined as any,
        });
      }).toThrow();
    });

    it('should accept blob storage zone', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'BlobZone', {
        zoneName: 'privatelink.blob.core.windows.net',
      });

      expect(zone.zoneName).toBe('privatelink.blob.core.windows.net');
    });

    it('should accept key vault zone', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'VaultZone', {
        zoneName: 'privatelink.vaultcore.azure.net',
      });

      expect(zone.zoneName).toBe('privatelink.vaultcore.azure.net');
    });

    it('should accept Cosmos DB zone', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'CosmosZone', {
        zoneName: 'privatelink.documents.azure.com',
      });

      expect(zone.zoneName).toBe('privatelink.documents.azure.com');
    });

    it('should accept custom zone names', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'CustomZone', {
        zoneName: 'my-app.private',
      });

      expect(zone.zoneName).toBe('my-app.private');
    });
  });

  describe('location validation', () => {
    it('should default location to global when not provided', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'Zone', {
        zoneName: 'privatelink.blob.core.windows.net',
      });

      expect(zone.location).toBe('global');
    });

    it('should accept explicit global location', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'Zone', {
        zoneName: 'privatelink.blob.core.windows.net',
        location: 'global',
      });

      expect(zone.location).toBe('global');
    });

    it('should throw error for non-global location', () => {
      expect(() => {
        new PrivateDnsZone(resourceGroup, 'Zone', {
          zoneName: 'privatelink.blob.core.windows.net',
          location: 'eastus' as any,
        });
      }).toThrow(/must be 'global'/);
    });
  });

  describe('parent validation', () => {
    it('should throw error when not created within ResourceGroup', () => {
      expect(() => {
        new PrivateDnsZone(stack, 'Zone', {
          zoneName: 'privatelink.blob.core.windows.net',
        });
      }).toThrow(/PrivateDnsZone must be created within or under a ResourceGroup/);
    });

    it('should work when created directly within ResourceGroup', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'Zone', {
        zoneName: 'privatelink.blob.core.windows.net',
      });

      expect(zone.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });
  });

  describe('integration with underlying L1', () => {
    it('should create L1 construct with correct properties', () => {
      const zone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
        tags: { purpose: 'testing' },
      });

      expect(zone.zoneName).toBe('privatelink.blob.core.windows.net');
      expect(zone.location).toBe('global');
      expect(zone.tags).toMatchObject({ purpose: 'testing' });
    });
  });

  describe('multiple zones', () => {
    it('should allow creating multiple zones for different services', () => {
      const blobZone = new PrivateDnsZone(resourceGroup, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
      });

      const vaultZone = new PrivateDnsZone(resourceGroup, 'VaultDnsZone', {
        zoneName: 'privatelink.vaultcore.azure.net',
      });

      const cosmosZone = new PrivateDnsZone(resourceGroup, 'CosmosDnsZone', {
        zoneName: 'privatelink.documents.azure.com',
      });

      // All should have different zone names
      expect(blobZone.zoneName).toBe('privatelink.blob.core.windows.net');
      expect(vaultZone.zoneName).toBe('privatelink.vaultcore.azure.net');
      expect(cosmosZone.zoneName).toBe('privatelink.documents.azure.com');

      // All should have global location
      expect(blobZone.location).toBe('global');
      expect(vaultZone.location).toBe('global');
      expect(cosmosZone.location).toBe('global');

      // All should reference the same resource group
      expect(blobZone.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(vaultZone.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(cosmosZone.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });
  });

  describe('common AuthR zone patterns', () => {
    it('should support all AuthR service zones', () => {
      const zones = [
        { id: 'BlobZone', name: 'privatelink.blob.core.windows.net' },
        { id: 'VaultZone', name: 'privatelink.vaultcore.azure.net' },
        { id: 'CosmosZone', name: 'privatelink.documents.azure.com' },
        { id: 'SearchZone', name: 'privatelink.search.windows.net' },
        { id: 'OpenAIZone', name: 'privatelink.openai.azure.com' },
      ];

      zones.forEach((zoneConfig) => {
        const zone = new PrivateDnsZone(resourceGroup, zoneConfig.id, {
          zoneName: zoneConfig.name,
        });

        expect(zone.zoneName).toBe(zoneConfig.name);
        expect(zone.location).toBe('global');
      });
    });
  });
});
