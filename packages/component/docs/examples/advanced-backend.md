# Advanced Backend Pattern Examples

Advanced examples demonstrating complex scenarios, custom providers, multi-environment setups, and production-ready patterns.

## Table of Contents

- [Example 1: Custom Resource Provider](#example-1-custom-resource-provider)
- [Example 2: Multi-Region Deployment](#example-2-multi-region-deployment)
- [Example 3: Network Isolation](#example-3-network-isolation)
- [Example 4: Builder Pattern API](#example-4-builder-pattern-api)
- [Example 5: Resource Limits and Quotas](#example-5-resource-limits-and-quotas)
- [Example 6: Blue-Green Deployment](#example-6-blue-green-deployment)
- [Example 7: Multi-Tenant Architecture](#example-7-multi-tenant-architecture)
- [Example 8: Disaster Recovery Setup](#example-8-disaster-recovery-setup)

---

## Example 1: Custom Resource Provider

Create a custom provider for Service Bus resources.

### Use Case

Your application needs Service Bus queues and topics, and you want them managed by the backend pattern.

### Implementation

```typescript
// custom-providers/service-bus-provider.ts
import {
  type IResourceProvider,
  type IResourceRequirement,
  type ProviderContext,
  type ValidationResult,
  BaseProvider
} from '@atakora/component/backend';
import { Construct } from '@atakora/cdk';
import {
  ServiceBusNamespace,
  ServiceBusQueue,
  ServiceBusTopic
} from '@cdktf/provider-azurerm/lib/servicebus';

export interface ServiceBusConfig {
  sku: 'Basic' | 'Standard' | 'Premium';
  queues?: Array<{ name: string; maxSize?: number }>;
  topics?: Array<{ name: string; maxSize?: number }>;
}

export class ServiceBusProvider extends BaseProvider implements IResourceProvider {
  public readonly providerId = 'servicebus-provider';
  public readonly supportedTypes = ['servicebus'];

  canProvide(requirement: IResourceRequirement): boolean {
    return requirement.resourceType === 'servicebus';
  }

  provideResource(
    requirement: IResourceRequirement,
    scope: Construct,
    context: ProviderContext
  ): ServiceBusNamespace {
    const config = requirement.config as ServiceBusConfig;

    // Create Service Bus namespace
    const namespace = new ServiceBusNamespace(scope, requirement.requirementKey, {
      name: context.naming.formatResourceName(
        'servicebus',
        context.backend.backendId,
        requirement.requirementKey
      ),
      resourceGroupName: scope.node.tryGetContext('resourceGroupName'),
      location: context.location,
      sku: config.sku || 'Standard',
      tags: context.tags
    });

    // Create queues
    config.queues?.forEach((queue, index) => {
      new ServiceBusQueue(scope, `${requirement.requirementKey}-queue-${index}`, {
        name: queue.name,
        namespaceId: namespace.id,
        maxSizeInMegabytes: queue.maxSize || 1024
      });
    });

    // Create topics
    config.topics?.forEach((topic, index) => {
      new ServiceBusTopic(scope, `${requirement.requirementKey}-topic-${index}`, {
        name: topic.name,
        namespaceId: namespace.id,
        maxSizeInMegabytes: topic.maxSize || 1024
      });
    });

    return namespace;
  }

  mergeRequirements(
    requirements: ReadonlyArray<IResourceRequirement>
  ): IResourceRequirement {
    // Merge multiple Service Bus requirements
    const allQueues: Array<{ name: string; maxSize?: number }> = [];
    const allTopics: Array<{ name: string; maxSize?: number }> = [];
    let highestSku: 'Basic' | 'Standard' | 'Premium' = 'Basic';

    const skuPriority = { Basic: 1, Standard: 2, Premium: 3 };

    for (const req of requirements) {
      const config = req.config as ServiceBusConfig;

      // Merge queues
      if (config.queues) {
        allQueues.push(...config.queues);
      }

      // Merge topics
      if (config.topics) {
        allTopics.push(...config.topics);
      }

      // Take highest SKU
      if (config.sku && skuPriority[config.sku] > skuPriority[highestSku]) {
        highestSku = config.sku;
      }
    }

    // Deduplicate queues and topics by name
    const uniqueQueues = Array.from(
      new Map(allQueues.map(q => [q.name, q])).values()
    );
    const uniqueTopics = Array.from(
      new Map(allTopics.map(t => [t.name, t])).values()
    );

    return {
      resourceType: 'servicebus',
      requirementKey: 'shared-servicebus',
      priority: Math.max(...requirements.map(r => r.priority || 10)),
      config: {
        sku: highestSku,
        queues: uniqueQueues,
        topics: uniqueTopics
      }
    };
  }

  validateMerged(requirement: IResourceRequirement): ValidationResult {
    const config = requirement.config as ServiceBusConfig;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate SKU limitations
    if (config.sku === 'Basic') {
      if (config.topics && config.topics.length > 0) {
        errors.push('Basic SKU does not support topics. Use Standard or Premium.');
      }
      if (config.queues && config.queues.length > 10) {
        warnings.push('Basic SKU limited to 10 queues. Consider Standard SKU.');
      }
    }

    // Validate naming
    const allNames = [
      ...(config.queues?.map(q => q.name) || []),
      ...(config.topics?.map(t => t.name) || [])
    ];

    const duplicates = allNames.filter((name, index) =>
      allNames.indexOf(name) !== index
    );

    if (duplicates.length > 0) {
      errors.push(`Duplicate queue/topic names: ${duplicates.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }
}

// Usage
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { FunctionsApp } from '@atakora/component/functions';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';
import { ServiceBusProvider } from './custom-providers/service-bus-provider';

const app = new App();

// Create custom component with Service Bus requirement
class EventDrivenComponent {
  static define(id: string, config: any) {
    return {
      componentId: id,
      componentType: 'EventDrivenComponent',
      config,
      factory: (scope, componentId, componentConfig, resources) => {
        return {
          componentId,
          componentType: 'EventDrivenComponent',
          config: componentConfig,
          getRequirements: () => [{
            resourceType: 'servicebus',
            requirementKey: `${componentId}-servicebus`,
            priority: 20,
            config: {
              sku: 'Standard',
              queues: [
                { name: 'orders-queue', maxSize: 2048 },
                { name: 'notifications-queue', maxSize: 1024 }
              ],
              topics: [
                { name: 'events-topic', maxSize: 2048 }
              ]
            }
          }],
          initialize: (resources, scope) => {
            // Initialize with Service Bus
          },
          validateResources: () => ({ valid: true }),
          getOutputs: () => ({})
        };
      }
    };
  }
}

const backend = defineBackend({
  orderProcessor: EventDrivenComponent.define('OrderProcessor', {}),
  notificationService: EventDrivenComponent.define('NotificationService', {})
}, {
  environment: 'production',
  location: 'eastus',
  // Register custom provider
  providers: [
    new ServiceBusProvider(),
    // Default providers still included
  ]
});

const stack = new ResourceGroupStack(app, 'EventDrivenStack', {
  resourceGroupName: 'rg-eventdriven-prod',
  location: 'eastus'
});

backend.addToStack(stack);

app.synth();
```

### Key Concepts

1. **Custom Provider**: Extends `BaseProvider` or implements `IResourceProvider`
2. **Merge Logic**: Intelligently combines requirements from multiple components
3. **Validation**: Ensures merged configuration is valid
4. **Registration**: Add provider to backend config

---

## Example 2: Multi-Region Deployment

Deploy the same application to multiple Azure regions for global availability.

### Use Case

Your application needs to serve users globally with low latency.

### Implementation

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { StaticSiteWithCdn } from '@atakora/component/web';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

const app = new App();

// Define regions
const regions = [
  { name: 'eastus', displayName: 'US East' },
  { name: 'westeurope', displayName: 'West Europe' },
  { name: 'southeastasia', displayName: 'Southeast Asia' }
];

// Create backend for each region
const backends = regions.map(region => {
  const backend = defineBackend({
    // API components
    userApi: CrudApi.define('UserApi', {
      entityName: 'User',
      schema: {
        id: 'string',
        email: 'string',
        name: 'string',
        region: 'string'
      },
      partitionKey: '/region' // Partition by region for geo-distribution
    }),

    productApi: CrudApi.define('ProductApi', {
      entityName: 'Product',
      schema: {
        id: 'string',
        name: 'string',
        price: 'number',
        region: 'string'
      },
      partitionKey: '/region'
    })
  }, {
    environment: 'production',
    location: region.name,
    monitoring: {
      enabled: true,
      retentionDays: 90,
      workspaceName: `myapp-workspace-${region.name}`
    },
    tags: {
      region: region.name,
      regionDisplay: region.displayName,
      multiRegion: 'true',
      project: 'global-app'
    }
  });

  // Create regional stack
  const stack = new ResourceGroupStack(app, `GlobalStack-${region.name}`, {
    resourceGroupName: `rg-global-${region.name}`,
    location: region.name
  });

  backend.addToStack(stack);

  return {
    region: region.name,
    backend,
    endpoints: {
      userApi: backend.components.userApi.apiEndpoint,
      productApi: backend.components.productApi.apiEndpoint
    }
  };
});

// Create global CDN frontend that routes to regional backends
const globalFrontend = defineBackend({
  website: StaticSiteWithCdn.define('GlobalWebsite', {
    indexDocument: 'index.html',
    enableSpaMode: true,
    customDomain: 'app.example.com',
    dnsZoneName: 'example.com',
    // CDN configuration for global distribution
    enableCompression: true,
    cacheMaxAge: 3600,
    cors: {
      allowedOrigins: ['*']
    }
  })
}, {
  environment: 'production',
  location: 'eastus', // Primary region for frontend
  tags: {
    tier: 'frontend',
    multiRegion: 'true'
  }
});

const frontendStack = new ResourceGroupStack(app, 'GlobalFrontendStack', {
  resourceGroupName: 'rg-global-frontend',
  location: 'eastus'
});

globalFrontend.addToStack(frontendStack);

// Output all regional endpoints
console.log('\n=== Multi-Region Deployment ===');
backends.forEach(({ region, endpoints }) => {
  console.log(`\n${region.toUpperCase()}:`);
  console.log('  User API:', endpoints.userApi);
  console.log('  Product API:', endpoints.productApi);
});

console.log('\nGlobal Frontend:', globalFrontend.components.website.cdnEndpoint);

// Generate routing configuration for frontend
const routingConfig = {
  regions: backends.map(({ region, endpoints }) => ({
    region,
    endpoints
  })),
  routingStrategy: 'geo-proximity' // Route to nearest region
};

console.log('\nRouting Configuration:', JSON.stringify(routingConfig, null, 2));

app.synth();
```

### Architecture

```
                     ┌──────────────────┐
                     │  Azure Traffic   │
                     │     Manager      │
                     └────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │ US East  │    │  Europe  │    │   Asia   │
       └────┬─────┘    └────┬─────┘    └────┬─────┘
            │               │               │
    ┌───────┴────┐   ┌──────┴─────┐  ┌──────┴─────┐
    │  Backend   │   │  Backend   │  │  Backend   │
    │ (Shared)   │   │ (Shared)   │  │ (Shared)   │
    └────────────┘   └────────────┘  └────────────┘
```

### Benefits

- Low latency for global users
- High availability (failover between regions)
- Data residency compliance
- Independent scaling per region

---

## Example 3: Network Isolation

Deploy backend with full network isolation using VNet integration and private endpoints.

### Use Case

Security requirements mandate no public internet access to data resources.

### Implementation

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';
import {
  VirtualNetwork,
  Subnet,
  NetworkSecurityGroup,
  NetworkSecurityRule
} from '@cdktf/provider-azurerm/lib/network';

const app = new App();

// Create network infrastructure first
const stack = new ResourceGroupStack(app, 'SecureStack', {
  resourceGroupName: 'rg-secure-prod',
  location: 'eastus'
});

// Create VNet
const vnet = new VirtualNetwork(stack, 'vnet', {
  name: 'vnet-secure-prod',
  resourceGroupName: 'rg-secure-prod',
  location: 'eastus',
  addressSpace: ['10.0.0.0/16']
});

// Create subnet for backend services
const backendSubnet = new Subnet(stack, 'backend-subnet', {
  name: 'backend-subnet',
  resourceGroupName: 'rg-secure-prod',
  virtualNetworkName: vnet.name,
  addressPrefixes: ['10.0.1.0/24'],
  serviceEndpoints: [
    'Microsoft.AzureCosmosDB',
    'Microsoft.Storage',
    'Microsoft.Web'
  ],
  delegation: [{
    name: 'app-service-delegation',
    serviceDelegation: {
      name: 'Microsoft.Web/serverFarms',
      actions: ['Microsoft.Network/virtualNetworks/subnets/action']
    }
  }]
});

// Create private endpoint subnet
const privateEndpointSubnet = new Subnet(stack, 'private-endpoint-subnet', {
  name: 'private-endpoint-subnet',
  resourceGroupName: 'rg-secure-prod',
  virtualNetworkName: vnet.name,
  addressPrefixes: ['10.0.2.0/24'],
  privateEndpointNetworkPoliciesEnabled: false
});

// Create NSG with strict rules
const nsg = new NetworkSecurityGroup(stack, 'backend-nsg', {
  name: 'nsg-backend-prod',
  resourceGroupName: 'rg-secure-prod',
  location: 'eastus'
});

// Allow only internal traffic
new NetworkSecurityRule(stack, 'allow-internal', {
  name: 'allow-internal',
  networkSecurityGroupName: nsg.name,
  resourceGroupName: 'rg-secure-prod',
  priority: 100,
  direction: 'Inbound',
  access: 'Allow',
  protocol: 'Tcp',
  sourcePortRange: '*',
  destinationPortRange: '443',
  sourceAddressPrefix: 'VirtualNetwork',
  destinationAddressPrefix: 'VirtualNetwork'
});

new NetworkSecurityRule(stack, 'deny-internet', {
  name: 'deny-internet',
  networkSecurityGroupName: nsg.name,
  resourceGroupName: 'rg-secure-prod',
  priority: 200,
  direction: 'Inbound',
  access: 'Deny',
  protocol: '*',
  sourcePortRange: '*',
  destinationPortRange: '*',
  sourceAddressPrefix: 'Internet',
  destinationAddressPrefix: '*'
});

// Create backend with network isolation
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: {
      id: 'string',
      email: 'string',
      name: 'string',
      sensitiveData: 'string'
    },
    partitionKey: '/id'
  }),

  auditApi: CrudApi.define('AuditApi', {
    entityName: 'AuditLog',
    schema: {
      id: 'string',
      action: 'string',
      userId: 'string',
      timestamp: 'timestamp',
      ipAddress: 'string'
    },
    partitionKey: '/userId'
  })
}, {
  environment: 'production',
  location: 'eastus',

  // Full network isolation
  networking: {
    mode: 'isolated',
    vnetName: vnet.name,
    subnetName: backendSubnet.name,
    privateEndpoints: true,
    serviceTags: [
      'AzureCosmosDB',
      'Storage',
      'AzureFunctions'
    ]
  },

  // Monitoring (still works with network isolation)
  monitoring: {
    enabled: true,
    retentionDays: 180 // Longer retention for audit logs
  },

  tags: {
    security: 'high',
    compliance: 'pci-dss',
    dataClassification: 'confidential',
    networkIsolation: 'full'
  }
});

backend.addToStack(stack);

// Cosmos DB will be configured with:
// - Public network access: Disabled
// - Private endpoint in private-endpoint-subnet
// - Firewall rules allowing only VNet

// Function App will be configured with:
// - VNet integration into backend-subnet
// - Only accessible from within VNet
// - Outbound traffic through VNet

console.log('\n=== Secure Network Configuration ===');
console.log('VNet:', vnet.name);
console.log('Backend Subnet:', backendSubnet.name);
console.log('Private Endpoint Subnet:', privateEndpointSubnet.name);
console.log('Network Security Group:', nsg.name);
console.log('\nAll resources isolated from public internet');

app.synth();
```

### Security Features

- No public internet access to Cosmos DB
- Function Apps only accessible within VNet
- Private endpoints for all data services
- Network Security Groups with strict rules
- Service endpoints for performance
- Traffic stays within Azure backbone

---

## Example 4: Builder Pattern API

Use the fluent builder API for progressive backend construction.

### Use Case

You're building a backend dynamically based on configuration or want a more fluent API.

### Implementation

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { FunctionsApp } from '@atakora/component/functions';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

const app = new App();

// Load configuration (could be from file, env vars, etc.)
const config = {
  environment: process.env.DEPLOY_ENV || 'production',
  features: {
    userManagement: true,
    productCatalog: true,
    orderProcessing: true,
    analytics: true
  },
  monitoring: {
    enabled: true,
    retentionDays: 90
  },
  networking: {
    isolated: true,
    vnetName: 'myapp-vnet'
  }
};

// Start with builder
let backendBuilder = defineBackend({
  environment: config.environment,
  location: 'eastus'
});

// Conditionally add components based on config
if (config.features.userManagement) {
  backendBuilder = backendBuilder.addComponent(
    CrudApi.define('UserApi', {
      entityName: 'User',
      schema: { id: 'string', name: 'string', email: 'string' },
      partitionKey: '/id'
    })
  );
}

if (config.features.productCatalog) {
  backendBuilder = backendBuilder.addComponent(
    CrudApi.define('ProductApi', {
      entityName: 'Product',
      schema: { id: 'string', name: 'string', price: 'number' },
      partitionKey: '/id'
    })
  );
}

if (config.features.orderProcessing) {
  backendBuilder = backendBuilder
    .addComponent(
      CrudApi.define('OrderApi', {
        entityName: 'Order',
        schema: { id: 'string', userId: 'string', total: 'number' },
        partitionKey: '/userId'
      })
    )
    .addComponent(
      FunctionsApp.define('OrderProcessor', {
        runtime: 'node',
        version: '20',
        functions: {
          'process-order': {
            trigger: 'queue',
            queueName: 'orders'
          }
        }
      })
    );
}

if (config.features.analytics) {
  backendBuilder = backendBuilder.addComponent(
    FunctionsApp.define('AnalyticsProcessor', {
      runtime: 'node',
      version: '20',
      functions: {
        'aggregate-metrics': {
          trigger: 'timer',
          schedule: '0 0 * * * *' // Hourly
        }
      }
    })
  );
}

// Configure monitoring
if (config.monitoring.enabled) {
  backendBuilder = backendBuilder.withMonitoring({
    enabled: true,
    retentionDays: config.monitoring.retentionDays,
    samplingPercentage: config.environment === 'production' ? 100 : 10
  });
}

// Configure networking
if (config.networking.isolated) {
  backendBuilder = backendBuilder.withNetworking({
    mode: 'isolated',
    vnetName: config.networking.vnetName,
    subnetName: 'backend-subnet',
    privateEndpoints: true
  });
}

// Add tags
backendBuilder = backendBuilder.withTags({
  environment: config.environment,
  project: 'myapp',
  managedBy: 'atakora',
  configDriven: 'true'
});

// Build the backend
const backend = backendBuilder.build();

// Create stack and add backend
const stack = new ResourceGroupStack(app, 'ConfigDrivenStack', {
  resourceGroupName: `rg-myapp-${config.environment}`,
  location: 'eastus'
});

backend.addToStack(stack);

// Log enabled features
console.log('\n=== Enabled Features ===');
Object.entries(config.features)
  .filter(([_, enabled]) => enabled)
  .forEach(([feature]) => console.log(`  - ${feature}`));

app.synth();
```

### Builder Benefits

- Fluent, chainable API
- Dynamic component addition
- Conditional feature flags
- Progressive configuration
- Clear, readable code flow

---

## Example 5: Resource Limits and Quotas

Prevent exceeding Azure quotas and manage resource limits.

### Use Case

You need to ensure the backend doesn't create more resources than your Azure subscription allows.

### Implementation

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

const app = new App();

// Define strict resource limits
const backend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: { id: 'string', name: 'string' },
    partitionKey: '/id'
  }),

  productApi: CrudApi.define('ProductApi', {
    entityName: 'Product',
    schema: { id: 'string', name: 'string' },
    partitionKey: '/id'
  }),

  orderApi: CrudApi.define('OrderApi', {
    entityName: 'Order',
    schema: { id: 'string', userId: 'string' },
    partitionKey: '/userId'
  })
}, {
  environment: 'production',
  location: 'eastus',

  // Configure resource limits
  limits: {
    // Maximum Cosmos DB accounts (default: unlimited)
    maxCosmosAccounts: 1,

    // Maximum Function Apps (default: unlimited)
    maxFunctionApps: 1,

    // Maximum Storage Accounts (default: unlimited)
    maxStorageAccounts: 2,

    // Maximum functions per Function App (default: unlimited)
    maxFunctionsPerApp: 50,

    // Maximum containers per Storage Account (default: unlimited)
    maxContainersPerStorage: 10
  },

  tags: {
    resourceLimits: 'enforced',
    quotaManagement: 'enabled'
  }
});

