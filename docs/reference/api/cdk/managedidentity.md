# Managed Identity Resources API (@atakora/cdk/managedidentity)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > Managed Identity

---

## Overview

The managedidentity namespace provides constructs for Azure Managed Identities. Managed identities eliminate the need for developers to manage credentials by providing an automatically managed identity in Azure AD for applications to use when connecting to resources that support Azure AD authentication.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import {
  UserAssignedIdentities
} from '@atakora/cdk/managedidentity';
```

## Status

The Managed Identity namespace is currently under development. The following constructs are planned:

### Planned Constructs

#### UserAssignedIdentities
User-assigned managed identities that can be assigned to multiple Azure resources.

**Planned Features**:
- Auto-generated identity names
- Federated identity credentials
- Lifecycle management separate from resources
- Role assignment integration

---

## Managed Identity Types

### System-Assigned Managed Identity
- Lifecycle tied to the Azure resource
- Created and deleted with the resource
- Cannot be shared across resources
- Enabled through resource properties

### User-Assigned Managed Identity
- Independent lifecycle
- Can be assigned to multiple resources
- Created separately from resources
- Reusable across deployments

---

## Planned Usage Examples

### Create User-Assigned Identity

```typescript
// Example of planned usage (not yet implemented)
import { UserAssignedIdentities } from '@atakora/cdk/managedidentity';

const identity = new UserAssignedIdentities(resourceGroup, 'AppIdentity', {
  tags: { purpose: 'app-authentication' }
});
```

### Use with Web App

```typescript
// Planned usage
import { WebApps } from '@atakora/cdk/web';

const webApp = new WebApps(resourceGroup, 'Api', {
  userAssignedIdentities: [identity],
  appSettings: {
    AZURE_CLIENT_ID: identity.clientId
  }
});
```

### Use with Key Vault

```typescript
// Planned usage
import { Vaults } from '@atakora/cdk/keyvault';

const vault = new Vaults(resourceGroup, 'Secrets', {
  enableRbacAuthorization: true
});

// Grant identity access to secrets
vault.grantSecretsUser(identity);
```

### Multiple Resources Sharing Identity

```typescript
// Planned usage
const sharedIdentity = new UserAssignedIdentities(resourceGroup, 'SharedIdentity');

const webApp = new WebApps(resourceGroup, 'WebApp', {
  userAssignedIdentities: [sharedIdentity]
});

const functionApp = new FunctionApps(resourceGroup, 'Functions', {
  userAssignedIdentities: [sharedIdentity]
});
```

---

## System-Assigned vs User-Assigned

### When to Use System-Assigned

- **Simple scenarios**: Single resource needs an identity
- **Resource-specific access**: Identity only used by that resource
- **Automatic cleanup**: Identity deleted with resource
- **No sharing needed**: Each resource has its own identity

**Example**:
```typescript
const webApp = new WebApps(resourceGroup, 'Api', {
  enableSystemIdentity: true
});
// System-assigned identity automatically created and managed
```

### When to Use User-Assigned

- **Multiple resources**: Identity shared across resources
- **Pre-provisioned access**: Set up access before resources exist
- **Blue-green deployments**: Keep identity across deployments
- **Complex scenarios**: Need to manage identity lifecycle separately

**Example**:
```typescript
// Identity persists across web app deployments
const identity = new UserAssignedIdentities(resourceGroup, 'AppIdentity');

// Blue deployment
const webAppBlue = new WebApps(resourceGroup, 'ApiBlue', {
  userAssignedIdentities: [identity]
});

// Green deployment (same identity)
const webAppGreen = new WebApps(resourceGroup, 'ApiGreen', {
  userAssignedIdentities: [identity]
});
```

---

## Common Patterns

### Application Authentication to Azure Services

```typescript
// Planned pattern
const identity = new UserAssignedIdentities(resourceGroup, 'AppIdentity');

// Grant access to various Azure services
vault.grantSecretsUser(identity);
storageAccount.grantBlobDataReader(identity);
cosmosDb.grantDataReader(identity);

// Use in application
const webApp = new WebApps(resourceGroup, 'Api', {
  userAssignedIdentities: [identity],
  appSettings: {
    AZURE_CLIENT_ID: identity.clientId,
    KEY_VAULT_URL: vault.vaultUri,
    STORAGE_ACCOUNT_URL: storageAccount.primaryEndpoints.blob,
    COSMOS_DB_ENDPOINT: cosmosDb.documentEndpoint
  }
});
```

### Federated Identity for GitHub Actions

```typescript
// Planned pattern
const identity = new UserAssignedIdentities(resourceGroup, 'GitHubActions');

