# Manifest Schema Reference

[Home](../README.md) > [Reference](./README.md) > Manifest Schema

## Overview

The Atakora manifest is a JSON configuration file that defines your project structure, package organization, and synthesis settings. It's the central configuration that tracks all packages in your workspace and controls how infrastructure code is synthesized.

## File Location

`.atakora/manifest.json` (at workspace root)

The manifest is automatically created by `atakora init` and updated by package management commands.

## Purpose

The manifest serves several critical functions:

1. **Project Identity** - Stores organization and project names used throughout infrastructure
2. **Package Registry** - Tracks all infrastructure packages in the workspace
3. **Synthesis Configuration** - Defines where ARM templates are generated
4. **Default Package** - Specifies which package to synthesize when no package is specified
5. **Metadata Tracking** - Records creation and update timestamps

## Schema Definition

### TypeScript Interface

```typescript
interface Manifest {
  version: string;
  organization: string;
  project: string;
  defaultPackage?: string;
  packages: PackageConfig[];
  outputDirectory?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

interface PackageConfig {
  name: string;
  path: string;
  entryPoint?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
}
```

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "organization", "project", "packages", "createdAt", "updatedAt"],
  "properties": {
    "version": { "type": "string" },
    "organization": { "type": "string" },
    "project": { "type": "string" },
    "defaultPackage": { "type": "string" },
    "packages": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "path"],
        "properties": {
          "name": { "type": "string" },
          "path": { "type": "string" },
          "entryPoint": { "type": "string" },
          "enabled": { "type": "boolean" },
          "metadata": { "type": "object" }
        }
      }
    },
    "outputDirectory": { "type": "string" },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" },
    "metadata": { "type": "object" }
  }
}
```

## Example Manifest

### Single Package Project

```json
{
  "version": "1.0.0",
  "organization": "Contoso",
  "project": "ProductionInfra",
  "defaultPackage": "backend",
  "packages": [
    {
      "name": "backend",
      "path": "packages/backend",
      "entryPoint": "bin/app.ts",
      "enabled": true
    }
  ],
  "outputDirectory": ".atakora/arm.out",
  "createdAt": "2025-10-08T12:30:00.000Z",
  "updatedAt": "2025-10-08T12:30:00.000Z"
}
```

### Multi-Package Project

```json
{
  "version": "1.0.0",
  "organization": "Contoso",
  "project": "ECommerce",
  "defaultPackage": "backend",
  "packages": [
    {
      "name": "networking",
      "path": "packages/networking",
      "entryPoint": "bin/app.ts",
      "enabled": true
    },
    {
      "name": "backend",
      "path": "packages/backend",
      "entryPoint": "bin/app.ts",
      "enabled": true
    },
    {
      "name": "frontend",
      "path": "packages/frontend",
      "entryPoint": "bin/app.ts",
      "enabled": true
    }
  ],
  "outputDirectory": ".atakora/arm.out",
  "createdAt": "2025-10-08T10:00:00.000Z",
  "updatedAt": "2025-10-08T14:45:00.000Z"
}
```

## Field Reference

### version

**Type:** `string`
**Required:** Yes
**Example:** `"1.0.0"`

The manifest schema version. This allows Atakora to handle manifest format changes in future releases.

**Current version:** `1.0.0`

### organization

**Type:** `string`
**Required:** Yes
**Example:** `"Contoso"`, `"Digital Minion"`

Your organization name. Used in:

- Generated infrastructure code
- Resource naming conventions
- ARM template metadata
- Documentation and comments

### project

**Type:** `string`
**Required:** Yes
**Example:** `"ProductionInfra"`, `"ECommerce"`

Your project name. Used in:

- Resource naming conventions
- ARM template naming
- Generated documentation
- Workspace identification

### defaultPackage

**Type:** `string`
**Required:** No
**Default:** First package in the `packages` array
**Example:** `"backend"`

The package name to synthesize when no `--package` flag is provided to `atakora synth`.

**Rules:**

- Must match a `name` in the `packages` array
- Set with `atakora set-default <package-name>`
- Set during `atakora init` to the first package name
- Can be changed at any time

### packages

**Type:** `PackageConfig[]`
**Required:** Yes
**Minimum items:** 1

Array of package configurations. Each package represents an independent infrastructure module.

See [PackageConfig Schema](#packageconfig-schema) for details.

### outputDirectory

**Type:** `string`
**Required:** No
**Default:** `".atakora/arm.out"`
**Example:** `".atakora/arm.out"`, `"dist/templates"`

Directory where ARM templates are synthesized. The directory structure is:

```
{outputDirectory}/
├── {package1-name}/
│   ├── {Stack1}.json
│   ├── {Stack2}.json
│   └── manifest.json
└── {package2-name}/
    ├── {Stack1}.json
    └── manifest.json
