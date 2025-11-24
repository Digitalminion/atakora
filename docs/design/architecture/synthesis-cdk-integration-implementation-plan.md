# Component Synthesis CDK Integration - Implementation Plan

**Author**: Becky (Staff Architect)
**Date**: 2025-11-22
**Status**: READY FOR IMPLEMENTATION
**Assigned To**: Devon (Developer)

## Overview

This implementation plan breaks down the refactoring of component synthesis to use CDK constructs into concrete, actionable tasks. The work is organized into three phases with clear dependencies and success criteria.

## Prerequisites

Before starting implementation:

1. Read [Current State Analysis](./synthesis-current-state-analysis.md)
2. Read [Architecture Design](./synthesis-cdk-integration-design.md)
3. Read [ADR-021](./adr-021-component-synthesis-cdk-integration.md)
4. Understand CDK construct system (`packages/cdk/`)
5. Understand lib synthesis system (`packages/lib/src/synthesis/`)

## Phase 1: Create New Implementation

**Goal**: Implement BackendResourceMapper using CDK constructs, integrate with lib synthesis

**Duration Estimate**: 3-5 days

### Task 1.1: Create BackendResourceMapper Foundation

**File**: `packages/component/src/synthesis/backend-resource-mapper.ts`

**Implementation**:

```typescript
import type { ResourceGroupStack } from '@atakora/lib';
import type { BackendObject } from '../backend/types';
import type { SynthesisContext, BackendAnalysis } from './types';

/**
 * Backend Resource Mapper - Maps backend models to CDK constructs
 *
 * Replaces the old ResourceMapper that manually built ARM JSON.
 * This new implementation creates proper CDK constructs and lets
 * the lib synthesis system generate ARM templates.
 */
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

    // 3. Monitoring (if enabled)
    if (context.features.monitoring && backend.monitoring) {
      await this.synthesizeMonitoring(backend, stack, context);
    }

    // 4. Networking (if enabled)
    if (context.features.networking && backend.network) {
      await this.synthesizeNetworking(backend, stack, context);
    }

    // 5. Performance (if enabled)
    if (context.features.performance && backend.performance) {
      await this.synthesizePerformance(backend, stack, context);
    }
  }

  // Method stubs to be implemented in subsequent tasks
  private async synthesizeStorage(...) { }
  private async synthesizeCompute(...) { }
  private async synthesizeMonitoring(...) { }
  private async synthesizeNetworking(...) { }
  private async synthesizePerformance(...) { }
}
```

**Success Criteria**:
- File created with proper TypeScript types
- All imports resolve correctly
- Compiles without errors
- Method signatures match design

**Dependencies**: None

**Estimated Time**: 1 hour

---

### Task 1.2: Implement Cosmos DB Synthesis

**File**: `packages/component/src/synthesis/backend-resource-mapper.ts`

**Implementation**:

```typescript
import { DatabaseAccounts, SqlDatabases, SqlContainers } from '@atakora/cdk/documentdb';

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

  // Storage Account and Key Vault to be implemented in subsequent tasks
}

private async synthesizeCosmosDB(
  backend: BackendObject,
  stack: ResourceGroupStack,
  context: SynthesisContext,
  analysis: BackendAnalysis
): Promise<void> {
  const config = this.getCosmosDBConfig(backend);

  // Create Cosmos DB account
  const account = new DatabaseAccounts(stack, 'CosmosAccount', {
    databaseAccountName: config.accountName,
    location: stack.location,
    enableServerless: config.enableAutoscale !== false,
    consistencyLevel: config.consistencyLevel || 'Session',
    enableAutomaticFailover: context.environment === 'production',
    publicNetworkAccess: 'disabled',
    tags: stack.tags,
  });

  // Create database
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

  // Create containers for CRUD models
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

  // Store reference for RBAC grants
  this.cosmosAccount = account;
}

// Helper methods (copied from old ResourceMapper)
private getCosmosDBConfig(backend: BackendObject): CosmosDBConfig {
  return backend.storage.database.isAttached()
    ? backend.storage.database.getConfig()
    : {};
}

private generateContainerName(modelName: string): string {
  return `${modelName.toLowerCase()}s`;
}

private determinePartitionKey(model: any): string {
  if (model.definition && model.definition.id) {
    return 'id';
  }
  if (model.definition) {
    for (const [fieldName, fieldDef] of Object.entries(model.definition)) {
      if ((fieldDef as any).isPartitionKey) {
        return fieldName;
      }
    }
  }
  return 'id';
}

private generateIndexingPolicy(model: any): any {
  return {
    automatic: true,
    indexingMode: 'consistent',
    includedPaths: [{ path: '/*' }],
    excludedPaths: [{ path: '/"_etag"/?' }],
  };
}

private getDefaultThroughput(context: SynthesisContext): number {
  switch (context.environment) {
    case 'production': return 4000;
    case 'staging': return 1000;
    case 'development': return 400;
    default: return 400;
  }
}

// Resource reference for RBAC grants
private cosmosAccount?: DatabaseAccounts;
```

