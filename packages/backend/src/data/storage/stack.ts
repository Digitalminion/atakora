import { Construct } from '@atakora/cdk';
import type { IResourceGroup } from '@atakora/cdk';
import { StorageAccounts, type IStorageAccount, StorageAccountKind, StorageAccountSkuName } from '@atakora/cdk/storage';
import { PrivateEndpoints, PrivateDnsZones, type IPrivateEndpoint, type ISubnet, type IPrivateDnsZone } from '@atakora/cdk/network';

/**
 * Private endpoint group IDs for Storage Account
 */
export type StoragePrivateEndpointGroupId = 'blob' | 'file' | 'queue' | 'table' | 'web' | 'dfs';

/**
 * Configuration for Storage Account Stack
 */
export interface StorageStackProps {
  /**
   * Resource Group to deploy Storage Account into
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
   * Must match the privateEndpointGroupId (e.g., 'privatelink.blob.core.windows.net' for blob)
   */
  existingPrivateDnsZone?: IPrivateDnsZone;

  /**
   * Storage account kind (default: STORAGE_V2)
   */
  kind?: StorageAccountKind;

  /**
   * Storage account SKU (default: STANDARD_LRS)
   */
  sku?: StorageAccountSkuName;

  /**
   * Private endpoint group ID (default: 'blob')
   *
   * @remarks
   * Determines which storage service to create a private endpoint for.
   * Common values: 'blob', 'file', 'queue', 'table'
   */
  privateEndpointGroupId?: StoragePrivateEndpointGroupId;

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
 * Storage Account Capability Stack
 *
 * @remarks
 * Self-contained stack that creates a complete Storage Account deployment including:
 * - Storage Account
 * - Private Endpoint for secure connectivity
 * - Private DNS Zone (or uses existing)
 * - DNS integration
 *
 * This stack follows the single responsibility principle - it creates
 * everything needed for a fully functional, privately accessible storage account.
 *
 * @example
 * Basic blob storage with auto-created DNS zone:
 * ```typescript
 * const storageStack = new StorageStack(app, 'Storage', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet
 * });
 *
 * // Access the resources
 * const storageAccount = storageStack.storageAccount;
 * const endpoint = storageStack.privateEndpoint;
 * ```
 *
 * @example
 * Data Lake Storage (DFS endpoint):
 * ```typescript
 * const datalakeStack = new StorageStack(app, 'DataLake', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet,
 *   privateEndpointGroupId: 'dfs',
 *   tags: { purpose: 'data-lake' }
 * });
 * ```
 *
 * @example
 * File storage with existing DNS zone:
 * ```typescript
 * const fileStorageStack = new StorageStack(app, 'FileStorage', {
 *   resourceGroup: rg,
 *   privateEndpointSubnet: subnet,
 *   privateEndpointGroupId: 'file',
 *   createPrivateDnsZone: false,
 *   existingPrivateDnsZone: sharedFileDnsZone
 * });
 * ```
 */
export class StorageStack extends Construct {
  /**
   * Storage Account
   */
  public readonly storageAccount: IStorageAccount;

  /**
   * Private Endpoint for Storage Account
   */
  public readonly privateEndpoint: IPrivateEndpoint;

  /**
   * Private DNS Zone for Storage Account
   */
  public readonly privateDnsZone: IPrivateDnsZone;

  /**
   * Resource Group where Storage Account is deployed
   */
  public readonly resourceGroup: IResourceGroup;

  /**
   * Private endpoint group ID used
   */
  public readonly privateEndpointGroupId: StoragePrivateEndpointGroupId;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id);

    this.resourceGroup = props.resourceGroup;
    this.privateEndpointGroupId = props.privateEndpointGroupId ?? 'blob';

    // Merge stack tag with provided tags
    const stackTags = {
      stack: 'storage',
      service: 'data',
      ...props.tags,
    };

    // Create Storage Account
    this.storageAccount = new StorageAccounts(this, 'Account', {
      location: props.resourceGroup.location,
      kind: props.kind ?? StorageAccountKind.STORAGE_V2,
      sku: props.sku ?? StorageAccountSkuName.STANDARD_LRS,
      tags: stackTags,
    });

    // Determine DNS zone name based on group ID
    const dnsZoneName = this.getDnsZoneName(this.privateEndpointGroupId);

    // Create or use existing Private DNS Zone
    if (props.createPrivateDnsZone !== false) {
      // Create new Private DNS Zone
      this.privateDnsZone = new PrivateDnsZones(this, 'PrivateDnsZone', {
        zoneName: dnsZoneName,
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
    this.privateEndpoint = new PrivateEndpoints(this, 'StoragePrivateEndpoint', {
      subnet: props.privateEndpointSubnet,
      privateLinkServiceId: this.storageAccount.storageAccountId,
      groupIds: [this.privateEndpointGroupId],
      privateDnsZoneId: this.privateDnsZone.zoneId,
      tags: stackTags,
    });
  }

  /**
   * Get DNS zone name for a storage group ID
   */
  private getDnsZoneName(groupId: StoragePrivateEndpointGroupId): string {
    const dnsZoneMap: Record<StoragePrivateEndpointGroupId, string> = {
      blob: 'privatelink.blob.core.windows.net',
      file: 'privatelink.file.core.windows.net',
      queue: 'privatelink.queue.core.windows.net',
      table: 'privatelink.table.core.windows.net',
      web: 'privatelink.web.core.windows.net',
      dfs: 'privatelink.dfs.core.windows.net',
    };
    return dnsZoneMap[groupId];
  }

  /**
   * Get deployed configuration
   */
  public getDeployedConfig() {
    return {
      storageAccount: {
        id: this.storageAccount.storageAccountId,
        name: this.storageAccount.storageAccountName,
        primaryEndpoints: {
          blob: `https://${this.storageAccount.storageAccountName}.blob.core.windows.net/`,
          file: `https://${this.storageAccount.storageAccountName}.file.core.windows.net/`,
          queue: `https://${this.storageAccount.storageAccountName}.queue.core.windows.net/`,
          table: `https://${this.storageAccount.storageAccountName}.table.core.windows.net/`,
        },
      },
      privateEndpoint: {
        id: this.privateEndpoint.privateEndpointId,
        name: this.privateEndpoint.privateEndpointName,
        groupId: this.privateEndpointGroupId,
      },
      privateDnsZone: {
        id: this.privateDnsZone.zoneId,
        name: this.privateDnsZone.zoneName,
      },
    };
  }
}
