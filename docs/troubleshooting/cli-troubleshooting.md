# CLI Troubleshooting Guide

**Navigation**: [Docs Home](../README.md) > [Troubleshooting](./README.md) > CLI Troubleshooting

---

## Overview

This guide helps you diagnose and resolve common issues with the Atakora CLI, authentication system, naming conventions, and supporting utilities.

## Quick Diagnostics

Run these commands to gather diagnostic information:

```bash
# CLI version
atakora --version

# Node and npm versions
node --version
npm --version

# Check authentication
atakora config show

# Verify installation
which atakora  # Unix/Mac
where atakora  # Windows

# Check project manifest
cat .atakora/manifest.json

# View Azure CLI status
az account show
```

## Installation Issues

### Command Not Found

**Problem**: `atakora: command not found` or `'atakora' is not recognized`

**Causes**:
- CLI not installed globally
- npm global bin directory not in PATH
- Using local installation without npx

**Solutions**:

1. **Install globally**:
   ```bash
   npm install -g @atakora/cli

   # Verify
   atakora --version
   ```

2. **Fix npm PATH (Unix/Mac)**:
   ```bash
   # Check npm global bin directory
   npm config get prefix

   # Add to PATH in ~/.bashrc or ~/.zshrc
   export PATH="$PATH:$(npm config get prefix)/bin"

   # Reload shell
   source ~/.bashrc  # or ~/.zshrc
   ```

3. **Fix npm PATH (Windows)**:
   ```powershell
   # Get npm global directory
   npm config get prefix

   # Add to PATH via System Environment Variables
   # Or use PowerShell:
   $env:PATH += ";$(npm config get prefix)"
   ```

4. **Use npx for local installations**:
   ```bash
   npx atakora init
   npx atakora synth
   ```

### Permission Denied

**Problem**: `EACCES: permission denied` during installation

**Solutions**:

1. **Use npx (recommended)**:
   ```bash
   npx @atakora/cli init
   ```

2. **Fix npm permissions (Unix/Mac)**:
   ```bash
   # Change npm directory ownership
   sudo chown -R $(whoami) ~/.npm
   sudo chown -R $(whoami) $(npm config get prefix)

   # Then reinstall
   npm install -g @atakora/cli
   ```

3. **Use nvm (Node Version Manager)**:
   ```bash
   # Install nvm
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

   # Install Node.js via nvm
   nvm install 18
   nvm use 18

   # Install CLI (no sudo needed)
   npm install -g @atakora/cli
   ```

### Module Not Found

**Problem**: `Cannot find module '@atakora/lib'` or similar

**Causes**:
- Dependencies not installed
- Corrupted node_modules
- Version mismatch

**Solutions**:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Clean install**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check package versions**:
   ```bash
   npm list @atakora/cli @atakora/lib @atakora/cdk

   # Update if needed
   npm update @atakora/cli @atakora/lib @atakora/cdk
   ```

4. **Rebuild dependencies**:
   ```bash
   npm rebuild
   ```

## Authentication Issues

### Authentication Failed

**Problem**: `Error: DefaultAzureCredential failed to retrieve a token`

**Diagnosis**:
```bash
# Check environment variables
echo $AZURE_TENANT_ID
echo $AZURE_CLIENT_ID
echo $AZURE_CLIENT_SECRET
echo $AZURE_SUBSCRIPTION_ID

# Check Azure CLI
az account show

# Check config
atakora config show
```

**Solutions**:

1. **Use Azure CLI**:
   ```bash
   az login
   az account set --subscription "Your Subscription"
   atakora deploy
   ```

2. **Set environment variables**:
   ```bash
   export AZURE_TENANT_ID="00000000-0000-0000-0000-000000000000"
   export AZURE_CLIENT_ID="11111111-1111-1111-1111-111111111111"
   export AZURE_CLIENT_SECRET="your-secret"
   export AZURE_SUBSCRIPTION_ID="22222222-2222-2222-2222-222222222222"
   ```

3. **Test service principal**:
   ```bash
   az login --service-principal \
     --username $AZURE_CLIENT_ID \
     --password $AZURE_CLIENT_SECRET \
     --tenant $AZURE_TENANT_ID

   # If this fails, recreate service principal
   az ad sp create-for-rbac --name "atakora-sp" --role Contributor
   ```

