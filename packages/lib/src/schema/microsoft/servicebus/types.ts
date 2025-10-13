/**
 * Type definitions for Azure Service Bus (Microsoft.ServiceBus).
 *
 * @remarks
 * Comprehensive types for Azure Service Bus namespace, queue, topic, and subscription resources.
 *
 * **Resource Type**: Microsoft.ServiceBus/namespaces
 * **API Version**: 2021-11-01
 *
 * @packageDocumentation
 */

import { ServiceBusSku, EntityStatus, FilterType } from './enums';

// ============================================================================
// Namespace Types
// ============================================================================

/**
 * Service Bus namespace SKU configuration.
 */
export interface NamespaceSku {
  /**
   * SKU name.
   */
  readonly name: ServiceBusSku;

  /**
   * SKU tier.
   *
   * @remarks
   * Must match the name value.
   */
  readonly tier?: ServiceBusSku;

  /**
   * Messaging units for premium tier.
   *
   * @remarks
   * Valid values: 1, 2, 4, 8, 16
   * Only applicable for Premium tier.
   */
  readonly capacity?: number;
}

/**
 * Managed identity configuration for Service Bus namespace.
 */
export interface ServiceBusIdentity {
  /**
   * Identity type.
   *
   * @remarks
   * Valid values:
   * - 'SystemAssigned': System-assigned managed identity
   * - 'UserAssigned': User-assigned managed identity
   * - 'SystemAssigned,UserAssigned': Both system and user assigned
   * - 'None': No managed identity
   */
  readonly type: 'SystemAssigned' | 'UserAssigned' | 'SystemAssigned,UserAssigned' | 'None';

  /**
   * User-assigned identity resource IDs.
   *
   * @remarks
   * Required when type includes 'UserAssigned'.
   * Key is the resource ID, value is an empty object.
   */
  readonly userAssignedIdentities?: Record<string, Record<string, never>>;
}

/**
 * Encryption key vault properties.
 */
export interface KeyVaultProperties {
  /**
   * Key name in Key Vault.
   */
  readonly keyName?: string;

  /**
   * Key Vault URI.
   *
   * @remarks
   * Example: 'https://myvault.vault.azure.net/'
   */
  readonly keyVaultUri?: string;

  /**
   * Key version.
   */
  readonly keyVersion?: string;

  /**
   * User-assigned identity resource ID for accessing Key Vault.
   *
   * @remarks
   * Required when using user-assigned identity for CMK.
   */
  readonly identity?: {
    readonly userAssignedIdentity?: string;
  };
}

/**
 * Encryption configuration for Service Bus namespace.
 */
export interface Encryption {
  /**
   * Encryption key source.
   *
   * @remarks
   * Valid values:
   * - 'Microsoft.KeyVault': Customer-managed key
   */
  readonly keySource?: 'Microsoft.KeyVault';

  /**
   * Key vault properties.
   */
  readonly keyVaultProperties?: KeyVaultProperties[];

  /**
   * Whether to enable infrastructure encryption (double encryption).
   */
  readonly requireInfrastructureEncryption?: boolean;
}

/**
 * Private endpoint connection properties.
 */
export interface PrivateEndpointConnection {
  /**
   * Private endpoint resource ID.
   */
  readonly privateEndpoint?: {
    readonly id?: string;
  };

  /**
   * Connection state.
   */
  readonly privateLinkServiceConnectionState?: {
    readonly status?: 'Pending' | 'Approved' | 'Rejected';
    readonly description?: string;
  };

  /**
   * Provisioning state.
   *
   * @remarks
   * Read-only. Values: 'Creating', 'Updating', 'Deleting', 'Succeeded', 'Canceled', 'Failed'
   */
  readonly provisioningState?: string;
}

/**
 * Service Bus namespace properties.
 */
export interface NamespaceProperties {
  /**
   * Provisioning state.
   *
   * @remarks
   * Read-only. Values: 'Creating', 'Succeeded', 'Deleting', 'Failed', 'Updating', 'Unknown'
   */
  readonly provisioningState?: string;

