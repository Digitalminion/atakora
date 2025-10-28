# Task Hygiene Sprint Plan

**Sprint Lead**: Becky (Staff Architect)
**Created**: 2025-10-28
**Duration**: 2-4 hours total
**Objective**: Sync Digital Minion task board with actual project state to 95%+ accuracy

---

## Executive Summary

### Current State Analysis

**Task Board Accuracy**: ~30-40% (60-70% drift from reality)
- **Completed but unmarked**: Phase 1-2 synthesis work (100% complete, shows incomplete)
- **Undocumented work**: 3 bugs fixed, 7+ design docs created, no corresponding tasks
- **Duplicate structures**: Old Phase 1 vs New Synthesis Refactor causing confusion
- **Missing assignments**: 5 agents with 0 tasks, all work concentrated on Charlie
- **Backlog chaos**: 98 incomplete tasks, many are future aspirational work (Graph API phases 1-10)

### Sprint Goals

1. **Accuracy**: Get task board to 95%+ accuracy with codebase reality
2. **Visibility**: Ensure all completed work is documented and marked complete
3. **Clarity**: Resolve duplicate task structures, establish single source of truth
4. **Distribution**: Balance work across all 6 agents appropriately
5. **Foundation**: Establish patterns for ongoing task hygiene (Charlie's weekly audits)

### Success Metrics

- [ ] All Phase 1-2 synthesis tasks marked complete
- [ ] All completed bug fixes documented as retrospective tasks
- [ ] All design documents tracked
- [ ] Duplicate task structures resolved
- [ ] Current Phase 3 work assigned to appropriate agents
- [ ] Future work (Graph API) properly categorized in backlog
- [ ] Task board accuracy verified at 95%+

---

## Phase Breakdown

### Phase 0: Preparation (15 minutes)
**Owner**: Becky
**Dependencies**: None
**Can run**: Immediately

Create sprint tracking infrastructure and baseline metrics.

### Phase 1: Mark Completed Work (30 minutes)
**Owner**: Charlie
**Dependencies**: Phase 0 complete
**Can run**: After Phase 0

Mark all synthesis Phase 1-2 tasks complete, document what was actually delivered.

### Phase 2: Retrospective Documentation (30 minutes)
**Owner**: Ella
**Dependencies**: None (runs parallel to Phase 1)
**Can run**: Immediately (parallel with Phase 1)

Create retrospective tasks for all undocumented completed work (bugs, design docs).

### Phase 3: Resolve Duplicates (20 minutes)
**Owner**: Becky
**Dependencies**: Phases 1-2 complete
**Can run**: After Phase 1 completes

Decide on canonical task structure, archive/delete duplicates.

### Phase 4: Assign Current Work (30 minutes)
**Owner**: Devon + Grace
**Dependencies**: Phase 3 complete
**Can run**: After Phase 3

Create and assign Phase 3 resource migration tasks, synthesizer integration tasks.

### Phase 5: Organize Backlog (20 minutes)
**Owner**: Felix
**Dependencies**: None (runs parallel)
**Can run**: Immediately (parallel with all phases)

Categorize future work, update priorities, clean up stale tasks.

### Phase 6: Validation (15 minutes)
**Owner**: Charlie
**Dependencies**: All phases complete
**Can run**: After Phases 1-5

Verify sprint goals met, calculate accuracy metrics, document patterns.

**Total Estimated Time**: 2.5 hours (with parallelization)

---

## Detailed Task Assignments

### Phase 0: Preparation - Becky (15 min)

**Tasks**:

1. **Create sprint tracking task** (5 min)
   ```bash
   npx dm task add \
     --title "Task Hygiene Sprint - Q4 2025" \
     --notes "Sprint to sync task board with reality. Target: 95%+ accuracy. See TASK_HYGIENE_SPRINT.md for details." \
     --tag priority:high \
     --tag agent:becky
   ```

2. **Document baseline metrics** (10 min)
   - Total tasks: 33 incomplete
   - Completed but unmarked: ~12 tasks (Phase 1-2 synthesis)
   - Undocumented work: 10+ items (bugs + docs)
   - Duplicate structures: 2 (old Phase 1 vs new Synthesis)
   - Agent distribution: Charlie=6, Others=0
   - Estimated accuracy: 35%

**Acceptance Criteria**:
- [ ] Sprint tracking task created
- [ ] Baseline metrics documented in sprint task notes
- [ ] TASK_HYGIENE_SPRINT.md in repository

---

### Phase 1: Mark Completed Work - Charlie (30 min)

**Context**: According to STOPPING_POINT.md, Phase 1 (Core Infrastructure) and Phase 2 (Template Splitting) are 100% complete with all deliverables implemented and tested.

**Tasks to Complete**:

#### 1A. Mark Phase 1 Subtasks Complete (15 min)

```bash
# Phase 1: Core Infrastructure & Interfaces (parent: 1211640559120498)
npx dm task complete 1211640559120498

# Individual completed tasks from STOPPING_POINT.md:
npx dm task complete 1211640735185080  # Design ResourceMetadata Interface (devon1) ✅
npx dm task complete 1211640390785571  # Implement SynthesisContext Class (devon2) ✅
npx dm task complete 1211640405897990  # Create TemplateAssignments Type System (devon3) ✅
npx dm task complete 1211640748790626  # Update Resource Base Class (devon4) ✅
```

**Verification for each**:
- ResourceMetadata: Check `packages/lib/src/synthesis/types.ts` lines 218-432
- SynthesisContext: Check `packages/lib/src/synthesis/context/synthesis-context.ts` + 39 passing tests
- TemplateAssignments: Check `packages/lib/src/synthesis/types.ts` lines 434-1016
- Resource base class: Check `packages/lib/src/core/resource.ts` toMetadata() and toArmTemplate()

#### 1B. Mark Phase 2 Subtasks Complete (15 min)

```bash
# Phase 2: Template Splitter Refactoring (parent: 1211640244407939)
npx dm task complete 1211640244407939

# Individual completed tasks:
npx dm task complete 1211640403392925  # Implement Metadata-Based Splitting (grace1) ✅
npx dm task complete 1211640411009307  # Refactor Synthesizer Pipeline (grace2) ✅
```

**Verification**:
- Template Splitter: Check `packages/lib/src/synthesis/assembly/template-splitter.ts` - V2 API with assignResources()
- Synthesizer: Check `packages/lib/src/synthesis/synthesizer.ts` - Infrastructure in place

#### 1C. Mark Completed Resource Migrations (10 min)

```bash
# Already marked complete per task get:
# ✅ 1211640749577354 - Migrate FunctionApp (devon5)
# ✅ 1211640720941924 - Migrate StorageAccount (devon6)

# Verify these are marked complete, if not:
npx dm task complete 1211640749577354  # FunctionApp migration
npx dm task complete 1211640720941924  # StorageAccount migration
```

#### 1D. Update Phase 3 Status (5 min)

```bash
# Get Phase 3 parent task ID and update status notes
npx dm task update 1211640578966534 \
  --notes "Phase 3 Resource Migration - 40% Complete. Migrated: FunctionApp, InlineFunction, StorageAccounts (L1+L2), ServerFarms (L1+L2). All use toMetadata() and context-aware toArmTemplate(). Remaining: ~6 resources (DatabaseAccounts, VirtualNetwork, NetworkSecurityGroup, KeyVault, ManagedIdentity). See STOPPING_POINT.md for details."
```

**Acceptance Criteria**:
- [ ] All Phase 1 subtasks marked complete
- [ ] All Phase 2 subtasks marked complete
- [ ] Phase 1-2 parent tasks marked complete
- [ ] Completed resource migrations verified
- [ ] Phase 3 status updated with accurate progress

**Notes to Add**: For each task, add reference to STOPPING_POINT.md lines showing completion evidence.

---

### Phase 2: Retrospective Documentation - Ella (30 min)

**Context**: Significant work completed without corresponding tasks. Need to document for project history and metrics.

#### 2A. Bug Fixes (15 min)

Create retrospective tasks for 3 fixed bugs:

```bash
# Bug #2: Duplicate App Settings
npx dm task add \
  --title "[RETROSPECTIVE] Fix: Duplicate App Settings in FunctionApp" \
  --notes "Fixed duplicate AzureWebJobsStorage and FUNCTIONS_WORKER_RUNTIME in function-app.ts. Root cause: Both constructor and user envVars added same keys. Solution: Reserved keys check before adding user envVars. See SYNTHESIS_ISSUES_ANALYSIS.md Bug #2. Status: COMPLETED 2025-10-14" \
  --tag type:bugfix \
  --tag agent:devon5 \
  --tag status:retrospective

npx dm task complete <task-id-from-above>

# Bug #3: Cross-Template dependsOn
npx dm task add \
  --title "[RETROSPECTIVE] Fix: Cross-Template dependsOn in InlineFunction" \
  --notes "Removed dependsOn from child resources in inline-function.ts. Issue: Child resources in linked templates referenced parent in different template. Solution: Remove dependsOn, ARM handles parent-child automatically. See SYNTHESIS_ISSUES_ANALYSIS.md Bug #3. Status: COMPLETED 2025-10-14" \
  --tag type:bugfix \
  --tag agent:devon5 \
  --tag status:retrospective

npx dm task complete <task-id-from-above>

# Bug #4: Invalid API Version
npx dm task add \
  --title "[RETROSPECTIVE] Fix: Invalid API Version in FunctionApp" \
  --notes "Fixed API version from 2025-01-01 → 2023-01-01 in function-app.ts line 272. Issue: Used future API version that doesn't exist. Solution: Use current stable API version. See SYNTHESIS_ISSUES_ANALYSIS.md Bug #4. Status: COMPLETED 2025-10-14" \
  --tag type:bugfix \
  --tag agent:devon5 \
  --tag status:retrospective

npx dm task complete <task-id-from-above>
```

#### 2B. Design Documents (15 min)

Create retrospective tasks for completed design docs:

```bash
# Gen2 Design Documents
npx dm task add \
  --title "[RETROSPECTIVE] Created: Gen2 Design Document Suite" \
  --notes "Created comprehensive Gen2 design documentation suite: atakora-gen2-design.md (main vision), atakora-gen2-define-api.md (API design), atakora-gen2-data-layer.md (data architecture), atakora-gen2-default-backend-infrastructure.md (infrastructure). Located in docs/design/architecture/. Status: COMPLETED 2025-10-14" \
  --tag type:documentation \
  --tag agent:becky \
  --tag status:retrospective

npx dm task complete <task-id-from-above>

# Synthesis Documentation
npx dm task add \
  --title "[RETROSPECTIVE] Created: Synthesis Analysis & Planning Docs" \
  --notes "Created SYNTHESIS_ISSUES_ANALYSIS.md (root cause analysis), STOPPING_POINT.md (current state), redesign_discussion.md (design evolution). These documents provide complete context for synthesis pipeline refactoring. Status: COMPLETED 2025-10-14" \
  --tag type:documentation \
  --tag agent:becky \
  --tag status:retrospective

npx dm task complete <task-id-from-above>

# Backwards Compatibility Implementation
npx dm task add \
  --title "[RETROSPECTIVE] Implemented: Backwards Compatible toMetadata()" \
  --notes "Implemented fallback-based backwards compatibility in Resource.toMetadata(). Changed from abstract to concrete method with automatic ARM-to-metadata conversion. Allows incremental migration without breaking changes. All 60+ resources work via fallback. See STOPPING_POINT.md Phase 'Backwards Compatibility'. Status: COMPLETED 2025-10-14" \
  --tag type:feature \
  --tag agent:devon4 \
  --tag status:retrospective

npx dm task complete <task-id-from-above>
```

**Acceptance Criteria**:
- [ ] 3 bug fix retrospective tasks created and completed
- [ ] 3 documentation retrospective tasks created and completed
- [ ] All retrospective tasks tagged with `status:retrospective`
- [ ] All retrospective tasks include file references and completion dates

---

### Phase 3: Resolve Duplicates - Becky (20 min)

**Context**: Old Phase 1 (1211633762838600) vs New Synthesis Refactor (1211640491521046) causing confusion.

#### 3A. Analyze Duplicate Structures (5 min)

Compare task structures:
- **Old Phase 1** (1211633762838600): "Core Infrastructure" - Linked templates focus
  - 5 subtasks: All marked complete ✅
  - Created earlier, different scope
- **New Synthesis** (1211640491521046): "Context-Aware ARM Generation" - Current refactoring
  - 6 phases: Phases 1-2 complete, Phase 3 in progress
  - More comprehensive, includes testing

**Decision**: Keep NEW structure (1211640491521046), archive OLD structure (1211633762838600)

#### 3B. Archive Old Phase 1 (10 min)

```bash
# Update old Phase 1 with deprecation note
npx dm task update 1211633762838600 \
  --notes "[ARCHIVED] This task structure has been superseded by task 1211640491521046 'Synthesis Pipeline Refactoring: Context-Aware ARM Generation'. All subtasks were completed as part of that newer, more comprehensive effort. This task is kept for historical reference only. See STOPPING_POINT.md for current state."

# Add archived tag
npx dm task update 1211633762838600 \
  --tag status:archived

# Move to backlog (out of active view)
# Note: This task is already in backlog, verify with dm task get
```

#### 3C. Establish Canonical Structure (5 min)

Document in sprint task:
- **Canonical synthesis work**: Task 1211640491521046 and its 6 phase subtasks
- **Phase 1-2**: Complete (mark as such in Phase 1)
- **Phase 3**: In progress (40% - 4 of 10 resources migrated)
- **Phase 4-6**: Pending (synthesizer integration, testing, L1 migrations)

**Acceptance Criteria**:
- [ ] Old Phase 1 task archived with explanation
- [ ] Canonical structure documented in sprint notes
- [ ] No confusion about which tasks are current

---

### Phase 4: Assign Current Work - Devon + Grace (30 min)

**Context**: Phase 3 resource migrations in progress (40% complete). Need to assign remaining work.

#### 4A. Create Remaining Resource Migration Tasks - Devon (20 min)

Based on STOPPING_POINT.md, priority resources to migrate:

```bash
# DatabaseAccounts (L2) - High Priority
npx dm task add \
  --title "Migrate DatabaseAccounts (L2) to Context-Aware Pattern" \
  --notes "Update packages/cdk/src/documentdb/cosmos-db.ts to implement toMetadata() and context-aware toArmTemplate(context?). Cosmos DB is heavily referenced by FunctionApp. Delegate to L1 construct (ArmDatabaseAccounts). Priority: HIGH - needed for Bug #1 fix. Parent: 1211640578966534" \
  --tag agent:devon7 \
  --tag priority:high \
  --tag phase:3-resource-migration

# ArmDatabaseAccounts (L1) - High Priority
npx dm task add \
  --title "Migrate ArmDatabaseAccounts (L1) to Context-Aware Pattern" \
  --notes "Update packages/cdk/src/documentdb/cosmos-db-arm.ts to implement toMetadata() (foundation tier, highly referenced, ~2KB size estimate) and context-aware toArmTemplate(context?). Required for L2 DatabaseAccounts migration. Priority: HIGH. Parent: 1211640578966534" \
  --tag agent:devon7 \
  --tag priority:high \
  --tag phase:3-resource-migration

# VirtualNetwork - Medium Priority
npx dm task add \
  --title "Migrate VirtualNetwork to Context-Aware Pattern" \
  --notes "Update packages/cdk/src/network/virtual-network.ts to implement toMetadata() (foundation tier, no dependencies) and context-aware toArmTemplate(context?). Size estimate: ~1.5KB. Priority: MEDIUM. Parent: 1211640578966534" \
  --tag agent:devon8 \
  --tag priority:medium \
  --tag phase:3-resource-migration

# NetworkSecurityGroup - Medium Priority
npx dm task add \
  --title "Migrate NetworkSecurityGroup to Context-Aware Pattern" \
  --notes "Update packages/cdk/src/network/network-security-group.ts to implement toMetadata() (foundation tier, network dependencies) and context-aware toArmTemplate(context?). Size estimate: ~1KB. Priority: MEDIUM. Parent: 1211640578966534" \
  --tag agent:devon8 \
  --tag priority:medium \
  --tag phase:3-resource-migration

# KeyVault - Medium Priority
npx dm task add \
  --title "Migrate KeyVault to Context-Aware Pattern" \
  --notes "Update packages/cdk/src/keyvault/key-vault.ts to implement toMetadata() (security tier, foundation) and context-aware toArmTemplate(context?). Size estimate: ~2KB. Priority: MEDIUM. Parent: 1211640578966534" \
  --tag agent:devon9 \
  --tag priority:medium \
  --tag phase:3-resource-migration

# ManagedIdentity - High Priority
npx dm task add \
  --title "Migrate ManagedIdentity to Context-Aware Pattern" \
  --notes "Update packages/cdk/src/identity/managed-identity.ts to implement toMetadata() (foundation tier, highly referenced for RBAC) and context-aware toArmTemplate(context?). Needed for Bug #1 fix (${managedIdentityClientId}). Size estimate: ~0.5KB. Priority: HIGH. Parent: 1211640578966534" \
  --tag agent:devon9 \
  --tag priority:high \
  --tag phase:3-resource-migration
```

#### 4B. Create Synthesizer Integration Tasks - Grace (10 min)

```bash
# Synthesizer 4-Phase Pipeline Integration
npx dm task add \
  --title "Integrate 4-Phase Pipeline in Synthesizer" \
  --notes "Implement new synthesis pipeline in packages/lib/src/synthesis/synthesizer.ts. Methods: collectMetadata(), assignTemplates(), generateArmWithContext(), writeTemplatesV2(). See STOPPING_POINT.md 'Option 2: Integrate Synthesizer Pipeline' for implementation guide. Maintains backwards compatibility. Parent: 1211640571950771" \
  --tag agent:grace3 \
  --tag priority:high \
  --tag phase:3-synthesizer

# End-to-End Testing
npx dm task add \
  --title "End-to-End Synthesis Testing with CRUD Backend" \
  --notes "Test new synthesis pipeline with existing CRUD backend. Verify: No unresolved placeholders (Bug #1 fixed), No duplicate app settings, Cross-template references work, Templates validate with Azure CLI. Generate and validate all templates. Document results. Parent: 1211640495227469" \
  --tag agent:charlie2 \
  --tag priority:high \
  --tag phase:6-testing
```

**Acceptance Criteria**:
- [ ] 6 resource migration tasks created (DatabaseAccounts L1+L2, VirtualNetwork, NSG, KeyVault, ManagedIdentity)
- [ ] 2 synthesizer tasks created (pipeline integration, E2E testing)
- [ ] All tasks linked to appropriate parent phases
- [ ] Priority levels assigned based on bug fixes and criticality

---

### Phase 5: Organize Backlog - Felix (20 min)

**Context**: 98 incomplete tasks, many future/aspirational. Need to categorize and prioritize.

#### 5A. Tag Future Work (10 min)

```bash
# Tag all Graph API phases as future work
npx dm task update 1211551703810300 --tag status:future --tag phase:graph-api
npx dm task update 1211551668578616 --tag status:future --tag phase:graph-api
npx dm task update 1211551703792649 --tag status:future --tag phase:graph-api
npx dm task update 1211551668448717 --tag status:future --tag phase:graph-api
npx dm task update 1211552355129351 --tag status:future --tag phase:graph-api
npx dm task update 1211552355104174 --tag status:future --tag phase:graph-api
npx dm task update 1211552194506921 --tag status:future --tag phase:graph-api
npx dm task update 1211552068490903 --tag status:future --tag phase:graph-api
npx dm task update 1211552200444130 --tag status:future --tag phase:graph-api
npx dm task update 1211552200976708 --tag status:future --tag phase:graph-api

# Tag Schema work as backlog (blocked on current synthesis work)
npx dm task update 1211631692410761 --tag status:backlog
npx dm task update 1211631586976768 --tag status:backlog
npx dm task update 1211631695885118 --tag status:backlog
npx dm task update 1211631596181434 --tag status:backlog
npx dm task update 1211631729613934 --tag status:backlog
npx dm task update 1211631443337112 --tag status:backlog
npx dm task update 1211631600032697 --tag status:backlog
```

#### 5B. Prioritize Current Work (10 min)

Update priorities based on synthesis work:

```bash
# High priority: Current synthesis work
npx dm task update 1211640491521046 --tag priority:critical  # Synthesis parent
npx dm task update 1211640578966534 --tag priority:high      # Phase 3 resources
npx dm task update 1211640571950771 --tag priority:high      # Phase 4 synthesizer
npx dm task update 1211640495227469 --tag priority:high      # Phase 6 testing

# Medium priority: Post-synthesis work
npx dm task update 1211640574272730 --tag priority:medium    # Phase 5 L1 migrations
npx dm task update 1211640244407939 --tag priority:low       # Phase 2 (complete)
npx dm task update 1211640559120498 --tag priority:low       # Phase 1 (complete)

# Update CLI/architecture tasks (important but not blocking)
npx dm task update 1211549571919682 --tag priority:high      # State management
npx dm task update 1211549698215587 --tag priority:medium    # Deployment orchestration
npx dm task update 1211549798662376 --tag priority:medium    # Multi-env config
```

**Acceptance Criteria**:
- [ ] All Graph API phases tagged as `status:future`
- [ ] Schema tasks tagged as `status:backlog`
- [ ] Current synthesis work tagged with appropriate priorities
- [ ] Clear separation between active/future work

---

### Phase 6: Validation - Charlie (15 min)

**Context**: Verify sprint goals achieved and establish ongoing hygiene patterns.

#### 6A. Calculate Accuracy Metrics (10 min)

Run validation checks:

```bash
# Get all tasks and analyze
npx dm list -i > /tmp/tasks_after_sprint.txt

# Calculate metrics:
# - Total incomplete tasks (should be ~90-95, reduced from 98)
# - Completed tasks marked (should be +12 from baseline)
# - Tasks with retrospective tag (should be 6)
# - Tasks with agent assignments (should be balanced)
# - Tasks with status tags (active/future/backlog/archived)
```

Manual validation checklist:
- [ ] Phase 1 synthesis: All 4 subtasks marked complete
- [ ] Phase 2 synthesis: All 2 subtasks marked complete
- [ ] Bug fixes: 3 retrospective tasks created and completed
- [ ] Design docs: 3 retrospective tasks created and completed
- [ ] Duplicate Phase 1: Archived with explanation
- [ ] New resource migrations: 6 tasks created and assigned
- [ ] Synthesizer integration: 2 tasks created and assigned
- [ ] Graph API: 10 phases tagged as future
- [ ] Agent distribution: Devon (6), Grace (2), Charlie (2), Felix (7), Ella (3), Becky (3)

#### 6B. Document Patterns for Weekly Audits (5 min)

Create guidance for Charlie's weekly audit responsibility:

```bash
npx dm task add \
  --title "Weekly Task Hygiene Audit - Template" \
  --notes "Charlie's weekly audit checklist:
1. Review completed work in git history (git log --since='1 week ago' --oneline)
2. Check for completed work without tasks (search STOPPING_POINT.md, analyze recent commits)
3. Mark completed tasks (npx dm task complete <id>)
4. Create retrospective tasks for undocumented work
5. Update task status/progress notes
6. Verify agent workload distribution
7. Tag stale tasks (no activity >2 weeks) for review
8. Calculate weekly accuracy metric
9. Report findings in weekly standup

Target: Maintain 90%+ accuracy week-over-week" \
  --tag agent:charlie \
  --tag type:recurring \
  --tag priority:medium
```

**Acceptance Criteria**:
- [ ] Accuracy metrics calculated and documented
- [ ] All validation checks passed
- [ ] Weekly audit template task created
- [ ] Sprint results documented in sprint task

---

## Sprint Execution Timeline

### Parallel Execution Plan

**Time 0:00 - 0:15** (Preparation)
- Becky: Phase 0 (Preparation)

**Time 0:15 - 0:45** (Parallel Work)
- Charlie: Phase 1 (Mark Completed Work) - 30 min
- Ella: Phase 2 (Retrospective Documentation) - 30 min
- Felix: Phase 5 (Organize Backlog) - 20 min

**Time 0:45 - 1:05** (Resolution)
- Becky: Phase 3 (Resolve Duplicates) - 20 min

**Time 1:05 - 1:35** (Assignment)
- Devon: Phase 4A (Resource Migrations) - 20 min
- Grace: Phase 4B (Synthesizer Tasks) - 10 min

**Time 1:35 - 1:50** (Validation)
- Charlie: Phase 6 (Validation) - 15 min

**Total Wall Time**: 1 hour 50 minutes (with perfect parallelization)
**Total Work Time**: 2 hours 40 minutes (sum of all individual work)

---

## Command Reference Sheet

### Frequently Used Commands

```bash
# View all incomplete tasks
npx dm list -i

# View subtasks for a parent
npx dm subtask list <parent-task-id>

# Get task details
npx dm task get <task-id>

# Mark task complete
npx dm task complete <task-id>

# Update task notes
npx dm task update <task-id> --notes "Updated notes here"

# Add tag to task
npx dm task update <task-id> --tag tagname

# Create new task
npx dm task add \
  --title "Task title" \
  --notes "Task description" \
  --tag agent:name \
  --tag priority:level

# Create new subtask
npx dm subtask add <parent-task-id> \
  --title "Subtask title" \
  --notes "Subtask description"

# Delete task (use sparingly - prefer archive)
npx dm task delete <task-id>
```

---

## Agent Assignments Summary

| Agent | Tasks | Phase | Priority |
|-------|-------|-------|----------|
| **Becky** | 3 | 0, 3 | Preparation, Resolve Duplicates, Oversight |
| **Charlie** | 3 | 1, 6 | Mark Completed, Validation, E2E Testing |
| **Ella** | 1 | 2 | Retrospective Documentation |
| **Devon** | 6 | 4A | Resource Migrations (DatabaseAccounts, VNet, NSG, KeyVault, ManagedIdentity) |
| **Grace** | 2 | 4B | Synthesizer Integration, Pipeline Work |
| **Felix** | 1 | 5 | Backlog Organization |

**Total**: 16 sprint tasks across 6 agents

---

## Risk Mitigation

### Potential Issues

1. **Task ID lookups fail**: Some tasks may have been deleted
   - Mitigation: Use `npx dm list -i` to verify IDs before operating on them
   - Fallback: Skip that specific task, document in sprint notes

2. **Completed tasks already marked**: Some tasks may already be complete
   - Mitigation: `task complete` is idempotent, safe to re-run
   - Verify with `task get` first

3. **Agent availability**: Not all agents may be available
   - Mitigation: Tasks within each phase can be done by any agent
   - Becky can reassign if needed

4. **Time overruns**: Phases may take longer than estimated
   - Mitigation: Core phases (1-3) are minimum viable sprint
   - Phases 4-5 can be deferred to follow-up

---

## Success Criteria Checklist

### Must-Have (Sprint Cannot Complete Without These)

- [ ] All Phase 1 synthesis subtasks (4 tasks) marked complete
- [ ] All Phase 2 synthesis subtasks (2 tasks) marked complete
- [ ] Phase 1-2 parent tasks marked complete
- [ ] Old Phase 1 structure archived with explanation
- [ ] Canonical structure documented
- [ ] Baseline metrics calculated
- [ ] Final accuracy metrics calculated

### Should-Have (High Value)

- [ ] 3 bug fix retrospective tasks created
- [ ] 3 documentation retrospective tasks created
- [ ] 6 resource migration tasks created and assigned
- [ ] 2 synthesizer integration tasks created
- [ ] Graph API tasks tagged as future work
- [ ] Weekly audit template created

### Nice-to-Have (Lower Priority)

- [ ] Schema tasks categorized
- [ ] All priorities updated
- [ ] Agent workload balanced
- [ ] Sprint learnings documented

---

## Post-Sprint Actions

### Immediate (Within 24 hours)

1. **Share Results**: Post sprint summary to team
2. **Update STOPPING_POINT.md**: Note that task hygiene sprint completed
3. **Archive Sprint Document**: Move to `docs/project/sprints/task-hygiene-2025-10-28.md`

### Near-Term (Within 1 week)

1. **First Weekly Audit**: Charlie runs first audit using template
2. **Resource Migrations**: Devon begins high-priority migrations (DatabaseAccounts, ManagedIdentity)
3. **Synthesizer Integration**: Grace begins 4-phase pipeline work

### Ongoing

1. **Weekly Audits**: Charlie runs audit every Monday
2. **Accuracy Monitoring**: Track accuracy metric trend (target: maintain 90%+)
3. **Pattern Refinement**: Adjust audit checklist based on what works

---

## Appendix: Task ID Quick Reference

### Completed Tasks (To Mark in Phase 1)

| Task ID | Description | Agent |
|---------|-------------|-------|
| 1211640735185080 | Design ResourceMetadata Interface | devon1 |
| 1211640390785571 | Implement SynthesisContext Class | devon2 |
| 1211640405897990 | Create TemplateAssignments Type System | devon3 |
| 1211640748790626 | Update Resource Base Class | devon4 |
| 1211640403392925 | Implement Metadata-Based Splitting | grace1 |
| 1211640411009307 | Refactor Synthesizer Pipeline | grace2 |
| 1211640749577354 | Migrate FunctionApp | devon5 |
| 1211640720941924 | Migrate StorageAccount | devon6 |

### Phase Parent Tasks

| Task ID | Description | Status |
|---------|-------------|--------|
| 1211640491521046 | Synthesis Pipeline Refactoring (NEW) | Active |
| 1211633762838600 | Phase 1: Core Infrastructure (OLD) | Archive |
| 1211640559120498 | Phase 1 (New Structure) | Complete |
| 1211640244407939 | Phase 2 (New Structure) | Complete |
| 1211640578966534 | Phase 3 (New Structure) | In Progress |
| 1211640571950771 | Phase 4 (New Structure) | Pending |
| 1211640574272730 | Phase 5 (New Structure) | Pending |
| 1211640495227469 | Phase 6 (New Structure) | Pending |

### Graph API Tasks (Tag as Future)

| Task ID | Description |
|---------|-------------|
| 1211551703810300 | Phase 1: Graph Foundation |
| 1211551668578616 | Phase 2: Core Graph Constructs |
| 1211551703792649 | Phase 3: Enhanced Graph Constructs |
| 1211551668448717 | Phase 4: Graph + ARM Integration |
| 1211552355129351 | Phase 5: Windows 365 Cloud PC |
| 1211552355104174 | Phase 6: Intune Device Management |
| 1211552194506921 | Phase 7: Unified Endpoint Management |
| 1211552068490903 | Phase 8: Identity Governance & Zero Trust |
| 1211552200444130 | Phase 9: Microsoft Defender & Security |
| 1211552200976708 | Phase 10: Complete Zero Trust Stack |

---

## Version History

- **v1.0** - 2025-10-28 - Initial sprint plan (Becky)

---

**Sprint Owner**: Becky (Staff Architect)
**Questions/Issues**: Add to sprint tracking task notes
**Status**: Ready to Execute
