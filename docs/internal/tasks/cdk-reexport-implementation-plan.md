# CDK Re-export Implementation Plan

This document provides a detailed implementation checklist for making `@atakora/lib` internal-only and establishing `@atakora/cdk` as the single public API surface.

## Implementation Overview

The goal is to transition from users importing from both `@atakora/lib` and `@atakora/cdk` to importing everything from `@atakora/cdk` only.

## Phase 1: Add Re-exports (Immediate)

### Devon's Tasks

#### 1. Create CDK Root Export File
- [x] Create `packages/cdk/index.ts` with framework re-exports
- File has been created at: `C:\Users\austi\Source\Github\Digital Minion\atakora\packages\cdk\index.ts`

#### 2. Update CDK package.json
- [x] Add root export to exports field
- [x] Add root export to typesVersions
- File updated at: `C:\Users\austi\Source\Github\Digital Minion\atakora\packages\cdk\package.json`

#### 3. Build and Test
- [ ] Run `npm run build` in CDK package
- [ ] Verify dist/index.js and dist/index.d.ts are created
- [ ] Test imports work from both patterns:
  ```typescript
  // Should work
  import { App } from '@atakora/cdk';
  import { App } from '@atakora/lib'; // Still works for now
  ```

#### 4. Update CDK Internal Imports
- [ ] Update namespace files to import utilities from CDK root where appropriate
- [ ] Example for `network/virtual-networks.ts`:
  ```typescript
  // Change from:
  import { Construct } from '@atakora/lib';
  // To:
  import { Construct } from '../index';
  // Or keep as-is for now (Phase 1 allows both)
  ```

## Phase 2: Update Documentation (Week 1)

### Ella's Tasks

#### 1. Update Code Examples
- [ ] Update all examples in `/docs/examples/` to use CDK imports
- [ ] Update README.md examples
- [ ] Update getting-started.md

#### 2. Create Migration Documentation
- [x] Migration guide created at: `C:\Users\austi\Source\Github\Digital Minion\atakora\docs\guides\migration-to-cdk-imports.md`
- [ ] Add link to migration guide from main README
- [ ] Add migration notice to release notes

#### 3. Update API Documentation
- [ ] Update JSDoc comments to reference CDK imports
- [ ] Generate new API documentation
- [ ] Update import examples in inline documentation

## Phase 3: Testing (Week 1-2)

### Charlie's Tasks

#### 1. Create Import Tests
- [ ] Create test file `packages/cdk/__tests__/imports.test.ts`
- [ ] Test all re-exported symbols are available
- [ ] Test type exports work correctly
- [ ] Example test:
  ```typescript
  import { App, SubscriptionStack, Construct } from '@atakora/cdk';
  import type { ArmResource, ValidationResult } from '@atakora/cdk';

  describe('CDK Public API Exports', () => {
    it('should export framework classes', () => {
      expect(App).toBeDefined();
      expect(SubscriptionStack).toBeDefined();
      expect(Construct).toBeDefined();
    });
  });
  ```

#### 2. Integration Tests
- [ ] Create sample app using only CDK imports
- [ ] Verify synthesis works correctly
- [ ] Test with TypeScript strict mode
- [ ] Test with different module resolution settings

#### 3. Bundle Size Analysis
- [ ] Run bundle analyzer before changes
- [ ] Run bundle analyzer after changes
- [ ] Verify tree-shaking still works
- [ ] Document any size changes

## Phase 4: Deprecation Notices (Week 2)

### Devon's Tasks

#### 1. Update lib Package Documentation
- [ ] Update `packages/lib/README.md`:
  ```markdown
  # @atakora/lib - Internal Framework Package

  ⚠️ **WARNING: This is an internal package. Do not import directly.**

  Please use `@atakora/cdk` instead:
  ```npm
  npm install @atakora/cdk
  ```

  All public APIs are available through `@atakora/cdk`.
  ```

#### 2. Add Deprecation Warnings
- [ ] Add JSDoc @deprecated tags to lib's public exports
- [ ] Update `packages/lib/src/index.ts`:
  ```typescript
  /**
   * @deprecated Import from '@atakora/cdk' instead. Direct imports from '@atakora/lib' will be removed in v2.0.
   */
  export * from './core';
  ```

#### 3. Update Package Description
- [ ] Update `packages/lib/package.json`:
  ```json
  {
    "description": "Internal framework for Atakora CDK - DO NOT USE DIRECTLY. Install @atakora/cdk instead."
  }
  ```

## Phase 5: CLI Updates (Week 2)

### CLI Team Tasks

