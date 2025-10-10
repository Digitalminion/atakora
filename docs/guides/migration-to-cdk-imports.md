# Migration Guide: Updating to CDK-Only Imports

---

> **CRITICAL MIGRATION REQUIRED**
>
> This is a **breaking change** in Atakora's import patterns. All existing user code must be updated to use the new import pattern.
>
> **What changed**: `@atakora/lib` is now internal-only. All framework classes must be imported from `@atakora/cdk`.
>
> **Action required**: Update all imports in your infrastructure code following the patterns in this guide.
>
> **Deadline**: Required for Atakora v1.1.0 and later. Support for `@atakora/lib` imports will be removed in v2.0.0.
>
> See [ADR-004](../design/architecture/adr-004-lib-internal-cdk-exports.md) for complete architectural rationale.

---

This guide helps you migrate from importing framework classes from `@atakora/lib` to the new pattern of importing everything from `@atakora/cdk`.

## Overview

Starting with Atakora v1.1.0, `@atakora/lib` is an internal package. All public APIs are now available through `@atakora/cdk`. This change:

- Simplifies package management (one package to install)
- Provides a clearer API surface
- Protects your code from internal framework changes
- Aligns with industry best practices (similar to AWS CDK v2)

## Quick Migration Steps

### Step 1: Update Your Package Dependencies

**Before:**
```json
{
  "dependencies": {
    "@atakora/lib": "^1.0.0",
    "@atakora/cdk": "^1.0.0"
  }
}
```

**After:**
```json
{
  "dependencies": {
    "@atakora/cdk": "^1.1.0"
  }
}
```

Remove `@atakora/lib` from your dependencies:
```bash
npm uninstall @atakora/lib
npm install @atakora/cdk@latest
```

### Step 2: Update Your Imports

#### Framework Class Imports

**Before:**
```typescript
import { App, SubscriptionStack, ResourceGroupStack } from '@atakora/lib';
import { Construct } from '@atakora/lib';
import { Resource } from '@atakora/lib';
```

**After:**
```typescript
import { App, SubscriptionStack, ResourceGroupStack } from '@atakora/cdk';
import { Construct } from '@atakora/cdk';
import { Resource } from '@atakora/cdk';
```

#### Naming Component Imports

**Before:**
```typescript
import {
  Organization,
  Project,
  Environment,
  Instance,
  Geography,
  Subscription
} from '@atakora/lib';
```

**After:**
```typescript
import {
  Organization,
  Project,
  Environment,
  Instance,
  Geography,
  Subscription
} from '@atakora/cdk';
```

#### Utility Function Imports

**Before:**
```typescript
import { constructIdToPurpose, generateResourceName } from '@atakora/lib';
```

**After:**
```typescript
import { constructIdToPurpose, generateResourceName } from '@atakora/cdk';
```

#### Type Imports

**Before:**
```typescript
import type {
  ArmResource,
  ResourceProps,
  ValidationResult,
  AppProps,
  SubscriptionStackProps
} from '@atakora/lib';
```

**After:**
```typescript
import type {
  ArmResource,
  ResourceProps,
  ValidationResult,
  AppProps,
  SubscriptionStackProps
} from '@atakora/cdk';
```

#### Managed Identity Imports

**Before:**
```typescript
import {
  ManagedIdentityType,
  createSystemAssignedIdentity,
  createUserAssignedIdentity
} from '@atakora/lib';
```

**After:**
```typescript
import {
  ManagedIdentityType,
  createSystemAssignedIdentity,
  createUserAssignedIdentity
} from '@atakora/cdk';
```

### Step 3: Update Resource Imports (No Change)

Resource imports remain the same - they continue to use namespace subpaths:

```typescript
// These don't change
import { VirtualNetworks, NetworkSecurityGroups } from '@atakora/cdk/network';
import { StorageAccounts } from '@atakora/cdk/storage';
import { Sites, ServerFarms } from '@atakora/cdk/web';
```

## Complete Example

### Before Migration

```typescript
import { App, ResourceGroupStack } from '@atakora/lib';
import { Organization, Project, Environment, Instance } from '@atakora/lib';
import { Geography, Subscription } from '@atakora/lib';
import type { ResourceProps } from '@atakora/lib';
import { VirtualNetworks } from '@atakora/cdk/network';
import { StorageAccounts } from '@atakora/cdk/storage';

const app = new App();

const stack = new ResourceGroupStack(app, 'ProductionStack', {
  subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
  geography: Geography.fromValue('eastus'),
  organization: Organization.fromValue('engineering'),
  project: new Project('myapp'),
  environment: Environment.fromValue('prod'),
  instance: Instance.fromNumber(1),
  resourceGroupName: 'rg-myapp-prod'
});

const vnet = new VirtualNetworks(stack, 'MainVNet', {
  addressPrefixes: ['10.0.0.0/16']
});

const storage = new StorageAccounts(stack, 'DataStorage', {
  kind: 'StorageV2',
  sku: 'Standard_LRS'
});

app.synth();
```

