# Azure Functions Implementation Roadmap

## Executive Summary

This roadmap outlines the phased implementation of Azure Functions support in Atakora using the handler.ts + resource.ts pattern. The implementation is divided into 7 phases over approximately 8 weeks, with clear deliverables, dependencies, and success metrics for each phase. The approach emphasizes type safety, automatic function discovery, and environment variable interpolation.

## Key Architecture Decisions

- **Handler/Resource Separation**: Following Amplify patterns with handler.ts for logic and resource.ts for configuration
- **Type-Safe Environment Variables**: Generic typing for compile-time environment variable validation
- **Automatic Discovery**: Filesystem scanning to auto-discover functions without manual registration
- **Placeholder Interpolation**: `${PLACEHOLDER}` syntax in resource.ts resolved at synthesis time

## Implementation Timeline

```
Week 1-2: Foundation & Core Infrastructure (including defineFunction())
Week 2-3: Discovery & Build Pipeline Integration
Week 3-4: Core Function Features with Handler/Resource Pattern
Week 4-5: Advanced Capabilities & Bindings
Week 5-6: Developer Experience & Local Development
Week 6-7: Environment Variable System & Dependency Tracking
Week 7-8: Production Readiness & Migration Tools
```

## Phase 1: Foundation & Core Infrastructure

**Duration**: Week 1-2 (10 business days)

### Objectives
- Implement defineFunction() helper with type-safe environment variables
- Establish base constructs for Function Apps and Functions
- Create handler.ts and resource.ts pattern support
- Create L1 ARM resource mappings
- Implement basic L2 constructs with handler/resource separation
- Set up testing infrastructure

### Deliverables

#### 1.1 DefineFunction Helper API (Days 1-2)

```typescript
// File: packages/lib/src/functions/define-function.ts
export function defineFunction<TEnv extends Record<string, string> = {}>(
  config: FunctionConfig<TEnv>
): FunctionDefinition<TEnv> {
  return {
    type: 'AzureFunction',
    version: '1.0',
    config: {
      ...config,
      timeout: config.timeout ?? Duration.minutes(5),
      memorySize: config.memorySize ?? 512,
      environment: config.environment ?? {} as TEnv,
    },
  };
}

// File: packages/lib/src/functions/types.ts
export interface FunctionConfig<TEnv extends Record<string, string> = {}> {
  readonly timeout?: Duration;
  readonly memorySize?: number;
  readonly environment?: EnvironmentPlaceholders<TEnv>;
  readonly trigger: TriggerConfig;
  readonly inputBindings?: BindingConfig[];
  readonly outputBindings?: BindingConfig[];
  readonly role?: RoleConfig;
}

export type EnvironmentPlaceholders<T> = {
  [K in keyof T]: `\${string}` | string;
};
```

**Tasks**:
- [ ] Create `functions` directory structure
- [ ] Implement `defineFunction()` helper function
- [ ] Define `FunctionConfig` interface with generics
- [ ] Create `FunctionDefinition` return type
- [ ] Add environment placeholder type definitions
- [ ] Implement trigger configuration types
- [ ] Create binding configuration types
- [ ] Add handler context types (AzureFunctionContext, Logger)
- [ ] Add comprehensive unit tests for type safety

#### 1.2 L1 Constructs (Days 3-4)

```typescript
// File: packages/lib/src/resources/function-app/arm-function-app.ts
export class ArmFunctionApp extends Resource {
  // Direct ARM template mapping
  // Properties matching Microsoft.Web/sites with kind='functionapp'
}

// File: packages/lib/src/resources/function-app/arm-function.ts
export class ArmFunction extends Resource {
  // Maps to Microsoft.Web/sites/functions
  // Supports both inline config and resource.ts reference
}
```

**Tasks**:
- [ ] Create `function-app` resource directory structure
- [ ] Implement `ArmFunctionApp` L1 construct
- [ ] Implement `ArmFunction` L1 sub-resource
- [ ] Support resource.ts configuration loading
- [ ] Define TypeScript interfaces for ARM properties
- [ ] Add ARM template generation logic
- [ ] Create unit tests for L1 constructs

