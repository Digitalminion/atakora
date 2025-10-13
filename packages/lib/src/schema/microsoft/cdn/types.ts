/**
 * Type definitions for Azure CDN (Microsoft.Cdn).
 *
 * @remarks
 * Complete type definitions extracted from Microsoft.Cdn Azure schema.
 *
 * **Resource Types**:
 * - Microsoft.Cdn/profiles
 * - Microsoft.Cdn/profiles/endpoints
 * - Microsoft.Cdn/profiles/endpoints/origins
 * - Microsoft.Cdn/profiles/endpoints/customDomains
 *
 * **API Version**: 2024-02-01
 *
 * @packageDocumentation
 */

import type {
  CdnSkuName,
  QueryStringCachingBehavior,
  OptimizationType,
  ProtocolType,
  EndpointResourceState,
  CustomHttpsProvisioningState,
  CertificateSource,
  MinimumTlsVersion,
  RedirectType,
  GeoFilterAction,
} from './enums';

/**
 * SKU configuration for CDN Profile.
 *
 * @remarks
 * Defines the CDN provider and pricing tier.
 */
export interface Sku {
  /**
   * SKU name (CDN provider and tier).
   *
   * Available options:
   * - Standard_Microsoft: Microsoft CDN with standard features
   * - Standard_Akamai: Akamai CDN with high performance
   * - Standard_Verizon: Verizon CDN with enterprise features
   * - Premium_Verizon: Verizon CDN with advanced rules engine
   * - Standard_AzureFrontDoor: Azure Front Door with modern CDN and WAF
   * - Premium_AzureFrontDoor: Azure Front Door with private link and advanced security
   *
   * @example 'Standard_Microsoft'
   */
  readonly name: CdnSkuName;
}

/**
 * Managed identity configuration for CDN Profile.
 *
 * @remarks
 * Used for secure access to Azure resources like Key Vault for certificates.
 */
export interface ManagedServiceIdentity {
  /**
   * Identity type.
   *
   * Available types:
   * - None: No managed identity
   * - SystemAssigned: Azure-managed identity
   * - UserAssigned: User-created managed identity
   * - SystemAssigned,UserAssigned: Both types enabled
   *
   * @example 'SystemAssigned'
   */
  readonly type: 'None' | 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned';

  /**
   * User-assigned identities.
   *
   * @remarks
   * Map of user-assigned identity resource IDs to identity properties.
   * Required when type includes 'UserAssigned'.
   *
   * @example
   * {
   *   '/subscriptions/.../resourceGroups/.../providers/Microsoft.ManagedIdentity/userAssignedIdentities/myIdentity': {}
   * }
   */
  readonly userAssignedIdentities?: Record<string, UserAssignedIdentity>;
}

/**
 * User-assigned identity properties.
 */
export interface UserAssignedIdentity {
  /**
   * Client ID of the identity.
   *
   * @remarks
   * Read-only, populated by Azure after identity assignment.
   */
  readonly clientId?: string;

  /**
   * Principal ID of the identity.
   *
   * @remarks
   * Read-only, populated by Azure after identity assignment.
   */
  readonly principalId?: string;
}

/**
 * CDN Profile properties.
 *
 * @remarks
 * Core properties for Microsoft.Cdn/profiles resource.
 */
export interface ProfileProperties {
  /**
   * Origin response timeout in seconds.
   *
   * @remarks
   * Maximum time to wait for origin server response.
   *
   * Constraints:
   * - Minimum: 16 seconds
   * - Maximum: 240 seconds
   * - Default: 30 seconds
   *
   * @example 60
   */
  readonly originResponseTimeoutSeconds?: number;

  /**
   * Resource state.
   *
   * @remarks
   * Read-only, populated by Azure.
   *
   * Values: 'Creating' | 'Active' | 'Deleting' | 'Disabled'
   */
  readonly resourceState?: string;