const stack = new ResourceGroupStack(app, 'LimitedResourceStack', {
  resourceGroupName: 'rg-limited-prod',
  location: 'eastus'
});

// This will succeed - stays within limits
try {
  backend.addToStack(stack);
  console.log('✓ Backend deployed within resource limits');
} catch (error) {
  console.error('✗ Resource limit exceeded:', error.message);
  // Handle limit exceeded error
  // Options:
  // 1. Increase limits in config
  // 2. Split into multiple backends
  // 3. Request quota increase from Azure
}

// Validate limits before deployment
const validation = backend.validate();
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  process.exit(1);
}

if (validation.warnings && validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
}

console.log('\n=== Resource Usage ===');
console.log('Cosmos DB Accounts: 1 / 1');
console.log('Function Apps: 1 / 1');
console.log('Storage Accounts: 1 / 2');
console.log('Functions: 15 / 50');
console.log('Containers: 3 / 10');

app.synth();
```

### Limit Enforcement

When limits are exceeded, you'll get a clear error:

```
Error: ResourceLimitError: Maximum Cosmos DB accounts exceeded
  Limit: 1
  Requested: 2
  Solution: Either:
    1. Increase maxCosmosAccounts in backend config
    2. Split components across multiple backends
    3. Request Azure quota increase
