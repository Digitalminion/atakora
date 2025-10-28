# ADR-003: Deployment Orchestration with Linked Templates

## Status

**Proposed**

## Context

With the transition to linked templates as the default synthesis approach (ADR-016), we need a comprehensive deployment orchestration model. The deployment process must now handle:

1. **Multi-phase deployment**: Upload artifacts → Deploy templates → Monitor progress
2. **Storage management**: Provision and manage storage accounts for artifacts
3. **Dependency resolution**: Deploy linked templates in correct order
4. **State management**: Track deployment state and enable rollback
5. **Error handling**: Graceful failure with clear diagnostics

The orchestration model must support both Commercial and Government clouds, handle parallel deployments where possible, and provide clear progress tracking.

## Decision

We will implement a **multi-phase deployment orchestrator** that manages the complete lifecycle of linked template deployments.

### Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                  CLI Deploy Command                   │
├──────────────────────────────────────────────────────┤
│                                                       │
│  Phase 1: Preparation                                │
│   ├── Read manifest                                  │
│   ├── Validate artifacts                             │
│   └── Provision storage (if needed)                  │
│                                                       │
│  Phase 2: Upload                                     │
│   ├── Upload templates (parallel)                    │
│   ├── Upload packages (parallel)                     │
│   └── Generate SAS tokens                            │
│                                                       │
│  Phase 3: Deployment                                 │
│   ├── Deploy root template                           │
│   ├── Monitor linked deployments                     │
│   └── Aggregate status                               │
│                                                       │
│  Phase 4: Validation                                 │
│   ├── Verify resources created                       │
│   ├── Test endpoints                                 │
│   └── Update state                                   │
│                                                       │
└──────────────────────────────────────────────────────┘
```

### Key Components

1. **Deployment Orchestrator**: Coordinates all phases
2. **Storage Manager**: Handles storage account and artifacts
3. **Deployment Engine**: Interfaces with Azure Resource Manager
4. **Progress Monitor**: Tracks and reports deployment status
5. **State Manager**: Maintains deployment state for rollback

### Deployment Modes

```typescript
enum DeploymentMode {
  INCREMENTAL = 'Incremental',  // Default: Add/update resources
  COMPLETE = 'Complete',         // Replace all resources
  VALIDATE = 'Validate',         // Dry run only
  WHATIF = 'WhatIf'             // Preview changes
}
```

### Deployment Options

```typescript
interface DeploymentOptions {
  mode: DeploymentMode;
  parallel: boolean;           // Deploy independent templates in parallel
  force: boolean;              // Skip confirmations
  rollbackOnFailure: boolean;  // Automatic rollback
  timeout: number;             // Max deployment time (minutes)
  retryPolicy: {
    maxAttempts: number;
    backoffMultiplier: number;
  };
}
```

## Alternatives Considered

### Alternative 1: Simple Sequential Deployment
Deploy each template one by one in a fixed order.

**Rejected because**:
- Slow deployment times
- Doesn't leverage Azure's parallel deployment capabilities
- Poor user experience for large stacks

### Alternative 2: Azure DevOps / GitHub Actions Only
Rely entirely on CI/CD pipelines for orchestration.

**Rejected because**:
- Not all users have CI/CD
- Local development needs deployment capability
- Reduces framework portability

### Alternative 3: Terraform-style State Management
Implement full state tracking like Terraform with state files.

**Rejected because**:
- Azure already tracks deployment state
- Adds complexity without clear benefit
- Risk of state drift

### Alternative 4: Azure Deployment Stacks
Use Azure's preview Deployment Stacks feature.

**Rejected because**:
- Still in preview
- Not available in all regions
- Limited Government cloud support

## Consequences

### Positive Consequences

1. **Robust Deployment**: Multi-phase approach ensures reliability
2. **Parallel Execution**: Independent resources deploy simultaneously
3. **Clear Progress**: Users see what's happening at each stage
4. **Rollback Capability**: Can revert to previous state on failure
5. **Cloud Agnostic**: Works in Commercial and Government clouds
6. **Extensible**: Easy to add new phases or capabilities

### Negative Consequences

1. **Complexity**: More moving parts than monolithic deployment
2. **Storage Dependency**: Requires storage account (auto-provisioned)
3. **Network Requirements**: Must upload artifacts before deployment
4. **Debugging Challenges**: Failures might occur in different phases
5. **State Management**: Need to track deployment state

## Implementation Details

### Phase 1: Preparation

```typescript
class DeploymentPreparation {
  async prepare(manifest: Manifest, options: DeploymentOptions): Promise<PrepareResult> {
    // 1. Validate manifest
    this.validateManifest(manifest);

    // 2. Check Azure connectivity
    await this.checkAzureConnection();

    // 3. Provision storage if needed
    const storage = await this.ensureStorage({
      location: manifest.location,
      project: manifest.project,
      environment: manifest.environment
    });

    // 4. Validate all artifacts exist
    await this.validateArtifacts(manifest.artifacts);

    // 5. Build deployment plan
    const plan = this.buildDeploymentPlan(manifest, options);

    return { storage, plan, manifest };
  }