#### 1. Verify CLI Compatibility
- [ ] Ensure CLI can handle apps using new import pattern
- [ ] Test synthesis with CDK-only imports
- [ ] Update any CLI templates to use new pattern

#### 2. Update CLI Generated Code
- [ ] Update `init` command templates
- [ ] Update any code generation to use CDK imports

## Phase 6: Migration Tooling (Week 3)

### Felix's Tasks

#### 1. Create Codemod
- [ ] Create jscodeshift codemod for automatic migration
- [ ] Handle import statement updates
- [ ] Handle type import updates
- [ ] Handle dynamic imports
- [ ] Package as `@atakora/cdk-migrate`

#### 2. Test Migration Tool
- [ ] Test on sample projects
- [ ] Test on real-world codebases
- [ ] Handle edge cases (multi-line imports, etc.)

## Phase 7: Communication (Week 3)

### Team Tasks

#### 1. Announce Changes
- [ ] Create release notes for v1.1.0
- [ ] Post migration guide on documentation site
- [ ] Consider blog post explaining the change

#### 2. Support Users
- [ ] Monitor GitHub issues for migration problems
- [ ] Update FAQ based on user feedback
- [ ] Provide support in discussions

## Validation Checklist

Before marking complete, verify:

### Functionality
- [ ] All framework classes available from `@atakora/cdk`
- [ ] All types available from `@atakora/cdk`
- [ ] Resource imports still work from namespaces
- [ ] Backward compatibility maintained (lib imports still work with warnings)

### Developer Experience
- [ ] IntelliSense/autocomplete works for CDK imports
- [ ] TypeScript finds all types correctly
- [ ] No circular dependency issues
- [ ] Clear error messages for wrong imports

### Documentation
- [ ] Migration guide is complete and clear
- [ ] All examples updated
- [ ] API documentation updated
- [ ] Release notes prepared

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Example applications work
- [ ] Bundle size acceptable

### Tooling
- [ ] Build process works
- [ ] Linting rules updated
- [ ] Migration tool available
- [ ] CLI compatibility verified

## Risk Mitigation

### Potential Issues and Solutions

1. **Circular Dependencies**
   - Risk: CDK depending on lib could create circular imports
   - Mitigation: Use careful import structuring, run madge tool
   - Command: `npm run circular:check`

2. **Type Resolution Issues**
   - Risk: TypeScript might not resolve re-exported types
   - Mitigation: Test with different TS versions, use explicit type exports

3. **Bundle Size Increase**
   - Risk: Re-exports might increase bundle size
   - Mitigation: Verify tree-shaking, use named exports only

4. **User Confusion**
   - Risk: Users unsure about import patterns
   - Mitigation: Clear documentation, good error messages, migration tool

5. **Breaking Changes**
   - Risk: Accidentally breaking existing code
   - Mitigation: Maintain backward compatibility in v1.x, deprecate first

## Timeline Summary

- **Immediate**: Phase 1 (Re-exports) - Already completed
- **Week 1**: Phase 2 (Documentation) + Phase 3 (Testing)
- **Week 2**: Phase 4 (Deprecation) + Phase 5 (CLI Updates)
- **Week 3**: Phase 6 (Migration Tool) + Phase 7 (Communication)
- **Week 4**: Monitor, support, and refine

## Success Metrics

Track these metrics to measure success:

1. **Adoption Rate**: % of users migrated to new imports
2. **Issue Count**: Number of migration-related issues
3. **Bundle Size**: Change in average bundle size
4. **Build Time**: Impact on build performance
5. **User Satisfaction**: Feedback on new pattern

## Team Assignments

- **Devon**: Implementation lead (Phases 1, 4)
- **Charlie**: Testing lead (Phase 3)
- **Ella**: Documentation lead (Phase 2)
- **Felix**: Tooling lead (Phase 6)
- **Grace**: CLI compatibility (Phase 5)

## Notes for Implementers

1. **Preserve All Exports**: Ensure every public API from lib is re-exported
2. **Type Safety**: Pay special attention to type-only exports
3. **Testing**: Test with real projects, not just unit tests
4. **Communication**: Over-communicate changes to users
5. **Rollback Plan**: Be ready to rollback if major issues discovered

## Questions to Resolve

Before implementation:
1. Should we include testing utilities in the re-exports?
2. Should synthesis types be included or kept advanced-only?
3. Do we need to re-export everything or can some things stay internal?
4. Should we provide both named and namespace exports for compatibility?

## Completion Criteria

This implementation is complete when:
- [ ] All checklist items marked complete
- [ ] No blocking issues in GitHub
- [ ] Documentation published
- [ ] v1.1.0 released with changes
- [ ] Migration tool available
- [ ] User feedback collected and addressed