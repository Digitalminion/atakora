/**
 * Enums for Azure SignalR Service (Microsoft.SignalRService).
 *
 * @remarks
 * Curated enums extracted from Microsoft.SignalRService Azure schema.
 *
 * **Resource Type**: Microsoft.SignalRService/SignalR
 * **API Version**: 2023-02-01
 *
 * @packageDocumentation
 */

/**
 * SignalR Service SKU tiers.
 */
export enum SignalRSku {
  /**
   * Free tier (limited connections and messages).
   */
  FREE = 'Free_F1',

  /**
   * Standard tier.
   */
  STANDARD = 'Standard_S1',

  /**
   * Premium tier (additional features and SLA).
   */
  PREMIUM = 'Premium_P1',
}

/**
 * SignalR Service mode.
 */
export enum ServiceMode {
  /**
   * Default mode - SignalR client connections.
   */
  DEFAULT = 'Default',

  /**
   * Serverless mode - for use with Azure Functions.
   */
  SERVERLESS = 'Serverless',

  /**
   * Classic mode - backward compatibility.
   */
  CLASSIC = 'Classic',
}

/**
 * Feature flags for SignalR Service.
 */
export enum FeatureFlag {
  /**
   * Enable service mode configuration.
   */
  SERVICE_MODE = 'ServiceMode',

  /**
   * Enable messaging logs.
   */
  ENABLE_MESSAGING_LOGS = 'EnableMessagingLogs',

  /**
   * Enable connectivity logs.
   */
  ENABLE_CONNECTIVITY_LOGS = 'EnableConnectivityLogs',

  /**
   * Enable live trace.
   */
  ENABLE_LIVE_TRACE = 'EnableLiveTrace',
}

/**
 * Network ACL action.
 */
export enum AclAction {
  ALLOW = 'Allow',
  DENY = 'Deny',
}

/**
 * Public network access.
 */
export enum PublicNetworkAccess {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled',
}
