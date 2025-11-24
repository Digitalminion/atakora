# ADR-021: Fluent API Utilities Location

## Context

The backend gen2 implementation currently contains a `helpers.ts` file at `packages/backend/src/gen2/common/helpers.ts` with foundational utilities for the fluent API pattern:

1. **Duration helpers**: `seconds()`, `minutes()`, `hours()`, `days()` - Create type-safe duration values with conversion methods to ISO, ARM duration formats
2. **Threshold builders**: `greaterThan()`, `lessThan()`, `between()`, `olderThan()` - Build comparison expressions for monitoring and alerts
3. **Size helpers**: `bytes()`, `kilobytes()`, `megabytes()`, `gigabytes()` - Handle storage size calculations with proper unit conversions
4. **Network helpers**: `ipAddress()`, `cidr()`, `subnet()` - Validate and format network configurations

These utilities are used extensively throughout the fluent API implementations:

- Event topics (audit-logger, service-bus)
- Infrastructure resources (virtual-network, log-analytics, api-management)
- Queue processors (shown in fluent-api-examples.md)

The question is whether these utilities belong in application code (`@atakora/backend`) or should be part of the framework itself.

### Current State Analysis

Currently these helpers exist only in the backend application code, but:

- They're foundational to the fluent API design pattern
- Every application using fluent APIs would need to duplicate this code
- The utilities are Azure-specific but not application-specific
- They provide type safety and validation that benefits all users

### Framework Package Options

1. **@atakora/lib** - Core framework library
   - Already contains schema types and validation
   - Imported by all other packages
   - Focused on low-level synthesis and ARM generation

2. **@atakora/cdk** - CDK construct library
   - Contains L1/L2 constructs
   - Used for building infrastructure
   - Not imported by component package

3. **@atakora/component** - High-level patterns
   - Where fluent APIs are being implemented
   - Already contains backend utilities
   - Natural home for fluent API support

4. **New package** - @atakora/fluent or @atakora/common
   - Dedicated utilities package
   - Clean separation of concerns
   - Additional maintenance burden

## Decision

Move the fluent API utilities to **@atakora/component** package in a new `common` module at `packages/component/src/common/`.

This will be organized as:

```
packages/component/src/
├── common/
│   ├── index.ts         # Public exports
│   ├── duration.ts      # Duration utilities
│   ├── threshold.ts     # Threshold builders
│   ├── size.ts          # Size utilities
│   └── network.ts       # Network utilities
├── backend/
├── crud/
└── ...other components
```

Export pattern:

```typescript
// From @atakora/component
export * from './common';

// Usage in applications
import { seconds, minutes, greaterThan } from '@atakora/component/common';
// or
import { seconds, minutes, greaterThan } from '@atakora/component';
```

## Alternatives Considered

### Alternative 1: Keep in Backend (Status Quo)

- **Pros**: No changes needed, application has full control
- **Cons**: Code duplication across projects, violates DRY principle
- **Rejected because**: These are framework utilities, not application code

### Alternative 2: Move to @atakora/lib

- **Pros**: Available to all packages, core location
- **Cons**: Lib is focused on low-level synthesis, would add unrelated concerns
- **Rejected because**: These are high-level fluent API utilities, not core synthesis logic

### Alternative 3: Move to @atakora/cdk

- **Pros**: CDK-specific utilities location
- **Cons**: Component package can't import CDK, would create circular dependency
- **Rejected because**: Component package needs these utilities and can't depend on CDK

### Alternative 4: Create @atakora/common or @atakora/fluent

- **Pros**: Clean separation, dedicated package for utilities
- **Cons**: Another package to maintain, versioning complexity
- **Rejected because**: Over-engineering for current needs, can reconsider if utilities grow significantly

## Consequences

### Positive Consequences

1. **DRY Principle**: Single source of truth for fluent API utilities
2. **Framework Feature**: Utilities become part of the framework, not application code
3. **Type Safety**: All users benefit from well-tested type-safe utilities
4. **Discoverability**: Users can easily find and use these utilities
5. **Consistency**: Ensures all fluent APIs use same helper patterns
6. **Natural Location**: Component package is where fluent APIs live
7. **No Breaking Changes**: Backend can import from component without issues

### Negative Consequences

1. **Dependency**: Applications using fluent APIs must depend on @atakora/component
2. **Package Size**: Component package grows (minimal - utilities are small)
3. **Migration Work**: Need to update existing imports in backend

### Trade-offs

- **Coupling vs Reusability**: Accepting tighter coupling to component package for better reusability
- **Package Scope**: Component package scope expands slightly to include common utilities
- **Import Paths**: Slightly longer import paths but better organization

## Success Criteria

1. **Zero Duplication**: No project should duplicate these utilities
2. **Easy Discovery**: Developers can easily find utilities through IDE autocomplete
3. **Type Safety**: Full TypeScript support with proper type inference
4. **Documentation**: Utilities are well-documented with examples
5. **Testing**: Comprehensive test coverage for all utilities
6. **Backward Compatibility**: Existing backend code continues to work with updated imports

## Migration Plan

1. **Phase 1**: Copy utilities to component package
   - Create `packages/component/src/common/` directory
   - Split helpers.ts into focused modules (duration.ts, threshold.ts, etc.)
   - Add comprehensive tests
   - Export from component package index

2. **Phase 2**: Update backend imports
   - Change imports from local helpers to @atakora/component
   - Verify all functionality works correctly
   - Remove local helpers.ts file

3. **Phase 3**: Documentation
   - Add API documentation for all utilities
   - Create usage examples
   - Update fluent API guides to reference component utilities

## Implementation Notes

The utilities should maintain their current API but be better organized:

```typescript
// packages/component/src/common/duration.ts
export interface Duration {
  readonly value: number;
  readonly unit: 'ms' | 's' | 'm' | 'h' | 'd';
  toMilliseconds(): number;
  toSeconds(): number;
  toMinutes(): number;
  toHours(): number;
  toDays(): number;
  toISOString(): string;
  toArmDuration(): string;
  toString(): string;
}

export function seconds(value: number): Duration;
export function minutes(value: number): Duration;
export function hours(value: number): Duration;
export function days(value: number): Duration;
```

This organization allows for:

- Tree-shaking of unused utilities
- Clear module boundaries
- Easy testing of individual utility groups
- Future expansion without affecting existing code

## References

- Fluent API design documents: `docs/design/architecture/fluent-api-*.md`
- Current implementation: `packages/backend/src/gen2/common/helpers.ts`
- Component package structure: `packages/component/src/`
