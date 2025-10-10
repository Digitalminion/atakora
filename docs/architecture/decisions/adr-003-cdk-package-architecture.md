# ADR-003: CDK Package Architecture with Subpath Exports

**Status**: Accepted with Modifications
**Date**: 2025-10-08
**Author**: Becky (Staff Architect)
**Deciders**: Architecture Team
**Context**: Modular CDK package organization following Microsoft.* namespaces
**Review Date**: 2025-10-08
**Reviewer**: Becky (Staff Architect)

---

## Context

The Atakora framework currently houses all Azure resource constructs in `@atakora/lib/src/resources/`. While this monolithic structure was expedient for initial development, it creates several challenges as the framework matures:

1. **Bundle Size**: Users importing a single `StorageAccount` must include the entire library
2. **Build Performance**: Changes to any resource rebuild the entire library
3. **Unclear Organization**: Flat directory structure doesn't mirror Azure's logical resource provider grouping
4. **Discoverability**: No clear mapping between ARM resource types and package structure
5. **Versioning Rigidity**: Cannot version storage resources independently from network resources

### Microsoft's ARM Schema Organization

Microsoft organizes Azure resources using a clear namespace hierarchy:

```
Microsoft.Storage/storageAccounts
Microsoft.Network/virtualNetworks
Microsoft.Network/networkSecurityGroups
Microsoft.Compute/virtualMachines
Microsoft.Web/sites
Microsoft.KeyVault/vaults
Microsoft.Sql/servers
```

This pattern provides:
- **Logical grouping** by service category (Storage, Network, Compute, etc.)
- **Discoverability** - developers familiar with ARM know where to look
- **Clear ownership** - each namespace represents a distinct Azure service team
- **Natural versioning boundaries** - API versions can evolve per namespace

### Inspiration from AWS CDK

AWS CDK successfully uses a modular package architecture:

```typescript
import { Bucket } from '@aws-cdk/aws-s3';
import { Vpc, SecurityGroup } from '@aws-cdk/aws-ec2';
import { Function } from '@aws-cdk/aws-lambda';
```

However, AWS CDK v1 had issues:
- **Package Explosion**: 200+ separate npm packages to manage
- **Version Skew**: Mismatched versions between packages caused runtime errors
- **Installation Complexity**: Users needed to `npm install` dozens of packages

AWS CDK v2 addressed this with a **monorepo with subpath exports**:

```typescript
import { aws_s3 as s3 } from 'aws-cdk-lib';
// Single package install, tree-shakable imports
```

### Current State

**Atakora's current structure**:
```
packages/lib/
├── src/
│   ├── core/              # Base classes (App, Stack, Resource)
│   ├── synthesis/         # ARM template generation
│   ├── validation/        # Validation framework
│   ├── naming/            # Resource naming conventions
│   ├── testing/           # Test helpers
│   └── resources/         # ALL Azure resources (24 different types)
│       ├── storage-account/
│       ├── virtual-network/
│       ├── network-security-group/
│       ├── key-vault/
│       └── ...
```

All resources live in one package with no logical grouping by Azure service provider.

---

## Decision

We will create a **new `@atakora/cdk` package** that organizes Azure resource constructs using **subpath exports** that mirror Microsoft's resource provider namespaces.

### Package Structure

