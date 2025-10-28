# ADR-013: Azure RBAC Grant Pattern

## Context

AWS CDK provides an elegant pattern for granting permissions through resource-specific `grant*()` methods that automatically handle IAM policy creation. Azure uses a fundamentally different Role-Based Access Control (RBAC) model based on role assignments linking principals to roles at specific scopes.

We need to design a developer-friendly grant pattern for Atakora that:
1. Provides AWS CDK-like developer experience
2. Works naturally with Azure's RBAC model
3. Maintains type safety and immutability
4. Supports Government and Commercial clouds
5. Generates clear, explicit ARM JSON

### Azure RBAC Model Fundamentals

Azure RBAC consists of three core components:
- **Security Principal**: Who gets access (User, Group, Service Principal, Managed Identity)
- **Role Definition**: What permissions are granted (Reader, Contributor, or custom roles)
- **Scope**: Where access applies (Management Group, Subscription, Resource Group, or Resource)

Role assignments combine these three elements to grant effective permissions.

### AWS CDK Pattern Analysis

AWS CDK's grant pattern succeeds because it:
- Abstracts complexity behind simple method calls
- Automatically determines identity-based vs resource-based policies
- Provides resource-specific grant methods with semantic meaning
- Handles cross-stack references transparently

## Decision

We will implement an Azure RBAC grant pattern that adapts AWS CDK's developer experience to Azure's role assignment model, focusing on resource-centric grant methods that create role assignments automatically.

### Core Design Elements

#### 1. IGrantable Interface

```typescript
/**
 * Represents an Azure identity that can be granted permissions.
 *
 * @remarks
 * Implemented by resources with managed identities and identity constructs.
 * The grant system uses this interface to extract principal information
 * for role assignments.
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

/**
 * Azure principal types for role assignments.
 */
export enum PrincipalType {
  User = 'User',
  Group = 'Group',
  ServicePrincipal = 'ServicePrincipal',
  ManagedIdentity = 'ServicePrincipal', // Managed identities use ServicePrincipal type
  ForeignGroup = 'ForeignGroup',
  Device = 'Device'
}
```

#### 2. Grant Method Pattern

Resources implement semantic grant methods that create appropriate role assignments:

```typescript
export abstract class GrantableResource extends Resource implements IGrantable {
  /**
   * Principal ID for resources with managed identities.
   * Resolved at deployment time via ARM reference.
   */
  public get principalId(): string | IResolvable {
    if (!this.identity || this.identity.type === ManagedIdentityType.NONE) {
      throw new Error(`Resource ${this.node.id} does not have a managed identity`);
    }

    // Return ARM reference expression for system-assigned identity
    return new ArmReference(
      this.resourceId,
      'identity.principalId'
    );
  }

  public readonly principalType = PrincipalType.ManagedIdentity;

  /**
   * Grants permissions to a grantable identity at this resource's scope.
   *
   * @param grantable - Identity to grant permissions to
   * @param roleDefinitionId - Azure built-in role definition ID
   * @returns The created role assignment
   */
  protected grant(grantable: IGrantable, roleDefinitionId: string): RoleAssignment {
    return new RoleAssignment(this, `Grant${this.generateGrantId()}`, {
      scope: this.resourceId,
      roleDefinitionId,
      principalId: grantable.principalId,
      principalType: grantable.principalType,
      tenantId: grantable.tenantId
    });
  }

  private grantCounter = 0;
  private generateGrantId(): string {
    return `${this.grantCounter++}`;
  }
}
```

#### 3. Resource-Specific Grant Methods

Each resource type provides semantic grant methods using well-known role IDs:

```typescript
export class StorageAccount extends GrantableResource {
  /**
   * Grant read access to blob storage.
   * Assigns the "Storage Blob Data Reader" role.
   */
  public grantBlobRead(grantable: IGrantable): RoleAssignment {
    return this.grant(grantable, WellKnownRoleIds.STORAGE_BLOB_DATA_READER);
  }

  /**
   * Grant write access to blob storage.
   * Assigns the "Storage Blob Data Contributor" role.
   */
  public grantBlobWrite(grantable: IGrantable): RoleAssignment {
    return this.grant(grantable, WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR);
  }

  /**
   * Grant read and write access to blob storage.
   * Assigns the "Storage Blob Data Contributor" role.
   */
  public grantBlobReadWrite(grantable: IGrantable): RoleAssignment {
    // Contributor includes read permissions
    return this.grantBlobWrite(grantable);
  }

  /**
   * Grant read access to table storage.
   * Assigns the "Storage Table Data Reader" role.
   */
  public grantTableRead(grantable: IGrantable): RoleAssignment {
    return this.grant(grantable, WellKnownRoleIds.STORAGE_TABLE_DATA_READER);
  }

  /**
   * Grant read access to queue storage.
   * Assigns the "Storage Queue Data Reader" role.
   */
  public grantQueueRead(grantable: IGrantable): RoleAssignment {
    return this.grant(grantable, WellKnownRoleIds.STORAGE_QUEUE_DATA_READER);
  }
}
```

#### 4. Role Assignment Construct

The RoleAssignment construct generates ARM template resources:

```typescript
export interface RoleAssignmentProps {
  /**
   * Scope where the role is assigned (resource ID).
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

export class RoleAssignment extends Resource {
  public readonly resourceType = 'Microsoft.Authorization/roleAssignments';
  public readonly apiVersion = '2022-04-01';

  private readonly props: RoleAssignmentProps;

  constructor(scope: Construct, id: string, props: RoleAssignmentProps) {
    super(scope, id);
    this.props = props;

    // Validate the role assignment
    this.validateProps(props);
  }

  protected validateProps(props: RoleAssignmentProps): void {
    if (!props.scope) {
      throw new Error('Role assignment requires a scope');
    }
    if (!props.roleDefinitionId) {
      throw new Error('Role assignment requires a roleDefinitionId');
    }
    if (!props.principalId) {
      throw new Error('Role assignment requires a principalId');
    }
  }

  public toArmTemplate(): ArmResource {
    // Generate deterministic GUID for role assignment name
    const assignmentName = this.generateAssignmentGuid();

    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      scope: this.props.scope,
      name: assignmentName,
      properties: {
        roleDefinitionId: this.props.roleDefinitionId,
        principalId: this.props.principalId,
        principalType: this.props.principalType,
        ...(this.props.description && { description: this.props.description }),
        ...(this.props.condition && {
          condition: this.props.condition,
          conditionVersion: this.props.conditionVersion || '2.0'
        })
      }
    };
  }

  private generateAssignmentGuid(): string {
    // Generate deterministic GUID based on scope + role + principal
    // This ensures idempotent deployments
    const seed = `${this.props.scope}-${this.props.roleDefinitionId}-${this.props.principalId}`;
    return `[guid('${seed}')]`;
  }
}
```

#### 5. Well-Known Role Registry

Centralized registry of Azure built-in roles with Government cloud support:

```typescript
/**
 * Registry of Azure built-in role definition IDs.
 *
 * @remarks
 * Role IDs are consistent across all Azure environments including Government.
 * The registry provides both the GUID and a helper to construct the full ID.
 */
export class WellKnownRoleIds {
  // General roles
  public static readonly READER = this.roleId('acdd72a7-3385-48ef-bd42-f606fba81ae7');
  public static readonly CONTRIBUTOR = this.roleId('b24988ac-6180-42a0-ab88-20f7382dd24c');
  public static readonly OWNER = this.roleId('8e3af657-a8ff-443c-a75c-2fe8c4bcb635');

  // Storage roles
  public static readonly STORAGE_BLOB_DATA_READER = this.roleId('2a2b9908-6ea1-4ae2-8e65-a410df84e7d1');
  public static readonly STORAGE_BLOB_DATA_CONTRIBUTOR = this.roleId('ba92f5b4-2d11-453d-a403-e96b0029c9fe');
  public static readonly STORAGE_BLOB_DATA_OWNER = this.roleId('b7e6dc6d-f1e8-4753-8033-0f276bb0955b');
  public static readonly STORAGE_QUEUE_DATA_READER = this.roleId('19e7f393-937e-4f77-808e-94535e297925');
  public static readonly STORAGE_QUEUE_DATA_CONTRIBUTOR = this.roleId('974c5e8b-45b9-4653-ba55-5f855dd0fb88');
  public static readonly STORAGE_TABLE_DATA_READER = this.roleId('76199698-9eea-4c19-bc75-cec21354c6b6');
  public static readonly STORAGE_TABLE_DATA_CONTRIBUTOR = this.roleId('0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3');

  // Cosmos DB roles
  public static readonly COSMOS_DB_ACCOUNT_READER = this.roleId('fbdf93bf-df7d-467e-a4d2-9458aa1360c8');
  public static readonly COSMOS_DB_OPERATOR = this.roleId('230815da-be43-4aae-9cb4-875f7bd000aa');
  public static readonly COSMOS_DB_DATA_CONTRIBUTOR = this.roleId('00000000-0000-0000-0000-000000000002'); // Built-in data plane role

  // Key Vault roles
  public static readonly KEY_VAULT_SECRETS_USER = this.roleId('4633458b-17de-408a-b874-0445c86b69e6');
  public static readonly KEY_VAULT_SECRETS_OFFICER = this.roleId('b86a8fe4-44ce-4948-aee5-eccb2c155cd7');
  public static readonly KEY_VAULT_CRYPTO_USER = this.roleId('12338af0-0e69-4776-bea7-57ae8d297424');
  public static readonly KEY_VAULT_CERTIFICATES_OFFICER = this.roleId('a4417e6f-fecd-4de8-b567-7b0420556985');

  // App Service / Functions
  public static readonly WEBSITE_CONTRIBUTOR = this.roleId('de139f84-1756-47ae-9be6-808fbbe84772');

  // Helper to construct full role definition resource ID
  private static roleId(guid: string): string {
    // Returns an ARM expression that will be resolved at deployment
    return `[subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '${guid}')]`;
  }
}
```

#### 6. Managed Identity Auto-Creation

Resources automatically configure managed identities when grant methods are used:

```typescript
export abstract class IdentityEnabledResource extends GrantableResource {
  protected identity?: ManagedServiceIdentity;

  /**
   * Ensures the resource has a managed identity configured.
   * Called automatically by grant methods.
   */
  protected ensureIdentity(): void {
    if (!this.identity || this.identity.type === ManagedIdentityType.NONE) {
      // Auto-enable system-assigned identity
      this.identity = {
        type: ManagedIdentityType.SYSTEM_ASSIGNED
      };

      // Log for transparency
      console.log(`Auto-enabled system-assigned identity for ${this.node.id} due to grant usage`);
    }
  }

  protected grant(grantable: IGrantable, roleDefinitionId: string): RoleAssignment {
    // Ensure this resource has an identity if it's being granted permissions
    if (grantable === this) {
      this.ensureIdentity();
    }

    return super.grant(grantable, roleDefinitionId);
  }
}
```

#### 7. Cross-Stack Support

Handle references between stacks using tokens and late-bound resolution:

```typescript
export class CrossStackRoleAssignment extends RoleAssignment {
  constructor(scope: Construct, id: string, props: RoleAssignmentProps) {
    super(scope, id, props);

    // Validate cross-stack references are resolvable
    if (Token.isUnresolved(props.scope)) {
      // Scope will be resolved during synthesis
      this.node.addDependency(Token.asResource(props.scope));
    }

    if (Token.isUnresolved(props.principalId)) {
      // Principal ID will be resolved during synthesis
      this.node.addDependency(Token.asResource(props.principalId));
    }
  }
}
```

## Alternatives Considered

### 1. Direct Role Assignment Creation

**Approach**: Require developers to create RoleAssignment constructs manually.

**Pros**:
- Explicit and transparent
- Full control over all parameters
- No hidden behavior

**Cons**:
- Verbose and repetitive
- Requires knowledge of role GUIDs
- Poor developer experience
- Error-prone

### 2. Generic Grant Method

**Approach**: Single `grant(principal, roleName)` method on all resources.

**Pros**:
- Simple API surface
- Flexible for any role

