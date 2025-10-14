# Artifact Storage Strategy

## Overview

This document defines the comprehensive storage strategy for ARM templates and function packages in the linked templates architecture. The strategy covers storage account provisioning, structure, security, lifecycle management, and performance optimization.

## Storage Architecture

### Storage Account Design

```
┌────────────────────────────────────────────────┐
│           Storage Account                       │
│      Name: st{project}{env}{uniqueid}          │
│                                                │
├────────────────────────────────────────────────┤
│ Containers:                                    │
│                                                │
│ /deployments/         (Private)                │
│   ├── active/         Current deployments      │
│   ├── archive/        Historical deployments   │
│   └── staging/        Pre-deployment validation│
│                                                │
│ /templates/           (Private)                │
│   └── {deployment-id}/                        │
│       ├── root.json                           │
│       ├── foundation-*.json                   │
│       ├── compute-*.json                      │
│       └── configuration-*.json                │
│                                                │
│ /packages/            (Private)                │
│   └── {deployment-id}/                        │
│       ├── func-app-1.zip                      │
│       └── func-app-2.zip                      │
│                                                │
│ /artifacts/           (Private)                │
│   └── shared/         Shared dependencies     │
└────────────────────────────────────────────────┘
```

### Naming Conventions

#### Storage Account Naming
```typescript
interface StorageAccountNaming {
  // Pattern: st{project}{environment}{uniqueid}
  // Max 24 characters, lowercase alphanumeric only
  pattern: RegExp = /^st[a-z0-9]{3,22}$/;

  examples: {
    production: 'statkoraprd7h8j9k2m';
    staging: 'statkorastg3n4m5p6q';
    development: 'statkoradev1a2b3c4d';
  };

  generate(project: string, environment: string): string {
    const prefix = 'st';
    const proj = project.substring(0, 6).toLowerCase();
    const env = environment.substring(0, 3).toLowerCase();
    const unique = this.generateUniqueId(8);
    return `${prefix}${proj}${env}${unique}`;
  }
}
```

#### Deployment ID Generation
```typescript
interface DeploymentIdStrategy {
  // Pattern: deploy-{timestamp}-{hash}
  pattern: 'deploy-YYYYMMDD-HHmmss-{hash6}';

  generate(): string {
    const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
    const hash = crypto.randomBytes(3).toString('hex');
    return `deploy-${timestamp}-${hash}`;
  }

  examples: [
    'deploy-20240315-143022-a1b2c3',
    'deploy-20240315-143156-d4e5f6'
  ];
}
```

## Storage Provisioning

### Automatic Provisioning

```typescript
class StorageProvisioner {
  async provision(config: StorageConfig): Promise<StorageAccount> {
    // Check if storage account exists
    const existing = await this.findExisting(config);
    if (existing) {
      return this.validateAndUpdate(existing, config);
    }

    // Create new storage account
    const storageAccount = await this.create({
      name: this.generateName(config),
      location: config.location,
      sku: {
        name: 'Standard_LRS',  // Locally redundant by default
        tier: 'Standard'
      },
      kind: 'StorageV2',
      properties: {
        supportsHttpsTrafficOnly: true,
        minimumTlsVersion: 'TLS1_2',
        allowBlobPublicAccess: false,  // No public access
        networkAcls: {
          defaultAction: 'Deny',
          bypass: 'AzureServices',
          virtualNetworkRules: [],
          ipRules: config.allowedIPs || []
        }
      },
      tags: {
        'atakora-version': '2.0.0',
        'atakora-purpose': 'deployment-artifacts',
        'atakora-project': config.project,
        'atakora-environment': config.environment
      }
    });

    // Create required containers
    await this.createContainers(storageAccount);

    // Configure lifecycle management
    await this.configureLifecycle(storageAccount);

    return storageAccount;
  }

  private async createContainers(account: StorageAccount): Promise<void> {
    const containers = [
      { name: 'deployments', publicAccess: 'None' },
      { name: 'templates', publicAccess: 'None' },
      { name: 'packages', publicAccess: 'None' },
      { name: 'artifacts', publicAccess: 'None' }
    ];

    for (const container of containers) {
      await this.createContainer(account, container);
    }
  }
}
```

### Storage Configuration

