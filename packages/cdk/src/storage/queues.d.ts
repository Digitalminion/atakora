import { Construct } from '@atakora/cdk';
import type { IGrantable, IGrantResult } from '@atakora/lib';
import type { StorageQueuesProps, IStorageQueue } from './queue-types';
/**
 * L2 construct for Azure Storage Queue.
 *
 * @remarks
 * Intent-based API with sensible defaults and auto-naming.
 * Provides developer-friendly experience with minimal required configuration.
 *
 * **Features**:
 * - Auto-generates queue name from construct ID
 * - Automatically associates with parent storage account
 * - Built-in RBAC grant methods for queue operations
 *
 * **ARM Resource Type**: `Microsoft.Storage/storageAccounts/queueServices/queues`
 * **API Version**: `2025-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage (auto-generates queue name):
 * ```typescript
 * import { StorageQueues } from '@atakora/cdk/storage';
 *
 * const queue = new StorageQueues(storageAccount, 'OrderQueue');
 * ```
 *
 * @example
 * With custom properties:
 * ```typescript
 * const queue = new StorageQueues(storageAccount, 'OrderQueue', {
 *   queueName: 'order-processing',
 *   metadata: {
 *     purpose: 'order-processing',
 *     team: 'backend'
 *   }
 * });
 * ```
 *
 * @example
 * Granting access to a function app:
 * ```typescript
 * const queue = new StorageQueues(storageAccount, 'OrderQueue');
 * const functionApp = new FunctionApp(stack, 'OrderProcessor');
 * queue.grantSend(functionApp);
 * queue.grantProcess(functionApp);
 * ```
 */
export declare class StorageQueues extends Construct implements IStorageQueue {
    /**
     * Underlying L1 construct.
     */
    private readonly armStorageQueue;
    /**
     * Parent storage account.
     */
    private readonly parentStorageAccount;
    /**
     * Name of the queue.
     */
    readonly queueName: string;
    /**
     * Name of the parent storage account.
     */
    readonly storageAccountName: string;
    /**
     * Resource ID of the queue.
     */
    readonly queueId: string;
    /**
     * Queue URL.
     */
    readonly queueUrl: string;
    /**
     * Metadata for the queue.
     */
    readonly metadata?: Record<string, string>;
    /**
     * Counter for generating unique grant IDs.
     */
    private grantCounter;
    /**
     * Creates a new StorageQueues construct.
     *
     * @param scope - Parent construct (must be or contain a StorageAccount)
     * @param id - Unique identifier for this construct
     * @param props - Optional queue properties
     *
     * @throws {Error} If scope does not contain a StorageAccount
     *
     * @example
     * ```typescript
     * const queue = new StorageQueues(storageAccount, 'OrderQueue', {
     *   queueName: 'order-processing',
     *   metadata: { purpose: 'orders' }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props?: StorageQueuesProps);
    /**
     * Gets the parent StorageAccount from the construct tree.
     *
     * @param scope - Parent construct
     * @returns The storage account interface
     * @throws {Error} If parent is not or doesn't contain a StorageAccount
     */
    private getParentStorageAccount;
    /**
     * Checks if a construct implements IStorageAccount interface using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has StorageAccount properties
     */
    private isStorageAccount;
    /**
     * Resolves the queue name from props or auto-generates it.
     *
     * @param id - Construct ID
     * @param props - Queue properties
     * @returns Resolved queue name
     *
     * @remarks
     * Queue names have these constraints:
     * - 3-63 characters
     * - Lowercase alphanumeric and hyphens only
     * - Cannot start or end with hyphen
     * - Cannot have consecutive hyphens
     *
     * Auto-generated format: lowercase ID with hyphens
     * Example: OrderQueue -> order-queue
     */
    private resolveQueueName;
    /**
     * Core grant method used by all resource-specific grant methods.
     *
     * @param grantable - Identity to grant permissions to
     * @param roleDefinitionId - Azure role definition resource ID
     * @param description - Optional description for the role assignment
     * @returns Grant result with the created role assignment
     *
     * @internal
     */
    protected grant(grantable: IGrantable, roleDefinitionId: string, description?: string): IGrantResult;
    /**
     * Generates a unique ID for each grant.
     *
     * @returns Sequential grant number as string
     *
     * @internal
     */
    private generateGrantId;
    /**
     * Grant read access to this queue.
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     *
     * @example
     * ```typescript
     * const queue = new StorageQueues(storageAccount, 'OrderQueue');
     * const functionApp = new FunctionApp(stack, 'Function');
     * queue.grantRead(functionApp);
     * ```
     */
    grantRead(grantable: IGrantable): IGrantResult;
    /**
     * Grant message processing access (read and delete messages).
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     *
     * @remarks
     * This is the typical permission needed for queue consumers.
     */
    grantProcess(grantable: IGrantable): IGrantResult;
    /**
     * Grant message sending access (add messages to queue).
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     *
     * @remarks
     * This is the typical permission needed for queue producers.
     */
    grantSend(grantable: IGrantable): IGrantResult;
    /**
     * Grant full access to this queue (read, send, process).
     *
     * @param grantable - Identity to grant access to
     * @returns The created role assignment
     */
    grantFullAccess(grantable: IGrantable): IGrantResult;
}
//# sourceMappingURL=queues.d.ts.map