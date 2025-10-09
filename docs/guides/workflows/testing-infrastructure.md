# Testing Infrastructure Code

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Workflows](./README.md) > **Testing Infrastructure**

---

Infrastructure as Code should be tested just like application code. This guide shows you how to write comprehensive tests for your Atakora infrastructure, giving you confidence that your infrastructure behaves as expected before deployment.

## Table of Contents

- [Why Test Infrastructure?](#why-test-infrastructure)
- [Types of Infrastructure Tests](#types-of-infrastructure-tests)
- [Setting Up Your Test Environment](#setting-up-your-test-environment)
- [Unit Testing Stacks](#unit-testing-stacks)
- [Snapshot Testing](#snapshot-testing)
- [Validation Testing](#validation-testing)
- [Integration Testing](#integration-testing)
- [Testing Best Practices](#testing-best-practices)
- [Common Testing Patterns](#common-testing-patterns)
- [Troubleshooting Tests](#troubleshooting-tests)

## Why Test Infrastructure?

Testing infrastructure code provides several critical benefits:

1. **Catch Errors Early**: Find configuration issues before deployment
2. **Prevent Regressions**: Ensure changes don't break existing infrastructure
3. **Document Intent**: Tests serve as executable documentation
4. **Enable Refactoring**: Change implementations confidently
5. **Enforce Standards**: Validate compliance with security and naming policies
6. **Faster Feedback**: Identify problems in seconds, not after lengthy deployments

## Types of Infrastructure Tests

Atakora supports multiple testing approaches, each serving different purposes:

### Unit Tests

Test individual constructs and stacks in isolation:

```typescript
// Verify a storage account has correct properties
it('creates storage with HTTPS only', () => {
  const stack = new MyStack();
  const template = stack.toTemplate();
  const storage = template.resources.find(
    r => r.type === 'Microsoft.Storage/storageAccounts'
  );
  expect(storage.properties.supportsHttpsTrafficOnly).toBe(true);
});
```

**When to use**: Testing specific resource configurations, property validation, resource relationships.

### Snapshot Tests

Capture ARM template output and detect unexpected changes:

```typescript
it('matches expected ARM template', () => {
  const stack = new MyStack();
  expect(stack.toTemplate()).toMatchSnapshot();
});
```

**When to use**: Detecting unintended infrastructure changes, regression testing, reviewing template modifications.

### Validation Tests

Test validation rules and schema compliance:

```typescript
it('rejects invalid SKU', () => {
  expect(() => {
    new StorageAccount(stack, 'storage', {
      sku: { name: 'Invalid_SKU' }
    });
  }).toThrow('Invalid SKU name');
});
```

**When to use**: Verifying validation logic, testing error handling, enforcing compliance.

### Integration Tests

Test deployed infrastructure behavior:

```typescript
it('deployed web app responds to HTTPS requests', async () => {
  const response = await fetch(`https://${webAppUrl}`);
  expect(response.status).toBe(200);
});
```

**When to use**: End-to-end testing, verifying Azure resource behavior, testing cross-resource interactions.

## Setting Up Your Test Environment

### Installing Test Dependencies

Install Vitest (or your preferred test framework):

```bash
npm install --save-dev vitest @vitest/ui
```

Update `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@vitest/coverage-v8": "^1.0.0"
  }
}
```

### Test File Organization

Organize tests alongside source code:

```
infrastructure/
├── src/
│   ├── stacks/
│   │   ├── web-stack.ts
│   │   └── web-stack.test.ts       # Unit tests
│   ├── constructs/
│   │   ├── secure-storage.ts
│   │   └── secure-storage.test.ts  # Construct tests
│   └── main.ts
├── test/
│   ├── integration/
│   │   └── deployment.test.ts      # Integration tests
│   └── snapshots/
│       └── __snapshots__/          # Snapshot files
└── vitest.config.ts
```

### Vitest Configuration

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.ts'
      ]
    },
    testTimeout: 30000,
    hookTimeout: 30000
  }
});
```

## Unit Testing Stacks

### Basic Stack Testing

Test that stacks produce expected resources:

```typescript
import { describe, it, expect } from 'vitest';
import { WebApplicationStack } from './web-stack';

describe('WebApplicationStack', () => {
  it('creates all required resources', () => {
    const stack = new WebApplicationStack();
    const template = stack.toTemplate();

    // Verify resource types
    const resourceTypes = template.resources.map(r => r.type);
    expect(resourceTypes).toContain('Microsoft.Web/serverfarms');
    expect(resourceTypes).toContain('Microsoft.Web/sites');
    expect(resourceTypes).toContain('Microsoft.Storage/storageAccounts');
  });

  it('creates exactly one App Service Plan', () => {
    const stack = new WebApplicationStack();
    const template = stack.toTemplate();

    const plans = template.resources.filter(
      r => r.type === 'Microsoft.Web/serverfarms'
    );

    expect(plans).toHaveLength(1);
  });

  it('configures App Service Plan with correct SKU', () => {
    const stack = new WebApplicationStack();
    const template = stack.toTemplate();

    const plan = template.resources.find(
      r => r.type === 'Microsoft.Web/serverfarms'
    );

    expect(plan.sku).toEqual({
      name: 'B1',
      tier: 'Basic',
      capacity: 1
    });
  });
});
```

### Testing Resource Properties

Verify specific resource configurations:

```typescript
describe('StorageAccount configuration', () => {
  it('enforces HTTPS-only traffic', () => {
    const stack = new MyStack();
    const template = stack.toTemplate();

    const storage = template.resources.find(
      r => r.type === 'Microsoft.Storage/storageAccounts'
    );

    expect(storage.properties.supportsHttpsTrafficOnly).toBe(true);
  });

  it('uses minimum TLS 1.2', () => {
    const stack = new MyStack();
    const template = stack.toTemplate();

    const storage = template.resources.find(
      r => r.type === 'Microsoft.Storage/storageAccounts'
    );

    expect(storage.properties.minimumTlsVersion).toBe('TLS1_2');
  });

  it('configures Hot access tier for StorageV2', () => {
    const stack = new MyStack();
    const template = stack.toTemplate();

    const storage = template.resources.find(
      r => r.type === 'Microsoft.Storage/storageAccounts'
    );

    expect(storage.kind).toBe('StorageV2');
    expect(storage.properties.accessTier).toBe('Hot');
  });
});
```

### Testing Resource Relationships

Verify dependencies and references:

```typescript
describe('Resource dependencies', () => {
  it('web app references correct app service plan', () => {
    const stack = new MyStack();
    const template = stack.toTemplate();

    const plan = template.resources.find(
      r => r.type === 'Microsoft.Web/serverfarms'
    );
    const webApp = template.resources.find(
      r => r.type === 'Microsoft.Web/sites'
    );

    expect(webApp.properties.serverFarmId).toBe(
      `[resourceId('Microsoft.Web/serverfarms', '${plan.name}')]`
    );
  });

  it('subnet belongs to correct virtual network', () => {
    const stack = new NetworkStack();
    const template = stack.toTemplate();

    const vnet = template.resources.find(
      r => r.type === 'Microsoft.Network/virtualNetworks'
    );
    const subnet = template.resources.find(
      r => r.type === 'Microsoft.Network/virtualNetworks/subnets'
    );

    expect(subnet.properties.virtualNetworkName).toBe(vnet.name);
  });

  it('configures web app with storage account connection', () => {
    const stack = new MyStack();
    const template = stack.toTemplate();

    const storage = template.resources.find(
      r => r.type === 'Microsoft.Storage/storageAccounts'
    );
    const webApp = template.resources.find(
      r => r.type === 'Microsoft.Web/sites'
    );

    const storageSettings = webApp.properties.siteConfig.appSettings.filter(
      s => s.name === 'STORAGE_ACCOUNT_NAME'
    );

    expect(storageSettings).toHaveLength(1);
    expect(storageSettings[0].value).toContain(storage.name);
  });
});
```

### Testing with Different Configurations

Test behavior with various inputs:

```typescript
describe('EnvironmentStack', () => {
  it('uses Basic SKU for development', () => {
    const stack = new EnvironmentStack({ environment: 'dev' });
    const template = stack.toTemplate();

    const plan = template.resources.find(
      r => r.type === 'Microsoft.Web/serverfarms'
    );

    expect(plan.sku.name).toBe('B1');
    expect(plan.sku.tier).toBe('Basic');
  });

  it('uses Premium SKU for production', () => {
    const stack = new EnvironmentStack({ environment: 'prod' });
    const template = stack.toTemplate();

    const plan = template.resources.find(
      r => r.type === 'Microsoft.Web/serverfarms'
    );

    expect(plan.sku.name).toBe('P1v2');
    expect(plan.sku.tier).toBe('PremiumV2');
  });

  it('enables Redis cache only in production', () => {
    const devStack = new EnvironmentStack({ environment: 'dev' });
    const prodStack = new EnvironmentStack({ environment: 'prod' });

    const devCache = devStack.toTemplate().resources.filter(
      r => r.type === 'Microsoft.Cache/redis'
    );
    const prodCache = prodStack.toTemplate().resources.filter(
      r => r.type === 'Microsoft.Cache/redis'
    );

    expect(devCache).toHaveLength(0);
    expect(prodCache).toHaveLength(1);
  });
});
```

## Snapshot Testing

### Creating Snapshots

Snapshot tests capture the entire ARM template:

```typescript
import { describe, it, expect } from 'vitest';
import { WebApplicationStack } from './web-stack';

describe('WebApplicationStack ARM template', () => {
  it('matches expected template structure', () => {
    const stack = new WebApplicationStack();
    const template = stack.toTemplate();

    expect(template).toMatchSnapshot();
  });
});
```

On first run, Vitest creates a snapshot file:

```
test/
└── __snapshots__/
    └── web-stack.test.ts.snap
```

### Updating Snapshots

When you intentionally change infrastructure:

```bash
# Review changes
npm test

# Update snapshots after verifying changes are correct
npm test -- -u

# Or interactively
npm run test:watch
# Press 'u' to update snapshots
```

### Selective Snapshots

Snapshot specific parts of the template:

```typescript
describe('WebApp configuration', () => {
  it('has stable siteConfig', () => {
    const stack = new WebApplicationStack();
    const template = stack.toTemplate();

    const webApp = template.resources.find(
      r => r.type === 'Microsoft.Web/sites'
    );

    // Only snapshot the site config, not the entire resource
    expect(webApp.properties.siteConfig).toMatchSnapshot();
  });
});
```

### Snapshot Best Practices

```typescript
// ✅ Good: Snapshot stable, meaningful structures
expect(stack.toTemplate()).toMatchSnapshot('full-template');
expect(webApp.properties.siteConfig).toMatchSnapshot('webapp-config');

// ❌ Avoid: Snapshots with dynamic values
expect(stack.toTemplate()).toMatchSnapshot(); // Contains timestamps, GUIDs

// ✅ Better: Normalize dynamic values first
const template = stack.toTemplate();
const normalized = normalizeDynamicValues(template);
expect(normalized).toMatchSnapshot();

function normalizeDynamicValues(template: any) {
  return {
    ...template,
    resources: template.resources.map((r: any) => ({
      ...r,
      name: r.name.replace(/-[a-f0-9]{12}$/, '-HASH') // Remove hash
    }))
  };
}
```

## Validation Testing

### Testing Validation Rules

Verify that invalid configurations are rejected:

```typescript
describe('Storage Account validation', () => {
  it('rejects invalid SKU names', () => {
    const stack = new Stack('test');
    const rg = new ResourceGroup(stack, 'rg', { location: 'eastus' });

    expect(() => {
      new StorageAccount(stack, 'storage', {
        resourceGroup: rg,
        location: 'eastus',
        sku: { name: 'Invalid_SKU' as any }
      });
    }).toThrow(/Invalid SKU/);
  });

  it('requires minimum TLS 1.2', () => {
    const stack = new Stack('test');
    const rg = new ResourceGroup(stack, 'rg', { location: 'eastus' });

    expect(() => {
      new StorageAccount(stack, 'storage', {
        resourceGroup: rg,
        location: 'eastus',
        properties: {
          minimumTlsVersion: 'TLS1_0' as any
        }
      });
    }).toThrow(/minimum TLS version/i);
  });

  it('enforces HTTPS-only traffic', () => {
    const stack = new Stack('test');
    const rg = new ResourceGroup(stack, 'rg', { location: 'eastus' });

    expect(() => {
      new StorageAccount(stack, 'storage', {
        resourceGroup: rg,
        location: 'eastus',
        properties: {
          supportsHttpsTrafficOnly: false
        }
      });
    }).toThrow(/HTTPS.*required/i);
  });
});
```

### Testing Custom Validators

If you've implemented custom validation:

```typescript
describe('Custom naming validators', () => {
  it('rejects storage account names with uppercase', () => {
    const stack = new Stack('test');
    const rg = new ResourceGroup(stack, 'rg', { location: 'eastus' });

    expect(() => {
      new StorageAccount(stack, 'storage', {
        resourceGroup: rg,
        location: 'eastus',
        name: 'MyStorageAccount' // Invalid: contains uppercase
      });
    }).toThrow(/lowercase/i);
  });

  it('rejects storage account names that are too long', () => {
    const stack = new Stack('test');
    const rg = new ResourceGroup(stack, 'rg', { location: 'eastus' });

    expect(() => {
      new StorageAccount(stack, 'storage', {
        resourceGroup: rg,
        location: 'eastus',
        name: 'a'.repeat(25) // Invalid: exceeds 24 character limit
      });
    }).toThrow(/24 characters/i);
  });
});
```

### Testing Synthesis Validation

Test that synthesis catches issues:

```typescript
describe('Synthesis validation', () => {
  it('detects circular dependencies', () => {
    const stack = new Stack('test');

    // Attempt to create circular dependency
    expect(() => {
      stack.synthesize();
    }).toThrow(/circular dependency/i);
  });

  it('validates all required properties are present', () => {
    const stack = new Stack('test');
    const rg = new ResourceGroup(stack, 'rg', { location: 'eastus' });

    new WebApp(stack, 'webapp', {
      resourceGroup: rg,
      location: 'eastus'
      // Missing required serverFarmId
    } as any);

    expect(() => {
      stack.synthesize();
    }).toThrow(/serverFarmId.*required/i);
  });
});
```

## Integration Testing

### Testing Against Azure

Integration tests deploy infrastructure to Azure and verify behavior:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Web Application Integration', () => {
  let deploymentOutputs: any;

  beforeAll(async () => {
    // Deploy test infrastructure
    const { stdout } = await execAsync('atakora deploy --package test-webapp');
    deploymentOutputs = JSON.parse(stdout);
  }, 300000); // 5 minute timeout for deployment

  afterAll(async () => {
    // Clean up test infrastructure
    await execAsync('atakora destroy --package test-webapp --force');
  }, 300000);

  it('web app responds to HTTPS requests', async () => {
    const url = `https://${deploymentOutputs.webAppName}.azurewebsites.net`;
    const response = await fetch(url);

    expect(response.status).toBe(200);
  });

  it('web app redirects HTTP to HTTPS', async () => {
    const url = `http://${deploymentOutputs.webAppName}.azurewebsites.net`;
    const response = await fetch(url, { redirect: 'manual' });

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toMatch(/^https:/);
  });

  it('storage account is accessible', async () => {
    const { BlobServiceClient } = await import('@azure/storage-blob');

    const client = BlobServiceClient.fromConnectionString(
      deploymentOutputs.storageConnectionString
    );

    const properties = await client.getProperties();
    expect(properties).toBeDefined();
  });
});
```

### Mocking Azure Calls

For faster tests, mock Azure SDK calls:

```typescript
import { vi, describe, it, expect } from 'vitest';

// Mock Azure Storage SDK
vi.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: vi.fn(() => ({
      getProperties: vi.fn().mockResolvedValue({
        accountKind: 'StorageV2',
        encryption: { services: { blob: { enabled: true } } }
      })
    }))
  }
}));

