# Azure RBAC Grant Pattern - Implementation Plan

## Executive Summary

This document provides a comprehensive task breakdown for implementing the Azure RBAC grant pattern designed in ADR-013. The implementation is organized into 7 phases with clear dependencies and parallelization opportunities.

**Estimated Timeline**: 8-12 weeks (with parallel execution: 6-8 weeks)

**Total Components**: 50+ tasks across 7 major phases

**Parallelization Strategy**: Phases 3-6 can be partially parallelized across multiple agents after Phase 2 completes.

## Project Overview

### What We're Building

An AWS CDK-inspired grant pattern for Azure RBAC that provides:

- **IGrantable interface** - Clean abstraction for Azure identities
- **GrantableResource base class** - Infrastructure for resource grant methods
- **RoleAssignment constructs** - L1/L2 abstractions for role assignments
- **WellKnownRoleIds registry** - 40+ Azure built-in role definitions
- **Resource-specific grant methods** - Semantic grant APIs for all major Azure services
- **Managed Identity auto-enablement** - Transparent identity provisioning
- **Cross-stack support** - Token resolution for cross-stack grants

### Key Design Principles

1. **Type safety and immutability** - Full TypeScript type checking
2. **Progressive enhancement** - Start simple, add complexity as needed
3. **Gov vs Commercial cloud awareness** - Same role GUIDs across all clouds
4. **Clear ARM JSON output** - No magic, explicit role assignments
5. **AWS CDK familiarity** - Resource-centric grant methods

## Phase Breakdown

### Phase 1: Core Foundation (Week 1-2)
**Owner**: Single agent (foundation work, sequential)
**Dependencies**: None
**Deliverables**: Core interfaces, enums, and type definitions

### Phase 2: Base Infrastructure (Week 2-3)
**Owner**: Single agent (builds on Phase 1)
**Dependencies**: Phase 1 complete
**Deliverables**: GrantableResource base class, RoleAssignment constructs, WellKnownRoleIds

### Phase 3: Storage Resource Grants (Week 3-4)
**Owner**: Agent 1 (can parallelize with Phase 4-6)
**Dependencies**: Phase 2 complete
**Deliverables**: StorageAccount grant methods and tests

### Phase 4: Key Vault & Cosmos Grants (Week 4-5)
**Owner**: Agent 2 (can parallelize with Phase 3, 5-6)
**Dependencies**: Phase 2 complete
**Deliverables**: KeyVault and CosmosAccount grant methods and tests

### Phase 5: Additional Service Grants (Week 5-6)
**Owner**: Agent 3 (can parallelize with Phase 3-4, 6)
**Dependencies**: Phase 2 complete
**Deliverables**: SQL, Event Hub, Service Bus grant methods and tests

### Phase 6: Managed Identity Support (Week 5-6)
**Owner**: Agent 4 (can parallelize with Phase 3-5)
**Dependencies**: Phase 2 complete
**Deliverables**: UserAssignedIdentity construct, IGrantable implementations

### Phase 7: Integration & Polish (Week 7-8)
**Owner**: All agents (collaborative)
**Dependencies**: Phases 3-6 complete
**Deliverables**: Cross-stack support, integration tests, documentation

---

## Detailed Task Specifications

## Phase 1: Core Foundation

### Task 1.1: Create Core Interfaces

**Location**: `packages/lib/src/core/grants/`

**Files to Create**:
- `igrantable.ts` - IGrantable interface
- `principal-type.ts` - PrincipalType enum
- `grant-result.ts` - IGrantResult interface
- `index.ts` - Exports

**Implementation Requirements**:

```typescript
// igrantable.ts
import { IResolvable } from '../types';
import { PrincipalType } from './principal-type';

/**
 * Represents an Azure identity that can be granted permissions.
 *
 * @remarks
 * Implemented by resources with managed identities and identity constructs.
 * The grant system uses this interface to extract principal information
 * for role assignments.
 *
 * @public
 */
export interface IGrantable {
  /**
   * The principal ID (object ID) of the identity.
   * For managed identities, this is populated after deployment.
   */
  readonly principalId: string | IResolvable;

  /**
   * Type of principal for role assignment.
   */
  readonly principalType: PrincipalType;

  /**
   * Optional tenant ID for cross-tenant scenarios.
   * Defaults to current tenant if not specified.
   */
  readonly tenantId?: string;
}
```

```typescript
// principal-type.ts
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

```typescript
// grant-result.ts
import { IGrantable } from './igrantable';
import { IResolvable } from '../types';

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
  readonly roleAssignment: any; // Will be RoleAssignment type from Phase 2

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

**Testing Requirements**:
- Unit tests for type safety
- Interface compliance checks
- Documentation examples

**Success Criteria**:
- All interfaces compile without errors
- Full TSDoc documentation
- Exported from `@atakora/lib`

**Estimated Effort**: 1-2 days

---

### Task 1.2: Update Core Exports

**Location**: `packages/lib/src/core/index.ts`

**Implementation Requirements**:

```typescript
// Add to existing exports
export * from './grants';
```

**Testing Requirements**:
- Verify exports are accessible
- Check for naming conflicts

**Success Criteria**:
- Interfaces importable from `@atakora/lib/core`

**Estimated Effort**: 1 hour

---

### Task 1.3: Create Grant Errors

**Location**: `packages/lib/src/core/grants/errors.ts`

**Implementation Requirements**:

```typescript
import { ValidationError } from '../validation';

/**
 * Error thrown when grant operations fail.
 */
export class GrantError extends ValidationError {
  constructor(message: string, details?: string, suggestion?: string) {
    super(message, details, suggestion);
    this.name = 'GrantError';
  }
}

/**
 * Error thrown when a resource doesn't have a managed identity.
 */
export class MissingIdentityError extends GrantError {
  constructor(resourceId: string) {
    super(
      `Resource '${resourceId}' does not have a managed identity`,
      'Grant operations require the grantee to have a managed identity',
      'Enable a managed identity on the resource or use an explicit identity construct'
    );
    this.name = 'MissingIdentityError';
  }
}

/**
 * Error thrown when role assignment validation fails.
 */
export class InvalidRoleAssignmentError extends GrantError {
  constructor(message: string, details?: string) {
    super(message, details, 'Check the Azure RBAC documentation for valid role assignment configurations');
    this.name = 'InvalidRoleAssignmentError';
  }
}
```

