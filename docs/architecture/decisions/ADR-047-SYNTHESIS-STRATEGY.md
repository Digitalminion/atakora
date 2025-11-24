# ADR-023: Backend-to-ARM Synthesis Strategy

**Status:** Proposed
**Date:** 2025-11-22
**Architect:** Becky (Staff Architect)
**Stakeholders:** Grace (Synthesis CLI), Devon (Implementation), Felix (Schema Validation)

---

## Context

The component package (`@atakora/component`) provides a schema-centric backend definition API that allows users to define data models, authentication, and settings. The lib package (`@atakora/lib`) contains a complete ARM template synthesis pipeline with 298 TypeScript files. However, **there is currently no integration between these two packages**.

### Current State

**Component Package:**
- Users define backends using `defineBackend()`
- Backends contain schema, auth, settings, attachments
- Fully type-safe with TypeScript inference
- No synthesis capability

**Lib Package:**
- Complete synthesis pipeline for ARM templates
- Validators, code generators, naming conventions
- Supports existing construct-based architecture
- No knowledge of new backend format

**Gap:**
- No bridge between backend definitions and ARM synthesis
- Backend objects can't be deployed to Azure
- No way to convert schema models to ARM resources

### Problem Statement

We need to establish a synthesis strategy that:

1. **Preserves Existing Synthesis:** Don't break lib package's current synthesis
2. **Integrates Backend Format:** Support new schema-centric backends
3. **Handles Attachments:** User customizations must be honored
4. **Maintains Type Safety:** End-to-end type safety from schema to ARM
5. **Environment Awareness:** Different ARM for dev/staging/prod
6. **Gov vs Commercial:** Support both cloud environments
7. **Resource Optimization:** Intelligent resource sharing and naming

### Use Cases

**Use Case 1: Simple CRUD Backend**

```typescript
const backend = defineBackend({
  schema: defineSchema({
    schema: a.schema({
      User: c.model({
        id: a.id(),
        email: a.string().email(),
        name: a.string(),
      }).authorization(allow => [allow.owner('id')]),
    }),
  }),
  authentication: defineAuth({ ... }),
  settings: { name: 'my-app', region: 'eastus' },
});

// Should synthesize:
// - Cosmos DB account + container for User model
// - Storage account for system needs
// - Function App with User CRUD endpoints
// - Application Insights for monitoring
// - KeyVault for secrets
```

**Use Case 2: Backend with Attachments**

```typescript
const backend = defineBackend({ ... });

// Custom Cosmos DB configuration
backend.storage.database.attach({
  name: 'custom-cosmos-db',
  throughput: 2000,
  consistencyLevel: 'Strong',
});

// Should synthesize:
// - Cosmos DB with custom settings (not defaults)
// - All other resources with defaults
```

**Use Case 3: Multi-Model Backend**

```typescript
const schema = defineSchema({
  schema: a.schema({
    User: c.model({ ... }),
    Post: c.model({ ... }),
    Comment: c.model({ ... }),
    NotificationSent: e.model({ ... }),
    GenerateReport: f.model({ ... }),
  }),
});

// Should synthesize:
// - Cosmos DB with 3 containers (User, Post, Comment)
// - Service Bus queue for NotificationSent event
// - Additional Function App function for GenerateReport
// - Shared Application Insights
```

### Constraints

- Must not break existing lib package synthesis
- Must work with existing CLI (`atakora synth`)
- Must support incremental deployment
- Must maintain ARM template validation
- Must honor Azure naming conventions
- Must handle resource dependencies correctly

---

## Decision