  /**
   * Provisioning state.
   *
   * @remarks
   * Read-only, populated by Azure.
   *
   * Values: 'Creating' | 'Succeeded' | 'Failed'
   */
  readonly provisioningState?: string;

  /**
   * Front Door ID.
   *
   * @remarks
   * Read-only, only for Azure Front Door SKUs.
   */
  readonly frontDoorId?: string;

  /**
   * Extended properties.
   *
   * @remarks
   * Additional provider-specific configuration.
   */
  readonly extendedProperties?: Record<string, string>;
}

/**
 * Complete Microsoft.Cdn/profiles resource definition.
 *
 * @remarks
 * Top-level resource definition for Azure CDN Profile.
 *
 * **Resource Type**: Microsoft.Cdn/profiles
 * **API Version**: 2024-02-01
 */
export interface CdnProfile {
  /**
   * Profile name.
   *
   * @remarks
   * Must be globally unique across Azure.
   *
   * Constraints:
   * - Length: 1-260 characters
   * - Pattern: ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$
   * - Letters, numbers, and hyphens only
   * - Cannot start or end with hyphen
   *
   * @example 'my-cdn-profile'
   */
  readonly name: string;

  /**
   * Azure region location.
   *
   * @remarks
   * CDN profiles are typically deployed to 'global' but can be regional.
   *
   * @example 'global'
   */
  readonly location: string;

  /**
   * SKU configuration.
   *
   * @remarks
   * Defines CDN provider and pricing tier. Cannot be changed after creation.
   */
  readonly sku: Sku;

  /**
   * Resource tags.
   *
   * @remarks
   * Key-value pairs for resource organization and cost tracking.
   *
   * Constraints:
   * - Maximum 50 tags
   * - Key length: 1-512 characters
   * - Value length: 0-256 characters
   *
   * @example { 'Environment': 'Production', 'Application': 'WebPortal' }
   */
  readonly tags?: Record<string, string>;

  /**
   * Managed identity configuration.
   *
   * @remarks
   * Required for accessing Key Vault certificates for custom HTTPS.
   */
  readonly identity?: ManagedServiceIdentity;

  /**
   * CDN profile properties.
   */
  readonly properties?: ProfileProperties;
}

/**
 * Deep created origin for endpoint.
 *
 * @remarks
 * Origin server configuration embedded in endpoint creation.
 */
export interface DeepCreatedOrigin {
  /**
   * Origin name.
   *
   * @remarks
   * Constraints:
   * - Length: 1-260 characters
   * - Pattern: ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$
   *
   * @example 'my-origin'
   */
  readonly name: string;