### After Migration

```typescript
import {
  App,
  ResourceGroupStack,
  Organization,
  Project,
  Environment,
  Instance,
  Geography,
  Subscription
} from '@atakora/cdk';  // All framework imports from CDK root
import type { ResourceProps } from '@atakora/cdk';  // Types also from CDK root
import { VirtualNetworks } from '@atakora/cdk/network';  // Resources unchanged
import { StorageAccounts } from '@atakora/cdk/storage';   // Resources unchanged

const app = new App();

const stack = new ResourceGroupStack(app, 'ProductionStack', {
  subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
  geography: Geography.fromValue('eastus'),
  organization: Organization.fromValue('engineering'),
  project: new Project('myapp'),
  environment: Environment.fromValue('prod'),
  instance: Instance.fromNumber(1),
  resourceGroupName: 'rg-myapp-prod'
});

const vnet = new VirtualNetworks(stack, 'MainVNet', {
  addressPrefixes: ['10.0.0.0/16']
});

const storage = new StorageAccounts(stack, 'DataStorage', {
  kind: 'StorageV2',
  sku: 'Standard_LRS'
});

app.synth();
```

## Automated Migration Tool

We provide an automated tool to update your imports:

```bash
npx @atakora/cdk-migrate update-imports
```

This tool will:
1. Scan your TypeScript/JavaScript files
2. Update all `@atakora/lib` imports to `@atakora/cdk`
3. Preserve type-only imports
4. Update your package.json

### Manual Review Required

After running the migration tool, review:
- Custom import patterns
- Dynamic imports
- Re-exports from your own modules

## Import Patterns Reference

### ✅ Correct Import Patterns

```typescript
// Framework classes from CDK root
import { App, Stack, Construct } from '@atakora/cdk';

// Resources from namespace subpaths
import { VirtualNetworks } from '@atakora/cdk/network';
import { StorageAccounts } from '@atakora/cdk/storage';

// Types from CDK root
import type { ArmResource, ValidationResult } from '@atakora/cdk';
```

### ❌ Incorrect Import Patterns

```typescript
// DON'T import framework classes from lib
import { App } from '@atakora/lib';  // ❌ Wrong

// DON'T import from lib at all
import { anything } from '@atakora/lib';  // ❌ Wrong

// DON'T use deep imports into CDK internals
import { Something } from '@atakora/cdk/dist/core/app';  // ❌ Wrong
```

## Troubleshooting

### TypeScript Can't Find Types

If TypeScript can't resolve types after migration:

1. Clear TypeScript cache:
```bash
rm -rf node_modules/.cache
rm -rf dist
```

2. Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

3. Restart TypeScript server in your IDE

### Module Resolution Errors

If you get module resolution errors:

1. Ensure you're using `@atakora/cdk` version 1.1.0 or later
2. Check your `tsconfig.json` moduleResolution is set to "node"
3. Verify no old `@atakora/lib` imports remain

### Build Errors

If your build fails:

1. Ensure all imports are updated
2. Check for any custom webpack/rollup configurations that might need updating
3. Look for any re-exports in your code that might need updating

## FAQ

### Why This Change?

`@atakora/lib` contains internal framework implementation details that may change between versions. By importing from `@atakora/cdk`, you're using the stable public API that we guarantee won't break.

### Is @atakora/lib Still Available?

Yes, but it's marked as internal. You shouldn't install or import from it directly. It's a dependency of `@atakora/cdk` and is managed automatically.

### What If I Need Something From lib?

If you need something that was in `@atakora/lib` but isn't re-exported from `@atakora/cdk`, please:
1. Check if there's an alternative in CDK
2. Open an issue requesting the export
3. Consider if you're using an internal API that you shouldn't depend on

### Will My Old Code Break?

In version 1.x, we maintain backward compatibility with deprecation warnings. In version 2.0, direct `@atakora/lib` imports will no longer work.

### How Do I Know What's Available?

Use your IDE's autocomplete on `@atakora/cdk` to see all available exports. The CDK root module re-exports all public framework APIs.

## Getting Help

If you encounter issues during migration:

1. Check this guide and the FAQ
2. Search existing issues on GitHub
3. Open a new issue with:
   - Your current code (before migration)
   - The error you're encountering
   - Your package versions

## Timeline

- **v1.1.0** (Current): Both patterns work, `@atakora/lib` shows deprecation warnings
- **v1.x**: Continued support with warnings
- **v2.0.0** (Future): `@atakora/lib` imports will no longer work

Start migrating now to avoid issues when v2.0 is released!