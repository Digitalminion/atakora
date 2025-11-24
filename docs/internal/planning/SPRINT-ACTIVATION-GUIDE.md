# Sprint Activation Guide - Quick Reference

**Date**: 2025-11-21
**Sprint**: Alpha Release Readiness
**Duration**: 5-6 days

---

## Quick Start

This guide provides ready-to-execute commands for activating the parallel sprint.

---

## Step 1: Create All DM Tasks

Run these commands in sequence to create all sprint tasks:

### Stream A: Ella Documentation Tasks (7 tasks)

```bash
cd /Users/Austin.Leahy/Source/Github/DigitalMinion/atakora

# Doc 1: Schema Quickstart (4h)
npx dm task add "P1 Doc: Getting Started with Schemas" \
  --assignee "ella-docs" \
  --priority high \
  --notes "Create 5-minute schema quickstart at docs/getting-started/schema-quickstart.md. Include defineSchema, field types, CRUD models. Example: Simple blog schema."

# Doc 2: Auth Quickstart (3h)
npx dm task add "P1 Doc: Getting Started with Authentication" \
  --assignee "ella-docs" \
  --priority high \
  --notes "Create auth setup guide at docs/getting-started/auth-quickstart.md. Include defineAuth, providers, user context. Example: Entra ID + API keys."

# Doc 3: Field Types Reference (6h)
npx dm task add "P1 Doc: Field Types Reference Guide" \
  --assignee "ella-docs" \
  --priority high \
  --notes "Create comprehensive field type reference at docs/guides/schema/field-types.md. Cover all 12 field types with examples, validation rules, methods."

# Doc 4: CRUD Models Guide (5h)
npx dm task add "P1 Doc: CRUD Models Guide" \
  --assignee "ella-docs" \
  --priority high \
  --notes "Create CRUD model patterns guide at docs/guides/schema/crud-models.md. Include authorization, versioning, soft deletes. Example: Multi-tenant users."

# Doc 5: Authorization Patterns (4h)
npx dm task add "P1 Doc: Authorization Patterns" \
  --assignee "ella-docs" \
  --priority high \
  --notes "Create authorization integration guide at docs/guides/auth/authorization-patterns.md. Cover role-based, resource-based, custom rules."

# Doc 6: Schema Troubleshooting (3h)
npx dm task add "P1 Doc: Schema Troubleshooting" \
  --assignee "ella-docs" \
  --priority medium \
  --notes "Create schema troubleshooting guide at docs/troubleshooting/schema.md. Cover validation errors, type inference, circular references."

# Doc 7: Auth Troubleshooting (3h)
npx dm task add "P1 Doc: Authentication Troubleshooting" \
  --assignee "ella-docs" \
  --priority medium \
  --notes "Create auth troubleshooting guide at docs/troubleshooting/auth.md. Cover token validation, provider config, MFA issues."
```

### Stream B: Devon Phase 4 Tasks (6 tasks)

```bash
# Task 6: Staging Defaults (4-6h)
npx dm task add "Phase 4 Task 6: Verify Staging Defaults" \
  --assignee "devon-developer" \
  --priority high \
  --notes "Verify staging defaults at src/backend/defaults/staging.ts. Add tests if missing. Document cost comparison. Similar to production but scaled down."

# Task 8: Schema Attachment Points (6-8h)
npx dm task add "Phase 4 Task 8: Schema Attachment Points" \
  --assignee "devon-developer" \
  --priority high \
  --notes "Implement dynamic attachment points for schema models. CRUD/Event/Function specific. File: src/backend/schema-attachments.ts. Create model-specific attachment points."

# Task 11: Network Attachments (4-6h)
npx dm task add "Phase 4 Task 11: Network Attachments" \
  --assignee "devon-developer" \
  --priority medium \
  --notes "Implement VNet, WAF, DDoS attachment logic. File: src/backend/attachments/network.ts. Validate network configurations. Optional in dev, required in prod."

# Task 12: Monitoring Attachments (4-6h)
npx dm task add "Phase 4 Task 12: Monitoring Attachments" \
  --assignee "devon-developer" \
  --priority medium \
  --notes "Implement App Insights, Log Analytics, Alerts attachments. File: src/backend/attachments/monitoring.ts. Configurable sampling, retention, alert thresholds."

# Task 14: Configuration Resolution (6-8h)
npx dm task add "Phase 4 Task 14: Configuration Resolution" \
  --assignee "devon-developer" \
  --priority high \
  --notes "Implement config resolution with precedence: attachment > setting > default. Deep merge logic. File: src/backend/config-resolver.ts. Validate final configuration."

# Task 15: defineSchema Enhancement (2-4h)
npx dm task add "Phase 4 Task 15: defineSchema Enhancement" \
  --assignee "devon-developer" \
  --priority medium \
  --notes "Enhance defineSchema wrapper in src/schema/define-schema.ts. Add validation, metadata generation. Likely 90% done, needs tests."
```