  /**
   * Origin properties.
   */
  readonly properties?: {
    /**
     * Origin hostname.
     *
     * @remarks
     * FQDN or IP address of origin server.
     *
     * Constraints:
     * - Must be valid hostname or IP
     * - Cannot be same as endpoint hostname
     *
     * @example 'mystorageaccount.blob.core.windows.net'
     */
    readonly hostName: string;

    /**
     * HTTP port.
     *
     * @remarks
     * Port for HTTP connections to origin.
     *
     * Constraints:
     * - Valid port: 1-65535
     * - Default: 80
     *
     * @example 80
     */
    readonly httpPort?: number;

    /**
     * HTTPS port.
     *
     * @remarks
     * Port for HTTPS connections to origin.
     *
     * Constraints:
     * - Valid port: 1-65535
     * - Default: 443
     *
     * @example 443
     */
    readonly httpsPort?: number;

    /**
     * Origin host header.
     *
     * @remarks
     * Host header value sent to origin. Defaults to origin hostname.
     *
     * @example 'www.example.com'
     */
    readonly originHostHeader?: string;

    /**
     * Priority for origin group.
     *
     * @remarks
     * Lower priority origins are tried first.
     *
     * Constraints:
     * - Minimum: 1
     * - Maximum: 5
     *
     * @example 1
     */
    readonly priority?: number;

    /**
     * Weight for load balancing.
     *
     * @remarks
     * Higher weight receives more traffic.
     *
     * Constraints:
     * - Minimum: 1
     * - Maximum: 1000
     *
     * @example 100
     */
    readonly weight?: number;

    /**
     * Enable origin for load balancing.
     *
     * @remarks
     * Set to false to temporarily disable origin.
     *
     * @example true
     */
    readonly enabled?: boolean;

    /**
     * Private link resource ID.
     *
     * @remarks
     * Resource ID for private link connection (Premium Front Door only).
     *
     * @example '/subscriptions/.../resourceGroups/.../providers/Microsoft.Storage/storageAccounts/myaccount'
     */
    readonly privateLinkResourceId?: string;

    /**
     * Private link location.
     *
     * @remarks
     * Region of private link resource (Premium Front Door only).
     *
     * @example 'eastus'
     */
    readonly privateLinkLocation?: string;

    /**
     * Private link approval message.
     *
     * @remarks
     * Message for private endpoint connection approval.
     */
    readonly privateLinkApprovalMessage?: string;

    /**
     * Private endpoint status.
     *
     * @remarks
     * Read-only, populated by Azure.
     *
     * Values: 'Pending' | 'Approved' | 'Rejected' | 'Disconnected' | 'Timeout'
     */
    readonly privateEndpointStatus?: string;
  };
}

/**
 * Deep created origin group for endpoint.
 */
export interface DeepCreatedOriginGroup {
  /**
   * Origin group name.
   *
   * @remarks
   * Constraints:
   * - Length: 1-260 characters
   * - Pattern: ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$
   *
   * @example 'my-origin-group'
   */
  readonly name: string;

  /**
   * Origin group properties.
   */
  readonly properties?: {
    /**
     * Health probe settings.
     */
    readonly healthProbeSettings?: {
      /**
       * Probe path.
       *
       * @remarks
       * Path to use for health checks.
       *
       * @example '/health'
       */
      readonly probePath?: string;

      /**
       * Probe request type.
       *
       * Values: 'GET' | 'HEAD'
       *
       * @example 'GET'
       */
      readonly probeRequestType?: 'GET' | 'HEAD';

      /**
       * Probe protocol.
       *
       * Values: 'Http' | 'Https'
       *
       * @example 'Https'
       */
      readonly probeProtocol?: ProtocolType;

      /**
       * Probe interval in seconds.
       *
       * @remarks
       * How often to probe origin health.
       *
       * Constraints:
       * - Minimum: 1
       * - Maximum: 255
       * - Default: 30
       *
       * @example 30
       */
      readonly probeIntervalInSeconds?: number;
    };

    /**
     * Origins in this group.
     */
    readonly origins?: Array<{
      /**
       * Resource ID of the origin.
       */
      readonly id: string;
    }>;

    /**
     * Traffic restoration time in minutes.
     *
     * @remarks
     * Time to wait before restoring traffic to recovered origin.
     *
     * Constraints:
     * - Minimum: 0
     * - Maximum: 50
     *
     * @example 10
     */
    readonly trafficRestorationTimeToHealedOrNewEndpointsInMinutes?: number;

    /**
     * Response based origin error detection.
     */
    readonly responseBasedOriginErrorDetectionSettings?: {
      /**
       * HTTP error ranges.
       */
      readonly httpErrorRanges?: Array<{
        /**
         * Beginning of error range.
         */
        readonly begin?: number;

        /**
         * End of error range.
         */
        readonly end?: number;
      }>;

      /**
       * Response based detected error types.
       *
       * Values: 'None' | 'TcpErrorsOnly' | 'TcpAndHttpErrors'
       */
      readonly responseBasedDetectedErrorTypes?: 'None' | 'TcpErrorsOnly' | 'TcpAndHttpErrors';

      /**
       * Response based failover threshold.
       *
       * @remarks
       * Percentage of errors before failover.
       *
       * Constraints:
       * - Minimum: 0
       * - Maximum: 100
       */
      readonly responseBasedFailoverThresholdPercentage?: number;
    };
  };
}