```

---

## Example 6: Blue-Green Deployment

Zero-downtime deployment strategy using blue-green pattern.

### Use Case

Deploy new version without downtime, with ability to instantly rollback.

### Implementation

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';
import { TrafficManagerProfile, TrafficManagerEndpoint } from '@cdktf/provider-azurerm/lib/trafficmanager';

const app = new App();

// Current deployment color (toggle between 'blue' and 'green')
const activeColor = process.env.DEPLOY_COLOR || 'blue';
const inactiveColor = activeColor === 'blue' ? 'green' : 'blue';

// Define backend for BOTH colors
const colors = ['blue', 'green'];
const deployments = colors.map(color => {
  const backend = defineBackend({
    userApi: CrudApi.define('UserApi', {
      entityName: 'User',
      schema: { id: 'string', name: 'string', email: 'string' },
      partitionKey: '/id'
    }),

    productApi: CrudApi.define('ProductApi', {
      entityName: 'Product',
      schema: { id: 'string', name: 'string', price: 'number' },
      partitionKey: '/id'
    })
  }, {
    environment: 'production',
    location: 'eastus',
    tags: {
      deployment: color,
      active: color === activeColor ? 'true' : 'false',
      version: process.env.VERSION || '1.0.0'
    }
  });

  const stack = new ResourceGroupStack(app, `AppStack-${color}`, {
    resourceGroupName: `rg-app-${color}-prod`,
    location: 'eastus'
  });

  backend.addToStack(stack);

  return {
    color,
    backend,
    endpoints: {
      userApi: backend.components.userApi.apiEndpoint,
      productApi: backend.components.productApi.apiEndpoint
    }
  };
});

// Create Traffic Manager for routing
const stack = new ResourceGroupStack(app, 'TrafficManagerStack', {
  resourceGroupName: 'rg-app-routing',
  location: 'global' // Traffic Manager is global
});

const trafficManager = new TrafficManagerProfile(stack, 'traffic-manager', {
  name: 'tm-myapp-prod',
  resourceGroupName: 'rg-app-routing',
  trafficRoutingMethod: 'Weighted', // Can switch between blue/green
  dnsConfig: {
    relativeName: 'myapp-prod',
    ttl: 30 // Low TTL for fast switching
  },
  monitorConfig: {
    protocol: 'HTTPS',
    port: 443,
    path: '/health',
    intervalInSeconds: 30,
    timeoutInSeconds: 10,
    toleratedNumberOfFailures: 3
  }
});

// Add endpoints for both colors
deployments.forEach(({ color, endpoints }) => {
  const weight = color === activeColor ? 100 : 0; // Route all traffic to active

  new TrafficManagerEndpoint(stack, `endpoint-${color}`, {
    name: `endpoint-${color}`,
    profileId: trafficManager.id,
    type: 'azureEndpoints',
    target: endpoints.userApi, // Use userApi as example
    weight,
    priority: color === 'blue' ? 1 : 2
  });
});

console.log('\n=== Blue-Green Deployment ===');
console.log(`Active Color: ${activeColor}`);
console.log(`Inactive Color: ${inactiveColor}`);

deployments.forEach(({ color, endpoints }) => {
  console.log(`\n${color.toUpperCase()} Deployment:`);
  console.log('  Status:', color === activeColor ? 'ACTIVE (100% traffic)' : 'STANDBY (0% traffic)');
  console.log('  User API:', endpoints.userApi);
  console.log('  Product API:', endpoints.productApi);
});

console.log('\nTraffic Manager:', trafficManager.fqdn);

console.log('\n=== Deployment Commands ===');
console.log('Deploy to inactive (green):');
console.log('  DEPLOY_COLOR=green npx atakora deploy');
console.log('\nSwitch traffic to green:');
console.log('  # Update Traffic Manager weights');
console.log('  # Blue: 0%, Green: 100%');
console.log('\nRollback to blue:');
console.log('  # Update Traffic Manager weights');
console.log('  # Blue: 100%, Green: 0%');

app.synth();
```

