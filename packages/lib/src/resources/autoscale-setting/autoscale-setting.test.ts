import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { ResourceGroupStack } from '../../core/resource-group-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ResourceGroup } from '../resource-group/resource-group';
import { AutoscaleSetting } from './autoscale-setting';
import {
  MetricOperator,
  TimeAggregationType,
  ScaleDirection,
  ScaleType,
} from './types';

describe('resources/autoscale-setting/AutoscaleSetting', () => {
  let app: App;
  let stack: SubscriptionStack;
  let rgStack: ResourceGroupStack;
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
    });

    rgStack = new ResourceGroupStack(stack, 'RGStack', {
      resourceGroup: {
        resourceGroupName: 'rg-test',
        location: 'eastus',
      },
      tags: { environment: 'nonprod' },
    });

    resourceGroup = new ResourceGroup(rgStack, 'TestRG', {
      location: 'eastus',
    });
  });

  describe('constructor', () => {
    it('should create autoscale setting with simplified interface', () => {
      const autoscale = new AutoscaleSetting(resourceGroup, 'AppPlanAutoscale', {
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
        minInstances: 1,
        maxInstances: 10,
        defaultInstances: 2,
        rules: [
          {
            metricTrigger: {
              metricResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
              metricName: 'CpuPercentage',
              timeGrain: 'PT1M',
              statistic: TimeAggregationType.AVERAGE,
              timeWindow: 'PT5M',
              timeAggregation: TimeAggregationType.AVERAGE,
              operator: MetricOperator.GREATER_THAN,
              threshold: 70,
            },
            scaleAction: {
              direction: ScaleDirection.INCREASE,
              type: ScaleType.CHANGE_COUNT,
              value: '1',
              cooldown: 'PT5M',
            },
          },
        ],
      });

      expect(autoscale.name).toBeDefined();
      expect(autoscale.location).toBe('eastus');
    });

    it('should create autoscale setting with custom name', () => {
      const autoscale = new AutoscaleSetting(resourceGroup, 'AppPlanAutoscale', {
        name: 'autoscale-custom',
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
        minInstances: 1,
        maxInstances: 5,
      });

      expect(autoscale.name).toBe('autoscale-custom');
    });

    it('should merge tags with parent', () => {
      const autoscale = new AutoscaleSetting(resourceGroup, 'AppPlanAutoscale', {
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
        minInstances: 1,
        maxInstances: 5,
        tags: { purpose: 'scaling' },
      });

      expect(autoscale.tags).toEqual({
        environment: 'nonprod',
        purpose: 'scaling',
      });
    });

    it('should create autoscale setting with advanced profiles', () => {
      const autoscale = new AutoscaleSetting(resourceGroup, 'AppPlanAutoscale', {
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
        profiles: [
          {
            name: 'Business Hours',
            capacity: {
              minimum: '2',
              maximum: '10',
              default: '2',
            },
            recurrence: {
              frequency: 'Week',
              schedule: {
                timeZone: 'Eastern Standard Time',
                days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                hours: [9],
                minutes: [0],
              },
            },
          },
          {
            name: 'After Hours',
            capacity: {
              minimum: '1',
              maximum: '3',
              default: '1',
            },
            recurrence: {
              frequency: 'Week',
              schedule: {
                timeZone: 'Eastern Standard Time',
                days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                hours: [18],
                minutes: [0],
              },
            },
          },
        ],
      });

      expect(autoscale.name).toBeDefined();
    });

    it('should use default values when not specified', () => {
      const autoscale = new AutoscaleSetting(resourceGroup, 'AppPlanAutoscale', {
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
      });

      expect(autoscale.name).toBeDefined();
      expect(autoscale.location).toBe('eastus');
    });

    it('should throw error if not created under ResourceGroup', () => {
      expect(() => {
        new AutoscaleSetting(stack, 'Autoscale', {
          targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
          minInstances: 1,
          maxInstances: 5,
        });
      }).toThrow(/must be created within or under a ResourceGroup/);
    });
  });
});