  /**
   * Status of the namespace.
   *
   * @remarks
   * Read-only. Values: 'Unknown', 'Creating', 'Created', 'Activating', 'Active',
   * 'Disabling', 'Disabled', 'SoftDeleting', 'SoftDeleted', 'Removing', 'Removed', 'Failed'
   */
  readonly status?: string;

  /**
   * Namespace creation time.
   *
   * @remarks
   * Read-only. ISO 8601 format.
   */
  readonly createdAt?: string;

  /**
   * Namespace last modified time.
   *
   * @remarks
   * Read-only. ISO 8601 format.
   */
  readonly updatedAt?: string;

  /**
   * Service Bus endpoint for the namespace.
   *
   * @remarks
   * Read-only. Example: 'https://myservicebus.servicebus.windows.net/'
   */
  readonly serviceBusEndpoint?: string;

  /**
   * Identifier for the Service Bus namespace.
   *
   * @remarks
   * Read-only.
   */
  readonly metricId?: string;

  /**
   * Whether to enable zone redundancy.
   *
   * @remarks
   * Only available in Premium tier.
   */
  readonly zoneRedundant?: boolean;

  /**
   * Encryption configuration.
   */
  readonly encryption?: Encryption;

  /**
   * Private endpoint connections.
   *
   * @remarks
   * Read-only.
   */
  readonly privateEndpointConnections?: PrivateEndpointConnection[];

  /**
   * Whether to disable local authentication (SAS keys).
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Alternate name for namespace.
   */
  readonly alternateName?: string;

  /**
   * Whether the namespace is premium tier.
   *
   * @remarks
   * Read-only.
   */
  readonly premiumMessagingPartitions?: number;

  /**
   * Minimum TLS version.
   *
   * @remarks
   * Valid values: '1.0', '1.1', '1.2'
   */
  readonly minimumTlsVersion?: '1.0' | '1.1' | '1.2';

  /**
   * Public network access setting.
   *
   * @remarks
   * Valid values: 'Enabled', 'Disabled'
   */
  readonly publicNetworkAccess?: 'Enabled' | 'Disabled';
}

// ============================================================================
// Queue Types
// ============================================================================

/**
 * Service Bus queue properties.
 */
export interface QueueProperties {
  /**
   * Maximum size in megabytes.
   *
   * @remarks
   * Valid values: 1024, 2048, 3072, 4096, 5120
   * Premium tier supports up to 81920 (80 GB).
   */
  readonly maxSizeInMegabytes?: number;

  /**
   * Queue size in bytes.
   *
   * @remarks
   * Read-only.
   */
  readonly sizeInBytes?: number;

  /**
   * Message count.
   *
   * @remarks
   * Read-only.
   */
  readonly messageCount?: number;

  /**
   * Whether to enable partitioning.
   *
   * @remarks
   * Cannot be changed after creation.
   */
  readonly enablePartitioning?: boolean;

  /**
   * Whether to enable express messages.
   *
   * @remarks
   * Not available in Premium tier.
   */
  readonly enableExpress?: boolean;

  /**
   * Lock duration.
   *
   * @remarks
   * ISO 8601 duration format. Example: 'PT30S' (30 seconds)
   * Default: 'PT1M' (1 minute)
   * Range: 5 seconds to 5 minutes
   */
  readonly lockDuration?: string;

  /**
   * Default message time to live.
   *
   * @remarks
   * ISO 8601 duration format. Example: 'P10675199DT2H48M5.4775807S' (max value)
   */
  readonly defaultMessageTimeToLive?: string;

  /**
   * Duplicate detection history time window.
   *
   * @remarks
   * ISO 8601 duration format. Example: 'PT10M' (10 minutes)
   */
  readonly duplicateDetectionHistoryTimeWindow?: string;

  /**
   * Whether duplicate detection is enabled.
   */
  readonly requiresDuplicateDetection?: boolean;

  /**
   * Whether dead lettering is enabled for expired messages.
   */
  readonly deadLetteringOnMessageExpiration?: boolean;

