# Atakora Gen 2: Deployment & State Management

**Status**: Draft
**Created**: 2025-10-14
**Related**: [Gen 2 Core Design](./Atakora-Gen2-Design.md), [Type Generation](./Atakora-Gen2-Type-Generation-Intellisense.md), [Secrets Management](./Atakora-Gen2-Secrets-Config-Management.md)

---

## Overview

This document defines how Atakora tracks deployment state, manages incremental deployments, handles failures, and integrates with CI/CD pipelines. The design leverages Azure's native deployment tracking while adding intelligent change detection and validation.

### Core Principles

1. **Azure-Native State** - Use Azure Deployment History, not external state files
2. **Synthesis Run Tracking** - Unique ID per synthesis for resource grouping and rollback
3. **Idempotent Deployments** - Safe to re-run deployment multiple times
4. **Fast Feedback** - Pre-flight validation catches errors before deployment
5. **Clear Recovery** - Explicit error messages and recovery procedures
6. **No Magic** - Deployment behavior is predictable and debuggable

---

## State Tracking Architecture

### Three-Layer State System

**Layer 1: Azure Deployment History** (Primary source of truth)

- Native ARM deployment tracking
- Query via Azure Resource Manager API
- Contains full deployment history, templates, outputs
- Free, automatic, always available
- Access: `az deployment group list --resource-group <rg>`

**Layer 2: Synthesis Run ID Tags** (Resource grouping)

- Unique tag on every resource: `atakora:synthesis-run-id`
- Format: `synth-20251014-153000-a8b2c4`
- Groups all resources deployed together
- Enables rollback, cleanup, drift detection
- Changes every synthesis run

**Layer 3: Deployment Metadata Storage** (Fast access cache)

- Store `outputs.json` in Storage Account
- Container: `deployments`
- Path: `<backend-name>/<environment>/<synthesis-run-id>/outputs.json`
- Fast access without querying ARM API
- Includes deployment metadata (timestamp, user, commit hash)

---

## Synthesis Run ID

### Format

```
synth-{YYYYMMDD}-{HHMMSS}-{hash}

Examples:
synth-20251014-153000-a8b2c4
synth-20251025-091530-d4e8f2
```

**Components:**

- **Date**: `YYYYMMDD` (sortable, human-readable)
- **Time**: `HHMMSS` (sortable, human-readable)
- **Hash**: 6-char random hex (uniqueness guarantee)

### Generation

```typescript
// packages/lib/src/synthesis/run-id.ts

export function generateSynthesisRunId(): string {
  const now = new Date();
  const date = format(now, 'yyyyMMdd');
  const time = format(now, 'HHmmss');
  const hash = crypto.randomBytes(3).toString('hex'); // 6 chars

  return `synth-${date}-${time}-${hash}`;
}

// Example usage:
const runId = generateSynthesisRunId();
// "synth-20251014-153000-a8b2c4"
```

### Where It's Used

**1. Resource Tags:**

```json
{
  "tags": {
    "atakora:synthesis-run-id": "synth-20251014-153000-a8b2c4",
    "atakora:backend": "user-service",
    "atakora:environment": "nonprod"
  }
}
```

**2. Deployment Names:**

```
Deployment name: userservice-nonprod-synth-20251014-153000-a8b2c4
Resource group: rg-userservice-nonprod
```

**3. Storage Paths:**

```
Storage container: deployments
Path: user-service/nonprod/synth-20251014-153000-a8b2c4/
  ├── outputs.json
  ├── main.template.json
  ├── deployment.log
  └── metadata.json
```

**4. ARM Template Output Directory:**

```
arm.out/
  user-service/
    synth-20251014-153000-a8b2c4/
      functions/
      templates/
      package.zip
```

---

## Output Directory Structure

```
arm.out/
  <backend-package-name>/
    <synthesis-run-id>/
      functions/
        <function-name>/
          index.js           # Per-function esbuild bundle
          index.js.map       # Source map
          function.json      # Function binding config
        host.json            # Function App host config

      templates/
        main.template.json          # Main ARM template
        infrastructure.template.json # Linked template (Cosmos, Storage, KV)
        functions.template.json      # Linked template (Function App)

      assets/
        function-app.zip     # Zipped functions for deployment

      outputs/
        outputs.template.json # Schema introspection (generated at synth)
        outputs.json          # Deployment endpoints (generated at deploy)

      metadata.json          # Deployment metadata
```

