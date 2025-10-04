import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmResourceGroup } from './arm-resource-group';
import type { ArmResourceGroupProps } from './types';

describe('resources/resource-group/ArmResourceGroup', () => {
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
    it('should create resource group with required properties', () => {
      const rg = new ArmResourceGroup(stack, 'RG', {
        resourceGroupName: 'rg-test',
        location: 'eastus',
      });

      expect(rg.resourceGroupName).toBe('rg-test');
      expect(rg.name).toBe('rg-test');
      expect(rg.location).toBe('eastus');
      expect(rg.tags).toEqual({});
    });

    it('should create resource group with tags', () => {
      const rg = new ArmResourceGroup(stack, 'RG', {
        resourceGroupName: 'rg-test',
        location: 'eastus',
        tags: {
          environment: 'nonprod',
          project: 'colorai',
        },
      });

      expect(rg.tags).toEqual({
        environment: 'nonprod',
        project: 'colorai',
      });
    });

    it('should set correct resource type', () => {
      const rg = new ArmResourceGroup(stack, 'RG', {
        resourceGroupName: 'rg-test',
        location: 'eastus',
      });

      expect(rg.resourceType).toBe('Microsoft.Resources/resourceGroups');
    });

    it('should set correct API version', () => {
      const rg = new ArmResourceGroup(stack, 'RG', {
        resourceGroupName: 'rg-test',
        location: 'eastus',
      });

      expect(rg.apiVersion).toBe('2025-04-01');
    });

    it('should generate resource ID', () => {
      const rg = new ArmResourceGroup(stack, 'RG', {
        resourceGroupName: 'rg-test',
        location: 'eastus',
      });

      expect(rg.resourceId).toContain('/resourceGroups/rg-test');
    });

    it('should have Subscription deployment scope', () => {
      const rg = new ArmResourceGroup(stack, 'RG', {
        resourceGroupName: 'rg-test',
        location: 'eastus',
      });

      expect(rg.scope).toBe('subscription');
    });
  });

  describe('validation', () => {
    it('should throw error for empty resource group name', () => {
      expect(() => {
        new ArmResourceGroup(stack, 'RG', {
          resourceGroupName: '',
          location: 'eastus',
        });
      }).toThrow(/Resource group name cannot be empty/);
    });

    it('should throw error for whitespace-only resource group name', () => {
      expect(() => {
        new ArmResourceGroup(stack, 'RG', {
          resourceGroupName: '   ',
          location: 'eastus',
        });
      }).toThrow(/Resource group name cannot be empty/);
    });

    it('should throw error for resource group name exceeding 90 characters', () => {
      const longName = 'a'.repeat(91);

      expect(() => {
        new ArmResourceGroup(stack, 'RG', {
          resourceGroupName: longName,
          location: 'eastus',
        });
      }).toThrow(/Resource group name cannot exceed 90 characters/);
    });

    it('should accept resource group name at exactly 90 characters', () => {
      const name = 'a'.repeat(90);

      const rg = new ArmResourceGroup(stack, 'RG', {
        resourceGroupName: name,
        location: 'eastus',
      });

      expect(rg.resourceGroupName).toBe(name);
    });

    it('should accept valid characters (alphanumeric, hyphen, underscore, period, parentheses)', () => {
      const validNames = [
        'rg-test',
        'rg_test',
        'rg.test',
        'rg(test)',
        'rg-test_123.456(789)',
      ];

      validNames.forEach((name) => {
        const rg = new ArmResourceGroup(stack, `RG-${name}`, {
          resourceGroupName: name,
          location: 'eastus',
        });

        expect(rg.resourceGroupName).toBe(name);
      });
    });

    it('should throw error for invalid characters in resource group name', () => {
      const invalidNames = [
        'rg@test',      // @ not allowed
        'rg#test',      // # not allowed
        'rg$test',      // $ not allowed
        'rg test',      // space not allowed
        'rg!test',      // ! not allowed
      ];

      invalidNames.forEach((name) => {
        expect(() => {
          new ArmResourceGroup(stack, `RG-${name}`, {
            resourceGroupName: name,
            location: 'eastus',
          });
        }).toThrow(/Resource group name contains invalid characters/);
      });
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmResourceGroup(stack, 'RG', {
          resourceGroupName: 'rg-test',
          location: '',
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error for whitespace-only location', () => {
      expect(() => {
        new ArmResourceGroup(stack, 'RG', {
          resourceGroupName: 'rg-test',
          location: '   ',
        });
      }).toThrow(/Location cannot be empty/);
    });
  });

  describe('toArmTemplate()', () => {
    it('should generate correct ARM template structure', () => {
      const rg = new ArmResourceGroup(stack, 'RG', {
        resourceGroupName: 'rg-test',
        location: 'eastus',
        tags: {
          environment: 'nonprod',
        },
      });

      const template = rg.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Resources/resourceGroups',
        apiVersion: '2025-04-01',
        name: 'rg-test',
        location: 'eastus',
        tags: {
          environment: 'nonprod',
        },
      });
    });

    it('should omit tags from template when empty', () => {
      const rg = new ArmResourceGroup(stack, 'RG', {
        resourceGroupName: 'rg-test',
        location: 'eastus',
      });

      const template = rg.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Resources/resourceGroups',
        apiVersion: '2025-04-01',
        name: 'rg-test',
        location: 'eastus',
        tags: undefined,
      });
    });

    it('should include all tags when provided', () => {
      const rg = new ArmResourceGroup(stack, 'RG', {
        resourceGroupName: 'rg-test',
        location: 'eastus',
        tags: {
          environment: 'nonprod',
          project: 'colorai',
          costCenter: '1234',
        },
      });

      const template = rg.toArmTemplate() as any;

      expect(template.tags).toEqual({
        environment: 'nonprod',
        project: 'colorai',
        costCenter: '1234',
      });
    });
  });

  describe('integration tests', () => {
    it('should work with different locations', () => {
      const locations = ['eastus', 'westus2', 'centralus', 'northeurope'];

      locations.forEach((location) => {
        const rg = new ArmResourceGroup(stack, `RG-${location}`, {
          resourceGroupName: `rg-${location}`,
          location,
        });

        expect(rg.location).toBe(location);
      });
    });

    it('should support creation of multiple resource groups in same stack', () => {
      const rg1 = new ArmResourceGroup(stack, 'RG1', {
        resourceGroupName: 'rg-network',
        location: 'eastus',
      });

      const rg2 = new ArmResourceGroup(stack, 'RG2', {
        resourceGroupName: 'rg-data',
        location: 'eastus',
      });

      const rg3 = new ArmResourceGroup(stack, 'RG3', {
        resourceGroupName: 'rg-application',
        location: 'eastus',
      });

      expect(rg1.resourceGroupName).toBe('rg-network');
      expect(rg2.resourceGroupName).toBe('rg-data');
      expect(rg3.resourceGroupName).toBe('rg-application');
    });

    it('should be addable to construct tree', () => {
      const rg = new ArmResourceGroup(stack, 'RG', {
        resourceGroupName: 'rg-test',
        location: 'eastus',
      });

      expect(rg.node.scope).toBe(stack);
      expect(rg.node.id).toBe('RG');
    });
  });
});
