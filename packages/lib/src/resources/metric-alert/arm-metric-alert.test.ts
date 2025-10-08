import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmMetricAlert } from './arm-metric-alert';
import { CriterionType, MetricAlertOperator, TimeAggregation } from './types';
import type { ArmMetricAlertProps } from './types';

describe('resources/metric-alert/ArmMetricAlert', () => {
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
    it('should create metric alert with required properties', () => {
      const alert = new ArmMetricAlert(stack, 'Alert', {
        name: 'alert-cpu-high',
        location: 'Global',
        description: 'Alert when CPU exceeds 80%',
        severity: 2,
        enabled: true,
        scopes: [
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        ],
        evaluationFrequency: 'PT1M',
        windowSize: 'PT5M',
        criteria: {
          'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
          allOf: [
            {
              criterionType: CriterionType.STATIC_THRESHOLD,
              name: 'CpuPercentage',
              metricName: 'CpuPercentage',
              operator: MetricAlertOperator.GREATER_THAN,
              threshold: 80,
              timeAggregation: TimeAggregation.AVERAGE,
            },
          ],
        },
      });

      expect(alert.name).toBe('alert-cpu-high');
      expect(alert.location).toBe('Global');
      expect(alert.severity).toBe(2);
      expect(alert.enabled).toBe(true);
      expect(alert.scopes).toHaveLength(1);
    });

    it('should create metric alert with actions', () => {
      const alert = new ArmMetricAlert(stack, 'Alert', {
        name: 'alert-cpu-high',
        location: 'Global',
        severity: 2,
        enabled: true,
        scopes: [
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        ],
        evaluationFrequency: 'PT1M',
        windowSize: 'PT5M',
        criteria: {
          'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
          allOf: [
            {
              criterionType: CriterionType.STATIC_THRESHOLD,
              name: 'CpuPercentage',
              metricName: 'CpuPercentage',
              operator: MetricAlertOperator.GREATER_THAN,
              threshold: 80,
              timeAggregation: TimeAggregation.AVERAGE,
            },
          ],
        },
        actions: [
          {
            actionGroupId:
              '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Insights/actionGroups/ag-test',
            webHookProperties: {},
          },
        ],
      });

      expect(alert.actions).toHaveLength(1);
    });

    it('should set correct resource type', () => {
      const alert = new ArmMetricAlert(stack, 'Alert', {
        name: 'alert-cpu-high',
        location: 'Global',
        severity: 2,
        enabled: true,
        scopes: [
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        ],
        evaluationFrequency: 'PT1M',
        windowSize: 'PT5M',
        criteria: {
          'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
          allOf: [],
        },
      });

      expect(alert.resourceType).toBe('Microsoft.Insights/metricAlerts');
    });

    it('should set correct API version', () => {
      const alert = new ArmMetricAlert(stack, 'Alert', {
        name: 'alert-cpu-high',
        location: 'Global',
        severity: 2,
        enabled: true,
        scopes: [
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        ],
        evaluationFrequency: 'PT1M',
        windowSize: 'PT5M',
        criteria: {
          'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
          allOf: [],
        },
      });

      expect(alert.apiVersion).toBe('2018-03-01');
    });

    it('should support auto-mitigate', () => {
      const alert = new ArmMetricAlert(stack, 'Alert', {
        name: 'alert-cpu-high',
        location: 'Global',
        severity: 2,
        enabled: true,
        scopes: [
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        ],
        evaluationFrequency: 'PT1M',
        windowSize: 'PT5M',
        criteria: {
          'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
          allOf: [],
        },
        autoMitigate: true,
      });

      expect(alert.autoMitigate).toBe(true);
    });
  });

  describe('validation', () => {
    it('should throw error for empty alert name', () => {
      expect(() => {
        new ArmMetricAlert(stack, 'Alert', {
          name: '',
          location: 'Global',
          severity: 2,
          enabled: true,
          scopes: [
            '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
          ],
          evaluationFrequency: 'PT1M',
          windowSize: 'PT5M',
          criteria: {
            'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
            allOf: [],
          },
        });
      }).toThrow(/name cannot be empty/);
    });

    it('should throw error for invalid severity', () => {
      expect(() => {
        new ArmMetricAlert(stack, 'Alert', {
          name: 'alert-test',
          location: 'Global',
          severity: 5,
          enabled: true,
          scopes: [
            '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
          ],
          evaluationFrequency: 'PT1M',
          windowSize: 'PT5M',
          criteria: {
            'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
            allOf: [],
          },
        });
      }).toThrow(/Severity must be between 0 and 4/);
    });

    it('should throw error for empty scopes', () => {
      expect(() => {
        new ArmMetricAlert(stack, 'Alert', {
          name: 'alert-test',
          location: 'Global',
          severity: 2,
          enabled: true,
          scopes: [],
          evaluationFrequency: 'PT1M',
          windowSize: 'PT5M',
          criteria: {
            'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
            allOf: [],
          },
        });
      }).toThrow(/At least one scope must be provided/);
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template', () => {
      const alert = new ArmMetricAlert(stack, 'Alert', {
        name: 'alert-cpu-high',
        location: 'Global',
        description: 'CPU alert',
        severity: 2,
        enabled: true,
        scopes: [
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        ],
        evaluationFrequency: 'PT1M',
        windowSize: 'PT5M',
        criteria: {
          'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria',
          allOf: [
            {
              criterionType: CriterionType.STATIC_THRESHOLD,
              name: 'CpuPercentage',
              metricName: 'CpuPercentage',
              operator: MetricAlertOperator.GREATER_THAN,
              threshold: 80,
              timeAggregation: TimeAggregation.AVERAGE,
            },
          ],
        },
      });

      const template: any = alert.toArmTemplate();

      expect(template.type).toBe('Microsoft.Insights/metricAlerts');
      expect(template.apiVersion).toBe('2018-03-01');
      expect(template.name).toBe('alert-cpu-high');
      expect(template.location).toBe('Global');
      expect(template.properties.severity).toBe(2);
      expect(template.properties.enabled).toBe(true);
    });
  });
});