#### 1.3 L2 Function App & Azure Function Constructs (Days 5-7)

```typescript
// File: packages/lib/src/resources/function-app/function-app.ts
export class FunctionApp extends Construct implements IFunctionApp {
  constructor(scope: Construct, id: string, props: FunctionAppProps) {
    // Auto-naming logic
    // Tag inheritance
    // Default configurations
  }
}

// File: packages/lib/src/resources/function-app/azure-function.ts
export class AzureFunction extends Construct implements IAzureFunction {
  constructor(scope: IFunctionApp, id: string, props: AzureFunctionProps) {
    super(scope, id);
    // Handler path validation
    // Resource.ts loading if provided
    // Environment variable merging
    // Trigger configuration
  }
}

// Updated AzureFunctionProps
export interface AzureFunctionProps {
  readonly handler: string;           // Path to handler.ts file
  readonly resource?: string;         // Path to resource.ts file
  readonly inlineConfig?: FunctionConfig;
  readonly functionName?: string;
  readonly environment?: Record<string, string | IResourceReference>;
  readonly buildOptions?: BuildOptions;
}
```

**Tasks**:
- [ ] Implement `FunctionApp` L2 construct
- [ ] Add auto-naming using NamingService
- [ ] Implement tag inheritance from ResourceGroup
- [ ] Add storage account integration
- [ ] Implement `AzureFunction` L2 construct with handler/resource support
- [ ] Add handler path validation and loading
- [ ] Implement resource.ts loading and parsing
- [ ] Add environment variable merging logic
- [ ] Create helper methods for app settings
- [ ] Write comprehensive unit tests

#### 1.4 Testing Infrastructure (Days 8-9)

```typescript
// File: packages/lib/src/testing/function-test-utils.ts
export class FunctionTestUtils {
  static mockFunctionApp(): IFunctionApp { }
  static mockHttpTrigger(): HttpTrigger { }
  static mockResourceDefinition(): FunctionDefinition { }
  static validateFunctionJson(json: any): void { }
  static mockHandlerFile(path: string): void { }
  static mockResourceFile(path: string, config: FunctionConfig): void { }
}
```

**Tasks**:
- [ ] Create test utilities for functions
- [ ] Set up test fixtures and mocks for handler/resource pattern
- [ ] Create integration test harness
- [ ] Add test helpers for environment variable validation
- [ ] Document testing patterns

#### 1.5 Documentation & Examples (Day 10)

**Tasks**:
- [ ] Write API documentation with JSDoc
- [ ] Create basic usage examples with handler.ts + resource.ts
- [ ] Document ARM template output format
- [ ] Create architecture diagrams
- [ ] Document environment variable placeholder pattern

### Success Criteria
- [ ] defineFunction() helper provides type-safe configuration
- [ ] L1 constructs generate valid ARM JSON
- [ ] L2 FunctionApp and AzureFunction support handler/resource pattern
- [ ] Environment placeholders work correctly
- [ ] All unit tests pass (>90% coverage)
- [ ] Documentation complete and reviewed

### Dependencies
- Existing App Service Plan implementation
- Storage Account constructs
- Resource Group constructs

### Risk Mitigation
- **Risk**: Type safety for environment variables
- **Mitigation**: Leverage TypeScript generics and compile-time checks
- **Risk**: Resource.ts loading failures
- **Mitigation**: Graceful fallback to inline configuration

---

## Phase 2: Discovery & Build Pipeline Integration

**Duration**: Week 2-3 (5 business days)

### Objectives
- Implement function discovery phase (Phase 0 in pipeline)
- Integrate discovery with build phase
- Implement resource.ts loader and parser
- Add environment variable interpolation
- Implement TypeScript/JavaScript compilation
- Add bundling and optimization
- Create caching mechanism for both handler and resource files

### Deliverables

#### 2.1 Function Discovery Phase (Days 1-2)

