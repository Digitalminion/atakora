# CLI Synthesis Gap - Architectural Analysis and Fix Plan

**Date**: 2025-11-24
**Architect**: Becky (Staff Architect)
**Status**: Critical Issue Identified - Implementation Plan Ready

---

## Executive Summary

**Problem**: Users are creating manual Node.js scripts (like `synthesize-backend-simple.mjs`) to synthesize component-style backends instead of using the CLI's `atakora synth` command.

**Root Cause**: The CLI synth command only supports CDK-style App constructs and fails on component-style backends.

**Impact**:
- CLI is being bypassed (architectural intent violated)
- Manual scripts duplicate synthesis logic
- Users lose CLI features (validation, progress indicators, multi-package support)
- Documentation confusion about synthesis approach

**Solution**: Enhance CLI to automatically detect entry point type and route to appropriate synthesizer.

**Implementation**: 4 phases, 7 tasks assigned across 4 agents, estimated 2-3 weeks.

---

## Current State Assessment

### ✅ What EXISTS

1. **CLI Package** - `@atakora/cli`
   - Location: `/packages/cli`
   - Commands: `init`, `add`, `synth`, `deploy`, `diff`, `config`, `function`
   - Bin entry: `atakora` command available globally
   - Status: **Fully built and ready**

2. **Synth Command** - `packages/cli/src/commands/synth/index.ts`
   - Implements `atakora synth` with proper flags
   - Supports: `--package`, `--all`, `--output`, `--skip-validation`, `--stack`, `--single-file`
   - **Limitation**: Only works with CDK-style App constructs

3. **CDK Synthesis Path** - `@atakora/lib`
   - `Synthesizer` class - Works with App/Stack/Resource construct trees
   - `BackendAdapter` class - Bridges component backends to lib synthesis
   - Location: `packages/lib/src/synthesis/`
   - Status: **Fully implemented and tested**

4. **Component Synthesis Path** - `@atakora/component`
   - `BackendSynthesizer` - Direct backend → ARM synthesis
   - `SynthesisPipeline` - File I/O and deployment pipeline
   - Location: `packages/component/src/synthesis/`
   - Exports: `synthesize()`, `synthesizeToFile()`, `synthesizeToDirectory()`
   - Status: **Fully implemented and tested**

### ❌ What's BROKEN

The CLI's entry point detection logic only recognizes CDK apps:

```javascript
// Current CLI behavior (simplified)
const app = appModule.app || appModule.default;

if (!app) {
  throw new Error('App file must export an "app" or default export');
}

if (typeof app.synth !== 'function') {
  throw new Error('Exported app must have a synth() method');
}

const assembly = await app.synth();
```

**This FAILS for component backends:**
```typescript
// User's backend.ts
export const backend = defineBackend({
  schema: defineSchema({ ... }),
  settings: { name: 'my-app' },
});

// CLI looks for: exports.app
// User provides: exports.backend
// Result: ❌ Error - no app exported
```

---

## The Manual Workaround

Users created scripts like `synthesize-backend-simple.mjs` to bypass the CLI:

```javascript
#!/usr/bin/env node
import { Synthesizer, BackendAdapter } from './packages/lib/dist/index.js';
import { defineBackend } from './packages/component/dist/index.js';

const backend = defineBackend({ ... });
const adapter = new BackendAdapter();
const assembly = await adapter.synthesize(backend, { outdir: './arm.out' });

console.log('✅ Synthesis complete!');
```

**Why this is problematic:**
- Users bypass the CLI entirely
- Lose validation, progress spinners, multi-package support
- Manual scripts scattered across repositories
- Documentation confusion about "proper" way
- Violates architectural intent (CLI as primary interface)

---

## Architectural Decision

**Decision**: Enhance CLI synth command with automatic entry point detection

**Approach**:
1. Detect if entry point exports `app` (CDK) or `backend` (component)
2. Route to appropriate synthesizer (preserve existing CDK path)
3. Unified error handling with clear messages
4. Maintain all existing CLI features for both paths

