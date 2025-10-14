# Linked Templates Implementation - Task Breakdown

## Overview
Complete task hierarchy for implementing linked templates as the default ARM synthesis approach.
**Total: 4 Milestones, 26 Subtasks across 6 weeks**

---

## 📍 Phase 1: Core Infrastructure (Weeks 1-2)
**Milestone ID:** `1211633762838600`
**Status:** Not Started
**Agent Distribution:** Devon (4 tasks), Felix (1 task)

### Subtasks (5):
1. **Implement Template Splitter Component** [`1211633767269465`]
   - **Agent:** devon-developer
   - **File:** `packages/lib/src/synthesis/assembly/template-splitter.ts`
   - **Key Methods:** split(), categorizeResources(), buildDependencyGraph()

2. **Implement Function Packager Component** [`1211633767601435`]
   - **Agent:** devon-developer
   - **File:** `packages/lib/src/synthesis/assembly/function-packager.ts`
   - **Key Methods:** package(), generateFunctionJson(), createZipPackage()

3. **Update Synthesizer for Linked Templates** [`1211634077622990`]
   - **Agent:** devon-developer
   - **File:** `packages/lib/src/synthesis/synthesizer.ts`
   - **Updates:** Integrate splitter/packager, manifest v2.0.0

4. **Update InlineFunction for Package Mode** [`1211633767907201`]
   - **Agent:** devon-developer
   - **File:** `packages/cdk/src/functions/inline-function.ts`
   - **Changes:** Add packageMode prop, WEBSITE_RUN_FROM_PACKAGE setting

5. **Create TypeScript Types for Linked Templates** [`1211633768056796`]
   - **Agent:** felix-schema-validator
   - **File:** `packages/lib/src/synthesis/types.ts`
   - **New Types:** LinkedTemplateSet, FunctionPackage, ArtifactManifest

---

## 📍 Phase 2: Deployment Orchestration (Weeks 3-4)
**Milestone ID:** `1211634072215086`
**Status:** Not Started
**Agent Distribution:** Grace (4 tasks), Felix (1 task), Devon (1 task)

### Subtasks (6):
1. **Implement Artifact Storage Manager** [`1211633768601452`]
   - **Agent:** grace-synthesis-cli
   - **File:** `packages/lib/src/synthesis/storage/artifact-storage.ts`
   - **Responsibilities:** Storage provisioning, blob management, SAS tokens

2. **Implement Artifact Uploader** [`1211633768730674`]
   - **Agent:** grace-synthesis-cli
   - **File:** `packages/cli/src/deployment/artifact-uploader.ts`
   - **Methods:** uploadAll(), uploadTemplate(), uploadPackage()

3. **Update Deploy Command for Linked Templates** [`1211633895261209`]
   - **Agent:** grace-synthesis-cli
   - **File:** `packages/cli/src/commands/deploy/index.ts`
   - **Changes:** Upload phase, manifest v2 parsing, parallel uploads

4. **Implement Deployment Orchestrator** [`1211633769065361`]
   - **Agent:** grace-synthesis-cli
   - **File:** `packages/cli/src/deployment/orchestrator.ts`
   - **Phases:** Prepare → Upload → Deploy → Validate

5. **Update Manifest Schema Validator** [`1211634079275778`]
   - **Agent:** felix-schema-validator
   - **File:** `packages/cli/src/manifest/validator.ts`
   - **Changes:** Validate manifest v2.0.0, backward compatibility

6. **Create Storage Account ARM Template** [`1211633896703623`]
   - **Agent:** devon-developer
   - **File:** `packages/lib/src/synthesis/templates/storage-account-template.ts`
   - **Purpose:** Auto-provision artifact storage

---

## 📍 Phase 3: Testing & Validation (Week 5)
**Milestone ID:** `1211634073008096`
**Status:** Not Started
**Agent Distribution:** Charlie (6 tasks)

### Subtasks (6):
1. **Unit Tests for Template Splitter** [`1211633896343970`]
   - **Agent:** charlie-quality-lead
   - **File:** `packages/lib/src/synthesis/assembly/__tests__/template-splitter.test.ts`
   - **Coverage Target:** 90%+

2. **Unit Tests for Function Packager** [`1211634079619252`]
   - **Agent:** charlie-quality-lead
   - **File:** `packages/lib/src/synthesis/assembly/__tests__/function-packager.test.ts`
   - **Coverage Target:** 90%+

3. **Integration Tests for Synthesis Pipeline** [`1211633770038326`]
   - **Agent:** charlie-quality-lead
   - **File:** `packages/lib/src/synthesis/__tests__/integration/linked-templates.test.ts`
   - **Tests:** Full synthesis with 11MB template

4. **Integration Tests for Deployment Pipeline** [`1211633896012932`]
   - **Agent:** charlie-quality-lead
   - **File:** `packages/cli/src/commands/deploy/__tests__/linked-templates.test.ts`
   - **Tests:** Upload, deployment, orchestration

