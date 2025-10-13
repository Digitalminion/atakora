import { Construct } from '@atakora/cdk';
import type { ApplicationGatewayWebApplicationFirewallPoliciesProps, IWafPolicy, WafPolicyMode, WafState, ManagedRuleSet, CustomRule, ManagedRuleExclusion } from './waf-policy-types';
/**
 * L2 construct for Azure WAF Policy.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates WAF policy name if not provided
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - Secure defaults: Prevention mode, Enabled state, OWASP 3.2
 *
 * **ARM Resource Type**: `Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies`
 * **API Version**: `2023-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { WafPolicy } from '@atakora/cdk/network';
 *
 * const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
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
export declare class ApplicationGatewayWebApplicationFirewallPolicies extends Construct implements IWafPolicy {
    /**
     * Underlying L1 construct.
     */
    private readonly armWafPolicy;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
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
    /**
     * Tags applied to the WAF policy (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * WAF policy mode.
     */
    readonly mode: WafPolicyMode;
    /**
     * WAF state.
     */
    readonly state: WafState;
    /**
     * Request body check enabled.
     */
    readonly requestBodyCheck: boolean;
    /**
     * Maximum request body size in KB.
     */
    readonly maxRequestBodySizeInKb: number;
    /**
     * File upload limit in MB.
     */
    readonly fileUploadLimitInMb: number;
    /**
     * Managed rule sets.
     */
    readonly managedRuleSets: ManagedRuleSet[];
    /**
     * Exclusions for managed rules.
     */
    readonly exclusions?: ManagedRuleExclusion[];
    /**
     * Custom rules.
     */
    private customRulesList;
    /**
     * Creates a reference to an existing WAF policy.
     *
     * @param policyId - Full ARM resource ID of the WAF policy
     * @returns WAF policy reference
     *
     * @example
     * ```typescript
     * const wafPolicy = WafPolicy.fromPolicyId(
     *   '/subscriptions/12345/resourceGroups/rg-app/providers/Microsoft.Network/ApplicationGatewayWebApplicationFirewallPolicies/waf-app-001'
     * );
     * ```
     */
    static fromPolicyId(policyId: string): IWafPolicy;
    /**
     * Creates a new WafPolicy construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Optional WAF policy properties
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     *
     * @example
     * ```typescript
     * const wafPolicy = new WafPolicy(resourceGroup, 'MainWaf', {
     *   mode: WafPolicyMode.Prevention,
     *   tags: { purpose: 'application-security' }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props?: ApplicationGatewayWebApplicationFirewallPoliciesProps);
    /**
     * Adds a custom rule to the WAF policy.
     *
     * @param rule - Custom rule to add
     *
     * @example
     * ```typescript
     * wafPolicy.addCustomRule({
     *   name: 'BlockSpecificIP',
     *   priority: 1,
     *   ruleType: WafCustomRuleType.MatchRule,
     *   matchConditions: [
     *     {
     *       matchVariables: [{ variableName: WafMatchVariable.RemoteAddr }],
     *       operator: WafOperator.IPMatch,
     *       matchValues: ['192.168.1.1']
     *     }
     *   ],
     *   action: WafCustomRuleAction.Block
     * });
     * ```
     */
    addCustomRule(rule: CustomRule): void;
    /**
     * Gets the parent ResourceGroup from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The resource group interface
     * @throws {Error} If parent is not or doesn't contain a ResourceGroup
     */
    private getParentResourceGroup;
    /**
     * Checks if a construct implements IResourceGroup interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has ResourceGroup properties
     */
    private isResourceGroup;
    /**
     * Gets tags from parent construct hierarchy.
     *
     * @param scope - Parent construct
     * @returns Tags object (empty if no tags found)
     */
    private getParentTags;
    /**
     * Resolves the WAF policy name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - WAF policy properties
     * @returns Resolved WAF policy name
     *
     * @remarks
     * WAF policy names follow the pattern:
     * - waf-{org}-{project}-{purpose}-{env}-{geo}-{instance}
     * - Example: waf-dp-authr-app-np-eus-01
     */
    private resolvePolicyName;
    /**
     * Gets the SubscriptionStack from the construct tree.
     *
     * @returns SubscriptionStack or undefined if not found
     */
    private getSubscriptionStack;
    /**
     * Converts construct ID to purpose identifier for naming.
     *
     * @param id - Construct ID
     * @returns Purpose string for naming
     */
    private constructIdToPurpose;
}
//# sourceMappingURL=application-gateway-web-application-firewall-policies.d.ts.map