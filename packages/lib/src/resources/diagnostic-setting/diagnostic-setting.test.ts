import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { DiagnosticSetting } from './diagnostic-setting';

describe('resources/diagnostic-setting/DiagnosticSetting', () => {
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
    it('should create diagnostic setting with all logs enabled', () => {
      const diagnostic = new DiagnosticSetting(stack, 'Diagnostic', {
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspace: {
          workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        },
        logCategories: 'all',
        enableAllMetrics: true,
      });

      expect(diagnostic.name).toBe('diagnostics');
      expect(diagnostic.resourceId).toBeDefined();
    });

    it('should create diagnostic setting with specific log categories', () => {
      const diagnostic = new DiagnosticSetting(stack, 'Diagnostic', {
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspace: {
          workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        },
        logCategories: ['AppServiceHTTPLogs', 'AppServiceConsoleLogs'],
        enableAllMetrics: true,
      });

      expect(diagnostic.name).toBe('diagnostics');
    });

    it('should create diagnostic setting with custom name', () => {
      const diagnostic = new DiagnosticSetting(stack, 'Diagnostic', {
        name: 'send-to-workspace',
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspace: {
          workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        },
        logCategories: 'all',
      });

      expect(diagnostic.name).toBe('send-to-workspace');
    });

    it('should create diagnostic setting with retention policy', () => {
      const diagnostic = new DiagnosticSetting(stack, 'Diagnostic', {
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspace: {
          workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        },
        logCategories: 'all',
        enableAllMetrics: true,
        retentionDays: 30,
      });

      expect(diagnostic.name).toBe('diagnostics');
    });

    it('should create diagnostic setting with storage account destination', () => {
      const diagnostic = new DiagnosticSetting(stack, 'Diagnostic', {
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        storageAccount: {
          storageAccountId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Storage/storageAccounts/st-test',
        },
        logCategories: 'all',
      });

      expect(diagnostic.name).toBe('diagnostics');
    });

    it('should create diagnostic setting with Event Hub destination', () => {
      const diagnostic = new DiagnosticSetting(stack, 'Diagnostic', {
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        eventHub: {
          authorizationRuleId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.EventHub/namespaces/eh-ns/authorizationRules/RootManageSharedAccessKey',
          name: 'diagnostics',
        },
        logCategories: 'all',
      });

      expect(diagnostic.name).toBe('diagnostics');
    });

    it('should create diagnostic setting with advanced log settings', () => {
      const diagnostic = new DiagnosticSetting(stack, 'Diagnostic', {
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspace: {
          workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        },
        logs: [
          {
            category: 'AppServiceHTTPLogs',
            enabled: true,
            retentionPolicy: { enabled: true, days: 7 },
          },
          {
            category: 'AppServiceConsoleLogs',
            enabled: true,
            retentionPolicy: { enabled: true, days: 30 },
          },
        ],
      });

      expect(diagnostic.name).toBe('diagnostics');
    });

    it('should create diagnostic setting with advanced metric settings', () => {
      const diagnostic = new DiagnosticSetting(stack, 'Diagnostic', {
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspace: {
          workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        },
        logCategories: 'all',
        metrics: [
          {
            category: 'AllMetrics',
            enabled: true,
            retentionPolicy: { enabled: true, days: 90 },
          },
        ],
      });

      expect(diagnostic.name).toBe('diagnostics');
    });
  });

  describe('fromDiagnosticSettingId', () => {
    it('should create reference from resource ID', () => {
      const diagnostic = DiagnosticSetting.fromDiagnosticSettingId(
        stack,
        'ExistingDiagnostic',
        '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test/providers/Microsoft.Insights/diagnosticSettings/diagnostics'
      );

      expect(diagnostic.name).toBe('diagnostics');
      expect(diagnostic.resourceId).toBe('/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test/providers/Microsoft.Insights/diagnosticSettings/diagnostics');
    });
  });
});
