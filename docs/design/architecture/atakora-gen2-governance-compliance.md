# Atakora Gen 2 - Governance, Compliance & Policy Management

**Extension to**: atakora-gen2-default-backend-infrastructure.md
**Created**: 2025-10-14
**Status**: Design Phase

## Overview

This document defines the governance, compliance, and policy management strategy for Atakora Gen 2 backends. The goal is to make compliance automatic, auditing comprehensive, and governance effortless.

## Philosophy

**Compliant by Default, Auditable by Design**

Every resource should:
1. **Be properly tagged** - Automatic cost allocation and resource tracking
2. **Follow naming conventions** - Predictable, discoverable resources
3. **Have audit logging enabled** - Complete compliance trail
4. **Enforce security policies** - Deny insecure configurations
5. **Report compliance status** - Real-time dashboard

## 1. Resource Tagging Strategy

### Automatic Tags (Applied to All Resources)

```typescript
interface AutomaticTags {
  // Identity
  'atakora:project': string;           // e.g., "colorai"
  'atakora:environment': string;        // e.g., "prod", "nonprod", "dev"
  'atakora:component': string;          // e.g., "backend", "frontend"
  'atakora:managed-by': 'atakora';      // Always "atakora"
  'atakora:version': string;            // e.g., "2.0.0"

  // Organization
  'organization': string;               // e.g., "digitalproducts"
  'cost-center': string;                // e.g., "engineering"
  'business-unit': string;              // e.g., "research"

  // Lifecycle
  'created-by': string;                 // User email or service principal
  'created-date': string;               // ISO 8601 datetime
  'last-modified': string;              // ISO 8601 datetime
  'deployment-id': string;              // Unique deployment identifier

  // Technical
  'geography': string;                  // e.g., "eus2" (East US 2)
  'instance': string;                   // e.g., "06"
  'stack-name': string;                 // e.g., "Foundation"

  // Compliance
  'data-classification': string;        // e.g., "confidential", "public"
  'compliance-framework': string[];     // e.g., ["SOC2", "HIPAA"]
  'backup-required': 'true' | 'false';
  'encryption-required': 'true' | 'false';
}
```

### Tag Application in defineBackend()

```typescript
export function defineBackend(
  components: Record<string, Component>,
  options?: BackendOptions
): Backend {
  const config = loadProjectConfig();

  // Build automatic tags
  const automaticTags = {
    'atakora:project': config.project,
    'atakora:environment': config.environment,
    'atakora:component': 'backend',
    'atakora:managed-by': 'atakora',
    'atakora:version': ATAKORA_VERSION,

    'organization': config.organization,
    'cost-center': options?.governance?.costCenter ?? 'engineering',
    'business-unit': options?.governance?.businessUnit ?? 'general',

    'created-by': process.env.USER_EMAIL ?? 'system',
    'created-date': new Date().toISOString(),
    'deployment-id': generateDeploymentId(),

    'geography': config.geography,
    'instance': String(config.instance).padStart(2, '0'),

    'data-classification': options?.governance?.dataClassification ?? 'confidential',
    'compliance-framework': options?.governance?.complianceFrameworks?.join(',') ?? '',
    'backup-required': 'true',
    'encryption-required': 'true',
  };

  // Merge with user-provided tags
  const allTags = {
    ...automaticTags,
    ...options?.tags,
  };

  // Apply to all resources
  const backend = new Backend(subscriptionStack, 'backend', {
    ...options,
    tags: allTags,
  });

  return backend;
}
```

### Resource-Specific Tags

```typescript
// Function App specific tags
functionApp.tags = {
  ...baseTags,
  'resource-type': 'compute',
  'runtime': 'node:20',
  'plan': 'EP1',
};

// Cosmos DB specific tags
cosmos.tags = {
  ...baseTags,
  'resource-type': 'database',
  'database-type': 'nosql',
  'consistency-level': 'Session',
  'backup-policy': 'Continuous',
};

// Storage Account specific tags
storage.tags = {
  ...baseTags,
  'resource-type': 'storage',
  'replication': 'LRS',
  'contains-pii': 'true',  // If storing user data
};

// Key Vault specific tags
keyVault.tags = {
  ...baseTags,
  'resource-type': 'security',
  'contains-secrets': 'true',
  'soft-delete-enabled': 'true',
  'purge-protection': environment === 'prod' ? 'true' : 'false',
};
```