**Success Criteria**:
- Cosmos DB account construct created correctly
- Database construct created with proper parent
- Containers created for each CRUD model
- Configuration from attachment points used correctly
- Compiles and passes type checking

**Dependencies**: Task 1.1

**Estimated Time**: 2-3 hours

---

### Task 1.3: Implement Storage Account Synthesis

**File**: `packages/component/src/synthesis/backend-resource-mapper.ts`

**Implementation**:

```typescript
import { StorageAccounts } from '@atakora/cdk/storage';

private async synthesizeStorage(
  backend: BackendObject,
  stack: ResourceGroupStack,
  context: SynthesisContext,
  analysis: BackendAnalysis
): Promise<void> {
  // ... Cosmos DB (already implemented)

  // 2. Storage Account for system needs
  await this.synthesizeStorageAccount(backend, stack, context);

  // Key Vault to be implemented in next task
}

private async synthesizeStorageAccount(
  backend: BackendObject,
  stack: ResourceGroupStack,
  context: SynthesisContext
): Promise<void> {
  const config = this.getStorageAccountConfig(backend);

  const storage = new StorageAccounts(stack, 'StorageAccount', {
    accountName: config.name,
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

private getStorageAccountConfig(backend: BackendObject): StorageAccountConfig {
  return backend.storage.account.isAttached()
    ? backend.storage.account.getConfig()
    : {};
}

private storageAccount?: StorageAccounts;
```

**Success Criteria**:
- Storage account construct created correctly
- Configuration from attachment points used
- Reference stored for RBAC grants

**Dependencies**: Task 1.2

**Estimated Time**: 1 hour

---

### Task 1.4: Implement Key Vault Synthesis

**File**: `packages/component/src/synthesis/backend-resource-mapper.ts`

**Implementation**:

```typescript
import { Vaults } from '@atakora/cdk/keyvault';

private async synthesizeStorage(
  backend: BackendObject,
  stack: ResourceGroupStack,
  context: SynthesisContext,
  analysis: BackendAnalysis
): Promise<void> {
  // ... Cosmos DB and Storage Account (already implemented)

  // 3. Key Vault for secrets
  if (backend.authentication || backend.settings.secrets) {
    await this.synthesizeKeyVault(backend, stack, context);
  }
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

private keyVault?: Vaults;
```

**Success Criteria**:
- Key Vault construct created correctly
- Production vs non-production settings applied
- Reference stored for RBAC grants

**Dependencies**: Task 1.3

**Estimated Time**: 1 hour

---

### Task 1.5: Implement Function App Synthesis

**File**: `packages/component/src/synthesis/backend-resource-mapper.ts`

**Implementation**:

```typescript
import { ServerFarms, Sites } from '@atakora/cdk/web';

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

  // Create App Service Plan
  const plan = new ServerFarms(stack, 'AppServicePlan', {
    location: stack.location,
    sku: {
      name: config.sku || (context.environment === 'production' ? 'EP1' : 'Y1'),
      tier: config.sku === 'Y1' ? 'Dynamic' : 'ElasticPremium',
    },
    reserved: true,
    tags: stack.tags,
  });

  // Build app settings
  const appSettings = [
    { name: 'FUNCTIONS_WORKER_RUNTIME', value: config.runtime || 'node' },
    { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' },
    {
      name: 'AzureWebJobsStorage',
      value: this.storageAccount!.connectionString,
    },
    ...(config.appSettings
      ? Object.entries(config.appSettings).map(([name, value]) => ({ name, value }))
      : []),
  ];

  // Create Function App
  const functionApp = new Sites(stack, 'FunctionApp', {
    location: stack.location,
    kind: 'functionapp,linux',
    serverFarmId: plan.resourceId,
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
    identity: { type: 'SystemAssigned' },
    tags: stack.tags,
  });

  // RBAC grants - automatic permission configuration!
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

private getFunctionAppConfig(backend: BackendObject): FunctionAppConfig {
  return backend.compute.functionApp.isAttached()
    ? backend.compute.functionApp.getConfig()
    : {};
}

private functionApp?: Sites;
```

