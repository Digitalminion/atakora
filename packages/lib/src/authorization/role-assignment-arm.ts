/**
 * Azure RBAC - RoleAssignment L1 construct.
 *
 * @remarks
 * This module provides the L1 (ARM template layer) construct for Azure role assignments.
 * It maps directly to the Microsoft.Authorization/roleAssignments ARM resource type.
 *
 * @packageDocumentation
 */

import { Resource, ArmResource, ResourceProps } from '../core/resource';
import { Construct } from '../core/construct';
import { PrincipalType } from '../core/grants';
import { ValidationError } from '../core/validation';

/**
 * Properties for creating a role assignment (L1 construct).
 *
 * @remarks
 * Provides direct mapping to Azure ARM role assignment properties.
 * This is the low-level construct that maps 1:1 with ARM template format.
 *
 * @public
 */
export interface RoleAssignmentArmProps extends ResourceProps {
  /**
   * The scope where the role is assigned.
   *
   * @remarks
   * Can be:
   * - Management group: `/providers/Microsoft.Management/managementGroups/{id}`
   * - Subscription: `/subscriptions/{id}`
   * - Resource group: `/subscriptions/{id}/resourceGroups/{name}`
   * - Resource: Full resource ID
   *
   * @example
   * ```typescript
   * // Resource-level scope
   * scope: storageAccount.resourceId
   *
   * // Subscription-level scope
   * scope: '/subscriptions/12345678-1234-1234-1234-123456789abc'
   * ```
   */
  readonly scope: string;

  /**
   * Azure role definition ID.
   *
   * @remarks
   * Full resource ID of the role definition.
   * Format: `/subscriptions/{id}/providers/Microsoft.Authorization/roleDefinitions/{guid}`
   *
   * Use WellKnownRoleIds for built-in roles or provide custom role definition ID.
   *
   * @example
   * ```typescript
   * // Using WellKnownRoleIds
   * roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER
   *
   * // Custom role
   * roleDefinitionId: '/subscriptions/.../providers/Microsoft.Authorization/roleDefinitions/custom-role-guid'
   * ```
   */
  readonly roleDefinitionId: string;

  /**
   * Principal ID to assign the role to.
   *
   * @remarks
   * The object ID (GUID) of the identity in Azure AD.
   * - For managed identities: Use ARM reference expression
   * - For users/groups/service principals: Use their Azure AD object ID
   *
   * @example
   * ```typescript
   * // Dynamic reference to managed identity
   * principalId: `[reference(${vm.resourceId}).identity.principalId]`
   *
   * // Static principal ID
   * principalId: '12345678-1234-1234-1234-123456789abc'
   * ```
   */
  readonly principalId: string;

  /**
   * Type of the principal.
   *
   * @remarks
   * Determines how Azure interprets the principal ID.
   * Must match the actual type of the identity.
   *
   * @see {@link PrincipalType}
   */
  readonly principalType: PrincipalType;

  /**
   * Tenant ID for cross-tenant scenarios.
   *
   * @remarks
   * Required when assigning roles to identities from a different Azure AD tenant.
   * Defaults to the current deployment tenant if not specified.
   */
  readonly tenantId?: string;

  /**
   * Optional description for the assignment.
   *
   * @remarks
   * Helps document why the permission was granted.
   * Maximum length: 1024 characters.
   *
   * @example
   * ```typescript
   * description: 'VM needs read access to storage for application configs'
   * ```
   */
  readonly description?: string;

  /**
   * Optional ABAC condition that must be met for the role to be effective.
   *
   * @remarks
   * Azure ABAC (Attribute-Based Access Control) conditions allow fine-grained
   * access control based on resource attributes.
   *
   * **Important**: Not all roles support conditions. Only data plane roles support ABAC.
   *
   * @see {@link https://docs.microsoft.com/en-us/azure/role-based-access-control/conditions-format}
   *
   * @example
   * ```typescript
   * condition: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'logs'`
   * ```
   */
  readonly condition?: string;

  /**
   * Version of the condition syntax.
   *
   * @remarks
   * Currently only '2.0' is supported by Azure.
   * Required when condition is specified.
   *
   * @defaultValue '2.0'
   */
  readonly conditionVersion?: '2.0';

