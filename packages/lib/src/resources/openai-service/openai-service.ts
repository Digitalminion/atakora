import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmOpenAIService } from './arm-openai-service';
import type {
  OpenAIServiceProps,
  IOpenAIService,
  CognitiveServicesSku,
  PublicNetworkAccess,
  NetworkRuleAction,
} from './types';

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
 * - ColorAI secure defaults: S0 SKU, public network disabled, network ACLs deny all
 *
 * **ARM Resource Type**: `Microsoft.CognitiveServices/accounts`
 * **API Version**: `2023-05-01`
 * **Kind**: `OpenAI`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates everything):
 * ```typescript
 * import { OpenAIService } from '@azure-arm-priv/lib';
 *
 * const openai = new OpenAIService(resourceGroup, 'AI');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const openai = new OpenAIService(resourceGroup, 'AI', {
 *   accountName: 'oai-colorai-custom',
 *   publicNetworkAccess: PublicNetworkAccess.ENABLED,
 *   tags: { purpose: 'ml-inference' }
 * });
 * ```
 */
export class OpenAIService extends Construct implements IOpenAIService {
  /**
   * Underlying L1 construct.
   */
  private readonly armOpenAIService: ArmOpenAIService;

  /**
   * Parent resource group.
   */
  private readonly parentResourceGroup: IResourceGroup;

  /**
   * Name of the OpenAI Service account.
   */
  public readonly accountName: string;

  /**
   * Location of the OpenAI Service.
   */
  public readonly location: string;

  /**
   * SKU configuration.
   */
  public readonly sku: CognitiveServicesSku;

  /**
   * Custom subdomain name.
   */
  public readonly customSubDomainName: string;

  /**
   * Resource group name where the OpenAI Service is deployed.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource ID of the OpenAI Service.
   */
  public readonly accountId: string;

  /**
   * Tags applied to the OpenAI Service (merged with parent tags).
   */
  public readonly tags: Record<string, string>;

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
   *   accountName: 'oai-colorai-gpt',
   *   publicNetworkAccess: PublicNetworkAccess.ENABLED
   * });
   * ```
   */
  constructor(scope: Construct, id: string, props?: OpenAIServiceProps) {
    super(scope, id);

    // Get parent resource group
    this.parentResourceGroup = this.getParentResourceGroup(scope);

    // Auto-generate or use provided account name
    this.accountName = this.resolveAccountName(id, props);

    // Default location to resource group's location or use provided
    this.location = props?.location ?? this.parentResourceGroup.location;

    // Set resource group name
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    // Set SKU (default to S0 for OpenAI)
    this.sku = {
      name: props?.sku ?? 'S0',
    };

    // Auto-generate custom subdomain name to match account name (required for OpenAI)
    this.customSubDomainName = props?.customSubDomainName ?? this.accountName;

    // Merge tags with parent
    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Create underlying L1 resource
    this.armOpenAIService = new ArmOpenAIService(scope, `${id}-Resource`, {
      accountName: this.accountName,
      location: this.location,
      sku: this.sku,
      properties: {
        // Custom subdomain is required for OpenAI
        customSubDomainName: this.customSubDomainName,
        // ColorAI defaults: Public network access disabled
        publicNetworkAccess:
          props?.publicNetworkAccess ?? ('Disabled' as PublicNetworkAccess),
        // Network ACLs default to Deny
        networkAcls: props?.networkAcls ?? {
          defaultAction: 'Deny' as NetworkRuleAction,
        },
      },
      tags: this.tags,
    });

    // Get resource ID from L1
    this.accountId = this.armOpenAIService.accountId;
  }

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
  static fromAccountId(
    scope: Construct,
    id: string,
    accountId: string
  ): IOpenAIService {
    // Parse account ID to extract account name
    // Format: /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.CognitiveServices/accounts/{name}
    const parts = accountId.split('/');

    // Validate format - should have at least 9 parts and contain 'accounts'
    if (parts.length < 9 || !accountId.includes('/accounts/')) {
      throw new Error(`Invalid account ID format: ${accountId}`);
    }

    const accountName = parts[parts.length - 1];

    if (!accountName || accountName.trim() === '') {
      throw new Error(`Invalid account ID format: ${accountId}`);
    }

    // Return a reference object implementing IOpenAIService
    return {
      accountName,
      location: 'unknown', // Location not available from ID
      sku: { name: 'S0' }, // Assume S0
      customSubDomainName: accountName, // Assume matches account name
      accountId,
    };
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
      'OpenAIService must be created within or under a ResourceGroup. ' +
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
   */
  private resolveAccountName(id: string, props?: OpenAIServiceProps): string {
    // If name provided explicitly, use it
    if (props?.accountName) {
      return props.accountName;
    }

    // Auto-generate name using parent's naming context
    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = this.constructIdToPurpose(id);
      // Use 'oai' prefix for OpenAI Service
      let generatedName = subscriptionStack.generateResourceName('oai', purpose);

      // OpenAI account names can have hyphens, but truncate to 64 chars
      generatedName = generatedName.substring(0, 64);

      // Remove trailing hyphen if present (truncation might leave one)
      if (generatedName.endsWith('-')) {
        generatedName = generatedName.substring(0, 63);
      }

      // Convert to lowercase (OpenAI requires lowercase)
      generatedName = generatedName.toLowerCase();

      return generatedName;
    }

    // Fallback: construct a basic name from ID
    let fallbackName = `oai-${id.toLowerCase()}`;
    fallbackName = fallbackName.substring(0, 64);

    // Remove trailing hyphen if present
    if (fallbackName.endsWith('-')) {
      fallbackName = fallbackName.substring(0, 63);
    }

    return fallbackName;
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
  private constructIdToPurpose(id: string): string {
    return id.toLowerCase();
  }
}
