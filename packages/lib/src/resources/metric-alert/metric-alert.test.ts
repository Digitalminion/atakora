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
import { ActionGroup } from '../action-group/action-group';
import { MetricAlert } from './metric-alert';
import { MetricAlertOperator, TimeAggregation } from './types';

describe('resources/metric-alert/MetricAlert', () => {
  let app: App;
  let stack: SubscriptionStack;
  let rgStack: ResourceGroupStack;
  let resourceGroup: ResourceGroup;
  let actionGroup: ActionGroup;

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

    actionGroup = new ActionGroup(resourceGroup, 'Alerts', {
      groupShortName: 'alerts',
      emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
    });
  });

  describe('constructor', () => {
    it('should create metric alert with simplified interface', () => {
      const alert = new MetricAlert(resourceGroup, 'CpuAlert', {
        scopes: [
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        ],
        metricName: 'CpuPercentage',
        operator: MetricAlertOperator.GREATER_THAN,
        threshold: 80,
        timeAggregation: TimeAggregation.AVERAGE,
        severity: 2,
        actionGroup,
      });

      expect(alert.name).toBeDefined();
      expect(alert.location).toBe('Global');
      expect(alert.severity).toBe(2);
      expect(alert.enabled).toBe(true);
    });

    it('should create metric alert with custom name', () => {
      const alert = new MetricAlert(resourceGroup, 'CpuAlert', {
        name: 'alert-custom-cpu',
        scopes: [
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        ],
        metricName: 'CpuPercentage',
        operator: MetricAlertOperator.GREATER_THAN,
        threshold: 80,
        timeAggregation: TimeAggregation.AVERAGE,
        severity: 2,
        actionGroup,
      });

      expect(alert.name).toBe('alert-custom-cpu');
    });

    it('should merge tags with parent', () => {
      const alert = new MetricAlert(resourceGroup, 'CpuAlert', {
        scopes: [
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        ],
        metricName: 'CpuPercentage',
        operator: MetricAlertOperator.GREATER_THAN,
        threshold: 80,
        timeAggregation: TimeAggregation.AVERAGE,
        severity: 2,
        actionGroup,
        tags: { purpose: 'monitoring' },
      });

      expect(alert.tags).toEqual({
        environment: 'nonprod',
        purpose: 'monitoring',
      });
    });

    it('should create metric alert with custom evaluation frequency and window', () => {
      const alert = new MetricAlert(resourceGroup, 'CpuAlert', {
        scopes: [
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        ],
        metricName: 'CpuPercentage',
        operator: MetricAlertOperator.GREATER_THAN,
        threshold: 80,
        timeAggregation: TimeAggregation.AVERAGE,
        severity: 2,
        actionGroup,
        evaluationFrequency: 'PT5M',
        windowSize: 'PT15M',
      });

      expect(alert.evaluationFrequency).toBe('PT5M');
      expect(alert.windowSize).toBe('PT15M');
    });

    it('should throw error if not created under ResourceGroup', () => {
      expect(() => {
        new MetricAlert(stack, 'Alert', {
          scopes: [
            '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
          ],
          metricName: 'CpuPercentage',
          operator: MetricAlertOperator.GREATER_THAN,
          threshold: 80,
          timeAggregation: TimeAggregation.AVERAGE,
          severity: 2,
          actionGroup,
        });
      }).toThrow(/must be created within or under a ResourceGroup/);
    });
  });

  describe('fromMetricAlertId', () => {
    it('should create reference from resource ID', () => {
      const alert = MetricAlert.fromMetricAlertId(
        resourceGroup,
        'ExistingAlert',
        '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Insights/metricAlerts/alert-existing'
      );

      expect(alert.name).toBe('alert-existing');
      expect(alert.metricAlertId).toBe(
        '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Insights/metricAlerts/alert-existing'
      );
    });
  });
});