```
packages/
├── lib/                         # @atakora/lib (STAYS - core framework)
│   ├── core/                   # App, Stack, Resource base classes
│   ├── synthesis/              # ARM template generation engine
│   ├── validation/             # Validation framework
│   ├── naming/                 # Resource naming utilities
│   └── testing/                # Test helpers and matchers
│
├── cli/                         # @atakora/cli (STAYS - tooling)
│
└── cdk/                         # @atakora/cdk (NEW - Azure resources)
    ├── network/                # Microsoft.Network/* resources
    │   ├── core/              # Core networking resources
    │   │   ├── virtual-network.ts
    │   │   ├── subnet.ts
    │   │   ├── public-ip-address.ts
    │   │   └── index.ts       # exports VirtualNetworks, Subnets, PublicIPAddresses
    │   │
    │   ├── security/          # Network security resources
    │   │   ├── network-security-group.ts
    │   │   ├── waf-policy.ts
    │   │   └── index.ts       # exports NetworkSecurityGroups, WAFPolicies
    │   │
    │   ├── dns/               # DNS resources
    │   │   ├── private-dns-zone.ts
    │   │   └── index.ts       # exports PrivateDnsZones
    │   │
    │   ├── gateway/           # Gateway resources
    │   │   ├── application-gateway.ts
    │   │   └── index.ts       # exports ApplicationGateways
    │   │
    │   ├── private/           # Private networking
    │   │   ├── private-endpoint.ts
    │   │   └── index.ts       # exports PrivateEndpoints
    │   │
    │   └── index.ts           # rolls up all network exports
    │
    ├── storage/                # Microsoft.Storage/* resources
    │   ├── storage-account.ts
    │   └── index.ts
    │
    ├── compute/                # Microsoft.Compute/* resources
    │   ├── virtual-machine.ts
    │   └── index.ts
    │
    ├── web/                    # Microsoft.Web/* resources
    │   ├── app-service.ts
    │   ├── app-service-plan.ts
    │   └── index.ts
    │
    ├── keyvault/               # Microsoft.KeyVault/* resources
    │   ├── key-vault.ts
    │   └── index.ts
    │
    ├── sql/                    # Microsoft.Sql/* resources
    │   ├── sql-server.ts
    │   ├── sql-database.ts
    │   └── index.ts
    │
    ├── insights/               # Microsoft.Insights/* resources
    │   ├── monitoring/        # Monitoring resources
    │   │   ├── application-insights.ts
    │   │   ├── log-analytics-workspace.ts
    │   │   └── index.ts       # exports Components, Workspaces
    │   │
    │   ├── alerting/          # Alerting resources
    │   │   ├── action-group.ts
    │   │   ├── metric-alert.ts
    │   │   └── index.ts       # exports ActionGroups, MetricAlerts
    │   │
    │   ├── diagnostics/       # Diagnostic resources
    │   │   ├── diagnostic-setting.ts
    │   │   └── index.ts       # exports DiagnosticSettings
    │   │
    │   ├── autoscale/         # Autoscaling resources
    │   │   ├── autoscale-setting.ts
    │   │   └── index.ts       # exports AutoscaleSettings
    │   │
    │   └── index.ts           # rolls up all insights exports
    │
    ├── operationalinsights/    # Microsoft.OperationalInsights/* resources
    │   ├── log-analytics-workspace.ts
    │   └── index.ts
    │
    ├── documentdb/             # Microsoft.DocumentDB/* resources
    │   ├── cosmos-db.ts
    │   └── index.ts
    │
    ├── cognitiveservices/      # Microsoft.CognitiveServices/* resources
    │   ├── openai-service.ts
    │   └── index.ts
    │
    ├── search/                 # Microsoft.Search/* resources
    │   ├── search-service.ts
    │   └── index.ts
    │
    ├── apimanagement/          # Microsoft.ApiManagement/* resources
    │   ├── service/           # API Management service
    │   │   ├── api-management.ts
    │   │   └── index.ts       # exports Service
    │   │
    │   ├── api/               # API resources
    │   │   ├── api.ts
    │   │   ├── policy.ts
    │   │   └── index.ts       # exports Apis, Policies
    │   │
    │   ├── product/           # Product resources
    │   │   ├── product.ts
    │   │   ├── subscription.ts
    │   │   └── index.ts       # exports Products, Subscriptions
    │   │
    │   └── index.ts           # rolls up all apimanagement exports
    │
    ├── resources/              # Microsoft.Resources/* (special case)
    │   ├── resource-group.ts
    │   └── index.ts
    │
    └── package.json            # Defines subpath exports
```

### Hierarchical Namespace Organization

Resources within a namespace (like `Microsoft.Network`) are organized into **logical subcategories** for better code organization. Each subcategory has its own `index.ts` that exports its resources, and the parent namespace's `index.ts` **rolls up all subcategory exports** into a single import path.

**Example: Network Namespace Structure**

```
cdk/network/
├── core/
│   ├── virtual-network.ts      # VirtualNetworks class
│   ├── subnet.ts               # Subnets class
│   └── index.ts                # export { VirtualNetworks, Subnets, ... }
│
├── security/
│   ├── network-security-group.ts  # NetworkSecurityGroups class
│   └── index.ts                   # export { NetworkSecurityGroups, ... }
│
├── dns/
│   ├── private-dns-zone.ts     # PrivateDnsZones class
│   └── index.ts                # export { PrivateDnsZones, ... }
│
└── index.ts                    # RE-EXPORT EVERYTHING from subcategories
```

**`cdk/network/index.ts`** (rollup pattern):
```typescript
/**
 * Microsoft.Network resource constructs
 *
 * Organized by logical subcategories:
 * - core: VirtualNetworks, Subnets, PublicIPAddresses
 * - security: NetworkSecurityGroups, WAFPolicies
 * - dns: PrivateDnsZones
 * - gateway: ApplicationGateways
 * - private: PrivateEndpoints
 *
 * @packageDocumentation
 */

// Re-export all core networking resources
export * from './core';

// Re-export all security resources
export * from './security';

// Re-export all DNS resources
export * from './dns';

// Re-export all gateway resources
export * from './gateway';

// Re-export all private networking resources
export * from './private';

// This allows users to import from a single path:
// import { VirtualNetworks, NetworkSecurityGroups, PrivateDnsZones } from '@atakora/cdk/network';
```