### Cost Allocation Tags

Special tags for financial reporting:

```typescript
interface CostAllocationTags {
  'cost-center': string;           // Finance department code
  'project-code': string;          // Project billing code
  'budget-owner': string;          // Email of budget owner
  'monthly-budget': string;        // Expected monthly cost
  'cost-category': string;         // "infrastructure" | "compute" | "storage" | "data"
  'billing-period': string;        // "monthly" | "annual"
  'chargeback': 'true' | 'false';  // Should costs be charged back to team?
}
```

### Usage Example

```typescript
const backend = defineBackend({
  feedbackApi,
  processUploadFunction,
}, {
  governance: {
    costCenter: 'ENG-001',
    businessUnit: 'AI Research',
    dataClassification: 'confidential',
    complianceFrameworks: ['SOC2', 'HIPAA'],
    budgetOwner: 'engineering-lead@company.com',
    monthlyBudget: '5000',
  },
  tags: {
    'project-code': 'AI-2024-Q4',
    'cost-category': 'infrastructure',
    'team': 'data-platform',
  },
});
```

## 2. Azure Policy Integration

### Built-In Policy Assignments

Automatically assign these policies at resource group or subscription level:

```typescript
interface PolicyAssignments {
  // Security Policies
  'require-https-storage': {
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/404c3081-a854-4457-ae30-26a93ef643f9',
    effect: 'Deny',
    description: 'Storage accounts should use HTTPS only',
  },

  'require-tls-12-minimum': {
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/fe83a0eb-a853-422d-aac2-1bffd182c5d0',
    effect: 'Deny',
    description: 'Azure resources should require TLS 1.2 or higher',
  },

  'require-managed-identity': {
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/6240d1c5-1a15-4c46-b1a4-408f1a3e5d93',
    effect: 'Audit',
    description: 'Function Apps should use managed identity',
  },

  'disable-public-network-access': {
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/34c877ad-507e-4c82-993e-3452a6e0ad3c',
    effect: environment === 'prod' ? 'Deny' : 'Audit',
    description: 'Storage accounts should disable public network access',
  },

  // Compliance Policies
  'require-resource-tags': {
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/96670d01-0a4d-4649-9c89-2d3abc0a5025',
    effect: 'Deny',
    parameters: {
      tagNames: [
        'atakora:project',
        'atakora:environment',
        'organization',
        'cost-center',
      ],
    },
    description: 'Resources must have required tags',
  },

  'require-encryption-at-rest': {
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/013e242c-8828-4970-87b3-ab247555486d',
    effect: 'Audit',
    description: 'Azure resources should have encryption at rest enabled',
  },

  'require-diagnostic-settings': {
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/7f89b1eb-583c-429a-8828-af049802c1d9',
    effect: 'AuditIfNotExists',
    parameters: {
      logAnalyticsWorkspaceId: logAnalytics.id,
    },
    description: 'Resources must send diagnostics to Log Analytics',
  },

  // Data Protection Policies
  'require-backup-enabled': {
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/013e242c-8828-4970-87b3-ab247555486d',
    effect: 'AuditIfNotExists',
    description: 'Databases should have backup enabled',
  },

  'require-soft-delete-keyvault': {
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/0b60c0b2-2dc2-4e1c-b5c9-abbed971de53',
    effect: 'Deny',
    description: 'Key Vault should have soft delete enabled',
  },

  // Cost Management Policies
  'allowed-resource-locations': {
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/e56962a6-4747-49cd-b67b-bf8b01975c4c',
    effect: 'Deny',
    parameters: {
      listOfAllowedLocations: [config.geography, 'global'],
    },
    description: 'Resources can only be created in approved locations',
  },

  'allowed-resource-types': {
    policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/a08ec900-254a-4555-9bf5-e42af04b5c5c',
    effect: 'Deny',
    parameters: {
      listOfResourceTypesAllowed: [
        'Microsoft.Web/sites',
        'Microsoft.Storage/storageAccounts',
        'Microsoft.DocumentDB/databaseAccounts',
        'Microsoft.KeyVault/vaults',
        'Microsoft.Insights/components',
        'Microsoft.OperationalInsights/workspaces',
        // ... other allowed types
      ],
    },
    description: 'Only approved resource types can be created',
  },
}
```

### Custom Policy Definitions

Create custom policies specific to your organization:

```typescript
// Custom Policy: Require atakora-managed tag
const requireAtakoraTag = {
  policyDefinitionName: 'require-atakora-managed-tag',
  displayName: 'Require atakora:managed-by tag',
  description: 'All resources managed by Atakora must have atakora:managed-by tag',
  mode: 'Indexed',

  policyRule: {
    if: {
      allOf: [
        {
          field: 'tags[atakora:managed-by]',
          exists: 'false',
        },
        {
          field: 'type',
          in: [
            'Microsoft.Web/sites',
            'Microsoft.Storage/storageAccounts',
            'Microsoft.DocumentDB/databaseAccounts',
          ],
        },
      ],
    },
    then: {
      effect: 'Deny',
    },
  },
};

// Custom Policy: Require specific naming pattern
const requireNamingConvention = {
  policyDefinitionName: 'require-naming-convention',
  displayName: 'Require naming convention for resources',
  description: 'Resources must follow naming pattern: {type}-{component}-{org}-{project}-{env}-{geo}-{instance}',
  mode: 'Indexed',

  policyRule: {
    if: {
      allOf: [
        { field: 'type', equals: 'Microsoft.Storage/storageAccounts' },
        {
          not: {
            field: 'name',
            match: 'st*[a-z0-9]{8,24}',  // Storage account naming rules
          },
        },
      ],
    },
    then: {
      effect: 'Deny',
    },
  },
};

// Custom Policy: Require private endpoints in production
const requirePrivateEndpointsInProd = {
  policyDefinitionName: 'require-private-endpoints-prod',
  displayName: 'Production resources must use private endpoints',
  description: 'Resources in production environment must have private endpoint configured',
  mode: 'Indexed',

  policyRule: {
    if: {
      allOf: [
        { field: 'tags[atakora:environment]', equals: 'prod' },
        { field: 'type', in: [
          'Microsoft.Storage/storageAccounts',
          'Microsoft.DocumentDB/databaseAccounts',
          'Microsoft.KeyVault/vaults',
        ]},
        {
          field: 'Microsoft.Network/privateEndpoints/privateLinkServiceConnections[*].privateLinkServiceId',
          exists: 'false',
        },
      ],
    },
    then: {
      effect: 'Deny',
    },
  },
};

// Custom Policy: Require Function App to have Application Insights
const requireAppInsightsForFunctions = {
  policyDefinitionName: 'require-app-insights-functions',
  displayName: 'Function Apps must have Application Insights enabled',
  description: 'All Function Apps must be connected to Application Insights',
  mode: 'Indexed',

  policyRule: {
    if: {
      allOf: [
        { field: 'type', equals: 'Microsoft.Web/sites' },
        { field: 'kind', contains: 'functionapp' },
        {
          field: 'properties.siteConfig.appSettings[?(@.name==\'APPLICATIONINSIGHTS_CONNECTION_STRING\')].value',
          exists: 'false',
        },
      ],
    },
    then: {
      effect: 'Deny',
    },
  },
};
```

### Policy Assignment in defineBackend()

