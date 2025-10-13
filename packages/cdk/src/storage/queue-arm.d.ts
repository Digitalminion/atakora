import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
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
export declare class ArmStorageQueues extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for storage queues.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the parent storage account.
     */
    readonly storageAccountName: string;
    /**
     * Name of the queue.
     */
    readonly queueName: string;
    /**
     * Resource name (full path including parent).
     *
     * @remarks
     * Format: `{storageAccountName}/default/{queueName}`
     */
    readonly name: string;
    /**
     * Metadata for the queue.
     */
    readonly metadata?: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Storage/storageAccounts/{storageAccountName}/queueServices/default/queues/{queueName}`
     */
    readonly resourceId: string;
    /**
     * Queue resource ID (alias for resourceId).
     */
    readonly queueId: string;
    /**
     * Queue URL.
     *
     * @remarks
     * Format: `https://{storageAccountName}.queue.core.windows.net/{queueName}`
     */
    readonly queueUrl: string;
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
    constructor(scope: Construct, id: string, props: ArmStorageQueuesProps);
    /**
     * Validates storage queue properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmStorageQueuesProps): void;
    /**
     * Validates ARM template structure before transformation.
     *
     * @remarks
     * This validates the ARM-specific structure requirements that must be met
     * after the toArmTemplate transformation.
     *
     * @returns Validation result with any errors or warnings
     */
    validateArmStructure(): ValidationResult;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=queue-arm.d.ts.map