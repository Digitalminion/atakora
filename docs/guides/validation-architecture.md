# Validation Architecture Guide

## Overview

Atakora uses a **5-layer validation architecture** to catch errors early and provide fast feedback during development. Instead of discovering issues during lengthy Azure deployments (5-30 minutes), you'll catch most problems at compile-time or synthesis-time within seconds.

This guide explains how validation works, when each layer runs, and how to use the validation system effectively in your infrastructure code.

## Why Multi-Layer Validation?

Traditional infrastructure-as-code tools validate templates only at deployment time. This creates a slow, frustrating feedback loop:

1. Write infrastructure code
2. Generate ARM templates (1-5 seconds)
3. Deploy to Azure (5-30 minutes)
4. **Deployment fails** with cryptic error
5. Debug ARM template JSON manually
6. Fix the code
7. Repeat from step 2

Atakora's multi-layer validation prevents this by catching errors progressively:

- **90% of errors** caught at compile-time (instant feedback)
- **95% of remaining errors** caught at synthesis-time (1-2 seconds)
- **Nearly zero** deployment-time failures from structural issues

## The 5 Validation Layers

### Layer 1: Compile-Time Type Safety

**When it runs:** During TypeScript compilation (before any code executes)

**What it validates:**

- Property types match expected structures
- Required properties are provided
- Enum values are valid
- Type relationships are correct

**Example:**

```typescript
// ❌ Compile error - TypeScript catches this immediately
const vnet = new VirtualNetwork(stack, 'VNet', {
  addressSpace: '10.0.0.0/16', // ERROR: Should be string[]
});

// ✅ Correct - TypeScript validates structure
const vnet = new VirtualNetwork(stack, 'VNet', {
  addressSpace: ['10.0.0.0/16'],
});
```

**Key Benefit:** You see errors in your IDE before running any code. No waiting, no runtime failures.

### Layer 2: Construct Validation (Build-Time)

**When it runs:** When you create resource constructs in your code

**What it validates:**

- Business logic constraints (CIDR ranges, port numbers, etc.)
- Resource-specific requirements (subnet within VNet range)
- Cross-resource dependencies
- ARM structure requirements specific to each resource

**Example:**

```typescript
const vnet = new VirtualNetwork(stack, 'VNet', {
  addressSpace: ['10.0.0.0/16'],
});

// ❌ Runtime error - caught immediately when creating subnet
const subnet = new Subnet(vnet, 'Subnet', {
  addressPrefix: '192.168.1.0/24', // Outside VNet range!
});
// Error: Subnet CIDR 192.168.1.0/24 is not within VNet range 10.0.0.0/16

// ✅ Correct - validated when construct is created
const subnet = new Subnet(vnet, 'Subnet', {
  addressPrefix: '10.0.1.0/24', // Within VNet range
});
```

**Key Benefit:** Immediate validation of resource configurations. Errors appear exactly where you define resources.

### Layer 3: ARM Structure Validation (Synthesis-Time)

**When it runs:** During template synthesis, before generating ARM JSON

**What it validates:**

- ARM-specific structural requirements
- Property wrapper correctness (e.g., `properties` object required)
- Resource reference format (`resourceId()` expressions)
- Nested object structures match ARM expectations

**Example:**

```typescript
// ❌ Synthesis error - ARM requires specific structure
const subnet = new Subnet(vnet, 'AppSubnet', {
  addressPrefix: '10.0.1.0/24',
  delegation: {
    serviceName: 'Microsoft.Web/serverFarms', // Missing 'properties' wrapper!
  },
});

// Synthesis Error (ARM001): Delegation structure requires properties wrapper
// Expected: { properties: { serviceName: "..." } }
// Actual: { serviceName: "..." }

// ✅ Correct - ARM structure validated
const subnet = new Subnet(vnet, 'AppSubnet', {
  addressPrefix: '10.0.1.0/24',
  delegation: {
    properties: {
      serviceName: 'Microsoft.Web/serverFarms',
    },
  },
});
```

**Key Benefit:** Catches ARM-specific structural issues before template generation. No more debugging ARM JSON.

### Layer 4: Deployment Simulation (Synthesis-Time)

**When it runs:** During template synthesis, after ARM structure validation

**What it validates:**

- Dependency chains are complete
- Resource ordering is correct
- Timing constraints (e.g., no premature network lockdowns)
- Circular dependency detection
- Implicit dependency resolution

**Example:**

