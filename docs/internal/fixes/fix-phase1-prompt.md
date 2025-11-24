# Prompt: Fix Phase 1 Critical Issues

Copy and paste this entire prompt to a new Claude Code session:

---

I'm working on the Atakora project (Azure backend framework) and need help fixing critical architectural issues in Phase 1 (Schema System).

## Context

**Project Location**: `/Users/Austin.Leahy/Source/Github/DigitalMinion/atakora`

**Current Status**:

- ✅ Phase 1 (Schema System): Complete, Grade A (92/100), but has architectural issues
- ✅ Phase 2 (Authentication): Complete, Grade A+ (96/100)
- 🎯 Need to fix Phase 1 P0 issues before proceeding to Phase 4

## Critical Issues Identified

A critical architectural review (by Becky, our Staff Architect) identified **3 P0 (must-fix) issues** in Phase 1:

### Issue 1: Type System Disconnect

**File**: `START2.md` - Improvement #1
**Problem**: Field builders and validation use parallel type systems that don't share a foundation
**Effort**: 3-4 days

### Issue 2: Missing Model Builder Validation

**File**: `START2.md` - Improvement #2
**Problem**: No validation for conflicting configurations (e.g., readOnly + create operations)
**Effort**: 2-3 days

### Issue 3: Schema Evolution Support

**File**: `START2.md` - Improvement #3
**Problem**: No versioning or migration path for schema changes
**Effort**: 1-2 days

**Total Estimated Effort**: 6-9 days

## What I Need You To Do

1. **Read the critical review**:
   - Open and read `/Users/Austin.Leahy/Source/Github/DigitalMinion/atakora/START2.md`
   - Understand all 3 P0 improvements in detail

2. **Review the current Phase 1 implementation**:
   - Located in: `packages/component/src/schema/`
   - Key files: `define-schema.ts`, `crud-model.ts`, field types, validation

3. **Create a detailed fix plan**:
   - Break down each P0 improvement into specific tasks
   - Assign tasks to Devon agents (Devon-Fix-1, Devon-Fix-2, etc.)
   - Create task breakdown similar to how Phase 2 was planned

4. **Spawn Devon agents to implement the fixes**:
   - Launch multiple Devon agents in parallel where possible
   - Each agent should tackle specific sub-tasks
   - Follow the same patterns used in Phase 1 & 2 (fluent builders, type safety, comprehensive tests)

5. **Coordinate the work**:
   - Track progress with TodoWrite tool
   - Ensure agents don't conflict with each other
   - Run tests after each fix to ensure nothing breaks
   - Update documentation as needed

## Success Criteria

After the fixes are complete:

- ✅ All existing Phase 1 tests still pass (~1,885 tests)
- ✅ Type system is unified with shared foundation
- ✅ Model builder validation catches conflicting configurations
- ✅ Schema versioning and migration system in place
- ✅ No breaking changes to public API (or minimal, well-documented ones)
- ✅ Test coverage remains >90%

## Important Notes

- **Don't break existing functionality** - Phase 1 is production-ready, just needs architectural improvements
- **Maintain backward compatibility** where possible
- **Follow existing patterns** - Review how Phase 1 and 2 were implemented
- **Write comprehensive tests** - Each fix should have test coverage
- **Document changes** - Update relevant docs and examples

## Files to Reference

- `START2.md` - Detailed improvement report with all P0 issues
- `packages/component/PHASE1_SUMMARY.md` - Phase 1 completion summary
- `packages/component/IMPLEMENTATION_PLAN.md` - Overall project plan
- `packages/component/src/schema/` - Current Phase 1 implementation

## Agent Specializations

- **Devon agents**: Implementation work, writing code
- **Charlie agents**: Testing, quality assurance (spawn after Devon finishes)
- **Becky agents**: Architecture review (if needed for complex decisions)

## Expected Deliverables

1. **Fix Plan Document** - Detailed breakdown of how you'll fix each P0 issue
2. **Implementation** - Code changes for all 3 P0 improvements
3. **Tests** - New tests validating the fixes work correctly
4. **Migration Guide** - Document any breaking changes or migration steps needed
5. **Summary Report** - Final status of what was fixed and verification it works

## Start Command

Begin by reading START2.md and creating a comprehensive fix plan. Then spawn the appropriate Devon agents to implement the fixes.

---

**Ready?** Please start by reading START2.md and telling me your plan for fixing these P0 issues.
