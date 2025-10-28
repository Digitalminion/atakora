# Backend Architecture Design: Technical Specification

## System Architecture

The `defineBackend()` pattern implements a three-layer architecture for resource sharing and component composition:

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │UserApi  │  │Product  │  │PostApi  │  │Analytics│       │
│  │Component│  │Component│  │Component│  │Component│       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
│       │            │            │            │              │
│       └────────────┴────────────┴────────────┘              │
│                         │                                    │
├─────────────────────────▼───────────────────────────────────┤
│                  Backend Orchestrator                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Resource Requirements Analyzer             │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │            Resource Provider Registry                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │         Configuration Merger & Resolver               │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │          Dependency Injection Container               │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
├─────────────────────────▼───────────────────────────────────┤
│                 Infrastructure Layer                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Cosmos DB │  │Function  │  │Storage   │  │App       │  │
│  │Account   │  │App       │  │Account   │  │Insights  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Interfaces

### 1. Resource Requirement Protocol

```typescript
/**
 * Base interface for all resource requirements
 */
export interface IResourceRequirement {
  /** Type of resource needed (e.g., 'cosmos', 'storage', 'functions') */
  readonly resourceType: string;

  /** Unique key for deduplication */
  readonly requirementKey: string;

  /** Configuration requirements */
  readonly config: ResourceConfig;

  /** Priority for conflict resolution (higher wins) */
  readonly priority?: number;

  /** Validation rules for compatibility */
  readonly validators?: RequirementValidator[];
}

/**
 * Specific requirement for Cosmos DB
 */
export interface ICosmosRequirement extends IResourceRequirement {
  readonly resourceType: 'cosmos';
  readonly config: {
    readonly consistency?: ConsistencyLevel;
    readonly enableServerless?: boolean;
    readonly enableMultiRegion?: boolean;
    readonly capabilities?: ReadonlyArray<string>;
    readonly databases?: ReadonlyArray<DatabaseRequirement>;
  };
}

/**
 * Specific requirement for Function App
 */
export interface IFunctionAppRequirement extends IResourceRequirement {
  readonly resourceType: 'functions';
  readonly config: {
    readonly runtime: FunctionRuntime;
    readonly version?: string;
    readonly sku?: AppServiceSku;
    readonly alwaysOn?: boolean;
    readonly environmentVariables?: Record<string, string>;
    readonly extensions?: ReadonlyArray<string>;
  };
}

/**
 * Database-specific requirements
 */
export interface DatabaseRequirement {
  readonly name: string;
  readonly containers?: ReadonlyArray<ContainerRequirement>;
}

/**
 * Container-specific requirements
 */
export interface ContainerRequirement {
  readonly name: string;
  readonly partitionKey: string;
  readonly uniqueKeys?: ReadonlyArray<string>;
  readonly ttl?: number;
  readonly indexingPolicy?: IndexingPolicy;
}
```

### 2. Component Protocol

```typescript
/**
 * Interface for components that can be managed by a backend
 */
export interface IBackendComponent<TConfig = any> {
  /** Unique identifier for this component instance */
  readonly componentId: string;

  /** Component type (e.g., 'CrudApi', 'StaticSite') */
  readonly componentType: string;

  /** Configuration provided during definition */
  readonly config: TConfig;

  /** Get resource requirements for this component */
  getRequirements(): ReadonlyArray<IResourceRequirement>;

  /** Initialize component with resolved resources */
  initialize(resources: ResourceMap, scope: Construct): void;

  /** Validate that provided resources meet requirements */
  validateResources(resources: ResourceMap): ValidationResult;
}

/**
 * Component definition (before initialization)
 */
export interface IComponentDefinition<TConfig = any> {
  readonly componentId: string;
  readonly componentType: string;
  readonly config: TConfig;
  readonly factory: ComponentFactory<TConfig>;
}

/**
 * Factory for creating component instances
 */
export type ComponentFactory<TConfig> = (
  scope: Construct,
  id: string,
  config: TConfig,
  resources: ResourceMap
) => IBackendComponent<TConfig>;
```

### 3. Backend Interface

