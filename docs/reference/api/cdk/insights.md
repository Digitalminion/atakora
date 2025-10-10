# Insights Resources API (@atakora/cdk/insights)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > Insights

---

## Overview

The insights namespace provides constructs for Azure Monitor resources including Application Insights, action groups, metric alerts, autoscale settings, and diagnostic settings. These resources enable comprehensive monitoring, alerting, and auto-scaling capabilities for your Azure infrastructure.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import {
  Components,
  ActionGroups,
  MetricAlerts,
  AutoscaleSettings,
  DiagnosticSettings
} from '@atakora/cdk/insights';
```

## Classes

### Components (Application Insights)

Creates an Azure Application Insights component for application performance monitoring.

#### Class Signature

```typescript
class Components extends Construct implements IApplicationInsights {
  constructor(scope: Construct, id: string, props: ComponentsProps);
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Component name |
| `location` | `string` | Azure region |
| `resourceGroupName` | `string` | Resource group name |
| `resourceId` | `string` | ARM resource ID |
| `instrumentationKey` | `string` | Instrumentation key |
| `connectionString` | `string` | Connection string |
| `applicationType` | `ApplicationType` | Application type |
| `tags` | `Record<string, string>` | Resource tags |

#### ComponentsProps

```typescript
interface ComponentsProps {
  /**
   * Name of the Application Insights component
   * Auto-generated if not provided
   */
  readonly name?: string;

  /**
   * Azure region
   * Defaults to parent resource group location
   */
  readonly location?: string;

  /**
   * Kind of application
   * @default 'web'
   */
  readonly kind?: string;

  /**
   * Type of application being monitored
   * @default ApplicationType.WEB
   */
  readonly applicationType?: ApplicationType;

  /**
   * Log Analytics Workspace (required)
   * Workspace-based Application Insights is recommended
   */
  readonly workspace: ILogAnalyticsWorkspace;

  /**
   * Retention period in days
   * Valid values: 30, 60, 90, 120, 180, 270, 365, 550, 730
   * @default 90
   */
  readonly retentionInDays?: number;

  /**
   * Percentage of data being sampled
   * Value between 0 and 100
   */
  readonly samplingPercentage?: number;

  /**
   * Disable IP masking
   * @default false
   */
  readonly disableIpMasking?: boolean;

  /**
   * Disable local authentication methods
   * @default false
   */
  readonly disableLocalAuth?: boolean;

  /**
   * Public network access for ingestion
   * @default PublicNetworkAccess.ENABLED
   */
  readonly publicNetworkAccessForIngestion?: PublicNetworkAccess;

  /**
   * Public network access for query
   * @default PublicNetworkAccess.ENABLED
   */
  readonly publicNetworkAccessForQuery?: PublicNetworkAccess;

  /**
   * Tags to apply
   */
  readonly tags?: Record<string, string>;
}
```

#### Types

```typescript
enum ApplicationType {
  WEB = 'web',
  OTHER = 'other'
}

enum PublicNetworkAccess {
  ENABLED = 'Enabled',
  DISABLED = 'Disabled'
}

interface ILogAnalyticsWorkspace {
  readonly workspaceName: string;
  readonly workspaceId: string;
}
```

#### Examples

**Basic Application Insights**:
```typescript
import { Components } from '@atakora/cdk/insights';
import { LogAnalyticsWorkspace } from '@atakora/cdk/operationalinsights';

const workspace = new LogAnalyticsWorkspace(resourceGroup, 'Workspace', {
  retentionInDays: 30
});

const appInsights = new Components(resourceGroup, 'WebApp', {
  workspace: workspace
});
```

**With Custom Configuration**:
```typescript
const appInsights = new Components(resourceGroup, 'ApiApp', {
  workspace: workspace,
  applicationType: ApplicationType.WEB,
  retentionInDays: 90,
  samplingPercentage: 100,
  tags: { environment: 'production' }
});
```

**Private Application Insights**:
```typescript
const appInsights = new Components(resourceGroup, 'PrivateApp', {
  workspace: workspace,
  publicNetworkAccessForIngestion: PublicNetworkAccess.DISABLED,
  publicNetworkAccessForQuery: PublicNetworkAccess.DISABLED,
  disableLocalAuth: true
});
```

**Import Existing Component**:
```typescript
const existingAppInsights = Components.fromResourceId(
  this,
  'ExistingAppInsights',
  '/subscriptions/.../components/appi-existing'
);
```

---

### ActionGroups

Creates an action group for alert notifications and actions.

#### Class Signature

```typescript
class ActionGroups extends Construct implements IActionGroup {
  constructor(scope: Construct, id: string, props: ActionGroupsProps);
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `actionGroupName` | `string` | Action group name |
| `location` | `string` | Azure region (typically 'Global') |
| `resourceGroupName` | `string` | Resource group name |
| `actionGroupId` | `string` | ARM resource ID |
| `groupShortName` | `string` | Short name (12 chars max) |
| `tags` | `Record<string, string>` | Resource tags |

#### ActionGroupsProps

```typescript
interface ActionGroupsProps {
  /**
   * Name of the action group
   * Auto-generated if not provided
   */
  readonly actionGroupName?: string;

