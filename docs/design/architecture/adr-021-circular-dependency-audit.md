# ADR-021: Circular Dependency Audit and Remediation Plan

**Status**: CRITICAL VIOLATION FOUND
**Date**: 2025-11-24
**Author**: Becky (Staff Architect)
**Severity**: CRITICAL

## Executive Summary

A comprehensive audit of the @atakora/lib package has uncovered **CRITICAL CIRCULAR DEPENDENCY VIOLATIONS** that fundamentally break the architectural layering principle. The lib package (base layer) depends on @atakora/component (application layer), creating a circular dependency that prevents proper package isolation and threatens long-term maintainability.

**Finding**: @atakora/lib imports from @atakora/component in 3 locations, with 1 value import and 5 type imports. Additionally, lib declares component as a dependency in package.json.

## Architectural Principle (VIOLATED)

The intended dependency flow is **strictly unidirectional**:

```
@atakora/lib (base layer - types, schemas, synthesis infrastructure)
  ^
  | SHOULD import from
  |
@atakora/cdk (construct layer - L1/L2 Azure constructs)
  ^
  | SHOULD import from
  |
@atakora/component (application layer - backend framework)
  ^
  | SHOULD import from
  |
@atakora/cli (CLI layer - commands, deployment tools)
```

**What we found**:

```
@atakora/lib
  |
  | VIOLATES: imports from
  v
@atakora/component
  |
  | CORRECT: imports from
  v
@atakora/lib

= CIRCULAR DEPENDENCY DETECTED
```

## Detailed Findings

### 1. Package.json Dependency Violation

**FILE**: `/packages/lib/package.json`
**LINE**: 279
**VIOLATION**:
```json
"dependencies": {
  "@atakora/component": "*",
  ...
}
```

**TYPE**: Package dependency
**SEVERITY**: CRITICAL
**IMPACT**: Forces circular dependency at package resolution level. npm/yarn may fail to resolve dependencies correctly, and the build order becomes non-deterministic.

---

### 2. Value Import Violation (Runtime Dependency)

**FILE**: `/packages/lib/src/synthesis/backend-adapter.ts`
**LINES**: 11-17
**VIOLATION**:
```typescript
import type { BackendObject } from '@atakora/component';
import { BackendSynthesizer, SynthesisPipeline } from '@atakora/component/synthesis';
import type {
  SynthesisResult as ComponentSynthesisResult,
  ARMTemplate as ComponentARMTemplate,
  ARMResource as ComponentARMResource,
} from '@atakora/component/synthesis';
```

**TYPE**: Value import (BackendSynthesizer, SynthesisPipeline are classes)
**SEVERITY**: CRITICAL
**ROOT CAUSE**: Backend synthesis was added to lib package but requires component package's BackendSynthesizer and SynthesisPipeline classes at runtime.
**IMPACT**: Runtime circular dependency. Prevents tree-shaking, increases bundle size, creates initialization order issues.

---

### 3. Test File Violations

**FILE**: `/packages/lib/src/synthesis/__tests__/e2e-backend-synthesis.spec.ts`
**LINES**: 13-15
**VIOLATION**:
```typescript
import { defineBackend } from '@atakora/component/backend';
import { defineSchema, a, c, e, f } from '@atakora/component/schema';
import { defineAuth, auth } from '@atakora/component/auth';
```

**TYPE**: Value imports for test fixtures
**SEVERITY**: HIGH
**ROOT CAUSE**: E2E tests in lib package test integration with component package.
**IMPACT**: Tests create circular dependency. While acceptable for devDependencies, this is in dependencies.

---

**FILE**: `/packages/lib/src/synthesis/__tests__/real-backend-synthesis.spec.ts`
**LINE**: 9
**VIOLATION**:
```typescript
import { defineBackend, defineSchema, defineAuth, a, c, auth } from '@atakora/component';
```

**TYPE**: Value imports for test fixtures
**SEVERITY**: HIGH
**ROOT CAUSE**: Tests synthesize real backend definitions from component package.
**IMPACT**: Same as above - tests depend on component package.

---

### 4. Documentation References (Non-Violations)

**FILE**: `/packages/lib/src/resources/index.ts`
**LINE**: 14
**CONTENT**:
```typescript
 * import { VirtualNetworks } from '@atakora/cdk/network';
```

**TYPE**: Comment/documentation example
**SEVERITY**: LOW
**IMPACT**: None - this is in a JSDoc comment, not an actual import.

---

