import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmApplicationInsights } from './arm-application-insights';
import { ApplicationType, FlowType, PublicNetworkAccess } from './types';
import type { ArmApplicationInsightsProps } from './types';

describe('resources/application-insights/ArmApplicationInsights', () => {
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
    it('should create Application Insights with required properties', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
      });

      expect(appInsights.name).toBe('appi-test-001');
      expect(appInsights.location).toBe('eastus');
      expect(appInsights.kind).toBe('web');
      expect(appInsights.applicationType).toBe('web');
      expect(appInsights.tags).toEqual({});
    });

    it('should create Application Insights with workspace resource ID', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        workspaceResourceId:
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/log-test',
      });

      expect(appInsights.workspaceResourceId).toBe(
        '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/log-test'
      );
    });

    it('should create Application Insights with retention days', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        retentionInDays: 90,
      });

      expect(appInsights.retentionInDays).toBe(90);
    });

    it('should create Application Insights with flow type and request source', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        flowType: FlowType.REDFLAG,
        requestSource: 'rest',
      });

      expect(appInsights.flowType).toBe('RedFlag');
      expect(appInsights.requestSource).toBe('rest');
    });

    it('should create Application Insights with sampling percentage', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        samplingPercentage: 50,
      });

      expect(appInsights.samplingPercentage).toBe(50);
    });

    it('should create Application Insights with tags', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        tags: {
          environment: 'nonprod',
          purpose: 'monitoring',
        },
      });

      expect(appInsights.tags).toEqual({
        environment: 'nonprod',
        purpose: 'monitoring',
      });
    });

    it('should set correct resource type', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
      });

      expect(appInsights.resourceType).toBe('Microsoft.Insights/components');
    });

    it('should set correct API version', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
      });

      expect(appInsights.apiVersion).toBe('2020-02-02');
    });

    it('should generate resource ID', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
      });

      expect(appInsights.resourceId).toContain('/components/appi-test-001');
    });

    it('should have ResourceGroup deployment scope', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
      });

      expect(appInsights.scope).toBe('resourceGroup');
    });

    it('should create Application Insights with public network access settings', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
        publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
      });

      expect(appInsights.publicNetworkAccessForIngestion).toBe('Disabled');
      expect(appInsights.publicNetworkAccessForQuery).toBe('Disabled');
    });

    it('should create Application Insights with local auth disabled', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        disableLocalAuth: true,
      });

      expect(appInsights.disableLocalAuth).toBe(true);
    });

    it('should create Application Insights with IP masking disabled', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        disableIpMasking: true,
      });

      expect(appInsights.disableIpMasking).toBe(true);
    });
  });

  describe('validation', () => {
    it('should throw error for empty component name', () => {
      expect(() => {
        new ArmApplicationInsights(stack, 'AppInsights', {
          name: '',
          location: 'eastus',
          kind: 'web',
          applicationType: ApplicationType.WEB,
        });
      }).toThrow(/component name cannot be empty/);
    });

    it('should throw error for component name exceeding 260 characters', () => {
      expect(() => {
        new ArmApplicationInsights(stack, 'AppInsights', {
          name: 'a'.repeat(261),
          location: 'eastus',
          kind: 'web',
          applicationType: ApplicationType.WEB,
        });
      }).toThrow(/must not exceed 260 characters/);
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmApplicationInsights(stack, 'AppInsights', {
          name: 'appi-test-001',
          location: '',
          kind: 'web',
          applicationType: ApplicationType.WEB,
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error for empty kind', () => {
      expect(() => {
        new ArmApplicationInsights(stack, 'AppInsights', {
          name: 'appi-test-001',
          location: 'eastus',
          kind: '',
          applicationType: ApplicationType.WEB,
        });
      }).toThrow(/Kind cannot be empty/);
    });

    it('should throw error when application type is not provided', () => {
      expect(() => {
        new ArmApplicationInsights(stack, 'AppInsights', {
          name: 'appi-test-001',
          location: 'eastus',
          kind: 'web',
        } as any);
      }).toThrow(/Application type must be provided/);
    });

    it('should throw error for invalid retention days', () => {
      expect(() => {
        new ArmApplicationInsights(stack, 'AppInsights', {
          name: 'appi-test-001',
          location: 'eastus',
          kind: 'web',
          applicationType: ApplicationType.WEB,
          retentionInDays: 45,
        });
      }).toThrow(/Retention in days must be one of/);
    });

    it('should accept valid retention days', () => {
      const validRetentions = [30, 60, 90, 120, 180, 270, 365, 550, 730];

      validRetentions.forEach((retention) => {
        const appInsights = new ArmApplicationInsights(stack, `AppInsights-${retention}`, {
          name: `appi-test-${retention}`,
          location: 'eastus',
          kind: 'web',
          applicationType: ApplicationType.WEB,
          retentionInDays: retention,
        });

        expect(appInsights.retentionInDays).toBe(retention);
      });
    });

    it('should throw error for sampling percentage below 0', () => {
      expect(() => {
        new ArmApplicationInsights(stack, 'AppInsights', {
          name: 'appi-test-001',
          location: 'eastus',
          kind: 'web',
          applicationType: ApplicationType.WEB,
          samplingPercentage: -1,
        });
      }).toThrow(/Sampling percentage must be between 0 and 100/);
    });

    it('should throw error for sampling percentage above 100', () => {
      expect(() => {
        new ArmApplicationInsights(stack, 'AppInsights', {
          name: 'appi-test-001',
          location: 'eastus',
          kind: 'web',
          applicationType: ApplicationType.WEB,
          samplingPercentage: 101,
        });
      }).toThrow(/Sampling percentage must be between 0 and 100/);
    });

    it('should accept valid sampling percentages', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        samplingPercentage: 50,
      });

      expect(appInsights.samplingPercentage).toBe(50);
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with minimal properties', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
      });

      const template: any = appInsights.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Insights/components',
        apiVersion: '2020-02-02',
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        tags: undefined,
        properties: {
          Application_Type: 'web',
        },
      });
    });

    it('should generate ARM template with workspace resource ID', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        workspaceResourceId:
          '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/log-test',
      });

      const template: any = appInsights.toArmTemplate();

      expect(template.properties.WorkspaceResourceId).toBe(
        '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/log-test'
      );
    });

    it('should generate ARM template with flow type and request source', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        flowType: FlowType.REDFLAG,
        requestSource: 'rest',
      });

      const template: any = appInsights.toArmTemplate();

      expect(template.properties.Flow_Type).toBe('RedFlag');
      expect(template.properties.Request_Source).toBe('rest');
    });

    it('should generate ARM template with retention days', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        retentionInDays: 90,
      });

      const template: any = appInsights.toArmTemplate();

      expect(template.properties.RetentionInDays).toBe(90);
    });

    it('should generate ARM template with sampling percentage', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        samplingPercentage: 50,
      });

      const template: any = appInsights.toArmTemplate();

      expect(template.properties.SamplingPercentage).toBe(50);
    });

    it('should generate ARM template with public network access settings', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
        publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
      });

      const template: any = appInsights.toArmTemplate();

      expect(template.properties.publicNetworkAccessForIngestion).toBe('Disabled');
      expect(template.properties.publicNetworkAccessForQuery).toBe('Disabled');
    });

    it('should generate ARM template with tags', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        tags: {
          purpose: 'monitoring',
        },
      });

      const template: any = appInsights.toArmTemplate();

      expect(template.tags).toEqual({ purpose: 'monitoring' });
    });

    it('should generate ARM template with local auth and IP masking disabled', () => {
      const appInsights = new ArmApplicationInsights(stack, 'AppInsights', {
        name: 'appi-test-001',
        location: 'eastus',
        kind: 'web',
        applicationType: ApplicationType.WEB,
        disableLocalAuth: true,
        disableIpMasking: true,
      });

      const template: any = appInsights.toArmTemplate();

      expect(template.properties.DisableLocalAuth).toBe(true);
      expect(template.properties.DisableIpMasking).toBe(true);
    });
  });
});