### Deployment Workflow

```bash
# Step 1: Deploy new version to inactive color (green)
DEPLOY_COLOR=green VERSION=2.0.0 npx atakora deploy

# Step 2: Test green deployment
curl https://myapp-prod-green.azurewebsites.net/health

# Step 3: Gradually shift traffic to green
# Update Traffic Manager: Blue 90%, Green 10%
# Monitor for 30 minutes
# Update Traffic Manager: Blue 50%, Green 50%
# Monitor for 30 minutes
# Update Traffic Manager: Blue 0%, Green 100%

# Step 4: If issues occur, instant rollback
# Update Traffic Manager: Blue 100%, Green 0%
# Zero downtime rollback!

# Step 5: After validation, green becomes the new active
# Next deployment goes to blue
```

### Benefits

- Zero downtime deployments
- Instant rollback capability
- Gradual traffic shifting
- Independent testing of new version
- Production validation before full cutover

---

## Example 7: Multi-Tenant Architecture

Single backend serving multiple tenants with data isolation.

### Use Case

SaaS application where each customer (tenant) needs isolated data but shares infrastructure.

### Implementation

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

const app = new App();

// Define tenants (could be loaded from database)
const tenants = [
  { id: 'tenant-acme', name: 'Acme Corp', tier: 'enterprise' },
  { id: 'tenant-globex', name: 'Globex Inc', tier: 'professional' },
  { id: 'tenant-initech', name: 'Initech LLC', tier: 'basic' }
];