**FILE**: `/packages/lib/src/core/management-group-stack.ts`
**LINES**: 67-68
**CONTENT**:
```typescript
 * import { App, ManagementGroupStack } from '@atakora/cdk';
 * import { PolicyAssignment, WellKnownPolicyIds } from '@atakora/cdk/policy';
```

**TYPE**: Comment/documentation example
**SEVERITY**: LOW
**IMPACT**: None - JSDoc examples showing how to use cdk package (correct direction).

---

**FILE**: `/packages/lib/src/synthesis/synthesizer.ts`
**LINE**: 239
**CONTENT**:
```typescript
   * import { defineBackend, defineSchema, a, c } from '@atakora/component';
```

**TYPE**: Comment/documentation example
**SEVERITY**: LOW
**IMPACT**: None - JSDoc example, but documents the violation pattern.

---

**FILE**: `/packages/lib/src/synthesis/backend-adapter.ts`
**LINE**: 59
**CONTENT**:
```typescript
 * import { defineBackend, defineSchema, a, c } from '@atakora/component';
```

**TYPE**: Comment/documentation example
**SEVERITY**: LOW
**IMPACT**: None - JSDoc example, but documents the violation pattern.

---

## Actual Dependency Graph (Current State)

```
@atakora/lib
├─ CORRECT: No imports from @atakora/cdk ✓
├─ CORRECT: No imports from @atakora/cli ✓
└─ VIOLATION: Imports from @atakora/component ✗
   ├─ backend-adapter.ts (VALUE IMPORTS - runtime dependency)
   └─ __tests__/*.spec.ts (test dependencies)

@atakora/component
├─ CORRECT: Imports from @atakora/lib ✓
├─ CORRECT: Imports from @atakora/cdk ✓
└─ NO violations ✓

@atakora/cdk
├─ CORRECT: Imports from @atakora/lib ✓
└─ NO violations ✓

@atakora/cli
├─ Uses @atakora/lib as devDependency ✓
├─ Uses @atakora/cdk as devDependency ✓
└─ NO violations ✓
```

**Circular dependency path**:
```
@atakora/lib
  → imports BackendSynthesizer from @atakora/component
  → which imports types from @atakora/lib
  → CIRCULAR DEPENDENCY
```

## Root Cause Analysis

### Why Does This Violation Exist?

1. **Backend Synthesis Bridge Pattern Gone Wrong**
   - The `backend-adapter.ts` file attempts to bridge component package's backend synthesis with lib package's ARM template synthesis
   - This creates an "adapter pattern" that requires runtime access to component package classes
   - The adapter lives in the WRONG package - it should be in component, not lib

2. **Misunderstanding of Package Boundaries**
   - The synthesis code was added to lib package under the assumption that synthesis is "infrastructure"
   - However, **BackendSynthesizer** is application-level code that understands backend semantics
   - Lib should provide synthesis **infrastructure** (types, validators, template writers)
   - Component should provide synthesis **implementation** (backend-to-ARM conversion)

3. **Test Coupling**
   - E2E tests in lib package test the integration with component package
   - These tests create fixtures using component package APIs
   - Tests should either:
     - Live in component package (tests component → lib integration)
     - Use mock/stub implementations (no real component dependency)

4. **Missing Abstraction Layer**
   - There's no clear interface/contract between lib synthesis infrastructure and component synthesis implementation
   - This leads to tight coupling and bidirectional imports

## What Functionality is @atakora/lib Trying to Use?

From the violations, lib package is trying to use:

1. **BackendSynthesizer** (class) - Analyzes backend definitions and generates ARM resources
2. **SynthesisPipeline** (class) - Orchestrates backend synthesis steps
3. **BackendObject** (type) - Type definition for backend configuration
4. **SynthesisResult, ARMTemplate, ARMResource** (types) - Output types from synthesis
5. **defineBackend, defineSchema, defineAuth** (functions) - For test fixtures only

## Consequences of This Violation

### Technical Consequences

1. **Build System Issues**
   - Non-deterministic build order (which package builds first?)
   - TypeScript composite projects may fail to resolve references correctly
   - Potential for infinite build loops

2. **Runtime Issues**
   - Module initialization order problems
   - Increased bundle size (both packages include each other)
   - Tree-shaking failures (circular deps prevent dead code elimination)

3. **Testing Problems**
   - Cannot test packages in isolation
   - Test fixtures create artificial coupling
   - Mocking becomes extremely difficult

4. **Publishing Issues**
   - npm/yarn may warn about circular dependencies
   - Semantic versioning breaks down (bump one, must bump both)
   - Consumers may encounter resolution conflicts

