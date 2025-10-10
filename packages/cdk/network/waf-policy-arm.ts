import { Construct } from '@atakora/lib';
import { Resource } from '@atakora/lib';
import { DeploymentScope } from '@atakora/lib';
import { ValidationResult, ValidationResultBuilder, ArmResource } from '@atakora/lib';
import type { ArmWafPolicyProps, PolicySettings, ManagedRules, CustomRule } from './waf-policy-types';

/**
 * L1 construct for Azure WAF Policy.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies`
 * **API Version**: `2023-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link WafPolicy} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmWafPolicy, WafPolicyMode, WafState, WafRuleSetType } from '@atakora/lib';
 *
 * const wafPolicy = new ArmWafPolicy(resourceGroup, 'WafPolicy', {
 *   policyName: 'waf-prod-eastus-01',
 *   location: 'eastus',
 *   policySettings: {
 *     mode: WafPolicyMode.Prevention,
 *     state: WafState.Enabled,
 *     requestBodyCheck: true,
 *     maxRequestBodySizeInKb: 128,
 *     fileUploadLimitInMb: 100
 *   },
 *   managedRules: {
 *     managedRuleSets: [
 *       {
 *         ruleSetType: WafRuleSetType.OWASP,
 *         ruleSetVersion: '3.2'
 *       }
 *     ]
 *   }
 * });
 * ```
 */
