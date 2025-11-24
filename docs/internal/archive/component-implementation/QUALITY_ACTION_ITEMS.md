# Quality Assessment - Action Items Checklist

## @atakora/component Package

**Generated:** November 21, 2025 | **Owner:** Project Team | **Timeline:** 2-3 weeks

---

## PRIORITY 1: CRITICAL (BLOCKING) 🔴

### P1.1 - Fix TypeScript Build Errors (241 errors)

**Owner:** Devon | **Effort:** 2-3 days | **Status:** 🔴 BLOCKING

**Type Constraint Errors (~90 errors):**

- [ ] Fix generic type constraints in `backend/schema-integration.ts`
  - Type 'TSchema' does not satisfy constraint 'SchemaDefinitionInput'
  - Type 'A' does not satisfy constraint 'AuthDefinition'
- [ ] Fix generic constraints in `backend/define-backend.ts`
- [ ] Fix type constraints in `backend/types.ts`

**Missing Module Errors (~30 errors):**

- [ ] Install `jose` dependency (JWT library)
  ```bash
  npm install jose
  ```
- [ ] Fix missing exports in `backend/index.ts`:
  - IBackendComponent
  - IComponentDefinition
  - IResourceRequirement
  - ResourceMap
  - ValidationResult
  - ComponentOutputs
  - isBackendManaged

**API Mismatch Errors (~40 errors):**

- [ ] Update `auth/audit-integration-example.ts`:
  - Change `tenantId` → `tenant`
  - Change `build()` → `_build()`
- [ ] Update `auth/example-session-mfa.ts`:
  - Fix implicit `any` type for `groupId` parameter
  - Fix property access on `AuthProviderConfig`

**Type Assignment Errors (~50 errors):**

- [ ] Fix `events/queue-builder.ts` API calls
- [ ] Fix `events/service-bus-queue-builder.ts` API calls
- [ ] Fix `events/service-bus-topic-builder.ts` API calls
- [ ] Fix `common/builder.ts` type assignments

**Property Initialization Errors (~10 errors):**

- [ ] Fix `common/duration.ts` - initialize properties
- [ ] Fix `common/size.ts` - initialize properties
- [ ] Fix `common/threshold.ts` - initialize properties

**Verification:**

```bash
npm run build
# Should complete with 0 errors
```

---

### P1.2 - Resolve Security Vulnerabilities (4 found)

**Owner:** Charlie | **Effort:** 2 hours | **Status:** 🔴 HIGH PRIORITY

**Immediate Fixes:**

- [ ] Fix HIGH severity `glob` vulnerability
  ```bash
  npm audit fix
  ```
- [ ] Fix MODERATE `js-yaml` vulnerability (included in audit fix)
- [ ] Fix MODERATE `vite` vulnerability (included in audit fix)

**Breaking Change (Test Separately):**

- [ ] Test `esbuild` 0.24.2 → 0.27.0 upgrade
  - Create separate PR
  - Test build in packages/cdk
  - Test build in packages/lib
  - Merge if tests pass

**Add to CI:**

- [ ] Add `npm audit` check to CI pipeline
  ```yaml
  - name: Security Audit
    run: npm audit --audit-level=moderate
  ```

**Verification:**

```bash
npm audit --audit-level=moderate
# Should show 0 vulnerabilities
```

---

### P1.3 - Increase Test Coverage to 80% (Current: 45.85%)

**Owner:** Charlie + Devon | **Effort:** 4-6 days | **Status:** 🔴 CRITICAL

**Backend Module (43.79% → 80%) - 145 tests needed:**

- [ ] `backend/builder.ts` (0% → 80%) - 40 tests
  - Component builder API
  - Component attachment flow
  - Resource requirement validation
  - Configuration merging
  - Error cases

- [ ] `backend/backend.ts` (0% → 80%) - 30 tests
  - Backend assembly
  - Component registration
  - Resource resolution
  - Dependency injection
  - Integration scenarios

- [ ] `backend/registry.ts` (0% → 80%) - 25 tests
  - Component registration
  - Component lookup
  - Dependency resolution
  - Circular dependency detection
  - Error handling

- [ ] `backend/logger.ts` (0% → 80%) - 15 tests
  - Logging levels
  - Log formatting
  - Context propagation
  - Performance impact

- [ ] `backend/utils.ts` (0% → 80%) - 20 tests
  - Utility functions
  - Helper methods
  - Edge cases

- [ ] `backend/errors.ts` (0% → 80%) - 15 tests
  - Error creation
  - Error types
  - Error serialization
  - Stack traces

**Schema Module (45.92% → 80%) - 55 tests needed:**