**Testing Requirements**:
- Error instantiation tests
- Error message validation

**Success Criteria**:
- Errors extend ValidationError properly
- Clear error messages

**Estimated Effort**: 1 day

---

## Phase 2: Base Infrastructure

### Task 2.1: Create RoleAssignment L1 Construct

**Location**: `packages/lib/src/authorization/role-assignment-arm.ts`

**Dependencies**: Phase 1 complete

**Implementation Requirements**:

```typescript
import { Resource, ArmResource } from '../core/resource';
import { Construct } from '../core/construct';
import { IGrantable, PrincipalType } from '../core/grants';
import { IResolvable } from '../core/types';

/**
 * Properties for creating a role assignment (L1 construct).
 *
 * @public
 */
export interface RoleAssignmentArmProps {
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
   */
  readonly principalId: string | IResolvable;

  /**
   * Type of the principal.
   */
  readonly principalType: PrincipalType;

  /**
   * Tenant ID for cross-tenant scenarios.
   */
  readonly tenantId?: string;

  /**
   * Optional description for the assignment.
   */
  readonly description?: string;

  /**
   * Optional condition that must be met for the role to be effective.
   */
  readonly condition?: string;

  /**
   * Version of the condition syntax.
   */
  readonly conditionVersion?: '2.0';

  /**
   * Whether to skip validation of the principal.
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
export class RoleAssignmentArm extends Resource {
  public readonly resourceType = 'Microsoft.Authorization/roleAssignments';
  public readonly apiVersion = '2022-04-01';
  public readonly name: string;
  public readonly resourceId: string;

  private readonly props: RoleAssignmentArmProps;

  constructor(scope: Construct, id: string, props: RoleAssignmentArmProps) {
    super(scope, id);
    this.validateProps(props);
    this.props = props;

    // Generate deterministic GUID for idempotency
    this.name = this.generateAssignmentGuid();

    // Construct resource ID
    this.resourceId = `${this.resolveValue(props.scope)}/providers/Microsoft.Authorization/roleAssignments/${this.name}`;
  }

  protected validateProps(props: RoleAssignmentArmProps): void {
    if (!props.scope) {
      throw new Error('Role assignment requires a scope');
    }

    if (!props.roleDefinitionId) {
      throw new Error('Role assignment requires a roleDefinitionId');
    }

    if (!props.principalId) {
      throw new Error('Role assignment requires a principalId');
    }

    if (!props.principalType) {
      throw new Error('Role assignment requires a principalType');
    }

    if (props.description && props.description.length > 1024) {
      throw new Error('Role assignment description cannot exceed 1024 characters');
    }

    if (props.condition && !props.conditionVersion) {
      throw new Error('conditionVersion is required when condition is specified');
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
        ...(this.props.tenantId && { tenantId: this.props.tenantId }),
        ...(this.props.description && { description: this.props.description }),
        ...(this.props.condition && {
          condition: this.props.condition,
          conditionVersion: this.props.conditionVersion
        }),
        ...(this.props.skipPrincipalValidation && {
          delegatedManagedIdentityResourceId: null
        })
      }
    };
  }

  /**
   * Generates a deterministic GUID for the role assignment.
   *
   * @remarks
   * Using a deterministic GUID based on scope, role, and principal
   * ensures idempotent deployments.
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
    return `[${value.toString()}]`;
  }
}
```

**Testing Requirements**:
- Unit tests for GUID generation determinism
- Property validation tests
- ARM template output validation
- Cross-stack reference tests

**Success Criteria**:
- Generates valid ARM JSON
- Deterministic GUID generation
- Proper validation errors
- Full test coverage

**Estimated Effort**: 3-4 days

---

### Task 2.2: Create RoleAssignment L2 Construct

**Location**: `packages/lib/src/authorization/role-assignment.ts`

**Dependencies**: Task 2.1

**Implementation Requirements**:

```typescript
import { Construct } from '../core/construct';
import { IGrantable, PrincipalType } from '../core/grants';
import { IResolvable } from '../core/types';
import { RoleAssignmentArm, RoleAssignmentArmProps } from './role-assignment-arm';

/**
 * Properties for creating a role assignment (L2 construct).
 *
 * @public
 */
export interface RoleAssignmentProps {
  /**
   * The scope where the role is assigned (resource ID).
   */
  readonly scope: string | IResolvable;

  /**
   * Azure role definition ID (full resource ID).
   * Use WellKnownRoleIds for built-in roles.
   */
  readonly roleDefinitionId: string;

  /**
   * Principal ID to assign the role to.
   */
  readonly principalId: string | IResolvable;

  /**
   * Type of principal.
   */
  readonly principalType: PrincipalType;

  /**
   * Tenant ID for cross-tenant scenarios.
   */
  readonly tenantId?: string;

  /**
   * Optional description for the assignment.
   */
  readonly description?: string;

  /**
   * Condition for the role assignment (Azure RBAC conditions).
   */
  readonly condition?: string;

  /**
   * Version of the condition syntax.
   */
  readonly conditionVersion?: '2.0';
}

/**
 * L2 construct for Azure role assignments with developer-friendly API.
 *
 * @public
 */
export class RoleAssignment extends Construct {
  /**
   * Underlying L1 construct.
   */
  private readonly armRoleAssignment: RoleAssignmentArm;

  /**
   * Role definition ID.
   */
  public readonly roleDefinitionId: string;

  /**
   * Scope of the assignment.
   */
  public readonly scope: string | IResolvable;

  /**
   * Principal that was granted access.
   */
  public readonly principalId: string | IResolvable;

  /**
   * Resource ID of the role assignment.
   */
  public readonly roleAssignmentId: string;

  constructor(scope: Construct, id: string, props: RoleAssignmentProps) {
    super(scope, id);

    this.roleDefinitionId = props.roleDefinitionId;
    this.scope = props.scope;
    this.principalId = props.principalId;

    // Create underlying L1 resource
    this.armRoleAssignment = new RoleAssignmentArm(this, 'Resource', props);
    this.roleAssignmentId = this.armRoleAssignment.resourceId;
  }

  /**
   * Adds a description to the role assignment.
   */
  public addDescription(description: string): void {
    // Note: This would require making armRoleAssignment mutable
    // For immutability, descriptions should be set at construction
    throw new Error('Description must be set during construction for immutability');
  }

  /**
   * Adds an Azure RBAC condition to the assignment.
   */
  public addCondition(condition: string, version: '2.0' = '2.0'): void {
    // Note: This would require making armRoleAssignment mutable
    // For immutability, conditions should be set at construction
    throw new Error('Condition must be set during construction for immutability');
  }
}
```

