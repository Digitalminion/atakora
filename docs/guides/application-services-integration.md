# Application Services Integration Guide

This guide explains how to integrate and configure Azure application-layer services using Atakora CDK constructs. These services build on infrastructure foundations to provide monitoring, API management, web hosting, AI capabilities, and search functionality.

## Overview

Atakora provides L2 constructs for six categories of application services:

1. **Monitoring & Insights** (`@atakora/cdk/insights`): Application Insights, Log Analytics, metrics, alerts
2. **API Management** (`@atakora/cdk/apimanagement`): API gateway, policies, products, subscriptions
3. **Web Services** (`@atakora/cdk/web`): App Service plans, web apps, function apps
4. **Operational Insights** (`@atakora/cdk/operationalinsights`): Log Analytics workspaces
5. **Cognitive Services** (`@atakora/cdk/cognitiveservices`): Azure OpenAI
6. **Search** (`@atakora/cdk/search`): Azure AI Search

## Monitoring and Observability Stack

### Complete Monitoring Setup

The typical monitoring architecture consists of:
- **Log Analytics Workspace**: Central log aggregation and querying
- **Application Insights**: Application performance monitoring (APM)
- **Action Groups**: Alert notification routing
- **Metric Alerts**: Threshold-based alerting on metrics
- **Diagnostic Settings**: Resource log routing
- **Autoscale Settings**: Dynamic scaling based on metrics

```typescript
import { Workspaces } from '@atakora/cdk/operationalinsights';
import { Components, ActionGroups, MetricAlerts, DiagnosticSettings, AutoscaleSettings } from '@atakora/cdk/insights';
import { ApplicationType, PublicNetworkAccess, MetricAlertOperator, TimeAggregation } from '@atakora/cdk/insights';

// Step 1: Create Log Analytics Workspace (foundation for all monitoring)
const workspace = new Workspaces(resourceGroup, 'Monitoring', {
  retentionInDays: 90,
  dailyQuotaGb: 10,
  tags: { purpose: 'centralized-logging' }
});

// Step 2: Create Application Insights for APM
const appInsights = new Components(resourceGroup, 'WebApp', {
  workspace: workspace,
  applicationType: ApplicationType.WEB,
  retentionInDays: 90,
  // Disable public access for security (requires private link)
  publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
  publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
  // Sample 20% of telemetry in non-prod to reduce costs
  samplingPercentage: 20
});

// Step 3: Create Action Group for alert routing
const actionGroup = new ActionGroups(resourceGroup, 'OpsTeam', {
  groupShortName: 'ops',
  emailReceivers: [
    { name: 'ops-team', emailAddress: 'ops@example.com', useCommonAlertSchema: true }
  ],
  smsReceivers: [
    { name: 'on-call', countryCode: '1', phoneNumber: '5551234567' }
  ],
  webhookReceivers: [
    {
      name: 'slack',
      serviceUri: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
      useCommonAlertSchema: true
    }
  ]
});

// Step 4: Create metric alerts for critical metrics
const cpuAlert = new MetricAlerts(resourceGroup, 'HighCpu', {
  description: 'Alert when CPU exceeds 80%',
  severity: 2,
  scopes: [appServicePlan.planId],
  metricName: 'CpuPercentage',
  operator: MetricAlertOperator.GREATER_THAN,
  threshold: 80,
  timeAggregation: TimeAggregation.AVERAGE,
  evaluationFrequency: 'PT1M',  // Check every minute
  windowSize: 'PT5M',            // Over 5-minute window
  actions: [{ actionGroupId: actionGroup.actionGroupId }]
});

// Step 5: Enable diagnostic settings on resources
const diagnostics = new DiagnosticSettings(webApp, 'Diagnostics', {
  targetResourceId: webApp.siteId,
  workspace: { workspaceId: workspace.workspaceId },
  logCategories: 'all',
  enableAllMetrics: true,
  retentionDays: 30
});

// Step 6: Configure autoscaling based on metrics
const autoscale = new AutoscaleSettings(resourceGroup, 'WebAppAutoscale', {
  targetResourceId: appServicePlan.planId,
  minInstances: 2,
  maxInstances: 10,
  defaultInstances: 2,
  rules: [
    {
      metricTrigger: {
        metricResourceId: appServicePlan.planId,
        metricName: 'CpuPercentage',
        timeGrain: 'PT1M',
        statistic: 'Average',
        timeWindow: 'PT5M',
        timeAggregation: 'Average',
        operator: 'GreaterThan',
        threshold: 70
      },
      scaleAction: {
        direction: 'Increase',
        type: 'ChangeCount',
        value: '1',
        cooldown: 'PT5M'
      }
    },
    {
      metricTrigger: {
        metricResourceId: appServicePlan.planId,
        metricName: 'CpuPercentage',
        timeGrain: 'PT1M',
        statistic: 'Average',
        timeWindow: 'PT5M',
        timeAggregation: 'Average',
        operator: 'LessThan',
        threshold: 30
      },
      scaleAction: {
        direction: 'Decrease',
        type: 'ChangeCount',
        value: '1',
        cooldown: 'PT5M'
      }
    }
  ]
});
```

