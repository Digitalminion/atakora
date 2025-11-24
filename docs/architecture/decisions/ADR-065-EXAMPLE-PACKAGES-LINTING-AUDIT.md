# ADR-021: Example Packages Linting Audit Report

**Status**: Draft
**Date**: 2025-11-21
**Author**: Becky (Staff Architect)
**Related**: ADR-020 (Component Auth System)

## Executive Summary

A comprehensive linting audit of the two example packages (`/packages/backend/` and `/packages/backend-simple/`) reveals **29 TypeScript compilation errors** across both packages. All errors fall into four main categories:

1. **Missing Export**: `defineBackend` not exported from `@atakora/component` main entry point (2 errors)
2. **Missing Subpath Exports**: Functions, compute, events, storage, network, monitoring, performance modules not exported (11 errors)
3. **API Misalignment**: Example code uses APIs that don't exist in component package (6 errors)
4. **Type System Issues**: Authorization rule builders not compatible with expected types (10 errors)

### Critical Issues

- **BLOCKER**: Examples cannot compile, making them unusable for alpha release
- **BLOCKER**: `defineBackend` is implemented in `/backend/` submodule but not exported from main entry point
- **HIGH**: Authorization API has type incompatibility between builders and expected types
- **HIGH**: Multiple component submodules referenced but not exported in package.json

### Impact on Alpha Release

**Status**: NOT READY for alpha release. All compilation errors must be resolved before examples can be used.

## Detailed Error Analysis

### Package: `/packages/backend/` (29 errors)

#### Category 1: Missing Main Export (1 error)

**File**: `src/index.ts:66`

```typescript
// ERROR: Module '@atakora/component' has no exported member 'defineBackend'
import { defineBackend } from '@atakora/component';
```

**Root Cause**:

- `defineBackend` exists in `/packages/component/src/backend/index.ts`
- But NOT re-exported from `/packages/component/src/index.ts` main entry point
- Package.json only exports `./backend` subpath, not from main module

**Fix Required**: Add `defineBackend` to main exports in `/packages/component/src/index.ts`

#### Category 2: Missing Subpath Exports (11 errors)

All files attempting to import from non-existent subpaths:

| File                                                | Import Statement                 | Error              |
| --------------------------------------------------- | -------------------------------- | ------------------ |
| `src/compute/resource.ts:7`                         | `@atakora/component/compute`     | Cannot find module |
| `src/event/resource.ts:30`                          | `@atakora/component/events`      | Cannot find module |
| `src/function/audit-logger/resource.ts:8`           | `@atakora/component/functions`   | Cannot find module |
| `src/function/data-quality-processor/resource.ts:8` | `@atakora/component/functions`   | Cannot find module |
| `src/function/email-processor/resource.ts:8`        | `@atakora/component/functions`   | Cannot find module |
| `src/function/examples/advanced-configuration.ts:8` | `@atakora/component/functions`   | Cannot find module |
| `src/function/examples/analysis-functions.ts:8`     | `@atakora/component/functions`   | Cannot find module |
| `src/function/examples/auth-functions.ts:8`         | `@atakora/component/functions`   | Cannot find module |
| `src/function/generate-report/resource.ts:14`       | `@atakora/component/functions`   | Cannot find module |
| `src/function/notification-processor/resource.ts:7` | `@atakora/component/functions`   | Cannot find module |
| `src/function/order-processor/resource.ts:8`        | `@atakora/component/functions`   | Cannot find module |
| `src/function/process-upload/resource.ts:18`        | `@atakora/component/functions`   | Cannot find module |
| `src/function/resource.ts:28`                       | `@atakora/component/functions`   | Cannot find module |
| `src/function/send-notification/resource.ts:14`     | `@atakora/component/functions`   | Cannot find module |
| `src/function/validate-dataset/resource.ts:14`      | `@atakora/component/functions`   | Cannot find module |
| `src/log/resource.ts:7`                             | `@atakora/component/monitoring`  | Cannot find module |
| `src/network/resource.ts:7`                         | `@atakora/component/network`     | Cannot find module |
| `src/performance/resource.ts:7`                     | `@atakora/component/performance` | Cannot find module |
| `src/storage/resource.ts:10`                        | `@atakora/component/storage`     | Cannot find module |

**Root Cause**:

- Component package.json only exports these subpaths:
  - `./common`
  - `./schema`
  - `./validation`
  - `./auth`
