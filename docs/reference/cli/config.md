# atakora config

**Navigation**: [Docs Home](../../README.md) > [Reference](../README.md) > [CLI Reference](./README.md) > config

---

## Synopsis

```bash
atakora config <subcommand> [options]
```

## Description

Manages Azure authentication configuration for Atakora deployments. This command handles credential storage, profile management, and authentication setup for both local development and CI/CD environments.

Configuration is stored in `.atakora/config.json` (gitignored) and supports multiple profiles for different environments or subscriptions.

## Subcommands

### `set-credentials`

Interactively configure Azure credentials.

```bash
atakora config set-credentials [options]
```

### `get`

Get a configuration value.

```bash
atakora config get <key>
```

### `set`

Set a configuration value.

```bash
atakora config set <key> <value>
```

### `list`

List all configuration profiles.

```bash
atakora config list
```

### `use-profile`

Switch to a different profile.

```bash
atakora config use-profile <profile-name>
```

### `delete-profile`

Delete a configuration profile.

```bash
atakora config delete-profile <profile-name>
```

### `show`

Display current configuration.

```bash
atakora config show
```

## set-credentials

Configure Azure authentication credentials.

### Options

#### `--profile <name>`

Profile name for these credentials.

- **Type**: string
- **Default**: `default`
- **Example**: `--profile production`

#### `--tenant-id <id>`

Azure Active Directory tenant ID.

- **Type**: string (UUID)
- **Example**: `--tenant-id 00000000-0000-0000-0000-000000000000`

#### `--client-id <id>`

Service principal client ID (application ID).

- **Type**: string (UUID)
- **Example**: `--client-id 11111111-1111-1111-1111-111111111111`

#### `--client-secret <secret>`

Service principal client secret.

- **Type**: string
- **Example**: `--client-secret "your-secret-value"`

#### `--subscription-id <id>`

Azure subscription ID.

- **Type**: string (UUID)
- **Example**: `--subscription-id 22222222-2222-2222-2222-222222222222`

#### `--use-azure-cli`

Use Azure CLI authentication instead of service principal.

- **Type**: boolean (flag)
- **Example**: `--use-azure-cli`

### Examples

**Interactive Setup**:

```bash
atakora config set-credentials
```

Prompts:
```
? Profile name: (default) production
? Azure Tenant ID: 00000000-0000-0000-0000-000000000000
? Client ID (Application ID): 11111111-1111-1111-1111-111111111111
? Client Secret: ********
? Subscription ID: 22222222-2222-2222-2222-222222222222

✓ Credentials saved to profile 'production'
✓ Profile 'production' set as current
```

**Non-Interactive**:

```bash
atakora config set-credentials \
  --profile production \
  --tenant-id 00000000-0000-0000-0000-000000000000 \
  --client-id 11111111-1111-1111-1111-111111111111 \
  --client-secret "your-secret" \
  --subscription-id 22222222-2222-2222-2222-222222222222
```

**Azure CLI Authentication**:

```bash
az login
atakora config set-credentials --use-azure-cli --profile dev
```

## get

Retrieve configuration value.

### Arguments

- `<key>`: Configuration key (e.g., `currentProfile`, `profiles.production.tenantId`)

### Examples

```bash
# Get current profile
atakora config get currentProfile
# Output: production

# Get tenant ID for profile
atakora config get profiles.production.tenantId
# Output: 00000000-0000-0000-0000-000000000000
```

## set

Set configuration value.

### Arguments

- `<key>`: Configuration key
- `<value>`: Value to set

### Examples

```bash
# Set current profile
atakora config set currentProfile staging

# Set custom config value
atakora config set deployment.autoApprove false
```

## list

List all configuration profiles.

### Examples

```bash
atakora config list
```

Output:
```
Available profiles:

  ● production (current)
      Tenant: 00000000-0000-0000-0000-000000000000
      Subscription: 22222222-2222-2222-2222-222222222222
      Auth Method: Service Principal

  ○ staging
      Tenant: 00000000-0000-0000-0000-000000000000
      Subscription: 33333333-3333-3333-3333-333333333333
      Auth Method: Service Principal

  ○ dev
      Subscription: (from Azure CLI)
      Auth Method: Azure CLI
```

## use-profile

Switch active profile.

### Arguments

