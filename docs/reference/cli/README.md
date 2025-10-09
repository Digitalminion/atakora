# CLI Reference

**Navigation**: [Docs Home](../../README.md) > [Reference](../README.md) > CLI Reference

---

## Overview

The Atakora CLI provides commands for managing infrastructure-as-code projects. This reference documents all commands, options, and usage patterns.

## Quick Reference

| Command | Purpose | Common Use Case |
|---------|---------|-----------------|
| [`init`](./init.md) | Initialize new project | Start a new infrastructure project |
| [`add`](./add.md) | Add package to workspace | Create environment-specific stacks |
| [`synth`](./synth.md) | Synthesize ARM templates | Generate deployment templates |
| [`deploy`](./deploy.md) | Deploy to Azure | Push infrastructure changes |
| [`diff`](./diff.md) | Show template changes | Preview deployment impact |
| [`config`](./config.md) | Manage authentication | Configure Azure credentials |
| [`set-default`](./set-default.md) | Set default package | Switch active workspace |

## Installation

Install the CLI globally:

```bash
npm install -g @atakora/cli

# Verify installation
atakora --version
```

Or use within a project:

```bash
npm install --save-dev @atakora/cli

# Run via npx
npx atakora --version
```

## Command Structure

All commands follow this pattern:

```bash
atakora <command> [options] [arguments]
```

### Global Options

These options work with all commands:

```bash
--help, -h          Show command help
--version, -v       Show CLI version
--verbose           Show detailed output
--silent            Suppress non-error output
--no-color          Disable colored output
```

### Examples

```bash
# Show help for a specific command
atakora init --help

# Run with verbose logging
atakora synth --verbose

# Suppress output (useful in CI/CD)
atakora deploy --silent
```

## Common Workflows

### Starting a New Project

```bash
# Initialize project
atakora init

# Add production package
atakora add production

# Synthesize templates
atakora synth

# Deploy to Azure
atakora deploy
```

### Multi-Environment Setup

```bash
# Create project with dev environment
atakora init --package dev

# Add staging and production
atakora add staging
atakora add production

# Set default for development
atakora set-default dev

# Deploy specific environment
atakora deploy --package production
```

### CI/CD Integration

```bash
# Non-interactive initialization
atakora init --non-interactive --org "MyOrg" --project "MyApp"

# Synthesize without prompts
atakora synth --package production

# Preview changes
atakora diff --package production

# Deploy with minimal output
atakora deploy --package production --silent
```

## Configuration Files

### Manifest (.atakora/manifest.json)

The manifest tracks all packages in your workspace:

```json
{
  "organization": "Digital Minion",
  "project": "ProductionInfra",
  "version": "1.0.0",
  "packages": [
    {
      "name": "backend",
      "path": "./packages/backend",
      "entry": "./bin/app.ts",
      "environment": "production"
    }
  ]
}
```

See [Manifest Schema Reference](../manifest-schema.md) for complete documentation.

### Config (.atakora/config.json)

Authentication configuration for Azure:

```json
{
  "currentProfile": "production",
  "profiles": {
    "production": {
      "tenantId": "00000000-0000-0000-0000-000000000000",
      "clientId": "11111111-1111-1111-1111-111111111111",
      "clientSecret": "secret-value",
      "subscriptionId": "22222222-2222-2222-2222-222222222222"
    }
  }
}
```

See [`config` command](./config.md) for setup instructions.

## Environment Variables

### Authentication

```bash
# Azure Service Principal
export AZURE_TENANT_ID="00000000-0000-0000-0000-000000000000"
export AZURE_CLIENT_ID="11111111-1111-1111-1111-111111111111"
export AZURE_CLIENT_SECRET="secret-value"
export AZURE_SUBSCRIPTION_ID="22222222-2222-2222-2222-222222222222"

# Azure CLI authentication (alternative)
az login
```

### CLI Behavior

```bash
# Disable color output
export NO_COLOR=1

# Force color output (even in non-TTY)
export FORCE_COLOR=1

# Set log level
export ATAKORA_LOG_LEVEL=debug
```

### Build Configuration

```bash
# Output directory (default: .atakora/arm.out)
export ATAKORA_OUTPUT_DIR=./build

# Skip validation during synthesis
export ATAKORA_SKIP_VALIDATION=1
```

## Exit Codes

The CLI uses standard exit codes:

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 0 | Success | Command completed successfully |
| 1 | General Error | Invalid options, file not found, etc. |
| 2 | Validation Error | Schema validation failure, invalid config |
| 3 | Synthesis Error | TypeScript errors, missing dependencies |
| 4 | Deployment Error | Azure API errors, authentication failure |
| 5 | Conflict | Resource already exists, concurrent changes |