```typescript
/**
 * Main backend interface
 */
export interface IBackend {
  /** Unique backend identifier */
  readonly backendId: string;

  /** All registered components */
  readonly components: ReadonlyMap<string, IBackendComponent>;

  /** Shared resources created by this backend */
  readonly resources: ResourceMap;

  /** Add component to backend */
  addComponent(component: IComponentDefinition): void;

  /** Initialize all components and resources */
  initialize(scope: Construct): void;

  /** Add backend to CDK stack */
  addToStack(stack: Stack): void;

  /** Get specific resource by type and key */
  getResource<T>(type: string, key?: string): T | undefined;
}

/**
 * Backend configuration
 */
export interface BackendConfig {
  /** Enable monitoring with Application Insights */
  readonly monitoring?: boolean | MonitoringConfig;

  /** Network isolation strategy */
  readonly networking?: 'public' | 'isolated' | NetworkingConfig;

  /** Resource naming convention */
  readonly naming?: NamingConvention;

  /** Tags to apply to all resources */
  readonly tags?: Record<string, string>;

  /** Custom resource providers */
  readonly providers?: ReadonlyArray<IResourceProvider>;

  /** Resource limits and quotas */
  readonly limits?: ResourceLimits;
}

/**
 * Resource map for dependency injection
 */
export type ResourceMap = ReadonlyMap<string, any>;
```

### 4. Resource Provider Protocol

```typescript
/**
 * Interface for resource providers
 */
export interface IResourceProvider {
  /** Provider identifier */
  readonly providerId: string;

  /** Resource types this provider can handle */
  readonly supportedTypes: ReadonlyArray<string>;

  /** Check if provider can handle requirement */
  canProvide(requirement: IResourceRequirement): boolean;

  /** Create or get existing resource */
  provideResource(
    requirement: IResourceRequirement,
    scope: Construct,
    context: ProviderContext
  ): any;

  /** Merge multiple requirements into one */
  mergeRequirements(
    requirements: ReadonlyArray<IResourceRequirement>
  ): IResourceRequirement;
}

/**
 * Context provided to resource providers
 */
export interface ProviderContext {
  readonly backend: IBackend;
  readonly naming: NamingConvention;
  readonly tags: Record<string, string>;
  readonly existingResources: ResourceMap;
}
```

### 5. Configuration Merger

```typescript
/**
 * Strategy for merging configurations
 */
export interface IConfigurationMerger<T = any> {
  /** Check if configurations can be merged */
  canMerge(configs: ReadonlyArray<T>): boolean;

  /** Merge multiple configurations */
  merge(configs: ReadonlyArray<T>): T;

  /** Resolve conflicts between configurations */
  resolveConflicts(configs: ReadonlyArray<T>): ConflictResolution<T>;
}

/**
 * Result of conflict resolution
 */
export interface ConflictResolution<T> {
  readonly resolved: T;
  readonly warnings?: ReadonlyArray<string>;
  readonly incompatible?: ReadonlyArray<string>;
}
```

## Implementation Pattern

### Component Definition Phase

```typescript
// Components use static factory method for definition
export class CrudApi implements IBackendComponent<CrudApiConfig> {
  private constructor(
    private readonly definition: IComponentDefinition<CrudApiConfig>
  ) {}

  /**
   * Define a CrudApi component (Phase 1)
   */
  static define(id: string, config: CrudApiConfig): IComponentDefinition<CrudApiConfig> {
    return {
      componentId: id,
      componentType: 'CrudApi',
      config,
      factory: CrudApi.createInstance
    };
  }

  /**
   * Factory method for creating instances (Phase 2)
   */
  private static createInstance(
    scope: Construct,
    id: string,
    config: CrudApiConfig,
    resources: ResourceMap
  ): CrudApi {
    const instance = new CrudApi({ componentId: id, componentType: 'CrudApi', config, factory: CrudApi.createInstance });
    instance.initializeWithResources(scope, resources);
    return instance;
  }

  getRequirements(): ReadonlyArray<IResourceRequirement> {
    const { entityName, schema, partitionKey } = this.definition.config;

    return [
      {
        resourceType: 'cosmos',
        requirementKey: 'primary-database',
        config: {
          enableServerless: true,
          databases: [{
            name: `${entityName.toLowerCase()}-db`,
            containers: [{
              name: entityName.toLowerCase(),
              partitionKey: partitionKey ?? '/id'
            }]
          }]
        }
      },
      {
        resourceType: 'functions',
        requirementKey: 'crud-functions',
        config: {
          runtime: FunctionRuntime.NODE,
          version: '20',
          environmentVariables: {
            [`${entityName.toUpperCase()}_COSMOS_ENDPOINT`]: '${cosmos.endpoint}',
            [`${entityName.toUpperCase()}_DATABASE_NAME`]: `${entityName.toLowerCase()}-db`,
            [`${entityName.toUpperCase()}_CONTAINER_NAME`]: entityName.toLowerCase()
          }
        }
      }
    ];
  }

  private initializeWithResources(scope: Construct, resources: ResourceMap): void {
    // Use injected resources instead of creating new ones
    const cosmos = resources.get('cosmos:primary-database') as DatabaseAccounts;
    const functionApp = resources.get('functions:crud-functions') as FunctionsApp;

    // Configure component-specific resources within shared infrastructure
    this.configureCosmos(cosmos);
    this.deployFunctions(functionApp);
  }
}
```

