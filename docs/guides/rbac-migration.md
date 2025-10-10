# Azure RBAC Grant Pattern - Migration Guide

## Overview

This guide helps you migrate from manual Azure role assignments to the declarative RBAC Grant Pattern. The grant pattern provides type-safe, intuitive methods for managing permissions between Azure resources.

## Why Migrate?

### Before (Manual Role Assignments)

```typescript
import { RoleAssignmentArm } from '@atakora/lib/authorization';

// Manual, error-prone approach
const assignment = new RoleAssignmentArm(stack, 'BlobReaderRole', {
  scope: `[resourceId('Microsoft.Storage/storageAccounts', '${storageAccountName}')]`,
  properties: {
    roleDefinitionId: '/subscriptions/[subscription().subscriptionId]/providers/Microsoft.Authorization/roleDefinitions/2a2b9908-6ea1-4ae2-8e65-a410df84e7d1',
    principalId: `[reference(resourceId('Microsoft.Web/sites', '${functionAppName}')).identity.principalId]`,
    principalType: 'ServicePrincipal'
  }
});

// Problems:
// 1. Manual ARM expression construction
// 2. Hard-coded role definition GUIDs
// 3. No type safety
// 4. Easy to make mistakes
// 5. Unclear intent
```

### After (Grant Pattern)

```typescript
import { StorageAccounts } from '@atakora/cdk/storage';
import { FunctionApp } from '@atakora/cdk/functions';

// Declarative, type-safe approach
storage.grantBlobRead(functionApp, 'Function app processes uploaded images');

// Benefits:
// 1. Clear intent
// 2. Type-safe
// 3. Self-documenting
// 4. Less code
// 5. Consistent across all resources
```

## Migration Steps

### Step 1: Identify Manual Role Assignments

Find all instances of:
- `RoleAssignmentArm` constructs
- Direct ARM template role assignments
- Manual `Microsoft.Authorization/roleAssignments` resources

```bash
# Search for manual role assignments
grep -r "RoleAssignmentArm" packages/
grep -r "Microsoft.Authorization/roleAssignments" packages/
grep -r "roleDefinitionId" packages/
```

### Step 2: Determine Resource Types

Identify what resources are involved:
- Storage Accounts
- Key Vaults
- Cosmos DB
- SQL Databases
- Event Hubs
- Service Bus
- Other resources

### Step 3: Identify Identities (Grantees)

Determine what identities need access:
- Function Apps with system-assigned identity
- User-assigned managed identities
- Virtual Machines (future)
- App Services (future)

### Step 4: Replace with Grant Methods

Use the appropriate grant method based on the role and resource.

## Migration Examples

### Example 1: Storage Blob Access

**Before:**
```typescript
const storage = new StorageAccountsArm(stack, 'Storage', {
  storageAccountName: 'mystorageaccount',
  properties: {
    sku: { name: 'Standard_LRS' }
  }
});

const functionApp = new FunctionAppArm(stack, 'Function', {
  functionAppName: 'myfunction',
  properties: {
    serverFarmId: plan.planId,
    identity: { type: 'SystemAssigned' }
  }
});

// Manual role assignment
const roleAssignment = new RoleAssignmentArm(stack, 'BlobReaderRole', {
  scope: `[resourceId('Microsoft.Storage/storageAccounts', '${storage.storageAccountName}')]`,
  properties: {
    roleDefinitionId: '/subscriptions/[subscription().subscriptionId]/providers/Microsoft.Authorization/roleDefinitions/2a2b9908-6ea1-4ae2-8e65-a410df84e7d1',
    principalId: `[reference(resourceId('Microsoft.Web/sites', '${functionApp.functionAppName}')).identity.principalId]`,
    principalType: 'ServicePrincipal'
  }
});
```

**After:**
```typescript
import { StorageAccounts } from '@atakora/cdk/storage';
import { FunctionApp } from '@atakora/cdk/functions';
import { ManagedServiceIdentityType } from '@atakora/cdk/functions/function-app-types';

const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'mystorageaccount'
});

const functionApp = new FunctionApp(stack, 'Function', {
  plan: { planId: plan.planId, location: 'eastus' },
  storageAccount: {
    storageAccountId: storageForFunction.resourceId,
    storageAccountName: 'functionstorage'
  },
  identity: {
    type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
  }
});

// Simple grant
storage.grantBlobRead(functionApp, 'Function app reads uploaded images');
```

### Example 2: KeyVault Secrets Access