- Missing exports for: `./functions`, `./compute`, `./events`, `./storage`, `./network`, `./monitoring`, `./performance`

**Status**:

- `./functions` - Module EXISTS in `/packages/component/src/functions/` but NOT exported
- Other modules - DO NOT EXIST yet (planned for future phases)

**Fix Required**:

1. Add `./functions` to package.json exports (ready now)
2. Create placeholder modules or update examples to not use non-existent modules

#### Category 3: API Misalignment (6 errors)

**3.1 Auth Provider API Mismatches (3 errors)**

**File**: `src/auth/resource.ts:15`

```typescript
// ERROR: Property 'allowTenants' does not exist on type 'EntraIdBuilder'
auth.entra().tenant(process.env.AZURE_TENANT_ID!).allowTenants(process.env.AZURE_TENANT_ID!); // <-- Does not exist
```

**Actual API**: `EntraIdBuilder` has these methods:

- `tenant(tenantId: string)`
- `clientId(clientId: string)`
- `audience(audience: string)`
- `issuer(issuer: string)`
- `validateTokens(validator: TokenValidator)`
- `mapRoles(mapper: RoleMapper)`
- `session(config: SessionConfig)`
- `mfa(config: MfaConfig)`

**Missing**: `allowTenants()` method does not exist

**File**: `src/auth/resource.ts:52`

```typescript
// ERROR: Argument of type 'number' is not assignable to parameter of type 'Duration'
.rotateEvery(90) // days
```

**Expected API**: `rotateEvery(duration: Duration)`

**Fix Required**: Use duration helper

```typescript
import { days } from '@atakora/component/common';
.rotateEvery(days(90))
```

**File**: `src/auth/resource.ts:53`

```typescript
// ERROR: Property 'requireHttps' does not exist on type 'ApiKeysBuilder'
.requireHttps()
```

**Actual API**: `ApiKeysBuilder` has these methods:

- `enable()`
- `rotateEvery(duration: Duration)`
- Private methods for hashing/validation

**Missing**: `requireHttps()` method does not exist

**3.2 Function API Mismatches (2 errors)**

**File**: `src/function/order-processor/resource.ts:55-56`

```typescript
// ERROR: Cannot find name 'minutes' / 'seconds'
.withTimeout(minutes(5))
.withRetry(3, seconds(30))
```

**Root Cause**: Missing import statement

**Fix Required**: Add import

```typescript
import { minutes, seconds } from '@atakora/component/common';
```

**3.3 Undefined Helper Reference (1 error)**

**File**: `src/function/resource.ts:99`

```typescript
// ERROR: Cannot find name 'format'. Did you mean 'FormData'?
format(...)
```

**Root Cause**: Unknown context - need to examine full file to understand intent

#### Category 4: Type System Issues (10 errors)

**4.1 Authorization Rule Builder Type Incompatibility (7 errors)**

**File**: `src/schema/resource.ts:44, 64, 86` (3 instances in backend)
**File**: `src/schema/resource.ts:42` (1 instance in backend-simple)

```typescript
// ERROR: Type 'OwnerRuleBuilder' is not assignable to type 'AuthorizationRule'
.authorization(allow => [
  allow.owner('id'),  // Returns OwnerRuleBuilder, not AuthorizationRule
  allow.groups(['admin']).all(),
])
```

**Type Analysis**:

Expected type:

```typescript
type AuthorizationRule =
  | { type: 'owner'; field: string; operations?: Operation[] }
  | { type: 'groups'; groups: string[]; operations?: Operation[] }
  | { type: 'authenticated'; operations?: Operation[] }
  | { type: 'public'; operations?: Operation[] };
```

Actual return types:

- `allow.owner(field)` → Returns `OwnerRuleBuilder` (not `AuthorizationRule`)
- `allow.groups(groups)` → Returns `GroupsRuleBuilder` (not `AuthorizationRule`)

**Root Cause**: The authorization builder methods return intermediate builders that require method chaining (`.all()`, `.read()`, etc.) to produce final `AuthorizationRule` objects.

**Current Implementation** (`/packages/component/src/schema/authorization.ts`):

```typescript
class OwnerRuleBuilder {
  all(): AuthorizationRule { ... }
  create(): AuthorizationRule { ... }
  read(): AuthorizationRule { ... }
  update(fields?: string[]): AuthorizationRule { ... }
  delete(): AuthorizationRule { ... }
}
```

**Workaround in CrudModelBuilder**:

```typescript
// From crud-model.ts lines 90-96
authorization(rules: AuthorizationRulesFn): this {
  const builder = new AuthorizationBuilder();
  const rawRules = rules(builder);

  // Process rules - convert any rule builders to rules
  this._config.authorization = rawRules.map(rule => {
    // If it's a rule builder (has _build method), convert it
    if (rule && typeof rule === 'object' && '_build' in rule) {
      return (rule as any)._build();
    }
    return rule;
  });
  return this;
}
```

**Problem**: The workaround checks for `_build()` method, but `OwnerRuleBuilder` and `GroupsRuleBuilder` don't have this method.

**Fix Required**: Two options:

1. **Add `_build()` method** to all rule builders that returns default rule
2. **Change return type** of `owner()` and `groups()` to return union type that includes both builder and rule
3. **Require explicit method call** - document that `.all()` or specific operation must always be called

**4.2 Authorization Read Method Missing (1 error)**

**File**: `src/schema/resource.ts:110`

```typescript
// ERROR: Property 'read' does not exist on type 'AuthorizationRule'
allow.groups(['admin', 'analyst']).read();
```

**Root Cause**: Same as above - `groups()` returns `GroupsRuleBuilder` which has `.read()`, but TypeScript sees it as `AuthorizationRule` which doesn't.

**4.3 Custom Authorization Method Missing (3 errors)**

**File**: `src/schema/resource.ts:66` (backend-simple)

```typescript
// ERROR: Property 'custom' does not exist on type 'AuthorizationBuilder'
allow
  .custom((user, project) => {
    return user.organizationId === project.organizationId;
  })
  .read();
```

**Root Cause**: `AuthorizationBuilder` does not have a `custom()` method

**Actual API**:

```typescript
class AuthorizationBuilder {
  owner(field: string, operations?: Operation[]): OwnerRuleBuilder;
  groups(groups: string[]): GroupsRuleBuilder;
  authenticated(operations?: Operation[]): AuthorizationRule;
  public(operations?: Operation[]): AuthorizationRule;
}
```

**Missing**: `custom()` method for custom authorization logic

**Fix Required**: Either:

1. Remove `.custom()` example as not implemented
2. Implement `.custom()` method in AuthorizationBuilder

**4.4 Implicit Any Type (2 errors)**

**File**: `src/schema/resource.ts:66` (backend-simple)

```typescript
// ERROR: Parameter 'user' implicitly has an 'any' type
// ERROR: Parameter 'project' implicitly has an 'any' type
allow.custom((user, project) => {
  return user.organizationId === project.organizationId;
});
```

**Root Cause**: TypeScript cannot infer parameter types for custom function

**Fix Required**: Add type annotations or remove example if `.custom()` not implemented

### Package: `/packages/backend-simple/` (6 errors)

#### Errors in backend-simple

All errors in backend-simple are subsets of the backend errors:

1. **Missing Export** (1 error): Same `defineBackend` issue
2. **Type Incompatibility** (3 errors): Same authorization builder issues
3. **Missing Custom Method** (1 error): Same `.custom()` not implemented
4. **Implicit Any** (2 errors): Same type annotation issues in custom function

No unique errors - all are also present in `/packages/backend/`

## Root Cause Summary

### Architecture Mismatch

The examples were written assuming a complete API surface that doesn't exist yet:

1. **Phase Mismatch**: Examples use Phase 5+ features (functions, compute, storage) but component package is only at Phase 3 (auth)
2. **Export Configuration**: Implemented features not properly exported in package.json
3. **API Evolution**: Examples written before APIs were implemented, now outdated

### Type System Design Issue

The authorization API has a fundamental type system design problem:

**Pattern**: Builder methods return intermediate builders for fluent API

```typescript
allow
  .owner('id') // Returns OwnerRuleBuilder
  .read(); // Returns AuthorizationRule
```

**Problem**: TypeScript type system expects array of `AuthorizationRule[]` but receives array of `OwnerRuleBuilder | GroupsRuleBuilder | AuthorizationRule`

**Current Workaround**: Runtime checking for `_build()` method, but builders don't implement it

**Better Solutions**:

1. Make all builders implement common interface with `_build()` or `toRule()`
2. Use union types: `type AuthorizationInput = AuthorizationRule | OwnerRuleBuilder | GroupsRuleBuilder`
3. Add post-processing in authorization() method to handle builders intelligently

## Recommended Fixes

### Priority 1: CRITICAL (Blocks Alpha Release)

