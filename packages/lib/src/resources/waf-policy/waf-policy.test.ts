import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ResourceGroup } from '../resource-group/resource-group';
import { WafPolicy } from './waf-policy';
import {
  WafPolicyMode,
  WafState,
  WafRuleSetType,
  WafCustomRuleAction,
  WafCustomRuleType,
  WafMatchVariable,
  WafOperator,
} from './types';

describe('resources/waf-policy/WafPolicy', () => {
  let app: App;
  let stack: SubscriptionStack;
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
    resourceGroup = new ResourceGroup(stack, 'TestRg', {
      resourceGroupName: 'rg-test',
      location: 'eastus',
    });
  });

  describe('constructor', () => {
    it('should create WAF policy with auto-generated name', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf');

      expect(wafPolicy.policyName).toBe('waf-dp-colorai-mainwaf-nonprod-eus-00');
      expect(wafPolicy.location).toBe('eastus');
    });

    it('should create WAF policy with custom name', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        policyName: 'my-custom-waf',
      });

      expect(wafPolicy.policyName).toBe('my-custom-waf');
    });

    it('should use parent resource group location', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf');

      expect(wafPolicy.location).toBe('eastus');
    });

    it('should use custom location if provided', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        location: 'westus',
      });

      expect(wafPolicy.location).toBe('westus');
    });

    it('should default mode to Prevention', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf');

      expect(wafPolicy.mode).toBe('Prevention');
    });

    it('should default state to Enabled', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf');

      expect(wafPolicy.state).toBe('Enabled');
    });

    it('should default requestBodyCheck to true', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf');

      expect(wafPolicy.requestBodyCheck).toBe(true);
    });

    it('should default maxRequestBodySizeInKb to 128', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf');

      expect(wafPolicy.maxRequestBodySizeInKb).toBe(128);
    });

    it('should default fileUploadLimitInMb to 100', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf');

      expect(wafPolicy.fileUploadLimitInMb).toBe(100);
    });

    it('should default managed rule sets to OWASP 3.2', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf');

      expect(wafPolicy.managedRuleSets).toHaveLength(1);
      expect(wafPolicy.managedRuleSets[0].ruleSetType).toBe('OWASP');
      expect(wafPolicy.managedRuleSets[0].ruleSetVersion).toBe('3.2');
    });

    it('should use custom mode if provided', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        mode: WafPolicyMode.Detection,
      });

      expect(wafPolicy.mode).toBe('Detection');
    });

    it('should use custom state if provided', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        state: WafState.Disabled,
      });

      expect(wafPolicy.state).toBe('Disabled');
    });

    it('should use custom requestBodyCheck if provided', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        requestBodyCheck: false,
      });

      expect(wafPolicy.requestBodyCheck).toBe(false);
    });

    it('should use custom maxRequestBodySizeInKb if provided', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        maxRequestBodySizeInKb: 64,
      });

      expect(wafPolicy.maxRequestBodySizeInKb).toBe(64);
    });

    it('should use custom fileUploadLimitInMb if provided', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        fileUploadLimitInMb: 200,
      });

      expect(wafPolicy.fileUploadLimitInMb).toBe(200);
    });

    it('should use custom managed rule sets if provided', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        managedRuleSets: [
          {
            ruleSetType: WafRuleSetType.OWASP,
            ruleSetVersion: '3.1',
          },
        ],
      });

      expect(wafPolicy.managedRuleSets).toHaveLength(1);
      expect(wafPolicy.managedRuleSets[0].ruleSetVersion).toBe('3.1');
    });

    it('should merge tags with parent tags', () => {
      const rgWithTags = new ResourceGroup(stack, 'RgWithTags', {
        resourceGroupName: 'rg-test-tags',
        location: 'eastus',
        tags: {
          team: 'platform',
        },
      });

      const wafPolicy = new WafPolicy(rgWithTags, 'MainWaf', {
        tags: {
          purpose: 'security',
        },
      });

      expect(wafPolicy.tags).toEqual({
        team: 'platform',
        purpose: 'security',
      });
    });

    it('should construct correct resource ID', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        policyName: 'waf-test',
      });

      expect(wafPolicy.policyId).toContain(
        'Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/waf-test'
      );
    });

    it('should throw error if not created within a resource group', () => {
      expect(() => {
        new WafPolicy(stack, 'MainWaf');
      }).toThrow('WafPolicy must be created within or under a ResourceGroup');
    });
  });

  describe('fromPolicyId', () => {
    it('should create reference from policy ID', () => {
      const policyId =
        '/subscriptions/12345/resourceGroups/rg-test/providers/Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/waf-app-001';

      const wafPolicy = WafPolicy.fromPolicyId(policyId);

      expect(wafPolicy.policyName).toBe('waf-app-001');
      expect(wafPolicy.policyId).toBe(policyId);
    });

    it('should throw error for invalid policy ID', () => {
      const invalidId = '/subscriptions/12345/resourceGroups/rg-test';

      expect(() => {
        WafPolicy.fromPolicyId(invalidId);
      }).toThrow('Invalid WAF policy ID');
    });
  });

  describe('addCustomRule', () => {
    it('should add custom rule to policy', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf');

      wafPolicy.addCustomRule({
        name: 'BlockSpecificIP',
        priority: 1,
        ruleType: WafCustomRuleType.MatchRule,
        matchConditions: [
          {
            matchVariables: [{ variableName: WafMatchVariable.RemoteAddr }],
            operator: WafOperator.IPMatch,
            matchValues: ['192.168.1.1'],
          },
        ],
        action: WafCustomRuleAction.Block,
      });

      // Verify the custom rule was added (accessing private property for testing)
      expect((wafPolicy as any).customRulesList).toHaveLength(1);
    });

    it('should add multiple custom rules', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf');

      wafPolicy.addCustomRule({
        name: 'Rule1',
        priority: 1,
        ruleType: WafCustomRuleType.MatchRule,
        matchConditions: [
          {
            matchVariables: [{ variableName: WafMatchVariable.RemoteAddr }],
            operator: WafOperator.IPMatch,
            matchValues: ['192.168.1.1'],
          },
        ],
        action: WafCustomRuleAction.Block,
      });

      wafPolicy.addCustomRule({
        name: 'Rule2',
        priority: 2,
        ruleType: WafCustomRuleType.MatchRule,
        matchConditions: [
          {
            matchVariables: [{ variableName: WafMatchVariable.RequestUri }],
            operator: WafOperator.Contains,
            matchValues: ['/admin'],
          },
        ],
        action: WafCustomRuleAction.Block,
      });

      expect((wafPolicy as any).customRulesList).toHaveLength(2);
    });
  });

  describe('mode configurations', () => {
    it('should support Prevention mode', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        mode: WafPolicyMode.Prevention,
      });

      expect(wafPolicy.mode).toBe('Prevention');
    });

    it('should support Detection mode', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        mode: WafPolicyMode.Detection,
      });

      expect(wafPolicy.mode).toBe('Detection');
    });
  });

  describe('managed rule sets', () => {
    it('should support OWASP 3.2', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        managedRuleSets: [
          {
            ruleSetType: WafRuleSetType.OWASP,
            ruleSetVersion: '3.2',
          },
        ],
      });

      expect(wafPolicy.managedRuleSets[0].ruleSetType).toBe('OWASP');
      expect(wafPolicy.managedRuleSets[0].ruleSetVersion).toBe('3.2');
    });

    it('should support OWASP 3.1', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        managedRuleSets: [
          {
            ruleSetType: WafRuleSetType.OWASP,
            ruleSetVersion: '3.1',
          },
        ],
      });

      expect(wafPolicy.managedRuleSets[0].ruleSetVersion).toBe('3.1');
    });

    it('should support OWASP 3.0', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        managedRuleSets: [
          {
            ruleSetType: WafRuleSetType.OWASP,
            ruleSetVersion: '3.0',
          },
        ],
      });

      expect(wafPolicy.managedRuleSets[0].ruleSetVersion).toBe('3.0');
    });

    it('should support Bot Manager rule set', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        managedRuleSets: [
          {
            ruleSetType: WafRuleSetType.Microsoft_BotManagerRuleSet,
            ruleSetVersion: '1.0',
          },
        ],
      });

      expect(wafPolicy.managedRuleSets[0].ruleSetType).toBe('Microsoft_BotManagerRuleSet');
    });

    it('should support multiple rule sets', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        managedRuleSets: [
          {
            ruleSetType: WafRuleSetType.OWASP,
            ruleSetVersion: '3.2',
          },
          {
            ruleSetType: WafRuleSetType.Microsoft_BotManagerRuleSet,
            ruleSetVersion: '1.0',
          },
        ],
      });

      expect(wafPolicy.managedRuleSets).toHaveLength(2);
    });
  });

  describe('exclusions', () => {
    it('should support managed rule exclusions', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        exclusions: [
          {
            matchVariable: WafMatchVariable.RequestCookies,
            selectorMatchOperator: WafOperator.Equal,
            selector: 'sessionid',
          },
        ],
      });

      expect(wafPolicy.exclusions).toHaveLength(1);
      expect(wafPolicy.exclusions![0].matchVariable).toBe('RequestCookies');
    });
  });

  describe('custom rules', () => {
    it('should support custom rules in constructor', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        customRules: [
          {
            name: 'BlockBadIPs',
            priority: 1,
            ruleType: WafCustomRuleType.MatchRule,
            matchConditions: [
              {
                matchVariables: [{ variableName: WafMatchVariable.RemoteAddr }],
                operator: WafOperator.IPMatch,
                matchValues: ['10.0.0.1', '10.0.0.2'],
              },
            ],
            action: WafCustomRuleAction.Block,
          },
        ],
      });

      expect((wafPolicy as any).customRulesList).toHaveLength(1);
    });

    it('should support rate limit rules', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
        customRules: [
          {
            name: 'RateLimitPerIP',
            priority: 10,
            ruleType: WafCustomRuleType.RateLimitRule,
            matchConditions: [
              {
                matchVariables: [{ variableName: WafMatchVariable.RemoteAddr }],
                operator: WafOperator.IPMatch,
                matchValues: ['*'],
              },
            ],
            action: WafCustomRuleAction.Block,
            rateLimitDurationInMinutes: 1,
            rateLimitThreshold: 100,
          },
        ],
      });

      const rule = (wafPolicy as any).customRulesList[0];
      expect(rule.ruleType).toBe('RateLimitRule');
      expect(rule.rateLimitThreshold).toBe(100);
    });
  });

  describe('auto-naming', () => {
    it('should auto-generate name with stack context', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'AppWaf');

      expect(wafPolicy.policyName).toMatch(/^waf-dp-colorai-/);
    });

    it('should convert construct ID to purpose', () => {
      const wafPolicy = new WafPolicy(resourceGroup, 'ApiGateway');

      expect(wafPolicy.policyName).toContain('apigateway');
    });
  });
});
