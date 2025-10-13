/**
 * Backend Pattern Implementation Examples
 *
 * This file contains complete implementation examples demonstrating how to use
 * the defineBackend() pattern in various scenarios.
 */

import { Construct } from '@atakora/cdk';
import { ResourceGroupStack } from '@atakora/cdk';
import type {
  IBackendComponent,
  IComponentDefinition,
  IResourceRequirement,
  ResourceMap,
  ValidationResult,
  BackendConfig,
  IBackend,
  ComponentOutputs
} from './backend-interfaces';

// ============================================================================
// Example 1: Simple E-Commerce Application
// ============================================================================

/**
 * Complete e-commerce backend with multiple CRUD APIs sharing resources
 */
export function createEcommerceBackend() {
  // Define components
  const userApi = CrudApi.define('UserApi', {
    entityName: 'User',
    schema: {
      id: 'string',
      email: { type: 'string', required: true, format: 'email' },
      name: { type: 'string', required: true },
      role: { type: 'string', validation: { enum: ['customer', 'admin'] } },
      createdAt: 'timestamp'
    },
    partitionKey: '/id',
    enableOptimisticConcurrency: true
  });

  const productApi = CrudApi.define('ProductApi', {
    entityName: 'Product',
    schema: {
      id: 'string',
      name: { type: 'string', required: true },
      description: 'string',
      price: { type: 'number', required: true, min: 0 },
      category: { type: 'string', required: true },
      inventory: { type: 'number', default: 0 }
    },
    partitionKey: '/category'
  });

  const orderApi = CrudApi.define('OrderApi', {
    entityName: 'Order',
    schema: {
      id: 'string',
      userId: { type: 'string', required: true },
      items: {
        type: 'array',
        items: {
          productId: 'string',
          quantity: 'number',
          price: 'number'
        }
      },
      total: { type: 'number', required: true },
      status: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered'] },
      createdAt: 'timestamp'
    },
    partitionKey: '/userId',
    enableSoftDelete: true
  });

  const storefront = StaticSite.define('Storefront', {
    sourceDirectory: './frontend',
    buildCommand: 'npm run build',
    outputDirectory: './frontend/dist',
    environmentVariables: {
      VITE_API_ENDPOINT: '${backend.apiGateway.endpoint}'
    }
  });

  // Create backend with shared resources
  const backend = defineBackend({
    // Components
    userApi,
    productApi,
    orderApi,
    storefront,

    // Configuration
    monitoring: {
      enabled: true,
      retentionDays: 90,
      samplingPercentage: 10
    },
    networking: {
      mode: 'isolated',
      privateEndpoints: true
    },
    tags: {
      Application: 'ECommerce',
      Environment: 'Production',
      CostCenter: 'Sales'
    }
  });

  return backend;
}

// ============================================================================
// Example 2: Microservices with Event-Driven Architecture
// ============================================================================

/**
 * Microservices backend with event bus and async processing
 */
export function createMicroservicesBackend() {
  // Define microservices
  const authService = Microservice.define('AuthService', {
    runtime: 'node',
    sourceDirectory: './services/auth',
    endpoints: [
      { path: '/login', method: 'POST' },
      { path: '/logout', method: 'POST' },
      { path: '/refresh', method: 'POST' },
      { path: '/validate', method: 'GET' }
    ],
    environment: {
      JWT_SECRET: '@Microsoft.KeyVault(SecretUri=${keyVault.secretUri})',
      TOKEN_EXPIRY: '3600'
    }
  });

  const notificationService = Microservice.define('NotificationService', {
    runtime: 'python',
    sourceDirectory: './services/notifications',
    triggers: [
      { type: 'serviceBus', queue: 'notifications' },
      { type: 'http', path: '/send' }
    ],
    dependencies: {
      sendgrid: true,
      twilio: true
    }
  });

  const analyticsService = Microservice.define('AnalyticsService', {
    runtime: 'dotnet',
    sourceDirectory: './services/analytics',
    triggers: [
      { type: 'eventHub', hub: 'events' },
      { type: 'timer', schedule: '0 */5 * * * *' }
    ],
    outputs: [
      { type: 'cosmosDb', container: 'analytics' },
      { type: 'blob', container: 'reports' }
    ]
  });

  // Event bus for inter-service communication
  const eventBus = EventBus.define('MainEventBus', {
    type: 'serviceBus',
    topics: [
      { name: 'user-events', subscriptions: ['auth', 'notifications'] },
      { name: 'order-events', subscriptions: ['analytics', 'notifications'] }
    ],
    enableDeadLettering: true,
    maxDeliveryCount: 5
  });

  // Create backend with event-driven architecture
  const backend = defineBackend({
    // Services
    authService,
    notificationService,
    analyticsService,
    eventBus,

    // Advanced configuration
    monitoring: {
      enabled: true,
      applicationInsightsName: 'ai-microservices-prod'
    },
    networking: 'isolated',
    providers: [
      new ServiceBusProvider(),
      new EventHubProvider(),
      new KeyVaultProvider()
    ]
  });

  return backend;
}

