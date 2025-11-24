# ADR-022: CLI Synthesis Implementation Plan

**Status**: Accepted
**Date**: 2025-11-24
**Deciders**: Becky (Staff Architect)
**Related ADR**: ADR-021 (CLI Synthesis Integration Gap)

## Context

ADR-021 identified the architectural gap where users cannot synthesize component-style backends through the CLI. This ADR provides the detailed implementation plan to resolve that gap.

## Implementation Strategy

We will implement the fix in **4 sequential phases** to minimize risk and ensure quality:

### Phase 1: Entry Point Detection System
**Goal**: Add robust type detection without breaking existing functionality

**Deliverables**:
1. `EntryPointDetector` utility class
2. Type guards for CDK apps and component backends
3. Unit tests for detection logic
4. Clear error messages for unsupported types

**Files**:
- NEW: `packages/cli/src/synthesis/entry-point-detector.ts`
- NEW: `packages/cli/src/synthesis/entry-point-detector.spec.ts`

**Technical Design**:
```typescript
export enum EntryPointType {
  CDK_APP = 'cdk-app',
  COMPONENT_BACKEND = 'component-backend',
  UNKNOWN = 'unknown',
}

export interface DetectionResult {
  type: EntryPointType;
  target: any;
  metadata?: {
    hasBackendSchema?: boolean;
    hasBackendSettings?: boolean;
    hasBackendAuth?: boolean;
    hasSynthMethod?: boolean;
  };
}

export class EntryPointDetector {
  detect(moduleExports: any): DetectionResult {
    // Try CDK app first (backwards compatibility)
    if (this.isCdkApp(moduleExports.app)) {
      return {
        type: EntryPointType.CDK_APP,
        target: moduleExports.app,
        metadata: { hasSynthMethod: true },
      };
    }

    if (this.isCdkApp(moduleExports.default)) {
      return {
        type: EntryPointType.CDK_APP,
        target: moduleExports.default,
        metadata: { hasSynthMethod: true },
      };
    }

    // Try component backend
    if (this.isComponentBackend(moduleExports.backend)) {
      return {
        type: EntryPointType.COMPONENT_BACKEND,
        target: moduleExports.backend,
        metadata: this.analyzeBackend(moduleExports.backend),
      };
    }

    if (this.isComponentBackend(moduleExports.default)) {
      return {
        type: EntryPointType.COMPONENT_BACKEND,
        target: moduleExports.default,
        metadata: this.analyzeBackend(moduleExports.default),
      };
    }

    // Unknown type
    return {
      type: EntryPointType.UNKNOWN,
      target: null,
    };
  }

  private isCdkApp(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      typeof obj.synth === 'function'
    );
  }

  private isComponentBackend(obj: any): boolean {
    return (
      obj &&
      typeof obj === 'object' &&
      obj.schema &&
      obj.settings &&
      typeof obj.settings === 'object'
    );
  }

  private analyzeBackend(backend: any) {
    return {
      hasBackendSchema: !!backend.schema,
      hasBackendSettings: !!backend.settings,
      hasBackendAuth: !!backend.authentication,
    };
  }
}
```

**Test Cases**:
1. Detects CDK app from `exports.app`
2. Detects CDK app from `exports.default`
3. Detects component backend from `exports.backend`
4. Detects component backend from `exports.default`
5. Returns UNKNOWN for object without app or backend
6. Returns UNKNOWN for null/undefined exports
7. Prioritizes app over backend if both present
8. Correctly identifies backend metadata

### Phase 2: Backend Synthesis Path
**Goal**: Add backend synthesis capability to CLI

**Deliverables**:
1. `BackendSynthesisStrategy` class
2. Integration with `BackendAdapter` from `@atakora/lib`
3. Proper output directory handling
4. Assembly manifest generation

**Files**:
- NEW: `packages/cli/src/synthesis/backend-synthesis-strategy.ts`
- NEW: `packages/cli/src/synthesis/backend-synthesis-strategy.spec.ts`
- MOD: `packages/cli/package.json` (ensure dependencies)

**Technical Design**:
```typescript
import { BackendAdapter } from '@atakora/lib/synthesis/backend-adapter';
import type { SynthesisOptions, CloudAssemblyV2 } from '@atakora/lib/synthesis/types';

export class BackendSynthesisStrategy {
  private adapter: BackendAdapter;

  constructor() {
    this.adapter = new BackendAdapter();
  }

  async synthesize(
    backend: any,
    options: {
      outdir: string;
      skipValidation?: boolean;
      prettyPrint?: boolean;
      strict?: boolean;
    }
  ): Promise<CloudAssemblyV2> {
    const synthOptions: Partial<SynthesisOptions> = {
      outdir: options.outdir,
      skipValidation: options.skipValidation || false,
      prettyPrint: options.prettyPrint !== false,
      strict: options.strict || false,
    };

    return this.adapter.synthesize(backend, synthOptions);
  }
}
```

