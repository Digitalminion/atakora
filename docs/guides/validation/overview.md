# Validation System Overview

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Validation](./README.md) > **Overview**

---

Understanding how Atakora's validation system works helps you write better infrastructure code and resolve issues quickly. This guide explains the validation architecture, when validation runs, and how to work with validation errors effectively.

## Table of Contents

- [How Validation Works](#how-validation-works)
- [Validation Phases](#validation-phases)
- [Types of Validation Rules](#types-of-validation-rules)
- [Validation Context](#validation-context)
- [Error Reporting](#error-reporting)
- [Integration with TypeScript](#integration-with-typescript)
- [Performance Considerations](#performance-considerations)

## How Validation Works

Validation in Atakora follows a multi-layered approach, catching errors at different stages of infrastructure definition and deployment:

```
Code Written → TypeScript Validation → Construct Validation → Stack Validation → Synthesis Validation → Deployment
     ↓               ↓                      ↓                    ↓                   ↓                    ↓
  IDE hints    Compile-time errors    Property validation   Dependency checks   Template validation   Azure validation
```

### The Validation Pipeline

When you define infrastructure and run `atakora synth`, validation runs through several stages:

```typescript
import { Stack, ResourceGroup, StorageAccount } from '@atakora/lib';

// 1. TypeScript validates types as you write
const stack = new Stack('my-stack');
const rg = new ResourceGroup(stack, 'rg', {
  location: 'eastus'  // TypeScript ensures this is a valid Location type
});

// 2. Construct validates properties on instantiation
const storage = new StorageAccount(stack, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  sku: {
    name: 'Standard_LRS'  // Validated against allowed SKU values
  },
  properties: {
    supportsHttpsTrafficOnly: true,  // Validated as required
    minimumTlsVersion: 'TLS1_2'     // Validated against allowed versions
  }
});

// 3. Stack validation runs during synthesis
const template = stack.synthesize();  // Validates dependencies, circular refs, etc.
```

## Validation Phases

### Phase 1: TypeScript Type Checking

TypeScript provides the first layer of validation through its type system:

```typescript
// ✅ Valid: Type-correct
const storage = new StorageAccount(stack, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  sku: { name: 'Standard_LRS' }
});

// ❌ TypeScript Error: Type mismatch
const storage = new StorageAccount(stack, 'storage', {
  resourceGroup: rg,
  location: 123,  // Type 'number' is not assignable to type 'Location'
  sku: { name: 'Standard_LRS' }
});
```

**Benefits**:
- Instant feedback in IDE
- Catches type errors before running code
- Autocomplete for valid values
- Documentation through types

### Phase 2: Constructor Validation

Each construct validates its properties when instantiated:

```typescript
export class StorageAccount extends Resource {
  constructor(scope: Construct, id: string, props: StorageAccountProps) {
    super(scope, id);

    // Validate required properties
    if (!props.resourceGroup) {
      throw new ValidationError('StorageAccount requires resourceGroup property');
    }

    // Validate property values
    if (props.name && !this.isValidStorageAccountName(props.name)) {
      throw new ValidationError(
        `Invalid storage account name: ${props.name}. ` +
        'Names must be lowercase alphanumeric, 3-24 characters.'
      );
    }

    // Validate combinations
    if (props.kind === 'FileStorage' && props.sku.name !== 'Premium_LRS') {
      throw new ValidationError(
        'FileStorage kind requires Premium_LRS SKU'
      );
    }

    // Apply defaults and create resource
    this.applyDefaults(props);
  }

  private isValidStorageAccountName(name: string): boolean {
    return /^[a-z0-9]{3,24}$/.test(name);
  }
}
```

**Benefits**:
- Immediate error feedback
- Context-specific validation
- Clear error messages
- Prevents invalid resource creation

### Phase 3: Post-Construction Validation

Additional validation after all resources are created:

```typescript
export class WebApp extends Resource {
  validate(): string[] {
    const errors: string[] = [];

    // Validate dependencies exist
    if (!this.serverFarmId) {
      errors.push('WebApp requires serverFarmId to be set');
    }

    // Validate configuration consistency
    if (this.httpsOnly && this.clientCertEnabled && !this.clientCertMode) {
      errors.push('clientCertMode must be set when clientCertEnabled is true');
    }

    // Validate environment-specific rules
    if (this.tags?.environment === 'production') {
      if (!this.properties.siteConfig?.alwaysOn) {
        errors.push('Production web apps must have alwaysOn enabled');
      }
    }

    return errors;
  }
}
```

### Phase 4: Stack Validation

Stack-level validation checks resource relationships and dependencies:

```typescript
export class Stack {
  synthesize(): Template {
    // Validate resource dependencies
    this.validateDependencies();

    // Validate resource uniqueness
    this.validateUniqueNames();

    // Run custom validation rules
    this.runValidationRules();

    // Generate template
    return this.toTemplate();
  }

  private validateDependencies(): void {
    const graph = this.buildDependencyGraph();

    // Check for circular dependencies
    const cycles = this.detectCycles(graph);
    if (cycles.length > 0) {
      throw new ValidationError(
        `Circular dependencies detected: ${cycles.join(', ')}`
      );
    }

    // Check for missing dependencies
    const missingDeps = this.findMissingDependencies(graph);
    if (missingDeps.length > 0) {
      throw new ValidationError(
        `Missing dependencies: ${missingDeps.join(', ')}`
      );
    }
  }

  private validateUniqueNames(): void {
    const names = new Map<string, string>();

    for (const resource of this.resources) {
      const key = `${resource.type}:${resource.name}`;
      if (names.has(key)) {
        throw new ValidationError(
          `Duplicate resource name: ${resource.type} '${resource.name}' ` +
          `already defined at ${names.get(key)}`
        );
      }
      names.set(key, resource.location);
    }
  }
}
```

### Phase 5: Template Validation

Final validation of the generated ARM template:

```typescript
export class TemplateValidator {
  validate(template: Template): ValidationResult {
    const errors: string[] = [];

    // Validate ARM template schema
    errors.push(...this.validateSchema(template));

    // Validate resource references
    errors.push(...this.validateReferences(template));

    // Validate parameter usage
    errors.push(...this.validateParameters(template));

    // Validate outputs
    errors.push(...this.validateOutputs(template));

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateSchema(template: Template): string[] {
    // Validate against ARM template JSON schema
    const ajv = new Ajv();
    const validate = ajv.compile(armTemplateSchema);

    if (!validate(template)) {
      return validate.errors?.map(err => err.message) || [];
    }

    return [];
  }

  private validateReferences(template: Template): string[] {
    const errors: string[] = [];
    const resourceIds = new Set(template.resources.map(r => r.id));

    for (const resource of template.resources) {
      // Find all resourceId() references
      const refs = this.extractReferences(resource);

      for (const ref of refs) {
        if (!resourceIds.has(ref)) {
          errors.push(
            `Resource ${resource.name} references non-existent resource: ${ref}`
          );
        }
      }
    }

    return errors;
  }
}
```

## Types of Validation Rules

### Built-in Validation Rules

Atakora includes comprehensive built-in validation:

#### Naming Validation

```typescript
// Storage account names
validateStorageAccountName(name: string): void {
  if (!/^[a-z0-9]{3,24}$/.test(name)) {
    throw new ValidationError(
      'Storage account names must be lowercase alphanumeric, 3-24 characters'
    );
  }
}

// Web app names
validateWebAppName(name: string): void {
  if (!/^[a-zA-Z0-9-]{1,60}$/.test(name)) {
    throw new ValidationError(
      'Web app names must be alphanumeric or hyphens, 1-60 characters'
    );
  }
}
```

#### Security Validation

```typescript
// HTTPS enforcement
validateHttpsOnly(resource: WebApp | StorageAccount): void {
  if (!resource.httpsOnly && !resource.properties.supportsHttpsTrafficOnly) {
    throw new ValidationError(
      `${resource.type} must enforce HTTPS-only traffic for security`
    );
  }
}

// TLS version
validateMinimumTlsVersion(version: string): void {
  const validVersions = ['TLS1_0', 'TLS1_1', 'TLS1_2', 'TLS1_3'];
  if (!validVersions.includes(version)) {
    throw new ValidationError(
      `Invalid TLS version: ${version}. Valid versions: ${validVersions.join(', ')}`
    );
  }

  if (version === 'TLS1_0' || version === 'TLS1_1') {
    throw new ValidationError(
      `TLS version ${version} is deprecated. Use TLS1_2 or TLS1_3`
    );
  }
}
```

#### Resource Limit Validation

```typescript
validateResourceLimits(resources: Resource[]): void {
  const limits = {
    storageAccounts: 250,
    webApps: 500,
    sqlServers: 20
  };

  const counts = this.countResourcesByType(resources);

  for (const [type, count] of Object.entries(counts)) {
    const limit = limits[type];
    if (limit && count > limit) {
      throw new ValidationError(
        `Resource limit exceeded: ${type} (${count}/${limit})`
      );
    }
  }
}
```

### Custom Validation Rules

Add organization-specific validation:

```typescript
import { ValidationRule, Resource } from '@atakora/lib';

// Enforce tagging policy
export const enforceRequiredTags: ValidationRule = {
  name: 'enforce-required-tags',
  severity: 'error',
  validate: (resource: Resource) => {
    const requiredTags = ['environment', 'owner', 'costCenter', 'project'];
    const missingTags = requiredTags.filter(tag => !resource.tags?.[tag]);

    if (missingTags.length > 0) {
      return {
        isValid: false,
        message: `Missing required tags: ${missingTags.join(', ')}`,
        resource: resource.id,
        suggestion: `Add tags: ${missingTags.map(t => `${t}: "value"`).join(', ')}`
      };
    }

    return { isValid: true };
  }
};

// Enforce naming convention
export const enforceNamingConvention: ValidationRule = {
  name: 'enforce-naming-convention',
  severity: 'warning',
  validate: (resource: Resource) => {
    const pattern = /^[a-z]+-[a-z]+-[a-z]+$/;  // e.g., "webapp-prod-001"

    if (!pattern.test(resource.name)) {
      return {
        isValid: false,
        message: `Resource name '${resource.name}' doesn't follow naming convention`,
        resource: resource.id,
        suggestion: `Use pattern: <resource-type>-<environment>-<identifier>`
      };
    }

    return { isValid: true };
  }
};

// Register custom rules
Stack.addValidationRule(enforceRequiredTags);
Stack.addValidationRule(enforceNamingConvention);
```

## Validation Context

Validation rules have access to context information:

```typescript
export interface ValidationContext {
  stack: Stack;
  resource: Resource;
  environment?: string;
  region?: string;
  tags?: Record<string, string>;
}

export interface ValidationRule {
  name: string;
  severity: 'error' | 'warning' | 'info';
  validate: (resource: Resource, context: ValidationContext) => ValidationResult;
}

// Example using context
export const validateProductionResources: ValidationRule = {
  name: 'validate-production-resources',
  severity: 'error',
  validate: (resource, context) => {
    if (context.environment === 'production') {
      // Production-specific validation
      if (resource instanceof WebApp && !resource.properties.siteConfig?.alwaysOn) {
        return {
          isValid: false,
          message: 'Production web apps must have AlwaysOn enabled',
          resource: resource.id
        };
      }

      if (resource instanceof StorageAccount && resource.sku.name.startsWith('Standard')) {
        return {
          isValid: false,
          message: 'Production storage should use Premium SKUs for better performance',
          resource: resource.id,
          severity: 'warning'
        };
      }
    }

    return { isValid: true };
  }
};
```

## Error Reporting

### Error Format

Validation errors follow a consistent format:

```typescript
export interface ValidationError {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  resource?: string;
  location?: SourceLocation;
  suggestion?: string;
  documentation?: string;
}

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}
```

### Error Output

Errors are presented with context:

```
❌ Validation Error [STORAGE_001]

Resource: StorageAccount 'my-storage'
Location: src/stacks/storage-stack.ts:15:7

Issue: Storage account name 'MyStorageAccount' is invalid
Reason: Storage account names must be lowercase alphanumeric, 3-24 characters

Suggestion: Use 'mystorageaccount' instead

Documentation: https://docs.atakora.dev/validation/storage-account-naming
```

### Programmatic Error Handling

Handle validation errors in code:

```typescript
import { Stack, ValidationError } from '@atakora/lib';

try {
  const stack = new Stack('my-stack');
  // ... add resources ...
  const template = stack.synthesize();
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation failed: ${error.message}`);
    console.error(`Resource: ${error.resource}`);
    console.error(`Location: ${error.location?.file}:${error.location?.line}`);

    if (error.suggestion) {
      console.log(`\nSuggestion: ${error.suggestion}`);
    }

    if (error.documentation) {
      console.log(`\nSee: ${error.documentation}`);
    }

    process.exit(1);
  }

  throw error;
}
```

## Integration with TypeScript

### Type-Driven Validation

TypeScript types guide validation:

```typescript
// Define strict types
export type StorageAccountSku =
  | 'Standard_LRS'
  | 'Standard_GRS'
  | 'Standard_RAGRS'
  | 'Premium_LRS';

export interface StorageAccountProps {
  resourceGroup: ResourceGroup;
  location: Location;
  sku: {
    name: StorageAccountSku;  // Only valid SKUs accepted
  };
  kind?: 'Storage' | 'StorageV2' | 'BlobStorage' | 'FileStorage';
  properties?: {
    supportsHttpsTrafficOnly?: boolean;
    minimumTlsVersion?: 'TLS1_0' | 'TLS1_1' | 'TLS1_2' | 'TLS1_3';
  };
}

// TypeScript prevents invalid values
const storage = new StorageAccount(stack, 'storage', {
  resourceGroup: rg,
  location: 'eastus',
  sku: {
    name: 'Invalid_SKU'  // ❌ TypeScript error before runtime
  }
});
```

### Generic Validation Helpers

Type-safe validation utilities:

```typescript
export function validateEnum<T>(
  value: unknown,
  validValues: readonly T[],
  fieldName: string
): asserts value is T {
  if (!validValues.includes(value as T)) {
    throw new ValidationError(
      `Invalid ${fieldName}: ${value}. Valid values: ${validValues.join(', ')}`
    );
  }
}

// Usage
validateEnum(sku.name, ['Standard_LRS', 'Premium_LRS'], 'SKU name');
```

## Performance Considerations

### Validation Cost

Validation adds minimal overhead:

```
Typical validation times:
- TypeScript checking: 0ms (compile time)
- Constructor validation: <1ms per resource
- Stack validation: 10-50ms for 100 resources
- Template validation: 50-200ms

Total: Usually < 1 second for typical stacks
```

### Optimization Strategies

For large projects:

```typescript
// 1. Skip validation in development (not recommended)
const stack = new Stack('my-stack', {
  validation: {
    enabled: process.env.NODE_ENV === 'production'
  }
});

// 2. Selective validation
const stack = new Stack('my-stack', {
  validation: {
    rules: ['critical-only']  // Only run critical validations
  }
});

// 3. Parallel validation (automatic in Atakora)
// Resources validated concurrently when possible
```

## Next Steps

- **[Common Errors](./common-errors.md)**: Learn to troubleshoot validation errors
- **[Writing Custom Validators](./writing-custom-validators.md)**: Create organization-specific rules
- **[Testing Infrastructure](../workflows/testing-infrastructure.md)**: Complement validation with testing

## Related Documentation

- [Core Concepts](../core-concepts/README.md) - Understanding stacks and constructs
- [CLI Reference](../../reference/cli/README.md) - Validation command options
- [Troubleshooting](../../troubleshooting/common-issues.md) - Solving validation problems

---

**Feedback**: Found an issue or have a suggestion? [Open an issue](https://github.com/your-org/atakora/issues) on GitHub.
