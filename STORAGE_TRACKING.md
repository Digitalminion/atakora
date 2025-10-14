# Storage Account Tracking in Manifest

## Status: ✅ IMPLEMENTED

## Overview

The manifest now tracks the storage account used for linked template artifacts. This provides:
- ✅ **Reusability** - Same storage account across deployments
- ✅ **History** - Track which deployments used the storage
- ✅ **Cleanup** - Know which storage to clean up old artifacts from
- ✅ **Transparency** - See where artifacts are stored

## Manifest Structure

### Before (v2.0.0 without storage tracking)
```json
{
  "version": "2.0.0",
  "stacks": { ... },
  "directory": "/path/to/output"
}
```

### After (v2.0.0 with storage tracking)
```json
{
  "version": "2.0.0",
  "stacks": { ... },
  "directory": "/path/to/output",
  "artifactStorage": {
    "accountName": "digitalproductscdk7f3e92",
    "resourceGroupName": "rg-pl-digitalproducts-colorai-nonprod-eus2-06",
    "location": "eastus2",
    "containerName": "arm-templates",
    "endpoint": "https://digitalproductscdk7f3e92.blob.core.windows.net/",
    "provisionedAt": "2025-10-14T04:30:00.000Z",
    "lastUsedAt": "2025-10-14T05:15:00.000Z",
    "deployments": [
      "Foundation-1699564800000",
      "Foundation-1699650000000"
    ]
  }
}
```

## How It Works

### First Deployment
1. Deploy command reads manifest - no `artifactStorage` present
2. **Automatically provisions new storage account**: `{organization}cdk{hash}` (e.g., `digitalproductscdk7f3e92`)
   - Creates storage account if it doesn't exist
   - Configures: Standard_LRS, Hot tier, TLS 1.2+, private access
   - Creates `arm-templates` container
3. Uploads templates to storage
4. **After successful deployment**:
   - Adds `artifactStorage` to manifest
   - Sets `provisionedAt` timestamp
   - Sets `lastUsedAt` timestamp
   - Adds deployment ID to `deployments` array
   - Saves updated manifest

### Subsequent Deployments
1. Deploy command reads manifest - `artifactStorage` exists
2. Reuses existing storage account from `accountName`
3. Uploads new templates (with new deployment ID)
4. **After successful deployment**:
   - Updates `lastUsedAt` timestamp
   - Adds new deployment ID to `deployments` array (max 10)
   - Saves updated manifest

## Benefits

### 1. Automatic Provisioning & Reuse
```bash
# First deployment - Storage auto-created
$ atakora deploy Foundation
> Creating storage account: digitalproductscdk7f3e92...
> Storage account created: digitalproductscdk7f3e92
> Creating container: arm-templates...
> Container created: arm-templates
> Uploading 18 templates...
✓ Deployed successfully

# Second deployment - Storage reused
$ atakora deploy Foundation
> Using existing container: arm-templates  ← Faster!
> Uploading 18 templates...
✓ Deployed successfully
```

**No manual setup required!** The CLI automatically:
- ✅ Creates the storage account if it doesn't exist
- ✅ Configures security settings (private, TLS 1.2+, encrypted)
- ✅ Creates the blob container
- ✅ Reuses existing storage on subsequent deployments

### 2. Deployment History
```json
{
  "deployments": [
    "Foundation-1699564800000",  // Nov 9, 2023
    "Foundation-1699650000000"   // Nov 10, 2023
  ]
}
```

You can see:
- How many times you've deployed
- When deployments happened (via timestamp in ID)
- Which artifacts are in storage

### 3. Cleanup Operations
```bash
# Future command: Clean up old deployments
$ atakora storage clean --keep 5
> Found 10 deployments in digitalproductscdk7f3e92
> Keeping last 5 deployments
> Removing 5 old deployments...
✓ Cleaned up 2.3 MB

# Future command: View artifact storage
$ atakora storage info
Storage Account: digitalproductscdk7f3e92
Resource Group: rg-pl-digitalproducts-colorai-nonprod-eus2-06
Location: eastus2
Provisioned: 2025-10-14T04:30:00Z
Last Used: 2025-10-14T05:15:00Z
Deployments: 2
```

### 4. Multi-Environment Support
Each manifest (dev, staging, prod) tracks its own storage:

```
.atakora/arm.out/
├── backend-dev/
│   └── manifest.json    → statakora{hash-dev}
├── backend-staging/
│   └── manifest.json    → statakora{hash-staging}
└── backend-prod/
    └── manifest.json    → statakora{hash-prod}
```

## Implementation Details

### Storage Account Name Generation
```typescript
// Pattern: {organization}cdk{hash}
// Example: digitalproductscdk7f3e92

// Extract organization from resource group name (rg-pl-digitalproducts-...)
const orgMatch = resourceGroupName.match(/rg-(?:pl-)?([a-zA-Z0-9]+)/);
const orgName = orgMatch ? orgMatch[1] : 'atakora';

// Normalize: lowercase, remove special chars
const normalizedOrg = orgName.toLowerCase().replace(/[^a-z0-9]/g, '');

const prefix = `${normalizedOrg}cdk`;
const maxHashLength = 24 - prefix.length; // Max 24 chars for storage account

const hash = crypto
  .createHash('md5')
  .update(`${subscriptionId}-${resourceGroupName}`)
  .digest('hex')
  .substring(0, maxHashLength);

const accountName = `${prefix}${hash}`;
// Result: digitalproductscdk7f3e92 (24 chars)
```

**Deterministic**: Same subscription + resource group = same storage account name
**Organization-based**: Uses your organization name for easy identification

### Deployment ID Format
```
{stackName}-{timestamp}

Examples:
- Foundation-1699564800000
- Application-1699650000000
```

**Unique**: Timestamp ensures no collisions

### Deployment Limit
Only last **10 deployments** are tracked in manifest to keep file size reasonable:

```typescript
deployments: [
  ...existingDeployments.slice(-9),  // Keep last 9
  newDeploymentId                     // Add new one
]
```

Older deployments still exist in storage but aren't tracked in manifest.

## Type Definitions

```typescript
export interface ArtifactStorageConfig {
  readonly accountName: string;           // "digitalproductscdk7f3e92"
  readonly resourceGroupName: string;     // "rg-..."
  readonly location: string;              // "eastus2"
  readonly containerName: string;         // "arm-templates"
  readonly endpoint: string;              // "https://..."
  readonly provisionedAt: string;         // ISO 8601
  readonly lastUsedAt?: string;           // ISO 8601
  readonly deployments?: readonly string[]; // Max 10 IDs
}

export interface CloudAssemblyV2 {
  readonly version: '2.0.0';
  readonly stacks: Record<string, StackManifestV2>;
  readonly directory: string;
  artifactStorage?: ArtifactStorageConfig;  // NEW!
}
```

## Migration Path

### Existing v2.0.0 Manifests (without storage tracking)
No changes needed! The field is optional:

```typescript
artifactStorage?: ArtifactStorageConfig;
```

- If missing: Provision storage on next deployment
- If present: Reuse existing storage

### Updating from v1.0.0 to v2.0.0
The `artifactStorage` field is v2.0.0 only. v1.0.0 manifests don't have linked templates, so no storage is needed.

## Storage Account Configuration

When the CLI creates a storage account, it uses these settings:

```typescript
{
  sku: { name: 'Standard_LRS' },        // Locally redundant storage
  kind: 'StorageV2',                     // General-purpose v2
  properties: {
    accessTier: 'Hot',                   // Hot access tier
    allowBlobPublicAccess: false,        // No public access
    minimumTlsVersion: 'TLS1_2',         // TLS 1.2+ required
    supportsHttpsTrafficOnly: true,      // HTTPS only
    encryption: {
      services: { blob: { enabled: true }},
      keySource: 'Microsoft.Storage'
    }
  },
  tags: {
    purpose: 'arm-templates',
    managedBy: 'atakora-cdk'
  }
}
```

**Cost-effective**: Standard_LRS is the most affordable option
**Secure by default**: Private access, encryption enabled, HTTPS only
**Purpose-built**: Tagged for easy identification

## Security Considerations

### 1. Storage Account Access
- **Private**: No public blob access (enforced at creation)
- **RBAC**: Uses Azure AD authentication (DefaultAzureCredential)
- **SAS Tokens**: Short-lived (24h), read-only
- **Encryption**: At rest and in transit (TLS 1.2+)
- **HTTPS Only**: HTTP requests are rejected

