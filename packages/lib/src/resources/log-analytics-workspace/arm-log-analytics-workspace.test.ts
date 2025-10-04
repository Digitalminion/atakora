import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmLogAnalyticsWorkspace } from './arm-log-analytics-workspace';
import { WorkspaceSku, PublicNetworkAccess } from './types';
import type { ArmLogAnalyticsWorkspaceProps } from './types';

describe('resources/log-analytics-workspace/ArmLogAnalyticsWorkspace', () => {
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
    it('should create workspace with required properties', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
      });

      expect(workspace.workspaceName).toBe('log-test-001');
      expect(workspace.name).toBe('log-test-001');
      expect(workspace.location).toBe('eastus');
      expect(workspace.sku.name).toBe('PerGB2018');
      expect(workspace.tags).toEqual({});
    });

    it('should create workspace with retention days', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
        retentionInDays: 90,
      });

      expect(workspace.retentionInDays).toBe(90);
    });

    it('should create workspace with daily quota', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
        workspaceCapping: {
          dailyQuotaGb: 10,
        },
      });

      expect(workspace.workspaceCapping?.dailyQuotaGb).toBe(10);
    });

    it('should create workspace with capacity reservation SKU', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.CAPACITY_RESERVATION,
          capacityReservationLevel: 100,
        },
      });

      expect(workspace.sku.name).toBe('CapacityReservation');
      expect(workspace.sku.capacityReservationLevel).toBe(100);
    });

    it('should create workspace with tags', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
        tags: {
          environment: 'nonprod',
          purpose: 'monitoring',
        },
      });

      expect(workspace.tags).toEqual({
        environment: 'nonprod',
        purpose: 'monitoring',
      });
    });

    it('should set correct resource type', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
      });

      expect(workspace.resourceType).toBe('Microsoft.OperationalInsights/workspaces');
    });

    it('should set correct API version', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
      });

      expect(workspace.apiVersion).toBe('2023-09-01');
    });

    it('should generate resource ID', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
      });

      expect(workspace.resourceId).toContain('/workspaces/log-test-001');
      expect(workspace.workspaceId).toBe(workspace.resourceId);
    });

    it('should have ResourceGroup deployment scope', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
      });

      expect(workspace.scope).toBe('resourceGroup');
    });

    it('should create workspace with public network access settings', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
        publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
        publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
      });

      expect(workspace.publicNetworkAccessForIngestion).toBe('Disabled');
      expect(workspace.publicNetworkAccessForQuery).toBe('Disabled');
    });

    it('should create workspace with local auth disabled', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
        disableLocalAuth: true,
      });

      expect(workspace.disableLocalAuth).toBe(true);
    });
  });

  describe('validation', () => {
    it('should throw error for empty workspace name', () => {
      expect(() => {
        new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
          workspaceName: '',
          location: 'eastus',
          sku: {
            name: WorkspaceSku.PER_GB_2018,
          },
        });
      }).toThrow(/Workspace name cannot be empty/);
    });

    it('should throw error for workspace name shorter than 4 characters', () => {
      expect(() => {
        new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
          workspaceName: 'log',
          location: 'eastus',
          sku: {
            name: WorkspaceSku.PER_GB_2018,
          },
        });
      }).toThrow(/Workspace name must be 4-63 characters/);
    });

    it('should throw error for workspace name longer than 63 characters', () => {
      expect(() => {
        new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
          workspaceName: 'a'.repeat(64),
          location: 'eastus',
          sku: {
            name: WorkspaceSku.PER_GB_2018,
          },
        });
      }).toThrow(/Workspace name must be 4-63 characters/);
    });

    it('should accept workspace name at exactly 4 characters', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log1',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
      });

      expect(workspace.workspaceName).toBe('log1');
    });

    it('should accept workspace name at exactly 63 characters', () => {
      const name = 'a' + 'b'.repeat(61) + 'c';
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: name,
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
      });

      expect(workspace.workspaceName).toBe(name);
    });

    it('should throw error for workspace name not starting with alphanumeric', () => {
      expect(() => {
        new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
          workspaceName: '-log-test',
          location: 'eastus',
          sku: {
            name: WorkspaceSku.PER_GB_2018,
          },
        });
      }).toThrow(/must start and end with alphanumeric/);
    });

    it('should throw error for workspace name not ending with alphanumeric', () => {
      expect(() => {
        new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
          workspaceName: 'log-test-',
          location: 'eastus',
          sku: {
            name: WorkspaceSku.PER_GB_2018,
          },
        });
      }).toThrow(/must start and end with alphanumeric/);
    });

    it('should accept valid workspace names', () => {
      const validNames = [
        'log-analytics-001',
        'LogAnalytics123',
        'log123',
        'my-log-workspace-01',
      ];

      validNames.forEach((name) => {
        const workspace = new ArmLogAnalyticsWorkspace(stack, `WS-${name}`, {
          workspaceName: name,
          location: 'eastus',
          sku: {
            name: WorkspaceSku.PER_GB_2018,
          },
        });

        expect(workspace.workspaceName).toBe(name);
      });
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
          workspaceName: 'log-test-001',
          location: '',
          sku: {
            name: WorkspaceSku.PER_GB_2018,
          },
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error when SKU is not provided', () => {
      expect(() => {
        new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
          workspaceName: 'log-test-001',
          location: 'eastus',
        } as any);
      }).toThrow(/SKU must be provided/);
    });

    it('should throw error for retention days below 7', () => {
      expect(() => {
        new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
          workspaceName: 'log-test-001',
          location: 'eastus',
          sku: {
            name: WorkspaceSku.PER_GB_2018,
          },
          retentionInDays: 6,
        });
      }).toThrow(/Retention in days must be between 7 and 730/);
    });

    it('should throw error for retention days above 730', () => {
      expect(() => {
        new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
          workspaceName: 'log-test-001',
          location: 'eastus',
          sku: {
            name: WorkspaceSku.PER_GB_2018,
          },
          retentionInDays: 731,
        });
      }).toThrow(/Retention in days must be between 7 and 730/);
    });

    it('should accept valid retention days range', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
        retentionInDays: 30,
      });

      expect(workspace.retentionInDays).toBe(30);
    });

    it('should throw error for invalid daily quota', () => {
      expect(() => {
        new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
          workspaceName: 'log-test-001',
          location: 'eastus',
          sku: {
            name: WorkspaceSku.PER_GB_2018,
          },
          workspaceCapping: {
            dailyQuotaGb: -2,
          },
        });
      }).toThrow(/Daily quota GB must be -1 \(unlimited\) or a positive number/);
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with minimal properties', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
      });

      const template: any = workspace.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.OperationalInsights/workspaces',
        apiVersion: '2023-09-01',
        name: 'log-test-001',
        location: 'eastus',
        tags: undefined,
        properties: {
          sku: {
            name: 'PerGB2018',
          },
        },
      });
    });

    it('should generate ARM template with retention days', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
        retentionInDays: 90,
      });

      const template: any = workspace.toArmTemplate();

      expect(template.properties.retentionInDays).toBe(90);
    });

    it('should generate ARM template with workspace capping', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
        workspaceCapping: {
          dailyQuotaGb: 10,
        },
      });

      const template: any = workspace.toArmTemplate();

      expect(template.properties.workspaceCapping).toEqual({
        dailyQuotaGb: 10,
      });
    });

    it('should generate ARM template with public network access settings', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
        publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
        publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
      });

      const template: any = workspace.toArmTemplate();

      expect(template.properties.publicNetworkAccessForIngestion).toBe('Disabled');
      expect(template.properties.publicNetworkAccessForQuery).toBe('Disabled');
    });

    it('should generate ARM template with tags', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
        tags: {
          purpose: 'monitoring',
        },
      });

      const template: any = workspace.toArmTemplate();

      expect(template.tags).toEqual({ purpose: 'monitoring' });
    });

    it('should generate ARM template with local auth disabled', () => {
      const workspace = new ArmLogAnalyticsWorkspace(stack, 'Workspace', {
        workspaceName: 'log-test-001',
        location: 'eastus',
        sku: {
          name: WorkspaceSku.PER_GB_2018,
        },
        disableLocalAuth: true,
      });

      const template: any = workspace.toArmTemplate();

      expect(template.properties.features.disableLocalAuth).toBe(true);
    });
  });
});
