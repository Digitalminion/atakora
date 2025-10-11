# Authentication & Authorization

**Navigation**: [Docs Home](../README.md) > [Reference](./README.md) > Authentication

---

## Overview

Atakora provides a comprehensive authentication system for managing Azure credentials across different cloud environments (Commercial and Government). The system handles both interactive and non-interactive authentication, credential caching, and multi-tenant scenarios.

## Architecture

### Components

```
┌─────────────────────┐
│   CLI Commands      │
│  (config, deploy)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   AuthManager       │  Singleton credential cache
│  (auth-manager.ts)  │  Per-cloud service instances
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  AzureAuthService   │  Cloud-specific auth
│  (azure-auth.ts)    │  DefaultAzureCredential
└─────────────────────┘
           │
           ▼
┌─────────────────────┐
│  @azure/identity    │  Azure SDK
└─────────────────────┘
```

### Design Principles

1. **Singleton Pattern**: Single AuthManager instance across all CLI commands
2. **Credential Caching**: Credentials cached per cloud environment to avoid re-authentication
3. **Multi-Cloud Support**: Separate credential chains for Commercial and Government clouds
4. **Fallback Chain**: Multiple authentication methods attempted in priority order

## Authentication Manager

### AuthManager Class

The `AuthManager` is a singleton that caches credentials across CLI commands.

**Location**: `packages/cli/src/auth/auth-manager.ts`

#### API Reference

```typescript
class AuthManager {
  /**
   * Get the singleton instance
   */
  static getInstance(): AuthManager;

  /**
   * Get or create an AzureAuthService for a cloud environment
   *
   * @param cloud - Cloud environment ('AzureCloud' | 'AzureUSGovernment')
   * @returns Auth service instance
   */
  getAuthService(cloud?: CloudEnvironment): AzureAuthService;

  /**
   * Get credential for current cloud environment
   *
   * @param cloud - Optional cloud override
   * @returns Token credential for Azure SDK
   * @throws Error if not authenticated
   */
  getCredential(cloud?: CloudEnvironment): TokenCredential;

  /**
   * Create a credential for specific tenant
   *
   * @param tenantId - Azure AD tenant UUID
   * @param cloud - Optional cloud override
   * @returns Tenant-scoped credential
   */
  createCredential(tenantId: string, cloud?: CloudEnvironment): TokenCredential;

  /**
   * Check if authenticated for a cloud environment
   *
   * @param cloud - Optional cloud to check
   * @returns True if credentials available
   */
  isAuthenticated(cloud?: CloudEnvironment): boolean;

  /**
   * Clear all cached credentials
   */
  clearCredentials(): void;

  /**
   * Get current cloud environment
   *
   * @returns Active cloud environment
   */
  getCurrentCloud(): CloudEnvironment;
}
```

#### Usage

```typescript
import { authManager } from '@atakora/cli/auth/auth-manager';

// Get credential for current cloud
const credential = authManager.getCredential();

// Use with Azure SDK
import { ResourceManagementClient } from '@azure/arm-resources';
const client = new ResourceManagementClient(credential, subscriptionId);

// Check if authenticated
if (!authManager.isAuthenticated()) {
  console.log('Please run: atakora config login');
  process.exit(1);
}

// Switch to Government cloud
const govCredential = authManager.getCredential('AzureUSGovernment');
```

### AzureAuthService Class

Handles cloud-specific authentication using Azure SDK's `DefaultAzureCredential`.

**Location**: `packages/cli/src/auth/azure-auth.ts`

#### API Reference

```typescript
type CloudEnvironment = 'AzureCloud' | 'AzureUSGovernment';

class AzureAuthService {
  /**
   * Create an auth service for a cloud environment
   *
   * @param cloud - Target cloud environment
   */
  constructor(cloud: CloudEnvironment);

  /**
   * Get credential using DefaultAzureCredential chain
   *
   * @returns Token credential
   * @throws Error if no authentication method succeeds
   */
  getCredential(): TokenCredential;

  /**
   * Create tenant-specific credential
   *
   * @param tenantId - Azure AD tenant UUID
   * @returns Tenant-scoped credential
   */
  createCredential(tenantId: string): TokenCredential;

  /**
   * Get cloud-specific authority host URL
   *
   * @returns Authority host for the cloud
   */
  getAuthorityHost(): string;

  /**
   * Verify credential by acquiring a token
   *
   * @param credential - Credential to verify
   * @returns Promise<boolean> - True if credential valid
   */
  async verifyCredential(credential: TokenCredential): Promise<boolean>;
}
```