### metadata.json

```json
{
  "synthesisRunId": "synth-20251014-153000-a8b2c4",
  "backend": {
    "name": "user-service",
    "packageName": "user-service",
    "version": "1.0.0"
  },
  "environment": "nonprod",
  "timestamp": "2025-10-14T15:30:00Z",
  "git": {
    "commit": "abc123def456",
    "branch": "main",
    "author": "developer@example.com"
  },
  "resources": {
    "count": 8,
    "types": {
      "Microsoft.KeyVault/vaults": 1,
      "Microsoft.Storage/storageAccounts": 1,
      "Microsoft.DocumentDB/databaseAccounts": 1,
      "Microsoft.Web/serverfarms": 1,
      "Microsoft.Web/sites": 1,
      "Microsoft.Insights/components": 1,
      "Microsoft.OperationalInsights/workspaces": 1,
      "Microsoft.ManagedIdentity/userAssignedIdentities": 1
    }
  },
  "functions": [
    {
      "name": "create-user",
      "trigger": "http",
      "bundleSize": "52 KB"
    },
    {
      "name": "get-user",
      "trigger": "http",
      "bundleSize": "48 KB"
    }
  ]
}
```

---

## Deployment Workflow

### Complete `atakora deploy` Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. PRE-FLIGHT VALIDATION                                │
├─────────────────────────────────────────────────────────┤
│ ✓ Check Azure authentication (az account show)          │
│ ✓ Verify correct subscription selected                  │
│ ✓ Validate required secrets are set in Key Vault       │
│ ✓ Check no deployment currently in progress (lock)      │
│ ✓ Verify resource group exists (create if needed)       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. SYNTHESIS                                             │
├─────────────────────────────────────────────────────────┤
│ ✓ Generate synthesis run ID                             │
│ ✓ Create construct tree from defineBackend()            │
│ ✓ Generate ARM templates (main + linked)                │
│ ✓ Bundle functions (per-function with esbuild)          │
│ ✓ Generate outputs.template.json (schema introspection) │
│ ✓ Create deployment package (ZIP)                       │
│ ✓ Write to arm.out/<backend>/<synth-run-id>/           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. CHANGE DETECTION                                      │
├─────────────────────────────────────────────────────────┤
│ ✓ Query last deployment from Azure                      │
│ ✓ Compare resource definitions                          │
│ ✓ Generate diff (+ added, ~ modified, - deleted)        │
│ ✓ Calculate deployment preview                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 4. CONFIRMATION (if interactive)                         │
├─────────────────────────────────────────────────────────┤
│ Deploy the following changes to nonprod?                │
│                                                          │
│   + Key Vault (kv-userservice-nonprod-a8b2c4)          │
│   + Storage Account (stuserservicenonprod)              │
│   + Cosmos DB (cosmos-userservice-nonprod)              │
│   ~ Function App (app settings modified)                │
│   - Old deployment artifacts                            │
│                                                          │
│ Estimated time: 3-5 minutes                              │
│ Continue? [y/N]                                          │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 5. ACQUIRE DEPLOYMENT LOCK                               │
├─────────────────────────────────────────────────────────┤
│ ✓ Create lock file in Storage Account                   │
│ ✓ Acquire blob lease (exclusive lock)                   │
│ ✓ Timeout: 15 minutes                                    │
│ ✓ Auto-release on completion or timeout                 │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 6. DEPLOY - PHASE 1: INFRASTRUCTURE                      │
├─────────────────────────────────────────────────────────┤
│ ⏳ Deploying infrastructure template...                 │
│ ✓ Key Vault created (30s)                               │
│ ✓ Storage Account created (45s)                          │
│ ✓ Cosmos DB created (2m 15s)                             │
│ ✓ Managed Identity created (15s)                         │
│ ✓ Log Analytics Workspace created (20s)                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 7. DEPLOY - PHASE 2: FUNCTION APP                        │
├─────────────────────────────────────────────────────────┤
│ ⏳ Uploading function package to Storage...             │
│ ✓ Uploaded 520 KB to blob (5s)                          │
│ ⏳ Deploying Function App template...                   │
│ ✓ App Service Plan created (15s)                         │
│ ✓ Function App created (45s)                             │
│ ✓ App Insights created (20s)                             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 8. DEPLOY - PHASE 3: CONFIGURATION                       │
├─────────────────────────────────────────────────────────┤
│ ⏳ Configuring RBAC assignments...                      │
│ ✓ Managed Identity → Key Vault (Secrets User)           │
│ ✓ Managed Identity → Cosmos (Data Contributor)          │
│ ✓ Managed Identity → Storage (Blob Contributor)         │
│ ⏳ Configuring Function App settings...                 │
│ ✓ COSMOS_ENDPOINT set                                    │
│ ✓ STORAGE_ACCOUNT_NAME set                               │
│ ✓ KEY_VAULT_URI set                                      │
│ ✓ WEBSITE_RUN_FROM_PACKAGE set                           │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 9. POST-DEPLOYMENT                                       │
├─────────────────────────────────────────────────────────┤
│ ✓ Retrieve deployment outputs from ARM                  │
│ ✓ Generate outputs.json with real endpoints             │
│ ✓ Tag all resources with synthesis-run-id               │
│ ✓ Save deployment metadata to Storage                   │
│ ✓ Save deployment logs                                   │
│ ✓ Release deployment lock                                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 10. OUTPUT RESULTS                                       │
├─────────────────────────────────────────────────────────┤
│ ✅ Deployment successful (4m 32s)                        │
│                                                          │
│ Resources deployed:                                      │
│   ✓ Key Vault: kv-userservice-nonprod-a8b2c4           │
│   ✓ Storage: stuserservicenonprod                       │
│   ✓ Cosmos DB: cosmos-userservice-nonprod               │
│   ✓ Function App: func-userservice-nonprod              │
│   ✓ App Insights: appi-userservice-nonprod              │
│                                                          │
│ Endpoints:                                               │
│   API: https://func-userservice-nonprod.azurewebsites...│
│   GraphQL: https://func-userservice-nonprod.azurewebsi...│
│                                                          │
│ Outputs saved to:                                        │
│   packages/user-service/.atakora/outputs.json           │
│                                                          │
│ Next steps:                                              │
│   1. Validate deployment: atakora validate --env nonprod│
│   2. Test endpoints: curl <API-URL>/health              │
│   3. View logs: atakora logs --env nonprod              │
└─────────────────────────────────────────────────────────┘
```

---

## Deployment Lock Mechanism

### Blob Lease Lock

Uses Azure Blob Storage lease to prevent concurrent deployments.

**Lock File Location:**

```
Storage Account: <deployment-storage>
Container: locks
Blob: <backend-name>-<environment>.lock
```

**Lock Acquisition:**

```typescript
// packages/lib/src/deployment/lock.ts

