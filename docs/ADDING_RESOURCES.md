# Adding New Resources Guide

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Development Workflow](#development-workflow)
- [Step-by-Step Guide](#step-by-step-guide)
- [L1 Construct Generation](#l1-construct-generation)
- [L2 Construct Development](#l2-construct-development)
- [Testing Requirements](#testing-requirements)
- [Documentation Requirements](#documentation-requirements)
- [Integration Checklist](#integration-checklist)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## Overview

This guide explains how to add support for new Azure resources to the atakora library. The process involves generating L1 (low-level) constructs from ARM schemas and creating L2 (intent-based) constructs with sensible defaults.

### Resource Abstraction Levels

```
L3: Pattern Constructs (future)
     - Complete architectures
     - Minimal configuration required
        ↓
L2: Intent-Based Constructs (what you'll build)
     - Developer-friendly API
     - Sensible defaults
     - Auto-naming
        ↓
L1: Low-Level ARM Constructs (auto-generated)
     - Direct ARM mapping
     - Generated from schemas
     - Complete control
        ↓
ARM Templates (JSON output)
```

## Prerequisites

### Knowledge Requirements

- TypeScript development experience
- Understanding of Azure Resource Manager (ARM) templates
- Familiarity with the specific Azure resource you're adding
- Basic understanding of the construct tree pattern

### Development Environment

```bash
# Clone the repository
git clone <repository-url>
cd atakora

# Install dependencies
npm install

# Build the project
npm run build

# Run tests to ensure environment is working
npm test
```

### Required Tools

- Node.js >= 18.0.0
- npm >= 9.0.0
- TypeScript >= 5.9.0
- Git

### Clone ARM Schemas Repository

```bash
# Clone the official Azure ARM schemas repository
cd ..
git clone https://github.com/Azure/azure-resource-manager-schemas.git azure-resource-manager-schemas-main
cd atakora
```

## Development Workflow

### High-Level Process

```
1. Find ARM Schema
       ↓
2. Generate L1 Construct (automated)
       ↓
3. Create types.ts (manual)
       ↓
4. Build L2 Construct (manual)
       ↓
5. Write Tests (manual)
       ↓
6. Add Documentation (manual)
       ↓
7. Update Exports (manual)
       ↓
8. Verify & Submit (manual)
```

### Time Estimates

- **Simple Resource** (e.g., NSG): 2-4 hours
- **Medium Resource** (e.g., Storage Account): 4-8 hours
- **Complex Resource** (e.g., AKS Cluster): 1-2 days

## Step-by-Step Guide

### Step 1: Find the ARM Schema

ARM schemas are organized by resource provider and API version.

**Schema Location**:
```
azure-resource-manager-schemas-main/schemas/{api-version}/{provider}.json
```

**Example**:
```
azure-resource-manager-schemas-main/schemas/2023-11-01/Microsoft.Compute.json
```

**Find Available Resources**:
```bash
cd packages/lib
npm run build
npm run codegen:resource ../../azure-resource-manager-schemas-main/schemas/2023-11-01/Microsoft.Compute.json
```

**Output**:
```
Available resources in schema:
[0] Microsoft.Compute/virtualMachines
[1] Microsoft.Compute/disks
[2] Microsoft.Compute/availabilitySets
...
```

### Step 2: Generate L1 Construct

Use the code generation tool to create the L1 construct.

**Command**:
```bash
npm run codegen:resource <schema-path> <resource-index> [output-dir]
```

**Example**:
```bash
# Generate Virtual Machine construct
npm run codegen:resource \
  ../../azure-resource-manager-schemas-main/schemas/2023-11-01/Microsoft.Compute.json \
  0 \
  src/resources/virtual-machine
```

**Generated Files**:
```
src/resources/virtual-machine/
└── arm-virtual-machine.ts    # L1 construct implementation
```

**What's Generated**:
- L1 construct class extending `Resource`
- Properties interface matching ARM schema
- Constructor with property validation
- `toArmTemplate()` method for synthesis
- TypeScript types for all properties

### Step 3: Create Types File

Create a `types.ts` file for enums, complex types, and type exports.

**File**: `packages/lib/src/resources/virtual-machine/types.ts`

**Example**:
```typescript
/**
 * Virtual Machine SKU sizes.
 */
export enum VirtualMachineSku {
  STANDARD_B1S = 'Standard_B1s',
  STANDARD_B2S = 'Standard_B2s',
  STANDARD_D2S_V3 = 'Standard_D2s_v3',
  STANDARD_D4S_V3 = 'Standard_D4s_v3',
  STANDARD_D8S_V3 = 'Standard_D8s_v3',
}

/**
 * Virtual Machine operating system types.
 */
export enum VirtualMachineOSType {
  LINUX = 'Linux',
  WINDOWS = 'Windows',
}

/**
 * Storage account type for VM disks.
 */
export enum VirtualMachineDiskType {
  STANDARD_LRS = 'Standard_LRS',
  STANDARD_SSD_LRS = 'StandardSSD_LRS',
  PREMIUM_SSD_LRS = 'Premium_LRS',
  ULTRA_SSD_LRS = 'UltraSSD_LRS',
}

/**
 * Properties for creating a Virtual Machine (L2 construct).
 */
export interface VirtualMachineProps {
  /**
   * VM size (SKU).
   * @default VirtualMachineSku.STANDARD_D2S_V3
   */
  readonly size?: VirtualMachineSku;

  /**
   * Operating system type.
   */
  readonly osType: VirtualMachineOSType;

  /**
   * OS disk type.
   * @default VirtualMachineDiskType.STANDARD_SSD_LRS
   */
  readonly osDiskType?: VirtualMachineDiskType;

  /**
   * Network interface ID.
   */
  readonly networkInterfaceId: string;

  /**
   * Admin username.
   */
  readonly adminUsername: string;

  /**
   * SSH public key (for Linux VMs).
   */
  readonly sshPublicKey?: string;

  /**
   * Admin password (for Windows VMs).
   */
  readonly adminPassword?: string;

  /**
   * Resource tags.
   */
  readonly tags?: Record<string, string>;
}
```

**Best Practices**:
- Use enums for fixed value sets
- Provide JSDoc comments for all types
- Include default values in documentation
- Group related types together
- Export all public types

### Step 4: Build L2 Construct

Create the developer-friendly L2 construct with sensible defaults and auto-naming.

**File**: `packages/lib/src/resources/virtual-machine/virtual-machine.ts`

**Template**:
```typescript
import { Construct } from '../../core/construct';
import { Resource } from '../../core/resource';
import { ArmVirtualMachine } from './arm-virtual-machine';
import {
  VirtualMachineProps,
  VirtualMachineSku,
  VirtualMachineOSType,
  VirtualMachineDiskType,
} from './types';

/**
 * Represents an Azure Virtual Machine (L2 construct).
 *
 * @remarks
 * This construct provides a simplified interface for creating Azure VMs
 * with sensible defaults and automatic naming based on context.
 *
 * @example
 * ```typescript
 * const vm = new VirtualMachine(resourceGroup, 'AppVM', {
 *   osType: VirtualMachineOSType.LINUX,
 *   networkInterfaceId: nic.id,
 *   adminUsername: 'azureuser',
 *   sshPublicKey: 'ssh-rsa AAAA...',
 * });
 * ```
 */
export class VirtualMachine extends Resource {
  /**
   * The underlying L1 construct.
   */
  private readonly armResource: ArmVirtualMachine;

  /**
   * ARM resource type.
   */
  public readonly resourceType = 'Microsoft.Compute/virtualMachines';

  /**
   * Azure resource ID.
   */
  public readonly resourceId: string;

  /**
   * Virtual machine name.
   */
  public readonly name: string;

  /**
   * Virtual machine size (SKU).
   */
  public readonly size: VirtualMachineSku;

  /**
   * Operating system type.
   */
  public readonly osType: VirtualMachineOSType;

  /**
   * Creates a new Virtual Machine.
   *
   * @param scope - Parent construct (usually a ResourceGroup)
   * @param id - Construct ID
   * @param props - Virtual machine properties
   */
  constructor(scope: Construct, id: string, props: VirtualMachineProps) {
    super(scope, id);

    // Get context from scope
    const context = this.getContext();

    // Apply defaults
    this.size = props.size ?? VirtualMachineSku.STANDARD_D2S_V3;
    this.osType = props.osType;

    // Generate name using naming convention
    this.name = context.naming.generateName('vm', id);

    // Build resource ID
    this.resourceId = `${context.subscription.id}/resourceGroups/${context.resourceGroupName}/providers/Microsoft.Compute/virtualMachines/${this.name}`;

    // Validate properties
    this.validateProps(props);

    // Create underlying L1 construct
    this.armResource = new ArmVirtualMachine(this, 'Resource', {
      virtualMachineName: this.name,
      location: context.geography.region,
      hardwareProfile: {
        vmSize: this.size,
      },
      osProfile: {
        computerName: this.name,
        adminUsername: props.adminUsername,
        ...(props.osType === VirtualMachineOSType.LINUX
          ? {
              linuxConfiguration: {
                disablePasswordAuthentication: true,
                ssh: {
                  publicKeys: [
                    {
                      path: `/home/${props.adminUsername}/.ssh/authorized_keys`,
                      keyData: props.sshPublicKey!,
                    },
                  ],
                },
              },
            }
          : {
              adminPassword: props.adminPassword,
            }),
      },
      storageProfile: {
        osDisk: {
          createOption: 'FromImage',
          managedDisk: {
            storageAccountType: props.osDiskType ?? VirtualMachineDiskType.STANDARD_SSD_LRS,
          },
        },
      },
      networkProfile: {
        networkInterfaces: [
          {
            id: props.networkInterfaceId,
            primary: true,
          },
        ],
      },
      tags: {
        ...context.tags,
        ...props.tags,
      },
    });
  }

  /**
   * Validates virtual machine properties.
   *
   * @param props - Properties to validate
   * @throws Error if validation fails
   */
  private validateProps(props: VirtualMachineProps): void {
    // Validate Linux SSH key
    if (props.osType === VirtualMachineOSType.LINUX && !props.sshPublicKey) {
      throw new Error('sshPublicKey is required for Linux VMs');
    }

    // Validate Windows password
    if (props.osType === VirtualMachineOSType.WINDOWS && !props.adminPassword) {
      throw new Error('adminPassword is required for Windows VMs');
    }

    // Validate admin username
    if (!props.adminUsername || props.adminUsername.length < 1) {
      throw new Error('adminUsername is required');
    }
  }

  /**
   * Gets the private IP address of the VM (from first NIC).
   *
   * @returns Private IP address or undefined if not available
   */
  public get privateIpAddress(): string | undefined {
    // Implementation depends on network interface reference
    return undefined;
  }
}
```

**Key Features**:
- Extends `Resource` base class
- Uses auto-naming from context
- Applies sensible defaults
- Validates properties
- Wraps L1 construct
- Provides helper methods/properties
- Comprehensive JSDoc comments

### Step 5: Create Index File

Export the L2 construct and types.

**File**: `packages/lib/src/resources/virtual-machine/index.ts`

```typescript
/**
 * Azure Virtual Machine resources.
 *
 * @packageDocumentation
 */

export * from './types';
export * from './virtual-machine';
export * from './arm-virtual-machine';
```

### Step 6: Write Tests

Create comprehensive tests for both L1 and L2 constructs.

#### L1 Construct Tests

**File**: `packages/lib/src/resources/virtual-machine/arm-virtual-machine.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { ResourceGroup } from '../resource-group';
import { ArmVirtualMachine } from './arm-virtual-machine';

describe('ArmVirtualMachine', () => {
  it('should create ARM virtual machine with required properties', () => {
    const app = new App();
    const stack = new SubscriptionStack(app, 'TestStack', {
      /* context */
    });
    const rg = new ResourceGroup(stack, 'TestRG');

    const vm = new ArmVirtualMachine(rg, 'TestVM', {
      virtualMachineName: 'test-vm',
      location: 'eastus',
      hardwareProfile: {
        vmSize: 'Standard_D2s_v3',
      },
      osProfile: {
        computerName: 'test-vm',
        adminUsername: 'azureuser',
      },
      storageProfile: {
        osDisk: {
          createOption: 'FromImage',
          managedDisk: {
            storageAccountType: 'Standard_LRS',
          },
        },
      },
      networkProfile: {
        networkInterfaces: [
          {
            id: '/subscriptions/.../networkInterfaces/test-nic',
          },
        ],
      },
    });

    expect(vm.resourceType).toBe('Microsoft.Compute/virtualMachines');
    expect(vm.name).toBe('test-vm');
  });

  it('should generate valid ARM template', () => {
    const app = new App();
    const stack = new SubscriptionStack(app, 'TestStack', {
      /* context */
    });
    const rg = new ResourceGroup(stack, 'TestRG');

    const vm = new ArmVirtualMachine(rg, 'TestVM', {
      /* props */
    });

    const template = vm.toArmTemplate();

    expect(template).toHaveProperty('type', 'Microsoft.Compute/virtualMachines');
    expect(template).toHaveProperty('apiVersion');
    expect(template).toHaveProperty('name');
    expect(template).toHaveProperty('location');
    expect(template).toHaveProperty('properties');
  });
});
```

#### L2 Construct Tests

**File**: `packages/lib/src/resources/virtual-machine/virtual-machine.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { ResourceGroup } from '../resource-group';
import { VirtualMachine } from './virtual-machine';
import { VirtualMachineOSType, VirtualMachineSku } from './types';

describe('VirtualMachine', () => {
  it('should create virtual machine with auto-generated name', () => {
    const app = new App();
    const stack = new SubscriptionStack(app, 'TestStack', {
      /* context */
    });
    const rg = new ResourceGroup(stack, 'TestRG');

    const vm = new VirtualMachine(rg, 'AppVM', {
      osType: VirtualMachineOSType.LINUX,
      networkInterfaceId: '/subscriptions/.../networkInterfaces/test-nic',
      adminUsername: 'azureuser',
      sshPublicKey: 'ssh-rsa AAAA...',
    });

    expect(vm.name).toMatch(/^vm-/);
    expect(vm.resourceType).toBe('Microsoft.Compute/virtualMachines');
  });

  it('should apply default VM size', () => {
    const app = new App();
    const stack = new SubscriptionStack(app, 'TestStack', {
      /* context */
    });
    const rg = new ResourceGroup(stack, 'TestRG');

    const vm = new VirtualMachine(rg, 'AppVM', {
      osType: VirtualMachineOSType.LINUX,
      networkInterfaceId: '/subscriptions/.../networkInterfaces/test-nic',
      adminUsername: 'azureuser',
      sshPublicKey: 'ssh-rsa AAAA...',
    });

    expect(vm.size).toBe(VirtualMachineSku.STANDARD_D2S_V3);
  });

  it('should throw error for Linux VM without SSH key', () => {
    const app = new App();
    const stack = new SubscriptionStack(app, 'TestStack', {
      /* context */
    });
    const rg = new ResourceGroup(stack, 'TestRG');

    expect(() => {
      new VirtualMachine(rg, 'AppVM', {
        osType: VirtualMachineOSType.LINUX,
        networkInterfaceId: '/subscriptions/.../networkInterfaces/test-nic',
        adminUsername: 'azureuser',
        // Missing sshPublicKey
      });
    }).toThrow('sshPublicKey is required for Linux VMs');
  });

  it('should throw error for Windows VM without password', () => {
    const app = new App();
    const stack = new SubscriptionStack(app, 'TestStack', {
      /* context */
    });
    const rg = new ResourceGroup(stack, 'TestRG');

    expect(() => {
      new VirtualMachine(rg, 'AppVM', {
        osType: VirtualMachineOSType.WINDOWS,
        networkInterfaceId: '/subscriptions/.../networkInterfaces/test-nic',
        adminUsername: 'azureadmin',
        // Missing adminPassword
      });
    }).toThrow('adminPassword is required for Windows VMs');
  });

  it('should merge tags from context and props', () => {
    const app = new App();
    const stack = new SubscriptionStack(app, 'TestStack', {
      /* context with tags */
      tags: {
        environment: 'test',
        managed_by: 'atakora',
      },
    });
    const rg = new ResourceGroup(stack, 'TestRG');

    const vm = new VirtualMachine(rg, 'AppVM', {
      osType: VirtualMachineOSType.LINUX,
      networkInterfaceId: '/subscriptions/.../networkInterfaces/test-nic',
      adminUsername: 'azureuser',
      sshPublicKey: 'ssh-rsa AAAA...',
      tags: {
        component: 'application',
      },
    });

    // Tags should be merged (implementation specific)
    expect(vm.tags).toBeDefined();
  });
});
```

#### Test Coverage Requirements

- **Minimum Coverage**: 80% lines, 80% functions, 75% branches
- **Unit Tests**: All public methods and properties
- **Integration Tests**: Cross-resource interactions
- **Error Cases**: Validation errors, invalid inputs
- **Edge Cases**: Boundary conditions, optional parameters

### Step 7: Add Documentation

Document the resource in code and create usage examples.

#### JSDoc Comments

- All public classes, interfaces, enums
- All public methods and properties
- Include `@remarks`, `@example`, `@param`, `@returns`, `@throws`

#### Usage Examples

**File**: `packages/lib/src/examples/virtual-machine.example.ts`

```typescript
/**
 * Example: Creating Virtual Machines
 *
 * @remarks
 * Demonstrates how to create and configure Azure Virtual Machines
 * using the atakora library.
 *
 * @packageDocumentation
 */

import { App, SubscriptionStack, ResourceGroup, VirtualNetwork, Subnet } from '../index';
import { VirtualMachine, VirtualMachineOSType } from '../resources/virtual-machine';

export function createLinuxVM(): App {
  const app = new App();

  const stack = new SubscriptionStack(app, 'VMStack', {
    /* context */
  });

  const rg = new ResourceGroup(stack, 'VMRG');
  const vnet = new VirtualNetwork(rg, 'VMVNet', {
    addressSpace: '10.0.0.0/16',
  });

  const vm = new VirtualMachine(rg, 'AppVM', {
    osType: VirtualMachineOSType.LINUX,
    networkInterfaceId: '...',
    adminUsername: 'azureuser',
    sshPublicKey: 'ssh-rsa AAAA...',
  });

  return app;
}
```

### Step 8: Update Exports

Add the new resource to the main library exports.

**File**: `packages/lib/src/index.ts`

```typescript
// ... existing exports

// Virtual Machine
export * from './resources/virtual-machine';
```

### Step 9: Run Quality Checks

Ensure all quality gates pass before submitting.

```bash
# Build
npm run build

# Run tests
npm test

# Check coverage
npm run coverage

# Lint
npm run lint

# Type check
npm run typecheck

# Format
npm run format

# Run all quality checks
npm run quality
```

### Step 10: Create Pull Request

Follow the Git workflow to submit your changes.

```bash
# Create feature branch
git checkout -b feat/add-virtual-machine-resource

# Stage changes
git add packages/lib/src/resources/virtual-machine/
git add packages/lib/src/index.ts
git add packages/lib/src/examples/virtual-machine.example.ts

# Commit (pre-commit hooks will run)
git commit -m "feat: add Virtual Machine resource

- Generate L1 construct from ARM schema
- Implement L2 construct with auto-naming
- Add comprehensive tests
- Add usage examples and documentation

Closes #123"

# Push to remote
git push origin feat/add-virtual-machine-resource

# Create pull request via GitHub CLI or web interface
gh pr create --title "feat: Add Virtual Machine resource" --body "..."
```

## Integration Checklist

Use this checklist to ensure your resource implementation is complete:

### Code Implementation

- [ ] L1 construct generated from ARM schema
- [ ] `types.ts` created with enums and interfaces
- [ ] L2 construct implemented with auto-naming
- [ ] Sensible defaults applied
- [ ] Property validation implemented
- [ ] Helper methods/properties added (if applicable)
- [ ] `index.ts` exports all public types

### Testing

- [ ] L1 construct tests written
- [ ] L2 construct tests written
- [ ] Error cases tested
- [ ] Edge cases tested
- [ ] Code coverage >= 80%
- [ ] All tests passing

### Documentation

- [ ] JSDoc comments on all public APIs
- [ ] Usage examples created
- [ ] Resource added to main library exports
- [ ] README updated (if needed)

### Quality

- [ ] TypeScript builds without errors
- [ ] ESLint passes with no warnings
- [ ] Prettier formatting applied
- [ ] Type checking passes
- [ ] No `any` types without justification

### Integration

- [ ] Resource works with synthesis pipeline
- [ ] Naming convention applied correctly
- [ ] Tags inherited and merged properly
- [ ] Dependencies resolved correctly

## Examples

### Simple Resource: Network Security Group

A straightforward resource with minimal configuration.

**Complexity**: Low
**Time**: 2-3 hours

**Files**:
- `arm-network-security-group.ts` (generated)
- `types.ts`
- `network-security-group.ts`
- `index.ts`
- Tests

### Medium Resource: Storage Account

Resource with special naming constraints and multiple configuration options.

**Complexity**: Medium
**Time**: 4-6 hours

**Files**:
- `arm-storage-account.ts` (generated)
- `types.ts`
- `storage-account.ts`
- `index.ts`
- Tests

**Special Considerations**:
- Name constraints (no hyphens, 3-24 chars, lowercase)
- Multiple SKU options
- Optional features (encryption, networking)

### Complex Resource: AKS Cluster

Resource with many nested properties and complex configuration.

**Complexity**: High
**Time**: 1-2 days

**Files**:
- `arm-aks-cluster.ts` (generated)
- `types.ts`
- `aks-cluster.ts`
- `node-pool.ts` (child resource)
- `index.ts`
- Tests

**Special Considerations**:
- Multiple child resources (node pools)
- Complex networking configuration
- Identity and RBAC integration
- Monitoring and logging setup

## Troubleshooting

### Schema Not Found

**Problem**: ARM schema file doesn't exist for the resource

**Solution**: Check the Azure ARM schemas repository for the latest API version

### Code Generation Fails

**Problem**: `npm run codegen:resource` fails

**Solution**:
1. Ensure the schema file is valid JSON
2. Check that the resource index is correct
3. Verify TypeScript compilation works
4. Review error messages for specific issues

### Tests Fail

**Problem**: Tests fail after implementation

**Solution**:
1. Check that context is properly mocked in tests
2. Ensure all required properties are provided
3. Verify naming convention is applied
4. Check for type mismatches

### Type Errors

**Problem**: TypeScript compilation errors

**Solution**:
1. Ensure all imports are correct
2. Check that types match ARM schema
3. Verify exports in `index.ts`
4. Run `npm run typecheck` for detailed errors

### Coverage Below Threshold

**Problem**: Code coverage below 80%

**Solution**:
1. Add tests for untested code paths
2. Test error cases and validation
3. Test optional parameters and defaults
4. Run `npm run coverage` to see coverage report

## Best Practices

1. **Start Simple**: Begin with L1 construct, then build L2
2. **Follow Examples**: Use existing resources as templates
3. **Test Early**: Write tests as you develop
4. **Document As You Go**: Add JSDoc comments immediately
5. **Validate Properties**: Add comprehensive validation
6. **Use Defaults**: Provide sensible defaults for optional properties
7. **Consider UX**: Make the API intuitive and developer-friendly
8. **Ask for Help**: Consult team members if stuck

## Related Documentation

- [Architecture Guide](./ARCHITECTURE.md)
- [Naming Conventions](./NAMING_CONVENTIONS.md)
- [Best Practices](./BEST_PRACTICES.md)
- [Code Generation README](../packages/lib/src/codegen/README.md)

---

**Maintained by**: Team Azure ARM Priv
**Last Updated**: 2025-10-04