#### Authentication Chain

The `DefaultAzureCredential` attempts authentication methods in this order:

1. **Environment Variables** (highest priority)
   - `AZURE_TENANT_ID`
   - `AZURE_CLIENT_ID`
   - `AZURE_CLIENT_SECRET`

2. **Managed Identity**
   - Azure VM, App Service, Container Instances
   - Only in Azure environments

3. **Azure CLI**
   - Uses `az login` credentials
   - Requires Azure CLI installed

4. **Azure PowerShell**
   - Uses `Connect-AzAccount` credentials
   - Requires PowerShell module

5. **Interactive Browser** (lowest priority, CI/CD disabled)
   - Opens browser for device code flow
   - Only for interactive sessions

#### Usage

```typescript
import { AzureAuthService } from '@atakora/cli/auth/azure-auth';

// Commercial cloud
const commercialAuth = new AzureAuthService('AzureCloud');
const credential = commercialAuth.getCredential();

// Government cloud
const govAuth = new AzureAuthService('AzureUSGovernment');
const govCredential = govAuth.getCredential();

// Tenant-specific
const tenantCredential = commercialAuth.createCredential('tenant-id-here');

// Verify credential
const isValid = await commercialAuth.verifyCredential(credential);
if (!isValid) {
  throw new Error('Authentication failed');
}
```

## Authentication Methods

### 1. Service Principal (Environment Variables)

**Best for**: CI/CD pipelines, automated deployments, production environments

#### Setup

```bash
# Set environment variables
export AZURE_TENANT_ID="00000000-0000-0000-0000-000000000000"
export AZURE_CLIENT_ID="11111111-1111-1111-1111-111111111111"
export AZURE_CLIENT_SECRET="your-client-secret"
export AZURE_SUBSCRIPTION_ID="22222222-2222-2222-2222-222222222222"

# Verify
atakora config show
```

#### Create Service Principal

```bash
# Create service principal with Contributor role
az ad sp create-for-rbac \
  --name "atakora-deployment" \
  --role "Contributor" \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION_ID" \
  --sdk-auth

# Output (save these values):
# {
#   "clientId": "...",
#   "clientSecret": "...",
#   "tenantId": "...",
#   "subscriptionId": "..."
# }
```

#### GitHub Actions

```yaml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Deploy to Azure
        env:
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
        run: |
          npm run synth
          npx atakora deploy
```

### 2. Azure CLI

**Best for**: Local development, interactive sessions

#### Setup

```bash
# Login to Azure
az login

# Select subscription
az account set --subscription "Your Subscription Name"

# Verify
az account show
```

#### Usage with Atakora

```bash
# CLI credentials automatically detected
atakora deploy

# No additional configuration needed
atakora synth
```

#### Multi-Tenant

```bash
# Login to specific tenant
az login --tenant "00000000-0000-0000-0000-000000000000"

# Use tenant ID in config
atakora config select --tenant "00000000-0000-0000-0000-000000000000"
```

### 3. Managed Identity

**Best for**: Azure VMs, App Service, Container Instances

#### System-Assigned Identity

```bash
# Enable on VM
az vm identity assign \
  --name myVM \
  --resource-group myResourceGroup

# Enable on App Service
az webapp identity assign \
  --name myWebApp \
  --resource-group myResourceGroup

# Grant permissions
az role assignment create \
  --assignee <principal-id> \
  --role "Contributor" \
  --scope "/subscriptions/<subscription-id>"
```

#### Usage

```bash
# No configuration needed - automatically detected
atakora deploy
```

#### User-Assigned Identity

```bash
# Create identity
az identity create \
  --name myIdentity \
  --resource-group myResourceGroup

# Assign to VM
az vm identity assign \
  --name myVM \
  --resource-group myResourceGroup \
  --identities /subscriptions/.../myIdentity

# Set environment variable
export AZURE_CLIENT_ID="<user-assigned-identity-client-id>"

# Deploy
atakora deploy
```

### 4. Interactive Browser

**Best for**: First-time setup, emergency access

#### Usage

```bash
# Trigger interactive login
atakora config login

# Browser opens for device code flow
# Enter code displayed in terminal
# Complete authentication in browser
```

