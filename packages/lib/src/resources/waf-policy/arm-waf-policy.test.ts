import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmWafPolicy } from './arm-waf-policy';
import {
  WafPolicyMode,
  WafState,
  WafRuleSetType,
  WafCustomRuleAction,
  WafCustomRuleType,
  WafMatchVariable,
  WafOperator,
} from './types';
import type { ArmWafPolicyProps } from './types';

describe('resources/waf-policy/ArmWafPolicy', () => {
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
    it('should create WAF policy with required properties', () => {
      const wafPolicy = new ArmWafPolicy(stack, 'WafPolicy', {
        policyName: 'waf-test-001',
        location: 'eastus',
        policySettings: {
          mode: WafPolicyMode.Prevention,
          state: WafState.Enabled,
        },
        managedRules: {
          managedRuleSets: [
            {
              ruleSetType: WafRuleSetType.OWASP,
              ruleSetVersion: '3.2',
            },
          ],
        },
      });

      expect(wafPolicy.policyName).toBe('waf-test-001');
      expect(wafPolicy.name).toBe('waf-test-001');
      expect(wafPolicy.location).toBe('eastus');
      expect(wafPolicy.policySettings.mode).toBe('Prevention');
      expect(wafPolicy.policySettings.state).toBe('Enabled');
      expect(wafPolicy.tags).toEqual({});
    });

    it('should create WAF policy with all policy settings', () => {
      const wafPolicy = new ArmWafPolicy(stack, 'WafPolicy', {
        policyName: 'waf-test-002',
        location: 'eastus',
        policySettings: {
          mode: WafPolicyMode.Detection,
          state: WafState.Enabled,
          requestBodyCheck: true,
          maxRequestBodySizeInKb: 128,
          fileUploadLimitInMb: 100,
        },
        managedRules: {
          managedRuleSets: [
            {
              ruleSetType: WafRuleSetType.OWASP,
              ruleSetVersion: '3.2',
            },
          ],
        },
        tags: {
          environment: 'test',
        },
      });

      expect(wafPolicy.policySettings.requestBodyCheck).toBe(true);
      expect(wafPolicy.policySettings.maxRequestBodySizeInKb).toBe(128);
      expect(wafPolicy.policySettings.fileUploadLimitInMb).toBe(100);
      expect(wafPolicy.tags).toEqual({ environment: 'test' });
    });

    it('should set correct resource type', () => {
      const wafPolicy = new ArmWafPolicy(stack, 'WafPolicy', {
        policyName: 'waf-test-003',
        location: 'eastus',
        policySettings: {
          mode: WafPolicyMode.Prevention,
          state: WafState.Enabled,
        },
        managedRules: {
          managedRuleSets: [
            {
              ruleSetType: WafRuleSetType.OWASP,
              ruleSetVersion: '3.2',
            },
          ],
        },
      });

      expect(wafPolicy.resourceType).toBe(
        'Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies'
      );
    });

    it('should set correct API version', () => {
      const wafPolicy = new ArmWafPolicy(stack, 'WafPolicy', {
        policyName: 'waf-test-004',
        location: 'eastus',
        policySettings: {
          mode: WafPolicyMode.Prevention,
          state: WafState.Enabled,
        },
        managedRules: {
          managedRuleSets: [
            {
              ruleSetType: WafRuleSetType.OWASP,
              ruleSetVersion: '3.2',
            },
          ],
        },
      });

      expect(wafPolicy.apiVersion).toBe('2023-11-01');
    });

    it('should construct correct resource ID', () => {
      const wafPolicy = new ArmWafPolicy(stack, 'WafPolicy', {
        policyName: 'waf-test-005',
        location: 'eastus',
        policySettings: {
          mode: WafPolicyMode.Prevention,
          state: WafState.Enabled,
        },
        managedRules: {
          managedRuleSets: [
            {
              ruleSetType: WafRuleSetType.OWASP,
              ruleSetVersion: '3.2',
            },
          ],
        },
      });

      expect(wafPolicy.policyId).toBe(
        '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/waf-test-005'
      );
    });
  });

  describe('validation', () => {
    it('should throw error if policy name is empty', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: '',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
        });
      }).toThrow('WAF policy name cannot be empty');
    });

    it('should throw error if policy name is too long', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'a'.repeat(129),
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
        });
      }).toThrow('WAF policy name must be between 1 and 128 characters');
    });

    it('should throw error if location is empty', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: '',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
        });
      }).toThrow('Location cannot be empty');
    });

    it('should throw error if policy settings are missing', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: undefined as any,
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
        });
      }).toThrow('Policy settings must be specified');
    });

    it('should throw error if policy mode is missing', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: undefined as any,
            state: WafState.Enabled,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
        });
      }).toThrow('Policy mode must be specified');
    });

    it('should throw error if policy state is missing', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: undefined as any,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
        });
      }).toThrow('Policy state must be specified');
    });

    it('should throw error if maxRequestBodySizeInKb is below minimum', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
            maxRequestBodySizeInKb: 0,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
        });
      }).toThrow('maxRequestBodySizeInKb must be between 1 and 128');
    });

    it('should throw error if maxRequestBodySizeInKb is above maximum', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
            maxRequestBodySizeInKb: 129,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
        });
      }).toThrow('maxRequestBodySizeInKb must be between 1 and 128');
    });

    it('should throw error if fileUploadLimitInMb is below minimum', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
            fileUploadLimitInMb: 0,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
        });
      }).toThrow('fileUploadLimitInMb must be between 1 and 750');
    });

    it('should throw error if fileUploadLimitInMb is above maximum', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
            fileUploadLimitInMb: 751,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
        });
      }).toThrow('fileUploadLimitInMb must be between 1 and 750');
    });

    it('should throw error if managed rules are missing', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
          },
          managedRules: undefined as any,
        });
      }).toThrow('Managed rules must be specified');
    });

    it('should throw error if managed rule sets are empty', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
          },
          managedRules: {
            managedRuleSets: [],
          },
        });
      }).toThrow('At least one managed rule set must be specified');
    });

    it('should throw error if managed rule set type is missing', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: undefined as any,
                ruleSetVersion: '3.2',
              },
            ],
          },
        });
      }).toThrow('Managed rule set at index 0 must have a ruleSetType');
    });

    it('should throw error if managed rule set version is missing', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: undefined as any,
              },
            ],
          },
        });
      }).toThrow('Managed rule set at index 0 must have a ruleSetVersion');
    });

    it('should throw error if custom rule name is missing', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
          customRules: [
            {
              name: '',
              priority: 1,
              ruleType: WafCustomRuleType.MatchRule,
              matchConditions: [],
              action: WafCustomRuleAction.Block,
            },
          ],
        });
      }).toThrow('Custom rule at index 0 must have a name');
    });

    it('should throw error if custom rule priority is below minimum', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
          customRules: [
            {
              name: 'TestRule',
              priority: 0,
              ruleType: WafCustomRuleType.MatchRule,
              matchConditions: [],
              action: WafCustomRuleAction.Block,
            },
          ],
        });
      }).toThrow("Custom rule 'TestRule' priority must be between 1 and 100");
    });

    it('should throw error if custom rule priority is above maximum', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
          customRules: [
            {
              name: 'TestRule',
              priority: 101,
              ruleType: WafCustomRuleType.MatchRule,
              matchConditions: [],
              action: WafCustomRuleAction.Block,
            },
          ],
        });
      }).toThrow("Custom rule 'TestRule' priority must be between 1 and 100");
    });

    it('should throw error if custom rule match conditions are empty', () => {
      expect(() => {
        new ArmWafPolicy(stack, 'WafPolicy', {
          policyName: 'waf-test',
          location: 'eastus',
          policySettings: {
            mode: WafPolicyMode.Prevention,
            state: WafState.Enabled,
          },
          managedRules: {
            managedRuleSets: [
              {
                ruleSetType: WafRuleSetType.OWASP,
                ruleSetVersion: '3.2',
              },
            ],
          },
          customRules: [
            {
              name: 'TestRule',
              priority: 1,
              ruleType: WafCustomRuleType.MatchRule,
              matchConditions: [],
              action: WafCustomRuleAction.Block,
            },
          ],
        });
      }).toThrow("Custom rule 'TestRule' must have at least one match condition");
    });
  });

  describe('managed rules', () => {
    it('should support OWASP rule set', () => {
      const wafPolicy = new ArmWafPolicy(stack, 'WafPolicy', {
        policyName: 'waf-test',
        location: 'eastus',
        policySettings: {
          mode: WafPolicyMode.Prevention,
          state: WafState.Enabled,
        },
        managedRules: {
          managedRuleSets: [
            {
              ruleSetType: WafRuleSetType.OWASP,
              ruleSetVersion: '3.2',
            },
          ],
        },
      });

      expect(wafPolicy.managedRules.managedRuleSets).toHaveLength(1);
      expect(wafPolicy.managedRules.managedRuleSets[0].ruleSetType).toBe('OWASP');
      expect(wafPolicy.managedRules.managedRuleSets[0].ruleSetVersion).toBe('3.2');
    });

    it('should support multiple rule sets', () => {
      const wafPolicy = new ArmWafPolicy(stack, 'WafPolicy', {
        policyName: 'waf-test',
        location: 'eastus',
        policySettings: {
          mode: WafPolicyMode.Prevention,
          state: WafState.Enabled,
        },
        managedRules: {
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
        },
      });

      expect(wafPolicy.managedRules.managedRuleSets).toHaveLength(2);
    });

    it('should support rule group overrides', () => {
      const wafPolicy = new ArmWafPolicy(stack, 'WafPolicy', {
        policyName: 'waf-test',
        location: 'eastus',
        policySettings: {
          mode: WafPolicyMode.Prevention,
          state: WafState.Enabled,
        },
        managedRules: {
          managedRuleSets: [
            {
              ruleSetType: WafRuleSetType.OWASP,
              ruleSetVersion: '3.2',
              ruleGroupOverrides: [
                {
                  ruleGroupName: 'REQUEST-920-PROTOCOL-ENFORCEMENT',
                  rules: [
                    {
                      ruleId: '920300',
                      state: WafState.Disabled,
                    },
                  ],
                },
              ],
            },
          ],
        },
      });

      expect(
        wafPolicy.managedRules.managedRuleSets[0].ruleGroupOverrides
      ).toHaveLength(1);
    });
  });

  describe('custom rules', () => {
    it('should support custom rules with match conditions', () => {
      const wafPolicy = new ArmWafPolicy(stack, 'WafPolicy', {
        policyName: 'waf-test',
        location: 'eastus',
        policySettings: {
          mode: WafPolicyMode.Prevention,
          state: WafState.Enabled,
        },
        managedRules: {
          managedRuleSets: [
            {
              ruleSetType: WafRuleSetType.OWASP,
              ruleSetVersion: '3.2',
            },
          ],
        },
        customRules: [
          {
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
          },
        ],
      });

      expect(wafPolicy.customRules).toHaveLength(1);
      expect(wafPolicy.customRules![0].name).toBe('BlockSpecificIP');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate correct ARM template', () => {
      const wafPolicy = new ArmWafPolicy(stack, 'WafPolicy', {
        policyName: 'waf-test',
        location: 'eastus',
        policySettings: {
          mode: WafPolicyMode.Prevention,
          state: WafState.Enabled,
          requestBodyCheck: true,
          maxRequestBodySizeInKb: 128,
          fileUploadLimitInMb: 100,
        },
        managedRules: {
          managedRuleSets: [
            {
              ruleSetType: WafRuleSetType.OWASP,
              ruleSetVersion: '3.2',
            },
          ],
        },
        tags: {
          environment: 'test',
        },
      });

      const template = wafPolicy.toArmTemplate() as any;

      expect(template.type).toBe(
        'Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies'
      );
      expect(template.apiVersion).toBe('2023-11-01');
      expect(template.name).toBe('waf-test');
      expect(template.location).toBe('eastus');
      expect(template.tags).toEqual({ environment: 'test' });
      expect(template.properties.policySettings.mode).toBe('Prevention');
      expect(template.properties.policySettings.state).toBe('Enabled');
      expect(template.properties.policySettings.requestBodyCheck).toBe(true);
      expect(template.properties.policySettings.maxRequestBodySizeInKb).toBe(128);
      expect(template.properties.policySettings.fileUploadLimitInMb).toBe(100);
      expect(template.properties.managedRules.managedRuleSets).toHaveLength(1);
    });

    it('should include custom rules in ARM template', () => {
      const wafPolicy = new ArmWafPolicy(stack, 'WafPolicy', {
        policyName: 'waf-test',
        location: 'eastus',
        policySettings: {
          mode: WafPolicyMode.Prevention,
          state: WafState.Enabled,
        },
        managedRules: {
          managedRuleSets: [
            {
              ruleSetType: WafRuleSetType.OWASP,
              ruleSetVersion: '3.2',
            },
          ],
        },
        customRules: [
          {
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
          },
        ],
      });

      const template = wafPolicy.toArmTemplate() as any;

      expect(template.properties.customRules).toHaveLength(1);
      expect(template.properties.customRules[0].name).toBe('BlockSpecificIP');
    });
  });
});