### Backend Implementation

```typescript
export class Backend extends Construct implements IBackend {
  private readonly components = new Map<string, IBackendComponent>();
  private readonly resources = new Map<string, any>();
  private readonly providers: IResourceProvider[];

  constructor(scope: Construct, id: string, private readonly config: BackendConfig) {
    super(scope, id);

    // Register default providers
    this.providers = [
      new CosmosResourceProvider(),
      new FunctionAppResourceProvider(),
      new StorageResourceProvider(),
      ...(config.providers ?? [])
    ];
  }

  addComponent(definition: IComponentDefinition): void {
    // Create temporary instance to get requirements
    const tempComponent = this.createTempComponent(definition);
    const requirements = tempComponent.getRequirements();

    // Store for later initialization
    this.components.set(definition.componentId, tempComponent);

    // Process requirements
    this.processRequirements(requirements);
  }

  initialize(scope: Construct): void {
    // Phase 1: Analyze all requirements
    const allRequirements = this.collectAllRequirements();

    // Phase 2: Group and merge requirements
    const mergedRequirements = this.mergeRequirements(allRequirements);

    // Phase 3: Create shared resources
    for (const requirement of mergedRequirements) {
      const provider = this.findProvider(requirement);
      if (provider) {
        const resource = provider.provideResource(requirement, scope, {
          backend: this,
          naming: this.config.naming ?? new DefaultNamingConvention(),
          tags: this.config.tags ?? {},
          existingResources: this.resources
        });

        const key = `${requirement.resourceType}:${requirement.requirementKey}`;
        this.resources.set(key, resource);
      }
    }

    // Phase 4: Initialize all components with shared resources
    for (const [id, component] of this.components) {
      component.initialize(this.resources, scope);
    }
  }

  private mergeRequirements(
    requirements: ReadonlyArray<IResourceRequirement>
  ): ReadonlyArray<IResourceRequirement> {
    // Group by resource type and requirement key
    const grouped = new Map<string, IResourceRequirement[]>();

    for (const req of requirements) {
      const key = `${req.resourceType}:${req.requirementKey}`;
      const group = grouped.get(key) ?? [];
      group.push(req);
      grouped.set(key, group);
    }

    // Merge each group
    const merged: IResourceRequirement[] = [];
    for (const [key, group] of grouped) {
      if (group.length === 1) {
        merged.push(group[0]);
      } else {
        // Find provider and merge
        const provider = this.findProvider(group[0]);
        if (provider) {
          merged.push(provider.mergeRequirements(group));
        }
      }
    }

    return merged;
  }
}
```

### Usage Example

```typescript
import { defineBackend } from '@atakora/component';
import { CrudApi } from '@atakora/component/crud';
import { StaticSite } from '@atakora/component/web';

// Phase 1: Define components
const userApi = CrudApi.define('UserApi', {
  entityName: 'User',
  schema: {
    id: 'string',
    name: { type: 'string', required: true },
    email: { type: 'string', required: true }
  }
});

const productApi = CrudApi.define('ProductApi', {
  entityName: 'Product',
  schema: {
    id: 'string',
    name: 'string',
    price: 'number'
  }
});

const adminPortal = StaticSite.define('AdminPortal', {
  sourceDirectory: './admin',
  buildCommand: 'npm run build'
});

// Phase 2: Create backend
const backend = defineBackend({
  // Components
  userApi,
  productApi,
  adminPortal,

  // Configuration
  monitoring: {
    enabled: true,
    retentionDays: 90
  },
  networking: 'isolated',
  tags: {
    Environment: 'Production',
    Team: 'Platform'
  }
});

// Phase 3: Add to stack
const stack = new ResourceGroupStack(app, 'MyAppStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

backend.addToStack(stack);
```

