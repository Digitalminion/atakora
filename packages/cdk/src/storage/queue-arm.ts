import { Construct, Resource, DeploymentScope, ValidationResult, ValidationResultBuilder } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmStorageQueuesProps } from './queue-types';

/**
 * L1 construct for Azure Storage Queue.
 *
 * @remarks
 * Direct mapping to Microsoft.Storage/storageAccounts/queueServices/queues ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Storage/storageAccounts/queueServices/queues`
 * **API Version**: `2025-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link StorageQueues} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmStorageQueues } from '@atakora/cdk/storage';
 *
 * const queue = new ArmStorageQueues(resourceGroup, 'Queue', {
 *   storageAccountName: 'stgauthr001',
 *   queueName: 'orders',
 *   metadata: {
 *     purpose: 'order-processing'
 *   }
 * });
 * ```
 */
export class ArmStorageQueues extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Storage/storageAccounts/queueServices/queues';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2025-01-01';

  /**
   * Deployment scope for storage queues.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the parent storage account.
   */
  public readonly storageAccountName: string;

  /**
   * Name of the queue.
   */
  public readonly queueName: string;

  /**
   * Resource name (full path including parent).
   *
   * @remarks
   * Format: `{storageAccountName}/default/{queueName}`
   */
  public readonly name: string;

  /**
   * Metadata for the queue.
   */
  public readonly metadata?: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Storage/storageAccounts/{storageAccountName}/queueServices/default/queues/{queueName}`
   */
  public readonly resourceId: string;

  /**
   * Queue resource ID (alias for resourceId).
   */
  public readonly queueId: string;

  /**
   * Queue URL.
   *
   * @remarks
   * Format: `https://{storageAccountName}.queue.core.windows.net/{queueName}`
   */
  public readonly queueUrl: string;

  /**
   * Creates a new ArmStorageQueues construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Storage queue properties
   *
   * @throws {Error} If queueName is invalid
   * @throws {Error} If storageAccountName is empty
   */
  constructor(scope: Construct, id: string, props: ArmStorageQueuesProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.storageAccountName = props.storageAccountName;
    this.queueName = props.queueName;
    this.name = `${props.storageAccountName}/default/${props.queueName}`;
    this.metadata = props.metadata;

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${this.storageAccountName}/queueServices/default/queues/${this.queueName}`;
    this.queueId = this.resourceId;

    // Construct queue URL
    this.queueUrl = `https://${this.storageAccountName}.queue.core.windows.net/${this.queueName}`;
  }

  /**
   * Validates storage queue properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  protected validateProps(props: ArmStorageQueuesProps): void {
    // Validate storage account name
    if (!props.storageAccountName || props.storageAccountName.trim() === '') {
      throw new Error('Storage account name cannot be empty');
    }

    // Validate queue name
    if (!props.queueName || props.queueName.trim() === '') {
      throw new Error('Queue name cannot be empty');
    }

    if (props.queueName.length < 3 || props.queueName.length > 63) {
      throw new Error(`Queue name must be 3-63 characters (got ${props.queueName.length})`);
    }

    // Validate name pattern: ^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$
    // - Lowercase alphanumeric and hyphens only
    // - Cannot start or end with hyphen
    // - Cannot have consecutive hyphens
    const namePattern = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/;
    if (!namePattern.test(props.queueName)) {
      throw new Error(
        `Queue name must contain only lowercase letters, numbers, and hyphens. ` +
          `Cannot start/end with hyphen or have consecutive hyphens (got: ${props.queueName})`
      );
    }

    // Check for consecutive hyphens
    if (props.queueName.includes('--')) {
      throw new Error(`Queue name cannot contain consecutive hyphens (got: ${props.queueName})`);
    }
  }

  /**
   * Validates ARM template structure before transformation.
   *
   * @remarks
   * This validates the ARM-specific structure requirements that must be met
   * after the toArmTemplate transformation.
   *
   * @returns Validation result with any errors or warnings
   */
  public validateArmStructure(): ValidationResult {
    const builder = new ValidationResultBuilder();

    // Generate ARM template to validate structure
    const armTemplate = this.toArmTemplate() as any;

    // Validate required fields are present
    if (!armTemplate.type) {
      builder.addError(
        'ARM template missing type field',
        'The type field is required for all ARM resources',
        'Ensure toArmTemplate() includes type field',
        'armTemplate.type'
      );
    }

    if (!armTemplate.apiVersion) {
      builder.addError(
        'ARM template missing apiVersion field',
        'The apiVersion field is required for all ARM resources',
        'Ensure toArmTemplate() includes apiVersion field',
        'armTemplate.apiVersion'
      );
    }

    if (!armTemplate.name) {
      builder.addError(
        'ARM template missing name field',
        'The name field is required for all ARM resources',
        'Ensure toArmTemplate() includes name field',
        'armTemplate.name'
      );
    }

    return builder.build();
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): ArmResource {
    const properties: any = {};

    // Add metadata if provided
    if (this.metadata) {
      properties.metadata = this.metadata;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
    } as ArmResource;
  }
}
