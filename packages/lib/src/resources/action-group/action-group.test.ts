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
import { ActionGroup } from './action-group';

describe('resources/action-group/ActionGroup', () => {
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
    it('should create action group with minimal properties', () => {
      const actionGroup = new ActionGroup(resourceGroup, 'Alerts', {
        groupShortName: 'alerts',
        emailReceivers: [
          {
            name: 'admin',
            emailAddress: 'admin@example.com',
          },
        ],
      });

      expect(actionGroup.actionGroupName).toBeDefined();
      expect(actionGroup.groupShortName).toBe('alerts');
      expect(actionGroup.location).toBe('Global');
    });

    it('should create action group with custom name', () => {
      const actionGroup = new ActionGroup(resourceGroup, 'Alerts', {
        actionGroupName: 'ag-custom',
        groupShortName: 'custom',
        emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
      });

      expect(actionGroup.actionGroupName).toBe('ag-custom');
    });

    it('should merge tags with parent', () => {
      const actionGroup = new ActionGroup(resourceGroup, 'Alerts', {
        groupShortName: 'alerts',
        emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
        tags: { purpose: 'monitoring' },
      });

      expect(actionGroup.tags).toEqual({
        environment: 'nonprod',
        purpose: 'monitoring',
      });
    });

    it('should support multiple receiver types', () => {
      const actionGroup = new ActionGroup(resourceGroup, 'Alerts', {
        groupShortName: 'ops',
        emailReceivers: [
          { name: 'ops-team', emailAddress: 'ops@example.com', useCommonAlertSchema: true },
        ],
        smsReceivers: [{ name: 'on-call', countryCode: '1', phoneNumber: '5551234567' }],
        webhookReceivers: [
          { name: 'slack', serviceUri: 'https://hooks.slack.com/test', useCommonAlertSchema: true },
        ],
      });

      expect(actionGroup.groupShortName).toBe('ops');
    });

    it('should throw error if not created under ResourceGroup', () => {
      expect(() => {
        new ActionGroup(stack, 'Alerts', {
          groupShortName: 'alerts',
          emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
        });
      }).toThrow(/must be created within or under a ResourceGroup/);
    });
  });

  describe('fromActionGroupId', () => {
    it('should create reference from resource ID', () => {
      const actionGroup = ActionGroup.fromActionGroupId(
        resourceGroup,
        'ExistingActionGroup',
        '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Insights/actionGroups/ag-existing'
      );

      expect(actionGroup.actionGroupName).toBe('ag-existing');
      expect(actionGroup.actionGroupId).toBe(
        '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Insights/actionGroups/ag-existing'
      );
    });
  });
});
