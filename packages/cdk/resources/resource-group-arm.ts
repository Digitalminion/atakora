import { Construct, Resource } from '@atakora/lib';
import { DeploymentScope } from '@atakora/lib';
import type { ArmResource } from '@atakora/lib';
import type { ArmResourceGroupsProps } from './resource-group-types';

/**
 * L1 construct for Azure Resource Group.
 *
 * @remarks
 * Direct mapping to Microsoft.Resources/resourceGroups ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Resources/resourceGroups`
 * **API Version**: `2025-04-01`
 * **Deployment Scope**: Subscription
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link ResourceGroup} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmResourceGroup } from '@atakora/lib';
 *
 * const rg = new ArmResourceGroup(stack, 'DataRG', {
 *   resourceGroupName: 'rg-digital-minion-authr-data-nonprod-eastus-01',
 *   location: 'eastus',
 *   tags: {
 *     environment: 'nonprod',
 *     project: 'authr'
 *   }
 * });
 * ```
 *
 * @example
 * Minimal required properties:
 * ```typescript
 * const rg = new ArmResourceGroup(stack, 'MinimalRG', {
 *   resourceGroupName: 'my-resource-group',
 *   location: 'eastus'
 * });
 * ```
 */
export class ArmResourceGroups extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Resources/resourceGroups';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2025-04-01';

  /**
   * Deployment scope for resource groups.
   */
  public readonly scope: DeploymentScope.Subscription = DeploymentScope.Subscription;

  /**
   * Name of the resource group.
   */
  public readonly resourceGroupName: string;

  /**
   * Resource name (same as resourceGroupName for resource groups).
   */
  public readonly name: string;

  /**
   * Azure region where the resource group is located.
   */
  public readonly location: string;

  /**
   * Tags applied to the resource group.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}`
   */
  public readonly resourceId: string;

  /**
   * Creates a new ArmResourceGroup construct.
   *
   * @param scope - Parent construct (typically a SubscriptionStack)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Resource group properties
   *
   * @throws {Error} If resourceGroupName is empty or exceeds 90 characters
   * @throws {Error} If location is empty
   * @throws {Error} If resourceGroupName contains invalid characters
   */
  constructor(scope: Construct, id: string, props: ArmResourceGroupsProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.resourceGroupName = props.resourceGroupName;
    this.name = props.resourceGroupName;
    this.location = props.location;
    this.tags = props.tags ?? {};

    // Construct resource ID
    // Note: subscriptionId would come from parent stack in real implementation
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/${this.resourceGroupName}`;
  }

  /**
   * Validates resource group properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  protected validateProps(props: ArmResourceGroupsProps): void {
    // Validate resource group name
    if (!props.resourceGroupName || props.resourceGroupName.trim() === '') {
      throw new Error('Resource group name cannot be empty');
    }

    if (props.resourceGroupName.length > 90) {
      throw new Error(
        `Resource group name cannot exceed 90 characters (got ${props.resourceGroupName.length})`
      );
    }

    // Validate name pattern: ^[-\w\._\(\)]+$
    const namePattern = /^[-\w\._\(\)]+$/;
    if (!namePattern.test(props.resourceGroupName)) {
      throw new Error(
        `Resource group name contains invalid characters. ` +
          `Must match pattern: ^[-\\w\\._\\(\\)]+$ ` +
          `(alphanumeric, hyphens, underscores, periods, parentheses)`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }
  }

  /**
   * Generates ARM template representation of this resource.
   *
   * @remarks
   * Called during synthesis to produce the ARM template JSON.
   * This will be implemented by Grace's synthesis pipeline.
   *
   * @returns ARM template resource object
   */
  public toArmTemplate(): ArmResource {
    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.resourceGroupName,
      location: this.location,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    };
  }
}