  /**
   * Whether sessions are required.
   *
   * @remarks
   * Cannot be changed after creation.
   */
  readonly requiresSession?: boolean;

  /**
   * Auto-delete on idle duration.
   *
   * @remarks
   * ISO 8601 duration format. Example: 'P10675199DT2H48M5.4775807S' (max value)
   */
  readonly autoDeleteOnIdle?: string;

  /**
   * Queue status.
   */
  readonly status?: EntityStatus;

  /**
   * Whether to enable batched operations.
   */
  readonly enableBatchedOperations?: boolean;

  /**
   * Maximum delivery count.
   *
   * @remarks
   * Range: 1-2000
   * Default: 10
   */
  readonly maxDeliveryCount?: number;

  /**
   * Forward to queue or topic.
   *
   * @remarks
   * Queue or topic name to forward messages to.
   */
  readonly forwardTo?: string;

  /**
   * Forward dead lettered messages to queue or topic.
   */
  readonly forwardDeadLetteredMessagesTo?: string;

  /**
   * Maximum message size in kilobytes.
   *
   * @remarks
   * Premium tier only. Valid values: 1024-102400 (1 MB - 100 MB)
   */
  readonly maxMessageSizeInKilobytes?: number;
}

// ============================================================================
// Topic Types
// ============================================================================

/**
 * Service Bus topic properties.
 */
export interface TopicProperties {
  /**
   * Maximum size in megabytes.
   *
   * @remarks
   * Valid values: 1024, 2048, 3072, 4096, 5120
   * Premium tier supports up to 81920 (80 GB).
   */
  readonly maxSizeInMegabytes?: number;

  /**
   * Topic size in bytes.
   *
   * @remarks
   * Read-only.
   */
  readonly sizeInBytes?: number;

  /**
   * Whether to enable partitioning.
   *
   * @remarks
   * Cannot be changed after creation.
   */
  readonly enablePartitioning?: boolean;

  /**
   * Whether to enable express messages.
   *
   * @remarks
   * Not available in Premium tier.
   */
  readonly enableExpress?: boolean;

  /**
   * Default message time to live.
   *
   * @remarks
   * ISO 8601 duration format.
   */
  readonly defaultMessageTimeToLive?: string;

  /**
   * Duplicate detection history time window.
   *
   * @remarks
   * ISO 8601 duration format.
   */
  readonly duplicateDetectionHistoryTimeWindow?: string;

  /**
   * Whether duplicate detection is enabled.
   */
  readonly requiresDuplicateDetection?: boolean;

  /**
   * Auto-delete on idle duration.
   *
   * @remarks
   * ISO 8601 duration format.
   */
  readonly autoDeleteOnIdle?: string;

  /**
   * Topic status.
   */
  readonly status?: EntityStatus;

  /**
   * Whether to enable batched operations.
   */
  readonly enableBatchedOperations?: boolean;

  /**
   * Whether to support ordering.
   */
  readonly supportOrdering?: boolean;

  /**
   * Subscription count.
   *
   * @remarks
   * Read-only.
   */
  readonly subscriptionCount?: number;

  /**
   * Maximum message size in kilobytes.
   *
   * @remarks
   * Premium tier only.
   */
  readonly maxMessageSizeInKilobytes?: number;
}

// ============================================================================
// Subscription Types
// ============================================================================

/**
 * Service Bus subscription properties.
 */
export interface SubscriptionProperties {
  /**
   * Lock duration.
   *
   * @remarks
   * ISO 8601 duration format.
   */
  readonly lockDuration?: string;

  /**
   * Default message time to live.
   *
   * @remarks
   * ISO 8601 duration format.
   */
  readonly defaultMessageTimeToLive?: string;

  /**
   * Whether dead lettering is enabled for expired messages.
   */
  readonly deadLetteringOnMessageExpiration?: boolean;

  /**
   * Whether to dead letter on filter evaluation exceptions.
   */
  readonly deadLetteringOnFilterEvaluationExceptions?: boolean;