```

### createdAt

**Type:** `string` (ISO 8601 timestamp)
**Required:** Yes
**Example:** `"2025-10-08T12:30:00.000Z"`

Timestamp when the manifest was first created by `atakora init`.

### updatedAt

**Type:** `string` (ISO 8601 timestamp)
**Required:** Yes
**Example:** `"2025-10-08T14:45:00.000Z"`

Timestamp of the last manifest modification. Updated automatically by:

- `atakora add` - Adding packages
- `atakora set-default` - Changing default package
- Manual edits to the manifest

### metadata

**Type:** `Record<string, unknown>`
**Required:** No
**Example:** `{ "team": "platform", "repo": "github.com/contoso/infra" }`

Custom project-level metadata. Use this to store additional information about your project:

- Team ownership
- Repository URL
- Compliance requirements
- Custom tooling configuration

## PackageConfig Schema

### name

**Type:** `string`
**Required:** Yes
**Example:** `"backend"`, `"frontend"`, `"networking"`

The package name. Must be:

- Unique within the manifest
- A valid directory name
- Lowercase with hyphens (recommended)
- Descriptive of the package purpose

### path

**Type:** `string`
**Required:** Yes
**Example:** `"packages/backend"`, `"infra/networking"`

Relative path from workspace root to the package directory.

**Convention:** `packages/{package-name}`

The directory must contain:

- `bin/app.ts` (or custom entry point)
- `package.json`
- `tsconfig.json`

### entryPoint

**Type:** `string`
**Required:** No
**Default:** `"bin/app.ts"`
**Example:** `"bin/app.ts"`, `"src/main.ts"`

The entry point file relative to the package `path`. This file is executed during synthesis.

**Requirements:**

- Must be a TypeScript file (`.ts`)
- Must call `app.synth()` to generate ARM templates
- Path is relative to package directory

### enabled

**Type:** `boolean`
**Required:** No
**Default:** `true`
**Example:** `true`, `false`

Whether the package is enabled for synthesis.

**When disabled:**

- `atakora synth --all` skips the package
- `atakora synth --package <name>` still works (explicit override)
- Package is still listed in the manifest

**Use cases:**

- Temporarily disable a package during development
- Deprecate a package without removing it
- Control which packages synthesize in CI/CD

### metadata

**Type:** `Record<string, unknown>`
**Required:** No
**Example:** `{ "owner": "backend-team", "environment": "prod" }`

Custom package-level metadata. Use for:

- Team ownership
- Environment classification
- Deployment configuration
- Custom tooling needs

## Managing the Manifest

### CLI Commands

The manifest is managed through CLI commands:

```bash
# Create manifest (first time setup)
atakora init

# Add a new package
atakora add <package-name>

# Set default package
atakora set-default <package-name>