### Stream C: Charlie Quality Tasks (5 tasks)

```bash
# Coverage: Schema
npx dm task add "Increase Schema Test Coverage to 65%" \
  --assignee "charlie-quality-lead" \
  --priority high \
  --notes "Increase from 45.84% to 65%. Focus: define-schema.ts, object.ts, unified-types.ts, ref-validation.ts. Add edge cases and error paths."

# Coverage: Validation
npx dm task add "Increase Validation Test Coverage to 75%" \
  --assignee "charlie-quality-lead" \
  --priority high \
  --notes "Increase from 58.7% to 75%. Focus: validator.ts. Add integration tests and complex scenarios. Exclude examples.ts from coverage."

# Coverage: Config
npx dm task add "Configure Coverage Excludes" \
  --assignee "charlie-quality-lead" \
  --priority high \
  --notes "Update vitest.config.ts: exclude *.old.ts, *example*.ts, *.bench.ts, messaging/**. Re-run for accurate baseline. Should gain ~1.5% immediately."

# Security
npx dm task add "Fix Security Vulnerabilities" \
  --assignee "charlie-quality-lead" \
  --priority medium \
  --notes "Fix 4 dev-only vulnerabilities. Run: npm audit fix. Update dependencies. Verify no regressions in test suite."

# Verification
npx dm task add "Verify 80% Coverage Milestone" \
  --assignee "charlie-quality-lead" \
  --priority high \
  --notes "Verify overall coverage reaches 80%+ after improvements. Create quality report. Document remaining gaps for beta."
```

---

## Step 2: Verify Task Creation

```bash
# Check Ella's tasks
npx dm list --agent ella-docs -i

# Check Devon's tasks
npx dm list --agent devon-developer -i

# Check Charlie's tasks
npx dm list --agent charlie-quality-lead -i

# Should see:
# - Ella: 7 tasks
# - Devon: 6 tasks
# - Charlie: 5 tasks
# Total: 18 new tasks
```

---

## Step 3: Activate Agents

### Option A: Manual Activation (Recommended)

Share task IDs with each agent and have them pull tasks:

```bash
# Ella gets first task
npx dm list --agent ella-docs -i
# Copy first task ID, activate Ella with that task

# Devon gets first task
npx dm list --agent devon-developer -i
# Copy first task ID, activate Devon with that task

# Charlie gets first task
npx dm list --agent charlie-quality-lead -i
# Copy first task ID, activate Charlie with that task
```

### Option B: Agent Pull Pattern

Agents pull their own tasks:

```bash
# Ella's prompt
"I'm ready to start the documentation sprint. Pull my first task with:
npx dm list --agent ella-docs -i
Then start with the highest priority task (P1 Doc: Getting Started with Schemas)."

# Devon's prompt
"I'm ready to complete Phase 4 tasks. Pull my task list with:
npx dm list --agent devon-developer -i
Start by auditing Tasks 6, 11, 12 to determine actual status, then work in priority order."

# Charlie's prompt
"I'm ready to improve test coverage. Pull my tasks with:
npx dm list --agent charlie-quality-lead -i
Start with 'Configure Coverage Excludes' to get accurate baseline, then focus on schema coverage."
```