```typescript
// File: packages/lib/src/synthesis/phases/discovery-phase.ts
export class FunctionDiscoveryPhase implements ISynthesisPhase {
  private readonly functionsPath: string;

  async execute(context: SynthesisContext): Promise<DiscoveryResult> {
    // Step 1: Scan functions directory for handler.ts + resource.ts pairs
    const functionDirs = await this.scanFunctionsDirectory();

    // Step 2: Load and parse resource.ts configurations
    const functionConfigs = await this.loadFunctionConfigurations(functionDirs);

    // Step 3: Validate configurations
    await this.validateConfigurations(functionConfigs);

    // Step 4: Build function registry
    const registry = this.buildFunctionRegistry(functionConfigs);

    // Step 5: Store in context for Build phase
    context.setDiscoveredFunctions(registry);

    return { functionsDiscovered: registry.size, registry };
  }

  private async scanFunctionsDirectory(): Promise<FunctionDirectory[]> {
    // Scan for directories containing both handler.ts and resource.ts
  }

  private async loadFunctionConfigurations(dirs: FunctionDirectory[]): Promise<FunctionConfiguration[]> {
    // Dynamically import resource.ts files
    // Extract FunctionDefinition from default export
  }
}
```

**Tasks**:
- [ ] Create `FunctionDiscoveryPhase` class
- [ ] Implement directory scanning for handler/resource pairs
- [ ] Add resource.ts dynamic loading with error handling
- [ ] Create function registry data structure
- [ ] Integrate discovery with synthesis context
- [ ] Add discovery phase error reporting
- [ ] Create unit tests for discovery

#### 2.2 Environment Variable Resolution (Days 2-3)

```typescript
// File: packages/lib/src/synthesis/environment/environment-resolver.ts
export class EnvironmentResolver {
  private readonly placeholderPattern = /\$\{([^}]+)\}/g;

  resolveEnvironment(
    functionConfig: FunctionConfiguration,
    appEnvironment: Record<string, string | IResourceReference>
  ): Record<string, string> {
    const resolved: Record<string, string> = {};
    const functionEnv = functionConfig.definition.config.environment || {};

    for (const [key, value] of Object.entries(functionEnv)) {
      if (typeof value === 'string') {
        // Resolve placeholders like ${COSMOS_ENDPOINT}
        resolved[key] = this.resolvePlaceholders(value, appEnvironment);
      }
    }

    return resolved;
  }

  private resolvePlaceholders(
    template: string,
    values: Record<string, string | IResourceReference>
  ): string {
    // Replace ${KEY} with actual values from app.ts
  }
}
```

**Tasks**:
- [ ] Implement `EnvironmentResolver` class
- [ ] Add placeholder pattern matching
- [ ] Implement value interpolation logic
- [ ] Add IResourceReference resolution
- [ ] Handle missing placeholder errors
- [ ] Create validation for circular references
- [ ] Add comprehensive tests

#### 2.3 Dependency Tracking (Day 3)

```typescript
// File: packages/lib/src/synthesis/dependencies/dependency-tracker.ts
export class DependencyTracker {
  private readonly graph: Map<string, Set<string>> = new Map();

  trackDependencies(
    functionConfig: FunctionConfiguration,
    resources: Map<string, IResource>
  ): void {
    // Extract dependencies from environment variables
    // Track resource references in bindings
    // Build dependency graph
  }

  getDeploymentOrder(): string[] {
    // Topological sort of dependency graph
  }
}
```

**Tasks**:
- [ ] Implement `DependencyTracker` class
- [ ] Add environment variable dependency extraction
- [ ] Implement binding dependency tracking
- [ ] Create topological sort for deployment order
- [ ] Add cycle detection
- [ ] Write unit tests

#### 2.4 Build Phase Updates (Days 4-5)

```typescript
// File: packages/lib/src/synthesis/phases/build-phase.ts
export class FunctionBuildPhase implements ISynthesisPhase {
  async execute(context: SynthesisContext): Promise<BuildResult> {
    // Get discovered functions from context
    const registry = context.getDiscoveredFunctions();

    // Build each function (handler.ts only)
    const artifacts = await this.buildFunctions(registry);

    // Apply environment resolution
    const resolvedFunctions = this.resolveEnvironments(registry, context);

    // Store build artifacts
    context.setBuildArtifacts(artifacts);

    return { built: artifacts.length };
  }
}
```

