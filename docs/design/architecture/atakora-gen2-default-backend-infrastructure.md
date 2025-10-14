# Atakora Gen 2 - Default Backend Infrastructure

**Extension to**: atakora-gen2-design.md
**Created**: 2025-10-14
**Status**: Design Phase

## Overview

This document defines the default infrastructure that should be provisioned automatically when you run `defineBackend()`. The goal is to provide production-ready defaults while allowing customization for specific needs.

## Philosophy

**Secure by Default, Flexible by Design**

Every backend should include:
1. **Core compute and storage** - Function App, Storage
2. **Observability** - Logging and monitoring
3. **Security** - Secrets management, identity, encryption
4. **Data** - Database with proper configuration
5. **Async Processing** - Queues for background tasks

## Default Infrastructure Components

### Essential (Always Provisioned)

#### 1. Function App + App Service Plan

```typescript
const functionApp = new FunctionApp(stack, 'functions', {
  runtime: 'node:20',
  plan: {
    sku: environment === 'prod' ? 'EP1' : 'Y1',  // Premium in prod, Consumption in dev
    tier: environment === 'prod' ? 'ElasticPremium' : 'Dynamic',
  },
  settings: {
    FUNCTIONS_WORKER_RUNTIME: 'node',
    WEBSITE_NODE_DEFAULT_VERSION: '~20',
    WEBSITE_RUN_FROM_PACKAGE: '1',
  },
});
```

**Why?**
- Functions are the core compute model for serverless backends
- Premium plan (EP1) in production for VNet integration and always-on
- Consumption plan (Y1) in dev for cost savings

#### 2. Storage Account (Multi-Purpose)

```typescript
const storage = new StorageAccount(stack, 'storage', {
  sku: { name: 'Standard_LRS' },
  kind: 'StorageV2',
  accessTier: 'Hot',

  // Function code storage
  blobServices: {
    containers: [
      { name: 'function-packages', publicAccess: 'None' },
      { name: 'uploads', publicAccess: 'None' },
      { name: 'assets', publicAccess: 'Blob' },  // Public for CDN
    ],
  },

  // Queue for async processing
  queueServices: {
    queues: [
      { name: 'tasks' },
      { name: 'notifications' },
      { name: 'deadletter' },
    ],
  },

  // Table for lightweight data
  tableServices: {
    tables: [
      { name: 'logs' },
      { name: 'sessions' },
    ],
  },
});
```

**Why?**
- Functions need storage for code packages
- Blob containers for file uploads and assets
- Queues for async task processing
- Tables for lightweight structured data

#### 3. Application Insights + Log Analytics

```typescript
const logAnalytics = new OperationalInsightsWorkspace(stack, 'logs', {
  sku: { name: 'PerGB2018' },
  retentionInDays: environment === 'prod' ? 90 : 30,
  features: {
    enableLogAccessUsingOnlyResourcePermissions: true,
  },
});

const appInsights = new ApplicationInsights(stack, 'insights', {
  applicationType: 'web',
  workspaceResourceId: logAnalytics.id,
  samplingPercentage: environment === 'prod' ? 100 : 20,
  retentionInDays: environment === 'prod' ? 90 : 30,
});

// Connect Function App to Application Insights
functionApp.settings.APPLICATIONINSIGHTS_CONNECTION_STRING = appInsights.connectionString;
```

**Why?**
- Application Insights for distributed tracing, metrics, and errors
- Log Analytics for centralized log aggregation
- Essential for troubleshooting production issues
- Query across all services with KQL

#### 4. Cosmos DB (NoSQL Database)

```typescript
const cosmosAccount = new DatabaseAccount(stack, 'cosmos', {
  databaseAccountOfferType: 'Standard',
  locations: [
    { locationName: geography, failoverPriority: 0 },
  ],
  consistencyPolicy: {
    defaultConsistencyLevel: 'Session',
  },
  capabilities: [
    { name: 'EnableServerless' },  // Serverless in dev
  ],
  enableAutomaticFailover: environment === 'prod',
  enableMultipleWriteLocations: environment === 'prod',
  backupPolicy: {
    type: 'Continuous',  // Point-in-time restore
    continuousModeProperties: {
      tier: 'Continuous7Days',
    },
  },
});

const database = new SqlDatabase(cosmosAccount, 'db', {
  name: `${project}-db`,
  options: {
    autoscaleSettings: environment === 'prod' ? {
      maxThroughput: 4000,
    } : undefined,
  },
});
```