5. **End-to-End Tests with Real Azure** [`1211634079390307`]
   - **Agent:** charlie-quality-lead
   - **File:** `packages/cli/src/__tests__/e2e/linked-templates-deployment.test.ts`
   - **Tests:** Full deployment to real Azure subscription

6. **Performance Testing and Benchmarks** [`1211634079157456`]
   - **Agent:** charlie-quality-lead
   - **File:** `packages/lib/src/synthesis/__tests__/performance/benchmarks.test.ts`
   - **Target:** <30s for 11MB template

---

## 📍 Phase 4: Documentation & Release (Week 6)
**Milestone ID:** `1211634073463361`
**Status:** Not Started
**Agent Distribution:** Ella (7 tasks)

### Subtasks (7):
1. **Create User Documentation for Linked Templates** [`1211633898158264`]
   - **Agent:** ella-docs
   - **File:** `docs/guides/linked-templates.md`
   - **Content:** Architecture, benefits, how it works

2. **Create Migration Guide from v1 to v2** [`1211633770872609`]
   - **Agent:** ella-docs
   - **File:** `docs/guides/migration-v1-to-v2.md`
   - **Content:** Breaking changes, migration steps

3. **Update API Reference Documentation** [`1211634080490255`]
   - **Agent:** ella-docs
   - **Files:** `docs/api/synthesis.md`, `docs/api/deployment.md`
   - **Content:** New classes and methods

4. **Create Deployment Troubleshooting Guide** [`1211634078937336`]
   - **Agent:** ella-docs
   - **File:** `docs/guides/troubleshooting-deployment.md`
   - **Content:** Common errors and solutions

5. **Update README and Getting Started** [`1211634082083036`]
   - **Agent:** ella-docs
   - **Files:** `README.md`, `docs/getting-started.md`
   - **Changes:** Reflect new default behavior

6. **Create Release Notes for v2.0.0** [`1211633897303086`]
   - **Agent:** ella-docs
   - **File:** `CHANGELOG.md`
   - **Content:** Breaking changes, features, migration

7. **Create Architecture Diagrams** [`1211633771464902`]
   - **Agent:** ella-docs
   - **Location:** `docs/design/architecture/diagrams/`
   - **Diagrams:** Splitting, packaging, deployment flows

---

## Agent Workload Summary

| Agent | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Total |
|-------|---------|---------|---------|---------|-------|
| **devon-developer** | 4 | 1 | 0 | 0 | **5** |
| **grace-synthesis-cli** | 0 | 4 | 0 | 0 | **4** |
| **felix-schema-validator** | 1 | 1 | 0 | 0 | **2** |
| **charlie-quality-lead** | 0 | 0 | 6 | 0 | **6** |
| **ella-docs** | 0 | 0 | 0 | 7 | **7** |
| **becky-staff-architect** | Architecture complete | - | - | - | **-** |

---

## Quick Reference Commands

### View All Tasks by Agent
```bash
npx dm list --agent devon-developer -i
npx dm list --agent grace-synthesis-cli -i
npx dm list --agent felix-schema-validator -i
npx dm list --agent charlie-quality-lead -i
npx dm list --agent ella-docs -i
```

### View Subtasks for a Phase
```bash
npx dm subtask list 1211633762838600  # Phase 1
npx dm subtask list 1211634072215086  # Phase 2
npx dm subtask list 1211634073008096  # Phase 3
npx dm subtask list 1211634073463361  # Phase 4
```

### Complete a Task
```bash
npx dm task complete <taskId>
```

### View Task Details
```bash
npx dm task get <taskId>
```

---

## Key Dependencies

**Phase 1 → Phase 2:**
- TemplateSplitter and FunctionPackager must be complete before deployment orchestration

**Phase 2 → Phase 3:**
- All deployment components must exist before testing

**Phase 3 → Phase 4:**
- Tests should pass before documentation finalization

---

## Success Criteria

- ✅ **Phase 1:** Can synthesize linked templates and function packages
- ✅ **Phase 2:** Can deploy to Azure with artifact upload
- ✅ **Phase 3:** 90%+ test coverage, all tests passing
- ✅ **Phase 4:** Complete documentation, ready for release

---

## Related Documentation

- Architecture: `docs/design/architecture/linked-templates-architecture.md`
- ADR-016: `docs/design/architecture/adr-016-linked-templates-default.md`
- Splitting Strategy: `docs/design/architecture/template-splitting-strategy.md`
- Function Pattern: `docs/design/architecture/function-deployment-pattern.md`
- Implementation Roadmap: `docs/design/architecture/linked-templates-implementation-roadmap.md`
- Storage Strategy: `docs/design/architecture/artifact-storage-strategy.md`
- ADR-003: `docs/design/architecture/adr-003-deployment-orchestration.md`