- `<profile-name>`: Name of profile to activate

### Examples

```bash
atakora config use-profile staging
```

Output:
```
✓ Switched to profile 'staging'
  Subscription: 33333333-3333-3333-3333-333333333333
```

## delete-profile

Remove a profile from configuration.

### Arguments

- `<profile-name>`: Name of profile to delete

### Examples

```bash
atakora config delete-profile old-dev
```

Output:
```
⚠ This will delete profile 'old-dev'
  Are you sure? (y/N) y

✓ Profile 'old-dev' deleted
```

## show

Display current configuration (with secrets masked).

### Examples

```bash
atakora config show
```

Output:
```
Current Configuration:

Profile: production
Tenant ID: 00000000-0000-0000-0000-000000000000
Client ID: 11111111-1111-1111-1111-111111111111
Client Secret: ******** (set)
Subscription ID: 22222222-2222-2222-2222-222222222222
Auth Method: Service Principal

Configuration file: .atakora/config.json
```

## Configuration File

### Location

`.atakora/config.json` (automatically gitignored)

### Structure

```json
{
  "currentProfile": "production",
  "profiles": {
    "production": {
      "authMethod": "servicePrincipal",
      "tenantId": "00000000-0000-0000-0000-000000000000",
      "clientId": "11111111-1111-1111-1111-111111111111",
      "clientSecret": "your-secret-value",
      "subscriptionId": "22222222-2222-2222-2222-222222222222"
    },
    "staging": {
      "authMethod": "servicePrincipal",
      "tenantId": "00000000-0000-0000-0000-000000000000",
      "clientId": "44444444-4444-4444-4444-444444444444",
      "clientSecret": "staging-secret",
      "subscriptionId": "33333333-3333-3333-3333-333333333333"
    },
    "dev": {
      "authMethod": "azureCli"
    }
  }
}
```

### Security

**Never commit config.json**:

`.gitignore`:
```gitignore
.atakora/config.json
.atakora/*.json
!.atakora/manifest.json
```

**File permissions**:
```bash
# Restrict access (Unix/Linux/Mac)
chmod 600 .atakora/config.json
```

## Authentication Methods

### Service Principal (Recommended for CI/CD)

Use Azure AD application with secret:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "atakora-deploy" \
  --role Contributor \
  --scopes /subscriptions/00000000-0000-0000-0000-000000000000

# Output:
{
  "appId": "11111111-1111-1111-1111-111111111111",
  "displayName": "atakora-deploy",
  "password": "your-secret-value",
  "tenant": "00000000-0000-0000-0000-000000000000"
}

# Configure Atakora
atakora config set-credentials \
  --profile production \
  --tenant-id 00000000-0000-0000-0000-000000000000 \
  --client-id 11111111-1111-1111-1111-111111111111 \
  --client-secret "your-secret-value" \
  --subscription-id 00000000-0000-0000-0000-000000000000
```

### Azure CLI (Recommended for Local Development)

Use your personal Azure login:

```bash
# Login
az login

# Set subscription
az account set --subscription "Production"

# Configure Atakora
atakora config set-credentials --use-azure-cli --profile dev
```

### Environment Variables

Override config with environment variables:

```bash
export AZURE_TENANT_ID="00000000-0000-0000-0000-000000000000"
export AZURE_CLIENT_ID="11111111-1111-1111-1111-111111111111"
export AZURE_CLIENT_SECRET="your-secret-value"
export AZURE_SUBSCRIPTION_ID="22222222-2222-2222-2222-222222222222"

atakora deploy  # Uses environment variables
```

Environment variables take precedence over config file.

### Managed Identity (Azure-Hosted CI/CD)

For Azure DevOps or GitHub Actions hosted in Azure:

```bash
# No config needed - automatic
atakora deploy
```

## Multi-Environment Workflows

### Separate Profiles per Environment

```bash
# Set up development
az login
atakora config set-credentials --use-azure-cli --profile dev

# Set up staging
atakora config set-credentials --profile staging \
  --tenant-id ... \
  --client-id ... \
  --client-secret ... \
  --subscription-id ...

# Set up production
atakora config set-credentials --profile production \
  --tenant-id ... \
  --client-id ... \
  --client-secret ... \
  --subscription-id ...

# Switch between environments
atakora config use-profile dev
atakora deploy --package dev