**Success Criteria**:
- App Service Plan construct created
- Function App construct created with proper dependency on plan
- RBAC grants created for Cosmos DB, Storage, and Key Vault
- Configuration from attachment points used

**Dependencies**: Task 1.4

**Estimated Time**: 2-3 hours

---

### Task 1.6: Implement Monitoring Synthesis

**File**: `packages/component/src/synthesis/backend-resource-mapper.ts`

**Implementation**:

```typescript
import { Components } from '@atakora/cdk/insights';

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

  // Connect to Function App
  if (this.functionApp) {
    this.functionApp.addAppSetting(
      'APPINSIGHTS_INSTRUMENTATIONKEY',
      appInsights.instrumentationKey
    );
  }
}

private getAppInsightsConfig(backend: BackendObject): AppInsightsConfig {
  if (!backend.monitoring) return {};
  return backend.monitoring.appInsights.isAttached()
    ? backend.monitoring.appInsights.getConfig()
    : {};
}
```

**Success Criteria**:
- Application Insights construct created
- Instrumentation key connected to Function App
- Environment-specific retention configured

**Dependencies**: Task 1.5

**Estimated Time**: 1 hour

---

### Task 1.7: Update BackendSynthesizer to Use New Mapper

**File**: `packages/component/src/synthesis/backend-synthesizer.ts`

**Implementation**:

```typescript
import { App, ResourceGroupStack, Synthesizer } from '@atakora/lib';
import type { CloudAssembly } from '@atakora/lib';
import { BackendResourceMapper } from './backend-resource-mapper';

export class BackendSynthesizer {
  async synthesize(
    backend: BackendObject,
    options: Partial<SynthesisOptions> = {}
  ): Promise<CloudAssembly> {
    try {
      // Phase 1: Analyze backend (unchanged)
      const analysis = this.analyzeBackend(backend);

      // Phase 2: Create synthesis context (unchanged)
      const context = this.createSynthesisContext(backend, analysis, options);

      // Phase 3: Validate attachments (unchanged)
      await this.validateAttachments(backend, context);

      // NEW: Phase 4: Create construct tree
      const app = new App({
        outdir: options.outputDir || 'arm.out',
      });

      const stack = new ResourceGroupStack(app, backend.settings.name, {
        resourceGroup: {
          resourceGroupName: context.resourceGroup,
          location: context.region,
        },
        tags: context.tags,
      });

      // NEW: Use BackendResourceMapper to create CDK constructs
      const mapper = new BackendResourceMapper();
      await mapper.synthesizeBackendToStack(backend, stack, context, analysis);

      // NEW: Phase 5: Synthesize using lib's synthesis system
      const synthesizer = new Synthesizer();
      const assembly = await synthesizer.synthesize(app, {
        skipValidation: options.validate === false,
        prettyPrint: options.prettyPrint !== false,
      });

      return assembly;
    } catch (error) {
      throw new Error(
        `Backend synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
        `Backend: ${backend.settings.name}\n` +
        `Environment: ${backend.environment}`
      );
    }
  }

  // Keep all existing helper methods:
  // - analyzeBackend()
  // - discoverModels()
  // - discoverAttachments()
  // - analyzeDependencies()
  // - createSynthesisContext()
  // - normalizeEnvironment()
  // - regionToGeographyCode()
  // - detectCloudType()
  // - validateAttachments()
  // - validateAttachmentConfig()
  // (No changes to these methods)
}
```

**Success Criteria**:
- BackendSynthesizer creates App and Stack
- BackendResourceMapper called correctly
- Lib's Synthesizer called correctly
- Return type is CloudAssembly
- Error handling preserved

**Dependencies**: Tasks 1.1-1.6

**Estimated Time**: 2 hours

---

### Task 1.8: Update Types

**File**: `packages/component/src/synthesis/types.ts`

**Implementation**:

```typescript
import type { CloudAssembly, ArmTemplate, ArmResource } from '@atakora/lib';

