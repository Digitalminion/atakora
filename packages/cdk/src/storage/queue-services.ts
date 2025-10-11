import { Construct } from '@atakora/cdk';
import { ArmQueueServices } from './queue-service-arm';
import type { QueueServicesProps, IQueueService } from './queue-service-types';
import type { IStorageAccount } from './storage-account-types';

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
export class QueueServices extends Construct implements IQueueService {
  /**
   * Underlying L1 construct.
   */
  private readonly armQueueService: ArmQueueServices;

  /**
   * Parent storage account.
   */
  private readonly parentStorageAccount: IStorageAccount;

  /**
   * Name of the queue service (always "default").
   */
  public readonly queueServiceName: string = 'default';

  /**
   * Name of the parent storage account.
   */
  public readonly storageAccountName: string;

  /**
   * Resource ID of the queue service.
   */
  public readonly queueServiceId: string;

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
  constructor(scope: Construct, id: string, props?: QueueServicesProps) {
    super(scope, id);

    // Get parent storage account
    this.parentStorageAccount = this.getParentStorageAccount(scope);

    // Set storage account name
    this.storageAccountName = this.parentStorageAccount.storageAccountName;

    // Create underlying L1 resource
    this.armQueueService = new ArmQueueServices(scope, `${id}Service`, {
      storageAccountName: this.storageAccountName,
      cors: props?.cors,
    });

    // Get resource ID from L1
    this.queueServiceId = this.armQueueService.queueServiceId;
  }

  /**
   * Gets the parent StorageAccount from the construct tree.
   *
   * @param scope - Parent construct
   * @returns The storage account interface
   * @throws {Error} If parent is not or doesn't contain a StorageAccount
   */
  private getParentStorageAccount(scope: Construct): IStorageAccount {
    // Walk up the construct tree to find StorageAccount
    let current: Construct | undefined = scope;

    while (current) {
      // Check if current implements IStorageAccount interface
      if (this.isStorageAccount(current)) {
        return current as IStorageAccount;
      }
      current = current.node.scope;
    }

    throw new Error(
      'QueueServices must be created within or under a StorageAccount. ' +
        'Ensure the parent scope is a StorageAccount or has one in its hierarchy.'
    );
  }

  /**
   * Checks if a construct implements IStorageAccount interface using duck typing.
   *
   * @param construct - Construct to check
   * @returns True if construct has StorageAccount properties
   */
  private isStorageAccount(construct: any): construct is IStorageAccount {
    return (
      construct &&
      typeof construct.storageAccountName === 'string' &&
      typeof construct.storageAccountId === 'string' &&
      typeof construct.location === 'string'
    );
  }
}