// Create backend with tenant-aware components
const backend = defineBackend({
  // Shared authentication API
  authApi: CrudApi.define('AuthApi', {
    entityName: 'User',
    schema: {
      id: 'string',
      tenantId: 'string',
      email: 'string',
      role: 'string',
      permissions: 'array'
    },
    partitionKey: '/tenantId' // Partition by tenant for isolation
  }),

  // Shared data API with tenant isolation
  dataApi: CrudApi.define('DataApi', {
    entityName: 'Data',
    schema: {
      id: 'string',
      tenantId: 'string',
      name: 'string',
      value: 'string',
      createdAt: 'timestamp'
    },
    partitionKey: '/tenantId' // Critical: Ensures data isolation
  }),

  // Tenant management API
  tenantApi: CrudApi.define('TenantApi', {
    entityName: 'Tenant',
    schema: {
      id: 'string',
      name: 'string',
      tier: 'string',
      status: 'string',
      limits: 'object',
      createdAt: 'timestamp'
    },
    partitionKey: '/id'
  })
}, {
  environment: 'production',
  location: 'eastus',

  // Monitoring with tenant context
  monitoring: {
    enabled: true,
    retentionDays: 90
  },

  tags: {
    architecture: 'multi-tenant',
    isolation: 'logical', // Logical isolation via partition keys
    tenantCount: tenants.length.toString()
  }
});