### Maintainability Consequences

1. **Cannot Reason About Packages Independently**
   - Changes in component can break lib
   - Changes in lib can break component
   - Refactoring requires coordinating both packages

2. **Onboarding Confusion**
   - New developers cannot understand package boundaries
   - Documentation becomes contradictory
   - "Which package should this code live in?" becomes unanswerable

3. **Feature Development Blocked**
   - Cannot add features to one package without considering the other
   - Risk of creating more circular dependencies increases over time

## Remediation Plan

### Option A: Move Backend Synthesis to Component Package (RECOMMENDED)

**Rationale**: Backend synthesis is application-level concern, not infrastructure.

**Changes Required**:

1. **Move backend-adapter.ts FROM lib TO component**
   ```
   FROM: packages/lib/src/synthesis/backend-adapter.ts
   TO:   packages/component/src/synthesis/backend-adapter.ts
   ```

2. **Extract synthesis infrastructure types to lib**
   ```typescript
   // packages/lib/src/synthesis/types.ts
   export interface SynthesisAdapter<TInput, TOutput> {
     synthesize(input: TInput, options?: SynthesisOptions): Promise<TOutput>;
   }

   export interface SynthesisOptions {
     outdir: string;
     skipValidation?: boolean;
     prettyPrint?: boolean;
     strict?: boolean;
   }

   export interface CloudAssemblyV2 {
     version: string;
     stacks: Record<string, StackManifestV2>;
     directory: string;
   }
   ```

3. **Component implements the adapter**
   ```typescript
   // packages/component/src/synthesis/backend-adapter.ts
   import { SynthesisAdapter, CloudAssemblyV2, SynthesisOptions } from '@atakora/lib/synthesis';
   import { BackendObject } from '../backend';

   export class BackendAdapter implements SynthesisAdapter<BackendObject, CloudAssemblyV2> {
     async synthesize(backend: BackendObject, options?: SynthesisOptions): Promise<CloudAssemblyV2> {
       // Implementation uses component-level classes
     }
   }
   ```

4. **Move tests to component package**
   ```
   FROM: packages/lib/src/synthesis/__tests__/e2e-backend-synthesis.spec.ts
   TO:   packages/component/src/synthesis/__tests__/backend-adapter.spec.ts

   FROM: packages/lib/src/synthesis/__tests__/real-backend-synthesis.spec.ts
   TO:   packages/component/src/synthesis/__tests__/backend-integration.spec.ts
   ```

5. **Remove component from lib dependencies**
   ```json
   // packages/lib/package.json
   {
     "dependencies": {
       // REMOVE: "@atakora/component": "*"
     }
   }
   ```

**Pros**:
- Restores correct dependency flow
- Backend synthesis lives with backend definitions
- Lib package becomes truly reusable base layer
- No circular dependencies

**Cons**:
- Requires moving code (but minimal changes to implementation)
- Tests need to be reorganized
- Consumers using `@atakora/lib/synthesis` need to import from `@atakora/component/synthesis` instead

**Effort**: ~4 hours (move files, update imports, update tests)

---

### Option B: Create Shared Types Package

**Rationale**: Extract shared types to a new package that both lib and component depend on.

**Changes Required**:

1. **Create new package @atakora/types**
   ```
   packages/types/
   ├── package.json
   ├── src/
   │   ├── index.ts
   │   ├── synthesis.ts  (synthesis types)
   │   ├── backend.ts    (backend types)
   │   └── arm.ts        (ARM template types)
   ```

2. **Move shared types to @atakora/types**
   - BackendObject interface
   - SynthesisResult types
   - ARMTemplate types
   - Common synthesis interfaces

3. **Update dependencies**
   ```json
   // packages/lib/package.json
   {
     "dependencies": {
       "@atakora/types": "*"
       // REMOVE: "@atakora/component": "*"
     }
   }

   // packages/component/package.json
   {
     "dependencies": {
       "@atakora/types": "*",
       "@atakora/lib": "*"
     }
   }
   ```

4. **Keep backend-adapter in lib, but import only types from @atakora/types**

**Pros**:
- Minimal code movement
- Clear separation of types vs. implementation
- Can version types independently

**Cons**:
- Adds another package to maintain
- Doesn't solve the fundamental problem (backend synthesis should be with backend code)
- Still have component implementations in lib (BackendAdapter)
- More complex publishing workflow

**Effort**: ~8 hours (create package, extract types, update all imports, test)

