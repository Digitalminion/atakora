# Azure RBAC Grant Pattern - API Documentation

## Overview

The Azure RBAC Grant Pattern provides a type-safe, declarative approach to managing role-based access control (RBAC) in Azure infrastructure. This API enables developers to grant permissions between Azure resources using intuitive grant methods rather than manually creating role assignments.

**Version:** 1.0.0
**Status:** Complete
**Implementation:** Phases 1-7 Complete

## Core Concepts

### The Grant Pattern

The grant pattern follows this simple flow:

```typescript
resource.grantPermission(identity, description?)
```

Where:
- **resource**: The Azure resource to grant access to (Storage, KeyVault, Cosmos, etc.)
- **identity**: The identity receiving the permission (IGrantable)
- **description**: Optional human-readable description of why the grant exists

### IGrantable Interface

Any Azure resource with a managed identity can be used as a grantee:

```typescript
interface IGrantable {
  readonly principalId: string;      // Azure AD object ID (can be ARM reference)
  readonly principalType: PrincipalType;
  readonly tenantId?: string;
}
```

**Supported IGrantable Resources:**
- FunctionApp (with system-assigned or combined identity)
- UserAssignedIdentity
- Virtual Machines (future)
- App Services (future)

## Module Structure

```
@atakora/lib/authorization
├── RoleAssignment (L2 construct)
├── RoleAssignmentArm (L1 construct)
├── WellKnownRoleIds (registry)
├── GrantResult (implementation)
└── CrossStackGrant (utility)

@atakora/lib/core/grants
├── IGrantable (interface)
├── IGrantResult (interface)
├── PrincipalType (enum)
└── GrantableResource (base class)
```

## API Reference

### Storage Account Grants

**Location:** `@atakora/cdk/storage` - `StorageAccounts` class

#### Blob Permissions

```typescript
grantBlobRead(grantee: IGrantable, description?: string): IGrantResult
```
Grants read access to all blobs in the storage account.
- **Role:** Storage Blob Data Reader
- **Use Case:** Function apps reading configuration files, static assets, or data

```typescript
grantBlobWrite(grantee: IGrantable, description?: string): IGrantResult
```
Grants read and write access to blobs.
- **Role:** Storage Blob Data Contributor
- **Use Case:** Applications uploading files, writing logs, or managing data

```typescript
grantBlobList(grantee: IGrantable, description?: string): IGrantResult
```
Grants permission to list blobs and containers.
- **Role:** Storage Blob Data Reader
- **Use Case:** Applications browsing blob structures

```typescript
grantBlobDelete(grantee: IGrantable, description?: string): IGrantResult
```
Grants permission to delete blobs.
- **Role:** Storage Blob Data Contributor
- **Use Case:** Applications with lifecycle management requirements

#### Queue Permissions

```typescript
grantQueueRead(grantee: IGrantable, description?: string): IGrantResult
```
Grants read access to queue messages.
- **Role:** Storage Queue Data Reader
- **Use Case:** Monitoring or auditing queue contents

```typescript
grantQueueProcess(grantee: IGrantable, description?: string): IGrantResult
```
Grants permission to read, write, and delete queue messages.
- **Role:** Storage Queue Data Contributor
- **Use Case:** Function apps processing queue-triggered workloads

#### Table Permissions

```typescript
grantTableRead(grantee: IGrantable, description?: string): IGrantResult
```
Grants read access to table data.
- **Role:** Storage Table Data Reader
- **Use Case:** Applications querying table storage

```typescript
grantTableWrite(grantee: IGrantable, description?: string): IGrantResult
```
Grants read and write access to table data.
- **Role:** Storage Table Data Contributor
- **Use Case:** Applications managing structured data in tables

#### File Share Permissions

```typescript
grantFileRead(grantee: IGrantable, description?: string): IGrantResult
```
Grants read access to file shares.
- **Role:** Storage File Data SMB Share Reader
- **Use Case:** Applications reading shared files

```typescript
grantFileWrite(grantee: IGrantable, description?: string): IGrantResult
```
Grants read and write access to file shares.
- **Role:** Storage File Data SMB Share Contributor
- **Use Case:** Applications managing shared file storage

### KeyVault Grants

**Location:** `@atakora/cdk/keyvault` - `Vaults` class

```typescript
grantSecretsRead(grantee: IGrantable, description?: string): IGrantResult
```
Grants permission to read secret values.
- **Role:** Key Vault Secrets User
- **Use Case:** Applications retrieving connection strings, API keys