```typescript
export class Backend extends Construct {
  private policyAssignments: Map<string, PolicyAssignment> = new Map();

  constructor(scope: SubscriptionStack, name: string, config: BackendConfig) {
    super(scope, name);

    // ... create resources

    // Assign policies
    if (config.governance?.enablePolicies !== false) {
      this.assignPolicies(config);
    }
  }

  private assignPolicies(config: BackendConfig) {
    const scope = this.resourceGroup.id;

    // Security policies (always enforced)
    this.assignPolicy('require-https-storage', {
      scope,
      policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/404c3081-a854-4457-ae30-26a93ef643f9',
      effect: 'Deny',
    });

    this.assignPolicy('require-tls-12-minimum', {
      scope,
      policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/fe83a0eb-a853-422d-aac2-1bffd182c5d0',
      effect: 'Deny',
    });

    // Environment-specific policies
    if (config.environment === 'prod') {
      this.assignPolicy('disable-public-network-access', {
        scope,
        policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/34c877ad-507e-4c82-993e-3452a6e0ad3c',
        effect: 'Deny',
      });

      this.assignPolicy('require-private-endpoints', {
        scope,
        policyDefinition: requirePrivateEndpointsInProd,
        effect: 'Deny',
      });
    }

    // Compliance framework specific policies
    if (config.governance?.complianceFrameworks?.includes('HIPAA')) {
      this.assignHIPAAPolicies(scope);
    }

    if (config.governance?.complianceFrameworks?.includes('SOC2')) {
      this.assignSOC2Policies(scope);
    }

    if (config.governance?.complianceFrameworks?.includes('PCI-DSS')) {
      this.assignPCIDSSPolicies(scope);
    }
  }

  private assignHIPAAPolicies(scope: string) {
    // HIPAA requires encryption at rest and in transit
    this.assignPolicy('hipaa-require-encryption', {
      scope,
      policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/013e242c-8828-4970-87b3-ab247555486d',
      effect: 'Deny',
    });

    // HIPAA requires audit logging
    this.assignPolicy('hipaa-require-audit-logging', {
      scope,
      policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/7f89b1eb-583c-429a-8828-af049802c1d9',
      effect: 'AuditIfNotExists',
    });

    // HIPAA requires backup
    this.assignPolicy('hipaa-require-backup', {
      scope,
      policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/013e242c-8828-4970-87b3-ab247555486d',
      effect: 'AuditIfNotExists',
    });
  }

  private assignSOC2Policies(scope: string) {
    // SOC2 requires access controls
    this.assignPolicy('soc2-require-rbac', {
      scope,
      policyDefinition: {
        // Custom policy to ensure RBAC is enabled
      },
      effect: 'Audit',
    });

    // SOC2 requires change tracking
    this.assignPolicy('soc2-require-change-tracking', {
      scope,
      policyDefinition: {
        // Custom policy for activity logs
      },
      effect: 'AuditIfNotExists',
    });
  }

  private assignPCIDSSPolicies(scope: string) {
    // PCI DSS requires network segmentation
    this.assignPolicy('pci-require-network-isolation', {
      scope,
      policyDefinition: requirePrivateEndpointsInProd,
      effect: 'Deny',
    });

    // PCI DSS requires strong encryption
    this.assignPolicy('pci-require-strong-encryption', {
      scope,
      policyDefinitionId: '/providers/Microsoft.Authorization/policyDefinitions/...',
      effect: 'Deny',
    });
  }
}
```

### Policy Configuration Example

```typescript
const backend = defineBackend({
  feedbackApi,
  processUploadFunction,
}, {
  governance: {
    enablePolicies: true,
    complianceFrameworks: ['SOC2', 'HIPAA'],

    policies: {
      // Override default policies
      'require-https-storage': { effect: 'Deny' },
      'disable-public-network-access': { effect: 'Audit' },  // Audit instead of deny

      // Add custom policies
      custom: [
        {
          name: 'require-cost-center-tag',
          displayName: 'Require cost-center tag',
          effect: 'Deny',
          rule: {
            if: {
              field: 'tags[cost-center]',
              exists: 'false',
            },
            then: { effect: 'Deny' },
          },
        },
      ],
    },
  },
});
```

## 3. Audit Logging & Activity Tracking

### Activity Log Collection

Every backend automatically enables Activity Log collection:

```typescript
// Send Activity Logs to Log Analytics
const activityLogSettings = new DiagnosticSetting(subscriptionStack, 'activity-logs', {
  name: 'activity-to-log-analytics',
  scope: `/subscriptions/${config.subscriptionId}`,
  workspaceId: logAnalytics.id,

  logs: [
    { category: 'Administrative', enabled: true },
    { category: 'Security', enabled: true },
    { category: 'ServiceHealth', enabled: true },
    { category: 'Alert', enabled: true },
    { category: 'Recommendation', enabled: true },
    { category: 'Policy', enabled: true },
    { category: 'Autoscale', enabled: true },
    { category: 'ResourceHealth', enabled: true },
  ],
});
```

### Resource-Level Audit Logging

Every resource sends audit logs:

```typescript
// Cosmos DB audit logs
new DiagnosticSetting(stack, 'cosmos-audit', {
  targetResourceId: cosmos.id,
  workspaceId: logAnalytics.id,

  logs: [
    { category: 'DataPlaneRequests', enabled: true },     // All CRUD operations
    { category: 'ControlPlaneRequests', enabled: true },  // Management operations
    { category: 'MongoRequests', enabled: true },
    { category: 'QueryRuntimeStatistics', enabled: true },
    { category: 'PartitionKeyStatistics', enabled: true },
  ],

  metrics: [
    { category: 'Requests', enabled: true },
  ],
});

// Storage Account audit logs
new DiagnosticSetting(stack, 'storage-audit', {
  targetResourceId: storage.id,
  workspaceId: logAnalytics.id,

  logs: [
    { category: 'StorageRead', enabled: true },
    { category: 'StorageWrite', enabled: true },
    { category: 'StorageDelete', enabled: true },
  ],

  metrics: [
    { category: 'Transaction', enabled: true },
  ],
});

// Key Vault audit logs
new DiagnosticSetting(stack, 'vault-audit', {
  targetResourceId: keyVault.id,
  workspaceId: logAnalytics.id,

  logs: [
    { category: 'AuditEvent', enabled: true },           // All access attempts
    { category: 'AzurePolicyEvaluationDetails', enabled: true },
  ],

  metrics: [
    { category: 'AllMetrics', enabled: true },
  ],
});

// Function App audit logs
new DiagnosticSetting(stack, 'function-audit', {
  targetResourceId: functionApp.id,
  workspaceId: logAnalytics.id,

  logs: [
    { category: 'FunctionAppLogs', enabled: true },
    { category: 'AppServiceHTTPLogs', enabled: true },
    { category: 'AppServiceConsoleLogs', enabled: true },
    { category: 'AppServiceAuditLogs', enabled: true },
    { category: 'AppServicePlatformLogs', enabled: true },
  ],

  metrics: [
    { category: 'AllMetrics', enabled: true },
  ],
});
```

### Audit Queries (KQL)

Pre-built queries for common audit scenarios:

```typescript
const auditQueries = {
  // Who accessed what resources?
  resourceAccess: `
    AzureActivity
    | where TimeGenerated > ago(24h)
    | where CategoryValue == "Administrative"
    | project TimeGenerated, Caller, ResourceId, OperationNameValue, ActivityStatusValue
    | order by TimeGenerated desc
  `,

  // Failed authentication attempts
  failedAuth: `
    AzureDiagnostics
    | where ResourceType == "VAULTS"
    | where ResultType == "Unauthorized"
    | project TimeGenerated, CallerIPAddress, ResourceId, ResultDescription
    | order by TimeGenerated desc
  `,

  // Database access patterns
  cosmosAccess: `
    AzureDiagnostics
    | where ResourceProvider == "MICROSOFT.DOCUMENTDB"
    | where Category == "DataPlaneRequests"
    | project TimeGenerated, OperationName, DurationMs, ResponseLength, ActivityId
    | summarize count(), avg(DurationMs) by OperationName
  `,

  // Storage access by user
  storageAccessByUser: `
    StorageBlobLogs
    | where TimeGenerated > ago(7d)
    | extend Caller = tostring(parse_json(RequesterUpn))
    | summarize Operations = count() by Caller, OperationName
    | order by Operations desc
  `,

  // Policy violations
  policyViolations: `
    AzureActivity
    | where CategoryValue == "Policy"
    | where ActivityStatusValue == "Failure"
    | project TimeGenerated, ResourceId, PolicyName = Properties.policyDefinitionName, Reason = Properties.message
    | order by TimeGenerated desc
  `,

  // Secrets access
  secretsAccess: `
    AzureDiagnostics
    | where ResourceType == "VAULTS"
    | where OperationName == "SecretGet"
    | project TimeGenerated, CallerIPAddress, ResourceId, SecretName = id_s
    | order by TimeGenerated desc
  `,

  // Resource changes
  resourceChanges: `
    AzureActivity
    | where OperationNameValue endswith "write" or OperationNameValue endswith "delete"
    | project TimeGenerated, Caller, ResourceId, OperationNameValue, Properties
    | order by TimeGenerated desc
  `,

  // Cost tracking
  costByResource: `
    AzureActivity
    | where TimeGenerated > ago(30d)
    | extend CostCenter = tostring(Tags['cost-center'])
    | extend Project = tostring(Tags['atakora:project'])
    | summarize OperationCount = count() by CostCenter, Project, ResourceType
  `,
};
```

### Automated Audit Reports

Generate compliance reports automatically:

```typescript
interface AuditReport {
  reportType: 'daily' | 'weekly' | 'monthly';
  recipients: string[];

  sections: {
    'Access Summary': {
      query: string;
      description: string;
    };
    'Policy Violations': {
      query: string;
      description: string;
    };
    'Security Incidents': {
      query: string;
      description: string;
    };
    'Resource Changes': {
      query: string;
      description: string;
    };
    'Cost Analysis': {
      query: string;
      description: string;
    };
  };
}

// Generate daily audit report
const dailyReport: AuditReport = {
  reportType: 'daily',
  recipients: ['security@company.com', 'compliance@company.com'],

  sections: {
    'Access Summary': {
      query: auditQueries.resourceAccess,
      description: 'All resource access in the last 24 hours',
    },
    'Policy Violations': {
      query: auditQueries.policyViolations,
      description: 'Any policy violations that occurred',
    },
    'Security Incidents': {
      query: auditQueries.failedAuth,
      description: 'Failed authentication attempts',
    },
    'Resource Changes': {
      query: auditQueries.resourceChanges,
      description: 'All create/update/delete operations',
    },
    'Cost Analysis': {
      query: auditQueries.costByResource,
      description: 'Resource usage by cost center',
    },
  },
};
```

## 4. Compliance Frameworks

### SOC 2 Compliance

```typescript
const soc2Requirements = {
  'CC6.1 - Logical and Physical Access Controls': [
    'require-rbac',
    'require-managed-identity',
    'require-private-endpoints',
    'disable-public-network-access',
  ],

  'CC6.6 - Encryption': [
    'require-encryption-at-rest',
    'require-tls-12-minimum',
    'require-https-storage',
  ],

  'CC7.2 - Change Management': [
    'require-diagnostic-settings',
    'activity-log-retention',
    'audit-resource-changes',
  ],

  'CC7.3 - Quality Assurance': [
    'require-backup-enabled',
    'require-soft-delete-keyvault',
    'continuous-backup-cosmos',
  ],
};
```

### HIPAA Compliance

```typescript
const hipaaRequirements = {
  '164.308(a)(1) - Security Management Process': [
    'risk-assessment-enabled',
    'security-alerts-configured',
    'audit-logging-enabled',
  ],

  '164.308(a)(3) - Workforce Security': [
    'require-rbac',
    'require-mfa',
    'access-reviews-enabled',
  ],

  '164.308(a)(4) - Information Access Management': [
    'require-managed-identity',
    'least-privilege-rbac',
    'access-audit-logs',
  ],

  '164.310(d) - Device and Media Controls': [
    'require-encryption-at-rest',
    'require-backup-enabled',
    'secure-data-disposal',
  ],

  '164.312(a) - Access Control': [
    'require-authentication',
    'unique-user-identification',
    'automatic-logoff',
  ],

  '164.312(c) - Integrity': [
    'require-audit-logging',
    'data-integrity-checks',
  ],

  '164.312(e) - Transmission Security': [
    'require-tls-12-minimum',
    'require-https-storage',
    'encrypted-data-transmission',
  ],
};
```

### PCI DSS Compliance

```typescript
const pciDssRequirements = {
  'Requirement 1 - Network Security': [
    'require-network-isolation',
    'require-private-endpoints',
    'network-segmentation',
  ],

  'Requirement 2 - Secure Configuration': [
    'disable-default-accounts',
    'require-secure-configuration',
    'remove-unnecessary-services',
  ],

  'Requirement 3 - Data Protection': [
    'require-encryption-at-rest',
    'mask-sensitive-data',
    'secure-key-management',
  ],

  'Requirement 4 - Encryption in Transit': [
    'require-tls-12-minimum',
    'require-https-storage',
    'strong-cryptography',
  ],

  'Requirement 10 - Logging and Monitoring': [
    'require-audit-logging',
    'log-retention-90-days',
    'log-integrity-protection',
  ],
};
```

### Compliance Dashboard

```typescript
interface ComplianceDashboard {
  framework: 'SOC2' | 'HIPAA' | 'PCI-DSS';
  overallCompliance: number;  // Percentage

  controls: Array<{
    id: string;
    name: string;
    status: 'compliant' | 'non-compliant' | 'partial';
    policies: string[];
    lastChecked: Date;
  }>;

  findings: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    control: string;
    resource: string;
    issue: string;
    remediation: string;
  }>;
}

// Generate compliance dashboard
function generateComplianceDashboard(
  framework: 'SOC2' | 'HIPAA' | 'PCI-DSS'
): ComplianceDashboard {
  // Query policy compliance state
  // Query resource configurations
  // Generate compliance score
  // Identify non-compliant resources
  // Return dashboard data
}
```

