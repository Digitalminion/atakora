import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmWafPolicy } from './arm-waf-policy';
import { constructIdToPurpose as utilConstructIdToPurpose } from '../../naming/construct-id-utils';
import type {
  WafPolicyProps,
  IWafPolicy,
  WafPolicyMode,
  WafState,
  WafRuleSetType,
  ManagedRuleSet,
  CustomRule,
  ManagedRuleExclusion,
} from './types';

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
 * import { WafPolicy } from '@atakora/lib';
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
export class WafPolicy extends Construct implements IWafPolicy {
  /**
   * Underlying L1 construct.
   */
  private readonly armWafPolicy: ArmWafPolicy;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the WAF policy.
   */
  public readonly policyName: string;

  /**
   * Location of the WAF policy.
   */
  public readonly location: string;

  /**
   * Resource ID of the WAF policy.
   */
  public readonly policyId: string;

  /**
   * Tags applied to the WAF policy (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

  /**
   * WAF policy mode.
   */
  public readonly mode: WafPolicyMode;

  /**
   * WAF state.
   */
  public readonly state: WafState;

  /**
   * Request body check enabled.
   */
  public readonly requestBodyCheck: boolean;

  /**
   * Maximum request body size in KB.
   */
  public readonly maxRequestBodySizeInKb: number;

  /**
   * File upload limit in MB.
   */
  public readonly fileUploadLimitInMb: number;

  /**
   * Managed rule sets.
   */
  public readonly managedRuleSets: ManagedRuleSet[];

  /**
   * Exclusions for managed rules.
   */
  public readonly exclusions?: ManagedRuleExclusion[];

  /**
   * Custom rules.
   */
  private customRulesList: CustomRule[] = [];

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
  public static fromPolicyId(policyId: string): IWafPolicy {
    // Parse the resource ID to extract name
    const parts = policyId.split('/');
    const nameIndex = parts.indexOf('ApplicationGatewayWebApplicationFirewallPolicies') + 1;

    if (nameIndex === 0 || nameIndex >= parts.length) {
      throw new Error(`Invalid WAF policy ID: ${policyId}`);
    }

    const name = parts[nameIndex];

    return {
      policyName: name,
      location: '', // Location not available from ID
      policyId: policyId,
    };
  }

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
  constructor(scope: Construct, id: string, props?: WafPolicyProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided WAF policy name
    this.policyName = this.resolvePolicyName(id, props);

    // Default location to resource group's location or use provided
    this.location = props?.location ?? this.parentResourceGroup.location;

    // Default mode to Prevention
    this.mode = props?.mode ?? ('Prevention' as WafPolicyMode);

    // Default state to Enabled
    this.state = props?.state ?? ('Enabled' as WafState);

    // Default requestBodyCheck to true
    this.requestBodyCheck = props?.requestBodyCheck ?? true;

    // Default maxRequestBodySizeInKb to 128
    this.maxRequestBodySizeInKb = props?.maxRequestBodySizeInKb ?? 128;

    // Default fileUploadLimitInMb to 100
    this.fileUploadLimitInMb = props?.fileUploadLimitInMb ?? 100;

    // Default managed rule sets to OWASP 3.2
    this.managedRuleSets = props?.managedRuleSets ?? [
      {
        ruleSetType: 'OWASP' as WafRuleSetType,
        ruleSetVersion: '3.2',
      },
    ];

    // Set exclusions if provided
    this.exclusions = props?.exclusions;

    // Set custom rules if provided
    if (props?.customRules) {
      this.customRulesList = [...props.customRules];
    }

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Create underlying L1 resource
    this.armWafPolicy = new ArmWafPolicy(scope, `${id}-Resource`, {
      policyName: this.policyName,
      location: this.location,
      policySettings: {
        mode: this.mode,
        state: this.state,
        requestBodyCheck: this.requestBodyCheck,
        maxRequestBodySizeInKb: this.maxRequestBodySizeInKb,
        fileUploadLimitInMb: this.fileUploadLimitInMb,
      },
      managedRules: {
        managedRuleSets: this.managedRuleSets,
        exclusions: this.exclusions,
      },
      customRules: this.customRulesList.length > 0 ? this.customRulesList : undefined,
      tags: this.tags,
    });

    // Get resource ID from L1
    this.policyId = this.armWafPolicy.policyId;
  }

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
  public addCustomRule(rule: CustomRule): void {
    this.customRulesList.push(rule);
  }

  /**
   * Gets the parent ResourceGroup from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The resource group interface
   * @throws {Error} If parent is not or doesn't contain a ResourceGroup
   */
  private getParentResourceGroup(scope: Construct): IResourceGroup {
    // Walk up the construct tree to find ResourceGroup
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IResourceGroup interface
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error(
      'WafPolicy must be created within or under a ResourceGroup. ' +
        'Ensure the parent scope is a ResourceGroup or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IResourceGroup interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has ResourceGroup properties
   */
  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  /**
   * Gets tags from parent construct hierarchy.
   *
   * @param scope - Parent construct
   * @returns Tags object (empty if no tags found)
   */
  private getParentTags(scope: Construct): Record<string, string> {
    // Try to get tags from parent
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

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
   * - Example: waf-dp-colorai-app-np-eus-01
   */
  private resolvePolicyName(id: string, props?: WafPolicyProps): string {
    // If name provided explicitly, use it
    if (props?.policyName) {
      return props.policyName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      return subscriptionStack.generateResourceName('waf', purpose);
    }

    // Fallback: construct a basic name from ID
    return `waf-${id.toLowerCase()}`;
  }

  /**
   * Gets the SubscriptionStack from the construct tree.
   *
   * @returns SubscriptionStack or undefined if not found
   */
  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      // Check if current is a SubscriptionStack using duck typing
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }

  /**
   * Converts construct ID to purpose identifier for naming.
   *
   * @param id - Construct ID
   * @returns Purpose string for naming
   */
  private constructIdToPurpose(id: string): string | undefined {
    return utilConstructIdToPurpose(id, 'waf', ['wafpolicy', 'policy']);
  }
}
