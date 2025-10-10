/**
 * Azure OpenAI Service type definitions.
 *
 * @remarks
 * Enums, interfaces, and types for OpenAI Service resources.
 *
 * **Resource Type**: Microsoft.CognitiveServices/accounts
 * **API Version**: 2023-05-01
 * **Kind**: OpenAI
 *
 * @packageDocumentation
 */

/**
 * Cognitive Services SKU names for OpenAI.
 */
export enum CognitiveServicesSkuName {
  /**
   * Standard tier (S0) - required for OpenAI services.
   */
  S0 = 'S0',

  /**
   * Free tier (F0) - not available for OpenAI services.
   */
  F0 = 'F0',
}

/**
 * Public network access options.
 */
export enum PublicNetworkAccess {
  /**
   * Public network access is enabled.
   */
  ENABLED = 'Enabled',

  /**
   * Public network access is disabled.
   */
  DISABLED = 'Disabled',
}

/**
 * Network rule action.
 */
export enum NetworkRuleAction {
  /**
   * Allow traffic.
   */
  ALLOW = 'Allow',

  /**
   * Deny traffic.
   */
  DENY = 'Deny',
}

/**
 * SKU details for Cognitive Services.
 */
export interface CognitiveServicesSku {
  /**
   * SKU name.
   */
  readonly name: string;
}

/**
 * IP rule for network ACLs.
 */
export interface IpRule {
  /**
   * IP address or CIDR range.
   */
  readonly value: string;
}

/**
 * Virtual network rule for network ACLs.
 */
export interface VirtualNetworkRule {
  /**
   * Full resource ID of a VNet subnet.
   */
  readonly id: string;

  /**
   * Whether to ignore missing VNet service endpoint.
   */
  readonly ignoreMissingVnetServiceEndpoint?: boolean;
}

/**
 * Network ACLs for OpenAI Service.
 */
export interface NetworkRuleSet {
  /**
   * Default action when no rule matches.
   */
  readonly defaultAction: NetworkRuleAction;

  /**
   * IP firewall rules.
   */
  readonly ipRules?: IpRule[];

  /**
   * Virtual network rules.
   */
  readonly virtualNetworkRules?: VirtualNetworkRule[];
}

/**
 * Properties for L1 ArmOpenAIService construct.
 */
export interface ArmOpenAIServiceProps {
  /**
   * Name of the OpenAI Service account.
   *
   * @remarks
   * - 2-64 characters
   * - Lowercase letters, numbers, and hyphens only
   * - Cannot start or end with hyphen
   * - Pattern: ^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$
   */
  readonly accountName: string;

  /**
   * Azure region for the OpenAI Service.
   */
  readonly location: string;

  /**
   * SKU details (must be S0 for OpenAI).
   */
  readonly sku: CognitiveServicesSku;

  /**
   * Optional properties for the OpenAI Service.
   */
  readonly properties?: {
    /**
     * Custom subdomain name for the account.
     *
     * @remarks
     * - Required for OpenAI services
     * - Must be unique across Azure
     * - Typically matches account name
     * - Pattern: same as account name
     */
    readonly customSubDomainName?: string;

    /**
     * Public network access setting.
     *
     * @remarks
     * Default: Enabled
     */
    readonly publicNetworkAccess?: PublicNetworkAccess;

    /**
     * Network ACL rules.
     */
    readonly networkAcls?: NetworkRuleSet;
  };

  /**
   * Resource tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for L2 OpenAIService construct.
 */
export interface OpenAIServiceProps {
  /**
   * Explicit account name (optional - auto-generated if not provided).
   *
   * @remarks
   * If not specified, name will be auto-generated following naming conventions.
   */
  readonly accountName?: string;

  /**
   * Azure region (optional - defaults to parent resource group location).
   */
  readonly location?: string;

  /**
   * SKU name (optional - defaults to S0).
   *
   * @remarks
   * Only S0 is supported for OpenAI services.
   */
  readonly sku?: string;

  /**
   * Custom subdomain name (optional - auto-generated to match account name).
   *
   * @remarks
   * If not specified, will be set to match the account name.
   * Required for OpenAI services.
   */
  readonly customSubDomainName?: string;

  /**
   * Public network access (optional - default: Disabled for AuthR).
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Network ACL rules (optional - default: Deny all).
   */
  readonly networkAcls?: NetworkRuleSet;

  /**
   * Resource tags (optional - merged with parent tags).
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for OpenAI Service resources.
 */
export interface IOpenAIService {
  /**
   * The name of the OpenAI Service account.
   */
  readonly accountName: string;

  /**
   * The Azure region.
   */
  readonly location: string;

  /**
   * The SKU.
   */
  readonly sku: CognitiveServicesSku;

  /**
   * The custom subdomain name.
   */
  readonly customSubDomainName: string;

  /**
   * The resource ID of the OpenAI Service.
   */
  readonly accountId: string;
}