```typescript
grantSecretsWrite(grantee: IGrantable, description?: string): IGrantResult
```
Grants permission to create and update secrets.
- **Role:** Key Vault Secrets Officer
- **Use Case:** Configuration management tools

```typescript
grantSecretsManage(grantee: IGrantable, description?: string): IGrantResult
```
Grants full management of secrets including deletion.
- **Role:** Key Vault Secrets Officer
- **Use Case:** Administrative applications

```typescript
grantCertificatesRead(grantee: IGrantable, description?: string): IGrantResult
```
Grants permission to read certificates.
- **Role:** Key Vault Certificates User
- **Use Case:** Applications using TLS certificates

```typescript
grantCertificatesManage(grantee: IGrantable, description?: string): IGrantResult
```
Grants full certificate management permissions.
- **Role:** Key Vault Certificates Officer
- **Use Case:** Certificate automation systems

```typescript
grantCryptoUser(grantee: IGrantable, description?: string): IGrantResult
```
Grants permission to use keys for cryptographic operations.
- **Role:** Key Vault Crypto User
- **Use Case:** Applications performing encryption/decryption

```typescript
grantCryptoOfficer(grantee: IGrantable, description?: string): IGrantResult
```
Grants full key management permissions.
- **Role:** Key Vault Crypto Officer
- **Use Case:** Key management systems

### Cosmos DB Grants

**Location:** `@atakora/cdk/documentdb` - `CosmosDb` class

```typescript
grantDataRead(grantee: IGrantable, description?: string): IGrantResult
```
Grants read access to Cosmos DB data.
- **Role:** Cosmos DB Built-in Data Reader
- **Use Case:** Read-only applications, reporting systems

```typescript
grantDataContribute(grantee: IGrantable, description?: string): IGrantResult
```
Grants read and write access to Cosmos DB data.
- **Role:** Cosmos DB Built-in Data Contributor
- **Use Case:** Applications managing data

```typescript
grantDataReadWrite(grantee: IGrantable, description?: string): IGrantResult
```
Alias for `grantDataContribute` for intuitive naming.

```typescript
grantFullAccess(grantee: IGrantable, description?: string): IGrantResult
```
Grants full access including container and database management.
- **Role:** Cosmos DB Built-in Data Contributor
- **Use Case:** Administrative tools

### SQL Database Grants

**Location:** `@atakora/cdk/sql` - SQL resources

```typescript
grantDatabaseRead(grantee: IGrantable, description?: string): IGrantResult
```
Grants read access to SQL database.
- **Role:** SQL DB Contributor
- **Use Case:** Read-only data access

```typescript
grantDatabaseWrite(grantee: IGrantable, description?: string): IGrantResult
```
Grants read and write access to SQL database.
- **Role:** SQL DB Contributor
- **Use Case:** Application database access

```typescript
grantDatabaseAdmin(grantee: IGrantable, description?: string): IGrantResult
```
Grants administrative access to SQL database.
- **Role:** SQL DB Contributor
- **Use Case:** Database management tools

### Event Hub Grants

**Location:** `@atakora/cdk/eventhub` - Event Hub resources

```typescript
grantSend(grantee: IGrantable, description?: string): IGrantResult
```
Grants permission to send messages to Event Hub.
- **Role:** Azure Event Hubs Data Sender
- **Use Case:** Event producers

```typescript
grantReceive(grantee: IGrantable, description?: string): IGrantResult
```
Grants permission to receive messages from Event Hub.
- **Role:** Azure Event Hubs Data Receiver
- **Use Case:** Event consumers

```typescript
grantManage(grantee: IGrantable, description?: string): IGrantResult
```
Grants full management permissions.
- **Role:** Azure Event Hubs Data Owner
- **Use Case:** Event Hub management

### Service Bus Grants

**Location:** `@atakora/cdk/servicebus` - Service Bus resources

```typescript
grantSend(grantee: IGrantable, description?: string): IGrantResult
```
Grants permission to send messages.
- **Role:** Azure Service Bus Data Sender
- **Use Case:** Message producers

```typescript
grantReceive(grantee: IGrantable, description?: string): IGrantResult
```
Grants permission to receive messages.
- **Role:** Azure Service Bus Data Receiver
- **Use Case:** Message consumers

```typescript
grantManage(grantee: IGrantable, description?: string): IGrantResult
```
Grants full management permissions.
- **Role:** Azure Service Bus Data Owner
- **Use Case:** Service Bus management

## Cross-Stack Grants

