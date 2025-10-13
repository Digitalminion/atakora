import { Construct } from '@atakora/cdk';
import { IGrantable, IGrantResult } from '@atakora/lib';
import type { DatabaseAccountsProps, IDatabaseAccount } from './cosmos-db-types';
/**
 * L2 construct for Azure Cosmos DB Database Account.
 *
 * @remarks
 * Intent-based construct that provides sensible defaults and type-safe configuration
 * for creating Cosmos DB database accounts.
 *
 * **Resource Type**: Microsoft.DocumentDB/databaseAccounts
 * **API Version**: 2024-08-15
 * **Deployment Scope**: ResourceGroup
 *
 * **Key Features**:
 * - Auto-generates account name if not provided
 * - Defaults consistency level to Session
 * - Defaults publicNetworkAccess to 'disabled'
 * - Defaults kind to GlobalDocumentDB
 * - Builds locations array from location and additionalLocations
 * - Adds EnableServerless capability if enableServerless is true
 *
 * For maximum control over ARM properties, use {@link ArmDatabaseAccounts} instead.
 *
 * @example
 * Basic serverless Cosmos DB account:
 * ```typescript
 * import { CosmosDbAccount } from '@atakora/lib';
 *
 * const cosmosAccount = new CosmosDbAccount(resourceGroup, 'CosmosAccount', {
 *   location: 'eastus',
 *   enableServerless: true
 * });
 * ```
 *
 * @example
 * Multi-region Cosmos DB account:
 * ```typescript
 * const cosmosAccount = new CosmosDbAccount(resourceGroup, 'CosmosAccount', {
 *   databaseAccountName: 'cosmos-authr-001',
 *   location: 'eastus',
 *   additionalLocations: ['westus', 'northeurope'],
 *   enableAutomaticFailover: true
 * });
 * ```
 */
export declare class DatabaseAccounts extends Construct implements IDatabaseAccount {
    /**
     * Counter for generating unique grant IDs
     */
    private grantCounter;
    /**
     * The underlying L1 construct.
     */
    private readonly armAccount;
    /**
     * Name of the Cosmos DB database account.
     */
    readonly databaseAccountName: string;
    /**
     * Azure region.
     */
    readonly location: string;
    /**
     * ARM resource ID.
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
    constructor(scope: Construct, id: string, props?: DatabaseAccountsProps);
    /**
     * Generates an account name from the construct ID.
     *
     * @remarks
     * Cosmos DB account names have constraints:
     * - 3-44 characters
     * - Lowercase letters, numbers, and hyphens
     * - Globally unique across Azure
     *
     * New naming convention for global uniqueness:
     * - Format: cosdb-<project>-<instance>-<8-char-hash>
     * - Hash is generated from full resource name to ensure uniqueness
     * - Example: cosdb-authr-03-a1b2c3d4
     */
    private generateAccountName;
    /**
     * Gets the SubscriptionStack from the construct tree.
     */
    private getSubscriptionStack;
    /**
     * Converts construct ID to purpose identifier for naming.
     */
    private constructIdToPurpose;
    /**
     * Resolves the location from props or parent scope.
     */
    private resolveLocation;
    /**
     * Builds the locations array from primary location and additional locations.
     */
    private buildLocations;
    /**
     * Builds the capabilities array.
     */
    private buildCapabilities;
    /**
     * Import an existing Cosmos DB account by its resource ID.
     *
     * @param scope - The parent construct
     * @param id - The construct ID
     * @param accountId - The full resource ID of the Cosmos DB account
     * @returns An IDatabaseAccount reference
     */
    static fromAccountId(scope: Construct, id: string, accountId: string): IDatabaseAccount;
    /**
     * Grant read access to Cosmos DB data (SQL API).
     *
     * @remarks
     * Data plane read access for SQL API. Allows reading documents, querying containers,
     * and reading stored procedures, triggers, and UDFs.
     *
     * **Permissions**:
     * - Read documents
     * - Query containers
     * - Read stored procedures, triggers, UDFs
     *
     * **Common Use Cases**:
     * - Read-only applications
     * - Reporting tools
     * - Data analysis
     *
     * **Note**: This role is for data plane access using SQL API.
     * It does not grant access to account metadata.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * Grant a Function App read access to Cosmos DB:
     * ```typescript
     * const functionApp = new FunctionApp(stack, 'DataReader', {});
     * const cosmosAccount = new DatabaseAccounts(resourceGroup, 'Database', {
     *   location: 'eastus'
     * });
     *
     * cosmosAccount.grantDataRead(functionApp);
     * ```
     */
    grantDataRead(grantable: IGrantable): IGrantResult;
    /**
     * Grant read and write access to Cosmos DB data (SQL API).
     *
     * @remarks
     * Full data plane access for SQL API. Allows creating, reading, updating, and deleting
     * documents, as well as executing stored procedures.
     *
     * **Permissions**:
     * - All grantDataRead permissions
     * - Create, update, delete documents
     * - Execute stored procedures
     *
     * **Common Use Cases**:
     * - Application data access
     * - Data migration tools
     * - CRUD operations
     *
     * **Note**: This role is for data plane access using SQL API.
     * It does not grant access to account management or metadata operations.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * Grant a Web App read/write access to Cosmos DB:
     * ```typescript
     * const webApp = new WebApp(stack, 'App', {});
     * cosmosAccount.grantDataWrite(webApp);
     * ```
     */
    grantDataWrite(grantable: IGrantable): IGrantResult;
    /**
     * Grant read access to Cosmos DB account metadata.
     *
     * @remarks
     * View account properties without data access. This is a control plane role
     * that allows viewing account configuration and metrics.
     *
     * **Permissions**:
     * - Read account properties
     * - List database accounts
     * - View account metrics
     *
     * **Common Use Cases**:
     * - Monitoring systems
     * - Configuration readers
     * - Cost analysis
     *
     * **Note**: This role does NOT grant access to data within the account.
     * Use grantDataRead for data access.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * Grant monitoring system read access to account metadata:
     * ```typescript
     * const monitor = new VirtualMachine(stack, 'Monitor', {});
     * cosmosAccount.grantAccountReader(monitor);
     * ```
     */
    grantAccountReader(grantable: IGrantable): IGrantResult;
    /**
     * Grant operator access to manage Cosmos DB accounts (no data access).
     *
     * @remarks
     * Control plane operations without data plane access. Allows managing account
     * configuration, failover, and keys without accessing the data itself.
     *
     * **Permissions**:
     * - All grantAccountReader permissions
     * - Failover accounts
     * - Regenerate keys
     * - Manage throughput
     *
     * **Common Use Cases**:
     * - Database administrators
     * - Operations teams
     * - Disaster recovery management
     *
     * **Note**: This role does NOT grant access to data within the account.
     * Combine with grantDataRead or grantDataWrite for data access.
     *
     * @param grantable - Identity to grant permissions to
     * @returns Grant result with the created role assignment
     *
     * @example
     * Grant DBA operator access:
     * ```typescript
     * const dba = UserAssignedIdentity.fromId(stack, 'DBA', 'dba-identity-id');
     * cosmosAccount.grantOperator(dba);
     * ```
     */
    grantOperator(grantable: IGrantable): IGrantResult;
    /**
     * Internal helper to create role assignments for grant methods.
     * Uses composition pattern instead of extending GrantableResource.
     */
    protected grant(grantable: IGrantable, roleDefinitionId: string, description?: string): IGrantResult;
}
//# sourceMappingURL=cosmos-db.d.ts.map