/**
 * L2 construct for Azure Event Hub with grant capabilities.
 *
 * @remarks
 * Provides an intent-based API with sensible defaults and built-in grant methods
 * for role-based access control (RBAC).
 *
 * **Features**:
 * - Auto-generates Event Hub names following naming conventions
 * - Inherits and merges tags from parent
 * - Applies sensible defaults for partitions and retention
 * - Extends GrantableResource for RBAC grant pattern
 * - Built-in grant methods for common Event Hub permissions
 *
 * **Grant Methods**:
 * - `grantDataReceiver()` - Receive events from Event Hub
 * - `grantDataSender()` - Send events to Event Hub
 * - `grantDataOwner()` - Full Event Hub access
 *
 * @packageDocumentation
 */

import { Construct, GrantableResource, ResourceGroupStack } from '@atakora/lib';
import type { IGrantable, IGrantResult, ArmResource } from '@atakora/lib';
import { WellKnownRoleIds } from '@atakora/lib';
import { ArmEventHub } from './event-hub-arm';
import type { EventHubProps, IEventHub } from './event-hub-types';

/**
 * L2 Event Hub construct with grant capabilities.
 *
 * @remarks
 * Intent-based API that simplifies Event Hub creation with sensible defaults
 * and provides built-in RBAC grant methods.
 *
 * **Default Behavior**:
 * - Auto-generates Event Hub name if not provided
 * - Inherits location from parent resource group
 * - Sets partitionCount to 4 by default
 * - Sets messageRetentionInDays to 7 by default
 * - Merges tags from parent stack
 *
 * **Grant Pattern**:
 * This class extends GrantableResource, enabling resources with managed identities
 * to receive Event Hub permissions through semantic grant methods.
 *
 * @example
 * Basic usage with minimal configuration:
 * ```typescript
 * import { EventHub } from '@atakora/cdk/eventhub';
 *
 * const eventHub = new EventHub(resourceGroup, 'Events', {
 *   namespaceName: 'evhns-myapp-prod'
 * });
 * ```
 *
 * @example
 * With custom configuration:
 * ```typescript
 * const eventHub = new EventHub(resourceGroup, 'Telemetry', {
 *   namespaceName: 'evhns-myapp-prod',
 *   eventHubName: 'telemetry-events',
 *   partitionCount: 8,
 *   messageRetentionInDays: 3,
 *   tags: { costCenter: '12345' }
 * });
 * ```
 *
 * @example
 * Granting permissions to a managed identity:
 * ```typescript
 * // Function App with managed identity
 * const functionApp = new FunctionApp(stack, 'Processor', {
 *   // ... function app config
 * });
 *
 * // Grant Event Hub data receiver access
 * eventHub.grantDataReceiver(functionApp);
 *
 * // Another app that sends events
 * const producer = new FunctionApp(stack, 'Producer', {
 *   // ... function app config
 * });
 *
 * // Grant Event Hub data sender access
 * eventHub.grantDataSender(producer);
 * ```
 *
 * @public
 */
export class EventHub extends GrantableResource implements IEventHub {
  /**
   * Underlying L1 Event Hub construct.
   *
   * @remarks
   * Provides access to the ARM-level construct for advanced scenarios.
   */
  private readonly armEventHub: ArmEventHub;

  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.EventHub/namespaces/eventhubs';

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
   * Resource ID of the Event Hub.
   */
  public readonly resourceId: string;

  /**
   * Resource ID of the Event Hub (alias).
   */
  public readonly eventHubId: string;