**Cons**:
- No IntelliSense for available roles
- String-based role names prone to typos
- Lacks semantic meaning
- No compile-time validation

### 3. Policy-Based System

**Approach**: Create a policy engine similar to AWS IAM policies.

**Pros**:
- Familiar to AWS users
- Very flexible

**Cons**:
- Doesn't map to Azure's RBAC model
- Would require custom implementation
- Adds unnecessary abstraction layer
- Confusing for Azure-native users

## Consequences

### Positive Consequences

1. **Developer Experience**: Intuitive API similar to AWS CDK but Azure-native
2. **Type Safety**: Compile-time checking of grant methods and role assignments
3. **Discoverability**: IntelliSense shows available grant methods per resource
4. **Automatic Identity Management**: Managed identities created as needed
5. **Idempotent Deployments**: Deterministic GUID generation prevents duplicates
6. **Cloud Compatibility**: Works across Commercial and Government clouds
7. **Clear ARM Output**: Generates standard Azure role assignments
8. **Semantic Clarity**: Grant methods express intent clearly

### Negative Consequences

1. **Learning Curve**: Developers need to understand which roles grant which permissions
2. **Method Proliferation**: Each resource needs multiple grant methods
3. **Maintenance Burden**: Must keep role IDs updated as Azure adds new roles
4. **Runtime Resolution**: Some principal IDs only available at deployment time
5. **Cross-Stack Complexity**: Requires token resolution for cross-stack grants

### Trade-offs

1. **Simplicity vs Flexibility**: Semantic methods are simpler but less flexible than generic grants
2. **Magic vs Explicit**: Auto-identity creation is convenient but may surprise users
3. **Abstraction vs Transparency**: Grant methods hide role IDs but make ARM less obvious

## Success Criteria

1. **Developer Productivity**: 50% reduction in lines of code for permission grants vs manual role assignments
2. **Error Reduction**: 75% fewer deployment failures related to RBAC configuration
3. **API Consistency**: All grantable resources follow the same pattern
4. **Documentation Coverage**: Every grant method documents exactly which role it assigns
5. **Type Safety**: Zero runtime errors from type mismatches in grant operations
6. **Government Cloud**: All patterns work identically in Government cloud
7. **Test Coverage**: 100% unit test coverage for grant methods and role assignments

## Implementation Priority

1. **Phase 1**: Core interfaces and base classes (IGrantable, GrantableResource)
2. **Phase 2**: RoleAssignment construct and WellKnownRoleIds registry
3. **Phase 3**: Storage Account grant methods (most common use case)
4. **Phase 4**: Key Vault and Cosmos DB grant methods
5. **Phase 5**: Cross-stack support and token resolution
6. **Phase 6**: Custom role definition support

## Example Usage

```typescript
// Simple grant
const storage = new StorageAccount(stack, 'Storage', {...});
const functionApp = new FunctionApp(stack, 'Api', {...});

storage.grantBlobRead(functionApp);  // Function can read blobs

// Multiple grants
storage.grantBlobReadWrite(functionApp);
storage.grantTableRead(functionApp);
storage.grantQueueRead(functionApp);

// Cross-resource grants
const keyVault = new KeyVault(stack, 'Secrets', {...});
keyVault.grantSecretsRead(functionApp);

// Cosmos DB grants
const cosmos = new CosmosAccount(stack, 'Database', {...});
cosmos.grantDataRead(functionApp);

// The function app automatically gets a system-assigned identity
// Role assignments are created with proper ARM expressions
```

## Related Decisions

- ADR-007: Resource Object Pattern - Defines base resource architecture
- ADR-006: Azure Functions Architecture - Defines identity patterns for functions
- Identity Module - Existing managed identity support

## References

- [Azure RBAC Documentation](https://docs.microsoft.com/en-us/azure/role-based-access-control/)
- [Azure Built-in Roles](https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles)
- [AWS CDK Grants](https://docs.aws.amazon.com/cdk/latest/guide/permissions.html)
- [ARM Role Assignments](https://docs.microsoft.com/en-us/azure/templates/microsoft.authorization/roleassignments)