```typescript
// ❌ Deployment simulation catches timing issue
const storage = new StorageAccount(stack, 'Storage', {
  publicNetworkAccess: 'Disabled', // Locked down before deployment!
});

const privateEndpoint = new PrivateEndpoint(stack, 'StoragePE', {
  resource: storage,
  subnet: privateSubnet,
});

// Synthesis Error (ARM004): Network access locked down before deployment
// The storage account has publicNetworkAccess: 'Disabled' which prevents
// Azure Resource Manager from provisioning it. Set to 'Enabled' during
// deployment and use post-deployment policies to lock down.

// ✅ Correct - deployment sequence validated
const storage = new StorageAccount(stack, 'Storage', {
  publicNetworkAccess: 'Enabled', // Allow during deployment
  // Use separate policy/template to lock down post-deployment
});
```

**Key Benefit:** Prevents deployment failures from ordering and timing issues. Template will deploy successfully.

### Layer 5: Schema Compliance (Synthesis-Time)

**When it runs:** During template synthesis, as final validation

**What it validates:**

- Generated JSON matches Azure ARM schemas
- API version compatibility
- Provider-specific requirements
- Property value constraints (min/max, patterns, enums)
- Required fields per resource type

**Example:**

```typescript
// Schema validation catches API version issues, value constraints, etc.
// This is the final safety net before template generation
```

**Key Benefit:** Ensures generated templates conform to Azure's exact requirements. Acts as final quality gate.

## Validation Execution Timeline

Here's when each layer executes during your development workflow:

```
1. Write Code
   ↓
2. TypeScript Compiler Runs
   ↓ [Layer 1: Type Safety - COMPILE TIME]
   ↓
3. Code Executes (npm run build / atakora synth)
   ↓ [Layer 2: Construct Validation - RUNTIME]
   ↓
4. Synthesis Begins
   ↓ [Layer 3: ARM Structure Validation - SYNTHESIS]
   ↓ [Layer 4: Deployment Simulation - SYNTHESIS]
   ↓ [Layer 5: Schema Compliance - SYNTHESIS]
   ↓
5. ARM Templates Generated (arm.out/)
   ↓
6. Deploy to Azure (atakora deploy)
   ↓
7. ✅ Success (nearly guaranteed if validation passed)
```

**Typical Performance:**

- Layers 1-2: Instant to <100ms
- Layers 3-5: 200-500ms for typical templates (100 resources)
- **Total validation overhead:** <1 second

## How Validation Layers Work Together

### Error Propagation

Validation follows a **fail-fast** approach:

1. **Layer 1 (Types)** prevents compilation if types are wrong
2. **Layer 2 (Construct)** throws immediately on invalid props
3. **Layers 3-5** accumulate errors and report all issues together

```typescript
// If Layer 1 fails, code never runs
// If Layer 2 fails, synthesis never starts
// If Layers 3-5 fail, templates aren't generated
```

### Error Context

Each layer provides increasingly specific error context:

```typescript
// Layer 1 (TypeScript):
// "Type 'string' is not assignable to type 'string[]'"

// Layer 2 (Construct):
// "Subnet CIDR 192.168.1.0/24 is not within VNet range 10.0.0.0/16
//  at: MyStack/VNet/AppSubnet"

// Layer 3 (ARM Structure):
// "Delegation structure requires properties wrapper
//  at: MyStack/VNet/AppSubnet/delegation
//  expected: { properties: { serviceName: '...' } }
//  actual: { serviceName: '...' }
//  fix: Wrap serviceName in properties object"

// Layer 4 (Deployment):
// "Network lockdown before deployment prevents provisioning
//  resource: MyStack/Storage
//  issue: publicNetworkAccess is 'Disabled' before deployment
//  fix: Set to 'Enabled' for deployment, lock down post-deployment"
```

### Validation Configuration

You can control validation strictness:

```typescript
// Strict mode - warnings become errors
const app = new App({
  validation: {
    level: 'strict',
  },
});

// Normal mode (default) - warnings don't block
const app = new App({
  validation: {
    level: 'normal',
  },
});

// Lenient mode - only critical errors block
const app = new App({
  validation: {
    level: 'lenient',
  },
});
```

## Migration Guide

### Updating Existing Code

If you have existing Atakora code written before the validation architecture:

#### Step 1: Fix Type Errors

Run TypeScript compiler and fix any type errors:

```bash
npm run build
```

Common fixes:

- Change `addressSpace: 'x.x.x.x/x'` to `addressSpace: ['x.x.x.x/x']`
- Add required properties identified by TypeScript
- Fix enum values that don't match type definitions

#### Step 2: Fix Construct Validation Errors

Run synthesis to catch construct-level issues:

```bash
npx atakora synth
```

Common fixes:

- Wrap delegation in `properties` object
- Ensure subnet CIDR within VNet range
- Fix NSG rule priorities

#### Step 3: Fix ARM Structure Issues

Synthesis will catch ARM structural problems:

Common fixes:

- Use `resourceId()` expressions instead of literal strings
- Ensure `addressPrefix` is inside `properties` object
- Add required ARM property wrappers

#### Step 4: Fix Deployment Simulation Issues

Address any deployment sequence problems:

Common fixes:

