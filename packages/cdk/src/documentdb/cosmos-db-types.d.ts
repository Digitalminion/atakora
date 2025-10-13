/**
 * Azure Cosmos DB type definitions.
 *
 * @remarks
 * Enums, interfaces, and types for Cosmos DB database account resources.
 * Types are re-exported from @atakora/lib/schema/documentdb for consistency.
 *
 * **Resource Type**: Microsoft.DocumentDB/databaseAccounts
 * **API Version**: 2024-08-15
 *
 * @packageDocumentation
 */
import { schema } from '@atakora/lib';
export declare const CosmosDbKind: typeof schema.documentdb.CosmosDbKind;
export declare const DatabaseAccountOfferType: typeof schema.documentdb.DatabaseAccountOfferType;
export declare const ConsistencyLevel: typeof schema.documentdb.ConsistencyLevel;
export declare const PublicNetworkAccess: typeof schema.documentdb.PublicNetworkAccess;
export type CosmosDbKind = typeof CosmosDbKind[keyof typeof CosmosDbKind];
export type DatabaseAccountOfferType = typeof DatabaseAccountOfferType[keyof typeof DatabaseAccountOfferType];
export type ConsistencyLevel = typeof ConsistencyLevel[keyof typeof ConsistencyLevel];
export type PublicNetworkAccess = typeof PublicNetworkAccess[keyof typeof PublicNetworkAccess];
/**
 * Consistency policy configuration.
 */
export interface ConsistencyPolicy {
    /**
     * Default consistency level.
     */
    readonly defaultConsistencyLevel: ConsistencyLevel;
    /**
     * Maximum staleness prefix (for BoundedStaleness).
     */
    readonly maxStalenessPrefix?: number;
    /**
     * Maximum interval in seconds (for BoundedStaleness).
     */
    readonly maxIntervalInSeconds?: number;
}
/**
 * Location configuration for Cosmos DB.
 */
export interface Location {
    /**
     * Azure region name.
     */
    readonly locationName: string;
    /**
     * Failover priority (0 = primary).
     */
    readonly failoverPriority: number;
    /**
     * Zone redundancy enabled.
     */
    readonly isZoneRedundant?: boolean;
}
/**
 * Capability configuration.
 */
export interface Capability {
    /**
     * Capability name.
     *
     * @remarks
     * Common values:
     * - EnableServerless
     * - EnableCassandra
     * - EnableTable
     * - EnableGremlin
     * - EnableMongo
     */
    readonly name: string;
}
/**
 * Virtual network rule.
 */
export interface VirtualNetworkRule {
    /**
     * Subnet resource ID.
     */
    readonly id: string;
    /**
     * Ignore missing VNet service endpoint.
     */
    readonly ignoreMissingVNetServiceEndpoint?: boolean;
}
/**
 * IP address rule.
 */
export interface IpAddressOrRange {
    /**
     * IP address or CIDR range.
     */
    readonly ipAddressOrRange: string;
}
/**
 * Properties for L1 ArmCosmosDbAccount construct.
 */
export interface ArmDatabaseAccountsProps {
    /**
     * Name of the Cosmos DB database account.
     *
     * @remarks
     * Must be globally unique, 3-44 characters, lowercase letters, numbers, and hyphens.
     * Cannot start or end with hyphen.
     * Pattern: ^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$
     */
    readonly databaseAccountName: string;
    /**
     * Azure region for the Cosmos DB account.
     */
    readonly location: string;
    /**
     * Kind of Cosmos DB account.
     *
     * @remarks
     * Defaults to GlobalDocumentDB (SQL API) if not specified.
     */
    readonly kind?: CosmosDbKind;
    /**
     * Database account offer type.
     *
     * @remarks
     * Currently only 'Standard' is supported.
     */
    readonly databaseAccountOfferType: DatabaseAccountOfferType;
    /**
     * Consistency policy configuration.
     */
    readonly consistencyPolicy?: ConsistencyPolicy;
    /**
     * List of regions for multi-region deployments.
     *
     * @remarks
     * At least one location must be specified.
     */
    readonly locations: Location[];
    /**
     * Enable automatic failover.
     */
    readonly enableAutomaticFailover?: boolean;
    /**
     * Enable multiple write locations.
     */
    readonly enableMultipleWriteLocations?: boolean;
    /**
     * Enable virtual network filter.
     */
    readonly isVirtualNetworkFilterEnabled?: boolean;
    /**
     * Virtual network rules.
     */
    readonly virtualNetworkRules?: VirtualNetworkRule[];
    /**
     * IP address rules.
     */
    readonly ipRules?: IpAddressOrRange[];
    /**
     * Public network access setting.
     */
    readonly publicNetworkAccess?: PublicNetworkAccess;
    /**
     * Enable free tier (one per subscription).
     */
    readonly enableFreeTier?: boolean;
    /**
     * Capabilities to enable.
     */
    readonly capabilities?: Capability[];
    /**
     * Resource tags.
     */
    readonly tags?: Record<string, string>;
}
/**
 * Properties for L2 CosmosDbAccount construct.
 */
export interface DatabaseAccountsProps {
    /**
     * Name of the Cosmos DB database account (optional - auto-generated if not provided).
     *
     * @remarks
     * If not provided, a name will be generated based on the construct ID.
     * Must be globally unique.
     */
    readonly databaseAccountName?: string;
    /**
     * Azure region (optional - inherits from parent if not specified).
     */
    readonly location?: string;
    /**
     * Kind of Cosmos DB account (optional - defaults to GlobalDocumentDB).
     */
    readonly kind?: CosmosDbKind;
    /**
     * Consistency level (optional - defaults to Session).
     */
    readonly consistencyLevel?: ConsistencyLevel;
    /**
     * Enable automatic failover (optional - defaults based on environment).
     */
    readonly enableAutomaticFailover?: boolean;
    /**
     * Enable free tier (optional - defaults to false).
     *
     * @remarks
     * Only one free tier account allowed per subscription.
     */
    readonly enableFreeTier?: boolean;
    /**
     * Enable serverless mode (optional - defaults to false).
     */
    readonly enableServerless?: boolean;
    /**
     * Public network access (optional - defaults to 'disabled').
     */
    readonly publicNetworkAccess?: PublicNetworkAccess;
    /**
     * Virtual network rules (optional).
     */
    readonly virtualNetworkRules?: VirtualNetworkRule[];
    /**
     * Additional locations for multi-region deployment (optional).
     *
     * @remarks
     * Primary location is determined by the 'location' property.
     */
    readonly additionalLocations?: string[];
    /**
     * Resource tags (optional - merged with parent tags).
     */
    readonly tags?: Record<string, string>;
}
/**
 * Interface for Cosmos DB Account resources.
 */
export interface IDatabaseAccount {
    /**
     * The name of the Cosmos DB database account.
     */
    readonly databaseAccountName: string;
    /**
     * The Azure region.
     */
    readonly location: string;
    /**
     * The resource ID of the Cosmos DB account.
     */
    readonly accountId: string;
    /**
     * The resource ID of the Cosmos DB account (alias for accountId).
     */
    readonly resourceId: string;
    /**
     * The endpoint URI for the Cosmos DB account.
     */
    readonly documentEndpoint: string;
}
//# sourceMappingURL=cosmos-db-types.d.ts.map