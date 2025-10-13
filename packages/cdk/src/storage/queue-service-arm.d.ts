import { Construct, Resource, DeploymentScope, ValidationResult } from '@atakora/cdk';
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
export declare class ArmQueueServices extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for queue services.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the parent storage account.
     */
    readonly storageAccountName: string;
    /**
     * Name of the queue service (always "default").
     */
    readonly queueServiceName: string;
    /**
     * Resource name (full path including parent).
     *
     * @remarks
     * Format: `{storageAccountName}/default`
     */
    readonly name: string;
    /**
     * CORS configuration.
     */
    readonly cors?: {
        readonly corsRules: QueueCorsRule[];
    };
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Storage/storageAccounts/{storageAccountName}/queueServices/default`
     */
    readonly resourceId: string;
    /**
     * Queue service resource ID (alias for resourceId).
     */
    readonly queueServiceId: string;
    /**
     * Creates a new ArmQueueServices construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Queue service properties
     *
     * @throws {Error} If storageAccountName is empty
     */
    constructor(scope: Construct, id: string, props: ArmQueueServicesProps);
    /**
     * Validates queue service properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmQueueServicesProps): void;
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
//# sourceMappingURL=queue-service-arm.d.ts.map