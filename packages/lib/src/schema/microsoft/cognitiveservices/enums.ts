/**
 * Enums for Azure Cognitive Services (Microsoft.CognitiveServices).
 *
 * @remarks
 * Curated enums for Azure Cognitive Services, including OpenAI resources.
 *
 * **Resource Type**: Microsoft.CognitiveServices/accounts
 * **API Version**: 2023-05-01
 *
 * @packageDocumentation
 */

/**
 * Cognitive Services SKU name.
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
 * Public network access setting.
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