// Re-export lib types for convenience
export type { CloudAssembly, ArmTemplate, ArmResource };

// Remove duplicate type definitions:
// - Remove ARMTemplate (use lib's ArmTemplate)
// - Remove ARMResource (use lib's ArmResource)
// - Remove ARMParameter (use lib's)
// - Remove ARMOutput (use lib's)

// Keep component-specific types:
// - SynthesisContext
// - BackendAnalysis
// - ModelInfo
// - AttachmentInfo
// - CosmosDBConfig
// - FunctionAppConfig
// - StorageAccountConfig
// - AppInsightsConfig
// - VNetConfig
```

**Success Criteria**:
- No duplicate type definitions
- Imports from lib resolve correctly
- All existing code compiles with new types

**Dependencies**: Task 1.7

**Estimated Time**: 1 hour

---

### Task 1.9: Add Helper for Backward Compatibility

**File**: `packages/component/src/synthesis/utils.ts` (NEW)

**Implementation**:

```typescript
import type { CloudAssembly, ArmTemplate } from '@atakora/lib';

/**
 * Extract ARM template from CloudAssembly
 *
 * Helper for backward compatibility with code expecting raw ARM template.
 *
 * @param assembly - CloudAssembly from synthesis
 * @param stackName - Optional stack name (uses first stack if not provided)
 * @returns ARM template
 */
export function getTemplate(
  assembly: CloudAssembly,
  stackName?: string
): ArmTemplate {
  if (stackName) {
    const template = assembly.stacks.get(stackName);
    if (!template) {
      throw new Error(`Stack '${stackName}' not found in assembly`);
    }
    return template;
  }

  // Get first stack if name not provided
  const templates = Array.from(assembly.stacks.values());
  if (templates.length === 0) {
    throw new Error('No stacks in assembly');
  }
  return templates[0];
}

/**
 * Get all stack names from CloudAssembly
 */
export function getStackNames(assembly: CloudAssembly): string[] {
  return Array.from(assembly.stacks.keys());
}
```

**File**: `packages/component/src/synthesis/index.ts`

**Update exports**:

```typescript
export { BackendSynthesizer } from './backend-synthesizer';
export { BackendResourceMapper } from './backend-resource-mapper';
export { getTemplate, getStackNames } from './utils';
export type * from './types';
```

**Success Criteria**:
- Helper functions work correctly
- Users can easily extract template from assembly
- Exports updated

**Dependencies**: Task 1.8

**Estimated Time**: 1 hour

---

### Task 1.10: Add Integration Tests

**File**: `packages/component/src/synthesis/__tests__/backend-synthesizer-cdk.test.ts` (NEW)

**Implementation**:

```typescript
import { defineBackend } from '../../backend/define-backend';
import { defineSchema } from '../../schema/define-schema';
import { BackendSynthesizer } from '../backend-synthesizer';
import { getTemplate } from '../utils';
import { a } from '../../schema';