**Benefits of Hierarchical Organization**:

1. **Code Organization**: Related resources grouped together in the codebase
   - `network/security/` contains all security-related network resources
   - `insights/alerting/` contains all alerting resources

2. **Simple User Imports**: Users import from the top-level namespace
   ```typescript
   // Single import path for all network resources
   import { VirtualNetworks, NetworkSecurityGroups } from '@atakora/cdk/network';

   // No need to know internal structure:
   // NOT: import { NetworkSecurityGroups } from '@atakora/cdk/network/security';
   ```

3. **Flexibility**: Internal organization can change without breaking user code
   - Move `NetworkSecurityGroups` from `security/` to `core/`?
   - Users' imports still work because `network/index.ts` re-exports everything

4. **Scalability**: Easy to add new subcategories as namespace grows
   - Add `network/loadbalancer/` for load balancing resources
   - Roll up into `network/index.ts`
   - Users automatically get access via `@atakora/cdk/network`

### Package Exports Configuration

**`packages/cdk/package.json`**:
```json
{
  "name": "@atakora/cdk",
  "version": "1.0.0",
  "description": "Azure resource constructs for Atakora - organized by Microsoft.* namespaces",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    "./network": {
      "types": "./dist/network/index.d.ts",
      "import": "./dist/network/index.js",
      "require": "./dist/network/index.js"
    },
    "./storage": {
      "types": "./dist/storage/index.d.ts",
      "import": "./dist/storage/index.js",
      "require": "./dist/storage/index.js"
    },
    "./compute": {
      "types": "./dist/compute/index.d.ts",
      "import": "./dist/compute/index.js",
      "require": "./dist/compute/index.js"
    },
    "./web": {
      "types": "./dist/web/index.d.ts",
      "import": "./dist/web/index.js",
      "require": "./dist/web/index.js"
    },
    "./keyvault": {
      "types": "./dist/keyvault/index.d.ts",
      "import": "./dist/keyvault/index.js",
      "require": "./dist/keyvault/index.js"
    },
    "./sql": {
      "types": "./dist/sql/index.d.ts",
      "import": "./dist/sql/index.js",
      "require": "./dist/sql/index.js"
    },
    "./insights": {
      "types": "./dist/insights/index.d.ts",
      "import": "./dist/insights/index.js",
      "require": "./dist/insights/index.js"
    },
    "./operationalinsights": {
      "types": "./dist/operationalinsights/index.d.ts",
      "import": "./dist/operationalinsights/index.js",
      "require": "./dist/operationalinsights/index.js"
    },
    "./documentdb": {
      "types": "./dist/documentdb/index.d.ts",
      "import": "./dist/documentdb/index.js",
      "require": "./dist/documentdb/index.js"
    },
    "./cognitiveservices": {
      "types": "./dist/cognitiveservices/index.d.ts",
      "import": "./dist/cognitiveservices/index.js",
      "require": "./dist/cognitiveservices/index.js"
    },
    "./search": {
      "types": "./dist/search/index.d.ts",
      "import": "./dist/search/index.js",
      "require": "./dist/search/index.js"
    },
    "./apimanagement": {
      "types": "./dist/apimanagement/index.d.ts",
      "import": "./dist/apimanagement/index.js",
      "require": "./dist/apimanagement/index.js"
    },
    "./resources": {
      "types": "./dist/resources/index.d.ts",
      "import": "./dist/resources/index.js",
      "require": "./dist/resources/index.js"
    }
  },
  "typesVersions": {
    "*": {
      "network": ["./dist/network/index.d.ts"],
      "storage": ["./dist/storage/index.d.ts"],
      "compute": ["./dist/compute/index.d.ts"],
      "web": ["./dist/web/index.d.ts"],
      "keyvault": ["./dist/keyvault/index.d.ts"],
      "sql": ["./dist/sql/index.d.ts"],
      "insights": ["./dist/insights/index.d.ts"],
      "operationalinsights": ["./dist/operationalinsights/index.d.ts"],
      "documentdb": ["./dist/documentdb/index.d.ts"],
      "cognitiveservices": ["./dist/cognitiveservices/index.d.ts"],
      "search": ["./dist/search/index.d.ts"],
      "apimanagement": ["./dist/apimanagement/index.d.ts"],
      "resources": ["./dist/resources/index.d.ts"]
    }
  },
  "dependencies": {
    "@atakora/lib": "*"
  }
}
```

### User Experience

**Installation** (single package):
```bash
npm install @atakora/cdk
```

**Imports** (tree-shakable, namespace-organized):
```typescript
// Core framework from @atakora/lib
import { App, SubscriptionStack, ResourceGroupStack } from '@atakora/lib';

// Azure resources from @atakora/cdk with namespace imports
import { VirtualNetworks, Subnets, NetworkSecurityGroups } from '@atakora/cdk/network';
import { StorageAccounts } from '@atakora/cdk/storage';
import { Sites, ServerFarms } from '@atakora/cdk/web';
import { Vaults } from '@atakora/cdk/keyvault';
```

