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
import { ApplicationInsights } from './application-insights';
import { ApplicationType, PublicNetworkAccess } from './types';
import type { ILogAnalyticsWorkspace } from './types';

describe('resources/application-insights/ApplicationInsights', () => {
  let app: App;
  let stack: SubscriptionStack;
  let rgStack: ResourceGroupStack;
  let resourceGroup: ResourceGroup;
  let workspace: ILogAnalyticsWorkspace;

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

    // Mock workspace
    workspace = {
      workspaceName: 'log-test-001',
      workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/log-test-001',
    };
  });

  describe('constructor', () => {
    it('should create Application Insights with minimal properties', () => {
      const appInsights = new ApplicationInsights(resourceGroup, 'WebApp', {
        workspace,
      });

      expect(appInsights.name).toBeDefined();
      expect(appInsights.location).toBe('eastus');
      expect(appInsights.applicationType).toBe('web');
    });

    it('should create Application Insights with custom properties', () => {
      const appInsights = new ApplicationInsights(resourceGroup, 'ApiApp', {
        workspace,
        name: 'appi-custom-001',
        applicationType: ApplicationType.WEB,
        retentionInDays: 90,
        publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
        publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
      });

      expect(appInsights.name).toBe('appi-custom-001');
      expect(appInsights.location).toBe('eastus');
      expect(appInsights.applicationType).toBe('web');
    });

    it('should merge tags with parent', () => {
      const appInsights = new ApplicationInsights(resourceGroup, 'WebApp', {
        workspace,
        tags: { purpose: 'monitoring' },
      });

      expect(appInsights.tags).toEqual({
        environment: 'nonprod',
        purpose: 'monitoring',
      });
    });

    it('should throw error if workspace is not provided', () => {
      expect(() => {
        new ApplicationInsights(resourceGroup, 'WebApp', {} as any);
      }).toThrow(/Workspace-based Application Insights is recommended/);
    });

    it('should throw error if not created under ResourceGroup', () => {
      expect(() => {
        new ApplicationInsights(stack, 'WebApp', {
          workspace,
        });
      }).toThrow(/must be created within or under a ResourceGroup/);
    });

    it('should have instrumentation key and connection string', () => {
      const appInsights = new ApplicationInsights(resourceGroup, 'WebApp', {
        workspace,
      });

      expect(appInsights.instrumentationKey).toBeDefined();
      expect(appInsights.connectionString).toBeDefined();
    });
  });

  describe('fromResourceId', () => {
    it('should create reference from resource ID', () => {
      const appInsights = ApplicationInsights.fromResourceId(
        resourceGroup,
        'ExistingAppInsights',
        '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Insights/components/appi-existing'
      );

      expect(appInsights.name).toBe('appi-existing');
      expect(appInsights.resourceId).toBe('/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Insights/components/appi-existing');
    });
  });
});
