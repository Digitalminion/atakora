# Linked Templates Implementation Roadmap

## Overview

This roadmap outlines the step-by-step implementation plan for transitioning from monolithic ARM templates to linked templates as the default synthesis approach. The implementation is divided into 6 phases over 6 weeks, with clear deliverables and testing milestones.

## Phase 1: Core Infrastructure (Week 1)

### Objective
Build foundational components for template splitting and artifact management.

### Tasks

#### 1.1 Create Template Splitter (3 days)
**Owner**: Devon
**Location**: `packages/lib/src/synthesis/transform/template-splitter.ts`

```typescript
// Key interfaces to implement
interface TemplateSplitter {
  split(resources: ArmResource[], options: SplitOptions): SplitResult;
  validateSplit(result: SplitResult): ValidationResult;
}

interface SplitResult {
  templates: Map<string, ArmTemplate>;
  dependencies: Map<string, string[]>;
  deploymentOrder: string[];
  rootTemplate: ArmTemplate;
}
```

**Deliverables**:
- Template splitter with size-based splitting
- Resource categorization logic
- Dependency graph builder
- Unit tests with 90% coverage

#### 1.2 Create Function Packager (2 days)
**Owner**: Devon
**Location**: `packages/lib/src/synthesis/functions/packager.ts`

```typescript
interface FunctionPackager {
  package(functions: InlineFunction[], options: PackageOptions): Promise<PackageResult>;
  validate(package: PackageResult): Promise<ValidationResult>;
}
```

**Deliverables**:
- ZIP package creation
- Function manifest generation
- Dependency bundling
- Checksum calculation

#### 1.3 Design Storage Architecture (1 day)
**Owner**: Becky
**Location**: `docs/design/architecture/storage-architecture.md`

**Deliverables**:
- Storage account design
- Container structure
- Naming conventions
- Security model

### Success Criteria
- [ ] Template splitter can handle 100+ resources
- [ ] Function packager creates valid Azure Functions packages
- [ ] All unit tests passing
- [ ] Design reviewed and approved

## Phase 2: Storage & Upload System (Week 2)

### Objective
Implement artifact storage and upload capabilities.

### Tasks

#### 2.1 Create Artifact Manager (2 days)
**Owner**: Devon
**Location**: `packages/lib/src/synthesis/assembly/artifact-manager.ts`

```typescript
interface ArtifactManager {
  initialize(config: StorageConfig): Promise<void>;
  upload(artifacts: Artifact[]): Promise<UploadResult[]>;
  generateSasTokens(artifacts: Artifact[]): Promise<Map<string, string>>;
  cleanup(deploymentId: string, retention: RetentionPolicy): Promise<void>;
}
```

**Deliverables**:
- Storage account client
- Blob upload with retry logic
- SAS token generation
- Progress tracking

#### 2.2 Implement Storage Provisioning (2 days)
**Owner**: Grace
**Location**: `packages/cli/src/commands/deploy/storage-provisioner.ts`

```typescript
interface StorageProvisioner {
  provision(subscription: string, location: string): Promise<StorageAccount>;
  validate(account: StorageAccount): Promise<boolean>;
  configure(account: StorageAccount, config: StorageConfig): Promise<void>;
}
```

**Deliverables**:
- Auto-provision storage account
- Configure containers and permissions
- Handle existing storage accounts
- Government cloud support

#### 2.3 Build Upload Pipeline (1 day)
**Owner**: Grace
**Location**: `packages/cli/src/commands/deploy/upload-pipeline.ts`

**Deliverables**:
- Parallel upload support
- Progress indicators
- Error handling and retry
- Checksum validation

### Success Criteria
- [ ] Can upload 50+ files in parallel
- [ ] SAS tokens work correctly
- [ ] Upload retry on failure
- [ ] Progress tracking accurate

## Phase 3: Synthesis Pipeline Integration (Week 3)

### Objective
Integrate new components into the synthesis pipeline.

### Tasks

#### 3.1 Modify Synthesizer (2 days)
**Owner**: Devon
**Location**: `packages/lib/src/synthesis/synthesizer.ts`