### Monitoring Best Practices

**Log Analytics Workspace**:
- Use a single workspace per environment for unified querying
- Set retention based on compliance needs (30-730 days)
- Configure daily quota caps to prevent cost overruns
- Disable public network access and use private link for security

**Application Insights**:
- Always use workspace-based mode (classic mode is deprecated)
- Use connection string instead of instrumentation key
- Enable sampling in non-production to reduce costs
- Configure IP masking based on privacy requirements
- Set appropriate retention (30-90 days typical)

**Action Groups**:
- Use short name (max 12 chars) that appears in SMS/email
- Enable common alert schema for structured notifications
- Configure multiple notification channels for redundancy
- Use webhook receivers for integration with ChatOps tools

**Metric Alerts**:
- Set severity appropriately (0=Critical, 1=Error, 2=Warning, 3=Info, 4=Verbose)
- Use evaluation frequency wisely (more frequent = higher cost)
- Configure window size larger than frequency for accurate aggregation
- Enable auto-mitigation to automatically resolve alerts

**Diagnostic Settings**:
- Enable for all production resources
- Route to Log Analytics for querying and alerting
- Use Storage for long-term archival
- Use Event Hub for real-time streaming

**Autoscale**:
- Set appropriate min/max to prevent under/over-provisioning
- Use cooldown periods to prevent flapping
- Configure both scale-up and scale-down rules
- Test scaling behavior under load

## API Management Integration

### Complete API Gateway Setup

```typescript
import { Service, Api, Product, Subscription } from '@atakora/cdk/apimanagement';
import { ApiManagementSkuName, VirtualNetworkType, ApiType, Protocol } from '@atakora/cdk/apimanagement';

// Step 1: Create API Management service
const apim = new Service(resourceGroup, 'Gateway', {
  publisherName: 'Your Organization',
  publisherEmail: 'api-admin@example.com',
  sku: ApiManagementSkuName.PREMIUM,
  capacity: 2,  // For HA across zones
  // Enable VNet integration for internal APIs
  virtualNetworkType: VirtualNetworkType.INTERNAL,
  subnetId: '/subscriptions/.../subnets/apim-subnet',
  // Enable system-assigned identity for Key Vault access
  enableSystemIdentity: true,
  tags: { purpose: 'api-gateway' }
});

// Step 2: Define APIs
const authApi = new Api(apim, 'AuthAPI', {
  displayName: 'Authentication API',
  path: 'auth',
  serviceUrl: 'https://auth-backend.internal.example.com',
  apiType: ApiType.HTTP,
  protocols: [Protocol.HTTPS],
  subscriptionRequired: true
});

// Step 3: Create products to group APIs
const internalProduct = new Product(apim, 'InternalAPIs', {
  displayName: 'Internal APIs',
  description: 'APIs for internal use only',
  subscriptionRequired: true,
  approvalRequired: true,
  apis: [authApi.apiId]
});

// Step 4: Create subscriptions for API consumers
const partnerSubscription = new Subscription(apim, 'PartnerAccess', {
  scope: internalProduct.productId,
  displayName: 'Partner Organization Subscription',
  allowTracing: false  // Disable for security
});

// Step 5: Configure Application Insights for API telemetry
apim.enableApplicationInsights(appInsights);
```