describe('Storage operations', () => {
  it('retrieves storage properties', async () => {
    const { BlobServiceClient } = await import('@azure/storage-blob');
    const client = BlobServiceClient.fromConnectionString('mock-connection');

    const properties = await client.getProperties();

    expect(properties.accountKind).toBe('StorageV2');
    expect(properties.encryption.services.blob.enabled).toBe(true);
  });
});
```

## Testing Best Practices

### 1. Test Organization

```typescript
// ✅ Good: Organized with describe blocks
describe('WebApplicationStack', () => {
  describe('Resource creation', () => {
    it('creates app service plan', () => { /* ... */ });
    it('creates web app', () => { /* ... */ });
    it('creates storage account', () => { /* ... */ });
  });

  describe('Configuration', () => {
    it('enables HTTPS only', () => { /* ... */ });
    it('configures always on', () => { /* ... */ });
  });

  describe('Environment variations', () => {
    it('uses Basic SKU in dev', () => { /* ... */ });
    it('uses Premium SKU in prod', () => { /* ... */ });
  });
});

// ❌ Avoid: Flat test structure
it('test 1', () => { /* ... */ });
it('test 2', () => { /* ... */ });
it('test 3', () => { /* ... */ });
```

### 2. Descriptive Test Names

```typescript
// ✅ Good: Clear, specific test names
it('enforces HTTPS-only traffic on storage account', () => { /* ... */ });
it('configures web app with minimum TLS 1.2', () => { /* ... */ });
it('creates Premium SKU plan for production environment', () => { /* ... */ });