---

### Option C: Invert the Dependency with Plugin Pattern

**Rationale**: Make lib extensible via plugins, allow component to register its synthesizer.

**Changes Required**:

1. **Define plugin interface in lib**
   ```typescript
   // packages/lib/src/synthesis/plugin.ts
   export interface SynthesizerPlugin<TInput = any> {
     name: string;
     canSynthesize(input: unknown): input is TInput;
     synthesize(input: TInput, options: SynthesisOptions): Promise<CloudAssemblyV2>;
   }

   export class SynthesizerRegistry {
     private plugins: SynthesizerPlugin[] = [];

     register(plugin: SynthesizerPlugin): void {
       this.plugins.push(plugin);
     }

     async synthesize(input: unknown, options?: SynthesisOptions): Promise<CloudAssemblyV2> {
       const plugin = this.plugins.find(p => p.canSynthesize(input));
       if (!plugin) throw new Error('No plugin can synthesize this input');
       return plugin.synthesize(input, options);
     }
   }
   ```

2. **Component provides plugin implementation**
   ```typescript
   // packages/component/src/synthesis/backend-plugin.ts
   import { SynthesizerPlugin } from '@atakora/lib/synthesis';
   import { BackendObject } from '../backend';

   export class BackendSynthesizerPlugin implements SynthesizerPlugin<BackendObject> {
     name = 'backend';

     canSynthesize(input: unknown): input is BackendObject {
       return typeof input === 'object' && input !== null && 'schema' in input;
     }

     async synthesize(backend: BackendObject, options: SynthesisOptions) {
       // Use component's BackendSynthesizer here
     }
   }
   ```

3. **Component registers plugin at startup**
   ```typescript
   // packages/component/src/index.ts
   import { registry } from '@atakora/lib/synthesis';
   import { BackendSynthesizerPlugin } from './synthesis/backend-plugin';

   registry.register(new BackendSynthesizerPlugin());
   ```

4. **Remove BackendAdapter from lib, move tests to component**

**Pros**:
- Fully extensible architecture
- Perfect separation of concerns
- Other packages can provide plugins too
- No circular dependencies

**Cons**:
- Most complex solution
- Requires runtime plugin registration
- May surprise users (magic registration)
- Plugin discovery can be implicit/unclear

**Effort**: ~12 hours (design plugin system, implement, migrate code, comprehensive testing)

---

### Option D: Dependency Injection with Factory Pattern

**Rationale**: Lib provides synthesis infrastructure, component provides factories.

**Changes Required**:

1. **Lib provides abstract synthesizer factory**
   ```typescript
   // packages/lib/src/synthesis/factory.ts
   export abstract class SynthesizerFactory<TInput, TOutput> {
     abstract create(): SynthesisAdapter<TInput, TOutput>;
   }

   export class Synthesizer {
     private factories = new Map<string, SynthesizerFactory<any, any>>();

     registerFactory(type: string, factory: SynthesizerFactory<any, any>): void {
       this.factories.set(type, factory);
     }

     synthesize<TInput, TOutput>(
       type: string,
       input: TInput,
       options?: SynthesisOptions
     ): Promise<TOutput> {
       const factory = this.factories.get(type);
       if (!factory) throw new Error(`No factory for type: ${type}`);
       const adapter = factory.create();
       return adapter.synthesize(input, options);
     }
   }
   ```

2. **Component provides factory implementation**
   ```typescript
   // packages/component/src/synthesis/factory.ts
   import { SynthesizerFactory } from '@atakora/lib/synthesis';
   import { BackendAdapter } from './backend-adapter';

   export class BackendSynthesizerFactory extends SynthesizerFactory<BackendObject, CloudAssemblyV2> {
     create() {
       return new BackendAdapter();
     }
   }
   ```

3. **Users register factories explicitly**
   ```typescript
   import { Synthesizer } from '@atakora/lib/synthesis';
   import { BackendSynthesizerFactory } from '@atakora/component/synthesis';

   const synthesizer = new Synthesizer();
   synthesizer.registerFactory('backend', new BackendSynthesizerFactory());

   await synthesizer.synthesize('backend', myBackend, { outdir: './out' });
   ```

**Pros**:
- Explicit dependency injection
- No magic, clear to users
- Fully type-safe
- No circular dependencies

**Cons**:
- Requires users to wire up factories manually
- More verbose API
- Boilerplate code

**Effort**: ~6 hours (implement factory pattern, migrate code, update documentation)

---

## Recommended Solution: Option A