  /**
   * Azure region
   * @default 'Global'
   */
  readonly location?: string;

  /**
   * Short name (12 characters or less)
   * Required - used in SMS and email notifications
   */
  readonly groupShortName: string;

  /**
   * Whether the action group is enabled
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * Email receivers
   */
  readonly emailReceivers?: readonly EmailReceiver[];

  /**
   * SMS receivers
   */
  readonly smsReceivers?: readonly SmsReceiver[];

  /**
   * Webhook receivers
   */
  readonly webhookReceivers?: readonly WebhookReceiver[];

  /**
   * Azure App push receivers
   */
  readonly azureAppPushReceivers?: readonly AzureAppPushReceiver[];

  /**
   * Automation runbook receivers
   */
  readonly automationRunbookReceivers?: readonly AutomationRunbookReceiver[];

  /**
   * Voice receivers
   */
  readonly voiceReceivers?: readonly VoiceReceiver[];

  /**
   * Logic App receivers
   */
  readonly logicAppReceivers?: readonly LogicAppReceiver[];

  /**
   * Azure Function receivers
   */
  readonly azureFunctionReceivers?: readonly AzureFunctionReceiver[];

  /**
   * ARM role receivers
   */
  readonly armRoleReceivers?: readonly ArmRoleReceiver[];

  /**
   * Event Hub receivers
   */
  readonly eventHubReceivers?: readonly EventHubReceiver[];