---

## Step 4: Daily Coordination

### Daily Update Format (Each Agent Posts)

```markdown
## Agent: [Name]

**Date**: [YYYY-MM-DD]

### Completed Yesterday:

- [Task ID] Task Name - Status

### Planned for Today:

- [Task ID] Task Name - Est hours

### Blockers:

- None / [Description]

### Notes:

- [Any relevant information]
```

### Sync Points

**Daily**:

- 9 AM: Agents post their status
- 5 PM: Agents update progress

**Specific**:

- Day 2 PM: Ella reviews implementations for doc accuracy
- Day 3 PM: Charlie shares coverage report
- Day 4 PM: All agents sync on integration
- Day 5 PM: Final review meeting

---

## Step 5: Completion Checklist

### Per-Task Completion

When completing each task:

```bash
# 1. Mark task complete
npx dm task complete <task-id>

# 2. Add completion comment
npx dm comment add <task-id> "Completed. File: [path]. Tests: [count]. Coverage: [%]. See [summary-doc]."

# 3. Update sprint board (if using)
# 4. Notify dependent agents (if any)
```

### Sprint Completion

When all tasks done:

```bash
# 1. Verify all tests pass
cd /Users/Austin.Leahy/Source/Github/DigitalMinion/atakora/packages/component
npm run test

# 2. Verify coverage target
npm run test:coverage
# Should see: Coverage for lines (80%+) meets threshold

# 3. Verify clean build
npm run build

# 4. List incomplete tasks (should be 0)
npx dm list -i --search "Phase 4"
npx dm list -i --search "P1 Doc"
npx dm list -i --agent charlie-quality-lead

# 5. Generate sprint summary
# Create SPRINT_COMPLETION_REPORT.md
```

---

## Step 6: Alpha Release

Once sprint complete:

```bash
# 1. Create release branch
git checkout -b release/v2.0.0-alpha.1

# 2. Update version
cd packages/component
npm version 2.0.0-alpha.1 --no-git-tag-version

# 3. Create git tag
git add .
git commit -m "chore: prepare v2.0.0-alpha.1 release"
git tag -a v2.0.0-alpha.1 -m "Alpha 1: Backend Assembly + Schema + Auth"

# 4. Push
git push origin release/v2.0.0-alpha.1
git push --tags

# 5. Create GitHub release
# Use release notes from Ella's documentation
```

---

## Quick Reference: Key Metrics

### Success Criteria

```
✅ Phase 4 Tasks: 15/15 complete (100%)
✅ Test Coverage: ≥80%
✅ Backend Tests: 613+ passing
✅ P1 Documentation: 7/7 complete
✅ Security Vulnerabilities: 0 high/critical
✅ Build: Clean compilation
```

### Current Baseline (Pre-Sprint)

```
Phase 4 Tasks: 9/15 complete (60%)
Test Coverage: 77.29%
Backend Tests: 613 passing, 14 skipped
P1 Documentation: 0/7 complete
Security: 4 low (dev-only)
Build: Clean
```

### Expected End State (Post-Sprint)

```
Phase 4 Tasks: 15/15 complete (100%)
Test Coverage: 80-82%
Backend Tests: 650+ passing
P1 Documentation: 7/7 complete
Security: 0 vulnerabilities
Build: Clean
```

---

## Emergency Contacts

If sprint is blocked:

1. **Architecture Questions**: Becky (staff architect)
2. **Integration Issues**: Grace (synthesis expert)
3. **DM System Issues**: Check `npx dm --help`
4. **Build Issues**: Check package.json scripts

---

## Document References

- **Full Sprint Plan**: `/PARALLEL_SPRINT_PLAN.md`
- **Task Audit**: `/TASK_AUDIT_REPORT.md`
- **Phase 4 Plan**: `/packages/component/PHASE4_PLAN.md`

---

**Status**: Ready for sprint activation

Execute Step 1 commands to create all tasks, then proceed to Steps 2-3 for agent activation.
