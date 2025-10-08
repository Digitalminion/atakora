import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmSearchService } from './arm-search-service';
import { SearchServiceSku, HostingMode, PublicNetworkAccess } from './types';
import type { ArmSearchServiceProps } from './types';

describe('resources/search-service/ArmSearchService', () => {
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
    it('should create search service with required properties', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-test-001',
        location: 'eastus',
        sku: { name: SearchServiceSku.BASIC },
      });

      expect(search.serviceName).toBe('srch-test-001');
      expect(search.name).toBe('srch-test-001');
      expect(search.location).toBe('eastus');
      expect(search.sku.name).toBe('basic');
      expect(search.tags).toEqual({});
    });

    it('should create search service with all properties', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-test-002',
        location: 'eastus',
        sku: { name: SearchServiceSku.STANDARD },
        properties: {
          replicaCount: 3,
          partitionCount: 2,
          hostingMode: HostingMode.DEFAULT,
          publicNetworkAccess: PublicNetworkAccess.DISABLED,
        },
        tags: {
          environment: 'test',
        },
      });

      expect(search.replicaCount).toBe(3);
      expect(search.partitionCount).toBe(2);
      expect(search.hostingMode).toBe('default');
      expect(search.publicNetworkAccess).toBe('disabled');
      expect(search.tags).toEqual({ environment: 'test' });
    });

    it('should set correct resource type', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-test-003',
        location: 'eastus',
        sku: { name: SearchServiceSku.BASIC },
      });

      expect(search.resourceType).toBe('Microsoft.Search/searchServices');
    });

    it('should set correct API version', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-test-004',
        location: 'eastus',
        sku: { name: SearchServiceSku.BASIC },
      });

      expect(search.apiVersion).toBe('2023-11-01');
    });

    it('should generate resource ID', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-test-005',
        location: 'eastus',
        sku: { name: SearchServiceSku.BASIC },
      });

      expect(search.resourceId).toContain('/searchServices/srch-test-005');
      expect(search.serviceId).toBe(search.resourceId);
    });

    it('should have ResourceGroup deployment scope', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-test-006',
        location: 'eastus',
        sku: { name: SearchServiceSku.BASIC },
      });

      expect(search.scope).toBe('resourceGroup');
    });

    it('should create search service with network rule set', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-test-007',
        location: 'eastus',
        sku: { name: SearchServiceSku.BASIC },
        properties: {
          networkRuleSet: {
            ipRules: [{ value: '1.2.3.4' }, { value: '5.6.7.8/24' }],
          },
        },
      });

      expect(search.networkRuleSet).toBeDefined();
      expect(search.networkRuleSet?.ipRules).toHaveLength(2);
    });
  });

  describe('validation', () => {
    it('should throw error for empty service name', () => {
      expect(() => {
        new ArmSearchService(stack, 'Search', {
          serviceName: '',
          location: 'eastus',
          sku: { name: SearchServiceSku.BASIC },
        });
      }).toThrow(/Search service name cannot be empty/);
    });

    it('should throw error for name shorter than 2 characters', () => {
      expect(() => {
        new ArmSearchService(stack, 'Search', {
          serviceName: 's',
          location: 'eastus',
          sku: { name: SearchServiceSku.BASIC },
        });
      }).toThrow(/must be 2-60 characters/);
    });

    it('should throw error for name longer than 60 characters', () => {
      expect(() => {
        new ArmSearchService(stack, 'Search', {
          serviceName: 'a'.repeat(61),
          location: 'eastus',
          sku: { name: SearchServiceSku.BASIC },
        });
      }).toThrow(/must be 2-60 characters/);
    });

    it('should accept name at exactly 2 characters', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'sr',
        location: 'eastus',
        sku: { name: SearchServiceSku.BASIC },
      });

      expect(search.serviceName).toBe('sr');
    });

    it('should accept name at exactly 60 characters', () => {
      const name = 'a' + 'b'.repeat(58) + 'c';
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: name,
        location: 'eastus',
        sku: { name: SearchServiceSku.BASIC },
      });

      expect(search.serviceName).toBe(name);
      expect(search.serviceName.length).toBe(60);
    });

    it('should throw error for name with uppercase letters', () => {
      expect(() => {
        new ArmSearchService(stack, 'Search', {
          serviceName: 'Srch-Test',
          location: 'eastus',
          sku: { name: SearchServiceSku.BASIC },
        });
      }).toThrow(/only lowercase letters/);
    });

    it('should throw error for name starting with hyphen', () => {
      expect(() => {
        new ArmSearchService(stack, 'Search', {
          serviceName: '-srch-test',
          location: 'eastus',
          sku: { name: SearchServiceSku.BASIC },
        });
      }).toThrow(/cannot start or end with a hyphen/);
    });

    it('should throw error for name ending with hyphen', () => {
      expect(() => {
        new ArmSearchService(stack, 'Search', {
          serviceName: 'srch-test-',
          location: 'eastus',
          sku: { name: SearchServiceSku.BASIC },
        });
      }).toThrow(/cannot start or end with a hyphen/);
    });

    it('should throw error for name with special characters', () => {
      expect(() => {
        new ArmSearchService(stack, 'Search', {
          serviceName: 'srch_test',
          location: 'eastus',
          sku: { name: SearchServiceSku.BASIC },
        });
      }).toThrow(/only lowercase letters, numbers, and hyphens/);
    });

    it('should accept valid lowercase alphanumeric names with hyphens', () => {
      const validNames = [
        'srch-test-001',
        'search-123',
        'my-search-service',
        'srch-1234567890',
        'a-b',
      ];

      validNames.forEach((name) => {
        const search = new ArmSearchService(stack, `Search-${name}`, {
          serviceName: name,
          location: 'eastus',
          sku: { name: SearchServiceSku.BASIC },
        });

        expect(search.serviceName).toBe(name);
      });
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmSearchService(stack, 'Search', {
          serviceName: 'srch-test',
          location: '',
          sku: { name: SearchServiceSku.BASIC },
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error when SKU is not provided', () => {
      expect(() => {
        new ArmSearchService(stack, 'Search', {
          serviceName: 'srch-test',
          location: 'eastus',
        } as any);
      }).toThrow(/SKU must be provided/);
    });

    it('should throw error for replica count less than 1', () => {
      expect(() => {
        new ArmSearchService(stack, 'Search', {
          serviceName: 'srch-test',
          location: 'eastus',
          sku: { name: SearchServiceSku.BASIC },
          properties: {
            replicaCount: 0,
          },
        });
      }).toThrow(/Replica count must be between 1 and 12/);
    });

    it('should throw error for replica count greater than 12', () => {
      expect(() => {
        new ArmSearchService(stack, 'Search', {
          serviceName: 'srch-test',
          location: 'eastus',
          sku: { name: SearchServiceSku.BASIC },
          properties: {
            replicaCount: 13,
          },
        });
      }).toThrow(/Replica count must be between 1 and 12/);
    });

    it('should accept valid replica counts', () => {
      const validCounts = [1, 2, 3, 6, 12];

      validCounts.forEach((count) => {
        const search = new ArmSearchService(stack, `Search-${count}`, {
          serviceName: `srch-test-${count}`,
          location: 'eastus',
          sku: { name: SearchServiceSku.STANDARD },
          properties: {
            replicaCount: count,
          },
        });

        expect(search.replicaCount).toBe(count);
      });
    });

    it('should throw error for invalid partition count', () => {
      expect(() => {
        new ArmSearchService(stack, 'Search', {
          serviceName: 'srch-test',
          location: 'eastus',
          sku: { name: SearchServiceSku.BASIC },
          properties: {
            partitionCount: 5,
          },
        });
      }).toThrow(/Partition count must be one of 1, 2, 3, 4, 6, 12/);
    });

    it('should accept valid partition counts', () => {
      const validCounts = [1, 2, 3, 4, 6, 12];

      validCounts.forEach((count) => {
        const search = new ArmSearchService(stack, `Search-${count}`, {
          serviceName: `srch-test-${count}`,
          location: 'eastus',
          sku: { name: SearchServiceSku.STANDARD },
          properties: {
            partitionCount: count,
          },
        });

        expect(search.partitionCount).toBe(count);
      });
    });
  });

  describe('SKU options', () => {
    it('should support free SKU', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-free',
        location: 'eastus',
        sku: { name: SearchServiceSku.FREE },
      });

      expect(search.sku.name).toBe('free');
    });

    it('should support basic SKU', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-basic',
        location: 'eastus',
        sku: { name: SearchServiceSku.BASIC },
      });

      expect(search.sku.name).toBe('basic');
    });

    it('should support standard SKU', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-standard',
        location: 'eastus',
        sku: { name: SearchServiceSku.STANDARD },
      });

      expect(search.sku.name).toBe('standard');
    });

    it('should support standard2 SKU', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-standard2',
        location: 'eastus',
        sku: { name: SearchServiceSku.STANDARD2 },
      });

      expect(search.sku.name).toBe('standard2');
    });

    it('should support standard3 SKU', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-standard3',
        location: 'eastus',
        sku: { name: SearchServiceSku.STANDARD3 },
      });

      expect(search.sku.name).toBe('standard3');
    });

    it('should support storage_optimized_l1 SKU', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-storage-l1',
        location: 'eastus',
        sku: { name: SearchServiceSku.STORAGE_OPTIMIZED_L1 },
      });

      expect(search.sku.name).toBe('storage_optimized_l1');
    });

    it('should support storage_optimized_l2 SKU', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-storage-l2',
        location: 'eastus',
        sku: { name: SearchServiceSku.STORAGE_OPTIMIZED_L2 },
      });

      expect(search.sku.name).toBe('storage_optimized_l2');
    });
  });

  describe('hosting mode', () => {
    it('should support default hosting mode', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-default',
        location: 'eastus',
        sku: { name: SearchServiceSku.BASIC },
        properties: {
          hostingMode: HostingMode.DEFAULT,
        },
      });

      expect(search.hostingMode).toBe('default');
    });

    it('should support high density hosting mode', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-highdensity',
        location: 'eastus',
        sku: { name: SearchServiceSku.STANDARD3 },
        properties: {
          hostingMode: HostingMode.HIGH_DENSITY,
        },
      });

      expect(search.hostingMode).toBe('highDensity');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with minimal properties', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-test',
        location: 'eastus',
        sku: { name: SearchServiceSku.BASIC },
      });

      const template: any = search.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Search/searchServices',
        apiVersion: '2023-11-01',
        name: 'srch-test',
        location: 'eastus',
        sku: {
          name: 'basic',
        },
        properties: undefined,
        tags: undefined,
      });
    });

    it('should generate ARM template with all properties', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-full',
        location: 'eastus',
        sku: { name: SearchServiceSku.STANDARD },
        properties: {
          replicaCount: 3,
          partitionCount: 2,
          hostingMode: HostingMode.DEFAULT,
          publicNetworkAccess: PublicNetworkAccess.DISABLED,
          networkRuleSet: {
            ipRules: [{ value: '1.2.3.4' }],
          },
        },
        tags: {
          environment: 'prod',
        },
      });

      const template: any = search.toArmTemplate();

      expect(template.properties).toMatchObject({
        replicaCount: 3,
        partitionCount: 2,
        hostingMode: 'default',
        publicNetworkAccess: 'disabled',
        networkRuleSet: {
          ipRules: [{ value: '1.2.3.4' }],
        },
      });
      expect(template.tags).toEqual({ environment: 'prod' });
    });

    it('should include networkRuleSet when provided', () => {
      const search = new ArmSearchService(stack, 'Search', {
        serviceName: 'srch-network',
        location: 'eastus',
        sku: { name: SearchServiceSku.BASIC },
        properties: {
          networkRuleSet: {
            ipRules: [{ value: '10.0.0.1' }, { value: '10.0.0.2/24' }],
          },
        },
      });

      const template: any = search.toArmTemplate();

      expect(template.properties.networkRuleSet).toBeDefined();
      expect(template.properties.networkRuleSet.ipRules).toHaveLength(2);
    });
  });
});