**Why?**
- NoSQL database for flexible schema
- Serverless mode in dev for cost efficiency
- Autoscale in production
- Continuous backup for disaster recovery
- Global distribution ready

#### 5. Key Vault (Secrets Management)

```typescript
const keyVault = new Vault(stack, 'vault', {
  sku: { name: 'standard', family: 'A' },
  tenantId: azure.tenantId,

  enableRbacAuthorization: true,
  enableSoftDelete: true,
  softDeleteRetentionInDays: 90,
  enablePurgeProtection: environment === 'prod',

  networkAcls: {
    defaultAction: 'Deny',
    bypass: 'AzureServices',
    virtualNetworkRules: [
      { id: vnet.subnets[0].id },
    ],
  },
});

// Store essential secrets
keyVault.addSecret('cosmos-connection-string', cosmosAccount.connectionString);
keyVault.addSecret('storage-connection-string', storage.connectionString);
keyVault.addSecret('jwt-secret', generateSecureToken());
```

**Why?**
- Centralized secrets management
- Never store secrets in app settings
- Soft delete + purge protection in production
- RBAC for fine-grained access control

#### 6. Managed Identity + RBAC

```typescript
// Function App gets system-assigned managed identity
functionApp.identity = {
  type: 'SystemAssigned',
};

// Grant Function App access to Key Vault
new RoleAssignment(stack, 'func-keyvault-access', {
  scope: keyVault.id,
  roleDefinitionId: 'Key Vault Secrets User',
  principalId: functionApp.identity.principalId,
});

// Grant Function App access to Cosmos DB
new RoleAssignment(stack, 'func-cosmos-access', {
  scope: cosmosAccount.id,
  roleDefinitionId: 'Cosmos DB Built-in Data Contributor',
  principalId: functionApp.identity.principalId,
});

// Grant Function App access to Storage
new RoleAssignment(stack, 'func-storage-access', {
  scope: storage.id,
  roleDefinitionId: 'Storage Blob Data Contributor',
  principalId: functionApp.identity.principalId,
});
```

**Why?**
- No connection strings or keys in environment variables
- Managed identity for passwordless authentication
- Automatic key rotation
- Principle of least privilege

### Highly Recommended (Opt-Out)

#### 7. Virtual Network + Subnets

```typescript
const vnet = new VirtualNetwork(stack, 'vnet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
  subnets: [
    {
      name: 'functions',
      addressPrefix: '10.0.1.0/24',
      delegations: [{
        name: 'function-delegation',
        serviceName: 'Microsoft.Web/serverFarms',
      }],
    },
    {
      name: 'private-endpoints',
      addressPrefix: '10.0.2.0/24',
      privateEndpointNetworkPolicies: 'Disabled',
    },
    {
      name: 'apim',
      addressPrefix: '10.0.3.0/24',
    },
  ],
});

// VNet integration for Function App
functionApp.virtualNetworkSubnetId = vnet.subnets.find(s => s.name === 'functions').id;
```

**Why?**
- Isolate backend resources from public internet
- Required for private endpoints
- Control inbound/outbound traffic
- Production security requirement

#### 8. Private Endpoints

```typescript
// Cosmos DB private endpoint
const cosmosPrivateEndpoint = new PrivateEndpoint(stack, 'cosmos-pe', {
  subnet: vnet.subnets.find(s => s.name === 'private-endpoints'),
  privateLinkServiceConnections: [{
    name: 'cosmos-connection',
    privateLinkServiceId: cosmosAccount.id,
    groupIds: ['Sql'],
  }],
});

// Storage private endpoints (blob, queue, table)
const storagePrivateEndpoints = ['blob', 'queue', 'table'].map(service =>
  new PrivateEndpoint(stack, `storage-${service}-pe`, {
    subnet: vnet.subnets.find(s => s.name === 'private-endpoints'),
    privateLinkServiceConnections: [{
      name: `storage-${service}-connection`,
      privateLinkServiceId: storage.id,
      groupIds: [service],
    }],
  })
);

// Key Vault private endpoint
const vaultPrivateEndpoint = new PrivateEndpoint(stack, 'vault-pe', {
  subnet: vnet.subnets.find(s => s.name === 'private-endpoints'),
  privateLinkServiceConnections: [{
    name: 'vault-connection',
    privateLinkServiceId: keyVault.id,
    groupIds: ['vault'],
  }],
});
```

