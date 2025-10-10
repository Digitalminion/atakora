import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmEventHubProps } from './event-hub-types';

/**
 * L1 construct for Azure Event Hub.
 *
 * @remarks
 * Direct mapping to Microsoft.EventHub/namespaces/eventhubs ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.EventHub/namespaces/eventhubs`
 * **API Version**: `2021-11-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link EventHub} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmEventHub } from '@atakora/cdk/eventhub';
 *
 * const eventHub = new ArmEventHub(resourceGroup, 'EventHub', {
 *   namespaceName: 'evhns-myapp-prod',
 *   eventHubName: 'events',
 *   location: 'eastus',
 *   partitionCount: 4,
 *   messageRetentionInDays: 7
 * });
 * ```
 */
export class ArmEventHub extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.EventHub/namespaces/eventhubs';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2021-11-01';

  /**
   * Deployment scope for Event Hubs.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Namespace name containing the Event Hub.
   */
  public readonly namespaceName: string;

  /**
   * Name of the Event Hub.
   */
  public readonly eventHubName: string;

  /**
   * Resource name (same as eventHubName).
   */
  public readonly name: string;

  /**
   * Azure region where the Event Hub is located.
   */
  public readonly location: string;

  /**
   * Number of partitions.
   */
  public readonly partitionCount?: number;

  /**
   * Message retention in days.
   */
  public readonly messageRetentionInDays?: number;

  /**
   * Capture description configuration.
   */
  public readonly captureDescription?: any;

  /**
   * Tags applied to the Event Hub.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.EventHub/namespaces/{namespaceName}/eventhubs/{eventHubName}`
   */
  public readonly resourceId: string;

  /**
   * Event Hub resource ID (alias for resourceId).
   */
  public readonly eventHubId: string;

  /**
   * Creates a new ArmEventHub construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Event Hub properties
   *
   * @throws {Error} If eventHubName is invalid
   * @throws {Error} If location is empty
   */
  constructor(scope: Construct, id: string, props: ArmEventHubProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.namespaceName = props.namespaceName;
    this.eventHubName = props.eventHubName;
    this.name = props.eventHubName;
    this.location = props.location;
    this.partitionCount = props.partitionCount;
    this.messageRetentionInDays = props.messageRetentionInDays;
    this.captureDescription = props.captureDescription;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.EventHub/namespaces/${this.namespaceName}/eventhubs/${this.eventHubName}`;
    this.eventHubId = this.resourceId;
  }

  /**
   * Validates Event Hub properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  protected validateProps(props: ArmEventHubProps): void {
    // Validate namespace name
    if (!props.namespaceName || props.namespaceName.trim() === '') {
      throw new Error('Event Hub namespace name cannot be empty');
    }

    // Validate event hub name
    if (!props.eventHubName || props.eventHubName.trim() === '') {
      throw new Error('Event Hub name cannot be empty');
    }

    if (props.eventHubName.length < 1 || props.eventHubName.length > 256) {
      throw new Error(`Event Hub name must be 1-256 characters (got ${props.eventHubName.length})`);
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate partition count if provided
    if (props.partitionCount !== undefined) {
      if (props.partitionCount < 1 || props.partitionCount > 32) {
        throw new Error(`Partition count must be 1-32 for Basic/Standard tiers (got ${props.partitionCount})`);
      }
    }

    // Validate message retention if provided
    if (props.messageRetentionInDays !== undefined) {
      if (props.messageRetentionInDays < 1 || props.messageRetentionInDays > 7) {
        throw new Error(`Message retention must be 1-7 days for Basic/Standard tiers (got ${props.messageRetentionInDays})`);
      }
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
    const properties: any = {};

    // Add optional properties
    if (this.partitionCount !== undefined) {
      properties.partitionCount = this.partitionCount;
    }

    if (this.messageRetentionInDays !== undefined) {
      properties.messageRetentionInDays = this.messageRetentionInDays;
    }

    if (this.captureDescription) {
      properties.captureDescription = this.captureDescription;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.namespaceName}/${this.eventHubName}`,
      location: this.location,
      properties,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    } as ArmResource;
  }
}
