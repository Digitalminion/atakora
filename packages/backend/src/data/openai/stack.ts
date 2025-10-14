import { Construct } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { Accounts, type IOpenAIService, CognitiveServicesSkuName } from '@atakora/cdk/cognitiveservices';
import { PrivateEndpoints, PrivateDnsZones, type IPrivateEndpoint, type ISubnet, type IPrivateDnsZone } from '@atakora/cdk/network';

/**
 * Configuration for OpenAI Stack
 */
export interface OpenAIStackProps {
  /**
   * Resource Group to deploy OpenAI into
   */
  resourceGroup: IResourceGroup;

  /**
   * Subnet for the private endpoint
   */
  privateEndpointSubnet: ISubnet;

  /**
   * Whether to create a new Private DNS Zone (default: true)
   *
   * @remarks
   * If false, you must provide existingPrivateDnsZone
   */
  createPrivateDnsZone?: boolean;

  /**
   * Existing Private DNS Zone to use for DNS integration
   *
   * @remarks
   * Only used if createPrivateDnsZone is false
   */
  existingPrivateDnsZone?: IPrivateDnsZone;

  /**
   * OpenAI account SKU (default: S0)
   *
   * @remarks
   * Common values: S0 (Standard)
   */
  sku?: string;

  /**
   * Custom subdomain for the OpenAI account
   *
   * @remarks
   * If not specified, a unique name will be generated
   */
  customSubDomainName?: string;

  /**
   * Log Analytics Workspace ID for diagnostic settings
   */
  logAnalyticsWorkspaceId?: string;

  /**
   * Additional tags
   */
  tags?: Record<string, string>;
}

/**
 * Azure OpenAI Capability Stack
 *
 * @remarks
 * Self-contained stack that creates a complete Azure OpenAI deployment including:
 * - Azure OpenAI Account (Cognitive Services)
 * - Private Endpoint for secure connectivity
 * - Private DNS Zone (or uses existing)
 * - DNS integration
 *
 * This stack follows the single responsibility principle - it creates
 * everything needed for a fully functional, privately accessible OpenAI service.
 *
 * @example
 * Basic usage with auto-created DNS zone:
 * ```typescript
 * const openAIStack = new OpenAIStack(app, 'OpenAI', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet
 * });
 *
 * // Access the resources
 * const account = openAIStack.openAIAccount;
 * const endpoint = openAIStack.privateEndpoint;
 * ```
 *
 * @example
 * With custom subdomain:
 * ```typescript
 * const openAIStack = new OpenAIStack(app, 'OpenAI', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet,
 *   customSubDomainName: 'my-company-openai',
 *   tags: { service: 'ai-platform' }
 * });
 * ```
 *
 * @example
 * Using existing DNS zone:
 * ```typescript
 * const openAIStack = new OpenAIStack(app, 'OpenAI', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet,
 *   createPrivateDnsZone: false,
 *   existingPrivateDnsZone: sharedDnsZone
 * });
 * ```
 */
export class OpenAIStack extends Construct {
  /**
   * Azure OpenAI Account
   */
  public readonly openAIAccount: IOpenAIService;

  /**
   * Private Endpoint for OpenAI
   */
  public readonly privateEndpoint: IPrivateEndpoint;

  /**
   * Private DNS Zone for OpenAI
   */
  public readonly privateDnsZone: IPrivateDnsZone;

  /**
   * Resource Group where OpenAI is deployed
   */
  public readonly resourceGroup: IResourceGroup;

  constructor(scope: Construct, id: string, props: OpenAIStackProps) {
    super(scope, id);

    this.resourceGroup = props.resourceGroup;

    // Merge stack tag with provided tags
    const stackTags = {
      stack: 'openai',
      service: 'data',
      ...props.tags,
    };

    // Create Azure OpenAI Account
    this.openAIAccount = new Accounts(this, 'Account', {
      location: props.resourceGroup.location,
      sku: props.sku ?? 'S0',
      customSubDomainName: props.customSubDomainName,
      tags: stackTags,
    });

    // Create or use existing Private DNS Zone
    if (props.createPrivateDnsZone !== false) {
      // Create new Private DNS Zone
      this.privateDnsZone = new PrivateDnsZones(this, 'PrivateDnsZone', {
        zoneName: 'privatelink.openai.azure.com',
        tags: stackTags,
      });
    } else {
      // Use existing Private DNS Zone
      if (!props.existingPrivateDnsZone) {
        throw new Error(
          'When createPrivateDnsZone is false, existingPrivateDnsZone must be provided'
        );
      }
      this.privateDnsZone = props.existingPrivateDnsZone;
    }

    // Create Private Endpoint with DNS integration
    this.privateEndpoint = new PrivateEndpoints(this, 'OpenAIPrivateEndpoint', {
      subnet: props.privateEndpointSubnet,
      privateLinkServiceId: this.openAIAccount.accountId,
      groupIds: ['account'],
      privateDnsZoneId: this.privateDnsZone.zoneId,
      tags: stackTags,
    });
  }

  /**
   * Get deployed configuration
   */
  public getDeployedConfig() {
    return {
      openAIAccount: {
        id: this.openAIAccount.accountId,
        name: this.openAIAccount.accountName,
        endpoint: `https://${this.openAIAccount.customSubDomainName}.openai.azure.com/`,
      },
      privateEndpoint: {
        id: this.privateEndpoint.privateEndpointId,
        name: this.privateEndpoint.privateEndpointName,
      },
      privateDnsZone: {
        id: this.privateDnsZone.zoneId,
        name: this.privateDnsZone.zoneName,
      },
    };
  }
}