  private async ensureStorage(config: StorageConfig): Promise<StorageAccount> {
    const existing = await this.findExistingStorage(config);
    if (existing) {
      return existing;
    }

    console.log('Provisioning storage account for deployment artifacts...');
    return await this.provisionStorage(config);
  }
}
```

### Phase 2: Upload

```typescript
class ArtifactUploader {
  async upload(artifacts: Artifacts, storage: StorageAccount): Promise<UploadResult> {
    const results = new Map<string, string>();

    // Upload templates in parallel
    const templateUploads = artifacts.templates.map(async (template) => {
      const uri = await this.uploadBlob(storage, 'templates', template);
      results.set(template.name, uri);
    });

    // Upload packages in parallel
    const packageUploads = artifacts.packages.map(async (package) => {
      const uri = await this.uploadBlob(storage, 'packages', package);
      results.set(package.name, uri);
    });

    // Wait for all uploads
    await Promise.all([...templateUploads, ...packageUploads]);

    // Generate SAS tokens
    const tokens = await this.generateSasTokens(results, storage);

    return { uris: results, tokens };
  }

  private async uploadBlob(storage: StorageAccount, container: string, file: File): Promise<string> {
    const blobClient = storage.getBlockBlobClient(container, file.name);

    // Upload with retry logic
    await this.retry(async () => {
      await blobClient.uploadFile(file.path, {
        onProgress: (progress) => this.reportProgress(file.name, progress)
      });
    });

    return blobClient.url;
  }
}
```

### Phase 3: Deployment

```typescript
class DeploymentEngine {
  async deploy(plan: DeploymentPlan, artifacts: UploadResult): Promise<DeploymentResult> {
    // 1. Prepare root template with artifact URIs
    const rootTemplate = this.prepareRootTemplate(plan, artifacts);

    // 2. Start root deployment
    const deployment = await this.startDeployment({
      template: rootTemplate,
      parameters: plan.parameters,
      mode: plan.mode,
      location: plan.location
    });

    // 3. Monitor deployment progress
    const monitor = new DeploymentMonitor(deployment);

    // 4. Track linked deployments
    const linkedDeployments = new Map<string, DeploymentStatus>();

    while (!monitor.isComplete()) {
      const status = await monitor.getStatus();

      // Update progress
      this.updateProgress(status);

      // Track linked deployments
      for (const linked of status.linkedDeployments) {
        linkedDeployments.set(linked.name, linked.status);
      }

      // Check for failures
      if (status.failed && plan.rollbackOnFailure) {
        await this.rollback(deployment);
        throw new Error(`Deployment failed: ${status.error}`);
      }

      await this.wait(5000); // Poll every 5 seconds
    }

    return {
      deployment,
      linkedDeployments,
      duration: monitor.getDuration(),
      resourcesCreated: await this.getCreatedResources(deployment)
    };
  }