**Tasks**:
- [ ] Update `FunctionBuildPhase` to use discovered functions
- [ ] Implement parallel building of handler.ts files
- [ ] Integrate environment resolution
- [ ] Update caching to include both handler and resource files
- [ ] Add build error aggregation
- [ ] Create tests for build phase

### Success Criteria
- [ ] Functions automatically discovered from filesystem
- [ ] Resource.ts files successfully loaded and parsed
- [ ] Environment placeholders correctly resolved
- [ ] Dependencies properly tracked
- [ ] Build phase uses discovered functions
- [ ] Cache accounts for both handler and resource changes

### Dependencies
- Phase 1 completion (defineFunction helper)
- ESBuild package
- File system access
- Dynamic import support

---

## Phase 3: Core Function Features with Handler/Resource Pattern

**Duration**: Week 3-4 (5 business days)

### Objectives
- Fully implement L2 AzureFunction with handler/resource support
- Support HTTP and Timer triggers via resource.ts
- Implement complete environment variable flow
- Add inline packaging for small functions

### Deliverables

#### 3.1 Complete Handler/Resource Integration (Days 1-2)

```typescript
// Example usage flow:

// functions/api/resource.ts
import { defineFunction } from '@atakora/functions';

export interface ApiEnv {
  readonly DATABASE_URL: string;
  readonly API_KEY: string;
}

export default defineFunction<ApiEnv>({
  trigger: {
    type: 'http',
    route: 'api/users/{userId}',
    methods: ['GET', 'POST'],
    authLevel: AuthLevel.FUNCTION
  },
  environment: {
    DATABASE_URL: '${COSMOS_ENDPOINT}',
    API_KEY: '${API_SECRET}'
  },
  timeout: Duration.seconds(30)
});

// functions/api/handler.ts
import { HttpHandler } from '@atakora/functions';

export const handler: HttpHandler = async (context, req) => {
  const { DATABASE_URL, API_KEY } = process.env;
  // Function logic
};

// app.ts
const apiFunction = new AzureFunction(functionApp, 'ApiEndpoint', {
  handler: './functions/api/handler.ts',
  resource: './functions/api/resource.ts',
  environment: {
    COSMOS_ENDPOINT: cosmosDb.endpoint,
    API_SECRET: keyVault.secret('api-key')
  }
});
```

**Tasks**:
- [ ] Complete AzureFunction construct with full handler/resource support
- [ ] Implement resource.ts configuration merging
- [ ] Add environment variable precedence rules
- [ ] Create validation for type mismatches
- [ ] Write integration tests for complete flow

#### 3.2 HTTP Trigger Support (Day 3)

**Tasks**:
- [ ] Implement HTTP trigger builder from resource.ts config
- [ ] Add route validation and parameter extraction
- [ ] Support all HTTP methods
- [ ] Implement auth level configuration
- [ ] Create URL generation helper
- [ ] Test with handler/resource pattern

#### 3.3 Timer Trigger Support (Day 4)

**Tasks**:
- [ ] Implement Timer trigger builder from resource.ts config
- [ ] Add CRON expression validation
- [ ] Support TimeSpan format
- [ ] Add runOnStartup support
- [ ] Create schedule helper utilities
- [ ] Test with handler/resource pattern

#### 3.4 Inline Packaging (Day 5)

**Tasks**:
- [ ] Implement inline packaging for small handler.ts files
- [ ] Add size validation (<4KB after bundling)
- [ ] Create Base64 encoding logic
- [ ] Integrate with ARM generation
- [ ] Add integrity checking
- [ ] Handle resource.ts configuration in ARM

### Success Criteria
- [ ] Complete handler/resource flow works end-to-end
- [ ] HTTP functions deploy and respond correctly
- [ ] Timer functions execute on schedule
- [ ] Environment variables properly resolved and accessible
- [ ] Inline functions work for small code

