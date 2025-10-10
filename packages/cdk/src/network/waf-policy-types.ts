/**
 * Type definitions for WAF Policy constructs.
 *
 * @packageDocumentation
 */

/**
 * WAF policy mode.
 */
export enum WafPolicyMode {
  Prevention = 'Prevention',
  Detection = 'Detection',
}

/**
 * WAF rule set type.
 */
export enum WafRuleSetType {
  OWASP = 'OWASP',
  Microsoft_BotManagerRuleSet = 'Microsoft_BotManagerRuleSet',
}

/**
 * WAF rule set version.
 */
export enum WafRuleSetVersion {
  V3_2 = '3.2',
  V3_1 = '3.1',
  V3_0 = '3.0',
}

/**
 * WAF state.
 */
export enum WafState {
  Enabled = 'Enabled',
  Disabled = 'Disabled',
}

/**
 * WAF custom rule action.
 */
export enum WafCustomRuleAction {
  Allow = 'Allow',
  Block = 'Block',
  Log = 'Log',
}

/**
 * WAF custom rule type.
 */
export enum WafCustomRuleType {
  MatchRule = 'MatchRule',
  RateLimitRule = 'RateLimitRule',
}

/**
 * WAF match variable.
 */
export enum WafMatchVariable {
  RemoteAddr = 'RemoteAddr',
  RequestMethod = 'RequestMethod',
  QueryString = 'QueryString',
  PostArgs = 'PostArgs',
  RequestUri = 'RequestUri',
  RequestHeaders = 'RequestHeaders',
  RequestBody = 'RequestBody',
  RequestCookies = 'RequestCookies',
}

/**
 * WAF operator.
 */
export enum WafOperator {
  IPMatch = 'IPMatch',
  Equal = 'Equal',
  Contains = 'Contains',
  LessThan = 'LessThan',
  GreaterThan = 'GreaterThan',
  LessThanOrEqual = 'LessThanOrEqual',
  GreaterThanOrEqual = 'GreaterThanOrEqual',
  BeginsWith = 'BeginsWith',
  EndsWith = 'EndsWith',
  Regex = 'Regex',
  GeoMatch = 'GeoMatch',
}

/**
 * Policy settings configuration.
 */
export interface PolicySettings {
  /**
   * WAF policy mode.
   */
  readonly mode: WafPolicyMode;

  /**
   * WAF state.
   */
  readonly state: WafState;

  /**
   * Enable request body check.
   */
  readonly requestBodyCheck?: boolean;

  /**
   * Maximum request body size in KB.
   *
   * @remarks
   * Must be between 1 and 128 KB.
   */
  readonly maxRequestBodySizeInKb?: number;

  /**
   * File upload limit in MB.
   *
   * @remarks
   * Must be between 1 and 750 MB.
   */
  readonly fileUploadLimitInMb?: number;
}

/**
 * Rule override configuration.
 */
export interface RuleOverride {
  /**
   * Rule ID.
   */
  readonly ruleId: string;

  /**
   * State of the rule.
   */
  readonly state?: WafState;

  /**
   * Action to take.
   */
  readonly action?: WafCustomRuleAction;
}

/**
 * Rule group override configuration.
 */
export interface RuleGroupOverride {
  /**
   * Rule group name.
   */
  readonly ruleGroupName: string;

  /**
   * Rules to override.
   */
  readonly rules?: RuleOverride[];
}

/**
 * Managed rule set configuration.
 */
export interface ManagedRuleSet {
  /**
   * Rule set type.
   */
  readonly ruleSetType: WafRuleSetType;

  /**
   * Rule set version.
   */
  readonly ruleSetVersion: string;

  /**
   * Rule group overrides.
   */
  readonly ruleGroupOverrides?: RuleGroupOverride[];
}

/**
 * Exclusion match variable.
 */
export interface ExclusionMatchVariable {
  /**
   * Variable name.
   */
  readonly variableName: WafMatchVariable;

  /**
   * Selector.
   */
  readonly selector: string;
}

/**
 * Managed rule exclusion.
 */
export interface ManagedRuleExclusion {
  /**
   * Match variable.
   */
  readonly matchVariable: WafMatchVariable;

  /**
   * Selector match operator.
   */
  readonly selectorMatchOperator: WafOperator;

  /**
   * Selector.
   */
  readonly selector: string;

  /**
   * Exclusion managed rule sets.
   */
  readonly exclusionManagedRuleSets?: ManagedRuleSet[];
}

/**
 * Managed rules configuration.
 */
export interface ManagedRules {
  /**
   * Managed rule sets.
   */
  readonly managedRuleSets: ManagedRuleSet[];

  /**
   * Exclusions.
   */
  readonly exclusions?: ManagedRuleExclusion[];
}

