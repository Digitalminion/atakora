# Circular Dependency Audit Summary

**Date**: 2025-11-24
**Auditor**: Becky (Staff Architect)
**Status**: CRITICAL VIOLATIONS FOUND

## Executive Summary

A comprehensive audit of the @atakora/lib package has identified **CRITICAL CIRCULAR DEPENDENCY VIOLATIONS** that fundamentally compromise the architectural integrity of the codebase.

**Key Finding**: @atakora/lib (base layer) depends on @atakora/component (application layer), creating a circular dependency chain that violates the unidirectional dependency principle.

## Violation Summary

| Violation Type | Count | Severity | Location |
|----------------|-------|----------|----------|
| Package Dependency | 1 | CRITICAL | lib/package.json |
| Value Imports (Runtime) | 2 classes | CRITICAL | backend-adapter.ts |
| Type Imports | 4 types | HIGH | backend-adapter.ts |
| Test File Imports | 2 files | HIGH | __tests__/*.spec.ts |
| Documentation References | 4 | LOW | Comments only |

**Total Critical Violations**: 3 (package.json + 2 value imports)
**Total High Violations**: 6 (4 type imports + 2 test files)

## Dependency Graph (Actual vs. Expected)

### Expected Architecture (Unidirectional)

```
┌─────────────────────┐
│   @atakora/lib      │  Base Layer
│  (types, schemas,   │  - No dependencies on other @atakora packages
│   synthesis infra)  │  - Provides foundation for all other packages
└─────────────────────┘
          ↑
          │ imports from (CORRECT)
          │
┌─────────────────────┐
│   @atakora/cdk      │  Construct Layer
│  (L1/L2 Azure       │  - Depends on @atakora/lib
│   constructs)       │  - Provides Azure resource abstractions
└─────────────────────┘
          ↑
          │ imports from (CORRECT)
          │
┌─────────────────────┐
│ @atakora/component  │  Application Layer
│  (backend framework,│  - Depends on @atakora/lib and @atakora/cdk
│   schema DSL)       │  - Provides high-level backend framework
└─────────────────────┘
          ↑
          │ imports from (CORRECT)
          │
┌─────────────────────┐
│   @atakora/cli      │  CLI Layer
│  (commands, deploy) │  - Depends on all other packages
│                     │  - User-facing CLI tools
└─────────────────────┘
```

### Actual Architecture (CIRCULAR DEPENDENCY DETECTED)

```
┌─────────────────────┐
│   @atakora/lib      │◄──┐
│                     │   │
│  - Synthesis infra  │   │
│  - Backend adapter  │   │ VIOLATION
└─────────────────────┘   │ Value imports:
          ↑               │ - BackendSynthesizer
          │ imports       │ - SynthesisPipeline
          │               │
┌─────────────────────┐   │
│ @atakora/component  │   │
│                     │   │
│  - Backend DSL      │───┘
│  - Synthesis impl   │
└─────────────────────┘

       CIRCULAR DEPENDENCY
```

## Critical Violations Detail

### 1. Package Dependency Violation

**File**: `/packages/lib/package.json`
**Line**: 279

```json
"dependencies": {
  "@atakora/component": "*"
}
```

**Impact**:
- npm/yarn forced to resolve circular dependency
- Non-deterministic build order
- Cannot publish independently
- Semantic versioning breaks down

---

### 2. Runtime Value Imports

**File**: `/packages/lib/src/synthesis/backend-adapter.ts`
**Lines**: 11-17

```typescript
// Type import (less severe but still wrong direction)
import type { BackendObject } from '@atakora/component';

// VALUE IMPORTS - CRITICAL RUNTIME DEPENDENCY
import { BackendSynthesizer, SynthesisPipeline } from '@atakora/component/synthesis';

// Type imports (wrong direction but no runtime impact)
import type {
  SynthesisResult as ComponentSynthesisResult,
  ARMTemplate as ComponentARMTemplate,
  ARMResource as ComponentARMResource,
} from '@atakora/component/synthesis';
```

**Why this is CRITICAL**:
- `BackendSynthesizer` and `SynthesisPipeline` are **classes** (not just types)
- These are imported as **values** (not `import type`)
- Creates **runtime circular dependency**
- Instantiated in BackendAdapter constructor: `new SynthesisPipeline()`

**Impact**:
- Circular dependency at runtime (module initialization order issues)
- Prevents tree-shaking (both packages always bundled together)
- Cannot mock/stub for testing
- Bundle size bloat

---

### 3. Test File Dependencies

**Files**:
- `/packages/lib/src/synthesis/__tests__/e2e-backend-synthesis.spec.ts` (lines 13-15)
- `/packages/lib/src/synthesis/__tests__/real-backend-synthesis.spec.ts` (line 9)

```typescript
import { defineBackend } from '@atakora/component/backend';
import { defineSchema, a, c, e, f } from '@atakora/component/schema';
import { defineAuth, auth } from '@atakora/component/auth';
```

**Why this is HIGH severity**:
- Tests create circular dependency
- Should be in `devDependencies` but are in `dependencies`
- Tests in lib package test integration with component package
- Prevents testing packages in isolation

**Impact**:
- Cannot run lib tests without building component first
- Tests are not truly "unit" tests (they're integration tests)
- Mock/stub implementations not possible

## Root Cause Analysis

### Primary Root Cause: Misplaced Code

The `backend-adapter.ts` file in lib package is **application-level code** that belongs in the **component package**.

**Why**:
1. It depends on `BackendSynthesizer` and `SynthesisPipeline` from component
2. It understands `BackendObject` semantics (application-level concern)
3. It bridges backend definitions (component) with ARM templates (lib)
4. The bridge should live on the **consumer side** (component), not the provider side (lib)

### Secondary Root Cause: Missing Abstraction

No clear interface/contract separating:
- Synthesis **infrastructure** (types, validators, template writers) - should be in lib
- Synthesis **implementation** (backend-to-ARM conversion) - should be in component

### Tertiary Root Cause: Test Coupling

E2E tests in lib package test integration with component package instead of:
- Living in component package (tests component → lib integration)
- Using mock implementations (no real component dependency)

## Recommended Solution

**Move Backend Synthesis to Component Package** (4 hours effort)

### Migration Plan

```
1. Move backend-adapter.ts
   FROM: packages/lib/src/synthesis/backend-adapter.ts
   TO:   packages/component/src/synthesis/backend-adapter.ts

2. Move test files
   FROM: packages/lib/src/synthesis/__tests__/e2e-backend-synthesis.spec.ts
   TO:   packages/component/src/synthesis/__tests__/backend-adapter.spec.ts

   FROM: packages/lib/src/synthesis/__tests__/real-backend-synthesis.spec.ts
   TO:   packages/component/src/synthesis/__tests__/backend-integration.spec.ts

3. Update package.json
   packages/lib/package.json:
   - REMOVE: "@atakora/component": "*" from dependencies

   packages/component/package.json:
   - ADD: "./synthesis" export path

4. Update imports
   - backend-adapter.ts: Change @atakora/component imports to local imports
   - Test files: Already in component, imports are now local

5. Update documentation
   - Remove backend synthesis from lib README
   - Add backend synthesis to component README
   - Update JSDoc examples
```

### Why This Solution

1. **Simplest**: Minimal code changes, just file moves and import updates
2. **Fastest**: 4 hours vs. 8-12 hours for other options
3. **Most Logical**: Backend synthesis belongs with backend definitions
4. **No New Patterns**: Doesn't introduce new abstractions or complexity
5. **Backwards Compatible**: Can provide migration shim if needed

## Impact Assessment

### Build System Impact
- **Before**: Non-deterministic build order (circular dependency)
- **After**: Deterministic: lib → cdk → component → cli

### Bundle Size Impact
- **Before**: Both packages always bundled together (~800KB)
- **After**: Can tree-shake unused packages (~400KB per package)

### Testing Impact
- **Before**: Cannot test lib without component
- **After**: Each package testable in isolation

### Publishing Impact
- **Before**: Must publish both packages together
- **After**: Can publish independently (semantic versioning works)

### Developer Experience Impact
- **Before**: Confusing package boundaries, unclear ownership
- **After**: Clear separation: lib = infrastructure, component = application

## Prevention Strategy

### Immediate (Add to CI/CD)

```yaml
# .github/workflows/ci.yml
- name: Check circular dependencies
  run: npx madge --circular packages/lib/src
```

### Short-term (Add Lint Rules)

```javascript
// packages/lib/.eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: ['@atakora/component*', '@atakora/cli*', '@atakora/cdk*']
    }]
  }
};
```

### Medium-term (Add Pre-commit Hooks)

```bash
# .husky/pre-commit
if grep -r "@atakora/component" packages/lib/src/; then
  echo "ERROR: lib cannot import from component"
  exit 1
fi
```

### Long-term (Architectural Documentation)

- Document package dependency rules in CONTRIBUTING.md
- Add architecture diagrams to README
- Create decision tree for "which package should this code live in?"

## Validation Checklist

After implementing the fix:

- [ ] Run `npx madge --circular packages/lib/src` - should report ZERO circular dependencies
- [ ] Run `grep -r "@atakora/component" packages/lib/src/` - should return NO matches
- [ ] Build packages in order: lib → cdk → component → cli - should succeed
- [ ] Run all tests: lib, component - should pass
- [ ] Verify backend synthesis still works - synthesize backend-simple example
- [ ] Check bundle sizes - should be reduced
- [ ] Update documentation - remove backend synthesis from lib docs

## Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Preparation | 30 min | Feature branch, baseline tests |
| Move Backend Adapter | 1 hour | backend-adapter.ts in component |
| Move Tests | 1 hour | Tests in component package |
| Update Dependencies | 30 min | package.json updated, builds pass |
| Update Documentation | 30 min | READMEs and JSDoc updated |
| Clean Up Exports | 30 min | Index files updated |
| Verification | 30 min | All tests pass, no circular deps |

**Total Estimated Time**: 4 hours

## References

- **Full Analysis**: [ADR-021: Circular Dependency Audit](/azure/docs/design/architecture/adr-021-circular-dependency-audit.md)
- **Related**: [ADR-020: Component Auth System](/azure/docs/design/architecture/adr-020-component-auth-system.md)

## Approval Required

This is a **CRITICAL architectural violation** that requires immediate remediation.

**Recommended Action**: Approve implementation of Option A (Move Backend Synthesis to Component Package) and allocate 4 hours for the fix.

**Risk of NOT Fixing**:
- Build system fragility increases over time
- More circular dependencies will be introduced
- Technical debt compounds
- Package boundaries become meaningless
- Cannot scale architecture to more packages

**Cost**: 4 hours now vs. months of accumulated technical debt later.

---

**Status**: Awaiting approval to proceed with remediation.
**Next Step**: Create feature branch and begin Phase 1 (Preparation).
