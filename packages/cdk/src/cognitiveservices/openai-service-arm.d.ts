import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmOpenAIServiceProps, CognitiveServicesSku, PublicNetworkAccess, NetworkRuleSet } from './openai-service-types';
/**
 * L1 construct for Azure OpenAI Service.
 *
 * @remarks
 * Direct mapping to Microsoft.CognitiveServices/accounts ARM resource with kind='OpenAI'.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.CognitiveServices/accounts`
 * **API Version**: `2023-05-01`
 * **Kind**: `OpenAI`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link OpenAIService} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmOpenAIService, CognitiveServicesSku } from '@atakora/lib';
 *
 * const openai = new ArmOpenAIService(resourceGroup, 'OpenAI', {
 *   accountName: 'oai-authr-001',
 *   location: 'eastus',
 *   sku: {
 *     name: CognitiveServicesSku.S0
 *   },
 *   properties: {
 *     customSubDomainName: 'oai-authr-001'
 *   }
 * });
 * ```
 */
export declare class ArmAccounts extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Kind of Cognitive Services account (always 'OpenAI' for OpenAI Service).
     */
    readonly kind: string;
    /**
     * Deployment scope for OpenAI Service.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the OpenAI Service account.
     */
    readonly accountName: string;
    /**
     * Resource name (same as accountName).
     */
    readonly name: string;
    /**
     * Azure region where the OpenAI Service is located.
     */
    readonly location: string;
    /**
     * SKU configuration.
     */
    readonly sku: CognitiveServicesSku;
    /**
     * Custom subdomain name.
     */
    readonly customSubDomainName?: string;
    /**
     * Public network access setting.
     */
    readonly publicNetworkAccess?: PublicNetworkAccess;
    /**
     * Network ACL rules.
     */
    readonly networkAcls?: NetworkRuleSet;
    /**
     * Resource tags.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.CognitiveServices/accounts/{accountName}`
     */
    readonly resourceId: string;
    /**
     * OpenAI Service account ID (alias for resourceId).
     */
    readonly accountId: string;
    constructor(scope: Construct, id: string, props: ArmOpenAIServiceProps);
    /**
     * Validates the properties for the OpenAI Service.
     */
    protected validateProps(props: ArmOpenAIServiceProps): void;
    /**
     * Converts the OpenAI Service to an ARM template resource definition.
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=openai-service-arm.d.ts.map