**Why this approach:**
- ✅ Zero user code changes required
- ✅ Single unified command
- ✅ Backwards compatible
- ✅ Leverages existing synthesizers
- ✅ Future-proof for new synthesis types

**Alternatives Rejected:**
- ❌ Require users to wrap backends in Apps (too much boilerplate)
- ❌ Separate CLI command for backends (confusing UX)

---

## Implementation Plan

### Phase 1: Entry Point Detection System
**Goal**: Robust type detection without breaking existing functionality

**Deliverable**: `EntryPointDetector` utility class

**Key Logic**:
```typescript
export enum EntryPointType {
  CDK_APP = 'cdk-app',
  COMPONENT_BACKEND = 'component-backend',
  UNKNOWN = 'unknown',
}

export class EntryPointDetector {
  detect(moduleExports: any): DetectionResult {
    // Priority: CDK app first (backwards compatibility)
    if (exports.app?.synth || exports.default?.synth) {
      return { type: EntryPointType.CDK_APP, target: app };
    }

    // Then check for component backend
    if (this.isBackend(exports.backend) || this.isBackend(exports.default)) {
      return { type: EntryPointType.COMPONENT_BACKEND, target: backend };
    }

    return { type: EntryPointType.UNKNOWN };
  }

  private isBackend(obj: any): boolean {
    return obj?.schema && obj?.settings;
  }
}
```

### Phase 2: Backend Synthesis Strategy
**Goal**: Add backend synthesis capability to CLI

**Deliverable**: `BackendSynthesisStrategy` class

**Key Logic**:
```typescript
export class BackendSynthesisStrategy {
  private adapter: BackendAdapter;

  async synthesize(backend: any, options: SynthesisOptions) {
    return this.adapter.synthesize(backend, options);
  }
}
```

### Phase 3: CLI Integration
**Goal**: Wire detection and synthesis into synth command

**Changes to** `packages/cli/src/commands/synth/index.ts`:

```typescript
async function synthesizePackage(...) {
  const entryPointModule = require(appPath);

  const detector = new EntryPointDetector();
  const detection = detector.detect(entryPointModule);

  let assembly: CloudAssemblyV2;

  switch (detection.type) {
    case EntryPointType.CDK_APP:
      // Existing CDK path (NO CHANGES)
      detection.target.outdir = packageOutputDir;
      assembly = await detection.target.synth();
      break;

    case EntryPointType.COMPONENT_BACKEND:
      // NEW backend path
      const strategy = new BackendSynthesisStrategy();
      assembly = await strategy.synthesize(detection.target, {
        outdir: packageOutputDir,
        skipValidation: options.skipValidation,
      });
      break;

    case EntryPointType.UNKNOWN:
      throw new Error(
        `Entry point must export either:\n` +
        `  - "app" with synth() method (CDK-style)\n` +
        `  - "backend" with schema/settings (Component-style)`
      );
  }

  // Continue with validation and display...
}
```

### Phase 4: Documentation and Examples
**Goal**: Help users understand both synthesis paths

**Deliverables**:
1. `docs/cli/synthesis-cdk.md` - CDK pattern documentation
2. `docs/cli/synthesis-component.md` - Component pattern documentation
3. `docs/cli/synthesis-troubleshooting.md` - Common issues and fixes
4. `examples/cli-synth-cdk/` - Working CDK example
5. `examples/cli-synth-backend/` - Working component example
6. Updated README quickstart

---

## Implementation Tickets

### Agent: **Devon** (Developer)

1. **[1212071946995829] Implement EntryPointDetector**
   - Priority: High
   - Estimate: 4 hours
   - Location: `packages/cli/src/synthesis/entry-point-detector.ts`
   - Deliverable: Detection class with unit tests