identity.addFederatedCredential('github', {
  issuer: 'https://token.actions.githubusercontent.com',
  subject: 'repo:myorg/myrepo:environment:production',
  audiences: ['api://AzureADTokenExchange']
});
```

### Cross-Subscription Access

```typescript
// Planned pattern
// Identity in subscription A
const identity = new UserAssignedIdentities(subscriptionAResourceGroup, 'CrossSubIdentity');

// Grant access to resources in subscription B
const storageInSubB = StorageAccount.fromResourceId(
  this,
  'StorageB',
  '/subscriptions/sub-b/resourceGroups/rg-b/providers/Microsoft.Storage/storageAccounts/storage-b'
);

storageInSubB.grantBlobDataContributor(identity);
```

---

## Government Cloud Considerations

### Availability
Managed identities are fully available in Azure Government Cloud with complete feature parity.

**Available Regions**:
- All Azure Government regions
- All DoD regions

### Features
All managed identity features available:
- System-assigned identities
- User-assigned identities
- Federated identity credentials
- Role assignments
- Service principal access

### Compliance
- FedRAMP High
- DoD Impact Level 5
- Full Azure AD integration

### No Differences
Managed identities work identically in commercial and government clouds with no API or feature differences.

---

## Best Practices

### Security
- Use managed identities instead of service principals with secrets
- Use user-assigned identities for production workloads
- Implement least privilege access
- Regularly audit role assignments
- Use federated credentials for CI/CD

### Identity Management
- Use descriptive names for user-assigned identities
- Tag identities with ownership and purpose
- Document which resources use which identities
- Implement lifecycle management for unused identities

### Access Control
- Grant minimum required permissions
- Use custom roles when built-in roles are too broad
- Separate identities by environment
- Use separate identities for different access patterns

### Operations
- Monitor identity usage through Azure AD logs
- Implement alerts for suspicious activity
- Regularly review and rotate if using federated credentials
- Document identity-to-resource mappings

---

## Role Assignment Examples

### Storage Access

```bash
# Grant Blob Data Reader to user-assigned identity
az role assignment create \
  --assignee <identity-client-id> \
  --role "Storage Blob Data Reader" \
  --scope <storage-account-resource-id>
```

### Key Vault Access

```bash
# Grant Key Vault Secrets User
az role assignment create \
  --assignee <identity-client-id> \
  --role "Key Vault Secrets User" \
  --scope <key-vault-resource-id>
```

### SQL Database Access

```bash
# Grant SQL DB Contributor
az role assignment create \
  --assignee <identity-client-id> \
  --role "SQL DB Contributor" \
  --scope <sql-database-resource-id>
```

---

## Federated Identity Credentials

### GitHub Actions

```json
{
  "name": "github-federated-credential",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:organization/repository:environment:production",
  "audiences": ["api://AzureADTokenExchange"]
}
```

### Azure DevOps

```json
{
  "name": "azdo-federated-credential",
  "issuer": "https://vstoken.dev.azure.com/<organization-id>",
  "subject": "sc://organization/project/service-connection",
  "audiences": ["api://AzureADTokenExchange"]
}
```

### Kubernetes

```json
{
  "name": "k8s-federated-credential",
  "issuer": "https://oidc.prod-aks.azure.com/<tenant-id>",
  "subject": "system:serviceaccount:namespace:serviceaccount",
  "audiences": ["api://AzureADTokenExchange"]
}
```

---

## Troubleshooting

### Identity Not Found
- Verify identity exists in correct subscription/resource group
- Check identity resource ID is correct
- Ensure identity is not soft-deleted

### Access Denied
- Verify role assignments are configured
- Check role assignment scope is correct
- Wait for role assignment propagation (up to 30 minutes)
- Verify resource supports managed identities

### Token Acquisition Failures
- Ensure MSI endpoint is accessible
- Verify identity is assigned to resource
- Check managed identity extension is running (VMs)
- Review application logs for specific errors

---

## See Also

- [Authorization Resources](./authorization.md) - Role assignments
- [Key Vault Resources](./keyvault.md) - Secure secret access
- [Storage Resources](./storage.md) - Storage account access
- [Web Resources](./web.md) - App Service identity usage
- [Azure Managed Identity Documentation](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/)

---

**Last Updated**: 2025-10-09
**Version**: @atakora/cdk 1.0.0
**Status**: Under Development