  /**
   * Tags to apply
   */
  readonly tags?: Record<string, string>;
}
```

#### Receiver Types

```typescript
interface EmailReceiver {
  readonly name: string;
  readonly emailAddress: string;
  readonly useCommonAlertSchema?: boolean;
}

interface SmsReceiver {
  readonly name: string;
  readonly countryCode: string; // e.g., '1' for US
  readonly phoneNumber: string;
}

interface WebhookReceiver {
  readonly name: string;
  readonly serviceUri: string;
  readonly useCommonAlertSchema?: boolean;
  readonly useAadAuth?: boolean;
  readonly objectId?: string;
  readonly identifierUri?: string;
  readonly tenantId?: string;
}

interface AzureFunctionReceiver {
  readonly name: string;
  readonly functionAppResourceId: string;
  readonly functionName: string;
  readonly httpTriggerUrl: string;
  readonly useCommonAlertSchema?: boolean;
}

interface ArmRoleReceiver {
  readonly name: string;
  readonly roleId: string;
  readonly useCommonAlertSchema?: boolean;
}
```

#### Examples

**Basic Email Action Group**:
```typescript
import { ActionGroups } from '@atakora/cdk/insights';

const actionGroup = new ActionGroups(resourceGroup, 'Alerts', {
  groupShortName: 'alerts',
  emailReceivers: [
    { name: 'admin', emailAddress: 'admin@example.com', useCommonAlertSchema: true }
  ]
});
```

**Multi-Channel Action Group**:
```typescript
const actionGroup = new ActionGroups(resourceGroup, 'OpsAlerts', {
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
```

**Azure Function Action Group**:
```typescript
const actionGroup = new ActionGroups(resourceGroup, 'CustomActions', {
  groupShortName: 'custom',
  azureFunctionReceivers: [
    {
      name: 'alert-processor',
      functionAppResourceId: functionApp.resourceId,
      functionName: 'processAlert',
      httpTriggerUrl: 'https://myapp.azurewebsites.net/api/processAlert',
      useCommonAlertSchema: true
    }
  ]
});
```

---

### MetricAlerts

Creates a metric alert for monitoring resource metrics.

#### Class Signature

```typescript
class MetricAlerts extends Construct implements IMetricAlert {
  constructor(scope: Construct, id: string, props: MetricAlertsProps);
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `name` | `string` | Alert name |
| `location` | `string` | Azure region |
| `resourceGroupName` | `string` | Resource group name |
| `resourceId` | `string` | ARM resource ID |
| `severity` | `number` | Severity (0-4) |
| `enabled` | `boolean` | Whether alert is enabled |
| `evaluationFrequency` | `string` | Evaluation frequency |
| `windowSize` | `string` | Evaluation window |
| `tags` | `Record<string, string>` | Resource tags |

#### MetricAlertsProps

```typescript
interface MetricAlertsProps {
  /**
   * Name of the metric alert
   * Auto-generated if not provided
   */
  readonly name?: string;

  /**
   * Azure region
   * @default 'Global'
   */
  readonly location?: string;

  /**
   * Description of the alert
   */
  readonly description?: string;

  /**
   * Severity of the alert (0-4)
   * - 0: Critical
   * - 1: Error
   * - 2: Warning (default)
   * - 3: Informational
   * - 4: Verbose
   * @default 2
   */
  readonly severity?: number;

  /**
   * Whether the alert is enabled
   * @default true
   */
  readonly enabled?: boolean;

  /**
   * Resource IDs to monitor
   */
  readonly scopes: readonly string[];

  /**
   * How often the metric alert is evaluated
   * ISO 8601 duration (e.g., 'PT1M', 'PT5M')
   * @default 'PT1M'
   */
  readonly evaluationFrequency?: string;

  /**
   * Period of time used to monitor alert activity
   * ISO 8601 duration (e.g., 'PT5M', 'PT15M', 'PT1H')
   * @default 'PT5M'
   */
  readonly windowSize?: string;

  /**
   * Metric name to alert on (simplified interface)
   */
  readonly metricName?: string;

  /**
   * Operator for threshold comparison
   */
  readonly operator?: MetricAlertOperator;

  /**
   * Threshold value
   */
  readonly threshold?: number;

  /**
   * Time aggregation type
   */
  readonly timeAggregation?: TimeAggregation;

  /**
   * Advanced criteria for complex alerts
   */
  readonly criteria?: readonly MetricAlertCriterion[];

  /**
   * Actions to take when alert fires
   */
  readonly actions?: readonly MetricAlertAction[];

  /**
   * Whether to auto-mitigate the alert
   * @default true
   */
  readonly autoMitigate?: boolean;

  /**
   * Tags to apply
   */
  readonly tags?: Record<string, string>;
}
```

#### Types

```typescript
enum MetricAlertOperator {
  EQUALS = 'Equals',
  NOT_EQUALS = 'NotEquals',
  GREATER_THAN = 'GreaterThan',
  GREATER_THAN_OR_EQUAL = 'GreaterThanOrEqual',
  LESS_THAN = 'LessThan',
  LESS_THAN_OR_EQUAL = 'LessThanOrEqual'
}

enum TimeAggregation {
  AVERAGE = 'Average',
  MINIMUM = 'Minimum',
  MAXIMUM = 'Maximum',
  TOTAL = 'Total',
  COUNT = 'Count'
}

interface MetricAlertAction {
  readonly actionGroupId: string;
  readonly webHookProperties?: Record<string, string>;
}

interface StaticThresholdCriterion {
  readonly criterionType: CriterionType.STATIC_THRESHOLD;
  readonly name: string;
  readonly metricName: string;
  readonly metricNamespace?: string;
  readonly operator: MetricAlertOperator;
  readonly threshold: number;
  readonly timeAggregation: TimeAggregation;
  readonly dimensions?: readonly MetricDimension[];
}

interface MetricDimension {
  readonly name: string;
  readonly operator: 'Include' | 'Exclude';
  readonly values: readonly string[];
}
```

#### Examples

**Simple CPU Alert**:
```typescript
import { MetricAlerts, MetricAlertOperator, TimeAggregation } from '@atakora/cdk/insights';

const cpuAlert = new MetricAlerts(resourceGroup, 'CpuAlert', {
  description: 'Alert when CPU exceeds 80%',
  severity: 2,
  scopes: [appService.resourceId],
  metricName: 'CpuPercentage',
  operator: MetricAlertOperator.GREATER_THAN,
  threshold: 80,
  timeAggregation: TimeAggregation.AVERAGE,
  actions: [{ actionGroupId: actionGroup.actionGroupId }]
});
```

**Memory Alert with Custom Window**:
```typescript
const memoryAlert = new MetricAlerts(resourceGroup, 'MemoryAlert', {
  description: 'Alert when memory exceeds 90%',
  severity: 1,
  scopes: [appService.resourceId],
  metricName: 'MemoryPercentage',
  operator: MetricAlertOperator.GREATER_THAN,
  threshold: 90,
  timeAggregation: TimeAggregation.AVERAGE,
  evaluationFrequency: 'PT5M',
  windowSize: 'PT15M',
  actions: [{ actionGroupId: actionGroup.actionGroupId }]
});
```

**Multi-Metric Alert**:
```typescript
import { CriterionType } from '@atakora/cdk/insights';

const multiAlert = new MetricAlerts(resourceGroup, 'AppHealthAlert', {
  description: 'Alert on multiple metrics',
  severity: 2,
  scopes: [appService.resourceId],
  criteria: [
    {
      criterionType: CriterionType.STATIC_THRESHOLD,
      name: 'cpu-high',
      metricName: 'CpuPercentage',
      operator: MetricAlertOperator.GREATER_THAN,
      threshold: 80,
      timeAggregation: TimeAggregation.AVERAGE
    },
    {
      criterionType: CriterionType.STATIC_THRESHOLD,
      name: 'response-time-high',
      metricName: 'HttpResponseTime',
      operator: MetricAlertOperator.GREATER_THAN,
      threshold: 5000,
      timeAggregation: TimeAggregation.AVERAGE
    }
  ],
  actions: [{ actionGroupId: actionGroup.actionGroupId }]
});
```

---

### DiagnosticSettings

Creates diagnostic settings to route logs and metrics to destinations.

#### Class Signature

```typescript
class DiagnosticSettings extends Construct implements IDiagnosticSetting {
  constructor(scope: Construct, id: string, props: DiagnosticSettingsProps);
}
```

#### DiagnosticSettingsProps

```typescript
interface DiagnosticSettingsProps {
  /**
   * Name of the diagnostic setting
   * Auto-generated if not provided
   */
  readonly name?: string;

  /**
   * Resource ID of the target resource to monitor
   */
  readonly targetResourceId: string;

  /**
   * Log Analytics workspace to send logs/metrics to
   */
  readonly workspace?: {
    readonly workspaceId: string;
  };

  /**
   * Storage account to archive logs/metrics to
   */
  readonly storageAccount?: {
    readonly storageAccountId: string;
  };

  /**
   * Event Hub to stream logs/metrics to
   */
  readonly eventHub?: {
    readonly authorizationRuleId: string;
    readonly name?: string;
  };

  /**
   * Log categories to enable
   * Use 'all' to enable all categories
   */
  readonly logCategories?: readonly string[] | 'all';

  /**
   * Whether to enable all metrics
   * @default false
   */
  readonly enableAllMetrics?: boolean;

  /**
   * Advanced log settings
   */
  readonly logs?: readonly LogSettings[];

  /**
   * Advanced metric settings
   */
  readonly metrics?: readonly MetricSettings[];

  /**
   * Retention in days for logs/metrics
   */
  readonly retentionDays?: number;
}
```

#### Examples

**Send Logs to Log Analytics**:
```typescript
import { DiagnosticSettings } from '@atakora/cdk/insights';

const diagnostics = new DiagnosticSettings(resourceGroup, 'AppDiagnostics', {
  targetResourceId: appService.resourceId,
  workspace: { workspaceId: workspace.workspaceId },
  logCategories: 'all',
  enableAllMetrics: true
});
```

**Archive to Storage Account**:
```typescript
const diagnostics = new DiagnosticSettings(resourceGroup, 'StorageDiagnostics', {
  targetResourceId: storageAccount.resourceId,
  storageAccount: { storageAccountId: archiveStorage.resourceId },
  logCategories: ['StorageRead', 'StorageWrite', 'StorageDelete'],
  retentionDays: 90
});
```

**Multi-Destination Diagnostics**:
```typescript
const diagnostics = new DiagnosticSettings(resourceGroup, 'CompleteDiagnostics', {
  targetResourceId: sqlDatabase.resourceId,
  workspace: { workspaceId: workspace.workspaceId },
  storageAccount: { storageAccountId: archiveStorage.resourceId },
  eventHub: {
    authorizationRuleId: eventHubRule.resourceId,
    name: 'diagnostics-hub'
  },
  logCategories: 'all',
  enableAllMetrics: true,
  retentionDays: 30
});
```

---

## Government Cloud Considerations

### Application Insights

Application Insights is fully available in Azure Government Cloud with these considerations:

**Endpoint Differences**:
- Commercial: `dc.applicationinsights.azure.com`
- Gov Cloud: `dc.applicationinsights.us`

The framework automatically configures the correct endpoints based on the cloud environment.

**Feature Parity**:
- Workspace-based Application Insights: Available
- Continuous Export: Available
- API Access: Available with Gov Cloud endpoints
- Profiler and Snapshot Debugger: Available

### Action Groups

Action groups have these Gov Cloud considerations:

**Webhook URLs**: Ensure webhook receivers use Gov Cloud-accessible endpoints

**Email Notifications**: Fully supported with no differences

**Azure Function Receivers**: Function apps must be deployed in Gov Cloud

### Metric Alerts

Metric alerts are fully supported in Gov Cloud with no significant differences. All metric sources and alert types are available.

### Diagnostic Settings

Diagnostic settings work identically in Gov Cloud, but destination resources must be in Gov Cloud:
- Log Analytics workspaces must be Gov Cloud workspaces
- Storage accounts must be Gov Cloud storage accounts
- Event Hubs must be Gov Cloud event hubs

---

## Common Patterns

### Complete Monitoring Stack

```typescript
import { Components, ActionGroups, MetricAlerts, DiagnosticSettings } from '@atakora/cdk/insights';
import { LogAnalyticsWorkspace } from '@atakora/cdk/operationalinsights';

// Create Log Analytics workspace
const workspace = new LogAnalyticsWorkspace(resourceGroup, 'Workspace', {
  retentionInDays: 30
});

// Create Application Insights
const appInsights = new Components(resourceGroup, 'WebApp', {
  workspace: workspace,
  retentionInDays: 90
});

// Create action group for notifications
const actionGroup = new ActionGroups(resourceGroup, 'Alerts', {
  groupShortName: 'ops',
  emailReceivers: [
    { name: 'ops-team', emailAddress: 'ops@example.com', useCommonAlertSchema: true }
  ]
});

// Create CPU alert
const cpuAlert = new MetricAlerts(resourceGroup, 'CpuAlert', {
  description: 'Alert when CPU exceeds 80%',
  severity: 2,
  scopes: [appService.resourceId],
  metricName: 'CpuPercentage',
  operator: MetricAlertOperator.GREATER_THAN,
  threshold: 80,
  timeAggregation: TimeAggregation.AVERAGE,
  actions: [{ actionGroupId: actionGroup.actionGroupId }]
});

// Enable diagnostic settings
const diagnostics = new DiagnosticSettings(resourceGroup, 'AppDiagnostics', {
  targetResourceId: appService.resourceId,
  workspace: { workspaceId: workspace.workspaceId },
  logCategories: 'all',
  enableAllMetrics: true
});
```

---

## See Also

- [Operational Insights Resources](./operationalinsights.md)
- [Web Resources](./web.md)
- [Storage Resources](./storage.md)
- [Monitoring Guides](../../../guides/monitoring.md)

---

**Last Updated**: 2025-10-09
**Version**: @atakora/cdk 1.0.0
