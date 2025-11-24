# Configuration Reference

Complete reference documentation for Atakora configuration settings, authentication, and system behavior.

## Overview

This section documents all configuration options for Atakora projects, including authentication setup, error handling, and naming conventions for Azure resources.

## Configuration Files

### Authentication
- **[Authentication](./Authentication.md)** - Azure authentication configuration
  - Service principal setup
  - Environment variables
  - Credential management
  - Multi-tenant support

### Error Handling
- **[Error Codes](./Error-Codes.md)** - Complete error code reference
  - CLI error codes
  - Synthesis errors
  - Deployment failures
  - Validation errors

### Conventions
- **[Naming Conventions](./Naming-Conventions.md)** - Azure resource naming rules
  - Resource type prefixes
  - Environment suffixes
  - Character limits
  - Special character rules

## Quick Reference

### Authentication Setup

```bash
# Service Principal
export AZURE_TENANT_ID="00000000-0000-0000-0000-000000000000"
export AZURE_CLIENT_ID="11111111-1111-1111-1111-111111111111"
export AZURE_CLIENT_SECRET="secret-value"
export AZURE_SUBSCRIPTION_ID="22222222-2222-2222-2222-222222222222"

# Or use CLI config
atakora config set-credentials
```

### Common Error Codes

| Code | Category | Description |
|------|----------|-------------|
| 1xxx | CLI | Command line interface errors |
| 2xxx | Synthesis | Template generation errors |
| 3xxx | Validation | Schema and input validation |
| 4xxx | Deployment | Azure deployment failures |
| 5xxx | Authentication | Credential and access errors |

### Naming Convention Examples

| Resource Type | Pattern | Example |
|--------------|---------|---------|
| Resource Group | `rg-{app}-{env}-{region}` | `rg-myapp-prod-eastus` |
| Storage Account | `st{app}{env}` | `stmyappprod` |
| Function App | `func-{app}-{env}-{region}` | `func-myapp-prod-eastus` |
| Key Vault | `kv-{app}-{env}` | `kv-myapp-prod` |

## Environment Variables

### Build Configuration

```bash
# Output directory (default: .atakora/arm.out)
export ATAKORA_OUTPUT_DIR=./build

# Skip validation during synthesis
export ATAKORA_SKIP_VALIDATION=1

# Log level (debug, info, warn, error)
export ATAKORA_LOG_LEVEL=debug
```

### CLI Behavior

```bash
# Disable color output
export NO_COLOR=1

# Force color output (even in non-TTY)
export FORCE_COLOR=1

# Non-interactive mode
export ATAKORA_NON_INTERACTIVE=1
```

## Configuration Files

### Project Manifest (.atakora/manifest.json)

```json
{
  "organization": "MyOrg",
  "project": "MyApp",
  "version": "1.0.0",
  "packages": [
    {
      "name": "production",
      "path": "./packages/production",
      "entry": "./bin/app.ts",
      "environment": "production"
    }
  ]
}
```

### Authentication Config (.atakora/config.json)

```json
{
  "currentProfile": "production",
  "profiles": {
    "production": {
      "tenantId": "xxx",
      "clientId": "xxx",
      "clientSecret": "xxx",
      "subscriptionId": "xxx"
    }
  }
}
```

## Best Practices

1. **Use Environment Variables**: Never commit secrets to source control
2. **Follow Naming Conventions**: Consistent naming makes resources easier to manage
3. **Handle Errors Gracefully**: Use error codes to provide meaningful feedback
4. **Secure Authentication**: Use managed identities in production

## Related Documentation

- [CLI Reference](../cli/README.md) - CLI command documentation
- [Getting Started](../../getting-started/README.md) - Initial setup guide
- [Troubleshooting](../../troubleshooting/Common-Issues.md) - Common problems and solutions