**Move Backend Synthesis to Component Package**

This is the cleanest, simplest solution that:
1. Restores architectural integrity
2. Requires minimal code changes
3. Makes logical sense (backend synthesis lives with backend code)
4. Takes ~4 hours to implement
5. No new patterns or abstractions needed

## Implementation Phases

### Phase 1: Preparation (30 minutes)
- [ ] Create feature branch: `fix/circular-dependency-remediation`
- [ ] Document current import paths for all affected files
- [ ] Run full test suite to establish baseline

### Phase 2: Move Backend Adapter (1 hour)
- [ ] Create `packages/component/src/synthesis/` directory structure
- [ ] Move `backend-adapter.ts` from lib to component
- [ ] Update imports in backend-adapter.ts (remove @atakora/component imports, they're now local)
- [ ] Update component package.json exports to include synthesis module

### Phase 3: Move Tests (1 hour)
- [ ] Move `e2e-backend-synthesis.spec.ts` to component
- [ ] Move `real-backend-synthesis.spec.ts` to component
- [ ] Update test imports
- [ ] Verify tests still pass

### Phase 4: Update Package Dependencies (30 minutes)
- [ ] Remove `@atakora/component` from lib/package.json dependencies
- [ ] Verify lib package builds successfully
- [ ] Verify component package builds successfully

### Phase 5: Update Documentation (30 minutes)
- [ ] Update lib package README (remove backend synthesis examples)
- [ ] Update component package README (add backend synthesis documentation)
- [ ] Update JSDoc examples in synthesizer.ts
- [ ] Update any architecture diagrams

### Phase 6: Clean Up Exports (30 minutes)
- [ ] Remove BackendAdapter from lib/src/synthesis/index.ts exports
- [ ] Add BackendAdapter to component/src/synthesis/index.ts exports
- [ ] Update component/src/index.ts to re-export synthesis module

### Phase 7: Verification (30 minutes)
- [ ] Run full test suite (both packages)
- [ ] Build all packages in dependency order: lib → cdk → component → cli
- [ ] Verify no TypeScript errors
- [ ] Run `madge --circular` to verify no circular dependencies
- [ ] Test example backends (backend-simple, backend)

## Validation Criteria

### Build System Validation
```bash
# Must succeed in this order without errors
cd packages/lib && npm run build
cd packages/cdk && npm run build
cd packages/component && npm run build
cd packages/cli && npm run build
```

### Circular Dependency Check
```bash
# Must report ZERO circular dependencies
npx madge --circular packages/lib/src
npx madge --circular packages/component/src
```

### Import Direction Verification
```bash
# Lib must NOT import from component
cd packages/lib
grep -r "@atakora/component" src/
# Should return NO matches (exit code 1)

# Component CAN import from lib (expected)
cd packages/component
grep -r "@atakora/lib" src/
# Should return matches (exit code 0)
```

### Test Coverage
```bash
# All tests must pass
cd packages/lib && npm test
cd packages/component && npm test

# Synthesis tests must still exist and pass
cd packages/component
npm test -- src/synthesis/__tests__/
```

## Success Metrics

1. **Zero circular dependencies** detected by madge
2. **All tests passing** in both packages
3. **Deterministic build order** - lib always builds before component
4. **No runtime errors** when synthesizing backends
5. **Documentation updated** to reflect new package boundaries
6. **No breaking changes** for users (or clearly documented migration path)

## Prevention Strategy

To prevent future circular dependency violations:

### 1. Automated Checks (CI/CD)

Add to `.github/workflows/ci.yml`:

```yaml
- name: Check for circular dependencies
  run: |
    npx madge --circular packages/lib/src
    npx madge --circular packages/component/src
    npx madge --circular packages/cdk/src
    npx madge --circular packages/cli/src
```

### 2. Lint Rules

Add ESLint rule to `packages/lib/.eslintrc.js`:

```javascript
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        '@atakora/component*',
        '@atakora/cli*',
        '@atakora/cdk*'  // lib should not import from cdk either
      ]
    }]
  }
};
```

### 3. Pre-commit Hooks

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
# Check for forbidden imports in lib package
if git diff --cached --name-only | grep "packages/lib/src"; then
  if grep -r "@atakora/component" packages/lib/src/; then
    echo "ERROR: lib package cannot import from component package"
    exit 1
  fi
fi
```

### 4. Documentation Updates

Add to `packages/lib/README.md`:

```markdown
## Package Dependencies

This package is the BASE LAYER and must not depend on:
- @atakora/component
- @atakora/cdk
- @atakora/cli

Other packages may depend on @atakora/lib, but not vice versa.

If you need to use component functionality, consider:
1. Moving your code to the component package
2. Extracting shared types to a common location
3. Using dependency inversion (interfaces in lib, implementations in component)
```

### 5. Architectural Review Checklist

Add to `CONTRIBUTING.md`:

```markdown
## Adding New Features

Before adding code to @atakora/lib, ask:

- [ ] Is this truly infrastructure/base functionality?
- [ ] Does this need to import from component/cdk/cli?
- [ ] Could this live in a higher-level package instead?
- [ ] Have I checked for circular dependencies with `madge`?
- [ ] Does this violate the dependency flow diagram?
```

### 6. Package Boundary Enforcement Tool

Create `scripts/check-boundaries.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';

interface PackageConfig {
  name: string;
  allowedImports: string[];
}

const packages: PackageConfig[] = [
  { name: 'lib', allowedImports: [] }, // Base layer - no atakora imports
  { name: 'cdk', allowedImports: ['@atakora/lib'] },
  { name: 'component', allowedImports: ['@atakora/lib', '@atakora/cdk'] },
  { name: 'cli', allowedImports: ['@atakora/lib', '@atakora/cdk', '@atakora/component'] }
];

function checkPackage(pkg: PackageConfig): string[] {
  const violations: string[] = [];
  const srcDir = path.join(__dirname, '../packages', pkg.name, 'src');

  // Recursively find all .ts files
  const files = findTypeScriptFiles(srcDir);

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const importMatches = content.match(/from ['"]@atakora\/[\w-]+/g) || [];

    for (const importStatement of importMatches) {
      const importedPkg = importStatement.match(/@atakora\/([\w-]+)/)?.[1];
      if (importedPkg && !pkg.allowedImports.includes(`@atakora/${importedPkg}`)) {
        violations.push(`${file}: Illegal import from @atakora/${importedPkg}`);
      }
    }
  }

  return violations;
}

function findTypeScriptFiles(dir: string): string[] {
  let results: string[] = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(findTypeScriptFiles(filePath));
    } else if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) {
      results.push(filePath);
    }
  }

  return results;
}

