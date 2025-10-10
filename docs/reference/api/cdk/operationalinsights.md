# Operational Insights Resources API (@atakora/cdk/operationalinsights)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > Operational Insights

---

## Overview

The operationalinsights namespace provides constructs for Azure Log Analytics Workspaces. Log Analytics workspaces are centralized repositories for collecting, analyzing, and acting on log data from Azure resources, applications, and infrastructure.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import {
  Workspaces,
  WorkspaceSku,
  PublicNetworkAccess
} from '@atakora/cdk/operationalinsights';
```

## Classes

### Workspaces (Log Analytics Workspace)

Creates an Azure Log Analytics Workspace for centralized log collection and analysis.

#### Class Signature

```typescript
class Workspaces extends Construct implements ILogAnalyticsWorkspace {
  constructor(scope: Construct, id: string, props?: WorkspacesProps);
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `workspaceName` | `string` | Workspace name |
| `location` | `string` | Azure region |
| `resourceGroupName` | `string` | Resource group name |
| `workspaceId` | `string` | ARM resource ID |
| `sku` | `WorkspaceSku` | Pricing SKU |
| `retentionInDays` | `number` | Data retention period |
| `tags` | `Record<string, string>` | Resource tags |

#### WorkspacesProps

```typescript
interface WorkspacesProps {
  /**
   * Name of the workspace
   * Auto-generated if not provided
   */
  readonly workspaceName?: string;

  /**
   * Azure region
   * Defaults to parent resource group location
   */
  readonly location?: string;

  /**
   * SKU name for the workspace
   * @default WorkspaceSku.PER_GB_2018
   */
  readonly sku?: WorkspaceSku;

  /**
   * Workspace data retention in days
   * Valid values: 30, 60, 90, 120, 180, 270, 365, 550, 730
   * @default 30
   */
  readonly retentionInDays?: number;

  /**
   * The workspace daily quota for ingestion in GB
   * Set to -1 for unlimited
   * @default unlimited
   */
  readonly dailyQuotaGb?: number;

  /**
   * Network access type for ingestion
   * @default PublicNetworkAccess.ENABLED
   */
  readonly publicNetworkAccessForIngestion?: PublicNetworkAccess;

  /**
   * Network access type for queries
   * @default PublicNetworkAccess.ENABLED
   */
  readonly publicNetworkAccessForQuery?: PublicNetworkAccess;

  /**
   * Disable non-AAD based authentication
   * @default false
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Tags to apply
   */
  readonly tags?: Record<string, string>;
}
```

#### Types

```typescript
enum WorkspaceSku {
  FREE = 'Free',
  STANDARD = 'Standard',
  PREMIUM = 'Premium',
  PER_NODE = 'PerNode',
  PER_GB_2018 = 'PerGB2018',
  STANDALONE = 'Standalone',
  CAPACITY_RESERVATION = 'CapacityReservation',
  LA_CLUSTER = 'LACluster'
}

enum PublicNetworkAccess {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled'
}

interface ILogAnalyticsWorkspace {
  readonly workspaceName: string;
  readonly location: string;
  readonly workspaceId: string;
}
```

#### Examples

**Basic Log Analytics Workspace**:
```typescript
import { Workspaces } from '@atakora/cdk/operationalinsights';

const workspace = new Workspaces(resourceGroup, 'MainWorkspace');
```

**With Custom Retention**:
```typescript
const workspace = new Workspaces(resourceGroup, 'LongTermWorkspace', {
  retentionInDays: 365,
  tags: { purpose: 'compliance' }
});
```

**With Daily Quota**:
```typescript
const workspace = new Workspaces(resourceGroup, 'QuotaWorkspace', {
  retentionInDays: 30,
  dailyQuotaGb: 10, // 10GB per day limit
  tags: { costCenter: 'IT' }
});
```

**Capacity Reservation Pricing**:
```typescript
const workspace = new Workspaces(resourceGroup, 'EnterpriseWorkspace', {
  sku: WorkspaceSku.CAPACITY_RESERVATION,
  retentionInDays: 730,
  dailyQuotaGb: 100
});
```

**Private Workspace**:
```typescript
const workspace = new Workspaces(resourceGroup, 'PrivateWorkspace', {
  publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
  publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
  disableLocalAuth: true,
  tags: { security: 'high' }
});
```

---

## SKU Comparison

### PerGB2018 (Recommended)
- Pay-as-you-go pricing
- No upfront commitment
- Best for variable workloads
- Most flexible option

### CapacityReservation
- Commitment-based pricing
- Starts at 100 GB/day
- Cost savings for high volume
- Predictable monthly costs

### Free
- 500 MB/day limit
- 7 days retention
- Development and testing only
- No SLA

### PerNode
- Legacy pricing model
- Not recommended for new deployments
- Use PerGB2018 instead

---

## Common Patterns

### Workspace with Application Insights

```typescript
import { Workspaces } from '@atakora/cdk/operationalinsights';
import { Components } from '@atakora/cdk/insights';

// Create workspace
const workspace = new Workspaces(resourceGroup, 'Monitoring', {
  retentionInDays: 90,
  dailyQuotaGb: 20
});

// Create Application Insights linked to workspace
const appInsights = new Components(resourceGroup, 'WebApp', {
  workspace: workspace,
  retentionInDays: 90
});
```

### Multi-Environment Workspaces

```typescript
// Development workspace with short retention
const devWorkspace = new Workspaces(devResourceGroup, 'DevWorkspace', {
  retentionInDays: 30,
  dailyQuotaGb: 5,
  tags: { environment: 'dev' }
});

// Production workspace with long retention
const prodWorkspace = new Workspaces(prodResourceGroup, 'ProdWorkspace', {
  retentionInDays: 365,
  sku: WorkspaceSku.CAPACITY_RESERVATION,
  tags: { environment: 'production' }
});
```

### Workspace with Diagnostic Settings

```typescript
import { DiagnosticSettings } from '@atakora/cdk/insights';

const workspace = new Workspaces(resourceGroup, 'CentralWorkspace', {
  retentionInDays: 180
});

// Send resource logs to workspace
const diagnostics = new DiagnosticSettings(resourceGroup, 'AppDiagnostics', {
  targetResourceId: appService.resourceId,
  workspace: { workspaceId: workspace.workspaceId },
  logCategories: 'all',
  enableAllMetrics: true
});
```

### Shared Workspace Pattern

```typescript
// Create a shared workspace for multiple applications
const sharedWorkspace = new Workspaces(sharedResourceGroup, 'SharedMonitoring', {
  retentionInDays: 90,
  dailyQuotaGb: 50,
  tags: {
    purpose: 'shared-monitoring',
    costCenter: 'platform'
  }
});

// Multiple Application Insights components can share the workspace
const webAppInsights = new Components(webResourceGroup, 'WebApp', {
  workspace: sharedWorkspace
});

const apiAppInsights = new Components(apiResourceGroup, 'Api', {
  workspace: sharedWorkspace
});
```

---

## Data Retention Guidelines

### Short-Term Retention (30-90 days)
- Development environments
- Non-production workloads
- Cost-sensitive scenarios
- Real-time monitoring focus

### Medium-Term Retention (90-180 days)
- Production environments
- General operational monitoring
- Troubleshooting and debugging
- Performance analysis

### Long-Term Retention (180-730 days)
- Compliance requirements
- Security event logging
- Audit trails
- Trend analysis and capacity planning

---

## Cost Optimization

### Reduce Ingestion Volume
```typescript
// Set daily quota to control costs
const workspace = new Workspaces(resourceGroup, 'CostOptimized', {
  retentionInDays: 30,
  dailyQuotaGb: 10 // Hard limit at 10GB/day
});
```

### Use Appropriate Retention
```typescript
// Don't over-retain data you don't need
const workspace = new Workspaces(resourceGroup, 'Efficient', {
  retentionInDays: 30, // Not 365 if you don't need it
  dailyQuotaGb: 5
});
```

### Capacity Reservation for High Volume
```typescript
// Switch to capacity reservation for predictable high volumes
const workspace = new Workspaces(resourceGroup, 'HighVolume', {
  sku: WorkspaceSku.CAPACITY_RESERVATION,
  retentionInDays: 90,
  dailyQuotaGb: 200 // Commitment pricing saves money at scale
});
```

---

## Government Cloud Considerations

### Availability
Log Analytics Workspaces are fully available in Azure Government Cloud with feature parity to commercial cloud.

**Available Regions**:
- US Gov Virginia
- US Gov Texas
- US Gov Arizona
- US DoD East
- US DoD Central

### Endpoint Differences
The framework automatically configures correct endpoints:
- Commercial: `*.ods.opinsights.azure.com`
- Gov Cloud: `*.ods.opinsights.azure.us`

### Pricing
Pricing models are the same but with different rates:
- PerGB2018: Available
- CapacityReservation: Available (minimum 100 GB/day)
- Free tier: Available with same 500 MB/day limit

### Compliance
Gov Cloud workspaces meet:
- FedRAMP High
- DoD Impact Level 5
- ITAR compliance
- CJIS compliance

### Limitations
No significant feature limitations compared to commercial cloud. All workspace features including:
- Data retention up to 730 days
- Daily quota caps
- Private Link support
- Advanced query capabilities

---

## Best Practices

### Naming Convention
```typescript
// Follow consistent naming patterns
const workspace = new Workspaces(resourceGroup, 'Monitoring', {
  // Auto-generated name: log-{org}-{project}-monitoring-{env}-{geo}-00
  tags: { purpose: 'centralized-logging' }
});
```

### Security
```typescript
// Disable public access for sensitive workloads
const secureWorkspace = new Workspaces(resourceGroup, 'Secure', {
  publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
  publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
  disableLocalAuth: true
});
```

### Resource Organization
- Use one workspace per environment (dev/test/prod)
- Consider regional workspaces for geo-distributed apps
- Use shared workspaces within the same environment
- Separate sensitive data into dedicated workspaces

### Retention Strategy
- Align retention with compliance requirements
- Use shorter retention for development
- Consider archiving to storage for long-term needs
- Balance cost vs. troubleshooting requirements

---

## Kusto Query Examples

Once your workspace is deployed, you can query logs using Kusto Query Language (KQL):

### Query Application Insights Logs
```kql
// Find failed requests in the last hour
requests
| where timestamp > ago(1h)
| where success == false
| summarize count() by operation_Name
| order by count_ desc
```

### Query Performance Metrics
```kql
// Average CPU over time
Perf
| where ObjectName == "Processor" and CounterName == "% Processor Time"
| summarize avg(CounterValue) by bin(TimeGenerated, 5m)
| render timechart
```

### Query Custom Logs
```kql
// Search application logs
AppTraces
| where TimeGenerated > ago(24h)
| where SeverityLevel >= 3 // Warning and above
| project TimeGenerated, Message, SeverityLevel
| order by TimeGenerated desc
```

---

## See Also

- [Insights Resources](./insights.md) - Application Insights, alerts, and monitoring
- [Diagnostic Settings](./insights.md#diagnosticsettings) - Route logs to workspaces
- [Storage Resources](./storage.md) - Archive logs to storage accounts
- [Monitoring Guides](../../../guides/monitoring.md) - Best practices and patterns

---

**Last Updated**: 2025-10-09
**Version**: @atakora/cdk 1.0.0
