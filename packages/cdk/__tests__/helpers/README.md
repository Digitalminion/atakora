# Test Helpers and Fixtures

> **Shared test utilities for the @atakora/cdk package**

## Overview

This directory contains reusable test fixtures and helpers to maintain consistency across the CDK test suite and reduce code duplication.

## Available Fixtures

### MockResourceGroup

A lightweight implementation of `IResourceGroup` interface for testing resources that require a resource group parent.

**Why use this?**
- The actual `ResourceGroups` class is in `@atakora/cdk/resources` and not exported from main package
- Implementation uses duck-typing for `IResourceGroup` interface
- Tests don't need the full ResourceGroup implementation

**Usage:**

```typescript
import { MockResourceGroup } from '../helpers/test-fixtures';
import { App } from '@atakora/lib';

const app = new App();
const rg = new MockResourceGroup(app, 'TestRG', {
  resourceGroupName: 'test-rg',
  location: 'eastus',
  tags: { environment: 'test' },
});

// Use it as parent for any resource
const vnet = new VirtualNetworks(rg, 'VNet', {
  addressSpace: '10.0.0.0/16',
});
```

**Important:** Always provide a parent construct (App or Stack) when creating MockResourceGroup:

```typescript
// ✅ Good
const app = new App();
const rg = new MockResourceGroup(app, 'TestRG');

// ❌ Bad - causes "Cannot read properties of undefined (reading 'addChild')"
const rg = new MockResourceGroup(undefined, 'TestRG');
const rg = new MockResourceGroup(undefined as any, 'TestRG');
```

### createMockResourceGroup()

Helper function to create a MockResourceGroup with sensible defaults:

```typescript
import { createMockResourceGroup } from '../helpers/test-fixtures';

// With defaults
const rg = createMockResourceGroup();

// With custom options
const rg = createMockResourceGroup({
  resourceGroupName: 'my-custom-rg',
  location: 'westus2',
  tags: { environment: 'production' },
});
```

### MockPlan

Mock App Service Plan reference for Function App tests.

**Usage:**

```typescript
import { createMockPlan } from '../helpers/test-fixtures';

const plan = createMockPlan();
// or with custom values
const plan = createMockPlan({
  planId: '/subscriptions/my-sub/resourceGroups/my-rg/providers/Microsoft.Web/serverfarms/my-plan',
  location: 'westus2',
});

const functionApp = new FunctionApp(resourceGroup, 'Function', {
  plan,
  storageAccount: mockStorage,
});
```

### MockStorage

Mock Storage Account reference for Function App tests.

**Usage:**

```typescript
import { createMockStorage } from '../helpers/test-fixtures';

const storage = createMockStorage();
// or with custom values
const storage = createMockStorage({
  storageAccountName: 'mystorageaccount',
  storageAccountId: '/subscriptions/my-sub/.../storageAccounts/mystorageaccount',
});

const functionApp = new FunctionApp(resourceGroup, 'Function', {
  plan: mockPlan,
  storageAccount: storage,
});
```

## Constants

### TEST_SUBSCRIPTION_ID

Default test subscription ID for consistent testing:

```typescript
import { TEST_SUBSCRIPTION_ID } from '../helpers/test-fixtures';

const stack = new SubscriptionStack(app, 'Stack', {
  subscription: Subscription.fromId(TEST_SUBSCRIPTION_ID),
  // ...
});
```

### TEST_TENANT_ID

Default test tenant ID for consistent testing:

```typescript
import { TEST_TENANT_ID } from '../helpers/test-fixtures';

// Use in tests that need a tenant ID
```

## Architecture Decisions

### Why Duck-Typing?

The CDK uses duck-typing for the `IResourceGroup` interface:

```typescript
// From virtual-networks.ts
private isResourceGroup(construct: any): construct is IResourceGroup {
  return (
    construct &&
    typeof construct.resourceGroupName === 'string' &&
    typeof construct.location === 'string'
  );
}
```

**Benefits:**
- ✅ Tests don't need the actual ResourceGroups class
- ✅ Decouples tests from implementation details
- ✅ Makes mocking easier
- ✅ Faster test execution (no full stack required)

### Why Not Import ResourceGroups?

