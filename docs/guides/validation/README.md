# Validation System

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > **Validation**

---

Atakora includes a comprehensive validation system that catches configuration errors before deployment, saving you time and preventing failed deployments to Azure. This section explains how validation works and how to leverage it effectively.

## What You'll Find Here

### [Overview](./overview.md)
Understanding the validation system architecture and how it works. This guide covers:
- How validation runs during synthesis
- Types of validation rules
- When validation occurs
- Validation error reporting
- Integration with TypeScript type system

### [Common Errors](./common-errors.md)
Troubleshooting validation errors you might encounter. This guide covers:
- Most frequent validation errors
- Error messages and what they mean
- Step-by-step resolution guides
- Prevention strategies
- Error code reference

### [Writing Custom Validators](./writing-custom-validators.md)
Extending validation with custom rules for your organization. This guide covers:
- Creating custom validation functions
- Registering validators
- Validation context and metadata
- Testing custom validators
- Best practices for validator design

## Why Validation Matters

### Catch Errors Early

Validation identifies issues before deployment:

```typescript
// This will be caught during validation
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  sku: {
    name: 'Invalid_SKU'  // ❌ Invalid SKU name
  }
});

// Error: Invalid SKU name 'Invalid_SKU'. Valid options: Standard_LRS, Standard_GRS, ...
```

Without validation, this error would only surface during Azure deployment, wasting valuable time.

### Enforce Best Practices

Validation enforces organizational standards:

```typescript
// Validation ensures HTTPS-only
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  properties: {
    supportsHttpsTrafficOnly: false  // ❌ Fails validation
  }
});

// Error: Storage accounts must support HTTPS-only traffic for security
```

### Provide Clear Feedback

Validation gives actionable error messages:

```
❌ Validation Error

Resource: StorageAccount 'my-storage'
Location: src/stacks/storage-stack.ts:15:7

Issue: Storage account name 'MyStorageAccount' is invalid
Reason: Storage account names must be lowercase alphanumeric, 3-24 characters
Suggestion: Use 'mystorageaccount' instead

Documentation: https://docs.atakora.dev/validation/storage-account-naming
```

## Validation Levels

Atakora validates at multiple levels:

### Type-Level Validation (TypeScript)

TypeScript catches type errors at compile time:

```typescript
const storage = new StorageAccount(this, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  sku: {
    name: 123  // ❌ TypeScript error: Type 'number' is not assignable to type 'string'
  }
});
```

### Construct-Level Validation

Individual constructs validate their properties:

```typescript
// WebApp validates serverFarmId is provided
const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus'
  // Missing required serverFarmId - caught by construct validation
});

// Error: WebApp requires 'serverFarmId' property
```

### Stack-Level Validation

Stacks validate resource relationships and dependencies:

```typescript
// Validation catches circular dependencies
const stack = new Stack('my-stack');
stack.synthesize();  // ❌ Error: Circular dependency detected: A → B → A
```

### Synthesis-Time Validation

Full validation during ARM template generation:

```bash
atakora synth

# Runs all validations:
# ✓ Type validation
# ✓ Construct validation
# ✓ Stack validation
# ✓ Template validation
```

## Quick Start

### Enable Strict Validation

Configure strict validation in your project:

```typescript
// atakora.config.ts
export default {
  validation: {
    strict: true,
    failOnWarnings: false,
    customValidators: [
      './validators/naming.ts',
      './validators/security.ts'
    ]
  }
};
```

### Run Validation

```bash
# Validate without deploying
atakora synth

# Validate specific package
atakora synth --package webapp

# Validate with detailed output
atakora synth --verbose

# Fail on warnings
atakora synth --strict
```

### Handle Validation Errors

When validation fails, fix the issues and re-run:

```bash
$ atakora synth

❌ Validation failed with 2 errors:

1. StorageAccount 'storage-1'
   Location: src/stacks/storage.ts:12:5
   Error: Invalid SKU name 'Invalid_SKU'

2. WebApp 'webapp-1'
   Location: src/stacks/webapp.ts:25:10
   Error: Missing required property 'serverFarmId'

Fix these errors and run 'atakora synth' again.
```

## Common Validation Scenarios

### Validating Resource Names

```typescript
import { validateStorageAccountName } from '@atakora/lib/validators';

const name = 'MyStorageAccount';

try {
  validateStorageAccountName(name);
} catch (error) {
  console.error(error.message);
  // Error: Storage account names must be lowercase...
}
```

### Validating Resource Properties

```typescript
import { Stack, ResourceGroup, StorageAccount } from '@atakora/lib';

const stack = new Stack('test');
const rg = new ResourceGroup(stack, 'rg', { location: 'eastus' });

// Validation runs automatically
const storage = new StorageAccount(stack, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  sku: { name: 'Standard_LRS' }
});

// Synthesis triggers full validation
const template = stack.synthesize();
```

### Custom Validation Rules

```typescript
import { Stack, ValidationRule } from '@atakora/lib';

// Define custom rule
const enforceTagging: ValidationRule = {
  name: 'enforce-required-tags',
  validate: (resource) => {
    const requiredTags = ['environment', 'owner', 'costCenter'];
    const missingTags = requiredTags.filter(tag => !resource.tags?.[tag]);

    if (missingTags.length > 0) {
      return {
        isValid: false,
        message: `Missing required tags: ${missingTags.join(', ')}`
      };
    }

    return { isValid: true };
  }
};

// Register rule
Stack.addValidationRule(enforceTagging);
```

## Validation vs Testing

Validation and testing serve different purposes:

| Aspect | Validation | Testing |
|--------|-----------|---------|
| **When** | During synthesis | During development/CI |
| **What** | Configuration correctness | Business logic correctness |
| **Scope** | Individual resources | Entire infrastructure |
| **Speed** | Instant | Seconds to minutes |
| **Purpose** | Catch config errors | Verify behavior |

Use validation for quick feedback on configuration issues, and testing for comprehensive verification of infrastructure behavior.

## Navigation by Scenario

| I want to... | Go to... |
|--------------|----------|
| Understand how validation works | [Overview](./overview.md) |
| Fix a validation error | [Common Errors](./common-errors.md) |
| Enforce company standards | [Writing Custom Validators](./writing-custom-validators.md) |
| Debug validation issues | [Common Errors](./common-errors.md) |
| Add organization-specific rules | [Writing Custom Validators](./writing-custom-validators.md) |

## Best Practices

1. **Run validation frequently**: Validate after every significant change
2. **Enable strict mode**: Catch issues early with strict validation
3. **Write custom validators**: Enforce organizational standards
4. **Treat warnings seriously**: Fix warnings before they become errors
5. **Test validators**: Ensure custom validators work correctly
6. **Document validation rules**: Help team members understand requirements

## Additional Resources

- [Core Concepts](../core-concepts/README.md) - Understanding how validation fits in
- [Testing Infrastructure](../workflows/testing-infrastructure.md) - Complementing validation with tests
- [CLI Reference](../../reference/cli/README.md) - Validation command options
- [Troubleshooting](../../troubleshooting/common-issues.md) - Solving validation problems

---

**Next Steps**: Start with the [Validation Overview](./overview.md) to understand how the system works, then explore [Common Errors](./common-errors.md) for practical troubleshooting guidance.

**Feedback**: Found an issue or have a suggestion? [Open an issue](https://github.com/your-org/atakora/issues) on GitHub.
