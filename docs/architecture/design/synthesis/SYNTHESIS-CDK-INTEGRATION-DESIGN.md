# Component Package Synthesis - CDK Integration Architecture

**Author**: Becky (Staff Architect)
**Date**: 2025-11-22
**Status**: DESIGN APPROVED

## Executive Summary

This document describes the new architecture for component package synthesis that leverages the existing CDK construct system instead of manually building ARM JSON. The new architecture maintains backward compatibility while providing better type safety, validation, and maintainability.

## Design Goals

### Primary Goals

1. **Use CDK Constructs** - Replace manual ARM JSON with proper CDK L2 constructs
2. **Maintain API Compatibility** - Existing backend definitions continue to work without changes
3. **Better Output** - Return CloudAssembly instead of raw ARM JSON
4. **Type Safety** - All resource configurations have compile-time type checking
5. **Automatic Validation** - Templates validated through lib's validation pipeline

### Secondary Goals

1. **RBAC Support** - Enable permission grants between resources
2. **Dependency Tracking** - Automatic resource dependencies via construct tree
3. **Better Naming** - Leverage construct tree for consistent resource naming
4. **Extensibility** - Support future features without breaking changes

## Architecture Overview

### High-Level Flow

```
Backend Definition
       ↓
BackendSynthesizer.synthesize()
       ↓
Create App + Stack
       ↓
BackendResourceMapper
  ↓ (uses CDK constructs)
Construct Tree
       ↓
App.synth() (lib synthesis)
       ↓
CloudAssembly
       ↓
Return to user
```

### Key Architectural Change

**Before**:
```
BackendObject → ResourceMapper → Manual ARM JSON → ARMTemplate
```

**After**:
```
BackendObject → BackendResourceMapper → CDK Constructs → App.synth() → CloudAssembly
```

## Component Design

### 1. BackendSynthesizer (Modified)

**Location**: `packages/component/src/synthesis/backend-synthesizer.ts`

**Role**: Main orchestrator, now creates App + Stack and delegates to lib synthesis

**New Implementation**:
```typescript
export class BackendSynthesizer {
  async synthesize(
    backend: BackendObject,
    options: Partial<SynthesisOptions> = {}
  ): Promise<CloudAssembly> {
    // Phase 1: Analyze backend (unchanged)
    const analysis = this.analyzeBackend(backend);

    // Phase 2: Create synthesis context (unchanged)
    const context = this.createSynthesisContext(backend, analysis, options);

    // Phase 3: Validate attachments (unchanged)
    await this.validateAttachments(backend, context);

    // NEW: Phase 4: Create construct tree using CDK constructs
    const app = new App({ outdir: options.outputDir || 'arm.out' });

    const stack = new ResourceGroupStack(app, backend.settings.name, {
      resourceGroup: {
        resourceGroupName: context.resourceGroup,
        location: context.region,
      },
      tags: context.tags,
    });

    // NEW: Use BackendResourceMapper to populate stack with CDK constructs
    const mapper = new BackendResourceMapper();
    await mapper.synthesizeBackendToStack(backend, stack, context, analysis);

    // NEW: Phase 5: Synthesize using lib's synthesis system
    const synthesizer = new Synthesizer();
    const assembly = await synthesizer.synthesize(app, {
      skipValidation: options.validate === false,
      prettyPrint: options.prettyPrint !== false,
    });

    return assembly;
  }

  // Keep existing helper methods:
  // - analyzeBackend()
  // - discoverModels()
  // - discoverAttachments()
  // - createSynthesisContext()
  // - validateAttachments()
}
```

**Key Changes**:
1. Return type changes from `SynthesisResult` to `CloudAssembly`
2. Creates App and ResourceGroupStack
3. Uses BackendResourceMapper (new) to create CDK constructs
4. Delegates synthesis to lib's Synthesizer
5. Keeps existing analysis and context creation logic

**Backward Compatibility**: External API stays the same, only return type changes (enhancement)

### 2. BackendResourceMapper (New)

**Location**: `packages/component/src/synthesis/backend-resource-mapper.ts`

**Role**: Maps backend models to CDK constructs (replaces ResourceMapper)

