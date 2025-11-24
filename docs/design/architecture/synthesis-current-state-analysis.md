# Component Package Synthesis Architecture - Current State Analysis

**Author**: Becky (Staff Architect)
**Date**: 2025-11-22
**Status**: ANALYSIS COMPLETE

## Executive Summary

The component package's synthesis pipeline is **manually constructing ARM JSON objects** instead of leveraging the existing CDK construct system. This creates:

- **Duplicate logic** - Resource configuration logic exists in both ResourceMapper and CDK constructs
- **Lost type safety** - Manual ARM JSON bypasses TypeScript interfaces and validation
- **Missing features** - RBAC grants, dependency tracking, and validation are not utilized
- **Fragile code** - Changes to ARM API versions or properties require updates in multiple places
- **No construct benefits** - Naming, defaults, and best practices are implemented ad-hoc

## Current Architecture

### Component Synthesis Pipeline (packages/component/src/synthesis/)

The component package has three key files implementing synthesis:

#### 1. BackendSynthesizer (backend-synthesizer.ts)

**Role**: Main orchestrator for backend-to-ARM synthesis

**Current Flow**:
```
Backend Object → Analyze → Create Context → Validate Attachments → Synthesize Resources → Generate Template
```

**Phases**:
1. **Phase 1: Analyze** - Discovers models (CRUD/Event/Function) and attachments
2. **Phase 2: Context** - Creates synthesis context with environment, naming, region
3. **Phase 3: Validate** - Basic attachment validation
4. **Phase 4: Synthesize** - Delegates to ResourceMapper to create ARM resources
5. **Phase 5: Assemble** - Creates complete ARM template with parameters/outputs
6. **Phase 6: Validate** - Basic ARM template schema validation

**Key Methods**:
- `analyzeBackend()` - Discovers models and attachments from BackendObject
- `discoverModels()` - Extracts CRUD/Event/Function models from schema
- `discoverAttachments()` - Identifies attached configurations
- `synthesizeResources()` - Delegates to ResourceMapper
- `generateTemplate()` - Assembles final ARM template

**Analysis**: This orchestrator is well-structured but outputs raw ARM JSON instead of a CloudAssembly from the lib synthesis system.

#### 2. ResourceMapper (resource-mapper.ts)

**Role**: Maps backend models to ARM resources

**Current Approach**: **MANUALLY BUILDS ARM JSON**

**Example - Cosmos DB Account** (lines 93-118):
```typescript
resources.push({
  type: 'Microsoft.DocumentDB/databaseAccounts',
  apiVersion: '2023-04-15',
  name: accountName,
  location: context.region,
  tags: context.tags,
  kind: 'GlobalDocumentDB',
  properties: {
    databaseAccountOfferType: 'Standard',
    consistencyPolicy: {
      defaultConsistencyLevel: config.consistencyLevel || 'Session',
    },
    locations: [
      {
        locationName: context.region,
        failoverPriority: 0,
        isZoneRedundant: context.environment === 'production',
      },
    ],
    enableAutomaticFailover: context.environment === 'production',
    enableMultipleWriteLocations: false,
    capabilities: config.enableAutoscale
      ? [{ name: 'EnableServerless' }]
      : [],
  },
});
```

**Problem**: This is duplicating logic that already exists in `@atakora/cdk/documentdb/DatabaseAccounts`!

**Resources Manually Created**:
- Cosmos DB Database Accounts (lines 93-118)
- Cosmos DB SQL Databases (lines 121-142)
- Cosmos DB Containers (lines 178-197)
- Storage Accounts (lines 214-232)
- Key Vaults (lines 248-270)
- App Service Plans (lines 322-335)
- Function Apps (lines 338-385)
- Application Insights (lines 423-438)
- Virtual Networks (lines 474-496)

**Key Methods**:
- `synthesizeStorage()` - Creates Cosmos DB, Storage Account, Key Vault
- `synthesizeCosmosDB()` - Manually builds Cosmos DB account/database/containers
- `synthesizeCompute()` - Creates Function App and App Service Plan
- `synthesizeMonitoring()` - Creates Application Insights
- `synthesizeNetworking()` - Creates VNet

**Issues Identified**:
1. **No dependency tracking** - Uses manual `dependsOn` arrays (error-prone)
2. **Hardcoded API versions** - API versions scattered throughout (e.g., '2023-04-15', '2022-09-01')
3. **No RBAC support** - Can't use `.grantRead()` or `.grantWrite()` methods
4. **No validation** - Missing CDK construct validation logic
5. **Fragile naming** - Uses ResourceNameGenerator but doesn't integrate with construct tree
6. **No cross-stack references** - Can't reference resources across stacks