- [ ] `schema/field-types/object.ts` (29.67% → 80%) - 30 tests
  - Nested object fields
  - Object validation
  - Object serialization
  - Deep nesting
  - Circular references

- [ ] `schema/unified-types.ts` (32.69% → 80%) - 25 tests
  - Type unification
  - Type migration
  - Legacy compatibility
  - Edge cases

**Auth Module (56.25% → 80%) - 35 tests needed:**

- [ ] `auth/token-validator.ts` (53.66% → 80%) - 20 tests
  - JWT validation edge cases
  - Token expiration scenarios
  - Signature verification
  - Malformed tokens
  - Performance benchmarks

- [ ] `auth/providers/base.ts` (16.66% → 80%) - 15 tests
  - Base provider functionality
  - Provider lifecycle
  - Provider configuration
  - Inheritance patterns

**Verification:**

```bash
npm run test:coverage
# Check: Overall coverage ≥ 80%
```

---

## PRIORITY 2: IMPORTANT (SHOULD FIX SOON) 🟡

### P2.1 - Consolidate Dependency Versions

**Owner:** Charlie | **Effort:** 4 hours | **Status:** 🟡 INCONSISTENCY

- [ ] Standardize `vitest` version
  - Component package: 1.2.0 → 3.2.4
  - Update package.json
  - Update vitest.config.ts if needed

- [ ] Standardize `@types/node` version
  - Component package: 20.19.21 → 24.10.1
  - Test for breaking changes

- [ ] Consolidate `esbuild` versions
  - Remove duplicate installations (0.19.12, 0.25.10)
  - Use single version from workspace root

- [ ] Move common dev dependencies to workspace root
  - Update root package.json
  - Remove from individual package.json files

- [ ] Update Azure SDK packages
  - [ ] @azure/cosmos: 4.6.0 → 4.8.0
  - [ ] @azure/functions: 4.8.0 → 4.9.0
  - [ ] Test for breaking changes

**Verification:**

```bash
npm outdated
# Should show minimal version drift
```

---

### P2.2 - Fix Linting Errors in Documentation

**Owner:** Ella (Documentation) | **Effort:** 2 hours | **Status:** 🟡 DOC QUALITY

- [ ] Fix `docs/architecture/decisions/supporting/backend-examples.ts`:
  - [ ] Fix 32 Prettier formatting errors (add missing commas)
  - [ ] Fix 3 undefined variables (ServiceBusProvider, EventHubProvider, KeyVaultProvider)
  - [ ] Fix 2 unused variable warnings (ResourceGroupStack, BackendConfig)

- [ ] Update examples to match current API:
  - [ ] Verify all code examples compile
  - [ ] Update deprecated API calls
  - [ ] Test examples manually

- [ ] Reorganize example files:
  - [ ] Move to `docs/examples/` directory
  - [ ] Update vitest.config.ts to exclude from coverage
  - [ ] Update tsconfig.json exclude patterns

**Verification:**

```bash
npm run lint
# Should pass with 0 errors
```

---

### P2.3 - Implement Size Monitoring

**Owner:** Charlie | **Effort:** 4 hours | **Status:** 🟡 TRACKING | **Task ID:** [1211611448533360]

- [ ] Install `size-limit` package

  ```bash
  npm install -D size-limit @size-limit/preset-small-lib
  ```

- [ ] Configure size budgets in `package.json`:

  ```json
  "size-limit": [
    {
      "path": "dist/index.js",
      "limit": "500 KB",
      "gzip": true
    }
  ]
  ```

- [ ] Add size check script:

  ```json
  "scripts": {
    "size": "size-limit",
    "size:why": "size-limit --why"
  }
  ```

- [ ] Add size check to CI pipeline

- [ ] Add size badge to README

- [ ] Set up size reporting on PRs

**Verification:**

```bash
npm run size
# Should show bundle sizes under budget
```

---

### P2.4 - Convert TODOs to GitHub Issues

**Owner:** Becky (Architect) | **Effort:** 2 hours | **Status:** 🟡 TRACKING

**Production Code TODOs (20 found):**

- [ ] `web/static-site-with-cdn.ts` (3 TODOs)
  - Create issue: "Add static website configuration to StorageAccounts L2"
  - Create issue: "Add CORS configuration support"
  - Create issue: "Get actual resource group name from parent stack"

- [ ] `messaging/message-queue.ts` (4 TODOs)
  - Create issue: "Add Application Insights integration to message queue"
  - Create issue: "Add diagnostic settings for queue metrics"
  - Create issue: "Configure queue monitoring alerts"