export async function acquireDeploymentLock(
  backend: string,
  environment: string,
  timeout: number = 900000 // 15 minutes
): Promise<BlobLease> {
  const lockBlob = getBlobClient(`${backend}-${environment}.lock`);

  // Create blob if doesn't exist
  if (!(await lockBlob.exists())) {
    await lockBlob.upload('', 0);
  }

  try {
    // Acquire 15-minute lease
    const lease = await lockBlob.getBlobLeaseClient().acquireLease(timeout / 1000);

    // Write lock metadata
    await lockBlob.upload(
      JSON.stringify({
        backend,
        environment,
        acquiredAt: new Date().toISOString(),
        acquiredBy: getUserEmail(),
        synthesisRunId: getCurrentSynthesisRunId(),
      }),
      { leaseId: lease.leaseId }
    );

    return lease;
  } catch (error) {
    if (error.code === 'LeaseAlreadyPresent') {
      // Lock is held by another deployment
      const metadata = await lockBlob.downloadToString();
      const lock = JSON.parse(metadata);

      throw new DeploymentLockError(
        `Deployment for ${backend} (${environment}) is already in progress.

Started by: ${lock.acquiredBy}
Started at: ${lock.acquiredAt}
Synthesis run: ${lock.synthesisRunId}

Wait for deployment to complete or run:
  atakora deploy unlock --env ${environment} --force

This will forcefully release the lock if the deployment is stuck.`
      );
    }
    throw error;
  }
}