/**
 * Geo filter for content delivery.
 */
export interface GeoFilter {
  /**
   * Relative path to apply filter to.
   *
   * @remarks
   * Path pattern for geo-filtering.
   *
   * @example '/content/*'
   */
  readonly relativePath: string;

  /**
   * Action to take.
   *
   * Values: 'Block' | 'Allow'
   *
   * @example 'Block'
   */
  readonly action: GeoFilterAction;

  /**
   * Country codes.
   *
   * @remarks
   * Two-letter ISO 3166-1 alpha-2 country codes.
   *
   * @example ['US', 'CA', 'MX']
   */
  readonly countryCodes: string[];
}

/**
 * URL signing key.
 */
export interface UrlSigningKey {
  /**
   * Key ID.
   *
   * @remarks
   * Identifier for this signing key.
   *
   * @example 'key1'
   */
  readonly keyId: string;

  /**
   * Key parameters.
   */
  readonly parameters: {
    /**
     * Type name for key.
     *
     * @remarks
     * Must be 'KeyVaultSigningKeyParameters' for Key Vault keys.
     */
    readonly typeName: 'KeyVaultSigningKeyParameters';

    /**
     * Subscription ID where Key Vault is located.
     */
    readonly subscriptionId: string;

    /**
     * Resource group where Key Vault is located.
     */
    readonly resourceGroupName: string;

    /**
     * Key Vault name.
     */
    readonly vaultName: string;

    /**
     * Secret name in Key Vault.
     */
    readonly secretName: string;

    /**
     * Secret version in Key Vault.
     */
    readonly secretVersion: string;
  };
}

/**
 * Delivery policy rule.
 */
export interface DeliveryRule {
  /**
   * Rule name.
   */
  readonly name?: string;

  /**
   * Rule order.
   *
   * @remarks
   * Lower order rules execute first.
   */
  readonly order: number;

  /**
   * Conditions for rule execution.
   */
  readonly conditions?: Array<DeliveryRuleCondition>;

  /**
   * Actions to take when conditions match.
   */
  readonly actions: Array<DeliveryRuleAction>;
}

/**
 * Base delivery rule condition.
 */
export interface DeliveryRuleCondition {
  /**
   * Condition name.
   *
   * Values: 'RemoteAddress' | 'RequestMethod' | 'QueryString' | 'PostArgs' | 'RequestUri' | 'RequestHeader' | 'RequestBody' | 'RequestScheme' | 'UrlPath' | 'UrlFileExtension' | 'UrlFileName' | 'HttpVersion' | 'Cookies' | 'IsDevice' | 'SocketAddr' | 'ClientPort' | 'ServerPort' | 'HostName' | 'SslProtocol'
   */
  readonly name: string;

  /**
   * Condition parameters (varies by condition type).
   */
  readonly parameters?: any;
}

/**
 * Base delivery rule action.
 */
export interface DeliveryRuleAction {
  /**
   * Action name.
   *
   * Values: 'CacheExpiration' | 'CacheKeyQueryString' | 'ModifyRequestHeader' | 'ModifyResponseHeader' | 'UrlRedirect' | 'UrlRewrite' | 'OriginGroupOverride' | 'RouteConfigurationOverride'
   */
  readonly name: string;

  /**
   * Action parameters (varies by action type).
   */
  readonly parameters?: any;
}

/**
 * Delivery policy.
 */
export interface EndpointPropertiesUpdateParametersDeliveryPolicy {
  /**
   * Description of the policy.
   */
  readonly description?: string;

  /**
   * List of delivery rules.
   */
  readonly rules: DeliveryRule[];
}