/**
 * Match condition variable.
 */
export interface MatchConditionVariable {
  /**
   * Variable name.
   */
  readonly variableName: WafMatchVariable;

  /**
   * Selector.
   */
  readonly selector?: string;
}

/**
 * Match condition.
 */
export interface MatchCondition {
  /**
   * Match variables.
   */
  readonly matchVariables: MatchConditionVariable[];

  /**
   * Operator.
   */
  readonly operator: WafOperator;

  /**
   * Negate condition.
   */
  readonly negationCondition?: boolean;

  /**
   * Match values.
   */
  readonly matchValues: string[];

  /**
   * Transforms.
   */
  readonly transforms?: string[];
}

/**
 * Custom rule configuration.
 */
export interface CustomRule {
  /**
   * Rule name.
   */
  readonly name: string;

  /**
   * Rule priority.
   *
   * @remarks
   * Must be between 1 and 100.
   */
  readonly priority: number;

  /**
   * Rule type.
   */
  readonly ruleType: WafCustomRuleType;

  /**
   * Match conditions.
   */
  readonly matchConditions: MatchCondition[];

  /**
   * Action to take.
   */
  readonly action: WafCustomRuleAction;

  /**
   * State of the rule.
   */
  readonly state?: WafState;

  /**
   * Rate limit duration in minutes (for RateLimitRule only).
   */
  readonly rateLimitDurationInMinutes?: number;

  /**
   * Rate limit threshold (for RateLimitRule only).
   */
  readonly rateLimitThreshold?: number;

  /**
   * Group by user session (for RateLimitRule only).
   */
  readonly groupByUserSession?: { groupByVariables: { variableName: string }[] }[];
}

/**
 * Properties for ArmWafPolicy (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2023-11-01
 *
 * @example
 * ```typescript
 * const props: ArmWafPolicyProps = {
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
 * };
 * ```
 */
export interface ArmWafPolicyProps {
  /**
   * Name of the WAF policy.
   *
   * @remarks
   * Must be 1-128 characters.
   */
  readonly policyName: string;

  /**
   * Azure region where the WAF policy will be created.
   */
  readonly location: string;

  /**
   * Policy settings.
   */
  readonly policySettings: PolicySettings;

  /**
   * Managed rules configuration.
   */
  readonly managedRules: ManagedRules;

  /**
   * Custom rules.
   */
  readonly customRules?: CustomRule[];

  /**
   * Tags to apply to the WAF policy.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for WafPolicy (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name, uses defaults
 * const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf');
 *
 * // With custom properties
 * const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
 *   policyName: 'my-custom-waf',
 *   mode: WafPolicyMode.Detection,
 *   managedRuleSets: [
 *     {
 *       ruleSetType: WafRuleSetType.OWASP,
 *       ruleSetVersion: '3.2'
 *     }
 *   ]
 * });
 * ```
 */
export interface ApplicationGatewayWebApplicationFirewallPoliciesProps {
  /**
   * Name of the WAF policy.
   *
   * @remarks
   * If not provided, will be auto-generated using the parent's naming context.
   */
  readonly policyName?: string;

  /**
   * Azure region where the WAF policy will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * WAF policy mode.
   *
   * @remarks
   * Defaults to Prevention.
   */
  readonly mode?: WafPolicyMode;

  /**
   * WAF state.
   *
   * @remarks
   * Defaults to Enabled.
   */
  readonly state?: WafState;

  /**
   * Enable request body check.
   *
   * @remarks
   * Defaults to true.
   */
  readonly requestBodyCheck?: boolean;

  /**
   * Maximum request body size in KB.
   *
   * @remarks
   * Defaults to 128 KB.
   * Must be between 1 and 128 KB.
   */
  readonly maxRequestBodySizeInKb?: number;

  /**
   * File upload limit in MB.
   *
   * @remarks
   * Defaults to 100 MB.
   * Must be between 1 and 750 MB.
   */
  readonly fileUploadLimitInMb?: number;

  /**
   * Managed rule sets.
   *
   * @remarks
   * Defaults to OWASP 3.2.
   */
  readonly managedRuleSets?: ManagedRuleSet[];

  /**
   * Exclusions for managed rules.
   */
  readonly exclusions?: ManagedRuleExclusion[];

  /**
   * Custom rules.
   */
  readonly customRules?: CustomRule[];

  /**
   * Tags to apply to the WAF policy.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for WAF Policy reference.
 *
 * @remarks
 * Allows resources to reference a WAF policy without depending on the construct class.
 */
export interface IWafPolicy {
  /**
   * Name of the WAF policy.
   */
  readonly policyName: string;

  /**
   * Location of the WAF policy.
   */
  readonly location: string;

  /**
   * Resource ID of the WAF policy.
   */
  readonly policyId: string;
}
