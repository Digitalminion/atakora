# API Reference

**Navigation**: [Docs Home](../../README.md) > [Reference](../README.md) > API Reference

---

## Overview

Complete API documentation for Atakora infrastructure-as-code libraries. This reference covers all public interfaces, classes, types, and functions available for defining Azure infrastructure.

## Package Structure

Atakora follows a layered architecture with two main packages:

### @atakora/lib (Core Library)

Core constructs and primitives for building infrastructure:

- **[Core Constructs](./core/README.md)** - App, Stack, Construct, Resource
- **Base Classes** - Abstract classes for all resources
- **Utilities** - Naming, tagging, validation helpers
- **Interfaces** - Common interfaces and types

**Import**:
```typescript
import { App, Stack, Construct, Resource } from '@atakora/lib';
```

### @atakora/cdk (Service Namespaces)

Azure service-specific constructs organized by namespace:

- **[@atakora/cdk/network](./cdk/network.md)** - Networking resources (VNet, NSG, etc.)
- **[@atakora/cdk/storage](./cdk/storage.md)** - Storage resources (Storage Account, Blob, etc.)
- **[@atakora/cdk/web](./cdk/web.md)** - Web & App Services (App Service, Static Web Apps)
- **[@atakora/cdk/compute](./cdk/compute.md)** - Compute resources (Virtual Machines, VMSS)
- **[@atakora/cdk/sql](./cdk/sql.md)** - SQL databases
- **[@atakora/cdk/documentdb](./cdk/documentdb.md)** - Cosmos DB
- **[@atakora/cdk/keyvault](./cdk/keyvault.md)** - Key Vault, secrets, keys
- **[@atakora/cdk/insights](./cdk/insights.md)** - Application Insights
- **[@atakora/cdk/resources](./cdk/resources.md)** - Resource Groups, locks

**Import**:
```typescript
import { VirtualNetwork } from '@atakora/cdk/network';
import { StorageAccount } from '@atakora/cdk/storage';
```

## API Documentation Structure

Each service namespace documentation includes:

### Class Reference

All exported classes with:
- Constructor signatures
- Public properties
- Public methods
- Usage examples

### Type Reference

TypeScript interfaces and types:
- Property interfaces (`VirtualNetworkProps`, etc.)
- Resource interfaces (`IVirtualNetwork`, etc.)
- Configuration types
- Enum definitions

### Examples

Working code examples for:
- Basic usage
- Common patterns
- Advanced scenarios
- Gov Cloud specifics

## Core Concepts

### Construct Hierarchy

```
App (root)
└── Stack
    ├── Resource Group
    ├── Virtual Network
    │   └── Subnet
    ├── Storage Account
    │   └── Blob Container
    └── Key Vault
        └── Secret
```

### L1 vs L2 Constructs

**L1 Constructs** (Arm prefix):
- Direct ARM template mapping
- All properties explicit
- Maximum control
- Example: `ArmVirtualNetwork`

```typescript
import { ArmVirtualNetwork } from '@atakora/cdk/network';

new ArmVirtualNetwork(this, 'VNet', {
  name: 'vnet-myapp-prod-eastus',
  location: 'eastus',
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
  },
  tags: {
    environment: 'production'
  }
});
```

**L2 Constructs** (no prefix):
- Intent-based API
- Auto-generates names
- Sensible defaults
- Merges parent tags
- Example: `VirtualNetwork`

```typescript
import { VirtualNetwork } from '@atakora/cdk/network';

new VirtualNetwork(this, 'VNet', {
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16']
  }
  // Name auto-generated: vnet-myapp-prod-eastus
  // Location from stack
  // Tags merged from parent
});
```

### Resource References

Resources can reference each other using TypeScript object references:

```typescript
import { ResourceGroup } from '@atakora/cdk/resources';
import { VirtualNetwork } from '@atakora/cdk/network';
import { StorageAccount } from '@atakora/cdk/storage';

// Create resource group
const rg = new ResourceGroup(this, 'ResourceGroup', {
  location: 'eastus'
});

// Reference resource group
const vnet = new VirtualNetwork(this, 'VNet', {
  resourceGroup: rg,  // TypeScript reference
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
});

// Chain references
const storage = new StorageAccount(this, 'Storage', {
  resourceGroup: rg  // Same reference
});
```