### API Management Patterns

**SKU Selection**:
- **Consumption**: Serverless, pay-per-call, limited features
- **Developer**: Non-production, no SLA, single unit
- **Basic**: Production workloads, 99.95% SLA
- **Standard**: Production with caching and multi-region
- **Premium**: Enterprise features, VNet, multi-region, higher scale

**VNet Integration**:
- **External**: Gateway accessible from internet, backend in VNet
- **Internal**: Gateway accessible only from VNet
- Requires Premium SKU
- Supports UDR and NSG for traffic control

**Security Best Practices**:
- Disable legacy TLS protocols (1.0, 1.1, SSL 3.0)
- Use client certificates for backend authentication
- Enable subscription keys for API access control
- Use Azure AD for user authentication
- Enable WAF for DDoS and application protection

## Web Application Hosting

### App Service Complete Setup

```typescript
import { ServerFarms, Sites } from '@atakora/cdk/web';
import { ServerFarmSkuName, FtpsState, MinTlsVersion, ConnectionStringType } from '@atakora/cdk/web';

// Step 1: Create App Service Plan
const plan = new ServerFarms(resourceGroup, 'WebPlan', {
  sku: ServerFarmSkuName.P1V3,  // Premium v3 for production
  capacity: 2,  // Multiple instances for HA
  zoneRedundant: true,  // Spread across AZs
  kind: 'linux'  // Linux containers
});

// Step 2: Create Web App
const webApp = new Sites(resourceGroup, 'WebApp', {
  serverFarmId: plan,
  linuxFxVersion: 'PYTHON|3.11',
  httpsOnly: true,
  alwaysOn: true,
  http20Enabled: true,
  ftpsState: FtpsState.DISABLED,
  minTlsVersion: MinTlsVersion.TLS_1_2,
  healthCheckPath: '/health',
  // Enable VNet integration
  virtualNetworkSubnetId: '/subscriptions/.../subnets/webapp-subnet',
  vnetRouteAllEnabled: true,
  // Enable managed identity
  identity: { type: 'SystemAssigned' },
  tags: { purpose: 'web-frontend' }
});

// Step 3: Configure app settings
webApp.addAppSetting('ENVIRONMENT', 'production');
webApp.addAppSetting('APPINSIGHTS_INSTRUMENTATIONKEY', appInsights.instrumentationKey);
webApp.addAppSetting('KEY_VAULT_URL', 'https://kv-example.vault.azure.net/');
webApp.addAppSetting('DATABASE_URL', '@Microsoft.KeyVault(SecretUri=https://kv.vault.azure.net/secrets/db-url)');

// Step 4: Configure connection strings
webApp.addConnectionString(
  'DefaultConnection',
  '@Microsoft.KeyVault(SecretUri=https://kv.vault.azure.net/secrets/connection-string)',
  ConnectionStringType.SQL_AZURE
);

// Step 5: Grant Key Vault access to managed identity
keyVault.grantSecretsReader(webApp);
```

### Web App Best Practices

**Scaling**:
- Use Premium V3 for best price/performance
- Enable zone redundancy for 99.95% SLA
- Configure autoscaling for variable load
- Use slots for zero-downtime deployments

**Security**:
- Always enable HTTPS only
- Disable FTP/FTPS (use deployment center instead)
- Use TLS 1.2 minimum
- Enable managed identity for passwordless auth
- Store secrets in Key Vault, reference via app settings

**Networking**:
- Use VNet integration for outbound connectivity
- Use Private Endpoints for inbound (Premium SKU)
- Enable route all traffic for full VNet routing
- Configure IP restrictions for additional security

**Monitoring**:
- Enable Application Insights auto-instrumentation
- Configure health check path
- Enable detailed error logging
- Enable HTTP logging for troubleshooting

## AI and Cognitive Services

### Azure OpenAI Service Setup