// ============================================================================
// Example 3: Data Processing Pipeline
// ============================================================================

/**
 * Data processing backend with batch and stream processing
 */
export function createDataPipelineBackend() {
  // Data ingestion layer
  const dataIngestion = DataIngestion.define('Ingestion', {
    sources: [
      { type: 'blob', container: 'raw-data', pattern: '*.csv' },
      { type: 'eventHub', name: 'telemetry', consumerGroup: 'processing' },
      { type: 'api', endpoint: '/ingest', rateLimit: 1000 }
    ],
    validation: {
      schema: './schemas/input-schema.json',
      errorHandling: 'deadletter'
    }
  });

  // Stream processing
  const streamProcessor = StreamProcessor.define('StreamProcessor', {
    runtime: 'java',
    framework: 'spark-streaming',
    input: { type: 'eventHub', name: 'telemetry' },
    transformations: [
      { type: 'filter', condition: 'value > 0' },
      { type: 'aggregate', window: '5m', function: 'avg' },
      { type: 'enrich', lookup: 'reference-data' }
    ],
    output: [
      { type: 'cosmosDb', container: 'processed' },
      { type: 'eventHub', name: 'enriched' }
    ]
  });

  // Batch processing
  const batchProcessor = BatchProcessor.define('BatchProcessor', {
    runtime: 'python',
    framework: 'databricks',
    schedule: '0 0 * * *', // Daily at midnight
    input: { type: 'blob', container: 'raw-data' },
    notebooks: [
      './notebooks/clean-data.ipynb',
      './notebooks/transform.ipynb',
      './notebooks/aggregate.ipynb'
    ],
    output: { type: 'synapse', table: 'fact_daily' }
  });

  // ML pipeline
  const mlPipeline = MLPipeline.define('MLPipeline', {
    framework: 'azureml',
    training: {
      dataset: 'processed-data',
      algorithm: 'random-forest',
      hyperparameters: {
        n_estimators: 100,
        max_depth: 10
      }
    },
    inference: {
      endpoint: '/predict',
      batchScoring: true,
      modelVersion: 'latest'
    }
  });

  // Create data pipeline backend
  const backend = defineBackend({
    // Pipeline components
    dataIngestion,
    streamProcessor,
    batchProcessor,
    mlPipeline,

    // Configuration for data workloads
    monitoring: {
      enabled: true,
      retentionDays: 30,
      customMetrics: ['throughput', 'latency', 'error_rate']
    },
    limits: {
      maxFunctionApps: 10,
      maxCosmosAccounts: 2
    }
  });

  return backend;
}

// ============================================================================
// Example 4: Multi-Tenant SaaS Application
// ============================================================================

/**
 * Multi-tenant SaaS backend with tenant isolation
 */
export function createSaaSBackend() {
  // Tenant management
  const tenantManager = TenantManager.define('TenantManager', {
    isolation: 'database', // database | container | row
    provisioning: 'dynamic',
    schema: {
      tenantId: 'string',
      name: 'string',
      tier: { type: 'string', enum: ['free', 'standard', 'premium'] },
      limits: {
        users: 'number',
        storage: 'number',
        apiCalls: 'number'
      }
    }
  });

  // Per-tenant APIs
  const tenantApi = MultiTenantApi.define('TenantApi', {
    baseEntity: 'Resource',
    tenantKey: 'tenantId',
    operations: ['create', 'read', 'update', 'delete', 'list'],
    authorization: {
      type: 'rbac',
      roles: ['owner', 'admin', 'user', 'viewer']
    },
    rateLimit: {
      free: { requests: 100, window: '1h' },
      standard: { requests: 1000, window: '1h' },
      premium: { requests: 10000, window: '1h' }
    }
  });

  // Admin portal
  const adminPortal = AdminPortal.define('AdminPortal', {
    authentication: 'azure-ad',
    features: [
      'tenant-management',
      'user-management',
      'billing',
      'analytics',
      'support'
    ],
    customization: {
      branding: true,
      domains: true,
      sso: true
    }
  });

  // Billing and metering
  const billing = BillingService.define('Billing', {
    provider: 'stripe',
    plans: [
      { id: 'free', price: 0 },
      { id: 'standard', price: 99 },
      { id: 'premium', price: 499 }
    ],
    metering: {
      metrics: ['api_calls', 'storage_gb', 'users'],
      reportingInterval: 'hourly'
    }
  });

  // Create SaaS backend
  const backend = defineBackend({
    tenantManager,
    tenantApi,
    adminPortal,
    billing,

    // SaaS-specific configuration
    monitoring: {
      enabled: true,
      perTenantMetrics: true
    },
    networking: {
      mode: 'hybrid',
      tenantIsolation: true
    },
    compliance: {
      standards: ['SOC2', 'ISO27001'],
      dataResidency: 'regional'
    }
  });

  return backend;
}