**Why?**
- Keep data services off public internet
- Traffic stays within Azure backbone
- Compliance requirement for many industries
- Defense in depth

#### 9. API Management (Production)

```typescript
const apim = new ApiManagementService(stack, 'apim', {
  sku: {
    name: environment === 'prod' ? 'Premium' : 'Developer',
    capacity: 1,
  },
  publisherName: organization,
  publisherEmail: 'api@company.com',

  virtualNetworkType: 'Internal',  // Internal VNet integration
  virtualNetworkConfiguration: {
    subnetResourceId: vnet.subnets.find(s => s.name === 'apim').id,
  },

  // Application Insights integration
  loggers: [{
    name: 'apim-logger',
    resourceId: appInsights.id,
  }],
});

// Import Function App APIs
apim.importFunctionApp(functionApp, {
  path: 'api',
  policies: {
    rateLimiting: { calls: 1000, renewalPeriod: 60 },
    caching: { duration: 60 },
    authentication: { type: 'jwt', audience: 'api://backend' },
  },
});
```

**Why?**
- Single entry point for all APIs
- Rate limiting and throttling
- Response caching
- Request/response transformation
- API versioning
- Developer portal

#### 10. Service Bus (Event-Driven Architecture)

```typescript
const serviceBus = new ServiceBusNamespace(stack, 'bus', {
  sku: {
    name: environment === 'prod' ? 'Standard' : 'Basic',
  },

  queues: [
    {
      name: 'email-queue',
      maxDeliveryCount: 10,
      deadLetteringOnMessageExpiration: true,
      requiresDuplicateDetection: true,
    },
    {
      name: 'image-processing-queue',
      maxSizeInMegabytes: 1024,
    },
  ],

  topics: [
    {
      name: 'order-events',
      subscriptions: [
        { name: 'notification-service' },
        { name: 'analytics-service' },
      ],
    },
  ],
});
```

**Why?**
- Reliable message queuing
- Dead letter queues for failed messages
- Pub/sub with topics and subscriptions
- Better than Storage Queues for production
- Session support for ordered processing

### Optional (Opt-In)

#### 11. Azure AD B2C (Authentication)

```typescript
const b2c = new B2CTenant(stack, 'auth', {
  tenantName: `${project}-auth`,
  userFlows: [
    {
      name: 'signup-signin',
      type: 'signUpSignIn',
      identityProviders: ['Email', 'Google', 'Microsoft'],
    },
    {
      name: 'password-reset',
      type: 'passwordReset',
    },
  ],
});
```

**Why?**
- User authentication and management
- Social identity providers
- Customizable user flows
- Token-based authentication

#### 12. Redis Cache

```typescript
const redis = new RedisCache(stack, 'cache', {
  sku: {
    name: 'Basic',
    family: 'C',
    capacity: 0,
  },
  enableNonSslPort: false,
  minimumTlsVersion: '1.2',
});
```

**Why?**
- Session state management
- Response caching
- Rate limiting counters
- Distributed locks

#### 13. CDN (Content Delivery)

```typescript
const cdn = new CdnProfile(stack, 'cdn', {
  sku: { name: 'Standard_Microsoft' },

  endpoints: [
    {
      name: 'assets',
      originHostHeader: storage.primaryBlobEndpoint,
      isHttpAllowed: false,
      isHttpsAllowed: true,
      queryStringCachingBehavior: 'IgnoreQueryString',
    },
  ],
});
```

**Why?**
- Global content delivery
- Reduce latency for static assets
- Offload traffic from origin

#### 14. Container Registry (If Using Containers)

```typescript
const acr = new ContainerRegistry(stack, 'registry', {
  sku: { name: 'Basic' },
  adminUserEnabled: false,

  networkRuleSet: {
    defaultAction: 'Deny',
    virtualNetworkRules: [{
      action: 'Allow',
      virtualNetworkResourceId: vnet.subnets.find(s => s.name === 'functions').id,
    }],
  },
});
```