We will implement a **Backend Synthesis Adapter Layer** that bridges the component package backend format with the lib package synthesis pipeline.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Component Package                         │
│  ┌────────────┐   ┌──────────────┐   ┌──────────────┐          │
│  │  Schema    │   │     Auth     │   │   Settings   │          │
│  │ Definition │   │ Configuration│   │              │          │
│  └─────┬──────┘   └──────┬───────┘   └──────┬───────┘          │
│        │                 │                  │                    │
│        └─────────────────┼──────────────────┘                    │
│                         │                                        │
│                  ┌──────▼──────┐                                 │
│                  │   Backend   │                                 │
│                  │   Object    │                                 │
│                  └──────┬──────┘                                 │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          │ Backend Synthesis Adapter
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Lib Package                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Backend Synthesis Adapter                   │   │
│  │                                                          │   │
│  │  - Analyzes backend object                              │   │
│  │  - Discovers models, auth, attachments                  │   │
│  │  - Creates synthesis context                            │   │
│  │  - Orchestrates resource synthesizers                   │   │
│  └────────┬─────────────────────────────────────────┬───────┘   │
│           │                                         │           │
│  ┌────────▼────────┐                      ┌────────▼────────┐   │
│  │    Resource     │                      │   Attachment    │   │
│  │  Synthesizers   │                      │   Processor     │   │
│  │                 │                      │                 │   │
│  │ - Cosmos DB     │                      │ - Validates     │   │
│  │ - Function App  │                      │ - Merges        │   │
│  │ - Storage       │                      │ - Overrides     │   │
│  │ - Monitoring    │                      │                 │   │
│  └────────┬────────┘                      └────────┬────────┘   │
│           │                                         │           │
│           └─────────────────┬───────────────────────┘           │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │  ARM Template   │                          │
│                    │   Generator     │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │   Validation    │                          │
│                    │    Pipeline     │                          │
│                    └────────┬────────┘                          │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              │
                              ▼
                       ARM JSON Template
```

### Core Components

#### 1. Backend Synthesis Adapter

**Location:** `lib/src/synthesis/backend/backend-adapter.ts`

```typescript
/**
 * Backend Synthesis Adapter
 *
 * Bridges component package backend format with lib synthesis pipeline.
 * This is the main entry point for backend-to-ARM synthesis.
 */
export class BackendSynthesisAdapter {
  private readonly synthesizers: ResourceSynthesizerRegistry;
  private readonly validators: ValidatorRegistry;
  private readonly namingService: NamingService;

  constructor(
    synthesizers: ResourceSynthesizerRegistry,
    validators: ValidatorRegistry,
    namingService: NamingService
  ) {
    this.synthesizers = synthesizers;
    this.validators = validators;
    this.namingService = namingService;
  }

  /**
   * Synthesize backend to ARM template
   *
   * Main synthesis orchestration:
   * 1. Analyze backend structure
   * 2. Validate attachments (Phase 2)
   * 3. Create synthesis context
   * 4. Synthesize resources
   * 5. Validate ARM template
   * 6. Return ARM JSON
   */
  async synthesize(backend: BackendObject): Promise<ARMTemplate> {
    // 1. Analyze backend
    const analysis = this.analyzeBackend(backend);

    // 2. Create synthesis context
    const context = this.createSynthesisContext(backend, analysis);

    // 3. Validate attachments (Phase 2 validation)
    await this.validateAttachments(backend, context);

    // 4. Synthesize resources
    const resources = await this.synthesizeResources(backend, context, analysis);

    // 5. Generate ARM template
    const template: ARMTemplate = {
      $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
      contentVersion: '1.0.0.0',
      parameters: this.generateParameters(backend, context),
      variables: this.generateVariables(backend, context),
      resources,
      outputs: this.generateOutputs(backend, context, resources),
    };

    // 6. Validate ARM template
    await this.validators.validateTemplate(template, context);

    return template;
  }

  /**
   * Analyze backend structure
   *
   * Discovers:
   * - Models (CRUD, Event, Function)
   * - Attachments
   * - Feature flags
   * - Dependencies
   */
  private analyzeBackend(backend: BackendObject): BackendAnalysis {
    const models = this.discoverModels(backend.schema);
    const attachments = this.discoverAttachments(backend);
    const features = backend.settings.features;

    return {
      models: {
        crud: models.filter(m => m.type === 'crud'),
        event: models.filter(m => m.type === 'event'),
        function: models.filter(m => m.type === 'function'),
      },
      attachments: {
        storage: attachments.filter(a => a.category === 'storage'),
        compute: attachments.filter(a => a.category === 'compute'),
        networking: attachments.filter(a => a.category === 'networking'),
        monitoring: attachments.filter(a => a.category === 'monitoring'),
        performance: attachments.filter(a => a.category === 'performance'),
      },
      features,
      dependencies: this.analyzeDependencies(models, attachments),
    };
  }

