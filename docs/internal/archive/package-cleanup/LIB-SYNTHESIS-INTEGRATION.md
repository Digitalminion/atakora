# Backend Synthesis Integration

## Overview

This document describes the integration between the `@atakora/component` package's backend synthesis pipeline and the `@atakora/lib` package's ARM template generation infrastructure.

## Architecture

### Component Package (Week 1 Implementation)

The component package provides a 6-phase synthesis pipeline that transforms backend definitions into ARM resources:

**Location**: `packages/component/src/synthesis/`

**Key Files**:
- `backend-synthesizer.ts` - Main synthesis orchestrator
- `resource-mapper.ts` - Maps backend models to ARM resources
- `pipeline.ts` - High-level pipeline orchestration
- `types.ts` - Synthesis type definitions

**Synthesis Flow**:
1. **Analyze** - Discover models, attachments, and features from backend
2. **Context** - Create synthesis context with environment configuration
3. **Validate** - Validate attachment configurations (Phase 2)
4. **Synthesize** - Map backend components to ARM resources
5. **Assemble** - Create complete ARM template structure
6. **Validate** - Verify ARM template schema and naming

### Lib Package (This Implementation)

The lib package provides construct-based synthesis and deployment infrastructure:

**Location**: `packages/lib/src/synthesis/`

**Key Files**:
- `backend-adapter.ts` - **NEW** - Bridges component and lib synthesis
- `synthesizer.ts` - Updated with `synthesizeBackend()` method
- `types.ts` - Lib package ARM template types

### Integration Layer

**BackendAdapter** (`packages/lib/src/synthesis/backend-adapter.ts`)

The adapter serves as the integration point between the two synthesis systems:

```typescript
import { BackendAdapter } from '@atakora/lib/synthesis';

const adapter = new BackendAdapter();
const assembly = await adapter.synthesize(backend, {
  outdir: './arm.out',
  skipValidation: false,
  prettyPrint: true,
});
```

**Responsibilities**:
1. Uses component package `SynthesisPipeline` to synthesize backend → ARM
2. Converts component ARM types to lib ARM types
3. Creates lib package `CloudAssemblyV2` structure
4. Writes templates, manifest, metadata, and parameters to disk
5. Integrates with lib package validation pipeline (when enabled)

## API Usage

### Option 1: Direct Adapter Usage

```typescript
import { BackendAdapter } from '@atakora/lib/synthesis';
import { defineBackend, defineSchema, a, c } from '@atakora/component';

const backend = defineBackend({
  schema: defineSchema({
    schema: a.schema({
      User: c.model({
        id: a.id(),
        name: a.string().required(),
      }),
    }),
  }),
});

const adapter = new BackendAdapter();
const assembly = await adapter.synthesize(backend, {
  outdir: './arm.out',
});
```

### Option 2: Via Synthesizer Class

```typescript
import { Synthesizer } from '@atakora/lib';
import { defineBackend, defineSchema, a, c } from '@atakora/component';

const backend = defineBackend({
  schema: defineSchema({
    schema: a.schema({
      User: c.model({
        id: a.id(),
        name: a.string().required(),
      }),
    }),
  }),
});

const synthesizer = new Synthesizer();
const assembly = await synthesizer.synthesizeBackend(backend, {
  outdir: './arm.out',
});
```

## Output Structure

The synthesis process generates the following files in the output directory:

```
arm.out/
├── {stackName}.json              # Main ARM template
├── {stackName}.parameters.json   # ARM parameters file
├── {stackName}.metadata.json     # Synthesis metadata
└── manifest.json                 # Cloud assembly manifest
```

### Template File (`{stackName}.json`)

Standard Azure ARM template:
- `$schema`: ARM template schema URL
- `contentVersion`: Template version
- `parameters`: Template parameters
- `variables`: Template variables
- `resources`: Azure resources (Cosmos DB, Functions, Storage, etc.)
- `outputs`: Template outputs

### Parameters File (`{stackName}.parameters.json`)

ARM deployment parameters:
- Follows Azure parameter file schema
- Pre-populated with default values from template
- Ready for `az deployment group create`

### Metadata File (`{stackName}.metadata.json`)

Synthesis metadata:
```json
{
  "environment": "development",
  "cloudType": "commercial",
  "region": "eastus",
  "resourceGroup": "rg-my-app-dev",
  "resourceCount": 15,
  "modelCounts": {
    "crud": 2,
    "event": 1,
    "function": 1
  },
  "synthesizedAt": "2025-11-23T01:00:00.000Z"
}
```

### Manifest File (`manifest.json`)

Cloud assembly manifest (CloudAssemblyV2):
```json
{
  "version": "2.0.0",
  "stacks": {
    "my-app": {
      "name": "my-app",
      "templatePath": "my-app.json",
      "resourceCount": 15,
      "parameterCount": 3,
      "outputCount": 2,
      "dependencies": [],
      "linkedTemplates": []
    }
  },
  "directory": "./arm.out"
}
```