describe('BackendSynthesizer - CDK Integration', () => {
  it('synthesizes simple backend to CloudAssembly', async () => {
    const backend = defineBackend({
      schema: defineSchema({
        models: {
          User: a.model({
            name: a.string(),
            email: a.string(),
          }),
        },
      }),
      settings: {
        name: 'test-app',
      },
    });

    const synthesizer = new BackendSynthesizer();
    const assembly = await synthesizer.synthesize(backend);

    expect(assembly).toBeDefined();
    expect(assembly.stacks.size).toBeGreaterThan(0);

    const template = getTemplate(assembly, 'test-app');
    expect(template).toBeDefined();
    expect(template.$schema).toContain('deploymentTemplate.json');
    expect(template.resources).toBeDefined();
    expect(Array.isArray(template.resources)).toBe(true);
  });

  it('creates Cosmos DB resources for CRUD models', async () => {
    const backend = defineBackend({
      schema: defineSchema({
        models: {
          User: a.model({ name: a.string() }),
          Post: a.model({ title: a.string() }),
        },
      }),
      settings: { name: 'test-app' },
    });

    const synthesizer = new BackendSynthesizer();
    const assembly = await synthesizer.synthesize(backend);
    const template = getTemplate(assembly, 'test-app');

    // Verify Cosmos DB account
    const cosmosAccount = template.resources.find(
      (r: any) => r.type === 'Microsoft.DocumentDB/databaseAccounts'
    );
    expect(cosmosAccount).toBeDefined();

    // Verify database
    const database = template.resources.find(
      (r: any) => r.type === 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases'
    );
    expect(database).toBeDefined();

    // Verify containers (should be 2 - one per model)
    const containers = template.resources.filter(
      (r: any) => r.type === 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers'
    );
    expect(containers.length).toBe(2);
  });

  it('creates Function App with RBAC grants', async () => {
    const backend = defineBackend({
      schema: defineSchema({
        models: {
          User: a.model({ name: a.string() }),
        },
      }),
      settings: { name: 'test-app' },
    });

    const synthesizer = new BackendSynthesizer();
    const assembly = await synthesizer.synthesize(backend);
    const template = getTemplate(assembly, 'test-app');

    // Verify Function App
    const functionApp = template.resources.find(
      (r: any) => r.type === 'Microsoft.Web/sites' && r.kind?.includes('functionapp')
    );
    expect(functionApp).toBeDefined();
    expect(functionApp.identity.type).toBe('SystemAssigned');

    // Verify role assignments exist (RBAC grants)
    const roleAssignments = template.resources.filter(
      (r: any) => r.type === 'Microsoft.Authorization/roleAssignments'
    );
    expect(roleAssignments.length).toBeGreaterThan(0);
  });

  it('respects attachment point configurations', async () => {
    const backend = defineBackend({
      schema: defineSchema({
        models: {
          User: a.model({ name: a.string() }),
        },
      }),
      settings: { name: 'test-app' },
    });

    // Attach custom Cosmos DB config
    backend.storage.database.attach({
      accountName: 'custom-cosmos-account',
      consistencyLevel: 'Strong',
    });

    const synthesizer = new BackendSynthesizer();
    const assembly = await synthesizer.synthesize(backend);
    const template = getTemplate(assembly, 'test-app');

    const cosmosAccount = template.resources.find(
      (r: any) => r.type === 'Microsoft.DocumentDB/databaseAccounts'
    );

    expect(cosmosAccount.name).toBe('custom-cosmos-account');
    expect(cosmosAccount.properties.consistencyPolicy.defaultConsistencyLevel).toBe('Strong');
  });

  it('creates monitoring resources when feature enabled', async () => {
    const backend = defineBackend({
      schema: defineSchema({
        models: {
          User: a.model({ name: a.string() }),
        },
      }),
      settings: {
        name: 'test-app',
        features: {
          monitoring: true,
        },
      },
    });

    const synthesizer = new BackendSynthesizer();
    const assembly = await synthesizer.synthesize(backend, { validate: false });
    const template = getTemplate(assembly, 'test-app');

    const appInsights = template.resources.find(
      (r: any) => r.type === 'Microsoft.Insights/components'
    );
    expect(appInsights).toBeDefined();
  });

  it('validates templates through lib validation pipeline', async () => {
    const backend = defineBackend({
      schema: defineSchema({
        models: {
          User: a.model({ name: a.string() }),
        },
      }),
      settings: { name: 'test-app' },
    });

    const synthesizer = new BackendSynthesizer();

    // With validation enabled (default)
    await expect(
      synthesizer.synthesize(backend, { validate: true })
    ).resolves.toBeDefined();

    // Should not throw - validation passed
  });
});
```

**Success Criteria**:
- All tests pass
- Coverage >= 80% for BackendSynthesizer and BackendResourceMapper
- Tests verify ARM output correctness
- Tests verify RBAC grants are created
- Tests verify attachment configurations are respected

**Dependencies**: Tasks 1.1-1.9

**Estimated Time**: 3-4 hours

---

### Task 1.11: Add Equivalence Tests (ARM Output Comparison)

**File**: `packages/component/src/synthesis/__tests__/arm-equivalence.test.ts` (NEW)

**Purpose**: Verify new implementation generates equivalent ARM JSON to old implementation

**Implementation**:

```typescript
import { defineBackend } from '../../backend/define-backend';
import { defineSchema } from '../../schema/define-schema';
import { BackendSynthesizer } from '../backend-synthesizer';
import { ResourceMapper } from '../resource-mapper'; // Old implementation
import { getTemplate } from '../utils';
import { a } from '../../schema';

