# Azure RBAC Grant Pattern - API Design

## Overview

This document provides the complete API design for Atakora's Azure RBAC grant pattern, including all TypeScript interfaces, implementation details, and usage examples.

## Core Interfaces

### IGrantable Interface

```typescript
/**
 * Represents an Azure identity that can be granted permissions.
 *
 * @remarks
 * This is the core interface for the grant system. Any construct that has
 * or represents an Azure identity should implement this interface to
 * participate in the grant pattern.
 *
 * The interface is designed to work with:
 * - System-assigned managed identities
 * - User-assigned managed identities
 * - Service principals
 * - Users and groups
 * - Cross-tenant identities
 *
 * @public
 */
export interface IGrantable {
  /**
   * The principal ID (object ID) of the identity.
   *
   * @remarks
   * For managed identities, this is typically resolved at deployment time
   * using ARM template references like:
   * ```json
   * "[reference(resourceId('Microsoft.Web/sites', 'myapp')).identity.principalId]"
   * ```
   *
   * The value can be:
   * - A literal GUID string for existing identities
   * - An IResolvable token for deployment-time resolution
   * - An ARM expression for referencing other resources
   */
  readonly principalId: string | IResolvable;

  /**
   * Type of principal for role assignment.
   *
   * @remarks
   * Azure requires knowing the principal type for role assignments.
   * Managed identities use 'ServicePrincipal' as their type.
   */
  readonly principalType: PrincipalType;

  /**
   * Optional tenant ID for cross-tenant scenarios.
   *
   * @remarks
   * Only required when granting permissions to identities from a different
   * Azure AD tenant. Defaults to the current tenant if not specified.
   */
  readonly tenantId?: string;
}

/**
 * Azure principal types for role assignments.
 *
 * @remarks
 * These values map directly to Azure's role assignment principalType field.
 *
 * @public
 */
export enum PrincipalType {
  /** Azure AD user */
  User = 'User',

  /** Azure AD group */
  Group = 'Group',

  /** Service principal (includes managed identities) */
  ServicePrincipal = 'ServicePrincipal',

  /** Managed identity (alias for ServicePrincipal) */
  ManagedIdentity = 'ServicePrincipal',

  /** Group from external Azure AD tenant */
  ForeignGroup = 'ForeignGroup',

  /** Azure AD device */
  Device = 'Device'
}
```

### IResolvable Interface

```typescript
/**
 * Represents a value that will be resolved during ARM template synthesis.
 *
 * @remarks
 * Used for values that aren't known until deployment time, such as
 * managed identity principal IDs or resource IDs from other stacks.
 *
 * @public
 */
export interface IResolvable {
  /**
   * Resolves to the actual value during synthesis.
   */
  resolve(context: IResolveContext): any;

  /**
   * String representation for debugging.
   */
  toString(): string;
}
```

### Grant Result Interface

```typescript
/**
 * Result of a grant operation.
 *
 * @remarks
 * Returned by all grant methods to provide access to the created
 * role assignment for further configuration or dependency management.
 *
 * @public
 */
export interface IGrantResult {
  /**
   * The role assignment created by the grant.
   */
  readonly roleAssignment: RoleAssignment;

  /**
   * The role that was granted.
   */
  readonly roleDefinitionId: string;

  /**
   * The identity that was granted access.
   */
  readonly grantee: IGrantable;

  /**
   * The scope where access was granted.
   */
  readonly scope: string | IResolvable;

  /**
   * Adds a description to the role assignment.
   */
  addDescription(description: string): void;

  /**
   * Adds an Azure RBAC condition to the assignment.
   */
  addCondition(condition: string, version?: '2.0'): void;
}
```

## Base Classes

### GrantableResource

