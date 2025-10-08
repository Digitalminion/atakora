import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmActionGroup } from './arm-action-group';
import type { ArmActionGroupProps } from './types';

describe('resources/action-group/ArmActionGroup', () => {
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
    it('should create action group with email receiver', () => {
      const actionGroup = new ArmActionGroup(stack, 'ActionGroup', {
        actionGroupName: 'ag-alerts',
        location: 'Global',
        groupShortName: 'alerts',
        emailReceivers: [
          {
            name: 'admin',
            emailAddress: 'admin@example.com',
            useCommonAlertSchema: true,
          },
        ],
      });

      expect(actionGroup.actionGroupName).toBe('ag-alerts');
      expect(actionGroup.location).toBe('Global');
      expect(actionGroup.groupShortName).toBe('alerts');
      expect(actionGroup.enabled).toBe(true);
      expect(actionGroup.emailReceivers).toHaveLength(1);
    });

    it('should create action group with SMS receiver', () => {
      const actionGroup = new ArmActionGroup(stack, 'ActionGroup', {
        actionGroupName: 'ag-alerts',
        location: 'Global',
        groupShortName: 'alerts',
        smsReceivers: [
          {
            name: 'on-call',
            countryCode: '1',
            phoneNumber: '5551234567',
          },
        ],
      });

      expect(actionGroup.smsReceivers).toHaveLength(1);
    });

    it('should create action group with webhook receiver', () => {
      const actionGroup = new ArmActionGroup(stack, 'ActionGroup', {
        actionGroupName: 'ag-alerts',
        location: 'Global',
        groupShortName: 'alerts',
        webhookReceivers: [
          {
            name: 'slack',
            serviceUri: 'https://hooks.slack.com/test',
            useCommonAlertSchema: true,
          },
        ],
      });

      expect(actionGroup.webhookReceivers).toHaveLength(1);
    });

    it('should create action group with multiple receiver types', () => {
      const actionGroup = new ArmActionGroup(stack, 'ActionGroup', {
        actionGroupName: 'ag-alerts',
        location: 'Global',
        groupShortName: 'alerts',
        emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
        smsReceivers: [{ name: 'on-call', countryCode: '1', phoneNumber: '5551234567' }],
        webhookReceivers: [{ name: 'slack', serviceUri: 'https://hooks.slack.com/test' }],
      });

      expect(actionGroup.emailReceivers).toHaveLength(1);
      expect(actionGroup.smsReceivers).toHaveLength(1);
      expect(actionGroup.webhookReceivers).toHaveLength(1);
    });

    it('should set correct resource type', () => {
      const actionGroup = new ArmActionGroup(stack, 'ActionGroup', {
        actionGroupName: 'ag-alerts',
        location: 'Global',
        groupShortName: 'alerts',
        emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
      });

      expect(actionGroup.resourceType).toBe('Microsoft.Insights/actionGroups');
    });

    it('should set correct API version', () => {
      const actionGroup = new ArmActionGroup(stack, 'ActionGroup', {
        actionGroupName: 'ag-alerts',
        location: 'Global',
        groupShortName: 'alerts',
        emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
      });

      expect(actionGroup.apiVersion).toBe('2023-01-01');
    });

    it('should generate resource ID', () => {
      const actionGroup = new ArmActionGroup(stack, 'ActionGroup', {
        actionGroupName: 'ag-alerts',
        location: 'Global',
        groupShortName: 'alerts',
        emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
      });

      expect(actionGroup.resourceId).toContain('/actionGroups/ag-alerts');
      expect(actionGroup.actionGroupId).toBe(actionGroup.resourceId);
    });

    it('should support disabled action group', () => {
      const actionGroup = new ArmActionGroup(stack, 'ActionGroup', {
        actionGroupName: 'ag-alerts',
        location: 'Global',
        groupShortName: 'alerts',
        enabled: false,
        emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
      });

      expect(actionGroup.enabled).toBe(false);
    });
  });

  describe('validation', () => {
    it('should throw error for empty action group name', () => {
      expect(() => {
        new ArmActionGroup(stack, 'ActionGroup', {
          actionGroupName: '',
          location: 'Global',
          groupShortName: 'alerts',
          emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
        });
      }).toThrow(/Action group name cannot be empty/);
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmActionGroup(stack, 'ActionGroup', {
          actionGroupName: 'ag-alerts',
          location: '',
          groupShortName: 'alerts',
          emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error for empty group short name', () => {
      expect(() => {
        new ArmActionGroup(stack, 'ActionGroup', {
          actionGroupName: 'ag-alerts',
          location: 'Global',
          groupShortName: '',
          emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
        });
      }).toThrow(/Group short name cannot be empty/);
    });

    it('should throw error for group short name exceeding 12 characters', () => {
      expect(() => {
        new ArmActionGroup(stack, 'ActionGroup', {
          actionGroupName: 'ag-alerts',
          location: 'Global',
          groupShortName: 'verylongshortname',
          emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
        });
      }).toThrow(/must be 12 characters or less/);
    });

    it('should throw error when no receivers configured', () => {
      expect(() => {
        new ArmActionGroup(stack, 'ActionGroup', {
          actionGroupName: 'ag-alerts',
          location: 'Global',
          groupShortName: 'alerts',
        });
      }).toThrow(/At least one receiver must be configured/);
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with email receiver', () => {
      const actionGroup = new ArmActionGroup(stack, 'ActionGroup', {
        actionGroupName: 'ag-alerts',
        location: 'Global',
        groupShortName: 'alerts',
        emailReceivers: [
          {
            name: 'admin',
            emailAddress: 'admin@example.com',
            useCommonAlertSchema: true,
          },
        ],
      });

      const template: any = actionGroup.toArmTemplate();

      expect(template.type).toBe('Microsoft.Insights/actionGroups');
      expect(template.apiVersion).toBe('2023-01-01');
      expect(template.name).toBe('ag-alerts');
      expect(template.location).toBe('Global');
      expect(template.properties.groupShortName).toBe('alerts');
      expect(template.properties.enabled).toBe(true);
      expect(template.properties.emailReceivers).toHaveLength(1);
    });

    it('should generate ARM template with multiple receivers', () => {
      const actionGroup = new ArmActionGroup(stack, 'ActionGroup', {
        actionGroupName: 'ag-alerts',
        location: 'Global',
        groupShortName: 'alerts',
        emailReceivers: [{ name: 'admin', emailAddress: 'admin@example.com' }],
        smsReceivers: [{ name: 'on-call', countryCode: '1', phoneNumber: '5551234567' }],
      });

      const template: any = actionGroup.toArmTemplate();

      expect(template.properties.emailReceivers).toHaveLength(1);
      expect(template.properties.smsReceivers).toHaveLength(1);
    });
  });
});