// ❌ Avoid: Vague test names
it('tests storage', () => { /* ... */ });
it('works correctly', () => { /* ... */ });
it('test 1', () => { /* ... */ });
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('creates storage account with correct properties', () => {
  // Arrange - Set up test data
  const stack = new Stack('test');
  const rg = new ResourceGroup(stack, 'rg', { location: 'eastus' });

  // Act - Perform the action
  new StorageAccount(stack, 'storage', {
    resourceGroup: rg,
    location: 'eastus',
    sku: { name: 'Standard_LRS' }
  });
  const template = stack.toTemplate();

  // Assert - Verify results
  const storage = template.resources.find(
    r => r.type === 'Microsoft.Storage/storageAccounts'
  );
  expect(storage.sku.name).toBe('Standard_LRS');
  expect(storage.properties.supportsHttpsTrafficOnly).toBe(true);
});
```

### 4. Test Isolation

```typescript
// ✅ Good: Each test creates its own stack
describe('Storage tests', () => {
  it('test 1', () => {
    const stack = new Stack('test1');
    // Test using isolated stack
  });

  it('test 2', () => {
    const stack = new Stack('test2');
    // Test using isolated stack
  });
});

// ❌ Avoid: Sharing stack between tests
describe('Storage tests', () => {
  const stack = new Stack('shared'); // Shared state

  it('test 1', () => {
    // Modifies shared stack
  });

  it('test 2', () => {
    // Affected by test 1's modifications
  });
});
```

### 5. Helper Functions

```typescript
// Create reusable test helpers
function createTestStack(name: string = 'test'): Stack {
  return new Stack(name);
}

