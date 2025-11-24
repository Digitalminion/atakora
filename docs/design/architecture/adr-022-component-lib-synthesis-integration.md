# ADR-022: Component and Lib Synthesis Pipeline Integration

## Status

Proposed

## Context

We've encountered an architectural integration issue between the component and lib synthesis pipelines when attempting to synthesize component-style backends (`defineBackend()`) into ARM templates.

### Package Architecture

The Atakora project has three synthesis-related packages:

1. **@atakora/lib** - CDK-style synthesis (lowest level, no dependencies)
   - Works with CDK construct trees (App, Stack, Resource)
   - Provides prepare → transform → validate → assembly pipeline
   - Handles template splitting for large templates (>3MB)
   - Manages cross-template references via SynthesisContext

2. **@atakora/component** - Component-style synthesis (depends on lib)
   - Works with high-level backend definitions (BackendObject)
   - Analyzes backend structure (models, attachments, features)
   - Creates CDK constructs internally via BackendSynthesizer
   - Produces complete ARM templates via CDK's app.synth()

3. **@atakora/cli** - CLI commands (depends on both)
   - Entry point for user-facing synthesis commands
   - Loads backends and orchestrates synthesis
   - Uses BackendSynthesisStrategy → BackendAdapter

### Current Synthesis Flow

```
CLI
 └─> BackendSynthesisStrategy.synthesize(backend)
      └─> BackendAdapter.synthesize(backend)
           ├─> Phase 1: SynthesisPipeline.synthesize(backend)
           │    └─> BackendSynthesizer.synthesize(backend)
           │         ├─> Create CDK App/Stack
           │         ├─> Synthesize data layer (Cosmos DB)
           │         ├─> Synthesize API layer (API Management)
           │         ├─> Synthesize compute layer (Functions)
           │         └─> app.synth() → CloudAssembly with ARM template
           │
           ├─> Phase 2: Convert component ARM to lib ARM format
           ├─> Phase 3: Create stack manifest
           ├─> Phase 4: Write templates to disk
           └─> Phase 5: Create CloudAssembly
```

### The Problem

Synthesis fails at Phase 4 with this error:

```
Backend synthesis failed: Synthesis failed: Current template 'data-platform-subscription.json'
not found in template metadata. Available templates: (empty)
```

**Root Cause:** BackendAdapter attempts to use lib's Synthesizer to write templates, which expects:
- Template metadata populated during lib's prepare phase
- Resources assigned to templates via TemplateSplitter
- SynthesisContext with template assignments for cross-template references

However, component backends:
- Already produce complete ARM templates via CDK's app.synth()
- Never go through lib's prepare phase
- Don't have template splitting metadata
- Use their own SynthesisContext type (backend, analysis, environment, naming)

**The fundamental issue:** We're trying to integrate two incompatible synthesis models by forcing component backends through lib's infrastructure.

### Two Distinct Synthesis Models

**Component Synthesis Model:**
- **Input:** BackendObject (high-level backend definition)
- **Process:** Backend → CDK constructs → app.synth() → ARM template
- **Output:** Complete, self-contained ARM template
- **Context:** Backend-aware (models, attachments, naming conventions)
- **Use Case:** User-facing backend definitions (defineBackend API)

**Lib Synthesis Model:**
- **Input:** CDK construct tree (App with Stacks and Resources)
- **Process:** Prepare → Transform → Validate → Assembly
- **Output:** ARM templates with optional splitting/linking
- **Context:** Template-aware (resource assignments, cross-template refs)
- **Use Case:** Low-level CDK construct composition

### Why Force Integration Fails

1. **Different Abstractions:**
   - Component works at backend level (models, schemas, features)
   - Lib works at construct level (resources, dependencies, ARM JSON)

2. **Different Contexts:**
   - Component needs backend information (naming, environment, cloud type)
   - Lib needs template information (splits, assignments, references)

3. **Different Lifecycle:**
   - Component: analyze → synthesize → complete template
   - Lib: prepare → transform → validate → assemble

4. **Unnecessary Complexity:**
   - Component backends start as single templates (< 3MB typically)
   - Forcing template splitting infrastructure adds complexity without benefit
   - Future optimization can add splitting when actually needed

## Decision

**We will maintain separate synthesis paths for component and lib, with clean integration at the file-writing boundary.**

### Architecture Decision