**Why?**
- Store custom container images
- Private container registry
- VNet-integrated for security

## Environment-Specific Defaults

### Development Environment

```typescript
{
  functionApp: {
    plan: 'Y1 (Consumption)',
  },
  cosmos: {
    mode: 'Serverless',
    backup: 'Periodic',
  },
  logRetention: 30,
  vnet: false,  // Opt-in for dev
  privateEndpoints: false,
  apim: false,  // Opt-in for dev
  serviceBus: 'Basic',
}
```

### Production Environment

```typescript
{
  functionApp: {
    plan: 'EP1 (Premium)',
    slots: ['staging'],
  },
  cosmos: {
    mode: 'Autoscale (max 4000 RU/s)',
    backup: 'Continuous',
    multiRegion: true,
  },
  logRetention: 90,
  vnet: true,  // Always enabled
  privateEndpoints: true,  // Always enabled
  apim: true,  // Always enabled
  serviceBus: 'Standard',
  monitoring: {
    alerts: true,
    actionGroups: ['ops-team'],
  },
}
```

## Configuration in defineBackend()

### Minimal (All Defaults)

```typescript
const backend = defineBackend({
  feedbackApi,
  processUploadFunction,
});
```

**Provisions**:
- Function App (Consumption/Premium based on environment)
- Storage Account (with containers and queues)
- Cosmos DB (Serverless/Autoscale based on environment)
- Application Insights + Log Analytics
- Key Vault
- Managed Identity + RBAC
- VNet + Private Endpoints (prod only by default)

### Custom Configuration

```typescript
const backend = defineBackend({
  feedbackApi,
  processUploadFunction,
}, {
  // Override defaults
  functionApp: {
    plan: 'EP2',  // Larger plan
    alwaysOn: true,
  },

  cosmos: {
    consistencyLevel: 'Strong',
    regions: ['eastus2', 'westus2'],
  },

  networking: {
    vnet: true,  // Force VNet even in dev
    privateEndpoints: true,
  },

  optional: {
    apim: true,  // Enable API Management
    serviceBus: true,  // Use Service Bus instead of Storage Queues
    redis: true,  // Enable Redis cache
    cdn: true,  // Enable CDN
  },

  monitoring: {
    alerts: {
      functionErrors: { threshold: 10, window: 5 },
      cosmosRU: { threshold: 3000 },
      storageLatency: { threshold: 1000 },
    },
  },
});
```

### Opt-Out of Defaults

```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  defaults: {
    vnet: false,  // Don't create VNet
    privateEndpoints: false,  // Public endpoints only
  },

  // Use external resources
  external: {
    cosmos: existingCosmosAccount,
    storage: existingStorageAccount,
    keyVault: existingKeyVault,
  },
});
```

## Diagnostic Settings (All Resources)

Every resource should automatically send diagnostics to Log Analytics:

```typescript
function configureDiagnostics(resource: ArmResource) {
  new DiagnosticSetting(stack, `${resource.name}-diagnostics`, {
    name: 'default',
    targetResourceId: resource.id,
    workspaceId: logAnalytics.id,

    logs: [
      { category: 'FunctionAppLogs', enabled: true, retentionDays: 30 },
      { category: 'AllMetrics', enabled: true, retentionDays: 30 },
    ],

    metrics: [
      { category: 'AllMetrics', enabled: true, retentionDays: 30 },
    ],
  });
}
```

**Applied to**:
- Function App
- Storage Account
- Cosmos DB
- Key Vault
- API Management
- Service Bus

## Monitoring & Alerts

### Default Alerts (Production Only)

```typescript
const alerts = {
  // Function App
  'Function Errors': {
    metric: 'FunctionExecutionErrors',
    threshold: 10,
    window: 5,  // minutes
    severity: 'Error',
  },

  'Function Duration': {
    metric: 'FunctionExecutionDuration',
    threshold: 30000,  // 30 seconds
    window: 5,
    severity: 'Warning',
  },

  // Cosmos DB
  'Cosmos RU Consumption': {
    metric: 'TotalRequestUnits',
    threshold: 3000,
    window: 5,
    severity: 'Warning',
  },

  'Cosmos Throttling': {
    metric: 'TotalRequests',
    filter: 'StatusCode == 429',
    threshold: 10,
    window: 5,
    severity: 'Error',
  },

  // Storage
  'Storage Latency': {
    metric: 'SuccessE2ELatency',
    threshold: 1000,  // 1 second
    window: 5,
    severity: 'Warning',
  },

  // Key Vault
  'Key Vault Availability': {
    metric: 'Availability',
    threshold: 99,
    operator: 'LessThan',
    window: 5,
    severity: 'Error',
  },
};
```