### Property Resolution

Properties are resolved at synthesis time:

```typescript
const storage = new StorageAccount(this, 'Storage', {
  resourceGroup: rg
});

// Access resolved properties
console.log(storage.name);  // stmyappprod
console.log(storage.id);    // /subscriptions/.../storageAccounts/stmyappprod

// Use in other resources
const container = new BlobContainer(this, 'Container', {
  storageAccount: storage,
  name: 'assets'
});
```

## Common Patterns

### Basic Infrastructure

```typescript
import { App, Stack } from '@atakora/lib';
import { ResourceGroup } from '@atakora/cdk/resources';
import { VirtualNetwork, Subnet } from '@atakora/cdk/network';

class InfraStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      environment: 'production',
      location: 'eastus'
    });

    const rg = new ResourceGroup(this, 'RG', {
      location: this.location
    });

    const vnet = new VirtualNetwork(this, 'VNet', {
      resourceGroup: rg,
      addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
    });

    new Subnet(this, 'AppSubnet', {
      virtualNetwork: vnet,
      addressPrefix: '10.0.1.0/24'
    });
  }
}

const app = new App();
new InfraStack(app, 'infrastructure');
app.synth();
```

### Web Application

```typescript
import { App, Stack } from '@atakora/lib';
import { ResourceGroup } from '@atakora/cdk/resources';
import { AppServicePlan, WebApp } from '@atakora/cdk/web';
import { SqlServer, SqlDatabase } from '@atakora/cdk/sql';
import { ApplicationInsights } from '@atakora/cdk/insights';

class WebAppStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      environment: 'production',
      location: 'eastus'
    });

    const rg = new ResourceGroup(this, 'RG', {
      location: this.location
    });

    // App Service
    const plan = new AppServicePlan(this, 'Plan', {
      resourceGroup: rg,
      sku: { name: 'P1v2', tier: 'PremiumV2' }
    });

    const webapp = new WebApp(this, 'WebApp', {
      resourceGroup: rg,
      serverFarmId: plan.id,
      httpsOnly: true
    });

    // Database
    const sqlServer = new SqlServer(this, 'SqlServer', {
      resourceGroup: rg,
      administratorLogin: 'sqladmin',
      administratorLoginPassword: process.env.SQL_PASSWORD!
    });

    new SqlDatabase(this, 'Database', {
      resourceGroup: rg,
      server: sqlServer,
      sku: { name: 'S1' }
    });

    // Monitoring
    new ApplicationInsights(this, 'AppInsights', {
      resourceGroup: rg,
      applicationType: 'web'
    });
  }
}

const app = new App();
new WebAppStack(app, 'webapp');
app.synth();
```

### Secure Infrastructure

```typescript
import { App, Stack } from '@atakora/lib';
import { ResourceGroup } from '@atakora/cdk/resources';
import { VirtualNetwork, Subnet, PrivateEndpoint } from '@atakora/cdk/network';
import { StorageAccount } from '@atakora/cdk/storage';
import { KeyVault, Secret } from '@atakora/cdk/keyvault';

class SecureStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      environment: 'production',
      location: 'eastus'
    });

    const rg = new ResourceGroup(this, 'RG', {
      location: this.location
    });

    // Network
    const vnet = new VirtualNetwork(this, 'VNet', {
      resourceGroup: rg,
      addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
    });

    const subnet = new Subnet(this, 'PrivateSubnet', {
      virtualNetwork: vnet,
      addressPrefix: '10.0.1.0/24',
      privateEndpointNetworkPolicies: 'Disabled'
    });

    // Storage with private endpoint
    const storage = new StorageAccount(this, 'Storage', {
      resourceGroup: rg,
      publicNetworkAccess: 'Disabled'
    });

    new PrivateEndpoint(this, 'StorageEndpoint', {
      resourceGroup: rg,
      subnet: subnet,
      privateLinkServiceId: storage.id,
      groupIds: ['blob']
    });

    // Key Vault
    const vault = new KeyVault(this, 'Vault', {
      resourceGroup: rg,
      tenantId: process.env.AZURE_TENANT_ID!,
      enableRbacAuthorization: true
    });

    new Secret(this, 'ConnectionString', {
      keyVault: vault,
      value: storage.primaryConnectionString
    });
  }
}

const app = new App();
new SecureStack(app, 'secure');
app.synth();
```