/**
 * CDN endpoint properties.
 *
 * @remarks
 * Core properties for Microsoft.Cdn/profiles/endpoints resource.
 */
export interface EndpointProperties {
  /**
   * Origin hostname.
   *
   * @remarks
   * Deprecated - use origins array instead.
   *
   * @deprecated Use origins array
   */
  readonly originHostHeader?: string;

  /**
   * Origin path.
   *
   * @remarks
   * Path to append to origin requests.
   *
   * @example '/content'
   */
  readonly originPath?: string;

  /**
   * Content types to compress.
   *
   * @remarks
   * MIME types that CDN will compress.
   *
   * @example ['text/plain', 'text/html', 'text/css', 'application/javascript', 'application/json']
   */
  readonly contentTypesToCompress?: string[];

  /**
   * Origin groups.
   *
   * @remarks
   * List of origin groups for this endpoint.
   */
  readonly originGroups?: DeepCreatedOriginGroup[];

  /**
   * Enable compression.
   *
   * @remarks
   * Enables gzip compression for compatible content types.
   *
   * @example true
   */
  readonly isCompressionEnabled?: boolean;

  /**
   * Enable HTTP.
   *
   * @remarks
   * Allow HTTP traffic to endpoint.
   *
   * @example true
   */
  readonly isHttpAllowed?: boolean;

  /**
   * Enable HTTPS.
   *
   * @remarks
   * Allow HTTPS traffic to endpoint.
   *
   * @example true
   */
  readonly isHttpsAllowed?: boolean;

  /**
   * Query string caching behavior.
   *
   * @remarks
   * How CDN handles query strings in cache keys.
   */
  readonly queryStringCachingBehavior?: QueryStringCachingBehavior;

  /**
   * Optimization type.
   *
   * @remarks
   * Content delivery optimization scenario.
   */
  readonly optimizationType?: OptimizationType;

  /**
   * Probe path.
   *
   * @remarks
   * Path for origin health checks.
   *
   * @example '/healthcheck.html'
   */
  readonly probePath?: string;

  /**
   * Geo filters.
   *
   * @remarks
   * Country-based access control rules.
   */
  readonly geoFilters?: GeoFilter[];

  /**
   * Default origin group.
   */
  readonly defaultOriginGroup?: {
    /**
     * Resource ID of default origin group.
     */
    readonly id: string;
  };

  /**
   * URL signing keys.
   *
   * @remarks
   * Keys for signed URL authentication.
   */
  readonly urlSigningKeys?: UrlSigningKey[];

  /**
   * Delivery policy.
   *
   * @remarks
   * Rules engine for request/response manipulation.
   */
  readonly deliveryPolicy?: EndpointPropertiesUpdateParametersDeliveryPolicy;

  /**
   * Web application firewall policy link.
   */
  readonly webApplicationFirewallPolicyLink?: {
    /**
     * Resource ID of WAF policy.
     */
    readonly id: string;
  };

  /**
   * Origins.
   *
   * @remarks
   * List of origin servers for this endpoint.
   */
  readonly origins?: DeepCreatedOrigin[];

  /**
   * Resource state.
   *
   * @remarks
   * Read-only, populated by Azure.
   */
  readonly resourceState?: EndpointResourceState;

  /**
   * Provisioning state.
   *
   * @remarks
   * Read-only, populated by Azure.
   */
  readonly provisioningState?: string;

  /**
   * Hostname.
   *
   * @remarks
   * Read-only, populated by Azure.
   * Endpoint FQDN.
   */
  readonly hostName?: string;
}

/**
 * Complete Microsoft.Cdn/profiles/endpoints resource definition.
 *
 * @remarks
 * Child resource of CDN profile representing content delivery endpoint.
 *
 * **Resource Type**: Microsoft.Cdn/profiles/endpoints
 * **API Version**: 2024-02-01
 */