// ============================================================================
// Example 5: Progressive Enhancement
// ============================================================================

/**
 * Example showing how to progressively enhance a simple app
 */
export function progressiveEnhancementExample() {
  // Step 1: Start simple
  const basicBackend = defineBackend({
    userApi: CrudApi.define('UserApi', {
      entityName: 'User',
      schema: { id: 'string', name: 'string' }
    })
  });

  // Step 2: Add monitoring
  const withMonitoring = defineBackend({
    userApi: CrudApi.define('UserApi', {
      entityName: 'User',
      schema: { id: 'string', name: 'string' }
    }),

    monitoring: {
      enabled: true,
      retentionDays: 30
    }
  });

  // Step 3: Add more components
  const withMoreComponents = defineBackend({
    userApi: CrudApi.define('UserApi', {
      entityName: 'User',
      schema: { id: 'string', name: 'string' }
    }),

    productApi: CrudApi.define('ProductApi', {
      entityName: 'Product',
      schema: { id: 'string', name: 'string', price: 'number' }
    }),

    website: StaticSite.define('Website', {
      sourceDirectory: './web'
    }),

    monitoring: true
  });

  // Step 4: Add networking isolation
  const production = defineBackend({
    userApi: CrudApi.define('UserApi', {
      entityName: 'User',
      schema: { id: 'string', name: 'string' }
    }),

    productApi: CrudApi.define('ProductApi', {
      entityName: 'Product',
      schema: { id: 'string', name: 'string', price: 'number' }
    }),

    website: StaticSite.define('Website', {
      sourceDirectory: './web'
    }),

    monitoring: {
      enabled: true,
      retentionDays: 90
    },

    networking: 'isolated'
  });

  return { basicBackend, withMonitoring, withMoreComponents, production };
}

// ============================================================================
// Component Implementation Examples
// ============================================================================

/**
 * Example CrudApi component implementation with backend support
 */
class CrudApi implements IBackendComponent<CrudApiConfig> {
  readonly componentId: string;
  readonly componentType = 'CrudApi';
  readonly config: CrudApiConfig;

  private cosmosDb?: any;
  private functionApp?: any;

  private constructor(definition: IComponentDefinition<CrudApiConfig>) {
    this.componentId = definition.componentId;
    this.config = definition.config;
  }

  /**
   * Static factory method for defining a CrudApi
   */
  static define(id: string, config: CrudApiConfig): IComponentDefinition<CrudApiConfig> {
    return {
      componentId: id,
      componentType: 'CrudApi',
      config,
      factory: CrudApi.createInstance
    };
  }

  private static createInstance(
    scope: Construct,
    id: string,
    config: CrudApiConfig,
    resources: ResourceMap
  ): CrudApi {
    const instance = new CrudApi({ componentId: id, componentType: 'CrudApi', config, factory: CrudApi.createInstance });
    instance.initialize(resources, scope);
    return instance;
  }

  getRequirements(): ReadonlyArray<IResourceRequirement> {
    const { entityName, partitionKey } = this.config;
    const dbName = `${entityName.toLowerCase()}-db`;
    const containerName = entityName.toLowerCase();

    return [
      {
        resourceType: 'cosmos',
        requirementKey: 'shared-database',
        config: {
          enableServerless: true,
          databases: [{
            name: dbName,
            containers: [{
              name: containerName,
              partitionKey: partitionKey ?? '/id'
            }]
          }]
        },
        priority: 10
      },
      {
        resourceType: 'functions',
        requirementKey: 'api-functions',
        config: {
          runtime: 'node',
          version: '20',
          environmentVariables: {
            [`${entityName.toUpperCase()}_DB`]: dbName,
            [`${entityName.toUpperCase()}_CONTAINER`]: containerName
          }
        },
        priority: 10
      }
    ];
  }

