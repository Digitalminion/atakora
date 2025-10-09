# Deployment

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Fundamentals](./README.md) > Deployment

Learn how to deploy your Atakora infrastructure to Azure, manage deployment lifecycles, and troubleshoot common deployment scenarios.

## Overview

After synthesizing your infrastructure code into ARM templates, the next step is deploying those templates to Azure. Atakora provides a streamlined deployment workflow that handles authentication, dependency ordering, and error recovery.

```typescript
// 1. Define infrastructure
const app = new AzureApp({
  organization: 'Contoso',
  project: 'WebApp',
});

const stack = new ResourceGroupStack(app, 'Production', {
  resourceGroupName: 'rg-webapp-prod',
  location: 'eastus2',
});

// 2. Synthesize to ARM templates
app.synth();

// 3. Deploy using CLI
// $ atakora deploy Production
```

## Deployment Workflow

### The Complete Deployment Process

```
┌─────────────────────┐
│ Infrastructure Code │
└──────────┬──────────┘
           │
           ▼
    ┌─────────────┐
    │   Synth     │  Generates ARM templates
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Validate   │  Check templates before deployment
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │    Diff     │  Preview changes
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Deploy    │  Submit to Azure Resource Manager
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │   Monitor   │  Track deployment progress
    └──────┬──────┘
           │
           ▼
    ┌─────────────┐
    │  Complete   │  Resources created in Azure
    └─────────────┘
```

### Step 1: Synthesize Templates

Generate ARM templates from your infrastructure code:

```bash
# Synthesize all stacks
atakora synth

# Synthesize specific stack
atakora synth Production

# Specify output directory
atakora synth --output ./infrastructure
```

**What happens during synthesis**:
- Constructs are traversed to build resource definitions
- Dependencies are resolved and ordered
- ARM templates are generated in JSON format
- Parameter files are created
- Manifest file tracks deployment metadata

**Output structure**:
```
arm.out/
├── production.template.json     # ARM template
├── production.parameters.json   # Parameter values
└── manifest.json                # Deployment metadata
```

### Step 2: Validate Templates

Validate templates before deploying to catch errors early:

```bash
# Validate all stacks
atakora validate

# Validate specific stack
atakora validate Production

# Use Azure's what-if validation
az deployment group what-if \
  --resource-group rg-webapp-prod \
  --template-file arm.out/production.template.json \
  --parameters arm.out/production.parameters.json
```

**Validation checks**:
- Template syntax correctness
- Resource property types
- Required properties present
- Naming conventions followed
- Azure policy compliance
- Resource quotas and limits

### Step 3: Preview Changes (Diff)

See what will change before deploying:

```bash
# Show changes for all stacks
atakora diff

# Show changes for specific stack
atakora diff Production

# Detailed output with resource-level changes
atakora diff Production --verbose
```

**Diff output example**:
```
Stack: Production

Resources
[+] Microsoft.Network/virtualNetworks vnet-main-prod (new)
[~] Microsoft.Storage/storageAccounts stappdata (update)
  ~ sku.name: Standard_LRS → Standard_GRS
[-] Microsoft.Web/sites webapp-old (delete)

Parameters
[~] location: eastus → eastus2
```

### Step 4: Deploy to Azure

Deploy your infrastructure:

```bash
# Deploy all stacks
atakora deploy

# Deploy specific stack
atakora deploy Production

# Deploy with confirmation prompts
atakora deploy Production --require-approval

# Deploy without prompts (CI/CD)
atakora deploy Production --auto-approve
```

**Deployment options**:

| Flag | Description |
|------|-------------|
| `--require-approval` | Prompt before deploying (default for production) |
| `--auto-approve` | Skip confirmation prompts |
| `--verbose` | Show detailed deployment logs |
| `--parallel` | Deploy independent stacks in parallel |
| `--rollback-on-error` | Automatically rollback on failure |

### Step 5: Monitor Deployment

Track deployment progress:

```bash
# Watch deployment in real-time
atakora deploy Production --watch

# Check deployment status
az deployment group show \
  --resource-group rg-webapp-prod \
  --name production-deployment
```

**Deployment states**:
- **Running**: Deployment in progress
- **Succeeded**: All resources created successfully
- **Failed**: Deployment encountered errors
- **Canceled**: Deployment was manually canceled