function createTestResourceGroup(stack: Stack, location: string = 'eastus'): ResourceGroup {
  return new ResourceGroup(stack, 'test-rg', { location });
}

function findResource(template: any, type: string): any {
  return template.resources.find((r: any) => r.type === type);
}

// Use in tests
describe('Storage tests', () => {
  it('creates storage account', () => {
    const stack = createTestStack();
    const rg = createTestResourceGroup(stack);

    new StorageAccount(stack, 'storage', {
      resourceGroup: rg,
      location: rg.location
    });

    const template = stack.toTemplate();
    const storage = findResource(template, 'Microsoft.Storage/storageAccounts');

    expect(storage).toBeDefined();
  });
});
```

## Common Testing Patterns

### Testing Tagged Resources

```typescript
describe('Resource tagging', () => {
  it('applies standard tags to all resources', () => {
    const stack = new MyStack({
      tags: {
        environment: 'production',
        project: 'webapp',
        owner: 'platform-team'
      }
    });

    const template = stack.toTemplate();

    template.resources.forEach(resource => {
      expect(resource.tags).toEqual({
        environment: 'production',
        project: 'webapp',
        owner: 'platform-team'
      });
    });
  });
});
```

### Testing Multi-Region Deployments

```typescript
describe('Multi-region deployment', () => {
  const regions = ['eastus', 'westus', 'centralus'];

  regions.forEach(region => {
    it(`deploys to ${region}`, () => {
      const stack = new MultiRegionStack({ region });
      const template = stack.toTemplate();

      const resources = template.resources.filter(
        r => r.location === region
      );

      expect(resources.length).toBeGreaterThan(0);
    });
  });
});
```

### Testing Gov Cloud Compatibility

```typescript
describe('Government Cloud compatibility', () => {
  it('uses Gov Cloud endpoints', () => {
    const stack = new MyStack({ cloud: 'government' });
    const template = stack.toTemplate();

    const webApp = findResource(template, 'Microsoft.Web/sites');

    expect(webApp.properties.hostNameSslStates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: expect.stringMatching(/\.azurewebsites\.us$/)
        })
      ])
    );
  });

  it('uses Gov Cloud compliant regions', () => {
    const stack = new MyStack({ cloud: 'government' });
    const template = stack.toTemplate();

    const govCloudRegions = ['usgovvirginia', 'usgovarizona', 'usgovtexas'];

    template.resources.forEach(resource => {
      if (resource.location) {
        expect(govCloudRegions).toContain(resource.location.toLowerCase());
      }
    });
  });
});
```

## Troubleshooting Tests

### Common Issues

#### Tests Passing Locally but Failing in CI

**Cause**: Environment differences, timing issues, or resource cleanup problems.

**Solution**:
```typescript
// Use consistent test timeouts
describe('Integration tests', () => {
  it('deploys infrastructure', async () => {
    // ...
  }, 300000); // Explicit 5-minute timeout
});