  initialize(resources: ResourceMap, scope: Construct): void {
    // Get shared resources
    this.cosmosDb = resources.get('cosmos:shared-database');
    this.functionApp = resources.get('functions:api-functions');

    if (!this.cosmosDb || !this.functionApp) {
      throw new Error('Required resources not provided');
    }

    // Configure component-specific settings
    this.setupDatabase();
    this.deployFunctions();
  }

  validateResources(resources: ResourceMap): ValidationResult {
    const hasCosmosDb = resources.has('cosmos:shared-database');
    const hasFunctionApp = resources.has('functions:api-functions');

    return {
      valid: hasCosmosDb && hasFunctionApp,
      errors: [
        !hasCosmosDb && 'Missing Cosmos DB resource',
        !hasFunctionApp && 'Missing Function App resource'
      ].filter(Boolean) as string[]
    };
  }

  getOutputs(): ComponentOutputs {
    return {
      endpoint: `https://${this.functionApp.name}.azurewebsites.net/api/${this.config.entityName}`,
      database: this.cosmosDb.name,
      functionApp: this.functionApp.name
    };
  }

  private setupDatabase(): void {
    // Configure database and container
    console.log(`Setting up database for ${this.config.entityName}`);
  }

  private deployFunctions(): void {
    // Deploy CRUD functions
    console.log(`Deploying functions for ${this.config.entityName}`);
  }
}

// Supporting types
interface CrudApiConfig {
  entityName: string;
  schema: any;
  partitionKey?: string;
  enableOptimisticConcurrency?: boolean;
  enableSoftDelete?: boolean;
}

// ============================================================================
// Builder Pattern Example
// ============================================================================

/**
 * Example using the builder pattern for complex backends
 */
export function builderPatternExample() {
  const backend = defineBackend()
    .addComponent(CrudApi.define('UserApi', {
      entityName: 'User',
      schema: { id: 'string', name: 'string' }
    }))
    .addComponent(CrudApi.define('ProductApi', {
      entityName: 'Product',
      schema: { id: 'string', name: 'string', price: 'number' }
    }))
    .withMonitoring({
      enabled: true,
      retentionDays: 90
    })
    .withNetworking({
      mode: 'isolated',
      privateEndpoints: true
    })
    .withTags({
      Environment: 'Production',
      Team: 'Platform'
    })
    .build();

  return backend;
}

// ============================================================================
// Testing Example
// ============================================================================

/**
 * Example showing how to test backends and components
 */
export function testingExample() {
  // Mock resource map for testing
  const mockResources: ResourceMap = new Map([
    ['cosmos:shared-database', { name: 'mock-cosmos', endpoint: 'https://mock.cosmos.azure.com' }],
    ['functions:api-functions', { name: 'mock-functions', endpoint: 'https://mock.azurewebsites.net' }]
  ]);

  // Test component in isolation
  const userApi = new (class TestCrudApi implements IBackendComponent<CrudApiConfig> {
    componentId = 'test-user-api';
    componentType = 'CrudApi';
    config: CrudApiConfig = {
      entityName: 'User',
      schema: { id: 'string', name: 'string' }
    };

    getRequirements() {
      return [];
    }

    initialize(resources: ResourceMap, scope: Construct) {
      // Test initialization
    }

    validateResources(resources: ResourceMap) {
      return { valid: true };
    }

    getOutputs() {
      return { endpoint: 'https://test.api/users' };
    }
  })();

  // Validate component
  const validation = userApi.validateResources(mockResources);
  console.assert(validation.valid, 'Component validation failed');

  // Test backend
  const testBackend: IBackend = {
    backendId: 'test-backend',
    components: new Map([['userApi', userApi]]),
    resources: mockResources,
    config: { monitoring: true },

    addComponent(component: IComponentDefinition) {
      // Test add
    },

    initialize(scope: Construct) {
      // Test initialization
    },

    addToStack(stack: any) {
      // Test stack integration
    },

    getResource(type: string, key?: string) {
      return mockResources.get(`${type}:${key}`);
    },

    getComponent(id: string) {
      return this.components.get(id);
    },

    validate() {
      return { valid: true };
    }
  };

  return { userApi, testBackend };
}

// Type stubs for examples (these would be real implementations)
declare const StaticSite: any;
declare const Microservice: any;
declare const EventBus: any;
declare const DataIngestion: any;
declare const StreamProcessor: any;
declare const BatchProcessor: any;
declare const MLPipeline: any;
declare const TenantManager: any;
declare const MultiTenantApi: any;
declare const AdminPortal: any;
declare const BillingService: any;
declare function defineBackend(...args: any[]): any;