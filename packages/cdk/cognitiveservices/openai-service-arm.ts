import { Construct, Resource } from '@atakora/lib';
import { DeploymentScope } from '@atakora/lib';
import type { ArmResource } from '@atakora/lib/src/core/resource';
import type {
  ArmOpenAIServiceProps,
  CognitiveServicesSku,
  PublicNetworkAccess,
  NetworkRuleSet,
} from './openai-service-types';

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
export class ArmAccounts extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.CognitiveServices/accounts';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-05-01';

  /**
   * Kind of Cognitive Services account (always 'OpenAI' for OpenAI Service).
   */
  public readonly kind: string = 'OpenAI';

  /**
   * Deployment scope for OpenAI Service.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the OpenAI Service account.
   */
  public readonly accountName: string;

  /**
   * Resource name (same as accountName).
   */
  public readonly name: string;

  /**
   * Azure region where the OpenAI Service is located.
   */
  public readonly location: string;

  /**
   * SKU configuration.
   */
  public readonly sku: CognitiveServicesSku;

  /**
   * Custom subdomain name.
   */
  public readonly customSubDomainName?: string;

  /**
   * Public network access setting.
   */
  public readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Network ACL rules.
   */
  public readonly networkAcls?: NetworkRuleSet;

  /**
   * Resource tags.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.CognitiveServices/accounts/{accountName}`
   */
  public readonly resourceId: string;

  /**
   * OpenAI Service account ID (alias for resourceId).
   */
  public readonly accountId: string;

  constructor(scope: Construct, id: string, props: ArmOpenAIServiceProps) {
    super(scope, id);

    // Validate props
    this.validateProps(props);

    // Assign required properties
    this.accountName = props.accountName;
    this.name = props.accountName;
    this.location = props.location;
    this.sku = props.sku;

    // Assign optional properties
    this.customSubDomainName = props.properties?.customSubDomainName;
    this.publicNetworkAccess = props.properties?.publicNetworkAccess;
    this.networkAcls = props.properties?.networkAcls;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.CognitiveServices/accounts/${this.accountName}`;
    this.accountId = this.resourceId;
  }

  /**
   * Validates the properties for the OpenAI Service.
   */
  protected validateProps(props: ArmOpenAIServiceProps): void {
    // Validate account name
    if (!props.accountName || props.accountName.trim() === '') {
      throw new Error('OpenAI Service account name cannot be empty');
    }

    // Account name pattern: 2-64 characters, lowercase letters, numbers, and hyphens
    // Cannot start or end with hyphen
    const namePattern = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;
    if (!namePattern.test(props.accountName)) {
      throw new Error(
        `OpenAI Service account name '${props.accountName}' must be 2-64 characters, lowercase letters, numbers, and hyphens only, and cannot start or end with a hyphen`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate SKU
    if (!props.sku) {
      throw new Error('SKU must be provided');
    }

    if (!props.sku.name) {
      throw new Error('SKU name must be provided');
    }

    // Validate custom subdomain name if provided
    if (props.properties?.customSubDomainName) {
      const subdomainPattern = /^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/;
      if (!subdomainPattern.test(props.properties.customSubDomainName)) {
        throw new Error(
          `Custom subdomain name '${props.properties.customSubDomainName}' must be 2-64 characters, lowercase letters, numbers, and hyphens only, and cannot start or end with a hyphen`
        );
      }
    }
  }

  /**
   * Converts the OpenAI Service to an ARM template resource definition.
   */
  public toArmTemplate(): ArmResource {
    const properties: Record<string, unknown> = {};

    // Add optional properties if defined
    if (this.customSubDomainName !== undefined) {
      properties.customSubDomainName = this.customSubDomainName;
    }

    if (this.publicNetworkAccess !== undefined) {
      properties.publicNetworkAccess = this.publicNetworkAccess;
    }

    if (this.networkAcls !== undefined) {
      properties.networkAcls = this.networkAcls;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.accountName,
      location: this.location,
      kind: this.kind,
      sku: this.sku,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    } as ArmResource;
  }
}