1. **Not exported from main package** - `ResourceGroups` is in `@atakora/cdk/resources` but not re-exported from `@atakora/cdk`
2. **Duck-typing is the pattern** - Implementation checks for interface properties, not class type
3. **Tests are simpler** - MockResourceGroup is lightweight and purpose-built for testing

## Adding New Fixtures

When adding new fixtures to this file:

1. **Export the fixture class** for direct use
2. **Export a helper function** with `create` prefix for convenience
3. **Document usage** with JSDoc comments
4. **Add to this README** with examples

### Example Template:

```typescript
/**
 * Mock for XYZ resource.
 *
 * @remarks
 * Description of why this mock exists and when to use it.
 *
 * @example
 * ```typescript
 * import { MockXYZ, createMockXYZ } from '../helpers/test-fixtures';
 *
 * const xyz = createMockXYZ({ option: 'value' });
 * ```
 */
export class MockXYZ extends Construct {
  public readonly someProperty: string;

  constructor(
    scope?: Construct,
    id: string = 'MockXYZ',
    options?: {
      someProperty?: string;
    }
  ) {
    super(scope ?? ({} as any), id);
    this.someProperty = options?.someProperty ?? 'default-value';
  }
}

/**
 * Creates a mock XYZ with default test values.
 *
 * @param options - Optional overrides for default values
 * @returns MockXYZ instance
 */
export function createMockXYZ(options?: {
  someProperty?: string;
}): MockXYZ {
  return new MockXYZ(undefined, 'MockXYZ', options);
}
```

## Migration Guide

### Migrating Existing Tests

If you have tests using the old pattern:

**Before:**

```typescript
// BEFORE: Creating custom mocks in each test file
class MockResourceGroup extends Construct {
  public readonly resourceGroupName = 'test-rg';
  public readonly location = 'eastus';
  public readonly tags = { environment: 'test' };
}

describe('MyResource', () => {
  let rg: MockResourceGroup;

  beforeEach(() => {
    rg = new MockResourceGroup(undefined as any, 'TestRG');
  });

  // tests...
});
```

**After:**

```typescript
// AFTER: Using shared fixtures
import { MockResourceGroup } from '../helpers/test-fixtures';
import { App } from '@atakora/lib';

describe('MyResource', () => {
  let app: App;
  let rg: MockResourceGroup;

  beforeEach(() => {
    app = new App();
    rg = new MockResourceGroup(app, 'TestRG');
  });

  // tests...
});
```

**Key Changes:**
1. ✅ Import MockResourceGroup from test-fixtures
2. ✅ Create App instance in beforeEach
3. ✅ Pass app as parent to MockResourceGroup
4. ✅ Remove custom MockResourceGroup definition

## Troubleshooting

### Error: "Cannot read properties of undefined (reading 'addChild')"

**Cause:** MockResourceGroup was created without a parent construct.

**Solution:** Always pass a parent (App or Stack):

```typescript
// ❌ Wrong
const rg = new MockResourceGroup(undefined, 'TestRG');

// ✅ Correct
const app = new App();
const rg = new MockResourceGroup(app, 'TestRG');
```

### Error: "ResourceGroup is not a constructor"

**Cause:** Trying to import `ResourceGroup` from `@atakora/cdk`.

**Solution:** Use MockResourceGroup instead:

```typescript
// ❌ Wrong
import { ResourceGroup } from '@atakora/cdk';

// ✅ Correct
import { MockResourceGroup } from '../helpers/test-fixtures';
```

### Error: Module not found '@atakora/lib/src/...'

**Cause:** Using deep import paths instead of package exports.

**Solution:** Import from package root:

```typescript
// ❌ Wrong
import { PrincipalType } from '@atakora/lib/src/core/grants/principal-type';

// ✅ Correct
import { PrincipalType } from '@atakora/lib';
```

## See Also

- [Testing Guide](../TESTING_GUIDE.md) - Comprehensive testing patterns and best practices
- [test-fixtures.ts](./test-fixtures.ts) - Source code for all fixtures
- [test-setup.ts](./test-setup.ts) - Global test configuration

---

**Maintained By**: Atakora CDK Team
**Last Updated**: 2025-11-20
