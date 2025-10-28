# Azure Functions Storage Guide

## Overview

Azure Functions Apps require dedicated storage accounts for their runtime operations. This guide explains why Functions Apps need their own storage, what it's used for, and how to use the FunctionsApp construct correctly.

## Why Functions Apps Need Dedicated Storage

When you create an Azure Functions App, it automatically provisions a dedicated storage account. This storage is essential for the Functions runtime and should never be shared with application data or other Functions Apps.

### What Functions Storage Is Used For

The Functions runtime uses storage for several critical operations:

1. **Function Code Storage**: Your function application code and deployment packages are stored in blob storage
2. **Trigger Coordination**: Queue storage manages triggers and coordinates function executions across scale-out instances
3. **Execution State**: Table storage tracks function execution history, distributed locks, and leases
4. **Scale Controller**: The scale controller uses storage to make scaling decisions and coordinate across instances
5. **Host State**: Runtime configuration and host state information

### Performance and Security Implications

Sharing storage between Functions Apps or mixing it with application data causes several problems:

- **Performance Degradation**: Functions generate significant I/O operations that can impact your application's data access performance
- **Security Boundaries**: Functions runtime storage contains sensitive operational data including keys, secrets, and internal state that should be isolated
- **Configuration Conflicts**: Application data storage is typically optimized for blob access, while Functions need optimized access to queues, tables, and blobs
- **Deployment Issues**: Functions require specific storage configurations that often conflict with application data storage requirements

## Using the FunctionsApp Construct

The `FunctionsApp` construct automatically creates and manages dedicated storage for your Functions App. You don't need to create or provide storage manually.

### Basic Usage

```typescript
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';
import { ResourceGroupStack } from '@atakora/cdk';

const stack = new ResourceGroupStack(app, 'MyStack', {
  resourceGroupName: 'rg-myapp-prod',
  location: 'eastus'
});

// Create a Functions App - storage is automatically created
const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20',
  environment: {
    NODE_ENV: 'production'
  }
});

// Access the automatically created storage if needed
console.log(`Functions storage ID: ${functionsApp.storage.storageAccountId}`);
```

### What NOT to Do

The following patterns are incorrect and will cause deployment or runtime issues:

#### DO NOT: Pass Existing Application Storage

```typescript
// WRONG - Do not reuse application data storage
const dataStorage = new StorageAccounts(stack, 'DataStorage', {
  location: 'eastus',
  // ... configuration for application data
});

const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  existingStorage: dataStorage  // DO NOT DO THIS
});
```

**Why this fails**: Application data storage is optimized for your data access patterns and may have network restrictions or configurations that prevent Functions from operating correctly.

#### DO NOT: Share Storage Between Multiple Functions Apps

```typescript
// WRONG - Do not share storage between Functions Apps
const sharedStorage = new StorageAccounts(stack, 'SharedStorage', {
  location: 'eastus'
});

const api = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  existingStorage: sharedStorage  // DO NOT DO THIS
});

const background = new FunctionsApp(stack, 'Background', {
  runtime: FunctionRuntime.NODE,
  existingStorage: sharedStorage  // DO NOT DO THIS
});
```

**Why this fails**: Multiple Functions Apps sharing storage will interfere with each other's triggers, state management, and scale operations.

#### DO NOT: Create Storage Manually

```typescript
// WRONG - Do not pre-create storage for Functions
const functionStorage = new StorageAccounts(stack, 'FunctionStorage', {
  location: 'eastus'
});

const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  existingStorage: functionStorage  // DO NOT DO THIS
});
```

**Why this fails**: The FunctionsApp construct applies specific configuration required by the Functions runtime. Manual storage creation may miss critical settings.

### Correct Pattern: Let Each Functions App Create Its Own Storage

```typescript
// CORRECT - Each Functions App automatically creates its own storage
const apiApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20'
  // No existingStorage parameter - storage created automatically
});

const backgroundApp = new FunctionsApp(stack, 'Background', {
  runtime: FunctionRuntime.PYTHON,
  runtimeVersion: '3.11'
  // No existingStorage parameter - separate storage created automatically
});

// Each app has isolated storage
console.log(`API storage: ${apiApp.storage.storageAccountName}`);
console.log(`Background storage: ${backgroundApp.storage.storageAccountName}`);
```

## Multiple Functions Apps in One Solution

When building solutions with multiple Functions Apps, each app gets its own dedicated storage automatically:

```typescript
import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';
import { StorageAccounts } from '@atakora/cdk/storage';

// Application data storage - for your business data
const dataStorage = new StorageAccounts(stack, 'DataStorage', {
  location: 'eastus',
  // ... configured for your application needs
});

// API Functions App - gets its own runtime storage
const apiApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20'
});

// Background processing Functions App - gets separate runtime storage
const backgroundApp = new FunctionsApp(stack, 'Background', {
  runtime: FunctionRuntime.NODE,
  runtimeVersion: '20'
});

// Three separate storage accounts:
// 1. dataStorage - for application data
// 2. apiApp.storage - for API Functions runtime
// 3. backgroundApp.storage - for background Functions runtime
```

## Storage Configuration Details

### Automatic Configuration

The FunctionsApp construct automatically configures storage with:

- **SKU**: Standard_LRS (locally redundant storage)
- **Kind**: StorageV2 (general purpose v2)
- **Services**: Blob, Queue, and Table storage enabled
- **Security**: TLS 1.2 minimum, HTTPS only, public blob access disabled
- **Tags**: Automatically tagged as "functions-runtime" storage

### Storage Naming

Storage accounts for Functions follow this naming pattern:

```
st{type}{org}{project}{env}{geo}{instance}func
```

Example: `stfnmyorgprodeastus2001func`

Where:
- `st` = Storage account prefix
- `fn` = Functions storage type
- `myorg` = Organization name (truncated if needed)
- `prod` = Environment
- `eastus2` = Geography
- `001` = Instance number
- `func` = Functions suffix

### Accessing Storage Accounts

If you need to reference the storage account (for example, to grant permissions), use the public properties:

```typescript
const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE
});

// Access storage properties
const storageId = functionsApp.storage.storageAccountId;
const storageName = functionsApp.storage.storageAccountName;

// Grant another resource access to Functions storage (rare but possible)
// Note: This is uncommon - Functions storage is typically isolated
someOtherResource.grantReadAccess(functionsApp.storage);
```

## Government Cloud Considerations

The automatic storage provisioning pattern works identically in both Azure Commercial and Azure Government clouds:

- Storage account types and features are consistent across both environments
- Same naming conventions apply
- Network isolation requirements may be stricter in Government clouds (automatically handled)
- Compliance tags are automatically applied in Government cloud deployments

## Common Questions

### Can I use a cheaper storage tier?

No. The Standard_LRS tier is already the most cost-effective option that meets Functions runtime requirements. The storage account typically costs around $20-30/month including operations.

### What if I need to access this storage from my functions?

You should not. This storage is for the Functions runtime only. If your functions need to access blob storage, create a separate storage account for your application data:

```typescript
// Functions App with automatic runtime storage
const functionsApp = new FunctionsApp(stack, 'Api', {
  runtime: FunctionRuntime.NODE
});

// Separate storage for your application's data
const appDataStorage = new StorageAccounts(stack, 'AppData', {
  location: 'eastus',
  // ... configured for your needs
});

// Pass the application storage connection to functions via environment variables
functionsApp.addEnvironmentVariable(
  'APP_STORAGE_CONNECTION',
  appDataStorage.connectionString
);
```

### Can I share storage in development to save costs?

No. Even in development, each Functions App requires dedicated storage. The cost savings would be minimal (a few dollars per month) and not worth the deployment issues and confusion it would cause.

### What happens to storage when I delete a Functions App?

The storage account is part of the Functions App construct, so when you delete the Functions App from your stack, the storage account will also be removed from the deployment.

## Troubleshooting

### Deployment Fails with Storage Configuration Error

If you see errors about storage configuration during deployment, check that you're not passing an `existingStorage` parameter. Remove any `existingStorage` references and let the FunctionsApp construct create storage automatically.

### Functions App Can't Start or Scale

If the Functions App deploys but fails to start or scale correctly, verify that the storage account was created by the FunctionsApp construct and not pre-created manually. The construct applies specific configurations required by the Functions runtime.

### Migration from Shared Storage

If you have an existing deployment using shared storage, you'll need to migrate:

1. Remove the `existingStorage` parameter from your FunctionsApp
2. Deploy the updated stack (a new storage account will be created)
3. The Functions App will automatically use the new dedicated storage
4. Once verified working, remove the old shared storage if it's no longer needed

## See Also

- [Azure Functions Basic Usage Examples](../examples/functions-basic-usage.md)
- [Getting Started with Functions Apps](../getting-started/functions-app.md)
- [Storage Account Best Practices](https://learn.microsoft.com/azure/storage/common/storage-account-overview)
- [Azure Functions Storage Considerations](https://learn.microsoft.com/azure/azure-functions/storage-considerations)