## Cost Estimation

### Development Environment (Monthly)

- Function App (Consumption): ~$0-20
- Storage Account: ~$5-10
- Cosmos DB (Serverless): ~$10-50
- Application Insights: ~$5-15
- Key Vault: ~$0.03 per 10k operations
- Log Analytics: ~$2.30/GB

**Total**: ~$25-100/month

### Production Environment (Monthly)

- Function App (EP1 Premium): ~$146
- Storage Account: ~$20-50
- Cosmos DB (Autoscale 4000 RU/s): ~$200-400
- Application Insights: ~$50-200
- Key Vault: ~$0.03 per 10k operations
- Log Analytics: ~$2.30/GB (~$50-100)
- API Management (Premium): ~$2,977
- Service Bus (Standard): ~$10
- VNet: ~$7
- Private Endpoints: ~$7 each (~$35 for 5)

**Total**: ~$3,500-4,000/month

## Implementation in Backend Class

```typescript
export class Backend extends Construct {
  // Core resources (always created)
  readonly functionApp: FunctionApp;
  readonly storage: StorageAccount;
  readonly cosmos: DatabaseAccount;
  readonly appInsights: ApplicationInsights;
  readonly logAnalytics: OperationalInsightsWorkspace;
  readonly keyVault: Vault;

  // Optional resources
  readonly vnet?: VirtualNetwork;
  readonly apim?: ApiManagementService;
  readonly serviceBus?: ServiceBusNamespace;
  readonly redis?: RedisCache;
  readonly cdn?: CdnProfile;

  constructor(scope: SubscriptionStack, name: string, config: BackendConfig) {
    super(scope, name);

    // 1. Create observability first
    this.logAnalytics = this.createLogAnalytics(config);
    this.appInsights = this.createApplicationInsights(config);

    // 2. Create networking (if enabled)
    if (config.networking?.vnet !== false) {
      this.vnet = this.createVNet(config);
    }

    // 3. Create security
    this.keyVault = this.createKeyVault(config);

    // 4. Create data layer
    this.cosmos = this.createCosmosDB(config);
    this.storage = this.createStorage(config);

    // 5. Create compute
    this.functionApp = this.createFunctionApp(config);

    // 6. Configure managed identity and RBAC
    this.configureManagedIdentity();
    this.configureRBAC();

    // 7. Optional services
    if (config.optional?.apim) {
      this.apim = this.createAPIManagement(config);
    }

    if (config.optional?.serviceBus) {
      this.serviceBus = this.createServiceBus(config);
    }

    // 8. Configure diagnostics for all resources
    this.configureDiagnostics();

    // 9. Set up monitoring and alerts (prod only)
    if (config.environment === 'prod') {
      this.configureAlerts(config);
    }
  }
}
```

## Summary

**Every `defineBackend()` should provision**:

1. ✅ **Function App** - Serverless compute
2. ✅ **Storage Account** - Blobs, queues, tables
3. ✅ **Cosmos DB** - NoSQL database
4. ✅ **Application Insights** - APM and monitoring
5. ✅ **Log Analytics** - Centralized logging
6. ✅ **Key Vault** - Secrets management
7. ✅ **Managed Identity** - Passwordless auth
8. ✅ **RBAC** - Least privilege access
9. ⚠️ **VNet + Private Endpoints** - Production only by default
10. ⚠️ **API Management** - Opt-in
11. ⚠️ **Service Bus** - Opt-in
12. 🔘 **Redis** - Opt-in
13. 🔘 **CDN** - Opt-in
14. 🔘 **B2C** - Opt-in

This provides a **secure, observable, production-ready backend** with minimal configuration while remaining flexible for customization.

---

**Next Steps:**
1. Review and approve default infrastructure
2. Implement Backend class with all default resources
3. Add environment-specific configuration
4. Create cost calculator for different configurations
