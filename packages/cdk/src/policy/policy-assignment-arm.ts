/**
 * Azure Policy Assignment - L1 ARM construct.
 *
 * @packageDocumentation
 */

import { Resource, ArmResource, ResourceProps, Construct } from '@atakora/lib';
import { PolicyEnforcementMode, PolicyIdentityType } from './policy-assignment-types';

/**
 * ARM-level properties for policy assignments.
 *
 * @internal
 */
export interface PolicyAssignmentArmProps extends ResourceProps {
  readonly policyAssignmentName: string;
  readonly policyDefinitionId: string;
  readonly displayName: string;
  readonly description?: string;
  readonly metadata?: Record<string, any>;
  readonly parameters?: Record<string, { value: any }>;
  readonly enforcementMode?: PolicyEnforcementMode;
  readonly identity?: {
    type: PolicyIdentityType;
    userAssignedIdentities?: Record<string, any>;
  };
  readonly resourceSelectors?: Array<{
    name: string;
    selectors: Array<{
      kind: string;
      in?: string[];
      notIn?: string[];
    }>;
  }>;
  readonly notScopes?: string[];
  readonly overrides?: Array<{
    kind: string;
    value: string;
    selectors?: Array<{
      kind: string;
      in?: string[];
      notIn?: string[];
    }>;
  }>;
}

/**
 * L1 ARM construct for Azure Policy Assignments.
 *
 * @remarks
 * Creates Microsoft.Authorization/policyAssignments resources at subscription scope.
 *
 * **Deployment Scope**: Subscription
 *
 * **ARM Resource Type**: `Microsoft.Authorization/policyAssignments`
 * **API Version**: `2024-05-01`
 *
 * @internal
 */
export class PolicyAssignmentArm extends Resource {
  public readonly resourceType = 'Microsoft.Authorization/policyAssignments';
  public readonly apiVersion = '2024-05-01'; // Latest stable API
  public readonly name: string;
  public readonly resourceId: string;

  private readonly props: PolicyAssignmentArmProps;

  constructor(scope: Construct, id: string, props: PolicyAssignmentArmProps) {
    super(scope, id, props);
    this.validateProps(props);
    this.props = props;

    this.name = props.policyAssignmentName;

    // Policy assignments are subscription-scoped
    this.resourceId = `[concat(subscription().id, '/providers/Microsoft.Authorization/policyAssignments/', '${this.name}')]`;
  }

  protected validateProps(props: PolicyAssignmentArmProps): void {
    if (!props.policyAssignmentName) {
      throw new Error('Policy assignment requires a name');
    }

    if (!props.policyDefinitionId) {
      throw new Error('Policy assignment requires a policyDefinitionId');
    }

    if (!props.displayName) {
      throw new Error('Policy assignment requires a displayName');
    }

    // Validate name length (Azure limit)
    if (props.policyAssignmentName.length > 64) {
      throw new Error(
        `Policy assignment name cannot exceed 64 characters (current: ${props.policyAssignmentName.length})`
      );
    }

    // Validate display name length
    if (props.displayName.length > 128) {
      throw new Error(
        `Policy assignment displayName cannot exceed 128 characters (current: ${props.displayName.length})`
      );
    }

    // Validate description length
    if (props.description && props.description.length > 512) {
      throw new Error(
        `Policy assignment description cannot exceed 512 characters (current: ${props.description.length})`
      );
    }

    // Validate identity requirement for DeployIfNotExists/Modify
    // Note: We can't check the policy effect here without fetching the policy definition,
    // so we just validate the identity structure if provided
    if (props.identity) {
      if (
        props.identity.type === PolicyIdentityType.USER_ASSIGNED &&
        !props.identity.userAssignedIdentities
      ) {
        throw new Error(
          'UserAssigned identity type requires userAssignedIdentities to be specified'
        );
      }
    }
  }

  public toArmTemplate(): ArmResource {
    const properties: Record<string, unknown> = {
      policyDefinitionId: this.props.policyDefinitionId,
      displayName: this.props.displayName,
    };

    // Add optional properties
    if (this.props.description) {
      properties.description = this.props.description;
    }

    if (this.props.metadata) {
      properties.metadata = this.props.metadata;
    }

    if (this.props.parameters) {
      properties.parameters = this.props.parameters;
    }

    if (this.props.enforcementMode) {
      properties.enforcementMode = this.props.enforcementMode;
    }

    if (this.props.resourceSelectors) {
      properties.resourceSelectors = this.props.resourceSelectors;
    }

    if (this.props.notScopes) {
      properties.notScopes = this.props.notScopes;
    }

    if (this.props.overrides) {
      properties.overrides = this.props.overrides;
    }

    const resource: ArmResource = {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      properties,
    };

    // Add identity if specified
    if (this.props.identity && this.props.identity.type !== PolicyIdentityType.NONE) {
      (resource as any).identity = {
        type: this.props.identity.type,
      };

      if (this.props.identity.userAssignedIdentities) {
        (resource as any).identity.userAssignedIdentities = this.props.identity.userAssignedIdentities;
      }
    }

    return resource;
  }
}
