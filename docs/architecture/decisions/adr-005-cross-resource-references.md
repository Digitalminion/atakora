# ADR-004: Cross-Resource Reference Pattern

**Status**: Accepted
**Date**: 2025-10-04
**Author**: Becky (Staff Architect)
**Deciders**: Architecture Team
**Context**: Bug #1211551574717809 - Private Endpoints missing subnet IDs and connection details

---

## Context and Problem Statement

Azure resources frequently need to reference other resources (e.g., Private Endpoints connecting to subnets and target services, App Services linking to App Service Plans, Subnets belonging to Virtual Networks). We need a consistent, type-safe pattern for L2 constructs to reference each other that:

1. **Enables construct-to-construct references** - Developers should pass construct objects, not raw IDs
2. **Supports both construct and string IDs** - For imported/existing resources
3. **Generates proper ARM template references** - Using `resourceId()` functions or direct IDs
4. **Maintains type safety** - TypeScript types should prevent invalid references
5. **Handles cross-stack references** - Resources in different stacks/RGs must work
6. **Supports synthesis-time validation** - Catch missing or invalid references early

**Current Problem**: The Private Endpoint construct accepts references but doesn't properly pass them to the underlying L1 construct, resulting in incomplete ARM templates.

---

## Decision Drivers

- **Developer Experience**: Minimize boilerplate, maximize IntelliSense support
- **Type Safety**: Compile-time errors for invalid resource combinations
- **ARM Template Correctness**: Generate valid `resourceId()` or dependency references
- **Flexibility**: Support both strongly-typed constructs and escape-hatch string IDs
- **Cross-Stack Support**: Enable resources to reference across ResourceGroup boundaries
- **Synthesis Validation**: Fail fast during `synth` rather than at deployment time

---

## Considered Options

### Option 1: Duck-Typed Interfaces (Current Approach)

```typescript
export interface ISubnet {
  readonly subnetId: string;
}

// Usage
constructor(scope: Construct, id: string, props: {
  subnet: ISubnet | string;
})
```

**Pros**:

- ✅ Simple, minimal typing
- ✅ Easy to implement imported resources
- ✅ Works with any object that has the right shape

**Cons**:

- ❌ No compile-time validation of resource types
- ❌ Easy to pass wrong resource type
- ❌ No IntelliSense for allowed resource types
- ❌ Difficult to enforce cross-resource compatibility

---

### Option 2: Generic Reference Type with Resource Type Constraint

```typescript
export interface IResource {
  readonly resourceId: string;
  readonly resourceType: string; // e.g., "Microsoft.Network/subnets"
}

export class ResourceReference<T extends IResource> {
  private constructor(
    public readonly resource: T | string,
    public readonly expectedType?: string
  ) {}

  static fromConstruct<T extends IResource>(resource: T): ResourceReference<T> {
    return new ResourceReference(resource);
  }

  static fromResourceId(resourceId: string, type: string): ResourceReference<IResource> {
    return new ResourceReference(resourceId, type);
  }

  resolve(): string {
    if (typeof this.resource === 'string') {
      return this.resource;
    }
    return this.resource.resourceId;
  }
}

// Usage
constructor(scope: Construct, id: string, props: {
  subnet: ResourceReference<ISubnet>;
})
```

**Pros**:

- ✅ Strong type safety at construct boundaries
- ✅ Explicit resource type expectations
- ✅ Supports validation during synthesis

**Cons**:

- ❌ More verbose for developers
- ❌ Requires wrapping all references
- ❌ Less ergonomic API

---

### Option 3: Union Types with Runtime Validation (RECOMMENDED)

```typescript
// Define domain-specific interfaces
export interface ISubnet {
  readonly subnetId: string;
  readonly subnetName?: string;
}

export interface IStorageAccount {
  readonly storageAccountId: string;
  readonly storageAccountName: string;
}

// L2 Construct accepts union type
export interface PrivateEndpointProps {
  // Accept construct OR string
  readonly subnet: ISubnet | string;

  // Accept any private-link-enabled resource OR string
  readonly targetResource: IPrivateLinkResource | string;

  // Service-specific group IDs
  readonly groupIds: string[];
}

// Runtime resolution methods
private resolveSubnetId(subnet: ISubnet | string): string {
  if (typeof subnet === 'string') {
    return subnet;
  }

  if (!subnet.subnetId) {
    throw new Error('Invalid subnet reference: missing subnetId property');
  }

  return subnet.subnetId;
}

private resolveResourceId(resource: IPrivateLinkResource | string): string {
  if (typeof resource === 'string') {
    return resource;
  }

  if (!resource.resourceId) {
    throw new Error('Invalid resource reference: missing resourceId property');
  }

  return resource.resourceId;
}
```