export async function releaseDeploymentLock(lease: BlobLease): Promise<void> {
  await lease.releaseLease();
}
```

**Auto-Release on Timeout:**

- Lease automatically expires after 15 minutes
- Prevents permanent locks from crashed deployments
- CLI can force-release: `atakora deploy unlock --force`

---

## Change Detection & Diff

### v1: Full Redeployment (ARM Idempotency)

For v1, we rely on Azure ARM's idempotent deployment:

```bash
atakora deploy --env nonprod

# Deploys complete ARM template
# ARM only updates resources that changed
# Unchanged resources are skipped automatically
# Fast and safe
```

**Advantages:**

- ✅ Simple implementation
- ✅ ARM handles change detection
- ✅ No state management complexity
- ✅ Always converges to desired state

**Diff Preview:**

```typescript
// Compare current template vs last deployment
const lastDeployment = await getLastDeployment(resourceGroup);
const currentTemplate = await synthesizeTemplate(backend);

const diff = compareTemplates(lastDeployment.template, currentTemplate);

console.log('Resources to be deployed:');
diff.added.forEach((r) => console.log(`  + ${r.type} (${r.name})`));
diff.modified.forEach((r) => console.log(`  ~ ${r.type} (${r.name})`));
diff.removed.forEach((r) => console.log(`  - ${r.type} (${r.name})`));
```

### v2: Incremental Deployment (Resource Hashing)

Future enhancement for large backends with many resources.

**Resource Hash Tag:**

```json
{
  "tags": {
    "atakora:resource-hash": "sha256:abc123...",
    "atakora:last-deployed": "2025-10-14T15:30:00Z"
  }
}
```

**Change Detection:**

```typescript
// Hash current resource definition
const currentHash = hashResource(resourceDefinition);

// Query deployed resource from Azure
const deployedResource = await getResourceByName(resourceName);
const deployedHash = deployedResource.tags['atakora:resource-hash'];

if (currentHash !== deployedHash) {
  // Resource changed, include in deployment
  resourcesToUpdate.push(resourceDefinition);
} else {
  // Resource unchanged, skip
  resourcesSkipped.push(resourceDefinition);
}
```

**Benefits (v2):**

- Faster deployments for large backends
- Deploy only changed resources
- Lower risk (fewer resources modified)
- Better deployment logs (clear what changed)

---

## Deployment Commands

### `atakora deploy`

Primary deployment command.

**Usage:**

```bash
atakora deploy [options]
```

**Options:**

```
--env <environment>      Environment to deploy to (default: from manifest)
--force                  Skip confirmation prompts
--auto-approve          Skip diff preview and confirmation
--no-diff               Skip diff calculation
--dry-run               Generate templates but don't deploy
--output <directory>    Custom output directory (default: arm.out)
--verbose               Show detailed deployment logs
```

**Examples:**

```bash
# Interactive deployment with diff preview
atakora deploy --env nonprod

# CI/CD deployment (no prompts)
atakora deploy --env nonprod --auto-approve

# Dry run (generate templates only)
atakora deploy --dry-run

# Force deployment (bypass all checks)
atakora deploy --env nonprod --force --auto-approve
```

---

### `atakora diff`

Show what would change without deploying.

**Usage:**

```bash
atakora diff [--env <environment>]
```

**Output:**

```
Changes that would be deployed to nonprod:

Infrastructure:
  ~ Key Vault (kv-userservice-nonprod-a8b2c4)
    - App settings modified
  + Storage Container (deployments)
    - New container

Functions:
  ~ create-user
    - Handler code changed
  ~ get-user
    - Handler code changed

Configuration:
  ~ Function App Settings
    + COSMOS_DATABASE_NAME (added)
    ~ ALLOWED_ORIGINS (modified)

3 resources modified, 1 resource added, 0 resources removed
```

---

### `atakora deployments list`

List deployment history.

**Usage:**

```bash
atakora deployments list [--env <environment>] [--limit <n>]
```

**Output:**

```
Recent deployments for user-service (nonprod):

