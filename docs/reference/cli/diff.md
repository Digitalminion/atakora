# atakora diff

**Navigation**: [Docs Home](../../README.md) > [Reference](../README.md) > [CLI Reference](./README.md) > diff

---

## Synopsis

```bash
atakora diff [options]
```

## Description

Shows differences between your local infrastructure code and what's currently deployed in Azure. This command helps you preview changes before deployment, identify drift, and validate that your code matches expectations.

The diff command compares:
- Local ARM templates (from synthesis)
- Deployed resources in Azure
- Configuration changes
- Resource additions and deletions

## Options

### `--package <name>`

Show diff for a specific package.

- **Type**: string
- **Default**: Default package from manifest
- **Example**: `--package production`

### `--subscription <id>`

Azure subscription to compare against.

- **Type**: string (UUID)
- **Default**: From config or `AZURE_SUBSCRIPTION_ID`
- **Example**: `--subscription 00000000-0000-0000-0000-000000000000`

### `--resource-group <name>`

Resource group to compare.

- **Type**: string
- **Default**: From deployment target
- **Example**: `--resource-group rg-production`

### `--detailed`

Show detailed property-level differences.

- **Type**: boolean (flag)
- **Default**: `false` (summary only)
- **Example**: `atakora diff --detailed`

### `--json`

Output diff in JSON format.

- **Type**: boolean (flag)
- **Default**: `false` (human-readable)
- **Example**: `atakora diff --json`

### `--ignore-tags`

Ignore tag differences.

- **Type**: boolean (flag)
- **Default**: `false`
- **Example**: `atakora diff --ignore-tags`

Useful when tags are managed externally.

## Examples

### Basic Diff

Show summary of changes:

```bash
atakora diff
```

Output:
```
Comparing package: backend
Subscription: Production
Resource Group: rg-backend-prod-eastus

Changes detected:

Resources to add (2):
  + Microsoft.Network/networkSecurityGroups
      nsg-backend-prod-eastus

  + Microsoft.Storage/storageAccounts/blobServices/containers
      stbackendprod/default/logs

Resources to modify (1):
  ~ Microsoft.Network/virtualNetworks
      vnet-backend-prod-eastus

Resources to remove (0):

Summary:
  2 to add
  1 to modify
  0 to remove
```

### Detailed Diff

Show property-level changes:

```bash
atakora diff --detailed
```

Output:
```
Resources to modify (1):

  ~ Microsoft.Network/virtualNetworks
      vnet-backend-prod-eastus

    ~ properties.addressSpace.addressPrefixes
      - ["10.0.0.0/16"]
      + ["10.0.0.0/16", "10.1.0.0/16"]

    + properties.subnets[1]
      {
        "name": "AppSubnet",
        "properties": {
          "addressPrefix": "10.1.0.0/24"
        }
      }

    ~ tags.environment
      - "development"
      + "production"
```

### JSON Output

Machine-readable diff:

```bash
atakora diff --json
```

Output:
```json
{
  "package": "backend",
  "subscription": "00000000-0000-0000-0000-000000000000",
  "resourceGroup": "rg-backend-prod-eastus",
  "timestamp": "2025-10-08T12:00:00.000Z",
  "changes": {
    "added": [
      {
        "type": "Microsoft.Network/networkSecurityGroups",
        "name": "nsg-backend-prod-eastus",
        "location": "eastus"
      }
    ],
    "modified": [
      {
        "type": "Microsoft.Network/virtualNetworks",
        "name": "vnet-backend-prod-eastus",
        "changes": [
          {
            "path": "properties.addressSpace.addressPrefixes",
            "old": ["10.0.0.0/16"],
            "new": ["10.0.0.0/16", "10.1.0.0/16"]
          }
        ]
      }
    ],
    "removed": []
  },
  "summary": {
    "added": 1,
    "modified": 1,
    "removed": 0
  }
}
```

### Ignore Tags

Diff without tag changes:

```bash
atakora diff --ignore-tags
```

Useful when:
- Tags are managed by Azure Policy
- External tools manage tags
- Tag changes aren't relevant