---

## Phase 4: Advanced Capabilities

**Duration**: Week 4-5 (5 business days)

### Objectives
- Add Storage Account packaging for larger functions
- Support Queue and Service Bus triggers via resource.ts
- Implement input/output bindings from resource.ts
- Add VNet integration support

### Deliverables

#### 4.1 Storage Packaging with Handler/Resource (Days 1-2)

**Tasks**:
- [ ] Implement ZIP packaging for handler.ts
- [ ] Include resource.ts configuration metadata
- [ ] Add Storage Account integration
- [ ] Generate SAS tokens for deployment
- [ ] Create upload mechanism
- [ ] Handle large handler files efficiently

#### 4.2 Queue & Service Bus Triggers (Day 3)

```typescript
// functions/orders/resource.ts
export default defineFunction<OrderEnv>({
  trigger: {
    type: 'queue',
    queueName: 'orders',
    connection: '${STORAGE_CONNECTION}',
    batchSize: 10
  },
  environment: {
    MAX_RETRIES: '3',
    NOTIFICATION_ENABLED: '${NOTIFICATION_FLAG}'
  }
});
```

**Tasks**:
- [ ] Implement Queue trigger from resource.ts
- [ ] Implement Service Bus trigger from resource.ts
- [ ] Add connection string handling with placeholders
- [ ] Support batch processing configuration
- [ ] Add retry configuration

#### 4.3 Input/Output Bindings (Day 4)

```typescript
// functions/processor/resource.ts
export default defineFunction({
  trigger: { type: 'timer', schedule: '0 */5 * * * *' },
  inputBindings: [{
    type: 'table',
    direction: 'in',
    name: 'inventory',
    tableName: 'inventory',
    connection: '${STORAGE_CONNECTION}'
  }],
  outputBindings: [{
    type: 'serviceBus',
    direction: 'out',
    name: 'notifications',
    queueName: 'alerts',
    connection: '${SERVICE_BUS_CONNECTION}'
  }]
});
```

**Tasks**:
- [ ] Create binding factory from resource.ts config
- [ ] Implement Blob bindings with placeholders
- [ ] Implement Table bindings
- [ ] Implement Cosmos bindings
- [ ] Add binding validation

#### 4.4 VNet Integration (Day 5)

**Tasks**:
- [ ] Implement VNet integration configuration
- [ ] Add subnet validation
- [ ] Configure routing rules
- [ ] Support private endpoints
- [ ] Test with handler/resource pattern

### Success Criteria
- [ ] Functions deploy from Storage with handler/resource
- [ ] Queue triggers process messages correctly
- [ ] Bindings work with placeholder resolution
- [ ] VNet integration functional

---

## Phase 5: Developer Experience

**Duration**: Week 5-6 (5 business days)

### Objectives
- Create CLI commands for handler/resource pattern
- Implement local development server
- Add hot reload for both handler and resource changes
- Write comprehensive documentation

### Deliverables

#### 5.1 CLI Commands (Days 1-2)

```bash
# Create new function with handler + resource
atakora function create --name api --trigger http --template typescript

# List discovered functions
atakora function list

# Test function locally
atakora function test api --env local

# Stream logs
atakora function logs api --follow
```

**Tasks**:
- [ ] Create function command structure
- [ ] Implement create with handler/resource templates
- [ ] Add list showing discovered functions
- [ ] Implement test runner using resource.ts config
- [ ] Add log streaming

#### 5.2 Local Development Server (Days 3-4)

**Tasks**:
- [ ] Create dev server that reads resource.ts
- [ ] Implement function routing from resource config
- [ ] Add request/response handling
- [ ] Support all trigger types locally
- [ ] Mock environment variables from resource.ts
- [ ] Add debugging support

#### 5.3 Hot Reload (Day 5)

**Tasks**:
- [ ] Watch both handler.ts and resource.ts files
- [ ] Reload on handler code changes
- [ ] Reload on resource configuration changes
- [ ] Implement incremental build support
- [ ] Minimize reload time (<2 seconds)

