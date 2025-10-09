# Deployment Failures

**Navigation**: [Docs Home](../README.md) > [Troubleshooting](./README.md) > Deployment Failures

---

## Overview

This guide helps you diagnose and fix Azure deployment failures.

## Common Deployment Errors

### Resource Already Exists

**Error**:
```
StorageAccountAlreadyTaken: The storage account name 'stmyapp' is already taken
```

**Solutions**:

1. **Use unique name**:
   ```typescript
   const storage = new StorageAccount(this, 'Storage', {
     name: 'stuniquename'
   });
   ```

2. **Delete existing resource**:
   ```bash
   az storage account delete \
     --name stmyapp \
     --resource-group rg-myapp-prod-eastus \
     --yes
   ```

3. **Check different subscription**:
   ```bash
   az account list --output table
   az account set --subscription "Correct Subscription"
   ```

### Template Validation Failed

**Error**:
```
InvalidTemplate: Deployment template validation failed
```

**Debug**:

1. **View error details**:
   ```bash
   az deployment group validate \
     --resource-group rg-myapp-prod-eastus \
     --template-file .atakora/arm.out/production/template.json \
     --verbose
   ```

2. **Check template syntax**:
   ```bash
   cat .atakora/arm.out/production/template.json | jq .
   ```

3. **Validate schema**:
   ```bash
   # Check template schema
   cat .atakora/arm.out/production/template.json | \
     jq '."$schema"'
   ```

### Permission Errors

**Error**:
```
AuthorizationFailed: You do not have permission to perform action
'Microsoft.Resources/deployments/write'
```

**Solutions**:

1. **Check current user**:
   ```bash
   az account show
   ```

2. **Check role assignments**:
   ```bash
   az role assignment list \
     --assignee <user-or-sp> \
     --output table
   ```

3. **Request access**:
   ```bash
   # Request Contributor role
   az role assignment create \
     --role Contributor \
     --assignee <user-or-sp> \
     --subscription $AZURE_SUBSCRIPTION_ID
   ```

### Deployment Timeout

**Error**:
```
Deployment timed out after 3600 seconds
```

**Solutions**:

1. **Increase timeout**:
   ```bash
   atakora deploy --timeout 7200  # 2 hours
   ```

2. **Deploy without waiting**:
   ```bash
   atakora deploy --no-wait
   ```

3. **Check Azure Portal** for deployment status

### Quota Exceeded

**Error**:
```
QuotaExceeded: Operation could not be completed as it results in exceeding quota limits
```

**Solutions**:

1. **Check quota**:
   ```bash
   az vm list-usage --location eastus --output table
   ```

2. **Request quota increase**:
   - Azure Portal → Quotas
   - Submit support request

3. **Use different region**:
   ```typescript
   super(scope, id, {
     environment: 'production',
     location: 'westus2'  // Try different region
   });
   ```

## Debugging Deployments

### View Deployment Status

```bash
az deployment group list \
  --resource-group rg-myapp-prod-eastus \
  --output table
```

### View Deployment Details

```bash
az deployment group show \
  --name deployment-20251008-120000 \
  --resource-group rg-myapp-prod-eastus
```

### View Deployment Operations

```bash
az deployment operation group list \
  --name deployment-20251008-120000 \
  --resource-group rg-myapp-prod-eastus \
  --output table
```

### View Deployment Errors

```bash
az deployment operation group list \
  --name deployment-20251008-120000 \
  --resource-group rg-myapp-prod-eastus \
  --query "[?properties.provisioningState=='Failed']"
```

## Recovery Strategies

### Rollback

```bash
# Revert code
git revert HEAD

# Redeploy previous version
atakora synth
atakora deploy
```

### Manual Cleanup

```bash
# Delete failed resources
az resource delete --ids <resource-id>

# Or delete entire group
az group delete --name rg-myapp-prod-eastus --yes
```

### Incremental Fix

```bash
# Fix issue in code
# Synthesize
atakora synth

# Validate template
az deployment group validate \
  --resource-group rg-myapp-prod-eastus \
  --template-file .atakora/arm.out/production/template.json

# Redeploy
atakora deploy
```

## See Also

- [Common Issues](./common-issues.md)
- [Deployment Guide](../guides/fundamentals/deployment.md)
- [`atakora deploy`](../reference/cli/deploy.md)

---

**Last Updated**: 2025-10-08
