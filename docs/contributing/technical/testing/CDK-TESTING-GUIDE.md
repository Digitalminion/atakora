# CDK Testing Guide

> **Comprehensive guide for writing tests in the @atakora/cdk package**

## Table of Contents

- [Quick Start](#quick-start)
- [Testing Patterns](#testing-patterns)
- [Test Fixtures](#test-fixtures)
- [Common Pitfalls](#common-pitfalls)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## Quick Start

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  App,
  SubscriptionStack,
  Subscription,
  Geography,
  Organization,
  Project,
  Environment,
  Instance,
} from '@atakora/cdk';
import { MockResourceGroup } from '../helpers/test-fixtures';
import { VirtualNetworks } from '../index';

describe('MyResource', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: MockResourceGroup;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-minion'),
      project: new Project('myapp'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
    });

    resourceGroup = new MockResourceGroup(stack, 'TestRG', {
      resourceGroupName: 'test-rg',
      location: 'eastus',
    });
  });

  it('should create resource with defaults', () => {
    const resource = new VirtualNetworks(resourceGroup, 'MyVNet', {
      addressSpace: '10.0.0.0/16',
    });

    expect(resource.virtualNetworkName).toBeDefined();
    expect(resource.location).toBe('eastus');
  });
});
```

---

## Testing Patterns

### 1. Resource Creation Tests

Test that resources can be created with various configurations:

```typescript
describe('constructor', () => {
  it('should create with minimal configuration', () => {
    const resource = new MyResource(resourceGroup, 'Test', {
      // minimum required props
    });

    expect(resource.name).toBeDefined();
  });

  it('should create with full configuration', () => {
    const resource = new MyResource(resourceGroup, 'Test', {
      name: 'custom-name',
      location: 'westus2',
      tags: { env: 'prod' },
      // all optional props
    });

    expect(resource.name).toBe('custom-name');
    expect(resource.location).toBe('westus2');
  });

  it('should apply defaults correctly', () => {
    const resource = new MyResource(resourceGroup, 'Test', {});

    expect(resource.location).toBe(resourceGroup.location);
    expect(resource.tags).toMatchObject(resourceGroup.tags);
  });
});
```

### 2. Auto-Naming Tests

Test that auto-generated names follow the expected format:

```typescript
describe('auto-naming', () => {
  it('should generate name with expected format', () => {
    const resource = new VirtualNetworks(resourceGroup, 'MainVNet', {
      addressSpace: '10.0.0.0/16',
    });

    // Format: {type}-{purpose}-{org}-{project}-{env}-{geo}-{instance}
    // Example: vnet-main-dp-authr-nonprod-eus-01
    expect(resource.virtualNetworkName).toMatch(/vnet-\w+-\w+-\w+-\w+-\w+-\d+/);
    expect(resource.virtualNetworkName).toContain('vnet-');
    expect(resource.virtualNetworkName).toContain('-main-'); // purpose from ID
  });

  it('should handle different construct IDs', () => {
    const testCases = [
      { id: 'MainVNet', expectedPurpose: '-main-' },
      { id: 'ApplicationVNet', expectedPurpose: '-application-' },
    ];

    testCases.forEach(({ id, expectedPurpose }) => {
      const vnet = new VirtualNetworks(resourceGroup, id, {
        addressSpace: '10.0.0.0/16',
      });
      expect(vnet.virtualNetworkName).toContain(expectedPurpose);
    });
  });
});
```

### 3. Tag Merging Tests

Test that tags are properly inherited and merged:

```typescript
describe('tag merging', () => {
  it('should inherit parent tags', () => {
    const resource = new MyResource(resourceGroup, 'Test', {});

    expect(resource.tags).toMatchObject(resourceGroup.tags);
  });

  it('should merge custom tags with parent tags', () => {
    const resource = new MyResource(resourceGroup, 'Test', {
      tags: {
        costCenter: '1234',
        owner: 'platform-team',
      },
    });

    expect(resource.tags).toMatchObject({
      ...resourceGroup.tags,
      costCenter: '1234',
      owner: 'platform-team',
    });
  });

  it('should override parent tags when specified', () => {
    const resource = new MyResource(resourceGroup, 'Test', {
      tags: {
        environment: 'production', // override parent tag
      },
    });

    expect(resource.tags.environment).toBe('production');
  });
});
```

### 4. Validation Tests

Test that resources validate their configuration:

```typescript
describe('validation', () => {
  it('should throw error if parent is not a ResourceGroup', () => {
    const plainConstruct = new Construct(app, 'Plain');

    expect(() => {
      new MyResource(plainConstruct, 'Test', {});
    }).toThrow(/must be created within or under a ResourceGroup/);
  });

  it('should accept nested constructs under ResourceGroup', () => {
    const nested = new Construct(resourceGroup, 'Nested');

    const resource = new MyResource(nested, 'Test', {});

    expect(resource).toBeDefined();
  });
});
```

### 5. Grant Method Tests

Test RBAC grant methods:

```typescript
import { IGrantable, PrincipalType, WellKnownRoleIds } from '@atakora/lib';

