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
import { LogAnalyticsWorkspace } from './log-analytics-workspace';
import { WorkspaceSku, PublicNetworkAccess } from './types';

describe('resources/log-analytics-workspace/LogAnalyticsWorkspace', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-minion'),
      project: new Project('authr'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
      tags: {
        managed_by: 'terraform',
      },
    });
    resourceGroup = new ResourceGroup(stack, 'MonitoringRG');
  });

  describe('constructor', () => {
    it('should create workspace with auto-generated name', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace');

      // Should auto-generate name using stack context
      expect(workspace.workspaceName).toContain('log-');
      expect(workspace.workspaceName).toContain('dp'); // digital-minion abbreviation
      expect(workspace.workspaceName).toContain('authr');
      expect(workspace.workspaceName).toContain('mainworkspace'); // purpose from ID
    });

    it('should use provided workspace name when specified', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
        workspaceName: 'my-custom-workspace',
      });

      expect(workspace.workspaceName).toBe('my-custom-workspace');
    });

    it('should default location to resource group location', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace');

      expect(workspace.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
        location: 'westus2',
      });

      expect(workspace.location).toBe('westus2');
    });

    it('should set resource group name from parent', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace');

      expect(workspace.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should merge tags with parent', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
        tags: {
          purpose: 'monitoring',
        },
      });

      expect(workspace.tags).toMatchObject({
        managed_by: 'terraform',
        purpose: 'monitoring',
      });
    });

    it('should default SKU to PerGB2018', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace');

      expect(workspace.sku).toBe('PerGB2018');
    });

    it('should use provided SKU when specified', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
        sku: WorkspaceSku.STANDALONE,
      });

      expect(workspace.sku).toBe('Standalone');
    });

    it('should default retention to 30 days', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace');

      expect(workspace.retentionInDays).toBe(30);
    });

    it('should use provided retention when specified', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
        retentionInDays: 90,
      });

      expect(workspace.retentionInDays).toBe(90);
    });

    it('should create workspace with daily quota', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
        dailyQuotaGb: 10,
      });

      expect(workspace.workspaceName).toContain('log-');
    });

    it('should create workspace with public network access settings', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
        publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
        publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
      });

      expect(workspace.workspaceName).toContain('log-');
    });

    it('should create workspace with local auth disabled', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
        disableLocalAuth: true,
      });

      expect(workspace.workspaceName).toContain('log-');
    });

    it('should generate resource ID', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace');

      expect(workspace.workspaceId).toBeDefined();
      expect(workspace.workspaceId).toContain('/workspaces/');
    });
  });

  describe('auto-naming with different IDs', () => {
    it('should convert PascalCase ID to lowercase purpose', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MonitoringWorkspace');

      expect(workspace.workspaceName).toContain('monitoringworkspace');
    });

    it('should convert camelCase ID to lowercase purpose', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'monitoringWorkspace');

      expect(workspace.workspaceName).toContain('monitoringworkspace');
    });

    it('should handle simple lowercase IDs', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'monitoring');

      expect(workspace.workspaceName).toContain('monitoring');
    });

    it('should handle hyphenated IDs', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'monitoring-logs');

      expect(workspace.workspaceName).toContain('monitoring-logs');
    });
  });

  describe('parent validation', () => {
    it('should throw error when not created within ResourceGroup', () => {
      expect(() => {
        new LogAnalyticsWorkspace(stack, 'Workspace');
      }).toThrow(/LogAnalyticsWorkspace must be created within or under a ResourceGroup/);
    });

    it('should work when created directly within ResourceGroup', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'Workspace');

      expect(workspace.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });
  });

  describe('integration with underlying L1', () => {
    it('should create L1 construct with correct properties', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
        workspaceName: 'log-custom',
        location: 'westus2',
        sku: WorkspaceSku.PER_GB_2018,
        retentionInDays: 90,
        tags: { purpose: 'monitoring' },
      });

      expect(workspace.workspaceName).toBe('log-custom');
      expect(workspace.location).toBe('westus2');
      expect(workspace.sku).toBe('PerGB2018');
      expect(workspace.retentionInDays).toBe(90);
    });

    it('should pass daily quota to L1 construct', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
        dailyQuotaGb: 10,
      });

      expect(workspace.workspaceId).toBeDefined();
    });

    it('should pass public network access settings to L1 construct', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace', {
        publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
        publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
      });

      expect(workspace.workspaceId).toBeDefined();
    });
  });

  describe('multiple workspaces', () => {
    it('should allow creating multiple workspaces with different IDs', () => {
      const mainWorkspace = new LogAnalyticsWorkspace(resourceGroup, 'MainWorkspace');
      const auditWorkspace = new LogAnalyticsWorkspace(resourceGroup, 'AuditWorkspace');
      const securityWorkspace = new LogAnalyticsWorkspace(resourceGroup, 'SecurityWorkspace');

      // All should have unique auto-generated names
      expect(mainWorkspace.workspaceName).not.toBe(auditWorkspace.workspaceName);
      expect(mainWorkspace.workspaceName).not.toBe(securityWorkspace.workspaceName);
      expect(auditWorkspace.workspaceName).not.toBe(securityWorkspace.workspaceName);

      // All should reference the same resource group
      expect(mainWorkspace.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(auditWorkspace.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(securityWorkspace.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should allow creating multiple workspaces with explicit names', () => {
      const mainWorkspace = new LogAnalyticsWorkspace(resourceGroup, 'Main', {
        workspaceName: 'log-main-001',
      });

      const auditWorkspace = new LogAnalyticsWorkspace(resourceGroup, 'Audit', {
        workspaceName: 'log-audit-001',
      });

      expect(mainWorkspace.workspaceName).toBe('log-main-001');
      expect(auditWorkspace.workspaceName).toBe('log-audit-001');
    });
  });

  describe('SKU options', () => {
    it('should support Free SKU', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'FreeWorkspace', {
        sku: WorkspaceSku.FREE,
      });

      expect(workspace.sku).toBe('Free');
    });

    it('should support Standard SKU', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'StandardWorkspace', {
        sku: WorkspaceSku.STANDARD,
      });

      expect(workspace.sku).toBe('Standard');
    });

    it('should support Premium SKU', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'PremiumWorkspace', {
        sku: WorkspaceSku.PREMIUM,
      });

      expect(workspace.sku).toBe('Premium');
    });

    it('should support PerNode SKU', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'PerNodeWorkspace', {
        sku: WorkspaceSku.PER_NODE,
      });

      expect(workspace.sku).toBe('PerNode');
    });

    it('should support CapacityReservation SKU', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'CapacityWorkspace', {
        sku: WorkspaceSku.CAPACITY_RESERVATION,
      });

      expect(workspace.sku).toBe('CapacityReservation');
    });
  });

  describe('retention options', () => {
    it('should support 7 days retention', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'Workspace', {
        retentionInDays: 7,
      });

      expect(workspace.retentionInDays).toBe(7);
    });

    it('should support 730 days retention', () => {
      const workspace = new LogAnalyticsWorkspace(resourceGroup, 'Workspace', {
        retentionInDays: 730,
      });

      expect(workspace.retentionInDays).toBe(730);
    });

    it('should support common retention periods', () => {
      const retentionPeriods = [30, 60, 90, 120, 180, 365];

      retentionPeriods.forEach((days) => {
        const workspace = new LogAnalyticsWorkspace(resourceGroup, `Workspace${days}`, {
          retentionInDays: days,
        });

        expect(workspace.retentionInDays).toBe(days);
      });
    });
  });
});