```
Component Path:                    Lib Path:
┌──────────────────┐              ┌──────────────────┐
│  BackendObject   │              │  CDK Constructs  │
└────────┬─────────┘              └────────┬─────────┘
         │                                  │
         v                                  v
┌──────────────────┐              ┌──────────────────┐
│ Component        │              │ Lib Synthesizer  │
│ BackendSynthesizer│             │                  │
│ - Analyze backend│              │ - Prepare phase  │
│ - Create CDK     │              │ - Transform      │
│ - app.synth()    │              │ - Validate       │
└────────┬─────────┘              └────────┬─────────┘
         │                                  │
         v                                  v
┌──────────────────┐              ┌──────────────────┐
│ ComponentSynthesis│             │  CloudAssembly   │
│ Result           │              │  (lib format)    │
│ - ARM template   │              │                  │
│ - Functions      │              │                  │
│ - Schemas        │              │                  │
└────────┬─────────┘              └────────┬─────────┘
         │                                  │
         └────────────┬─────────────────────┘
                      v
         ┌───────────────────────┐
         │  File Writer          │
         │  (BackendAdapter)     │
         │  - Write templates    │
         │  - Write manifest     │
         │  - Write metadata     │
         │  - Create assembly    │
         └───────────────────────┘
```

### Key Decisions

1. **Component Synthesis is Self-Contained**
   - BackendSynthesizer produces complete ARM templates
   - No dependency on lib's prepare/transform pipeline
   - Uses CDK's app.synth() directly
   - Result includes all artifacts (ARM, functions, schemas)

2. **BackendAdapter Writes Files Directly**
   - Does NOT use lib's Synthesizer for file writing
   - Implements its own file writing (already present)
   - Creates CloudAssembly manifest
   - Maintains existing BackendAdapter API

3. **Lib Synthesis Remains Unchanged**
   - Continues to work with CDK construct trees
   - Maintains prepare → transform → validate → assembly flow
   - Keeps template splitting and SynthesisContext
   - Used for direct CDK construct composition (future use cases)

4. **Progressive Enhancement**
   - Start with single-template backends (simple)
   - Add template splitting when backends exceed 3MB (optimization)
   - Implement splitting in BackendAdapter when needed
   - Don't pay complexity cost upfront

## Alternatives Considered

### Alternative A: Populate Template Metadata in BackendAdapter

**Approach:** Create template metadata when converting component → lib, pass to lib's SynthesisContext.

**Pros:**
- Reuses lib's file writing infrastructure
- Prepares for future template splitting
- Uses existing SynthesisContext validation

**Cons:**
- Forces component backends through lib's pipeline unnecessarily
- Creates artificial metadata for single templates
- Adds complexity without clear benefit
- Couples component to lib's internal structure
- Maintains the problematic integration point

**Why Rejected:** Adds complexity to solve a problem that shouldn't exist. Component backends don't need lib's template-splitting infrastructure until they actually need splitting.

### Alternative B: Make Lib's SynthesisContext Optional

**Approach:** Make SynthesisContext optional in ResourceTransformer, resources work without context.

**Pros:**
- Backward compatible with existing lib usage
- Minimal changes to lib package
- Allows component to skip context creation

**Cons:**
- Doesn't address file writing integration issue
- Weakens lib's type safety (optional context)
- Resources need dual code paths (with/without context)
- Still maintains problematic integration
- Only solves part of the problem

**Why Rejected:** Partial solution that weakens lib's design without fully solving the integration problem.

### Alternative C: Merge Synthesis Pipelines

**Approach:** Create unified synthesis pipeline that handles both component and CDK construct inputs.

**Pros:**
- Single synthesis implementation
- No duplication of file writing
- Unified architecture

**Cons:**
- Extremely complex implementation
- Breaks single responsibility principle
- Couples fundamentally different abstractions
- High maintenance cost
- Difficult to test and reason about
- Violates "start simple" principle

**Why Rejected:** Over-engineered solution that couples distinct concerns. Component and lib synthesis serve different purposes and should remain separate.

## Consequences

### Positive

1. **Clear Separation of Concerns**
   - Component synthesis focuses on backend → ARM transformation
   - Lib synthesis focuses on CDK construct → ARM transformation
   - Each pipeline optimized for its use case

2. **Simpler Implementation**
   - Component doesn't need template splitting infrastructure
   - No forced integration of incompatible models
   - Easier to understand and maintain

3. **Progressive Enhancement**
   - Start simple with single templates
   - Add splitting when actually needed (backends > 3MB)
   - Don't pay complexity cost upfront

4. **Better Type Safety**
   - Component uses its own SynthesisContext type
   - Lib maintains strong SynthesisContext requirements
   - No optional contexts or dual code paths

5. **Independent Evolution**
   - Component can evolve backend synthesis independently
   - Lib can evolve CDK synthesis independently
   - Changes don't cascade across boundaries

6. **Clearer Mental Model**
   - Component backends → component pipeline → ARM
   - CDK constructs → lib pipeline → ARM
   - No confusion about which path to use

### Negative

1. **Code Duplication**
   - File writing logic duplicated between component and lib
   - Manifest creation duplicated
   - **Mitigation:** Extract shared file utilities if duplication becomes significant