class MockGrantable implements IGrantable {
  public readonly principalId = '11111111-2222-3333-4444-555555555555';
  public readonly principalType = PrincipalType.ManagedIdentity;
  public readonly tenantId?: string;
}

describe('grant methods', () => {
  let grantable: IGrantable;

  beforeEach(() => {
    grantable = new MockGrantable();
  });

  it('should grant read access', () => {
    const storage = new StorageAccounts(resourceGroup, 'Storage', {
      storageAccountName: 'testsa',
    });

    const grant = storage.grantBlobRead(grantable);

    expect(grant).toBeDefined();
    expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_BLOB_DATA_READER);
    expect(grant.scope).toBe(storage.resourceId);
    expect(grant.grantee).toBe(grantable);
  });

  it('should support multiple grants', () => {
    const storage = new StorageAccounts(resourceGroup, 'Storage', {
      storageAccountName: 'testsa',
    });

    const grant1 = storage.grantBlobRead(grantable);
    const grant2 = storage.grantQueueProcess(grantable);

    expect(grant1.roleDefinitionId).not.toBe(grant2.roleDefinitionId);
    expect(grant1.scope).toBe(grant2.scope);
  });
});
```

---

## Test Fixtures

### Using MockResourceGroup

**Always use the shared MockResourceGroup** from test fixtures:

```typescript
import { MockResourceGroup, createMockResourceGroup } from '../helpers/test-fixtures';

// Option 1: With App parent (recommended for most tests)
const app = new App();
const rg = new MockResourceGroup(app, 'TestRG', {
  resourceGroupName: 'test-rg',
  location: 'eastus',
  tags: { environment: 'test' },
});

// Option 2: With SubscriptionStack parent (for integration tests)
const stack = new SubscriptionStack(app, 'TestStack', { ... });
const rg = new MockResourceGroup(stack, 'TestRG');

// Option 3: Using helper function
const rg = createMockResourceGroup({
  location: 'westus2',
});
```

### Using Mock Function App Dependencies

```typescript
import { createMockPlan, createMockStorage } from '../helpers/test-fixtures';

const plan = createMockPlan();
const storage = createMockStorage();

const functionApp = new FunctionApp(resourceGroup, 'Function', {
  plan,
  storageAccount: storage,
  identity: {
    type: ManagedServiceIdentityType.SYSTEM_ASSIGNED,
  },
});
```

### Creating Custom Mocks

If you need custom mocks, add them to `__tests__/helpers/test-fixtures.ts`:

```typescript
export class MockCosmosDB extends Construct {
  public readonly accountId: string;
  public readonly location: string;