**New Implementation**:
```typescript
import { DatabaseAccounts, SqlDatabases, SqlContainers } from '@atakora/cdk/documentdb';
import { StorageAccounts } from '@atakora/cdk/storage';
import { Vaults } from '@atakora/cdk/keyvault';
import { ServerFarms, Sites } from '@atakora/cdk/web';
import { Components } from '@atakora/cdk/insights';

export class BackendResourceMapper {
  /**
   * Synthesize backend to stack using CDK constructs
   */
  async synthesizeBackendToStack(
    backend: BackendObject,
    stack: ResourceGroupStack,
    context: SynthesisContext,
    analysis: BackendAnalysis
  ): Promise<void> {
    // 1. Storage resources
    await this.synthesizeStorage(backend, stack, context, analysis);

    // 2. Compute resources
    await this.synthesizeCompute(backend, stack, context, analysis);

    // 3. Monitoring resources (if enabled)
    if (context.features.monitoring && backend.monitoring) {
      await this.synthesizeMonitoring(backend, stack, context);
    }

    // 4. Networking resources (if enabled)
    if (context.features.networking && backend.network) {
      await this.synthesizeNetworking(backend, stack, context);
    }

    // 5. Performance resources (if enabled)
    if (context.features.performance && backend.performance) {
      await this.synthesizePerformance(backend, stack, context);
    }
  }

  private async synthesizeStorage(
    backend: BackendObject,
    stack: ResourceGroupStack,
    context: SynthesisContext,
    analysis: BackendAnalysis
  ): Promise<void> {
    // 1. Cosmos DB for CRUD models
    if (analysis.models.crud.length > 0) {
      await this.synthesizeCosmosDB(backend, stack, context, analysis);
    }

    // 2. Storage Account for system needs
    await this.synthesizeStorageAccount(backend, stack, context);

    // 3. Key Vault for secrets
    if (backend.authentication || backend.settings.secrets) {
      await this.synthesizeKeyVault(backend, stack, context);
    }
  }

  private async synthesizeCosmosDB(
    backend: BackendObject,
    stack: ResourceGroupStack,
    context: SynthesisContext,
    analysis: BackendAnalysis
  ): Promise<void> {
    // Get configuration from attachment point
    const config = this.getCosmosDBConfig(backend);

    // Create Cosmos DB account using CDK construct
    const account = new DatabaseAccounts(stack, 'CosmosAccount', {
      databaseAccountName: config.accountName,  // Optional, auto-generated if not provided
      location: stack.location,
      enableServerless: config.enableAutoscale !== false,
      consistencyLevel: config.consistencyLevel || 'Session',
      enableAutomaticFailover: context.environment === 'production',
      publicNetworkAccess: 'disabled',
      tags: stack.tags,
    });

    // Create database using CDK construct
    const database = new SqlDatabases(account, 'Database', {
      databaseName: config.databaseName || context.naming.project,
      options: config.enableAutoscale
        ? {
            autoscaleSettings: {
              maxThroughput: config.maxThroughput || 4000,
            },
          }
        : {
            throughput: config.throughput || this.getDefaultThroughput(context),
          },
    });

    // Create containers for CRUD models using CDK constructs
    for (const model of analysis.models.crud) {
      new SqlContainers(database, model.name, {
        containerName: this.generateContainerName(model.name),
        partitionKey: {
          paths: [`/${this.determinePartitionKey(model)}`],
          kind: 'Hash',
        },
        indexingPolicy: this.generateIndexingPolicy(model),
      });
    }

    // Store reference for grants (Phase 2 enhancement)
    this.cosmosAccount = account;
  }

  private async synthesizeStorageAccount(
    backend: BackendObject,
    stack: ResourceGroupStack,
    context: SynthesisContext
  ): Promise<void> {
    const config = this.getStorageAccountConfig(backend);

    const storage = new StorageAccounts(stack, 'StorageAccount', {
      accountName: config.name,  // Optional, auto-generated if not provided
      location: stack.location,
      sku: {
        name: config.sku || 'Standard_LRS',
      },
      kind: config.kind || 'StorageV2',
      accessTier: config.accessTier || 'Hot',
      supportsHttpsTrafficOnly: config.enableHttpsOnly !== false,
      allowBlobPublicAccess: config.enableBlobPublicAccess === true,
      minimumTlsVersion: 'TLS1_2',
      tags: stack.tags,
    });

    this.storageAccount = storage;
  }

  private async synthesizeKeyVault(
    backend: BackendObject,
    stack: ResourceGroupStack,
    context: SynthesisContext
  ): Promise<void> {
    const vault = new Vaults(stack, 'KeyVault', {
      location: stack.location,
      sku: {
        family: 'A',
        name: 'standard',
      },
      enableSoftDelete: true,
      softDeleteRetentionInDays: context.environment === 'production' ? 90 : 7,
      enablePurgeProtection: context.environment === 'production',
      tags: stack.tags,
    });

    this.keyVault = vault;
  }

  private async synthesizeCompute(
    backend: BackendObject,
    stack: ResourceGroupStack,
    context: SynthesisContext,
    analysis: BackendAnalysis
  ): Promise<void> {
    const hasModels =
      analysis.models.crud.length > 0 ||
      analysis.models.event.length > 0 ||
      analysis.models.function.length > 0;

    if (!hasModels) return;

    await this.synthesizeFunctionApp(backend, stack, context);
  }

  private async synthesizeFunctionApp(
    backend: BackendObject,
    stack: ResourceGroupStack,
    context: SynthesisContext
  ): Promise<void> {
    const config = this.getFunctionAppConfig(backend);

    // Create App Service Plan using CDK construct
    const plan = new ServerFarms(stack, 'AppServicePlan', {
      location: stack.location,
      sku: {
        name: config.sku || (context.environment === 'production' ? 'EP1' : 'Y1'),
        tier: config.sku === 'Y1' ? 'Dynamic' : 'ElasticPremium',
      },
      reserved: true,  // Linux
      tags: stack.tags,
    });

    // Build app settings
    const appSettings = [
      {
        name: 'FUNCTIONS_WORKER_RUNTIME',
        value: config.runtime || 'node',
      },
      {
        name: 'FUNCTIONS_EXTENSION_VERSION',
        value: '~4',
      },
      {
        name: 'AzureWebJobsStorage',
        value: this.storageAccount.connectionString,  // Reference from construct!
      },
      ...(config.appSettings
        ? Object.entries(config.appSettings).map(([name, value]) => ({
            name,
            value,
          }))
        : []),
    ];

    // Create Function App using CDK construct
    const functionApp = new Sites(stack, 'FunctionApp', {
      location: stack.location,
      kind: 'functionapp,linux',
      serverFarmId: plan.resourceId,  // Automatic dependency!
      siteConfig: {
        linuxFxVersion: `NODE|${config.runtimeVersion || '18'}`,
        appSettings,
        cors: config.cors
          ? {
              allowedOrigins: config.cors.allowedOrigins,
              supportCredentials: config.cors.supportCredentials,
            }
          : undefined,
      },
      httpsOnly: true,
      identity: {
        type: 'SystemAssigned',
      },
      tags: stack.tags,
    });

    // RBAC grants (automatic permission configuration!)
    if (this.cosmosAccount) {
      this.cosmosAccount.grantReadWrite(functionApp);
    }
    if (this.storageAccount) {
      this.storageAccount.grantReadWrite(functionApp);
    }
    if (this.keyVault) {
      this.keyVault.grantRead(functionApp);
    }

    this.functionApp = functionApp;
  }

  private async synthesizeMonitoring(
    backend: BackendObject,
    stack: ResourceGroupStack,
    context: SynthesisContext
  ): Promise<void> {
    const config = this.getAppInsightsConfig(backend);

    const appInsights = new Components(stack, 'AppInsights', {
      location: stack.location,
      kind: config.applicationType || 'web',
      applicationType: config.applicationType || 'web',
      retentionInDays: config.retentionInDays || (context.environment === 'production' ? 90 : 30),
      samplingPercentage: config.samplingPercentage || 100,
      disableIpMasking: config.disableIpMasking || false,
      tags: stack.tags,
    });

    // Connect to Function App if it exists
    if (this.functionApp) {
      this.functionApp.addAppSetting('APPINSIGHTS_INSTRUMENTATIONKEY', appInsights.instrumentationKey);
    }
  }

  private async synthesizeNetworking(
    backend: BackendObject,
    stack: ResourceGroupStack,
    context: SynthesisContext
  ): Promise<void> {
    // VNet configuration using CDK constructs
    // Implementation similar to above
  }

  private async synthesizePerformance(
    backend: BackendObject,
    stack: ResourceGroupStack,
    context: SynthesisContext
  ): Promise<void> {
    // CDN, Cache configuration using CDK constructs
    // Implementation similar to above
  }

  // Helper methods for getting configurations from attachment points
  private getCosmosDBConfig(backend: BackendObject): CosmosDBConfig {
    return backend.storage.database.isAttached()
      ? backend.storage.database.getConfig()
      : {};
  }

  // ... other config helpers

  // Keep existing helper methods from ResourceMapper:
  // - determinePartitionKey()
  // - generateIndexingPolicy()
  // - generateContainerName()
  // - getDefaultThroughput()

  // Resource references for RBAC grants
  private cosmosAccount?: DatabaseAccounts;
  private storageAccount?: StorageAccounts;
  private keyVault?: Vaults;
  private functionApp?: Sites;
}
```