  private prepareRootTemplate(plan: DeploymentPlan, artifacts: UploadResult): ArmTemplate {
    return {
      '$schema': 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
      contentVersion: '1.0.0.0',
      parameters: this.generateParameters(plan),
      variables: {
        deploymentId: plan.deploymentId,
        storageUri: artifacts.storageUri
      },
      resources: this.generateLinkedDeployments(plan, artifacts),
      outputs: this.generateOutputs(plan)
    };
  }

  private generateLinkedDeployments(plan: DeploymentPlan, artifacts: UploadResult): any[] {
    const deployments = [];

    for (const [index, tier] of plan.deploymentTiers.entries()) {
      for (const template of tier.templates) {
        deployments.push({
          type: 'Microsoft.Resources/deployments',
          apiVersion: '2021-04-01',
          name: template.name,
          dependsOn: index > 0 ? this.getPreviousTierNames(plan, index - 1) : [],
          properties: {
            mode: plan.mode,
            templateLink: {
              uri: artifacts.getUri(template.name),
              contentVersion: '1.0.0.0'
            },
            parameters: this.extractParameters(template, plan.parameters)
          }
        });
      }
    }

    return deployments;
  }
}
```

### Phase 4: Validation

```typescript
class DeploymentValidator {
  async validate(deployment: Deployment): Promise<ValidationResult> {
    const checks = [];

    // 1. Verify all resources were created
    checks.push(await this.verifyResourcesCreated(deployment));

    // 2. Test endpoints if applicable
    if (deployment.hasEndpoints()) {
      checks.push(await this.testEndpoints(deployment));
    }

    // 3. Verify function apps are running
    if (deployment.hasFunctions()) {
      checks.push(await this.verifyFunctions(deployment));
    }

    // 4. Check resource health
    checks.push(await this.checkResourceHealth(deployment));

    return {
      success: checks.every(c => c.success),
      checks,
      warnings: this.extractWarnings(checks),
      recommendations: this.generateRecommendations(checks)
    };
  }
}
```

### State Management

```typescript
interface DeploymentState {
  deploymentId: string;
  timestamp: Date;
  status: 'pending' | 'uploading' | 'deploying' | 'validating' | 'completed' | 'failed';

  artifacts: {
    uploaded: string[];
    pending: string[];
    failed: string[];
  };

  deployments: {
    root: DeploymentInfo;
    linked: Map<string, DeploymentInfo>;
  };

  rollback: {
    available: boolean;
    previousDeploymentId?: string;
    snapshots?: ResourceSnapshot[];
  };

  errors: ErrorInfo[];
  warnings: WarningInfo[];
}

class StateManager {
  private state: DeploymentState;

  async save(): Promise<void> {
    // Save to local file
    await fs.writeFile('.atakora/deployment-state.json', JSON.stringify(this.state));

    // Also save to Azure (optional)
    if (this.config.remoteState) {
      await this.saveToAzure();
    }
  }