**Integration Points**:
- Uses existing `BackendAdapter` (no reinvention)
- Respects all CLI flags (--skip-validation, --output, etc.)
- Returns standard `CloudAssemblyV2` format
- Works with existing validation pipeline

### Phase 3: CLI Integration
**Goal**: Wire detection and synthesis into synth command

**Deliverables**:
1. Modified synth command with dual-path logic
2. Preserve existing CDK synthesis path
3. Add new backend synthesis path
4. Unified error handling

**Files**:
- MOD: `packages/cli/src/commands/synth/index.ts`

**Technical Design**:

```typescript
// In synthesizePackage function, replace synthesis script with:

import { EntryPointDetector, EntryPointType } from '../../synthesis/entry-point-detector';
import { BackendSynthesisStrategy } from '../../synthesis/backend-synthesis-strategy';

async function synthesizePackage(...) {
  // ... existing setup code ...

  // Load entry point
  const entryPointModule = require(appPath);

  // Detect type
  const detector = new EntryPointDetector();
  const detection = detector.detect(entryPointModule);

  let assembly: CloudAssemblyV2;

  switch (detection.type) {
    case EntryPointType.CDK_APP:
      // Existing CDK path (preserve current behavior)
      spinner.text = `Synthesizing CDK app for ${packageName}...`;
      detection.target.outdir = packageOutputDir;
      assembly = await detection.target.synth();
      break;

    case EntryPointType.COMPONENT_BACKEND:
      // New backend path
      spinner.text = `Synthesizing component backend for ${packageName}...`;
      const backendStrategy = new BackendSynthesisStrategy();
      assembly = await backendStrategy.synthesize(detection.target, {
        outdir: packageOutputDir,
        skipValidation: options.skipValidation,
        prettyPrint: true,
        strict: false,
      });
      break;

    case EntryPointType.UNKNOWN:
      throw new Error(
        `Entry point ${appPath} must export either:\n` +
        `  - "app" or default export with synth() method (CDK-style)\n` +
        `  - "backend" or default export with schema/settings (Component-style)\n` +
        `\n` +
        `Current exports: ${Object.keys(entryPointModule).join(', ')}`
      );
  }

  // ... continue with existing validation and display logic ...
}
```

**Backwards Compatibility**:
- CDK apps work exactly as before
- Existing test suite passes without modification
- No breaking changes to CLI interface

### Phase 4: Documentation and Examples
**Goal**: Help users understand and use both synthesis paths

**Deliverables**:
1. Updated CLI documentation
2. CDK app example
3. Component backend example
4. Troubleshooting guide
5. Migration guide for manual script users

**Files**:
- NEW: `docs/cli/synthesis-cdk.md`
- NEW: `docs/cli/synthesis-component.md`
- NEW: `docs/cli/synthesis-troubleshooting.md`
- MOD: `README.md` (update quickstart)
- NEW: `examples/cli-synth-cdk/`
- NEW: `examples/cli-synth-backend/`

**Documentation Structure**:

**`docs/cli/synthesis-cdk.md`**:
```markdown
# CDK-Style Synthesis

## Overview
Synthesize infrastructure defined using the CDK-style construct tree pattern.

## Entry Point Pattern
```typescript
// app.ts
import { App, SubscriptionStack } from '@atakora/lib';

const app = new App();

new SubscriptionStack(app, 'MyStack', { ... });

export { app };  // or export default app;
```

## CLI Usage
```bash
atakora synth --package my-cdk-package
```

## When to Use
- Building complex multi-stack infrastructure
- Need fine-grained control over resource dependencies
- Working with low-level Azure resources
- Require custom construct libraries
```

**`docs/cli/synthesis-component.md`**:
```markdown
# Component-Style Synthesis

## Overview
Synthesize backends defined using the high-level component API.

## Entry Point Pattern
```typescript
// backend.ts
import { defineBackend, defineSchema, a, c } from '@atakora/component';

const backend = defineBackend({
  schema: defineSchema({
    schema: a.schema({
      User: c.model({
        id: a.id(),
        name: a.string(),
      }),
    }),
  }),
  settings: {
    name: 'my-app',
  },
});

export { backend };  // or export default backend;
```

## CLI Usage
```bash
atakora synth --package my-backend
```

## When to Use
- Building data-driven backends
- Want automatic CRUD API generation
- Need authentication/authorization
- Prefer declarative schema-first approach
```

**`docs/cli/synthesis-troubleshooting.md`**:
```markdown
# Synthesis Troubleshooting

## Error: "Entry point must export either..."

**Cause**: Your entry point file doesn't export `app` or `backend`.

**Solution**:
1. For CDK apps, export: `export const app = new App()`
2. For component backends, export: `export const backend = defineBackend(...)`

## Detection Chooses Wrong Type

**Cause**: Your file exports both `app` and `backend`.

**Solution**: Export only one. The CLI prioritizes `app` over `backend`.

## Backend Synthesis Fails

**Common causes**:
1. Missing schema definition
2. Missing settings.name
3. Invalid model definitions

**Debug**:
```bash
DEBUG=1 atakora synth --package my-backend
```
```