**Pros**:

- ✅ Clean, intuitive API - `subnet: mySubnet` or `subnet: "/subscriptions/..."`
- ✅ TypeScript IntelliSense guides developers
- ✅ Runtime validation catches errors during synth
- ✅ Easy to support imported resources (`.fromXxx()` factory methods)
- ✅ Balances type safety with flexibility

**Cons**:

- ⚠️ Type validation happens at runtime, not compile-time
- ⚠️ Requires explicit runtime checks in each construct

---

## Decision Outcome

**Chosen Option: Option 3 - Union Types with Runtime Validation**

This approach provides the best balance of:

- **Developer ergonomics** - Natural TypeScript syntax
- **Type safety** - IntelliSense + runtime validation
- **Flexibility** - Supports both constructs and raw IDs
- **Error prevention** - Fails during synth, not deployment

---

## Implementation Guidelines

### 1. **Define Duck-Typed Interfaces for Each Resource Type**

```typescript
// packages/lib/src/resources/subnet/types.ts
export interface ISubnet {
  readonly subnetId: string;
  readonly subnetName?: string;
  readonly addressPrefix?: string;
}

// packages/lib/src/resources/storage-account/types.ts
export interface IStorageAccount extends IPrivateLinkResource {
  readonly storageAccountId: string;
  readonly storageAccountName: string;
}

// Common interface for all private-link-enabled resources
export interface IPrivateLinkResource {
  readonly resourceId: string;
}
```

**Pattern**: Each resource type exports an `IResourceName` interface with:

- **Required**: Primary resource ID property (`subnetId`, `storageAccountId`, etc.)
- **Optional**: Additional metadata useful for references (`name`, `location`, etc.)

---

### 2. **Accept Union Types in L2 Construct Props**

```typescript
export interface PrivateEndpointProps {
  /**
   * Subnet where the private endpoint will be created.
   *
   * @remarks
   * Can be:
   * - A Subnet construct: `subnet: mySubnet`
   * - An imported subnet: `subnet: Subnet.fromSubnetId(scope, 'Imported', '/subscriptions/...')`
   * - A resource ID string: `subnet: "/subscriptions/.../subnets/snet-01"`
   */
  readonly subnet: ISubnet | string;

  /**
   * Target resource for private link connection.
   *
   * @remarks
   * Can be any private-link-enabled resource:
   * - Storage Account: `targetResource: storageAccount`
   * - Key Vault: `targetResource: keyVault`
   * - Cosmos DB: `targetResource: cosmosDb`
   * - Resource ID string: `targetResource: "/subscriptions/.../storageAccounts/mystg"`
   */
  readonly targetResource: IPrivateLinkResource | string;

  /**
   * Service-specific sub-resource group IDs.
   *
   * @remarks
   * Examples:
   * - Storage blob: `groupIds: ['blob']`
   * - Key Vault: `groupIds: ['vault']`
   * - Cosmos SQL: `groupIds: ['Sql']`
   */
  readonly groupIds: string[];
}
```

---

### 3. **Implement Resolution Methods with Validation**

```typescript
export class PrivateEndpoint extends Construct {
  constructor(scope: Construct, id: string, props: PrivateEndpointProps) {
    super(scope, id);

    // Resolve references with validation
    const subnetId = this.resolveSubnetId(props.subnet);
    const resourceId = this.resolveResourceId(props.targetResource);

    // Validate group IDs
    if (!props.groupIds || props.groupIds.length === 0) {
      throw new Error('At least one groupId is required for private endpoint connection');
    }

    // Pass to L1 construct
    this.armPrivateEndpoint = new ArmPrivateEndpoint(scope, `${id}-Resource`, {
      privateEndpointName: this.privateEndpointName,
      location: this.location,
      subnet: {
        id: subnetId, // ✅ Now properly passed!
      },
      privateLinkServiceConnections: [
        {
          name: props.connectionName || `${this.privateEndpointName}-connection`,
          privateLinkServiceId: resourceId, // ✅ Now properly passed!
          groupIds: props.groupIds, // ✅ Now properly passed!
        },
      ],
    });
  }

  /**
   * Resolves subnet reference to resource ID.
   */
  private resolveSubnetId(subnet: ISubnet | string): string {
    if (typeof subnet === 'string') {
      // Validate string format (basic check)
      if (!subnet.includes('/subnets/')) {
        throw new Error(
          `Invalid subnet ID format: ${subnet}. ` +
            `Expected format: /subscriptions/.../virtualNetworks/.../subnets/...`
        );
      }
      return subnet;
    }

    // Validate construct has required property
    if (!subnet.subnetId) {
      throw new Error('Invalid subnet reference: missing subnetId property');
    }

    return subnet.subnetId;
  }

  /**
   * Resolves target resource reference to resource ID.
   */
  private resolveResourceId(resource: IPrivateLinkResource | string): string {
    if (typeof resource === 'string') {
      // Basic validation - should be a full ARM resource ID
      if (!resource.startsWith('/subscriptions/')) {
        throw new Error(
          `Invalid resource ID format: ${resource}. ` +
            `Expected format: /subscriptions/.../resourceGroups/.../providers/Microsoft.*/...`
        );
      }
      return resource;
    }

    // Validate construct has required property
    if (!resource.resourceId) {
      throw new Error('Invalid resource reference: missing resourceId property');
    }

    return resource.resourceId;
  }
}
```