  /**
   * Creates a new L2 Event Hub construct.
   *
   * @param scope - Parent construct (typically a ResourceGroupStack)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - Event Hub properties
   *
   * @throws {Error} If parent is not a ResourceGroupStack (when location not provided)
   */
  constructor(scope: Construct, id: string, props: EventHubProps) {
    super(scope, id);

    // Determine location from props or parent
    let location = props.location;
    if (!location) {
      const parent = this.node.scope;
      if (parent instanceof ResourceGroupStack) {
        location = parent.location;
      } else {
        throw new Error(
          `Event Hub '${id}' requires explicit location when not created in a ResourceGroupStack`
        );
      }
    }

    // Generate Event Hub name if not provided
    const eventHubName = props.eventHubName ?? this.generateResourceName('evh', id);

    // Merge tags from parent
    const tags = this.mergeTags(props.tags);

    // Create L1 construct with defaults
    this.armEventHub = new ArmEventHub(this, 'Resource', {
      namespaceName: props.namespaceName,
      eventHubName,
      location,
      partitionCount: props.partitionCount ?? 4,
      messageRetentionInDays: props.messageRetentionInDays ?? 7,
      captureDescription: props.captureDescription,
      tags,
    });

    // Set public properties
    this.namespaceName = props.namespaceName;
    this.eventHubName = eventHubName;
    this.name = eventHubName;
    this.location = location;
    this.resourceId = this.armEventHub.eventHubId;
    this.eventHubId = this.armEventHub.eventHubId;
  }

  /**
   * Validates Event Hub properties.
   *
   * @param props - Properties to validate
   * @internal
   */
  protected validateProps(props: EventHubProps): void {
    // Delegate to L1 construct validation
    // L2 validation happens in constructor before L1 creation
  }

  /**
   * Generates ARM template representation.
   *
   * @returns ARM template resource object
   * @internal
   */
  public toArmTemplate(): ArmResource {
    return this.armEventHub.toArmTemplate();
  }

