# atakora synth

**Navigation**: [Docs Home](../../README.md) > [Reference](../README.md) > [CLI Reference](./README.md) > synth

---

## Synopsis

```bash
atakora synth [options]
```

## Description

Synthesizes ARM (Azure Resource Manager) templates from your TypeScript infrastructure code. This command compiles your code, executes it to build the construct tree, validates the configuration, and generates deployment-ready JSON templates.

Synthesis is the core transformation step that converts your declarative infrastructure code into concrete ARM templates that Azure understands.

## What Synthesis Does

1. **Compiles TypeScript**: Transpiles `.ts` files to JavaScript
2. **Executes Code**: Runs your infrastructure code to build constructs
3. **Validates Configuration**: Checks resource properties and references
4. **Resolves References**: Links resources together (IDs, names, etc.)
5. **Generates ARM Templates**: Creates JSON files for deployment
6. **Outputs Manifests**: Writes deployment metadata

## Options

### `--package <name>`

Synthesize a specific package.

- **Type**: string
- **Default**: Default package from manifest or all packages
- **Example**: `--package production`

### `--output <directory>`

Output directory for ARM templates.

- **Type**: string
- **Default**: `.atakora/arm.out`
- **Example**: `--output ./build/templates`

### `--validate / --no-validate`

Enable or disable validation during synthesis.

- **Type**: boolean
- **Default**: `true`
- **Example**: `--no-validate` to skip validation

Validation checks:
- Required properties
- Property value constraints
- Reference integrity
- Naming conventions
- Azure resource limits

### `--verbose`

Show detailed synthesis output.

- **Type**: boolean (flag)
- **Default**: `false`
- **Example**: `atakora synth --verbose`

Shows:
- Construct creation
- Property resolution
- Validation steps
- Template generation

### `--quiet`

Suppress non-error output.

- **Type**: boolean (flag)
- **Default**: `false`
- **Example**: `atakora synth --quiet`

### `--parallel`

Synthesize multiple packages in parallel.

- **Type**: boolean (flag)
- **Default**: `false` (sequential)
- **Example**: `atakora synth --parallel`

Faster for multi-package workspaces.

### `--incremental`

Only synthesize changed packages.

- **Type**: boolean (flag)
- **Default**: `false`
- **Example**: `atakora synth --incremental`

Uses cache to skip unchanged packages.

### `--force`

Force re-synthesis even if nothing changed.

- **Type**: boolean (flag)
- **Default**: `false`
- **Example**: `atakora synth --force`

Ignores cache and regenerates all templates.

## Examples

### Basic Synthesis

Synthesize default package:

```bash
atakora synth
```

Output:
```
Synthesizing package: backend
✓ Compiled TypeScript successfully
✓ Built construct tree (12 resources)
✓ Validated configuration
✓ Generated ARM templates
  → .atakora/arm.out/backend/template.json

Synthesis complete in 2.3s
```

### Synthesize Specific Package

```bash
atakora synth --package production
```

### Synthesize All Packages

```bash
atakora synth --all
```

Output:
```
Synthesizing 3 packages...

✓ backend (5 resources) - 1.2s
✓ staging (5 resources) - 1.1s
✓ production (8 resources) - 1.5s

Total: 18 resources in 3.8s
```

### Verbose Mode

See detailed synthesis steps:

```bash
atakora synth --verbose
```

Output:
```
[INFO] Starting synthesis for package: backend
[DEBUG] Compiling TypeScript files
[DEBUG]   bin/app.ts → dist/bin/app.js
[INFO] Compilation successful
[DEBUG] Executing entry point: dist/bin/app.js
[DEBUG] Creating App construct
[DEBUG]   Creating Stack: backend
[DEBUG]     Creating ResourceGroup: rg-backend-prod-eastus
[DEBUG]     Creating VirtualNetwork: vnet-backend-prod-eastus
[DEBUG]       Resolving resourceGroup reference
[DEBUG]     Creating StorageAccount: stbackendprod
[DEBUG]       Resolving resourceGroup reference
[INFO] Construct tree built (3 resources)
[DEBUG] Running validation
[DEBUG]   Validating ResourceGroup properties
[DEBUG]   Validating VirtualNetwork properties
[DEBUG]   Validating StorageAccount properties
[INFO] Validation passed
[DEBUG] Generating ARM template
[DEBUG]   Serializing resources to JSON
[DEBUG]   Writing template to .atakora/arm.out/backend/template.json
[INFO] Synthesis complete
```