```typescript
/**
 * Base class for Azure resources that can grant permissions.
 *
 * @remarks
 * Extends the base Resource class to add grant capabilities and
 * optionally act as an IGrantable if the resource has a managed identity.
 *
 * @public
 */
export abstract class GrantableResource extends Resource implements IGrantable {
  /**
   * Managed identity configuration for this resource.
   * @internal
   */
  protected identity?: ManagedServiceIdentity;

  /**
   * Counter for generating unique grant IDs.
   * @internal
   */
  private grantCounter = 0;

  /**
   * Gets the principal ID for this resource's managed identity.
   *
   * @remarks
   * Returns an ARM reference that will be resolved at deployment time.
   * Throws if the resource doesn't have a managed identity configured.
   *
   * @throws {Error} If resource has no managed identity
   */
  public get principalId(): string | IResolvable {
    if (!this.identity || this.identity.type === ManagedIdentityType.NONE) {
      throw new Error(
        `Resource '${this.node.id}' does not have a managed identity. ` +
        `Enable a managed identity to use this resource as a grantable.`
      );
    }

    // For system-assigned identity, reference the principalId property
    if (this.identity.type === ManagedIdentityType.SYSTEM_ASSIGNED ||
        this.identity.type === ManagedIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED) {
      return new ArmReference(this.resourceId, 'identity.principalId');
    }

    // For user-assigned only, this resource cannot act as a grantable
    throw new Error(
      `Resource '${this.node.id}' has only user-assigned identity. ` +
      `It cannot be used as a grantable. Use the user-assigned identity directly.`
    );
  }

  /**
   * Principal type for managed identities.
   */
  public readonly principalType = PrincipalType.ManagedIdentity;

  /**
   * Tenant ID (undefined for same-tenant).
   */
  public readonly tenantId?: string;

  /**
   * Core grant method used by all specific grant methods.
   *
   * @param grantable - Identity to grant permissions to
   * @param roleDefinitionId - Azure role definition resource ID
   * @param description - Optional description for the assignment
   * @returns Grant result with the created role assignment
   *
   * @internal
   */
  protected grant(
    grantable: IGrantable,
    roleDefinitionId: string,
    description?: string
  ): IGrantResult {
    // Auto-enable identity if granting to self
    if (grantable === this) {
      this.ensureIdentity();
    }

    const roleAssignment = new RoleAssignment(this, `Grant${this.generateGrantId()}`, {
      scope: this.resourceId,
      roleDefinitionId,
      principalId: grantable.principalId,
      principalType: grantable.principalType,
      tenantId: grantable.tenantId,
      description
    });

    return new GrantResult(roleAssignment, roleDefinitionId, grantable, this.resourceId);
  }

  /**
   * Generates a unique ID for each grant.
   * @internal
   */
  private generateGrantId(): string {
    return `${this.grantCounter++}`;
  }

  /**
   * Ensures this resource has a managed identity.
   *
   * @remarks
   * Automatically called when the resource is used as a grantee.
   * Enables system-assigned identity if no identity is configured.
   *
   * @internal
   */
  protected ensureIdentity(): void {
    if (!this.identity || this.identity.type === ManagedIdentityType.NONE) {
      this.identity = {
        type: ManagedIdentityType.SYSTEM_ASSIGNED
      };

      // Log for transparency
      this.node.addMetadata('AutoEnabledIdentity',
        'System-assigned identity was automatically enabled due to grant usage');
    }
  }
}
```

## Role Assignment Construct

```typescript
/**
 * Properties for creating a role assignment.
 *
 * @public
 */
export interface RoleAssignmentProps {
  /**
   * The scope where the role is assigned.
   *
   * @remarks
   * Can be:
   * - Management group: `/providers/Microsoft.Management/managementGroups/{id}`
   * - Subscription: `/subscriptions/{id}`
   * - Resource group: `/subscriptions/{id}/resourceGroups/{name}`
   * - Resource: Full resource ID
   */
  readonly scope: string | IResolvable;

  /**
   * Azure role definition ID.
   *
   * @remarks
   * Full resource ID of the role definition.
   * Format: `/subscriptions/{id}/providers/Microsoft.Authorization/roleDefinitions/{guid}`
   *
   * Use WellKnownRoleIds for built-in roles.
   */
  readonly roleDefinitionId: string;

  /**
   * Principal ID to assign the role to.
   *
   * @remarks
   * The Azure AD object ID of the user, group, service principal,
   * or managed identity.
   */
  readonly principalId: string | IResolvable;

  /**
   * Type of the principal.
   */
  readonly principalType: PrincipalType;

  /**
   * Tenant ID for cross-tenant scenarios.
   *
   * @remarks
   * Only required when the principal is from a different Azure AD tenant.
   */
  readonly tenantId?: string;

  /**
   * Optional description for the assignment.
   *
   * @remarks
   * Helpful for auditing and understanding the purpose of the assignment.
   * Maximum 1024 characters.
   */
  readonly description?: string;

  /**
   * Optional condition that must be met for the role to be effective.
   *
   * @remarks
   * Azure RBAC conditions use a specific expression language.
   * Example: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'public'`
   */
  readonly condition?: string;

  /**
   * Version of the condition syntax.
   *
   * @remarks
   * Currently only '2.0' is supported for conditions.
   * Required if condition is specified.
   */
  readonly conditionVersion?: '2.0';

  /**
   * Whether to skip validation of the principal.
   *
   * @remarks
   * Set to true when creating role assignments for principals that
   * don't exist yet (will be created by the same deployment).
   */
  readonly skipPrincipalValidation?: boolean;
}