  /**
   * Grant Event Hub data receiver access (read events).
   *
   * @remarks
   * Allows the grantee to receive events from this Event Hub including:
   * - Receive events
   * - Read event hub metadata
   * - Manage consumer groups
   *
   * This is a data plane permission for consuming events.
   *
   * **Role**: Azure Event Hubs Data Receiver
   * **GUID**: `a638d3c7-ab3a-418d-83e6-5f17a39d4fde`
   *
   * @param grantable - Identity to grant permissions to (resource with managed identity)
   * @returns Grant result for further configuration or dependency management
   *
   * @example
   * ```typescript
   * const consumer = new FunctionApp(stack, 'Consumer', { ... });
   * const eventHub = new EventHub(stack, 'Events', { ... });
   *
   * // Grant receive permissions
   * eventHub.grantDataReceiver(consumer);
   * ```
   *
   * @public
   */
  public grantDataReceiver(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.EVENT_HUB_DATA_RECEIVER,
      `Receive events from ${this.eventHubName}`
    );
  }

  /**
   * Grant Event Hub data sender access (send events).
   *
   * @remarks
   * Allows the grantee to send events to this Event Hub including:
   * - Send events
   * - Read event hub metadata
   *
   * This is a data plane permission for producing events.
   *
   * **Role**: Azure Event Hubs Data Sender
   * **GUID**: `2b629674-e913-4c01-ae53-ef4638d8f975`
   *
   * @param grantable - Identity to grant permissions to (resource with managed identity)
   * @returns Grant result for further configuration or dependency management
   *
   * @example
   * ```typescript
   * const producer = new FunctionApp(stack, 'Producer', { ... });
   * const eventHub = new EventHub(stack, 'Events', { ... });
   *
   * // Grant send permissions
   * eventHub.grantDataSender(producer);
   * ```
   *
   * @public
   */
  public grantDataSender(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.EVENT_HUB_DATA_SENDER,
      `Send events to ${this.eventHubName}`
    );
  }

  /**
   * Grant Event Hub data owner access (full access).
   *
   * @remarks
   * Allows the grantee full access to this Event Hub including:
   * - All data receiver permissions
   * - All data sender permissions
   * - Manage event hubs
   * - Manage consumer groups
   *
   * This is the highest level of Event Hub data plane permission.
   *
   * **Role**: Azure Event Hubs Data Owner
   * **GUID**: `f526a384-b230-433a-b45c-95f59c4a2dec`
   *
   * @param grantable - Identity to grant permissions to (resource with managed identity)
   * @returns Grant result for further configuration or dependency management
   *
   * @example
   * ```typescript
   * const admin = new FunctionApp(stack, 'Admin', { ... });
   * const eventHub = new EventHub(stack, 'Events', { ... });
   *
   * // Grant full access
   * eventHub.grantDataOwner(admin);
   * ```
   *
   * @public
   */
  public grantDataOwner(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.EVENT_HUB_DATA_OWNER,
      `Full access to ${this.eventHubName}`
    );
  }

  /**
   * Import an existing Event Hub by name.
   *
   * @remarks
   * Creates a reference to an existing Event Hub without managing its lifecycle.
   * Useful for referencing Event Hubs created outside the current stack.
   *
   * @param scope - Parent construct
   * @param id - Unique identifier for this reference
   * @param namespaceName - Name of the Event Hub namespace
   * @param eventHubName - Name of the Event Hub
   * @param location - Azure region where the Event Hub is located
   * @returns Event Hub reference implementing IEventHub
   *
   * @example
   * ```typescript
   * const existingEventHub = EventHub.fromEventHubName(
   *   stack,
   *   'ExistingEvents',
   *   'evhns-prod-eastus',
   *   'telemetry',
   *   'eastus'
   * );
   *
   * // Can be used for grants
   * existingEventHub.grantDataReceiver(myApp);
   * ```
   *
   * @public
   */
  public static fromEventHubName(
    scope: Construct,
    id: string,
    namespaceName: string,
    eventHubName: string,
    location: string
  ): IEventHub {
    class ImportedEventHub extends GrantableResource implements IEventHub {
      public readonly resourceType = 'Microsoft.EventHub/namespaces/eventhubs';
      public readonly namespaceName = namespaceName;
      public readonly eventHubName = eventHubName;
      public readonly name = eventHubName;
      public readonly location = location;
      public readonly resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.EventHub/namespaces/${namespaceName}/eventhubs/${eventHubName}`;
      public readonly eventHubId = this.resourceId;

      constructor() {
        super(scope, id);
      }

      protected validateProps(_props: unknown): void {
        // No validation needed for imported resources
      }

      public toArmTemplate(): ArmResource {
        throw new Error('Imported resources cannot be synthesized to ARM templates');
      }

      public grantDataReceiver(grantable: IGrantable): IGrantResult {
        return this.grant(
          grantable,
          WellKnownRoleIds.EVENT_HUB_DATA_RECEIVER,
          `Receive events from ${this.eventHubName}`
        );
      }

      public grantDataSender(grantable: IGrantable): IGrantResult {
        return this.grant(
          grantable,
          WellKnownRoleIds.EVENT_HUB_DATA_SENDER,
          `Send events to ${this.eventHubName}`
        );
      }

      public grantDataOwner(grantable: IGrantable): IGrantResult {
        return this.grant(
          grantable,
          WellKnownRoleIds.EVENT_HUB_DATA_OWNER,
          `Full access to ${this.eventHubName}`
        );
      }
    }

    return new ImportedEventHub();
  }

  /**
   * Generates a resource-specific name following naming conventions.
   *
   * @param serviceAbbreviation - Azure service abbreviation (e.g., 'evh')
   * @param purpose - Purpose derived from construct ID
   * @returns Generated resource name
   *
   * @internal
   */
  private generateResourceName(serviceAbbreviation: string, purpose: string): string {
    // This would use the stack's naming context
    // For now, return a placeholder that follows the pattern
    let current = this.node.scope;
    while (current) {
      if (current instanceof ResourceGroupStack) {
        return current.generateResourceName(serviceAbbreviation, purpose);
      }
      current = current.node.scope;
    }
    // Fallback to simple pattern
    return `${serviceAbbreviation}-${purpose.toLowerCase()}`;
  }

  /**
   * Merges tags from parent stack with provided tags.
   *
   * @param tags - Additional tags to merge
   * @returns Merged tag collection
   *
   * @internal
   */
  private mergeTags(tags?: Record<string, string>): Record<string, string> {
    let current = this.node.scope;
    while (current) {
      if (current instanceof ResourceGroupStack) {
        return { ...current.tags, ...tags };
      }
      current = current.node.scope;
    }
    return { ...tags };
  }
}