synth-20251014-153000-a8b2c4  Oct 14, 2025 3:30 PM  Succeeded  4m 32s  developer@example.com
synth-20251014-103000-b7c1d3  Oct 14, 2025 10:30 AM Succeeded  3m 45s  developer@example.com
synth-20251013-170000-e2f4a6  Oct 13, 2025 5:00 PM  Succeeded  4m 12s  ci-cd@example.com
synth-20251013-093000-f9d2e8  Oct 13, 2025 9:30 AM  Failed     1m 23s  developer@example.com

Use 'atakora deployments show <synth-run-id>' for details
```

---

### `atakora deployments show`

Show deployment details.

**Usage:**

```bash
atakora deployments show <synth-run-id> [--env <environment>]
```

**Output:**

```
Deployment: synth-20251014-153000-a8b2c4
Backend: user-service
Environment: nonprod
Status: Succeeded
Duration: 4m 32s
Started: Oct 14, 2025 3:30:00 PM
Completed: Oct 14, 2025 3:34:32 PM
Deployed by: developer@example.com
Git commit: abc123def456

Resources deployed (8):
  ✓ kv-userservice-nonprod-a8b2c4 (Microsoft.KeyVault/vaults)
  ✓ stuserservicenonprod (Microsoft.Storage/storageAccounts)
  ✓ cosmos-userservice-nonprod (Microsoft.DocumentDB/databaseAccounts)
  ✓ func-userservice-nonprod (Microsoft.Web/sites)
  ✓ plan-userservice-nonprod (Microsoft.Web/serverfarms)
  ✓ appi-userservice-nonprod (Microsoft.Insights/components)
  ✓ law-userservice-nonprod (Microsoft.OperationalInsights/workspaces)
  ✓ id-userservice-nonprod (Microsoft.ManagedIdentity/userAssignedIdentities)

Endpoints:
  API: https://func-userservice-nonprod.azurewebsites.net/api
  GraphQL: https://func-userservice-nonprod.azurewebsites.net/api/graphql

Outputs:
  packages/user-service/.atakora/outputs.json

Logs:
  Storage: deployments/user-service/nonprod/synth-20251014-153000-a8b2c4/deployment.log
```

---

### `atakora rollback`

Rollback to a previous deployment.

**Usage:**

```bash
atakora rollback [--to <synth-run-id>] [--env <environment>]
```

**Example:**

```bash
# Rollback to previous deployment
atakora rollback --env nonprod

# Rollback to specific deployment
atakora rollback --to synth-20251013-170000-e2f4a6 --env nonprod
```

**How it works:**

```
1. Query synthesis run ID from deployment history
2. Retrieve ARM template from that deployment
3. Retrieve function package from Storage
4. Re-deploy using that exact template + package
5. Tag with new synthesis-run-id (rollback-<timestamp>)
```

**v1 Limitation:**

- Manual rollback only (must specify `--to`)
- Automatic rollback in v2

---

### `atakora drift`

Detect manual changes to resources.

**Usage:**

```bash
atakora drift [--env <environment>]
```

**Output:**

```
⚠️  Resource drift detected for user-service (nonprod)

Resources modified outside of Atakora:

Function App (func-userservice-nonprod):
  App Settings:
    - WEBSITE_NODE_DEFAULT_VERSION: "20" → "18" (modified manually)
    - CUSTOM_SETTING: "value" (added manually)

Storage Account (stuserservicenonprod):
  Properties:
    - minimumTlsVersion: "TLS1_2" → "TLS1_0" (modified manually)

Run 'atakora deploy --env nonprod' to restore to desired state
```

**How it works:**

```typescript
// Compare deployed resources vs expected state
const expectedTemplate = await synthesizeTemplate(backend);
const deployedResources = await queryDeployedResources(resourceGroup);

const drifted = detectDrift(expectedTemplate, deployedResources);
```

**v1 Limitation:**

- Detection only (warning)
- No automatic repair
- v2: `atakora drift --fix` to repair

---

## Failure Handling

### Deployment Failures

**Categories of Failures:**

**1. Pre-Flight Failures** (Fast fail before deployment)

```
❌ Error: Azure authentication failed

You are not authenticated to Azure. Please run:
  az login

Then retry deployment.
```

```
❌ Error: Required secret SENDGRID_API_KEY not found in Key Vault