2. **Future Template Splitting**
   - When component backends need splitting, requires implementation in BackendAdapter
   - Cannot directly reuse lib's TemplateSplitter
   - **Mitigation:** Design splitting hook in BackendAdapter, implement when needed

3. **Two Integration Points**
   - CLI must understand both synthesis paths
   - Testing requires validation of both paths
   - **Mitigation:** BackendSynthesisStrategy abstracts the choice, CLI sees uniform interface

4. **Potential for Divergence**
   - File formats could diverge between pipelines
   - Manifest structures could become incompatible
   - **Mitigation:** Define shared types for CloudAssembly and manifest formats

### Migration Path

**Immediate (This Fix):**
1. Remove lib Synthesizer usage from BackendAdapter
2. Implement direct file writing in BackendAdapter
3. Create CloudAssembly from ComponentSynthesisResult
4. Test end-to-end synthesis

**Short Term (Next Sprint):**
1. Extract shared file writing utilities
2. Define shared manifest format types
3. Add integration tests for both paths

**Long Term (Future Optimization):**
1. Add template size monitoring to BackendAdapter
2. Implement splitting hook when backends exceed 3MB
3. Consider template splitting strategy for component backends:
   - Option 1: Use lib's TemplateSplitter (requires metadata generation)
   - Option 2: Implement component-specific splitting (simpler, backend-aware)
   - Decision: Make based on actual backend sizes and splitting needs

## Implementation

### Phase 1: Fix BackendAdapter (Immediate)

**File:** `/packages/component/src/synthesis/backend-adapter.ts`

**Changes:**
1. Remove lib Synthesizer import and usage
2. Keep direct file writing methods (already implemented)
3. Update writeTemplates() to not use lib's SynthesisContext
4. Ensure CloudAssembly creation uses component result data

### Phase 2: Add Integration Tests

**File:** `/packages/component/src/synthesis/backend-adapter.spec.ts`

**Tests:**
1. End-to-end synthesis from backend to files
2. CloudAssembly manifest correctness
3. Template file structure validation
4. Error handling for invalid backends

### Phase 3: Documentation

**Files:**
- Update `/azure/docs/design/architecture/synthesis-cdk-integration-design.md`
- Add synthesis decision rationale
- Document two synthesis paths
- Provide guidance on when to use each

### Phase 4: CLI Integration Validation

**File:** `/packages/cli/src/commands/synth/backend-synthesis-strategy.ts`

**Validation:**
1. Ensure BackendSynthesisStrategy works with updated BackendAdapter
2. Test error handling and reporting
3. Validate file output format

## Success Criteria

1. **Functional:**
   - Component backend synthesis completes without errors
   - ARM templates are written to disk correctly
   - CloudAssembly manifest is valid
   - CLI displays correct synthesis results

2. **Architectural:**
   - Component and lib synthesis remain independent
   - No forced integration of incompatible models
   - Clear boundaries between packages

3. **Quality:**
   - All tests pass
   - No regression in lib synthesis
   - Documentation updated

4. **Performance:**
   - Synthesis time comparable to before (no degradation)
   - File writing is efficient

## References

- Package structure: `/packages/component/`, `/packages/lib/`, `/packages/cli/`
- Error location: `/packages/lib/src/synthesis/synthesizer.ts:361`
- Integration point: `/packages/component/src/synthesis/backend-adapter.ts`
- CLI entry: `/packages/cli/src/commands/synth/backend-synthesis-strategy.ts`

## Notes

### Design Principles Applied

1. **Single Responsibility:** Each synthesis pipeline serves one purpose
2. **Separation of Concerns:** Backend synthesis ≠ construct synthesis
3. **Progressive Enhancement:** Start simple, add complexity when needed
4. **Clear Abstractions:** Don't force incompatible models together
5. **Type Safety:** Maintain strong typing without optional contexts

### Future Considerations

1. **Template Splitting:** When component backends grow large
   - Monitor template sizes in production
   - Implement splitting only when needed (>3MB)
   - Choose appropriate splitting strategy at that time

2. **Shared Utilities:** Extract common file operations if duplication increases
   - FileWriter utility for both pipelines
   - ManifestBuilder for CloudAssembly creation
   - ValidationUtils for ARM template validation

3. **CLI Evolution:** May need to support both synthesis paths
   - Current: Only component backends via BackendSynthesisStrategy
   - Future: Direct CDK construct composition via LibSynthesisStrategy
   - Keep strategies independent, CLI selects based on input type

### Related ADRs

- ADR-018: Context-Aware Synthesis Pipeline Refactoring (lib package)
- ADR-021: Circular Dependency Audit
- (Future) ADR-023: Template Splitting for Component Backends