  /**
   * Message count.
   *
   * @remarks
   * Read-only.
   */
  readonly messageCount?: number;

  /**
   * Whether sessions are required.
   */
  readonly requiresSession?: boolean;

  /**
   * Auto-delete on idle duration.
   *
   * @remarks
   * ISO 8601 duration format.
   */
  readonly autoDeleteOnIdle?: string;

  /**
   * Subscription status.
   */
  readonly status?: EntityStatus;

  /**
   * Whether to enable batched operations.
   */
  readonly enableBatchedOperations?: boolean;

  /**
   * Maximum delivery count.
   */
  readonly maxDeliveryCount?: number;

  /**
   * Forward to queue or topic.
   */
  readonly forwardTo?: string;

  /**
   * Forward dead lettered messages to queue or topic.
   */
  readonly forwardDeadLetteredMessagesTo?: string;

  /**
   * Whether this is a client-affine subscription.
   */
  readonly isClientAffine?: boolean;

  /**
   * Client ID for client-affine subscription.
   */
  readonly clientId?: string;
}

// ============================================================================
// Rule Types
// ============================================================================

/**
 * SQL filter expression.
 */
export interface SqlFilter {
  /**
   * SQL expression for filtering.
   *
   * @remarks
   * Example: "color = 'red' AND quantity > 10"
   */
  readonly sqlExpression?: string;

  /**
   * Whether the expression requires preprocessing.
   */
  readonly requiresPreprocessing?: boolean;
}

/**
 * Correlation filter.
 */
export interface CorrelationFilter {
  /**
   * Correlation ID.
   */
  readonly correlationId?: string;

  /**
   * Message ID.
   */
  readonly messageId?: string;

  /**
   * Message destination.
   */
  readonly to?: string;

  /**
   * Reply to address.
   */
  readonly replyTo?: string;

  /**
   * Label/Subject.
   */
  readonly label?: string;

  /**
   * Session ID.
   */
  readonly sessionId?: string;

  /**
   * Reply to session ID.
   */
  readonly replyToSessionId?: string;

  /**
   * Content type.
   */
  readonly contentType?: string;

  /**
   * Custom properties for correlation.
   */
  readonly properties?: Record<string, string>;

  /**
   * Whether the filter requires preprocessing.
   */
  readonly requiresPreprocessing?: boolean;
}

/**
 * SQL rule action.
 */
export interface SqlRuleAction {
  /**
   * SQL expression for the action.
   *
   * @remarks
   * Example: "SET priority = 'high'"
   */
  readonly sqlExpression?: string;

  /**
   * Whether the expression requires preprocessing.
   */
  readonly requiresPreprocessing?: boolean;
}

/**
 * Subscription rule properties.
 */
export interface RuleProperties {
  /**
   * Filter type.
   */
  readonly filterType?: FilterType;

  /**
   * SQL filter.
   */
  readonly sqlFilter?: SqlFilter;

  /**
   * Correlation filter.
   */
  readonly correlationFilter?: CorrelationFilter;

  /**
   * Rule action.
   */
  readonly action?: SqlRuleAction;
}

// ============================================================================
// Authorization Rule Types
// ============================================================================

/**
 * Authorization rule rights.
 */
export interface AccessRights {
  /**
   * Access rights.
   *
   * @remarks
   * Valid values: 'Manage', 'Send', 'Listen'
   */
  readonly rights: Array<'Manage' | 'Send' | 'Listen'>;
}

/**
 * Authorization rule properties.
 */
export interface AuthorizationRuleProperties {
  /**
   * Access rights.
   */
  readonly rights: Array<'Manage' | 'Send' | 'Listen'>;
}

/**
 * Authorization rule keys.
 *
 * @remarks
 * Read-only, obtained from listKeys operation.
 */
export interface AccessKeys {
  /**
   * Primary connection string.
   *
   * @remarks
   * Read-only.
   */
  readonly primaryConnectionString?: string;

  /**
   * Secondary connection string.
   *
   * @remarks
   * Read-only.
   */
  readonly secondaryConnectionString?: string;

