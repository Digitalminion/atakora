# atakora set-default

**Navigation**: [Docs Home](../../README.md) > [Reference](../README.md) > [CLI Reference](./README.md) > set-default

---

## Synopsis

```bash
atakora set-default <package-name>
```

## Description

Sets the default package for CLI commands. When a default package is set, you can run `synth`, `deploy`, `diff`, and other commands without specifying `--package` each time.

This command updates the `defaultPackage` field in `.atakora/manifest.json`.

## Arguments

### `<package-name>`

Name of the package to set as default.

- **Required**: yes
- **Type**: string
- **Example**: `production`

Must be an existing package in the workspace.

## Examples

### Set Default Package

```bash
atakora set-default production
```

Output:
```
✓ Default package set to 'production'

Now you can run commands without --package:
  atakora synth
  atakora deploy
  atakora diff
```

### After Setting Default

Run commands without specifying package:

```bash
# Before setting default
atakora synth --package production
atakora deploy --package production
atakora diff --package production

# After setting default
atakora synth
atakora deploy
atakora diff
```

### Override Default

Temporarily use different package:

```bash
# Default is 'production'
atakora set-default production

# Override for single command
atakora synth --package staging
atakora deploy --package dev

# Back to default
atakora synth  # Uses 'production'
```

## Use Cases

### Development Workflow

Set active environment as default:

```bash
# Working on development
atakora set-default dev
atakora synth
atakora deploy

# Switch to staging
atakora set-default staging
atakora synth
atakora deploy
```

### Production Focus

Set production as default, override for others:

```bash
# Production is default
atakora set-default production

# Most commands target production
atakora diff
atakora deploy

# Occasionally deploy to staging
atakora deploy --package staging
```

### Multi-Region Deployment

Set primary region as default:

```bash
# US East is primary
atakora set-default prod-eastus

# Deploy to primary
atakora deploy

# Deploy to secondary
atakora deploy --package prod-westus
```

## Manifest Update

### Before

```json
{
  "organization": "Digital Minion",
  "project": "ProductionInfra",
  "packages": [
    {
      "name": "dev",
      "path": "./packages/dev"
    },
    {
      "name": "production",
      "path": "./packages/production"
    }
  ]
}
```

### After Setting Default

```json
{
  "organization": "Digital Minion",
  "project": "ProductionInfra",
  "packages": [
    {
      "name": "dev",
      "path": "./packages/dev"
    },
    {
      "name": "production",
      "path": "./packages/production"
    }
  ],
  "defaultPackage": "production"
}
```

## Checking Current Default

### Using manifest

```bash
cat .atakora/manifest.json | grep defaultPackage
```

Output:
```
"defaultPackage": "production"
```

### Using synth (shows which package is targeted)

```bash
atakora synth
```

Output:
```
Synthesizing package: production
...
```

### Using custom script

```bash
# check-default.sh
#!/bin/bash
DEFAULT=$(cat .atakora/manifest.json | jq -r '.defaultPackage // "none"')
echo "Default package: $DEFAULT"
```

## Clearing Default

To remove default (require explicit `--package` for all commands):

```bash
# Edit manifest manually
cat .atakora/manifest.json | jq 'del(.defaultPackage)' > .atakora/manifest.json.tmp
mv .atakora/manifest.json.tmp .atakora/manifest.json
```

Or:

```json
{
  "organization": "Digital Minion",
  "project": "ProductionInfra",
  "packages": [...],
  "defaultPackage": null
}
```

## Exit Codes

| Code | Condition | Solution |
|------|-----------|----------|
| 0 | Success | Default package set |
| 1 | Package not found | Check package name |
| 2 | Not in Atakora project | Run `atakora init` |
| 3 | Invalid package name | Use valid package name |

## Common Issues

### Package Not Found

**Error**:
```
Package 'production' not found in workspace

Available packages:
  - dev
  - staging
```

**Cause**: Specified package doesn't exist.

**Solution**: Use existing package or create it:
```bash
# List packages
atakora config get packages
# or
cat .atakora/manifest.json | jq '.packages[].name'

# Create package if needed
atakora add production

# Set as default
atakora set-default production
```

### Not in Atakora Project

**Error**:
```
Not in an Atakora project
Run 'atakora init' to create a new project
```

**Cause**: No `.atakora/manifest.json` found.

**Solution**: Initialize project:
```bash
atakora init
```

### Typo in Package Name

**Error**:
```
Package 'produciton' not found (did you mean 'production'?)
```

**Cause**: Typo in package name.

**Solution**: Use correct spelling:
```bash
atakora set-default production
```

## Best Practices

### Set Default Early

After initializing project:

```bash
atakora init --package dev
atakora set-default dev  # Set immediately
```

### Match Development Focus

Set default to what you work on most:

```bash
# Developer working on dev environment
atakora set-default dev

# DevOps engineer managing production
atakora set-default production
```

### Update as Workflow Changes

Change default as needed:

```bash
# Feature development phase
atakora set-default dev

# Testing phase
atakora set-default staging

# Release phase
atakora set-default production
```

### Document in README

Let team know the convention:

```markdown
## Default Package

The default package is set to `dev` for local development.

To deploy to production:
```bash
atakora deploy --package production
```

To change default:
```bash
atakora set-default <package-name>
```
```

### Use in Scripts

Make scripts environment-aware:

```bash
#!/bin/bash
# deploy-current.sh

# Uses whatever default is set
atakora synth
atakora diff
atakora deploy

echo "Deployed to default package"
```

```bash
#!/bin/bash
# deploy-specific.sh

PACKAGE=${1:-production}

atakora synth --package $PACKAGE
atakora diff --package $PACKAGE
atakora deploy --package $PACKAGE

echo "Deployed to $PACKAGE"
```

## Integration Examples

### npm Scripts

```json
{
  "scripts": {
    "dev": "atakora set-default dev && atakora synth",
    "staging": "atakora set-default staging && atakora synth",
    "prod": "atakora set-default production && atakora synth",
    "deploy": "atakora deploy",
    "deploy:dev": "atakora deploy --package dev",
    "deploy:staging": "atakora deploy --package staging",
    "deploy:prod": "atakora deploy --package production"
  }
}
```

Usage:
```bash
npm run dev     # Sets default to dev and synthesizes
npm run deploy  # Deploys to default package

npm run deploy:prod  # Deploys to production specifically
```

### Make Targets

```makefile
.PHONY: default dev staging production deploy

dev:
	@atakora set-default dev
	@atakora synth

staging:
	@atakora set-default staging
	@atakora synth

production:
	@atakora set-default production
	@atakora synth

deploy:
	@atakora deploy

deploy-dev:
	@atakora deploy --package dev

deploy-staging:
	@atakora deploy --package staging

deploy-production:
	@atakora deploy --package production
```

Usage:
```bash
make dev       # Set default to dev
make deploy    # Deploy to current default

make deploy-production  # Deploy to production specifically
```

### Task Runner

Using task runner like `just`:

```just
# Set default package and synthesize
default package:
    atakora set-default {{package}}
    atakora synth

# Deploy to default
deploy:
    atakora deploy

# Deploy to specific package
deploy-to package:
    atakora deploy --package {{package}}
```

Usage:
```bash
just default dev      # Set default to dev
just deploy           # Deploy to default

just deploy-to production  # Deploy to production
```

## Advanced Usage

### Environment-Based Default

Set default based on environment variable:

```bash
#!/bin/bash
# set-env-default.sh

ENV=${DEPLOY_ENV:-dev}

atakora set-default $ENV
echo "Default package set to $ENV"
```

Usage:
```bash
export DEPLOY_ENV=staging
./set-env-default.sh
atakora deploy  # Deploys to staging
```

### Git Branch-Based Default

Set default based on current branch:

```bash
#!/bin/bash
# set-branch-default.sh

BRANCH=$(git branch --show-current)

case $BRANCH in
  main|master)
    PACKAGE="production"
    ;;
  staging)
    PACKAGE="staging"
    ;;
  *)
    PACKAGE="dev"
    ;;
esac

atakora set-default $PACKAGE
echo "Default package set to $PACKAGE (branch: $BRANCH)"
```

Add to `.git/hooks/post-checkout`:
```bash
#!/bin/bash
./scripts/set-branch-default.sh
```

### Project-Wide Configuration

Store team conventions:

```bash
# .atakorarc
DEFAULT_PACKAGE=dev
PRODUCTION_PACKAGE=production
STAGING_PACKAGE=staging
```

```bash
#!/bin/bash
# setup-defaults.sh

source .atakorarc
atakora set-default $DEFAULT_PACKAGE
```

## Comparison with --package Flag

### Using Default

**Pros**:
- Shorter commands
- Less typing
- Clearer intent

**Cons**:
- Need to remember current default
- Can deploy to wrong environment if forgotten

**Best for**: Single-environment development workflow

### Using --package Flag

**Pros**:
- Explicit about target
- No ambiguity
- Safer for production

**Cons**:
- More verbose
- Repetitive typing

**Best for**: Multi-environment workflows, production deployments

### Recommendation

**Local development**: Use default
```bash
atakora set-default dev
atakora synth
atakora deploy
```

**Production deployments**: Use explicit package
```bash
atakora deploy --package production  # Clear and safe
```

**CI/CD**: Always use explicit package
```bash
atakora deploy --package $ENVIRONMENT --no-confirm
```

## See Also

- [`atakora init`](./init.md) - Initialize project
- [`atakora add`](./add.md) - Add packages
- [`atakora synth`](./synth.md) - Synthesize (uses default)
- [`atakora deploy`](./deploy.md) - Deploy (uses default)
- [Organizing Projects](../../guides/workflows/organizing-projects.md)

---

**Last Updated**: 2025-10-08
**CLI Version**: 1.0.0+