```typescript
interface StorageConfiguration {
  // Performance tier
  performance: {
    tier: 'Standard' | 'Premium';
    replication: 'LRS' | 'ZRS' | 'GRS' | 'RAGRS';
    accessTier: 'Hot' | 'Cool' | 'Archive';
  };

  // Security settings
  security: {
    httpsOnly: true;
    minimumTlsVersion: 'TLS1_2';
    publicAccess: false;
    networkRestrictions: 'Private' | 'Restricted' | 'Open';
    encryption: {
      services: ['blob', 'file'];
      keySource: 'Microsoft.Storage';  // or Microsoft.Keyvault
    };
  };

  // Lifecycle management
  lifecycle: {
    templates: {
      tierToCoolAfterDays: 30;
      tierToArchiveAfterDays: 90;
      deleteAfterDays: 365;
    };
    packages: {
      tierToCoolAfterDays: 7;
      tierToArchiveAfterDays: 30;
      deleteAfterDays: 180;
    };
  };

  // Monitoring
  monitoring: {
    diagnosticSettings: true;
    metrics: true;
    logging: {
      read: true;
      write: true;
      delete: true;
    };
  };
}
```

## Artifact Organization

### Directory Structure

```typescript
interface ArtifactStructure {
  templates: {
    path: '/templates/{deployment-id}/';
    files: {
      'root.json': RootTemplate;
      'foundation-{index}.json': FoundationTemplate[];
      'compute-{index}.json': ComputeTemplate[];
      'application-{index}.json': ApplicationTemplate[];
      'configuration-{index}.json': ConfigurationTemplate[];
      'parameters.json': ParameterFile;
      'manifest.json': TemplateManifest;
    };
  };

  packages: {
    path: '/packages/{deployment-id}/';
    files: {
      '{function-app-name}.zip': FunctionPackage;
      '{function-app-name}.checksum': string;
      'dependencies.zip': SharedDependencies;
    };
  };

  metadata: {
    path: '/deployments/{deployment-id}/';
    files: {
      'deployment.json': DeploymentMetadata;
      'status.json': DeploymentStatus;
      'logs.json': DeploymentLogs;
    };
  };
}
```

### Metadata Tracking

```typescript
interface DeploymentMetadata {
  deploymentId: string;
  timestamp: Date;
  version: string;
  project: string;
  environment: string;

  templates: {
    count: number;
    totalSize: number;
    files: Array<{
      name: string;
      size: number;
      checksum: string;
      uri: string;
    }>;
  };

  packages: {
    count: number;
    totalSize: number;
    files: Array<{
      name: string;
      size: number;
      checksum: string;
      uri: string;
      functions: string[];
    }>;
  };

  dependencies: {
    runtime: 'node' | 'dotnet' | 'python';
    version: string;
    packages: Record<string, string>;
  };

  deployment: {
    status: 'pending' | 'inprogress' | 'succeeded' | 'failed';
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    errors?: string[];
  };
}
```

## Security Model

### Access Control

```typescript
interface AccessControl {
  // Storage account access
  account: {
    authentication: 'AzureAD' | 'SharedKey' | 'SAS';
    authorization: 'RBAC';  // Azure RBAC
    roles: {
      owner: 'Storage Account Owner';
      contributor: 'Storage Blob Data Contributor';
      reader: 'Storage Blob Data Reader';
    };
  };

  // Container-level permissions
  containers: {
    deployments: {
      admins: ['write', 'read', 'delete'];
      cicd: ['write', 'read'];
      developers: ['read'];
    };
    templates: {
      admins: ['write', 'read', 'delete'];
      cicd: ['write', 'read'];
      developers: ['read'];
    };
    packages: {
      admins: ['write', 'read', 'delete'];
      cicd: ['write', 'read'];
      runtime: ['read'];  // Function apps at runtime
    };
  };

  // SAS token policies
  sasTokens: {
    deployment: {
      permissions: 'rw';    // Read/write during deployment
      duration: '1h';
      ipRestrictions: true;
    };
    runtime: {
      permissions: 'r';     // Read-only at runtime
      duration: '24h';
      ipRestrictions: false;
    };
  };
}
```

### Encryption

```typescript
interface EncryptionStrategy {
  // Data at rest
  atRest: {
    enabled: true;
    algorithm: 'AES-256';
    keyManagement: 'Microsoft-managed' | 'Customer-managed';
    keyRotation: {
      automatic: true;
      frequency: '90d';
    };
  };

  // Data in transit
  inTransit: {
    enforceHttps: true;
    minimumTls: 'TLS1.2';
    certificatePinning: false;  // Optional for high security
  };

  // Client-side encryption (optional)
  clientSide: {
    enabled: false;
    algorithm: 'AES-256-GCM';
    keyProvider: 'Azure Key Vault';
  };
}
```

## Lifecycle Management

### Retention Policies