/**
 * L1 construct for Azure role assignments.
 *
 * @remarks
 * Creates a Microsoft.Authorization/roleAssignments resource in the
 * ARM template. Role assignments grant access to Azure resources.
 *
 * @public
 */
export class RoleAssignment extends Resource {
  public readonly resourceType = 'Microsoft.Authorization/roleAssignments';
  public readonly apiVersion = '2022-04-01';
  public readonly name: string;
  public readonly resourceId: string;

  private readonly props: RoleAssignmentProps;

  constructor(scope: Construct, id: string, props: RoleAssignmentProps) {
    super(scope, id);
    this.validateProps(props);
    this.props = props;

    // Generate deterministic GUID for idempotency
    this.name = this.generateAssignmentGuid();

    // Construct resource ID
    this.resourceId = `${props.scope}/providers/Microsoft.Authorization/roleAssignments/${this.name}`;
  }

  protected validateProps(props: RoleAssignmentProps): void {
    if (!props.scope) {
      throw new ValidationError('Role assignment requires a scope');
    }

    if (!props.roleDefinitionId) {
      throw new ValidationError('Role assignment requires a roleDefinitionId');
    }

    if (!props.principalId) {
      throw new ValidationError('Role assignment requires a principalId');
    }

    if (!props.principalType) {
      throw new ValidationError('Role assignment requires a principalType');
    }

    if (props.description && props.description.length > 1024) {
      throw new ValidationError('Role assignment description cannot exceed 1024 characters');
    }

    if (props.condition && !props.conditionVersion) {
      throw new ValidationError('conditionVersion is required when condition is specified');
    }
  }

  public toArmTemplate(): ArmResource {
    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      scope: this.resolveValue(this.props.scope),
      name: this.name,
      properties: {
        roleDefinitionId: this.props.roleDefinitionId,
        principalId: this.resolveValue(this.props.principalId),
        principalType: this.props.principalType,
        ...(this.props.description && { description: this.props.description }),
        ...(this.props.condition && {
          condition: this.props.condition,
          conditionVersion: this.props.conditionVersion
        })
      }
    };
  }

  /**
   * Generates a deterministic GUID for the role assignment.
   *
   * @remarks
   * Using a deterministic GUID based on scope, role, and principal
   * ensures idempotent deployments. Azure will not create duplicate
   * assignments with the same GUID.
   */
  private generateAssignmentGuid(): string {
    const scope = this.resolveValue(this.props.scope);
    const principal = this.resolveValue(this.props.principalId);
    const role = this.props.roleDefinitionId;

    // Use ARM guid() function for deterministic GUID generation
    return `[guid('${scope}', '${role}', '${principal}')]`;
  }

  /**
   * Resolves a value that might be an IResolvable.
   */
  private resolveValue(value: string | IResolvable): string {
    if (typeof value === 'string') {
      return value;
    }
    // Will be resolved during synthesis
    return Token.asString(value);
  }
}
```

## Well-Known Roles Registry

```typescript
/**
 * Registry of Azure built-in role definition IDs.
 *
 * @remarks
 * Provides strongly-typed access to Azure's built-in roles.
 * Role GUIDs are consistent across all Azure environments,
 * including Azure Government and Azure China.
 *
 * @public
 */
export class WellKnownRoleIds {
  // ============================================================
  // General Management Roles
  // ============================================================

  /** Read access to all resources */
  public static readonly READER = this.roleId('acdd72a7-3385-48ef-bd42-f606fba81ae7');

  /** Create and manage all resources */
  public static readonly CONTRIBUTOR = this.roleId('b24988ac-6180-42a0-ab88-20f7382dd24c');

  /** Full access including ability to assign roles */
  public static readonly OWNER = this.roleId('8e3af657-a8ff-443c-a75c-2fe8c4bcb635');

  /** Manage user access to Azure resources */
  public static readonly USER_ACCESS_ADMINISTRATOR = this.roleId('18d7d88d-d35e-4fb5-a5c3-7773c20a72d9');

  // ============================================================
  // Storage Account Roles
  // ============================================================

  /** Read data from blobs */
  public static readonly STORAGE_BLOB_DATA_READER = this.roleId('2a2b9908-6ea1-4ae2-8e65-a410df84e7d1');

  /** Read and write blob data */
  public static readonly STORAGE_BLOB_DATA_CONTRIBUTOR = this.roleId('ba92f5b4-2d11-453d-a403-e96b0029c9fe');

  /** Full access to blob data including POSIX ACLs */
  public static readonly STORAGE_BLOB_DATA_OWNER = this.roleId('b7e6dc6d-f1e8-4753-8033-0f276bb0955b');