**Example Infrastructure Code**:
```typescript
import { App, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks, NetworkSecurityGroups } from '@atakora/cdk/network';
import { StorageAccounts } from '@atakora/cdk/storage';
import { Sites, ServerFarms } from '@atakora/cdk/web';

const app = new App();

const stack = new ResourceGroupStack(app, 'WebApp', {
  resourceGroupName: 'rg-webapp-prod',
  // ... stack config
});

// Microsoft.Network resources
const vnet = new VirtualNetworks(stack, 'VNet', {
  virtualNetworkName: 'vnet-webapp',
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
});

const nsg = new NetworkSecurityGroups(stack, 'NSG', {
  networkSecurityGroupName: 'nsg-webapp'
});

// Microsoft.Storage resources
const storage = new StorageAccounts(stack, 'Storage', {
  accountName: 'stwebappprod'
});

// Microsoft.Web resources
const plan = new ServerFarms(stack, 'Plan', {
  serverFarmName: 'asp-webapp'
});

const site = new Sites(stack, 'Site', {
  siteName: 'app-webapp-prod',
  serverFarmId: plan.resourceId
});

app.synth();
```

---

## Extraction Plan: What Moves from @atakora/lib to @atakora/cdk

### What STAYS in @atakora/lib (Core Framework)

**Purpose**: Foundation layer - constructs, synthesis, validation, naming

```
packages/lib/src/
├── core/                          ✅ STAYS
│   ├── app.ts                    # App root construct
│   ├── subscription-stack.ts     # SubscriptionStack
│   ├── resource-group-stack.ts   # ResourceGroupStack
│   ├── resource.ts               # Resource base class
│   ├── construct.ts              # Construct re-exports
│   ├── types.ts                  # Core type definitions
│   ├── context.ts                # Organization, Project, Environment, Instance
│   ├── azure.ts                  # Geography, Subscription, DeploymentScope
│   ├── identity.ts               # ManagedIdentity utilities
│   └── validation.ts             # ValidationResult, ValidationError
│
├── synthesis/                     ✅ STAYS
│   ├── index.ts
│   ├── synthesizer.ts            # ARM template synthesis engine
│   ├── transform/                # ARM transformation logic
│   │   ├── type-safe-transformer.ts
│   │   └── types/                # ARM type definitions
│   └── validate/                 # ARM template validation
│       ├── validation-pipeline.ts
│       └── arm-expression-validator.ts
│
├── validation/                    ✅ STAYS
│   ├── index.ts
│   ├── error-catalog.ts          # Validation error definitions
│   ├── resource-validator.ts     # Resource validation framework
│   └── validation-helpers.ts     # Validation utility functions
│
├── naming/                        ✅ STAYS
│   └── ...                       # Resource naming conventions
│
├── testing/                       ✅ STAYS
│   ├── index.ts
│   ├── arm-template-matchers.ts  # Jest/Vitest matchers
│   ├── deployment-simulator.ts   # Test deployment simulation
│   └── validation-test-helpers.ts
│
├── codegen/                       ✅ STAYS
│   └── ...                       # Code generation utilities
│
└── generated/                     ✅ STAYS
    └── ...                       # Generated type definitions
```

**Key Principle**: If it's infrastructure-agnostic or framework-level, it stays in `@atakora/lib`.

### What MOVES to @atakora/cdk (Azure Resource Constructs)

**Purpose**: Azure-specific resource implementations organized by Microsoft.* namespace

#### From `packages/lib/src/resources/` → `packages/cdk/`