atakora config use-profile production
atakora deploy --package production
```

### Profile per Subscription

```bash
# Configure each subscription
atakora config set-credentials --profile sub-dev \
  --subscription-id 11111111-1111-1111-1111-111111111111

atakora config set-credentials --profile sub-prod \
  --subscription-id 22222222-2222-2222-2222-222222222222

# Deploy to specific subscription
atakora config use-profile sub-dev
atakora deploy
```

## CI/CD Integration

### GitHub Actions

Use repository secrets instead of config file:

```yaml
- name: Deploy to Azure
  env:
    AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
    AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
    AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
    AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
  run: atakora deploy --no-confirm
```

### Azure DevOps

Use service connection:

```yaml
- task: AzureCLI@2
  inputs:
    azureSubscription: 'Production'
    scriptType: 'bash'
    scriptLocation: 'inlineScript'
    inlineScript: 'atakora deploy --no-confirm'
```

### GitLab CI

Use GitLab CI/CD variables:

```yaml
deploy:
  script:
    - atakora deploy --no-confirm
  variables:
    AZURE_TENANT_ID: $AZURE_TENANT_ID
    AZURE_CLIENT_ID: $AZURE_CLIENT_ID
    AZURE_CLIENT_SECRET: $AZURE_CLIENT_SECRET
    AZURE_SUBSCRIPTION_ID: $AZURE_SUBSCRIPTION_ID
```

## Common Issues

### Configuration File Not Found

**Error**:
```
Configuration file not found
Run 'atakora config set-credentials' to configure authentication
```

**Solution**:
```bash
atakora config set-credentials
```

### Invalid Credentials

**Error**:
```
Authentication failed: AADSTS700016
Tenant ID does not exist
```

**Solutions**:

1. Verify tenant ID:
   ```bash
   az account show --query tenantId -o tsv
   ```

2. Update configuration:
   ```bash
   atakora config set-credentials
   ```

### Permission Denied

**Error**:
```
AuthorizationFailed: The client '...' does not have authorization
```

**Solution**: Grant service principal appropriate role:
```bash
az role assignment create \
  --role Contributor \
  --assignee 11111111-1111-1111-1111-111111111111 \
  --subscription 00000000-0000-0000-0000-000000000000
```

### Profile Not Found

**Error**:
```
Profile 'staging' not found
```

**Solution**: Create profile or use existing one:
```bash
atakora config list  # List available profiles
atakora config set-credentials --profile staging
```

## Security Best Practices

### Local Development

**Use Azure CLI**:
```bash
az login
atakora config set-credentials --use-azure-cli
```

Advantages:
- No secrets in files
- Uses your personal credentials
- Automatic token refresh

### Production Deployments

**Use Service Principal**:
```bash
atakora config set-credentials \
  --profile production \
  --tenant-id ... \
  --client-id ... \
  --client-secret ...
```

**Restrict permissions**:
```bash
# Minimum required: Contributor on resource group
az role assignment create \
  --role Contributor \
  --assignee $CLIENT_ID \
  --resource-group rg-production
```

### CI/CD Pipelines

**Use environment variables**:
- Never commit config.json
- Store secrets in CI/CD secret management
- Use managed identity when possible

**Rotate secrets regularly**:
```bash
# Create new secret
az ad sp credential reset \
  --id 11111111-1111-1111-1111-111111111111

# Update config
atakora config set-credentials --profile production
```

### Secret Management

**Use Azure Key Vault**:
```bash
# Store client secret in Key Vault
az keyvault secret set \
  --vault-name my-keyvault \
  --name atakora-client-secret \
  --value "your-secret"

# Retrieve in CI/CD
CLIENT_SECRET=$(az keyvault secret show \
  --vault-name my-keyvault \
  --name atakora-client-secret \
  --query value -o tsv)

export AZURE_CLIENT_SECRET=$CLIENT_SECRET
atakora deploy
```

## See Also

- [`atakora deploy`](./deploy.md) - Deploy using configured credentials
- [Authentication Workflows](../../guides/workflows/managing-secrets.md)
- [CI/CD Guide](../../guides/tutorials/ci-cd-pipeline.md)
- [Troubleshooting](../../troubleshooting/common-issues.md)

---

**Last Updated**: 2025-10-08
**CLI Version**: 1.0.0+