4. **Clear credential cache**:
   ```bash
   # Remove Azure CLI cache
   rm -rf ~/.azure

   # Re-login
   az login
   atakora deploy
   ```

### Wrong Tenant/Subscription

**Problem**: `Error: 404 Subscription not found` or `Token not issued for this tenant`

**Diagnosis**:
```bash
# Check current subscription
az account show

# List all subscriptions
az account list --output table

# Check CLI config
atakora config show
```

**Solutions**:

1. **Switch subscription**:
   ```bash
   # Via Azure CLI
   az account set --subscription "Correct Subscription Name"

   # Via Atakora
   atakora config select --subscription "subscription-id"
   ```

2. **Use correct tenant**:
   ```bash
   # Login to specific tenant
   az login --tenant "00000000-0000-0000-0000-000000000000"

   # Or set in config
   atakora config select --tenant "tenant-id" --subscription "subscription-id"
   ```

3. **Create tenant-specific profile**:
   ```bash
   atakora config set-profile my-tenant \
     --tenant "tenant-id" \
     --subscription "subscription-id" \
     --cloud AzureCloud

   atakora config use my-tenant
   ```

### Government Cloud Authentication

**Problem**: Authentication fails for Azure Government

**Solutions**:

1. **Set cloud environment**:
   ```bash
   # Azure CLI
   az cloud set --name AzureUSGovernment
   az login

   # Atakora
   atakora config select --cloud AzureUSGovernment
   ```

2. **Use correct authority**:
   ```bash
   export AZURE_CLOUD=AzureUSGovernment
   export AZURE_AUTHORITY_HOST=https://login.microsoftonline.us/

   atakora deploy
   ```

3. **Verify endpoints**:
   ```bash
   # Check cloud config
   az cloud show --name AzureUSGovernment

   # Should show:
   # - Authority: login.microsoftonline.us
   # - Resource Manager: management.usgovcloudapi.net
   ```

### Expired Credentials

**Problem**: `Error: 401 Unauthorized - Token expired`

**Solutions**:

1. **Re-login with Azure CLI**:
   ```bash
   az logout
   az login
   ```

2. **Refresh service principal secret**:
   ```bash
   # Reset secret
   az ad sp credential reset --id $AZURE_CLIENT_ID

   # Update environment variable
   export AZURE_CLIENT_SECRET="new-secret"
   ```

3. **Check token expiration**:
   ```bash
   # Get token info
   az account get-access-token --query "expiresOn" -o tsv
   ```

## Configuration Issues

### Manifest Not Found

**Problem**: `Error: Project not initialized` or `Manifest not found`

**Diagnosis**:
```bash
# Check if manifest exists
ls -la .atakora/manifest.json

# Check current directory
pwd

# Check git root (if in git repo)
git rev-parse --show-toplevel
```

**Solutions**:

1. **Initialize project**:
   ```bash
   atakora init
   ```

2. **Run from correct directory**:
   ```bash
   # Navigate to project root
   cd /path/to/project

   # Verify manifest exists
   cat .atakora/manifest.json
   ```

3. **Recreate manifest**:
   ```bash
   # Backup existing packages
   cp -r packages packages.backup

   # Reinitialize
   rm -rf .atakora
   atakora init

   # Add packages back
   atakora add package-name
   ```

### Profile Configuration Errors

**Problem**: `Error: Profile 'production' does not exist`

**Diagnosis**:
```bash
# List profiles
atakora config list

# Show config file
cat ~/.azure-arm/config.json

# Check active profile
atakora config show
```

**Solutions**:

1. **Create missing profile**:
   ```bash
   atakora config set-profile production \
     --tenant "tenant-id" \
     --subscription "subscription-id" \
     --location "eastus"
   ```

2. **Switch to existing profile**:
   ```bash
   # List available
   atakora config list

   # Switch
   atakora config use dev
   ```

3. **Fix corrupted config**:
   ```bash
   # Backup existing
   mv ~/.azure-arm/config.json ~/.azure-arm/config.json.backup

   # Recreate
   atakora config select
   ```

### Invalid Package Configuration

**Problem**: `Error: Package 'backend' not found in manifest`

**Diagnosis**:
```bash
# Check manifest
cat .atakora/manifest.json

# List packages directory
ls -la packages/

# Check package structure
ls -la packages/backend/
```

**Solutions**:

1. **Add package to manifest**:
   ```bash
   atakora add backend
   ```