const stack = new ResourceGroupStack(app, 'MultiTenantStack', {
  resourceGroupName: 'rg-saas-prod',
  location: 'eastus'
});

backend.addToStack(stack);

// Pre-populate tenant data
console.log('\n=== Multi-Tenant SaaS Architecture ===');
console.log(`Total Tenants: ${tenants.length}`);

tenants.forEach(tenant => {
  console.log(`\n${tenant.name}:`);
  console.log(`  ID: ${tenant.id}`);
  console.log(`  Tier: ${tenant.tier}`);
  console.log(`  Auth Endpoint: ${backend.components.authApi.apiEndpoint}?tenantId=${tenant.id}`);
  console.log(`  Data Endpoint: ${backend.components.dataApi.apiEndpoint}?tenantId=${tenant.id}`);
});

console.log('\n=== Data Isolation Strategy ===');
console.log('Method: Partition Key Isolation');
console.log('Partition Key: /tenantId');
console.log('Security: Row-level security via partition key');
console.log('Performance: Optimized queries within tenant partition');

// Example API implementation with tenant isolation
console.log('\n=== Example API Usage ===');
console.log(`
// All API calls must include tenant context
POST ${backend.components.dataApi.apiEndpoint}/data
Headers:
  x-tenant-id: tenant-acme
  Authorization: Bearer <token>
Body:
  {
    "name": "document",
    "value": "content",
    "tenantId": "tenant-acme"  // Must match header
  }

// Backend validates tenant isolation
// - Token must belong to tenant-acme
// - Request body tenantId must match header
// - Query will only access tenant-acme partition
`);

