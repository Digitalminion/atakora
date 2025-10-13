import { Construct } from '@atakora/cdk';
import type { QueueServicesProps, IQueueService } from './queue-service-types';
/**
 * L2 construct for Azure Storage Queue Service.
 *
 * @remarks
 * Intent-based API for managing queue service configuration.
 * The queue service is a container for queues and provides CORS configuration.
 *
 * **ARM Resource Type**: `Microsoft.Storage/storageAccounts/queueServices`
 * **API Version**: `2025-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * Minimal usage:
 * ```typescript
 * import { QueueServices } from '@atakora/cdk/storage';
 *
 * const queueService = new QueueServices(storageAccount, 'QueueService');
 * ```
 *
 * @example
 * With CORS configuration:
 * ```typescript
 * const queueService = new QueueServices(storageAccount, 'QueueService', {
 *   cors: {
 *     corsRules: [{
 *       allowedOrigins: ['https://example.com'],
 *       allowedMethods: ['GET', 'POST'],
 *       allowedHeaders: ['*'],
 *       exposedHeaders: ['*'],
 *       maxAgeInSeconds: 3600
 *     }]
 *   }
 * });
 * ```
 */
export declare class QueueServices extends Construct implements IQueueService {
    /**
     * Underlying L1 construct.
     */
    private readonly armQueueService;
    /**
     * Parent storage account.
     */
    private readonly parentStorageAccount;
    /**
     * Name of the queue service (always "default").
     */
    readonly queueServiceName: string;
    /**
     * Name of the parent storage account.
     */
    readonly storageAccountName: string;
    /**
     * Resource ID of the queue service.
     */
    readonly queueServiceId: string;
    /**
     * Creates a new QueueServices construct.
     *
     * @param scope - Parent construct (must be or contain a StorageAccount)
     * @param id - Unique identifier for this construct
     * @param props - Optional queue service properties
     *
     * @throws {Error} If scope does not contain a StorageAccount
     *
     * @example
     * ```typescript
     * const queueService = new QueueServices(storageAccount, 'QueueService', {
     *   cors: { corsRules: [...] }
     * });
     * ```
     */
    constructor(scope: Construct, id: string, props?: QueueServicesProps);
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
}
//# sourceMappingURL=queue-services.d.ts.map