### Success Criteria
- [ ] CLI generates proper handler/resource structure
- [ ] Local server runs functions with resource.ts config
- [ ] Hot reload works for both file types
- [ ] Debugging works in VS Code

---

## Phase 6: Environment Variable System & Dependency Tracking

**Duration**: Week 6-7 (5 business days)

### Objectives
- Complete environment variable interpolation system
- Implement full dependency tracking
- Add validation and error reporting
- Create migration helpers

### Deliverables

#### 6.1 Complete Environment System (Days 1-2)

**Tasks**:
- [ ] Finalize placeholder syntax and escaping
- [ ] Add support for nested placeholders
- [ ] Implement environment inheritance
- [ ] Add validation for missing variables
- [ ] Create detailed error messages
- [ ] Support multiple environment configurations

#### 6.2 Advanced Dependency Tracking (Days 3-4)

**Tasks**:
- [ ] Complete dependency graph building
- [ ] Add visualization of dependencies
- [ ] Implement deployment ordering
- [ ] Add circular dependency detection
- [ ] Create dependency validation reports
- [ ] Test with complex scenarios

#### 6.3 Migration Tools (Day 5)

```typescript
// Migrate from function.json to handler/resource pattern
atakora function migrate ./FunctionApp --output ./migrated

// Generate resource.ts from existing function.json
atakora function generate-resource ./HttpTrigger/function.json
```

**Tasks**:
- [ ] Create migration from function.json
- [ ] Generate resource.ts from existing configs
- [ ] Convert environment variables to placeholders
- [ ] Create handler.ts templates
- [ ] Document migration process

### Success Criteria
- [ ] Environment system handles complex scenarios
- [ ] Dependencies correctly tracked and ordered
- [ ] Migration tools convert 80% of cases
- [ ] Clear error messages for all edge cases

---

## Phase 7: Production Readiness

**Duration**: Week 7-8 (5 business days)

### Objectives
- Performance optimization
- Security review and hardening
- Government cloud support
- Final testing and documentation

### Deliverables

#### 7.1 Performance Optimization (Days 1-2)

**Tasks**:
- [ ] Optimize resource.ts loading and parsing
- [ ] Improve discovery phase performance
- [ ] Optimize environment resolution
- [ ] Reduce bundle sizes
- [ ] Improve caching efficiency
- [ ] Add performance metrics

#### 7.2 Security Hardening (Day 3)

**Tasks**:
- [ ] Audit environment variable handling
- [ ] Add secret scanning in resource.ts
- [ ] Validate placeholder injection safety
- [ ] Implement key rotation support
- [ ] Add managed identity support
- [ ] Create security best practices guide

#### 7.3 Government Cloud Support (Day 4)

**Tasks**:
- [ ] Add Government cloud endpoints
- [ ] Update resource.ts for Gov compliance
- [ ] Test discovery in Government environment
- [ ] Document Gov-specific configurations
- [ ] Add validation for Gov requirements

#### 7.4 Final Testing & Polish (Day 5)

**Tasks**:
- [ ] End-to-end testing of all patterns
- [ ] Performance benchmarking
- [ ] Security scanning
- [ ] Documentation review
- [ ] Create migration guide from other platforms

### Success Criteria
- [ ] Discovery + build time < 10s for 10 functions
- [ ] Resource.ts parsing < 100ms per file
- [ ] Bundle size reduced by > 50%
- [ ] Security scan passes
- [ ] Gov cloud deployment works
- [ ] All patterns documented with examples

---

## Risk Management

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|------------|
| Resource.ts loading failures | High | Medium | Graceful fallback to inline config |
| Type safety complexity | Medium | Medium | Extensive TypeScript testing |
| Environment resolution errors | High | Low | Clear error messages, validation |
| Discovery performance | Medium | Low | Caching, parallel processing |
| Gov cloud differences | High | Medium | Early testing, documentation |

### Schedule Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Complex type system | High | Start with simple types, iterate |
| Discovery edge cases | Medium | Extensive testing, clear conventions |
| Migration complexity | Medium | Focus on common patterns first |
| Documentation lag | Low | Document as we build |