## Testing Strategy

### Unit Tests

1. **EntryPointDetector Tests**:
   - ✅ Detects CDK apps from all export patterns
   - ✅ Detects component backends from all export patterns
   - ✅ Returns UNKNOWN for invalid exports
   - ✅ Prioritizes app over backend
   - ✅ Correctly analyzes backend metadata

2. **BackendSynthesisStrategy Tests**:
   - ✅ Successfully synthesizes valid backend
   - ✅ Passes options to BackendAdapter correctly
   - ✅ Returns proper CloudAssemblyV2 structure
   - ✅ Handles synthesis errors gracefully

### Integration Tests

1. **CDK App Synthesis** (verify no regression):
   - ✅ Simple single-stack app
   - ✅ Multi-stack app
   - ✅ App with parameters and outputs
   - ✅ App with custom validation

2. **Backend Synthesis** (new functionality):
   - ✅ Simple backend with CRUD models
   - ✅ Backend with authentication
   - ✅ Backend with attachments
   - ✅ Backend with custom functions

3. **Multi-Package Synthesis**:
   - ✅ Mix of CDK and component packages
   - ✅ --all flag with both types
   - ✅ Error handling when one type fails

### End-to-End Tests

1. **CLI Workflow Tests**:
   ```bash
   # Setup test project
   atakora init
   atakora add backend

   # Create backend entry point
   cat > packages/backend/bin/app.ts << EOF
   import { defineBackend } from '@atakora/component';
   export const backend = defineBackend({ ... });
   EOF

   # Synthesize
   atakora synth --package backend

   # Verify outputs
   test -f .atakora/arm.out/backend/backend-stack.json
   test -f .atakora/arm.out/backend/manifest.json
   ```

## Rollout Plan

### Phase 1: Development (Week 1)
- Day 1-2: Implement EntryPointDetector
- Day 3-4: Implement BackendSynthesisStrategy
- Day 5: Write unit tests

### Phase 2: Integration (Week 2)
- Day 1-2: Integrate with CLI synth command
- Day 3: Write integration tests
- Day 4-5: Fix issues, refine error messages

### Phase 3: Documentation (Week 2-3)
- Day 1: Write technical documentation
- Day 2: Create examples
- Day 3: Update README and quickstart
- Day 4: Write troubleshooting guide

### Phase 4: Validation (Week 3)
- Day 1-2: Internal testing
- Day 3: Delete manual synthesis scripts
- Day 4: Update project templates
- Day 5: Final review and merge

## Risk Mitigation

### Risk 1: Breaking Existing CDK Apps
**Mitigation**:
- Detection prioritizes CDK apps first
- Preserve exact existing CDK synthesis path
- Comprehensive regression testing
- Feature flag if needed

### Risk 2: Detection False Positives
**Mitigation**:
- Clear type guards with multiple checks
- Analyze backend metadata for confirmation
- Provide explicit error messages
- Allow manual type override if needed

### Risk 3: Performance Degradation
**Mitigation**:
- Detection logic is O(1) - just property checks
- No file I/O during detection
- Lazy-load synthesis strategies
- Benchmark before/after

### Risk 4: Dependency Conflicts
**Mitigation**:
- Both packages already in CLI dependencies
- Use peer dependencies where appropriate
- Lock versions during rollout
- Test in clean environment

## Success Metrics

### Quantitative
1. ✅ All existing CDK tests pass (100% pass rate)
2. ✅ New backend tests pass (100% pass rate)
3. ✅ Detection accuracy >99% on test cases
4. ✅ Synthesis time within 10% of manual scripts
5. ✅ Zero breaking changes to CLI interface

### Qualitative
1. ✅ Manual synthesis scripts deleted from repo
2. ✅ Documentation clear and comprehensive
3. ✅ Error messages actionable and helpful
4. ✅ Examples demonstrate both patterns
5. ✅ Team confident in solution

## Implementation Tickets

See separate task creation in Digital Minion system:

1. **DEV-2-001**: Implement EntryPointDetector (Devon)
2. **DEV-2-002**: Implement BackendSynthesisStrategy (Devon)
3. **DEV-2-003**: Integrate with CLI synth command (Grace)
4. **DEV-2-004**: Write unit and integration tests (Charlie)
5. **DOC-2-001**: Write synthesis documentation (Ella)
6. **DOC-2-002**: Create examples (Ella)

## References

- ADR-021: CLI Synthesis Integration Gap
- BackendAdapter: `packages/lib/src/synthesis/backend-adapter.ts`
- CLI Synth Command: `packages/cli/src/commands/synth/index.ts`
- Component Synthesis: `packages/component/src/synthesis/`