app.synth();
```

### Tenant Isolation Strategies

#### 1. Partition Key Isolation (Used Above)

Pros:
- Cost-effective (shared infrastructure)
- Good performance
- Simple to implement

Cons:
- Logical isolation only
- All tenants share throughput
- Risk of noisy neighbor

#### 2. Database-Level Isolation

```typescript
// Create separate database per tenant
tenants.map(tenant =>
  CrudApi.define(`DataApi-${tenant.id}`, {
    entityName: 'Data',
    schema: { /*...*/ },
    partitionKey: '/id', // No need for tenantId
    databaseName: `db-${tenant.id}` // Separate database
  })
);
```

Pros:
- Strong isolation
- Independent throughput
- Easier compliance

Cons:
- Higher cost
- More resources to manage

#### 3. Account-Level Isolation (Maximum Security)

```typescript
// Separate backend per tenant (or group of tenants)
tenants.map(tenant =>
  defineBackend({
    dataApi: CrudApi.define('DataApi', { /*...*/ })
  }, {
    environment: `tenant-${tenant.id}`,
    tags: { tenantId: tenant.id }
  })
);
```

Pros:
- Complete isolation
- Independent resources
- Regulatory compliance

Cons:
- Highest cost
- Most complex to manage
- Scales linearly

---

## Example 8: Disaster Recovery Setup

Implement disaster recovery with automated failover.

### Use Case

Business-critical application requiring <1 hour RTO and <15 minutes RPO.

### Implementation

```typescript
import { defineBackend } from '@atakora/component/backend';
import { CrudApi } from '@atakora/component/crud';
import { ResourceGroupStack } from '@atakora/cdk';
import { App } from '@cdktf/core';

const app = new App();

// Primary region
const primaryRegion = 'eastus';
const drRegion = 'westus2';