---

## Success Metrics

### Quantitative Metrics

1. **Discovery Performance**
   - Function discovery: < 1 second for 50 functions
   - Resource.ts parsing: < 100ms per file
   - Environment resolution: < 50ms per function

2. **Build Performance**
   - Initial build: < 10 seconds
   - Incremental build: < 2 seconds
   - Cache hit rate: > 80%

3. **Developer Experience**
   - Time to first function: < 3 minutes
   - Hot reload time: < 2 seconds
   - CLI response time: < 1 second

4. **Quality**
   - Test coverage: > 90%
   - Type safety: 100% for environment variables
   - Documentation: 100% API coverage

### Qualitative Metrics

1. **Developer Satisfaction**
   - Intuitive handler/resource separation
   - Clear error messages for placeholders
   - Smooth migration from function.json

2. **Adoption**
   - Used in > 5 projects within first month
   - Positive feedback on type safety
   - Community contributions to patterns

3. **Maintainability**
   - Clear separation of concerns
   - Well-documented patterns
   - Easy to extend with new triggers

---

## Team Assignments

Based on the specialist model:

| Phase | Lead | Support | Reviewers |
|-------|------|---------|-----------|
| Foundation | Devon | Felix | Becky, Charlie |
| Discovery & Build | Grace | Devon | Becky, Felix |
| Core Functions | Devon | Charlie | Becky, Grace |
| Advanced Features | Devon | Grace | Becky, Felix |
| Developer Experience | Ella | Charlie | All |
| Environment System | Felix | Grace | Becky, Devon |
| Production Ready | Charlie | All | Becky |

---

## Appendix A: Updated File Structure

```
packages/lib/src/
├── functions/
│   ├── define-function.ts
│   ├── types.ts
│   ├── handlers/
│   │   ├── http-handler.ts
│   │   ├── timer-handler.ts
│   │   └── queue-handler.ts
│   └── context/
│       ├── azure-function-context.ts
│       └── logger.ts
├── resources/function-app/
│   ├── index.ts
│   ├── types.ts
│   ├── arm-function-app.ts
│   ├── arm-function.ts
│   ├── function-app.ts
│   ├── azure-function.ts
│   ├── triggers/
│   │   ├── http-trigger.ts
│   │   ├── timer-trigger.ts
│   │   ├── queue-trigger.ts
│   │   └── servicebus-trigger.ts
│   └── bindings/
│       ├── binding-factory.ts
│       └── [binding types]
├── synthesis/
│   ├── phases/
│   │   ├── discovery-phase.ts
│   │   ├── build-phase.ts
│   │   └── [other phases]
│   ├── environment/
│   │   ├── environment-resolver.ts
│   │   └── placeholder-parser.ts
│   ├── dependencies/
│   │   ├── dependency-tracker.ts
│   │   └── deployment-orderer.ts
│   └── discovery/
│       ├── function-scanner.ts
│       ├── resource-loader.ts
│       └── function-registry.ts
```

## Appendix B: Example Patterns

### HTTP API Function

```typescript
// functions/api/resource.ts
import { defineFunction } from '@atakora/functions';

export interface ApiEnv {
  readonly DATABASE_URL: string;
  readonly API_KEY: string;
}

export default defineFunction<ApiEnv>({
  trigger: {
    type: 'http',
    route: 'api/users/{userId}',
    methods: ['GET', 'POST'],
    authLevel: AuthLevel.FUNCTION
  },
  environment: {
    DATABASE_URL: '${COSMOS_ENDPOINT}',
    API_KEY: '${API_SECRET_KEY}'
  },
  timeout: Duration.seconds(30),
  role: {
    managedIdentity: true
  }
});

// functions/api/handler.ts
import { HttpHandler, AzureFunctionContext, HttpRequest, HttpResponse } from '@atakora/functions';

export const handler: HttpHandler = async (
  context: AzureFunctionContext,
  req: HttpRequest
): Promise<HttpResponse> => {
  const { DATABASE_URL, API_KEY } = process.env;
  const userId = req.params.userId;

  context.log.info(`Processing request for user: ${userId}`);

  // Function logic here

  return {
    status: 200,
    body: { userId, message: 'Success' }
  };
};

// app.ts
const apiFunction = new AzureFunction(functionApp, 'ApiEndpoint', {
  handler: './functions/api/handler.ts',
  resource: './functions/api/resource.ts',
  environment: {
    COSMOS_ENDPOINT: cosmosDb.endpoint,
    API_SECRET_KEY: keyVault.secret('api-key')
  }
});
```