**Testing Requirements**:
- L1/L2 integration tests
- Property propagation tests
- Immutability verification

**Success Criteria**:
- Clean developer API
- Proper L1 wrapping
- Immutability enforced

**Estimated Effort**: 2 days

---

### Task 2.3: Create GrantResult Implementation

**Location**: `packages/lib/src/authorization/grant-result.ts`

**Dependencies**: Task 2.2

**Implementation Requirements**:

```typescript
import { IGrantResult, IGrantable } from '../core/grants';
import { IResolvable } from '../core/types';
import { RoleAssignment } from './role-assignment';

/**
 * Implementation of IGrantResult.
 *
 * @internal
 */
export class GrantResult implements IGrantResult {
  public readonly roleAssignment: RoleAssignment;
  public readonly roleDefinitionId: string;
  public readonly grantee: IGrantable;
  public readonly scope: string | IResolvable;

  constructor(
    roleAssignment: RoleAssignment,
    roleDefinitionId: string,
    grantee: IGrantable,
    scope: string | IResolvable
  ) {
    this.roleAssignment = roleAssignment;
    this.roleDefinitionId = roleDefinitionId;
    this.grantee = grantee;
    this.scope = scope;
  }

  public addDescription(description: string): void {
    this.roleAssignment.addDescription(description);
  }

  public addCondition(condition: string, version: '2.0' = '2.0'): void {
    this.roleAssignment.addCondition(condition, version);
  }
}
```

**Testing Requirements**:
- Interface compliance tests
- Method delegation tests

**Success Criteria**:
- Implements IGrantResult fully
- Proper delegation to RoleAssignment

**Estimated Effort**: 1 day

---

### Task 2.4: Create WellKnownRoleIds Registry

**Location**: `packages/lib/src/authorization/well-known-role-ids.ts`

**Dependencies**: None (can parallelize with 2.1-2.3)