#### Fix 1.1: Export defineBackend from Main Entry Point

**File**: `/packages/component/src/index.ts`

**Add**:

```typescript
// ============================================================================
// BACKEND ASSEMBLY API
// Phase 4: Backend definition and assembly
// ============================================================================

export * from './backend';
```

**Impact**: Resolves 2 errors (1 per package)

#### Fix 1.2: Export Functions Subpath

**File**: `/packages/component/package.json`

**Add to exports**:

```json
"./functions": {
  "types": "./dist/functions/index.d.ts",
  "import": "./dist/functions/index.js",
  "require": "./dist/functions/index.js"
}
```

**Add to typesVersions**:

```json
"functions": ["./dist/functions/index.d.ts"]
```

**Impact**: Resolves function import errors (15 errors reduced to 0)

#### Fix 1.3: Fix Authorization Type System

**Option A**: Add \_build() method to all builders (RECOMMENDED)

**File**: `/packages/component/src/schema/authorization.ts`

```typescript
class OwnerRuleBuilder {
  private field: string;
  private ops?: Operation[];

  constructor(field: string, operations?: Operation[]) {
    this.field = field;
    this.ops = operations;
  }

  // Add this method for default behavior
  _build(): AuthorizationRule {
    return this.all(); // Default to all operations
  }

  all(): AuthorizationRule { ... }
  create(): AuthorizationRule { ... }
  read(): AuthorizationRule { ... }
  // ... other methods
}

class GroupsRuleBuilder {
  private groups: string[];
  private ops?: Operation[];

  constructor(groups: string[]) {
    this.groups = groups;
  }

  // Add this method for default behavior
  _build(): AuthorizationRule {
    return this.all(); // Default to all operations
  }

  all(): AuthorizationRule { ... }
  create(): AuthorizationRule { ... }
  read(): AuthorizationRule { ... }
  // ... other methods
}
```

**Impact**: Resolves 7 authorization type errors, aligns with existing workaround

**Option B**: Change return type of authorization function

```typescript
export type AuthorizationRulesFn = (
  builder: AuthorizationBuilder
) => (AuthorizationRule | OwnerRuleBuilder | GroupsRuleBuilder)[];
```

**Impact**: More complex, requires type guards everywhere

### Priority 2: HIGH (API Alignment)

#### Fix 2.1: Remove Non-Existent API Calls from Examples

**Files to update**:

- `/packages/backend/src/auth/resource.ts`

**Remove**:

```typescript
.allowTenants(process.env.AZURE_TENANT_ID!)  // Line 15 - doesn't exist
.requireHttps()                              // Line 53 - doesn't exist
```

**Replace**:

```typescript
// Line 52 - use Duration type
import { days } from '@atakora/component/common';
.rotateEvery(days(90))
```

#### Fix 2.2: Add Missing Imports

**Files to update**:

- `/packages/backend/src/function/order-processor/resource.ts`

**Add import**:

```typescript
import { minutes, seconds } from '@atakora/component/common';
```

#### Fix 2.3: Remove Custom Authorization from Examples

**Files to update**:

- `/packages/backend-simple/src/schema/resource.ts`

**Remove lines 66-68**:

```typescript
allow.custom((user, project) => {
  return user.organizationId === project.organizationId;
}).read(),
```

**Replace with**:

```typescript
// Custom authorization not yet implemented
// Users in same organization: future feature
```

**Alternative**: Implement `.custom()` method (requires ADR for design)

#### Fix 2.4: Investigate 'format' Reference

**File**: `/packages/backend/src/function/resource.ts:99`

Need to examine full file to understand what `format` should be - likely a typo or missing import.

### Priority 3: MEDIUM (Future Phases)

#### Fix 3.1: Create Placeholder Modules or Update Examples

**Missing modules**:

- `@atakora/component/compute`
- `@atakora/component/events`
- `@atakora/component/storage`
- `@atakora/component/network`
- `@atakora/component/monitoring`
- `@atakora/component/performance`

**Options**:

1. **Create stub modules** with TypeScript definitions but no implementation
2. **Remove references** from examples until modules are implemented
3. **Add comments** indicating these are future features

**Recommendation**: Create stub modules with clear "NOT IMPLEMENTED" errors to preserve example structure

## Alternatives Considered

### Alternative 1: Fix Examples Only

**Approach**: Update examples to only use implemented APIs, remove all non-existent features

**Pros**:

- Quickest path to working examples
- No component package changes needed

**Cons**:

- Examples become minimal, lose educational value
- Doesn't demonstrate progressive enhancement
- Hides the vision of what the framework will become

**Decision**: REJECTED - Examples should show the vision, even if some features are stubbed

### Alternative 2: Implement All Missing Features

**Approach**: Complete all Phase 4+ features before releasing examples

**Pros**:

- Examples work perfectly
- Full feature set available

**Cons**:

- Delays alpha release by months
- Violates progressive delivery principle

**Decision**: REJECTED - Ship working examples with clear feature roadmap

### Alternative 3: Separate Example Packages

**Approach**: Create separate example packages for each phase

- `backend-simple-phase1`: Schema only
- `backend-simple-phase2`: Schema + Auth
- `backend-simple-phase3`: Schema + Auth + Functions
- etc.

**Pros**:

- Each example is fully functional
- Clear progression of capabilities
- No confusion about what's implemented

**Cons**:

- More maintenance overhead
- Fragmented documentation
- Users may not understand which to use

**Decision**: CONSIDERED for future - For alpha, fix current examples

## Consequences

### Positive Consequences

1. **Working Examples**: After fixes, examples will compile and run
2. **Clear API Surface**: Proper exports make it obvious what's available
3. **Type Safety**: Authorization type fix improves developer experience
4. **Documentation Value**: Fixed examples serve as accurate reference

### Negative Consequences

1. **Reduced Feature Set**: Examples won't demonstrate full vision until future phases
2. **Migration Required**: Users following current examples will need to update code
3. **Technical Debt**: Stub modules will need implementation later

### Neutral Consequences

1. **API Evolution**: Examples will continue to evolve as features are added
2. **Documentation Updates**: All docs referencing examples must be updated

## Success Criteria

### Must Have (Blocks Alpha)

- [ ] Both example packages compile without errors (`npm run build` succeeds)
- [ ] `defineBackend` exported from `@atakora/component` main entry
- [ ] `./functions` subpath exported and working
- [ ] Authorization type system fixed (all 10 type errors resolved)

### Should Have (Alpha Quality)

- [ ] All non-existent API calls removed or stubbed
- [ ] Missing imports added
- [ ] Clear comments indicating future features
- [ ] Examples run end-to-end (at least to ARM template generation)

### Nice to Have (Future)

- [ ] Stub modules for compute, storage, network, monitoring, performance
- [ ] Custom authorization implemented
- [ ] allowTenants() and requireHttps() implemented in auth builders
- [ ] Comprehensive error messages for unimplemented features

## Implementation Checklist

### Immediate Actions (Before Alpha Release)

1. [ ] **Component Package Updates**
   - [ ] Add `export * from './backend'` to `/packages/component/src/index.ts`
   - [ ] Add `./functions` to package.json exports
   - [ ] Add `_build()` method to `OwnerRuleBuilder`
   - [ ] Add `_build()` method to `GroupsRuleBuilder`

2. [ ] **Backend Package Fixes**
   - [ ] Remove `.allowTenants()` call (line 15)
   - [ ] Fix `.rotateEvery()` to use `days()` helper (line 52)
   - [ ] Remove `.requireHttps()` call (line 53)
   - [ ] Add imports for `minutes`, `seconds` in order-processor
   - [ ] Investigate and fix `format` reference (line 99)

3. [ ] **Backend-Simple Package Fixes**
   - [ ] Remove or comment out `.custom()` authorization (lines 66-68)
   - [ ] Add type annotations if custom auth is kept

4. [ ] **Verification**
   - [ ] Run `npm run build` in `/packages/backend/`
   - [ ] Run `npm run build` in `/packages/backend-simple/`
   - [ ] Verify 0 TypeScript errors
   - [ ] Test ARM template generation

### Follow-Up Actions (Post-Alpha)

1. [ ] Create stub modules for missing subpaths
2. [ ] Implement `.custom()` authorization (requires ADR)
3. [ ] Implement `.allowTenants()` in EntraIdBuilder (if needed)
4. [ ] Implement `.requireHttps()` in ApiKeysBuilder (if needed)
5. [ ] Add comprehensive integration tests for examples

## File Locations

All error locations are documented above with file paths and line numbers. Key files:

### Component Package

- `/packages/component/src/index.ts` - Main entry point exports
- `/packages/component/package.json` - Subpath exports configuration
- `/packages/component/src/schema/authorization.ts` - Authorization builders
- `/packages/component/src/backend/index.ts` - Backend assembly exports
- `/packages/component/src/functions/index.ts` - Function customization exports