// Clean up resources in afterEach/afterAll
afterAll(async () => {
  await cleanupTestResources();
}, 300000);
```

#### Snapshot Tests Failing After Valid Changes

**Cause**: Infrastructure changed intentionally but snapshots weren't updated.

**Solution**:
```bash
# Review the changes
npm test

# If changes are correct, update snapshots
npm test -- -u

# Commit the updated snapshot files
git add test/__snapshots__
git commit -m "Update snapshots for infrastructure changes"
```

#### Flaky Tests

**Cause**: Tests depend on external state or timing.

**Solution**:
```typescript
// ❌ Flaky: Depends on external state
it('reads from production database', async () => {
  const data = await database.query('SELECT * FROM users');
  expect(data.length).toBeGreaterThan(0);
});

// ✅ Stable: Uses mocked data
it('processes user data correctly', async () => {
  const mockData = [{ id: 1, name: 'Test User' }];
  vi.spyOn(database, 'query').mockResolvedValue(mockData);

  const data = await database.query('SELECT * FROM users');
  expect(data).toEqual(mockData);
});
```

## Next Steps

- **[Deploying Environments](./deploying-environments.md)**: Deploy tested infrastructure to multiple environments
- **[Organizing Projects](./organizing-projects.md)**: Structure large test suites
- **[Managing Secrets](./managing-secrets.md)**: Test secret handling securely

## Related Documentation

- [Validation](../validation/README.md) - Understanding validation rules
- [Common Issues](../../troubleshooting/common-issues.md) - Troubleshooting tests
- [CLI Reference](../../reference/cli/README.md) - CLI commands for testing

---

**Feedback**: Found an issue or have a suggestion? [Open an issue](https://github.com/your-org/atakora/issues) on GitHub.
