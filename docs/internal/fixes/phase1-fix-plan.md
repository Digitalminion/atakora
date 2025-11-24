# Phase 1 P0 Fixes - Detailed Implementation Plan

## Executive Summary

This document outlines the implementation plan for fixing 3 critical P0 issues identified in Phase 1 (Schema System) of the Atakora project. The fixes will unify the type system, add model builder validation, and implement schema evolution support.

**Total Estimated Effort**: 6-9 days
**Number of Devon Agents**: 3 (one per P0 issue)
**Impact**: Enhanced type safety, better developer experience, production readiness

---

## Fix #1: Type System Unification

### Problem

Field builders (`BaseFieldConfig`) and validation engine (`FieldDefinition`) use parallel, incompatible type systems that can drift apart.

**Current State:**

- `packages/component/src/schema/field-types/base.ts` defines `BaseFieldConfig` with `validations: ValidationRule[]`
- `packages/component/src/validation/validator.ts` defines `FieldDefinition` with `validations?: Validation[]`
- The `_build()` method transforms between these types without compile-time safety

### Solution

Create a unified type system with a single source of truth.

### Implementation Tasks

**Task 1.1: Create Unified Field Definition Type**

- File: `packages/component/src/schema/unified-types.ts` (new file)
- Create `UnifiedFieldDefinition<T>` interface that combines both systems
- Include: type, dataType, required, nullable, default, validations, metadata
- Ensure backward compatibility with existing code

**Task 1.2: Update Field Builders**

- Files: All files in `packages/component/src/schema/field-types/`
- Update `BaseFieldBuilder` to use `UnifiedFieldDefinition<T>`
- Remove transformation logic in `_build()` method
- Update all field type builders (string, number, boolean, etc.)
- Ensure all builders produce unified definitions directly

**Task 1.3: Update Validation Engine**

- File: `packages/component/src/validation/validator.ts`
- Update `fieldToZodSchema` to accept `UnifiedFieldDefinition<T>`
- Remove separate `FieldDefinition` type (or make it an alias)
- Update all validation functions to use unified type
- Remove transformation overhead

**Task 1.4: Update All Field Type Implementations**

- Files: `packages/component/src/schema/field-types/*.ts`
- Update array, object, string, number, boolean, datetime, enum, etc.
- Ensure each field type properly builds unified definitions
- Update complex types (array, object) to store definitions, not builders

**Task 1.5: Update Tests**

- Files: All `.spec.ts` files in `packages/component/src/schema/field-types/`
- Update field builder tests to expect unified types
- Update validation tests to use unified definitions
- Add new tests for type unification edge cases
- Ensure ~1,885 existing tests still pass

**Agent Assignment**: Devon-Fix-1
**Priority**: P0 (Must complete first - foundational)
**Estimated Effort**: 2-3 days
**Dependencies**: None (start immediately)

---

## Fix #2: Model Builder Validation

### Problem

Model builders accept conflicting configurations without validation, leading to runtime errors and confusing developer experience.

**Current Issues:**

- No validation for mutually exclusive field modifiers (`.required().optional()`)
- No validation that partition key exists in fields
- No validation for authorization field references
- No checks for referential integrity with `ref` fields
- Builder method order matters but isn't validated

### Solution

Add comprehensive validation in the `_build()` method of all model builders.

### Implementation Tasks

**Task 2.1: Add Field Configuration Validation**

- File: `packages/component/src/schema/field-types/base.ts`
- Add `validateFieldConfig()` method to `BaseFieldBuilder`
- Check for conflicting modifiers (required + optional, required + nullable)
- Validate that default values match field type
- Add clear error messages with suggestions

**Task 2.2: Add CRUD Model Validation**

- File: `packages/component/src/schema/crud-model.ts`
- Add `validate()` method called from `_build()`
- Validate partition key exists in fields
- Validate authorization field references point to real fields
- Check for duplicate method calls (e.g., `.timestamps(true).timestamps(false)`)
- Validate index fields exist in model

**Task 2.3: Add Authorization Validation**