  /**
   * Primary key.
   *
   * @remarks
   * Read-only.
   */
  readonly primaryKey?: string;

  /**
   * Secondary key.
   *
   * @remarks
   * Read-only.
   */
  readonly secondaryKey?: string;

  /**
   * Key name.
   *
   * @remarks
   * Read-only.
   */
  readonly keyName?: string;
}

// ============================================================================
// Network Rule Types
// ============================================================================

/**
 * IP filter rule.
 */
export interface NWRuleSetIpRules {
  /**
   * IP mask.
   *
   * @remarks
   * IPv4 address or CIDR range. Example: '1.1.1.1' or '1.1.1.0/24'
   */
  readonly ipMask?: string;

  /**
   * IP filter action.
   *
   * @remarks
   * Valid value: 'Accept'
   */
  readonly action?: 'Accept';
}

/**
 * Virtual network rule.
 */
export interface NWRuleSetVirtualNetworkRules {
  /**
   * Subnet resource ID.
   */
  readonly subnet?: {
    readonly id?: string;
  };

  /**
   * Whether to ignore missing service endpoint.
   */
  readonly ignoreMissingVnetServiceEndpoint?: boolean;
}

/**
 * Network rule set properties.
 */
export interface NetworkRuleSetProperties {
  /**
   * Default action for network rule set.
   *
   * @remarks
   * Valid values: 'Allow', 'Deny'
   */
  readonly defaultAction?: 'Allow' | 'Deny';

  /**
   * IP filter rules.
   */
  readonly ipRules?: NWRuleSetIpRules[];

  /**
   * Virtual network rules.
   */
  readonly virtualNetworkRules?: NWRuleSetVirtualNetworkRules[];

  /**
   * Whether to allow trusted Microsoft services.
   */
  readonly trustedServiceAccessEnabled?: boolean;

  /**
   * Public network access.
   *
   * @remarks
   * Valid values: 'Enabled', 'Disabled', 'SecuredByPerimeter'
   */
  readonly publicNetworkAccess?: 'Enabled' | 'Disabled' | 'SecuredByPerimeter';
}

// ============================================================================
// Disaster Recovery Types
// ============================================================================

/**
 * Alias (Disaster Recovery config) properties.
 */
export interface AliasProperties {
  /**
   * Primary/secondary namespace resource ID for pairing.
   */
  readonly partnerNamespace?: string;

  /**
   * Alternate name for the alias.
   */
  readonly alternateName?: string;

  /**
   * Provisioning state.
   *
   * @remarks
   * Read-only. Values: 'Accepted', 'Succeeded', 'Failed'
   */
  readonly provisioningState?: string;

  /**
   * Role of namespace in disaster recovery pairing.
   *
   * @remarks
   * Read-only. Values: 'Primary', 'PrimaryNotReplicating', 'Secondary'
   */
  readonly role?: 'Primary' | 'PrimaryNotReplicating' | 'Secondary';

  /**
   * Number of entities pending replication.
   *
   * @remarks
   * Read-only.
   */
  readonly pendingReplicationOperationsCount?: number;
}

// ============================================================================
// Migration Configuration Types
// ============================================================================

/**
 * Migration configuration properties.
 */
export interface MigrationConfigProperties {
  /**
   * Target namespace resource ID for migration.
   */
  readonly targetNamespace?: string;

  /**
   * Name of the post-migration namespace.
   */
  readonly postMigrationName?: string;

  /**
   * Provisioning state.
   *
   * @remarks
   * Read-only. Values: 'Accepted', 'Succeeded', 'Failed'
   */
  readonly provisioningState?: string;

  /**
   * Migration state.
   *
   * @remarks
   * Read-only. Values: 'Unknown', 'Reverting', 'Completing', 'Initiating', 'Syncing', 'Active'
   */
  readonly migrationState?: string;

  /**
   * Number of entities pending replication.
   *
   * @remarks
   * Read-only.
   */
  readonly pendingReplicationOperationsCount?: number;
}