## Resource Sharing Strategy

### Deduplication Rules

1. **Cosmos DB Accounts**: Share when:
   - Same consistency level requirements
   - Compatible capabilities (serverless vs provisioned)
   - Same region requirements

2. **Function Apps**: Share when:
   - Same runtime and version
   - Compatible extensions
   - Combined environment variables don't conflict
   - Total functions < 200 (Azure limit)

3. **Storage Accounts**: Share when:
   - Same performance tier
   - Same replication type
   - Combined containers < 500 (practical limit)

### Configuration Merging

When multiple components require the same resource type with different configurations:

1. **Union Strategy**: Combine all requirements (e.g., environment variables)
2. **Maximum Strategy**: Take highest requirement (e.g., SKU tier)
3. **Intersection Strategy**: Only common requirements (e.g., network rules)
4. **Priority Strategy**: Higher priority component wins conflicts

### Naming Conventions

Shared resources use deterministic naming:

```typescript
interface NamingConvention {
  // Format: {prefix}-{resourceType}-{backend}-{environment}-{suffix}
  formatResourceName(
    resourceType: string,
    backendId: string,
    suffix?: string
  ): string;
}

// Example: "cosmos-db-backend-prod-001"
// Example: "func-app-backend-prod-main"
```

## Migration Strategy

### Phase 1: Backward Compatibility

Existing components continue to work without modification:

```typescript
// Old way still works
const api = new CrudApi(stack, 'Api', props);

// New way with backend
const api = CrudApi.define('Api', props);
const backend = defineBackend({ api });
```

### Phase 2: Gradual Adoption

Components implement both interfaces:

```typescript
export class CrudApi extends Construct implements IBackendComponent {
  // Traditional constructor for backward compatibility
  constructor(scope: Construct, id: string, props: CrudApiProps) {
    if (isBackendScope(scope)) {
      // New path: use shared resources
    } else {
      // Old path: create own resources
    }
  }

  // New static factory for backend pattern
  static define(id: string, config: CrudApiConfig) { /* ... */ }
}
```

### Phase 3: Deprecation

After sufficient adoption, deprecate old constructor pattern with clear migration guide.

## Work Packages

### Package 1: Core Infrastructure (Devon)
- [ ] Implement IResourceRequirement interfaces
- [ ] Create Backend base construct
- [ ] Implement resource provider registry
- [ ] Create configuration merger

### Package 2: Resource Providers (Grace)
- [ ] Implement CosmosResourceProvider
- [ ] Implement FunctionAppResourceProvider
- [ ] Implement StorageResourceProvider
- [ ] Create provider test suite

### Package 3: Component Updates (Devon)
- [ ] Update CrudApi to support backend pattern
- [ ] Update FunctionsApp to support backend pattern
- [ ] Update StaticSite to support backend pattern
- [ ] Maintain backward compatibility

### Package 4: Type System (Felix)
- [ ] Create type inference helpers
- [ ] Implement validation schemas
- [ ] Create type guards for resources
- [ ] Build compile-time checks

### Package 5: Testing (Charlie)
- [ ] Create backend integration tests
- [ ] Test resource sharing scenarios
- [ ] Test configuration merging
- [ ] Performance benchmarks

### Package 6: Documentation (Ella)
- [ ] Write migration guide
- [ ] Create usage examples
- [ ] Document best practices
- [ ] API reference documentation

## Performance Considerations

1. **Lazy Initialization**: Resources only created when first component needs them
2. **Caching**: Resource provider results cached within backend instance
3. **Parallel Creation**: Independent resources created in parallel
4. **Minimal Overhead**: < 5% increase in CDK synthesis time

## Security Considerations

1. **Isolation**: Components can't access resources they didn't request
2. **RBAC**: Shared resources use least-privilege access
3. **Network**: Support for isolated networking configurations
4. **Secrets**: Managed through Key Vault references, never in config