### Custom Output Directory

```bash
atakora synth --output ./build/arm
```

Templates written to `./build/arm/` instead of `.atakora/arm.out/`.

### Skip Validation

Speed up synthesis for testing:

```bash
atakora synth --no-validate
```

**Warning**: Only use during development. Always validate before deployment.

### Parallel Synthesis

Faster multi-package synthesis:

```bash
atakora synth --all --parallel
```

Output:
```
Synthesizing 3 packages in parallel...

✓ backend - 1.2s
✓ staging - 1.1s
✓ production - 1.5s

Total: 18 resources in 1.5s (3.8s saved)
```

### Incremental Builds

Only rebuild changed packages:

```bash
atakora synth --incremental
```

Output:
```
Checking for changes...

⊘ backend - unchanged (cached)
✓ staging - rebuilt (code changed)
⊘ production - unchanged (cached)

1 package synthesized, 2 from cache
```

### Force Rebuild

Ignore cache and rebuild everything:

```bash
atakora synth --force
```

## Output Structure

### Generated Files

Synthesis creates this structure:

```
.atakora/arm.out/
└── backend/
    ├── template.json           # ARM template
    ├── parameters.json         # Default parameters
    ├── manifest.json          # Deployment manifest
    └── metadata.json          # Resource metadata
```

### ARM Template (template.json)

The main deployment template:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {},
  "variables": {},
  "resources": [
    {
      "type": "Microsoft.Resources/resourceGroups",
      "apiVersion": "2021-04-01",
      "name": "rg-backend-prod-eastus",
      "location": "eastus",
      "tags": {
        "environment": "production",
        "managedBy": "atakora",
        "project": "ProductionInfra"
      },
      "properties": {}
    },
    {
      "type": "Microsoft.Network/virtualNetworks",
      "apiVersion": "2023-05-01",
      "name": "vnet-backend-prod-eastus",
      "location": "eastus",
      "dependsOn": [
        "[resourceId('Microsoft.Resources/resourceGroups', 'rg-backend-prod-eastus')]"
      ],
      "tags": {
        "environment": "production",
        "managedBy": "atakora"
      },
      "properties": {
        "addressSpace": {
          "addressPrefixes": ["10.0.0.0/16"]
        }
      }
    }
  ],
  "outputs": {}
}
```

### Parameters File (parameters.json)

Default parameter values:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {}
}
```

### Deployment Manifest (manifest.json)

Metadata about the synthesis:

```json
{
  "packageName": "backend",
  "environment": "production",
  "location": "eastus",
  "resourceCount": 3,
  "synthesisTime": "2025-10-08T12:00:00.000Z",
  "cliVersion": "1.0.0",
  "libVersion": "1.0.0"
}
```

### Resource Metadata (metadata.json)

Additional resource information:

```json
{
  "resources": [
    {
      "logicalId": "ResourceGroup",
      "type": "Microsoft.Resources/resourceGroups",
      "name": "rg-backend-prod-eastus",
      "dependencies": []
    },
    {
      "logicalId": "VNet",
      "type": "Microsoft.Network/virtualNetworks",
      "name": "vnet-backend-prod-eastus",
      "dependencies": ["ResourceGroup"]
    }
  ]
}
```

## Validation

### What Gets Validated

1. **Required Properties**: All required fields provided
2. **Property Types**: Correct types (string, number, boolean, etc.)
3. **Value Constraints**: Within allowed ranges and patterns
4. **References**: All resource references are valid
5. **Dependencies**: No circular dependencies
6. **Naming**: Follows Azure naming rules
7. **Quotas**: Within Azure subscription limits

### Validation Errors

**Missing Required Property**:
```
Validation Error in VirtualNetwork 'VNet':
  Missing required property: addressSpace

Fix: Add addressSpace property:
  new VirtualNetwork(this, 'VNet', {
    resourceGroup: rg,
    addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
  });
```

**Invalid Property Value**:
```
Validation Error in StorageAccount 'Storage':
  Invalid value for 'sku.name': 'Invalid_SKU'
  Allowed values: Standard_LRS, Standard_GRS, Premium_LRS, ...
```

**Unresolved Reference**:
```
Validation Error in Subnet 'WebSubnet':
  Cannot resolve reference to VirtualNetwork 'VNet'
  Ensure the VirtualNetwork construct is created before the Subnet
```

## Exit Codes