**Before:**
```typescript
const vault = new VaultsArm(stack, 'Vault', {
  vaultName: 'myvault',
  properties: {
    sku: { family: 'A', name: 'standard' },
    tenantId: '[subscription().tenantId]'
  }
});

// Manual role assignment
const secretsRole = new RoleAssignmentArm(stack, 'SecretsUser', {
  scope: `[resourceId('Microsoft.KeyVault/vaults', '${vault.vaultName}')]`,
  properties: {
    roleDefinitionId: '/subscriptions/[subscription().subscriptionId]/providers/Microsoft.Authorization/roleDefinitions/4633458b-17de-408a-b874-0445c86b69e6',
    principalId: `[reference(resourceId('Microsoft.Web/sites', '${functionApp.functionAppName}')).identity.principalId]`,
    principalType: 'ServicePrincipal'
  }
});
```

**After:**
```typescript
import { Vaults } from '@atakora/cdk/keyvault';

const vault = new Vaults(stack, 'Vault', {
  vaultName: 'myvault'
});

// Simple grant
vault.grantSecretsRead(functionApp, 'Function app reads connection strings');
```

### Example 3: Cosmos DB Data Access

**Before:**
```typescript
const cosmos = new CosmosDbArm(stack, 'Cosmos', {
  accountName: 'mycosmosaccount',
  properties: {
    databaseAccountOfferType: 'Standard',
    locations: [{ locationName: 'eastus', failoverPriority: 0 }]
  }
});

// Manual role assignment
const dataReader = new RoleAssignmentArm(stack, 'CosmosReader', {
  scope: `[resourceId('Microsoft.DocumentDB/databaseAccounts', '${cosmos.accountName}')]`,
  properties: {
    roleDefinitionId: '/subscriptions/[subscription().subscriptionId]/providers/Microsoft.Authorization/roleDefinitions/00000000-0000-0000-0000-000000000001',
    principalId: `[reference(resourceId('Microsoft.Web/sites', '${functionApp.functionAppName}')).identity.principalId]`,
    principalType: 'ServicePrincipal'
  }
});
```

**After:**
```typescript
import { CosmosDb } from '@atakora/cdk/documentdb';

const cosmos = new CosmosDb(stack, 'Cosmos', {
  accountName: 'mycosmosaccount',
  location: 'eastus'
});

// Simple grant
cosmos.grantDataRead(functionApp, 'Function app queries customer data');
```

### Example 4: Multiple Permissions

**Before:**
```typescript
// Manual blob reader
const blobReader = new RoleAssignmentArm(stack, 'BlobReader', {
  scope: storage.resourceId,
  properties: {
    roleDefinitionId: '/subscriptions/.../2a2b9908-6ea1-4ae2-8e65-a410df84e7d1',
    principalId: functionApp.principalId,
    principalType: 'ServicePrincipal'
  }
});

// Manual queue contributor
const queueContributor = new RoleAssignmentArm(stack, 'QueueContrib', {
  scope: storage.resourceId,
  properties: {
    roleDefinitionId: '/subscriptions/.../974c5e8b-45b9-4653-ba55-5f855dd0fb88',
    principalId: functionApp.principalId,
    principalType: 'ServicePrincipal'
  }
});

// Manual table writer
const tableWriter = new RoleAssignmentArm(stack, 'TableWriter', {
  scope: storage.resourceId,
  properties: {
    roleDefinitionId: '/subscriptions/.../0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3',
    principalId: functionApp.principalId,
    principalType: 'ServicePrincipal'
  }
});
```

**After:**
```typescript
// Clear, concise grants
storage.grantBlobRead(functionApp, 'Read input files');
storage.grantQueueProcess(functionApp, 'Process work queue');
storage.grantTableWrite(functionApp, 'Write processing results');
```

### Example 5: Cross-Stack Grants

**Before:**
```typescript
// Stack A: Storage
const storageStack = new SubscriptionStack(app, 'Storage', {...});
const storage = new StorageAccountsArm(storageStack, 'Storage', {...});

// Stack B: Compute
const computeStack = new SubscriptionStack(app, 'Compute', {...});
const functionApp = new FunctionAppArm(computeStack, 'Function', {...});

// Manual cross-stack role assignment (error-prone!)
const crossStackRole = new RoleAssignmentArm(computeStack, 'CrossStackGrant', {
  scope: `[resourceId('Microsoft.Storage/storageAccounts', '${storage.storageAccountName}')]`,
  properties: {
    roleDefinitionId: '/subscriptions/[subscription().subscriptionId]/providers/Microsoft.Authorization/roleDefinitions/2a2b9908-6ea1-4ae2-8e65-a410df84e7d1',
    principalId: `[reference(resourceId('Microsoft.Web/sites', '${functionApp.functionAppName}')).identity.principalId]`,
    principalType: 'ServicePrincipal'
  }
});
```