#### Disable in CI/CD

```bash
# Disable interactive auth (fails if no other method works)
export AZURE_IDENTITY_DISABLE_INTERACTIVE_BROWSER=true

# CI/CD will fail fast if credentials missing
atakora deploy
```

## Cloud Environments

### Azure Commercial Cloud

**Default cloud environment for most users**

```typescript
const credential = authManager.getCredential('AzureCloud');
```

**Authority Host**: `https://login.microsoftonline.com/`

**Resource Manager**: `https://management.azure.com/`

#### Configuration

```bash
# Set via config command
atakora config select --cloud AzureCloud

# Or environment variable
export AZURE_CLOUD=AzureCloud
```

### Azure Government Cloud

**For US Government workloads with compliance requirements**

```typescript
const credential = authManager.getCredential('AzureUSGovernment');
```

**Authority Host**: `https://login.microsoftonline.us/`

**Resource Manager**: `https://management.usgovcloudapi.net/`

#### Configuration

```bash
# Set via config command
atakora config select --cloud AzureUSGovernment

# Or environment variable
export AZURE_CLOUD=AzureUSGovernment
```

#### Differences

| Feature | Commercial | Government |
|---------|-----------|------------|
| Authority | login.microsoftonline.com | login.microsoftonline.us |
| Resource Manager | management.azure.com | management.usgovcloudapi.net |
| Regions | Global | US-specific (usgovvirginia, usgovarizona) |
| Compliance | Standard | FedRAMP, CJIS, IRS 1075 |

#### Service Principal for Gov Cloud

```bash
# Login to Gov cloud
az cloud set --name AzureUSGovernment
az login

# Create service principal in Gov cloud
az ad sp create-for-rbac \
  --name "atakora-gov-deployment" \
  --role "Contributor" \
  --scopes "/subscriptions/YOUR_GOV_SUBSCRIPTION_ID"
```

## Configuration Storage

### Profile Configuration

**Location**: `~/.azure-arm/config.json`

**Structure**:
```json
{
  "activeProfile": "production",
  "profiles": {
    "production": {
      "name": "production",
      "tenantId": "00000000-0000-0000-0000-000000000000",
      "subscriptionId": "11111111-1111-1111-1111-111111111111",
      "subscriptionName": "Production Subscription",
      "cloud": "AzureCloud",
      "location": "eastus"
    },
    "govcloud": {
      "name": "govcloud",
      "tenantId": "22222222-2222-2222-2222-222222222222",
      "subscriptionId": "33333333-3333-3333-3333-333333333333",
      "subscriptionName": "Government Subscription",
      "cloud": "AzureUSGovernment",
      "location": "usgovvirginia"
    }
  }
}
```

### Security Considerations

1. **File Permissions**: Config file created with `0600` (owner read/write only)
2. **Directory Permissions**: Config directory created with `0700` (owner access only)
3. **No Secrets Stored**: Only tenant/subscription IDs stored, not credentials
4. **Credential Storage**: Managed by Azure SDK, not stored in config

### Managing Profiles

```bash
# Create profile interactively
atakora config select

# Create profile non-interactively
atakora config set-profile production \
  --tenant "00000000-0000-0000-0000-000000000000" \
  --subscription "11111111-1111-1111-1111-111111111111" \
  --cloud AzureCloud \
  --location eastus

# List profiles
atakora config list

# Show active profile
atakora config show

# Switch profile
atakora config use production

# Delete profile
atakora config delete govcloud
```

## Credential Scopes

### Subscription Scope

**Most common scope for deployments**

```typescript
import { authManager } from '@atakora/cli/auth/auth-manager';
import { ResourceManagementClient } from '@azure/arm-resources';

const credential = authManager.getCredential();
const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID!;

const client = new ResourceManagementClient(credential, subscriptionId);
```

### Tenant Scope

**For management group and tenant-level operations**

```typescript
const tenantId = '00000000-0000-0000-0000-000000000000';
const tenantCredential = authManager.createCredential(tenantId);

// Use for tenant-scoped operations
import { ManagementGroupsAPI } from '@azure/arm-managementgroups';
const mgClient = new ManagementGroupsAPI(tenantCredential);
```

### Multi-Tenant

**For managing resources across multiple tenants**

