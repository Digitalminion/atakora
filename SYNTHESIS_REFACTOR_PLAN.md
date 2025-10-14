# Synthesis Pipeline Refactoring Plan

## Executive Summary

We're refactoring the ARM template synthesis pipeline to fix critical cross-template reference issues. The current pipeline generates ARM expressions before knowing template assignments, causing broken references when templates are split.

**Solution:** Implement a context-aware synthesis pipeline that separates metadata collection from ARM generation.

## Problem Statement

Current issues documented in `SYNTHESIS_ISSUES_ANALYSIS.md`:
- Unresolved placeholders (`${cosmosEndpoint}`) in templates
- Duplicate app settings
- Cross-template `dependsOn` references fail
- Function apps can't reference storage accounts in other templates

Root cause: Resources generate ARM JSON with baked expressions BEFORE template splitting decisions are made.

## Solution Architecture

### New Pipeline Flow

```
1. COLLECT METADATA (lightweight, no ARM generation)
       ↓
2. ASSIGN TEMPLATES (decide splits based on metadata)
       ↓
3. GENERATE ARM (with full context awareness)
       ↓
4. WRITE FILES (no fix-ups needed)
```

## Key Deliverables

### Architecture Documentation
- **ADR-018:** Context-Aware Synthesis Pipeline (`docs/design/architecture/adr-018-synthesis-pipeline-refactoring.md`)
- **Implementation Spec:** Detailed component specifications (`docs/design/architecture/synthesis-refactor-implementation-spec.md`)

### Core Components

1. **ResourceMetadata Interface** (`packages/lib/src/synthesis/types.ts`)
   - Lightweight resource representation
   - Size estimates and dependencies
   - Template placement hints

2. **SynthesisContext Class** (`packages/lib/src/synthesis/context/synthesis-context.ts`)
   - Provides template assignment info during ARM generation
   - Handles cross-template references
   - Maintains backwards compatibility

3. **Updated Resource Base Class** (`packages/lib/src/core/resource.ts`)
   - New `toMetadata()` method
   - Context-aware `toArmTemplate(context?)`
   - Backwards compatibility wrapper

4. **Refactored TemplateSplitter** (`packages/lib/src/synthesis/assembly/template-splitter.ts`)
   - Works with metadata instead of full ARM
   - Multiple splitting strategies
   - Respects colocation constraints

5. **Refactored Synthesizer** (`packages/lib/src/synthesis/synthesizer.ts`)
   - New phased pipeline
   - Backwards compatibility for unmigrated resources
   - Clear separation of concerns

## Task Assignments

### Parent Task
- **ID:** 1211640491521046
- **Title:** Synthesis Pipeline Refactoring: Context-Aware ARM Generation
- **Status:** In Progress (with 6 phases as subtasks)

### Phase 1: Core Infrastructure (8 agents working in parallel)

| Agent | Task ID | Task | File |
|-------|---------|------|------|
| devon1 | 1211640735185080 | Design ResourceMetadata Interface | `packages/lib/src/synthesis/types.ts` |
| devon2 | 1211640390785571 | Implement SynthesisContext Class | `packages/lib/src/synthesis/context/synthesis-context.ts` |
| devon3 | 1211640405897990 | Create TemplateAssignments Type System | `packages/lib/src/synthesis/types.ts` |
| devon4 | 1211640748790626 | Update Resource Base Class | `packages/lib/src/core/resource.ts` |

### Phase 2: Template & Pipeline (parallel work)

| Agent | Task ID | Task | File |
|-------|---------|------|------|
| grace1 | 1211640403392925 | Implement Metadata-Based Splitting | `packages/lib/src/synthesis/assembly/template-splitter.ts` |
| grace2 | 1211640411009307 | Refactor Synthesizer Pipeline | `packages/lib/src/synthesis/synthesizer.ts` |

### Phase 3: Resource Migration (parallel work)

