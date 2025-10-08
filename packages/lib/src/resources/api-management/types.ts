/**
 * Type definitions for API Management constructs.
 *
 * @packageDocumentation
 */

/**
 * SKU name for API Management service.
 */
export enum ApiManagementSkuName {
  DEVELOPER = 'Developer',
  BASIC = 'Basic',
  STANDARD = 'Standard',
  PREMIUM = 'Premium',
  CONSUMPTION = 'Consumption',
  ISOLATED = 'Isolated',
}

/**
 * Virtual network type for API Management.
 */
export enum VirtualNetworkType {
  NONE = 'None',
  EXTERNAL = 'External',
  INTERNAL = 'Internal',
}

/**
 * Hostname type for API Management.
 */
export enum HostnameType {
  PROXY = 'Proxy',
  PORTAL = 'Portal',
  MANAGEMENT = 'Management',
  SCM = 'Scm',
  DEVELOPER_PORTAL = 'DeveloperPortal',
}

/**
 * SKU configuration for API Management.
 */
export interface ApiManagementSku {
  /**
   * SKU name.
   */
  readonly name: ApiManagementSkuName;

  /**
   * Capacity/scale units.
   *
   * @remarks
   * - Developer: 1 (fixed)
   * - Basic: 1-2
   * - Standard: 1-4
   * - Premium: 1-12 (per region)
   * - Consumption: Not applicable
   */
  readonly capacity: number;
}

/**
 * Identity configuration for API Management.
 */
export interface ApiManagementIdentity {
  /**
   * Identity type.
   */
  readonly type: 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned, UserAssigned' | 'None';

  /**
   * User assigned identity IDs.
   */
  readonly userAssignedIdentities?: Record<string, {}>;
}

/**
 * Hostname configuration.
 */
export interface HostnameConfiguration {
  /**
   * Hostname type.
   */
  readonly type: HostnameType;

  /**
   * Hostname.
   */
  readonly hostName: string;

  /**
   * Default SSL binding.
   */
  readonly defaultSslBinding?: boolean;

  /**
   * Negotiate client certificate.
   */
  readonly negotiateClientCertificate?: boolean;

  /**
   * Key Vault ID for certificate.
   */
  readonly keyVaultId?: string;

  /**
   * Certificate password.
   */
  readonly certificatePassword?: string;
}

/**
 * Virtual network configuration.
 */
export interface VirtualNetworkConfiguration {
  /**
   * Subnet resource ID.
   */
  readonly subnetResourceId: string;
}

/**
 * Additional location configuration for multi-region deployment.
 */
export interface AdditionalLocation {
  /**
   * Azure region.
   */
  readonly location: string;

  /**
   * SKU configuration for this location.
   */
  readonly sku: ApiManagementSku;

  /**
   * Virtual network configuration for this location.
   */
  readonly virtualNetworkConfiguration?: VirtualNetworkConfiguration;

  /**
   * Public IP address ID for this location.
   */
  readonly publicIpAddressId?: string;
}

/**
 * Properties for ArmApiManagement (L1 construct).
 *
 * @remarks
 * Direct mapping to Microsoft.ApiManagement/service ARM resource.
 * All properties are explicit with no defaults or auto-generation.
 *
 * ARM API Version: 2024-05-01
 *
 * @example
 * ```typescript
 * const props: ArmApiManagementProps = {
 *   serviceName: 'apim-authr-nonprod',
 *   location: 'eastus',
 *   sku: {
 *     name: ApiManagementSkuName.DEVELOPER,
 *     capacity: 1
 *   },
 *   publisherName: 'Avient AuthR',
 *   publisherEmail: 'admin@avient.com',
 *   identity: {
 *     type: 'SystemAssigned'
 *   }
 * };
 * ```
 */