# View manifest
cat .atakora/manifest.json
```

### Manual Editing

While CLI commands are recommended, you can manually edit the manifest:

1. **Edit `.atakora/manifest.json`** with your changes
2. **Validate the JSON** syntax
3. **Verify package paths** exist
4. **Test synthesis** to ensure changes work

**⚠️ Warning:** Manual edits can break the manifest if invalid. Always backup before editing.

### Version Control

**Include in git:**

```gitignore
# Recommended .gitignore
.atakora/arm.out/
!.atakora/manifest.json
```

The manifest should be committed to version control because it:

- Defines project structure
- Is required for synthesis
- Changes when packages are added/removed
- Should be shared across the team

**Don't commit:**

- `.atakora/arm.out/` - Generated ARM templates

## Validation

The manifest is validated when:

- Reading during synthesis
- Writing after modifications
- Running any CLI command that uses the manifest

### Validation Rules

1. **Required fields** must be present
2. **Package names** must be unique
3. **Package paths** must exist on disk
4. **Default package** must exist in packages array
5. **Entry points** must exist in package directories
6. **Timestamps** must be valid ISO 8601 format

### Validation Errors

Common validation errors and fixes:

**Error:** `Manifest not found`
**Fix:** Run `atakora init` to create the manifest

**Error:** `Invalid JSON in manifest file`
**Fix:** Check for syntax errors in the JSON (missing commas, quotes, brackets)

**Error:** `Package 'frontend' not found in manifest`
**Fix:** Run `atakora add frontend` or verify the package name is correct

**Error:** `Default package 'backend' does not exist`
**Fix:** Run `atakora set-default <existing-package>` with a valid package name

## Migration

### Upgrading Manifest Version

When Atakora releases a new manifest schema version, migration may be required.

**Future versions** (1.1.0, 2.0.0) will include:

- Automatic migration tools
- Backward compatibility where possible
- Clear migration guides

**Current version** (1.0.0) is the initial release.

### Converting from Other Tools

If migrating from other IaC tools:

1. **Create new Atakora project:**

   ```bash
   atakora init
   ```

2. **Add packages** matching your existing structure:

   ```bash
   atakora add networking
   atakora add applications
   ```

3. **Migrate infrastructure code** to TypeScript in each package's `bin/app.ts`

4. **Update manifest** if you need custom paths or entry points

## Advanced Configuration

### Custom Output Directory

Change where ARM templates are generated:

```json
{
  "outputDirectory": "dist/arm-templates"
}
```

This affects all packages. Templates will be at:

```
dist/arm-templates/
├── backend/
└── frontend/
```

### Custom Entry Points

Use different entry points per package:

```json
{
  "packages": [
    {
      "name": "legacy",
      "path": "packages/legacy",
      "entryPoint": "src/main.ts"
    },
    {
      "name": "modern",
      "path": "packages/modern",
      "entryPoint": "bin/app.ts"
    }
  ]
}
```

### Conditional Package Enablement

Disable packages based on environment:

```json
{
  "packages": [
    {
      "name": "dev-tools",
      "path": "packages/dev-tools",
      "enabled": false,
      "metadata": {
        "note": "Enable manually for development"
      }
    }
  ]
}
```

## Best Practices

1. **Use CLI commands** instead of manual edits when possible
2. **Commit the manifest** to version control
3. **Document package purpose** in metadata
4. **Keep package names descriptive** and consistent
5. **Regular updates** - Run `atakora add` instead of manual package edits
6. **Validate after edits** - Run `atakora synth --all` to ensure manifest is valid

## Troubleshooting

### Manifest Corruption

If the manifest is corrupted or invalid:

1. **Restore from git:**

   ```bash
   git checkout .atakora/manifest.json
   ```

2. **Recreate from scratch** (last resort):

   ```bash
   # Backup your packages
   mv packages packages-backup

   # Reinitialize
   atakora init

   # Re-add packages
   atakora add package1
   atakora add package2

   # Restore package code
   cp -r packages-backup/package1/bin packages/package1/
   ```

### Package Synchronization

If packages exist in `packages/` but not in the manifest:

```bash
# Add missing packages
atakora add existing-package-name
```

If packages exist in manifest but not on disk:

1. Remove from manifest manually, or
2. Create the package directory structure

## See Also

- **[Getting Started Guide](../guides/getting-started.md)** - Initialize your first project
- **[Multi-Package Projects](../guides/multi-package-projects.md)** - Organize infrastructure with multiple packages
- **[CLI Commands Reference](./cli-commands.md)** - Complete command documentation