| Agent | Task ID | Task | File |
|-------|---------|------|------|
| devon5 | 1211640749577354 | Migrate FunctionApp | `packages/cdk/src/functions/function-app.ts` |
| devon6 | (to create) | Migrate StorageAccount | `packages/lib/src/resources/storage/storage-account.ts` |
| devon7 | (to create) | Migrate CosmosDbAccount | `packages/lib/src/resources/cosmos/cosmos-account.ts` |
| devon8 | (to create) | Migrate KeyVault | `packages/lib/src/resources/security/key-vault.ts` |

### Phase 4: Testing & Validation

| Agent | Task ID | Task | Files |
|-------|---------|------|-------|
| charlie1 | 1211640514327881 | Unit Tests for Core Components | `*.test.ts` files |
| charlie2 | (to create) | Integration Tests | `synthesis-integration.test.ts` |
| charlie3 | (to create) | E2E Deployment Tests | `e2e/synthesis-pipeline.test.ts` |
| charlie4 | (to create) | Performance Benchmarks | `synthesis.bench.ts` |

## Parallelization Strategy

The tasks are designed for maximum parallelization:

1. **Phase 1 (Day 1):** All 4 core infrastructure tasks can run in parallel
   - No dependencies between them
   - Each has clear interfaces defined in the spec

2. **Phase 2 (Day 1-2):** Template splitter and synthesizer can be developed in parallel
   - Both depend on Phase 1 interfaces
   - Can use mocks/stubs for testing

3. **Phase 3 (Day 2-3):** All resource migrations can happen in parallel
   - Each resource is independent
   - All follow the same pattern from the spec

4. **Phase 4 (Day 3-4):** Testing can run in parallel
   - Unit tests independent of integration tests
   - E2E tests can use completed components

## Integration Points

Critical integration points that need coordination:

1. **Types.ts:** devon1 and devon3 both work here
   - devon1: ResourceMetadata interface
   - devon3: TemplateAssignments types
   - Coordinate through clear namespacing

2. **Synthesizer ↔ TemplateSplitter:** grace1 and grace2
   - Define clear interface contract
   - Use the TemplateAssignments type as boundary

3. **Resource migrations:** devon5-8
   - All follow same pattern from Resource base class
   - Share learnings through comments in tasks

## Success Criteria

1. ✅ No unresolved placeholders in generated templates
2. ✅ Cross-template references work correctly
3. ✅ Function apps correctly reference storage in other templates
4. ✅ All existing tests pass
5. ✅ New components have >95% test coverage
6. ✅ Synthesis time increases by <20%
7. ✅ Memory usage increases by <30%
8. ✅ Backwards compatibility maintained

## Timeline

**Day 1:** Core infrastructure (Phases 1-2 start)
**Day 2:** Template splitting & pipeline refactoring complete, resource migration starts
**Day 3:** Resource migration continues, testing begins
**Day 4:** Testing complete, integration validation, performance benchmarks

## How to Get Started

For each agent:

1. **Find your task:**
   ```bash
   npx dm list --agent <your-name> -i
   ```

2. **Get task details:**
   ```bash
   npx dm task get <task-id>
   ```

3. **Read the implementation spec:**
   - Main spec: `docs/design/architecture/synthesis-refactor-implementation-spec.md`
   - ADR: `docs/design/architecture/adr-018-synthesis-pipeline-refactoring.md`

4. **Start work and mark in progress:**
   ```bash
   npx dm comment add <task-id> "Starting implementation"
   ```

5. **Complete your task:**
   ```bash
   npx dm task complete <task-id>
   ```

## Coordination

- **Integration issues:** Comment on the parent task (1211640491521046)
- **Type conflicts:** Coordinate in devon1/devon3 task comments
- **Pipeline integration:** Coordinate in grace1/grace2 task comments
- **Resource patterns:** Share in devon5 task comments (first migrated resource)

## Next Steps

1. All agents review this plan and the implementation spec
2. Phase 1 agents (devon1-4) start immediately - no dependencies
3. Phase 2 agents (grace1-2) review Phase 1 interfaces, prepare implementations
4. Phase 3 agents (devon5-8) review Resource base class changes, plan migrations
5. Phase 4 agents (charlie1-4) prepare test frameworks and strategies

Remember: The goal is to fix the cross-template reference issues while maintaining backwards compatibility. Let's execute this in parallel and reconvene for integration!