export interface ArmApiManagementProps {
  /**
   * API Management service name.
   *
   * @remarks
   * - Must be 1-50 characters
   * - Alphanumeric and hyphens only
   * - Must start with letter
   * - Must end with alphanumeric
   * - Must be globally unique across Azure
   * - Pattern: ^[a-zA-Z][a-zA-Z0-9-]{0,48}[a-zA-Z0-9]$
   */
  readonly serviceName: string;

  /**
   * Azure region where the API Management service will be created.
   */
  readonly location: string;

  /**
   * SKU configuration (required).
   */
  readonly sku: ApiManagementSku;

  /**
   * Publisher name (required).
   *
   * @remarks
   * Used in developer portal and email notifications.
   */
  readonly publisherName: string;

  /**
   * Publisher email (required).
   *
   * @remarks
   * Must be a valid email address.
   */
  readonly publisherEmail: string;

  /**
   * Managed identity configuration.
   */
  readonly identity?: ApiManagementIdentity;

  /**
   * API Management service properties.
   */
  readonly properties?: {
    /**
     * Notification sender email.
     */
    readonly notificationSenderEmail?: string;

    /**
     * Hostname configurations.
     */
    readonly hostnameConfigurations?: readonly HostnameConfiguration[];

    /**
     * Virtual network type.
     */
    readonly virtualNetworkType?: VirtualNetworkType;

    /**
     * Virtual network configuration.
     */
    readonly virtualNetworkConfiguration?: VirtualNetworkConfiguration;

    /**
     * Additional locations for multi-region deployment.
     */
    readonly additionalLocations?: readonly AdditionalLocation[];

    /**
     * Custom properties for security and protocol settings.
     */
    readonly customProperties?: Record<string, string>;

    /**
     * Enable client certificate on gateway.
     */
    readonly enableClientCertificate?: boolean;

    /**
     * Disable gateway (for consumption SKU with self-hosted gateway only).
     */
    readonly disableGateway?: boolean;

    /**
     * Public network access.
     */
    readonly publicNetworkAccess?: 'Enabled' | 'Disabled';

    /**
     * Restore from soft-deleted service.
     */
    readonly restore?: boolean;
  };

  /**
   * Tags to apply to the API Management service.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for ApiManagement (L2 construct).
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-generation.
 * Designed for developer productivity with minimal required properties.
 *
 * @example
 * ```typescript
 * // Minimal usage - auto-generates name and uses defaults
 * const apim = new ApiManagement(resourceGroup, 'Gateway', {
 *   publisherName: 'Avient AuthR',
 *   publisherEmail: 'admin@avient.com'
 * });
 *
 * // With VNet integration
 * const apim = new ApiManagement(resourceGroup, 'Gateway', {
 *   publisherName: 'Avient AuthR',
 *   publisherEmail: 'admin@avient.com',
 *   sku: ApiManagementSkuName.PREMIUM,
 *   capacity: 2,
 *   virtualNetworkType: VirtualNetworkType.EXTERNAL,
 *   subnetId: subnet.subnetId
 * });
 * ```
 */
export interface ApiManagementProps {
  /**
   * API Management service name.
   *
   * @remarks
   * If not provided, will be auto-generated using the stack's naming context.
   * - Format: `apim-{org}-{project}-{purpose}-{env}-{geo}-{instance}`
   * - Example: `apim-dp-authr-gateway-np-eus-01`
   *
   * The `purpose` is derived from the construct ID.
   */
  readonly serviceName?: string;

  /**
   * Azure region where the API Management service will be created.
   *
   * @remarks
   * If not provided, defaults to the parent resource group's location.
   */
  readonly location?: string;

  /**
   * SKU name.
   *
   * @remarks
   * Defaults to Developer for non-prod, Premium for prod (based on environment context).
   */
  readonly sku?: ApiManagementSkuName;

  /**
   * Capacity/scale units.
   *
   * @remarks
   * Defaults to 1 for Developer/Basic/Standard, 2 for Premium.
   */
  readonly capacity?: number;