  async rollback(): Promise<void> {
    if (!this.state.rollback.available) {
      throw new Error('No rollback available');
    }

    // Restore from previous deployment
    const previous = await this.loadDeployment(this.state.rollback.previousDeploymentId);
    await this.applyDeployment(previous);
  }
}
```

### Parallel Deployment Strategy

```typescript
class ParallelDeploymentStrategy {
  async deployTier(tier: DeploymentTier, options: ParallelOptions): Promise<void> {
    const { maxConcurrency = 5 } = options;
    const queue = new PQueue({ concurrency: maxConcurrency });

    // Add all templates in tier to queue
    const promises = tier.templates.map(template =>
      queue.add(() => this.deployTemplate(template))
    );

    // Wait for all to complete
    const results = await Promise.allSettled(promises);

    // Handle failures
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      throw new AggregateError(failures, 'Parallel deployment failed');
    }
  }

  determineParallelizability(templates: Template[]): DeploymentTier[] {
    const graph = this.buildDependencyGraph(templates);
    const tiers = [];
    const visited = new Set<string>();

    while (visited.size < templates.length) {
      const tier = templates.filter(t =>
        !visited.has(t.name) &&
        this.allDependenciesVisited(t, visited, graph)
      );

      tier.forEach(t => visited.add(t.name));
      tiers.push({ templates: tier, parallel: true });
    }

    return tiers;
  }
}
```

### Error Handling and Recovery

```typescript
class DeploymentErrorHandler {
  async handle(error: Error, context: DeploymentContext): Promise<RecoveryAction> {
    // Classify error
    const classification = this.classifyError(error);

    switch (classification) {
      case ErrorType.TRANSIENT:
        // Retry with backoff
        return { action: 'retry', delay: this.calculateBackoff(context.attempt) };

      case ErrorType.STORAGE_ACCESS:
        // Regenerate SAS tokens and retry
        await this.regenerateSasTokens(context);
        return { action: 'retry', delay: 0 };

      case ErrorType.RESOURCE_CONFLICT:
        // Use incremental mode and retry
        context.mode = DeploymentMode.INCREMENTAL;
        return { action: 'retry', delay: 0 };

      case ErrorType.QUOTA_EXCEEDED:
        // Cannot recover automatically
        return {
          action: 'fail',
          message: 'Azure quota exceeded. Please increase quota or reduce resources.',
          suggestion: this.getQuotaSuggestion(error)
        };

      case ErrorType.TEMPLATE_ERROR:
        // Cannot recover - template is invalid
        return {
          action: 'fail',
          message: 'Template validation failed',
          details: this.extractTemplateErrors(error)
        };

      default:
        // Unknown error - fail with diagnostics
        return {
          action: 'fail',
          message: 'Deployment failed',
          diagnostics: await this.collectDiagnostics(context)
        };
    }
  }
}
```

### Progress Reporting

```typescript
class ProgressReporter {
  private currentPhase: string;
  private progress: Map<string, Progress>;

  report(update: ProgressUpdate): void {
    // Update internal state
    this.progress.set(update.id, update);

    // Format and display
    const display = this.format(update);

    if (this.config.interactive) {
      // Update interactive display
      this.updateInteractive(display);
    } else {
      // Simple console output
      console.log(display);
    }

    // Send to monitoring if configured
    if (this.config.monitoring) {
      this.sendToMonitoring(update);
    }
  }

  private format(update: ProgressUpdate): string {
    const percentage = Math.round(update.completed / update.total * 100);
    const bar = this.generateProgressBar(percentage);

    return `${update.phase} | ${bar} ${percentage}% | ${update.message}`;
  }

  private generateProgressBar(percentage: number): string {
    const width = 30;
    const completed = Math.round(width * percentage / 100);
    const remaining = width - completed;

    return `[${'='.repeat(completed)}${' '.repeat(remaining)}]`;
  }
}
```

## Success Criteria

### Immediate Success Metrics
- Deployment success rate >99%
- Clear progress reporting during all phases
- Automatic rollback works correctly
- Error messages are actionable

### Performance Metrics
- Parallel deployment reduces time by >40%
- Upload phase completes in <2 minutes for typical stack
- Status updates every 5 seconds during deployment
- Total deployment time <10 minutes for 50 resources

### Reliability Metrics
- Automatic retry recovers from 90% of transient failures
- Rollback completes in <2 minutes
- State recovery works after CLI crash
- No data loss during failures

## Security Considerations

1. **SAS tokens are short-lived** (1 hour for deployment)
2. **Storage account uses private endpoints** where possible
3. **All uploads use HTTPS**
4. **Deployment credentials never logged**
5. **Sensitive outputs marked as secure**

## Testing Requirements

1. **Unit tests** for each orchestration component
2. **Integration tests** for full deployment flow
3. **Failure injection tests** for error handling
4. **Performance tests** for parallel deployment
5. **Government cloud tests** for compliance

## Migration Impact

This deployment orchestration model is required for linked templates. Existing monolithic deployments will stop working. Users must:

1. Update to latest CLI version
2. Re-synthesize their applications
3. Ensure storage account access
4. Update any CI/CD pipelines

## References

- ADR-016: Linked Templates as Default
- Azure Resource Manager documentation
- Azure Deployment best practices
- Government Cloud deployment guide