---

### 4. **Provide Factory Methods for Imported Resources**

```typescript
export class PrivateEndpoint extends Construct implements IPrivateEndpoint {
  /**
   * Import an existing private endpoint by resource ID.
   *
   * @param scope - Parent construct
   * @param id - Unique construct ID
   * @param privateEndpointId - Full ARM resource ID
   * @returns IPrivateEndpoint reference
   */
  public static fromPrivateEndpointId(
    scope: Construct,
    id: string,
    privateEndpointId: string
  ): IPrivateEndpoint {
    class ImportedPrivateEndpoint extends Construct implements IPrivateEndpoint {
      public readonly privateEndpointId = privateEndpointId;
      public readonly privateEndpointName: string;
      public readonly location = 'unknown'; // Cannot infer from ID

      constructor() {
        super(scope, id);

        // Extract name from resource ID
        const parts = privateEndpointId.split('/');
        this.privateEndpointName = parts[parts.length - 1] || 'unknown';
      }
    }

    return new ImportedPrivateEndpoint();
  }
}
```

**Pattern**: Every L2 construct should provide:

- `fromResourceId(scope, id, resourceId)` - Import by full ARM ID
- `fromResourceName(scope, id, name, resourceGroup?)` - Import by name (constructs ID)

---

### 5. **Synthesis-Time Validation in Grace's Pipeline**

Grace's synthesis transformer should validate cross-resource references:

```typescript
// synthesis/validate/reference-validator.ts
export class ReferenceValidator {
  /**
   * Validates that all resource references resolve to valid IDs.
   */
  validate(resource: ArmResource): ValidationResult {
    const errors: ValidationError[] = [];

    // Check for missing subnet references in Private Endpoints
    if (resource.type === 'Microsoft.Network/privateEndpoints') {
      if (!resource.properties?.subnet?.id) {
        errors.push({
          path: `${resource.name}.properties.subnet.id`,
          message: 'Private endpoint is missing required subnet reference',
          severity: 'error',
        });
      }

      if (!resource.properties?.privateLinkServiceConnections?.[0]) {
        errors.push({
          path: `${resource.name}.properties.privateLinkServiceConnections`,
          message: 'Private endpoint is missing privateLinkServiceConnections',
          severity: 'error',
        });
      }
    }

    // Check for missing serverFarmId in App Services
    if (resource.type === 'Microsoft.Web/sites') {
      if (!resource.properties?.serverFarmId) {
        errors.push({
          path: `${resource.name}.properties.serverFarmId`,
          message: 'App Service is missing required serverFarmId reference',
          severity: 'error',
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }
}
```

---

## Cross-Resource Reference Examples

### Example 1: Private Endpoint to Storage Account

```typescript
import { StorageAccount, PrivateEndpoint, Subnet } from '@atakora/lib';

// Create resources
const storageAccount = new StorageAccount(resourceGroup, 'DataStorage', {
  storageAccountName: 'mystorageaccount',
  sku: 'Standard_LRS',
});

const subnet = new Subnet(vnet, 'PrivateEndpointSubnet', {
  subnetName: 'snet-pe',
  addressPrefix: '10.0.2.0/24',
});

// ✅ Strongly-typed construct references
const privateEndpoint = new PrivateEndpoint(resourceGroup, 'StoragePE', {
  subnet: subnet, // Subnet construct
  targetResource: storageAccount, // StorageAccount construct
  groupIds: ['blob'],
});
```

**Generated ARM Template**:

```json
{
  "type": "Microsoft.Network/privateEndpoints",
  "apiVersion": "2023-11-01",
  "name": "pe-datastorage-...",
  "properties": {
    "subnet": {
      "id": "[resourceId('Microsoft.Network/virtualNetworks/subnets', 'vnet-...', 'snet-pe')]"
    },
    "privateLinkServiceConnections": [
      {
        "name": "pe-datastorage-connection",
        "properties": {
          "privateLinkServiceId": "[resourceId('Microsoft.Storage/storageAccounts', 'mystorageaccount')]",
          "groupIds": ["blob"]
        }
      }
    ]
  }
}
```

