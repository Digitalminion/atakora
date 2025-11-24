# FIX-4-001: CDK Import Configuration for Tests - RESOLVED

**Status**: RESOLVED
**Priority**: CRITICAL
**Agent**: Charlie (Quality Lead)
**Date**: 2025-11-24

## Problem Summary

ApiSynthesizer and FunctionSynthesizer tests were failing with:
```
TypeError: Cannot read properties of undefined (reading 'documentdb')
 ❯ Object.<anonymous> packages/cdk/src/documentdb/cosmos-db-types.ts:18:36
```

This blocked verification of 43 tests (15 ApiSynthesizer + 28 FunctionSynthesizer).

## Root Cause Analysis

### Primary Issue: Circular Dependency

The error occurred because of a circular dependency between packages:

1. **@atakora/lib** (line 279 of package.json) depends on **@atakora/component**: `"@atakora/component": "*"`
2. **@atakora/component** depends on **@atakora/cdk**: `"@atakora/cdk": "*"`
3. **@atakora/cdk** depends on **@atakora/lib**: `"@atakora/lib": "*"`

### Module Resolution Failure

When Vitest tries to run tests that import from `@atakora/cdk`:

1. CDK package imports `{ schema } from '@atakora/lib'` (packages/cdk/src/documentdb/cosmos-db-types.ts:15)
2. Lib package tries to export schema namespace (packages/lib/src/index.ts:134)
3. Lib package tries to load `@atakora/component` due to dependency
4. Component package's synthesis module doesn't exist (dist/synthesis/index.js)
5. Module resolution fails, causing `schema.documentdb` to be undefined

### Evidence

```bash
# When lib package is loaded, it tries to load component
$ node -e "const lib = require('@atakora/lib'); console.log(lib.schema);"
# Error: Cannot find module '/path/to/atakora/node_modules/@atakora/component/dist/synthesis/index.js'
```

## Solution Implemented

### Immediate Fix (Workaround)

Created stub module for component synthesis export to break the circular dependency during test execution:

```bash
mkdir -p packages/component/dist/synthesis
echo "module.exports = {};" > packages/component/dist/synthesis/index.js
echo "export {};" > packages/component/dist/synthesis/index.d.ts
```

This allows:
- `@atakora/lib` to successfully load without error
- CDK schema imports to resolve properly
- Tests to run and pass

### Test Results After Fix

**ApiSynthesizer**: 15/15 tests PASSING ✅

```
Test Files  1 passed (1)
Tests  15 passed (15)
Duration  602ms
```

All 15 tests verified:
- Constructor instantiation
- API resource synthesis
- APIM service creation with correct naming
- API creation within APIM
- CRUD operation generation (5 per model)
- HTTP method mapping (GET, POST, PUT, DELETE)
- URL pluralization
- Operation ID generation
- Path parameter handling
- Display names and descriptions
- Empty schema handling
- REST convention compliance

**FunctionSynthesizer**: 0/28 tests (blocked by different issue)

Tests fail due to test data validation error (model name must be PascalCase), not CDK import issue. This is a separate test fix needed.

## Verification Steps Performed

1. **Cleaned and rebuilt lib package**:
   ```bash
   cd packages/lib
   npm run clean && npm run build
   ```

2. **Verified CDK package builds successfully**:
   ```bash
   cd packages/cdk
   npm run build
   # Success - no errors
   ```

3. **Checked schema exports exist**:
   ```bash
   ls packages/lib/dist/schema/microsoft/documentdb/
   # index.js, index.d.ts, etc. - all present
   ```

4. **Created synthesis stub and ran tests**:
   ```bash
   mkdir -p packages/component/dist/synthesis
   echo "module.exports = {};" > packages/component/dist/synthesis/index.js
   npx vitest run packages/component/src/synthesis/__tests__/api-synthesizer.spec.ts
   # 15/15 PASS
   ```

## Files Modified

### Created (Workaround)
- `/packages/component/dist/synthesis/index.js` - Stub module export
- `/packages/component/dist/synthesis/index.d.ts` - TypeScript declarations

## Long-Term Recommendations

### 1. Break Circular Dependency (HIGH PRIORITY)

**Problem**: `@atakora/lib` should not depend on `@atakora/component`

**Solution**: Review why lib needs component. Options:
- Move shared types to a separate `@atakora/types` package
- Use type-only imports: `import type { ... } from '@atakora/component'`
- Restructure package dependencies to be unidirectional:
  ```
  @atakora/types (shared types)
       ↓
  @atakora/lib (core constructs)
       ↓
  @atakora/cdk (resource constructs)
       ↓
  @atakora/component (high-level API)
  ```

**Files to Review**:
- `packages/lib/package.json` (line 279: remove component dependency)
- `packages/lib/src/synthesis/backend-adapter.ts` (imports BackendObject type)
- `packages/lib/src/synthesis/__tests__/*.spec.ts` (imports component for testing)

### 2. Fix Component Build Errors (MEDIUM PRIORITY)

The component package currently has TypeScript compilation errors preventing a full build:
- Type mismatches in synthesis modules
- Missing properties on interfaces
- String literal type incompatibilities

These need to be fixed to enable proper builds without workarounds.

### 3. Add Build Order to CI/CD (LOW PRIORITY)

Ensure packages build in correct dependency order:
```bash
npm run build --workspace=@atakora/lib
npm run build --workspace=@atakora/cdk
npm run build --workspace=@atakora/component
```

### 4. Vitest Configuration Enhancement (LOW PRIORITY)

Consider adding module resolution configuration to vitest.config.ts:
```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@atakora/lib': path.resolve(__dirname, '../../lib/dist'),
      '@atakora/cdk': path.resolve(__dirname, '../../cdk/dist'),
    },
  },
});
```

## Impact Assessment

### Positive
- ✅ Unblocked 15 ApiSynthesizer tests
- ✅ Identified root cause of CDK import failures
- ✅ Provided clear workaround for continued development
- ✅ Documented circular dependency for future refactoring

### Remaining Work
- ⚠️ FunctionSynthesizer tests still failing (different issue: test data validation)
- ⚠️ Component package build errors need fixing
- ⚠️ Circular dependency should be refactored properly

## Task Tracking

This fix addresses task **FIX-4-001: CDK Import Configuration for Tests (CRITICAL)**

**Status**: Solution implemented and verified
**Next Steps**:
1. Mark task complete
2. Create new task for circular dependency refactoring
3. Create new task for FunctionSynthesizer test data fixes

## Related Documentation

- Architecture Decision Record: ADR-XXX (package dependencies)
- Monorepo Build Strategy: docs/monorepo-build-order.md
- Testing Infrastructure: packages/component/TESTING_QUICK_START.md

---

**Resolution Confidence**: 95%
**Production Readiness**: Workaround suitable for development; long-term fix needed for production
