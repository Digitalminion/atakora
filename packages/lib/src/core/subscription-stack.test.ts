import { describe, it, expect, beforeEach } from 'vitest';
import { App } from './app';
import { SubscriptionStack } from './subscription-stack';
import { Subscription } from './azure/subscription';
import { Geography } from './azure/geography';
import { Organization } from './context/organization';
import { Project } from './context/project';
import { Environment } from './context/environment';
import { Instance } from './context/instance';
import { DeploymentScope } from './azure/scopes';

describe('core/SubscriptionStack', () => {
  let app: App;
  let subscription: Subscription;
  let geography: Geography;
  let organization: Organization;
  let project: Project;
  let environment: Environment;
  let instance: Instance;

  beforeEach(() => {
    app = new App();
    subscription = Subscription.fromId('12345678-1234-1234-1234-123456789abc');
    geography = Geography.fromValue('eastus');
    organization = Organization.fromValue('digital-minion');
    project = new Project('authr');
    environment = Environment.fromValue('nonprod');
    instance = Instance.fromNumber(1);
  });

  describe('constructor', () => {
    it('should create subscription stack with required props', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      expect(stack).toBeDefined();
      expect(stack.node.id).toBe('Foundation');
    });

    it('should set subscription properties', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      expect(stack.subscriptionId).toBe(subscription.subscriptionId);
    });

    it('should set geography and location', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      expect(stack.geography).toBe(geography);
      expect(stack.location).toBe(geography.location);
      expect(stack.location).toBe('eastus');
    });

    it('should set naming context', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      expect(stack.organization).toBe(organization);
      expect(stack.project).toBe(project);
      expect(stack.environment).toBe(environment);
      expect(stack.instance).toBe(instance);
    });

    it('should have Subscription scope', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      expect(stack.scope).toBe(DeploymentScope.Subscription);
    });

    it('should accept custom tags', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
        tags: {
          Owner: 'Platform Team',
          CostCenter: '12345',
        },
      });

      expect(stack.tags).toEqual({
        Owner: 'Platform Team',
        CostCenter: '12345',
      });
    });

    it('should have empty tags by default', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      expect(stack.tags).toEqual({});
    });

    it('should accept custom naming conventions', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
        namingConventions: {
          separator: '_',
        },
      });

      expect(stack).toBeDefined();
      // Naming conventions are used internally
    });

    it('should register with app', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      expect(app.allStacks).toContainEqual(stack);
    });

    it('should be child of app in construct tree', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      expect(stack.node.scope).toBe(app);
      expect(app.node.children).toContainEqual(stack);
    });
  });

  describe('generateResourceName()', () => {
    it('should generate resource group name', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      const rgName = stack.generateResourceName('rg');

      expect(rgName).toBeDefined();
      expect(rgName).toContain('rg');
    });

    it('should include organization in resource name', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      const name = stack.generateResourceName('rg');

      expect(name).toContain(organization.resourceName);
    });

    it('should include project in resource name', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      const name = stack.generateResourceName('rg');

      expect(name).toContain(project.resourceName);
    });

    it('should use environment abbreviation in resource name', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      const name = stack.generateResourceName('rg');

      expect(name).toContain(environment.abbreviation);
    });

    it('should use geography abbreviation in resource name', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      const name = stack.generateResourceName('rg');

      expect(name).toContain(geography.abbreviation);
    });

    it('should use instance in resource name', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      const name = stack.generateResourceName('rg');

      expect(name).toContain(instance.resourceName);
    });

    it('should include purpose when provided', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      const name = stack.generateResourceName('rg', 'data');

      expect(name).toContain('data');
    });

    it('should generate names for different resource types', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      const rgName = stack.generateResourceName('rg');
      const rgLzName = stack.generateResourceName('rgLandingZone');

      expect(rgName).toBeDefined();
      expect(rgLzName).toBeDefined();
      expect(rgName).not.toBe(rgLzName);
    });

    it('should generate consistent names', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      const name1 = stack.generateResourceName('rg', 'data');
      const name2 = stack.generateResourceName('rg', 'data');

      expect(name1).toBe(name2);
    });
  });

  describe('addResourceGroupStack()', () => {
    it('should add nested resource group stack', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      const mockRg = {
        resourceGroupName: 'rg-test',
        location: 'eastus',
      };

      const rgStack = stack.addResourceGroupStack('DataStack', mockRg);

      expect(rgStack).toBeDefined();
    });

    it('should create ResourceGroupStack with parent reference', () => {
      const stack = new SubscriptionStack(app, 'Foundation', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      const mockRg = {
        resourceGroupName: 'rg-test',
        location: 'eastus',
      };

      const rgStack = stack.addResourceGroupStack('DataStack', mockRg);

      expect(rgStack.node.scope).toBe(stack);
    });
  });

  describe('Integration tests', () => {
    it('should work with different geographies', () => {
      const westGeo = Geography.fromValue('westus2');

      const stack = new SubscriptionStack(app, 'WestStack', {
        subscription,
        geography: westGeo,
        organization,
        project,
        environment,
        instance,
      });

      const name = stack.generateResourceName('rg');

      expect(name).toContain(westGeo.abbreviation);
      expect(stack.location).toBe('westus2');
    });

    it('should work with different environments', () => {
      const prodEnv = Environment.fromValue('production');

      const stack = new SubscriptionStack(app, 'ProdStack', {
        subscription,
        geography,
        organization,
        project,
        environment: prodEnv,
        instance,
      });

      const name = stack.generateResourceName('rg');

      expect(name).toContain(prodEnv.abbreviation);
      expect(name).toContain('prod');
    });

    it('should work with different instances', () => {
      const instance02 = Instance.fromNumber(2);

      const stack = new SubscriptionStack(app, 'SecondStack', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance: instance02,
      });

      const name = stack.generateResourceName('rg');

      expect(name).toContain('02');
    });

    it('should create multiple stacks in same app', () => {
      const stack1 = new SubscriptionStack(app, 'Foundation1', {
        subscription,
        geography,
        organization,
        project,
        environment,
        instance,
      });

      const stack2 = new SubscriptionStack(app, 'Foundation2', {
        subscription: Subscription.fromId('87654321-4321-4321-4321-cba987654321'),
        geography: Geography.fromValue('westus'),
        organization,
        project,
        environment,
        instance,
      });

      expect(app.allStacks).toHaveLength(2);
      expect(stack1.location).toBe('eastus');
      expect(stack2.location).toBe('westus');
    });
  });
});
