# Common Validation Errors

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Validation](./README.md) > **Common Errors**

---

This guide helps you quickly resolve the most common validation errors you'll encounter when building infrastructure with Atakora. Each error includes the error message, explanation, and step-by-step resolution.

## Table of Contents

- [Naming Errors](#naming-errors)
- [Property Errors](#property-errors)
- [Dependency Errors](#dependency-errors)
- [Security Errors](#security-errors)
- [Type Errors](#type-errors)
- [Resource Limit Errors](#resource-limit-errors)
- [Template Errors](#template-errors)

## Naming Errors

### STORAGE_001: Invalid Storage Account Name

**Error Message:**
```
Storage account name 'MyStorageAccount' is invalid.
Names must be lowercase alphanumeric, 3-24 characters.
```

**Cause:** Storage account names have strict requirements enforced by Azure.

**Resolution:**
```typescript
// ❌ Invalid
const storage = new StorageAccount(this, 'storage', {
  name: 'MyStorageAccount'  // Contains uppercase
});

// ❌ Invalid
const storage = new StorageAccount(this, 'storage', {
  name: 'my-storage-account'  // Contains hyphens
});

// ✅ Valid
const storage = new StorageAccount(this, 'storage', {
  name: 'mystorageaccount'  // Lowercase, no special chars
});

// ✅ Valid (let Atakora generate name)
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus'
  // No name - Atakora generates valid name with hash
});
```

**Prevention:** Let Atakora generate resource names automatically unless you have specific naming requirements.

### WEBAPP_001: Invalid Web App Name

**Error Message:**
```
Web app name 'my_webapp' contains invalid characters.
Names must be alphanumeric or hyphens only.
```

**Cause:** Web app names cannot contain underscores.

**Resolution:**
```typescript
// ❌ Invalid
const webApp = new WebApp(this, 'webapp', {
  name: 'my_webapp'  // Underscores not allowed
});

// ✅ Valid
const webApp = new WebApp(this, 'webapp', {
  name: 'my-webapp'  // Hyphens allowed
});
```

### NAME_001: Duplicate Resource Name

**Error Message:**
```
Duplicate resource name: Microsoft.Storage/storageAccounts 'mystorage'
already defined at src/stacks/storage.ts:15
```

**Cause:** Two resources of the same type cannot have the same name in the same scope.

**Resolution:**
```typescript
// ❌ Invalid
const storage1 = new StorageAccount(this, 'storage', {
  name: 'mystorage',
  resourceGroup: rg,
  location: 'eastus'
});

const storage2 = new StorageAccount(this, 'storage-backup', {
  name: 'mystorage',  // Same name as storage1
  resourceGroup: rg,
  location: 'westus'
});

// ✅ Valid
const storage1 = new StorageAccount(this, 'storage', {
  name: 'mystorage',
  resourceGroup: rg,
  location: 'eastus'
});

const storage2 = new StorageAccount(this, 'storage-backup', {
  name: 'mystoragebackup',  // Unique name
  resourceGroup: rg,
  location: 'westus'
});
```

## Property Errors

### PROP_001: Missing Required Property

**Error Message:**
```
WebApp requires 'serverFarmId' property
```

**Cause:** Required property not provided.

**Resolution:**
```typescript
// ❌ Invalid
const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus'
  // Missing serverFarmId
});

// ✅ Valid
const plan = new AppServicePlan(this, 'plan', {
  resourceGroup: rg,
  location: 'eastus',
  sku: { name: 'B1', tier: 'Basic' }
});

const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus',
  serverFarmId: plan.id  // Required property provided
});
```

### PROP_002: Invalid Property Value

**Error Message:**
```
Invalid SKU name 'Invalid_SKU'.
Valid options: Standard_LRS, Standard_GRS, Standard_RAGRS, Premium_LRS
```

**Cause:** Property value not in allowed set.

**Resolution:**
```typescript
// ❌ Invalid
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  sku: {
    name: 'Invalid_SKU'  // Not a valid SKU
  }
});

// ✅ Valid
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  sku: {
    name: 'Standard_LRS'  // Valid SKU
  }
});
```

### PROP_003: Incompatible Properties

**Error Message:**
```
FileStorage kind requires Premium_LRS SKU
```

**Cause:** Property combination not allowed by Azure.

**Resolution:**
```typescript
// ❌ Invalid
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  kind: 'FileStorage',
  sku: {
    name: 'Standard_LRS'  // FileStorage requires Premium_LRS
  }
});

// ✅ Valid
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  kind: 'FileStorage',
  sku: {
    name: 'Premium_LRS'  // Correct SKU for FileStorage
  }
});
```

## Dependency Errors

### DEP_001: Circular Dependency

**Error Message:**
```
Circular dependency detected: ResourceA → ResourceB → ResourceA
```

**Cause:** Resources depend on each other in a cycle.

**Resolution:**
```typescript
// ❌ Invalid (circular dependency)
const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus',
  serverFarmId: plan.id,
  tags: {
    storageAccount: storage.name  // webApp depends on storage
  }
});

const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  tags: {
    webApp: webApp.name  // storage depends on webApp - CIRCULAR!
  }
});

// ✅ Valid (one-way dependency)
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus'
  // No dependency on webApp
});

const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus',
  serverFarmId: plan.id,
  tags: {
    storageAccount: storage.name  // One-way: webApp → storage
  }
});
```

### DEP_002: Missing Dependency

**Error Message:**
```
Resource 'webapp' references undefined resource 'plan-xyz'
```

**Cause:** Resource references another resource that doesn't exist.

**Resolution:**
```typescript
// ❌ Invalid
const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus',
  serverFarmId: '/subscriptions/.../plans/non-existent'  // Doesn't exist
});

// ✅ Valid
const plan = new AppServicePlan(this, 'plan', {
  resourceGroup: rg,
  location: 'eastus',
  sku: { name: 'B1', tier: 'Basic' }
});

const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus',
  serverFarmId: plan.id  // References created resource
});
```

### DEP_003: Cross-Stack Dependency

**Error Message:**
```
Cannot reference resource from different stack without explicit dependency
```

**Cause:** Referencing resource from another stack without proper dependency management.

**Resolution:**
```typescript
// ❌ Invalid
export class Stack1 extends Stack {
  public readonly storage: StorageAccount;

  constructor() {
    super('stack1');
    this.storage = new StorageAccount(this, 'storage', {
      resourceGroup: rg,
      location: 'eastus'
    });
  }
}

export class Stack2 extends Stack {
  constructor() {
    super('stack2');
    const stack1 = new Stack1();

    // Direct reference without dependency
    const connection = stack1.storage.name;
  }
}

// ✅ Valid
export class Stack1 extends Stack {
  public readonly storageName: string;

  constructor() {
    super('stack1');
    const storage = new StorageAccount(this, 'storage', {
      resourceGroup: rg,
      location: 'eastus'
    });
    this.storageName = storage.name;
  }
}

export class Stack2 extends Stack {
  constructor(stack1: Stack1) {
    super('stack2');

    // Proper cross-stack reference
    this.addDependency(stack1);
    const connection = stack1.storageName;
  }
}
```

## Security Errors

### SEC_001: HTTPS Not Enforced

**Error Message:**
```
Storage account must support HTTPS-only traffic for security
```

**Cause:** Resource allows unencrypted HTTP connections.

**Resolution:**
```typescript
// ❌ Invalid
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  properties: {
    supportsHttpsTrafficOnly: false  // Insecure
  }
});

// ✅ Valid
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  properties: {
    supportsHttpsTrafficOnly: true  // Secure (also the default)
  }
});
```

### SEC_002: Weak TLS Version

**Error Message:**
```
TLS version TLS1_0 is deprecated. Use TLS1_2 or TLS1_3
```

**Cause:** Using outdated TLS protocol version.

**Resolution:**
```typescript
// ❌ Invalid
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  properties: {
    minimumTlsVersion: 'TLS1_0'  // Weak/deprecated
  }
});

// ✅ Valid
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  properties: {
    minimumTlsVersion: 'TLS1_2'  // Secure
  }
});
```

### SEC_003: Public Access Enabled

**Error Message:**
```
Storage account blob public access should be disabled in production
```

**Cause:** Allowing anonymous public access to storage blobs.

**Resolution:**
```typescript
// ❌ Not recommended for production
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  properties: {
    allowBlobPublicAccess: true  // Public access enabled
  }
});

// ✅ Secure for production
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  properties: {
    allowBlobPublicAccess: false  // Public access disabled
  }
});
```

## Type Errors

### TYPE_001: Type Mismatch

**Error Message:**
```
Type 'number' is not assignable to type 'string'
```

**Cause:** TypeScript type mismatch.

**Resolution:**
```typescript
// ❌ Invalid
const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 123,  // Should be string
  serverFarmId: plan.id
});

// ✅ Valid
const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus',  // String value
  serverFarmId: plan.id
});
```

### TYPE_002: Missing Generic Type

**Error Message:**
```
Generic type 'Map<K, V>' requires 2 type argument(s)
```

**Cause:** Generic type used without type parameters.

**Resolution:**
```typescript
// ❌ Invalid
const resources: Map = new Map();

// ✅ Valid
const resources: Map<string, Resource> = new Map();
```

## Resource Limit Errors

### LIMIT_001: Resource Limit Exceeded

**Error Message:**
```
Resource limit exceeded: storageAccounts (251/250 per subscription)
```

**Cause:** Exceeding Azure subscription limits.

**Resolution:**
- Split resources across multiple subscriptions
- Delete unused resources
- Request limit increase from Azure support

```typescript
// Consider splitting into multiple stacks/subscriptions
export class StorageStack1 extends Stack {
  constructor() {
    super('storage-stack-1');
    // Create resources 1-125
  }
}

export class StorageStack2 extends Stack {
  constructor() {
    super('storage-stack-2');
    // Create resources 126-250
  }
}
```

### LIMIT_002: Name Length Exceeded

**Error Message:**
```
Resource name 'very-long-name-that-exceeds-limit' exceeds maximum length of 24 characters
```

**Cause:** Resource name too long.

**Resolution:**
```typescript
// ❌ Invalid
const storage = new StorageAccount(this, 'storage', {
  name: 'mystorageaccountwithaverylongname',  // > 24 chars
  resourceGroup: rg,
  location: 'eastus'
});

// ✅ Valid
const storage = new StorageAccount(this, 'storage', {
  name: 'mystorageacct',  // <= 24 chars
  resourceGroup: rg,
  location: 'eastus'
});
```

## Template Errors

### TPL_001: Invalid Template Reference

**Error Message:**
```
Template function 'resourceId' references undefined resource type
```

**Cause:** ARM template function used incorrectly.

**Resolution:**
```typescript
// Usually auto-generated correctly by Atakora
// If manually creating references, ensure correct syntax:

// ✅ Valid
const reference = `[resourceId('Microsoft.Web/serverfarms', '${plan.name}')]`;
```

### TPL_002: Parameter Not Defined

**Error Message:**
```
Template parameter 'environmentName' is referenced but not defined
```

**Cause:** Template uses undefined parameter.

**Resolution:**
```typescript
// Define parameters before using
export class MyStack extends Stack {
  constructor(environment: string) {
    super('my-stack');

    this.addParameter('environmentName', {
      type: 'string',
      defaultValue: environment
    });

    // Now can reference parameter
    const rg = new ResourceGroup(this, 'rg', {
      name: `rg-[parameters('environmentName')]`,
      location: 'eastus'
    });
  }
}
```

## Troubleshooting Steps

When you encounter a validation error:

### 1. Read the Error Message Carefully

The error message usually tells you exactly what's wrong:

```
❌ Validation Error [STORAGE_001]

Resource: StorageAccount 'my-storage'
Location: src/stacks/storage-stack.ts:15:7

Issue: Storage account name 'MyStorageAccount' is invalid
Reason: Storage account names must be lowercase alphanumeric, 3-24 characters

Suggestion: Use 'mystorageaccount' instead
```

### 2. Check the Resource Location

The error shows exactly where the problem is:

```typescript
// src/stacks/storage-stack.ts:15:7
const storage = new StorageAccount(this, 'storage', {
  name: 'MyStorageAccount'  // <-- Line 15, column 7
});
```

### 3. Apply the Suggested Fix

Most errors include a suggestion:

```typescript
// Before (from error message)
name: 'MyStorageAccount'

// After (from suggestion)
name: 'mystorageaccount'
```

### 4. Re-run Validation

```bash
atakora synth
```

### 5. Check Documentation

If unclear, consult the documentation link in the error:

```
Documentation: https://docs.atakora.dev/validation/storage-account-naming
```

## Prevention Strategies

### Enable TypeScript Strict Mode

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### Use IDE with TypeScript Support

- Visual Studio Code
- WebStorm
- Vim with CoC

### Run Validation Frequently

```bash
# Add to package.json
{
  "scripts": {
    "validate": "atakora synth",
    "precommit": "npm run validate"
  }
}
```

### Write Tests

```typescript
it('creates valid storage account', () => {
  const stack = new Stack('test');
  const rg = new ResourceGroup(stack, 'rg', { location: 'eastus' });

  // This will throw if invalid
  new StorageAccount(stack, 'storage', {
    resourceGroup: rg,
    location: 'eastus',
    name: 'teststorage'
  });

  expect(() => stack.synthesize()).not.toThrow();
});
```

## Getting Additional Help

If you can't resolve a validation error:

1. **Search GitHub Issues**: Someone may have encountered the same error
2. **Check Examples**: Look at [working examples](../../examples/README.md)
3. **Ask for Help**: Create a GitHub issue with:
   - Complete error message
   - Code that reproduces the error
   - What you've tried so far
   - Atakora version

## Next Steps

- **[Writing Custom Validators](./writing-custom-validators.md)**: Create organization-specific validation
- **[Validation Overview](./overview.md)**: Understand the validation system
- **[Testing Infrastructure](../workflows/testing-infrastructure.md)**: Add tests to catch errors

## Related Documentation

- [Troubleshooting](../../troubleshooting/common-issues.md) - General troubleshooting
- [CLI Reference](../../reference/cli/README.md) - CLI validation options
- [Core Concepts](../core-concepts/README.md) - Understanding Atakora fundamentals

---

**Feedback**: Found an issue or have a suggestion? [Open an issue](https://github.com/your-org/atakora/issues) on GitHub.
