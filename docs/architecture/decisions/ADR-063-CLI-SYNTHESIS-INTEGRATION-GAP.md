# ADR-021: CLI Synthesis Integration Gap

**Status**: Accepted
**Date**: 2025-11-24
**Deciders**: Becky (Staff Architect)
**Issue**: Users creating manual synthesis scripts instead of using CLI

## Context

We've discovered a critical gap in the Atakora architecture: users are creating manual Node.js scripts (like `synthesize-backend-simple.mjs`) to synthesize backends instead of using the CLI's `atakora synth` command. This indicates the CLI integration is incomplete or broken.

### Current State Assessment

**What EXISTS:**

1. **CLI Package** (`@atakora/cli`)
   - Location: `/packages/cli`
   - Bin entry: `atakora` → `./dist/cli.bundle.js`
   - Commands: `init`, `add`, `synth`, `deploy`, `diff`, `config`, `function`
   - Status: ✅ Built and ready

2. **Synth Command** (`packages/cli/src/commands/synth/index.ts`)
   - Implements `atakora synth` command
   - Has proper flags: `--package`, `--all`, `--output`, `--skip-validation`
   - **BUT**: Only works with CDK-style App constructs

3. **Synthesizers** (Two distinct systems):

   **@atakora/lib Synthesis:**
   - `Synthesizer` class - Works with App/Stack/Resource construct trees
   - `BackendAdapter` class - Bridges component backends to lib synthesis
   - Location: `packages/lib/src/synthesis/`
   - Status: ✅ Fully implemented

   **@atakora/component Synthesis:**
   - `BackendSynthesizer` - Direct backend → ARM synthesis
   - `SynthesisPipeline` - File I/O and deployment pipeline
   - Location: `packages/component/src/synthesis/`
   - Status: ✅ Fully implemented
   - Exports convenience functions: `synthesize()`, `synthesizeToFile()`, `synthesizeToDirectory()`

4. **Manual Workaround Script** (`synthesize-backend-simple.mjs`)
   ```javascript
   import { Synthesizer, BackendAdapter } from './packages/lib/dist/index.js';
   import { defineBackend } from './packages/component/dist/index.js';

   const backend = defineBackend({ ... });
   const adapter = new BackendAdapter();
   const assembly = await adapter.synthesize(backend, { outdir: './arm.out' });
   ```
   - Location: Repository root
   - Purpose: Bypass broken CLI
   - Status: ❌ Should not be necessary

### The Architectural Gap

The CLI's `synth` command has a critical limitation in its entry point detection logic:

**Current CLI Behavior** (`packages/cli/src/commands/synth/index.ts:428-454`):
```javascript
const synthScript = `
  const appModule = require('${appPath}');
  const app = appModule.app || appModule.default;

  if (!app) {
    throw new Error('App file must export an "app" or default export');
  }

  if (typeof app.synth !== 'function') {
    throw new Error('Exported app must have a synth() method');
  }

  app.outdir = '${packageOutputDir}';
  const assembly = await app.synth();
`;
```

**What This Supports:**
- ✅ CDK-style apps: `export const app = new App()`
- ✅ Default exports: `export default app`
- ✅ Apps with `.synth()` method

**What This FAILS On:**
- ❌ Component backends: `export const backend = defineBackend(...)`
- ❌ Backend objects without `.synth()` method
- ❌ Backends needing `BackendAdapter` or `SynthesisPipeline`

### Why Users Created Manual Scripts

Users couldn't synthesize component-style backends via CLI, so they:

1. Imported synthesizers directly from package dist files
2. Called `BackendAdapter.synthesize()` or `SynthesisPipeline.synthesize()` manually
3. Wrote custom Node.js scripts to orchestrate synthesis
4. Bypassed all CLI features (validation, multi-package, progress spinners, etc.)

This is **exactly backwards** from the intended architecture where the CLI should be the primary interface.

## Alternatives Considered

### Alternative 1: Require Users to Wrap Backends in Apps

**Approach:**
```typescript
// backend.ts
export const backend = defineBackend({ ... });

// app.ts - Required wrapper
import { backend } from './backend';
import { App } from '@atakora/lib';

const app = new App();
// ... somehow attach backend to app?
export { app };
```

**Rejected Because:**
- Adds unnecessary boilerplate for every backend project
- Violates component package's promise of "define once, deploy automatically"
- Requires users to understand both component AND CDK patterns
- The component package already has synthesis built-in
- Creates confusion about which synthesis path to use

### Alternative 2: Create Separate CLI Command for Backends

**Approach:**
```bash
atakora synth          # For CDK-style apps
atakora synth-backend  # For component backends
```

**Rejected Because:**
- Creates user confusion about which command to use
- Duplicates synthesis logic across two commands
- Violates DRY principle
- Poor UX - users shouldn't need to know implementation details
- Doesn't scale if we add more synthesis types

### Alternative 3: Automatic Entry Point Detection (CHOSEN)

**Approach:**
Enhance CLI synth command to automatically detect entry point type and route to appropriate synthesizer:

```javascript
// Detect what's exported
const exports = require(entryPoint);

if (exports.app || (exports.default && exports.default.synth)) {
  // CDK-style app - use existing logic
  return app.synth();
}

if (exports.backend || exports.defineBackend) {
  // Component backend - use BackendAdapter
  const { BackendAdapter } = require('@atakora/lib');
  const adapter = new BackendAdapter();
  return adapter.synthesize(exports.backend, options);
}

throw new Error('Entry point must export "app" or "backend"');
```

