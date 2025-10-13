# Azure ARM Schema Implementation Template

## Overview
This document provides the standard template for implementing Azure ARM schema types for each namespace. The schemas use TypeScript interfaces (NOT Zod) to define the complete type system for ARM resources.

## Implementation Pattern

Each namespace implementation should follow the exact pattern established in existing implementations like:
- `packages/lib/src/schema/microsoft/storage/`
- `packages/lib/src/schema/microsoft/network/`
- `packages/lib/src/schema/microsoft/documentdb/`

## Required Files

### 1. `types.ts` - Complete Type Definitions
```typescript
/**
 * Type definitions for Azure [Service] (Microsoft.[Namespace]).
 *
 * @remarks
 * Complete type definitions extracted from Microsoft.[Namespace] Azure schema.
 *
 * **Resource Type**: Microsoft.[Namespace]/[resourceType]
 * **API Version**: [YYYY-MM-DD]
 *
 * @packageDocumentation
 */

import type { /* enum imports */ } from './enums';

// Define all interfaces for:
// - Main resource properties
// - Nested property objects
// - Configuration objects
// - Response types
// - ALL related types in the namespace

export interface [ResourceName]Properties {
  readonly [property]: type;
  // ... complete property definitions
}
```

### 2. `enums.ts` - Enumeration Definitions
```typescript
/**
 * Enums for Azure [Service] (Microsoft.[Namespace]).
 *
 * @remarks
 * Curated enums extracted from Microsoft.[Namespace] Azure schema.
 *
 * **Resource Type**: Microsoft.[Namespace]/[resourceType]
 * **API Version**: [YYYY-MM-DD]
 *
 * @packageDocumentation
 */

export enum [EnumName] {
  VALUE_ONE = 'ValueOne',
  VALUE_TWO = 'ValueTwo',
  // ... all enum values
}
```

### 3. `index.ts` - Module Exports
```typescript
/**
 * Azure [Service] schema module (Microsoft.[Namespace]).
 *
 * @remarks
 * Type definitions and enums for Azure [Service] resources.
 *
 * @packageDocumentation
 */

// Export all enums
export { /* all enums */ } from './enums';

// Export all types
export type { /* all interfaces */ } from './types';
```

## Schema Source References

### Primary Sources
1. **Azure REST API Specifications**: https://github.com/Azure/azure-rest-api-specs
   - Navigate to: `specification/[service]/resource-manager/Microsoft.[Namespace]/stable/[version]`
   - Review the OpenAPI/Swagger specifications for complete type definitions

2. **Azure Resource Manager Schemas**: https://github.com/Azure/azure-resource-manager-schemas
   - Check: `schemas/[year]/Microsoft.[Namespace]/[resource].json`
   - Contains JSON Schema definitions for ARM templates

3. **Azure Documentation**: https://docs.microsoft.com/en-us/azure/templates/microsoft.[namespace]/
   - Official ARM template reference documentation
   - Lists all properties, types, and allowed values

## Coverage Requirements

### CRITICAL: Complete Coverage Required
Each implementation MUST include:

1. **All Resource Types** in the namespace
   - Primary resources (e.g., storageAccounts)
   - Child resources (e.g., storageAccounts/blobServices)
   - Extension resources if applicable

2. **All Property Types**
   - Required properties
   - Optional properties
   - Conditional properties
   - Read-only properties (marked with `readonly`)

3. **All Nested Objects**
   - Configuration objects
   - Settings objects
   - Sub-resource definitions
   - Complex property types

4. **All Enumerations**
   - SKU names/tiers
   - Configuration options
   - Status values
   - Feature flags

5. **All Response Types**
   - Properties returned by Azure
   - Status objects
   - Metadata objects

## Implementation Guidelines

### Type Definition Best Practices

1. **Use `readonly` modifier** for all properties (immutability)
2. **Use TypeScript interfaces** (not classes or types)
3. **Document complex properties** with JSDoc comments
4. **Include `@remarks`** for important notes or Azure-specific behavior
5. **Specify literal types** where Azure expects specific strings
6. **Use union types** for properties with multiple allowed formats

### Enum Best Practices

1. **Use UPPER_SNAKE_CASE** for enum keys
2. **Match exact Azure values** for enum values
3. **Group related enums** logically
4. **Document enum purpose** with JSDoc

### Property Patterns

```typescript
// Required property
readonly name: string;

// Optional property
readonly description?: string;

// Union type for specific values
readonly tier?: 'Basic' | 'Standard' | 'Premium';

// Complex nested object
readonly settings?: {
  readonly enabled: boolean;
  readonly configuration?: ConfigObject;
};

// Array of objects
readonly rules?: SecurityRule[];

// Map/Dictionary pattern
readonly tags?: Record<string, string>;
```

## Validation Checklist

Before marking implementation complete:

- [ ] All resource types from Azure docs are defined
- [ ] All properties match Azure specifications exactly
- [ ] All enums are complete with correct values
- [ ] JSDoc comments explain complex properties
- [ ] File headers include correct API version
- [ ] Index exports all public types and enums
- [ ] No Zod schemas (use TypeScript interfaces only)
- [ ] All properties marked `readonly`
- [ ] Tested that types compile without errors

## Example Reference Implementations

Study these completed implementations as references:

1. **Storage** (`packages/lib/src/schema/microsoft/storage/`)
   - Complex nested properties
   - Multiple configuration objects
   - Extensive enum definitions

2. **Network** (`packages/lib/src/schema/microsoft/network/`)
   - Multiple resource types
   - Shared configuration objects
   - Cross-resource references

3. **DocumentDB** (`packages/lib/src/schema/microsoft/documentdb/`)
   - Database-specific patterns
   - Consistency levels and policies
   - Regional configuration

## Common Pitfalls to Avoid

1. **Incomplete Coverage**: Missing nested types or sub-resources
2. **Wrong Case**: Not matching Azure's exact casing for values
3. **Missing Readonly**: Properties should be immutable
4. **Over-simplification**: Using `any` or `string` instead of proper types
5. **Missing Enums**: Using string literals instead of enums
6. **Incorrect Optionality**: Making required fields optional or vice versa