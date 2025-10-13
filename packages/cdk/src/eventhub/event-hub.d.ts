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
import { Construct, GrantableResource } from '@atakora/lib';
import type { IGrantable, IGrantResult, ArmResource } from '@atakora/lib';
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
export declare class EventHub extends GrantableResource implements IEventHub {
    /**
     * Underlying L1 Event Hub construct.
     *
     * @remarks
     * Provides access to the ARM-level construct for advanced scenarios.
     */
    private readonly armEventHub;
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * Namespace name containing the Event Hub.
     */
    readonly namespaceName: string;
    /**
     * Name of the Event Hub.
     */
    readonly eventHubName: string;
    /**
     * Resource name (same as eventHubName).
     */
    readonly name: string;
    /**
     * Azure region where the Event Hub is located.
     */
    readonly location: string;
    /**
     * Resource ID of the Event Hub.
     */
    readonly resourceId: string;
    /**
     * Resource ID of the Event Hub (alias).
     */
    readonly eventHubId: string;
    /**
     * Creates a new L2 Event Hub construct.
     *
     * @param scope - Parent construct (typically a ResourceGroupStack)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Event Hub properties
     *
     * @throws {Error} If parent is not a ResourceGroupStack (when location not provided)
     */
    constructor(scope: Construct, id: string, props: EventHubProps);
    /**
     * Validates Event Hub properties.
     *
     * @param props - Properties to validate
     * @internal
     */
    protected validateProps(props: EventHubProps): void;
    /**
     * Generates ARM template representation.
     *
     * @returns ARM template resource object
     * @internal
     */
    toArmTemplate(): ArmResource;
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
    grantDataReceiver(grantable: IGrantable): IGrantResult;
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
    grantDataSender(grantable: IGrantable): IGrantResult;
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
    grantDataOwner(grantable: IGrantable): IGrantResult;
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
    static fromEventHubName(scope: Construct, id: string, namespaceName: string, eventHubName: string, location: string): IEventHub;
    /**
     * Generates a resource-specific name following naming conventions.
     *
     * @param serviceAbbreviation - Azure service abbreviation (e.g., 'evh')
     * @param purpose - Purpose derived from construct ID
     * @returns Generated resource name
     *
     * @internal
     */
    private generateResourceName;
    /**
     * Merges tags from parent stack with provided tags.
     *
     * @param tags - Additional tags to merge
     * @returns Merged tag collection
     *
     * @internal
     */
    private mergeTags;
}
//# sourceMappingURL=event-hub.d.ts.map