// Run checks
let hasViolations = false;
for (const pkg of packages) {
  const violations = checkPackage(pkg);
  if (violations.length > 0) {
    console.error(`\nViolations in @atakora/${pkg.name}:`);
    violations.forEach(v => console.error(`  - ${v}`));
    hasViolations = true;
  }
}

if (hasViolations) {
  console.error('\n❌ Package boundary violations detected!');
  process.exit(1);
} else {
  console.log('\n✅ All package boundaries respected');
}
```

Add to `package.json` (root):

```json
{
  "scripts": {
    "check:boundaries": "tsx scripts/check-boundaries.ts"
  }
}
```

## Alternative Considered: Keep Circular Dependency

We explicitly considered whether the circular dependency is acceptable. **Decision: NO**.

**Why not acceptable**:

1. **Build system fragility** - Makes build order non-deterministic
2. **Testing complexity** - Cannot test packages in isolation
3. **Maintenance burden** - Changes ripple between packages unpredictably
4. **Publishing issues** - Semantic versioning becomes meaningless
5. **Architectural confusion** - Unclear which package owns which responsibility
6. **Future scalability** - Adding more packages becomes increasingly difficult

**The cost of fixing this NOW (~4 hours) is far less than the accumulated technical debt over time.**

## Related Decisions

- **ADR-020**: Component Auth System - Establishes component as application layer
- **ADR-018**: Context-Aware Synthesis Pipeline - Defines synthesis architecture
- Future ADR needed: Package dependency policy (explicit rules for all packages)

## Next Steps

1. **Immediate**: Implement Option A (Move Backend Synthesis to Component)
2. **Short-term**: Add automated checks to prevent regression
3. **Medium-term**: Audit other packages for similar violations
4. **Long-term**: Create comprehensive package architecture documentation

## References

- [Madge - Circular Dependency Detection](https://github.com/pahen/madge)
- [ESLint no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports)
- Martin Fowler on [Package Principles](https://martinfowler.com/bliki/PackagePrinciples.html)
- Bob Martin's [Acyclic Dependencies Principle](https://wiki.c2.com/?AcyclicDependenciesPrinciple)

---

**RECOMMENDATION**: Proceed with Option A immediately. This is a critical architectural violation that will compound over time. The 4-hour fix now prevents months of accumulated technical debt.