Set the secret before deploying:
  atakora secrets set SENDGRID_API_KEY --env nonprod

Or deploy with:
  atakora deploy --skip-secret-validation (not recommended)
```

**2. Deployment Failures** (ARM deployment errors)

```
❌ Error: Deployment failed at Phase 1 (Infrastructure)

Resource: Microsoft.DocumentDB/databaseAccounts/cosmos-userservice-nonprod
Error: Location 'westus' is not available for Cosmos DB

Resolution:
  1. Update manifest.json to use supported region (eastus, westus2, etc.)
  2. Or specify region: atakora deploy --region eastus --env nonprod

Deployment logs: arm.out/user-service/synth-20251014-153000-a8b2c4/deployment.log
```

**3. Post-Deployment Failures** (Configuration errors)

```
⚠️  Warning: Deployment succeeded but health check failed

Function App: func-userservice-nonprod
Endpoint: https://func-userservice-nonprod.azurewebsites.net/api/health
Status: 503 Service Unavailable

Common causes:
  1. Function App is still starting (wait 30-60 seconds)
  2. Missing app settings (check Function App configuration)
  3. Function code errors (check Application Insights logs)

Check logs:
  atakora logs --env nonprod --tail
```

### Error Recovery

**Stuck Deployment:**

```bash
# Release deployment lock
atakora deploy unlock --env nonprod --force

# Retry deployment
atakora deploy --env nonprod
```

**Partial Deployment:**

```bash
# ARM templates are idempotent - safe to re-run
atakora deploy --env nonprod

# ARM will:
# - Skip successfully created resources
# - Retry failed resources
# - Complete the deployment
```

**Rollback After Failure:**

```bash
# Rollback to last working deployment
atakora rollback --env nonprod

# This redeploys the previous working state
```

---

## CI/CD Integration

### GitHub Actions

**Complete Workflow:**

```yaml
# .github/workflows/deploy.yml
name: Deploy to Azure

on:
  push:
    branches: [main]
    paths:
      - 'packages/backend/**'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Full history for git metadata

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Set Secrets
        run: |
          echo "${{ secrets.SENDGRID_API_KEY }}" | \
            atakora secrets set SENDGRID_API_KEY --from-stdin --env nonprod

          echo "${{ secrets.STRIPE_SECRET_KEY }}" | \
            atakora secrets set STRIPE_SECRET_KEY --from-stdin --env nonprod

      - name: Validate Secrets
        run: atakora secrets validate --env nonprod

      - name: Deploy
        run: atakora deploy --env nonprod --auto-approve --verbose

      - name: Health Check
        run: |
          ENDPOINT=$(jq -r '.endpoints.api' packages/backend/.atakora/outputs.json)
          curl -f "${ENDPOINT}/health" || exit 1

      - name: Upload Deployment Artifacts
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: deployment-logs
          path: |
            arm.out/**/*.log
            packages/backend/.atakora/outputs.json
```

### Azure DevOps

**Pipeline YAML:**

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - packages/backend/*

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: atakora-nonprod-secrets # Variable group with secrets

stages:
  - stage: Build
    jobs:
      - job: BuildBackend
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: '20.x'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npm run build
            displayName: 'Build packages'

          - publish: $(System.DefaultWorkingDirectory)/packages/backend
            artifact: backend

  - stage: Deploy
    dependsOn: Build
    jobs:
      - deployment: DeployNonprod
        environment: nonprod
        strategy:
          runOnce:
            deploy:
              steps:
                - download: current
                  artifact: backend

                - task: AzureCLI@2
                  displayName: 'Set Secrets'
                  inputs:
                    azureSubscription: 'Atakora-Nonprod'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      echo "$(SENDGRID_API_KEY)" | \
                        atakora secrets set SENDGRID_API_KEY --from-stdin --env nonprod

                - task: AzureCLI@2
                  displayName: 'Validate Secrets'
                  inputs:
                    azureSubscription: 'Atakora-Nonprod'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      atakora secrets validate --env nonprod

                - task: AzureCLI@2
                  displayName: 'Deploy Backend'
                  inputs:
                    azureSubscription: 'Atakora-Nonprod'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      cd $(Pipeline.Workspace)/backend
                      atakora deploy --env nonprod --auto-approve --verbose

                - task: PublishBuildArtifacts@1
                  condition: always()
                  inputs:
                    pathToPublish: '$(Pipeline.Workspace)/backend/.atakora'
                    artifactName: 'deployment-outputs'
```