  /**
   * Synthesize all resources
   *
   * Orchestrates resource synthesis in dependency order:
   * 1. Foundation (resource group, naming)
   * 2. Networking (if enabled)
   * 3. Storage (Cosmos, Blob, KeyVault)
   * 4. Compute (Function Apps)
   * 5. Monitoring (if enabled)
   * 6. Performance (if enabled)
   */
  private async synthesizeResources(
    backend: BackendObject,
    context: SynthesisContext,
    analysis: BackendAnalysis
  ): Promise<ARMResource[]> {
    const resources: ARMResource[] = [];

    // 1. Foundation resources
    resources.push(...await this.synthesizeFoundation(backend, context));

    // 2. Networking (if enabled)
    if (analysis.features.networking && backend.network) {
      resources.push(...await this.synthesizeNetworking(backend, context));
    }

    // 3. Storage resources
    resources.push(...await this.synthesizeStorage(backend, context, analysis));

    // 4. Compute resources
    resources.push(...await this.synthesizeCompute(backend, context, analysis));

    // 5. Monitoring (if enabled)
    if (analysis.features.monitoring && backend.monitoring) {
      resources.push(...await this.synthesizeMonitoring(backend, context));
    }

    // 6. Performance (if enabled)
    if (analysis.features.performance && backend.performance) {
      resources.push(...await this.synthesizePerformance(backend, context));
    }

    return resources;
  }
}
```

#### 2. Resource Synthesizers

**Location:** `lib/src/synthesis/backend/synthesizers/`

```typescript
/**
 * Cosmos DB Synthesizer
 *
 * Synthesizes Cosmos DB resources from backend schema.
 */
export class CosmosDBSynthesizer implements IResourceSynthesizer {
  async synthesize(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<ARMResource[]> {
    const resources: ARMResource[] = [];

    // Get effective configuration (default + attachment)
    const config = this.getEffectiveConfig(backend);

    // Synthesize Cosmos DB account
    const accountName = context.naming.cosmosAccount(backend.settings.name);
    resources.push({
      type: 'Microsoft.DocumentDB/databaseAccounts',
      apiVersion: '2023-04-15',
      name: accountName,
      location: backend.settings.region,
      tags: backend.settings.tags,
      kind: 'GlobalDocumentDB',
      properties: {
        databaseAccountOfferType: 'Standard',
        consistencyPolicy: {
          defaultConsistencyLevel: config.consistencyLevel || 'Session',
        },
        locations: [
          {
            locationName: backend.settings.region,
            failoverPriority: 0,
            isZoneRedundant: context.environment === 'production',
          },
        ],
        ...this.applyGovernmentCloudOverrides(context),
      },
    });

    // Synthesize database
    const databaseName = context.naming.cosmosDatabase(backend.settings.name);
    resources.push({
      type: 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases',
      apiVersion: '2023-04-15',
      name: `${accountName}/${databaseName}`,
      properties: {
        resource: {
          id: databaseName,
        },
        options: {
          throughput: config.throughput || this.getDefaultThroughput(context),
        },
      },
      dependsOn: [
        `[resourceId('Microsoft.DocumentDB/databaseAccounts', '${accountName}')]`,
      ],
    });

    // Synthesize containers for CRUD models
    const crudModels = this.discoverCRUDModels(backend.schema);
    for (const model of crudModels) {
      resources.push(...await this.synthesizeContainer(model, accountName, databaseName, context));
    }

    return resources;
  }

  /**
   * Get effective configuration
   *
   * Merges default config with attachment override.
   */
  private getEffectiveConfig(backend: BackendObject): CosmosDBConfig {
    const defaultConfig = this.getDefaultConfig(backend);
    const attachedConfig = backend.storage.database.isAttached()
      ? backend.storage.database.getConfig()
      : null;

    return attachedConfig
      ? { ...defaultConfig, ...attachedConfig }
      : defaultConfig;
  }

  /**
   * Synthesize container for CRUD model
   */
  private async synthesizeContainer(
    model: CRUDModel,
    accountName: string,
    databaseName: string,
    context: SynthesisContext
  ): Promise<ARMResource[]> {
    const containerName = context.naming.cosmosContainer(model.name);

    // Determine partition key from schema
    const partitionKey = this.determinePartitionKey(model);

    // Generate indexes from schema
    const indexingPolicy = this.generateIndexingPolicy(model);

    return [
      {
        type: 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers',
        apiVersion: '2023-04-15',
        name: `${accountName}/${databaseName}/${containerName}`,
        properties: {
          resource: {
            id: containerName,
            partitionKey: {
              paths: [`/${partitionKey}`],
              kind: 'Hash',
            },
            indexingPolicy,
          },
          options: {},
        },
        dependsOn: [
          `[resourceId('Microsoft.DocumentDB/databaseAccounts/sqlDatabases', '${accountName}', '${databaseName}')]`,
        ],
      },
    ];
  }
}
```

#### 3. Synthesis Context

**Location:** `lib/src/synthesis/backend/synthesis-context.ts`

```typescript
/**
 * Backend Synthesis Context
 *
 * Provides context for resource synthesis including:
 * - Environment information
 * - Naming service
 * - Resource dependencies
 * - Feature flags
 */
export interface BackendSynthesisContext extends SynthesisContext {
  /**
   * Backend being synthesized
   */
  backend: BackendObject;