**Location:** `@atakora/lib/authorization` - `CrossStackGrant` class

### CrossStackGrant.create()

```typescript
CrossStackGrant.create(
  scope: Construct,
  id: string,
  props: {
    resource: IResourceWithId;
    grantee: IGrantable;
    roleDefinitionId: string;
    description?: string;
  }
): RoleAssignment
```

Creates a role assignment across stack boundaries.

**Parameters:**
- `scope`: The stack where the role assignment should be created (typically where the grantee lives)
- `id`: Unique construct ID
- `props.resource`: Resource to grant access to (from any stack)
- `props.grantee`: Identity receiving access (typically in current stack)
- `props.roleDefinitionId`: Azure role definition ID (use WellKnownRoleIds)
- `props.description`: Optional description

**Example:**
```typescript
// Stack A: Storage
const storageStack = new SubscriptionStack(app, 'Storage', {...});
const storage = new StorageAccounts(storageStack, 'SharedStorage', {...});

// Stack B: Compute
const computeStack = new SubscriptionStack(app, 'Compute', {...});
const functionApp = new FunctionApp(computeStack, 'Processor', {...});

// Cross-stack grant: Create in compute stack
CrossStackGrant.create(computeStack, 'StorageAccess', {
  resource: storage,
  grantee: functionApp,
  roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
  description: 'Function processes blobs from shared storage'
});
```

### CrossStackGrant.createMultiple()

```typescript
CrossStackGrant.createMultiple(
  scope: Construct,
  baseId: string,
  grantee: IGrantable,
  grants: Array<{
    resource: IResourceWithId;
    roleDefinitionId: string;
    description?: string;
  }>
): RoleAssignment[]
```

Creates multiple cross-stack grants for the same identity.

**Example:**
```typescript
CrossStackGrant.createMultiple(computeStack, 'DataAccess', functionApp, [
  {
    resource: storage,
    roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
    description: 'Read blob data'
  },
  {
    resource: keyVault,
    roleDefinitionId: WellKnownRoleIds.KEY_VAULT_SECRETS_USER,
    description: 'Read secrets'
  },
  {
    resource: cosmos,
    roleDefinitionId: WellKnownRoleIds.COSMOS_DB_DATA_READER,
    description: 'Read cosmos data'
  }
]);
```

## Well-Known Role IDs

**Location:** `@atakora/lib/authorization` - `WellKnownRoleIds` enum

### Storage Roles

```typescript
WellKnownRoleIds.STORAGE_BLOB_DATA_READER
WellKnownRoleIds.STORAGE_BLOB_DATA_CONTRIBUTOR
WellKnownRoleIds.STORAGE_BLOB_DATA_OWNER
WellKnownRoleIds.STORAGE_QUEUE_DATA_READER
WellKnownRoleIds.STORAGE_QUEUE_DATA_CONTRIBUTOR
WellKnownRoleIds.STORAGE_QUEUE_DATA_MESSAGE_PROCESSOR
WellKnownRoleIds.STORAGE_TABLE_DATA_READER
WellKnownRoleIds.STORAGE_TABLE_DATA_CONTRIBUTOR
WellKnownRoleIds.STORAGE_FILE_DATA_SMB_SHARE_READER
WellKnownRoleIds.STORAGE_FILE_DATA_SMB_SHARE_CONTRIBUTOR
```

### KeyVault Roles

```typescript
WellKnownRoleIds.KEY_VAULT_SECRETS_USER
WellKnownRoleIds.KEY_VAULT_SECRETS_OFFICER
WellKnownRoleIds.KEY_VAULT_CERTIFICATES_USER
WellKnownRoleIds.KEY_VAULT_CERTIFICATES_OFFICER
WellKnownRoleIds.KEY_VAULT_CRYPTO_USER
WellKnownRoleIds.KEY_VAULT_CRYPTO_OFFICER
WellKnownRoleIds.KEY_VAULT_READER
```

### Cosmos DB Roles

```typescript
WellKnownRoleIds.COSMOS_DB_DATA_READER
WellKnownRoleIds.COSMOS_DB_DATA_CONTRIBUTOR
WellKnownRoleIds.COSMOS_DB_ACCOUNT_READER
WellKnownRoleIds.COSMOS_DB_OPERATOR
```

### SQL Roles

```typescript
WellKnownRoleIds.SQL_DB_CONTRIBUTOR
WellKnownRoleIds.SQL_MANAGED_INSTANCE_CONTRIBUTOR
WellKnownRoleIds.SQL_SERVER_CONTRIBUTOR
```