| Current Location (lib) | New Location (cdk) | Microsoft Namespace | Export Name |
|------------------------|-------------------|---------------------|-------------|
| `resources/virtual-network/` | `cdk/network/virtual-network.ts` | `Microsoft.Network` | `VirtualNetworks` |
| `resources/subnet/` | `cdk/network/subnet.ts` | `Microsoft.Network` | `Subnets` |
| `resources/network-security-group/` | `cdk/network/network-security-group.ts` | `Microsoft.Network` | `NetworkSecurityGroups` |
| `resources/public-ip-address/` | `cdk/network/public-ip-address.ts` | `Microsoft.Network` | `PublicIPAddresses` |
| `resources/private-dns-zone/` | `cdk/network/private-dns-zone.ts` | `Microsoft.Network` | `PrivateDnsZones` |
| `resources/private-endpoint/` | `cdk/network/private-endpoint.ts` | `Microsoft.Network` | `PrivateEndpoints` |
| `resources/application-gateway/` | `cdk/network/application-gateway.ts` | `Microsoft.Network` | `ApplicationGateways` |
| `resources/waf-policy/` | `cdk/network/waf-policy.ts` | `Microsoft.Network` | `ApplicationGatewayWebApplicationFirewallPolicies` |
| `resources/storage-account/` | `cdk/storage/storage-account.ts` | `Microsoft.Storage` | `StorageAccounts` |
| `resources/app-service/` | `cdk/web/app-service.ts` | `Microsoft.Web` | `Sites` |
| `resources/app-service-plan/` | `cdk/web/app-service-plan.ts` | `Microsoft.Web` | `ServerFarms` |
| `resources/key-vault/` | `cdk/keyvault/key-vault.ts` | `Microsoft.KeyVault` | `Vaults` |
| `resources/sql-database/` | `cdk/sql/sql-database.ts` | `Microsoft.Sql` | `Databases` |
| `resources/cosmos-db/` | `cdk/documentdb/cosmos-db.ts` | `Microsoft.DocumentDB` | `DatabaseAccounts` |
| `resources/application-insights/` | `cdk/insights/application-insights.ts` | `Microsoft.Insights` | `Components` |
| `resources/action-group/` | `cdk/insights/action-group.ts` | `Microsoft.Insights` | `ActionGroups` |
| `resources/metric-alert/` | `cdk/insights/metric-alert.ts` | `Microsoft.Insights` | `MetricAlerts` |
| `resources/autoscale-setting/` | `cdk/insights/autoscale-setting.ts` | `Microsoft.Insights` | `AutoscaleSettings` |
| `resources/diagnostic-setting/` | `cdk/insights/diagnostic-setting.ts` | `Microsoft.Insights` | `DiagnosticSettings` |
| `resources/log-analytics-workspace/` | `cdk/operationalinsights/log-analytics-workspace.ts` | `Microsoft.OperationalInsights` | `Workspaces` |
| `resources/openai-service/` | `cdk/cognitiveservices/openai-service.ts` | `Microsoft.CognitiveServices` | `Accounts` |
| `resources/search-service/` | `cdk/search/search-service.ts` | `Microsoft.Search` | `SearchServices` |
| `resources/api-management/` | `cdk/apimanagement/` | `Microsoft.ApiManagement` | `Service`, `Apis`, `Products`, etc. |
| `resources/resource-group/` | `cdk/resources/resource-group.ts` | `Microsoft.Resources` | `ResourceGroups` |

#### Naming Convention for Exports

Class names will match Azure ARM resource type **plural names** to maintain consistency with Microsoft's naming:

- `Microsoft.Network/virtualNetworks` → `VirtualNetworks` class
- `Microsoft.Storage/storageAccounts` → `StorageAccounts` class
- `Microsoft.Web/sites` → `Sites` class
- `Microsoft.Web/serverFarms` → `ServerFarms` class
- `Microsoft.KeyVault/vaults` → `Vaults` class

**Rationale**: Using ARM's plural convention makes the code self-documenting and instantly recognizable to anyone familiar with ARM templates.

### Example: Network Package Structure

**`packages/cdk/network/index.ts`**:
```typescript
/**
 * Microsoft.Network resource constructs
 *
 * @packageDocumentation
 */

export { VirtualNetworks } from './virtual-network';
export type { VirtualNetworksProps } from './virtual-network';

export { Subnets } from './subnet';
export type { SubnetsProps } from './subnet';

export { NetworkSecurityGroups } from './network-security-group';
export type { NetworkSecurityGroupsProps } from './network-security-group';

export { PublicIPAddresses } from './public-ip-address';
export type { PublicIPAddressesProps } from './public-ip-address';

export { PrivateDnsZones } from './private-dns-zone';
export type { PrivateDnsZonesProps } from './private-dns-zone';

export { PrivateEndpoints } from './private-endpoint';
export type { PrivateEndpointsProps } from './private-endpoint';

export { ApplicationGateways } from './application-gateway';
export type { ApplicationGatewaysProps } from './application-gateway';

export { ApplicationGatewayWebApplicationFirewallPolicies } from './waf-policy';
export type { ApplicationGatewayWebApplicationFirewallPoliciesProps } from './waf-policy';
```

