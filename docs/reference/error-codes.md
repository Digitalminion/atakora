# Error Code Reference

[Home](../README.md) > [Reference](./README.md) > Error Codes

Complete reference of all validation error codes in Atakora. Use this as a quick lookup when you encounter an error code.

## Quick Search

**By Category:**

- [ARM Structure Errors](#arm-structure-errors) (ARM001-ARM099)
- [Deployment Errors](#deployment-errors) (ARM004-ARM099)
- [Networking Errors](#networking-errors) (NET001-NET099)
- [Security Errors](#security-errors) (SEC001-SEC099)
- [Type Safety Errors](#type-safety-errors) (TYPE001-TYPE099)
- [Schema Errors](#schema-errors) (SCHEMA001-SCHEMA099)

**By Severity:**

- 🔴 Error - Blocks synthesis/deployment
- 🟡 Warning - Should be addressed but doesn't block
- 🔵 Info - Informational message

---

## ARM Structure Errors

Errors related to ARM template structure and format requirements.

### ARM001: Invalid Delegation Structure

**Severity:** 🔴 Error

**Message:** Delegation structure requires properties wrapper

**Description:** ARM requires delegation objects to be wrapped in a properties field. The serviceName must be inside properties: { serviceName: "..." }. This is an ARM-specific requirement that applies to subnet delegations.

**Fix:**

```typescript
// ❌ Incorrect
delegation: {
  serviceName: 'Microsoft.Web/serverFarms';
}

// ✅ Correct
delegation: {
  properties: {
    serviceName: 'Microsoft.Web/serverFarms';
  }
}
```

**Related:** [Common Errors Guide](../guides/common-validation-errors.md#arm001)

---

### ARM002: Subnet Address Prefix Incorrect

**Severity:** 🔴 Error

**Message:** Subnet addressPrefix must be inside properties object

**Description:** ARM subnet structure requires addressPrefix to be nested inside the properties field, not at the root level of the subnet object. This is part of ARM's resource property pattern.

**Fix:**

```typescript
// ✅ Correct - Atakora handles this automatically
const subnet = new Subnet(vnet, 'MySubnet', {
  addressPrefix: '10.0.1.0/24'
});

// Generates:
{
  name: 'MySubnet',
  properties: {
    addressPrefix: '10.0.1.0/24'
  }
}
```

**Related:** [Common Errors Guide](../guides/common-validation-errors.md#arm002)

---

### ARM003: Invalid Resource Reference

**Severity:** 🔴 Error

**Message:** Resource reference must use ARM expression syntax

**Description:** Resource references in ARM templates must use ARM expression syntax with resourceId() function, not literal strings. Literal strings don't establish proper dependencies and won't resolve correctly during deployment.

**Fix:**

```typescript
// ❌ Incorrect
networkSecurityGroup: {
  id: '/subscriptions/.../networkSecurityGroups/MyNSG'
}

// ✅ Correct - Pass construct directly
const nsg = new NetworkSecurityGroup(stack, 'MyNSG', { ... });
networkSecurityGroup: nsg

// Generates: "[resourceId('Microsoft.Network/networkSecurityGroups', 'MyNSG')]"
```

**Related:** [Common Errors Guide](../guides/common-validation-errors.md#arm003)

---

## Deployment Errors

Errors related to deployment timing and resource provisioning.

### ARM004: Network Access Lockdown Before Deployment

**Severity:** 🔴 Error

**Message:** Network access locked down before deployment prevents provisioning

**Description:** The resource has publicNetworkAccess set to 'Disabled' in the deployment template. Azure Resource Manager needs network access to provision resources. Setting publicNetworkAccess to 'Disabled' before deployment prevents ARM from completing provisioning, causing timeouts or failures.

**Fix:**

```typescript
// Phase 1: Deploy with access enabled
const storage = new StorageAccount(stack, 'Storage', {
  publicNetworkAccess: 'Enabled', // ✅ Allow during deployment
});

// Phase 2: Lock down post-deployment
// Use Azure Policy or template update after resource is provisioned
```

**Related:** [Common Errors Guide](../guides/common-validation-errors.md#arm004)

---

## Networking Errors

Errors related to network configuration and CIDR ranges.

### NET001: Subnet CIDR Outside VNet Range

**Severity:** 🔴 Error

**Message:** Subnet CIDR {subnetCidr} is not within VNet range {vnetCidr}

**Description:** The subnet's addressPrefix (CIDR range) falls outside the VNet's addressSpace. All subnets must be within their parent VNet's address range. Check your CIDR calculations.

**Fix:**

```typescript
// ❌ Incorrect
const vnet = new VirtualNetwork(stack, 'VNet', {
  addressSpace: ['10.0.0.0/16'],
});
const subnet = new Subnet(vnet, 'Subnet', {
  addressPrefix: '192.168.1.0/24', // Outside VNet!
});

// ✅ Correct
const vnet = new VirtualNetwork(stack, 'VNet', {
  addressSpace: ['10.0.0.0/16'],
});
const subnet = new Subnet(vnet, 'Subnet', {
  addressPrefix: '10.0.1.0/24', // Within VNet
});
```

**Related:** [Common Errors Guide](../guides/common-validation-errors.md#net001)

---

### NET002: Overlapping Subnet Address Spaces

**Severity:** 🔴 Error

**Message:** Subnet address spaces overlap: {subnet1} and {subnet2}

**Description:** Two or more subnets have overlapping CIDR ranges. Each subnet must have a unique, non-overlapping address space within the VNet. Overlapping subnets cause deployment failures.

**Fix:**

```typescript
// ❌ Incorrect - Overlapping
const subnet1 = new Subnet(vnet, 'Subnet1', {
  addressPrefix: '10.0.1.0/24',
});
const subnet2 = new Subnet(vnet, 'Subnet2', {
  addressPrefix: '10.0.1.0/25', // Overlaps!
});

// ✅ Correct - No overlap
const subnet1 = new Subnet(vnet, 'Subnet1', {
  addressPrefix: '10.0.1.0/24',
});
const subnet2 = new Subnet(vnet, 'Subnet2', {
  addressPrefix: '10.0.2.0/24', // Unique range
});
```

**Related:** [Common Errors Guide](../guides/common-validation-errors.md#net002)

---

## Security Errors

Errors related to security configurations.

### SEC001: NSG Rule Priority Conflict

**Severity:** 🔴 Error

**Message:** NSG rule priority conflict: rules {rule1} and {rule2} both have priority {priority}

**Description:** Two or more NSG rules have the same priority value. Each security rule in a Network Security Group must have a unique priority between 100 and 4096. Lower numbers have higher priority.

**Fix:**

```typescript
// ❌ Incorrect - Duplicate priorities
securityRules: [
  { name: 'AllowHTTPS', priority: 100, ... },
  { name: 'AllowHTTP', priority: 100, ... }, // Duplicate!
]

// ✅ Correct - Unique priorities
securityRules: [
  { name: 'AllowHTTPS', priority: 100, ... },
  { name: 'AllowHTTP', priority: 110, ... }, // Unique
]
```

**Priority Guidelines:**

- Range: 100-4096
- Lower number = higher priority (processed first)
- Leave gaps (10-100) between rules
- Suggested scheme:
  - 100-199: Critical allow rules
  - 200-999: Standard allow rules
  - 1000-3999: Logging/monitoring rules
  - 4000-4096: Deny all rules

**Related:** [Common Errors Guide](../guides/common-validation-errors.md#sec001)

---

## Type Safety Errors

Errors caught by TypeScript type system.

### TYPE001: Invalid Property Type

**Severity:** 🔴 Error

**Message:** Property {property} has invalid type {actual}, expected {expected}

**Description:** A property value doesn't match the expected type. This is caught at compile-time by TypeScript but reported here for runtime scenarios.

**Fix:**

```typescript
// ❌ Incorrect - Type mismatch
const vnet = new VirtualNetwork(stack, 'VNet', {
  addressSpace: '10.0.0.0/16', // Wrong: string
});

// ✅ Correct - Proper type
const vnet = new VirtualNetwork(stack, 'VNet', {
  addressSpace: ['10.0.0.0/16'], // Correct: string[]
});
```

**Related:** [Validation Architecture - Type Safety](../guides/validation-architecture.md#layer-1-compile-time-type-safety)

---

## Schema Errors

Errors related to Azure ARM schema compliance.

### SCHEMA001: Schema Validation Failed

**Severity:** 🔴 Error

**Message:** Resource {resource} failed schema validation: {details}

**Description:** The generated ARM resource doesn't match Azure's schema requirements. This could be due to missing required fields, invalid values, or incorrect structure.

**Fix:**

- Check Azure ARM schema documentation for the resource type
- Ensure all required properties are provided
- Verify property values match allowed patterns/enums
- Check API version compatibility

**Related:** [Validation Architecture - Schema Compliance](../guides/validation-architecture.md#layer-5-schema-compliance-synthesis-time)

---

## Error Code Ranges

Error codes are organized by prefix:

| Prefix | Range   | Category      | Description                        |
| ------ | ------- | ------------- | ---------------------------------- |
| ARM    | 001-099 | ARM Structure | ARM template structure and format  |
| ARM    | 004-099 | Deployment    | Deployment timing and provisioning |
| NET    | 001-099 | Networking    | Network configuration and CIDR     |
| SEC    | 001-099 | Security      | Security rules and configurations  |
| TYPE   | 001-099 | Type Safety   | TypeScript type validation         |
| SCHEMA | 001-099 | Schema        | ARM schema compliance              |

**Reserved for future use:**

- SYNTH001-099: Synthesis pipeline errors
- RES001-099: Resource-specific errors
- REF001-099: Reference resolution errors
- DEP001-099: Dependency chain errors

---

## Using Error Codes Programmatically

### In TypeScript Code

```typescript
import {
  createValidationError,
  getErrorDefinition,
  ErrorCatalog,
} from '@atakora/lib/core/validation/error-catalog';

// Throw a validation error
throw createValidationError('ARM001');

// With context
throw createValidationError('NET001', {
  subnetCidr: '192.168.1.0/24',
  vnetCidr: '10.0.0.0/16',
});

// Get error details without throwing
const errorDef = getErrorDefinition('ARM001');
console.log(errorDef.description);
console.log(errorDef.example);
```

### Catching Validation Errors

```typescript
import { ValidationError } from '@atakora/lib/core/validation/error-catalog';

try {
  const subnet = new Subnet(vnet, 'Subnet', props);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Error [${error.code}]: ${error.title}`);
    console.error(error.format()); // Pretty-printed error
    console.log(`Fix: ${error.suggestion}`);
    console.log(`Docs: ${error.relatedDocs}`);
  }
  throw error;
}
```

### Searching Errors

```typescript
import {
  searchErrors,
  getErrorsByCategory,
  ErrorCategory,
} from '@atakora/lib/core/validation/error-catalog';

// Search by keyword
const delegationErrors = searchErrors('delegation');

// Get all errors in a category
const armErrors = getErrorsByCategory(ErrorCategory.ARM_STRUCTURE);
```

---

## Contributing New Error Codes

When adding a new validation error:

1. **Choose the Right Category:**
   - Use existing prefixes when possible
   - ARM\* for template structure issues
   - NET\* for networking problems
   - SEC\* for security issues
   - etc.

2. **Add to Error Catalog:**
   Edit `/packages/lib/src/core/validation/error-catalog.ts`:

   ```typescript
   ARM005: {
     code: 'ARM005',
     category: ErrorCategory.ARM_STRUCTURE,
     title: 'Clear, Concise Title',
     message: 'Error message with {placeholders}',
     description: 'Detailed explanation of what went wrong',
     example: `// Code showing correct usage`,
     suggestion: 'Actionable fix suggestion',
     relatedDocs: '/docs/guides/common-validation-errors.md#arm005',
     severity: ErrorSeverity.ERROR,
   }
   ```

3. **Document in Guides:**
   Add detailed explanation to `/docs/guides/common-validation-errors.md`

4. **Update This Reference:**
   Add quick reference entry to this file

5. **Add Tests:**
   Create test case in validation test suite

6. **Submit PR:**
   Include error code, documentation, and tests

---

## Getting Help

### Error Not Listed?

If you encounter an error code not documented here:

1. It may be a newly added error - check the latest documentation
2. Search [GitHub Issues](https://github.com/digital-minion/atakora/issues)
3. Look in the source: `/packages/lib/src/core/validation/error-catalog.ts`

### Additional Resources

- [Validation Architecture Guide](../guides/validation-architecture.md) - How validation works
- [Common Validation Errors](../guides/common-validation-errors.md) - Detailed error explanations
- [Testing Guide](../guides/testing-infrastructure.md) - Testing validated infrastructure
- [API Documentation](./api-reference.md) - Full API reference

### Support

- **Documentation:** [Atakora Docs](https://github.com/digital-minion/atakora/docs)
- **Issues:** [GitHub Issues](https://github.com/digital-minion/atakora/issues)
- **Discussions:** [GitHub Discussions](https://github.com/digital-minion/atakora/discussions)

---

## Error Statistics

This section is auto-generated from the error catalog:

**Total Errors Defined:** 8

**By Category:**

- ARM Structure: 3 errors
- Deployment: 1 error
- Networking: 2 errors
- Security: 1 error
- Type Safety: 1 error
- Schema: 1 error (template/placeholder)

**By Severity:**

- 🔴 Error: 8
- 🟡 Warning: 0
- 🔵 Info: 0

**Most Common Errors (based on user reports):**

1. ARM001 - Invalid Delegation Structure
2. NET001 - Subnet CIDR Outside VNet Range
3. ARM003 - Invalid Resource Reference
4. ARM004 - Network Access Lockdown

---

_Last Updated: 2025-10-08_
_Error Catalog Version: 1.0.0_
