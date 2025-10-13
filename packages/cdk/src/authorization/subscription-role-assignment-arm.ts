/**
 * Subscription-level role assignment - L1 ARM construct.
 *
 * @packageDocumentation
 */

import { Resource, ArmResource, ResourceProps, Construct } from '@atakora/lib';
import { PrincipalType } from '@atakora/lib';

/**
 * ARM-level properties for subscription role assignments.
 *
 * @internal
 */
export interface SubscriptionRoleAssignmentArmProps extends ResourceProps {
  readonly scope: string;
  readonly roleDefinitionId: string;
  readonly principalId: string;
  readonly principalType: PrincipalType;
  readonly description?: string;
  readonly tenantId?: string;
  readonly condition?: string;
  readonly conditionVersion?: '2.0';
}

/**
 * L1 ARM construct for subscription-level role assignments.
 *
 * @remarks
 * This construct creates Microsoft.Authorization/roleAssignments resources
 * at subscription or resource group scope.
 *
 * **Deployment Scope**: Subscription
 *
 * **ARM Resource Type**: `Microsoft.Authorization/roleAssignments`
 * **API Version**: `2022-04-01`
 *
 * @internal
 */
export class SubscriptionRoleAssignmentArm extends Resource {
  public readonly resourceType = 'Microsoft.Authorization/roleAssignments';
  public readonly apiVersion = '2022-04-01';
  public readonly name: string;
  public readonly resourceId: string;

  private readonly props: SubscriptionRoleAssignmentArmProps;

  constructor(scope: Construct, id: string, props: SubscriptionRoleAssignmentArmProps) {
    super(scope, id, props);
    this.validateProps(props);
    this.props = props;

    // Generate deterministic GUID for idempotent deployments
    this.name = this.generateAssignmentGuid();

    // Construct resource ID at the scope level
    this.resourceId = `${props.scope}/providers/Microsoft.Authorization/roleAssignments/${this.name}`;
  }

  protected validateProps(props: SubscriptionRoleAssignmentArmProps): void {
    if (!props.scope) {
      throw new Error('Subscription role assignment requires a scope');
    }

    if (!props.roleDefinitionId) {
      throw new Error('Subscription role assignment requires a roleDefinitionId');
    }

    if (!props.principalId) {
      throw new Error('Subscription role assignment requires a principalId');
    }

    if (!props.principalType) {
      throw new Error('Subscription role assignment requires a principalType');
    }

    // Validate GUID format for principalId
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidPattern.test(props.principalId)) {
      throw new Error(
        `Invalid principalId format: ${props.principalId}. ` +
          'Subscription role assignments require a static GUID (Azure AD object ID), ' +
          'not an ARM reference expression.'
      );
    }

    if (props.description && props.description.length > 1024) {
      throw new Error(
        `Description cannot exceed 1024 characters (current: ${props.description.length})`
      );
    }

    if (props.condition && !props.conditionVersion) {
      throw new Error("conditionVersion is required when condition is specified (use '2.0')");
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: Record<string, unknown> = {
      roleDefinitionId: this.props.roleDefinitionId,
      principalId: this.props.principalId,
      principalType: this.props.principalType,
    };

    if (this.props.tenantId) {
      properties.tenantId = this.props.tenantId;
    }

    if (this.props.description) {
      properties.description = this.props.description;
    }

    if (this.props.condition) {
      properties.condition = this.props.condition;
      properties.conditionVersion = this.props.conditionVersion || '2.0';
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      properties,
    };
  }

  /**
   * Generates a deterministic GUID for the role assignment.
   *
   * @returns ARM expression that generates a GUID
   * @internal
   */
  private generateAssignmentGuid(): string {
    // Use ARM guid() function for deterministic GUID generation
    return `[guid('${this.props.scope}', '${this.props.roleDefinitionId}', '${this.props.principalId}')]`;
  }
}
