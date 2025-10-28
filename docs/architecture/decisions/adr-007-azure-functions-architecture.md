# ADR-006: Azure Functions Architecture for Atakora

## Status

Proposed

## Context

We need to provide Azure Functions support in Atakora with an AWS Amplify-like developer experience. The current architecture has strong foundations for ARM template generation and synthesis, but lacks serverless function capabilities that are fundamental to modern cloud applications.

### Business Requirements

1. **Developer Experience**: Provide an intuitive API similar to AWS Amplify where developers can point to handler files
2. **Build Integration**: Automatically compile, bundle, and optimize TypeScript/JavaScript code during synthesis
3. **Resource Integration**: Seamlessly reference other Atakora resources (Cosmos, Storage, etc.)
4. **Deployment Flexibility**: Support multiple deployment strategies based on function size and requirements
5. **Type Safety**: Maintain TypeScript type safety throughout the entire pipeline

### Technical Constraints

1. Azure Functions require a Function App container (unlike AWS Lambda's standalone functions)
2. ARM templates have size limitations for inline code (4KB for template properties)
3. Functions must be packaged in specific formats for Azure deployment
4. The synthesis pipeline is already well-defined with four phases
5. Government and Commercial cloud environments have different endpoints and capabilities

### Current State Analysis

The existing codebase has:
- Strong L1/L2 construct patterns (see `app-service` implementation)
- Well-defined synthesis pipeline with prepare, transform, validate, and assembly phases
- Type-safe resource modeling with proper interfaces
- Naming service for resource uniqueness
- Validation pipeline with extensible validators

## Decision

We will implement a comprehensive Azure Functions architecture that follows the AWS Amplify Gen 2 pattern with clear separation between runtime code (handler.ts) and infrastructure configuration (resource.ts), while introducing a new build phase in the synthesis pipeline for function compilation and bundling.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Developer Code                           │
├─────────────────────────────────────────────────────────────────┤
│  Infrastructure (app.ts)    │    Function Definitions           │
│  ┌──────────────────────┐  │    ┌─────────────────────────┐   │
│  │ const app = new       │  │    │ functions/              │   │
│  │   FunctionApp(..., {  │  │    │ ├── http-api/          │   │
│  │   functionsPath:      │──┼───▶│ │   ├── handler.ts     │   │
│  │     '../functions'    │  │    │ │   └── resource.ts    │   │
│  │ })                    │  │    │ └── timer-job/         │   │
│  └──────────────────────┘  │    │     ├── handler.ts     │   │
│                             │    │     └── resource.ts    │   │
│                             │    └─────────────────────────┘   │
└───────────────────┬─────────┴──────────────┬────────────────────┘
                    │                         │
                    ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Synthesis Pipeline                         │
├───────────────┬─────────────┬───────────┬───────────┬──────────┤
│   Prepare     │   Build     │ Transform │ Validate  │ Assembly │
│               │  (NEW)      │           │           │          │
│ • Traverse    │ • Discover  │ • To ARM  │ • Schema  │ • Write  │
│ • Collect     │ • Compile   │ • Merge   │ • Naming  │ • Upload │
│               │ • Bundle    │ • Inject  │ • Limits  │          │
└───────────────┴─────────────┴───────────┴───────────┴──────────┘
                                                          │
                                                          ▼
                                              ┌──────────────────┐
                                              │  ARM Templates   │
                                              │  + Function Code │
                                              └──────────────────┘
```

### Core Design Decisions

#### 1. Resource Model

**File Structure (Amplify Pattern)**:
```
packages/infrastructure/
├── src/
│   └── app.ts                    # Main infrastructure (stacks, databases, etc.)
└── functions/
    ├── http-api/
    │   ├── handler.ts            # Runtime code: export async function handler(context, req) {...}
    │   └── resource.ts           # Config: export default defineFunction({ timeout: 60, ... })
    └── timer-job/
        ├── handler.ts            # Runtime code
        └── resource.ts           # Config
```

**Construct Hierarchy**:
```typescript
App
└── SubscriptionStack
    └── ResourceGroup
        ├── AppServicePlan        // Consumption or Dedicated
        ├── StorageAccount        // Required for Functions
        └── FunctionApp           // L2: Container with auto-discovery
            ├── ArmFunctionApp    // L1: ARM resource
            └── AzureFunction[]   // L2: Auto-discovered from ../functions/
                └── ArmFunction   // L1: ARM sub-resource
```

**Key Design Choice**: Functions follow the Amplify Gen 2 pattern with separation of concerns - `handler.ts` contains only runtime code while `resource.ts` defines infrastructure configuration. The FunctionApp auto-discovers functions at synthesis time.

#### 2. Function Discovery and Build Phase

We introduce auto-discovery of functions and a new **Build Phase** between Prepare and Transform:

```typescript
class FunctionDiscovery {
  async discover(functionApp: FunctionApp): Promise<FunctionDefinition[]> {
    const functionsPath = functionApp.functionsPath; // '../functions'
    const functionDirs = await fs.readdir(functionsPath);

    const definitions: FunctionDefinition[] = [];
    for (const dir of functionDirs) {
      const resourcePath = path.join(functionsPath, dir, 'resource.ts');
      const handlerPath = path.join(functionsPath, dir, 'handler.ts');

      if (await fs.pathExists(resourcePath) && await fs.pathExists(handlerPath)) {
        // Load and parse resource.ts configuration
        const config = await this.loadResourceConfig(resourcePath);
        definitions.push({
          name: dir,
          config,
          handlerPath
        });
      }
    }
    return definitions;
  }
}

class FunctionBuildPhase {
  async execute(context: BuildContext): Promise<BuildResult> {
    // 1. Discover functions from filesystem
    const functionApps = context.constructs.filter(c => c instanceof FunctionApp);
    const discoveries = await Promise.all(
      functionApps.map(app => this.discovery.discover(app))
    );

    // 2. Build discovered functions in parallel
    const buildTasks = discoveries.flat().map(fn => this.buildFunction(fn));
    const results = await Promise.all(buildTasks);

    // 3. Store artifacts and merge configurations
    return {
      artifacts: results,
      configurations: this.mergeConfigurations(results)
    };
  }

  private async buildFunction(def: FunctionDefinition): Promise<BuildArtifact> {
    // Compile handler.ts with resource.ts configuration
    const result = await esbuild.build({
      entryPoints: [def.handlerPath],
      bundle: true,
      minify: def.config.minify ?? true,
      target: def.config.runtime ?? 'node18',
      external: def.config.external,
      define: def.config.buildDefines
    });

    return {
      functionName: def.name,
      config: def.config,
      bundle: result.outputFiles[0].contents
    };
  }
}
```

#### 3. Packaging Strategy

**Adaptive Packaging** based on function size and requirements:

```typescript
enum PackagingStrategy {
  INLINE = 'inline',        // < 4KB: Embed in ARM template
  STORAGE = 'storage',      // < 100MB: Upload to Storage Account
  CONTAINER = 'container',  // > 100MB or custom deps: Container image
  EXTERNAL = 'external'     // User-managed: GitHub, registry, etc.
}

class PackagingResolver {
  resolve(artifact: BuildArtifact): PackagingStrategy {
    const sizeKB = artifact.metadata.size / 1024;

    if (sizeKB < 4) return PackagingStrategy.INLINE;
    if (sizeKB < 100 * 1024) return PackagingStrategy.STORAGE;
    if (artifact.metadata.hasNativeDeps) return PackagingStrategy.CONTAINER;

    return PackagingStrategy.STORAGE; // Default
  }
}
```

#### 4. API Design

**FunctionApp with Auto-Discovery**:
```typescript
interface FunctionAppProps {
  // Required infrastructure
  readonly plan: IAppServicePlan;
  readonly storageAccount: IStorageAccount;

  // Function discovery
  readonly functionsPath: string;  // Path to functions directory (e.g., '../functions')

  // Global configuration (applies to all functions)
  readonly runtime?: FunctionRuntime;    // Default: 'node18'
  readonly environment?: Record<string, string | IResourceReference>;

  // Optional settings
  readonly functionAppName?: string;     // Auto-generated if not provided
  readonly location?: string;            // From ResourceGroup if not specified
}

// Usage in app.ts
const functionApp = new FunctionApp(stack, 'Api', {
  plan: consumptionPlan,
  storageAccount: storage,
  functionsPath: '../functions',

  // Provide infrastructure values to function environments
  environment: {
    TABLE_NAME: cosmosDb.databaseName,
    COSMOS_ENDPOINT: cosmosDb.endpoint,
    COSMOS_CONNECTION: cosmosDb.connectionString
  }
});
```

**defineFunction Helper (in resource.ts)**:
```typescript
import { defineFunction } from '@atakora/cdk/functions';

export default defineFunction({
  // Runtime configuration
  timeout: 60,
  memorySize: 512,

  // Environment variables (can reference infrastructure)
  environment: {
    // Placeholders filled by app.ts environment
    TABLE_NAME: '${TABLE_NAME}',
    COSMOS_ENDPOINT: '${COSMOS_ENDPOINT}'
  },

  // Trigger configuration
  trigger: {
    type: 'http',
    methods: ['GET', 'POST'],
    route: 'api/users/{id}',
    authLevel: 'anonymous'
  },

  // Additional bindings
  bindings: [
    {
      type: 'cosmosDB',
      direction: 'in',
      name: 'documents',
      databaseName: 'MyDatabase',
      collectionName: 'Users'
    }
  ],

  // Build configuration
  buildOptions: {
    external: ['@azure/cosmos'],
    minify: true
  }
});
```

**Handler Pattern (in handler.ts)**:
```typescript
import { AzureFunctionContext, HttpRequest } from '@atakora/cdk/functions';

export async function handler(context: AzureFunctionContext, req: HttpRequest) {
  // Access environment variables from resource.ts
  const tableName = process.env.TABLE_NAME;
  const cosmosEndpoint = process.env.COSMOS_ENDPOINT;

  // Access bindings defined in resource.ts
  const documents = context.bindings.documents;

  // Operational logic
  const userId = req.params.id;
  const user = documents.find(d => d.id === userId);

  return {
    status: 200,
    body: {
      message: `User ${userId} found`,
      user,
      environment: { tableName, cosmosEndpoint }
    }
  };
}
```

#### 5. Handler Pattern

**Standard Handler Interface**:
```typescript
// HTTP Trigger Handler
export interface HttpHandler {
  (context: Context, request: HttpRequest): Promise<HttpResponse>;
}

// Timer Trigger Handler
export interface TimerHandler {
  (context: Context, timer: TimerInfo): Promise<void>;
}

// Universal Context
interface Context {
  invocationId: string;
  executionContext: ExecutionContext;
  bindings: Record<string, any>;
  log: Logger;
  done: (err?: Error, result?: any) => void;
}
```

#### 6. Resource Dependencies

**Cross-Reference Pattern**:
```typescript
class AzureFunction extends Construct {
  // Allow both direct values and references
  addEnvironmentVariable(key: string, value: string | IResourceReference) {
    if (typeof value === 'string') {
      this.environment[key] = value;
    } else {
      // Generate ARM reference expression
      this.environment[key] = this.toArmReference(value);
    }
  }

  private toArmReference(ref: IResourceReference): string {
    // Generate appropriate ARM function
    if (ref.resourceType === 'Microsoft.DocumentDB/databaseAccounts') {
      return `[reference(resourceId('${ref.resourceType}', '${ref.resourceName}')).endpoint]`;
    }
    // ... other resource types
  }
}
```

## Alternatives Considered

### Alternative 1: Inline-Only Functions

**Description**: Only support inline function code in ARM templates.

**Pros**:
- Simpler implementation
- No external storage required
- Single deployment artifact

**Cons**:
- Severely limited function size (4KB)
- No support for dependencies
- Poor developer experience

**Rejected because**: Too limiting for real-world applications.

### Alternative 2: Separate Function Stack

**Description**: Each function or function app gets its own stack.

**Pros**:
- Complete isolation
- Independent deployment
- Clear boundaries

**Cons**:
- More complex resource management
- Difficult cross-stack references
- Higher Azure management overhead

**Rejected because**: Adds unnecessary complexity without clear benefits.

### Alternative 3: Runtime Code Generation

**Description**: Generate function code from TypeScript DSL rather than using handler files.

**Pros**:
- Full type safety
- No file management
- Inline with infrastructure

**Cons**:
- Poor developer experience
- Hard to test
- Limited expressiveness
- No IDE support for handlers

**Rejected because**: Goes against established serverless development patterns.

## Consequences

### Positive Consequences

1. **Familiar Developer Experience**: Similar to AWS Amplify and Serverless Framework
2. **Type Safety**: Full TypeScript support from infrastructure to handlers
3. **Flexible Deployment**: Multiple packaging strategies for different scenarios
4. **Build Optimization**: Automatic tree-shaking, minification, and bundling
5. **Seamless Integration**: Works naturally with existing Atakora resources
6. **Progressive Enhancement**: Start simple, add complexity as needed

### Negative Consequences

1. **Build Time Impact**: Additional compilation step increases synthesis time
2. **Complexity**: New build phase adds complexity to synthesis pipeline
3. **Storage Management**: May need to manage Storage Accounts for larger functions
4. **Cache Invalidation**: Need careful cache management for function builds
5. **Debugging**: Minified code may be harder to debug without source maps

### Trade-offs

1. **Performance vs Simplicity**: Build optimization adds time but improves runtime
2. **Flexibility vs Complexity**: Multiple packaging strategies increase complexity
3. **Developer Experience vs Type Safety**: Balancing ease of use with correctness
4. **Local vs Cloud**: Local development experience differs from deployed environment

## Success Criteria

1. **Developer Productivity**:
   - Function creation to deployment in < 5 minutes
   - Hot reload during local development
   - Clear error messages with actionable fixes

2. **Build Performance**:
   - < 2 seconds per function build (cached)
   - < 10 seconds for initial build
   - Parallel builds for multiple functions

3. **Runtime Performance**:
   - Cold start < 1 second for small functions
   - Bundle size reduced by > 50% through tree-shaking
   - Optimal memory usage through dead code elimination

4. **Reliability**:
   - Deterministic builds (same input = same output)
   - Graceful handling of build failures
   - Rollback capability for failed deployments

5. **Adoption Metrics**:
   - 80% of new projects use Functions within 3 months
   - < 5 support issues per month related to Functions
   - Positive developer feedback (NPS > 30)

## Implementation Plan

### Phase 1: Foundation (Week 1-2)
- Create L1 constructs for FunctionApp and Function
- Implement basic L2 FunctionApp construct
- Add FunctionApp to existing AppServicePlan support
- Create unit tests for new constructs

### Phase 2: Build Pipeline (Week 2-3)
- Implement FunctionBuildPhase class
- Integrate esbuild for TypeScript compilation
- Add build caching mechanism
- Create build configuration options

### Phase 3: Core Functions (Week 3-4)
- Implement L2 AzureFunction construct
- Support HTTP and Timer triggers
- Add inline packaging strategy
- Create integration tests

### Phase 4: Advanced Features (Week 4-5)
- Add Storage Account packaging
- Support additional trigger types
- Implement VNet integration
- Add distributed tracing support

### Phase 5: Developer Experience (Week 5-6)
- Create CLI commands for function management
- Add local development server
- Implement hot reload
- Write comprehensive documentation

### Phase 6: Production Readiness (Week 6-7)
- Performance optimization
- Security review
- Government cloud support
- Migration guide from Azure Functions Core Tools

## References

- [Azure Functions Documentation](https://docs.microsoft.com/en-us/azure/azure-functions/)
- [ARM Template Reference for Functions](https://docs.microsoft.com/en-us/azure/templates/microsoft.web/sites/functions)
- [AWS Amplify Functions](https://docs.amplify.aws/cli/function/)
- [Serverless Framework Azure Provider](https://www.serverless.com/framework/docs/providers/azure/)
- [esbuild Documentation](https://esbuild.github.io/)
- [Azure Functions Best Practices](https://docs.microsoft.com/en-us/azure/azure-functions/functions-best-practices)

## Decision Record

- **Date**: 2025-01-10
- **Author**: Becky (System Architect)
- **Reviewers**: Devon (Constructs), Grace (Synthesis), Charlie (Testing)
- **Status**: Proposed - Awaiting Review