# Functions Storage Provisioning Pattern

## Overview

This document defines the pattern for provisioning Azure Functions App storage accounts. Per ADR-001, Functions Apps require dedicated storage for runtime operations and must not share storage with application data.

## Pattern Requirements

### Storage Account Characteristics

Functions Apps require storage with specific characteristics:

1. **Storage Services Required**:
   - **Blob Storage**: Function app content, deployment packages
   - **Queue Storage**: Trigger coordination, scale controller operations
   - **Table Storage**: Function execution history, locks, leases
   - **File Storage**: Function app content in Premium plans

2. **Performance Requirements**:
   - Standard_LRS tier sufficient for most scenarios
   - Premium storage only needed for Premium Elastic plans with high throughput
   - Low latency critical for trigger operations

3. **Security Requirements**:
   - Storage account must be in same region as Function App
   - Network restrictions should align with Function App networking
   - Managed identity access preferred over connection strings

## Implementation Pattern

### Component Level (FunctionsApp)

```typescript
// packages/component/src/functions/functions-app.ts

export class FunctionsApp extends Construct {
  public readonly storage: StorageAccounts;

  constructor(scope: Construct, id: string, props: FunctionsAppProps) {
    super(scope, id);

    // ALWAYS create dedicated storage - no exceptions
    this.storage = this.createFunctionRuntimeStorage(id, props);

    // existingStorage parameter REMOVED - this is an anti-pattern
    // Each Functions App MUST have its own storage
  }

  private createFunctionRuntimeStorage(id: string, props: FunctionsAppProps): StorageAccounts {
    return new StorageAccounts(this, 'RuntimeStorage', {
      location: this.location,
      sku: StorageAccountSkuName.STANDARD_LRS,
      kind: StorageAccountKind.STORAGE_V2,
      // Specific configuration for Functions runtime
      properties: {
        minimumTlsVersion: 'TLS1_2',
        supportsHttpsTrafficOnly: true,
        allowBlobPublicAccess: false,
        networkAcls: {
          defaultAction: 'Allow', // Functions need access during provisioning
          bypass: 'AzureServices'
        }
      },
      tags: {
        ...props.tags,
        'storage-purpose': 'functions-runtime',
        'managed-by': 'functions-app'
      }
    });
  }
}
```

### Stack Level Usage

```typescript
// packages/backend/src/functions/resource.ts

export function createFunctionsApp(
  scope: Construct,
  platformRG: IResourceGroup,
  // existingStorage parameter REMOVED - not needed
  logAnalyticsWorkspaceId?: string
): FunctionsStack {

  const functionsStack = new FunctionsStack(scope, 'Functions', {
    resourceGroup: platformRG,
    runtime: FunctionRuntime.NODE,
    runtimeVersion: '20',
    planType,
    // No existingStorage - let component create dedicated storage
    environment: {
      NODE_ENV: environment.value === 'prod' ? 'production' : 'development',
    },
    enableMonitoring: true,
    logAnalyticsWorkspaceId,
  });

  return functionsStack;
}
```

### Backend Integration

```typescript
// packages/backend/src/index.ts

// Step 7: Deploy Functions App with dedicated storage
const functions = functionsApp(
  foundation,
  platformRG,
  // REMOVED: data.storage.storageAccount - Functions creates own storage
  logAnalyticsWorkspace.id
);

// Each service maintains its own storage
// - data.storage: Application data storage
// - functions.storage: Functions runtime storage (auto-created)
```

## Storage Configuration Details

### Naming Convention

Storage accounts for Functions follow this pattern:
```
st{type}{org}{project}{env}{geo}{instance}func
```

Example: `stfndigitalprodeastus2001func`

Where:
- `st` = Storage account prefix
- `fn` = Functions storage type identifier
- `digitalp` = Organization (truncated for length)
- `rod` = Environment
- `eastus2` = Geography
- `001` = Instance number
- `func` = Functions suffix

### Network Configuration

1. **Development Environment**:
   - Public access allowed for easier debugging
   - Firewall rules for developer IPs
   - Service endpoints enabled

2. **Production Environment**:
   - Private endpoints preferred
   - Public access disabled where possible
   - Managed identity authentication

### Monitoring and Diagnostics

Functions storage should have:
- Diagnostic settings sending logs to Log Analytics
- Metrics for queue length (scale triggers)
- Alerts for storage account throttling
- Backup of function app content (Premium plans)

## Migration Path

For existing deployments using shared storage:

1. **Phase 1**: Deploy new Functions App with dedicated storage
2. **Phase 2**: Migrate function code to new app
3. **Phase 3**: Update traffic routing
4. **Phase 4**: Decommission old Functions App
5. **Phase 5**: Clean up shared storage references

## Anti-Patterns to Avoid

### ❌ DO NOT: Share Storage Between Functions Apps
```typescript
// WRONG - Multiple Functions Apps sharing storage
const sharedStorage = new StorageAccounts(...);
const func1 = new FunctionsApp({ existingStorage: sharedStorage });
const func2 = new FunctionsApp({ existingStorage: sharedStorage });
```

### ❌ DO NOT: Reuse Application Data Storage
```typescript
// WRONG - Functions using data storage
const dataStorage = new StorageAccounts(...);
const functions = new FunctionsApp({ existingStorage: dataStorage });
```

### ❌ DO NOT: Create Storage Outside Component
```typescript
// WRONG - Storage created externally
const functionStorage = new StorageAccounts(stack, 'FuncStorage', ...);
const functions = new FunctionsApp({ existingStorage: functionStorage });
```

## Correct Pattern

### ✅ DO: Let Each Functions App Create Its Storage
```typescript
// CORRECT - Each Functions App manages its own storage
const functions1 = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE
  // Storage created internally
});

const functions2 = new FunctionsApp(stack, 'Background', {
  runtime: FunctionRuntime.PYTHON
  // Separate storage created internally
});
```

## Government vs Commercial Cloud

Storage provisioning pattern remains consistent across:
- **Commercial**: Standard storage features, all tiers available
- **Government**: Same pattern, ensure compliance tags added

Key differences:
- Government clouds may have different storage endpoints
- Encryption requirements may be stricter in Government
- Network isolation requirements more stringent

## Testing Requirements

Tests must verify:
1. Each Functions App creates unique storage account
2. Storage account has correct configuration for Functions
3. No storage sharing between Functions Apps
4. Storage account deleted when Functions App deleted
5. Correct naming convention applied

## Success Metrics

- **Deployment Success Rate**: 100% successful deployments
- **Storage Isolation**: 0 shared storage accounts
- **Performance**: No cross-function I/O interference
- **Security**: All storage accounts pass security scans
- **Cost**: Predictable per-function storage costs

## References

- [ADR-001: Azure Functions App Storage Separation](../architecture/adr-001-functions-storage-separation.md)
- [Azure Functions Storage Requirements](https://learn.microsoft.com/azure/azure-functions/storage-considerations)
- [Storage Account Best Practices](https://learn.microsoft.com/azure/storage/common/storage-account-overview)