```typescript
interface RetentionPolicy {
  // Active deployments
  active: {
    location: '/deployments/active/';
    retention: 'indefinite';
    count: 1;  // Only current deployment
  };

  // Recent deployments
  recent: {
    location: '/deployments/recent/';
    retentionDays: 30;
    maxCount: 10;
  };

  // Archived deployments
  archive: {
    location: '/deployments/archive/';
    retentionDays: 365;
    tieringPolicy: {
      coolAfterDays: 30;
      archiveAfterDays: 90;
    };
  };

  // Cleanup rules
  cleanup: {
    schedule: '0 2 * * *';  // Daily at 2 AM
    rules: [
      { age: '>365d', action: 'delete' },
      { age: '>90d', action: 'archive' },
      { age: '>30d', action: 'cool' },
      { tagged: false, age: '>7d', action: 'delete' }
    ];
  };
}
```

### Automated Cleanup

```typescript
class StorageLifecycleManager {
  async configureLifecycle(account: StorageAccount): Promise<void> {
    const policy = {
      rules: [
        {
          name: 'delete-old-deployments',
          enabled: true,
          type: 'Lifecycle',
          definition: {
            filters: {
              blobTypes: ['blockBlob'],
              prefixMatch: ['deployments/archive/']
            },
            actions: {
              baseBlob: {
                delete: { daysAfterModificationGreaterThan: 365 }
              }
            }
          }
        },
        {
          name: 'tier-to-cool',
          enabled: true,
          type: 'Lifecycle',
          definition: {
            filters: {
              blobTypes: ['blockBlob'],
              prefixMatch: ['templates/', 'packages/']
            },
            actions: {
              baseBlob: {
                tierToCool: { daysAfterModificationGreaterThan: 30 }
              }
            }
          }
        },
        {
          name: 'tier-to-archive',
          enabled: true,
          type: 'Lifecycle',
          definition: {
            filters: {
              blobTypes: ['blockBlob'],
              prefixMatch: ['deployments/archive/']
            },
            actions: {
              baseBlob: {
                tierToArchive: { daysAfterModificationGreaterThan: 90 }
              }
            }
          }
        }
      ]
    };

    await this.applyPolicy(account, policy);
  }

  async cleanup(account: StorageAccount, dryRun = false): Promise<CleanupResult> {
    const results: CleanupResult = {
      deleted: [],
      tiered: [],
      retained: [],
      errors: []
    };

    // Scan all containers
    for (const container of await this.listContainers(account)) {
      const blobs = await this.listBlobs(container);

      for (const blob of blobs) {
        try {
          const action = this.determineAction(blob);

          if (dryRun) {
            console.log(`Would ${action}: ${blob.name}`);
          } else {
            await this.executeAction(blob, action);
            results[action].push(blob.name);
          }
        } catch (error) {
          results.errors.push({ blob: blob.name, error });
        }
      }
    }

    return results;
  }
}
```

## Performance Optimization

### Upload Optimization

```typescript
class UploadOptimizer {
  async optimizedUpload(files: File[], config: UploadConfig): Promise<void> {
    // Group files by size
    const { small, medium, large } = this.groupBySize(files);

    // Upload strategy based on size
    await Promise.all([
      this.uploadSmallFiles(small, config),     // Parallel, many at once
      this.uploadMediumFiles(medium, config),   // Parallel, limited concurrency
      this.uploadLargeFiles(large, config)      // Sequential or chunked
    ]);
  }

  private async uploadSmallFiles(files: File[], config: UploadConfig): Promise<void> {
    // Files < 1MB: Upload many in parallel
    const BATCH_SIZE = 20;

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(f => this.uploadFile(f, config)));
    }
  }

  private async uploadMediumFiles(files: File[], config: UploadConfig): Promise<void> {
    // Files 1-10MB: Limited parallelism
    const CONCURRENCY = 5;
    const queue = new PQueue({ concurrency: CONCURRENCY });

    await queue.addAll(
      files.map(file => () => this.uploadFile(file, config))
    );
  }

  private async uploadLargeFiles(files: File[], config: UploadConfig): Promise<void> {
    // Files > 10MB: Chunked upload
    for (const file of files) {
      await this.uploadFileChunked(file, config, {
        chunkSize: 4 * 1024 * 1024,  // 4MB chunks
        parallelChunks: 3
      });
    }
  }
}
```

### Caching Strategy

```typescript
interface CacheStrategy {
  // Local cache for artifacts
  local: {
    enabled: true;
    directory: '.atakora/cache/';
    maxSize: '1GB';
    ttl: '7d';
    strategy: 'LRU';  // Least recently used
  };

  // Blob storage caching
  blob: {
    cacheControl: 'public, max-age=3600';
    etag: true;
    lastModified: true;
  };

  // CDN integration (future)
  cdn: {
    enabled: false;
    provider: 'Azure CDN';
    endpoints: {
      templates: 'https://cdn.atakora.io/templates/';
      packages: 'https://cdn.atakora.io/packages/';
    };
    ttl: {
      templates: '1h';
      packages: '24h';
    };
  };

  // Cache validation
  validation: {
    checksum: true;
    signature: false;  // Future enhancement
    expiry: true;
  };
}
```

