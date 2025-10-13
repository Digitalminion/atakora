import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmServerFarmsProps, ServerFarmSku, ServerFarmKind } from './server-farm-types';
/**
 * L1 construct for Azure App Service Plan (Server Farm).
 *
 * @remarks
 * Direct mapping to Microsoft.Web/serverfarms ARM resource.
 * Provides 1:1 correspondence with ARM template properties with no defaults or transformations.
 *
 * **ARM Resource Type**: `Microsoft.Web/serverfarms`
 * **API Version**: `2023-01-01`
 * **Deployment Scope**: ResourceGroup
 *
 * This is a low-level construct for maximum control. For intent-based API with
 * auto-naming and defaults, use the {@link ServerFarms} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmServerFarms, ServerFarmSkuName, ServerFarmSkuTier } from '@atakora/cdk/web';
 *
 * const plan = new ArmServerFarms(resourceGroup, 'Plan', {
 *   planName: 'asp-authr-001',
 *   location: 'eastus',
 *   sku: {
 *     name: ServerFarmSkuName.B1,
 *     tier: ServerFarmSkuTier.BASIC
 *   },
 *   kind: ServerFarmKind.LINUX,
 *   reserved: true
 * });
 * ```
 */
export declare class ArmServerFarms extends Resource {
    /**
     * ARM resource type.
     */
    readonly resourceType: string;
    /**
     * API version for the resource.
     */
    readonly apiVersion: string;
    /**
     * Deployment scope for Server Farms.
     */
    readonly scope: DeploymentScope.ResourceGroup;
    /**
     * Name of the Server Farm.
     */
    readonly planName: string;
    /**
     * Resource name (same as planName).
     */
    readonly name: string;
    /**
     * Azure region where the Server Farm is located.
     */
    readonly location: string;
    /**
     * SKU configuration.
     */
    readonly sku: ServerFarmSku;
    /**
     * Kind of Server Farm.
     */
    readonly kind?: ServerFarmKind;
    /**
     * Reserved flag (true for Linux).
     */
    readonly reserved?: boolean;
    /**
     * Zone redundancy enabled.
     */
    readonly zoneRedundant?: boolean;
    /**
     * Tags applied to the Server Farm.
     */
    readonly tags: Record<string, string>;
    /**
     * ARM resource ID.
     *
     * @remarks
     * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/serverfarms/{planName}`
     */
    readonly resourceId: string;
    /**
     * Server Farm resource ID (alias for resourceId).
     */
    readonly planId: string;
    /**
     * Creates a new ArmServerFarms construct.
     *
     * @param scope - Parent construct (typically a ResourceGroup)
     * @param id - Unique identifier for this construct within the parent scope
     * @param props - Server Farm properties
     *
     * @throws {Error} If planName is invalid
     * @throws {Error} If location is empty
     * @throws {Error} If SKU is not provided
     * @throws {Error} If capacity is invalid
     */
    constructor(scope: Construct, id: string, props: ArmServerFarmsProps);
    /**
     * Validates Server Farm properties against ARM constraints.
     *
     * @param props - Properties to validate
     * @throws {Error} If validation fails
     */
    protected validateProps(props: ArmServerFarmsProps): void;
    /**
     * Generates ARM template representation of this resource.
     *
     * @remarks
     * Called during synthesis to produce the ARM template JSON.
     * This will be implemented by Grace's synthesis pipeline.
     *
     * @returns ARM template resource object
     */
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=server-farm-arm.d.ts.map