#### 3. Types (types.ts)

**Role**: Type definitions for synthesis system

**Key Types**:
- `ARMTemplate` - ARM template structure (lines 16-23)
- `ARMResource` - ARM resource definition (lines 48-67)
- `SynthesisContext` - Synthesis context with backend, environment, naming (lines 101-161)
- `BackendAnalysis` - Analysis of models and attachments (lines 166-200)
- Resource configs: `CosmosDBConfig`, `FunctionAppConfig`, `StorageAccountConfig`, etc.

**Analysis**: These types duplicate what exists in lib's synthesis system. The component package has its own ARM type definitions instead of using lib's.

### What Exists in CDK Package (packages/cdk/src/)

The CDK package has **proper L2 constructs** that ResourceMapper should be using:

#### Cosmos DB Constructs (@atakora/cdk/documentdb)

**DatabaseAccounts** (cosmos-db.ts):
- L2 construct with intent-based API
- Auto-generates account names with uniqueness hash
- Defaults consistency to Session
- Defaults publicNetworkAccess to disabled
- Builds locations array automatically
- Adds EnableServerless capability if requested
- Implements IGrantable for RBAC
- Full type safety via TypeScript interfaces

**SqlDatabases** (cosmos-db-database.ts):
- L2 construct for Cosmos DB databases
- Auto-generates database names
- Supports throughput and autoscale configuration
- Proper dependency on parent account

**SqlContainers** (cosmos-db-container.ts):
- L2 construct for Cosmos DB containers
- Auto-generates container names
- Partition key configuration
- Indexing policy support
- Proper dependency on parent database

#### Storage Constructs (@atakora/cdk/storage)

**StorageAccounts** (storage-accounts.ts):
- L2 construct for Azure Storage
- Auto-naming with global uniqueness
- Defaults to HTTPS-only, TLS 1.2
- Implements IGrantable for RBAC
- Blob, Queue, Table, File service configuration

#### Web Constructs (@atakora/cdk/web)

**ServerFarms** (server-farms.ts):
- L2 construct for App Service Plans
- SKU configuration (Y1, EP1, EP2, EP3, etc.)
- Linux/Windows support
- Auto-naming

**Sites** (sites.ts):
- L2 construct for Function Apps and Web Apps
- Runtime configuration (Node, Python, .NET, Java)
- App settings management
- CORS configuration
- System-assigned managed identity
- Proper dependency on server farm

### What Exists in Lib Package (packages/lib/src/)

The lib package has a **complete synthesis system** that component package is not using:

#### App and Stack System (lib/src/core/)

**App** (app.ts):
- Root of construct tree
- `synth()` method that triggers synthesis
- Outputs CloudAssembly with manifest
- Context management
- User profile and project config loading

**ResourceGroupStack** (resource-group-stack.ts):
- Stack that deploys to an Azure resource group
- Inherits naming context from parent SubscriptionStack
- `generateResourceName()` method for consistent naming
- Tags management
- Metadata for synthesis

#### Synthesis System (lib/src/synthesis/)

**Synthesizer** (synthesizer.ts):
- Main orchestrator for synthesis pipeline
- **Four phases**:
  1. **Prepare**: TreeTraverser + ResourceCollector
  2. **Transform**: ResourceTransformer + DependencyResolver
  3. **Validate**: ValidationPipeline with multiple validators
  4. **Assembly**: FileWriter + Template splitter

**Key Features**:
- Automatic dependency resolution
- Topological sorting of resources
- Validation pipeline (schema, naming, limits, ARM resources)
- Template splitting for large deployments
- Function packaging for Azure Functions
- CloudAssembly manifest generation

**CloudAssembly Output**:
```typescript
interface CloudAssembly {
  manifest: {
    version: string;
    stacks: StackManifest[];
  };
  stacks: Map<string, ArmTemplate>;
  functions: Map<string, FunctionPackage>;
}
```

## The Gap

### What Component Package Does

```
BackendObject → BackendSynthesizer → ResourceMapper → Manual ARM JSON → ARMTemplate
```

### What Component Package Should Do

```
BackendObject → Create App + Stacks → Use CDK Constructs → App.synth() → CloudAssembly
```

## Architectural Problems

### 1. Logic Duplication

**ResourceMapper manually creates Cosmos DB**:
```typescript
resources.push({
  type: 'Microsoft.DocumentDB/databaseAccounts',
  apiVersion: '2023-04-15',  // Hardcoded version
  name: accountName,
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: config.consistencyLevel || 'Session',  // Manual default
    },
    // ... 30+ lines of manual property construction
  }
});
```

