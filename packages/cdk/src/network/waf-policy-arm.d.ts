import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
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
 * import { ArmWafPolicy, WafPolicyMode, WafState, WafRuleSetType } from '@atakora/cdk/network';
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
export declare class ArmWafPolicy extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for WAF policies.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the WAF policy.
     */
    readonly policyName: string;
    /**
     * Resource name (same as policyName).
     */
    readonly name: string;
    /**
     * Azure region where the WAF policy is located.
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
     * Tags applied to the WAF policy.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/{policyName}`
     */
    readonly resourceId: string;
    /**
     * WAF policy resource ID (alias for resourceId).
     */
    readonly policyId: string;
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
    constructor(scope: Construct, id: string, props: ArmWafPolicyProps);
    /**
     * Validates WAF policy properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmWafPolicyProps): void;
    /**
     * Validates the ARM structure of this resource.
     *
     * @remarks
     * Called during synthesis to validate the ARM template structure.
     * Ensures all required properties are present and properly formatted.
     *
     * @returns Validation result with any errors or warnings
     */
    validateArmStructure(): ValidationResult;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=waf-policy-arm.d.ts.map