- [ ] `data/data-stack.ts` (4 TODOs)
  - Create issue: "Complete Cosmos DB constructs in @atakora/cdk"
  - Create issue: "Complete Service Bus constructs in @atakora/cdk"
  - Create issue: "Complete Function App constructs"
  - Create issue: "Complete SignalR constructs"

- [ ] `functions/functions-app.ts` (2 TODOs)
  - Create issue: "Add Application Insights to function apps"
  - Create issue: "Fix SKU types in ServerFarmsProps"

- [ ] `crud/crud-api.ts` (4 TODOs)
  - Create issue: "Return APIM endpoint from CRUD API"
  - Create issue: "Create individual function definitions for CRUD ops"
  - Create issue: "Grant Cosmos DB RBAC to function apps"
  - Create issue: "Configure API Management integration"

**Update code comments:**

```typescript
// TODO: Add CORS support
// → TODO(#123): Add CORS support
```

---

## PRIORITY 3: NICE-TO-HAVE (FUTURE) ⚪

### P3.1 - Set Up API Documentation Generation

**Owner:** Ella | **Effort:** 1 day | **Status:** ⚪ ENHANCEMENT

- [ ] Choose tool: TypeDoc or API Extractor
- [ ] Install and configure
- [ ] Generate initial docs
- [ ] Set up GitHub Pages deployment
- [ ] Add to CI pipeline
- [ ] Link from main README

---

### P3.2 - Expand Performance Benchmarks

**Owner:** Charlie | **Effort:** 1 day | **Status:** ⚪ PERFORMANCE

- [ ] Create `schema/field-types/field-types.bench.ts`
- [ ] Create `auth/providers/auth-providers.bench.ts`
- [ ] Create `backend/backend-assembly.bench.ts`
- [ ] Add benchmark CI job
- [ ] Track performance over time

---

### P3.3 - Add Circular Dependency Check

**Owner:** Charlie | **Effort:** 2 hours | **Status:** ⚪ CODE HEALTH

- [ ] Install `madge`
  ```bash
  npm install -D madge
  ```
- [ ] Add script to package.json:
  ```json
  "circular:check": "madge --circular --extensions ts src/"
  ```
- [ ] Add to CI pipeline
- [ ] Fix any circular dependencies found

---

### P3.4 - Improve Development Scripts

**Owner:** Charlie | **Effort:** 2 hours | **Status:** ⚪ DX

- [ ] Add type check script:
  ```json
  "typecheck": "tsc --noEmit"
  ```
- [ ] Add lint fix script:
  ```json
  "lint:fix": "eslint . --fix"
  ```
- [ ] Add changed tests script:
  ```json
  "test:changed": "vitest --changed"
  ```
- [ ] Document scripts in README

---

### P3.5 - Documentation Improvements

**Owner:** Ella | **Effort:** 2-3 days | **Status:** ⚪ DOCS

- [ ] Write v1 → v2 migration guide
- [ ] Add more inline examples
- [ ] Document complex type utilities
- [ ] Create troubleshooting guide
- [ ] Add architecture diagrams

---

## Quality Gates

**Before ANY Merge:**

- [ ] All tests passing
- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] Coverage ≥80% for new code

**Before Alpha Release:**

- [ ] Overall coverage ≥80%
- [ ] No security vulnerabilities
- [ ] Bundle size within budget
- [ ] All P1 issues resolved

---

## Progress Tracking

**Week 1 Target:**

- [ ] P1.1 Complete (Build fixed)
- [ ] P1.2 Complete (Security resolved)
- [ ] P1.3 Started (50% of tests written)

**Week 2 Target:**

- [ ] P1.3 Complete (Coverage at 80%)
- [ ] P2.1 Complete (Dependencies consolidated)
- [ ] P2.2 Complete (Linting clean)

**Week 3 Target:**

- [ ] P2.3 Complete (Size monitoring)
- [ ] P2.4 Complete (TODOs tracked)
- [ ] All quality gates passing
- [ ] Ready for alpha release

---

## Verification Commands

**Full Quality Check:**

```bash
# Build
npm run build

# Tests
npm run test:coverage

# Linting
npm run lint

# Security
npm audit --audit-level=moderate

# Size
npm run size

# Type check
npm run typecheck
```

**CI Simulation:**

```bash
npm run clean
npm install
npm run build
npm run test:coverage
npm run lint
npm audit --audit-level=moderate
```

---

**Last Updated:** November 21, 2025
**Next Review:** Weekly during sprint

---

## Quick Reference

**Task Board:** `npx dm list --agent charlie -i`
**Coverage Report:** `packages/component/coverage/index.html`
**Full Quality Report:** `packages/component/QUALITY_ASSESSMENT_REPORT.md`
**Summary:** `packages/component/QUALITY_SUMMARY.md`