### Specific Package

```bash
atakora diff --package production
```

### Specific Resource Group

```bash
atakora diff --resource-group rg-custom-name
```

## Output Format

### Summary View (Default)

Shows high-level changes:

```
Resources to add (count):
  + ResourceType
      resource-name

Resources to modify (count):
  ~ ResourceType
      resource-name

Resources to remove (count):
  - ResourceType
      resource-name
```

### Detailed View

Shows property-level diff:

```
  ~ ResourceType
      resource-name

    ~ property.path
      - old value
      + new value

    + new.property
      value

    - removed.property
```

Symbols:
- `+` - Addition
- `-` - Deletion
- `~` - Modification

### No Changes

```
No changes detected

Local template matches deployed resources
```

## Drift Detection

### What is Drift?

Drift occurs when deployed resources differ from your code:

- **Manual changes** in Azure Portal
- **Policy modifications** by Azure Policy
- **External tools** modifying resources
- **Concurrent deployments** by other processes

### Detecting Drift

```bash
# Synthesize current code
atakora synth

# Compare with Azure
atakora diff
```

If changes exist but you didn't modify code, you have drift.

### Resolving Drift

**Option 1**: Update code to match Azure

```typescript
// Update code to reflect manual changes
const vnet = new VirtualNetwork(this, 'VNet', {
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16', '10.1.0.0/16'] // Add new range
  }
});
```

**Option 2**: Redeploy to overwrite Azure changes

```bash
# Redeploy your code (overwrites manual changes)
atakora deploy
```

**Option 3**: Import existing state (future feature)

```bash
# Import current Azure state into code
atakora import
```

## Common Diff Scenarios

### Adding New Resources

```
Resources to add (1):
  + Microsoft.Storage/storageAccounts
      stnewaccount

This will create a new storage account when deployed.
```

### Modifying Properties

```
Resources to modify (1):
  ~ Microsoft.Network/virtualNetworks
      vnet-backend-prod-eastus

    ~ properties.addressSpace.addressPrefixes
      - ["10.0.0.0/16"]
      + ["10.0.0.0/16", "10.1.0.0/16"]

Address space expansion - safe, no downtime expected.
```

### Deleting Resources

```
Resources to remove (1):
  - Microsoft.Network/networkSecurityGroups
      nsg-old-backend

WARNING: This resource will be deleted during deployment!
```

### Replacing Resources

```
Resources to replace (1):
  -+ Microsoft.Storage/storageAccounts
       stbackendprod

    ~ sku.name
      - Standard_LRS
      + Premium_LRS

WARNING: Changing SKU requires resource replacement!
This will delete and recreate the storage account.
Data migration required before deployment.
```

### Tag Changes Only

```
Resources to modify (1):
  ~ Microsoft.Network/virtualNetworks
      vnet-backend-prod-eastus

    ~ tags.costCenter
      - "12345"
      + "67890"

Tag-only change - safe, no functional impact.
```

## Exit Codes

| Code | Condition | Meaning |
|------|-----------|---------|
| 0 | No changes | Deployed state matches code |
| 1 | Changes detected | Differences exist |
| 2 | Authentication error | Fix credentials |
| 3 | Resource group not found | Deploy hasn't run yet |
| 4 | General error | Check error message |

## Common Issues

### Resource Group Not Found

**Error**:
```
Resource group 'rg-backend-prod-eastus' not found
Unable to compare with deployed resources
```

**Cause**: First deployment hasn't been run yet.

**Solution**: This is expected for new projects:
```bash
# No diff possible - nothing deployed yet
atakora deploy
```

### Authentication Failed

**Error**:
```
Authentication failed
Cannot access Azure subscription
```

**Solution**: Configure credentials:
```bash
atakora config set-credentials
# or
az login
```

### Template Not Synthesized

**Error**:
```
ARM template not found
Run 'atakora synth' first
```

**Solution**: Synthesize templates:
```bash
atakora synth
atakora diff
```

### Subscription Mismatch