  /**
   * Publisher name (required).
   */
  readonly publisherName: string;

  /**
   * Publisher email (required).
   */
  readonly publisherEmail: string;

  /**
   * Notification sender email.
   *
   * @remarks
   * Defaults to noreply@{publisherEmailDomain}
   */
  readonly notificationSenderEmail?: string;

  /**
   * Enable system-assigned managed identity.
   *
   * @remarks
   * Defaults to true.
   */
  readonly enableSystemIdentity?: boolean;

  /**
   * Virtual network type.
   *
   * @remarks
   * Defaults to None (no VNet integration).
   */
  readonly virtualNetworkType?: VirtualNetworkType;

  /**
   * Subnet ID for VNet integration.
   *
   * @remarks
   * Required if virtualNetworkType is External or Internal.
   */
  readonly subnetId?: string;

  /**
   * Additional locations for multi-region deployment.
   */
  readonly additionalLocations?: readonly AdditionalLocation[];

  /**
   * Custom hostname configurations.
   */
  readonly hostnameConfigurations?: readonly HostnameConfiguration[];

  /**
   * Disable TLS 1.0, 1.1, and SSL 3.0.
   *
   * @remarks
   * Defaults to true (secure by default).
   */
  readonly disableLegacyTls?: boolean;

  /**
   * Public network access.
   *
   * @remarks
   * Defaults to Enabled. Set to Disabled for private-only access.
   */
  readonly publicNetworkAccess?: 'Enabled' | 'Disabled';

  /**
   * Tags to apply to the API Management service.
   *
   * @remarks
   * These tags will be merged with the parent's tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for API Management reference.
 *
 * @remarks
 * Allows resources to reference an API Management service without depending on the construct class.
 */
export interface IApiManagement {
  /**
   * Name of the API Management service.
   */
  readonly serviceName: string;

  /**
   * Location of the API Management service.
   */
  readonly location: string;

  /**
   * Resource ID of the API Management service.
   */
  readonly apiManagementId: string;

  /**
   * Gateway URL.
   */
  readonly gatewayUrl: string;

  /**
   * Management API URL.
   */
  readonly managementUrl: string;
}

// ============================================================================
// API Management API Sub-resource Types
// ============================================================================

/**
 * API protocol.
 */
export enum ApiProtocol {
  HTTP = 'http',
  HTTPS = 'https',
  WS = 'ws',
  WSS = 'wss',
}

/**
 * API type.
 */
export enum ApiType {
  HTTP = 'http',
  SOAP = 'soap',
  WEBSOCKET = 'websocket',
  GRAPHQL = 'graphql',
}

/**
 * Subscription key parameter names.
 */
export interface SubscriptionKeyParameterNames {
  /**
   * Header name for subscription key.
   */
  readonly header?: string;

  /**
   * Query parameter name for subscription key.
   */
  readonly query?: string;
}

/**
 * Properties for ArmApiManagementApi (L1 construct).
 */
export interface ArmApiManagementApiProps {
  /**
   * Parent API Management service.
   */
  readonly apiManagementService: IApiManagement;

  /**
   * API name/identifier.
   */
  readonly apiName: string;

  /**
   * API properties.
   */
  readonly properties: {
    /**
     * Display name.
     */
    readonly displayName: string;

    /**
     * Description.
     */
    readonly description?: string;

    /**
     * Backend service URL.
     */
    readonly serviceUrl?: string;

    /**
     * API path (relative to gateway URL).
     */
    readonly path: string;

    /**
     * Protocols.
     */
    readonly protocols?: readonly ApiProtocol[];

    /**
     * API type.
     */
    readonly type?: ApiType;

    /**
     * Subscription required.
     */
    readonly subscriptionRequired?: boolean;

    /**
     * Subscription key parameter names.
     */
    readonly subscriptionKeyParameterNames?: SubscriptionKeyParameterNames;

    /**
     * API version.
     */
    readonly apiVersion?: string;

    /**
     * API version set ID.
     */
    readonly apiVersionSetId?: string;
  };
}

/**
 * Properties for ApiManagementApi (L2 construct).
 */
export interface ApiManagementApiProps {
  /**
   * Parent API Management service.
   */
  readonly apiManagementService: IApiManagement;