```typescript
import { Accounts } from '@atakora/cdk/cognitiveservices';
import { PublicNetworkAccess, NetworkRuleAction } from '@atakora/cdk/cognitiveservices';

// Create OpenAI Service with security lockdown
const openai = new Accounts(resourceGroup, 'AI', {
  sku: 'S0',  // Standard SKU for production
  // Security: Disable public access after deployment
  publicNetworkAccess: PublicNetworkAccess.ENABLED,  // Required during deployment
  networkAcls: {
    defaultAction: NetworkRuleAction.DENY,
    virtualNetworkRules: [
      { id: '/subscriptions/.../subnets/app-subnet' }
    ],
    ipRules: [
      { value: '203.0.113.0/24' }  // Allowed IP ranges
    ]
  },
  tags: { purpose: 'llm-inference' }
});

// Deploy models via Azure Portal or ARM templates
// Example: GPT-4, GPT-3.5-turbo, text-embedding-ada-002
```

### OpenAI Best Practices

**Deployment Considerations**:
- Public access must be enabled during initial ARM deployment
- Configure network ACLs post-deployment or via policy
- Use private endpoints for production workloads
- Custom subdomain automatically matches account name

**Security**:
- Use managed identity for authentication
- Store API keys in Key Vault
- Implement rate limiting at application layer
- Monitor usage and costs via Log Analytics

**Cost Optimization**:
- Use appropriate models for workload (GPT-3.5 vs GPT-4)
- Implement caching for repeated queries
- Use streaming for long responses
- Monitor token usage and optimize prompts

## Search Services

### Azure AI Search Setup

```typescript
import { SearchServices } from '@atakora/cdk/search';
import { SearchServiceSku, HostingMode, PublicNetworkAccess } from '@atakora/cdk/search';

// Create search service
const search = new SearchServices(resourceGroup, 'Search', {
  sku: SearchServiceSku.STANDARD,
  replicaCount: 3,  // For HA and query performance
  partitionCount: 2,  // For index size and throughput
  hostingMode: HostingMode.DEFAULT,
  publicNetworkAccess: PublicNetworkAccess.DISABLED,
  networkRuleSet: {
    ipRules: [
      { value: '203.0.113.0/24' }
    ]
  },
  tags: { purpose: 'document-search' }
});
```

### Search Best Practices

**SKU Selection**:
- **Free**: Development only, 50MB limit, 3 indexes
- **Basic**: Small production workloads, 2GB, 5 indexes
- **Standard**: Production, up to 25GB per partition
- **Standard3**: Large scale, up to 200GB per partition

**Scaling**:
- Replicas: Increase for query performance and HA
- Partitions: Increase for index size and indexing throughput
- Storage per partition: Basic (2GB), S1 (25GB), S2 (100GB), S3 (200GB)

**Performance**:
- Use semantic search for better relevance
- Implement query caching
- Use search suggestions for autocomplete
- Optimize index schema (reduce fields, use proper analyzers)

## Government Cloud Differences

All application services are available in Azure Government Cloud with these differences:

**Endpoints**:
- Application Insights: `https://monitor.azure.us` (vs `.com`)
- API Management: `*.azure-api.us` (vs `.azure-api.net`)
- App Service: `*.azurewebsites.us` (vs `.net`)
- Azure OpenAI: Limited availability in select regions
- Search: `*.search.windows.us` (vs `.net`)

**Compliance**:
- FedRAMP High authorization
- DoD Impact Level 5 certification
- CJIS, ITAR, IRS 1075 compliance
- Data sovereignty in US government datacenters

**Feature Availability**:
- Most features identical to commercial cloud
- Some preview features may lag commercial rollout
- OpenAI models subject to separate approval process

**Networking**:
- Use government cloud VNet peering
- ExpressRoute available via government circuits
- Private Link fully supported

## Integration Patterns

### Full-Stack Application

