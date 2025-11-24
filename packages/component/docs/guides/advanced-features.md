# Advanced Features Guide

This guide covers advanced features and patterns for production deployments including Government Cloud support, multi-region architectures, synthesis customization, and advanced authentication scenarios.

## Table of Contents

- [Government Cloud Deployment](#government-cloud-deployment)
- [Multi-Region Architecture](#multi-region-architecture)
- [Linked Templates](#linked-templates)
- [Synthesis Customization](#synthesis-customization)
- [Advanced Authentication](#advanced-authentication)
- [Performance Optimization](#performance-optimization)
- [Security Best Practices](#security-best-practices)

## Government Cloud Deployment

### Overview

Azure Government Cloud provides FedRAMP, DoD IL2-IL5, and ITAR compliance. Atakora Component fully supports Government Cloud deployments with automatic environment detection and compliance features.

### Environment Detection

```typescript
import { defineBackend, detectEnvironment } from '@atakora/component/backend';

// Automatic detection
const env = detectEnvironment();
console.log(env); // 'govcloud' if AZURE_ENVIRONMENT=AzureUSGovernment

export const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'secure-app',
    environment: env, // Auto-detected or explicit
    region: 'usgovvirginia', // Gov Cloud regions
  },
});
```

### Government Cloud Regions

Available regions:

- `usgovvirginia` - US Gov Virginia
- `usgovtexas` - US Gov Texas
- `usgovarizona` - US Gov Arizona
- `usdodeast` - US DoD East
- `usdodcentral` - US DoD Central

```typescript
export const backend = defineBackend({
  settings: {
    environment: 'govcloud',
    region: 'usgovvirginia',

    // Gov Cloud specific settings
    compliance: {
      fedramp: 'high',
      dod: 'IL4',
      itar: true,
    },

    // Audit requirements
    features: {
      auditLogging: true, // Required for compliance
      dataResidency: true, // Keep data in region
      encryptionAtRest: true,
      encryptionInTransit: true,
    },
  },
});
```

### Compliance Features

#### Audit Logging

```typescript
import { defineBackend } from '@atakora/component/backend';

export const backend = defineBackend({
  settings: {
    features: {
      auditLogging: true,
    },

    audit: {
      // What to log
      logDataAccess: true,
      logDataModifications: true,
      logAuthentication: true,
      logAuthorization: true,

      // Where to send logs
      destinations: [
        {
          type: 'logAnalytics',
          workspaceId: process.env.LOG_ANALYTICS_WORKSPACE_ID,
          retentionDays: 365, // 1 year minimum for compliance
        },
        {
          type: 'storageAccount',
          accountName: 'auditlogs',
          containerName: 'compliance',
          immutable: true, // Write-once-read-many
        },
      ],

      // Log format
      format: {
        includeUserContext: true,
        includeResourceTags: true,
        includeNetworkInfo: true,
        piiMasking: true, // Mask PII in logs
      },
    },
  },
});
```

#### Data Residency

```typescript
export const backend = defineBackend({
  settings: {
    dataResidency: {
      // Primary region
      primaryRegion: 'usgovvirginia',

      // Failover region (must be in same geography)
      failoverRegion: 'usgovtexas',

      // Prevent data from leaving region
      allowCrossRegion: false,

      // Backup location
      backupRegion: 'usgovvirginia',
      backupRetention: 2555, // 7 years
    },
  },
});
```

#### Network Isolation

```typescript
export const backend = defineBackend({
  settings: {
    network: {
      // Deploy in VNet
      virtualNetwork: {
        addressSpace: '10.0.0.0/16',
        subnets: {
          functions: '10.0.1.0/24',
          database: '10.0.2.0/24',
          privateEndpoints: '10.0.3.0/24',
        },
      },

      // Private endpoints for Azure services
      privateEndpoints: {
        cosmos: true,
        storage: true,
        keyVault: true,
      },

      // Service endpoints
      serviceEndpoints: [
        'Microsoft.Storage',
        'Microsoft.AzureCosmosDB',
        'Microsoft.KeyVault',
      ],

      // Network security
      networkSecurityGroup: {
        allowInternet: false,
        allowedSources: ['10.0.0.0/8'], // Internal only
        allowedPorts: [443], // HTTPS only
      },
    },
  },
});
```

### Gov Cloud Differences

Key differences from commercial cloud:

1. **Limited Services**: Some Azure services unavailable in Gov Cloud
2. **Different Endpoints**: Authentication and resource endpoints differ
3. **Compliance Requirements**: Additional audit and encryption requirements
4. **Region Restrictions**: Limited regions and data residency requirements

```typescript
import { getEnvironmentDefaults } from '@atakora/component/backend';

const defaults = getEnvironmentDefaults('govcloud');

console.log(defaults);
// {
//   authEndpoint: 'login.microsoftonline.us',
//   resourceManagerEndpoint: 'management.usgovcloudapi.net',
//   encryptionRequired: true,
//   auditRequired: true,
//   dataResidencyRequired: true,
// }
```

## Multi-Region Architecture

### Overview

Deploy your backend across multiple Azure regions for high availability, disaster recovery, and geographic distribution.

### Active-Passive Configuration

```typescript
import { defineBackend } from '@atakora/component/backend';

export const backend = defineBackend({
  settings: {
    multiRegion: {
      enabled: true,
      mode: 'active-passive',

      regions: [
        {
          name: 'eastus',
          role: 'primary',
          weight: 100, // 100% traffic
        },
        {
          name: 'westus',
          role: 'passive',
          weight: 0, // Standby
        },
      ],

      // Replication settings
      replication: {
        mode: 'async', // Async replication for passive
        rpo: 3600, // Recovery Point Objective: 1 hour
        rto: 1800, // Recovery Time Objective: 30 minutes
      },

      // Automatic failover
      failover: {
        automatic: true,
        healthCheckInterval: 60, // Check every minute
        healthCheckTimeout: 10, // 10 second timeout
        failoverThreshold: 3, // Fail after 3 failures
      },
    },
  },
});
```

### Active-Active Configuration

```typescript
export const backend = defineBackend({
  settings: {
    multiRegion: {
      enabled: true,
      mode: 'active-active',

      regions: [
        {
          name: 'eastus',
          role: 'primary',
          weight: 50, // 50% traffic
        },
        {
          name: 'westus',
          role: 'primary',
          weight: 50, // 50% traffic
        },
      ],

      // Synchronous replication
      replication: {
        mode: 'sync', // Strong consistency
        conflictResolution: 'last-write-wins',
      },

      // Load balancing
      loadBalancing: {
        method: 'geographic', // Route to nearest region
        sessionAffinity: true, // Stick users to region
        healthChecks: true,
      },
    },
  },
});
```

### Multi-Region with Azure Front Door

```typescript
export const backend = defineBackend({
  settings: {
    multiRegion: {
      enabled: true,

      // Azure Front Door for global load balancing
      frontDoor: {
        enabled: true,
        name: 'my-app-fd',

        // WAF protection
        waf: {
          enabled: true,
          mode: 'Prevention',
          ruleSet: 'DefaultRuleSet',
        },

        // Routing rules
        routingRules: [
          {
            name: 'api-routing',
            patterns: ['/api/*'],
            forwardingProtocol: 'HttpsOnly',
            cacheEnabled: false, // Don't cache API responses
          },
        ],

        // Backend pools
        backendPools: [
          {
            name: 'eastus-pool',
            backends: ['eastus-functions'],
            priority: 1,
          },
          {
            name: 'westus-pool',
            backends: ['westus-functions'],
            priority: 2,
          },
        ],
      },
    },
  },
});
```

### Data Consistency

```typescript
export const backend = defineBackend({
  schema,
  settings: {
    multiRegion: {
      enabled: true,

      // Cosmos DB multi-region configuration
      database: {
        // Consistency levels
        defaultConsistency: 'Session', // Default
        // Options: Strong, BoundedStaleness, Session, ConsistentPrefix, Eventual

        // Per-model consistency override
        modelConsistency: {
          User: 'Strong', // Critical data
          AuditLog: 'Eventual', // Can be eventually consistent
          Session: 'Session', // User session data
        },

        // Read regions
        readRegions: ['eastus', 'westus', 'northeurope'],

        // Write regions (multi-master)
        writeRegions: ['eastus', 'westus'],
        multiMaster: true,

        // Conflict resolution
        conflictResolution: {
          mode: 'LastWriterWins',
          conflictResolutionPath: '/_ts', // Use timestamp
        },
      },
    },
  },
});
```

### Geographic Routing

```typescript
export const backend = defineBackend({
  settings: {
    multiRegion: {
      enabled: true,

      // Traffic manager profile
      trafficManager: {
        enabled: true,
        routingMethod: 'Geographic',

        // Geographic endpoints
        endpoints: [
          {
            name: 'north-america',
            region: 'eastus',
            geoMapping: ['US', 'CA', 'MX'],
          },
          {
            name: 'europe',
            region: 'westeurope',
            geoMapping: ['GB', 'FR', 'DE', 'IT'],
          },
          {
            name: 'asia-pacific',
            region: 'eastasia',
            geoMapping: ['JP', 'CN', 'AU', 'IN'],
          },
        ],
      },
    },
  },
});
```

## Linked Templates

### Overview

For complex deployments, use linked ARM templates to organize infrastructure into modular components.

### Basic Linked Templates

```typescript
import { defineBackend } from '@atakora/component/backend';

export const backend = defineBackend({
  settings: {
    synthesis: {
      linkedTemplates: {
        enabled: true,

        // Storage account for templates
        storageAccount: {
          name: 'templatessa',
          containerName: 'templates',
          public: false, // Use SAS tokens
        },

        // Split deployment
        templates: {
          // Shared infrastructure
          shared: {
            resources: ['virtualNetwork', 'keyVault', 'logAnalytics'],
            dependsOn: [],
          },

          // Data layer
          data: {
            resources: ['cosmosDb', 'storageAccounts'],
            dependsOn: ['shared'],
          },

          // Compute layer
          compute: {
            resources: ['functionApps', 'appServicePlans'],
            dependsOn: ['shared', 'data'],
          },

          // Monitoring
          monitoring: {
            resources: ['applicationInsights', 'alerts'],
            dependsOn: ['compute'],
          },
        },
      },
    },
  },
});
```

### Advanced Template Organization

```typescript
export const backend = defineBackend({
  settings: {
    synthesis: {
      linkedTemplates: {
        enabled: true,

        // Organize by environment
        perEnvironment: {
          development: {
            templates: ['shared', 'data', 'compute'],
            skipMonitoring: true, // No monitoring in dev
          },
          staging: {
            templates: ['shared', 'data', 'compute', 'monitoring'],
          },
          production: {
            templates: ['shared', 'data', 'compute', 'monitoring', 'security'],
            validateBeforeDeploy: true,
          },
        },

        // Template parameters
        parameters: {
          shared: ['environment', 'location'],
          data: ['environment', 'consistencyLevel'],
          compute: ['environment', 'skuName', 'scalingRules'],
        },

        // Output sharing between templates
        outputs: {
          shared: ['vnetId', 'keyVaultId'],
          data: ['cosmosEndpoint', 'cosmosKey'],
        },
      },
    },
  },
});
```

## Synthesis Customization

### Overview

Customize the infrastructure synthesis process to fit your organization's requirements.

### Custom Resource Naming

```typescript
import { defineBackend } from '@atakora/component/backend';

export const backend = defineBackend({
  settings: {
    synthesis: {
      resourceNaming: {
        // Naming convention
        convention: (resource, environment) => {
          const prefix = 'myorg';
          const env = environment.substring(0, 3); // dev, stg, prd
          const location = 'eus'; // eastus
          const suffix = Date.now().toString().substring(8); // timestamp

          return `${prefix}-${resource.type}-${env}-${location}-${suffix}`;
        },

        // Override specific resources
        overrides: {
          cosmosDb: 'myorg-cosmos-primary',
          functionApp: (env) => `myorg-func-${env}`,
        },

        // Validation
        validate: (name) => {
          // Must match organizational policy
          return /^myorg-[a-z]+-[a-z]{3}-[a-z]{3}-[0-9]+$/.test(name);
        },
      },
    },
  },
});
```

### Custom Tags

```typescript
export const backend = defineBackend({
  settings: {
    synthesis: {
      tags: {
        // Standard tags
        global: {
          Organization: 'MyOrganization',
          ManagedBy: 'Atakora',
          CostCenter: '1234',
        },

        // Per environment
        perEnvironment: {
          development: {
            Environment: 'Development',
            AutoShutdown: 'true',
          },
          production: {
            Environment: 'Production',
            HighAvailability: 'true',
            BackupEnabled: 'true',
          },
        },

        // Per resource type
        perResourceType: {
          cosmos: {
            DataClassification: 'Confidential',
            Compliance: 'PCI-DSS',
          },
          functionApp: {
            ApplicationTier: 'API',
          },
        },

        // Dynamic tags
        computed: (resource, context) => ({
          DeployedAt: new Date().toISOString(),
          DeployedBy: context.user,
          Version: context.version,
        }),
      },
    },
  },
});
```

### Deployment Hooks

```typescript
export const backend = defineBackend({
  settings: {
    synthesis: {
      hooks: {
        // Before synthesis
        beforeSynthesis: async (context) => {
          console.log('Validating configuration...');
          // Validate settings, check prerequisites
        },

        // After synthesis
        afterSynthesis: async (template, context) => {
          console.log('Generated template:', template);
          // Save template, run validation, send notifications
        },

        // Before deployment
        beforeDeployment: async (context) => {
          // Pre-deployment checks
          // Database backups, etc.
        },

        // After deployment
        afterDeployment: async (outputs, context) => {
          console.log('Deployment outputs:', outputs);
          // Post-deployment tasks
          // Update DNS, configure monitoring
        },

        // On error
        onError: async (error, context) => {
          console.error('Deployment failed:', error);
          // Rollback, notifications, cleanup
        },
      },
    },
  },
});
```

### Template Validation

```typescript
export const backend = defineBackend({
  settings: {
    synthesis: {
      validation: {
        // Pre-deployment validation
        enabled: true,

        rules: [
          {
            name: 'cost-validation',
            validate: async (template) => {
              // Estimate costs
              const cost = await estimateCost(template);
              if (cost > 1000) {
                throw new Error(`Cost too high: $${cost}/month`);
              }
            },
          },
          {
            name: 'security-validation',
            validate: async (template) => {
              // Security checks
              const issues = await scanSecurity(template);
              if (issues.critical > 0) {
                throw new Error(`${issues.critical} critical security issues`);
              }
            },
          },
          {
            name: 'compliance-validation',
            validate: async (template) => {
              // Compliance checks
              const compliant = await checkCompliance(template);
              if (!compliant) {
                throw new Error('Template not compliant');
              }
            },
          },
        ],

        // Warnings (non-blocking)
        warnings: [
          {
            name: 'best-practices',
            check: (template) => {
              // Check best practices
              return checkBestPractices(template);
            },
          },
        ],
      },
    },
  },
});
```

## Advanced Authentication

### Multi-Factor Authentication

```typescript
import { defineAuth, auth } from '@atakora/component/auth';

export const authentication = defineAuth({
  Primary: auth.entra()
    .tenantId(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .mfa({
      enabled: true,
      required: true, // Require MFA for all users

      // Per-role MFA requirements
      requireForRoles: ['admin', 'auditor'],

      // Trusted devices
      trustedDevices: {
        enabled: true,
        trustDuration: 2592000, // 30 days
      },

      // MFA methods
      methods: ['phone', 'authenticator', 'email'],

      // Step-up authentication for sensitive operations
      stepUp: {
        operations: ['deleteUser', 'changeRoles', 'exportData'],
        validity: 900, // Re-auth required after 15 min
      },
    }),
});
```

### Session Management

```typescript
export const authentication = defineAuth({
  Primary: auth.entra()
    .tenantId(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .session({
      // Session configuration
      enabled: true,
      maxAge: 28800, // 8 hours
      renewalWindow: 3600, // Renew 1 hour before expiry

      // Session storage
      storage: {
        type: 'redis',
        connectionString: process.env.REDIS_CONNECTION_STRING,
        keyPrefix: 'session:',
      },

      // Concurrent sessions
      maxConcurrentSessions: 3,
      terminateOldest: true,

      // Session invalidation
      invalidateOn: {
        passwordChange: true,
        roleChange: true,
        logout: true,
      },

      // Activity tracking
      trackActivity: true,
      idleTimeout: 1800, // 30 minutes
    }),
});
```

### Custom Authentication Provider

```typescript
import { defineAuth, auth } from '@atakora/component/auth';

export const authentication = defineAuth({
  // Custom provider
  Custom: auth.custom({
    name: 'internal-auth',

    // Token validation
    validate: async (token: string) => {
      // Custom validation logic
      const decoded = await verifyInternalToken(token);

      return {
        userId: decoded.sub,
        email: decoded.email,
        roles: decoded.roles,
        claims: decoded.claims,
      };
    },

    // Token refresh
    refresh: async (refreshToken: string) => {
      // Get new access token
      const tokens = await refreshInternalToken(refreshToken);

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      };
    },

    // Logout
    revoke: async (token: string) => {
      // Revoke token
      await revokeInternalToken(token);
    },
  }),
});
```

### Federated Authentication

```typescript
export const authentication = defineAuth({
  // Multiple providers
  EntraID: auth.entra()
    .tenantId(process.env.AZURE_TENANT_ID!)
    .clientId(process.env.AZURE_CLIENT_ID!)
    .primary(),

  Google: auth.custom({
    name: 'google',
    validate: async (token) => {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      return {
        userId: payload.sub,
        email: payload.email,
        roles: ['user'],
      };
    },
  }),

  GitHub: auth.custom({
    name: 'github',
    validate: async (token) => {
      const user = await octokit.users.getAuthenticated({
        headers: { authorization: `token ${token}` },
      });
      return {
        userId: user.data.id.toString(),
        email: user.data.email,
        roles: ['user'],
      };
    },
  }),
});
```

## Performance Optimization

### Caching Strategy

```typescript
export const backend = defineBackend({
  settings: {
    performance: {
      caching: {
        enabled: true,

        // Redis cache
        redis: {
          connectionString: process.env.REDIS_CONNECTION_STRING,
          database: 0,
          keyPrefix: 'cache:',
        },

        // Cache policies
        policies: {
          // Model-level caching
          User: {
            ttl: 3600, // 1 hour
            strategy: 'read-through',
          },
          Project: {
            ttl: 1800, // 30 minutes
            strategy: 'write-through',
          },

          // Query caching
          queries: {
            enabled: true,
            ttl: 300, // 5 minutes
            maxSize: 1000, // Max cached queries
          },
        },

        // Cache invalidation
        invalidation: {
          onUpdate: true,
          onDelete: true,
          cascadeDeletes: true, // Invalidate related items
        },
      },
    },
  },
});
```

### Connection Pooling

```typescript
export const backend = defineBackend({
  settings: {
    performance: {
      database: {
        // Cosmos DB connection pooling
        connectionPool: {
          minSize: 10,
          maxSize: 100,
          maxIdleTime: 60000, // 1 minute
          connectionTimeout: 5000, // 5 seconds
        },

        // Request batching
        batching: {
          enabled: true,
          maxBatchSize: 100,
          maxWaitTime: 10, // 10ms
        },
      },
    },
  },
});
```

### Query Optimization

```typescript
export const backend = defineBackend({
  schema,
  settings: {
    performance: {
      database: {
        // Indexing
        indexing: {
          automatic: true,

          // Model-specific indexes
          indexes: {
            Task: [
              { fields: ['projectId'], type: 'range' },
              { fields: ['assigneeId', 'status'], type: 'composite' },
              { fields: ['dueDate'], type: 'range' },
            ],
            Project: [
              { fields: ['ownerId'], type: 'range' },
              { fields: ['status', 'createdAt'], type: 'composite' },
            ],
          },

          // Excluded paths (don't index)
          excludedPaths: [
            '/description/*',
            '/_attachments/*',
          ],
        },

        // Query hints
        queryHints: {
          maxItemCount: 100, // Page size
          enableCrossPartition: false, // Avoid cross-partition queries
          populateQueryMetrics: true,
        },
      },
    },
  },
});
```

## Security Best Practices

### Secrets Management

```typescript
export const backend = defineBackend({
  settings: {
    security: {
      keyVault: {
        enabled: true,
        name: 'my-app-kv',

        // Secrets to store
        secrets: [
          'cosmosConnectionString',
          'redisConnectionString',
          'apiKeys',
          'encryptionKeys',
        ],

        // Access policies
        accessPolicies: [
          {
            objectId: process.env.FUNCTION_APP_IDENTITY_ID,
            permissions: {
              secrets: ['get', 'list'],
            },
          },
        ],

        // Rotation
        rotation: {
          enabled: true,
          schedule: '0 0 1 * *', // Monthly
          notifyBefore: 604800, // 7 days
        },
      },
    },
  },
});
```

### Encryption

```typescript
export const backend = defineBackend({
  settings: {
    security: {
      encryption: {
        // At rest
        atRest: {
          enabled: true,
          keyVaultKeyId: process.env.ENCRYPTION_KEY_ID,
          algorithm: 'RSA-OAEP',
        },

        // In transit
        inTransit: {
          enforceHttps: true,
          tlsVersion: '1.2',
          cipherSuites: [
            'TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384',
            'TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256',
          ],
        },

        // Field-level encryption
        fieldEncryption: {
          enabled: true,
          fields: {
            User: ['email', 'phoneNumber'],
            Project: ['description'],
          },
        },
      },
    },
  },
});
```

### Network Security

```typescript
export const backend = defineBackend({
  settings: {
    security: {
      network: {
        // IP restrictions
        ipRestrictions: {
          enabled: true,
          allowedRanges: [
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
          ],
          denyByDefault: true,
        },

        // DDoS protection
        ddosProtection: {
          enabled: true,
          tier: 'Standard',
        },

        // WAF rules
        waf: {
          enabled: true,
          mode: 'Prevention',
          ruleSet: 'OWASP_3.2',
          customRules: [
            {
              name: 'RateLimitRule',
              priority: 1,
              ruleType: 'RateLimitRule',
              rateLimitThreshold: 100,
              rateLimitDuration: 60,
            },
          ],
        },
      },
    },
  },
});
```

## Summary

This guide covered advanced features for production deployments:

- ✅ Government Cloud deployment with compliance
- ✅ Multi-region architectures (active-passive, active-active)
- ✅ Linked templates for complex deployments
- ✅ Synthesis customization (naming, tags, hooks)
- ✅ Advanced authentication (MFA, sessions, federation)
- ✅ Performance optimization (caching, pooling, queries)
- ✅ Security best practices (secrets, encryption, network)

## Next Steps

- [System Architecture](../architecture/system-architecture.md) - Understand the architecture
- [Troubleshooting](./troubleshooting.md) - Common issues and solutions
- [Complete API Reference](../api/complete-api-reference.md) - Full API documentation
