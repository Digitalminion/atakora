# Organizing Multi-Package Projects

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Workflows](./README.md) > **Organizing Projects**

---

As your infrastructure grows, organizing code into multiple packages becomes essential for maintainability, reusability, and team collaboration. This guide shows you how to structure large infrastructure projects effectively using Atakora's package system.

## Table of Contents

- [Why Use Multiple Packages?](#why-use-multiple-packages)
- [Package Organization Strategies](#package-organization-strategies)
- [Creating Package Structure](#creating-package-structure)
- [Sharing Code Between Packages](#sharing-code-between-packages)
- [Managing Dependencies](#managing-dependencies)
- [Deployment Workflows](#deployment-workflows)
- [Monorepo vs Multi-Repo](#monorepo-vs-multi-repo)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)

## Why Use Multiple Packages?

Multiple packages provide several benefits for infrastructure projects:

### Separation of Concerns

Each package manages a distinct part of your infrastructure:

```
infrastructure/
├── packages/
│   ├── networking/        # VNets, subnets, NSGs
│   ├── data/             # Databases, storage
│   ├── compute/          # Web apps, functions
│   └── security/         # Key vaults, identities
```

### Independent Deployment

Deploy packages separately when needed:

```bash
# Deploy only networking changes
atakora deploy --package networking

# Deploy data tier without affecting compute
atakora deploy --package data
```

### Team Ownership

Different teams own different packages:

- **Platform team**: Manages `networking`, `security`
- **Data team**: Manages `data`
- **Application team**: Manages `compute`, `web-apps`

### Reusability

Share common infrastructure patterns:

```typescript
// packages/common/src/constructs/secure-storage.ts
export class SecureStorageAccount extends StorageAccount {
  constructor(scope: Construct, id: string, props: SecureStorageProps) {
    super(scope, id, {
      ...props,
      properties: {
        supportsHttpsTrafficOnly: true,
        minimumTlsVersion: 'TLS1_2',
        allowBlobPublicAccess: false,
        ...props.properties
      }
    });
  }
}

// Use in multiple packages
import { SecureStorageAccount } from '@myorg/common';

const storage = new SecureStorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus'
});
```

## Package Organization Strategies

### By Environment

Separate packages for each environment:

```
infrastructure/
├── packages/
│   ├── dev/
│   │   ├── src/
│   │   │   ├── network-stack.ts
│   │   │   ├── app-stack.ts
│   │   │   └── main.ts
│   │   └── package.json
│   ├── staging/
│   │   └── ...
│   └── production/
│       └── ...
```

**Pros**: Complete isolation, different configurations per environment
**Cons**: Code duplication, harder to maintain consistency

**When to use**: When environments have significantly different infrastructure

### By Service/Component

Organize by logical service boundaries:

```
infrastructure/
├── packages/
│   ├── networking/
│   │   ├── src/
│   │   │   ├── vnet-stack.ts
│   │   │   ├── subnet-stack.ts
│   │   │   ├── nsg-stack.ts
│   │   │   └── main.ts
│   │   └── package.json
│   ├── identity/
│   │   ├── src/
│   │   │   ├── managed-identity-stack.ts
│   │   │   └── main.ts
│   │   └── package.json
│   ├── web-app/
│   │   └── ...
│   └── data/
│       └── ...
```

**Pros**: Clear ownership, independent deployment, reusable
**Cons**: Managing cross-package dependencies

**When to use**: Most scenarios, especially with multiple teams

### By Layer (Tier)

Organize by infrastructure tiers:

```
infrastructure/
├── packages/
│   ├── foundation/        # Resource groups, networking
│   ├── platform/          # Shared services (Key Vault, monitoring)
│   ├── data/             # Databases, storage
│   ├── compute/          # App services, functions
│   └── edge/             # Front Door, CDN, DNS
```

**Pros**: Clear deployment order, manages dependencies well
**Cons**: Can be too abstract for some organizations

**When to use**: Large organizations with clear infrastructure layers

### Hybrid Approach

Combine strategies for complex projects:

```
infrastructure/
├── packages/
│   ├── common/           # Shared constructs and utilities
│   ├── foundation/
│   │   ├── networking/
│   │   └── security/
│   ├── services/
│   │   ├── web-app/
│   │   ├── api/
│   │   └── background-jobs/
│   └── environments/
│       ├── dev/
│       ├── staging/
│       └── production/
```

**Pros**: Flexibility, clear organization
**Cons**: More complex structure

**When to use**: Large, complex infrastructure with multiple concerns

## Creating Package Structure

### Initialize New Package

Create a new package in your project:

```bash
# Create package directory
mkdir -p packages/networking
cd packages/networking

# Initialize with Atakora
atakora init

# Or manually create package.json
npm init -y
```

### Package Configuration

Configure `package.json`:

```json
{
  "name": "@myorg/networking",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "synth": "atakora synth",
    "deploy": "atakora deploy",
    "test": "vitest run"
  },
  "dependencies": {
    "@atakora/lib": "^1.0.0",
    "@myorg/common": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### TypeScript Configuration

Create `tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../common" }
  ]
}
```

### Project Structure

Organize your package:

```
packages/networking/
├── src/
│   ├── stacks/
│   │   ├── vnet-stack.ts
│   │   ├── subnet-stack.ts
│   │   └── nsg-stack.ts
│   ├── constructs/
│   │   └── secure-subnet.ts
│   ├── config/
│   │   ├── dev.ts
│   │   ├── staging.ts
│   │   └── production.ts
│   ├── index.ts
│   └── main.ts
├── test/
│   └── stacks/
│       ├── vnet-stack.test.ts
│       └── subnet-stack.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Sharing Code Between Packages

### Creating Common Package

Create a shared package for reusable code:

```typescript
// packages/common/src/constructs/secure-storage.ts
import { StorageAccount, StorageAccountProps } from '@atakora/lib';
import { Construct } from '@atakora/lib';

export interface SecureStorageAccountProps extends Omit<StorageAccountProps, 'properties'> {
  properties?: Partial<StorageAccountProps['properties']>;
}

export class SecureStorageAccount extends StorageAccount {
  constructor(scope: Construct, id: string, props: SecureStorageAccountProps) {
    super(scope, id, {
      ...props,
      properties: {
        supportsHttpsTrafficOnly: true,
        minimumTlsVersion: 'TLS1_2',
        allowBlobPublicAccess: false,
        encryption: {
          services: {
            blob: { enabled: true, keyType: 'Account' },
            file: { enabled: true, keyType: 'Account' }
          },
          keySource: 'Microsoft.Storage'
        },
        ...props.properties
      }
    });
  }
}
```

```typescript
// packages/common/src/config/base-config.ts
export interface EnvironmentConfig {
  environment: 'dev' | 'staging' | 'production';
  location: string;
  tags: Record<string, string>;
}

export const baseConfig: Record<string, EnvironmentConfig> = {
  dev: {
    environment: 'dev',
    location: 'eastus',
    tags: {
      environment: 'development',
      managedBy: 'atakora'
    }
  },
  staging: {
    environment: 'staging',
    location: 'eastus2',
    tags: {
      environment: 'staging',
      managedBy: 'atakora'
    }
  },
  production: {
    environment: 'production',
    location: 'eastus',
    tags: {
      environment: 'production',
      managedBy: 'atakora'
    }
  }
};
```

Export from common package:

```typescript
// packages/common/src/index.ts
export * from './constructs/secure-storage';
export * from './constructs/monitored-webapp';
export * from './config/base-config';
export * from './utils/naming';
```

### Using Shared Code

Import and use in other packages:

```typescript
// packages/web-app/src/stacks/app-stack.ts
import { Stack, ResourceGroup, AppServicePlan, WebApp } from '@atakora/lib';
import { SecureStorageAccount, baseConfig } from '@myorg/common';

export class WebAppStack extends Stack {
  constructor(environment: string) {
    super(`web-app-${environment}`);

    const config = baseConfig[environment];

    const rg = new ResourceGroup(this, 'rg', {
      location: config.location,
      tags: config.tags
    });

    // Use shared secure storage construct
    const storage = new SecureStorageAccount(this, 'storage', {
      resourceGroup: rg,
      location: config.location
    });

    // Rest of stack...
  }
}
```

## Managing Dependencies

### Package Dependencies

Define dependencies in `package.json`:

```json
{
  "name": "@myorg/web-app",
  "dependencies": {
    "@atakora/lib": "^1.0.0",
    "@myorg/common": "workspace:*",
    "@myorg/networking": "workspace:*"
  }
}
```

### Cross-Package References

Reference resources from other packages:

```typescript
// packages/networking/src/stacks/vnet-stack.ts
export class NetworkStack extends Stack {
  public readonly vnetId: string;
  public readonly subnetId: string;

  constructor() {
    super('networking');

    const vnet = new VirtualNetwork(this, 'vnet', {
      // ...
    });

    const subnet = new Subnet(this, 'subnet', {
      // ...
    });

    this.vnetId = vnet.id;
    this.subnetId = subnet.id;
  }
}
```

```typescript
// packages/web-app/src/stacks/app-stack.ts
import { NetworkStack } from '@myorg/networking';

export class WebAppStack extends Stack {
  constructor() {
    super('web-app');

    // Reference networking package resources
    const networkStack = new NetworkStack();

    const webApp = new WebApp(this, 'webapp', {
      // ...
      properties: {
        virtualNetworkSubnetId: networkStack.subnetId
      }
    });
  }
}
```

### Dependency Management with Workspaces

Use npm/pnpm/yarn workspaces:

```json
// Root package.json
{
  "name": "infrastructure-monorepo",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "synth": "npm run synth --workspace=@myorg/web-app",
    "deploy:all": "npm run deploy --workspaces"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

Install dependencies:

```bash
# Install all package dependencies
npm install

# Add dependency to specific package
npm install --workspace=@myorg/web-app @azure/identity
```

## Deployment Workflows

### Sequential Deployment

Deploy packages in dependency order:

```bash
#!/bin/bash
# deploy.sh

# Deploy foundation first
atakora deploy --package networking
atakora deploy --package security

# Then platform services
atakora deploy --package platform

# Finally applications
atakora deploy --package web-app
atakora deploy --package api
```

### Parallel Deployment

Deploy independent packages simultaneously:

```bash
#!/bin/bash
# deploy-parallel.sh

# Deploy independent packages in parallel
atakora deploy --package web-app &
atakora deploy --package api &
atakora deploy --package background-jobs &

# Wait for all to complete
wait
```

### Conditional Deployment

Deploy only changed packages:

```bash
#!/bin/bash
# deploy-changed.sh

# Get changed packages
CHANGED_PACKAGES=$(git diff --name-only main | grep "packages/" | cut -d'/' -f2 | sort -u)

for package in $CHANGED_PACKAGES; do
  echo "Deploying changed package: $package"
  atakora deploy --package $package
done
```

### Environment-Specific Deployment

Deploy with environment configuration:

```bash
#!/bin/bash
# deploy-env.sh

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
  echo "Usage: ./deploy-env.sh <dev|staging|production>"
  exit 1
fi

# Set Azure config for environment
atakora config set subscription-id $SUBSCRIPTION_ID
atakora config set resource-group rg-$ENVIRONMENT

# Deploy all packages for environment
atakora deploy --package networking --var environment=$ENVIRONMENT
atakora deploy --package web-app --var environment=$ENVIRONMENT
atakora deploy --package api --var environment=$ENVIRONMENT
```

## Monorepo vs Multi-Repo

### Monorepo Approach

All packages in single repository:

```
infrastructure/          (single repo)
├── packages/
│   ├── common/
│   ├── networking/
│   ├── web-app/
│   └── api/
├── package.json
├── tsconfig.base.json
└── turbo.json
```

**Pros**:
- Easier to share code
- Atomic changes across packages
- Simplified dependency management
- Single CI/CD pipeline

**Cons**:
- Larger repository
- All teams see all code
- Potential for unwanted coupling

**Tools**: Turborepo, Nx, Lerna

### Multi-Repo Approach

Separate repository per package:

```
infrastructure-common/   (repo 1)
infrastructure-networking/ (repo 2)
infrastructure-web-app/  (repo 3)
infrastructure-api/      (repo 4)
```

**Pros**:
- Clear ownership boundaries
- Independent versioning
- Smaller, focused repositories

**Cons**:
- Harder to share code
- Complex dependency management
- Multiple CI/CD pipelines

**Tools**: Git submodules, package registries (npm, Azure Artifacts)

### Recommendation

**Use Monorepo when**:
- Single team or closely collaborating teams
- Frequent cross-package changes
- Shared infrastructure patterns
- Starting a new project

**Use Multi-Repo when**:
- Multiple independent teams
- Different release cycles
- Strict ownership boundaries
- Existing separate repositories

## Common Patterns

### Layered Architecture

```typescript
// packages/foundation/src/main.ts
export class FoundationStack extends Stack {
  public readonly vnetId: string;
  public readonly keyVaultId: string;

  constructor(env: string) {
    super(`foundation-${env}`);

    const rg = new ResourceGroup(this, 'foundation-rg', {
      location: 'eastus'
    });

    const vnet = new VirtualNetwork(this, 'vnet', {
      resourceGroup: rg,
      location: 'eastus',
      properties: {
        addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
      }
    });

    const keyVault = new KeyVault(this, 'kv', {
      resourceGroup: rg,
      location: 'eastus'
    });

    this.vnetId = vnet.id;
    this.keyVaultId = keyVault.id;
  }
}
```

```typescript
// packages/application/src/main.ts
import { FoundationStack } from '@myorg/foundation';

export class ApplicationStack extends Stack {
  constructor(env: string) {
    super(`application-${env}`);

    // Reference foundation layer
    const foundation = new FoundationStack(env);

    const webApp = new WebApp(this, 'webapp', {
      // ...
      properties: {
        virtualNetworkSubnetId: `${foundation.vnetId}/subnets/app-subnet`
      }
    });
  }
}
```

### Feature Flags

Enable/disable features per package:

```typescript
// packages/common/src/config/features.ts
export interface FeatureFlags {
  enableMonitoring: boolean;
  enableCdn: boolean;
  enableCache: boolean;
}

export const features: Record<string, FeatureFlags> = {
  dev: {
    enableMonitoring: false,
    enableCdn: false,
    enableCache: false
  },
  production: {
    enableMonitoring: true,
    enableCdn: true,
    enableCache: true
  }
};
```

```typescript
// packages/web-app/src/stacks/app-stack.ts
import { features } from '@myorg/common';

export class WebAppStack extends Stack {
  constructor(env: string) {
    super(`webapp-${env}`);

    const flags = features[env];

    // ... create web app ...

    if (flags.enableMonitoring) {
      const insights = new ApplicationInsights(this, 'insights', {
        // ...
      });
    }

    if (flags.enableCdn) {
      const cdn = new CdnProfile(this, 'cdn', {
        // ...
      });
    }
  }
}
```

### Shared Configuration

Centralize configuration:

```typescript
// packages/common/src/config/index.ts
export interface AppConfig {
  environment: string;
  location: string;
  resourceGroupName: string;
  tags: Record<string, string>;
  networking: {
    vnetAddressSpace: string;
    subnetAddressPrefix: string;
  };
  appService: {
    skuName: string;
    skuTier: string;
  };
}

export const config: Record<string, AppConfig> = {
  dev: {
    environment: 'dev',
    location: 'eastus',
    resourceGroupName: 'rg-dev',
    tags: { environment: 'dev', managedBy: 'atakora' },
    networking: {
      vnetAddressSpace: '10.0.0.0/16',
      subnetAddressPrefix: '10.0.1.0/24'
    },
    appService: {
      skuName: 'B1',
      skuTier: 'Basic'
    }
  },
  production: {
    environment: 'production',
    location: 'eastus',
    resourceGroupName: 'rg-prod',
    tags: { environment: 'production', managedBy: 'atakora' },
    networking: {
      vnetAddressSpace: '10.1.0.0/16',
      subnetAddressPrefix: '10.1.1.0/24'
    },
    appService: {
      skuName: 'P1v2',
      skuTier: 'PremiumV2'
    }
  }
};
```

Use across packages:

```typescript
import { config } from '@myorg/common';

const appConfig = config[process.env.ENVIRONMENT || 'dev'];

const plan = new AppServicePlan(this, 'plan', {
  resourceGroup: rg,
  location: appConfig.location,
  sku: {
    name: appConfig.appService.skuName,
    tier: appConfig.appService.skuTier
  }
});
```

## Best Practices

### 1. Clear Package Boundaries

```
✅ Good: Clear separation
packages/
├── networking/     # Only networking resources
├── storage/        # Only storage resources
└── compute/        # Only compute resources

❌ Avoid: Mixed concerns
packages/
└── infrastructure/ # Everything in one package
```

### 2. Minimize Cross-Package Dependencies

```typescript
// ✅ Good: Export only necessary interfaces
export class NetworkStack extends Stack {
  public readonly subnetId: string;
  public readonly nsgId: string;
}

// ❌ Avoid: Exposing internal details
export class NetworkStack extends Stack {
  public readonly vnet: VirtualNetwork;
  public readonly subnet: Subnet;
  public readonly nsg: NetworkSecurityGroup;
  public readonly privateEndpoint: PrivateEndpoint;
}
```

### 3. Version Shared Packages

```json
// ✅ Good: Semantic versioning
{
  "name": "@myorg/common",
  "version": "2.1.0"
}

// Consumer
{
  "dependencies": {
    "@myorg/common": "^2.1.0"
  }
}
```

### 4. Document Package Purpose

Create comprehensive README for each package:

```markdown
# @myorg/networking

## Purpose
Manages all networking infrastructure including VNets, subnets, NSGs, and routing.

## Resources Created
- Virtual Networks
- Subnets
- Network Security Groups
- Route Tables

## Usage
\`\`\`typescript
import { NetworkStack } from '@myorg/networking';

const network = new NetworkStack('production');
\`\`\`

## Exports
- `NetworkStack`: Main networking stack
- `subnetId`: ID of application subnet
- `vnetId`: ID of virtual network
```

### 5. Consistent Structure

Use same structure across all packages:

```
packages/*/
├── src/
│   ├── stacks/
│   ├── constructs/
│   ├── config/
│   ├── index.ts
│   └── main.ts
├── test/
├── package.json
├── tsconfig.json
└── README.md
```

## Next Steps

- **[Managing Secrets](./managing-secrets.md)**: Secure secret handling across packages
- **[Deploying Environments](./deploying-environments.md)**: Deploy multi-package infrastructure
- **[Testing Infrastructure](./testing-infrastructure.md)**: Test multi-package projects

## Related Documentation

- [Core Concepts](../core-concepts/README.md) - Understanding packages and stacks
- [CLI Reference](../../reference/cli/README.md) - Package management commands
- [Examples](../../examples/README.md) - Multi-package example projects

---

**Feedback**: Found an issue or have a suggestion? [Open an issue](https://github.com/your-org/atakora/issues) on GitHub.