## Resource Mapping

The component package's `ResourceMapper` maps backend components to ARM resources:

### CRUD Models → Cosmos DB

```typescript
User: c.model({ ... })
```

Generates:
- `Microsoft.DocumentDB/databaseAccounts` - Cosmos DB account
- `Microsoft.DocumentDB/databaseAccounts/sqlDatabases` - Database
- `Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers` - Container for model

### Event Models → Service Bus (Planned)

```typescript
UserRegistered: e.model({ ... })
```

Will generate Service Bus topics/queues for event streaming.

### Function Models → Azure Functions

```typescript
processOrder: f.model({ ... })
```

Generates Function App infrastructure for custom business logic.

### Authentication → Key Vault + Managed Identity

```typescript
authentication: defineAuth({
  providers: [auth.entra()],
})
```

Generates:
- `Microsoft.KeyVault/vaults` - Secrets storage
- Managed Identity for Function App
- Authentication configuration

## Testing

### End-to-End Tests

**Location**: `packages/lib/src/synthesis/__tests__/e2e-backend-synthesis.spec.ts`

Comprehensive integration tests covering:
- Minimal backend with single CRUD model
- Standard backend with CRUD + Events
- Backend with authentication
- Complex backend with all model types
- ARM template validation
- Dependency chain validation
- Deployability verification

### Unit Tests

**Location**: `packages/lib/src/synthesis/__tests__/backend-adapter.spec.ts`

Tests the BackendAdapter in isolation.

## Dependencies

### Package Dependency

The lib package now depends on the component package:

```json
{
  "dependencies": {
    "@atakora/component": "*"
  }
}
```

This is an npm workspace dependency, resolved locally during development.

### Type Conversions

The adapter converts between two similar but distinct ARM type systems:

**Component Package Types**:
- `ARMTemplate`, `ARMResource`, `ARMParameter`, `ARMOutput`
- Defined in `@atakora/component/dist/synthesis/types`

**Lib Package Types**:
- `ArmTemplate`, `ArmResource`, `ArmParameter`, `ArmOutput`
- Defined in `@atakora/lib/synthesis/types`

The conversion is mostly straightforward (field copying), with slight differences in casing and optional fields.

## Future Enhancements

### Week 3+ Features (Blocked by This Integration)

Now that the synthesis integration is complete, the following advanced features can be implemented:

1. **Government Cloud Support**
   - Modify `BackendAdapter` to detect government cloud from context
   - Use government-specific ARM schemas and endpoints
   - Adjust resource configurations for compliance

2. **Multi-Region Deployment**
   - Extend synthesis to generate templates for multiple regions
   - Create linked templates for regional resources
   - Implement cross-region dependencies

3. **Template Splitting**
   - Integrate lib package's `TemplateSplitter`
   - Split large backends into linked templates
   - Respect Azure 4MB template size limit

4. **Advanced Validation**
   - Integrate lib package's `ValidationPipeline`
   - Run schema, naming, and limit validators
   - Provide actionable error messages

5. **Deployment Integration**
   - Use synthesized templates with lib package deployment commands
   - Implement incremental deployments
   - Track deployment state

## Implementation Notes

### Import Paths

The component package synthesis module is not exported from the main index, so the adapter imports directly from dist:

```typescript
import { BackendSynthesizer, SynthesisPipeline } from '@atakora/component/dist/synthesis';
import type { ... } from '@atakora/component/dist/synthesis/types';
```

This works because the component package has built dist files from previous builds.

### Validation Integration

The adapter currently uses the component package's built-in validation. Future work can integrate the lib package's `ValidationPipeline` for more comprehensive checks.

### Error Handling

Both packages use similar error handling patterns (throw on failure, clear messages). The adapter propagates errors without modification, maintaining the original error context.

## Task Completion

This implementation completes:

- ✅ **Task 1211774745542038**: Integrate 4-Phase Pipeline in Synthesizer
  - Added `BackendAdapter` class
  - Added `synthesizeBackend()` method to `Synthesizer`
  - Integrated component package synthesis pipeline

- 🔄 **Task 1211774810828760**: End-to-End Synthesis Testing with CRUD Backend
  - Created comprehensive e2e test suite
  - Tests pending component package build resolution
  - Test infrastructure complete and ready

## Next Steps

1. **Fix Component Package Build Errors**
   - Resolve TypeScript compilation errors in component package
   - Rebuild dist files
   - Verify synthesis pipeline exports

2. **Run Integration Tests**
   - Execute e2e test suite
   - Verify ARM template output
   - Validate deployability with Azure CLI

3. **Document ARM Template Structure**
   - Add examples of synthesized templates
   - Document resource naming conventions
   - Provide deployment guide

4. **Implement Advanced Features**
   - Government Cloud support
   - Multi-Region deployments
   - Template splitting for large backends