describe('ARM Output Equivalence', () => {
  // Test that new CDK-based implementation generates equivalent ARM to old manual implementation
  // (accounting for differences like auto-generated names, RBAC grants, etc.)

  it('generates equivalent Cosmos DB account resource', async () => {
    const backend = defineBackend({
      schema: defineSchema({
        models: {
          User: a.model({ name: a.string() }),
        },
      }),
      settings: { name: 'test-app' },
    });

    // Fix Cosmos DB account name to avoid auto-generation differences
    backend.storage.database.attach({
      accountName: 'fixed-cosmos-account',
    });

    const synthesizer = new BackendSynthesizer();
    const assembly = await synthesizer.synthesize(backend);
    const newTemplate = getTemplate(assembly, 'test-app');

    const newCosmosAccount = newTemplate.resources.find(
      (r: any) => r.type === 'Microsoft.DocumentDB/databaseAccounts'
    );

    // Verify key properties match expected structure
    expect(newCosmosAccount.name).toBe('fixed-cosmos-account');
    expect(newCosmosAccount.kind).toBe('GlobalDocumentDB');
    expect(newCosmosAccount.properties.databaseAccountOfferType).toBe('Standard');
    expect(newCosmosAccount.properties.consistencyPolicy.defaultConsistencyLevel).toBe('Session');
    expect(newCosmosAccount.properties.publicNetworkAccess).toBe('disabled');
  });

  // Add more equivalence tests for other resource types
});
```

**Success Criteria**:
- Tests verify ARM resources have equivalent structure
- Tests account for intentional differences (RBAC grants, auto-naming)
- All equivalence tests pass

**Dependencies**: Task 1.10

**Estimated Time**: 2-3 hours

---

## Phase 2: Deprecate Old Implementation

**Goal**: Mark old code as deprecated, update documentation

**Duration Estimate**: 1-2 days

### Task 2.1: Mark ResourceMapper as Deprecated

**File**: `packages/component/src/synthesis/resource-mapper.ts`

**Implementation**:

```typescript
/**
 * Resource Mapper
 *
 * @deprecated Use BackendResourceMapper instead. This class manually builds
 * ARM JSON and will be removed in the next major version.
 *
 * The new BackendResourceMapper uses CDK constructs for better type safety,
 * validation, and RBAC support.
 *
 * See: packages/component/src/synthesis/backend-resource-mapper.ts
 *
 * @internal
 */
export class ResourceMapper {
  constructor() {
    console.warn(
      'ResourceMapper is deprecated and will be removed in the next major version. ' +
      'Use BackendResourceMapper instead.'
    );
  }
  // ... existing implementation
}
```

**Success Criteria**:
- Deprecation warning in JSDoc
- Console warning when instantiated
- Still functional (not removed yet)

**Dependencies**: Phase 1 complete

**Estimated Time**: 30 minutes

---

### Task 2.2: Update Documentation

**Files**:
- `packages/component/README.md`
- `docs/synthesis/README.md`
- API documentation

**Implementation**:

Update README to reference new architecture:

```markdown
## Synthesis

The component package synthesis system converts backend definitions into Azure ARM templates.

### Architecture

The synthesis pipeline:

1. **Backend Analysis** - Discovers models and attachments
2. **Construct Tree Creation** - Creates CDK constructs using BackendResourceMapper
3. **Synthesis** - Lib's synthesis system generates ARM templates
4. **Output** - Returns CloudAssembly with templates and metadata

### Usage

```typescript
import { BackendSynthesizer, getTemplate } from '@atakora/component/synthesis';

const synthesizer = new BackendSynthesizer();
const assembly = await synthesizer.synthesize(backend);

// Extract template
const template = getTemplate(assembly, backend.settings.name);
```

### Migration from Old API

If you were using the old SynthesisResult return type:

```typescript
// Old API
const result = await synthesizer.synthesize(backend);
const template = result.template;

// New API
const assembly = await synthesizer.synthesize(backend);
const template = getTemplate(assembly, backend.settings.name);
```

