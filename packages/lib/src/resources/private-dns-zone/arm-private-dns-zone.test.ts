import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmPrivateDnsZone } from './arm-private-dns-zone';
import type { ArmPrivateDnsZoneProps } from './types';

describe('resources/private-dns-zone/ArmPrivateDnsZone', () => {
  let app: App;
  let stack: SubscriptionStack;

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
    it('should create Private DNS zone with required properties', () => {
      const zone = new ArmPrivateDnsZone(stack, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
        location: 'global',
      });

      expect(zone.zoneName).toBe('privatelink.blob.core.windows.net');
      expect(zone.name).toBe('privatelink.blob.core.windows.net');
      expect(zone.location).toBe('global');
      expect(zone.tags).toEqual({});
    });

    it('should create Private DNS zone with all properties', () => {
      const zone = new ArmPrivateDnsZone(stack, 'VaultDnsZone', {
        zoneName: 'privatelink.vaultcore.azure.net',
        location: 'global',
        tags: {
          purpose: 'key-vault-connectivity',
        },
      });

      expect(zone.zoneName).toBe('privatelink.vaultcore.azure.net');
      expect(zone.location).toBe('global');
      expect(zone.tags).toEqual({ purpose: 'key-vault-connectivity' });
    });

    it('should set correct resource type', () => {
      const zone = new ArmPrivateDnsZone(stack, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
        location: 'global',
      });

      expect(zone.resourceType).toBe('Microsoft.Network/privateDnsZones');
    });

    it('should set correct API version', () => {
      const zone = new ArmPrivateDnsZone(stack, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
        location: 'global',
      });

      expect(zone.apiVersion).toBe('2024-06-01');
    });

    it('should generate resource ID', () => {
      const zone = new ArmPrivateDnsZone(stack, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
        location: 'global',
      });

      expect(zone.resourceId).toContain('/privateDnsZones/privatelink.blob.core.windows.net');
      expect(zone.zoneId).toBe(zone.resourceId);
    });

    it('should have ResourceGroup deployment scope', () => {
      const zone = new ArmPrivateDnsZone(stack, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
        location: 'global',
      });

      expect(zone.scope).toBe('resourceGroup');
    });
  });

  describe('validation', () => {
    it('should throw error for empty zone name', () => {
      expect(() => {
        new ArmPrivateDnsZone(stack, 'Zone', {
          zoneName: '',
          location: 'global',
        });
      }).toThrow(/Private DNS zone name cannot be empty/);
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmPrivateDnsZone(stack, 'Zone', {
          zoneName: 'privatelink.blob.core.windows.net',
          location: '',
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error for regional location', () => {
      expect(() => {
        new ArmPrivateDnsZone(stack, 'Zone', {
          zoneName: 'privatelink.blob.core.windows.net',
          location: 'eastus',
        });
      }).toThrow(/must be 'global'/);
    });

    it('should throw error for non-global location', () => {
      expect(() => {
        new ArmPrivateDnsZone(stack, 'Zone', {
          zoneName: 'privatelink.blob.core.windows.net',
          location: 'westus',
        });
      }).toThrow(/must be 'global'/);
    });

    it('should accept global location (lowercase)', () => {
      const zone = new ArmPrivateDnsZone(stack, 'Zone', {
        zoneName: 'privatelink.blob.core.windows.net',
        location: 'global',
      });

      expect(zone.location).toBe('global');
    });

    it('should accept global location (uppercase)', () => {
      const zone = new ArmPrivateDnsZone(stack, 'Zone', {
        zoneName: 'privatelink.blob.core.windows.net',
        location: 'GLOBAL',
      });

      expect(zone.location).toBe('GLOBAL');
    });

    it('should accept various privatelink zone names', () => {
      const validZoneNames = [
        'privatelink.blob.core.windows.net',
        'privatelink.vaultcore.azure.net',
        'privatelink.documents.azure.com',
        'privatelink.search.windows.net',
        'privatelink.openai.azure.com',
        'privatelink.azurecr.io',
        'privatelink.database.windows.net',
      ];

      validZoneNames.forEach((zoneName) => {
        const zone = new ArmPrivateDnsZone(stack, `Zone-${zoneName}`, {
          zoneName,
          location: 'global',
        });

        expect(zone.zoneName).toBe(zoneName);
      });
    });

    it('should accept custom private zone names', () => {
      const zone = new ArmPrivateDnsZone(stack, 'CustomZone', {
        zoneName: 'my-custom-zone.local',
        location: 'global',
      });

      expect(zone.zoneName).toBe('my-custom-zone.local');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with minimal properties', () => {
      const zone = new ArmPrivateDnsZone(stack, 'BlobDnsZone', {
        zoneName: 'privatelink.blob.core.windows.net',
        location: 'global',
      });

      const template: any = zone.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Network/privateDnsZones',
        apiVersion: '2024-06-01',
        name: 'privatelink.blob.core.windows.net',
        location: 'global',
        properties: {},
        tags: undefined,
      });
    });

    it('should generate ARM template with tags', () => {
      const zone = new ArmPrivateDnsZone(stack, 'VaultDnsZone', {
        zoneName: 'privatelink.vaultcore.azure.net',
        location: 'global',
        tags: {
          purpose: 'key-vault',
          environment: 'prod',
        },
      });

      const template: any = zone.toArmTemplate();

      expect(template.tags).toEqual({
        purpose: 'key-vault',
        environment: 'prod',
      });
    });
  });

  describe('common zone patterns', () => {
    it('should support blob storage zone', () => {
      const zone = new ArmPrivateDnsZone(stack, 'BlobZone', {
        zoneName: 'privatelink.blob.core.windows.net',
        location: 'global',
      });

      expect(zone.zoneName).toBe('privatelink.blob.core.windows.net');
    });

    it('should support key vault zone', () => {
      const zone = new ArmPrivateDnsZone(stack, 'VaultZone', {
        zoneName: 'privatelink.vaultcore.azure.net',
        location: 'global',
      });

      expect(zone.zoneName).toBe('privatelink.vaultcore.azure.net');
    });

    it('should support Cosmos DB zone', () => {
      const zone = new ArmPrivateDnsZone(stack, 'CosmosZone', {
        zoneName: 'privatelink.documents.azure.com',
        location: 'global',
      });

      expect(zone.zoneName).toBe('privatelink.documents.azure.com');
    });

    it('should support Azure Search zone', () => {
      const zone = new ArmPrivateDnsZone(stack, 'SearchZone', {
        zoneName: 'privatelink.search.windows.net',
        location: 'global',
      });

      expect(zone.zoneName).toBe('privatelink.search.windows.net');
    });

    it('should support OpenAI zone', () => {
      const zone = new ArmPrivateDnsZone(stack, 'OpenAIZone', {
        zoneName: 'privatelink.openai.azure.com',
        location: 'global',
      });

      expect(zone.zoneName).toBe('privatelink.openai.azure.com');
    });
  });
});
