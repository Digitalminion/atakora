# Writing Custom Validators

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Validation](./README.md) > **Writing Custom Validators**

---

Custom validators let you enforce organization-specific policies, naming conventions, and best practices. This guide shows you how to create, test, and deploy custom validation rules for your infrastructure.

## Table of Contents

- [When to Use Custom Validators](#when-to-use-custom-validators)
- [Validator Structure](#validator-structure)
- [Creating Basic Validators](#creating-basic-validators)
- [Advanced Validation Patterns](#advanced-validation-patterns)
- [Testing Validators](#testing-validators)
- [Registering Validators](#registering-validators)
- [Best Practices](#best-practices)
- [Examples](#examples)

## When to Use Custom Validators

Create custom validators to:

- **Enforce naming conventions**: Company-specific resource naming patterns
- **Enforce tagging policies**: Required tags for cost tracking or compliance
- **Security compliance**: Organization security requirements
- **Cost optimization**: Prevent expensive resource configurations
- **Regional compliance**: Enforce deployment to approved regions
- **Environment consistency**: Ensure dev/staging/prod parity

## Validator Structure

A validator is a function that examines a resource and returns validation results:

```typescript
import { ValidationRule, Resource, ValidationResult, ValidationContext } from '@atakora/lib';

export const myCustomValidator: ValidationRule = {
  // Unique identifier for this validator
  name: 'my-custom-validator',

  // Severity: 'error' | 'warning' | 'info'
  severity: 'error',

  // Optional: Description of what this validator checks
  description: 'Ensures resources follow company standards',

  // The validation function
  validate: (resource: Resource, context: ValidationContext): ValidationResult => {
    // Validation logic here

    // Return validation result
    if (/* validation passes */) {
      return { isValid: true };
    } else {
      return {
        isValid: false,
        message: 'Validation failed because...',
        suggestion: 'Try doing this instead...',
        documentation: 'https://docs.company.com/standards'
      };
    }
  }
};
```

### Validation Result Interface

```typescript
export interface ValidationResult {
  isValid: boolean;
  message?: string;
  suggestion?: string;
  documentation?: string;
  severity?: 'error' | 'warning' | 'info';
  code?: string;
}
```

### Validation Context

Context provides additional information:

```typescript
export interface ValidationContext {
  stack: Stack;
  resource: Resource;
  environment?: string;
  tags?: Record<string, string>;
  customData?: Record<string, unknown>;
}
```

## Creating Basic Validators

### Naming Convention Validator

Enforce resource naming patterns:

```typescript
// validators/naming-convention.ts
import { ValidationRule, Resource } from '@atakora/lib';

export const enforceNamingConvention: ValidationRule = {
  name: 'enforce-naming-convention',
  severity: 'error',
  description: 'Ensures resources follow company naming convention',

  validate: (resource: Resource) => {
    // Pattern: <resource-type>-<environment>-<app>-<number>
    // Example: webapp-prod-api-001
    const pattern = /^[a-z]+-[a-z]+-[a-z]+-\d{3}$/;

    if (!pattern.test(resource.name)) {
      return {
        isValid: false,
        message: `Resource name '${resource.name}' doesn't match naming convention`,
        suggestion: `Use pattern: <type>-<env>-<app>-<number> (e.g., webapp-prod-api-001)`,
        documentation: 'https://wiki.company.com/naming-conventions',
        code: 'NAMING_001'
      };
    }

    return { isValid: true };
  }
};
```

### Required Tags Validator

Enforce tagging policy:

```typescript
// validators/required-tags.ts
import { ValidationRule, Resource } from '@atakora/lib';

export const enforceRequiredTags: ValidationRule = {
  name: 'enforce-required-tags',
  severity: 'error',
  description: 'Ensures all resources have required tags',

  validate: (resource: Resource) => {
    const requiredTags = [
      'environment',
      'owner',
      'costCenter',
      'project',
      'managedBy'
    ];

    const missingTags = requiredTags.filter(tag => !resource.tags?.[tag]);

    if (missingTags.length > 0) {
      return {
        isValid: false,
        message: `Missing required tags: ${missingTags.join(', ')}`,
        suggestion: `Add tags: {\n${missingTags.map(t => `  ${t}: "value"`).join(',\n')}\n}`,
        code: 'TAGS_001'
      };
    }

    // Validate tag values are non-empty
    for (const [key, value] of Object.entries(resource.tags || {})) {
      if (!value || value.trim() === '') {
        return {
          isValid: false,
          message: `Tag '${key}' has empty value`,
          suggestion: `Provide a meaningful value for tag '${key}'`,
          code: 'TAGS_002'
        };
      }
    }

    return { isValid: true };
  }
};
```

### Approved Regions Validator

Restrict deployments to approved regions:

```typescript
// validators/approved-regions.ts
import { ValidationRule, Resource } from '@atakora/lib';

export const enforceApprovedRegions: ValidationRule = {
  name: 'enforce-approved-regions',
  severity: 'error',
  description: 'Ensures resources are deployed to approved regions',

  validate: (resource: Resource) => {
    const approvedRegions = [
      'eastus',
      'eastus2',
      'westus',
      'westus2',
      'centralus'
    ];

    const resourceLocation = resource.location?.toLowerCase();

    if (resourceLocation && !approvedRegions.includes(resourceLocation)) {
      return {
        isValid: false,
        message: `Region '${resource.location}' is not approved for deployment`,
        suggestion: `Use one of: ${approvedRegions.join(', ')}`,
        documentation: 'https://wiki.company.com/approved-regions',
        code: 'REGION_001'
      };
    }

    return { isValid: true };
  }
};
```

## Advanced Validation Patterns

### Type-Specific Validation

Validate based on resource type:

```typescript
// validators/type-specific.ts
import { ValidationRule, Resource, StorageAccount, WebApp } from '@atakora/lib';

export const typeSpecificValidator: ValidationRule = {
  name: 'type-specific-validator',
  severity: 'error',

  validate: (resource: Resource) => {
    // Storage Account specific validation
    if (resource instanceof StorageAccount) {
      if (!resource.properties.supportsHttpsTrafficOnly) {
        return {
          isValid: false,
          message: 'Storage accounts must enforce HTTPS-only traffic',
          code: 'STORAGE_SEC_001'
        };
      }

      if (resource.sku.name === 'Standard_LRS' && resource.tags?.environment === 'production') {
        return {
          isValid: false,
          message: 'Production storage accounts should use geo-redundant SKUs',
          suggestion: 'Use Standard_GRS or Standard_RAGRS for production',
          severity: 'warning',
          code: 'STORAGE_PROD_001'
        };
      }
    }

    // Web App specific validation
    if (resource instanceof WebApp) {
      if (resource.tags?.environment === 'production' && !resource.properties.siteConfig?.alwaysOn) {
        return {
          isValid: false,
          message: 'Production web apps must have AlwaysOn enabled',
          suggestion: 'Set properties.siteConfig.alwaysOn = true',
          code: 'WEBAPP_PROD_001'
        };
      }
    }

    return { isValid: true };
  }
};
```

### Environment-Specific Validation

Different rules for different environments:

```typescript
// validators/environment-specific.ts
import { ValidationRule, Resource, ValidationContext } from '@atakora/lib';

export const environmentSpecificValidator: ValidationRule = {
  name: 'environment-specific-validator',
  severity: 'error',

  validate: (resource: Resource, context: ValidationContext) => {
    const environment = context.environment || resource.tags?.environment;

    // Production-specific rules
    if (environment === 'production') {
      // Require backup configuration
      if (resource instanceof SqlDatabase) {
        if (!resource.properties.backupRetentionDays || resource.properties.backupRetentionDays < 35) {
          return {
            isValid: false,
            message: 'Production databases require 35+ days backup retention',
            suggestion: 'Set properties.backupRetentionDays = 35',
            code: 'DB_PROD_001'
          };
        }
      }

      // Require monitoring
      if (resource instanceof WebApp) {
        const hasAppInsights = resource.properties.siteConfig?.appSettings?.some(
          s => s.name === 'APPINSIGHTS_INSTRUMENTATIONKEY'
        );

        if (!hasAppInsights) {
          return {
            isValid: false,
            message: 'Production web apps require Application Insights',
            suggestion: 'Configure Application Insights monitoring',
            code: 'WEBAPP_PROD_002'
          };
        }
      }
    }

    // Development-specific rules
    if (environment === 'dev' || environment === 'development') {
      // Warn about expensive SKUs in dev
      if (resource instanceof AppServicePlan) {
        if (resource.sku.tier === 'Premium' || resource.sku.tier === 'PremiumV2') {
          return {
            isValid: false,
            message: 'Development environments should not use Premium SKUs',
            suggestion: 'Use Basic or Standard tier for development',
            severity: 'warning',
            code: 'COST_DEV_001'
          };
        }
      }
    }

    return { isValid: true };
  }
};
```

### Complex Business Logic

Validate across multiple resources:

```typescript
// validators/business-logic.ts
import { ValidationRule, Resource, ValidationContext, Stack } from '@atakora/lib';

export const businessLogicValidator: ValidationRule = {
  name: 'business-logic-validator',
  severity: 'error',

  validate: (resource: Resource, context: ValidationContext) => {
    const stack = context.stack;

    // Rule: Every web app must have associated storage
    if (resource instanceof WebApp) {
      const hasStorageConfig = resource.properties.siteConfig?.appSettings?.some(
        s => s.name.includes('STORAGE')
      );

      if (!hasStorageConfig) {
        return {
          isValid: false,
          message: 'Web apps must be configured with storage',
          suggestion: 'Add STORAGE_CONNECTION_STRING to app settings',
          code: 'WEBAPP_CONFIG_001'
        };
      }
    }

    // Rule: Production apps must have staging slot
    if (resource instanceof WebApp && resource.tags?.environment === 'production') {
      const slots = stack.resources.filter(
        r => r.type === 'Microsoft.Web/sites/slots' &&
             r.properties?.parentSiteId === resource.id
      );

      if (slots.length === 0) {
        return {
          isValid: false,
          message: 'Production web apps require a staging deployment slot',
          suggestion: 'Create a staging slot for blue-green deployments',
          severity: 'warning',
          code: 'WEBAPP_PROD_003'
        };
      }
    }

    return { isValid: true };
  }
};
```

### Cost Optimization Validator

Prevent expensive configurations:

```typescript
// validators/cost-optimization.ts
import { ValidationRule, Resource } from '@atakora/lib';

export const costOptimizationValidator: ValidationRule = {
  name: 'cost-optimization',
  severity: 'warning',
  description: 'Identifies potentially expensive configurations',

  validate: (resource: Resource) => {
    // Warn about large storage redundancy in non-production
    if (resource instanceof StorageAccount) {
      if (resource.sku.name === 'Standard_GZRS' && resource.tags?.environment !== 'production') {
        return {
          isValid: false,
          message: 'GZRS storage is expensive for non-production environments',
          suggestion: 'Consider using Standard_LRS or Standard_GRS for dev/staging',
          code: 'COST_001'
        };
      }
    }

    // Warn about oversized app service plans
    if (resource instanceof AppServicePlan) {
      const tier = resource.sku.tier;
      const environment = resource.tags?.environment;

      if ((tier === 'Premium' || tier === 'PremiumV2' || tier === 'PremiumV3') &&
          environment !== 'production') {
        return {
          isValid: false,
          message: `${tier} tier is expensive for ${environment} environment`,
          suggestion: 'Consider using Basic or Standard tier for non-production',
          code: 'COST_002'
        };
      }
    }

    return { isValid: true };
  }
};
```

## Testing Validators

### Unit Testing Validators

```typescript
// validators/naming-convention.test.ts
import { describe, it, expect } from 'vitest';
import { enforceNamingConvention } from './naming-convention';
import { Stack, ResourceGroup, WebApp } from '@atakora/lib';

describe('enforceNamingConvention', () => {
  it('accepts valid names', () => {
    const stack = new Stack('test');
    const rg = new ResourceGroup(stack, 'rg', {
      location: 'eastus',
      name: 'rg-prod-api-001'
    });

    const result = enforceNamingConvention.validate(rg, { stack, resource: rg });

    expect(result.isValid).toBe(true);
  });

  it('rejects names without environment', () => {
    const stack = new Stack('test');
    const rg = new ResourceGroup(stack, 'rg', {
      location: 'eastus',
      name: 'rg-api-001'  // Missing environment
    });

    const result = enforceNamingConvention.validate(rg, { stack, resource: rg });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain('naming convention');
  });

  it('rejects names with uppercase', () => {
    const stack = new Stack('test');
    const rg = new ResourceGroup(stack, 'rg', {
      location: 'eastus',
      name: 'RG-prod-api-001'  // Uppercase
    });

    const result = enforceNamingConvention.validate(rg, { stack, resource: rg });

    expect(result.isValid).toBe(false);
  });

  it('provides helpful suggestions', () => {
    const stack = new Stack('test');
    const rg = new ResourceGroup(stack, 'rg', {
      location: 'eastus',
      name: 'myresourcegroup'
    });

    const result = enforceNamingConvention.validate(rg, { stack, resource: rg });

    expect(result.isValid).toBe(false);
    expect(result.suggestion).toBeDefined();
    expect(result.suggestion).toContain('pattern');
  });
});
```

### Integration Testing

Test validators with complete stacks:

```typescript
// validators/integration.test.ts
import { describe, it, expect } from 'vitest';
import { Stack, ResourceGroup, WebApp, AppServicePlan } from '@atakora/lib';
import { enforceRequiredTags } from './required-tags';

describe('Validator integration', () => {
  it('validates entire stack', () => {
    const stack = new Stack('test');

    Stack.addValidationRule(enforceRequiredTags);

    const rg = new ResourceGroup(stack, 'rg', {
      location: 'eastus',
      tags: {
        environment: 'dev',
        owner: 'platform-team',
        costCenter: 'engineering',
        project: 'webapp',
        managedBy: 'atakora'
      }
    });

    const plan = new AppServicePlan(stack, 'plan', {
      resourceGroup: rg,
      location: 'eastus',
      sku: { name: 'B1', tier: 'Basic' },
      tags: rg.tags  // Same tags
    });

    // Should not throw
    expect(() => stack.synthesize()).not.toThrow();
  });

  it('fails validation with missing tags', () => {
    const stack = new Stack('test');

    Stack.addValidationRule(enforceRequiredTags);

    const rg = new ResourceGroup(stack, 'rg', {
      location: 'eastus',
      tags: {
        environment: 'dev'
        // Missing other required tags
      }
    });

    // Should throw validation error
    expect(() => stack.synthesize()).toThrow(/Missing required tags/);
  });
});
```

## Registering Validators

### Register Globally

Apply to all stacks:

```typescript
// src/validators/index.ts
import { Stack } from '@atakora/lib';
import { enforceNamingConvention } from './naming-convention';
import { enforceRequiredTags } from './required-tags';
import { enforceApprovedRegions } from './approved-regions';

// Register all custom validators
export function registerValidators() {
  Stack.addValidationRule(enforceNamingConvention);
  Stack.addValidationRule(enforceRequiredTags);
  Stack.addValidationRule(enforceApprovedRegions);
}
```

```typescript
// src/main.ts
import { registerValidators } from './validators';

// Register validators before creating stacks
registerValidators();

// Create and deploy stacks
const stack = new MyStack();
stack.synthesize();
```

### Register Per-Stack

Apply to specific stacks:

```typescript
// src/stacks/production-stack.ts
import { Stack } from '@atakora/lib';
import { productionOnlyValidator } from '../validators/production';

export class ProductionStack extends Stack {
  constructor() {
    super('production');

    // Add production-specific validator
    this.addValidationRule(productionOnlyValidator);

    // Create resources...
  }
}
```

### Conditional Registration

Register based on environment:

```typescript
// src/main.ts
import { Stack } from '@atakora/lib';
import { strictProductionValidator } from './validators/production';
import { lenientDevValidator } from './validators/development';

const environment = process.env.ENVIRONMENT || 'dev';

if (environment === 'production') {
  Stack.addValidationRule(strictProductionValidator);
} else {
  Stack.addValidationRule(lenientDevValidator);
}
```

## Best Practices

### 1. Clear Error Messages

```typescript
// ❌ Vague
return {
  isValid: false,
  message: 'Invalid configuration'
};

// ✅ Clear
return {
  isValid: false,
  message: `Storage account name '${resource.name}' exceeds 24 character limit`,
  suggestion: 'Shorten the name or let Atakora generate it automatically',
  code: 'STORAGE_NAME_001'
};
```

### 2. Provide Suggestions

```typescript
return {
  isValid: false,
  message: 'Missing required tags: owner, costCenter',
  suggestion: 'Add tags:\n  owner: "team-name"\n  costCenter: "dept-code"',
  documentation: 'https://wiki.company.com/tagging-policy'
};
```

### 3. Use Error Codes

```typescript
export const ERROR_CODES = {
  NAMING_CONVENTION: 'NAMING_001',
  MISSING_TAGS: 'TAGS_001',
  INVALID_REGION: 'REGION_001',
  SECURITY_VIOLATION: 'SEC_001'
};

return {
  isValid: false,
  message: 'Naming convention violation',
  code: ERROR_CODES.NAMING_CONVENTION
};
```

### 4. Use Appropriate Severity

```typescript
// Error: Must fix before deployment
severity: 'error'

// Warning: Should fix but not blocking
severity: 'warning'

// Info: Helpful suggestion
severity: 'info'
```

### 5. Make Validators Testable

```typescript
// ✅ Pure function - easy to test
export function validateName(name: string): ValidationResult {
  if (!/^[a-z-]+$/.test(name)) {
    return { isValid: false, message: 'Invalid name' };
  }
  return { isValid: true };
}

export const namingValidator: ValidationRule = {
  name: 'naming-validator',
  severity: 'error',
  validate: (resource) => validateName(resource.name)
};
```

## Examples

### Complete Example: Company Standards Validator

```typescript
// validators/company-standards.ts
import { ValidationRule, Resource, ValidationContext } from '@atakora/lib';

export const companyStandardsValidator: ValidationRule = {
  name: 'company-standards',
  severity: 'error',
  description: 'Enforces Acme Corp infrastructure standards',

  validate: (resource: Resource, context: ValidationContext) => {
    const errors: string[] = [];

    // 1. Naming convention: <type>-<env>-<app>-<number>
    const namePattern = /^[a-z]+-[a-z]+-[a-z]+-\d{3}$/;
    if (!namePattern.test(resource.name)) {
      errors.push('Name must follow pattern: <type>-<env>-<app>-<number>');
    }

    // 2. Required tags
    const requiredTags = ['environment', 'owner', 'costCenter', 'project'];
    const missingTags = requiredTags.filter(t => !resource.tags?.[t]);
    if (missingTags.length > 0) {
      errors.push(`Missing required tags: ${missingTags.join(', ')}`);
    }

    // 3. Approved regions
    const approvedRegions = ['eastus', 'eastus2', 'westus2'];
    if (resource.location && !approvedRegions.includes(resource.location.toLowerCase())) {
      errors.push(`Region ${resource.location} not approved`);
    }

    // 4. Environment-specific rules
    if (resource.tags?.environment === 'production') {
      // Production must have backup enabled
      if (resource instanceof SqlDatabase && !resource.properties.backupRetentionDays) {
        errors.push('Production databases must have backup configured');
      }

      // Production must have monitoring
      if (resource instanceof WebApp) {
        const hasMonitoring = resource.properties.siteConfig?.appSettings?.some(
          s => s.name === 'APPINSIGHTS_INSTRUMENTATIONKEY'
        );
        if (!hasMonitoring) {
          errors.push('Production apps must have Application Insights');
        }
      }
    }

    // Return result
    if (errors.length > 0) {
      return {
        isValid: false,
        message: errors.join('; '),
        documentation: 'https://wiki.acmecorp.com/infrastructure-standards',
        code: 'ACME_STANDARDS_001'
      };
    }

    return { isValid: true };
  }
};
```

## Next Steps

- **[Common Errors](./common-errors.md)**: Troubleshoot validation errors
- **[Validation Overview](./overview.md)**: Understand the validation system
- **[Testing Infrastructure](../workflows/testing-infrastructure.md)**: Test your validators

## Related Documentation

- [Core Concepts](../core-concepts/README.md) - Understanding resources and stacks
- [Best Practices](../patterns/README.md) - Infrastructure patterns
- [CLI Reference](../../reference/cli/README.md) - Validation commands

---

**Feedback**: Found an issue or have a suggestion? [Open an issue](https://github.com/your-org/atakora/issues) on GitHub.
