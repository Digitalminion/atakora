import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmDiagnosticSetting } from './arm-diagnostic-setting';

describe('resources/diagnostic-setting/ArmDiagnosticSetting', () => {
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
    it('should create diagnostic setting with Log Analytics workspace', () => {
      const diagnostic = new ArmDiagnosticSetting(stack, 'Diagnostic', {
        name: 'send-to-workspace',
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        logs: [
          { category: 'AppServiceHTTPLogs', enabled: true },
          { category: 'AppServiceConsoleLogs', enabled: true },
        ],
        metrics: [
          { category: 'AllMetrics', enabled: true },
        ],
      });

      expect(diagnostic.name).toBe('send-to-workspace');
      expect(diagnostic.workspaceId).toBeDefined();
      expect(diagnostic.logs).toHaveLength(2);
      expect(diagnostic.metrics).toHaveLength(1);
    });

    it('should create diagnostic setting with storage account', () => {
      const diagnostic = new ArmDiagnosticSetting(stack, 'Diagnostic', {
        name: 'send-to-storage',
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        storageAccountId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Storage/storageAccounts/st-test',
        logs: [
          { category: 'AppServiceHTTPLogs', enabled: true },
        ],
      });

      expect(diagnostic.storageAccountId).toBeDefined();
    });

    it('should create diagnostic setting with Event Hub', () => {
      const diagnostic = new ArmDiagnosticSetting(stack, 'Diagnostic', {
        name: 'send-to-eventhub',
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        eventHubAuthorizationRuleId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.EventHub/namespaces/eh-ns/authorizationRules/RootManageSharedAccessKey',
        eventHubName: 'diagnostics',
        logs: [
          { category: 'AppServiceHTTPLogs', enabled: true },
        ],
      });

      expect(diagnostic.eventHubAuthorizationRuleId).toBeDefined();
      expect(diagnostic.eventHubName).toBe('diagnostics');
    });

    it('should create diagnostic setting with category groups', () => {
      const diagnostic = new ArmDiagnosticSetting(stack, 'Diagnostic', {
        name: 'send-all-logs',
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        logs: [
          { categoryGroup: 'allLogs', enabled: true },
        ],
      });

      expect(diagnostic.logs).toHaveLength(1);
    });

    it('should create diagnostic setting with Log Analytics destination type', () => {
      const diagnostic = new ArmDiagnosticSetting(stack, 'Diagnostic', {
        name: 'send-to-workspace',
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        logAnalyticsDestinationType: 'Dedicated',
        logs: [
          { category: 'AppServiceHTTPLogs', enabled: true },
        ],
      });

      expect(diagnostic.logAnalyticsDestinationType).toBe('Dedicated');
    });

    it('should set correct resource type', () => {
      const diagnostic = new ArmDiagnosticSetting(stack, 'Diagnostic', {
        name: 'diagnostic',
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        logs: [
          { category: 'AppServiceHTTPLogs', enabled: true },
        ],
      });

      expect(diagnostic.resourceType).toBe('Microsoft.Insights/diagnosticSettings');
    });

    it('should set correct API version', () => {
      const diagnostic = new ArmDiagnosticSetting(stack, 'Diagnostic', {
        name: 'diagnostic',
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        logs: [
          { category: 'AppServiceHTTPLogs', enabled: true },
        ],
      });

      expect(diagnostic.apiVersion).toBe('2021-05-01-preview');
    });

    it('should generate correct extension resource ID', () => {
      const diagnostic = new ArmDiagnosticSetting(stack, 'Diagnostic', {
        name: 'diagnostic',
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        logs: [
          { category: 'AppServiceHTTPLogs', enabled: true },
        ],
      });

      expect(diagnostic.resourceId).toBe('/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test/providers/Microsoft.Insights/diagnosticSettings/diagnostic');
    });
  });

  describe('validation', () => {
    it('should throw error for empty diagnostic setting name', () => {
      expect(() => {
        new ArmDiagnosticSetting(stack, 'Diagnostic', {
          name: '',
          targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
          workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
          logs: [
            { category: 'AppServiceHTTPLogs', enabled: true },
          ],
        });
      }).toThrow(/name cannot be empty/);
    });

    it('should throw error for empty target resource ID', () => {
      expect(() => {
        new ArmDiagnosticSetting(stack, 'Diagnostic', {
          name: 'diagnostic',
          targetResourceId: '',
          workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
          logs: [
            { category: 'AppServiceHTTPLogs', enabled: true },
          ],
        });
      }).toThrow(/Target resource ID cannot be empty/);
    });

    it('should throw error when no destination provided', () => {
      expect(() => {
        new ArmDiagnosticSetting(stack, 'Diagnostic', {
          name: 'diagnostic',
          targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
          logs: [
            { category: 'AppServiceHTTPLogs', enabled: true },
          ],
        });
      }).toThrow(/At least one destination must be provided/);
    });

    it('should throw error when no logs or metrics provided', () => {
      expect(() => {
        new ArmDiagnosticSetting(stack, 'Diagnostic', {
          name: 'diagnostic',
          targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
          workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        });
      }).toThrow(/At least one log or metric category must be enabled/);
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with workspace destination', () => {
      const diagnostic = new ArmDiagnosticSetting(stack, 'Diagnostic', {
        name: 'send-to-workspace',
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        logs: [
          { category: 'AppServiceHTTPLogs', enabled: true },
        ],
        metrics: [
          { category: 'AllMetrics', enabled: true },
        ],
      });

      const template: any = diagnostic.toArmTemplate();

      expect(template.type).toBe('Microsoft.Insights/diagnosticSettings');
      expect(template.apiVersion).toBe('2021-05-01-preview');
      expect(template.scope).toBe('/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test');
      expect(template.name).toBe('send-to-workspace');
      expect(template.properties.workspaceId).toBe('/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test');
      expect(template.properties.logs).toHaveLength(1);
      expect(template.properties.metrics).toHaveLength(1);
    });

    it('should generate ARM template with multiple destinations', () => {
      const diagnostic = new ArmDiagnosticSetting(stack, 'Diagnostic', {
        name: 'send-all',
        targetResourceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Web/sites/app-test',
        workspaceId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.OperationalInsights/workspaces/law-test',
        storageAccountId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.Storage/storageAccounts/st-test',
        eventHubAuthorizationRuleId: '/subscriptions/12345678/resourceGroups/rg-test/providers/Microsoft.EventHub/namespaces/eh-ns/authorizationRules/RootManageSharedAccessKey',
        eventHubName: 'diagnostics',
        logs: [
          { category: 'AppServiceHTTPLogs', enabled: true },
        ],
      });

      const template: any = diagnostic.toArmTemplate();

      expect(template.properties.workspaceId).toBeDefined();
      expect(template.properties.storageAccountId).toBeDefined();
      expect(template.properties.eventHubAuthorizationRuleId).toBeDefined();
      expect(template.properties.eventHubName).toBe('diagnostics');
    });
  });
});