## Authentication

### Azure CLI Authentication

Atakora uses Azure CLI credentials by default:

```bash
# Login to Azure
az login

# Verify current subscription
az account show

# Set default subscription
az account set --subscription "Production Subscription"

# Configure Atakora default subscription
atakora config set subscription "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Service Principal Authentication

For CI/CD pipelines, use a service principal:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "atakora-deploy" \
  --role Contributor \
  --scopes /subscriptions/{subscription-id}

# Login with service principal
az login --service-principal \
  --username {app-id} \
  --password {password} \
  --tenant {tenant-id}
```

**Store credentials securely**:

```bash
# GitHub Actions
# Use repository secrets: AZURE_CREDENTIALS

# Azure DevOps
# Use service connection

# Environment variables
export AZURE_CLIENT_ID="xxx"
export AZURE_CLIENT_SECRET="xxx"
export AZURE_TENANT_ID="xxx"
export AZURE_SUBSCRIPTION_ID="xxx"
```

### Managed Identity Authentication

When running on Azure resources (VMs, Container Instances, etc.):

```bash
# Enable system-assigned managed identity
az vm identity assign --name myVM --resource-group myRG

# Atakora automatically uses managed identity when available
atakora deploy Production
```

### Authentication Priority

Atakora attempts authentication in this order:

1. **Environment variables** (`AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, etc.)
2. **Managed identity** (when running on Azure resources)
3. **Azure CLI credentials** (`az login`)
4. **Configuration file** (`~/.atakora/config.json`)

## Deployment Strategies

### Standard Deployment

Deploy all resources in a single operation:

```bash
atakora deploy Production
```

**Best for**:
- Small to medium infrastructure
- Non-production environments
- Quick iterations during development

### Incremental Deployment

Deploy changes without affecting unchanged resources (Azure default):

```bash
# Incremental mode (default)
atakora deploy Production --mode Incremental
```

**Behavior**:
- Creates new resources
- Updates modified resources
- **Leaves unchanged resources alone**
- Does **not** delete resources removed from template

### Complete Deployment

Replace all resources in the resource group:

```bash
# Complete mode (destructive)
atakora deploy Production --mode Complete
```

**Warning**: Complete mode deletes resources not defined in the template!

**Best for**:
- Ensuring exact infrastructure state
- Removing orphaned resources
- Production deployments with careful review

### Staged Deployment

Deploy in stages to minimize risk:

```bash
# Stage 1: Deploy network infrastructure
atakora deploy NetworkStack

# Stage 2: Deploy data layer
atakora deploy DataStack

# Stage 3: Deploy application layer
atakora deploy ApplicationStack
```

**Best for**:
- Large infrastructure changes
- Minimizing blast radius
- Testing dependencies between layers

### Blue-Green Deployment

Deploy new version alongside old, then switch traffic:

```typescript
const app = new AzureApp({
  organization: 'Contoso',
  project: 'WebApp',
});

// Blue environment (current production)
const blueStack = new ResourceGroupStack(app, 'Blue', {
  resourceGroupName: 'rg-webapp-blue',
  location: 'eastus2',
  tags: { environment: 'blue' },
});

// Green environment (new version)
const greenStack = new ResourceGroupStack(app, 'Green', {
  resourceGroupName: 'rg-webapp-green',
  location: 'eastus2',
  tags: { environment: 'green' },
});

// Deploy green, test, then switch traffic manager/front door
```

**Best for**:
- Zero-downtime deployments
- Easy rollback capability
- High-availability requirements

## Multi-Environment Deployments

### Using Configuration Files

Create environment-specific configuration:

```typescript
// config/dev.ts
export const config = {
  environment: 'dev',
  location: 'eastus2',
  resourceGroupName: 'rg-webapp-dev',
  storageSku: 'Standard_LRS',
  appServicePlanSku: 'B1',
};

// config/prod.ts
export const config = {
  environment: 'prod',
  location: 'eastus2',
  resourceGroupName: 'rg-webapp-prod',
  storageSku: 'Standard_GRS',
  appServicePlanSku: 'P1v3',
};
```

```typescript
// main.ts
import { config } from `./config/${process.env.ENVIRONMENT || 'dev'}`;

const app = new AzureApp({
  organization: 'Contoso',
  project: 'WebApp',
});

const stack = new ResourceGroupStack(app, config.environment, {
  resourceGroupName: config.resourceGroupName,
  location: config.location,
});

const storage = new StorageAccounts(stack, 'Storage', {
  sku: { name: config.storageSku },
});
```

**Deploy to environments**:

```bash
# Deploy to development
ENVIRONMENT=dev atakora deploy

# Deploy to production
ENVIRONMENT=prod atakora deploy
```

### Using Context Values

Pass values at deployment time:

```typescript
const app = new AzureApp({
  organization: 'Contoso',
  project: 'WebApp',
});

const environment = app.node.tryGetContext('environment') || 'dev';
const location = app.node.tryGetContext('location') || 'eastus2';

const stack = new ResourceGroupStack(app, environment, {
  resourceGroupName: `rg-webapp-${environment}`,
  location: location,
});
```

```bash
# Deploy with context
atakora deploy --context environment=prod --context location=westus2
```

### Using Separate Stacks

Define all environments in code:

```typescript
const app = new AzureApp({
  organization: 'Contoso',
  project: 'WebApp',
});

const environments = ['dev', 'staging', 'prod'];

environments.forEach(env => {
  const stack = new ResourceGroupStack(app, env, {
    resourceGroupName: `rg-webapp-${env}`,
    location: 'eastus2',
    tags: { environment: env },
  });

  // Create environment-specific resources
  new StorageAccounts(stack, 'Storage', {
    sku: { name: env === 'prod' ? 'Standard_GRS' : 'Standard_LRS' },
  });
});

app.synth();
```

```bash
# Deploy specific environment
atakora deploy dev
atakora deploy staging
atakora deploy prod
```

## Deployment Dependencies

### Stack Dependencies

Atakora automatically deploys stacks in dependency order:

```typescript
const networkStack = new ResourceGroupStack(app, 'Network', {
  resourceGroupName: 'rg-network',
  location: 'eastus2',
});

const appStack = new ResourceGroupStack(app, 'Application', {
  resourceGroupName: 'rg-app',
  location: 'eastus2',
});

const vnet = new VirtualNetworks(networkStack, 'VNet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

// This creates a dependency: Application depends on Network
const webApp = new Sites(appStack, 'WebApp', {
  virtualNetworkSubnetId: `${vnet.id}/subnets/app`,
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
});

// Deployment order: Network → Application
```

### Parallel Deployment

Independent stacks deploy in parallel for faster deployments:

```typescript
// These stacks have no dependencies
const eastStack = new ResourceGroupStack(app, 'East', {
  resourceGroupName: 'rg-app-eastus2',
  location: 'eastus2',
});

const westStack = new ResourceGroupStack(app, 'West', {
  resourceGroupName: 'rg-app-westus2',
  location: 'westus2',
});

// Both deploy simultaneously (no cross-stack references)
```

```bash
# Enable parallel deployment
atakora deploy --parallel
```

### External Dependencies

Reference existing Azure resources:

```typescript
// Reference existing VNet
const existingVNetId = '/subscriptions/xxx/resourceGroups/rg-shared/providers/Microsoft.Network/virtualNetworks/vnet-shared';

const webApp = new Sites(stack, 'WebApp', {
  siteName: 'webapp-main',
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
  virtualNetworkSubnetId: `${existingVNetId}/subnets/app`,
});
```

**Note**: Atakora does not manage external resources. Ensure they exist before deploying.

## Deployment Outputs

### Viewing Outputs

Stack outputs provide information about deployed resources:

```typescript
import { Output } from '@atakora/lib';

const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stappdata',
  sku: { name: 'Standard_LRS' },
  kind: 'StorageV2',
});

new Output(stack, 'StorageAccountName', {
  value: storage.name,
  description: 'The name of the storage account',
});

new Output(stack, 'StorageAccountId', {
  value: storage.id,
  description: 'The resource ID of the storage account',
});
```

```bash
# View outputs after deployment
az deployment group show \
  --resource-group rg-webapp-prod \
  --name production-deployment \
  --query properties.outputs
```

**Output example**:
```json
{
  "StorageAccountName": {
    "type": "String",
    "value": "stappdata"
  },
  "StorageAccountId": {
    "type": "String",
    "value": "/subscriptions/.../storageAccounts/stappdata"
  }
}
```

### Using Outputs in Scripts

Access outputs in automation scripts:

```bash
#!/bin/bash