  /**
   * Whether to skip validation of the principal.
   *
   * @remarks
   * Set to true to allow role assignments to principals that don't exist yet
   * or that are not visible during validation.
   *
   * Use with caution - this bypasses Azure's principal existence check.
   *
   * @defaultValue false
   */
  readonly skipPrincipalValidation?: boolean;
}

/**
 * L1 construct for Azure role assignments.
 *
 * @remarks
 * Creates a Microsoft.Authorization/roleAssignments resource in the ARM template.
 * This is the low-level construct that provides direct ARM template mapping.
 *
 * **Key Features**:
 * - Deterministic GUID generation for idempotent deployments
 * - Direct ARM template property mapping
 * - Support for ABAC conditions
 * - Cross-tenant role assignment support
 *
 * **Usage Pattern**:
 * Use the L2 RoleAssignment construct for most scenarios. Use this L1 construct
 * when you need direct control over ARM template generation.
 *
 * @public
 *
 * @example
 * Basic role assignment:
 * ```typescript
 * const roleAssignment = new RoleAssignmentArm(stack, 'StorageReaderRole', {
 *   scope: storageAccount.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
 *   principalId: vm.principalId,
 *   principalType: PrincipalType.ManagedIdentity,
 *   description: 'VM needs read access to storage'
 * });
 * ```
 *
 * @example
 * With ABAC condition:
 * ```typescript
 * const roleAssignment = new RoleAssignmentArm(stack, 'ConditionalAccess', {
 *   scope: storageAccount.resourceId,
 *   roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR,
 *   principalId: app.principalId,
 *   principalType: PrincipalType.ManagedIdentity,
 *   condition: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'data'`,
 *   conditionVersion: '2.0'
 * });
 * ```
 */
export class RoleAssignmentArm extends Resource {
  public readonly resourceType = 'Microsoft.Authorization/roleAssignments';
  public readonly apiVersion = '2022-04-01';
  public readonly name: string;
  public readonly resourceId: string;

  private readonly props: RoleAssignmentArmProps;

  /**
   * Creates a new RoleAssignmentArm instance.
   *
   * @param scope - Parent construct
   * @param id - Unique construct ID
   * @param props - Role assignment properties
   */
  constructor(scope: Construct, id: string, props: RoleAssignmentArmProps) {
    super(scope, id, props);
    this.validateProps(props);
    this.props = props;

    // Generate deterministic GUID for idempotency
    this.name = this.generateAssignmentGuid();

    // Construct resource ID
    // Role assignments are deployed at the scope level
    this.resourceId = `${props.scope}/providers/Microsoft.Authorization/roleAssignments/${this.name}`;
  }

  /**
   * Validates role assignment properties.
   *
   * @param props - Properties to validate
   * @throws {ValidationError} If validation fails
   *
   * @internal
   */
  protected validateProps(props: RoleAssignmentArmProps): void {
    if (!props.scope || props.scope.trim() === '') {
      throw new ValidationError(
        'Role assignment requires a scope',
        'The scope property specifies where the role is assigned',
        'Provide a valid Azure resource ID for the scope'
      );
    }

    if (!props.roleDefinitionId || props.roleDefinitionId.trim() === '') {
      throw new ValidationError(
        'Role assignment requires a roleDefinitionId',
        'The roleDefinitionId identifies which role to assign',
        'Provide a valid role definition ID (use WellKnownRoleIds for built-in roles)'
      );
    }

    if (!props.principalId || props.principalId.trim() === '') {
      throw new ValidationError(
        'Role assignment requires a principalId',
        'The principalId identifies who receives the role',
        'Provide a valid principal ID (Azure AD object ID or ARM reference)'
      );
    }

    if (!props.principalType) {
      throw new ValidationError(
        'Role assignment requires a principalType',
        'The principalType indicates what kind of identity is receiving the role',
        'Provide a valid PrincipalType (e.g., PrincipalType.ManagedIdentity)'
      );
    }

    if (props.description && props.description.length > 1024) {
      throw new ValidationError(
        'Role assignment description cannot exceed 1024 characters',
        `Current description length: ${props.description.length} characters`,
        'Shorten the description to 1024 characters or less'
      );
    }

    if (props.condition && !props.conditionVersion) {
      throw new ValidationError(
        'conditionVersion is required when condition is specified',
        'ABAC conditions require a version to be specified',
        "Set conditionVersion to '2.0'"
      );
    }

    if (props.principalType === PrincipalType.ForeignGroup && !props.tenantId) {
      throw new ValidationError(
        'tenantId is required for ForeignGroup principal type',
        'Cross-tenant group assignments require the tenant ID',
        'Provide the tenant ID where the foreign group exists'
      );
    }
  }