2. **Fix manifest manually**:
   ```json
   {
     "organization": "MyOrg",
     "project": "MyProject",
     "packages": [
       {
         "name": "backend",
         "path": "./packages/backend",
         "entry": "./bin/app.ts"
       }
     ]
   }
   ```

3. **Regenerate package**:
   ```bash
   # Remove package
   rm -rf packages/backend

   # Add fresh package
   atakora add backend
   ```

## Naming Convention Issues

### Name Too Long

**Problem**: Generated name exceeds Azure resource limits

**Diagnosis**:
```typescript
import { ResourceNameGenerator } from '@atakora/lib/naming';

const generator = new ResourceNameGenerator();
const name = generator.generateName({
  resourceType: 'storage',
  organization: 'very-long-organization-name',
  // ...
});

console.log(`Name length: ${name.length}`);
console.log(`Max length: ${generator.getMaxLength('storage')}`);
// Name length: 35
// Max length: 24 (PROBLEM!)
```

**Solutions**:

1. **Use abbreviations**:
   ```typescript
   organization: 'vlon'  // instead of 'very-long-organization-name'
   geography: 'eus'      // instead of 'eastus'
   environment: 'np'     // instead of 'nonprod'
   ```

2. **Check before generation**:
   ```typescript
   const tentativeName = buildName(params);

   if (generator.willTruncate(tentativeName, 'storage')) {
     console.warn(`Name will be truncated: ${tentativeName}`);
     // Adjust parameters
   }
   ```

3. **Use custom conventions**:
   ```typescript
   const generator = new ResourceNameGenerator({
     patterns: {
       storage: 'st',  // Shorter prefix
     },
     maxLength: 24
   });
   ```

### Invalid Characters

**Problem**: `Validation failed: Resource name contains invalid characters`

**Diagnosis**:
```typescript
const result = generator.validateName('my-storage_123', 'storage');
console.log(result.errors);
// ["Storage account names can only contain lowercase letters and numbers"]
```

**Solutions**:

1. **Check resource-specific rules**:
   ```typescript
   import { getValidationRules } from '@atakora/lib/naming';

   const rules = getValidationRules('storage');
   console.log('Pattern:', rules.pattern);
   console.log('Min length:', rules.minLength);
   console.log('Max length:', rules.maxLength);
   ```

2. **Let generator handle transformations**:
   ```typescript
   // Generator automatically removes hyphens for storage
   const name = generator.generateName({
     resourceType: 'storage',
     // ... params
   });
   // Result: lowercase, no hyphens automatically applied
   ```

3. **Manual validation before deployment**:
   ```typescript
   const name = generateName();
   const validation = generator.validateName(name, resourceType);

   if (!validation.isValid) {
     throw new Error(`Invalid name: ${validation.errors.join(', ')}`);
   }
   ```

### Name Not Globally Unique

**Problem**: `Deployment failed: Storage account name already exists`

**Diagnosis**:
```bash
# Check if name exists
az storage account check-name --name "myname123"

# Output:
# {
#   "nameAvailable": false,
#   "reason": "AlreadyExists",
#   "message": "The storage account named myname123 is already taken."
# }
```

**Solutions**:

1. **Add unique suffix**:
   ```typescript
   import crypto from 'crypto';

   const uniqueSuffix = crypto.randomBytes(4).toString('hex');

   const name = generator.generateName({
     resourceType: 'storage',
     // ... other params
     additionalSuffix: uniqueSuffix
   });
   ```

2. **Increment instance number**:
   ```typescript
   instance: '02'  // Try next instance
   ```

3. **Check availability before creation**:
   ```typescript
   import { StorageManagementClient } from '@azure/arm-storage';

   const client = new StorageManagementClient(credential, subscriptionId);
   const result = await client.storageAccounts.checkNameAvailability({
     name: proposedName
   });

   if (!result.nameAvailable) {
     console.error(`Name taken: ${result.message}`);
     // Generate alternative
   }
   ```

## Synthesis Issues

### TypeScript Compilation Errors

**Problem**: `Error: TypeScript compilation failed`

**Diagnosis**:
```bash
# Compile manually to see errors
npm run build

# Or with TypeScript directly
npx tsc --noEmit

# Check tsconfig
cat tsconfig.json
```

**Solutions**:

1. **Fix TypeScript errors**:
   ```bash
   # See detailed errors
   npx tsc --noEmit --pretty

   # Fix reported issues
   # Then retry synthesis
   atakora synth
   ```

