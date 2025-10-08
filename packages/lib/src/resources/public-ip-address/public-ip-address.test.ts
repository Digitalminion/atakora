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
import { PublicIpAddress } from './public-ip-address';
import { PublicIPAddressSku, PublicIPAllocationMethod, IpVersion } from './types';

describe('resources/public-ip-address/PublicIpAddress', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-products'),
      project: new Project('colorai'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
      tags: {
        managed_by: 'terraform',
      },
    });
    resourceGroup = new ResourceGroup(stack, 'NetworkRG');
  });

  describe('constructor', () => {
    it('should create public IP address with auto-generated name', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      // Should auto-generate name with pip prefix
      expect(publicIp.publicIpAddressName).toMatch(/^pip-/);
      expect(publicIp.publicIpAddressName).toContain('dp-colorai');
    });

    it('should use provided public IP address name when specified', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        publicIpAddressName: 'pip-custom-name',
      });

      expect(publicIp.publicIpAddressName).toBe('pip-custom-name');
    });

    it('should default location to resource group location', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      expect(publicIp.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        location: 'westus2',
      });

      expect(publicIp.location).toBe('westus2');
    });

    it('should set resource group name from parent', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      expect(publicIp.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should merge tags with parent', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        tags: {
          purpose: 'frontend',
        },
      });

      expect(publicIp.tags).toMatchObject({
        managed_by: 'terraform',
        purpose: 'frontend',
      });
    });

    it('should default SKU to Standard', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      expect(publicIp.sku).toBe('Standard');
    });

    it('should use provided SKU when specified', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        sku: PublicIPAddressSku.BASIC,
      });

      expect(publicIp.sku).toBe('Basic');
    });

    it('should default allocation method to Static', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      expect(publicIp.publicIPAllocationMethod).toBe('Static');
    });

    it('should use provided allocation method when specified', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        sku: PublicIPAddressSku.BASIC,
        publicIPAllocationMethod: PublicIPAllocationMethod.DYNAMIC,
      });

      expect(publicIp.publicIPAllocationMethod).toBe('Dynamic');
    });

    it('should default IP version to IPv4', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      expect(publicIp.ipVersion).toBe('IPv4');
    });

    it('should use provided IP version when specified', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        ipVersion: IpVersion.IPV6,
      });

      expect(publicIp.ipVersion).toBe('IPv6');
    });

    it('should default idle timeout to 4 minutes', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      expect(publicIp.idleTimeoutInMinutes).toBe(4);
    });

    it('should use provided idle timeout when specified', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        idleTimeoutInMinutes: 15,
      });

      expect(publicIp.idleTimeoutInMinutes).toBe(15);
    });

    it('should generate resource ID', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      expect(publicIp.publicIpAddressId).toBeDefined();
      expect(publicIp.publicIpAddressId).toContain('/publicIPAddresses/');
    });
  });

  describe('auto-naming with different IDs', () => {
    it('should preserve hyphens in auto-generated names', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'app-public-ip');

      // Should contain hyphens (unlike storage accounts)
      expect(publicIp.publicIpAddressName).toContain('-');
    });

    it('should convert to lowercase', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      // Should be all lowercase
      expect(publicIp.publicIpAddressName).toBe(publicIp.publicIpAddressName.toLowerCase());
    });

    it('should generate unique names for different construct IDs', () => {
      const publicIp1 = new PublicIpAddress(resourceGroup, 'Frontend');
      const publicIp2 = new PublicIpAddress(resourceGroup, 'Backend');

      expect(publicIp1.publicIpAddressName).not.toBe(publicIp2.publicIpAddressName);
      expect(publicIp1.publicIpAddressName).toContain('frontend');
      expect(publicIp2.publicIpAddressName).toContain('backend');
    });
  });

  describe('defaults', () => {
    it('should use secure defaults: Standard SKU with Static allocation', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      expect(publicIp.sku).toBe('Standard');
      expect(publicIp.publicIPAllocationMethod).toBe('Static');
    });

    it('should default to IPv4', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      expect(publicIp.ipVersion).toBe('IPv4');
    });

    it('should default idle timeout to minimum (4 minutes)', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      expect(publicIp.idleTimeoutInMinutes).toBe(4);
    });

    it('should not set domain name label by default', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      expect(publicIp.domainNameLabel).toBeUndefined();
    });
  });

  describe('domain name label', () => {
    it('should set domain name label when provided', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        domainNameLabel: 'myapp',
      });

      expect(publicIp.domainNameLabel).toBe('myapp');
    });

    it('should create public IP with complex domain name label', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        domainNameLabel: 'my-app-123',
      });

      expect(publicIp.domainNameLabel).toBe('my-app-123');
    });

    it('should accept domain name label at minimum length (3 chars)', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        domainNameLabel: 'app',
      });

      expect(publicIp.domainNameLabel).toBe('app');
    });

    it('should accept domain name label at maximum length (63 chars)', () => {
      const label = 'a' + 'b'.repeat(61) + 'c';
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        domainNameLabel: label,
      });

      expect(publicIp.domainNameLabel).toBe(label);
    });
  });

  describe('SKU and allocation method combinations', () => {
    it('should create Standard SKU with Static allocation', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        sku: PublicIPAddressSku.STANDARD,
        publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
      });

      expect(publicIp.sku).toBe('Standard');
      expect(publicIp.publicIPAllocationMethod).toBe('Static');
    });

    it('should create Basic SKU with Static allocation', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        sku: PublicIPAddressSku.BASIC,
        publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
      });

      expect(publicIp.sku).toBe('Basic');
      expect(publicIp.publicIPAllocationMethod).toBe('Static');
    });

    it('should create Basic SKU with Dynamic allocation', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        sku: PublicIPAddressSku.BASIC,
        publicIPAllocationMethod: PublicIPAllocationMethod.DYNAMIC,
      });

      expect(publicIp.sku).toBe('Basic');
      expect(publicIp.publicIPAllocationMethod).toBe('Dynamic');
    });

    it('should throw error for Standard SKU with Dynamic allocation (validated by L1)', () => {
      expect(() => {
        new PublicIpAddress(resourceGroup, 'AppPublicIp', {
          sku: PublicIPAddressSku.STANDARD,
          publicIPAllocationMethod: PublicIPAllocationMethod.DYNAMIC,
        });
      }).toThrow(/Standard SKU requires Static allocation method/);
    });
  });

  describe('idle timeout', () => {
    it('should accept idle timeout at minimum (4 minutes)', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        idleTimeoutInMinutes: 4,
      });

      expect(publicIp.idleTimeoutInMinutes).toBe(4);
    });

    it('should accept idle timeout at maximum (30 minutes)', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        idleTimeoutInMinutes: 30,
      });

      expect(publicIp.idleTimeoutInMinutes).toBe(30);
    });

    it('should accept idle timeout in middle of range', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        idleTimeoutInMinutes: 15,
      });

      expect(publicIp.idleTimeoutInMinutes).toBe(15);
    });

    it('should throw error for idle timeout below minimum (validated by L1)', () => {
      expect(() => {
        new PublicIpAddress(resourceGroup, 'AppPublicIp', {
          idleTimeoutInMinutes: 3,
        });
      }).toThrow(/Idle timeout must be between 4 and 30 minutes/);
    });

    it('should throw error for idle timeout above maximum (validated by L1)', () => {
      expect(() => {
        new PublicIpAddress(resourceGroup, 'AppPublicIp', {
          idleTimeoutInMinutes: 31,
        });
      }).toThrow(/Idle timeout must be between 4 and 30 minutes/);
    });
  });

  describe('IP versions', () => {
    it('should create IPv4 public IP address', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        ipVersion: IpVersion.IPV4,
      });

      expect(publicIp.ipVersion).toBe('IPv4');
    });

    it('should create IPv6 public IP address', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        ipVersion: IpVersion.IPV6,
      });

      expect(publicIp.ipVersion).toBe('IPv6');
    });
  });

  describe('custom properties', () => {
    it('should create public IP with all custom properties', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        publicIpAddressName: 'pip-custom',
        location: 'westus2',
        sku: PublicIPAddressSku.BASIC,
        publicIPAllocationMethod: PublicIPAllocationMethod.DYNAMIC,
        ipVersion: IpVersion.IPV6,
        domainNameLabel: 'customapp',
        idleTimeoutInMinutes: 20,
        tags: {
          purpose: 'testing',
        },
      });

      expect(publicIp.publicIpAddressName).toBe('pip-custom');
      expect(publicIp.location).toBe('westus2');
      expect(publicIp.sku).toBe('Basic');
      expect(publicIp.publicIPAllocationMethod).toBe('Dynamic');
      expect(publicIp.ipVersion).toBe('IPv6');
      expect(publicIp.domainNameLabel).toBe('customapp');
      expect(publicIp.idleTimeoutInMinutes).toBe(20);
      expect(publicIp.tags).toMatchObject({
        managed_by: 'terraform',
        purpose: 'testing',
      });
    });
  });

  describe('fromPublicIpId', () => {
    it('should create reference from valid resource ID', () => {
      const resourceId =
        '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/rg-network/providers/Microsoft.Network/publicIPAddresses/pip-app-001';

      const publicIp = PublicIpAddress.fromPublicIpId(resourceId);

      expect(publicIp.publicIpAddressName).toBe('pip-app-001');
      expect(publicIp.publicIpAddressId).toBe(resourceId);
    });

    it('should create reference from resource ID with different name', () => {
      const resourceId =
        '/subscriptions/12345/resourceGroups/rg-network/providers/Microsoft.Network/publicIPAddresses/my-custom-pip';

      const publicIp = PublicIpAddress.fromPublicIpId(resourceId);

      expect(publicIp.publicIpAddressName).toBe('my-custom-pip');
      expect(publicIp.publicIpAddressId).toBe(resourceId);
    });

    it('should throw error for invalid resource ID', () => {
      const invalidId =
        '/subscriptions/12345/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-001';

      expect(() => {
        PublicIpAddress.fromPublicIpId(invalidId);
      }).toThrow(/Invalid public IP address ID/);
    });

    it('should throw error for malformed resource ID', () => {
      const malformedId = 'not-a-valid-resource-id';

      expect(() => {
        PublicIpAddress.fromPublicIpId(malformedId);
      }).toThrow(/Invalid public IP address ID/);
    });
  });

  describe('error handling', () => {
    it('should throw error when not created within ResourceGroup', () => {
      expect(() => {
        new PublicIpAddress(stack, 'AppPublicIp');
      }).toThrow(/must be created within or under a ResourceGroup/);
    });

    it('should throw error for invalid name (validated by L1)', () => {
      expect(() => {
        new PublicIpAddress(resourceGroup, 'AppPublicIp', {
          publicIpAddressName: '-invalid-name',
        });
      }).toThrow(/must start with alphanumeric/);
    });

    it('should throw error for invalid domain name label (validated by L1)', () => {
      expect(() => {
        new PublicIpAddress(resourceGroup, 'AppPublicIp', {
          domainNameLabel: 'ab', // Too short
        });
      }).toThrow(/Domain name label must be 3-63 characters/);
    });
  });

  describe('tags inheritance', () => {
    it('should inherit tags from parent stack', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp');

      expect(publicIp.tags).toMatchObject({
        managed_by: 'terraform',
      });
    });

    it('should override parent tags with provided tags', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        tags: {
          managed_by: 'custom',
          environment: 'production',
        },
      });

      expect(publicIp.tags).toMatchObject({
        managed_by: 'custom',
        environment: 'production',
      });
    });

    it('should merge parent and provided tags', () => {
      const publicIp = new PublicIpAddress(resourceGroup, 'AppPublicIp', {
        tags: {
          purpose: 'frontend',
        },
      });

      expect(publicIp.tags).toMatchObject({
        managed_by: 'terraform',
        purpose: 'frontend',
      });
    });
  });
});