export class ArmWafPolicy extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string =
    'Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-11-01';

  /**
   * Deployment scope for WAF policies.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the WAF policy.
   */
  public readonly policyName: string;

  /**
   * Resource name (same as policyName).
   */
  public readonly name: string;

  /**
   * Azure region where the WAF policy is located.
   */
  public readonly location: string;

  /**
   * Policy settings.
   */
  public readonly policySettings: PolicySettings;

  /**
   * Managed rules configuration.
   */
  public readonly managedRules: ManagedRules;

  /**
   * Custom rules.
   */
  public readonly customRules?: CustomRule[];

  /**
   * Tags applied to the WAF policy.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/{policyName}`
   */
  public readonly resourceId: string;

  /**
   * WAF policy resource ID (alias for resourceId).
   */
  public readonly policyId: string;

  /**
   * Creates a new ArmWafPolicy construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - WAF policy properties
   *
   * @throws {Error} If policyName is invalid
   * @throws {Error} If location is empty
   * @throws {Error} If validation fails
   */
  constructor(scope: Construct, id: string, props: ArmWafPolicyProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.policyName = props.policyName;
    this.name = props.policyName;
    this.location = props.location;
    this.policySettings = props.policySettings;
    this.managedRules = props.managedRules;
    this.customRules = props.customRules;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/${this.policyName}`;
    this.policyId = this.resourceId;
  }

  /**
   * Validates WAF policy properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  protected validateProps(props: ArmWafPolicyProps): void {
    // Validate policy name
    if (!props.policyName || props.policyName.trim() === '') {
      throw new Error('WAF policy name cannot be empty');
    }

    if (props.policyName.length < 1 || props.policyName.length > 128) {
      throw new Error('WAF policy name must be between 1 and 128 characters');
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate policy settings
    if (!props.policySettings) {
      throw new Error('Policy settings must be specified');
    }

    if (!props.policySettings.mode) {
      throw new Error('Policy mode must be specified');
    }

    if (!props.policySettings.state) {
      throw new Error('Policy state must be specified');
    }

    // Validate maxRequestBodySizeInKb
    if (props.policySettings.maxRequestBodySizeInKb !== undefined) {
      if (
        props.policySettings.maxRequestBodySizeInKb < 1 ||
        props.policySettings.maxRequestBodySizeInKb > 128
      ) {
        throw new Error('maxRequestBodySizeInKb must be between 1 and 128');
      }
    }

    // Validate fileUploadLimitInMb
    if (props.policySettings.fileUploadLimitInMb !== undefined) {
      if (
        props.policySettings.fileUploadLimitInMb < 1 ||
        props.policySettings.fileUploadLimitInMb > 750
      ) {
        throw new Error('fileUploadLimitInMb must be between 1 and 750');
      }
    }

    // Validate managed rules
    if (!props.managedRules) {
      throw new Error('Managed rules must be specified');
    }

    if (!props.managedRules.managedRuleSets || props.managedRules.managedRuleSets.length === 0) {
      throw new Error('At least one managed rule set must be specified');
    }

    // Validate managed rule sets
    props.managedRules.managedRuleSets.forEach((ruleSet, index) => {
      if (!ruleSet.ruleSetType) {
        throw new Error(`Managed rule set at index ${index} must have a ruleSetType`);
      }

      if (!ruleSet.ruleSetVersion) {
        throw new Error(`Managed rule set at index ${index} must have a ruleSetVersion`);
      }
    });

    // Validate custom rules if provided
    if (props.customRules) {
      props.customRules.forEach((rule, index) => {
        if (!rule.name || rule.name.trim() === '') {
          throw new Error(`Custom rule at index ${index} must have a name`);
        }

        if (!rule.priority || rule.priority < 1 || rule.priority > 100) {
          throw new Error(`Custom rule '${rule.name}' priority must be between 1 and 100`);
        }

        if (!rule.ruleType) {
          throw new Error(`Custom rule '${rule.name}' must have a ruleType`);
        }

        if (!rule.matchConditions || rule.matchConditions.length === 0) {
          throw new Error(`Custom rule '${rule.name}' must have at least one match condition`);
        }

        if (!rule.action) {
          throw new Error(`Custom rule '${rule.name}' must have an action`);
        }

        // Validate match conditions
        rule.matchConditions.forEach((condition, condIndex) => {
          if (!condition.matchVariables || condition.matchVariables.length === 0) {
            throw new Error(
              `Custom rule '${rule.name}' match condition at index ${condIndex} must have at least one match variable`
            );
          }

          if (!condition.operator) {
            throw new Error(
              `Custom rule '${rule.name}' match condition at index ${condIndex} must have an operator`
            );
          }

          if (!condition.matchValues || condition.matchValues.length === 0) {
            throw new Error(
              `Custom rule '${rule.name}' match condition at index ${condIndex} must have at least one match value`
            );
          }
        });
      });
    }
  }
  /**
   * Validates the ARM structure of this resource.
   *
   * @remarks
   * Called during synthesis to validate the ARM template structure.
   * Ensures all required properties are present and properly formatted.
   *
   * @returns Validation result with any errors or warnings
   */
  public validateArmStructure(): ValidationResult {
    const builder = new ValidationResultBuilder();
    // Basic ARM structure validation - constructor already validates props
    return builder.build();
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): ArmResource {
    const template: any = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.policyName,
      location: this.location,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      properties: {
        policySettings: {
          mode: this.policySettings.mode,
          state: this.policySettings.state,
        },
        managedRules: {
          managedRuleSets: this.managedRules.managedRuleSets.map((ruleSet) => {
            const mappedRuleSet: any = {
              ruleSetType: ruleSet.ruleSetType,
              ruleSetVersion: ruleSet.ruleSetVersion,
            };

            if (ruleSet.ruleGroupOverrides && ruleSet.ruleGroupOverrides.length > 0) {
              mappedRuleSet.ruleGroupOverrides = ruleSet.ruleGroupOverrides.map((override) => {
                const mappedOverride: any = {
                  ruleGroupName: override.ruleGroupName,
                };

                if (override.rules && override.rules.length > 0) {
                  mappedOverride.rules = override.rules.map((rule) => {
                    const mappedRule: any = {
                      ruleId: rule.ruleId,
                    };

                    if (rule.state !== undefined) {
                      mappedRule.state = rule.state;
                    }

                    if (rule.action !== undefined) {
                      mappedRule.action = rule.action;
                    }

                    return mappedRule;
                  });
                }

                return mappedOverride;
              });
            }

            return mappedRuleSet;
          }),
        },
      },
    };

    // Add optional policy settings
    if (this.policySettings.requestBodyCheck !== undefined) {
      template.properties.policySettings.requestBodyCheck = this.policySettings.requestBodyCheck;
    }

    if (this.policySettings.maxRequestBodySizeInKb !== undefined) {
      template.properties.policySettings.maxRequestBodySizeInKb =
        this.policySettings.maxRequestBodySizeInKb;
    }

    if (this.policySettings.fileUploadLimitInMb !== undefined) {
      template.properties.policySettings.fileUploadLimitInMb =
        this.policySettings.fileUploadLimitInMb;
    }

    // Add exclusions if present
    if (this.managedRules.exclusions && this.managedRules.exclusions.length > 0) {
      template.properties.managedRules.exclusions = this.managedRules.exclusions.map(
        (exclusion) => {
          const mappedExclusion: any = {
            matchVariable: exclusion.matchVariable,
            selectorMatchOperator: exclusion.selectorMatchOperator,
            selector: exclusion.selector,
          };

          if (exclusion.exclusionManagedRuleSets && exclusion.exclusionManagedRuleSets.length > 0) {
            mappedExclusion.exclusionManagedRuleSets = exclusion.exclusionManagedRuleSets.map(
              (ruleSet) => ({
                ruleSetType: ruleSet.ruleSetType,
                ruleSetVersion: ruleSet.ruleSetVersion,
                ruleGroupOverrides: ruleSet.ruleGroupOverrides,
              })
            );
          }

          return mappedExclusion;
        }
      );
    }

    // Add custom rules if present
    if (this.customRules && this.customRules.length > 0) {
      template.properties.customRules = this.customRules.map((rule) => {
        const mappedRule: any = {
          name: rule.name,
          priority: rule.priority,
          ruleType: rule.ruleType,
          matchConditions: rule.matchConditions.map((condition) => {
            const mappedCondition: any = {
              matchVariables: condition.matchVariables.map((variable) => {
                const mappedVariable: any = {
                  variableName: variable.variableName,
                };

                if (variable.selector !== undefined) {
                  mappedVariable.selector = variable.selector;
                }

                return mappedVariable;
              }),
              operator: condition.operator,
              matchValues: condition.matchValues,
            };

            if (condition.negationCondition !== undefined) {
              mappedCondition.negationCondition = condition.negationCondition;
            }

            if (condition.transforms && condition.transforms.length > 0) {
              mappedCondition.transforms = condition.transforms;
            }

            return mappedCondition;
          }),
          action: rule.action,
        };

        if (rule.state !== undefined) {
          mappedRule.state = rule.state;
        }

        if (rule.rateLimitDurationInMinutes !== undefined) {
          mappedRule.rateLimitDurationInMinutes = rule.rateLimitDurationInMinutes;
        }

        if (rule.rateLimitThreshold !== undefined) {
          mappedRule.rateLimitThreshold = rule.rateLimitThreshold;
        }

        if (rule.groupByUserSession !== undefined) {
          mappedRule.groupByUserSession = rule.groupByUserSession;
        }

        return mappedRule;
      });
    }

    return template;
  }
}
