# ADR-018: Context-Aware Synthesis Pipeline Refactoring

## Context

The current ARM template synthesis pipeline has a fundamental architectural problem that causes cross-template reference failures when templates are split due to size constraints. The issue stems from the order of operations:

**Current (Problematic) Flow:**
1. Resources generate complete ARM JSON with baked expressions (e.g., `"[listKeys(resourceId('...', 'storageXYZ'), ...)]"`)
2. TemplateSplitter splits templates based on size after ARM generation
3. Baked expressions now reference resources in OTHER templates - but it's too late to fix!

This causes:
- Unresolved placeholders (`${cosmosEndpoint}` literals in templates)
- Duplicate app settings
- Cross-template dependsOn references that break deployments
- Function app references to storage accounts in different templates

The root cause is that resources don't know their deployment context (which template they'll end up in) when generating ARM expressions.

## Decision

Implement a **Context-Aware Synthesis Pipeline** that separates metadata collection from ARM generation, allowing resources to generate correct expressions based on their final template assignment.

### New Pipeline Architecture

```typescript
interface SynthesisPipeline {
  // Phase 1: Collect lightweight metadata without generating ARM
  collectMetadata(): ResourceMetadata[]

  // Phase 2: Decide template assignments based on metadata
  assignTemplates(metadata: ResourceMetadata[]): TemplateAssignments

  // Phase 3: Generate ARM with full context awareness
  generateArm(assignments: TemplateAssignments): ArmTemplates

  // Phase 4: Write files (no fix-ups needed)
  writeArtifacts(templates: ArmTemplates): void
}
```

### Core Components

#### 1. ResourceMetadata Interface
Lightweight representation for template assignment decisions:
```typescript
interface ResourceMetadata {
  id: string                    // Unique resource identifier
  type: string                  // ARM resource type
  name: string                  // Resource name
  dependencies: string[]        // Resource IDs this depends on
  sizeEstimate: number         // Estimated ARM JSON size in bytes
  requiresSameTemplate?: string[] // Resources that must be in same template
  templatePreference?: 'main' | 'linked' | 'any' // Deployment preference
  metadata?: Record<string, any> // Resource-specific metadata
}
```

#### 2. SynthesisContext Class
Provides template assignment information during ARM generation:
```typescript
class SynthesisContext {
  // Current resource's assigned template
  currentTemplate: string

  // Map of all resource IDs to their assigned templates
  resourceTemplates: Map<string, string>

  // Template metadata (URIs, parameters, etc.)
  templateMetadata: Map<string, TemplateMetadata>

  // Helper methods for expression generation
  getResourceReference(resourceId: string): ArmExpression
  getParameterReference(paramName: string): ArmExpression
  getCrossTemplateReference(resourceId: string, expression: string): ArmExpression
}
```

#### 3. Updated Resource Interface
```typescript
abstract class Resource {
  // New method for metadata collection (Phase 1)
  abstract toMetadata(): ResourceMetadata

  // Updated method with context (Phase 3)
  abstract toArmTemplate(context: SynthesisContext): ArmResource

  // Backwards compatibility wrapper
  toArmTemplateCompat(): ArmResource {
    // Generate with empty context for migration period
    return this.toArmTemplate(new SynthesisContext())
  }
}
```

## Alternatives Considered

### 1. Post-Processing Fix-ups
**Approach:** Keep current pipeline, add complex regex-based fix-ups after splitting.
**Rejected because:**
- Error-prone string manipulation
- Difficult to handle all edge cases
- Doesn't address root cause
- Makes debugging harder

### 2. Never Split Templates
**Approach:** Use linked templates by default, never hit size limits.
**Rejected because:**
- Adds unnecessary complexity for small deployments
- Storage account requirement for all deployments
- Performance overhead for simple scenarios

### 3. Lazy Evaluation with Proxies
**Approach:** Use JavaScript Proxies to delay expression evaluation.
**Rejected because:**
- Complex proxy management
- Difficult to debug
- Performance concerns
- Type safety challenges

## Consequences

### Positive
- **Correct cross-template references** - Resources know their context when generating expressions
- **No post-processing needed** - ARM is correct from the start
- **Better testability** - Each phase can be tested independently
- **Progressive enhancement** - Can migrate resources incrementally
- **Clear separation of concerns** - Metadata vs ARM generation
- **Enables optimization** - Template assignment can optimize for deployment performance

### Negative
- **Breaking change for Resource classes** - All must implement toMetadata()
- **Migration effort** - Need backwards compatibility during transition
- **Additional complexity** - More phases in the pipeline
- **Memory overhead** - Keeping metadata in memory before ARM generation

### Performance Implications
- **Memory:** ~10-20% increase during synthesis (metadata + ARM in memory)
- **CPU:** Negligible - same operations, just reordered
- **I/O:** Unchanged - same number of file writes

## Success Criteria

1. **Functional Success**
   - No unresolved placeholders in generated templates
   - Cross-template references work correctly
   - Function apps correctly reference storage in other templates
   - All existing tests pass with new pipeline

2. **Quality Metrics**
   - Zero post-processing fix-ups needed
   - Template splitting decisions are deterministic
   - Synthesis time increases by less than 20%
   - Memory usage increases by less than 30%

3. **Migration Success**
   - All resources migrated to new pattern within 2 sprints
   - Backwards compatibility maintained during migration
   - No breaking changes for end users

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1)
- Implement ResourceMetadata interface
- Create SynthesisContext class
- Add toMetadata() to base Resource class
- Update TemplateSplitter to work with metadata

### Phase 2: Pipeline Refactoring (Week 1-2)
- Refactor Synthesizer to use new phases
- Implement TemplateAssignments logic
- Create context-aware ARM generation
- Add backwards compatibility layer

### Phase 3: Resource Migration (Week 2-3)
- Migrate high-priority resources (FunctionApp, StorageAccount)
- Update all L1 constructs
- Migrate L2 constructs
- Remove compatibility layer

### Phase 4: Testing & Validation (Week 3)
- Unit tests for each phase
- Integration tests for complete pipeline
- E2E deployment tests
- Performance benchmarks

## Appendix: Detailed Task Breakdown

See Digital Minion task management system for detailed task breakdown optimized for parallel execution by 8 agents.

## References

- Current issues: `SYNTHESIS_ISSUES_ANALYSIS.md`
- Template splitting: `docs/design/architecture/template-splitting-strategy.md`
- Linked templates: `docs/design/architecture/linked-templates-architecture.md`
- Function deployment: `docs/design/architecture/function-deployment-pattern.md`