| Code | Condition | Next Steps |
|------|-----------|------------|
| 0 | Success | Review output, run `atakora deploy` |
| 1 | General error | Check error message |
| 2 | Validation error | Fix validation issues |
| 3 | Compilation error | Fix TypeScript errors |
| 4 | Execution error | Debug runtime errors |
| 5 | File system error | Check permissions |

## Common Issues

### TypeScript Compilation Errors

**Error**:
```
Error: Cannot find module '@atakora/cdk/network'
```

**Cause**: Missing dependencies.

**Solution**: Install packages:
```bash
npm install
```

### Runtime Errors

**Error**:
```
ReferenceError: process is not defined
```

**Cause**: Using Node.js APIs incorrectly.

**Solution**: Check environment variable usage:
```typescript
// Correct
const tenantId = process.env.AZURE_TENANT_ID || 'default-value';

// Incorrect in browser context
const tenantId = process.env.AZURE_TENANT_ID;
```

### Validation Failures

**Error**:
```
Validation failed with 3 errors
```

**Cause**: Invalid resource configuration.

**Solution**: Fix validation errors or skip validation:
```bash
# Skip validation temporarily
atakora synth --no-validate

# Then fix issues and re-validate
atakora synth
```

### Permission Denied

**Error**:
```
EACCES: permission denied, mkdir '.atakora/arm.out'
```

**Cause**: Insufficient file permissions.

**Solution**: Fix permissions:
```bash
chmod +w .atakora
```

## Performance Optimization

### Parallel Synthesis

Synthesize multiple packages faster:

```bash
atakora synth --all --parallel
```

Speedup: ~3x for 3 packages on typical hardware.

### Incremental Builds

Skip unchanged packages:

```bash
atakora synth --incremental
```

Cache is invalidated when:
- Source files change
- Dependencies update
- Environment variables change

### Disable Validation

For rapid iteration during development:

```bash
export ATAKORA_SKIP_VALIDATION=1
atakora synth
```

**Warning**: Always validate before deployment!

## Integration with Build Tools

### npm scripts

Add to `package.json`:

```json
{
  "scripts": {
    "synth": "atakora synth",
    "synth:all": "atakora synth --all",
    "synth:prod": "atakora synth --package production",
    "synth:verbose": "atakora synth --verbose",
    "build": "npm run synth"
  }
}
```

Usage:
```bash
npm run synth
npm run synth:prod
```

### Watch Mode

Auto-synthesize on file changes:

```bash
# Using nodemon
npm install --save-dev nodemon

# Add to package.json
{
  "scripts": {
    "watch": "nodemon --watch packages --ext ts --exec 'atakora synth'"
  }
}

# Run
npm run watch
```

### CI/CD Pipelines

**GitHub Actions**:

```yaml
- name: Synthesize ARM templates
  run: |
    atakora synth --all --no-validate

- name: Upload templates
  uses: actions/upload-artifact@v2
  with:
    name: arm-templates
    path: .atakora/arm.out/
```

**Azure DevOps**:

```yaml
- script: |
    atakora synth --all --quiet
  displayName: 'Synthesize ARM templates'

- task: PublishBuildArtifacts@1
  inputs:
    pathToPublish: '.atakora/arm.out'
    artifactName: 'arm-templates'
```

## Best Practices

### Always Validate Before Deploy

```bash
# Development
atakora synth --no-validate  # Fast iteration

# Before deployment
atakora synth                 # Full validation
atakora deploy
```

### Use Verbose Mode for Debugging

```bash
atakora synth --verbose > synthesis.log 2>&1
```

Review log to understand synthesis issues.

### Version Control Output

Add to `.gitignore`:
```gitignore
.atakora/arm.out/
.atakora/cache/
```

Don't commit generated templates - synthesize in CI/CD.

### Review Generated Templates

Before deploying, inspect templates:

```bash
atakora synth
code .atakora/arm.out/production/template.json
```

Verify:
- Resource names follow conventions
- Dependencies are correct
- Properties match expectations

## See Also

- [`atakora deploy`](./deploy.md) - Deploy templates to Azure
- [`atakora diff`](./diff.md) - Compare with deployed resources
- [Synthesis Guide](../../guides/fundamentals/synthesis.md)
- [Validation Architecture](../../guides/validation/overview.md)
- [Debugging Synthesis](../../troubleshooting/debugging-synthesis.md)

---

**Last Updated**: 2025-10-08
**CLI Version**: 1.0.0+