### Event Hub & Service Bus Roles

```typescript
WellKnownRoleIds.EVENT_HUBS_DATA_SENDER
WellKnownRoleIds.EVENT_HUBS_DATA_RECEIVER
WellKnownRoleIds.EVENT_HUBS_DATA_OWNER
WellKnownRoleIds.SERVICE_BUS_DATA_SENDER
WellKnownRoleIds.SERVICE_BUS_DATA_RECEIVER
WellKnownRoleIds.SERVICE_BUS_DATA_OWNER
```

## UserAssignedIdentity

**Location:** `@atakora/lib/managedidentity` - `UserAssignedIdentity` class

### Constructor

```typescript
new UserAssignedIdentity(scope: Construct, id: string, props: {
  identityName: string;
  location: string;
  tags?: Record<string, string>;
})
```

### Properties

```typescript
readonly identityName: string;
readonly location: string;
readonly principalId: string;        // ARM reference expression
readonly clientId: string;           // ARM reference expression
readonly principalType: PrincipalType.ManagedIdentity;
readonly resourceId: string;
```

### Example

```typescript
const identity = new UserAssignedIdentity(stack, 'AppIdentity', {
  identityName: 'my-app-identity',
  location: 'eastus'
});

// Use as grantee
storage.grantBlobRead(identity, 'Allow identity to read blobs');
```

## RoleAssignment (L2)

**Location:** `@atakora/lib/authorization` - `RoleAssignment` class

### Constructor

```typescript
new RoleAssignment(scope: Construct, id: string, props: {
  scope: string;
  roleDefinitionId: string;
  principalId: string;
  principalType: PrincipalType;
  tenantId?: string;
  description?: string;
  condition?: string;
  conditionVersion?: '2.0';
  skipPrincipalValidation?: boolean;
})
```

### Properties

```typescript
readonly roleDefinitionId: string;
readonly scope: string;
readonly principalId: string;
readonly roleAssignmentId: string;
```

### Example

```typescript
const assignment = new RoleAssignment(stack, 'CustomGrant', {
  scope: storage.resourceId,
  roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
  principalId: identity.principalId,
  principalType: PrincipalType.ManagedIdentity,
  description: 'Custom role assignment',
  condition: `@Resource[Microsoft.Storage/storageAccounts/blobServices/containers:name] StringEquals 'logs'`,
  conditionVersion: '2.0'
});
```

## Best Practices

### 1. Use Grant Methods Over Direct RoleAssignment

**Preferred:**
```typescript
storage.grantBlobRead(functionApp, 'Function needs blob access');
```

**Not Recommended:**
```typescript
new RoleAssignment(stack, 'Grant', {
  scope: storage.resourceId,
  roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER,
  principalId: functionApp.principalId,
  principalType: PrincipalType.ManagedIdentity
});
```

### 2. Always Include Descriptions

```typescript
storage.grantBlobRead(
  functionApp,
  'Function app processes uploaded images from blob storage'
);
```

### 3. Use Least Privilege

Grant only the minimum permissions needed:

```typescript
// Good: Specific permission
storage.grantBlobRead(functionApp, 'Read-only access for processing');

// Bad: Overly broad permission
storage.grantBlobWrite(functionApp, 'Just in case we need write access');
```

### 4. Cross-Stack Grants in Grantee's Stack

Create cross-stack role assignments in the stack where the identity lives:

```typescript
// Create in computeStack where functionApp lives
CrossStackGrant.create(computeStack, 'StorageAccess', {
  resource: storage, // from storageStack
  grantee: functionApp,
  roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER
});
```

### 5. Group Related Grants

Use `createMultiple` for identities that need access to several resources:

```typescript
CrossStackGrant.createMultiple(stack, 'FunctionDataAccess', functionApp, [
  { resource: storage, roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER },
  { resource: keyVault, roleDefinitionId: WellKnownRoleIds.KEY_VAULT_SECRETS_USER },
  { resource: cosmos, roleDefinitionId: WellKnownRoleIds.COSMOS_DB_DATA_READER }
]);
```

## Common Patterns

### Pattern 1: Function App with Multiple Data Sources

```typescript
const functionApp = new FunctionApp(stack, 'Processor', {
  plan: appServicePlan,
  storageAccount: storageForFunctionApp,
  identity: {
    type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
  }
});

// Grant access to data sources
dataStorage.grantBlobRead(functionApp, 'Read input data');
outputStorage.grantBlobWrite(functionApp, 'Write processed results');
keyVault.grantSecretsRead(functionApp, 'Read API keys and connection strings');
cosmos.grantDataRead(functionApp, 'Read configuration from Cosmos');
```