```typescript
// Add new phase to synthesis pipeline
class Synthesizer {
  async synthesize(app: App, options?: SynthesisOptions): Promise<CloudAssembly> {
    // Phase 1: Prepare
    // Phase 2: Transform
    // Phase 3: Split & Package (NEW)
    // Phase 4: Validate
    // Phase 5: Assembly & Upload (MODIFIED)
  }
}
```

**Deliverables**:
- Add split & package phase
- Update assembly phase for uploads
- Maintain backward compatibility
- Update progress reporting

#### 3.2 Update InlineFunction (1 day)
**Owner**: Devon
**Location**: `packages/cdk/src/functions/inline-function.ts`

```typescript
class InlineFunction extends Resource {
  toArmTemplate(): ArmResource {
    // Return metadata only, no embedded code
    return {
      type: 'Microsoft.Web/sites/functions',
      properties: {
        // No 'files' property with embedded code
        config: { bindings: [...] }
      }
    };
  }

  getCode(): string {
    // New method to retrieve code for packaging
    return this.code;
  }
}
```

**Deliverables**:
- Remove inline code from ARM output
- Add code extraction method
- Update tests
- Migration guide

#### 3.3 Create New Manifest Format (2 days)
**Owner**: Felix
**Location**: `packages/lib/src/synthesis/assembly/manifest-v2.ts`

**Deliverables**:
- Design manifest v2 schema
- Implement manifest generator
- Add artifact tracking
- Backward compatibility layer

### Success Criteria
- [ ] Synthesis produces linked templates
- [ ] Function code packaged correctly
- [ ] Manifest includes all artifacts
- [ ] No breaking changes for users

## Phase 4: Deployment Orchestration (Week 4)

### Objective
Update CLI deployment to handle linked templates and artifacts.

### Tasks

#### 4.1 Update Deploy Command (3 days)
**Owner**: Grace
**Location**: `packages/cli/src/commands/deploy.ts`

```typescript
class DeployCommand {
  async execute(options: DeployOptions): Promise<void> {
    // 1. Read manifest
    // 2. Provision storage (if needed)
    // 3. Upload artifacts
    // 4. Generate SAS tokens
    // 5. Deploy root template
    // 6. Monitor deployment
  }
}
```

**Deliverables**:
- Multi-phase deployment
- Progress tracking
- Error handling
- Rollback support

#### 4.2 Implement Deployment Monitor (1 day)
**Owner**: Grace
**Location**: `packages/cli/src/commands/deploy/monitor.ts`

**Deliverables**:
- Track linked deployment progress
- Aggregate status from all templates
- Error aggregation and reporting
- Real-time updates

#### 4.3 Add Rollback Capability (1 day)
**Owner**: Grace
**Location**: `packages/cli/src/commands/rollback.ts`

**Deliverables**:
- Rollback to previous deployment
- Package version management
- State tracking
- Safety checks

### Success Criteria
- [ ] Successful deployment of linked templates
- [ ] Progress visible for all sub-deployments
- [ ] Rollback works correctly
- [ ] Error messages are clear

## Phase 5: Testing & Validation (Week 5)

### Objective
Comprehensive testing of the new system.

### Tasks

#### 5.1 Unit Testing (2 days)
**Owner**: Charlie
**Locations**: `packages/*/src/**/*.test.ts`

**Test Coverage**:
- Template splitter: Edge cases, large templates
- Function packager: Various function types
- Artifact manager: Upload failures, retries
- Synthesizer: Full pipeline

**Target**: 95% code coverage

#### 5.2 Integration Testing (2 days)
**Owner**: Charlie
**Location**: `packages/integration-tests/`

**Test Scenarios**:
- Deploy 100+ resource stack
- Deploy 20+ functions
- Cross-template dependencies
- Storage account failures
- SAS token expiration
- Government cloud deployment

#### 5.3 Performance Testing (1 day)
**Owner**: Charlie

**Benchmarks**:
- Template splitting time vs size
- Upload performance (parallel vs serial)
- Deployment time comparison
- Memory usage profiling
- Package size optimization

### Success Criteria
- [ ] All unit tests passing
- [ ] Integration tests green
- [ ] Performance within 20% of baseline
- [ ] No memory leaks