# Deploy infrastructure
atakora deploy Production

# Get storage account name from outputs
STORAGE_NAME=$(az deployment group show \
  --resource-group rg-webapp-prod \
  --name production-deployment \
  --query 'properties.outputs.StorageAccountName.value' \
  --output tsv)

# Use output in subsequent commands
az storage container create \
  --name data \
  --account-name $STORAGE_NAME
```

### Cross-Stack Outputs

Share outputs between stacks:

```typescript
// Network stack exports VNet ID
const networkStack = new ResourceGroupStack(app, 'Network', {
  resourceGroupName: 'rg-network',
  location: 'eastus2',
});

const vnet = new VirtualNetworks(networkStack, 'VNet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] },
});

new Output(networkStack, 'VNetId', {
  value: vnet.id,
  exportName: 'SharedVNetId', // Export for cross-stack reference
});

// Application stack imports VNet ID
const appStack = new ResourceGroupStack(app, 'Application', {
  resourceGroupName: 'rg-app',
  location: 'eastus2',
});

const vnetId = Fn.importValue('SharedVNetId');

const webApp = new Sites(appStack, 'WebApp', {
  virtualNetworkSubnetId: `${vnetId}/subnets/app`,
  serverFarmId: '/subscriptions/.../serverfarms/asp-main',
});
```

## Rollback and Recovery

### Automatic Rollback

Enable automatic rollback on deployment failure:

```bash
# Rollback on error
atakora deploy Production --rollback-on-error
```

**Azure deployment behavior**:
- If any resource fails, entire deployment fails
- Resources already created remain (unless using Complete mode)
- Fix issues and redeploy

### Manual Rollback

Rollback to previous deployment:

```bash
# List deployment history
az deployment group list \
  --resource-group rg-webapp-prod \
  --output table

# Rollback to specific deployment
az deployment group create \
  --resource-group rg-webapp-prod \
  --template-file arm.out/production.template.json.backup \
  --parameters arm.out/production.parameters.json.backup
```

### Git-Based Rollback

Use version control to rollback infrastructure code:

```bash
# View git history
git log --oneline

# Rollback to previous commit
git revert HEAD

# Redeploy
atakora synth
atakora deploy Production
```

**Best practice**: Tag successful deployments:

```bash
# Tag after successful deployment
git tag -a v1.2.3 -m "Production deployment 2024-10-08"
git push --tags

# Rollback to tag
git checkout v1.2.2
atakora synth
atakora deploy Production
```

## Deployment Best Practices

### 1. Always Review Changes Before Deploying

```bash
# Review changes
atakora diff Production

# Approve deployment
atakora deploy Production --require-approval
```

### 2. Use Incremental Mode for Production

```bash
# Safer for production (default)
atakora deploy Production --mode Incremental
```

Avoid Complete mode in production unless you understand the consequences.

### 3. Tag Deployments

```typescript
const stack = new ResourceGroupStack(app, 'Production', {
  resourceGroupName: 'rg-webapp-prod',
  location: 'eastus2',
  tags: {
    environment: 'production',
    deployedBy: 'atakora',
    deploymentDate: new Date().toISOString(),
    version: process.env.CI_COMMIT_TAG || 'dev',
  },
});
```

### 4. Use Service Principals in CI/CD

Never use personal credentials in automation:

```yaml
# GitHub Actions example
- name: Azure Login
  uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}

- name: Deploy Infrastructure
  run: atakora deploy Production --auto-approve
```

### 5. Implement Deployment Approval Gates

```yaml
# GitHub Actions approval workflow
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - run: atakora deploy Staging --auto-approve

  deploy-production:
    needs: deploy-staging
    environment: production  # Requires manual approval
    runs-on: ubuntu-latest
    steps:
      - run: atakora deploy Production --auto-approve
```

### 6. Monitor Deployment Progress

```bash
# Real-time monitoring
atakora deploy Production --watch

# Check resource health after deployment
az resource list \
  --resource-group rg-webapp-prod \
  --query "[].{name:name, type:type, provisioningState:provisioningState}" \
  --output table
```

### 7. Validate Before Deploying

```bash
# Validate templates
atakora validate Production