### Timer Function with Bindings

```typescript
// functions/cleanup/resource.ts
import { defineFunction } from '@atakora/functions';

export default defineFunction({
  trigger: {
    type: 'timer',
    schedule: '0 0 2 * * *',  // 2 AM daily
    runOnStartup: false
  },
  outputBindings: [{
    type: 'cosmosDb',
    direction: 'out',
    name: 'deletedItems',
    databaseName: 'audit',
    collectionName: 'deletions',
    connection: '${COSMOS_CONNECTION}'
  }],
  timeout: Duration.minutes(10)
});

// functions/cleanup/handler.ts
import { TimerHandler, AzureFunctionContext, TimerInfo } from '@atakora/functions';

export const handler: TimerHandler = async (
  context: AzureFunctionContext,
  timer: TimerInfo
): Promise<void> => {
  context.log.info('Cleanup function triggered', {
    isPastDue: timer.isPastDue,
    nextRun: timer.scheduleStatus.next
  });

  const deletedItems = [];
  // Cleanup logic here

  // Output binding automatically handles Cosmos write
  context.bindings.deletedItems = deletedItems;
};

// app.ts
const cleanupFunction = new AzureFunction(functionApp, 'Cleanup', {
  handler: './functions/cleanup/handler.ts',
  resource: './functions/cleanup/resource.ts',
  environment: {
    COSMOS_CONNECTION: cosmosDb.connectionString
  }
});
```

### Queue Processing Function

```typescript
// functions/orders/resource.ts
import { defineFunction } from '@atakora/functions';

export interface OrderEnv {
  readonly MAX_RETRIES: string;
  readonly NOTIFICATION_ENABLED: string;
}

export default defineFunction<OrderEnv>({
  trigger: {
    type: 'queue',
    queueName: 'orders',
    connection: '${STORAGE_CONNECTION}',
    batchSize: 10,
    maxDequeueCount: 3
  },
  inputBindings: [{
    type: 'table',
    direction: 'in',
    name: 'inventory',
    tableName: 'inventory',
    connection: '${STORAGE_CONNECTION}'
  }],
  outputBindings: [{
    type: 'serviceBus',
    direction: 'out',
    name: 'notifications',
    queueName: 'order-notifications',
    connection: '${SERVICE_BUS_CONNECTION}'
  }],
  environment: {
    MAX_RETRIES: '3',
    NOTIFICATION_ENABLED: '${NOTIFICATION_FLAG}'
  }
});

// functions/orders/handler.ts
import { QueueHandler, AzureFunctionContext } from '@atakora/functions';

interface OrderMessage {
  orderId: string;
  items: string[];
  customerId: string;
}

export const handler: QueueHandler<OrderMessage> = async (
  context: AzureFunctionContext,
  message: OrderMessage
): Promise<void> => {
  const inventory = context.bindings.inventory;

  context.log.info('Processing order', { orderId: message.orderId });

  // Process order logic
  const notification = {
    orderId: message.orderId,
    status: 'processed'
  };

  // Output to Service Bus
  if (process.env.NOTIFICATION_ENABLED === 'true') {
    context.bindings.notifications = notification;
  }
};

// app.ts
const orderProcessor = new AzureFunction(functionApp, 'OrderProcessor', {
  handler: './functions/orders/handler.ts',
  resource: './functions/orders/resource.ts',
  environment: {
    STORAGE_CONNECTION: storage.connectionString,
    SERVICE_BUS_CONNECTION: serviceBus.connectionString,
    NOTIFICATION_FLAG: 'true'
  }
});
```