  /** Read messages and metadata from queues */
  public static readonly STORAGE_QUEUE_DATA_READER = this.roleId('19e7f393-937e-4f77-808e-94535e297925');

  /** Process queue messages */
  public static readonly STORAGE_QUEUE_DATA_CONTRIBUTOR = this.roleId('974c5e8b-45b9-4653-ba55-5f855dd0fb88');

  /** Send queue messages */
  public static readonly STORAGE_QUEUE_DATA_MESSAGE_SENDER = this.roleId('c6a89b2d-59bc-44d0-9896-0f6e12d7b80a');

  /** Process queue messages (read and delete) */
  public static readonly STORAGE_QUEUE_DATA_MESSAGE_PROCESSOR = this.roleId('8a0f0c08-91a1-4084-bc3d-661d67233fed');

  /** Read table data */
  public static readonly STORAGE_TABLE_DATA_READER = this.roleId('76199698-9eea-4c19-bc75-cec21354c6b6');

  /** Read and write table data */
  public static readonly STORAGE_TABLE_DATA_CONTRIBUTOR = this.roleId('0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3');

  /** Read file share data */
  public static readonly STORAGE_FILE_DATA_SMB_SHARE_READER = this.roleId('aba4ae5f-2193-4029-9191-0cb91df5e314');

  /** Read and write file share data */
  public static readonly STORAGE_FILE_DATA_SMB_SHARE_CONTRIBUTOR = this.roleId('0c867c2a-1d8c-454a-a3db-ab2ea1bdc8bb');

  /** Full control of file share data */
  public static readonly STORAGE_FILE_DATA_SMB_SHARE_ELEVATED_CONTRIBUTOR = this.roleId('a7264617-510b-434b-a828-9731dc254ea7');

  // ============================================================
  // Cosmos DB Roles
  // ============================================================

  /** Read Cosmos DB account metadata */
  public static readonly COSMOS_DB_ACCOUNT_READER = this.roleId('fbdf93bf-df7d-467e-a4d2-9458aa1360c8');

  /** Manage Cosmos DB accounts but not access data */
  public static readonly COSMOS_DB_OPERATOR = this.roleId('230815da-be43-4aae-9cb4-875f7bd000aa');

  /** Read Cosmos DB data (SQL API) */
  public static readonly COSMOS_DB_DATA_READER = this.roleId('00000000-0000-0000-0000-000000000001');

  /** Read and write Cosmos DB data (SQL API) */
  public static readonly COSMOS_DB_DATA_CONTRIBUTOR = this.roleId('00000000-0000-0000-0000-000000000002');

  // ============================================================
  // Key Vault Roles
  // ============================================================

  /** Read secrets from Key Vault */
  public static readonly KEY_VAULT_SECRETS_USER = this.roleId('4633458b-17de-408a-b874-0445c86b69e6');

  /** Manage secrets in Key Vault */
  public static readonly KEY_VAULT_SECRETS_OFFICER = this.roleId('b86a8fe4-44ce-4948-aee5-eccb2c155cd7');

  /** Use cryptographic keys for operations */
  public static readonly KEY_VAULT_CRYPTO_USER = this.roleId('12338af0-0e69-4776-bea7-57ae8d297424');

  /** Manage cryptographic keys */
  public static readonly KEY_VAULT_CRYPTO_OFFICER = this.roleId('14b46e9e-c2b7-41b4-b07b-48a6ebf60603');

  /** Read certificates */
  public static readonly KEY_VAULT_CERTIFICATES_USER = this.roleId('db79e9a7-68ee-4b58-9aeb-b90e7c24fcba');

  /** Manage certificates */
  public static readonly KEY_VAULT_CERTIFICATES_OFFICER = this.roleId('a4417e6f-fecd-4de8-b567-7b0420556985');

  /** Read all Key Vault data */
  public static readonly KEY_VAULT_READER = this.roleId('21090545-7ca7-4776-b22c-e363652d74d2');

  /** Full access to Key Vault data */
  public static readonly KEY_VAULT_ADMINISTRATOR = this.roleId('00482a5a-887f-4fb3-b363-3b7fe8e74483');

  // ============================================================
  // App Service / Function Apps
  // ============================================================

  /** Deploy and manage web apps */
  public static readonly WEBSITE_CONTRIBUTOR = this.roleId('de139f84-1756-47ae-9be6-808fbbe84772');

  /** Manage web app slots */
  public static readonly WEB_PLAN_CONTRIBUTOR = this.roleId('2cc479cb-7b4d-49a8-b449-8c00fd0f0a4b');