### Environment Promotion

**Workflow: nonprod → staging → prod**

```yaml
# .github/workflows/promote.yml
name: Promote to Production

on:
  workflow_dispatch:
    inputs:
      synthesis_run_id:
        description: 'Synthesis run ID to promote (from staging)'
        required: true

jobs:
  promote:
    runs-on: ubuntu-latest
    environment: production # Requires approval

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS_PROD }}

      - name: Validate Staging Deployment
        run: |
          # Verify synthesis run exists in staging
          atakora deployments show ${{ github.event.inputs.synthesis_run_id }} --env staging

      - name: Set Production Secrets
        run: |
          echo "${{ secrets.SENDGRID_API_KEY_PROD }}" | \
            atakora secrets set SENDGRID_API_KEY --from-stdin --env prod

      - name: Deploy to Production
        run: |
          # Deploy same code that succeeded in staging
          git checkout ${{ github.event.inputs.synthesis_run_id }}
          atakora deploy --env prod --auto-approve

      - name: Smoke Test
        run: |
          ENDPOINT=$(jq -r '.endpoints.api' packages/backend/.atakora/outputs.json)
          curl -f "${ENDPOINT}/health"
          curl -f "${ENDPOINT}/api/users?limit=1"

      - name: Notify Team
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Production deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Deployment to production *${{ job.status }}*\nSynthesis run: ${{ github.event.inputs.synthesis_run_id }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Resource Naming Strategy

### Naming Conventions

**Format:**

```
<resource-type>-<backend-name>-<environment>-<hash>

Examples:
kv-userservice-nonprod-a8b2c4      (Key Vault)
func-userservice-nonprod-a8b2c4    (Function App)
cosmos-userservice-nonprod-a8b2c4  (Cosmos DB)
st<backend><env><hash>             (Storage - no hyphens, lowercase)
```

**Length Constraints Handling:**

```typescript
// packages/lib/src/naming/resource-namer.ts

export class ResourceNamer {
  generateName(resourceType: string, backend: string, environment: string, hash: string): string {
    const constraints = RESOURCE_CONSTRAINTS[resourceType];

    // Apply constraints
    let name = `${resourceType}-${backend}-${environment}-${hash}`;

    // Remove hyphens for resources that don't allow them
    if (!constraints.allowHyphens) {
      name = name.replace(/-/g, '');
    }

    // Enforce lowercase for case-sensitive resources
    if (constraints.caseSensitive) {
      name = name.toLowerCase();
    }

    // Truncate if too long
    if (name.length > constraints.maxLength) {
      name = this.truncateWithWarning(name, constraints.maxLength, resourceType);
    }

    return name;
  }

  private truncateWithWarning(name: string, maxLength: number, resourceType: string): string {
    const truncated = name.substring(0, maxLength);

    console.warn(
      `⚠️  Resource name truncated to fit ${resourceType} length limit (${maxLength} chars):
      Original: ${name}
      Truncated: ${truncated}

      Consider shortening backend or environment name in manifest.json`
    );

    return truncated;
  }
}

const RESOURCE_CONSTRAINTS = {
  'Microsoft.KeyVault/vaults': {
    minLength: 3,
    maxLength: 24,
    allowHyphens: true,
    caseSensitive: false,
  },
  'Microsoft.Storage/storageAccounts': {
    minLength: 3,
    maxLength: 24,
    allowHyphens: false, // No hyphens allowed!
    caseSensitive: true, // Must be lowercase
  },
  // ... other resource types
};
```

**Example Warning:**

```
⚠️  Resource name truncated to fit Storage Account length limit (24 chars):
    Original: stenterprisecustomerportalnonproda8b2c4
    Truncated: stentcustomernonprodab2c

    Consider shortening backend or environment name in manifest.json
```

---

## Validation & Pre-Flight Checks

### Pre-Deployment Validation

```typescript
// packages/lib/src/deployment/validation.ts

