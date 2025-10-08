import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { Construct } from '../../core/construct';
import { ResourceGroup } from './resource-group';
import type { ResourceGroupProps } from './types';

describe('resources/resource-group/ResourceGroup', () => {
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
      tags: {
        managed_by: 'terraform',
        project: 'colorai',
      },
    });
  });

  describe('constructor', () => {
    it('should create resource group with auto-generated name', () => {
      const rg = new ResourceGroup(stack, 'DataRG');

      // Should auto-generate name using stack context
      expect(rg.resourceGroupName).toContain('rg-');
      expect(rg.resourceGroupName).toContain('dp'); // digital-products abbreviation
      expect(rg.resourceGroupName).toContain('colorai');
      expect(rg.resourceGroupName).toContain('datarg'); // purpose from ID
      expect(rg.resourceGroupName).toContain('nonprod');
      expect(rg.resourceGroupName).toContain('eus');
      expect(rg.resourceGroupName).toContain('01');
    });

    it('should use provided resource group name when specified', () => {
      const rg = new ResourceGroup(stack, 'DataRG', {
        resourceGroupName: 'my-custom-rg-name',
      });

      expect(rg.resourceGroupName).toBe('my-custom-rg-name');
    });

    it('should default location to stack geography', () => {
      const rg = new ResourceGroup(stack, 'DataRG');

      expect(rg.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const rg = new ResourceGroup(stack, 'DataRG', {
        location: 'westus2',
      });

      expect(rg.location).toBe('westus2');
    });

    it('should merge tags with stack tags', () => {
      const rg = new ResourceGroup(stack, 'DataRG', {
        tags: {
          owner: 'platform-team',
        },
      });

      expect(rg.tags).toEqual({
        managed_by: 'terraform', // from stack
        project: 'colorai', // from stack
        owner: 'platform-team', // from props
      });
    });

    it('should override stack tags with provided tags', () => {
      const rg = new ResourceGroup(stack, 'DataRG', {
        tags: {
          project: 'custom-project', // overrides stack tag
        },
      });

      expect(rg.tags).toEqual({
        managed_by: 'terraform',
        project: 'custom-project', // overridden
      });
    });

    it('should work with no props', () => {
      const rg = new ResourceGroup(stack, 'DataRG');

      expect(rg.resourceGroupName).toBeDefined();
      expect(rg.location).toBeDefined();
      expect(rg.tags).toBeDefined();
    });

    it('should create resource group with all properties specified', () => {
      const rg = new ResourceGroup(stack, 'DataRG', {
        resourceGroupName: 'rg-explicit',
        location: 'westus2',
        tags: {
          environment: 'production',
        },
      });

      expect(rg.resourceGroupName).toBe('rg-explicit');
      expect(rg.location).toBe('westus2');
      expect(rg.tags).toMatchObject({
        environment: 'production',
      });
    });
  });

  describe('auto-naming', () => {
    it('should generate name with lowercase purpose', () => {
      const rg = new ResourceGroup(stack, 'DataRG');

      expect(rg.resourceGroupName).toContain('datarg');
    });

    it('should handle different construct ID formats', () => {
      const testCases = [
        { id: 'NetworkRG', expectedPurpose: 'networkrg' },
        { id: 'DataRG', expectedPurpose: 'datarg' },
        { id: 'ApplicationRG', expectedPurpose: 'applicationrg' },
        { id: 'data-rg', expectedPurpose: 'data-rg' },
      ];

      testCases.forEach(({ id, expectedPurpose }) => {
        const rg = new ResourceGroup(stack, id);
        expect(rg.resourceGroupName).toContain(expectedPurpose);
      });
    });

    it('should generate different names for different construct IDs', () => {
      const rg1 = new ResourceGroup(stack, 'NetworkRG');
      const rg2 = new ResourceGroup(stack, 'DataRG');

      expect(rg1.resourceGroupName).not.toBe(rg2.resourceGroupName);
      expect(rg1.resourceGroupName).toContain('networkrg');
      expect(rg2.resourceGroupName).toContain('datarg');
    });
  });

  describe('parent stack validation', () => {
    it('should throw error if not created within a SubscriptionStack', () => {
      const plainConstruct = new Construct(app, 'PlainConstruct');

      expect(() => {
        new ResourceGroup(plainConstruct, 'DataRG');
      }).toThrow(/ResourceGroup must be created within a SubscriptionStack/);
    });

    it('should work when created directly within SubscriptionStack', () => {
      const rg = new ResourceGroup(stack, 'DataRG');

      expect(rg.resourceGroupName).toBeDefined();
    });

    it('should work when created within nested construct under SubscriptionStack', () => {
      const nestedConstruct = new Construct(stack, 'Nested');
      const rg = new ResourceGroup(nestedConstruct, 'DataRG');

      expect(rg.resourceGroupName).toBeDefined();
      expect(rg.location).toBe(stack.location);
    });
  });

  describe('tag merging', () => {
    it('should inherit all stack tags when no tags provided', () => {
      const rg = new ResourceGroup(stack, 'DataRG');

      expect(rg.tags).toEqual(stack.tags);
    });

    it('should add new tags to stack tags', () => {
      const rg = new ResourceGroup(stack, 'DataRG', {
        tags: {
          costCenter: '1234',
          owner: 'data-team',
        },
      });

      expect(rg.tags).toEqual({
        managed_by: 'terraform',
        project: 'colorai',
        costCenter: '1234',
        owner: 'data-team',
      });
    });

    it('should handle empty tags object', () => {
      const rg = new ResourceGroup(stack, 'DataRG', {
        tags: {},
      });

      expect(rg.tags).toEqual(stack.tags);
    });
  });

  describe('IResourceGroup interface', () => {
    it('should implement IResourceGroup interface', () => {
      const rg = new ResourceGroup(stack, 'DataRG');

      // Should have required properties
      expect(rg).toHaveProperty('resourceGroupName');
      expect(rg).toHaveProperty('location');
    });

    it('should be usable as IResourceGroup reference', () => {
      const rg = new ResourceGroup(stack, 'DataRG');

      // Type assertion to verify interface compliance
      const rgRef: { resourceGroupName: string; location: string } = rg;

      expect(rgRef.resourceGroupName).toBe(rg.resourceGroupName);
      expect(rgRef.location).toBe(rg.location);
    });
  });

  describe('integration tests', () => {
    it('should create multiple resource groups in same stack', () => {
      const networkRG = new ResourceGroup(stack, 'NetworkRG');
      const dataRG = new ResourceGroup(stack, 'DataRG');
      const appRG = new ResourceGroup(stack, 'ApplicationRG');

      expect(networkRG.resourceGroupName).not.toBe(dataRG.resourceGroupName);
      expect(dataRG.resourceGroupName).not.toBe(appRG.resourceGroupName);
      expect(networkRG.resourceGroupName).not.toBe(appRG.resourceGroupName);
    });

    it('should support different geographies', () => {
      const westStack = new SubscriptionStack(app, 'WestStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('westus2'),
        organization: Organization.fromValue('digital-products'),
        project: new Project('colorai'),
        environment: Environment.fromValue('nonprod'),
        instance: Instance.fromNumber(1),
      });

      const rg = new ResourceGroup(westStack, 'DataRG');

      expect(rg.location).toBe('westus2');
      expect(rg.resourceGroupName).toContain('wus2'); // westus2 abbreviation
    });

    it('should support different environments', () => {
      const prodStack = new SubscriptionStack(app, 'ProdStack', {
        subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
        geography: Geography.fromValue('eastus'),
        organization: Organization.fromValue('digital-products'),
        project: new Project('colorai'),
        environment: Environment.fromValue('production'),
        instance: Instance.fromNumber(1),
      });

      const rg = new ResourceGroup(prodStack, 'DataRG');

      expect(rg.resourceGroupName).toContain('prod');
    });

    it('should be addable to construct tree', () => {
      const rg = new ResourceGroup(stack, 'DataRG');

      expect(rg.node.scope).toBe(stack);
      expect(rg.node.id).toBe('DataRG');
    });

    it('should support nested constructs', () => {
      const rg = new ResourceGroup(stack, 'DataRG');
      const child = new Construct(rg, 'ChildConstruct');

      expect(child.node.scope).toBe(rg);
      expect(rg.node.children).toContainEqual(child);
    });
  });

  describe('ColorAI reference architecture', () => {
    it('should support creating 5 resource groups like ColorAI', () => {
      const foundation = new ResourceGroup(stack, 'FoundationRG');
      const connectivity = new ResourceGroup(stack, 'ConnectivityRG');
      const data = new ResourceGroup(stack, 'DataRG');
      const application = new ResourceGroup(stack, 'ApplicationRG');
      const monitoring = new ResourceGroup(stack, 'MonitoringRG');

      // All should have unique names
      const names = [
        foundation.resourceGroupName,
        connectivity.resourceGroupName,
        data.resourceGroupName,
        application.resourceGroupName,
        monitoring.resourceGroupName,
      ];

      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(5);

      // All should use same location
      expect(foundation.location).toBe('eastus');
      expect(connectivity.location).toBe('eastus');
      expect(data.location).toBe('eastus');
      expect(application.location).toBe('eastus');
      expect(monitoring.location).toBe('eastus');
    });
  });
});