### Pattern 2: Shared User-Assigned Identity

```typescript
const sharedIdentity = new UserAssignedIdentity(stack, 'SharedIdentity', {
  identityName: 'app-shared-identity',
  location: 'eastus'
});

// Multiple resources share the same identity
storage.grantBlobRead(sharedIdentity, 'Shared storage access');
keyVault.grantSecretsRead(sharedIdentity, 'Shared secrets access');
cosmos.grantDataRead(sharedIdentity, 'Shared data access');

// Assign identity to multiple function apps
const functionApp1 = new FunctionApp(stack, 'Function1', {
  identity: {
    type: ManagedServiceIdentityType.USER_ASSIGNED,
    userAssignedIdentities: {
      [sharedIdentity.resourceId]: {}
    }
  }
});
```

### Pattern 3: Cross-Stack Shared Services

```typescript
// Shared services stack
const sharedStack = new SubscriptionStack(app, 'Shared', {...});
const sharedStorage = new StorageAccounts(sharedStack, 'Storage', {...});
const sharedKeyVault = new Vaults(sharedStack, 'KeyVault', {...});

// Application stacks
const app1Stack = new SubscriptionStack(app, 'App1', {...});
const app1Function = new FunctionApp(app1Stack, 'Function', {...});

const app2Stack = new SubscriptionStack(app, 'App2', {...});
const app2Function = new FunctionApp(app2Stack, 'Function', {...});

// Grant both apps access to shared services
CrossStackGrant.create(app1Stack, 'SharedAccess', {
  resource: sharedStorage,
  grantee: app1Function,
  roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER
});

CrossStackGrant.create(app2Stack, 'SharedAccess', {
  resource: sharedStorage,
  grantee: app2Function,
  roleDefinitionId: WellKnownRoleIds.STORAGE_BLOB_DATA_READER
});
```

## Error Handling

### Missing Identity

```typescript
const functionApp = new FunctionApp(stack, 'Function', {
  // No identity specified
});

// Throws error: "Cannot access principalId - no managed identity configured"
storage.grantBlobRead(functionApp);
```

**Solution:** Enable identity in function app:
```typescript
const functionApp = new FunctionApp(stack, 'Function', {
  identity: {
    type: ManagedServiceIdentityType.SYSTEM_ASSIGNED
  }
});
```

### User-Assigned Only Identity

```typescript
const functionApp = new FunctionApp(stack, 'Function', {
  identity: {
    type: ManagedServiceIdentityType.USER_ASSIGNED,
    userAssignedIdentities: { ... }
  }
});

// Throws error: "FunctionApp has only user-assigned identity"
storage.grantBlobRead(functionApp);
```

**Solution:** Use system-assigned or combined identity for IGrantable support:
```typescript
identity: {
  type: ManagedServiceIdentityType.SYSTEM_ASSIGNED_USER_ASSIGNED,
  userAssignedIdentities: { ... }
}
```

## Testing

See integration tests at: `packages/cdk/__tests__/integration/rbac-grants.integration.test.ts`

Example test:
```typescript
it('should grant blob read access', () => {
  const storage = new StorageAccounts(resourceGroup, 'Storage', {
    storageAccountName: 'testsa'
  });

  const functionApp = new FunctionApp(resourceGroup, 'Function', {
    plan: mockPlan,
    storageAccount: mockStorage,
    identity: { type: ManagedServiceIdentityType.SYSTEM_ASSIGNED }
  });

  const grant = storage.grantBlobRead(functionApp);

  expect(grant.roleDefinitionId).toBe(WellKnownRoleIds.STORAGE_BLOB_DATA_READER);
  expect(grant.scope).toBe(storage.resourceId);
});
```

## Related Documentation

- [Migration Guide](../guides/rbac-migration.md) - Migrating from manual role assignments
- [Architecture Design](../design/architecture/azure-rbac-implementation-plan.md) - Implementation details
- [Examples](../../examples/rbac-grants/) - Complete working examples

## Support

For issues, questions, or feature requests related to the RBAC Grant Pattern:
1. Check the [Migration Guide](../guides/rbac-migration.md)
2. Review [Example Projects](../../examples/rbac-grants/)
3. Consult the [Architecture Design](../design/architecture/azure-rbac-implementation-plan.md)