  // ============================================================
  // SQL Database Roles
  // ============================================================

  /** Read SQL database data */
  public static readonly SQL_DB_CONTRIBUTOR = this.roleId('9b7fa17d-e63e-47b0-bb0a-15c516ac86ec');

  /** Manage SQL database security */
  public static readonly SQL_SECURITY_MANAGER = this.roleId('056cd41c-7e88-42e1-933e-88ba6a50c9c3');

  /** Manage SQL servers */
  public static readonly SQL_SERVER_CONTRIBUTOR = this.roleId('6d8ee4ec-f05a-4a1d-8b00-a9b17e38b437');

  // ============================================================
  // Virtual Machine Roles
  // ============================================================

  /** Create and manage virtual machines */
  public static readonly VIRTUAL_MACHINE_CONTRIBUTOR = this.roleId('9980e02c-c2be-4d73-94e8-173b1dc7cf3c');

  /** Login to VMs as administrator */
  public static readonly VIRTUAL_MACHINE_ADMINISTRATOR_LOGIN = this.roleId('1c0163c0-47e6-4577-8991-ea5c82e286e4');

  /** Login to VMs as user */
  public static readonly VIRTUAL_MACHINE_USER_LOGIN = this.roleId('fb879df8-f326-4884-b1cf-06f3ad86be52');

  // ============================================================
  // Networking Roles
  // ============================================================

  /** Create and manage all networking resources */
  public static readonly NETWORK_CONTRIBUTOR = this.roleId('4d97b98b-1d4f-4787-a291-c67834d212e7');

  /** Manage DNS zones and records */
  public static readonly DNS_ZONE_CONTRIBUTOR = this.roleId('befefa01-2a29-4197-83a8-272ff33ce314');

  /** Manage Traffic Manager profiles */
  public static readonly TRAFFIC_MANAGER_CONTRIBUTOR = this.roleId('a4b10055-b0c7-44c2-b00f-c7b5b3550cf7');

  // ============================================================
  // Container Roles
  // ============================================================

  /** Pull container images */
  public static readonly ACR_PULL = this.roleId('7f951dda-4ed3-4680-a7ca-43fe172d538d');

  /** Push container images */
  public static readonly ACR_PUSH = this.roleId('8311e382-0749-4cb8-b61a-304f252e45ec');

  /** Delete container images */
  public static readonly ACR_DELETE = this.roleId('c2f4ef07-c644-48eb-af81-4b1b4947fb11');

  /** Manage AKS clusters */
  public static readonly AKS_CONTRIBUTOR = this.roleId('ed7f3fbd-7b88-4dd4-9017-9adb7ce333f8');

  /**
   * Helper to construct full role definition resource ID.
   *
   * @param guid - The role definition GUID
   * @returns ARM expression for the role definition resource ID
   *
   * @internal
   */
  private static roleId(guid: string): string {
    // Returns an ARM expression that will be resolved at deployment time
    // subscriptionResourceId ensures the role is looked up in the current subscription
    return `[subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '${guid}')]`;
  }

  /**
   * Get a role ID by its display name.
   *
   * @param displayName - The display name of the role
   * @returns The role definition resource ID or undefined if not found
   *
   * @remarks
   * This is a convenience method for dynamic role lookup.
   * Prefer using the static properties for compile-time safety.
   */
  public static getRoleByDisplayName(displayName: string): string | undefined {
    const roleMap: Record<string, string> = {
      'Reader': this.READER,
      'Contributor': this.CONTRIBUTOR,
      'Owner': this.OWNER,
      'Storage Blob Data Reader': this.STORAGE_BLOB_DATA_READER,
      'Storage Blob Data Contributor': this.STORAGE_BLOB_DATA_CONTRIBUTOR,
      // ... add more mappings as needed
    };

    return roleMap[displayName];
  }
}
```

## Resource Implementations

### StorageAccount with Grant Methods

```typescript
/**
 * L2 construct for Azure Storage Account with grant capabilities.
 *
 * @public
 */
export class StorageAccount extends GrantableResource {
  public readonly resourceType = 'Microsoft.Storage/storageAccounts';
  public readonly storageAccountName: string;
  public readonly resourceId: string;
  public readonly name: string;

  constructor(scope: Construct, id: string, props: StorageAccountProps) {
    super(scope, id, props);
    // ... initialization code
  }

