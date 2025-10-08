import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { DeploymentScope } from '../../core/azure/scopes';
import type { ArmAppServicePlanProps, AppServicePlanSku, AppServicePlanKind } from './types';

/**
 * L1 construct for Azure App Service Plan.
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
 * auto-naming and defaults, use the {@link AppServicePlan} L2 construct instead.
 *
 * @example
 * Basic usage:
 * ```typescript
 * import { ArmAppServicePlan, AppServicePlanSkuName, AppServicePlanSkuTier } from '@atakora/lib';
 *
 * const plan = new ArmAppServicePlan(resourceGroup, 'Plan', {
 *   planName: 'asp-colorai-001',
 *   location: 'eastus',
 *   sku: {
 *     name: AppServicePlanSkuName.B1,
 *     tier: AppServicePlanSkuTier.BASIC
 *   },
 *   kind: AppServicePlanKind.LINUX,
 *   reserved: true
 * });
 * ```
 */
export class ArmAppServicePlan extends Resource {
  /**
   * ARM resource type.
   */
  public readonly resourceType: string = 'Microsoft.Web/serverfarms';

  /**
   * API version for the resource.
   */
  public readonly apiVersion: string = '2023-01-01';

  /**
   * Deployment scope for App Service Plans.
   */
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  /**
   * Name of the App Service Plan.
   */
  public readonly planName: string;

  /**
   * Resource name (same as planName).
   */
  public readonly name: string;

  /**
   * Azure region where the App Service Plan is located.
   */
  public readonly location: string;

  /**
   * SKU configuration.
   */
  public readonly sku: AppServicePlanSku;

  /**
   * Kind of App Service Plan.
   */
  public readonly kind?: AppServicePlanKind;

  /**
   * Reserved flag (true for Linux).
   */
  public readonly reserved?: boolean;

  /**
   * Zone redundancy enabled.
   */
  public readonly zoneRedundant?: boolean;

  /**
   * Tags applied to the App Service Plan.
   */
  public readonly tags: Record<string, string>;

  /**
   * ARM resource ID.
   *
   * @remarks
   * Format: `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/serverfarms/{planName}`
   */
  public readonly resourceId: string;

  /**
   * App Service Plan resource ID (alias for resourceId).
   */
  public readonly planId: string;

  /**
   * Creates a new ArmAppServicePlan construct.
   *
   * @param scope - Parent construct (typically a ResourceGroup)
   * @param id - Unique identifier for this construct within the parent scope
   * @param props - App Service Plan properties
   *
   * @throws {Error} If planName is invalid
   * @throws {Error} If location is empty
   * @throws {Error} If SKU is not provided
   * @throws {Error} If capacity is invalid
   */
  constructor(scope: Construct, id: string, props: ArmAppServicePlanProps) {
    super(scope, id);

    // Validate required properties
    this.validateProps(props);

    // Set properties
    this.planName = props.planName;
    this.name = props.planName;
    this.location = props.location;
    this.sku = props.sku;
    this.kind = props.kind;
    this.reserved = props.reserved;
    this.zoneRedundant = props.zoneRedundant;
    this.tags = props.tags ?? {};

    // Construct resource ID
    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/serverfarms/${this.planName}`;
    this.planId = this.resourceId;
  }

  /**
   * Validates App Service Plan properties against ARM constraints.
   *
   * @param props - Properties to validate
   * @throws {Error} If validation fails
   */
  private validateProps(props: ArmAppServicePlanProps): void {
    // Validate plan name
    if (!props.planName || props.planName.trim() === '') {
      throw new Error('App Service Plan name cannot be empty');
    }

    if (props.planName.length < 1 || props.planName.length > 40) {
      throw new Error(
        `App Service Plan name must be 1-40 characters (got ${props.planName.length})`
      );
    }

    // Validate name pattern: ^[a-zA-Z0-9-]+$ (alphanumeric and hyphens)
    const namePattern = /^[a-zA-Z0-9-]+$/;
    if (!namePattern.test(props.planName)) {
      throw new Error(
        `App Service Plan name must contain only alphanumeric characters and hyphens (got: ${props.planName})`
      );
    }

    // Validate location
    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    // Validate SKU
    if (!props.sku || !props.sku.name || !props.sku.tier) {
      throw new Error('SKU with name and tier must be provided');
    }

    // Validate capacity if provided
    if (props.sku.capacity !== undefined) {
      if (props.sku.capacity < 1 || props.sku.capacity > 30) {
        throw new Error(
          `App Service Plan capacity must be between 1 and 30 (got ${props.sku.capacity})`
        );
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
  public toArmTemplate(): object {
    const properties: any = {};

    // Add reserved property
    if (this.reserved !== undefined) {
      properties.reserved = this.reserved;
    }

    // Add zone redundancy
    if (this.zoneRedundant !== undefined) {
      properties.zoneRedundant = this.zoneRedundant;
    }

    // Build SKU object
    const skuObj: any = {
      name: this.sku.name,
      tier: this.sku.tier,
    };

    if (this.sku.size) {
      skuObj.size = this.sku.size;
    }

    if (this.sku.family) {
      skuObj.family = this.sku.family;
    }

    if (this.sku.capacity) {
      skuObj.capacity = this.sku.capacity;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.planName,
      location: this.location,
      ...(this.kind && { kind: this.kind }),
      sku: skuObj,
      properties: Object.keys(properties).length > 0 ? properties : undefined,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    };
  }
}