**Implementation Requirements**:

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
  public static readonly READER = WellKnownRoleIds.roleId('acdd72a7-3385-48ef-bd42-f606fba81ae7');

  /** Create and manage all resources */
  public static readonly CONTRIBUTOR = WellKnownRoleIds.roleId('b24988ac-6180-42a0-ab88-20f7382dd24c');

  /** Full access including ability to assign roles */
  public static readonly OWNER = WellKnownRoleIds.roleId('8e3af657-a8ff-443c-a75c-2fe8c4bcb635');

  /** Manage user access to Azure resources */
  public static readonly USER_ACCESS_ADMINISTRATOR = WellKnownRoleIds.roleId('18d7d88d-d35e-4fb5-a5c3-7773c20a72d9');

  // ============================================================
  // Storage Account Roles
  // ============================================================

  /** Read data from blobs */
  public static readonly STORAGE_BLOB_DATA_READER = WellKnownRoleIds.roleId('2a2b9908-6ea1-4ae2-8e65-a410df84e7d1');

  /** Read and write blob data */
  public static readonly STORAGE_BLOB_DATA_CONTRIBUTOR = WellKnownRoleIds.roleId('ba92f5b4-2d11-453d-a403-e96b0029c9fe');

  /** Full access to blob data including POSIX ACLs */
  public static readonly STORAGE_BLOB_DATA_OWNER = WellKnownRoleIds.roleId('b7e6dc6d-f1e8-4753-8033-0f276bb0955b');

  /** Read messages and metadata from queues */
  public static readonly STORAGE_QUEUE_DATA_READER = WellKnownRoleIds.roleId('19e7f393-937e-4f77-808e-94535e297925');

  /** Process queue messages */
  public static readonly STORAGE_QUEUE_DATA_CONTRIBUTOR = WellKnownRoleIds.roleId('974c5e8b-45b9-4653-ba55-5f855dd0fb88');

  /** Send queue messages */
  public static readonly STORAGE_QUEUE_DATA_MESSAGE_SENDER = WellKnownRoleIds.roleId('c6a89b2d-59bc-44d0-9896-0f6e12d7b80a');

  /** Process queue messages (read and delete) */
  public static readonly STORAGE_QUEUE_DATA_MESSAGE_PROCESSOR = WellKnownRoleIds.roleId('8a0f0c08-91a1-4084-bc3d-661d67233fed');

  /** Read table data */
  public static readonly STORAGE_TABLE_DATA_READER = WellKnownRoleIds.roleId('76199698-9eea-4c19-bc75-cec21354c6b6');

  /** Read and write table data */
  public static readonly STORAGE_TABLE_DATA_CONTRIBUTOR = WellKnownRoleIds.roleId('0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3');

  /** Read file share data */
  public static readonly STORAGE_FILE_DATA_SMB_SHARE_READER = WellKnownRoleIds.roleId('aba4ae5f-2193-4029-9191-0cb91df5e314');

  /** Read and write file share data */
  public static readonly STORAGE_FILE_DATA_SMB_SHARE_CONTRIBUTOR = WellKnownRoleIds.roleId('0c867c2a-1d8c-454a-a3db-ab2ea1bdc8bb');

  /** Full control of file share data */
  public static readonly STORAGE_FILE_DATA_SMB_SHARE_ELEVATED_CONTRIBUTOR = WellKnownRoleIds.roleId('a7264617-510b-434b-a828-9731dc254ea7');

  // ============================================================
  // Cosmos DB Roles
  // ============================================================

  /** Read Cosmos DB account metadata */
  public static readonly COSMOS_DB_ACCOUNT_READER = WellKnownRoleIds.roleId('fbdf93bf-df7d-467e-a4d2-9458aa1360c8');

  /** Manage Cosmos DB accounts but not access data */
  public static readonly COSMOS_DB_OPERATOR = WellKnownRoleIds.roleId('230815da-be43-4aae-9cb4-875f7bd000aa');

  /** Read Cosmos DB data (SQL API) */
  public static readonly COSMOS_DB_DATA_READER = WellKnownRoleIds.roleId('00000000-0000-0000-0000-000000000001');

  /** Read and write Cosmos DB data (SQL API) */
  public static readonly COSMOS_DB_DATA_CONTRIBUTOR = WellKnownRoleIds.roleId('00000000-0000-0000-0000-000000000002');

  // ============================================================
  // Key Vault Roles
  // ============================================================

  /** Read secrets from Key Vault */
  public static readonly KEY_VAULT_SECRETS_USER = WellKnownRoleIds.roleId('4633458b-17de-408a-b874-0445c86b69e6');

  /** Manage secrets in Key Vault */
  public static readonly KEY_VAULT_SECRETS_OFFICER = WellKnownRoleIds.roleId('b86a8fe4-44ce-4948-aee5-eccb2c155cd7');

  /** Use cryptographic keys for operations */
  public static readonly KEY_VAULT_CRYPTO_USER = WellKnownRoleIds.roleId('12338af0-0e69-4776-bea7-57ae8d297424');

  /** Manage cryptographic keys */
  public static readonly KEY_VAULT_CRYPTO_OFFICER = WellKnownRoleIds.roleId('14b46e9e-c2b7-41b4-b07b-48a6ebf60603');

  /** Read certificates */
  public static readonly KEY_VAULT_CERTIFICATES_USER = WellKnownRoleIds.roleId('db79e9a7-68ee-4b58-9aeb-b90e7c24fcba');

  /** Manage certificates */
  public static readonly KEY_VAULT_CERTIFICATES_OFFICER = WellKnownRoleIds.roleId('a4417e6f-fecd-4de8-b567-7b0420556985');

  /** Read all Key Vault data */
  public static readonly KEY_VAULT_READER = WellKnownRoleIds.roleId('21090545-7ca7-4776-b22c-e363652d74d2');

  /** Full access to Key Vault data */
  public static readonly KEY_VAULT_ADMINISTRATOR = WellKnownRoleIds.roleId('00482a5a-887f-4fb3-b363-3b7fe8e74483');

  // ============================================================
  // App Service / Function Apps
  // ============================================================

  /** Deploy and manage web apps */
  public static readonly WEBSITE_CONTRIBUTOR = WellKnownRoleIds.roleId('de139f84-1756-47ae-9be6-808fbbe84772');

  /** Manage web app slots */
  public static readonly WEB_PLAN_CONTRIBUTOR = WellKnownRoleIds.roleId('2cc479cb-7b4d-49a8-b449-8c00fd0f0a4b');

  // ============================================================
  // SQL Database Roles
  // ============================================================

  /** Read SQL database data */
  public static readonly SQL_DB_CONTRIBUTOR = WellKnownRoleIds.roleId('9b7fa17d-e63e-47b0-bb0a-15c516ac86ec');

  /** Manage SQL database security */
  public static readonly SQL_SECURITY_MANAGER = WellKnownRoleIds.roleId('056cd41c-7e88-42e1-933e-88ba6a50c9c3');

  /** Manage SQL servers */
  public static readonly SQL_SERVER_CONTRIBUTOR = WellKnownRoleIds.roleId('6d8ee4ec-f05a-4a1d-8b00-a9b17e38b437');

  // ============================================================
  // Event Hub Roles
  // ============================================================

  /** Read Event Hub data */
  public static readonly EVENT_HUB_DATA_RECEIVER = WellKnownRoleIds.roleId('a638d3c7-ab3a-418d-83e6-5f17a39d4fde');

  /** Send Event Hub data */
  public static readonly EVENT_HUB_DATA_SENDER = WellKnownRoleIds.roleId('2b629674-e913-4c01-ae53-ef4638d8f975');

  /** Manage Event Hubs */
  public static readonly EVENT_HUB_DATA_OWNER = WellKnownRoleIds.roleId('f526a384-b230-433a-b45c-95f59c4a2dec');

  // ============================================================
  // Service Bus Roles
  // ============================================================

  /** Read Service Bus messages */
  public static readonly SERVICE_BUS_DATA_RECEIVER = WellKnownRoleIds.roleId('4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0');

  /** Send Service Bus messages */
  public static readonly SERVICE_BUS_DATA_SENDER = WellKnownRoleIds.roleId('69a216fc-b8fb-44d8-bc22-1f3c2cd27a39');

  /** Manage Service Bus entities */
  public static readonly SERVICE_BUS_DATA_OWNER = WellKnownRoleIds.roleId('090c5cfd-751d-490a-894a-3ce6f1109419');

  // ============================================================
  // Container Roles
  // ============================================================

  /** Pull container images */
  public static readonly ACR_PULL = WellKnownRoleIds.roleId('7f951dda-4ed3-4680-a7ca-43fe172d538d');

  /** Push container images */
  public static readonly ACR_PUSH = WellKnownRoleIds.roleId('8311e382-0749-4cb8-b61a-304f252e45ec');

  /** Delete container images */
  public static readonly ACR_DELETE = WellKnownRoleIds.roleId('c2f4ef07-c644-48eb-af81-4b1b4947fb11');

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
}
```

**Testing Requirements**:
- Verify all role GUIDs are correct
- Test roleId helper function
- Documentation validation

**Success Criteria**:
- All 40+ roles defined
- ARM expression format correct
- Full documentation

**Estimated Effort**: 2-3 days

---

### Task 2.5: Create GrantableResource Base Class

**Location**: `packages/lib/src/core/grantable-resource.ts`

**Dependencies**: Tasks 2.1, 2.2, 2.3

**Implementation Requirements**:

```typescript
import { Resource, ResourceProps } from './resource';
import { Construct } from './construct';
import { IGrantable, PrincipalType, IGrantResult } from './grants';
import { IResolvable } from './types';
import { RoleAssignment } from '../authorization/role-assignment';
import { GrantResult } from '../authorization/grant-result';
import { MissingIdentityError } from './grants/errors';