// PRIMARY DEPLOYMENT
const primaryBackend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: {
      id: 'string',
      email: 'string',
      name: 'string',
      lastModified: 'timestamp'
    },
    partitionKey: '/id'
  }),

  transactionApi: CrudApi.define('TransactionApi', {
    entityName: 'Transaction',
    schema: {
      id: 'string',
      userId: 'string',
      amount: 'number',
      timestamp: 'timestamp'
    },
    partitionKey: '/userId'
  })
}, {
  environment: 'production',
  location: primaryRegion,

  // Enable geo-replication for Cosmos DB
  cosmosConfig: {
    enableMultiRegion: true,
    failoverPolicies: [
      { locationName: primaryRegion, priority: 0 },
      { locationName: drRegion, priority: 1 }
    ],
    consistencyLevel: 'Session', // Balance between consistency and availability
    enableAutomaticFailover: true
  },

  monitoring: {
    enabled: true,
    retentionDays: 180, // Longer retention for DR scenarios
    workspaceName: 'dr-workspace-primary'
  },

  tags: {
    role: 'primary',
    dr: 'enabled',
    rto: '1-hour',
    rpo: '15-minutes'
  }
});

const primaryStack = new ResourceGroupStack(app, 'PrimaryStack', {
  resourceGroupName: 'rg-app-primary',
  location: primaryRegion
});

primaryBackend.addToStack(primaryStack);

// DR DEPLOYMENT (Standby)
const drBackend = defineBackend({
  userApi: CrudApi.define('UserApi', {
    entityName: 'User',
    schema: {
      id: 'string',
      email: 'string',
      name: 'string',
      lastModified: 'timestamp'
    },
    partitionKey: '/id'
  }),

  transactionApi: CrudApi.define('TransactionApi', {
    entityName: 'Transaction',
    schema: {
      id: 'string',
      userId: 'string',
      amount: 'number',
      timestamp: 'timestamp'
    },
    partitionKey: '/userId'
  })
}, {
  environment: 'production-dr',
  location: drRegion,

  // Point to replicated Cosmos DB
  cosmosConfig: {
    useExisting: true, // Use replicated data from primary
    accountName: 'cosmos-app-primary', // Same Cosmos account
    readLocation: drRegion // Read from DR region
  },

  monitoring: {
    enabled: true,
    retentionDays: 180,
    workspaceName: 'dr-workspace-secondary'
  },

  tags: {
    role: 'dr',
    dr: 'enabled',
    status: 'standby'
  }
});

const drStack = new ResourceGroupStack(app, 'DRStack', {
  resourceGroupName: 'rg-app-dr',
  location: drRegion
});

drBackend.addToStack(drStack);

console.log('\n=== Disaster Recovery Setup ===');
console.log(`Primary Region: ${primaryRegion}`);
console.log(`DR Region: ${drRegion}`);
console.log('\nPrimary Endpoints:');
console.log(`  User API: ${primaryBackend.components.userApi.apiEndpoint}`);
console.log(`  Transaction API: ${primaryBackend.components.transactionApi.apiEndpoint}`);
console.log('\nDR Endpoints (Standby):');
console.log(`  User API: ${drBackend.components.userApi.apiEndpoint}`);
console.log(`  Transaction API: ${drBackend.components.transactionApi.apiEndpoint}`);

console.log('\n=== Failover Procedure ===');
console.log('1. Detect primary region failure');
console.log('2. Cosmos DB auto-fails over to westus2');
console.log('3. Update Traffic Manager to route to DR');
console.log('4. DR backend becomes active');
console.log('5. RPO: <15 minutes (geo-replication lag)');
console.log('6. RTO: <1 hour (failover + DNS propagation)');

console.log('\n=== Testing DR ===');
console.log('1. Scheduled DR drill: monthly');
console.log('2. Synthetic monitoring of DR endpoints');
console.log('3. Automated failover testing');
console.log('4. Data consistency validation');

app.synth();
```

### DR Testing Schedule

```typescript
// Automated DR testing
const drTests = {
  daily: {
    name: 'Health Check',
    description: 'Verify DR resources are healthy',
    duration: '5 minutes'
  },

  weekly: {
    name: 'Read-Only Test',
    description: 'Execute read queries against DR',
    duration: '30 minutes'
  },

  monthly: {
    name: 'Full Failover Drill',
    description: 'Complete failover and failback',
    duration: '4 hours'
  },

  quarterly: {
    name: 'Data Consistency Audit',
    description: 'Verify primary and DR data match',
    duration: '8 hours'
  }
};
```

---

## Next Steps

After reviewing these advanced examples:

1. **Start Small**: Begin with simpler patterns, add complexity as needed
2. **Monitor Closely**: Use Application Insights to track resource usage and performance
3. **Iterate**: Refine your architecture based on real-world usage
4. **Document**: Keep your infrastructure documentation up-to-date
5. **Test DR**: Regularly test disaster recovery procedures

## Additional Resources

- [Backend Pattern Overview](../backend-pattern.md)
- [API Reference](../backend-api-reference.md)
- [Basic Examples](./basic-backend.md)
- [Migration Guide](../migration-guide.md)
- [Best Practices](../best-practices.md)
- [Troubleshooting](../troubleshooting.md)
- [Architecture Documentation](../../../../docs/architecture/decisions/backend-architecture-design.md)