**Advantages:**
- ✅ Zero user code changes required
- ✅ Single unified command (`atakora synth`)
- ✅ Backwards compatible with existing CDK apps
- ✅ Forward compatible with future synthesis types
- ✅ Leverages existing synthesizer implementations
- ✅ Maintains CLI features (validation, progress, multi-package)

## Decision

**We will enhance the CLI synth command to automatically detect and handle both CDK-style apps and component-style backends.**

Implementation strategy:

1. **Entry Point Detection** - Inspect exports to determine type
2. **Synthesizer Routing** - Use appropriate synthesizer for detected type
3. **Unified Interface** - Same CLI command, options, and UX
4. **Error Handling** - Clear messages if neither type detected
5. **Documentation** - Update CLI docs with supported patterns

## Consequences

### Positive

1. **Users can use the CLI** - No more manual scripts needed
2. **Consistent UX** - One command for all synthesis
3. **Leverages existing code** - Uses fully-implemented synthesizers
4. **Future-proof** - Easy to add new synthesis types
5. **Backwards compatible** - Existing CDK apps continue to work
6. **Validation** - Backend synthesis gets CLI validation features
7. **Multi-package** - Backend synthesis gets `--all` flag support
8. **Progress indicators** - Better UX with spinners and formatted output

### Negative

1. **CLI complexity increases** - More logic in synth command
2. **Testing burden** - Must test both CDK and component paths
3. **Dependency on lib package** - CLI needs BackendAdapter imported
4. **Performance** - Slight overhead from detection logic (negligible)

### Technical Debt Created

1. **Dual synthesis paths** - CLI must maintain both CDK and component routes
2. **Export naming conventions** - Implicitly requires users to name exports correctly
3. **Future synthesis types** - Each new type needs detection logic added

### Technical Debt Resolved

1. **Manual scripts eliminated** - Users delete workaround scripts
2. **Consistent synthesis interface** - One way to synthesize everything
3. **CLI actually used** - CLI becomes the primary interface as intended
4. **Documentation confusion reduced** - One synthesis path documented

## Success Criteria

### Functional Criteria

1. ✅ `atakora synth` works with CDK-style apps (existing behavior)
2. ✅ `atakora synth` works with component backends (new behavior)
3. ✅ Backend synthesis supports all CLI flags (`--output`, `--skip-validation`, etc.)
4. ✅ Multi-package synthesis works with mixed app/backend packages
5. ✅ Clear error messages when entry point exports neither `app` nor `backend`
6. ✅ Manual scripts can be deleted from repository

### Quality Criteria

1. ✅ Tests cover both CDK and component synthesis paths
2. ✅ Documentation updated with both patterns
3. ✅ Examples provided for both CDK and component usage
4. ✅ CLI help text explains supported entry point patterns
5. ✅ Validation works for both synthesis types

### Performance Criteria

1. ✅ Detection adds <100ms overhead
2. ✅ Backend synthesis completes in <10s for typical backends
3. ✅ Memory usage comparable to manual script approach

## Implementation Notes

### Key Files to Modify

1. **CLI Synth Command** (`packages/cli/src/commands/synth/index.ts`)
   - Add entry point type detection
   - Add backend synthesis path
   - Preserve existing CDK app path
   - Add error handling for unknown types

2. **CLI Package Dependencies** (`packages/cli/package.json`)
   - Ensure `@atakora/lib` is available (already is)
   - Ensure `@atakora/component` is available for type detection

3. **Documentation** (`docs/cli/synthesis.md`)
   - Document both CDK and component patterns
   - Provide examples for each
   - Explain automatic detection

### Detection Logic Pseudocode

```javascript
function detectEntryPointType(exports) {
  // Check for CDK-style app
  if (exports.app && typeof exports.app.synth === 'function') {
    return { type: 'cdk-app', target: exports.app };
  }

  if (exports.default && typeof exports.default.synth === 'function') {
    return { type: 'cdk-app', target: exports.default };
  }

  // Check for component backend
  if (exports.backend && isBackendObject(exports.backend)) {
    return { type: 'component-backend', target: exports.backend };
  }

  if (exports.default && isBackendObject(exports.default)) {
    return { type: 'component-backend', target: exports.default };
  }

  // Unknown type
  return { type: 'unknown', target: null };
}

function isBackendObject(obj) {
  return obj &&
         typeof obj === 'object' &&
         obj.schema &&
         obj.settings;
}
```

### Migration Path

**Phase 1: Implement Detection**
- Add type detection logic
- Add backend synthesis path
- Preserve existing CDK path

**Phase 2: Test Both Paths**
- Test CDK apps continue to work
- Test component backends now work
- Test error cases

**Phase 3: Update Documentation**
- Add component backend examples
- Update CLI help text
- Add troubleshooting guide

**Phase 4: Cleanup**
- Delete manual synthesis scripts
- Add deprecation warnings if needed
- Update project templates

## Related ADRs

- **ADR-002**: Synthesis Pipeline Architecture (established the multi-phase synthesis system)
- **ADR-014**: Component Package Architecture (defined the backend-centric approach)

## References

- CLI Synth Command: `packages/cli/src/commands/synth/index.ts`
- BackendAdapter: `packages/lib/src/synthesis/backend-adapter.ts`
- BackendSynthesizer: `packages/component/src/synthesis/backend-synthesizer.ts`
- SynthesisPipeline: `packages/component/src/synthesis/pipeline.ts`
- Manual Script Example: `synthesize-backend-simple.mjs`