## Government Cloud Support

### Configuration Differences

```typescript
interface GovCloudConfig {
  // Different endpoints
  endpoints: {
    storage: '.blob.core.usgovcloudapi.net';
    auth: 'https://login.microsoftonline.us';
    management: 'https://management.usgovcloudapi.net';
  };

  // Compliance requirements
  compliance: {
    encryption: 'FIPS-140-2';
    dataResidency: 'US-only';
    certifications: ['FedRAMP', 'DoD IL4'];
  };

  // Network restrictions
  network: {
    privateEndpointsRequired: true;
    publicAccessDenied: true;
    allowedIPs: ['10.0.0.0/8'];  // Government networks only
  };

  // Retention policies
  retention: {
    minimum: '3 years';
    auditLogs: '7 years';
    deleteProhibited: true;  // Soft delete only
  };
}
```

### Implementation

```typescript
class GovCloudStorageProvider extends StorageProvisioner {
  constructor(config: GovCloudConfig) {
    super({
      ...config,
      endpoints: this.getGovEndpoints(),
      compliance: this.enforceCompliance(),
      network: this.configureGovNetwork()
    });
  }

  private getGovEndpoints(): Endpoints {
    return {
      blob: process.env.AZURE_STORAGE_BLOB_ENDPOINT || 'https://storage.blob.core.usgovcloudapi.net',
      auth: process.env.AZURE_AUTH_ENDPOINT || 'https://login.microsoftonline.us',
      management: process.env.AZURE_MANAGEMENT_ENDPOINT || 'https://management.usgovcloudapi.net'
    };
  }

  private enforceCompliance(): ComplianceConfig {
    return {
      encryption: {
        algorithm: 'AES-256-FIPS',
        keyManagement: 'customer-managed',
        keyVault: 'required'
      },
      audit: {
        enabled: true,
        retention: '7y',
        immutable: true
      }
    };
  }
}
```

## Monitoring & Diagnostics

### Storage Metrics

```typescript
interface StorageMetrics {
  // Performance metrics
  performance: {
    uploadSpeed: number;      // MB/s
    downloadSpeed: number;    // MB/s
    latency: number;         // ms
    throughput: number;      // requests/sec
  };

  // Usage metrics
  usage: {
    totalSize: number;       // GB
    fileCount: number;
    containerCount: number;
    bandwidthUsed: number;   // GB/month
  };

  // Cost metrics
  cost: {
    storage: number;         // $/month
    transactions: number;    // $/month
    bandwidth: number;       // $/month
    total: number;          // $/month
  };

  // Health metrics
  health: {
    availability: number;    // percentage
    errorRate: number;      // errors/hour
    throttling: number;     // throttles/hour
  };
}
```

### Diagnostic Logging

```typescript
interface DiagnosticLogging {
  // Operation logging
  operations: {
    upload: true;
    download: true;
    delete: true;
    list: true;
  };

  // Error logging
  errors: {
    detailed: true;
    stackTrace: true;
    context: true;
  };

  // Audit logging
  audit: {
    access: true;
    modifications: true;
    deletions: true;
  };

  // Log destinations
  destinations: {
    console: true;
    file: '.atakora/logs/storage.log';
    azureMonitor: true;
    applicationInsights: true;
  };
}
```

## Disaster Recovery

### Backup Strategy

```typescript
interface BackupStrategy {
  // Automated backups
  automated: {
    enabled: true;
    frequency: 'daily';
    retention: '30d';
    destination: 'secondary-region';
  };

  // Point-in-time restore
  pointInTime: {
    enabled: true;
    retention: '7d';
    granularity: '1h';
  };

  // Geo-redundancy
  geoRedundancy: {
    enabled: true;
    replication: 'GRS';  // Geo-redundant storage
    failoverRegion: 'West US';
  };

  // Recovery procedures
  recovery: {
    rto: '4h';  // Recovery time objective
    rpo: '1h';  // Recovery point objective
    automatedFailover: false;
    manualProcedures: true;
  };
}
```

## Best Practices

### Do's
1. **Always use SAS tokens** for deployment-time access
2. **Enable soft delete** for production storage accounts
3. **Monitor storage costs** and optimize tiers
4. **Use lifecycle policies** for automatic cleanup
5. **Implement retry logic** for all storage operations
6. **Validate checksums** for all artifacts
7. **Use private endpoints** in production

### Don'ts
1. **Never expose storage keys** in logs or source control
2. **Don't use public access** for containers
3. **Don't skip cleanup** - storage costs accumulate
4. **Don't ignore throttling** - implement backoff
5. **Don't use HTTP** - always enforce HTTPS
6. **Don't share SAS tokens** across deployments
7. **Don't bypass validation** - always verify artifacts