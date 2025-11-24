# Troubleshooting Guide

[Home](../README.md) > Troubleshooting

Quick solutions to common problems you might encounter with Atakora.

## 🚨 Quick Fixes

### Most Common Issues

1. **[Command not found](#command-not-found)** - CLI not in PATH
2. **[Azure authentication failed](#azure-authentication-failed)** - Credentials expired
3. **[Deployment timeout](#deployment-timeout)** - Large resources
4. **[Resource already exists](#resource-already-exists)** - Name conflicts
5. **[Validation errors](#validation-errors)** - Invalid configurations

## 📚 Troubleshooting Guides

### [Common Issues](./Common-Issues.md)
General problems and their solutions
- Installation problems
- Configuration issues
- Environment setup
- Permission errors

### [CLI Troubleshooting](./CLI-Troubleshooting.md)
Command-line interface specific issues
- Command errors
- Path problems
- Configuration files
- Authentication

### [Deployment Failures](./Deployment-Failures.md)
When deployments don't work as expected
- ARM template errors
- Resource conflicts
- Quota exceeded
- Region limitations

### [Debugging Synthesis](./Debugging-Synthesis.md)
Issues during template generation
- TypeScript errors
- Import problems
- Stack synthesis
- Template validation

### [CI/CD Problems](./CI-CD-Problems.md)
Continuous integration and deployment issues
- Pipeline failures
- Authentication in CI
- Automated deployments
- Environment variables

## 🔍 Diagnostic Commands

### Check Environment

```bash
# Verify Atakora installation
atakora --version

# Check Azure CLI
az --version
az account show

# Test Azure connectivity
az group list --output table

# Validate environment
atakora doctor
```

### Debug Synthesis

```bash
# Verbose synthesis output
atakora synth --verbose

# Validate templates
atakora validate

# Check TypeScript compilation
npx tsc --noEmit

# Review generated templates
ls -la arm.out/
```

### Deployment Debugging

```bash
# Check deployment status
az deployment group show \
  --resource-group <rg-name> \
  --name <deployment-name>

# Get deployment operations
az deployment operation group list \
  --resource-group <rg-name> \
  --name <deployment-name> \
  --query "[?properties.provisioningState=='Failed']"

# View activity log
az monitor activity-log list \
  --resource-group <rg-name> \
  --start-time 2024-01-01T00:00:00Z
```

## 💊 Quick Solutions

### Command Not Found

```bash
# NPM global install
npm install -g @atakora/cli

# Or use npx
npx @atakora/cli <command>

# Fix PATH (bash/zsh)
export PATH=$PATH:$(npm config get prefix)/bin
echo 'export PATH=$PATH:$(npm config get prefix)/bin' >> ~/.bashrc
```

### Azure Authentication Failed

```bash
# Re-login to Azure
az logout
az login

# Check current account
az account show

# Set correct subscription
az account set --subscription "Your Subscription"

# Clear cached credentials
az account clear
```

### Deployment Timeout

```typescript
// Increase timeout for large deployments
const app = new App({
  deploymentTimeout: 3600 // 1 hour in seconds
});

// Or via CLI
atakora deploy --timeout 60 // minutes
```

### Resource Already Exists

```typescript
// Add timestamp to ensure unique names
const storage = new StorageAccount(stack, 'storage', {
  accountName: `st${project}${Date.now()}`,
  // ...
});

// Or use random suffix
import { randomBytes } from 'crypto';
const suffix = randomBytes(4).toString('hex');
const storage = new StorageAccount(stack, 'storage', {
  accountName: `st${project}${suffix}`,
  // ...
});
```

### Validation Errors

```typescript
// Common validation fixes

// Storage account name (3-24 chars, lowercase, no special chars)
const validStorageName = name
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '')
  .substring(0, 24);

// Resource group name (1-90 chars, alphanumeric, underscore, hyphen, period)
const validRgName = name
  .replace(/[^a-zA-Z0-9._-]/g, '')
  .substring(0, 90);

// Virtual network address space (CIDR format)
const validAddressSpace = '10.0.0.0/16'; // Not '10.0.0.0'
```

## 🛠️ Error Messages Explained

### "The template deployment failed because of policy violation"

**Cause**: Azure Policy blocking the deployment
**Solution**:
```bash
# Check policies
az policy assignment list --resource-group <rg-name>

# Request exception or modify resource to comply
```

### "InvalidTemplateDeployment - Long running operation failed"

**Cause**: Template syntax error or invalid resource configuration
**Solution**:
```bash
# Validate template locally
atakora validate

# Test with What-If
az deployment group what-if \
  --resource-group <rg-name> \
  --template-file arm.out/main.json
```

### "QuotaExceeded"

**Cause**: Azure subscription limits reached
**Solution**:
```bash
# Check current usage
az vm list-usage --location eastus --output table

# Request quota increase via Azure Portal
```

### "ResourceGroupNotFound"

**Cause**: Trying to deploy to non-existent resource group
**Solution**:
```bash
# Create resource group first
az group create --name <rg-name> --location eastus

# Or ensure it's in your Atakora code
const rg = new ResourceGroup(stack, 'rg', {
  name: 'rg-myapp',
  location: 'eastus'
});
```

## 🔧 Advanced Debugging

### Enable Debug Logging

```bash
# Set debug environment variable
export DEBUG=atakora:*
atakora synth

# Azure CLI debug mode
az group deployment create --debug \
  --resource-group <rg-name> \
  --template-file template.json
```

### Analyze ARM Templates

```bash
# Pretty-print generated template
cat arm.out/main.json | jq '.'

# Check template size (limit: 4MB)
du -h arm.out/main.json

# Validate JSON syntax
jsonlint arm.out/main.json
```

### Review Stack Trace

```typescript
// Add error boundaries
try {
  const stack = new Stack(app, 'my-stack');
  // ... resources
} catch (error) {
  console.error('Stack creation failed:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
```

## 🆘 Getting Help

### Before Asking for Help

1. **Check existing issues** on GitHub
2. **Search documentation** for keywords
3. **Try the diagnostic commands** above
4. **Collect error messages** and logs

### Information to Provide

When asking for help, include:

```markdown
**Environment:**
- OS: [e.g., macOS 13.0]
- Node version: [run `node --version`]
- Atakora version: [run `atakora --version`]
- Azure CLI version: [run `az --version`]

**Problem:**
[Clear description of what you're trying to do]

**Error Message:**
```
[Full error message]
```

**Code:**
```typescript
[Minimal code to reproduce]
```

**Steps Taken:**
1. [What you tried]
2. [Results]
```

### Where to Get Help

- **GitHub Issues**: [Report bugs](https://github.com/atakora/atakora/issues)
- **Discussions**: [Ask questions](https://github.com/atakora/atakora/discussions)
- **Stack Overflow**: Tag with `atakora`
- **Azure Forums**: For Azure-specific issues

## 📋 Troubleshooting Checklist

Before deployment:
- [ ] Azure CLI logged in: `az account show`
- [ ] Correct subscription: `az account set --subscription <name>`
- [ ] TypeScript compiles: `npx tsc --noEmit`
- [ ] Templates synthesize: `atakora synth`
- [ ] Templates validate: `atakora validate`

During deployment:
- [ ] Monitor Azure Portal Activity Log
- [ ] Check resource group events
- [ ] Verify quotas and limits
- [ ] Review policy compliance

After deployment:
- [ ] Verify resources created: `az resource list --resource-group <rg>`
- [ ] Check resource health in Portal
- [ ] Test connectivity/functionality
- [ ] Review costs and tags

## 🔄 Recovery Procedures

### Failed Deployment Cleanup

```bash
# List failed deployments
az deployment group list \
  --resource-group <rg-name> \
  --query "[?properties.provisioningState=='Failed'].name"

# Delete failed deployment
az deployment group delete \
  --resource-group <rg-name> \
  --name <deployment-name>

# Clean up partial resources
atakora destroy --force
```

### Reset Local Environment

```bash
# Clear synthesis output
rm -rf arm.out/

# Reset node modules
rm -rf node_modules package-lock.json
npm install

# Clear Atakora cache
rm -rf ~/.atakora/cache

# Re-synthesize
atakora synth
```

### Rollback Deployment

```bash
# Deploy previous version
git checkout <previous-commit>
atakora synth
atakora deploy

# Or use Azure deployment history
az deployment group create \
  --resource-group <rg-name> \
  --rollback-on-error
```

## 📊 Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `InvalidTemplate` | Template syntax error | Check JSON syntax, validate template |
| `ResourceNotFound` | Referenced resource doesn't exist | Check dependencies, deploy in correct order |
| `Conflict` | Resource state conflict | Wait for operations to complete, check locks |
| `QuotaExceeded` | Subscription limit reached | Request quota increase |
| `AuthorizationFailed` | Insufficient permissions | Check RBAC roles, use correct account |
| `SkuNotAvailable` | SKU not available in region | Choose different SKU or region |

## 💡 Prevention Tips

1. **Always validate before deploying**
   ```bash
   atakora validate && atakora deploy
   ```

2. **Use consistent naming conventions**
   ```typescript
   const naming = {
     rg: `rg-${app}-${env}`,
     storage: `st${app}${env}${unique}`
   };
   ```

3. **Test in development first**
   ```bash
   ENVIRONMENT=dev atakora deploy
   ```

4. **Implement retry logic**
   ```typescript
   const deployment = new Deployment(stack, {
     retryAttempts: 3,
     retryDelay: 5000
   });
   ```

5. **Monitor deployments**
   ```bash
   watch -n 5 'az deployment group show \
     --resource-group <rg> \
     --name <deployment> \
     --query properties.provisioningState'
   ```

---

**Still stuck?** Don't hesitate to [ask for help](#getting-help). We're here to help you succeed with Atakora!