2. **[1212071627820834] Implement BackendSynthesisStrategy**
   - Priority: High
   - Estimate: 4 hours
   - Location: `packages/cli/src/synthesis/backend-synthesis-strategy.ts`
   - Deliverable: Strategy class with unit tests

3. **[1212071627922204] Delete manual synthesis scripts**
   - Priority: Low (after other tickets complete)
   - Estimate: 1 hour
   - Action: Delete `synthesize-backend-simple.mjs` and other workarounds

### Agent: **Grace** (CLI Specialist)

4. **[1212071643954427] Integrate dual-path synthesis into CLI**
   - Priority: High
   - Estimate: 6 hours
   - Location: `packages/cli/src/commands/synth/index.ts`
   - Deliverable: Modified synth command with routing logic

### Agent: **Charlie** (Quality Lead)

5. **[1212071804038931] Write comprehensive tests**
   - Priority: High
   - Estimate: 8 hours
   - Deliverables:
     - Unit tests for EntryPointDetector
     - Unit tests for BackendSynthesisStrategy
     - Integration tests for CDK path (regression)
     - Integration tests for component path (new)
     - Multi-package synthesis tests

### Agent: **Ella** (Documentation)

6. **[1212071643954439] Document CLI synthesis patterns**
   - Priority: Medium
   - Estimate: 4 hours
   - Deliverables:
     - `docs/cli/synthesis-cdk.md`
     - `docs/cli/synthesis-component.md`
     - `docs/cli/synthesis-troubleshooting.md`

7. **[1212071822176997] Create CLI synthesis examples**
   - Priority: Medium
   - Estimate: 4 hours
   - Deliverables:
     - `examples/cli-synth-cdk/` with README
     - `examples/cli-synth-backend/` with README
     - Updated main README quickstart

---

## Testing Strategy

### Unit Tests
- ✅ EntryPointDetector detects all patterns correctly
- ✅ EntryPointDetector prioritizes app over backend
- ✅ EntryPointDetector returns UNKNOWN for invalid exports
- ✅ BackendSynthesisStrategy passes options correctly
- ✅ BackendSynthesisStrategy returns proper assembly structure

### Integration Tests (Regression)
- ✅ CDK apps continue to work (no breaking changes)
- ✅ Multi-stack CDK apps work
- ✅ CDK apps with parameters/outputs work

### Integration Tests (New Functionality)
- ✅ Component backends synthesize via CLI
- ✅ Backend with CRUD models works
- ✅ Backend with authentication works
- ✅ Backend with attachments works

### End-to-End Tests
- ✅ `atakora synth --package backend` works
- ✅ `atakora synth --all` with mixed CDK/component packages works
- ✅ Error messages are clear for invalid entry points
- ✅ Manual scripts can be deleted without breaking workflows

---

## Success Criteria

### Functional Criteria
1. ✅ `atakora synth` works with CDK apps (existing behavior preserved)
2. ✅ `atakora synth` works with component backends (new behavior)
3. ✅ Backend synthesis supports all CLI flags
4. ✅ Multi-package synthesis works with mixed types
5. ✅ Clear error messages for unsupported entry points
6. ✅ Manual synthesis scripts can be deleted

### Quality Criteria
1. ✅ All existing tests pass (zero regression)
2. ✅ New tests cover both synthesis paths
3. ✅ Documentation clear and comprehensive
4. ✅ Examples demonstrate both patterns
5. ✅ CLI help text explains supported patterns

### Performance Criteria
1. ✅ Detection adds <100ms overhead
2. ✅ Backend synthesis completes in <10s for typical backends
3. ✅ Memory usage comparable to manual scripts

---

## Timeline and Dependencies

### Week 1: Core Implementation
- **Days 1-2**: Devon implements EntryPointDetector
- **Days 3-4**: Devon implements BackendSynthesisStrategy
- **Day 5**: Devon writes unit tests

**Blocker**: Grace waits for Devon's components before integration