- Set `publicNetworkAccess: 'Enabled'` during deployment
- Ensure dependency chains are complete
- Fix resource ordering issues

### Testing Your Migration

```typescript
// Before deploying, validate your changes:
import { Testing } from '@atakora/lib';

const app = new App();
// ... define your stacks

// Validate without deploying
const result = Testing.validateStacks(app);

if (result.errors.length > 0) {
  console.error('Validation errors:', result.errors);
  process.exit(1);
}

console.log('✅ All validations passed');
```

## Best Practices

### 1. Leverage Type Safety

Use TypeScript's type system to catch errors early:

```typescript
// ✅ Good - let TypeScript help you
const props: VirtualNetworkProps = {
  addressSpace: ['10.0.0.0/16'],
  // TypeScript will autocomplete and validate
};

// ❌ Avoid - loses type safety
const props: any = {
  addressSpace: '10.0.0.0/16', // Wrong type, not caught
};
```

### 2. Validate Early and Often

Don't wait until synthesis to find errors:

```bash
# During development
npm run build        # Layer 1: Type checking
npx atakora synth    # Layers 2-5: Full validation

# Before committing
npm test             # Includes validation tests
```

### 3. Write Validation-Aware Code

Structure your code to work with validation:

```typescript
// ✅ Good - validation-friendly
class MyStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create resources in logical order
    const vnet = this.createNetwork();
    const storage = this.createStorage();
    const privateEndpoint = this.connectPrivately(storage, vnet);
  }

  private createNetwork(): VirtualNetwork {
    // Validation happens here when construct is created
    return new VirtualNetwork(this, 'VNet', {
      addressSpace: ['10.0.0.0/16'],
    });
  }
}
```

### 4. Handle Validation Errors Gracefully

```typescript
try {
  const subnet = new Subnet(vnet, 'Subnet', {
    addressPrefix: userInput.cidr, // User-provided CIDR
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Invalid subnet configuration: ${error.message}`);
    console.error(`Suggestion: ${error.suggestion}`);
    // Provide user-friendly feedback
  }
  throw error;
}
```

### 5. Use Validation in CI/CD

```yaml
# .github/workflows/validate.yml
- name: Validate Infrastructure
  run: |
    npm run build          # Type checking
    npx atakora synth      # Full validation
    npx atakora validate   # Explicit validation command
```

## Troubleshooting

### Common Issues

#### "Type error: Property X is not assignable to type Y"

**Solution:** Fix the type in your code. TypeScript is showing you the exact mismatch.

#### "ValidationError: Subnet CIDR not within VNet range"

**Solution:** Ensure your subnet's `addressPrefix` is within the VNet's `addressSpace`:

```typescript
// VNet: 10.0.0.0/16
// Subnet must be: 10.0.x.x/y where y >= 16
```

#### "ARM001: Delegation requires properties wrapper"

**Solution:** See [Common Validation Errors](./common-validation-errors.md#arm001) for detailed fix.

#### "Validation is too strict, blocking valid scenarios"

**Solution:** Use lenient validation mode or open an issue with your use case:

```typescript
const app = new App({
  validation: { level: 'lenient' },
});
```

### Getting Help

- **Error Code Reference:** See [Error Codes](../reference/error-codes.md)
- **Common Errors:** See [Common Validation Errors](./common-validation-errors.md)
- **Issues:** [GitHub Issues](https://github.com/digital-minion/atakora/issues)

## Advanced Topics

### Custom Validation Rules

You can add validation to your custom resource constructs:

```typescript
export class CustomResource extends Resource {
  constructor(scope: Construct, id: string, props: CustomResourceProps) {
    super(scope, id);
    this.validateProps(props);
  }

  protected validateProps(props: CustomResourceProps): void {
    // Add your validation logic
    if (props.value < 0) {
      throw new ValidationError({
        code: 'CUSTOM001',
        message: 'Value must be non-negative',
        suggestion: 'Provide a value >= 0',
      });
    }
  }
}
```

### Disabling Specific Validators

For edge cases, you can disable specific validators:

```typescript
const app = new App({
  validation: {
    disabled: ['ARM003'], // Disable specific error code
  },
});
```

**Warning:** Only disable validators if you're certain the validation is incorrect. Disabling validators can lead to deployment failures.

### Performance Tuning

For large templates (500+ resources), you can optimize validation:

```typescript
const app = new App({
  validation: {
    parallel: true, // Validate resources in parallel
    cacheResults: true, // Cache validation results
  },
});
```

## See Also

- [Common Validation Errors](./common-validation-errors.md) - Detailed error catalog with fixes
- [Error Code Reference](../reference/error-codes.md) - Searchable error code index
- [Testing Guide](./testing-infrastructure.md) - How to test validated infrastructure
- [ARM Template Structure](./arm-template-structure.md) - Understanding ARM requirements