## 5. Implementation in defineBackend()

### Full Example with Governance

```typescript
const backend = defineBackend({
  feedbackApi,
  labDatasetApi,
  processUploadFunction,
}, {
  // Governance configuration
  governance: {
    // Tagging
    costCenter: 'ENG-001',
    businessUnit: 'AI Research',
    budgetOwner: 'engineering-lead@company.com',
    monthlyBudget: '5000',

    // Classification
    dataClassification: 'confidential',
    containsPII: true,
    containsPHI: false,  // Protected Health Information
    containsPCI: false,  // Payment Card Information

    // Compliance
    complianceFrameworks: ['SOC2', 'HIPAA'],

    // Policy enforcement
    enablePolicies: true,
    policyMode: environment === 'prod' ? 'enforce' : 'audit',

    policies: {
      // Security policies (always enforced)
      'require-https-storage': { effect: 'Deny' },
      'require-tls-12-minimum': { effect: 'Deny' },
      'require-managed-identity': { effect: 'Audit' },

      // Environment-specific
      'disable-public-network-access': {
        effect: environment === 'prod' ? 'Deny' : 'Audit',
      },

      // Custom policies
      custom: [
        {
          name: 'require-project-tag',
          effect: 'Deny',
          rule: {
            if: { field: 'tags[atakora:project]', exists: 'false' },
            then: { effect: 'Deny' },
          },
        },
      ],
    },

    // Audit & reporting
    audit: {
      retentionDays: environment === 'prod' ? 365 : 90,
      enableActivityLog: true,
      enableResourceLog: true,

      reports: [
        {
          name: 'daily-access-report',
          schedule: 'daily',
          recipients: ['security@company.com'],
        },
        {
          name: 'weekly-compliance-report',
          schedule: 'weekly',
          recipients: ['compliance@company.com'],
        },
      ],
    },
  },

  // Additional tags
  tags: {
    'project-code': 'AI-2024-Q4',
    'team': 'data-platform',
    'approval-id': 'JIRA-1234',
  },
});
```

## 6. Compliance Monitoring

### Real-Time Compliance Dashboard

```typescript
// Azure Portal Dashboard (JSON)
const complianceDashboard = {
  name: `${project}-compliance-dashboard`,
  location: geography,

  tiles: [
    {
      name: 'Policy Compliance',
      type: 'Extension/Microsoft_Azure_Policy/PartType/PolicyCompliancePart',
      scope: `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}`,
    },
    {
      name: 'Activity Log Insights',
      type: 'Extension/Microsoft_OperationsManagementSuite/PartType/LogsDashboardPart',
      query: auditQueries.resourceAccess,
    },
    {
      name: 'Security Alerts',
      type: 'Extension/Microsoft_Azure_Security/PartType/SecurityAlertsPart',
    },
    {
      name: 'Cost by Cost Center',
      type: 'Extension/Microsoft_Azure_CostManagement/PartType/CostAnalysisPart',
      groupBy: 'tags/cost-center',
    },
  ],
};
```

## Summary

**Governance by Default:**

1. ✅ **Automatic Tagging**
   - Identity (project, environment, component)
   - Organization (cost-center, business-unit)
   - Lifecycle (created-by, created-date, deployment-id)
   - Compliance (data-classification, frameworks)

2. ✅ **Policy Enforcement**
   - Built-in Azure policies for security
   - Custom policies for organization standards
   - Framework-specific policies (SOC2, HIPAA, PCI DSS)
   - Environment-specific enforcement (audit in dev, deny in prod)

3. ✅ **Comprehensive Audit Logging**
   - Activity logs for all Azure operations
   - Resource-specific diagnostic logs
   - Retention based on compliance requirements
   - Pre-built KQL queries for common audits

4. ✅ **Compliance Frameworks**
   - SOC 2 Type II
   - HIPAA
   - PCI DSS
   - Automated compliance checking
   - Real-time compliance dashboards

5. ✅ **Cost Management**
   - Cost allocation tags
   - Budget owner tracking
   - Cost-center reporting
   - Monthly budget alerts

**Configuration is declarative, enforcement is automatic, compliance is continuous.**

---

**Next Steps:**
1. Review governance requirements for your organization
2. Identify compliance frameworks needed
3. Customize policy assignments
4. Set up automated reporting