### Week 2: Integration and Testing
- **Days 1-2**: Grace integrates with CLI synth command
- **Days 3-4**: Charlie writes integration tests
- **Day 5**: Charlie validates regression tests pass

**Blocker**: Ella waits for working CLI before creating examples

### Week 3: Documentation and Cleanup
- **Days 1-2**: Ella writes documentation
- **Days 3-4**: Ella creates examples
- **Day 5**: Devon deletes manual scripts after validation

### Final Validation
- Internal testing by all agents
- Delete manual synthesis scripts
- Update project templates
- Final review and merge

---

## Risk Mitigation

### Risk 1: Breaking Existing CDK Apps
**Likelihood**: Low
**Impact**: Critical
**Mitigation**:
- Detection prioritizes CDK apps first
- Preserve exact existing CDK synthesis path
- Comprehensive regression testing
- Feature flag available if needed

### Risk 2: Detection False Positives
**Likelihood**: Low
**Impact**: Medium
**Mitigation**:
- Clear type guards with multiple checks
- Analyze backend metadata for confirmation
- Explicit error messages with export list
- Manual type override if needed

### Risk 3: Performance Degradation
**Likelihood**: Very Low
**Impact**: Low
**Mitigation**:
- Detection is O(1) - just property checks
- No file I/O during detection
- Lazy-load synthesis strategies
- Benchmark before/after

### Risk 4: Documentation Lag
**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Documentation tasks assigned upfront
- Examples created during development
- Troubleshooting guide with common issues
- README updated with both patterns

---

## Architecture Decision Records

**ADR-021**: CLI Synthesis Integration Gap
- Location: `/docs/design/architecture/adr-021-cli-synthesis-integration-gap.md`
- Documents the problem, alternatives considered, and decision rationale

**ADR-022**: CLI Synthesis Implementation Plan
- Location: `/docs/design/architecture/adr-022-cli-synthesis-implementation-plan.md`
- Detailed technical implementation plan with code examples

---

## Files Reference

### Created
- `/docs/design/architecture/adr-021-cli-synthesis-integration-gap.md`
- `/docs/design/architecture/adr-022-cli-synthesis-implementation-plan.md`
- `/CLI-SYNTHESIS-GAP-ANALYSIS.md` (this file)

### To Be Created
- `packages/cli/src/synthesis/entry-point-detector.ts`
- `packages/cli/src/synthesis/entry-point-detector.spec.ts`
- `packages/cli/src/synthesis/backend-synthesis-strategy.ts`
- `packages/cli/src/synthesis/backend-synthesis-strategy.spec.ts`
- `docs/cli/synthesis-cdk.md`
- `docs/cli/synthesis-component.md`
- `docs/cli/synthesis-troubleshooting.md`
- `examples/cli-synth-cdk/`
- `examples/cli-synth-backend/`

### To Be Modified
- `packages/cli/src/commands/synth/index.ts` (add dual-path logic)
- `README.md` (update quickstart)

### To Be Deleted (After Fix)
- `synthesize-backend-simple.mjs`
- Any other manual synthesis workaround scripts

---

## Key Takeaways

1. **The Problem is Real**: Users creating manual scripts indicates broken CLI integration
2. **The Solution is Clear**: Automatic detection with routing to appropriate synthesizer
3. **The Fix is Bounded**: Well-defined scope, clear deliverables, assigned owners
4. **The Risk is Low**: Backwards compatible, preserves existing CDK path, comprehensive testing
5. **The Impact is High**: Unifies synthesis interface, enables CLI features for backends, eliminates manual scripts

**Next Steps**:
- Devon starts on EntryPointDetector (Task 1212071946995829)
- Grace reviews CLI integration requirements (Task 1212071643954427)
- Charlie prepares test infrastructure (Task 1212071804038931)
- Ella reviews documentation structure (Task 1212071643954439)

---

**Architecture Sign-Off**
Becky, Staff Architect
2025-11-24