  /**
   * Backend analysis
   */
  analysis: BackendAnalysis;

  /**
   * Naming service for consistent resource naming
   */
  naming: NamingService;

  /**
   * Environment (development, staging, production)
   */
  environment: Environment;

  /**
   * Cloud type (commercial, government)
   */
  cloudType: 'commercial' | 'government';

  /**
   * Resource dependency tracker
   */
  dependencies: DependencyTracker;

  /**
   * Synthesis logger
   */
  logger: SynthesisLogger;

  /**
   * Validators
   */
  validators: ValidatorRegistry;
}

/**
 * Create synthesis context from backend
 */
export function createBackendSynthesisContext(
  backend: BackendObject,
  analysis: BackendAnalysis,
  options: SynthesisOptions
): BackendSynthesisContext {
  return {
    backend,
    analysis,
    naming: new NamingService(backend.settings.name, backend.settings.region),
    environment: backend.environment,
    cloudType: detectCloudType(backend.settings.region),
    dependencies: new DependencyTracker(),
    logger: new SynthesisLogger(options.verbose),
    validators: new ValidatorRegistry(),
  };
}
```

### Resource Mapping Strategy

#### CRUD Models → Cosmos DB Containers

```typescript
/**
 * CRUD Model Synthesis
 *
 * Each c.model() → Cosmos DB container with:
 * - Container name from model name
 * - Partition key inferred from schema or explicit
 * - Indexes based on field types and authorization
 * - TTL if specified in schema
 */

// Example:
User: c.model({
  id: a.id(),
  email: a.string().email(),
  name: a.string(),
})
  .authorization(allow => [allow.owner('id')])

// Synthesizes to:
{
  type: 'Microsoft.DocumentDB/.../containers',
  name: 'users', // pluralized, lowercase
  properties: {
    partitionKey: { paths: ['/id'] }, // Inferred from id field
    indexingPolicy: {
      automatic: true,
      includedPaths: [
        { path: '/email/*' }, // String fields indexed
        { path: '/name/*' },
      ],
    },
  },
}
```

#### Event Models → Service Bus Queues

```typescript
/**
 * Event Model Synthesis
 *
 * Each e.model() → Service Bus queue with:
 * - Queue name from event name
 * - Dead-letter queue
 * - Retry policy based on environment
 */

// Example:
NotificationSent: e.model({
  id: a.id(),
  userId: a.string(),
  message: a.string(),
})

// Synthesizes to:
{
  type: 'Microsoft.ServiceBus/namespaces/queues',
  name: 'notification-sent', // kebab-case
  properties: {
    requiresDuplicateDetection: true,
    duplicateDetectionHistoryTimeWindow: 'PT10M',
    maxDeliveryCount: 10,
    deadLetteringOnMessageExpiration: true,
  },
}
```

#### Function Models → Function App Functions

```typescript
/**
 * Function Model Synthesis
 *
 * Each f.model() → Azure Function with:
 * - HTTP trigger (default)
 * - Input/output bindings from schema
 * - function.json configuration
 */

// Example:
GenerateReport: f.model({
  input: a.object({
    datasetId: a.string(),
    format: a.enum(['pdf', 'excel']),
  }),
  output: a.object({
    reportUrl: a.string(),
    status: a.string(),
  }),
})

// Synthesizes to function.json:
{
  "bindings": [
    {
      "authLevel": "function",
      "type": "httpTrigger",
      "direction": "in",
      "name": "req",
      "methods": ["post"],
      "route": "functions/generate-report"
    },
    {
      "type": "http",
      "direction": "out",
      "name": "res"
    }
  ]
}
```

#### Authentication → KeyVault + Entra ID

```typescript
/**
 * Authentication Synthesis
 *
 * defineAuth() configuration → KeyVault secrets + Entra ID app registration
 */

// Example:
defineAuth({
  Primary: auth.entra().tenant('...').clientId('...'),
  ApiKeys: auth.apiKeys().keys([...]),
})

// Synthesizes to:
// 1. KeyVault for API keys
{
  type: 'Microsoft.KeyVault/vaults',
  properties: {
    sku: { family: 'A', name: 'standard' },
    tenantId: '[subscription().tenantId]',
    accessPolicies: [
      // Function App managed identity access
    ],
  },
}

// 2. KeyVault secrets for API keys
{
  type: 'Microsoft.KeyVault/vaults/secrets',
  properties: {
    value: '[parameters(\'apiKey\')]',
  },
}

// 3. Entra ID app registration (via external ARM)
// Note: Full Entra ID config may require separate deployment
```

### Attachment Processing Strategy

```typescript
/**
 * Attachment Processing
 *
 * Attachments override default configurations:
 * 1. Discover all attachments
 * 2. Validate (Phase 2)
 * 3. Merge with defaults
 * 4. Apply to synthesizers
 */

// Example:
backend.storage.database.attach({
  name: 'custom-cosmos',
  throughput: 2000,
  consistencyLevel: 'Strong',
});

// Processing:
const defaultConfig = {
  name: context.naming.cosmosAccount(backend.settings.name),
  throughput: 400, // Default for dev
  consistencyLevel: 'Session', // Default
  region: backend.settings.region,
};

const attachedConfig = backend.storage.database.getConfig();

const effectiveConfig = {
  ...defaultConfig,
  ...attachedConfig, // Override with attachment
};

// Synthesize with effective config
const resource = synthesizer.synthesize(effectiveConfig);
```

### Environment-Specific Synthesis

```typescript
/**
 * Environment Defaults
 *
 * Different ARM templates for development, staging, production:
 * - Development: Minimal cost, relaxed security
 * - Staging: Production-like, cost-optimized
 * - Production: High availability, security, performance
 */

// Development
{
  cosmos: {
    throughput: 400, // Serverless would be even cheaper
    consistencyLevel: 'Session',
    multiRegion: false,
  },
  functionApp: {
    sku: 'Y1', // Consumption
    alwaysOn: false,
  },
  monitoring: {
    enabled: false, // Cost savings
  },
}

// Staging
{
  cosmos: {
    throughput: 1000,
    consistencyLevel: 'Session',
    multiRegion: false,
  },
  functionApp: {
    sku: 'EP1', // Elastic Premium
    alwaysOn: true,
  },
  monitoring: {
    enabled: true,
    retention: 30, // days
  },
}

// Production
{
  cosmos: {
    throughput: 4000,
    consistencyLevel: 'Session',
    multiRegion: true,
    zoneRedundancy: true,
  },
  functionApp: {
    sku: 'EP2', // Elastic Premium higher tier
    alwaysOn: true,
    slots: ['staging'], // Deployment slots
  },
  monitoring: {
    enabled: true,
    retention: 90,
    alerts: true,
  },
}
```

### Government Cloud Handling

```typescript
/**
 * Government Cloud Overrides
 *
 * Different endpoints, SKUs, features for Azure Government.
 */
export function applyGovernmentCloudOverrides(
  resource: ARMResource,
  context: BackendSynthesisContext
): ARMResource {
  if (context.cloudType !== 'government') {
    return resource;
  }

  // Government cloud modifications
  switch (resource.type) {
    case 'Microsoft.DocumentDB/databaseAccounts':
      return {
        ...resource,
        properties: {
          ...resource.properties,
          // Government cloud endpoints
          publicNetworkAccess: 'Disabled', // More restrictive
          capabilities: [
            { name: 'EnableServerless' }, // May not be available
          ].filter(cap => isGovernmentCloudSupported(cap.name)),
        },
      };

    case 'Microsoft.Web/sites':
      return {
        ...resource,
        properties: {
          ...resource.properties,
          httpsOnly: true, // Enforce HTTPS
          ftpsState: 'Disabled', // Disable FTP
          // Government compliance settings
        },
      };

    default:
      return resource;
  }
}
```

---

## Alternatives Considered

### Alternative 1: Extend Existing Construct System

**Approach:** Make backend objects extend existing CDK constructs.

```typescript
class BackendConstruct extends Construct {
  constructor(scope: Construct, id: string, backend: BackendObject) {
    super(scope, id);
    // Build resources using existing construct library
  }
}
```

**Pros:**
- Reuses existing construct library
- No new synthesis code
- Familiar to CDK users

**Cons:**
- Forces backend into construct model
- Breaks schema-centric philosophy
- Construct tree overhead
- Loses type inference benefits
- Complex integration

**Rejected because:** Breaks schema-centric design, loses type safety, complex.

---

### Alternative 2: Separate Synthesis Package

**Approach:** Create new `@atakora/synthesis` package for backend synthesis.

**Pros:**
- Clean separation of concerns
- Independent versioning
- Can evolve separately

**Cons:**
- Another package to maintain
- Duplicates lib synthesis logic
- No code reuse
- Increases complexity

**Rejected because:** Duplicates existing synthesis capabilities, adds complexity.

---

### Alternative 3: Direct ARM Generation

**Approach:** Backend objects directly generate ARM JSON without adapter layer.

```typescript
export function synthesizeBackend(backend: BackendObject): ARMTemplate {
  // Generate ARM directly in component package
}
```

**Pros:**
- Simpler, no adapter layer
- Direct control over ARM output
- Less abstraction

**Cons:**
- Duplicates lib package validation logic
- No reuse of naming conventions
- Harder to maintain consistency
- Loses lib package features

**Rejected because:** Duplicates too much logic, harder to maintain.

---

### Alternative 4: Two-Stage Synthesis

**Approach:** Backend → Intermediate Format → ARM

```typescript
// Stage 1: Backend to intermediate
const intermediate = backend.toIntermediate();

// Stage 2: Intermediate to ARM
const arm = synthesize(intermediate);
```

**Pros:**
- Clean abstraction
- Intermediate format could support multiple targets (Bicep, Terraform)
- Easy to test each stage

**Cons:**
- Additional complexity
- Intermediate format design overhead
- No immediate need for multiple targets
- Performance overhead

**Partially adopted:** We use `BackendAnalysis` as a light intermediate representation, but not a full intermediate language.

---

## Consequences

### Positive Consequences

1. **Reuses Existing Synthesis:** Leverages lib package's mature synthesis pipeline
2. **Clean Separation:** Adapter pattern keeps concerns separated
3. **Type Safety:** End-to-end type safety maintained
4. **Flexible:** Can evolve synthesis without changing backend API
5. **Testable:** Adapter can be tested independently
6. **Extensible:** New resource types easy to add
7. **Environment-Aware:** Different ARM for different environments
8. **Gov Cloud Support:** Handles government cloud differences

### Negative Consequences

1. **Two Packages:** Synthesis split across component and lib packages
2. **Adapter Complexity:** Adapter layer adds abstraction
3. **Dependency:** Component package depends on lib synthesis types
4. **Learning Curve:** Developers need to understand both packages
5. **Testing:** Need integration tests across packages

### Trade-offs

**Reuse vs. Simplicity:**
- We chose reuse of lib synthesis over simple new implementation
- Adapter adds complexity but gains mature features

**Flexibility vs. Performance:**
- Adapter pattern adds indirection
- But gains flexibility to change synthesis strategy

**Type Safety vs. Runtime Flexibility:**
- Strongly typed backend format
- But synthesis can adapt based on runtime context

---

## Success Criteria

### Functional Requirements

1. ✅ Backend objects synthesize to valid ARM templates
2. ✅ CRUD models become Cosmos DB containers
3. ✅ Event models become Service Bus queues
4. ✅ Function models become Function App functions
5. ✅ Authentication becomes KeyVault + Entra ID
6. ✅ Attachments override defaults correctly
7. ✅ Environment-specific synthesis works
8. ✅ Government cloud synthesis works

### Non-Functional Requirements

1. ✅ Synthesis completes in < 10 seconds for typical backend
2. ✅ ARM templates pass validation
3. ✅ Generated resources deploy successfully
4. ✅ 90%+ test coverage for synthesis adapter
5. ✅ Clear error messages for synthesis failures

### Developer Experience

1. ✅ `atakora synth` works with backend definitions
2. ✅ Synthesis errors are actionable
3. ✅ Can preview ARM before deployment
4. ✅ Can synthesize individual resources
5. ✅ Documentation covers synthesis process

---

## Implementation Plan

### Phase 1: Adapter Foundation (Day 1, 6 hours)

- Create `BackendSynthesisAdapter` class in lib package
- Implement backend analysis (discover models, attachments)
- Create `BackendSynthesisContext`
- Add basic unit tests

### Phase 2: Cosmos DB Synthesis (Day 1-2, 8 hours)

- Implement `CosmosDBSynthesizer`
- Handle CRUD model → container mapping
- Implement partition key inference
- Implement indexing policy generation
- Add Cosmos DB synthesis tests

### Phase 3: Function App Synthesis (Day 2, 8 hours)

- Implement `FunctionAppSynthesizer`
- Handle function model → function.json mapping
- Generate HTTP triggers
- Handle input/output bindings
- Add Function App synthesis tests

### Phase 4: Authentication Synthesis (Day 2-3, 6 hours)

- Implement `KeyVaultSynthesizer`
- Generate secrets for API keys
- Handle Entra ID configuration
- Add auth synthesis tests

### Phase 5: Attachment Processing (Day 3, 6 hours)

- Implement attachment discovery
- Implement Phase 2 validation
- Implement config merging
- Add attachment processing tests

### Phase 6: Environment & Gov Cloud (Day 3, 6 hours)

- Implement environment-specific defaults
- Implement government cloud overrides
- Add environment synthesis tests
- Add gov cloud synthesis tests

### Phase 7: End-to-End Testing (Day 3, 6 hours)

- Create full backend examples
- Synthesize complete ARM templates
- Validate ARM templates
- Test Azure deployments (optional)

**Total Estimated Effort:** 46 hours (6 days)

---

## Testing Strategy

### Unit Tests

```typescript
describe('BackendSynthesisAdapter', () => {
  it('should analyze backend structure', () => {
    const backend = createTestBackend();
    const adapter = new BackendSynthesisAdapter(...);

    const analysis = adapter['analyzeBackend'](backend);

    expect(analysis.models.crud).toHaveLength(3);
    expect(analysis.models.event).toHaveLength(1);
    expect(analysis.models.function).toHaveLength(1);
  });

  it('should create synthesis context', () => {
    const backend = createTestBackend();
    const adapter = new BackendSynthesisAdapter(...);

    const context = adapter['createSynthesisContext'](backend, analysis);

    expect(context.environment).toBe('development');
    expect(context.cloudType).toBe('commercial');
    expect(context.naming).toBeDefined();
  });
});

describe('CosmosDBSynthesizer', () => {
  it('should synthesize Cosmos DB account', async () => {
    const backend = createTestBackend();
    const synthesizer = new CosmosDBSynthesizer();

    const resources = await synthesizer.synthesize(backend, context);

    const account = resources.find(r => r.type === 'Microsoft.DocumentDB/databaseAccounts');
    expect(account).toBeDefined();
    expect(account.location).toBe('eastus');
  });

  it('should synthesize containers for CRUD models', async () => {
    const backend = createBackendWithModels(['User', 'Post', 'Comment']);
    const synthesizer = new CosmosDBSynthesizer();

    const resources = await synthesizer.synthesize(backend, context);

    const containers = resources.filter(r => r.type.includes('/containers'));
    expect(containers).toHaveLength(3);
    expect(containers.map(c => c.name)).toContain('users');
  });

  it('should honor attached configuration', async () => {
    const backend = createTestBackend();
    backend.storage.database.attach({
      throughput: 2000,
      consistencyLevel: 'Strong',
    });

    const synthesizer = new CosmosDBSynthesizer();
    const resources = await synthesizer.synthesize(backend, context);

    const account = resources.find(r => r.type === 'Microsoft.DocumentDB/databaseAccounts');
    expect(account.properties.consistencyPolicy.defaultConsistencyLevel).toBe('Strong');
  });
});
```

### Integration Tests

```typescript
describe('Backend to ARM Synthesis', () => {
  it('should synthesize simple CRUD backend', async () => {
    const backend = defineBackend({
      schema: defineSchema({
        schema: a.schema({
          User: c.model({
            id: a.id(),
            email: a.string(),
          }),
        }),
      }),
      authentication: defineAuth({ ... }),
      settings: { name: 'test-app' },
    });

    const adapter = new BackendSynthesisAdapter(...);
    const template = await adapter.synthesize(backend);

    expect(template.resources).toBeDefined();
    expect(template.resources.length).toBeGreaterThan(0);

    // Should have Cosmos DB
    const cosmosDb = template.resources.find(r => r.type === 'Microsoft.DocumentDB/databaseAccounts');
    expect(cosmosDb).toBeDefined();

    // Should have Function App
    const functionApp = template.resources.find(r => r.type === 'Microsoft.Web/sites');
    expect(functionApp).toBeDefined();
  });

  it('should handle multi-model backend', async () => {
    const backend = createMultiModelBackend();
    const adapter = new BackendSynthesisAdapter(...);
    const template = await adapter.synthesize(backend);

    const containers = template.resources.filter(r => r.type.includes('containers'));
    expect(containers.length).toBe(3);
  });

  it('should validate generated ARM template', async () => {
    const backend = createTestBackend();
    const adapter = new BackendSynthesisAdapter(...);
    const template = await adapter.synthesize(backend);

    // Should pass ARM validation
    const validation = await validateARMTemplate(template);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });
});
```

### End-to-End Tests

```typescript
describe('End-to-End Synthesis', () => {
  it('should synthesize and deploy backend', async () => {
    const backend = createProductionBackend();
    const template = await synthesize(backend);

    // Validate template
    expect(template.$schema).toBeDefined();
    expect(template.resources.length).toBeGreaterThan(5);

    // Optional: Actually deploy to test subscription
    if (process.env.E2E_TEST_ENABLED) {
      const deployment = await deployToAzure(template, 'test-rg');
      expect(deployment.status).toBe('Succeeded');
    }
  });
});
```

---

## Documentation Requirements

### User Documentation

1. **Synthesis Guide:**
   - How synthesis works
   - What gets generated
   - Customization via attachments
   - Environment-specific synthesis

2. **CLI Reference:**
   - `atakora synth` command
   - Options and flags
   - Output formats

3. **ARM Output Reference:**
   - Resource naming conventions
   - Default configurations
   - Environment differences
   - Gov cloud differences

### Developer Documentation

1. **Architecture:**
   - Adapter pattern design
   - Synthesis pipeline flow
   - Extension points

2. **Adding Synthesizers:**
   - How to add new resource types
   - Synthesizer interface
   - Testing requirements

---

## Related ADRs

- **ADR-001:** Schema-Centric Architecture (foundation)
- **ADR-021:** Attachment Point Implementation (attachment processing)
- **ADR-020:** Component Auth System (authentication synthesis)

---

## Migration Path

### Existing Users (Construct-Based)

No impact. Existing synthesis continues to work:

```typescript
// Old style: Still works
const app = new App();
const stack = new MyStack(app, 'MyStack');
synthesize(app);
```

### New Users (Backend-Based)

Can use new synthesis immediately:

```typescript
// New style: Backend synthesis
const backend = defineBackend({ ... });
const template = await synthesize(backend);
```

### Hybrid Usage

Both can coexist:

```typescript
// Define backend
const backend = defineBackend({ ... });

// Synthesize to ARM
const template = await synthesize(backend);

// Deploy alongside existing stacks
```

---

## Approval

**Architect:** Becky _________________ Date: _______

**Synthesis Lead:** Grace _____________ Date: _______

**Lead Developer:** Devon _____________ Date: _______

**Schema Lead:** Felix ________________ Date: _______

---

**ADR Status:** Proposed
**Next Review:** After POC implementation
**Implementation Target:** Week 3 of Sprint