export interface CdnEndpoint {
  /**
   * Endpoint name.
   *
   * @remarks
   * Must be globally unique (forms part of FQDN).
   *
   * Constraints:
   * - Length: 1-50 characters
   * - Pattern: ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$
   * - Lowercase letters, numbers, and hyphens only
   * - Cannot start or end with hyphen
   *
   * @example 'my-endpoint'
   */
  readonly name: string;

  /**
   * Azure region location.
   *
   * @remarks
   * Usually inherits from parent profile, but can be overridden.
   *
   * @example 'global'
   */
  readonly location: string;

  /**
   * Resource tags.
   *
   * @example { 'Application': 'WebPortal' }
   */
  readonly tags?: Record<string, string>;

  /**
   * Endpoint properties.
   */
  readonly properties: EndpointProperties;
}

/**
 * Custom domain HTTPS parameters for CDN managed certificate.
 */
export interface CdnManagedHttpsParameters {
  /**
   * Certificate source type.
   *
   * @remarks
   * Must be 'Cdn' for CDN-managed certificates.
   */
  readonly certificateSource: 'Cdn';

  /**
   * Protocol type for certificate.
   *
   * Values: 'ServerNameIndication' | 'IPBased'
   *
   * @remarks
   * ServerNameIndication (SNI) is recommended and free.
   * IPBased requires dedicated IP and additional cost.
   *
   * @example 'ServerNameIndication'
   */
  readonly protocolType: 'ServerNameIndication' | 'IPBased';

  /**
   * Minimum TLS version.
   *
   * @example 'TLS12'
   */
  readonly minimumTlsVersion?: MinimumTlsVersion;
}

/**
 * Custom domain HTTPS parameters for Key Vault certificate.
 */
export interface UserManagedHttpsParameters {
  /**
   * Certificate source type.
   *
   * @remarks
   * Must be 'AzureKeyVault' for Key Vault certificates.
   */
  readonly certificateSource: 'AzureKeyVault';

  /**
   * Protocol type for certificate.
   *
   * Values: 'ServerNameIndication' | 'IPBased'
   *
   * @example 'ServerNameIndication'
   */
  readonly protocolType: 'ServerNameIndication' | 'IPBased';

  /**
   * Minimum TLS version.
   *
   * @example 'TLS12'
   */
  readonly minimumTlsVersion?: MinimumTlsVersion;

  /**
   * Key Vault certificate parameters.
   */
  readonly certificateSourceParameters: {
    /**
     * Subscription ID where Key Vault is located.
     */
    readonly subscriptionId: string;

    /**
     * Resource group where Key Vault is located.
     */
    readonly resourceGroupName: string;

    /**
     * Key Vault name.
     */
    readonly vaultName: string;

    /**
     * Secret name in Key Vault.
     */
    readonly secretName: string;

    /**
     * Secret version in Key Vault.
     */
    readonly secretVersion: string;

    /**
     * Update trigger for certificate rotation.
     *
     * Values: 'Manual' | 'Auto'
     */
    readonly updateRule?: 'Manual' | 'Auto';

    /**
     * Delete rule when certificate is deleted.
     *
     * Values: 'NoAction'
     */
    readonly deleteRule?: 'NoAction';
  };
}

/**
 * Custom domain properties.
 */
export interface CustomDomainProperties {
  /**
   * Custom domain hostname.
   *
   * @remarks
   * Must have CNAME pointing to endpoint hostname.
   *
   * Constraints:
   * - Must be valid hostname
   * - Must have CNAME record to endpoint
   *
   * @example 'www.example.com'
   */
  readonly hostName: string;

  /**
   * Validation data for custom domain.
   *
   * @remarks
   * Read-only, used for domain validation.
   */
  readonly validationData?: string;

  /**
   * Custom HTTPS provisioning state.
   *
   * @remarks
   * Read-only, populated by Azure.
   */
  readonly customHttpsProvisioningState?: CustomHttpsProvisioningState;