**`packages/cdk/network/virtual-network.ts`**:
```typescript
import { Resource, ResourceProps, ArmResource, ValidationResult } from '@atakora/lib';
import { Construct } from '@atakora/lib';

export interface VirtualNetworksProps extends ResourceProps {
  readonly virtualNetworkName: string;
  readonly addressSpace: {
    readonly addressPrefixes: string[];
  };
  // ... other properties
}

/**
 * Microsoft.Network/virtualNetworks resource
 *
 * Azure Virtual Network for network isolation and segmentation.
 */
export class VirtualNetworks extends Resource {
  readonly resourceType = 'Microsoft.Network/virtualNetworks';
  readonly resourceId: string;
  readonly name: string;

  private readonly addressSpace: { addressPrefixes: string[] };

  constructor(scope: Construct, id: string, props: VirtualNetworksProps) {
    super(scope, id, props);
    this.validateProps(props);

    this.name = props.virtualNetworkName;
    this.addressSpace = props.addressSpace;
    this.resourceId = `[resourceId('Microsoft.Network/virtualNetworks', '${this.name}')]`;
  }

  protected validateProps(props: VirtualNetworksProps): void {
    // Property validation
  }

  public validateArmStructure(): ValidationResult {
    // ARM structure validation
  }

  public toArmTemplate(): ArmResource {
    return {
      type: this.resourceType,
      apiVersion: '2024-07-01',
      name: this.name,
      location: this.location,
      tags: this.tags,
      properties: {
        addressSpace: this.addressSpace
      }
    };
  }
}
```

### Migration Strategy

#### Phase 1: Create @atakora/cdk Package Structure (Week 1)

1. Create `packages/cdk/` directory
2. Set up package.json with exports configuration
3. Create namespace subdirectories (`network/`, `storage/`, etc.)
4. Configure TypeScript compilation

#### Phase 2: Move Resources by Namespace (Weeks 2-4)

Move resources in priority order:

**Week 2** - High-priority namespaces:
- ✅ `Microsoft.Network` (VNet, Subnet, NSG, etc.)
- ✅ `Microsoft.Storage` (StorageAccounts)
- ✅ `Microsoft.Resources` (ResourceGroups)

**Week 3** - Common application resources:
- ✅ `Microsoft.Web` (Sites, ServerFarms)
- ✅ `Microsoft.KeyVault` (Vaults)
- ✅ `Microsoft.Sql` (Databases, Servers)

**Week 4** - Monitoring and specialized services:
- ✅ `Microsoft.Insights` (ApplicationInsights, Alerts, etc.)
- ✅ `Microsoft.OperationalInsights` (Log Analytics)
- ✅ `Microsoft.CognitiveServices` (OpenAI)
- ✅ `Microsoft.Search` (SearchServices)
- ✅ `Microsoft.ApiManagement` (Service, APIs, etc.)
- ✅ `Microsoft.DocumentDB` (Cosmos DB)

#### Phase 3: Update @atakora/lib (Week 5)

1. Remove moved resource directories from `lib/src/resources/`
2. Update `lib/src/index.ts` to remove resource exports
3. Keep `lib/src/resources/` directory for backward compatibility (deprecated re-exports)
4. Update documentation

#### Phase 4: Update @atakora/cli (Week 5)

1. Update synthesis command to handle `@atakora/cdk` imports
2. Ensure package resolution works correctly
3. Update examples to use new import paths

#### Phase 5: Backward Compatibility Bridge (Week 6)

Create temporary re-exports in `@atakora/lib` for smooth migration:

**`packages/lib/src/resources/index.ts`** (deprecated):
```typescript
/**
 * @deprecated Import from @atakora/cdk instead
 *
 * This module re-exports resources from @atakora/cdk for backward compatibility.
 * These exports will be removed in v2.0.0.
 *
 * @example
 * // Old (deprecated):
 * import { VirtualNetwork } from '@atakora/lib/resources';
 *
 * // New (recommended):
 * import { VirtualNetworks } from '@atakora/cdk/network';
 */

// Re-export from @atakora/cdk for backward compatibility
export { VirtualNetworks as VirtualNetwork } from '@atakora/cdk/network';
export { StorageAccounts as StorageAccount } from '@atakora/cdk/storage';
// ... etc
```

#### Phase 6: Documentation and Examples (Week 7)

1. Update getting-started guide with new imports
2. Create migration guide for existing users
3. Update all examples to use `@atakora/cdk/*` imports
4. Add ADR to docs/design/architecture/

---

## Alternatives Considered

### Alternative 1: Separate npm Packages per Namespace

**Structure**:
```
@atakora/cdk-network
@atakora/cdk-storage
@atakora/cdk-compute
...
```

**Pros**:
- True package independence
- Can version each namespace separately
- Smaller individual package sizes

**Cons**:
- **Package explosion** - 15+ packages to maintain
- **Version hell** - Users must ensure compatible versions across packages
- **Installation burden** - `npm install` 10+ packages for a typical project
- **Monorepo complexity** - Publishing and versioning coordination overhead

**Verdict**: ❌ Rejected - AWS CDK v1 proved this approach causes more problems than it solves

### Alternative 2: Keep Everything in @atakora/lib

**Structure**: Current monolithic structure

**Pros**:
- Simple - everything in one place
- No migration needed
- Single version to manage

