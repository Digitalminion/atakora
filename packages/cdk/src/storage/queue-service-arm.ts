import { Construct, Resource, DeploymentScope, ValidationResult, ValidationResultBuilder } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmQueueServicesProps, QueueCorsRule } from './queue-service-types';

/**
 * L1 construct for Azure Storage Queue Service.
 *
 * @remarks
 * Direct mapping to Microsoft.Storage/storageAccounts/queueServices ARM resource.
 * The queue service name is always "default" in Azure.
 *
 * **ARM Resource Type**: `Microsoft.Storage/storageAccounts/queueServices`
 * **API Version**: `2025-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API,
 * use the {@link QueueServices} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmQueueServices } from '@atakora/cdk/storage';
 *
 * const queueService = new ArmQueueServices(resourceGroup, 'QueueService', {
 *   storageAccountName: 'stgauthr001'
 * });
 * ```
 */
export class ArmQueueServices extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Storage/storageAccounts/queueServices';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2025-01-01';

  /**
   * Deployment scope for queue services.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the parent storage account.
   */
  public readonly storageAccountName: string;

  /**
   * Name of the queue service (always "default").
   */
  public readonly queueServiceName: string = 'default';

  /**
   * Resource name (full path including parent).
   *
   * @remarks
   * Format: `{storageAccountName}/default`
   */
  public readonly name: string;

  /**
   * CORS configuration.
   */
  public readonly cors?: {
    readonly corsRules: QueueCorsRule[];
  };

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Storage/storageAccounts/{storageAccountName}/queueServices/default`
   */
  public readonly resourceId: string;

  /**
   * Queue service resource ID (alias for resourceId).
   */
  public readonly queueServiceId: string;

  /**
   * Creates a new ArmQueueServices construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Queue service properties
   *
   * @throws {Error} If storageAccountName is empty
   */
  constructor(scope: Construct, id: string, props: ArmQueueServicesProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.storageAccountName = props.storageAccountName;
    this.name = `${props.storageAccountName}/default`;
    this.cors = props.cors;

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Storage/storageAccounts/${this.storageAccountName}/queueServices/default`;
    this.queueServiceId = this.resourceId;
  }

  /**
   * Validates queue service properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  protected validateProps(props: ArmQueueServicesProps): void {
    // Validate storage account name
    if (!props.storageAccountName || props.storageAccountName.trim() === '') {
      throw new Error('Storage account name cannot be empty');
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

    // Add CORS if provided
    if (this.cors) {
      properties.cors = {
        corsRules: this.cors.corsRules,
      };
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
    } as ArmResource;
  }
}
