/**
 * Enums for Azure CDN (Microsoft.Cdn).
 *
 * @remarks
 * Curated enums extracted from Microsoft.Cdn Azure schema.
 *
 * **Resource Types**:
 * - Microsoft.Cdn/profiles
 * - Microsoft.Cdn/profiles/endpoints
 * - Microsoft.Cdn/profiles/endpoints/customDomains
 *
 * **API Version**: 2024-02-01
 *
 * @packageDocumentation
 */

/**
 * CDN SKU name (pricing tier).
 */
export enum CdnSkuName {
  /**
   * Standard Microsoft CDN
   * - Good balance of features and cost
   * - Includes compression, custom domains, HTTPS
   * - Cache optimization and rules engine
   */
  STANDARD_MICROSOFT = 'Standard_Microsoft',

  /**
   * Standard Akamai CDN
   * - High performance global network
   * - Excellent for media streaming
   * - Advanced caching features
   */
  STANDARD_AKAMAI = 'Standard_Akamai',

  /**
   * Standard Verizon CDN
   * - Enterprise-grade features
   * - Advanced caching and optimization
   * - Real-time statistics
   */
  STANDARD_VERIZON = 'Standard_Verizon',

  /**
   * Premium Verizon CDN
   * - Advanced rules engine
   * - Real-time analytics and alerts
   * - Token authentication
   * - Advanced HTTP features
   */
  PREMIUM_VERIZON = 'Premium_Verizon',

  /**
   * Azure Front Door Standard
   * - Modern CDN with WAF
   * - Intelligent routing
   * - Integrated with Azure services
   */
  STANDARD_AZURE_FRONT_DOOR = 'Standard_AzureFrontDoor',

  /**
   * Azure Front Door Premium
   * - All Standard features plus
   * - Private link integration
   * - Advanced WAF rules
   * - Bot protection
   */
  PREMIUM_AZURE_FRONT_DOOR = 'Premium_AzureFrontDoor',
}

/**
 * Query string caching behavior.
 */
export enum QueryStringCachingBehavior {
  /**
   * Ignore query strings - cache one version
   * Best for static content that doesn't vary by query parameters
   */
  IGNORE_QUERY_STRING = 'IgnoreQueryString',

  /**
   * Bypass caching for URLs with query strings
   * Best for dynamic content that changes based on query parameters
   */
  BYPASS_CACHING = 'BypassCaching',

  /**
   * Use query string - cache separate versions for each unique query string
   * Best when query parameters affect content (e.g., ?version=1.2.3)
   */
  USE_QUERY_STRING = 'UseQueryString',

  /**
   * Not set - use default behavior
   */
  NOT_SET = 'NotSet',
}

/**
 * Optimization type for CDN endpoint.
 */
export enum OptimizationType {
  /**
   * General web delivery
   * Best for websites and web applications
   */
  GENERAL_WEB_DELIVERY = 'GeneralWebDelivery',

  /**
   * General media streaming
   * Optimized for progressive download of media files
   */
  GENERAL_MEDIA_STREAMING = 'GeneralMediaStreaming',

  /**
   * Video on demand media streaming
   * Optimized for VOD scenarios
   */
  VIDEO_ON_DEMAND_MEDIA_STREAMING = 'VideoOnDemandMediaStreaming',

  /**
   * Large file download
   * Optimized for files > 10 MB
   */
  LARGE_FILE_DOWNLOAD = 'LargeFileDownload',

  /**
   * Dynamic site acceleration
   * Optimized for dynamic content with route optimization
   */
  DYNAMIC_SITE_ACCELERATION = 'DynamicSiteAcceleration',
}

/**
 * Protocol type for HTTP/HTTPS.
 */
export enum ProtocolType {
  /**
   * HTTP only
   */
  HTTP = 'Http',

  /**
   * HTTPS only
   */
  HTTPS = 'Https',
}

/**
 * Endpoint resource state.
 */
export enum EndpointResourceState {
  /**
   * Endpoint is being created
   */
  CREATING = 'Creating',

  /**
   * Endpoint is being deleted
   */
  DELETING = 'Deleting',

  /**
   * Endpoint is running
   */
  RUNNING = 'Running',

  /**
   * Endpoint is starting
   */
  STARTING = 'Starting',

  /**
   * Endpoint is stopped
   */
  STOPPED = 'Stopped',

  /**
   * Endpoint is stopping
   */
  STOPPING = 'Stopping',
}

/**
 * Custom HTTPS provisioning state.
 */
export enum CustomHttpsProvisioningState {
  /**
   * HTTPS is being enabled
   */
  ENABLING = 'Enabling',

  /**
   * HTTPS is enabled
   */
  ENABLED = 'Enabled',

  /**
   * HTTPS is being disabled
   */
  DISABLING = 'Disabling',

  /**
   * HTTPS is disabled
   */
  DISABLED = 'Disabled',

  /**
   * HTTPS provisioning failed
   */
  FAILED = 'Failed',
}

/**
 * Custom domain HTTPS parameters source.
 */
export enum CertificateSource {
  /**
   * Use Azure CDN managed certificate (free)
   * Automatically provisioned and renewed
   */
  CDN = 'Cdn',

  /**
   * Use certificate from Azure Key Vault
   * Provides more control over certificate
   */
  AZURE_KEY_VAULT = 'AzureKeyVault',
}

/**
 * Minimum TLS version for custom domain.
 */
export enum MinimumTlsVersion {
  /**
   * TLS 1.0 (not recommended, deprecated)
   */
  TLS1_0 = 'TLS10',

  /**
   * TLS 1.2 (recommended minimum)
   */
  TLS1_2 = 'TLS12',

  /**
   * No minimum TLS version set
   */
  NONE = 'None',
}

/**
 * Redirect type for HTTP to HTTPS.
 */
export enum RedirectType {
  /**
   * Moved permanently (301)
   */
  MOVED = 'Moved',

  /**
   * Found (302)
   */
  FOUND = 'Found',

  /**
   * Temporary redirect (307)
   */
  TEMPORARY_REDIRECT = 'TemporaryRedirect',

  /**
   * Permanent redirect (308)
   */
  PERMANENT_REDIRECT = 'PermanentRedirect',
}

/**
 * Geo filter action.
 */
export enum GeoFilterAction {
  /**
   * Block access from specified countries
   */
  BLOCK = 'Block',

  /**
   * Allow access only from specified countries
   */
  ALLOW = 'Allow',
}