2. **Update dependencies**:
   ```bash
   npm update @atakora/lib @atakora/cdk
   npm update typescript @types/node
   ```

3. **Check for breaking changes**:
   ```bash
   # Compare versions
   npm list @atakora/lib @atakora/cdk

   # Check changelog
   npm view @atakora/lib versions
   ```

### Validation Errors

**Problem**: `Validation failed: Invalid delegation structure`

**Diagnosis**:
```bash
# Enable verbose logging
export ATAKORA_LOG_LEVEL=debug
atakora synth

# Check validation errors
cat .atakora/arm.out/<package>/validation-errors.json
```

**Solutions**:

1. **Fix delegation structure**:
   ```typescript
   // ✗ Wrong
   delegations: [{
     name: 'sqlDelegation',
     serviceName: 'Microsoft.Sql/managedInstances'  // Missing properties wrapper
   }]

   // ✓ Correct
   delegations: [{
     name: 'sqlDelegation',
     properties: {
       serviceName: 'Microsoft.Sql/managedInstances'
     }
   }]
   ```

2. **Fix NSG references**:
   ```typescript
   // ✗ Wrong - literal string
   networkSecurityGroup: { id: 'my-nsg-id' }

   // ✓ Correct - ARM reference
   networkSecurityGroup: {
     id: Fn.resourceId('Microsoft.Network/networkSecurityGroups', nsg.name)
   }
   ```

3. **Disable validation temporarily**:
   ```bash
   # For debugging only
   export ATAKORA_SKIP_VALIDATION=1
   atakora synth
   ```

### Missing Resources in Output

**Problem**: Resources not appearing in ARM template

**Diagnosis**:
```bash
# Check synthesized template
cat .atakora/arm.out/<package>/template.json | jq '.resources[].type'

# Enable debug logging
export ATAKORA_LOG_LEVEL=debug
atakora synth
```

**Solutions**:

1. **Ensure resource is in construct tree**:
   ```typescript
   // Resource must be created with stack as scope
   new VirtualNetwork(stack, 'VNet', { /* ... */ });

   // Not orphaned
   const vnet = new VirtualNetwork(undefined, 'VNet', { /* ... */ });  // ✗ Wrong
   ```

2. **Check for conditional logic**:
   ```typescript
   // Resource only created if condition is true
   if (process.env.INCLUDE_VPN === 'true') {
     new VpnGateway(stack, 'Vpn', { /* ... */ });
   }
   ```

3. **Verify synthesis**:
   ```typescript
   const app = new App();
   const stack = new Stack(app, 'MyStack');

   new VirtualNetwork(stack, 'VNet', { /* ... */ });

   // Explicitly synthesize
   const assembly = app.synth();
   console.log(assembly.artifacts);
   ```

## Testing Issues

### Test Failures

**Problem**: Tests fail with `expect(...).toHaveResource is not a function`

**Solutions**:

1. **Setup matchers**:
   ```typescript
   import { setupArmMatchers } from '@atakora/lib/testing';

   // In jest.setup.ts or test file
   beforeAll(() => {
     setupArmMatchers();
   });
   ```

2. **Import test utilities correctly**:
   ```typescript
   // ✓ Correct
   import {
     expectValidationError,
     setupArmMatchers
   } from '@atakora/lib/testing';

   // ✗ Wrong
   import { expectValidationError } from '@atakora/lib';  // Wrong path
   ```

### Validation Not Triggered

**Problem**: Validation errors not caught in tests

**Solutions**:

1. **Trigger synthesis**:
   ```typescript
   const stack = new Stack(app, 'Test');

   // Create invalid resource
   new VirtualNetwork(stack, 'VNet', {
     addressSpace: 'invalid'
   });

   // Must synthesize to trigger validation
   const template = Template.fromStack(stack);

   // Now check for errors
   expectValidationError(stack, 'INVALID_CIDR');
   ```

2. **Use correct test pattern**:
   ```typescript
   test('validates CIDR', () => {
     const stack = new Stack(app, 'Test');

     expect(() => {
       new VirtualNetwork(stack, 'VNet', {
         addressSpace: 'invalid'
       });
       stack.synthesize();  // Trigger validation
     }).toThrow('Invalid CIDR');
   });
   ```

### Mock Bindings Not Working

**Problem**: Function tests fail - bindings undefined

**Solutions**:

1. **Create context with bindings**:
   ```typescript
   import { FunctionTestUtils, MockBlobStorage } from '@atakora/lib/testing';

   const testUtils = new FunctionTestUtils();
   const blobStorage = new MockBlobStorage();

   const context = testUtils.createContext({
     bindings: {
       inputBlob: blobStorage.getBlob('container', 'file.json')
     }
   });

   // Access via context.bindings
   await myFunction(context, context.bindings.inputBlob);
   ```

2. **Use createMockBindings helper**:
   ```typescript
   import { createMockBindings } from '@atakora/lib/testing';

   const bindings = createMockBindings({
     blob: { container: 'test', blob: 'file.json' },
     queue: { name: 'output' }
   });

   const context = testUtils.createContext({
     bindings: bindings.input
   });
   ```

## Performance Issues

### Slow Synthesis

**Problem**: `atakora synth` takes too long

**Solutions**:

1. **Use incremental builds**:
   ```bash
   # Enable TypeScript incremental compilation
   # In tsconfig.json:
   {
     "compilerOptions": {
       "incremental": true
     }
   }

   # Synthesis will be faster on subsequent runs
   atakora synth
   ```

2. **Skip validation**:
   ```bash
   # For development only
   export ATAKORA_SKIP_VALIDATION=1
   atakora synth
   ```

3. **Parallel package synthesis**:
   ```bash
   # Synthesize packages in parallel (future feature)
   atakora synth --parallel
   ```

4. **Profile synthesis**:
   ```bash
   # Enable profiling
   export ATAKORA_PROFILE=1
   atakora synth

   # Check .atakora/synthesis-profile.json
   cat .atakora/synthesis-profile.json
   ```

### High Memory Usage

**Problem**: Node.js out of memory during synthesis

**Solutions**:

1. **Increase Node.js memory**:
   ```bash
   # Increase to 4GB
   export NODE_OPTIONS="--max-old-space-size=4096"
   atakora synth
   ```

2. **Synthesize packages individually**:
   ```bash
   # Instead of all at once
   atakora synth --package backend
   atakora synth --package frontend
   ```

3. **Optimize construct usage**:
   ```typescript
   // Reuse constructs where possible
   const naming = new NamingService(stack, params);

   // ✗ Creates new service each time
   constructs.forEach(c => {
     const name = new NamingService(stack, params).generateName('vnet', c.id);
   });

   // ✓ Reuse service
   constructs.forEach(c => {
     const name = naming.generateName('vnet', c.id);
   });
   ```

## Getting Help

### Gather Diagnostic Information

```bash
# Create diagnostic report
cat > diagnostics.sh << 'EOF'
#!/bin/bash

echo "=== System Information ==="
uname -a
node --version
npm --version

echo -e "\n=== Atakora CLI ==="
atakora --version
which atakora

echo -e "\n=== Azure CLI ==="
az --version
az account show

echo -e "\n=== Environment Variables ==="
env | grep AZURE

echo -e "\n=== Project Configuration ==="
cat .atakora/manifest.json

echo -e "\n=== Package Versions ==="
npm list @atakora/cli @atakora/lib @atakora/cdk

echo -e "\n=== Recent Errors ==="
tail -n 50 ~/.atakora/logs/error.log
EOF

chmod +x diagnostics.sh
./diagnostics.sh > diagnostic-report.txt
```

### Enable Debug Logging

```bash
# Maximum verbosity
export ATAKORA_LOG_LEVEL=debug
export DEBUG=*

# Run command
atakora synth

# Logs saved to .atakora/logs/
cat .atakora/logs/debug.log
```

### Report Issues

When reporting issues, include:

1. **Atakora version**: `atakora --version`
2. **Node/npm version**: `node --version && npm --version`
3. **Error message**: Full error output
4. **Steps to reproduce**: Minimal example
5. **Environment**: OS, Azure cloud (Commercial/Government)
6. **Diagnostic report**: Run script above

Submit issues at: [GitHub Issues](https://github.com/digital-minion/atakora/issues)

## See Also

- [Common Issues](./common-issues.md)
- [Deployment Failures](./deployment-failures.md)
- [Authentication Reference](../reference/authentication.md)
- [Naming Conventions Guide](../guides/naming-conventions.md)
- [Testing Guide](../guides/testing-utilities.md)

---

**Last Updated**: 2025-10-10
**Version**: 1.0.0+