## Type System

### Property Interfaces

Convention: `<ResourceName>Props`

```typescript
interface VirtualNetworkProps {
  readonly resourceGroup?: IResourceGroup;
  readonly name?: string;
  readonly location?: string;
  readonly addressSpace: AddressSpace;
  readonly tags?: { [key: string]: string };
}
```

### Resource Interfaces

Convention: `I<ResourceName>`

```typescript
interface IVirtualNetwork {
  readonly id: string;
  readonly name: string;
  readonly subnets: ISubnet[];
}
```

### Configuration Types

Nested configuration objects:

```typescript
interface AddressSpace {
  readonly addressPrefixes: string[];
}

interface DhcpOptions {
  readonly dnsServers?: string[];
}
```

### Enums

Constrained value sets:

```typescript
enum StorageAccountKind {
  Storage = 'Storage',
  StorageV2 = 'StorageV2',
  BlobStorage = 'BlobStorage',
  FileStorage = 'FileStorage',
  BlockBlobStorage = 'BlockBlobStorage'
}
```

## Validation

All constructs validate their configuration:

```typescript
// Missing required property
new VirtualNetwork(this, 'VNet', {
  // Error: addressSpace is required
});

// Invalid value
new StorageAccount(this, 'Storage', {
  sku: { name: 'Invalid_SKU' }  // Error: Invalid SKU name
});

// Invalid reference
const vnet: IVirtualNetwork = undefined!;
new Subnet(this, 'Subnet', {
  virtualNetwork: vnet,  // Error: Cannot resolve undefined reference
  addressPrefix: '10.0.1.0/24'
});
```

See [Validation Guide](../../guides/validation/overview.md) for details.

## API Stability

### Stability Levels

- **Stable**: Production-ready, follows semantic versioning
- **Beta**: Feature-complete, API may change
- **Experimental**: Under development, breaking changes expected
- **Deprecated**: Will be removed in future version

### Semantic Versioning

Atakora follows semantic versioning (semver):

- **Major** (1.0.0 → 2.0.0): Breaking API changes
- **Minor** (1.0.0 → 1.1.0): New features, backward compatible
- **Patch** (1.0.0 → 1.0.1): Bug fixes, backward compatible

### Deprecation Policy

Deprecated APIs are:
1. Marked with `@deprecated` JSDoc tag
2. Documented with migration path
3. Maintained for at least one major version
4. Removed in next major version

Example:
```typescript
/**
 * @deprecated Use VirtualNetwork instead
 * Will be removed in v2.0.0
 */
export class LegacyVirtualNetwork extends Construct {
  // ...
}
```

## Navigation

### By Package

- **[Core Library](./core/README.md)** - App, Stack, Construct, Resource
- **[Network Resources](./cdk/network.md)** - VNet, Subnet, NSG, etc.
- **[Storage Resources](./cdk/storage.md)** - Storage Account, Blob, etc.
- **[Web Resources](./cdk/web.md)** - App Service, Functions, etc.

### By Use Case

- **[Getting Started](../../getting-started/README.md)** - Quick start guide
- **[Tutorials](../../guides/tutorials/README.md)** - Step-by-step tutorials
- **[Examples](../../examples/README.md)** - Complete working examples

### By Topic

- **[Fundamentals](../../guides/fundamentals/README.md)** - Core concepts
- **[Validation](../../guides/validation/README.md)** - Validation system
- **[Workflows](../../guides/workflows/README.md)** - Common workflows

## Contributing

Help improve this documentation:

1. **Report Issues**: [GitHub Issues](https://github.com/Digital-Minion/atakora/issues)
2. **Suggest Improvements**: Submit PRs with documentation fixes
3. **Add Examples**: Share working code examples
4. **Request Topics**: Suggest missing documentation

See [Contributing Guide](../../contributing/README.md) for details.

---

**Last Updated**: 2025-10-08
**Version**: 1.0.0
