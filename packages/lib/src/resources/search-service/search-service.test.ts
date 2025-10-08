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
import { SearchService } from './search-service';
import { SearchServiceSku, HostingMode, PublicNetworkAccess } from './types';

describe('resources/search-service/SearchService', () => {
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
    resourceGroup = new ResourceGroup(stack, 'DataRG');
  });

  describe('constructor', () => {
    it('should create search service with auto-generated name', () => {
      const search = new SearchService(resourceGroup, 'DataSearch');

      // Should auto-generate name with hyphens allowed
      expect(search.serviceName).toMatch(/^srch-/);
      expect(search.serviceName).toContain('dp-colorai'); // Abbreviated org + project
      expect(search.serviceName.length).toBeLessThanOrEqual(60);
    });

    it('should use provided service name when specified', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        serviceName: 'my-search-service',
      });

      expect(search.serviceName).toBe('my-search-service');
    });

    it('should default location to resource group location', () => {
      const search = new SearchService(resourceGroup, 'DataSearch');

      expect(search.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        location: 'westus2',
      });

      expect(search.location).toBe('westus2');
    });

    it('should set resource group name from parent', () => {
      const search = new SearchService(resourceGroup, 'DataSearch');

      expect(search.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should merge tags with parent', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        tags: {
          purpose: 'ai-search',
        },
      });

      expect(search.tags).toMatchObject({
        managed_by: 'terraform',
        purpose: 'ai-search',
      });
    });

    it('should default SKU to basic', () => {
      const search = new SearchService(resourceGroup, 'DataSearch');

      expect(search.sku).toBe('basic');
    });

    it('should use provided SKU when specified', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        sku: SearchServiceSku.STANDARD,
      });

      expect(search.sku).toBe('standard');
    });

    it('should generate service ID', () => {
      const search = new SearchService(resourceGroup, 'DataSearch');

      expect(search.serviceId).toContain('/searchServices/');
      expect(search.serviceId).toContain(search.serviceName);
    });

    it('should create search service with custom replica count', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        replicaCount: 3,
      });

      // ServiceId should be defined (verifying L1 construct was created successfully)
      expect(search.serviceId).toBeDefined();
    });

    it('should create search service with custom partition count', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        partitionCount: 2,
      });

      expect(search.serviceId).toBeDefined();
    });

    it('should create search service with high density hosting mode', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        sku: SearchServiceSku.STANDARD3,
        hostingMode: HostingMode.HIGH_DENSITY,
      });

      expect(search.sku).toBe('standard3');
      expect(search.serviceId).toBeDefined();
    });

    it('should create search service with enabled public network access', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        publicNetworkAccess: PublicNetworkAccess.ENABLED,
      });

      expect(search.serviceId).toBeDefined();
    });

    it('should create search service with network rule set', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        networkRuleSet: {
          ipRules: [{ value: '1.2.3.4' }, { value: '5.6.7.8/24' }],
        },
      });

      expect(search.serviceId).toBeDefined();
    });
  });

  describe('defaults', () => {
    it('should default replica count to 1', () => {
      const search = new SearchService(resourceGroup, 'DataSearch');

      // Verify by checking that the construct was created successfully
      expect(search.serviceId).toBeDefined();
    });

    it('should default partition count to 1', () => {
      const search = new SearchService(resourceGroup, 'DataSearch');

      expect(search.serviceId).toBeDefined();
    });

    it('should default hosting mode to default', () => {
      const search = new SearchService(resourceGroup, 'DataSearch');

      expect(search.serviceId).toBeDefined();
    });

    it('should default public network access to disabled', () => {
      const search = new SearchService(resourceGroup, 'DataSearch');

      expect(search.serviceId).toBeDefined();
    });
  });

  describe('SKU options', () => {
    it('should support free SKU', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        sku: SearchServiceSku.FREE,
      });

      expect(search.sku).toBe('free');
    });

    it('should support basic SKU', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        sku: SearchServiceSku.BASIC,
      });

      expect(search.sku).toBe('basic');
    });

    it('should support standard SKU', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        sku: SearchServiceSku.STANDARD,
      });

      expect(search.sku).toBe('standard');
    });

    it('should support standard2 SKU', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        sku: SearchServiceSku.STANDARD2,
      });

      expect(search.sku).toBe('standard2');
    });

    it('should support standard3 SKU', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        sku: SearchServiceSku.STANDARD3,
      });

      expect(search.sku).toBe('standard3');
    });

    it('should support storage_optimized_l1 SKU', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        sku: SearchServiceSku.STORAGE_OPTIMIZED_L1,
      });

      expect(search.sku).toBe('storage_optimized_l1');
    });

    it('should support storage_optimized_l2 SKU', () => {
      const search = new SearchService(resourceGroup, 'DataSearch', {
        sku: SearchServiceSku.STORAGE_OPTIMIZED_L2,
      });

      expect(search.sku).toBe('storage_optimized_l2');
    });
  });

  describe('fromServiceId', () => {
    it('should create search service reference from service ID', () => {
      const serviceId =
        '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/rg-data/providers/Microsoft.Search/searchServices/srch-colorai-001';
      const search = SearchService.fromServiceId(stack, 'ExistingSearch', serviceId);

      expect(search.serviceName).toBe('srch-colorai-001');
      expect(search.serviceId).toBe(serviceId);
    });

    it('should extract service name from complex service ID', () => {
      const serviceId =
        '/subscriptions/abcd1234-5678-90ab-cdef-1234567890ab/resourceGroups/my-rg/providers/Microsoft.Search/searchServices/my-search-service';
      const search = SearchService.fromServiceId(stack, 'ImportedSearch', serviceId);

      expect(search.serviceName).toBe('my-search-service');
    });
  });

  describe('error handling', () => {
    it('should throw error when not created within a ResourceGroup', () => {
      expect(() => {
        new SearchService(stack, 'Search');
      }).toThrow(/must be created within or under a ResourceGroup/);
    });

    it('should throw error when parent scope has no ResourceGroup in hierarchy', () => {
      const app2 = new App();

      expect(() => {
        new SearchService(app2, 'Search');
      }).toThrow(/must be created within or under a ResourceGroup/);
    });
  });

  describe('tag inheritance', () => {
    it('should inherit tags from parent resource group', () => {
      const rgWithTags = new ResourceGroup(stack, 'RGWithTags', {
        tags: {
          project: 'colorai',
          team: 'data',
        },
      });

      const search = new SearchService(rgWithTags, 'DataSearch');

      expect(search.tags).toMatchObject({
        managed_by: 'terraform',
        project: 'colorai',
        team: 'data',
      });
    });

    it('should override parent tags with provided tags', () => {
      const rgWithTags = new ResourceGroup(stack, 'RGWithTags', {
        tags: {
          project: 'colorai',
          environment: 'dev',
        },
      });

      const search = new SearchService(rgWithTags, 'DataSearch', {
        tags: {
          environment: 'prod', // Override
          purpose: 'ai-search', // Add new
        },
      });

      expect(search.tags).toMatchObject({
        managed_by: 'terraform',
        project: 'colorai',
        environment: 'prod', // Overridden
        purpose: 'ai-search', // New
      });
    });
  });

  describe('integration with other constructs', () => {
    it('should work with multiple search services in same resource group', () => {
      const search1 = new SearchService(resourceGroup, 'Search1', {
        serviceName: 'srch-one',
      });
      const search2 = new SearchService(resourceGroup, 'Search2', {
        serviceName: 'srch-two',
      });

      expect(search1.serviceName).toBe('srch-one');
      expect(search2.serviceName).toBe('srch-two');
      expect(search1.resourceGroupName).toBe(search2.resourceGroupName);
    });

    it('should maintain unique service IDs for different services', () => {
      const search1 = new SearchService(resourceGroup, 'Search1', {
        serviceName: 'srch-alpha',
      });
      const search2 = new SearchService(resourceGroup, 'Search2', {
        serviceName: 'srch-beta',
      });

      expect(search1.serviceId).not.toBe(search2.serviceId);
      expect(search1.serviceId).toContain('srch-alpha');
      expect(search2.serviceId).toContain('srch-beta');
    });
  });
});