  constructor(scope: Construct, id: string, options?: { location?: string }) {
    super(scope, id);
    this.location = options?.location ?? 'eastus';
    this.accountId = `/subscriptions/test/resourceGroups/test-rg/providers/Microsoft.DocumentDB/databaseAccounts/${id}`;
  }
}
```

---

## Common Pitfalls

### ❌ DON'T: Import Non-Existent Classes

```typescript
// WRONG: ResourceGroup is not exported from @atakora/cdk
import { ResourceGroup } from '@atakora/cdk';

// WRONG: The actual class name is ResourceGroups (plural), not ResourceGroup
import { ResourceGroups } from '@atakora/cdk/resources';
```

✅ **DO: Use MockResourceGroup**

```typescript
import { MockResourceGroup } from '../helpers/test-fixtures';
```

### ❌ DON'T: Create MockResourceGroup Without Parent

```typescript
// WRONG: undefined parent causes errors
const rg = new MockResourceGroup(undefined, 'TestRG');
const rg = new MockResourceGroup(undefined as any, 'TestRG');
```

✅ **DO: Always Provide a Parent**

```typescript
const app = new App();
const rg = new MockResourceGroup(app, 'TestRG');
```

### ❌ DON'T: Test Runtime Immutability of TypeScript `readonly`

```typescript
// WRONG: TypeScript readonly is compile-time only
it('should enforce readonly at runtime', () => {
  const obj: IMyInterface = { prop: 'value' };
  obj.prop = 'changed'; // This WILL change the value at runtime!
  expect(obj.prop).toBe('value'); // FAILS
});
```

✅ **DO: Test Compile-Time Type Safety**

```typescript
it('should enforce readonly at compile-time', () => {
  const obj: IMyInterface = { prop: 'value' };

  // @ts-expect-error - Cannot assign to readonly property
  obj.prop = 'changed';

  // The @ts-expect-error proves TypeScript catches this
  expect(true).toBe(true);
});
```

### ❌ DON'T: Use Deep Imports

```typescript
// WRONG: Importing from internal paths
import { PrincipalType } from '@atakora/lib/src/core/grants/principal-type';
```

✅ **DO: Import from Package Root**

```typescript
import { PrincipalType } from '@atakora/lib';
```

### ❌ DON'T: Hardcode Naming Expectations

```typescript
// WRONG: Assumes specific naming format
expect(vnet.virtualNetworkName).toContain('mainvnet');
```

✅ **DO: Test Naming Patterns**

```typescript
// Correct: Tests the pattern, not exact string
expect(vnet.virtualNetworkName).toContain('-main-');
expect(vnet.virtualNetworkName).toMatch(/vnet-\w+-\w+-\w+-\w+-\w+-\d+/);
```

---

## Best Practices

### 1. Use beforeEach for Setup

```typescript
describe('MyResource', () => {
  let app: App;
  let resourceGroup: MockResourceGroup;

  beforeEach(() => {
    app = new App();
    resourceGroup = new MockResourceGroup(app, 'TestRG');
  });

  // Tests use clean instances every time
});
```

### 2. Test One Thing Per Test

```typescript
// Good: Each test has clear purpose
it('should default location to parent location', () => {
  const resource = new MyResource(resourceGroup, 'Test', {});
  expect(resource.location).toBe(resourceGroup.location);
});

it('should use provided location when specified', () => {
  const resource = new MyResource(resourceGroup, 'Test', {
    location: 'westus2',
  });
  expect(resource.location).toBe('westus2');
});
```

### 3. Use Descriptive Test Names

```typescript
// Good: Clear what is being tested
it('should merge tags with parent tags', () => { ... });
it('should override parent tags with provided tags', () => { ... });

// Bad: Vague test names
it('should work', () => { ... });
it('test tags', () => { ... });
```

### 4. Test Error Cases

```typescript
it('should throw error when required prop is missing', () => {
  expect(() => {
    new MyResource(resourceGroup, 'Test', {
      // missing required prop
    });
  }).toThrow(/required property/);
});