  /**
   * Grant read access to blob storage.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   *
   * @example
   * ```typescript
   * storage.grantBlobRead(functionApp);
   * ```
   */
  public grantBlobRead(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
      `Read access to blobs in ${this.storageAccountName}`
    );
  }

  /**
   * Grant write access to blob storage (includes read).
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantBlobWrite(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR,
      `Write access to blobs in ${this.storageAccountName}`
    );
  }

  /**
   * Grant full access to blob storage.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantBlobFullAccess(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_BLOB_DATA_OWNER,
      `Full access to blobs in ${this.storageAccountName}`
    );
  }

  /**
   * Grant read access to table storage.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantTableRead(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_TABLE_DATA_READER,
      `Read access to tables in ${this.storageAccountName}`
    );
  }

  /**
   * Grant write access to table storage (includes read).
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantTableWrite(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_TABLE_DATA_CONTRIBUTOR,
      `Write access to tables in ${this.storageAccountName}`
    );
  }

  /**
   * Grant read access to queue storage.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantQueueRead(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_QUEUE_DATA_READER,
      `Read access to queues in ${this.storageAccountName}`
    );
  }

  /**
   * Grant message processing access to queue storage.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantQueueProcess(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_QUEUE_DATA_MESSAGE_PROCESSOR,
      `Process queue messages in ${this.storageAccountName}`
    );
  }

  /**
   * Grant message sending access to queue storage.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantQueueSend(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_QUEUE_DATA_MESSAGE_SENDER,
      `Send queue messages in ${this.storageAccountName}`
    );
  }

  /**
   * Grant read access to file shares.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantFileRead(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_FILE_DATA_SMB_SHARE_READER,
      `Read access to files in ${this.storageAccountName}`
    );
  }

  /**
   * Grant write access to file shares (includes read).
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantFileWrite(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.STORAGE_FILE_DATA_SMB_SHARE_CONTRIBUTOR,
      `Write access to files in ${this.storageAccountName}`
    );
  }

  // ... rest of StorageAccount implementation
}
```

### KeyVault with Grant Methods

```typescript
/**
 * L2 construct for Azure Key Vault with grant capabilities.
 *
 * @public
 */
export class KeyVault extends GrantableResource {
  public readonly resourceType = 'Microsoft.KeyVault/vaults';
  public readonly vaultName: string;
  public readonly resourceId: string;
  public readonly name: string;

  constructor(scope: Construct, id: string, props: KeyVaultProps) {
    super(scope, id, props);
    // ... initialization code
  }

  /**
   * Grant read access to secrets.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantSecretsRead(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.KEY_VAULT_SECRETS_USER,
      `Read secrets from ${this.vaultName}`
    );
  }

  /**
   * Grant full access to secrets (read, write, delete).
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantSecretsFullAccess(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.KEY_VAULT_SECRETS_OFFICER,
      `Manage secrets in ${this.vaultName}`
    );
  }

  /**
   * Grant access to use cryptographic keys.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantCryptoUse(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.KEY_VAULT_CRYPTO_USER,
      `Use crypto keys in ${this.vaultName}`
    );
  }

  /**
   * Grant full access to cryptographic keys.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantCryptoFullAccess(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.KEY_VAULT_CRYPTO_OFFICER,
      `Manage crypto keys in ${this.vaultName}`
    );
  }

  /**
   * Grant read access to certificates.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantCertificatesRead(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.KEY_VAULT_CERTIFICATES_USER,
      `Read certificates from ${this.vaultName}`
    );
  }

  /**
   * Grant full access to certificates.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantCertificatesFullAccess(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.KEY_VAULT_CERTIFICATES_OFFICER,
      `Manage certificates in ${this.vaultName}`
    );
  }

  /**
   * Grant full administrator access to Key Vault.
   *
   * @param grantable - Identity to grant access to
   * @returns The created role assignment
   */
  public grantAdministrator(grantable: IGrantable): IGrantResult {
    return this.grant(
      grantable,
      WellKnownRoleIds.KEY_VAULT_ADMINISTRATOR,
      `Full admin access to ${this.vaultName}`
    );
  }

  // ... rest of KeyVault implementation
}
```

## Custom Role Support

```typescript
/**
 * Properties for defining a custom role.
 *
 * @public
 */
export interface CustomRoleDefinitionProps {
  /**
   * Display name for the role.
   */
  readonly roleName: string;

  /**
   * Description of what the role allows.
   */
  readonly description?: string;

  /**
   * Actions the role is allowed to perform.
   */
  readonly actions: string[];

  /**
   * Actions the role is NOT allowed to perform.
   */
  readonly notActions?: string[];

  /**
   * Data actions the role is allowed to perform.
   */
  readonly dataActions?: string[];

  /**
   * Data actions the role is NOT allowed to perform.
   */
  readonly notDataActions?: string[];

  /**
   * Scopes where this role can be assigned.
   */
  readonly assignableScopes: string[];
}

