# Testing Linked Templates Deployment

## Current Status

✅ **Phase 1 Complete** - Template splitting works perfectly
- 11.2MB template split into 18 linked templates (all <1.2MB)
- 17 linked templates with inline function code preserved
- Root template orchestrates deployments

✅ **Phase 2 Complete** - Deployment orchestration implemented
- Artifact storage manager
- Parallel upload with SAS tokens
- Deploy command updated for v2.0.0 manifests

## Prerequisites

You need Azure CLI installed and authenticated:

```bash
# Install Azure CLI (if not already installed)
# Download from: https://aka.ms/installazurecliwindows

# Authenticate
az login

# Verify authentication
az account show
```

## Deployment Commands

### 1. Deploy Foundation Stack (Full Deployment)

This will:
1. **Automatically create storage account**: `{organization}cdk{hash}` (e.g., `digitalproductscdk3005ee`)
   - Creates if doesn't exist (Standard_LRS, Hot, Private, TLS 1.2+)
   - Creates `arm-templates` container
2. Upload 17 linked templates to Azure Storage (parallel)
3. Generate SAS tokens for secure access
4. Deploy root template with artifact URIs
5. Azure downloads and deploys all 17 linked templates
6. Deploy all 17 resources (Cosmos DB, Storage, Functions, etc.)
7. **Updates manifest** with storage configuration for reuse

```bash
# From repository root
node packages/cli/dist/cli.bundle.js deploy --app .atakora/arm.out/backend Foundation --auto-approve
```

### 2. Deploy ColorAI Stack First (Resource Group)

If you haven't deployed the resource group yet:

```bash
node packages/cli/dist/cli.bundle.js deploy --app .atakora/arm.out/backend ColorAI --auto-approve
```

### 3. Deploy All Stacks

```bash
node packages/cli/dist/cli.bundle.js deploy --app .atakora/arm.out/backend --auto-approve
```

## What Will Happen During Deployment

### Upload Phase (NEW!)
```
- Deploying stack: Foundation...
- Uploading artifacts for Foundation...
  - Creating storage account: digitalproductscdk3005ee...
  - Storage account created: digitalproductscdk3005ee
  - Creating container: arm-templates...
  - Container created: arm-templates
  - Uploading templates: Foundation.json (1/18)
  - Uploading templates: Foundation-foundation-0.json (2/18)
  - Uploading templates: Foundation-foundation-1.json (3/18)
  ...
  - Uploading templates: Foundation-application-16.json (18/18)
  - Generating SAS tokens...
✔ Artifacts uploaded for Foundation
```

**First deployment**: Creates storage account + container
**Subsequent deployments**: Reuses existing storage (faster!)

### Deploy Phase
```
- Submitting deployment: Foundation-{timestamp}...
- Deploying Foundation... (this may take several minutes)
  - Azure downloads linked templates from storage
  - Deploys Foundation tier (networking, monitoring)
  - Deploys Compute tier (Function App, Storage, Cosmos DB)
  - Deploys Application tier (10 inline functions)
✔ Stack 'Foundation' deployed successfully
```

## Expected Resources Deployed

After successful deployment, you should have:

### Infrastructure Resources (7)
- 1x Azure Cosmos DB account
- 1x Storage Account
- 1x App Service Plan
- 1x Function App
- 1x Log Analytics Workspace
- 1x Network Security Group
- 1x Virtual Network

### Function Resources (10)
- create-feedback
- read-feedback
- update-feedback
- delete-feedback
- list-feedback
- create-labdataset
- read-labdataset
- update-labdataset
- delete-labdataset
- list-labdataset

### Total: 17 resources

## Verify Deployment

```bash
# List resources in resource group
az resource list --resource-group rg-pl-digitalproducts-colorai-nonprod-eus2-06 --output table

# Check storage account
az storage account list --query "[?contains(name, 'statakora')]" --output table

# Check blob containers
az storage container list --account-name {organization}cdk{hash} --output table
```

## Troubleshooting

### Error: Authentication Failed

**Solution:** Run `az login` and authenticate

### Error: Resource group not found

**Solution:** Deploy ColorAI stack first to create the resource group

### Error: Storage account already exists

**Solution:** This is normal - the code will reuse the existing storage account

### Error: Template size exceeded

**Solution:** This should NOT happen anymore - all templates are <1.2MB

## Advanced Options

### View Upload Progress

The CLI shows real-time progress during upload:
```
Uploading templates: Foundation-application-7.json (42%)
```

### Custom Storage Account

You can specify a custom storage account (future feature):
```bash
node packages/cli/dist/cli.bundle.js deploy \
  --app .atakora/arm.out/backend \
  --storage-account myaccount \
  Foundation
```

### Deploy to Specific Subscription

```bash
az account set --subscription "Your Subscription Name"
node packages/cli/dist/cli.bundle.js deploy --app .atakora/arm.out/backend Foundation
```

## Success Criteria

After deployment completes, verify:

1. ✅ Storage account exists with `arm-templates` container
2. ✅ 18 blobs in container (root + 17 linked templates)
3. ✅ All 17 resources deployed to resource group
4. ✅ Functions visible in Function App
5. ✅ No errors in deployment logs

## Next Steps After Successful Deployment

Once deployment works:
1. Test the CRUD functions via HTTP triggers
2. Verify Cosmos DB has containers created
3. Check function logs in Application Insights
4. Run Phase 3 testing suite
5. Create Phase 4 documentation

## Quick Test Script

Run this after authentication:

```bash
# Full end-to-end test
cd C:\Users\austi\Source\Github\Digital Minion\cdk\atakora

# Deploy resource group
node packages/cli/dist/cli.bundle.js deploy --app .atakora/arm.out/backend ColorAI --auto-approve

# Deploy with linked templates
node packages/cli/dist/cli.bundle.js deploy --app .atakora/arm.out/backend Foundation --auto-approve

# Verify
az resource list --resource-group rg-pl-digitalproducts-colorai-nonprod-eus2-06 --output table
```
