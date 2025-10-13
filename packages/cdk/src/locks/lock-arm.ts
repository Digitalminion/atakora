/**
 * Azure Resource Lock - L1 ARM construct.
 *
 * @packageDocumentation
 */

import { Resource, ArmResource, ResourceProps, Construct, schema } from '@atakora/lib';
import { LockLevel } from './lock-types';

/**
 * Scope type for lock deployment.
 *
 * @internal
 */
export const LockScope = schema.resources.LockScope;
export type LockScope = typeof LockScope[keyof typeof LockScope];

/**
 * ARM-level properties for resource locks.
 *
 * @internal
 */
export interface ResourceLockArmProps extends ResourceProps {
  readonly lockName: string;
  readonly level: LockLevel;
  readonly notes?: string;
  readonly scope: LockScope;
}

/**
 * L1 ARM construct for Azure Resource Locks.
 *
 * @remarks
 * Creates Microsoft.Authorization/locks resources at subscription or resource group scope.
 *
 * **Deployment Scope**: Subscription or ResourceGroup
 *
 * **ARM Resource Type**: `Microsoft.Authorization/locks`
 * **API Version**: `2020-05-01`
 *
 * @internal
 */
export class ResourceLockArm extends Resource {
  public readonly resourceType = 'Microsoft.Authorization/locks';
  public readonly apiVersion = '2020-05-01'; // Latest stable API
  public readonly name: string;
  public readonly resourceId: string;

  private readonly props: ResourceLockArmProps;

  constructor(scope: Construct, id: string, props: ResourceLockArmProps) {
    super(scope, id, props);
    this.validateProps(props);
    this.props = props;

    this.name = props.lockName;

    // Generate resource ID based on scope
    if (props.scope === LockScope.SUBSCRIPTION) {
      this.resourceId = `[concat(subscription().id, '/providers/Microsoft.Authorization/locks/', '${this.name}')]`;
    } else {
      this.resourceId = `[concat(resourceGroup().id, '/providers/Microsoft.Authorization/locks/', '${this.name}')]`;
    }
  }

  protected validateProps(props: ResourceLockArmProps): void {
    if (!props.lockName) {
      throw new Error('Resource lock requires a name');
    }

    // Validate name length (Azure limit)
    if (props.lockName.length > 260) {
      throw new Error(
        `Resource lock name cannot exceed 260 characters (current: ${props.lockName.length})`
      );
    }

    // Validate lock name pattern
    // Lock names can contain alphanumeric, underscore, hyphen, and period
    const namePattern = /^[a-zA-Z0-9_.-]+$/;
    if (!namePattern.test(props.lockName)) {
      throw new Error(
        'Resource lock name must contain only alphanumeric, underscore, hyphen, and period characters'
      );
    }

    if (!props.level) {
      throw new Error('Resource lock requires a level');
    }

    // Validate notes length
    if (props.notes && props.notes.length > 512) {
      throw new Error(
        `Resource lock notes cannot exceed 512 characters (current: ${props.notes.length})`
      );
    }

    if (!props.scope) {
      throw new Error('Resource lock requires a scope');
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: Record<string, unknown> = {
      level: this.props.level,
    };

    // Add notes if specified
    if (this.props.notes) {
      properties.notes = this.props.notes;
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