/**
 * L1 construct for custom Azure role definitions.
 *
 * @public
 */
export class CustomRoleDefinition extends Resource {
  public readonly resourceType = 'Microsoft.Authorization/roleDefinitions';
  public readonly apiVersion = '2022-04-01';
  public readonly roleDefinitionId: string;

  constructor(scope: Construct, id: string, props: CustomRoleDefinitionProps) {
    super(scope, id);
    // ... initialization and validation

    // Generate deterministic GUID for role
    this.roleDefinitionId = this.generateRoleGuid(props.roleName);
  }

  /**
   * Get the full resource ID for this custom role.
   */
  public get roleId(): string {
    return `[subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '${this.roleDefinitionId}')]`;
  }

  // ... implementation
}
```

## Cross-Stack Support

```typescript
/**
 * Helper for creating cross-stack role assignments.
 *
 * @public
 */
export class CrossStackGrant {
  /**
   * Creates a role assignment across stacks.
   *
   * @param scope - Construct scope for the assignment
   * @param id - Unique ID for the assignment
   * @param resource - Resource to grant access to (can be from another stack)
   * @param grantable - Identity to grant access (can be from another stack)
   * @param roleDefinitionId - Role to assign
   * @returns The created role assignment
   *
   * @example
   * ```typescript
   * // In Stack B
   * CrossStackGrant.create(
   *   this,
   *   'CrossStackStorage',
   *   stackA.storage,  // Resource from Stack A
   *   functionApp,      // Identity from Stack B
   *   WellKnownRoleIds.STORAGE_BLOB_DATA_READER
   * );
   * ```
   */
  public static create(
    scope: Construct,
    id: string,
    resource: { resourceId: string | IResolvable },
    grantable: IGrantable,
    roleDefinitionId: string
  ): RoleAssignment {
    return new RoleAssignment(scope, id, {
      scope: resource.resourceId,
      roleDefinitionId,
      principalId: grantable.principalId,
      principalType: grantable.principalType,
      tenantId: grantable.tenantId
    });
  }
}
```

## Usage Examples

### Basic Usage

```typescript
import { StorageAccount, FunctionApp, KeyVault } from '@atakora/cdk';

// Create resources
const storage = new StorageAccount(stack, 'Storage', {
  accountName: 'mystorageaccount',
  sku: { name: 'Standard_LRS' }
});

const functionApp = new FunctionApp(stack, 'Api', {
  plan: appServicePlan,
  storageAccount: storage,
  // Identity will be auto-enabled when grants are used
});

const keyVault = new KeyVault(stack, 'Secrets', {
  vaultName: 'mykeyvault'
});

// Grant permissions
storage.grantBlobRead(functionApp);         // Read blobs
storage.grantTableWrite(functionApp);       // Read/write tables
storage.grantQueueProcess(functionApp);     // Process queue messages

keyVault.grantSecretsRead(functionApp);     // Read secrets
keyVault.grantCertificatesRead(functionApp); // Read certificates
```

### Advanced Usage with Conditions

```typescript
// Grant with conditions
const grant = storage.grantBlobRead(functionApp);

// Add a condition that only allows access to public containers
grant.addCondition(
  "@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'public'",
  '2.0'
);

// Add description for auditing
grant.addDescription('Allow function to read public blob containers only');
```

### Cross-Stack Grants

```typescript
// Stack A - Data layer
export class DataStack extends Stack {
  public readonly storage: StorageAccount;
  public readonly database: CosmosAccount;

  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    this.storage = new StorageAccount(this, 'Storage', {...});
    this.database = new CosmosAccount(this, 'Database', {...});
  }
}

// Stack B - Compute layer
export class ComputeStack extends Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const functionApp = new FunctionApp(this, 'Api', {...});

    // Grant access to resources from another stack
    props.dataStack.storage.grantBlobRead(functionApp);
    props.dataStack.database.grantDataRead(functionApp);
  }
}
```

### Custom Roles

```typescript
// Define a custom role
const customRole = new CustomRoleDefinition(stack, 'BlobReaderWithList', {
  roleName: 'Custom Blob Reader with List',
  description: 'Read blobs and list containers',
  actions: [
    'Microsoft.Storage/storageAccounts/blobServices/containers/read',
    'Microsoft.Storage/storageAccounts/blobServices/generateUserDelegationKey/action'
  ],
  dataActions: [
    'Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read'
  ],
  assignableScopes: [
    `/subscriptions/${subscriptionId}`
  ]
});

