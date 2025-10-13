import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmDatabaseAccountsProps, IDatabaseAccount } from './cosmos-db-types';
/**
 * L1 construct for Azure Cosmos DB Database Account.
 *
 * @remarks
 * Direct mapping to Microsoft.DocumentDB/databaseAccounts ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.DocumentDB/databaseAccounts`
 * **API Version**: `2024-08-15`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * defaults, use the {@link CosmosDbAccount} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmCosmosDbAccount, DatabaseAccountOfferType, ConsistencyLevel } from '@atakora/lib';
 *
 * const cosmosAccount = new ArmCosmosDbAccount(resourceGroup, 'CosmosAccount', {
 *   databaseAccountName: 'cosmos-authr-001',
 *   location: 'eastus',
 *   databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
 *   locations: [
 *     {
 *       locationName: 'eastus',
 *       failoverPriority: 0,
 *       isZoneRedundant: false
 *     }
 *   ],
 *   consistencyPolicy: {
 *     defaultConsistencyLevel: ConsistencyLevel.SESSION
 *   }
 * });
 * ```
 */
export declare class ArmDatabaseAccounts extends Resource implements IDatabaseAccount {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for Cosmos DB accounts.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the Cosmos DB database account.
     */
    readonly databaseAccountName: string;
    /**
     * Resource name (same as databaseAccountName).
     */
    readonly name: string;
    /**
     * Azure region where the Cosmos DB account is located.
     */
    readonly location: string;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.DocumentDB/databaseAccounts/{databaseAccountName}`
     */
    readonly resourceId: string;
    /**
     * Cosmos DB account resource ID (alias for resourceId).
     */
    readonly accountId: string;
    /**
     * The endpoint URI for the Cosmos DB account.
     */
    readonly documentEndpoint: string;
    /**
     * Database account offer type.
     */
    private readonly databaseAccountOfferType;
    /**
     * All properties for ARM template.
     */
    private readonly props;
    /**
     * Creates a new ArmCosmosDbAccount construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Cosmos DB account properties
     *
     * @throws {Error} If databaseAccountName is invalid
     * @throws {Error} If location is empty
     * @throws {Error} If databaseAccountOfferType or locations are not provided
     */
    constructor(scope: Construct, id: string, props: ArmDatabaseAccountsProps);
    /**
     * Validates Cosmos DB account properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmDatabaseAccountsProps): void;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=cosmos-db-arm.d.ts.map