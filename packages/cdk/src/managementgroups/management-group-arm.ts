/**
 * Azure Management Group - L1 ARM construct.
 *
 * @packageDocumentation
 */

import { Resource, ArmResource, ResourceProps, Construct } from '@atakora/lib';

/**
 * ARM-level properties for management groups.
 *
 * @internal
 */
export interface ManagementGroupArmProps extends ResourceProps {
  readonly managementGroupName: string;
  readonly displayName: string;
  readonly parentId?: string;
  readonly description?: string;
}

/**
 * L1 ARM construct for Azure Management Groups.
 *
 * @remarks
 * Creates Microsoft.Management/managementGroups resources at tenant scope.
 *
 * **Deployment Scope**: Tenant (or ManagementGroup)
 *
 * **ARM Resource Type**: `Microsoft.Management/managementGroups`
 * **API Version**: `2021-04-01`
 *
 * @internal
 */
export class ManagementGroupArm extends Resource {
  public readonly resourceType = 'Microsoft.Management/managementGroups';
  public readonly apiVersion = '2021-04-01'; // Latest stable API
  public readonly name: string;
  public readonly resourceId: string;

  private readonly props: ManagementGroupArmProps;

  constructor(scope: Construct, id: string, props: ManagementGroupArmProps) {
    super(scope, id, props);
    this.validateProps(props);
    this.props = props;

    this.name = props.managementGroupName;

    // Management group resource ID
    this.resourceId = `/providers/Microsoft.Management/managementGroups/${this.name}`;
  }

  protected validateProps(props: ManagementGroupArmProps): void {
    if (!props.managementGroupName) {
      throw new Error('Management group requires a name');
    }

    // Validate name length (Azure limit)
    if (props.managementGroupName.length > 90) {
      throw new Error(
        `Management group name cannot exceed 90 characters (current: ${props.managementGroupName.length})`
      );
    }

    // Validate name pattern
    const namePattern = /^[a-zA-Z0-9_.()-]+$/;
    if (!namePattern.test(props.managementGroupName)) {
      throw new Error(
        'Management group name must contain only alphanumeric, hyphen, underscore, period, and parentheses characters'
      );
    }

    if (!props.displayName) {
      throw new Error('Management group requires a displayName');
    }

    // Validate display name length
    if (props.displayName.length > 256) {
      throw new Error(
        `Management group displayName cannot exceed 256 characters (current: ${props.displayName.length})`
      );
    }

    // Validate description length
    if (props.description && props.description.length > 1024) {
      throw new Error(
        `Management group description cannot exceed 1024 characters (current: ${props.description.length})`
      );
    }

    // Validate parent ID format if specified
    if (props.parentId) {
      const parentPattern = /^\/providers\/Microsoft\.Management\/managementGroups\/.+$/;
      if (!parentPattern.test(props.parentId)) {
        throw new Error(
          `Management group parentId must be in format "/providers/Microsoft.Management/managementGroups/{name}" (current: ${props.parentId})`
        );
      }
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: Record<string, unknown> = {
      displayName: this.props.displayName,
    };

    // Add details object with parent and description
    const details: Record<string, unknown> = {};

    if (this.props.parentId) {
      details.parent = {
        id: this.props.parentId,
      };
    }

    if (this.props.description) {
      // Description is NOT in properties, it's in a separate field at root level
      // This is Azure's API design
    }

    if (Object.keys(details).length > 0) {
      properties.details = details;
    }

    const resource: ArmResource = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      properties,
    };

    return resource;
  }
}