**Key Features**:
1. Uses CDK L2 constructs instead of manual ARM JSON
2. Automatic dependency tracking via construct tree
3. Type-safe configuration via TypeScript interfaces
4. RBAC grants between resources
5. Reference storage for cross-resource connections
6. Maintains same structure as original ResourceMapper for easy migration

### 3. Integration with Lib Synthesis

**Flow**:
```
BackendResourceMapper.synthesizeBackendToStack()
       ↓
Creates CDK constructs in stack
       ↓
App.synth() calls lib's Synthesizer
       ↓
Synthesizer phases:
  1. Prepare - TreeTraverser walks construct tree
  2. Transform - Calls toArmTemplate() on each construct
  3. Validate - Runs validation pipeline
  4. Assembly - Writes templates to disk
       ↓
CloudAssembly returned
```

**Benefits**:
- Automatic validation via lib's ValidationPipeline
- Dependency resolution via DependencyResolver
- Template splitting for large deployments
- Function packaging for Azure Functions
- Proper CloudAssembly manifest with metadata

### 4. Type System Integration

**New Approach**: Use lib/CDK types instead of duplicating

**Remove from component/synthesis/types.ts**:
- `ARMTemplate` (use lib's)
- `ARMResource` (use lib's)
- `ARMParameter` (use lib's)
- `ARMOutput` (use lib's)

**Keep in component/synthesis/types.ts**:
- `SynthesisContext` (component-specific)
- `BackendAnalysis` (component-specific)
- Resource config types: `CosmosDBConfig`, `FunctionAppConfig`, etc. (for attachment points)

**Add to component/synthesis/types.ts**:
```typescript
import type { CloudAssembly } from '@atakora/lib';

// Re-export for convenience
export type { CloudAssembly };
```

## Detailed Design Decisions

### Decision 1: ResourceGroupStack vs SubscriptionStack

**Choice**: Use ResourceGroupStack

**Rationale**:
- Backend resources deploy to a resource group (not subscription-level)
- ResourceGroupStack provides resource group context
- Simpler than creating both SubscriptionStack + ResourceGroupStack
- Can be enhanced later to create parent SubscriptionStack if needed

**Implementation**:
```typescript
const stack = new ResourceGroupStack(app, backend.settings.name, {
  resourceGroup: {
    resourceGroupName: context.resourceGroup,
    location: context.region,
  },
  tags: context.tags,
});
```

**Trade-off**: Can't use SubscriptionStack's naming context.
**Mitigation**: Pass naming context via props or use manual naming for now.

### Decision 2: Naming Strategy

**Choice**: Hybrid approach - use naming context when available, fall back to manual

**Rationale**:
- ResourceGroupStack doesn't have full SubscriptionStack naming context
- CDK constructs support auto-naming (generate if not provided)
- Can provide explicit names from backend settings

**Implementation**:
```typescript
// Let CDK constructs auto-generate names
const account = new DatabaseAccounts(stack, 'CosmosAccount', {
  // databaseAccountName not provided - construct generates it
  location: stack.location,
});

// Or provide explicit name from attachment config
const account = new DatabaseAccounts(stack, 'CosmosAccount', {
  databaseAccountName: config.accountName,  // From attachment
  location: stack.location,
});
```

**Future Enhancement**: Create SubscriptionStack parent to provide full naming context.

### Decision 3: RBAC Grant Strategy

**Choice**: Automatic grants for common scenarios, explicit grants for custom scenarios

**Rationale**:
- Common pattern: Function App needs access to Cosmos, Storage, Key Vault
- Automatic grants reduce boilerplate
- Explicit grants allow customization

**Implementation**:
```typescript
// Automatic grants in BackendResourceMapper
if (this.cosmosAccount) {
  this.cosmosAccount.grantReadWrite(functionApp);
}
if (this.storageAccount) {
  this.storageAccount.grantReadWrite(functionApp);
}
if (this.keyVault) {
  this.keyVault.grantRead(functionApp);
}
```

**Future Enhancement**: Allow backend configuration to specify grant permissions.

### Decision 4: Attachment Point Configuration

**Choice**: Keep existing attachment point API, use configs to configure CDK constructs

**Rationale**:
- Attachment points are part of backend API
- Users configure resources via attachments
- Mapper translates attachment configs to CDK construct props

**Implementation**:
```typescript
const config = this.getCosmosDBConfig(backend);

const account = new DatabaseAccounts(stack, 'CosmosAccount', {
  databaseAccountName: config.accountName,  // From attachment
  enableServerless: config.enableAutoscale !== false,  // From attachment
  consistencyLevel: config.consistencyLevel || 'Session',  // From attachment with default
});
```

**Maintains backward compatibility** with existing attachment API.

### Decision 5: Validation Strategy

**Choice**: Rely on lib's validation pipeline

**Rationale**:
- Lib has comprehensive validation (schema, naming, limits, ARM resources)
- Don't duplicate validation logic
- Validation runs automatically during App.synth()

**Implementation**:
```typescript
const assembly = await synthesizer.synthesize(app, {
  skipValidation: options.validate === false,  // Honor user's validation preference
});
```

**Removes** component's minimal validation in favor of lib's comprehensive validation.

### Decision 6: Return Type Change

**Choice**: Change return type from `SynthesisResult` to `CloudAssembly`

**Rationale**:
- CloudAssembly is richer than SynthesisResult
- Includes manifest, metadata, function packages
- Standard output format across lib/CDK ecosystem

**Migration Path**:
```typescript
// Old (SynthesisResult)
interface SynthesisResult {
  template: ARMTemplate;
  context: SynthesisContext;
  analysis: BackendAnalysis;
  resourceCount: number;
}

// New (CloudAssembly)
interface CloudAssembly {
  manifest: {
    version: string;
    stacks: StackManifest[];
  };
  stacks: Map<string, ArmTemplate>;
  functions: Map<string, FunctionPackage>;
}

// Access template from CloudAssembly
const template = assembly.stacks.get(stackName);
```

**Breaking Change**: Yes, but enhancement.
**Mitigation**: Document migration, provide helper to extract template.

## Cross-Cutting Concerns

### Error Handling

**Strategy**: Fail fast with clear error messages

**Implementation**:
- CDK constructs validate props in constructor (compile-time + runtime)
- Lib synthesis validates during synthesis phases
- BackendSynthesizer catches and wraps errors with context

```typescript
try {
  const assembly = await synthesizer.synthesize(app, options);
  return assembly;
} catch (error) {
  throw new Error(
    `Backend synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
    `Backend: ${backend.settings.name}\n` +
    `Environment: ${context.environment}`
  );
}
```

### Performance

**Considerations**:
- Creating construct tree is fast (in-memory object graph)
- Synthesis is I/O bound (writing files)
- Validation adds overhead but catches errors early

**Optimizations**:
- Lazy construct creation (only create what's needed)
- Parallel file writes in assembly phase (lib handles this)
- Skip validation if explicitly disabled

### Testing

**Strategy**: Test at multiple levels

**Unit Tests**:
- BackendResourceMapper: Test construct creation from backend config
- Verify correct CDK constructs are created
- Verify props are mapped correctly

**Integration Tests**:
- End-to-end synthesis from backend to CloudAssembly
- Verify ARM templates match expected structure
- Verify validation catches errors

**Example**:
```typescript
describe('BackendResourceMapper', () => {
  it('creates Cosmos DB constructs for CRUD models', async () => {
    const backend = defineBackend({
      schema: defineSchema({
        models: {
          User: a.model({ name: a.string() }),
        },
      }),
      settings: { name: 'test-app' },
    });

    const app = new App();
    const stack = new ResourceGroupStack(app, 'TestStack', {
      resourceGroup: { resourceGroupName: 'test-rg', location: 'eastus' },
    });

    const mapper = new BackendResourceMapper();
    const analysis = { models: { crud: [{ name: 'User', type: 'crud', definition: {} }] } };

    await mapper.synthesizeBackendToStack(backend, stack, context, analysis);

    // Verify constructs were created
    const cosmosAccount = stack.node.findChild('CosmosAccount');
    expect(cosmosAccount).toBeDefined();
    expect(cosmosAccount).toBeInstanceOf(DatabaseAccounts);
  });
});
```

## Migration Path

### Phase 1: Create New Implementation

1. Create `BackendResourceMapper` class
2. Update `BackendSynthesizer` to use new mapper
3. Add integration tests
4. Verify ARM output matches current output

### Phase 2: Deprecate Old Implementation

1. Mark `ResourceMapper` as deprecated
2. Update documentation to use new approach
3. Add migration guide

### Phase 3: Remove Old Implementation

1. Remove `ResourceMapper` class
2. Remove duplicate ARM type definitions
3. Clean up unused imports

### Backward Compatibility

**API Compatibility**:
- Backend definition API unchanged
- Attachment point API unchanged
- Synthesis options API mostly unchanged

**Breaking Changes**:
- Return type changes from `SynthesisResult` to `CloudAssembly`
- Accessing template requires `assembly.stacks.get(stackName)` instead of `result.template`

**Mitigation**:
```typescript
// Helper function for backward compatibility
export function getTemplate(assembly: CloudAssembly, stackName?: string): ARMTemplate {
  if (stackName) {
    return assembly.stacks.get(stackName)!;
  }
  // Get first stack if name not provided
  return Array.from(assembly.stacks.values())[0];
}

// Users can use:
const assembly = await synthesizer.synthesize(backend);
const template = getTemplate(assembly, backend.settings.name);
```

## Success Metrics

### Functional Metrics

1. All existing backend definitions synthesize successfully
2. Generated ARM templates are equivalent to current implementation
3. Validation catches more errors than current implementation
4. RBAC grants work correctly

### Quality Metrics

1. Code coverage >= 80% for new BackendResourceMapper
2. Zero regressions in existing tests
3. Documentation updated with new architecture

### Performance Metrics

1. Synthesis time <= current implementation + 10%
2. Memory usage <= current implementation + 20%

## Future Enhancements

### Phase 1 Enhancements (Post-Migration)

1. **Full naming context** - Create SubscriptionStack parent for complete naming
2. **Custom RBAC** - Allow backend config to specify grant permissions
3. **Cross-stack references** - Support referencing resources across stacks
4. **Template customization** - Allow users to customize generated constructs

### Phase 2 Enhancements

1. **CDK Aspects** - Support cross-cutting concerns (tagging, compliance)
2. **Escape hatches** - Allow direct ARM JSON for advanced scenarios
3. **Multi-stack backends** - Split large backends across multiple stacks
4. **Policy enforcement** - Azure Policy integration via constructs

## Appendix

### Key Files

**New/Modified Files**:
- `packages/component/src/synthesis/backend-resource-mapper.ts` (NEW)
- `packages/component/src/synthesis/backend-synthesizer.ts` (MODIFIED)
- `packages/component/src/synthesis/types.ts` (MODIFIED - remove duplicates)

**Deprecated Files**:
- `packages/component/src/synthesis/resource-mapper.ts` (DEPRECATED)

### Dependencies

**New Dependencies**:
- `@atakora/cdk/documentdb` - Cosmos DB constructs
- `@atakora/cdk/storage` - Storage constructs
- `@atakora/cdk/keyvault` - Key Vault constructs
- `@atakora/cdk/web` - Web/Function App constructs
- `@atakora/cdk/insights` - Application Insights constructs
- `@atakora/lib` - App, Stack, Synthesizer

**Removed Dependencies**:
- None (we use lib's types instead of duplicating, but no new package dependencies)

### References

- [Current State Analysis](./synthesis-current-state-analysis.md)
- [ADR-021: Component Synthesis CDK Integration](./adr-021-component-synthesis-cdk-integration.md) (to be created)
- [Implementation Plan](./synthesis-cdk-integration-implementation-plan.md) (to be created)
