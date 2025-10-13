/**
 * Core API Management Enums
 *
 * Core enums for Azure API Management service configuration.
 *
 * @module @atakora/lib/schema/apimanagement/core
 */

// ============================================================================
// API Management Service Enums (TypeScript)
// ============================================================================

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
 * Product state.
 */
export enum ProductState {
  NOT_PUBLISHED = 'notPublished',
  PUBLISHED = 'published',
}

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
 * Policy format.
 */
export enum PolicyFormat {
  XML = 'xml',
  RAWXML = 'rawxml',
  RAWXML_LINK = 'rawxml-link',
}