### Backend Package

- `/packages/backend/src/index.ts:66` - defineBackend import
- `/packages/backend/src/auth/resource.ts:15,52,53` - Auth API issues
- `/packages/backend/src/schema/resource.ts:44,64,86,110` - Authorization type issues
- `/packages/backend/src/function/order-processor/resource.ts:55-56` - Missing imports
- `/packages/backend/src/function/resource.ts:99` - Unknown format reference

### Backend-Simple Package

- `/packages/backend-simple/src/index.ts:10` - defineBackend import
- `/packages/backend-simple/src/schema/resource.ts:42,66,139` - Authorization issues

## Appendix: Full Error Log

### Backend Package Build Output

```
src/auth/resource.ts(15,6): error TS2339: Property 'allowTenants' does not exist on type 'EntraIdBuilder'.
src/auth/resource.ts(52,18): error TS2345: Argument of type 'number' is not assignable to parameter of type 'Duration'.
src/auth/resource.ts(53,6): error TS2339: Property 'requireHttps' does not exist on type 'ApiKeysBuilder'.
src/compute/resource.ts(7,40): error TS2307: Cannot find module '@atakora/component/compute' or its corresponding type declarations.
src/event/resource.ts(30,8): error TS2307: Cannot find module '@atakora/component/events' or its corresponding type declarations.
src/function/audit-logger/resource.ts(8,32): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/function/data-quality-processor/resource.ts(8,32): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/function/email-processor/resource.ts(8,32): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/function/examples/advanced-configuration.ts(8,32): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/function/examples/analysis-functions.ts(8,32): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/function/examples/auth-functions.ts(8,32): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/function/generate-report/resource.ts(14,32): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/function/notification-processor/resource.ts(7,45): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/function/order-processor/resource.ts(8,45): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/function/order-processor/resource.ts(55,16): error TS2304: Cannot find name 'minutes'.
src/function/order-processor/resource.ts(56,17): error TS2304: Cannot find name 'seconds'.
src/function/process-upload/resource.ts(18,32): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/function/resource.ts(28,8): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/function/resource.ts(99,29): error TS2552: Cannot find name 'format'. Did you mean 'FormData'?
src/function/send-notification/resource.ts(14,32): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/function/validate-dataset/resource.ts(14,32): error TS2307: Cannot find module '@atakora/component/functions' or its corresponding type declarations.
src/index.ts(66,10): error TS2305: Module '"@atakora/component"' has no exported member 'defineBackend'.
src/log/resource.ts(7,50): error TS2307: Cannot find module '@atakora/component/monitoring' or its corresponding type declarations.
src/network/resource.ts(7,40): error TS2307: Cannot find module '@atakora/component/network' or its corresponding type declarations.
src/performance/resource.ts(7,41): error TS2307: Cannot find module '@atakora/component/performance' or its corresponding type declarations.
src/schema/resource.ts(44,9): error TS2322: Type 'OwnerRuleBuilder' is not assignable to type 'AuthorizationRule'.
src/schema/resource.ts(64,9): error TS2322: Type 'OwnerRuleBuilder' is not assignable to type 'AuthorizationRule'.
src/schema/resource.ts(86,9): error TS2322: Type 'OwnerRuleBuilder' is not assignable to type 'AuthorizationRule'.
src/schema/resource.ts(110,40): error TS2339: Property 'read' does not exist on type 'AuthorizationRule'.
src/storage/resource.ts(10,40): error TS2307: Cannot find module '@atakora/component/storage' or its corresponding type declarations.
```

### Backend-Simple Package Build Output

```
src/index.ts(10,10): error TS2305: Module '"@atakora/component"' has no exported member 'defineBackend'.
src/schema/resource.ts(42,9): error TS2322: Type 'OwnerRuleBuilder' is not assignable to type 'AuthorizationRule'.
src/schema/resource.ts(66,15): error TS2339: Property 'custom' does not exist on type 'AuthorizationBuilder'.
src/schema/resource.ts(66,23): error TS7006: Parameter 'user' implicitly has an 'any' type.
src/schema/resource.ts(66,29): error TS7006: Parameter 'project' implicitly has an 'any' type.
src/schema/resource.ts(139,9): error TS2322: Type 'GroupsRuleBuilder' is not assignable to type 'AuthorizationRule'.
```

## Revision History

- 2025-11-21: Initial audit report created