```typescript
// 1. Monitoring foundation
const workspace = new Workspaces(resourceGroup, 'Monitoring', { retentionInDays: 90 });
const appInsights = new Components(resourceGroup, 'App', { workspace });

// 2. Data layer
const cosmosDb = new DatabaseAccounts(resourceGroup, 'Data', { ... });
const searchService = new SearchServices(resourceGroup, 'Search', { ... });

// 3. Compute layer
const plan = new ServerFarms(resourceGroup, 'Compute', { sku: 'P1V3' });
const webApp = new Sites(resourceGroup, 'Frontend', { serverFarmId: plan });
const apiApp = new Sites(resourceGroup, 'Backend', { serverFarmId: plan });

// 4. API layer
const apim = new Service(resourceGroup, 'Gateway', { ... });
const api = new Api(apim, 'PublicAPI', { serviceUrl: apiApp.defaultHostName });

// 5. AI layer
const openai = new Accounts(resourceGroup, 'AI', { ... });

// 6. Wire up monitoring
new DiagnosticSettings(webApp, 'WebDiag', { targetResourceId: webApp.siteId, workspace });
new DiagnosticSettings(apiApp, 'ApiDiag', { targetResourceId: apiApp.siteId, workspace });
new DiagnosticSettings(apim, 'ApimDiag', { targetResourceId: apim.apiManagementId, workspace });

// 7. Configure app settings
webApp.addAppSetting('APPINSIGHTS_INSTRUMENTATIONKEY', appInsights.instrumentationKey);
webApp.addAppSetting('API_BASE_URL', `https://${apim.gatewayUrl}/api`);
apiApp.addAppSetting('COSMOS_ENDPOINT', cosmosDb.documentEndpoint);
apiApp.addAppSetting('SEARCH_ENDPOINT', `https://${searchService.serviceName}.search.windows.net`);
apiApp.addAppSetting('OPENAI_ENDPOINT', `https://${openai.customSubDomainName}.openai.azure.com`);
```

## Cost Optimization

**Monitoring**:
- Use sampling to reduce Application Insights ingestion
- Set daily quota caps on Log Analytics workspaces
- Archive old logs to cheaper storage tiers
- Use 30-day retention for non-production

**API Management**:
- Use Consumption SKU for variable workloads
- Cache responses to reduce backend calls
- Implement rate limiting to prevent abuse
- Monitor and optimize API usage patterns

**Web Apps**:
- Use Basic/Standard for dev/test
- Use Premium V3 for production (better value than v1/v2)
- Enable autoscaling to match demand
- Use deployment slots instead of separate apps

**AI Services**:
- Choose appropriate models (GPT-3.5 vs GPT-4)
- Implement prompt caching
- Use embeddings for retrieval before generation
- Monitor token usage and set budgets

**Search**:
- Right-size SKU to workload
- Use Basic for small datasets
- Optimize index schema to reduce storage
- Consider index refresh frequency vs costs

## Troubleshooting

**Common Issues**:

1. **Application Insights not receiving data**:
   - Check instrumentation key/connection string is correct
   - Verify network access (public or private link configured)
   - Confirm workspace is in same region (or use supported cross-region)
   - Check application has instrumentation library installed

2. **API Management deployment fails**:
   - Check VNet subnet has sufficient IP addresses (minimum /27)
   - Verify NSG rules allow Azure infrastructure traffic
   - Confirm subnet not already in use
   - Check custom domain certificates are valid

3. **Web App deployment fails**:
   - Verify App Service Plan has capacity
   - Check app settings don't exceed size limits
   - Confirm VNet integration subnet is delegated to Microsoft.Web
   - Verify managed identity has required permissions

4. **OpenAI deployment blocked**:
   - Public network access must be enabled during deployment
   - Network ACLs can be applied post-deployment
   - Verify subscription has OpenAI access approved
   - Check region supports OpenAI (limited availability)

5. **Search service timeout**:
   - Increase replica count for better query performance
   - Optimize query complexity
   - Check indexing is not saturating resources
   - Verify network connectivity if using private endpoint

## See Also

- [Infrastructure Resources Guide](./infrastructure-resources.md)
- [Networking Patterns](./networking-patterns.md)
- [Security Best Practices](./security-best-practices.md)
- [Cost Management](./cost-management.md)
