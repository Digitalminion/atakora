# Authorization Resources API (@atakora/cdk/authorization)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > Authorization

---

## Overview

The authorization namespace provides constructs for Azure Role-Based Access Control (RBAC), including role assignments that grant permissions to users, groups, service principals, and managed identities.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import {
  RoleAssignments
} from '@atakora/cdk/authorization';
```

## Status

The Authorization namespace is currently under development. The following constructs are planned:

### Planned Constructs

#### RoleAssignments
Assigns Azure RBAC roles to identities at various scopes.

**Planned Features**:
- Built-in role assignments
- Custom role assignments
- Principal type detection
- Scope management (subscription, resource group, resource)
- Condition-based assignments

---

## Role-Based Access Control (RBAC)

### Key Concepts

**Security Principal**: Who gets access
- User
- Group
- Service Principal
- Managed Identity

**Role Definition**: What they can do
- Built-in roles (Owner, Contributor, Reader, etc.)
- Custom roles

**Scope**: Where they can do it
- Management Group
- Subscription
- Resource Group
- Resource

**Role Assignment**: The link between principal, role, and scope

---

## Planned Usage Examples

### Assign Built-In Role

```typescript
// Example of planned usage (not yet implemented)
import { RoleAssignments } from '@atakora/cdk/authorization';

const assignment = new RoleAssignments(resourceGroup, 'StorageAccess', {
  principalId: managedIdentity.principalId,
  roleDefinitionId: 'StorageBlobDataReader',  // Built-in role name
  scope: storageAccount.id
});
```

### Grant Multiple Permissions

```typescript
// Planned usage
const readerAssignment = new RoleAssignments(resourceGroup, 'BlobReader', {
  principalId: appIdentity.principalId,
  roleDefinitionId: 'Storage Blob Data Reader',
  scope: storageAccount.id
});

const contributorAssignment = new RoleAssignments(resourceGroup, 'QueueContributor', {
  principalId: appIdentity.principalId,
  roleDefinitionId: 'Storage Queue Data Contributor',
  scope: storageAccount.id
});
```

### Resource Group Level Assignment

```typescript
// Planned usage
const rgAssignment = new RoleAssignments(resourceGroup, 'ContributorAccess', {
  principalId: devTeamGroupId,
  roleDefinitionId: 'Contributor',
  scope: resourceGroup.id
});
```

### Subscription Level Assignment

```typescript
// Planned usage
const subAssignment = new RoleAssignments(subscription, 'ReaderAccess', {
  principalId: auditTeamGroupId,
  roleDefinitionId: 'Reader',
  scope: subscription.id
});
```

---

## Common Built-In Roles

### General Roles

**Owner**
- Full access including access management
- Can assign roles to others
- Use sparingly

**Contributor**
- Create and manage resources
- Cannot grant access to others
- Most common role for developers

**Reader**
- View all resources
- Cannot make changes
- Good for monitoring and auditing

### Storage Roles

**Storage Blob Data Owner**
- Full access to blob containers and data
- Can manage ACLs

**Storage Blob Data Contributor**
- Read, write, and delete blobs
- Cannot manage ACLs

**Storage Blob Data Reader**
- Read blobs and list containers
- Most secure for read-only access

**Storage Queue Data Contributor**
- Read, write, and delete queue messages

### Database Roles

**SQL DB Contributor**
- Manage SQL databases
- Cannot manage servers or access policies

**Cosmos DB Account Reader**
- Read Cosmos DB account metadata

### Key Vault Roles

**Key Vault Administrator**
- Full access to Key Vault and contents

**Key Vault Secrets User**
- Read secret contents
- Recommended for applications

**Key Vault Crypto User**
- Encrypt/decrypt using keys

### Application Roles

**Website Contributor**
- Manage web apps
- Cannot assign roles

**API Management Service Contributor**
- Manage API Management services

---

## Common Patterns

### Application Access to Storage

```typescript
// Planned pattern
import { UserAssignedIdentities } from '@atakora/cdk/managedidentity';
import { RoleAssignments } from '@atakora/cdk/authorization';

const appIdentity = new UserAssignedIdentities(resourceGroup, 'AppIdentity');

// Grant blob read access
const blobAccess = new RoleAssignments(resourceGroup, 'BlobAccess', {
  principalId: appIdentity.principalId,
  roleDefinitionId: 'Storage Blob Data Reader',
  scope: storageAccount.id
});

// Use in application
const webApp = new WebApps(resourceGroup, 'Api', {
  userAssignedIdentities: [appIdentity],
  appSettings: {
    STORAGE_ACCOUNT_URL: storageAccount.primaryEndpoints.blob
  }
});
```

### Multi-Service Access Pattern

```typescript
// Planned pattern
const identity = new UserAssignedIdentities(resourceGroup, 'MultiServiceIdentity');

// Storage access
new RoleAssignments(resourceGroup, 'StorageAccess', {
  principalId: identity.principalId,
  roleDefinitionId: 'Storage Blob Data Contributor',
  scope: storageAccount.id
});

// Key Vault access
new RoleAssignments(resourceGroup, 'VaultAccess', {
  principalId: identity.principalId,
  roleDefinitionId: 'Key Vault Secrets User',
  scope: vault.id
});