**Cons**:
- **Bundle bloat** - Users download everything for minimal usage
- **Slow builds** - Every change rebuilds entire library
- **Poor organization** - Flat directory doesn't reflect Azure's structure
- **Scalability** - Doesn't scale as we add more resource types

**Verdict**: ❌ Rejected - Doesn't scale for long-term framework growth

### Alternative 3: Multiple Entry Points in @atakora/lib

**Structure**:
```typescript
import { VirtualNetwork } from '@atakora/lib/network';
import { StorageAccount } from '@atakora/lib/storage';
```

**Pros**:
- Single package to install
- Organized namespaces
- Tree-shakable

**Cons**:
- Mixes framework core with resource implementations
- `@atakora/lib` becomes catch-all monolith
- Less clear separation of concerns
- Harder to extract resources to separate package later

**Verdict**: ❌ Rejected - Violates separation of concerns between framework and resources

---

## Consequences

### Positive

1. **Discoverability**: Developers familiar with ARM can immediately find resources
   - Know `Microsoft.Network/virtualNetworks`? Import from `@atakora/cdk/network`

2. **Tree-shaking**: Modern bundlers only include imported namespaces
   - Import only network resources? Only network code in bundle

3. **Build Performance**: Namespace-level isolation enables better caching
   - Change storage resources? Only rebuild storage namespace

4. **Clear Boundaries**: Framework vs Resources separation
   - `@atakora/lib` = framework primitives
   - `@atakora/cdk` = Azure resource implementations

5. **Scalability**: Adding new Azure services is straightforward
   - New `Microsoft.Foo` service? Add `cdk/foo/` directory

6. **Aligned with Microsoft**: Mirrors Azure's own organization
   - Easier onboarding for Azure developers
   - Documentation maps directly to package structure

7. **Version Management**: Single version for entire CDK simplifies compatibility

### Negative

1. **Migration Burden**: Existing code must update imports
   - Mitigated by: Deprecated re-exports for v1.x, breaking change in v2.0

2. **Initial Setup**: Creating namespace structure requires upfront work
   - Mitigated by: Phased migration over 7 weeks

3. **Package Size**: `@atakora/cdk` will be larger than individual namespaces
   - Mitigated by: Tree-shaking eliminates unused code in production bundles

### Neutral

- Requires understanding of npm subpath exports feature
- TypeScript configuration must support package exports
- IDE autocomplete depends on `typesVersions` configuration

---

## Success Criteria

This architectural change will be considered successful when:

1. **Developer Experience**:
   - Single `npm install @atakora/cdk` provides all Azure resources
   - IDE autocomplete suggests available namespaces
   - Import paths directly map to Microsoft.* namespaces

2. **Bundle Size**:
   - Projects using only Network resources bundle <50% of full CDK size
   - Tree-shaking verified with bundle analysis tools

3. **Build Performance**:
   - Namespace changes rebuild only affected namespace (not entire CDK)
   - Incremental build time <10 seconds for single namespace change

4. **Code Organization**:
   - Every Azure resource has clear namespace home
   - Adding new resources follows obvious pattern

5. **Migration Path**:
   - Existing `@atakora/lib` users can migrate with deprecated re-exports
   - Migration guide provides clear steps
   - Breaking change deferred to v2.0.0

6. **Documentation**:
   - Getting started guide uses new import paths
   - All examples updated to `@atakora/cdk/*` imports
   - Migration guide published for existing users

---

## Implementation Checklist

- [ ] Create `packages/cdk/` directory structure
- [ ] Configure package.json with subpath exports
- [ ] Set up TypeScript compilation for CDK package
- [ ] Move Microsoft.Network resources (VNet, NSG, Subnet, etc.)
- [ ] Move Microsoft.Storage resources (StorageAccount)
- [ ] Move Microsoft.Web resources (Sites, ServerFarms)
- [ ] Move Microsoft.KeyVault resources (Vaults)
- [ ] Move Microsoft.Sql resources (Databases)
- [ ] Move Microsoft.Insights resources (ApplicationInsights, Alerts, etc.)
- [ ] Move Microsoft.OperationalInsights resources (Workspaces)
- [ ] Move Microsoft.DocumentDB resources (Cosmos DB)
- [ ] Move Microsoft.CognitiveServices resources (OpenAI)
- [ ] Move Microsoft.Search resources (SearchServices)
- [ ] Move Microsoft.ApiManagement resources (Service, APIs, etc.)
- [ ] Move Microsoft.Resources resources (ResourceGroups)
- [ ] Update @atakora/lib to remove moved resources
- [ ] Create deprecated re-exports in @atakora/lib for backward compatibility
- [ ] Update CLI to handle new import paths
- [ ] Update getting-started documentation
- [ ] Create migration guide
- [ ] Update all code examples
- [ ] Verify tree-shaking with bundle analyzer
- [ ] Run full test suite
- [ ] Update package README files

---

