import { Construct } from '@atakora/cdk';
import type { IGrantable, IGrantResult } from '@atakora/lib';
import { WellKnownRoleIds, RoleAssignment, GrantResult } from '@atakora/lib';
import { ArmStorageQueues } from './queue-arm';
import type { StorageQueuesProps, IStorageQueue } from './queue-types';
import type { IStorageAccount } from './storage-account-types';

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
export class StorageQueues extends Construct implements IStorageQueue {
  /**
   * Underlying L1 construct.
   */
  private readonly armStorageQueue: ArmStorageQueues;

  /**
   * Parent storage account.
   */
  private readonly parentStorageAccount: IStorageAccount;

  /**
   * Name of the queue.
   */
  public readonly queueName: string;

  /**
   * Name of the parent storage account.
   */
  public readonly storageAccountName: string;

  /**
   * Resource ID of the queue.
   */
  public readonly queueId: string;

  /**
   * Queue URL.
   */
  public readonly queueUrl: string;

  /**
   * Metadata for the queue.
   */
  public readonly metadata?: Record<string, string>;

  /**
   * Counter for generating unique grant IDs.
   */
  private grantCounter = 0;

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
  constructor(scope: Construct, id: string, props?: StorageQueuesProps) {
    super(scope, id);

    // Get parent storage account
    this.parentStorageAccount = this.getParentStorageAccount(scope);

    // Auto-generate or use provided queue name
    this.queueName = this.resolveQueueName(id, props);

    // Set storage account name
    this.storageAccountName = this.parentStorageAccount.storageAccountName;

    // Set metadata
    this.metadata = props?.metadata;

    // Create underlying L1 resource
    this.armStorageQueue = new ArmStorageQueues(scope, `${id}Queue`, {
      storageAccountName: this.storageAccountName,
      queueName: this.queueName,
      metadata: this.metadata,
    });

    // Get resource ID and URL from L1
    this.queueId = this.armStorageQueue.queueId;
    this.queueUrl = this.armStorageQueue.queueUrl;
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
      'StorageQueues must be created within or under a StorageAccount. ' +
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
  private resolveQueueName(id: string, props?: StorageQueuesProps): string {
    // If name provided explicitly, use it
    if (props?.queueName) {
      return props.queueName;
    }

    // Auto-generate name from construct ID
    // Convert PascalCase/camelCase to kebab-case
    const kebabName = id
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2') // Add hyphen between lowercase and uppercase
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/--+/g, '-') // Replace consecutive hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

    // Ensure it's within length constraints
    if (kebabName.length < 3) {
      return `queue-${kebabName}`;
    }

    if (kebabName.length > 63) {
      return kebabName.substring(0, 63);
    }

    return kebabName;
  }

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
  protected grant(grantable: IGrantable, roleDefinitionId: string, description?: string): IGrantResult {
    // Create role assignment at the parent storage account's scope
    // Note: Queue-level RBAC is not supported; permissions are granted at the storage account level
    const roleAssignment = new RoleAssignment(this, `Grant${this.generateGrantId()}`, {
      scope: this.parentStorageAccount.storageAccountId,
      roleDefinitionId,
      principalId: grantable.principalId,
      principalType: grantable.principalType,
      tenantId: grantable.tenantId,
      description,
    });

    // Return result for further configuration
    return new GrantResult(
      roleAssignment,
      roleDefinitionId,
      grantable,
      this.parentStorageAccount.storageAccountId
    );
  }

  /**
   * Generates a unique ID for each grant.
   *
   * @returns Sequential grant number as string
   *
   * @internal
   */
  private generateGrantId(): string {
    return `${this.grantCounter++}`;
  }

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
  public grantRead(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_QUEUE_DATA_READER,
      `Read access to queue ${this.queueName}`
    );
  }

  /**
   * Grant message processing access (read and delete messages).
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   *
   * @remarks
   * This is the typical permission needed for queue consumers.
   */
  public grantProcess(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_QUEUE_DATA_MESSAGE_PROCESSOR,
      `Process messages in queue ${this.queueName}`
    );
  }

  /**
   * Grant message sending access (add messages to queue).
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   *
   * @remarks
   * This is the typical permission needed for queue producers.
   */
  public grantSend(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_QUEUE_DATA_MESSAGE_SENDER,
      `Send messages to queue ${this.queueName}`
    );
  }

  /**
   * Grant full access to this queue (read, send, process).
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantFullAccess(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_QUEUE_DATA_CONTRIBUTOR,
      `Full access to queue ${this.queueName}`
    );
  }
}