See [Migration Guide](./docs/synthesis/migration-guide.md) for details.
```

**Success Criteria**:
- Documentation reflects new architecture
- Migration guide available
- Examples updated

**Dependencies**: Task 2.1

**Estimated Time**: 2-3 hours

---

### Task 2.3: Create Migration Guide

**File**: `docs/synthesis/migration-guide.md` (NEW)

**Implementation**:

```markdown
# Synthesis API Migration Guide

## Overview

The component synthesis system has been refactored to use CDK constructs instead of manually building ARM JSON. This provides better type safety, validation, and RBAC support.

## Breaking Changes

### Return Type Change

**Before**: `SynthesisResult`
```typescript
interface SynthesisResult {
  template: ARMTemplate;
  context: SynthesisContext;
  analysis: BackendAnalysis;
  resourceCount: number;
}
```

**After**: `CloudAssembly`
```typescript
interface CloudAssembly {
  manifest: { version: string; stacks: StackManifest[] };
  stacks: Map<string, ArmTemplate>;
  functions: Map<string, FunctionPackage>;
}
```

### Migration Steps

1. Update synthesis call:
   ```typescript
   // Before
   const result = await synthesizer.synthesize(backend);
   const template = result.template;

   // After
   const assembly = await synthesizer.synthesize(backend);
   const template = getTemplate(assembly, backend.settings.name);
   ```

2. Access metadata:
   ```typescript
   // Before
   const resourceCount = result.resourceCount;
   const context = result.context;

   // After
   const stackManifest = assembly.manifest.stacks[0];
   const resourceCount = stackManifest.resourceCount;
   ```

## Benefits

The new implementation provides:

- **Type Safety** - All resource configurations have TypeScript types
- **Validation** - Comprehensive validation via lib's validation pipeline
- **RBAC** - Automatic permission grants between resources
- **Dependencies** - Automatic dependency tracking
- **Metadata** - Rich metadata in CloudAssembly

## See Also

- [Architecture Design](../design/architecture/synthesis-cdk-integration-design.md)
- [ADR-021](../design/architecture/adr-021-component-synthesis-cdk-integration.md)
```

**Success Criteria**:
- Migration guide covers all breaking changes
- Examples provided for common scenarios
- Links to detailed documentation

**Dependencies**: Task 2.2

**Estimated Time**: 1-2 hours

---

## Phase 3: Remove Old Implementation

**Goal**: Remove deprecated code

**Duration Estimate**: 1 day

### Task 3.1: Remove ResourceMapper

**File**: `packages/component/src/synthesis/resource-mapper.ts`

**Implementation**: Delete file

**Files to Update**:
- `packages/component/src/synthesis/index.ts` - Remove export
- Remove any remaining imports in tests

**Success Criteria**:
- File deleted
- No imports of ResourceMapper remain
- All tests pass

**Dependencies**: Phase 2 complete + at least one release cycle

**Estimated Time**: 1 hour

---

### Task 3.2: Clean Up Types

**File**: `packages/component/src/synthesis/types.ts`

**Implementation**: Final cleanup

Ensure no duplicate ARM type definitions remain (should already be done in Task 1.8).

**Success Criteria**:
- Only component-specific types remain
- All lib types imported
- No duplication

**Dependencies**: Task 3.1

**Estimated Time**: 30 minutes

---

### Task 3.3: Update CHANGELOG

**File**: `packages/component/CHANGELOG.md`

**Implementation**:

```markdown
## [2.0.0] - 2025-XX-XX

### Breaking Changes

- **Synthesis return type**: `BackendSynthesizer.synthesize()` now returns `CloudAssembly` instead of `SynthesisResult`
  - Use `getTemplate(assembly, stackName)` to extract ARM template
  - See migration guide: docs/synthesis/migration-guide.md

### Added

- CDK construct integration for synthesis
- Automatic RBAC grants between resources
- Comprehensive validation via lib's validation pipeline
- Richer metadata in CloudAssembly output

### Changed

- Refactored synthesis to use `BackendResourceMapper` with CDK constructs
- Integrated with lib's synthesis system for validation and assembly

### Removed

