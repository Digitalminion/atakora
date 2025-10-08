import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmPublicIpAddress } from './arm-public-ip-address';
import { PublicIPAddressSku, PublicIPAllocationMethod, IpVersion } from './types';
import type { ArmPublicIpAddressProps } from './types';

describe('resources/public-ip-address/ArmPublicIpAddress', () => {
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
    it('should create public IP address with required properties', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-test-001',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
        },
      });

      expect(publicIp.publicIpAddressName).toBe('pip-test-001');
      expect(publicIp.name).toBe('pip-test-001');
      expect(publicIp.location).toBe('eastus');
      expect(publicIp.sku.name).toBe('Standard');
      expect(publicIp.publicIPAllocationMethod).toBe('Static');
      expect(publicIp.tags).toEqual({});
    });

    it('should create public IP address with all properties', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-test-002',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          ipVersion: IpVersion.IPV4,
          domainNameLabel: 'myapp',
          idleTimeoutInMinutes: 10,
        },
        tags: {
          environment: 'test',
        },
      });

      expect(publicIp.ipVersion).toBe('IPv4');
      expect(publicIp.domainNameLabel).toBe('myapp');
      expect(publicIp.idleTimeoutInMinutes).toBe(10);
      expect(publicIp.tags).toEqual({ environment: 'test' });
    });

    it('should set correct resource type', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-test-003',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
        },
      });

      expect(publicIp.resourceType).toBe('Microsoft.Network/publicIPAddresses');
    });

    it('should set correct API version', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-test-004',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
        },
      });

      expect(publicIp.apiVersion).toBe('2023-11-01');
    });

    it('should generate resource ID', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-test-005',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
        },
      });

      expect(publicIp.resourceId).toContain('/publicIPAddresses/pip-test-005');
      expect(publicIp.publicIpAddressId).toBe(publicIp.resourceId);
    });

    it('should have ResourceGroup deployment scope', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-test-006',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
        },
      });

      expect(publicIp.scope).toBe('resourceGroup');
    });
  });

  describe('validation - name', () => {
    it('should throw error for empty public IP address name', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: '',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          },
        });
      }).toThrow(/Public IP address name cannot be empty/);
    });

    it('should throw error for name longer than 80 characters', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'a'.repeat(81),
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          },
        });
      }).toThrow(/must be 1-80 characters/);
    });

    it('should accept name at exactly 1 character', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'a',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
        },
      });

      expect(publicIp.publicIpAddressName).toBe('a');
    });

    it('should accept name at exactly 80 characters', () => {
      const name = 'a' + 'b'.repeat(78) + 'c';
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: name,
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
        },
      });

      expect(publicIp.publicIpAddressName).toBe(name);
    });

    it('should throw error for name starting with hyphen', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: '-piptest',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          },
        });
      }).toThrow(/must start with alphanumeric/);
    });

    it('should throw error for name starting with period', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: '.piptest',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          },
        });
      }).toThrow(/must start with alphanumeric/);
    });

    it('should throw error for name ending with hyphen', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'piptest-',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          },
        });
      }).toThrow(/must start with alphanumeric, end with alphanumeric or underscore/);
    });

    it('should throw error for name ending with period', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'piptest.',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          },
        });
      }).toThrow(/must start with alphanumeric, end with alphanumeric or underscore/);
    });

    it('should accept valid names with alphanumeric, periods, underscores, and hyphens', () => {
      const validNames = [
        'pip-test-001',
        'pip.test.001',
        'pip_test_001',
        'PipTest001',
        'pip-test.001_final',
      ];

      validNames.forEach((name) => {
        const publicIp = new ArmPublicIpAddress(stack, `PublicIp-${name}`, {
          publicIpAddressName: name,
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          },
        });

        expect(publicIp.publicIpAddressName).toBe(name);
      });
    });
  });

  describe('validation - required properties', () => {
    it('should throw error for empty location', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'pip-test',
          location: '',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          },
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error when SKU is not provided', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'pip-test',
          location: 'eastus',
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          },
        } as any);
      }).toThrow(/SKU must be provided/);
    });

    it('should throw error when allocation method is not provided', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'pip-test',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
        } as any);
      }).toThrow(/Public IP allocation method must be provided/);
    });
  });

  describe('validation - SKU and allocation method combinations', () => {
    it('should throw error for Standard SKU with Dynamic allocation', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'pip-test',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.DYNAMIC,
          },
        });
      }).toThrow(/Standard SKU requires Static allocation method/);
    });

    it('should accept Standard SKU with Static allocation', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-standard-static',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
        },
      });

      expect(publicIp.sku.name).toBe('Standard');
      expect(publicIp.publicIPAllocationMethod).toBe('Static');
    });

    it('should accept Basic SKU with Static allocation', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-basic-static',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.BASIC },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
        },
      });

      expect(publicIp.sku.name).toBe('Basic');
      expect(publicIp.publicIPAllocationMethod).toBe('Static');
    });

    it('should accept Basic SKU with Dynamic allocation', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-basic-dynamic',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.BASIC },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.DYNAMIC,
        },
      });

      expect(publicIp.sku.name).toBe('Basic');
      expect(publicIp.publicIPAllocationMethod).toBe('Dynamic');
    });
  });

  describe('validation - idle timeout', () => {
    it('should throw error for idle timeout less than 4 minutes', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'pip-test',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
            idleTimeoutInMinutes: 3,
          },
        });
      }).toThrow(/Idle timeout must be between 4 and 30 minutes/);
    });

    it('should throw error for idle timeout greater than 30 minutes', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'pip-test',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
            idleTimeoutInMinutes: 31,
          },
        });
      }).toThrow(/Idle timeout must be between 4 and 30 minutes/);
    });

    it('should accept idle timeout at exactly 4 minutes', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-timeout-4',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          idleTimeoutInMinutes: 4,
        },
      });

      expect(publicIp.idleTimeoutInMinutes).toBe(4);
    });

    it('should accept idle timeout at exactly 30 minutes', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-timeout-30',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          idleTimeoutInMinutes: 30,
        },
      });

      expect(publicIp.idleTimeoutInMinutes).toBe(30);
    });

    it('should accept idle timeout between 4 and 30 minutes', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-timeout-15',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          idleTimeoutInMinutes: 15,
        },
      });

      expect(publicIp.idleTimeoutInMinutes).toBe(15);
    });
  });

  describe('validation - domain name label', () => {
    it('should throw error for domain name label shorter than 3 characters', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'pip-test',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
            domainNameLabel: 'ab',
          },
        });
      }).toThrow(/Domain name label must be 3-63 characters/);
    });

    it('should throw error for domain name label longer than 63 characters', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'pip-test',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
            domainNameLabel: 'a'.repeat(64),
          },
        });
      }).toThrow(/Domain name label must be 3-63 characters/);
    });

    it('should throw error for domain name label starting with number', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'pip-test',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
            domainNameLabel: '1myapp',
          },
        });
      }).toThrow(/Domain name label must start with a letter/);
    });

    it('should throw error for domain name label starting with hyphen', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'pip-test',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
            domainNameLabel: '-myapp',
          },
        });
      }).toThrow(/Domain name label must start with a letter/);
    });

    it('should throw error for domain name label ending with hyphen', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'pip-test',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
            domainNameLabel: 'myapp-',
          },
        });
      }).toThrow(/Domain name label must start with a letter, end with a letter or number/);
    });

    it('should throw error for domain name label with uppercase letters', () => {
      expect(() => {
        new ArmPublicIpAddress(stack, 'PublicIp', {
          publicIpAddressName: 'pip-test',
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
            domainNameLabel: 'MyApp',
          },
        });
      }).toThrow(/contain only lowercase letters, numbers, and hyphens/);
    });

    it('should accept valid domain name labels', () => {
      const validLabels = ['myapp', 'my-app', 'myapp123', 'my-app-123'];

      validLabels.forEach((label) => {
        const publicIp = new ArmPublicIpAddress(stack, `PublicIp-${label}`, {
          publicIpAddressName: `pip-${label}`,
          location: 'eastus',
          sku: { name: PublicIPAddressSku.STANDARD },
          properties: {
            publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
            domainNameLabel: label,
          },
        });

        expect(publicIp.domainNameLabel).toBe(label);
      });
    });
  });

  describe('IP version', () => {
    it('should support IPv4', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-ipv4',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          ipVersion: IpVersion.IPV4,
        },
      });

      expect(publicIp.ipVersion).toBe('IPv4');
    });

    it('should support IPv6', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-ipv6',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          ipVersion: IpVersion.IPV6,
        },
      });

      expect(publicIp.ipVersion).toBe('IPv6');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with minimal properties', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-minimal',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
        },
      });

      const template: any = publicIp.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Network/publicIPAddresses',
        apiVersion: '2023-11-01',
        name: 'pip-minimal',
        location: 'eastus',
        sku: {
          name: 'Standard',
        },
        properties: {
          publicIPAllocationMethod: 'Static',
        },
        tags: undefined,
      });
    });

    it('should generate ARM template with all properties', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-full',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          ipVersion: IpVersion.IPV4,
          domainNameLabel: 'myapp',
          idleTimeoutInMinutes: 10,
        },
        tags: {
          environment: 'prod',
        },
      });

      const template: any = publicIp.toArmTemplate();

      expect(template.properties).toMatchObject({
        publicIPAllocationMethod: 'Static',
        publicIPAddressVersion: 'IPv4',
        dnsSettings: {
          domainNameLabel: 'myapp',
        },
        idleTimeoutInMinutes: 10,
      });
      expect(template.tags).toEqual({ environment: 'prod' });
    });

    it('should include domain name label in dnsSettings', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-dns',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
          domainNameLabel: 'testapp',
        },
      });

      const template: any = publicIp.toArmTemplate();

      expect(template.properties.dnsSettings).toEqual({
        domainNameLabel: 'testapp',
      });
    });

    it('should not include dnsSettings if domain name label is not provided', () => {
      const publicIp = new ArmPublicIpAddress(stack, 'PublicIp', {
        publicIpAddressName: 'pip-no-dns',
        location: 'eastus',
        sku: { name: PublicIPAddressSku.STANDARD },
        properties: {
          publicIPAllocationMethod: PublicIPAllocationMethod.STATIC,
        },
      });

      const template: any = publicIp.toArmTemplate();

      expect(template.properties.dnsSettings).toBeUndefined();
    });
  });
});