export async function validateDeployment(
  backend: Backend,
  environment: string
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 1. Azure Authentication
  try {
    await checkAzureAuth();
  } catch (error) {
    errors.push({
      type: 'AUTH_FAILED',
      message: 'Not authenticated to Azure',
      resolution: 'Run: az login',
    });
  }

  // 2. Subscription Access
  try {
    await checkSubscriptionAccess();
  } catch (error) {
    errors.push({
      type: 'SUBSCRIPTION_ACCESS',
      message: 'Cannot access subscription',
      resolution: 'Run: az account set --subscription <subscription-id>',
    });
  }

  // 3. Required Secrets
  const missingSecrets = await checkRequiredSecrets(backend, environment);
  if (missingSecrets.length > 0) {
    errors.push({
      type: 'MISSING_SECRETS',
      message: `Missing required secrets: ${missingSecrets.join(', ')}`,
      resolution: `Run: atakora secrets set <SECRET_NAME> --env ${environment}`,
    });
  }

  // 4. Resource Group
  const rgExists = await checkResourceGroupExists(backend, environment);
  if (!rgExists) {
    warnings.push({
      type: 'RESOURCE_GROUP_MISSING',
      message: 'Resource group does not exist',
      resolution: 'Will be created during deployment',
    });
  }

  // 5. Deployment Lock
  const lockStatus = await checkDeploymentLock(backend, environment);
  if (lockStatus.locked) {
    errors.push({
      type: 'DEPLOYMENT_IN_PROGRESS',
      message: 'Another deployment is in progress',
      resolution: `Wait for deployment to complete or run: atakora deploy unlock --force --env ${environment}`,
    });
  }

  // 6. Resource Quotas
  const quotaCheck = await checkResourceQuotas(backend, environment);
  if (!quotaCheck.sufficient) {
    warnings.push({
      type: 'QUOTA_WARNING',
      message: `Approaching quota limit for ${quotaCheck.resourceType}`,
      resolution: 'Consider requesting quota increase',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

---

## Future Enhancements (v2)

### Incremental Deployment

- Resource-level hashing
- Deploy only changed resources
- Faster deployments for large backends

### Automatic Rollback

- Detect deployment failures
- Automatically rollback to last known good state
- Configurable rollback strategy

### Drift Repair

- Automatic repair of manual changes
- `atakora drift --fix` command
- Scheduled drift detection

### Deployment Preview

- Terraform plan-style preview
- Show exact changes before deployment
- Cost estimation per change

### Multi-Region Deployment

- Deploy to multiple regions
- Traffic manager configuration
- Regional failover

### Blue-Green Deployment

- Zero-downtime deployments
- Deploy to staging slot
- Swap slots after validation

---

## Summary

### Key Design Decisions

1. ✅ **Azure-Native State** - Use Deployment History, not external state files
2. ✅ **Synthesis Run ID** - Unique tag per deployment for tracking and rollback
3. ✅ **Blob Lease Locking** - Prevent concurrent deployments safely
4. ✅ **Per-Function Bundling** - Optimal cold starts and bundle size
5. ✅ **Output Path** - `arm.out/<backend-name>/<synth-run-id>/`
6. ✅ **Phased Deployment** - Infrastructure → Functions → Configuration
7. ✅ **Pre-Flight Validation** - Fail fast before deployment starts
8. ✅ **Clear Error Messages** - Actionable resolution steps

### v1 Scope

- Full ARM template deployment (idempotent)
- Deployment locking
- Pre-flight validation
- Deployment history tracking
- Manual rollback
- Clear error messages
- CI/CD examples

### v2 Enhancements

- Incremental deployment (hash-based)
- Automatic rollback
- Drift detection and repair
- Deployment preview
- Multi-region support
- Blue-green deployments

---

## Related Documents

- [Gen 2 Core Design](./Atakora-Gen2-Design.md)
- [Type Generation & IntelliSense](./Atakora-Gen2-Type-Generation-Intellisense.md)
- [Secrets Management](./Atakora-Gen2-Secrets-Config-Management.md)
- [Dynamic Tagging System](./Atakora-Gen2-Dynamic-Tagging-System.md)
- [Local Development](./atakora-gen2-local-development.md) (TODO)

---

**Last Updated**: 2025-10-14
**Status**: Draft - Ready for Review