# Azure what-if preview
az deployment group what-if \
  --resource-group rg-webapp-prod \
  --template-file arm.out/production.template.json \
  --parameters arm.out/production.parameters.json
```

### 8. Use Lock Resources for Critical Infrastructure

```bash
# Prevent accidental deletion
az lock create \
  --name ProtectProduction \
  --resource-group rg-webapp-prod \
  --lock-type CanNotDelete
```

### 9. Implement Retry Logic

```bash
#!/bin/bash
MAX_RETRIES=3
RETRY_COUNT=0

until [ $RETRY_COUNT -ge $MAX_RETRIES ]
do
  atakora deploy Production --auto-approve && break
  RETRY_COUNT=$((RETRY_COUNT+1))
  echo "Deployment failed. Retry $RETRY_COUNT of $MAX_RETRIES..."
  sleep 30
done
```

### 10. Keep Deployment History

```bash
# Save deployment artifacts
atakora synth
cp -r arm.out "deployments/$(date +%Y%m%d-%H%M%S)"

# Commit to git
git add deployments/
git commit -m "Deployment artifacts for production"
git push
```

## Troubleshooting Deployments

### Deployment Failed: Resource Already Exists

**Problem**: Resource already exists in Azure with different configuration.

**Solution**:

```bash
# Option 1: Import existing resource (if compatible)
# Update your code to match existing resource

# Option 2: Delete existing resource
az resource delete --ids {resource-id}

# Option 3: Use different name
# Update resource name in your code
```

### Deployment Timeout

**Problem**: Deployment takes too long and times out.

**Solution**:

```bash
# Increase timeout
atakora deploy Production --timeout 3600  # 1 hour

# Deploy in smaller batches
atakora deploy NetworkStack
atakora deploy DataStack
atakora deploy AppStack
```

### Authentication Failed

**Problem**: Unable to authenticate to Azure.

**Solution**:

```bash
# Verify login
az account show

# Re-login
az login

# Check subscription
az account list --output table

# Set correct subscription
az account set --subscription "Production Subscription"
```

### Insufficient Permissions

**Problem**: Service principal lacks required permissions.

**Solution**:

```bash
# Grant Contributor role
az role assignment create \
  --assignee {service-principal-id} \
  --role Contributor \
  --scope /subscriptions/{subscription-id}/resourceGroups/{resource-group}

# Grant specific permissions
az role assignment create \
  --assignee {service-principal-id} \
  --role "Network Contributor" \
  --scope /subscriptions/{subscription-id}
```

### Resource Quota Exceeded

**Problem**: Subscription has reached resource limits.

**Solution**:

```bash
# Check current usage
az vm list-usage --location eastus2 --output table

# Request quota increase
az support tickets create \
  --ticket-name "Increase VM quota" \
  --severity minimal \
  --description "Request to increase VM quota in East US 2"
```

### Deployment Stuck

**Problem**: Deployment appears stuck or unresponsive.

**Solution**:

```bash
# Check deployment status
az deployment group show \
  --resource-group rg-webapp-prod \
  --name production-deployment

# Cancel stuck deployment
az deployment group cancel \
  --resource-group rg-webapp-prod \
  --name production-deployment

# Retry deployment
atakora deploy Production
```

### Rollback Failed

**Problem**: Cannot rollback to previous state.

**Solution**:

```bash
# List all deployments
az deployment group list \
  --resource-group rg-webapp-prod \
  --output table

# Export working template
az deployment group export \
  --resource-group rg-webapp-prod \
  --name {working-deployment-name}

# Redeploy from exported template
az deployment group create \
  --resource-group rg-webapp-prod \
  --template-file exported-template.json
```

## See Also

- **[App and Stacks](./app-and-stacks.md)** - Understanding the construct tree
- **[Synthesis](./synthesis.md)** - How code becomes ARM templates
- **[CI/CD Pipeline Tutorial](../tutorials/ci-cd-pipeline.md)** - Automate deployments
- **[Deploying Environments Workflow](../workflows/deploying-environments.md)** - Multi-environment deployment patterns
- **[CLI deploy Command Reference](../../reference/cli/deploy.md)** - Detailed deploy command documentation
- **[Deployment Failures Troubleshooting](../../troubleshooting/deployment-failures.md)** - Common deployment issues

---

**Next**: Explore [end-to-end tutorials](../tutorials/) for real-world scenarios