it('should throw error when value is invalid', () => {
  expect(() => {
    new MyResource(resourceGroup, 'Test', {
      invalidProp: 'bad-value',
    });
  }).toThrow(/invalid/);
});
```

### 5. Group Related Tests

```typescript
describe('MyResource', () => {
  describe('constructor', () => {
    // Tests about creating the resource
  });

  describe('auto-naming', () => {
    // Tests about name generation
  });

  describe('grant methods', () => {
    // Tests about RBAC grants
  });
});
```

---

## Examples

### Example 1: Testing a New Azure Resource

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '@atakora/cdk';
import { MockResourceGroup } from '../../../__tests__/helpers/test-fixtures';
import { AppServicePlans } from '../app-service-plans';

describe('cdk/web/AppServicePlans', () => {
  let app: App;
  let resourceGroup: MockResourceGroup;

  beforeEach(() => {
    app = new App();
    resourceGroup = new MockResourceGroup(app, 'WebRG', {
      resourceGroupName: 'rg-web-test',
      location: 'eastus',
    });
  });

  describe('constructor', () => {
    it('should create plan with auto-generated name', () => {
      const plan = new AppServicePlans(resourceGroup, 'MainPlan', {
        sku: {
          name: 'B1',
          tier: 'Basic',
        },
      });

      expect(plan.name).toContain('plan-');
      expect(plan.location).toBe('eastus');
    });

    it('should use provided name when specified', () => {
      const plan = new AppServicePlans(resourceGroup, 'MainPlan', {
        name: 'my-custom-plan',
        sku: {
          name: 'B1',
          tier: 'Basic',
        },
      });

      expect(plan.name).toBe('my-custom-plan');
    });
  });

  describe('SKU validation', () => {
    it('should accept valid SKU configurations', () => {
      const validSkus = [
        { name: 'F1', tier: 'Free' },
        { name: 'B1', tier: 'Basic' },
        { name: 'S1', tier: 'Standard' },
        { name: 'P1V2', tier: 'PremiumV2' },
      ];

      validSkus.forEach((sku) => {
        const plan = new AppServicePlans(resourceGroup, `Plan-${sku.name}`, { sku });
        expect(plan.sku).toEqual(sku);
      });
    });
  });
});
```

### Example 2: Testing Grant Methods

```typescript
import { IGrantable, PrincipalType, WellKnownRoleIds } from '@atakora/lib';

class MockGrantable implements IGrantable {
  public readonly principalId = '11111111-2222-3333-4444-555555555555';
  public readonly principalType = PrincipalType.ManagedIdentity;
}

describe('StorageAccounts - Grant Methods', () => {
  let storage: StorageAccounts;
  let grantable: IGrantable;

  beforeEach(() => {
    const app = new App();
    const rg = new MockResourceGroup(app, 'StorageRG');

    storage = new StorageAccounts(rg, 'Storage', {
      storageAccountName: 'testsa',
    });

    grantable = new MockGrantable();
  });

  describe('grantBlobRead', () => {
    it('should create role assignment with correct role', () => {
      const grant = storage.grantBlobRead(grantable);

      expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_BLOB_DATA_READER);
    });

    it('should scope to storage account', () => {
      const grant = storage.grantBlobRead(grantable);

      expect(grant.scope).toBe(storage.resourceId);
    });
  });
});
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- virtual-networks.test.ts

# Run tests matching pattern
npm test -- --grep "auto-naming"
```

---

## Need Help?

- **Check existing tests** for examples: Look at `src/network/__tests__/virtual-networks.test.ts`
- **Use shared fixtures**: Always prefer `__tests__/helpers/test-fixtures.ts`
- **Follow patterns**: Consistency makes tests easier to maintain
- **Ask questions**: Update this guide when you learn something new!

---

**Last Updated**: 2025-11-20
**Maintained By**: Atakora CDK Team