  /**
   * API name/identifier.
   *
   * @remarks
   * If not provided, will be derived from construct ID.
   */
  readonly apiName?: string;

  /**
   * Display name.
   */
  readonly displayName: string;

  /**
   * Description.
   */
  readonly description?: string;

  /**
   * Backend service URL.
   */
  readonly serviceUrl: string;

  /**
   * API path (relative to gateway URL).
   *
   * @remarks
   * Defaults to the API name.
   */
  readonly path?: string;

  /**
   * Protocols.
   *
   * @remarks
   * Defaults to HTTPS only.
   */
  readonly protocols?: readonly ApiProtocol[];

  /**
   * API type.
   *
   * @remarks
   * Defaults to HTTP.
   */
  readonly type?: ApiType;

  /**
   * Subscription required.
   *
   * @remarks
   * Defaults to true.
   */
  readonly subscriptionRequired?: boolean;

  /**
   * Subscription key parameter names.
   */
  readonly subscriptionKeyParameterNames?: SubscriptionKeyParameterNames;
}

/**
 * Interface for API Management API reference.
 */
export interface IApiManagementApi {
  /**
   * API name.
   */
  readonly apiName: string;

  /**
   * API path.
   */
  readonly path: string;

  /**
   * Resource ID.
   */
  readonly apiId: string;
}

// ============================================================================
// API Management Product Sub-resource Types
// ============================================================================

/**
 * Product state.
 */
export enum ProductState {
  NOT_PUBLISHED = 'notPublished',
  PUBLISHED = 'published',
}

/**
 * Properties for ArmApiManagementProduct (L1 construct).
 */
export interface ArmApiManagementProductProps {
  /**
   * Parent API Management service.
   */
  readonly apiManagementService: IApiManagement;

  /**
   * Product name/identifier.
   */
  readonly productName: string;

  /**
   * Product properties.
   */
  readonly properties: {
    /**
     * Display name.
     */
    readonly displayName: string;

    /**
     * Description.
     */
    readonly description?: string;

    /**
     * Subscription required.
     */
    readonly subscriptionRequired?: boolean;

    /**
     * Approval required for subscription.
     */
    readonly approvalRequired?: boolean;

    /**
     * Subscriptions limit.
     */
    readonly subscriptionsLimit?: number;

    /**
     * Product state.
     */
    readonly state?: ProductState;

    /**
     * Terms of use.
     */
    readonly terms?: string;
  };
}

/**
 * Properties for ApiManagementProduct (L2 construct).
 */
export interface ApiManagementProductProps {
  /**
   * Parent API Management service.
   */
  readonly apiManagementService: IApiManagement;

  /**
   * Product name/identifier.
   *
   * @remarks
   * If not provided, will be derived from construct ID.
   */
  readonly productName?: string;

  /**
   * Display name.
   */
  readonly displayName: string;

  /**
   * Description.
   */
  readonly description?: string;

  /**
   * Subscription required.
   *
   * @remarks
   * Defaults to true.
   */
  readonly subscriptionRequired?: boolean;

  /**
   * Approval required for subscription.
   *
   * @remarks
   * Defaults to false.
   */
  readonly approvalRequired?: boolean;

  /**
   * Subscriptions limit.
   *
   * @remarks
   * Defaults to unlimited (not set).
   */
  readonly subscriptionsLimit?: number;

  /**
   * Product state.
   *
   * @remarks
   * Defaults to published.
   */
  readonly state?: ProductState;

  /**
   * Terms of use.
   */
  readonly terms?: string;
}

/**
 * Interface for API Management Product reference.
 */
export interface IApiManagementProduct {
  /**
   * Product name.
   */
  readonly productName: string;