  /**
   * Transforms this role assignment to ARM template format.
   *
   * @returns ARM template resource object
   *
   * @example
   * Generated ARM template:
   * ```json
   * {
   *   "type": "Microsoft.Authorization/roleAssignments",
   *   "apiVersion": "2022-04-01",
   *   "scope": "/subscriptions/.../resourceGroups/.../providers/Microsoft.Storage/storageAccounts/myaccount",
   *   "name": "[guid('...', '...', '...')]",
   *   "properties": {
   *     "roleDefinitionId": "/subscriptions/.../providers/Microsoft.Authorization/roleDefinitions/...",
   *     "principalId": "[reference(...).identity.principalId]",
   *     "principalType": "ServicePrincipal",
   *     "description": "..."
   *   }
   * }
   * ```
   */
  public toArmTemplate(): ArmResource {
    const properties: Record<string, unknown> = {
      roleDefinitionId: this.props.roleDefinitionId,
      principalId: this.props.principalId,
      principalType: this.props.principalType,
    };

    // Add optional properties
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

    if (this.props.skipPrincipalValidation) {
      properties.delegatedManagedIdentityResourceId = null;
    }

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      // Role assignments are deployed at scope, so we use the 'scope' property
      // instead of inheriting location
      properties,
    };
  }

  /**
   * Generates a deterministic GUID for the role assignment.
   *
   * @remarks
   * Using a deterministic GUID based on scope, role, and principal
   * ensures idempotent deployments. The same combination will always
   * generate the same GUID, preventing duplicate role assignments.
   *
   * **ARM guid() Function**:
   * The guid() function in ARM templates creates a deterministic GUID
   * from the input strings. We construct an ARM expression that will be
   * evaluated during deployment.
   *
   * **Important**: The guid() function can only use expressions that are
   * available at template compilation time. The reference() function is
   * only available in the properties section, so we extract the resourceId
   * from principalId if it contains a reference() call.
   *
   * @returns ARM expression that generates a GUID
   *
   * @internal
   *
   * @example
   * ```typescript
   * // Returns: "[guid('/subscriptions/.../storageAccounts/myaccount', 'role-id', 'principal-id')]"
   * ```
   */
  private generateAssignmentGuid(): string {
    // Helper to format parameter for guid() - strips outer brackets if present
    const formatParam = (param: string): string => {
      if (param.startsWith('[') && param.endsWith(']')) {
        // ARM expression - strip brackets and use directly (already inside outer guid expression)
        return param.slice(1, -1);
      }
      // Literal string - wrap in quotes
      return `'${param}'`;
    };

    // Extract a stable identifier for the principal
    // If principalId contains reference(), extract the resourceId for guid calculation
    let principalIdentifier = this.props.principalId;

    // Check if principalId contains a reference() call
    // Pattern: [reference(resourceId(...)).identity.principalId]
    const referenceMatch = principalIdentifier.match(/\[?reference\((.*?)\)\.identity\.principalId\]?/);
    if (referenceMatch) {
      // Extract the resourceId expression from inside reference()
      // Use the resourceId as the stable identifier instead
      principalIdentifier = `[${referenceMatch[1]}]`;
    }

    // Use ARM guid() function for deterministic GUID generation
    // The function combines scope, role, and principal to create a unique but deterministic GUID
    return `[guid(${formatParam(this.props.scope)}, ${formatParam(this.props.roleDefinitionId)}, ${formatParam(principalIdentifier)})]`;
  }
}
