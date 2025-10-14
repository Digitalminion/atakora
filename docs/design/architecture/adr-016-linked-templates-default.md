# ADR-016: Linked Templates as Default Synthesis Approach

## Status

**Proposed**

## Context

We have discovered that our ARM template generation approach has hit a critical scaling limit. The Foundation stack ARM template is 11.2MB, nearly 3x Azure's 4MB limit for ARM templates. This is caused by embedding JavaScript code directly in the template using the `properties.files['index.js']` pattern in our `InlineFunction` construct.

Current problems:
- Each CRUD API generates 5 functions (create, read, update, delete, list)
- Each function embeds ~1MB of minified JavaScript
- Just 2 CRUD APIs = 10 functions = 10MB of embedded code
- Templates fail to deploy when they exceed 4MB
- No way to scale beyond 3-4 functions per stack

The synthesis pipeline currently generates monolithic ARM templates with all resources and embedded code in a single JSON file. This approach is fundamentally incompatible with real-world applications that need dozens or hundreds of functions.

## Decision

**We will make linked templates the default and only approach for ARM template synthesis.**

Key decisions:
1. **Remove monolithic template generation entirely** - no option to generate single-file templates
2. **Always split templates** using intelligent grouping based on size and resource relationships
3. **Deploy function code via "run from package"** pattern using Azure Blob Storage
4. **Hide complexity from developers** - existing code continues to work without changes
5. **Implement in synthesis pipeline** - transformation happens during synthesis, not at construct level

Implementation approach:
- Add new synthesis phase for splitting and packaging
- Create artifact management system for templates and packages
- Generate root template that references linked templates
- Upload all artifacts to storage before deployment
- Use SAS tokens for secure, time-limited access

## Alternatives Considered

### Alternative 1: Nested Templates
Nested templates embed child templates directly in the parent template. This doesn't solve our problem because the total size (parent + all nested) still cannot exceed 4MB.

**Rejected because**: Doesn't actually solve the size limit issue.

### Alternative 2: Optional Linked Templates
Make linked templates an opt-in feature that developers can enable when needed.

**Rejected because**:
- Maintains two code paths (monolithic and linked)
- Developers won't know they need it until deployment fails
- Increases testing burden
- Creates confusion about when to use which approach

### Alternative 3: Bicep Templates
Migrate from ARM JSON to Bicep, which has better native support for modularization.

**Rejected because**:
- Requires learning new DSL
- Loses TypeScript's type safety and IDE support
- Bicep still compiles to ARM JSON (same limits apply)
- Major breaking change for existing users

### Alternative 4: Terraform
Switch to Terraform as the infrastructure-as-code solution.

**Rejected because**:
- Complete rewrite of entire codebase
- Different paradigm (declarative HCL vs imperative TypeScript)
- Loses tight Azure integration
- Abandons existing investment

### Alternative 5: Inline Code Size Limits
Keep monolithic templates but limit inline function code size (e.g., max 100KB per function).

**Rejected because**:
- Artificial limitation on function complexity
- Doesn't scale with number of functions
- Poor developer experience
- Band-aid solution, not addressing root cause

## Consequences

### Positive Consequences

1. **Unlimited Scale**: No practical limit on number of functions or resources
2. **Better Separation**: Infrastructure definition separated from application code
3. **Improved Performance**: Parallel upload/deployment of independent templates
4. **Caching Opportunities**: Unchanged templates/packages can be reused
5. **Security Enhancement**: SAS tokens provide time-limited, scoped access
6. **Alignment with Azure Best Practices**: Microsoft recommends linked templates for large deployments

### Negative Consequences

1. **Storage Dependency**: Requires Azure Storage Account for artifacts
2. **Deployment Complexity**: Multi-phase deployment (upload then deploy)
3. **Debugging Challenges**: Errors might occur in linked templates (harder to trace)
4. **Network Requirements**: Must be able to reach storage account during deployment
5. **Cost Implications**: Storage costs for templates/packages (minimal but non-zero)
6. **Migration Effort**: Significant changes to synthesis pipeline

### Neutral Consequences

1. **Manifest Format Change**: New manifest structure to track artifacts
2. **CLI Changes**: Deploy command must handle upload phase
3. **Testing Updates**: Test harnesses need storage account mocking
4. **Documentation Updates**: New deployment flow must be documented

## Success Criteria

### Immediate (Phase 1)
- All templates under 3.5MB (leaving buffer for Azure overhead)
- Existing InlineFunction code works without modification
- Synthesis completes successfully for Foundation stack
- Function packages generated and uploaded correctly

### Short-term (3 months)
- Deployment success rate >99%
- Deployment time increase <20% despite multi-phase process
- Zero developer code changes required for migration
- Storage overhead <100MB per deployment

### Long-term (12 months)
- Support for 100+ functions per stack
- Template caching reduces deployment time below current baseline
- Artifact lifecycle management (auto-cleanup) implemented
- Full Government cloud support

## Implementation Priority

This is a **critical priority** change that blocks all further development:
1. We cannot ship a framework that fails on modest-sized applications
2. The issue affects our core value proposition (simplified Azure deployment)
3. Every additional feature makes the problem worse
4. No workaround exists for affected users

## Technical Debt

This decision eliminates technical debt:
- Removes size limit constraints that would require future rework
- Establishes scalable pattern from the start
- Aligns with Azure best practices we should have followed initially

New technical debt created:
- Storage account management complexity
- Artifact lifecycle management requirements
- SAS token rotation considerations

## Review Notes

This ADR represents a fundamental shift in how we generate and deploy ARM templates. While it adds complexity to the synthesis pipeline and deployment process, it's essential for creating a production-ready framework. The decision to make this the *only* approach (not optional) ensures consistency and prevents fragmentation of the codebase.

The key insight is that we hide this complexity from developers - their code doesn't change, but the synthesis output is completely restructured. This maintains our goal of simple, TypeScript-based infrastructure while solving the critical scaling limitation.