```typescript
// Tenant 1
const tenant1Credential = authManager.createCredential(tenant1Id);
const client1 = new ResourceManagementClient(tenant1Credential, subscription1Id);

// Tenant 2
const tenant2Credential = authManager.createCredential(tenant2Id);
const client2 = new ResourceManagementClient(tenant2Credential, subscription2Id);
```

## Troubleshooting

### Authentication Failed

**Problem**: `Error: DefaultAzureCredential failed to retrieve a token`

**Solutions**:

1. **Check environment variables**:
   ```bash
   echo $AZURE_TENANT_ID
   echo $AZURE_CLIENT_ID
   echo $AZURE_SUBSCRIPTION_ID
   # If using service principal:
   echo $AZURE_CLIENT_SECRET
   ```

2. **Try Azure CLI**:
   ```bash
   az login
   az account show
   atakora deploy
   ```

3. **Verify service principal**:
   ```bash
   # Test service principal
   az login --service-principal \
     --username $AZURE_CLIENT_ID \
     --password $AZURE_CLIENT_SECRET \
     --tenant $AZURE_TENANT_ID
   ```

### Wrong Cloud

**Problem**: `Error: 404 Subscription not found`

**Solution**: Check cloud configuration:
```bash
# Show current cloud
atakora config show

# Switch cloud
atakora config use production --cloud AzureCloud
# or
atakora config use govcloud --cloud AzureUSGovernment
```

### Expired Credentials

**Problem**: `Error: 401 Unauthorized - Token expired`

**Solutions**:

1. **Azure CLI re-login**:
   ```bash
   az logout
   az login
   ```

2. **Clear credential cache**:
   ```typescript
   authManager.clearCredentials();
   ```

3. **Refresh service principal secret**:
   ```bash
   # Create new secret
   az ad sp credential reset --id $AZURE_CLIENT_ID
   # Update AZURE_CLIENT_SECRET environment variable
   ```

### Permission Denied

**Problem**: `Error: 403 Forbidden - Insufficient privileges`

**Solution**: Grant required permissions:
```bash
# Check current role assignments
az role assignment list --assignee $AZURE_CLIENT_ID

# Grant Contributor role
az role assignment create \
  --assignee $AZURE_CLIENT_ID \
  --role "Contributor" \
  --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID"

# Or specific resource group
az role assignment create \
  --assignee $AZURE_CLIENT_ID \
  --role "Contributor" \
  --scope "/subscriptions/$AZURE_SUBSCRIPTION_ID/resourceGroups/myResourceGroup"
```

### Multi-Tenant Errors

**Problem**: `Error: Token was not issued for this tenant`

**Solution**: Create tenant-specific credential:
```typescript
// Instead of:
const credential = authManager.getCredential();

// Use:
const tenantCredential = authManager.createCredential(tenantId);
```

## Security Best Practices

### 1. Principle of Least Privilege

Grant minimum required permissions:

```bash
# Instead of Contributor on subscription
az role assignment create \
  --assignee $AZURE_CLIENT_ID \
  --role "Network Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/networking"

# Multiple specific roles better than broad permissions
```

### 2. Rotate Credentials Regularly

```bash
# Rotate service principal secret every 90 days
az ad sp credential reset --id $AZURE_CLIENT_ID --years 0.25

# Update stored secret
export AZURE_CLIENT_SECRET="new-secret"
```

### 3. Use Managed Identity When Possible

```bash
# Prefer managed identity over service principals
# No secrets to manage or rotate
# Automatic credential handling
```

### 4. Separate Environments

```bash
# Different service principals per environment
export DEV_CLIENT_ID="..."
export PROD_CLIENT_ID="..."

# Never use production credentials in development
```

### 5. Secure Credential Storage

```bash
# Use secret management systems
# GitHub Actions Secrets
# Azure Key Vault
# AWS Secrets Manager
# HashiCorp Vault

# Never commit credentials to git
git secrets --install
git secrets --register-azure
```

## See Also

- [Config Command Reference](./cli/config.md)
- [Azure Identity SDK Documentation](https://learn.microsoft.com/javascript/api/@azure/identity)
- [Service Principal Creation Guide](https://learn.microsoft.com/cli/azure/ad/sp)
- [Managed Identity Documentation](https://learn.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview)
- [Government Cloud Overview](https://learn.microsoft.com/azure/azure-government/)

---

**Last Updated**: 2025-10-10
**Version**: 1.0.0+