### 2. Manifest Security
The manifest contains:
- ✅ Storage account name (public info)
- ✅ Resource group name (public info)
- ✅ Endpoint URL (public info)
- ❌ No secrets, keys, or SAS tokens

**Safe to commit**: The manifest can be committed to git - no sensitive data.

### 3. Deployment History
Deployment IDs contain:
- Stack name (e.g., "Foundation")
- Timestamp (e.g., 1699564800000)

**Safe to share**: No sensitive information in deployment IDs.

## Future Enhancements

### 1. Storage Cleanup Command
```bash
$ atakora storage clean [options]

Options:
  --keep <n>           Keep last N deployments (default: 5)
  --older-than <days>  Remove deployments older than N days
  --dry-run            Show what would be deleted without deleting
```

### 2. Storage Info Command
```bash
$ atakora storage info

Displays:
- Storage account details
- Container size
- Deployment count
- Oldest/newest deployment
- Blob listing
```

### 3. Cross-Manifest Sharing
```bash
$ atakora storage share --from dev --to staging

Copies:
- dev environment's storage account info
- To staging manifest
- Enables resource sharing
```

### 4. Storage Migration
```bash
$ atakora storage migrate --to <new-account>

Migrates:
- Templates from old storage to new
- Updates manifest
- Validates integrity
```

## Example Workflow

```bash
# Day 1: First deployment
$ atakora synth --package backend
$ atakora deploy Foundation --auto-approve

# Manifest updated with storage info:
# .atakora/arm.out/backend/manifest.json
{
  "version": "2.0.0",
  "stacks": { ... },
  "artifactStorage": {
    "accountName": "digitalproductscdk7f3e92",
    "provisionedAt": "2025-10-14T10:00:00Z",
    "deployments": ["Foundation-1728907200000"]
  }
}

# Day 2: Update code and redeploy
$ atakora synth --package backend
$ atakora deploy Foundation --auto-approve

# Manifest updated with new deployment:
{
  "artifactStorage": {
    "accountName": "digitalproductscdk7f3e92",
    "provisionedAt": "2025-10-14T10:00:00Z",
    "lastUsedAt": "2025-10-15T11:30:00Z",  ← Updated
    "deployments": [
      "Foundation-1728907200000",
      "Foundation-1728996600000"  ← Added
    ]
  }
}

# Day 30: Many deployments later
{
  "deployments": [
    "Foundation-1728907200000",
    "Foundation-1728996600000",
    ...
    "Foundation-1731686400000"  ← Only last 10 tracked
  ]
}

# Cleanup old deployments
$ atakora storage clean --keep 5
> Removed 15 old deployments
> Freed 4.2 MB
```

## Troubleshooting

### Issue: Storage account not found
**Cause**: Account was manually deleted from Azure

**Solution**:
```bash
# Remove artifactStorage from manifest
$ code .atakora/arm.out/backend/manifest.json
# Delete the "artifactStorage" field

# Next deployment will provision new storage
$ atakora deploy Foundation
```

### Issue: Manifest not updating
**Cause**: File permissions or disk space

**Solution**:
```bash
# Check manifest is writable
$ ls -l .atakora/arm.out/backend/manifest.json

# Check disk space
$ df -h

# Manually update if needed
$ code .atakora/arm.out/backend/manifest.json
```

### Issue: Want to use different storage account
**Solution**:
```bash
# Option 1: Edit manifest to point to different account
$ code .atakora/arm.out/backend/manifest.json
# Update accountName, resourceGroupName, endpoint

# Option 2: Remove artifactStorage to provision new one
# Delete the "artifactStorage" field from manifest

# Next deployment will use new/updated storage
$ atakora deploy Foundation
```

## Summary

Storage tracking in the manifest provides:

✅ **Performance**: Reuse storage instead of re-provisioning
✅ **History**: Track deployment timeline
✅ **Cleanup**: Know what to clean up
✅ **Transparency**: See where artifacts live
✅ **Multi-env**: Each environment has its own storage
✅ **Safe**: No secrets in manifest
✅ **Optional**: Works with or without tracking

The feature is **fully backward compatible** and **opt-in** (automatic on first deployment with linked templates).
