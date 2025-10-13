# Backend Pattern API Reference

Complete API documentation for the Backend Pattern implementation in @atakora/component.

## Table of Contents

- [Main API](#main-api)
  - [defineBackend()](#definebackend)
  - [BackendBuilder](#backendbuilder)
- [Component APIs](#component-apis)
  - [CrudApi.define()](#crudapidefine)
  - [FunctionsApp.define()](#functionsappdefine)
- [Interfaces](#interfaces)
  - [IBackend](#ibackend)
  - [IBackendComponent](#ibackendcomponent)
  - [IComponentDefinition](#icomponentdefinition)
  - [IResourceRequirement](#iresourcerequirement)
- [Configuration](#configuration)
  - [BackendConfig](#backendconfig)
  - [MonitoringConfig](#monitoringconfig)
  - [NetworkingConfig](#networkingconfig)
- [Resource Requirements](#resource-requirements)
  - [CosmosConfig](#cosmosconfig)
  - [FunctionAppConfig](#functionappconfig)
  - [StorageConfig](#storageconfig)
- [Utility Functions](#utility-functions)
  - [isBackendManaged()](#isbackendmanaged)
  - [getBackendId()](#getbackendid)
- [Type Definitions](#type-definitions)

---

## Main API

### defineBackend()

Creates a backend instance with shared resources and type-safe component access.

#### Signature

```typescript
function defineBackend<T extends ComponentMap>(
  components: T,
  config?: BackendConfig
): TypedBackend<T>

function defineBackend(
  config: BackendConfig
): BackendBuilder
```

#### Overload 1: With Components

Creates a typed backend with immediate component definitions.

**Parameters:**
- `components: T` - Object mapping component IDs to component definitions
- `config?: BackendConfig` - Optional backend configuration

**Returns:** `TypedBackend<T>` - Typed backend instance with component access

**Example:**

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';

const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: { id: 'string', name: 'string' }
  }),
  productApi: CrudApi.define('ProductApi', {
    entityName: 'Product',
    schema: { id: 'string', name: 'string' }
  })
}, {
  environment: 'prod',
  location: 'eastus',
  monitoring: true
});

// Add to stack
const stack = new ResourceGroupStack(app, 'MyStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

backend.addToStack(stack);

// Type-safe component access
backend.components.userApi;    // Type: IBackendComponent<CrudApiProps>
backend.components.productApi; // Type: IBackendComponent<CrudApiProps>
```

#### Overload 2: Config Only

Creates a backend builder for fluent API usage.

**Parameters:**
- `config: BackendConfig` - Backend configuration

**Returns:** `BackendBuilder` - Builder for progressive backend construction

**Example:**

```typescript
const backend = defineBackend({ environment: 'prod' })
  .addComponent(CrudApi.define('UserApi', { ... }))
  .addComponent(CrudApi.define('ProductApi', { ... }))
  .withMonitoring({ enabled: true, retentionDays: 90 })
  .withTags({ project: 'myapp', team: 'backend' })
  .build();
```

---

### BackendBuilder

Fluent API for progressive backend construction.

#### Methods

##### addComponent()

Add a component definition to the backend.

```typescript
addComponent<T>(component: IComponentDefinition<T>): BackendBuilder
```

**Parameters:**
- `component: IComponentDefinition<T>` - Component definition to add

**Returns:** `BackendBuilder` - Builder for method chaining

**Example:**

```typescript
builder.addComponent(CrudApi.define('UserApi', {
  entityName: 'User',
  schema: { ... }
}));
```

##### withMonitoring()

Configure Application Insights monitoring.

```typescript
withMonitoring(config: MonitoringConfig): BackendBuilder
```

**Parameters:**
- `config: MonitoringConfig` - Monitoring configuration

**Returns:** `BackendBuilder` - Builder for method chaining

**Example:**

```typescript
builder.withMonitoring({
  enabled: true,
  retentionDays: 90,
  samplingPercentage: 100,
  workspaceName: 'my-workspace'
});
```

##### withNetworking()

Configure network isolation and security.

```typescript
withNetworking(config: NetworkingConfig): BackendBuilder
```

**Parameters:**
- `config: NetworkingConfig` - Networking configuration

**Returns:** `BackendBuilder` - Builder for method chaining

**Example:**

```typescript
builder.withNetworking({
  mode: 'isolated',
  vnetName: 'my-vnet',
  subnetName: 'backend-subnet',
  privateEndpoints: true
});
```

##### withNaming()

Configure custom naming conventions.

```typescript
withNaming(convention: NamingConvention): BackendBuilder
```

**Parameters:**
- `convention: NamingConvention` - Naming convention implementation

**Returns:** `BackendBuilder` - Builder for method chaining

**Example:**

```typescript
builder.withNaming({
  formatResourceName: (type, backendId, suffix) =>
    `${type}-${backendId}-${suffix}`.toLowerCase(),
  formatResourceGroupName: (backendId, env) =>
    `rg-${backendId}-${env}`.toLowerCase()
});
```

##### withTags()

Add resource tags.

```typescript
withTags(tags: Record<string, string>): BackendBuilder
```

**Parameters:**
- `tags: Record<string, string>` - Tags to apply to all resources

**Returns:** `BackendBuilder` - Builder for method chaining

**Example:**

```typescript
builder.withTags({
  project: 'myapp',
  team: 'backend',
  environment: 'production',
  costCenter: 'engineering'
});
```

##### withProvider()

Add a custom resource provider.

```typescript
withProvider(provider: IResourceProvider): BackendBuilder
```

**Parameters:**
- `provider: IResourceProvider` - Resource provider implementation

**Returns:** `BackendBuilder` - Builder for method chaining

**Example:**

```typescript
builder.withProvider(new CustomServiceBusProvider());
```

##### build()

Build the backend instance.

```typescript
build(): IBackend
```

**Returns:** `IBackend` - Constructed backend instance

**Example:**

```typescript
const backend = builder.build();
backend.initialize(stack);
```

---

## Component APIs

### CrudApi.define()

Create a CrudApi component definition for backend usage.

#### Signature

```typescript
static define(
  id: string,
  config: CrudApiProps
): IComponentDefinition<CrudApiProps>
```

**Parameters:**
- `id: string` - Unique component identifier
- `config: CrudApiProps` - Component configuration

**Returns:** `IComponentDefinition<CrudApiProps>` - Component definition

**Example:**

```typescript
const userApi = CrudApi.define('UserApi', {
  entityName: 'User',
  schema: {
    id: 'string',
    name: 'string',
    email: 'string',
    createdAt: 'timestamp',
    updatedAt: 'timestamp'
  },
  partitionKey: '/id',
  ttl: 86400, // 24 hours
  throughput: 400
});
```

**CrudApiProps Interface:**

```typescript
interface CrudApiProps {
  // Required
  entityName: string;         // Entity name (e.g., 'User', 'Product')
  schema: SchemaDefinition;   // Entity schema
  partitionKey: string;       // Partition key path (e.g., '/id')

  // Optional
  ttl?: number;               // Time-to-live in seconds
  throughput?: number;        // Provisioned throughput (RU/s)
  uniqueKeys?: string[];      // Unique key paths
  enableSoftDelete?: boolean; // Soft delete support
  enableAudit?: boolean;      // Audit trail support
  cors?: CorsConfig;          // CORS configuration
}
```

---

### FunctionsApp.define()

Create a FunctionsApp component definition for backend usage.

#### Signature

```typescript
static define(
  id: string,
  config: FunctionsAppProps
): IComponentDefinition<FunctionsAppProps>
```

**Parameters:**
- `id: string` - Unique component identifier
- `config: FunctionsAppProps` - Component configuration

**Returns:** `IComponentDefinition<FunctionsAppProps>` - Component definition

**Example:**

```typescript
const processorApp = FunctionsApp.define('ProcessorApp', {
  runtime: 'node',
  version: '20',
  sku: 'Y1',
  functions: {
    'process-webhook': {
      trigger: 'http',
      methods: ['POST'],
      authLevel: 'function'
    },
    'scheduled-task': {
      trigger: 'timer',
      schedule: '0 */5 * * * *' // Every 5 minutes
    }
  },
  environmentVariables: {
    STORAGE_CONNECTION: '${storage.connectionString}',
    LOG_LEVEL: 'info'
  }
});
```

**FunctionsAppProps Interface:**

```typescript
interface FunctionsAppProps {
  // Required
  runtime: FunctionRuntime;  // 'node' | 'dotnet' | 'python' | 'java'

  // Optional
  version?: string;          // Runtime version (e.g., '20' for Node 20)
  sku?: FunctionAppSku;      // 'Y1' | 'EP1' | 'EP2' | 'EP3'
  functions?: Record<string, FunctionDefinition>;
  environmentVariables?: Record<string, string>;
  cors?: CorsSettings;
  alwaysOn?: boolean;
  use32BitWorkerProcess?: boolean;
}
```

---

## Interfaces

### IBackend

Main backend interface for resource orchestration.

```typescript
interface IBackend {
  readonly backendId: string;
  readonly components: ReadonlyMap<string, IBackendComponent>;
  readonly resources: ResourceMap;
  readonly config: BackendConfig;

  addComponent(component: IComponentDefinition): void;
  initialize(scope: Construct): void;
  addToStack(stack: AzureStack): void;
  getResource<T = unknown>(type: string, key?: string): T | undefined;
  getComponent<T extends IBackendComponent = IBackendComponent>(id: string): T | undefined;
  validate(): ValidationResult;
}
```

#### Properties

- **backendId**: Unique backend identifier
- **components**: Map of all registered components
- **resources**: Map of all provisioned resources
- **config**: Backend configuration

#### Methods

- **addComponent()**: Register a component with the backend
- **initialize()**: Initialize all components and provision resources
- **addToStack()**: Add backend to CDK stack (convenience method)
- **getResource()**: Retrieve a specific resource by type and key
- **getComponent()**: Retrieve a component by ID
- **validate()**: Validate all components and resources

---

### IBackendComponent

Interface that components must implement to participate in backend pattern.

```typescript
interface IBackendComponent<TConfig = unknown> {
  readonly componentId: string;
  readonly componentType: string;
  readonly config: TConfig;

  getRequirements(): ReadonlyArray<IResourceRequirement>;
  initialize(resources: ResourceMap, scope: Construct): void;
  validateResources(resources: ResourceMap): ValidationResult;
  getOutputs(): ComponentOutputs;
}
```

#### Properties

- **componentId**: Unique identifier for this component instance
- **componentType**: Component type name (e.g., 'CrudApi')
- **config**: Configuration provided during definition

#### Methods

- **getRequirements()**: Return list of required resources
- **initialize()**: Receive and configure with injected resources
- **validateResources()**: Validate that provided resources meet requirements
- **getOutputs()**: Export values for other components to reference

---

### IComponentDefinition

Component definition before instantiation.

```typescript
interface IComponentDefinition<TConfig = unknown> {
  readonly componentId: string;
  readonly componentType: string;
  readonly config: TConfig;
  readonly factory: ComponentFactory<TConfig>;
}
```

#### Properties

- **componentId**: Component identifier
- **componentType**: Type of component
- **config**: Component configuration
- **factory**: Factory function to create component instance

**ComponentFactory Type:**

```typescript
type ComponentFactory<TConfig> = (
  scope: Construct,
  id: string,
  config: TConfig,
  resources: ResourceMap
) => IBackendComponent<TConfig>
```

---

### IResourceRequirement

Declares infrastructure resource needs.

```typescript
interface IResourceRequirement {
  readonly resourceType: string;
  readonly requirementKey: string;
  readonly config: ResourceConfig;
  readonly priority?: number;
  readonly validators?: ReadonlyArray<RequirementValidator>;
  readonly metadata?: RequirementMetadata;
}
```

#### Properties

- **resourceType**: Type of resource ('cosmos', 'functions', 'storage', etc.)
- **requirementKey**: Unique key for deduplication
- **config**: Resource-specific configuration
- **priority**: Priority for conflict resolution (higher wins, default: 10)
- **validators**: Custom validation rules
- **metadata**: Debug information about requirement source

**Example:**

```typescript
const requirement: IResourceRequirement = {
  resourceType: 'cosmos',
  requirementKey: 'UserApi-cosmos',
  priority: 20,
  config: {
    enableServerless: true,
    consistency: 'Session',
    databases: [{
      name: 'users-db',
      containers: [{
        name: 'users',
        partitionKey: '/id'
      }]
    }]
  },
  metadata: {
    source: 'UserApi',
    version: '1.0.0',
    description: 'Cosmos DB for user data'
  }
};
```

---

## Configuration

### BackendConfig

Configuration for backend behavior and resource provisioning.

```typescript
interface BackendConfig {
  monitoring?: boolean | MonitoringConfig;
  networking?: 'public' | 'isolated' | NetworkingConfig;
  naming?: NamingConvention;
  tags?: Record<string, string>;
  providers?: ReadonlyArray<IResourceProvider>;
  limits?: ResourceLimits;
  environment?: string;
  location?: string;
}
```

#### Properties

- **monitoring**: Enable Application Insights (boolean or detailed config)
- **networking**: Network isolation strategy
- **naming**: Custom naming convention
- **tags**: Tags to apply to all resources
- **providers**: Custom resource providers
- **limits**: Resource quotas and limits
- **environment**: Environment name ('dev', 'staging', 'prod')
- **location**: Azure region ('eastus', 'westus2', etc.)

**Example:**

```typescript
const config: BackendConfig = {
  environment: 'production',
  location: 'eastus',
  monitoring: {
    enabled: true,
    retentionDays: 90,
    samplingPercentage: 100
  },
  networking: 'isolated',
  tags: {
    project: 'myapp',
    team: 'backend',
    costCenter: 'engineering'
  },
  limits: {
    maxCosmosAccounts: 1,
    maxFunctionApps: 1,
    maxStorageAccounts: 2
  }
};
```

---

### MonitoringConfig

Application Insights monitoring configuration.

```typescript
interface MonitoringConfig {
  enabled: boolean;
  retentionDays?: number;
  samplingPercentage?: number;
  workspaceName?: string;
  applicationInsightsName?: string;
}
```

#### Properties

- **enabled**: Enable Application Insights
- **retentionDays**: Log retention period (default: 90)
- **samplingPercentage**: Sampling rate 0-100 (default: 100)
- **workspaceName**: Log Analytics workspace name
- **applicationInsightsName**: Application Insights resource name

**Example:**

```typescript
const monitoring: MonitoringConfig = {
  enabled: true,
  retentionDays: 90,
  samplingPercentage: 100,
  workspaceName: 'myapp-workspace',
  applicationInsightsName: 'myapp-insights'
};
```

---

### NetworkingConfig

Network isolation and security configuration.

```typescript
interface NetworkingConfig {
  mode: 'public' | 'isolated' | 'hybrid';
  vnetName?: string;
  subnetName?: string;
  privateEndpoints?: boolean;
  serviceTags?: ReadonlyArray<string>;
}
```

#### Properties

- **mode**: Networking mode
  - `'public'`: Public endpoints, no VNet integration
  - `'isolated'`: Full VNet integration, private endpoints
  - `'hybrid'`: VNet integration with selective public access
- **vnetName**: Virtual network name
- **subnetName**: Subnet name for VNet integration
- **privateEndpoints**: Enable private endpoints for resources
- **serviceTags**: Service tags for firewall rules

**Example:**

```typescript
const networking: NetworkingConfig = {
  mode: 'isolated',
  vnetName: 'myapp-vnet',
  subnetName: 'backend-subnet',
  privateEndpoints: true,
  serviceTags: ['AzureCloud', 'Storage', 'Sql']
};
```

---

## Resource Requirements

### CosmosConfig

Cosmos DB specific configuration.

```typescript
interface CosmosConfig extends Record<string, unknown> {
  consistency?: CosmosConsistencyLevel;
  enableServerless?: boolean;
  enableMultiRegion?: boolean;
  capabilities?: ReadonlyArray<CosmosCapability>;
  databases?: ReadonlyArray<DatabaseRequirement>;
  publicNetworkAccess?: 'Enabled' | 'Disabled';
  ipRules?: ReadonlyArray<string>;
}
```

#### Properties

- **consistency**: Consistency level ('Eventual' | 'Session' | 'Strong', etc.)
- **enableServerless**: Use serverless mode (pay-per-request)
- **enableMultiRegion**: Enable multi-region writes
- **capabilities**: API capabilities ('EnableMongo', 'EnableCassandra', etc.)
- **databases**: Database definitions
- **publicNetworkAccess**: Public network access setting
- **ipRules**: IP firewall rules

**DatabaseRequirement:**

```typescript
interface DatabaseRequirement {
  name: string;
  throughput?: number;
  containers?: ReadonlyArray<ContainerRequirement>;
}
```

**ContainerRequirement:**

```typescript
interface ContainerRequirement {
  name: string;
  partitionKey: string;
  uniqueKeys?: ReadonlyArray<string>;
  ttl?: number;
  throughput?: number;
  indexingPolicy?: IndexingPolicy;
}
```

**Example:**

```typescript
const cosmosConfig: CosmosConfig = {
  enableServerless: true,
  consistency: 'Session',
  publicNetworkAccess: 'Disabled',
  databases: [{
    name: 'myapp-db',
    containers: [{
      name: 'users',
      partitionKey: '/id',
      ttl: 86400
    }, {
      name: 'products',
      partitionKey: '/category',
      uniqueKeys: ['/sku']
    }]
  }]
};
```

---

### FunctionAppConfig

Function App specific configuration.

```typescript
interface FunctionAppConfig extends Record<string, unknown> {
  runtime: FunctionRuntime;
  version?: string;
  sku?: FunctionAppSku;
  alwaysOn?: boolean;
  use32BitWorkerProcess?: boolean;
  environmentVariables?: Record<string, string>;
  extensions?: ReadonlyArray<string>;
  cors?: CorsSettings;
  connectionStrings?: Record<string, ConnectionString>;
}
```

#### Properties

- **runtime**: Runtime language ('node' | 'dotnet' | 'python' | 'java')
- **version**: Runtime version (e.g., '20' for Node 20)
- **sku**: App Service Plan SKU ('Y1' | 'EP1' | 'EP2' | 'EP3')
- **alwaysOn**: Keep app always on (Premium plans only)
- **use32BitWorkerProcess**: Use 32-bit worker
- **environmentVariables**: Environment variable map
- **extensions**: Function extensions to install
- **cors**: CORS configuration
- **connectionStrings**: Connection strings

**Example:**

```typescript
const functionAppConfig: FunctionAppConfig = {
  runtime: 'node',
  version: '20',
  sku: 'Y1',
  environmentVariables: {
    COSMOS_ENDPOINT: '${cosmos.documentEndpoint}',
    COSMOS_KEY: '${cosmos.primaryKey}',
    STORAGE_CONNECTION: '${storage.connectionString}',
    LOG_LEVEL: 'info'
  },
  cors: {
    allowedOrigins: ['https://myapp.com'],
    supportCredentials: true
  }
};
```

---

### StorageConfig

Storage Account specific configuration.

```typescript
interface StorageConfig extends Record<string, unknown> {
  sku: StorageSku;
  kind?: StorageKind;
  accessTier?: StorageAccessTier;
  enableHttpsOnly?: boolean;
  containers?: ReadonlyArray<StorageContainer>;
  queues?: ReadonlyArray<string>;
  tables?: ReadonlyArray<string>;
  fileShares?: ReadonlyArray<FileShare>;
}
```

#### Properties

- **sku**: Storage SKU ('Standard_LRS' | 'Standard_GRS' | 'Premium_LRS', etc.)
- **kind**: Account kind ('StorageV2' | 'BlobStorage' | 'FileStorage')
- **accessTier**: Access tier ('Hot' | 'Cool')
- **enableHttpsOnly**: Enforce HTTPS only
- **containers**: Blob containers to create
- **queues**: Queue names to create
- **tables**: Table names to create
- **fileShares**: File shares to create

**Example:**

```typescript
const storageConfig: StorageConfig = {
  sku: 'Standard_LRS',
  kind: 'StorageV2',
  accessTier: 'Hot',
  enableHttpsOnly: true,
  containers: [
    { name: 'uploads', publicAccess: 'None' },
    { name: 'downloads', publicAccess: 'Blob' }
  ],
  queues: ['processing-queue', 'notification-queue'],
  tables: ['audit-log', 'session-store']
};
```

---

## Utility Functions

### isBackendManaged()

Check if a construct is managed by a backend.

```typescript
function isBackendManaged(scope: Construct): boolean
```

**Parameters:**
- `scope: Construct` - CDK construct scope

**Returns:** `boolean` - True if scope is backend-managed

**Example:**

```typescript
import { isBackendManaged } from '@atakora/component/backend';

class MyComponent extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    if (isBackendManaged(scope)) {
      // Backend mode: Wait for resource injection
      console.log('Running in backend mode');
    } else {
      // Traditional mode: Create own resources
      console.log('Running in traditional mode');
      this.createResources();
    }
  }
}
```

---

### getBackendId()

Get the backend ID from a backend-managed scope.

```typescript
function getBackendId(scope: Construct): string | undefined
```

**Parameters:**
- `scope: Construct` - CDK construct scope

**Returns:** `string | undefined` - Backend ID or undefined if not backend-managed

**Example:**

```typescript
import { getBackendId } from '@atakora/component/backend';

const backendId = getBackendId(this);
if (backendId) {
  console.log(`Component is managed by backend: ${backendId}`);
}
```

---

## Type Definitions

### TypedBackend

Type-safe backend with inferred component types.

```typescript
interface TypedBackend<T extends ComponentMap> extends Omit<IBackend, 'components'> {
  readonly components: {
    [K in keyof T]: T[K] extends IComponentDefinition<infer C>
      ? IBackendComponent<C>
      : never;
  };
}
```

Provides full TypeScript type inference for component access.

---

### ComponentMap

Map of component IDs to definitions.

```typescript
type ComponentMap = {
  [K: string]: IComponentDefinition;
}
```

---

### ResourceMap

Map of resource keys to resource instances.

```typescript
type ResourceMap = ReadonlyMap<string, unknown>
```

Resource keys follow the format: `{resourceType}:{requirementKey}`

Examples:
- `cosmos:UserApi-cosmos`
- `functions:UserApi-functions`
- `storage:shared-storage`

---

### ValidationResult

Result of validation operations.

```typescript
interface ValidationResult {
  readonly valid: boolean;
  readonly errors?: ReadonlyArray<string>;
  readonly warnings?: ReadonlyArray<string>;
}
```

---

## See Also

- [Backend Pattern Overview](./backend-pattern.md)
- [Basic Examples](./examples/basic-backend.md)
- [Advanced Examples](./examples/advanced-backend.md)
- [Migration Guide](./migration-guide.md)
- [Best Practices](./best-practices.md)
- [Troubleshooting](./troubleshooting.md)