  /**
   * Custom HTTPS provisioning substate.
   *
   * @remarks
   * Read-only, detailed provisioning status.
   */
  readonly customHttpsProvisioningSubstate?: string;

  /**
   * Custom HTTPS parameters.
   *
   * @remarks
   * Configure HTTPS using CDN-managed or Key Vault certificate.
   */
  readonly customHttpsParameters?: CdnManagedHttpsParameters | UserManagedHttpsParameters;

  /**
   * Resource state.
   *
   * @remarks
   * Read-only, populated by Azure.
   */
  readonly resourceState?: string;

  /**
   * Provisioning state.
   *
   * @remarks
   * Read-only, populated by Azure.
   */
  readonly provisioningState?: string;
}

/**
 * Complete Microsoft.Cdn/profiles/endpoints/customDomains resource definition.
 *
 * @remarks
 * Child resource of CDN endpoint for custom domain configuration.
 *
 * **Resource Type**: Microsoft.Cdn/profiles/endpoints/customDomains
 * **API Version**: 2024-02-01
 */
export interface CdnCustomDomain {
  /**
   * Custom domain name.
   *
   * @remarks
   * Friendly name for the custom domain resource.
   *
   * Constraints:
   * - Length: 1-260 characters
   * - Pattern: ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$
   *
   * @example 'my-custom-domain'
   */
  readonly name: string;

  /**
   * Custom domain properties.
   */
  readonly properties: CustomDomainProperties;
}

/**
 * Origin properties.
 */
export interface OriginProperties {
  /**
   * Origin hostname.
   *
   * @remarks
   * FQDN or IP address of origin server.
   *
   * @example 'mystorageaccount.blob.core.windows.net'
   */
  readonly hostName: string;

  /**
   * HTTP port.
   *
   * @remarks
   * Constraints:
   * - Valid port: 1-65535
   * - Default: 80
   */
  readonly httpPort?: number;

  /**
   * HTTPS port.
   *
   * @remarks
   * Constraints:
   * - Valid port: 1-65535
   * - Default: 443
   */
  readonly httpsPort?: number;

  /**
   * Origin host header.
   *
   * @remarks
   * Host header value sent to origin.
   */
  readonly originHostHeader?: string;

  /**
   * Priority.
   *
   * @remarks
   * Constraints:
   * - Minimum: 1
   * - Maximum: 5
   */
  readonly priority?: number;

  /**
   * Weight.
   *
   * @remarks
   * Constraints:
   * - Minimum: 1
   * - Maximum: 1000
   */
  readonly weight?: number;

  /**
   * Enabled.
   */
  readonly enabled?: boolean;

  /**
   * Private link resource ID.
   */
  readonly privateLinkResourceId?: string;

  /**
   * Private link location.
   */
  readonly privateLinkLocation?: string;

  /**
   * Private link approval message.
   */
  readonly privateLinkApprovalMessage?: string;

  /**
   * Private endpoint status.
   *
   * @remarks
   * Read-only.
   */
  readonly privateEndpointStatus?: string;

  /**
   * Resource state.
   *
   * @remarks
   * Read-only.
   */
  readonly resourceState?: string;

  /**
   * Provisioning state.
   *
   * @remarks
   * Read-only.
   */
  readonly provisioningState?: string;
}

/**
 * Complete Microsoft.Cdn/profiles/endpoints/origins resource definition.
 *
 * @remarks
 * Child resource of CDN endpoint representing origin server.
 *
 * **Resource Type**: Microsoft.Cdn/profiles/endpoints/origins
 * **API Version**: 2024-02-01
 */
export interface CdnOrigin {
  /**
   * Origin name.
   *
   * @remarks
   * Constraints:
   * - Length: 1-260 characters
   * - Pattern: ^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$
   *
   * @example 'my-origin'
   */
  readonly name: string;

  /**
   * Origin properties.
   */
  readonly properties: OriginProperties;
}