// Use the custom role in a grant
const roleAssignment = new RoleAssignment(stack, 'CustomGrant', {
  scope: storage.resourceId,
  roleDefinitionId: customRole.roleId,
  principalId: functionApp.principalId,
  principalType: PrincipalType.ManagedIdentity
});
```

### User and Group Grants

```typescript
// Grant to a user
const userGrant = storage.grantBlobRead({
  principalId: 'user-object-id-from-azure-ad',
  principalType: PrincipalType.User
});

// Grant to a group
const groupGrant = storage.grantBlobRead({
  principalId: 'group-object-id-from-azure-ad',
  principalType: PrincipalType.Group
});

// Grant to a service principal
const spGrant = storage.grantBlobRead({
  principalId: 'service-principal-object-id',
  principalType: PrincipalType.ServicePrincipal
});
```

## ARM Template Output

The grant pattern generates standard Azure role assignments in the ARM template:

```json
{
  "type": "Microsoft.Authorization/roleAssignments",
  "apiVersion": "2022-04-01",
  "scope": "[resourceId('Microsoft.Storage/storageAccounts', 'mystorageaccount')]",
  "name": "[guid(resourceId('Microsoft.Storage/storageAccounts', 'mystorageaccount'), subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1'), reference(resourceId('Microsoft.Web/sites', 'myfunctionapp')).identity.principalId)]",
  "properties": {
    "roleDefinitionId": "[subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1')]",
    "principalId": "[reference(resourceId('Microsoft.Web/sites', 'myfunctionapp')).identity.principalId]",
    "principalType": "ServicePrincipal",
    "description": "Read access to blobs in mystorageaccount"
  },
  "dependsOn": [
    "[resourceId('Microsoft.Storage/storageAccounts', 'mystorageaccount')]",
    "[resourceId('Microsoft.Web/sites', 'myfunctionapp')]"
  ]
}
```

## Testing Strategy

```typescript
describe('RBAC Grant Pattern', () => {
  describe('StorageAccount grants', () => {
    it('should create role assignment for blob read', () => {
      const stack = new Stack();
      const storage = new StorageAccount(stack, 'Storage', {...});
      const app = new FunctionApp(stack, 'App', {...});

      const grant = storage.grantBlobRead(app);

      expect(grant.roleDefinitionId).toContain('2a2b9908-6ea1-4ae2-8e65-a410df84e7d1');
      expect(grant.roleAssignment).toBeDefined();
    });

    it('should auto-enable identity when needed', () => {
      const stack = new Stack();
      const storage = new StorageAccount(stack, 'Storage', {...});
      const app = new FunctionApp(stack, 'App', {
        // No identity specified
      });

      storage.grantBlobRead(app);

      expect(app.identity?.type).toBe(ManagedIdentityType.SYSTEM_ASSIGNED);
    });
  });

  describe('Cross-stack grants', () => {
    it('should handle token resolution', () => {
      const app = new App();
      const stackA = new Stack(app, 'StackA');
      const stackB = new Stack(app, 'StackB');

      const storage = new StorageAccount(stackA, 'Storage', {...});
      const functionApp = new FunctionApp(stackB, 'App', {...});

      const grant = storage.grantBlobRead(functionApp);

      const template = app.synth();
      // Verify cross-stack reference is properly resolved
      expect(template.stackB).toContainReference('StackA.Storage');
    });
  });
});
```

## Migration Guide

For teams migrating from manual role assignments:

### Before (Manual)

```typescript
// Manual role assignment creation
const roleAssignment = {
  type: 'Microsoft.Authorization/roleAssignments',
  apiVersion: '2022-04-01',
  name: '[guid(parameters("random"))]',
  scope: storage.id,
  properties: {
    roleDefinitionId: '/subscriptions/.../providers/Microsoft.Authorization/roleDefinitions/2a2b9908-6ea1-4ae2-8e65-a410df84e7d1',
    principalId: '[reference(parameters("functionAppId")).identity.principalId]',
    principalType: 'ServicePrincipal'
  }
};
```

### After (Grant Pattern)

```typescript
// Simple, semantic grant
storage.grantBlobRead(functionApp);
```

## Performance Considerations

1. **Deployment Time**: Role assignments are created in parallel where possible
2. **GUID Generation**: Deterministic GUIDs ensure idempotent deployments
3. **Token Resolution**: Cross-stack references resolved during synthesis
4. **Validation**: Props validation happens at construction time, not deployment

## Security Best Practices

1. **Least Privilege**: Use the most restrictive role that allows the required operations
2. **Conditional Access**: Add conditions to limit access scope when possible
3. **Regular Auditing**: Review role assignments regularly
4. **Description Usage**: Always add descriptions for audit trail
5. **Managed Identity**: Prefer managed identities over service principals with keys