**After:**
```typescript
import { CrossStackGrant, WellKnownRoleIds } from '@atakora/lib/authorization';

// Stack A: Storage
const storageStack = new SubscriptionStack(app, 'Storage', {...});
const storage = new StorageAccounts(storageStack, 'Storage', {
  storageAccountName: 'sharedstorage'
});

// Stack B: Compute
const computeStack = new SubscriptionStack(app, 'Compute', {...});
const functionApp = new FunctionApp(computeStack, 'Function', {
  plan: { ... },
  storageAccount: { ... },
  identity: { type: ManagedServiceIdentityType.SYSTEM_ASSIGNED }
});

// Simple cross-stack grant
CrossStackGrant.create(computeStack, 'StorageAccess', {
  resource: storage,
  grantee: functionApp,
  roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
  description: 'Function accesses shared storage'
});
```

### Example 6: User-Assigned Identity

**Before:**
```typescript
const identity = new UserAssignedIdentityArm(stack, 'Identity', {
  identityName: 'app-identity'
});

// Manual role assignment
const role = new RoleAssignmentArm(stack, 'IdentityGrant', {
  scope: storage.resourceId,
  properties: {
    roleDefinitionId: '/subscriptions/.../2a2b9908-6ea1-4ae2-8e65-a410df84e7d1',
    principalId: `[reference(resourceId('Microsoft.ManagedIdentity/userAssignedIdentities', '${identity.identityName}')).principalId]`,
    principalType: 'ServicePrincipal'
  }
});
```

**After:**
```typescript
import { UserAssignedIdentity } from '@atakora/lib/managedidentity';

const identity = new UserAssignedIdentity(stack, 'Identity', {
  identityName: 'app-identity',
  location: 'eastus'
});

// Simple grant - identity implements IGrantable
storage.grantBlobRead(identity, 'Shared identity reads blob data');
```

## Role Mapping Reference

Use this table to find the equivalent grant method for each role:

### Storage Account Roles

| Role Name | Role GUID | Grant Method |
|-----------|-----------|--------------|
| Storage Blob Data Reader | 2a2b9908-6ea1-4ae2-8e65-a410df84e7d1 | `grantBlobRead()` |
| Storage Blob Data Contributor | ba92f5b4-2d11-453d-a403-e96b0029c9fe | `grantBlobWrite()` |
| Storage Queue Data Contributor | 974c5e8b-45b9-4653-ba55-5f855dd0fb88 | `grantQueueProcess()` |
| Storage Queue Data Reader | 19e7f393-937e-4f77-808e-94535e297925 | `grantQueueRead()` |
| Storage Table Data Reader | 76199698-9eea-4c19-bc75-cec21354c6b6 | `grantTableRead()` |
| Storage Table Data Contributor | 0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3 | `grantTableWrite()` |
| Storage File Data SMB Share Reader | aba4ae5f-2193-4029-9191-0cb91df5e314 | `grantFileRead()` |
| Storage File Data SMB Share Contributor | 0c867c2a-1d8c-454a-a3db-ab2ea1bdc8bb | `grantFileWrite()` |

### KeyVault Roles

| Role Name | Role GUID | Grant Method |
|-----------|-----------|--------------|
| Key Vault Secrets User | 4633458b-17de-408a-b874-0445c86b69e6 | `grantSecretsRead()` |
| Key Vault Secrets Officer | b86a8fe4-44ce-4948-aee5-eccb2c155cd7 | `grantSecretsWrite()` or `grantSecretsManage()` |
| Key Vault Certificates User | db79e9a7-68ee-4b58-9aeb-b90e7c24fcba | `grantCertificatesRead()` |
| Key Vault Certificates Officer | a4417e6f-fecd-4de8-b567-7b0420556985 | `grantCertificatesManage()` |
| Key Vault Crypto User | 12338af0-0e69-4776-bea7-57ae8d297424 | `grantCryptoUser()` |
| Key Vault Crypto Officer | 14b46e9e-c2b7-41b4-b07b-48a6ebf60603 | `grantCryptoOfficer()` |

### Cosmos DB Roles

| Role Name | Role GUID | Grant Method |
|-----------|-----------|--------------|
| Cosmos DB Built-in Data Reader | 00000000-0000-0000-0000-000000000001 | `grantDataRead()` |
| Cosmos DB Built-in Data Contributor | 00000000-0000-0000-0000-000000000002 | `grantDataContribute()` or `grantDataReadWrite()` |