- File: `packages/component/src/schema/authorization.ts`
- Validate owner field references exist in model
- Validate group-based rules are properly configured
- Add validation for operation types (create, read, update, delete)
- Ensure at least one authorization rule is defined if auth is used

**Task 2.4: Add Ref Field Validation**

- File: `packages/component/src/schema/field-types/ref.ts`
- Add deferred validation for ref fields (validate against schema after all models defined)
- Create validation registry for cross-model references
- Validate referenced model exists
- Validate referenced field types are compatible

**Task 2.5: Add Readonly/Computed Field Concept**

- File: `packages/component/src/schema/field-types/base.ts`
- Add `.readOnly()` modifier to field builders
- Add `.computed()` modifier for calculated fields
- Validate that readonly fields aren't used in create operations
- Update CRUD model to respect readonly fields

**Task 2.6: Comprehensive Validation Tests**

- File: `packages/component/src/schema/crud-model.spec.ts`
- Add tests for all validation scenarios
- Test conflicting field modifiers
- Test invalid partition keys
- Test invalid authorization references
- Test ref field validation
- Ensure validation errors are clear and helpful

**Agent Assignment**: Devon-Fix-2
**Priority**: P0 (Can run in parallel with Fix #1)
**Estimated Effort**: 2-3 days
**Dependencies**: Can start immediately, but will need to integrate with unified types from Fix #1

---

## Fix #3: Schema Evolution Support

### Problem

No versioning mechanism for schemas, making it impossible to track changes, migrate data, or deprecate fields safely.

**Current State:**

- Schema changes are destructive
- No migration path for field renames or type changes
- Cannot track schema versions over time
- No safe deprecation for fields

### Solution

Add comprehensive schema versioning and migration system.

### Implementation Tasks

**Task 3.1: Define Schema Version Types**

- File: `packages/component/src/schema/versioning/types.ts` (new file)
- Create `SchemaVersion` interface
- Create `SchemaChange` union type (addField, removeField, renameField, changeType)
- Create `Migration` interface with from/to versions and transform function
- Create `VersionedSchema` type

**Task 3.2: Implement Schema Versioning**

- File: `packages/component/src/schema/versioning/schema-version.ts` (new file)
- Implement version tracking system
- Create schema snapshot functionality
- Implement semantic versioning support
- Add version comparison utilities

**Task 3.3: Implement Migration System**

- File: `packages/component/src/schema/versioning/migrations.ts` (new file)
- Create migration builder API
- Implement migration chain execution (1.0 -> 1.1 -> 2.0)
- Add migration validation (ensure migrations are safe)
- Support data transformation during migration
- Add rollback capability

**Task 3.4: Add Field Deprecation**

- File: `packages/component/src/schema/field-types/base.ts`
- Add `.deprecated(message: string)` method to field builders
- Add deprecation metadata to unified field definition
- Add warnings when deprecated fields are used
- Support deprecation timeline (e.g., "will be removed in v2.0")

**Task 3.5: Update defineSchema with Versioning**

- File: `packages/component/src/schema/define-schema.ts`
- Add optional `version` parameter to `defineSchema()`
- Add optional `migrations` parameter
- Store version metadata in schema object
- Add schema comparison utilities (detect breaking changes)

**Task 3.6: Create Migration Generator**

- File: `packages/component/src/schema/versioning/migration-generator.ts` (new file)
- Implement automatic migration generation by diffing schemas
- Detect added/removed/renamed/changed fields
- Generate migration code scaffolding
- Add migration testing utilities

**Task 3.7: Schema Evolution Tests**

- Files: `packages/component/src/schema/versioning/*.spec.ts` (new files)
- Test version tracking
- Test migration execution
- Test migration chains (multiple versions)
- Test field deprecation
- Test schema comparison and breaking change detection
- Test rollback scenarios

**Task 3.8: Documentation and Examples**

- File: `packages/component/src/schema/versioning/README.md` (new file)
- Document versioning system usage
- Provide migration examples
- Document deprecation best practices
- Add troubleshooting guide

**Agent Assignment**: Devon-Fix-3
**Priority**: P0 (Can run in parallel with Fix #1 and #2)
**Estimated Effort**: 3-4 days
**Dependencies**: Should integrate with unified types from Fix #1 after completion

---

## Implementation Strategy

### Phase 1: Parallel Development (Days 1-3)

Launch all 3 Devon agents in parallel:

- **Devon-Fix-1**: Works on type system unification
- **Devon-Fix-2**: Works on model builder validation
- **Devon-Fix-3**: Works on schema evolution support

### Phase 2: Integration (Day 4)

- Devon-Fix-2 integrates with unified types from Devon-Fix-1
- Devon-Fix-3 integrates with unified types from Devon-Fix-1
- Run full test suite to ensure no conflicts

### Phase 3: Testing & Validation (Days 5-6)

- Run all ~1,885 existing tests
- Add integration tests for all 3 fixes working together
- Performance testing for validation and migration systems
- Charlie agent performs quality review

### Phase 4: Documentation (Day 7)

- Ella agent creates migration guide
- Update API documentation
- Create examples showcasing new features

---

## Success Criteria

### Type System Unification (Fix #1)

- [ ] Single `UnifiedFieldDefinition<T>` type used throughout codebase
- [ ] No transformation logic in `_build()` methods
- [ ] All field builders produce unified definitions directly
- [ ] Validation engine consumes unified definitions directly
- [ ] All existing tests pass with new unified types
- [ ] No breaking changes to public API

### Model Builder Validation (Fix #2)

- [ ] Field configuration conflicts are caught at build time
- [ ] Partition key validation prevents invalid configurations
- [ ] Authorization rules validated against model fields
- [ ] Ref fields validated for referential integrity
- [ ] Readonly/computed field concept implemented
- [ ] Clear, actionable error messages for all validation failures
- [ ] Comprehensive test coverage for all validation scenarios

### Schema Evolution Support (Fix #3)

- [ ] Schema versioning system tracks all changes
- [ ] Migration system supports multi-step upgrades
- [ ] Field deprecation warnings work correctly
- [ ] Automatic migration generation from schema diffs
- [ ] Schema comparison detects breaking changes
- [ ] Migration rollback capability
- [ ] Documentation with examples and best practices

### Overall

- [ ] All ~1,885 existing tests still pass
- [ ] Test coverage remains >90%
- [ ] No performance regressions
- [ ] API surface remains backward compatible (or changes are minimal and documented)
- [ ] Code quality maintained (no new linting errors)

---

## Risk Mitigation

### Risk 1: Breaking Changes

**Mitigation**:

- Make unified types backward compatible with existing code
- Use type aliases to maintain old type names during transition
- Add deprecation warnings instead of removing old APIs immediately

### Risk 2: Test Failures

**Mitigation**:

- Run tests frequently during development
- Fix issues incrementally rather than waiting until end
- Use feature flags to enable new validation gradually

### Risk 3: Performance Impact

**Mitigation**:

- Profile validation performance before and after changes
- Implement caching for validation schemas (addressed in P2 improvements)
- Benchmark critical paths

### Risk 4: Agent Coordination

**Mitigation**:

- Clear task boundaries between agents
- Use git branches for each fix
- Daily integration checkpoints

---

## Deliverables

1. **Unified Type System** - Single source of truth for field definitions
2. **Model Builder Validation** - Comprehensive build-time validation
3. **Schema Versioning** - Full versioning and migration system
4. **Test Suite** - All tests passing with >90% coverage
5. **Migration Guide** - Documentation for any breaking changes
6. **Summary Report** - Final status and verification results

---

## Next Steps

1. Review this plan for completeness
2. Spawn 3 Devon agents in parallel:
   - Devon-Fix-1 for type system unification
   - Devon-Fix-2 for model builder validation
   - Devon-Fix-3 for schema evolution support
3. Monitor progress and coordinate integration
4. Run comprehensive test suite
5. Generate final report

---

**Plan Created**: 2025-11-20
**Estimated Completion**: 6-9 days from start
**Phase**: Phase 1 (Schema System) P0 Fixes