## Phase 6: Documentation & Migration (Week 6)

### Objective
Document the new system and provide migration support.

### Tasks

#### 6.1 User Documentation (2 days)
**Owner**: Ella
**Location**: `docs/guides/`

**Documents**:
- Linked templates overview
- Deployment guide
- Troubleshooting guide
- FAQ

#### 6.2 API Documentation (1 day)
**Owner**: Ella
**Location**: Generated from code

**Updates**:
- Update all TSDoc comments
- Add examples
- Document new options
- Breaking changes notice

#### 6.3 Migration Guide (1 day)
**Owner**: Ella
**Location**: `docs/migration/v2.md`

**Contents**:
- What's changing
- Impact on existing code
- Step-by-step migration
- Common issues and solutions

#### 6.4 Sample Projects (1 day)
**Owner**: Devon
**Location**: `examples/`

**Samples**:
- Large-scale deployment
- Multi-function app
- Cross-stack dependencies
- CI/CD integration

### Success Criteria
- [ ] All documentation complete
- [ ] Examples working
- [ ] Migration guide tested
- [ ] Team training complete

## Risk Mitigation

### Technical Risks

| Risk | Mitigation | Owner |
|------|------------|-------|
| Template splitting breaks dependencies | Extensive testing, dependency validation | Devon |
| Storage account provisioning fails | Fallback to manual creation, clear errors | Grace |
| SAS tokens expire during deployment | Token refresh logic, longer initial duration | Devon |
| Package size exceeds limits | Package splitting, dependency optimization | Charlie |
| Government cloud incompatibility | Early testing, separate configuration | Grace |

### Schedule Risks

| Risk | Mitigation | Owner |
|------|------------|-------|
| Phase 1 delays cascade | Parallel work where possible | Becky |
| Testing reveals major issues | Buffer time in week 5 | Charlie |
| Documentation incomplete | Start documentation early | Ella |

## Rollout Strategy

### Internal Testing (Week 5-6)
- Deploy all example projects
- Run performance benchmarks
- Stress test with large deployments

### Beta Release (Week 7)
- Release as preview feature
- Gather feedback from early adopters
- Monitor for issues

### General Availability (Week 8)
- Full release with v2.0.0
- Deprecation notice for old format
- Support window for migration

## Success Metrics

### Technical Metrics
- **Template Size**: All templates <3.5MB ✓
- **Deployment Success**: >99% success rate
- **Performance**: <20% deployment time increase
- **Test Coverage**: >95% code coverage

### User Metrics
- **Migration Effort**: Zero code changes required
- **Documentation**: 100% API documented
- **Support Tickets**: <5% increase in support volume
- **User Satisfaction**: >90% positive feedback

## Communication Plan

### Week 1: Announcement
- Blog post explaining the change
- GitHub discussion for feedback
- Slack channel for questions

### Week 3: Progress Update
- Status report on implementation
- Preview of new features
- Call for beta testers

### Week 5: Beta Announcement
- Beta release notes
- Migration guide preview
- Webinar scheduled

### Week 7: GA Announcement
- Full release notes
- Migration deadline
- Support resources

## Conclusion

This roadmap provides a clear path from the current monolithic template approach to a scalable linked template architecture. The phased approach minimizes risk while ensuring thorough testing and documentation. The key to success is maintaining backward compatibility while transparently upgrading the underlying system.

## Appendix: Task Assignments

| Developer | Week 1 | Week 2 | Week 3 | Week 4 | Week 5 | Week 6 |
|-----------|--------|--------|--------|--------|--------|--------|
| Becky | Storage Architecture | Review & Design | Review & Design | Review & Design | Architecture Review | Final Approval |
| Devon | Template Splitter, Packager | Artifact Manager | Synthesizer, InlineFunction | Support Grace | Bug Fixes | Sample Projects |
| Grace | - | Storage Provisioning, Upload | - | Deploy Command, Monitor, Rollback | Bug Fixes | - |
| Felix | - | - | Manifest v2 | Schema Validation | Schema Testing | - |
| Charlie | - | - | - | - | All Testing | Performance Tuning |
| Ella | Early Documentation | - | - | - | - | All Documentation |