Example handling in scripts:

```bash
#!/bin/bash

atakora synth
exit_code=$?

if [ $exit_code -eq 0 ]; then
  echo "Synthesis successful"
elif [ $exit_code -eq 3 ]; then
  echo "Synthesis failed - check TypeScript errors"
  exit 1
else
  echo "Unexpected error (code: $exit_code)"
  exit $exit_code
fi
```

## Shell Completion

### Bash Completion

```bash
# Add to ~/.bashrc
eval "$(atakora completion bash)"

# Or generate completion script
atakora completion bash > /etc/bash_completion.d/atakora
```

### Zsh Completion

```bash
# Add to ~/.zshrc
eval "$(atakora completion zsh)"

# Or generate completion script
atakora completion zsh > /usr/local/share/zsh/site-functions/_atakora
```

### Fish Completion

```bash
# Generate completion script
atakora completion fish > ~/.config/fish/completions/atakora.fish
```

## Debugging

### Verbose Mode

Enable detailed logging:

```bash
atakora synth --verbose
```

Output includes:
- File system operations
- Template synthesis steps
- Validation results
- ARM template generation

### Debug Mode

Maximum verbosity for troubleshooting:

```bash
export ATAKORA_LOG_LEVEL=debug
atakora synth
```

Additional output:
- Internal function calls
- Constructor invocations
- Property resolutions
- Reference chains

### Dry Run

Preview operations without making changes:

```bash
# Preview what init would create
atakora init --dry-run

# See what would be deployed
atakora deploy --dry-run
```

## Version Compatibility

### CLI vs Library Versions

| CLI Version | Compatible Library Versions | Notes |
|-------------|----------------------------|-------|
| 1.0.x | 1.0.x | Full feature support |
| 1.1.x | 1.0.x - 1.1.x | Backward compatible |
| 2.0.x | 2.0.x | Breaking changes |

### Check Versions

```bash
# CLI version
atakora --version

# Library version in project
npm list @atakora/lib @atakora/cdk
```

### Upgrade Guide

```bash
# Upgrade CLI globally
npm update -g @atakora/cli

# Upgrade libraries in project
npm update @atakora/lib @atakora/cdk

# Check for breaking changes
atakora doctor
```

## Performance Tips

### Faster Synthesis

```bash
# Skip validation for faster builds
export ATAKORA_SKIP_VALIDATION=1
atakora synth

# Use incremental builds
atakora synth --incremental

# Parallel package synthesis
atakora synth --parallel
```

### Reduced Output

```bash
# Minimal output
atakora synth --quiet

# No color codes (faster in CI)
atakora synth --no-color

# Silent mode (errors only)
atakora deploy --silent
```

### Cache Management

```bash
# Clear synthesis cache
rm -rf .atakora/cache

# Clear ARM template output
rm -rf .atakora/arm.out

# Full clean
atakora clean
```

## Common Issues

### Command Not Found

**Problem**: `atakora: command not found`

**Solution**: Install CLI globally or use npx:
```bash
npm install -g @atakora/cli
# or
npx @atakora/cli init
```

### Permission Denied

**Problem**: `EACCES: permission denied`

**Solution**: Use npm with proper permissions:
```bash
# Fix npm permissions (Unix)
sudo chown -R $(whoami) ~/.npm

# Or use npx
npx atakora init
```

### Module Not Found

**Problem**: `Cannot find module '@atakora/lib'`

**Solution**: Install dependencies:
```bash
npm install
```

### Authentication Failures

**Problem**: `Authentication failed` or `401 Unauthorized`

**Solution**: Configure Azure credentials:
```bash
atakora config set-credentials
# or
az login
```

See [Troubleshooting Guide](../../troubleshooting/common-issues.md) for more solutions.

## Command Reference

Detailed documentation for each command:

- **[`init`](./init.md)** - Initialize a new Atakora project
- **[`add`](./add.md)** - Add a package to the workspace
- **[`synth`](./synth.md)** - Synthesize ARM templates from code
- **[`deploy`](./deploy.md)** - Deploy infrastructure to Azure
- **[`diff`](./diff.md)** - Show differences between local and deployed
- **[`config`](./config.md)** - Manage authentication configuration
- **[`set-default`](./set-default.md)** - Set the default active package

## See Also

- [Getting Started Guide](../../getting-started/README.md)
- [Error Code Reference](../error-codes.md)
- [Manifest Schema](../manifest-schema.md)
- [Troubleshooting](../../troubleshooting/common-issues.md)

---

**Last Updated**: 2025-10-08
**CLI Version**: 1.0.0+