---

### Example 2: Imported Resources (Existing Infrastructure)

```typescript
// Import existing subnet by ID
const existingSubnet = Subnet.fromSubnetId(
  resourceGroup,
  'ImportedSubnet',
  '/subscriptions/xxx/resourceGroups/rg-network/providers/Microsoft.Network/virtualNetworks/vnet-prod/subnets/snet-pe'
);

// Import existing storage account
const existingStorage = StorageAccount.fromStorageAccountId(
  resourceGroup,
  'ImportedStorage',
  '/subscriptions/xxx/resourceGroups/rg-data/providers/Microsoft.Storage/storageAccounts/prodstorageaccount'
);

// ✅ Works with imported resources
const privateEndpoint = new PrivateEndpoint(resourceGroup, 'ImportedPE', {
  subnet: existingSubnet,
  targetResource: existingStorage,
  groupIds: ['blob'],
});
```

---

### Example 3: Escape Hatch with Raw IDs

```typescript
// ✅ Direct string IDs for maximum flexibility
const privateEndpoint = new PrivateEndpoint(resourceGroup, 'ManualPE', {
  subnet: '/subscriptions/.../subnets/snet-pe-01',
  targetResource: '/subscriptions/.../storageAccounts/mystg',
  groupIds: ['blob'],
});
```

---

## Validation Strategy

### Compile-Time Validation (TypeScript)

- ✅ IntelliSense shows valid property names (`subnetId`, `resourceId`)
- ✅ Type errors for passing wrong construct types
- ✅ Required properties enforced at type level

### Synth-Time Validation (Runtime)

- ✅ Validate resource ID format (basic pattern matching)
- ✅ Check required properties exist on construct references
- ✅ Validate cross-resource compatibility (e.g., groupIds match target resource type)
- ✅ Fail fast with actionable error messages

### Synthesis Validation (Grace's Pipeline)

- ✅ Verify all references resolved to valid IDs in ARM template
- ✅ Check `dependsOn` arrays are complete
- ✅ Validate cross-stack references use correct scope

---

## Consequences

### Positive

- ✅ **Consistent pattern** across all cross-resource references
- ✅ **Type-safe** with good IntelliSense support
- ✅ **Flexible** - supports constructs, imports, and raw IDs
- ✅ **Early validation** - errors caught during synth
- ✅ **Clear error messages** - actionable feedback to developers
- ✅ **Extensible** - easy to add new resource types

### Negative

- ⚠️ **Runtime validation required** - adds overhead to construct initialization
- ⚠️ **Boilerplate resolution methods** - each construct needs resolve methods
- ⚠️ **Duck typing risks** - wrong object shapes only caught at runtime

### Neutral

- ℹ️ Requires all L2 constructs to implement resolution pattern consistently
- ℹ️ Requires Grace to implement synthesis-time reference validation
- ℹ️ Requires documentation of common `groupIds` for each service type

---

## Implementation Checklist

- [ ] **Devon**: Update `PrivateEndpoint` to use resolution pattern (Bug #1211551574717809)
- [ ] **Devon**: Update `AppService` to resolve `appServicePlan` reference (Bug #1211551573124866)
- [ ] **Devon**: Update `Subnet` to resolve `virtualNetwork` parent reference (Bug #1211551663893501)
- [ ] **Grace**: Implement `ReferenceValidator` in synthesis pipeline
- [ ] **Grace**: Add cross-resource dependency resolution to `DependencyResolver`
- [ ] **Felix**: Validate ARM schema compliance for all reference properties
- [ ] **Charlie**: Create E2E tests for cross-resource references
- [ ] **Ella**: Document reference patterns and common `groupIds` in user guides

---

## Related Decisions

- **ADR-001**: CLI Configuration & Authentication (how resources get deployed)
- **ADR-002**: Template Synthesis Pipeline (how constructs become ARM templates)
- **ADR-003**: Deployment Orchestration (how cross-stack references are deployed)
- **Future**: ADR for cross-stack reference pattern (using outputs/parameters)

---

## References

- [Azure Private Endpoint Documentation](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-overview)
- [ARM Template resourceId Function](https://learn.microsoft.com/en-us/azure/azure-resource-manager/templates/template-functions-resource#resourceid)
- [TypeScript Duck Typing](https://www.typescriptlang.org/docs/handbook/interfaces.html#excess-property-checks)
- [AWS CDK Cross-Stack References](https://docs.aws.amazon.com/cdk/v2/guide/resources.html#resources_referencing)