### SQL Roles

| Role Name | Role GUID | Grant Method |
|-----------|-----------|--------------|
| SQL DB Contributor | 9b7fa17d-e63e-47b0-bb0a-15c516ac86ec | `grantDatabaseRead()`, `grantDatabaseWrite()`, or `grantDatabaseAdmin()` |

### Event Hub Roles

| Role Name | Role GUID | Grant Method |
|-----------|-----------|--------------|
| Azure Event Hubs Data Sender | 2b629674-e913-4c01-ae53-ef4638d8f975 | `grantSend()` |
| Azure Event Hubs Data Receiver | a638d3c7-ab3a-418d-83e6-5f17a39d4fde | `grantReceive()` |
| Azure Event Hubs Data Owner | f526a384-b230-433a-b45c-95f59c4a2dec | `grantManage()` |

### Service Bus Roles

| Role Name | Role GUID | Grant Method |
|-----------|-----------|--------------|
| Azure Service Bus Data Sender | 69a216fc-b8fb-44d8-bc22-1f3c2cd27a39 | `grantSend()` |
| Azure Service Bus Data Receiver | 4f6d3b9b-027b-4f4c-9142-0e5a2a2247e0 | `grantReceive()` |
| Azure Service Bus Data Owner | 090c5cfd-751d-490a-894a-3ce6f1109419 | `grantManage()` |

## Common Migration Scenarios

### Scenario 1: Migrating a Complete Stack

**Original Stack (manual):**
```typescript
// Storage
const storage = new StorageAccountsArm(stack, 'Storage', {...});

// KeyVault
const vault = new VaultsArm(stack, 'Vault', {...});

// Function App
const functionApp = new FunctionAppArm(stack, 'Function', {...});

// Manual role assignments
const role1 = new RoleAssignmentArm(stack, 'StorageRole', {...});
const role2 = new RoleAssignmentArm(stack, 'VaultRole', {...});
```

**Migrated Stack (grant pattern):**
```typescript
import { StorageAccounts } from '@atakora/cdk/storage';
import { Vaults } from '@atakora/cdk/keyvault';
import { FunctionApp } from '@atakora/cdk/functions';

// Storage
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'mysa'
});

// KeyVault
const vault = new Vaults(stack, 'Vault', {
  vaultName: 'myvault'
});

// Function App with identity
const functionApp = new FunctionApp(stack, 'Function', {
  plan: { ... },
  storageAccount: { ... },
  identity: {
    type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
  }
});

// Grants
storage.grantBlobRead(functionApp, 'Read configuration files');
vault.grantSecretsRead(functionApp, 'Read connection strings');
```

### Scenario 2: Migrating Shared Infrastructure

**Original (manual):**
```typescript
// Multiple function apps
const func1 = new FunctionAppArm(stack, 'Func1', {...});
const func2 = new FunctionAppArm(stack, 'Func2', {...});
const func3 = new FunctionAppArm(stack, 'Func3', {...});

// Shared storage
const storage = new StorageAccountsArm(stack, 'Shared', {...});

// Manual role assignments for each function
const role1 = new RoleAssignmentArm(stack, 'Func1Storage', {...});
const role2 = new RoleAssignmentArm(stack, 'Func2Storage', {...});
const role3 = new RoleAssignmentArm(stack, 'Func3Storage', {...});
```

**Migrated (grant pattern):**
```typescript
// Multiple function apps
const func1 = new FunctionApp(stack, 'Func1', {
  identity: { type: ManagedServiceIdentityType.SYSTEM_ASSIGNED },
  ...
});
const func2 = new FunctionApp(stack, 'Func2', {
  identity: { type: ManagedServiceIdentityType.SYSTEM_ASSIGNED },
  ...
});
const func3 = new FunctionApp(stack, 'Func3', {
  identity: { type: ManagedServiceIdentityType.SYSTEM_ASSIGNED },
  ...
});

// Shared storage
const storage = new StorageAccounts(stack, 'Shared', {
  storageAccountName: 'sharedsa'
});

// Simple grants
storage.grantBlobRead(func1, 'Func1 reads shared data');
storage.grantBlobRead(func2, 'Func2 reads shared data');
storage.grantBlobWrite(func3, 'Func3 writes processed results');
```

## Migration Checklist

Use this checklist when migrating each resource:

- [ ] Identify the resource type (Storage, KeyVault, Cosmos, etc.)
- [ ] Identify the role being assigned
- [ ] Find the equivalent grant method from the [API Documentation](../api/rbac-grants.md)
- [ ] Ensure the grantee has a managed identity configured
- [ ] Replace `RoleAssignmentArm` with the grant method
- [ ] Add a descriptive string explaining why the grant exists
- [ ] Remove manual role definition GUIDs
- [ ] Remove manual ARM expression construction
- [ ] Test the deployment
- [ ] Verify the role assignment in Azure Portal

## Testing Your Migration

After migration, verify your changes:

### 1. Build Check

```bash
cd packages/cdk
npm run build
```

Ensure no TypeScript errors.

### 2. Synthesis Check

```bash
# Synthesize ARM templates
npm run synth
```

Verify role assignments are generated in the ARM template.

### 3. Deployment Test

Deploy to a test environment:

```bash
az deployment sub create \
  --location eastus \
  --template-file dist/template.json \
  --parameters dist/parameters.json
```

### 4. Verify in Portal

After deployment, check in Azure Portal:
1. Navigate to the resource (Storage Account, KeyVault, etc.)
2. Go to "Access control (IAM)"
3. Click "Role assignments"
4. Verify the identity has the correct role

### 5. Functional Test

Test that the application can actually access the resource:

```typescript
// For Function App accessing Storage
// Trigger the function and verify it can read/write blobs
```

## Common Migration Issues

### Issue 1: Missing Identity

**Error:**
```
Cannot access principalId - no managed identity configured
```

**Solution:**
Add identity to the resource:
```typescript
const functionApp = new FunctionApp(stack, 'Function', {
  // ... other props
  identity: {
    type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
  }
});
```

### Issue 2: User-Assigned Only Identity

**Error:**
```
FunctionApp has only user-assigned identity. Use system-assigned or combined identity type.
```

**Solution:**
Use system-assigned or combined identity:
```typescript
identity: {
  type: ManagedServiceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED,
  userAssignedIdentities: { ... }
}
```

### Issue 3: Wrong Grant Method

**Error:**
```
Property 'grantBlobRead' does not exist on type 'Vaults'
```

**Solution:**
Use the correct grant method for the resource type:
```typescript
// Wrong
vault.grantBlobRead(functionApp);

// Right
vault.grantSecretsRead(functionApp);
```

### Issue 4: Cross-Stack Reference Issues

**Error:**
```
Cannot reference resource from different stack
```

**Solution:**
Use `CrossStackGrant` utility:
```typescript
CrossStackGrant.create(granteeStack, 'Access', {
  resource: resourceFromOtherStack,
  grantee: identityInThisStack,
  roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER
});
```

## Best Practices After Migration

### 1. Document Intent

Always include descriptions:
```typescript
storage.grantBlobRead(
  functionApp,
  'Function app processes uploaded customer documents'
);
```

### 2. Use Least Privilege

Grant only the minimum required permissions:
```typescript
// Good: Specific permission
storage.grantBlobRead(functionApp);

// Bad: Overly broad permission
storage.grantBlobWrite(functionApp); // when only read is needed
```

### 3. Group Related Grants

Keep grants near the resource definitions:
```typescript
const storage = new StorageAccounts(stack, 'Storage', {...});

// Grant immediately after resource creation
storage.grantBlobRead(functionApp, 'Read access');
storage.grantQueueProcess(functionApp, 'Queue processing');
```

### 4. Review and Clean Up

After migration:
- Remove unused imports
- Delete old `RoleAssignmentArm` constructs
- Clean up hard-coded role GUIDs
- Simplify complex ARM expressions

## Getting Help

If you encounter issues during migration:

1. **Check the API Documentation:** [rbac-grants.md](../api/rbac-grants.md)
2. **Review Examples:** [examples/rbac-grants/](../../examples/rbac-grants/)
3. **Run Integration Tests:** `npm test -- rbac-grants.integration`
4. **Check Architecture Design:** [azure-rbac-implementation-plan.md](../design/architecture/azure-rbac-implementation-plan.md)

## Next Steps

After migration:

1. **Review the API Documentation** for advanced features
2. **Explore Example Projects** for common patterns
3. **Run Integration Tests** to validate your implementation
4. **Consider Cross-Stack Scenarios** if you have multi-stack deployments

## Summary

The RBAC Grant Pattern migration provides:

- **Type Safety:** Compile-time verification of permissions
- **Clarity:** Self-documenting code with clear intent
- **Consistency:** Same pattern across all Azure resources
- **Simplicity:** Less code, fewer errors
- **Maintainability:** Easier to understand and modify

Happy migrating!