**DatabaseAccounts construct already does this**:
```typescript
const cosmos = new DatabaseAccounts(stack, 'Database', {
  enableServerless: true,  // Intent-based API
  location: stack.location,
  // Automatically handles:
  // - Naming
  // - Default consistency to Session
  // - Default publicNetworkAccess to disabled
  // - Locations array construction
  // - Capabilities for serverless
  // - Dependency tracking
});
```

**Impact**: Every time ARM API changes or a best practice updates, we must change it in TWO places.

### 2. Lost Type Safety

**Manual ARM JSON has no type safety**:
```typescript
resources.push({
  type: 'Microsoft.DocumentDB/databaseAccounts',  // String - could be typo
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: 'Sesion',  // Typo not caught by compiler!
    }
  }
});
```

**CDK constructs have full type safety**:
```typescript
new DatabaseAccounts(stack, 'Database', {
  consistencyLevel: 'Session',  // Type: ConsistencyLevel - typos caught at compile time
  publicNetworkAccess: 'enabled',  // Type: PublicNetworkAccess - only valid values allowed
});
```

**Impact**: Runtime errors instead of compile-time errors. No IntelliSense support.

### 3. Missing RBAC Support

**Component package can't grant permissions**:
```typescript
// No way to do this in component package:
cosmos.grantRead(functionApp);  // ERROR: Method doesn't exist on manual ARM object
```

**CDK constructs support grants**:
```typescript
const cosmos = new DatabaseAccounts(stack, 'Database', { ... });
const functionApp = new Sites(stack, 'FunctionApp', { ... });

// Automatically creates role assignment
cosmos.grantRead(functionApp);  // Creates RBAC role assignment resource
```

**Impact**: No automatic RBAC configuration. Must manually create role assignments.

### 4. No Dependency Tracking

**Manual dependencies are error-prone**:
```typescript
resources.push({
  type: 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases',
  dependsOn: [
    `[resourceId('Microsoft.DocumentDB/databaseAccounts', '${accountName}')]`,  // Manual string
  ]
});
// What if accountName changes? What if the resource is renamed? Silent failure!
```

**CDK constructs track dependencies automatically**:
```typescript
const account = new DatabaseAccounts(stack, 'Account', { ... });
const database = new SqlDatabases(account, 'Database', { ... });  // Automatic dependency!
// Database resource automatically depends on Account resource
```

**Impact**: Fragile deployment dependencies. Easy to create circular dependencies or missing dependencies.

### 5. No Validation

**Component package has minimal validation**:
```typescript
private async validateTemplate(template: ARMTemplate, context: SynthesisContext): Promise<void> {
  if (!template.$schema) {
    throw new Error('ARM template is missing $schema');
  }
  // That's it! No other validation.
}
```

**Lib synthesis has comprehensive validation**:
- Schema validation (ARM JSON schema compliance)
- Naming convention validation (Azure naming rules)
- Azure limit validation (max resources, name lengths, etc.)
- ARM resource validation (required properties, valid values)

**Impact**: Invalid templates can be generated and only fail at deployment time.

### 6. Hardcoded API Versions

**API versions scattered throughout ResourceMapper**:
```typescript
type: 'Microsoft.DocumentDB/databaseAccounts',
apiVersion: '2023-04-15',  // Line 95

type: 'Microsoft.Storage/storageAccounts',
apiVersion: '2023-01-01',  // Line 217

type: 'Microsoft.Web/serverfarms',
apiVersion: '2022-09-01',  // Line 324

type: 'Microsoft.Web/sites',
apiVersion: '2022-09-01',  // Line 339
```

**CDK constructs centralize API versions**:
```typescript
// In cosmos-db-arm.ts
export const DOCUMENTDB_API_VERSION = '2024-08-15';

// Automatically used by all Cosmos DB resources
```

**Impact**: Updating API versions requires searching and replacing across multiple files.

## Integration Points

### How Component Package Currently Integrates with Lib

**Minimal integration**:
1. Uses `ResourceNameGenerator` from lib for naming
2. That's it!

**Not used**:
- App/Stack system
- Construct tree
- Synthesis pipeline
- Validation system
- Dependency resolution
- Grant system
- Resource metadata

### How Component Package Should Integrate

**Full integration**:
1. Create App and ResourceGroupStack
2. Use CDK constructs to build infrastructure
3. Leverage construct tree for resource organization
4. Use App.synth() to generate CloudAssembly
5. Return CloudAssembly with ARM templates and metadata

## Why This Matters

### For Backend Users