/**
 * Managed identity types for Azure resources.
 */
export enum ManagedIdentityType {
  NONE = 'None',
  SYSTEM_ASSIGNED = 'SystemAssigned',
  USER_ASSIGNED = 'UserAssigned',
  SYSTEM_ASSIGNED_USER_ASSIGNED = 'SystemAssigned,UserAssigned'
}

/**
 * Managed Service Identity configuration.
 */
export interface ManagedServiceIdentity {
  type: ManagedIdentityType;
  userAssignedIdentities?: Record<string, any>;
}

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
   * @throws {MissingIdentityError} If resource has no managed identity
   */
  public get principalId(): string | IResolvable {
    if (!this.identity || this.identity.type === ManagedIdentityType.NONE) {
      throw new MissingIdentityError(this.node.id);
    }

    // For system-assigned identity, reference the principalId property
    if (this.identity.type === ManagedIdentityType.SYSTEM_ASSIGNED ||
        this.identity.type === ManagedIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED) {
      // Return ARM reference expression
      return `reference(${this.resourceId}).identity.principalId`;
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

**Testing Requirements**:
- Grant method functionality tests
- Auto-identity enablement tests
- PrincipalId resolution tests
- Error handling tests

**Success Criteria**:
- Base class works with all resource types
- Identity auto-enablement transparent
- Full error coverage

**Estimated Effort**: 4-5 days

---

### Task 2.6: Create Authorization Module Exports

**Location**: `packages/lib/src/authorization/index.ts`

**Dependencies**: All Task 2.x tasks

**Implementation Requirements**:

```typescript
export * from './role-assignment-arm';
export * from './role-assignment';
export * from './grant-result';
export * from './well-known-role-ids';
```

**Testing Requirements**:
- Export verification

**Success Criteria**:
- All authorization types exported

**Estimated Effort**: 1 hour

---

## Phase 3: Storage Resource Grants

### Task 3.1: Update StorageAccount to Extend GrantableResource

**Location**: `packages/cdk/src/storage/storage-accounts.ts`

**Dependencies**: Phase 2 complete

**Implementation Requirements**:

1. Change base class from `Construct` to `GrantableResource`
2. Add identity property management
3. Implement grant methods

```typescript
import { GrantableResource, ManagedServiceIdentity, ManagedIdentityType } from '@atakora/lib/core';
import { IGrantable, IGrantResult } from '@atakora/lib/core/grants';
import { WellKnownRoleIds } from '@atakora/lib/authorization';

export class StorageAccounts extends GrantableResource implements IStorageAccount {
  // ... existing properties ...

  /**
   * Managed identity configuration.
   */
  protected identity?: ManagedServiceIdentity;

  constructor(scope: Construct, id: string, props?: StorageAccountsProps) {
    super(scope, id, props);
    // ... existing constructor code ...

    // Initialize identity if provided
    if (props?.identity) {
      this.identity = props.identity;
    }
  }

  // Grant methods implementation continues in Task 3.2
}
```

**Testing Requirements**:
- Base class integration tests
- Identity initialization tests

**Success Criteria**:
- Extends GrantableResource properly
- No breaking changes to existing API

**Estimated Effort**: 1-2 days

---

### Task 3.2: Implement Storage Grant Methods

**Location**: `packages/cdk/src/storage/storage-accounts.ts` (continued)

**Dependencies**: Task 3.1

**Implementation Requirements**:

```typescript
export class StorageAccounts extends GrantableResource implements IStorageAccount {
  // ... previous code from Task 3.1 ...

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
}
```

**Testing Requirements**:
- Unit tests for each grant method
- Role assignment creation verification
- Description generation tests
- Integration tests with FunctionApp

**Success Criteria**:
- All 10 grant methods working
- Proper role assignments created
- Full test coverage
- Documentation complete

**Estimated Effort**: 3-4 days

---

### Task 3.3: Create Storage Grant Integration Tests

**Location**: `packages/cdk/src/storage/__tests__/storage-grants.test.ts`

**Dependencies**: Task 3.2

**Implementation Requirements**:

```typescript
import { describe, it, expect } from 'vitest';
import { StorageAccounts } from '../storage-accounts';
import { ResourceGroup } from '../../resources/resource-group';
import { SubscriptionStack } from '@atakora/lib/core';
import { App } from '@atakora/lib/core';
import { WellKnownRoleIds } from '@atakora/lib/authorization';

describe('StorageAccounts - Grant Methods', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;
  let storage: StorageAccounts;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscriptionId: 'test-sub-id',
      project: { name: 'test', resourceName: 'tst' },
      instance: { name: 'dev', resourceName: 'dv' }
    });
    resourceGroup = new ResourceGroup(stack, 'TestRG', {
      resourceGroupName: 'test-rg',
      location: 'eastus'
    });
    storage = new StorageAccounts(resourceGroup, 'TestStorage');
  });

  describe('grantBlobRead', () => {
    it('should create role assignment with correct role', () => {
      const mockGrantable = {
        principalId: 'test-principal-id',
        principalType: PrincipalType.ManagedIdentity
      };

      const result = storage.grantBlobRead(mockGrantable);

      expect(result.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_BLOB_DATA_READER);
      expect(result.grantee).toBe(mockGrantable);
    });

    it('should include resource name in description', () => {
      const mockGrantable = {
        principalId: 'test-principal-id',
        principalType: PrincipalType.ManagedIdentity
      };

      const result = storage.grantBlobRead(mockGrantable);
      const template = app.synth();

      // Verify description in ARM template
      const roleAssignments = template.resources.filter(
        r => r.type === 'Microsoft.Authorization/roleAssignments'
      );
      expect(roleAssignments[0].properties.description).toContain(storage.storageAccountName);
    });
  });

  // Similar tests for all other grant methods...
});
```

**Testing Requirements**:
- All grant methods tested
- ARM template output validation
- Cross-resource grant tests

**Success Criteria**:
- 100% code coverage
- All scenarios tested

**Estimated Effort**: 2-3 days

---

## Phase 4: Key Vault & Cosmos Grants

### Task 4.1: Add KeyVault Grant Methods

**Location**: `packages/cdk/src/keyvault/` (create if doesn't exist)

**Dependencies**: Phase 2 complete

**Implementation Requirements**:

Similar pattern to StorageAccount:
1. Extend GrantableResource
2. Implement grant methods for:
   - `grantSecretsRead()`
   - `grantSecretsFullAccess()`
   - `grantCryptoUse()`
   - `grantCryptoFullAccess()`
   - `grantCertificatesRead()`
   - `grantCertificatesFullAccess()`
   - `grantAdministrator()`

**Testing Requirements**:
- Full grant method test suite
- Integration tests

**Success Criteria**:
- All 7 grant methods implemented
- Full test coverage

**Estimated Effort**: 3-4 days

---

### Task 4.2: Add CosmosAccount Grant Methods

**Location**: `packages/cdk/src/documentdb/cosmos-db.ts`

**Dependencies**: Phase 2 complete

**Implementation Requirements**:

Implement grant methods for:
- `grantDataRead()`
- `grantDataWrite()`
- `grantAccountReader()`
- `grantOperator()`

**Testing Requirements**:
- Full grant method test suite
- Integration tests

**Success Criteria**:
- All 4 grant methods implemented
- Full test coverage

**Estimated Effort**: 2-3 days

---

## Phase 5: Additional Service Grants

### Task 5.1: Add SQL Server Grant Methods

**Location**: `packages/cdk/src/sql/` (create if doesn't exist)

**Dependencies**: Phase 2 complete

**Implementation Requirements**:

Implement grant methods for:
- `grantDatabaseContributor()`
- `grantSecurityManager()`
- `grantServerContributor()`

**Estimated Effort**: 2-3 days

---

### Task 5.2: Add Event Hub Grant Methods

**Location**: `packages/cdk/src/eventhub/` (create if doesn't exist)

**Dependencies**: Phase 2 complete

**Implementation Requirements**:

Implement grant methods for:
- `grantDataReceiver()`
- `grantDataSender()`
- `grantDataOwner()`

**Estimated Effort**: 2-3 days

---

### Task 5.3: Add Service Bus Grant Methods

**Location**: `packages/cdk/src/servicebus/` (create if doesn't exist)

**Dependencies**: Phase 2 complete

**Implementation Requirements**:

Implement grant methods for:
- `grantDataReceiver()`
- `grantDataSender()`
- `grantDataOwner()`

**Estimated Effort**: 2-3 days

---

## Phase 6: Managed Identity Support

### Task 6.1: Create UserAssignedIdentity Construct

**Location**: `packages/lib/src/managedidentity/user-assigned-identity.ts`

**Dependencies**: Phase 2 complete

**Implementation Requirements**:

```typescript
import { Resource } from '../core/resource';
import { Construct } from '../core/construct';
import { IGrantable, PrincipalType } from '../core/grants';

export interface UserAssignedIdentityProps {
  readonly identityName: string;
  readonly location: string;
  readonly tags?: Record<string, string>;
}

export class UserAssignedIdentity extends Resource implements IGrantable {
  public readonly resourceType = 'Microsoft.ManagedIdentity/userAssignedIdentities';
  public readonly apiVersion = '2023-01-31';
  public readonly name: string;
  public readonly resourceId: string;
  public readonly principalType = PrincipalType.ManagedIdentity;

  constructor(scope: Construct, id: string, props: UserAssignedIdentityProps) {
    super(scope, id, props);
    this.name = props.identityName;
    // ... implementation
  }

  public get principalId(): string {
    // Return ARM reference to principal ID
    return `[reference(${this.resourceId}).principalId]`;
  }

  // ... rest of implementation
}
```

**Testing Requirements**:
- IGrantable implementation tests
- ARM template generation tests

**Success Criteria**:
- Implements IGrantable
- Works with grant methods

**Estimated Effort**: 3-4 days

---

### Task 6.2: Add IGrantable to FunctionApp

**Location**: `packages/cdk/src/functions/function-app.ts`

**Dependencies**: Phase 2 complete

**Implementation Requirements**:

1. Extend GrantableResource instead of Construct
2. Add identity property management
3. Implement principalId getter

**Testing Requirements**:
- Identity auto-enablement tests
- Grant usage tests

**Success Criteria**:
- FunctionApp can be used as grantable
- Auto-identity works

**Estimated Effort**: 2-3 days

---

## Phase 7: Integration & Polish

### Task 7.1: Cross-Stack Grant Support

**Location**: `packages/lib/src/authorization/cross-stack-grant.ts`

**Dependencies**: Phases 3-6 complete

**Implementation Requirements**:

```typescript
import { Construct } from '../core/construct';
import { IGrantable } from '../core/grants';
import { RoleAssignment } from './role-assignment';

export class CrossStackGrant {
  public static create(
    scope: Construct,
    id: string,
    resource: { resourceId: string },
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

**Testing Requirements**:
- Multi-stack deployment tests
- Token resolution tests

**Success Criteria**:
- Cross-stack grants work
- Proper dependencies

**Estimated Effort**: 3-4 days

---

### Task 7.2: Integration Test Suite

**Location**: `packages/cdk/src/__tests__/integration/rbac-grants.integration.test.ts`

**Dependencies**: All previous phases

**Implementation Requirements**:

Create comprehensive integration tests covering:
- StorageAccount → FunctionApp grants
- KeyVault → FunctionApp grants
- Cosmos → FunctionApp grants
- Cross-stack grants
- Multiple simultaneous grants
- User-assigned identity grants

**Testing Requirements**:
- End-to-end scenarios
- ARM template validation
- Deployment simulation

**Success Criteria**:
- All integration scenarios pass
- ARM templates valid

**Estimated Effort**: 4-5 days

---

### Task 7.3: Documentation & Examples

**Location**: Multiple locations

**Dependencies**: All implementation complete

**Deliverables**:

1. **API Documentation** (`docs/api/rbac-grants.md`)
   - All grant methods documented
   - Usage examples
   - Best practices

2. **Migration Guide** (`docs/guides/rbac-migration.md`)
   - From manual role assignments
   - From AWS CDK patterns

3. **Example Projects** (`examples/rbac-grants/`)
   - Simple grant example
   - Multi-service example
   - Cross-stack example
   - Custom role example

**Testing Requirements**:
- All examples must compile
- All examples must deploy successfully

**Success Criteria**:
- Complete documentation
- Working examples

**Estimated Effort**: 5-6 days

---

## Parallelization Strategy

### Parallel Execution Opportunities

After Phase 2 completes, Phases 3-6 can be executed in parallel by different agents:

**Agent 1: Storage Specialist**
- Task 3.1: Update StorageAccount
- Task 3.2: Storage grant methods
- Task 3.3: Storage integration tests

**Agent 2: Data Services Specialist**
- Task 4.1: KeyVault grants
- Task 4.2: Cosmos grants

**Agent 3: Messaging Services Specialist**
- Task 5.1: SQL grants
- Task 5.2: Event Hub grants
- Task 5.3: Service Bus grants

**Agent 4: Identity Specialist**
- Task 6.1: UserAssignedIdentity
- Task 6.2: FunctionApp IGrantable

### Integration Points

**Clear Boundaries**:
- Each agent works on separate resource types
- All depend on Phase 2 base infrastructure
- No cross-dependencies between Phases 3-6

**Integration in Phase 7**:
- All agents collaborate on integration tests
- Shared responsibility for cross-stack tests
- Collaborative documentation

### Coordination Requirements

**Daily Sync Points**:
- Share Phase 2 completion status
- Coordinate on shared type changes
- Review ARM template patterns

**Weekly Integration**:
- Merge all changes
- Run full integration test suite
- Review API consistency

---

## Testing Strategy

### Unit Testing

**Coverage Target**: 100%

**Test Categories**:
1. **Interface Compliance**: IGrantable, IGrantResult
2. **Grant Method Logic**: All grant methods
3. **Role Assignment Creation**: ARM template generation
4. **Identity Management**: Auto-enablement, principalId resolution
5. **Validation**: Error cases, edge cases

**Tools**:
- Vitest for test runner
- Custom ARM template matchers
- Mock constructs

### Integration Testing

**Coverage Target**: All major scenarios

**Test Categories**:
1. **Single Resource Grants**: Storage → Function
2. **Multi-Resource Grants**: Multiple resources → Function
3. **Cross-Stack Grants**: Stack A → Stack B
4. **Identity Scenarios**: System-assigned, user-assigned
5. **ARM Template Validation**: Syntactically correct, deployable

**Tools**:
- Full stack synthesis
- ARM template validation
- Deployment simulation (optional)

### End-to-End Testing

**Coverage Target**: Critical paths

**Test Categories**:
1. **Real Deployments**: Deploy to test subscription
2. **Role Assignment Verification**: Azure CLI checks
3. **Permission Validation**: Actual permission tests

**Tools**:
- Azure CLI
- Test subscription
- Automated teardown

---

## Success Criteria

### Functional Requirements

- [ ] IGrantable interface fully implemented
- [ ] GrantableResource base class working
- [ ] RoleAssignment L1 and L2 constructs complete
- [ ] WellKnownRoleIds with 40+ roles
- [ ] StorageAccount with 10 grant methods
- [ ] KeyVault with 7 grant methods
- [ ] CosmosAccount with 4 grant methods
- [ ] SQL, EventHub, ServiceBus with grant methods
- [ ] UserAssignedIdentity construct
- [ ] FunctionApp implements IGrantable
- [ ] Cross-stack grant support

### Quality Requirements

- [ ] 100% unit test coverage
- [ ] All integration tests passing
- [ ] ARM templates validate successfully
- [ ] Zero breaking changes to existing APIs
- [ ] Full TSDoc documentation
- [ ] Working examples

### Performance Requirements

- [ ] Grant method calls <10ms (synthesis time)
- [ ] No significant increase in template size
- [ ] Deterministic GUID generation

### Developer Experience

- [ ] IntelliSense shows grant methods
- [ ] Clear error messages
- [ ] Discoverable through documentation
- [ ] AWS CDK users feel at home

---

## Risk Mitigation

### Technical Risks

**Risk**: ARM template size explosion with many grants
**Mitigation**: Monitor template sizes, optimize GUID generation

**Risk**: Cross-stack reference resolution failures
**Mitigation**: Comprehensive testing, clear documentation

**Risk**: Breaking changes to existing resources
**Mitigation**: Extend, don't replace; maintain backward compatibility

### Process Risks

**Risk**: Agent coordination failures in parallel execution
**Mitigation**: Clear task boundaries, daily sync, integration checkpoints

**Risk**: Inconsistent API patterns across resources
**Mitigation**: Phase 2 establishes patterns, code reviews enforce consistency

**Risk**: Incomplete testing coverage
**Mitigation**: Automated coverage reports, PR requirements

### Schedule Risks

**Risk**: Phase 2 delays block all parallel work
**Mitigation**: Prioritize Phase 2, consider partial releases

**Risk**: Integration issues in Phase 7
**Mitigation**: Continuous integration during Phases 3-6

---

## Rollout Plan

### Phase 1 Release: Foundation (Week 3)
**Deliverables**: Core interfaces, minimal functionality
**Audience**: Internal testing only

### Phase 2 Release: Base Infrastructure (Week 4)
**Deliverables**: RoleAssignment, WellKnownRoleIds
**Audience**: Early adopters, feedback collection

### Phase 3 Release: Storage Grants (Week 5)
**Deliverables**: StorageAccount with full grant API
**Audience**: Broader internal use

### Phase 4 Release: Multiple Services (Week 7)
**Deliverables**: KeyVault, Cosmos, SQL, EventHub, ServiceBus
**Audience**: Beta testing

### Final Release: Complete Pattern (Week 8)
**Deliverables**: All features, full documentation
**Audience**: General availability

---

## Appendix A: File Structure

```
atakora/
├── packages/
│   ├── lib/
│   │   └── src/
│   │       ├── core/
│   │       │   ├── grants/
│   │       │   │   ├── igrantable.ts
│   │       │   │   ├── principal-type.ts
│   │       │   │   ├── grant-result.ts
│   │       │   │   ├── errors.ts
│   │       │   │   └── index.ts
│   │       │   ├── grantable-resource.ts
│   │       │   └── index.ts
│   │       ├── authorization/
│   │       │   ├── role-assignment-arm.ts
│   │       │   ├── role-assignment.ts
│   │       │   ├── grant-result.ts
│   │       │   ├── well-known-role-ids.ts
│   │       │   ├── cross-stack-grant.ts
│   │       │   └── index.ts
│   │       └── managedidentity/
│   │           ├── user-assigned-identity.ts
│   │           └── index.ts
│   └── cdk/
│       └── src/
│           ├── storage/
│           │   ├── storage-accounts.ts (updated)
│           │   └── __tests__/
│           │       └── storage-grants.test.ts
│           ├── keyvault/
│           │   ├── key-vault.ts
│           │   └── __tests__/
│           ├── documentdb/
│           │   ├── cosmos-db.ts (updated)
│           │   └── __tests__/
│           ├── sql/
│           ├── eventhub/
│           ├── servicebus/
│           ├── functions/
│           │   ├── function-app.ts (updated)
│           │   └── __tests__/
│           └── __tests__/
│               └── integration/
│                   └── rbac-grants.integration.test.ts
├── docs/
│   ├── api/
│   │   └── rbac-grants.md
│   ├── guides/
│   │   └── rbac-migration.md
│   └── design/
│       └── architecture/
│           ├── adr-013-azure-rbac-grant-pattern.md (existing)
│           ├── azure-rbac-api-design.md (existing)
│           ├── azure-rbac-aws-cdk-comparison.md (existing)
│           └── azure-rbac-implementation-plan.md (this document)
└── examples/
    └── rbac-grants/
        ├── simple-grant/
        ├── multi-service/
        ├── cross-stack/
        └── custom-role/
```

---

## Appendix B: Task Dependencies Graph

```
Phase 1 (Foundation)
├── Task 1.1: Core Interfaces
├── Task 1.2: Core Exports
└── Task 1.3: Grant Errors
     ↓
Phase 2 (Base Infrastructure)
├── Task 2.1: RoleAssignment L1 ──┐
├── Task 2.2: RoleAssignment L2   ├→ Task 2.5: GrantableResource
├── Task 2.3: GrantResult ────────┘
├── Task 2.4: WellKnownRoleIds (parallel)
└── Task 2.6: Authorization Exports
     ↓
     ├─────────────────┬─────────────────┬─────────────────┬────────────────┐
     ↓                 ↓                 ↓                 ↓                ↓
Phase 3            Phase 4           Phase 5           Phase 6         Phase 7
(Storage)      (KeyVault/Cosmos)  (SQL/EventHub)    (Identity)      (Integration)
Task 3.1           Task 4.1           Task 5.1         Task 6.1        Task 7.1
Task 3.2           Task 4.2           Task 5.2         Task 6.2        Task 7.2
Task 3.3                              Task 5.3                         Task 7.3
     │                 │                 │                │                │
     └─────────────────┴─────────────────┴────────────────┴────────────────┘
                                         ↓
                                   Phase 7 Complete
```

---

## Appendix C: Effort Summary

| Phase | Tasks | Estimated Days | Can Parallelize |
|-------|-------|----------------|-----------------|
| Phase 1: Foundation | 3 | 3-4 | No |
| Phase 2: Infrastructure | 6 | 12-15 | Partial (Task 2.4) |
| Phase 3: Storage | 3 | 6-9 | Yes |
| Phase 4: KeyVault/Cosmos | 2 | 5-7 | Yes |
| Phase 5: SQL/EventHub/ServiceBus | 3 | 6-9 | Yes |
| Phase 6: Identity | 2 | 5-7 | Yes |
| Phase 7: Integration | 3 | 12-15 | Partial |
| **Total** | **22** | **49-66 days** | **With parallelization: 30-40 days** |

**Team Size Impact**:
- 1 agent: 10-13 weeks
- 4 agents (Phases 3-6 parallel): 6-8 weeks
- 2 agents (some parallelization): 8-10 weeks

---

This implementation plan provides a comprehensive, executable roadmap for implementing the Azure RBAC grant pattern. Each task is scoped, estimated, and designed for clear ownership boundaries to enable parallel execution when appropriate.