// Cosmos DB access
new RoleAssignments(resourceGroup, 'CosmosAccess', {
  principalId: identity.principalId,
  roleDefinitionId: 'Cosmos DB Account Reader Role',
  scope: cosmosDb.id
});
```

### Team Access Pattern

```typescript
// Planned pattern
// Developer team gets contributor access to dev resource group
new RoleAssignments(devResourceGroup, 'DevTeamAccess', {
  principalId: devTeamGroupId,
  roleDefinitionId: 'Contributor',
  scope: devResourceGroup.id
});

// Operations team gets contributor access to prod resource group
new RoleAssignments(prodResourceGroup, 'OpsTeamAccess', {
  principalId: opsTeamGroupId,
  roleDefinitionId: 'Contributor',
  scope: prodResourceGroup.id
});

// Security team gets reader access at subscription level
new RoleAssignments(subscription, 'SecurityTeamAccess', {
  principalId: securityTeamGroupId,
  roleDefinitionId: 'Reader',
  scope: subscription.id
});
```

---

## Government Cloud Considerations

### Availability
RBAC is fully available in Azure Government Cloud with complete feature parity.

**Features**:
- All built-in roles available
- Custom role definitions supported
- Same role assignment process
- Full audit logging

### Compliance
- FedRAMP High compliant
- DoD Impact Level 5
- Full Azure AD integration
- Enhanced logging for compliance

### No Differences
RBAC works identically in commercial and government clouds.

---

## Best Practices

### Principle of Least Privilege
- Grant minimum permissions needed
- Use specific roles instead of broad ones
- Prefer Reader over Contributor when possible
- Use resource-level scope instead of subscription-level

### Identity Management
- Use managed identities instead of service principals
- Use groups for user access instead of individual assignments
- Regularly audit role assignments
- Remove unused assignments

### Scope Management
- Assign at the narrowest scope possible
- Use resource group scope for related resources
- Avoid subscription-level assignments unless needed
- Document why each assignment exists

### Security
- Never use Owner role for applications
- Separate duties between teams
- Implement break-glass accounts
- Enable PIM (Privileged Identity Management) for sensitive roles
- Regular access reviews

---

## Role Assignment via Azure CLI

### Assign to Managed Identity

```bash
# Get managed identity principal ID
PRINCIPAL_ID=$(az identity show \
  --name my-identity \
  --resource-group my-rg \
  --query principalId \
  --output tsv)

# Assign Storage Blob Data Reader role
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Storage Blob Data Reader" \
  --scope <storage-account-resource-id>
```

### Assign to User

```bash
# Get user object ID
USER_ID=$(az ad user show \
  --id user@contoso.com \
  --query id \
  --output tsv)

# Assign Contributor role at resource group
az role assignment create \
  --assignee $USER_ID \
  --role "Contributor" \
  --resource-group my-rg
```

### Assign to Group

```bash
# Get group object ID
GROUP_ID=$(az ad group show \
  --group "Dev Team" \
  --query id \
  --output tsv)

# Assign role
az role assignment create \
  --assignee $GROUP_ID \
  --role "Contributor" \
  --resource-group dev-rg
```

---

## Custom Roles

### Create Custom Role

```json
{
  "Name": "Storage Account Key Reader",
  "Description": "Can read storage account keys",
  "Actions": [
    "Microsoft.Storage/storageAccounts/listkeys/action",
    "Microsoft.Storage/storageAccounts/read"
  ],
  "NotActions": [],
  "AssignableScopes": [
    "/subscriptions/{subscription-id}"
  ]
}
```

```bash
az role definition create --role-definition storage-key-reader.json
```

### Use Custom Role

```bash
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role "Storage Account Key Reader" \
  --scope <storage-account-resource-id>
```

---

## Troubleshooting

### Role Assignment Not Working
- Wait for propagation (up to 30 minutes)
- Verify principal ID is correct
- Check scope includes the resource
- Ensure role name is exact (case-sensitive)

### Permission Denied
- Verify role includes required actions
- Check for explicit Deny assignments
- Verify token includes correct scope
- Review audit logs for specific denial reason

### Cannot Assign Roles
- Verify you have Owner or User Access Administrator role
- Check assignment is at appropriate scope
- Ensure principal type is supported

---

## Audit and Monitoring

### View Role Assignments

```bash
# List all assignments for a resource
az role assignment list \
  --scope <resource-id> \
  --output table

# List assignments for a principal
az role assignment list \
  --assignee <principal-id> \
  --output table

# List assignments for a resource group
az role assignment list \
  --resource-group my-rg \
  --output table
```

### Activity Log Queries

```kql
// Role assignment changes
AzureActivity
| where OperationNameValue has "Microsoft.Authorization/roleAssignments"
| project TimeGenerated, Caller, OperationNameValue, ActivityStatusValue, Resource
| order by TimeGenerated desc
```

---

## See Also

- [Managed Identity Resources](./managedidentity.md) - Identities for role assignments
- [Resources](./resources.md) - Resource group scope
- [Key Vault Resources](./keyvault.md) - Key Vault specific roles
- [Storage Resources](./storage.md) - Storage specific roles
- [Azure RBAC Documentation](https://docs.microsoft.com/azure/role-based-access-control/)

---

**Last Updated**: 2025-10-09
**Version**: @atakora/cdk 1.0.0
**Status**: Under Development