**Current experience**:
```typescript
const backend = defineBackend({
  schema: defineSchema({ ... }),
  settings: { name: 'my-app' }
});

const synthesizer = new BackendSynthesizer();
const result = await synthesizer.synthesize(backend);
// Gets raw ARM JSON with no metadata
```

**Desired experience** (no change for users):
```typescript
const backend = defineBackend({
  schema: defineSchema({ ... }),
  settings: { name: 'my-app' }
});

const synthesizer = new BackendSynthesizer();
const result = await synthesizer.synthesize(backend);
// Gets CloudAssembly with ARM templates, metadata, function packages
// Same API, better output!
```

### For Maintainers

**Current maintenance burden**:
- Update ARM properties in ResourceMapper when Azure APIs change
- Update ARM properties in CDK constructs when Azure APIs change
- Keep both implementations in sync
- Debug issues in manual ARM JSON
- No type safety to catch errors

**Future maintenance burden**:
- Update CDK constructs when Azure APIs change
- Component package automatically gets updates
- Type safety catches errors at compile time
- Validation catches errors before deployment
- Single source of truth

### For Advanced Users

**Current limitations**:
- Can't customize individual resources (no construct tree access)
- Can't use RBAC grants
- Can't reference resources across stacks
- Can't use advanced CDK features (aspects, escape hatches)

**Future capabilities**:
- Access construct tree to customize resources
- Use RBAC grants for automatic permission configuration
- Reference resources across stacks
- Use CDK aspects for cross-cutting concerns
- Use escape hatches for advanced scenarios

## Root Cause Analysis

### Why Was It Built This Way?

Looking at the code structure, it appears the component package was built before the lib synthesis system was fully mature. The ResourceMapper was likely created as a stopgap to get backend synthesis working while the CDK and lib packages were still in development.

**Evidence**:
1. ResourceMapper has its own ARM type definitions instead of using lib's
2. BackendSynthesizer doesn't import or use lib's Synthesizer
3. Component package has its own synthesis types (ARMTemplate, ARMResource) that duplicate lib types
4. No imports from @atakora/cdk constructs despite them existing

### Why Is This a Problem Now?

The lib and CDK packages have matured significantly:
- Full synthesis pipeline with validation
- Complete set of L2 constructs for all major Azure resources
- Grant system for RBAC
- Dependency resolution
- Template splitting for large deployments
- Function packaging

**The component package is now working against the grain instead of with it.**

## Success Criteria for Architecture Change

A successful architecture migration will achieve:

1. **Zero Breaking Changes** - Existing backend definitions continue to work
2. **Better Output** - CloudAssembly instead of raw ARM JSON
3. **Type Safety** - All resource configurations have TypeScript types
4. **Automatic Validation** - Templates validated before synthesis completes
5. **RBAC Support** - Can grant permissions between resources
6. **Dependency Tracking** - Resources automatically depend on their parents
7. **Single Source of Truth** - Resource configurations in CDK constructs only
8. **Maintainability** - Changes to Azure APIs only require updating CDK constructs

## Next Steps

This analysis document will be used as input for:

1. **Architecture Design Document** - Describing the new architecture
2. **Implementation Plan** - Breaking down the migration into tasks
3. **ADR** - Documenting the architectural decision and rationale
4. **Migration Strategy** - How to transition without breaking existing code

## Appendix: Code References

### Component Package Files
- `/packages/component/src/synthesis/backend-synthesizer.ts` - Main orchestrator
- `/packages/component/src/synthesis/resource-mapper.ts` - Manual ARM JSON builder
- `/packages/component/src/synthesis/types.ts` - Synthesis types
- `/packages/component/src/backend/types.ts` - Backend types

### CDK Package Files
- `/packages/cdk/src/documentdb/cosmos-db.ts` - DatabaseAccounts L2 construct
- `/packages/cdk/src/documentdb/cosmos-db-database.ts` - SqlDatabases L2 construct
- `/packages/cdk/src/documentdb/cosmos-db-container.ts` - SqlContainers L2 construct
- `/packages/cdk/src/storage/storage-accounts.ts` - StorageAccounts L2 construct
- `/packages/cdk/src/web/server-farms.ts` - ServerFarms L2 construct
- `/packages/cdk/src/web/sites.ts` - Sites L2 construct

### Lib Package Files
- `/packages/lib/src/core/app.ts` - App class
- `/packages/lib/src/core/resource-group-stack.ts` - ResourceGroupStack class
- `/packages/lib/src/synthesis/synthesizer.ts` - Synthesis orchestrator
- `/packages/lib/src/synthesis/types.ts` - Synthesis types and CloudAssembly