## Related Decisions

- **ADR-001**: Validation Architecture - CDK resources use lib's validation framework
- **ADR-002**: Manifest Schema - CLI synthesis uses manifest to load CDK resources
- **Future ADR-004**: Cross-Namespace Resource References - How resources reference each other across namespaces

---

## References

- [npm package.json exports field](https://nodejs.org/api/packages.html#exports)
- [TypeScript typesVersions](https://www.typescriptlang.org/docs/handbook/declaration-files/publishing.html#version-selection-with-typesversions)
- [AWS CDK v2 Migration Guide](https://docs.aws.amazon.com/cdk/v2/guide/migrating-v2.html)
- [Microsoft ARM Resource Providers](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-providers-and-types)
- [Azure Resource Types Reference](https://learn.microsoft.com/en-us/azure/templates/)

---

## Architectural Review and Required Modifications

**Review Date**: 2025-10-08
**Reviewer**: Becky (Staff Architect)
**Decision**: **ACCEPTED WITH MODIFICATIONS**

### Summary

The proposed CDK package architecture with subpath exports is architecturally sound and aligns with our core principles. The Microsoft.* namespace mapping provides excellent discoverability and the single-package approach avoids version management complexity. However, several modifications are required before implementation.

### Required Modifications

#### 1. Simplify Hierarchical Structure

**Issue**: The subcategory organization (network/core/, network/security/) adds unnecessary complexity.

**Required Change**: Flatten the physical structure within each namespace:
```
cdk/network/
├── virtual-network.ts
├── subnet.ts
├── network-security-group.ts
├── private-dns-zone.ts
├── application-gateway.ts
├── waf-policy.ts
├── private-endpoint.ts
└── index.ts  // Direct exports, no subcategories
```

Subcategories should only be introduced when a namespace exceeds 30+ resources, and then only as a build-time organization pattern, not a runtime structure.

#### 2. Enhanced Success Metrics

Replace current success criteria with specific, measurable metrics:

- **Bundle Size Targets**:
  - Single namespace usage: <100KB minified
  - Tree-shake efficiency: >70% code elimination
  - Full CDK bundle: <500KB minified

- **Build Performance Targets**:
  - Cold build: <30s for full CDK
  - Incremental build: <5s for single file change
  - Namespace isolation verified via build cache analysis

- **Developer Experience Targets**:
  - IDE autocomplete: <500ms for namespace suggestions
  - Import discovery: 90% success rate in <30s
  - Migration automation: >80% via codemod

#### 3. Extended Migration Timeline

Add **Week 0** for tooling and infrastructure:
- Create jscodeshift codemod for automated migration
- Set up integration test suite
- Configure bundle size analysis
- Implement circular dependency detection

#### 4. Technical Requirements Section

Add new section documenting:
- Minimum Node.js version: 14.0+ (for full subpath export support)
- TypeScript version: 4.5+ (for package exports type support)
- Build tooling requirements (esbuild/webpack 5+)
- Circular dependency prevention strategy

#### 5. Cross-Namespace Reference Strategy

Add section on handling cross-namespace dependencies:
- Use dependency injection pattern for loose coupling
- Interfaces defined in @atakora/lib for shared contracts
- Lazy resolution of cross-references via ARM expressions
- Automated circular dependency detection in CI

### Approved Aspects

The following aspects are approved without modification:

1. **Microsoft.* Namespace Mapping**: Excellent approach for discoverability
2. **Single Package with Subpath Exports**: Avoids version management complexity
3. **Separation of Framework and Resources**: Clean architectural boundary
4. **Backward Compatibility Strategy**: Deprecated re-exports provide smooth migration
5. **Priority-Based Migration**: Logical progression from high-use to specialized resources

### Risk Mitigations

Additional risk mitigations to implement:

1. **Testing Coverage**: Full integration test suite before migration begins
2. **Import Path Validation**: ESLint rules to catch incorrect imports
3. **Performance Monitoring**: Bundle size budgets enforced in CI
4. **Documentation**: Migration guide with automated tooling instructions

### Next Steps

1. Update this ADR with the required modifications
2. Create Week 0 migration tooling (jscodeshift codemods, test infrastructure)
3. Implement prototype with Microsoft.Network namespace
4. Validate tree-shaking and bundle size targets
5. Proceed with phased migration plan

### Architectural Principles Validation

✅ **Type Safety**: Maintained through TypeScript exports and interfaces
✅ **Progressive Enhancement**: Start with flat structure, add complexity only when needed
✅ **Gov vs Commercial**: Package structure agnostic to cloud environment
✅ **Clear ARM Output**: No impact on synthesis, clean separation
✅ **Documented Why**: Clear rationale for namespace mapping and structure

This architecture provides the right balance of organization, discoverability, and maintainability while avoiding the pitfalls of over-engineering.
