import { Construct } from '@atakora/cdk';
import type { OpenAIServiceProps, IOpenAIService, CognitiveServicesSku } from './openai-service-types';
/**
 * L2 construct for Azure OpenAI Service.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates OpenAI Service account name following naming conventions
 * - Auto-generates custom subdomain name to match account name (required for OpenAI)
 * - Defaults location to parent resource group's location
 * - Merges tags with parent tags
 * - AuthR secure defaults: S0 SKU, public network disabled, network ACLs deny all
 *
 * **ARM Resource Type**: `Microsoft.CognitiveServices/accounts`
 * **API Version**: `2023-05-01`
 * **Kind**: `OpenAI`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { OpenAIService } from '@atakora/lib';
 *
 * const openai = new OpenAIService(resourceGroup, 'AI');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const openai = new OpenAIService(resourceGroup, 'AI', {
 *   accountName: 'oai-authr-custom',
 *   publicNetworkAccess: PublicNetworkAccess.ENABLED,
 *   tags: { purpose: 'ml-inference' }
 * });
 * ```
 */
export declare class Accounts extends Construct implements IOpenAIService {
    /**
     * Underlying L1 construct.
     */
    private readonly armOpenAIService;
    /**
     * Parent resource group.
     */
    private readonly parentResourceGroup;
    /**
     * Name of the OpenAI Service account.
     */
    readonly accountName: string;
    /**
     * Location of the OpenAI Service.
     */
    readonly location: string;
    /**
     * SKU configuration.
     */
    readonly sku: CognitiveServicesSku;
    /**
     * Custom subdomain name.
     */
    readonly customSubDomainName: string;
    /**
     * Resource group name where the OpenAI Service is deployed.
     */
    readonly resourceGroupName: string;
    /**
     * Resource ID of the OpenAI Service.
     */
    readonly accountId: string;
    /**
     * Tags applied to the OpenAI Service (merged with parent tags).
     */
    readonly tags: Record<string, string>;
    /**
     * Creates a new OpenAIService construct.
     *
     * @param scope - Parent construct (must be or contain a ResourceGroup)
     * @param id - Unique identifier for this construct
     * @param props - Optional OpenAI Service properties
     *
     * @throws {Error} If scope does not contain a ResourceGroup
     *
     * @example
     * ```typescript
     * const openai = new OpenAIService(resourceGroup, 'GPT', {
     *   accountName: 'oai-authr-gpt',
     *   publicNetworkAccess: PublicNetworkAccess.ENABLED
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props?: OpenAIServiceProps);
    /**
     * Import an existing OpenAI Service by account ID.
     *
     * @param scope - Parent construct
     * @param id - Unique identifier for this construct
     * @param accountId - Resource ID of the existing OpenAI Service
     * @returns OpenAI Service reference
     *
     * @example
     * ```typescript
     * const openai = OpenAIService.fromAccountId(
     *   stack,
     *   'ExistingOpenAI',
     *   '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/oai-001'
     * );
     * ```
     */
    static fromAccountId(scope: Construct, id: string, accountId: string): IOpenAIService;
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
     * Resolves the OpenAI Service account name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - OpenAI Service properties
     * @returns Resolved account name
     *
     * @remarks
     * OpenAI Service account names must be:
     * - 2-64 characters
     * - Lowercase letters, numbers, and hyphens
     * - Cannot start or end with hyphen
     * - Globally unique across Azure
     *
     * New naming convention for global uniqueness:
     * - Format: oai-<project>-<instance>-<8-char-hash>
     * - Hash is generated from full resource name to ensure uniqueness
     * - Example: oai-authr-03-a1b2c3d4
     */
    private resolveAccountName;
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
//# sourceMappingURL=openai-service.d.ts.map