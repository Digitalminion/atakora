/**
 * Type definitions for Microsoft Purview (Microsoft.Purview).
 *
 * @remarks
 * Complete type definitions extracted from Microsoft.Purview Azure ARM schema.
 *
 * **Resource Type**: Microsoft.Purview/accounts
 * **API Version**: 2024-04-01-preview
 * **Generated**: 2025-10-13
 * **Source**: https://learn.microsoft.com/en-us/azure/templates/microsoft.purview/accounts
 *
 * @packageDocumentation
 */

import type {
  PurviewSkuName,
  PurviewIdentityType,
  PublicNetworkAccess,
  ManagedResourcesPublicNetworkAccess,
  IngestionStoragePublicNetworkAccess,
  ManagedEventHubState,
  TenantEndpointState,
} from './enums';

/**
 * SKU configuration for Purview account.
 *
 * @remarks
 * Defines the pricing tier and capacity for the Purview account.
 */
export interface PurviewSku {
  /**
   * SKU name.
   *
   * @remarks
   * - Free: Evaluation tier with limited features
   * - Standard: Full features for production workloads
   */
  readonly name: PurviewSkuName;

  /**
   * SKU capacity units.
   *
   * @remarks
   * Number of capacity units for the account.
   * Typically used for scaling in Standard tier.
   *
   * @example 4
   */
  readonly capacity?: number;
}

/**
 * User-assigned managed identity properties.
 *
 * @remarks
 * Read-only properties populated by Azure after identity assignment.
 */
export interface UserAssignedIdentity {
  /**
   * Client ID (application ID) of the identity.
   */
  readonly clientId?: string;

  /**
   * Principal ID (object ID) of the identity.
   */
  readonly principalId?: string;
}

/**
 * Managed identity configuration for Purview account.
 *
 * @remarks
 * Enables the account to authenticate to other Azure services.
 */
export interface PurviewIdentity {
  /**
   * Type of managed identity.
   *
   * @remarks
   * - None: No managed identity
   * - SystemAssigned: Azure-managed lifecycle
   * - UserAssigned: Customer-managed identities
   */
  readonly type: PurviewIdentityType;

  /**
   * Collection of user-assigned identities.
   *
   * @remarks
   * Map of identity resource IDs to their properties.
   * Required when type is UserAssigned.
   *
   * @example
   * ```typescript
   * {
   *   '/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ManagedIdentity/userAssignedIdentities/{name}': {}
   * }
   * ```
   */
  readonly userAssignedIdentities?: Record<string, UserAssignedIdentity>;
}

/**
 * Ingestion storage configuration.
 *
 * @remarks
 * Controls network access to the ingestion storage account.
 */
export interface IngestionStorage {
  /**
   * Public network access for ingestion storage.
   *
   * @remarks
   * - Enabled: Allow public access to ingestion storage
   * - Disabled: Require private endpoints for ingestion storage
   * - NotSpecified: Use account default setting
   *
   * @default 'NotSpecified'
   */
  readonly publicNetworkAccess?: IngestionStoragePublicNetworkAccess;
}

/**
 * Cloud connectors configuration.
 *
 * @remarks
 * Configuration for connecting to external cloud providers.
 * This is an extensible object that may contain provider-specific settings.
 */
export interface CloudConnectors {
  /**
   * AWS cloud connector configuration.
   *
   * @remarks
   * Configuration for scanning AWS resources.
   */
  readonly aws?: Record<string, any>;

  /**
   * Additional cloud provider configurations.
   */
  readonly [key: string]: any;
}

/**
 * Merge information for account merges.
 *
 * @remarks
 * Contains information about account merge operations.
 * Used when consolidating multiple Purview accounts.
 */
export interface MergeInfo {
  /**
   * Source account resource IDs being merged.
   */
  readonly sourceAccounts?: string[];

  /**
   * Merge status.
   */
  readonly status?: string;

  /**
   * Merge start time.
   */
  readonly startTime?: string;

  /**
   * Merge end time.
   */
  readonly endTime?: string;
}

/**
 * Properties for Microsoft.Purview/accounts resource.
 *
 * @remarks
 * Complete configuration for a Purview account.
 */
export interface AccountProperties {
  /**
   * Cloud connectors configuration.
   *
   * @remarks
   * Configuration for connecting to external cloud providers (AWS, etc.).
   */
  readonly cloudConnectors?: CloudConnectors;

  /**
   * Ingestion storage configuration.
   *
   * @remarks
   * Controls access to the storage account used for data ingestion.
   */
  readonly ingestionStorage?: IngestionStorage;

  /**
   * Managed Event Hub state.
   *
   * @remarks
   * Controls whether Purview creates and manages an Event Hub for notifications.
   * - Enabled: Create and use managed Event Hub
   * - Disabled: Do not create managed Event Hub
   * - NotSpecified: Use account default
   *
   * @default 'NotSpecified'
   */
  readonly managedEventHubState?: ManagedEventHubState;

  /**
   * Managed resource group name.
   *
   * @remarks
   * Name of the resource group where Purview creates managed resources
   * (storage account, event hub, etc.).
   *
   * If not specified, Purview auto-generates a name.
   *
   * @example 'purview-managed-rg'
   */
  readonly managedResourceGroupName?: string;

  /**
   * Public network access for managed resources.
   *
   * @remarks
   * Controls whether managed resources (storage, event hub) are accessible
   * from public networks.
   * - Enabled: Allow public access
   * - Disabled: Require private endpoints
   * - NotSpecified: Use account default
   *
   * @default 'NotSpecified'
   */
  readonly managedResourcesPublicNetworkAccess?: ManagedResourcesPublicNetworkAccess;

  /**
   * Account merge information.
   *
   * @remarks
   * Contains details if this account is part of a merge operation.
   */
  readonly mergeInfo?: MergeInfo;

  /**
   * Public network access for the Purview account.
   *
   * @remarks
   * Controls whether the account portal and APIs are accessible from
   * public networks.
   * - Enabled: Allow public access
   * - Disabled: Require private endpoints
   * - NotSpecified: Use default (Enabled)
   *
   * @default 'NotSpecified'
   */
  readonly publicNetworkAccess?: PublicNetworkAccess;

  /**
   * Tenant endpoint state.
   *
   * @remarks
   * Controls whether tenant-level endpoints are enabled.
   * - Enabled: Enable tenant endpoints
   * - Disabled: Disable tenant endpoints
   * - NotSpecified: Use account default
   *
   * @default 'NotSpecified'
   */
  readonly tenantEndpointState?: TenantEndpointState;
}