- `ResourceMapper` class (replaced by `BackendResourceMapper`)
- Duplicate ARM type definitions (now use lib's types)

### Migration

See [Migration Guide](./docs/synthesis/migration-guide.md) for upgrading from v1.x.
```

**Success Criteria**:
- CHANGELOG updated
- Breaking changes documented
- Migration guide referenced

**Dependencies**: Task 3.2

**Estimated Time**: 30 minutes

---

## Testing Strategy

### Unit Tests

**Coverage Target**: >= 80%

**Key Areas**:
- BackendResourceMapper construct creation
- Configuration mapping from attachment points
- Helper methods (naming, indexing, etc.)

### Integration Tests

**Focus**: End-to-end synthesis

**Test Cases**:
- Simple backend with one model
- Complex backend with multiple models
- Backend with attachments
- Backend with monitoring enabled
- Backend with networking enabled

### Equivalence Tests

**Purpose**: Verify ARM output matches old implementation

**Approach**: Generate ARM with both old and new implementation, compare

**Acceptance**: Structural equivalence (accounting for intentional differences)

### Regression Tests

**Goal**: Ensure no existing functionality breaks

**Approach**: Run all existing component tests with new implementation

**Acceptance**: All tests pass

## Rollout Plan

### Stage 1: Internal Testing (Week 1)

- Implement Phase 1
- Run comprehensive tests
- Verify ARM output equivalence

### Stage 2: Alpha Release (Week 2)

- Deprecate old implementation (Phase 2)
- Release as alpha version for early adopters
- Gather feedback

### Stage 3: Beta Release (Week 3-4)

- Address feedback
- Update documentation
- Release as beta

### Stage 4: Stable Release (Week 5)

- Remove old implementation (Phase 3)
- Release as v2.0.0
- Monitor for issues

## Success Criteria

### Functional

1. All existing backend definitions synthesize successfully
2. Generated ARM templates are functionally equivalent
3. Validation catches errors before deployment
4. RBAC grants work correctly

### Quality

1. Code coverage >= 80%
2. Zero regressions
3. Documentation complete and accurate
4. Migration guide clear and helpful

### Performance

1. Synthesis time <= current + 10%
2. Memory usage <= current + 20%

## Risk Mitigation

### Risk 1: Breaking Changes Impact Users

**Mitigation**:
- Comprehensive migration guide
- Deprecation warnings in advance
- Helper functions for backward compatibility
- Examples of migration

### Risk 2: ARM Output Differences

**Mitigation**:
- Equivalence tests
- Compare ARM output before/after
- Document intentional differences
- Provide override mechanism if needed

### Risk 3: Performance Regression

**Mitigation**:
- Performance benchmarks before/after
- Profile synthesis pipeline
- Optimize if needed

### Risk 4: CDK Construct Bugs

**Mitigation**:
- Comprehensive testing of constructs
- Integration tests with real Azure deployments
- Fallback to manual ARM if needed (escape hatch)

## Timeline

**Phase 1**: 3-5 days (implementation + testing)
**Phase 2**: 1-2 days (deprecation + docs)
**Phase 3**: 1 day (removal)
**Total**: ~7-8 days of development time

**Calendar Time**: 2-3 weeks including review, testing, feedback

## Assignment

**Primary**: Devon (Developer)
**Reviewer**: Becky (Architect)
**Testing**: Charlie (Quality Lead)
**Documentation**: Ella (Docs)

## Questions and Clarifications

If you have questions during implementation:

1. Review the design documents:
   - [Current State Analysis](./synthesis-current-state-analysis.md)
   - [Architecture Design](./synthesis-cdk-integration-design.md)
   - [ADR-021](./adr-021-component-synthesis-cdk-integration.md)

2. Check existing CDK constructs for patterns

3. Ask Becky for architectural guidance

4. Ask Charlie for testing strategy questions

## Appendix: File Structure

```
packages/component/src/synthesis/
├── backend-synthesizer.ts       (MODIFIED - Phase 1)
├── backend-resource-mapper.ts   (NEW - Phase 1)
├── resource-mapper.ts           (DEPRECATED - Phase 2, REMOVED - Phase 3)
├── types.ts                     (MODIFIED - Phase 1)
├── utils.ts                     (NEW - Phase 1)
├── index.ts                     (MODIFIED - Phase 1)
└── __tests__/
    ├── backend-synthesizer-cdk.test.ts  (NEW - Phase 1)
    └── arm-equivalence.test.ts          (NEW - Phase 1)
```