**Error**:
```
Warning: Comparing against different subscription
Local template targets: 00000000-0000-0000-0000-000000000000
Currently authenticated to: 11111111-1111-1111-1111-111111111111
```

**Solution**: Switch subscription:
```bash
atakora diff --subscription 00000000-0000-0000-0000-000000000000
# or
az account set --subscription 00000000-0000-0000-0000-000000000000
```

## Best Practices

### Always Diff Before Deploy

Make it part of your workflow:

```bash
# 1. Make changes to code
code packages/production/bin/app.ts

# 2. Synthesize
atakora synth

# 3. Review diff
atakora diff --detailed

# 4. Deploy if changes look good
atakora deploy
```

### Review Detailed Diffs

Use `--detailed` for important changes:

```bash
# Summary for quick check
atakora diff

# Detailed for production deployments
atakora diff --detailed --package production
```

### Save Diff Output

Keep record of changes:

```bash
# Save to file
atakora diff --detailed > deployment-plan.txt

# Save JSON for auditing
atakora diff --json > deployment-plan.json
```

### Check for Drift Regularly

Detect manual changes:

```bash
# Weekly drift check
atakora synth
atakora diff

# If changes found, investigate
atakora diff --detailed
```

### Use in CI/CD

Prevent accidental deployments:

```yaml
# GitHub Actions
- name: Check for changes
  run: |
    if atakora diff --json | jq -e '.changes.removed | length > 0'; then
      echo "ERROR: Deployment would delete resources!"
      exit 1
    fi

- name: Deploy
  run: atakora deploy --no-confirm
```

## Integration Examples

### GitHub Actions

```yaml
name: Infrastructure PR Check

on: [pull_request]

jobs:
  diff:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm ci

      - name: Generate diff
        env:
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
        run: |
          atakora synth
          atakora diff --detailed > diff.txt

      - name: Comment PR
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const diff = fs.readFileSync('diff.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Infrastructure Changes\n\n\`\`\`\n${diff}\n\`\`\``
            });
```

### Pre-Deployment Script

```bash
#!/bin/bash
# pre-deploy.sh

set -e

echo "Synthesizing templates..."
atakora synth

echo "Checking for changes..."
atakora diff --detailed > deployment-plan.txt

# Check if any resources would be deleted
if atakora diff --json | jq -e '.changes.removed | length > 0' > /dev/null; then
  echo "ERROR: Deployment would delete resources!"
  echo "Review deployment-plan.txt and confirm manually"
  exit 1
fi

echo "Changes look safe. Deployment plan saved to deployment-plan.txt"
echo "Run 'atakora deploy' to proceed"
```

Usage:
```bash
./pre-deploy.sh
# Review deployment-plan.txt
atakora deploy
```

## Diff Interpretation Guide

### Safe Changes

These changes typically don't cause downtime:

- Adding new resources
- Adding tags
- Expanding arrays (subnets, address ranges)
- Enabling features

### Potentially Disruptive Changes

Review carefully:

- Modifying network address spaces (may affect connectivity)
- Changing SKUs (may require downtime)
- Modifying security rules
- Changing access policies

### Dangerous Changes

Proceed with extreme caution:

- Deleting resources
- Replacing resources (delete + create)
- Changing resource names (causes replacement)
- Changing immutable properties

### Resource Replacement

Some property changes force resource replacement:

```
Resources to replace (1):
  -+ Microsoft.Storage/storageAccounts
       stbackendprod

    ~ sku.name
      - Standard_LRS
      + Premium_LRS
```

**What happens**:
1. New resource created
2. Data migration needed (manual)
3. Old resource deleted
4. References updated

**Action required**:
- Plan data migration
- Update dependent resources
- Consider blue-green deployment

## See Also

- [`atakora synth`](./synth.md) - Generate templates to compare
- [`atakora deploy`](./deploy.md) - Deploy changes
- [Deployment Guide](../../guides/fundamentals/deployment.md)
- [Debugging Deployment Issues](../../troubleshooting/deployment-failures.md)

---

**Last Updated**: 2025-10-08
**CLI Version**: 1.0.0+
