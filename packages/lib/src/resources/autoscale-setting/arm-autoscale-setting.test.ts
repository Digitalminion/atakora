import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmAutoscaleSetting } from './arm-autoscale-setting';
import { MetricOperator, TimeAggregationType, ScaleDirection, ScaleType } from './types';

describe('resources/autoscale-setting/ArmAutoscaleSetting', () => {
  let app: App;
  let stack: SubscriptionStack;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-minion'),
      project: new Project('authr'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
    });
  });

  describe('constructor', () => {
    it('should create autoscale setting with metric-based profile', () => {
      const autoscale = new ArmAutoscaleSetting(stack, 'Autoscale', {
        name: 'autoscale-appplan',
        location: 'eastus',
        targetResourceId:
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
        profiles: [
          {
            name: 'Default',
            capacity: {
              minimum: '1',
              maximum: '10',
              default: '1',
            },
            rules: [
              {
                metricTrigger: {
                  metricName: 'CpuPercentage',
                  metricResourceId:
                    '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
                  timeGrain: 'PT1M',
                  statistic: TimeAggregationType.AVERAGE,
                  timeWindow: 'PT10M',
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
          },
        ],
      });

      expect(autoscale.name).toBe('autoscale-appplan');
      expect(autoscale.location).toBe('eastus');
      expect(autoscale.enabled).toBe(true);
      expect(autoscale.profiles).toHaveLength(1);
    });

    it('should create autoscale setting with schedule-based profile', () => {
      const autoscale = new ArmAutoscaleSetting(stack, 'Autoscale', {
        name: 'autoscale-appplan',
        location: 'eastus',
        targetResourceId:
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
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
        ],
      });

      expect(autoscale.profiles).toHaveLength(1);
    });

    it('should create autoscale setting with notifications', () => {
      const autoscale = new ArmAutoscaleSetting(stack, 'Autoscale', {
        name: 'autoscale-appplan',
        location: 'eastus',
        targetResourceId:
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
        profiles: [
          {
            name: 'Default',
            capacity: { minimum: '1', maximum: '10', default: '1' },
          },
        ],
        notifications: [
          {
            operation: 'Scale',
            email: {
              sendToSubscriptionAdministrator: true,
              sendToSubscriptionCoAdministrators: false,
              customEmails: ['admin@example.com'],
            },
          },
        ],
      });

      expect(autoscale.notifications).toHaveLength(1);
    });

    it('should set correct resource type', () => {
      const autoscale = new ArmAutoscaleSetting(stack, 'Autoscale', {
        name: 'autoscale-appplan',
        location: 'eastus',
        targetResourceId:
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
        profiles: [
          {
            name: 'Default',
            capacity: { minimum: '1', maximum: '10', default: '1' },
          },
        ],
      });

      expect(autoscale.resourceType).toBe('Microsoft.Insights/autoscaleSettings');
    });

    it('should set correct API version', () => {
      const autoscale = new ArmAutoscaleSetting(stack, 'Autoscale', {
        name: 'autoscale-appplan',
        location: 'eastus',
        targetResourceId:
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
        profiles: [
          {
            name: 'Default',
            capacity: { minimum: '1', maximum: '10', default: '1' },
          },
        ],
      });

      expect(autoscale.apiVersion).toBe('2022-10-01');
    });

    it('should support disabled autoscale', () => {
      const autoscale = new ArmAutoscaleSetting(stack, 'Autoscale', {
        name: 'autoscale-appplan',
        location: 'eastus',
        targetResourceId:
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
        enabled: false,
        profiles: [
          {
            name: 'Default',
            capacity: { minimum: '1', maximum: '10', default: '1' },
          },
        ],
      });

      expect(autoscale.enabled).toBe(false);
    });
  });

  describe('validation', () => {
    it('should throw error for empty autoscale setting name', () => {
      expect(() => {
        new ArmAutoscaleSetting(stack, 'Autoscale', {
          name: '',
          location: 'eastus',
          targetResourceId:
            '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
          profiles: [
            {
              name: 'Default',
              capacity: { minimum: '1', maximum: '10', default: '1' },
            },
          ],
        });
      }).toThrow(/name cannot be empty/);
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmAutoscaleSetting(stack, 'Autoscale', {
          name: 'autoscale-appplan',
          location: '',
          targetResourceId:
            '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
          profiles: [
            {
              name: 'Default',
              capacity: { minimum: '1', maximum: '10', default: '1' },
            },
          ],
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error for empty target resource ID', () => {
      expect(() => {
        new ArmAutoscaleSetting(stack, 'Autoscale', {
          name: 'autoscale-appplan',
          location: 'eastus',
          targetResourceId: '',
          profiles: [
            {
              name: 'Default',
              capacity: { minimum: '1', maximum: '10', default: '1' },
            },
          ],
        });
      }).toThrow(/Target resource ID cannot be empty/);
    });

    it('should throw error for empty profiles', () => {
      expect(() => {
        new ArmAutoscaleSetting(stack, 'Autoscale', {
          name: 'autoscale-appplan',
          location: 'eastus',
          targetResourceId:
            '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
          profiles: [],
        });
      }).toThrow(/At least one profile must be provided/);
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template', () => {
      const autoscale = new ArmAutoscaleSetting(stack, 'Autoscale', {
        name: 'autoscale-appplan',
        location: 'eastus',
        targetResourceId:
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test',
        profiles: [
          {
            name: 'Default',
            capacity: {
              minimum: '1',
              maximum: '10',
              default: '1',
            },
          },
        ],
      });

      const template: any = autoscale.toArmTemplate();

      expect(template.type).toBe('Microsoft.Insights/autoscaleSettings');
      expect(template.apiVersion).toBe('2022-10-01');
      expect(template.name).toBe('autoscale-appplan');
      expect(template.location).toBe('eastus');
      expect(template.properties.enabled).toBe(true);
      expect(template.properties.targetResourceUri).toBe(
        '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/serverFarms/plan-test'
      );
      expect(template.properties.profiles).toHaveLength(1);
    });
  });
});