  /**
   * Resource ID.
   */
  readonly productId: string;
}

// ============================================================================
// API Management Subscription Sub-resource Types
// ============================================================================

/**
 * Subscription state.
 */
export enum SubscriptionState {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

/**
 * Properties for ArmApiManagementSubscription (L1 construct).
 */
export interface ArmApiManagementSubscriptionProps {
  /**
   * Parent API Management service.
   */
  readonly apiManagementService: IApiManagement;

  /**
   * Subscription name/identifier.
   */
  readonly subscriptionName: string;

  /**
   * Subscription properties.
   */
  readonly properties: {
    /**
     * Display name.
     */
    readonly displayName: string;

    /**
     * Scope (product or API path).
     *
     * @remarks
     * Format: /products/{productId} or /apis/{apiId}
     */
    readonly scope: string;

    /**
     * Subscription state.
     */
    readonly state?: SubscriptionState;

    /**
     * Allow tracing.
     */
    readonly allowTracing?: boolean;
  };
}

/**
 * Properties for ApiManagementSubscription (L2 construct).
 */
export interface ApiManagementSubscriptionProps {
  /**
   * Parent API Management service.
   */
  readonly apiManagementService: IApiManagement;

  /**
   * Subscription name/identifier.
   *
   * @remarks
   * If not provided, will be derived from construct ID.
   */
  readonly subscriptionName?: string;

  /**
   * Display name.
   */
  readonly displayName: string;

  /**
   * Scope product reference.
   *
   * @remarks
   * Either scopeProduct or scopeApi must be provided.
   */
  readonly scopeProduct?: IApiManagementProduct;

  /**
   * Scope API reference.
   *
   * @remarks
   * Either scopeProduct or scopeApi must be provided.
   */
  readonly scopeApi?: IApiManagementApi;

  /**
   * Subscription state.
   *
   * @remarks
   * Defaults to active.
   */
  readonly state?: SubscriptionState;

  /**
   * Allow tracing.
   */
  readonly allowTracing?: boolean;
}

/**
 * Interface for API Management Subscription reference.
 */
export interface IApiManagementSubscription {
  /**
   * Subscription name.
   */
  readonly subscriptionName: string;

  /**
   * Resource ID.
   */
  readonly subscriptionId: string;

  /**
   * Primary key.
   */
  readonly primaryKey: string;

  /**
   * Secondary key.
   */
  readonly secondaryKey: string;
}

// ============================================================================
// API Management Policy Sub-resource Types
// ============================================================================

/**
 * Policy format.
 */
export enum PolicyFormat {
  XML = 'xml',
  RAWXML = 'rawxml',
  RAWXML_LINK = 'rawxml-link',
}

/**
 * Properties for ArmApiManagementPolicy (L1 construct).
 */
export interface ArmApiManagementPolicyProps {
  /**
   * Parent resource (API Management service or API).
   */
  readonly parent: IApiManagement | IApiManagementApi;

  /**
   * Policy properties.
   */
  readonly properties: {
    /**
     * Policy content (XML).
     */
    readonly value: string;

    /**
     * Policy format.
     */
    readonly format?: PolicyFormat;
  };
}

/**
 * Properties for ApiManagementPolicy (L2 construct).
 */
export interface ApiManagementPolicyProps {
  /**
   * Parent resource (API Management service or API).
   */
  readonly parent: IApiManagement | IApiManagementApi;

  /**
   * Policy content (XML).
   */
  readonly policyXml: string;

  /**
   * Policy format.
   *
   * @remarks
   * Defaults to xml.
   */
  readonly format?: PolicyFormat;
}

/**
 * Interface for API Management Policy reference.
 */
export interface IApiManagementPolicy {
  /**
   * Policy content.
   */
  readonly policyXml: string;

  /**
   * Resource ID.
   */
  readonly policyId: string;
}
