# CLI Commands Reference

## Overview

The Atakora CLI provides commands for initializing projects, managing packages, synthesizing ARM templates, and deploying infrastructure to Azure.

## Installation

Install the CLI globally:

```bash
npm install -g @atakora/cli
```

Or use with npx (no installation required):

```bash
npx @atakora/cli <command>
```

## Command Index

- [init](#init) - Initialize a new Atakora project
- [add](#add) - Add a new package to the project
- [set-default](#set-default) - Set the default package
- [synth](#synth) - Synthesize ARM templates
- [deploy](#deploy) - Deploy infrastructure to Azure
- [diff](#diff) - Show infrastructure changes
- [config](#config) - Manage Azure configuration

---

## init

Initialize a new Atakora project with workspace structure, manifest, and first package.

### Usage

```bash
atakora init [options]
```

### Interactive Mode (Default)

Running `atakora init` without options starts an interactive setup:

```bash
atakora init
```

**Prompts:**

1. **Organization name** - Your organization or team name
2. **Project name** - The infrastructure project name
3. **First package name** - Name of the initial infrastructure package

**Example interaction:**

```
? Organization name: Contoso
? Project name: ProductionInfra
? First package name: networking
```

### Non-Interactive Mode

Use command-line options to skip prompts:

```bash
atakora init --org "Contoso" --project "ProductionInfra" --package "networking" --non-interactive
```

### Options

| Option                 | Description                   | Default          |
| ---------------------- | ----------------------------- | ---------------- |
| `--org <organization>` | Organization name             | "Digital Minion" |
| `--project <project>`  | Project name                  | "Atakora"        |
| `--package <package>`  | First package name            | "backend"        |
| `--non-interactive`    | Skip prompts and use defaults | false            |

### What Gets Created

The `init` command generates:

```
ProjectName/
├── .atakora/
│   ├── manifest.json         # Project configuration
│   └── arm.out/              # ARM template output directory
├── packages/
│   └── {package-name}/
│       ├── bin/
│       │   └── app.ts       # Infrastructure entry point
│       ├── package.json     # Package dependencies
│       └── tsconfig.json    # TypeScript config
├── package.json             # Root workspace config
├── tsconfig.json            # Root TypeScript config
├── .gitignore               # Git ignore rules
└── README.md                # Project documentation
```

### Generated Scripts

The root `package.json` includes these scripts:

```json
{
  "scripts": {
    "build": "tsc --build",
    "build:clean": "tsc --build --clean",
    "synth": "atakora synth",
    "deploy": "atakora deploy",
    "diff": "atakora diff",
    "clean": "npm run clean --workspaces --if-present",
    "test": "npm run test --workspaces --if-present"
  }
}
```

### Examples

**Initialize with defaults:**

```bash
atakora init --non-interactive
```

**Initialize with custom values:**

```bash
atakora init \
  --org "Contoso" \
  --project "ECommerce" \
  --package "backend" \
  --non-interactive
```

**Interactive setup (recommended for first-time users):**

```bash
atakora init
```

### Validation

Package names must:

- Be lowercase
- Use hyphens for spaces
- Start with a letter
- Contain only alphanumeric characters and hyphens

Organization and project names must:

- Be non-empty strings
- Be valid identifiers

### Error Handling

**Already initialized:**

```
Error: Project already initialized!
Manifest exists at: .atakora/manifest.json

To add a new package, use: atakora add <package-name>
```

### Next Steps

After initialization:

1. Install dependencies: `npm install`
2. Define infrastructure in `packages/{package-name}/bin/app.ts`
3. Synthesize templates: `npm run synth`
4. Deploy to Azure: `npm run deploy`

---

## add

Add a new infrastructure package to an existing Atakora project.

### Usage

```bash
atakora add <package-name> [options]
```

### Arguments

| Argument         | Description                | Required |
| ---------------- | -------------------------- | -------- |
| `<package-name>` | Name of the package to add | Yes      |

### Options

| Option          | Description                     | Default |
| --------------- | ------------------------------- | ------- |
| `--set-default` | Set this package as the default | false   |
| `--no-prompt`   | Skip prompts and use defaults   | false   |

### Interactive Mode (Default)

Running `atakora add` without `--no-prompt` asks for confirmation:

```bash
atakora add frontend
```

**Prompt:**

```
? Set as default package? (y/N)
```

### Examples

**Add package with interactive prompt:**

```bash
atakora add frontend
```

**Add package and set as default:**

```bash
atakora add frontend --set-default
```

**Add package without prompts:**

```bash
atakora add frontend --no-prompt
```

### What Gets Created

The `add` command creates a new package:

```
packages/{package-name}/
├── bin/
│   └── app.ts           # Infrastructure entry point
├── package.json         # Package dependencies
└── tsconfig.json        # TypeScript configuration
```

**Generated `bin/app.ts`:**

```typescript
import { AzureApp, SubscriptionStack } from '@atakora/lib';

const app = new AzureApp({
  organization: 'YourOrg', // From manifest
  project: 'YourProject', // From manifest
});

const stack = new SubscriptionStack(app, 'Main', {
  subscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
  environment: 'nonprod',
  instance: 1,
});

// Add your infrastructure here

app.synth();
```

### Manifest Updates

The command updates `.atakora/manifest.json`:

```json
{
  "packages": [
    {
      "name": "frontend",
      "path": "packages/frontend",
      "entryPoint": "bin/app.ts",
      "enabled": true
    }
  ],
  "defaultPackage": "frontend", // If --set-default was used
  "updatedAt": "2025-10-08T14:30:00.000Z"
}
```

### Validation

**Package name rules:**

- Lowercase letters, numbers, and hyphens only
- Must start with a letter
- No special characters except hyphens

**Checks performed:**

- Project must be initialized (manifest exists)
- Package name must be unique
- Package name must be valid

### Error Handling

**Project not initialized:**

```
Error: Project not initialized!
Run: atakora init
```

**Package already exists:**

```
Error: Package 'frontend' already exists!
Location: packages/frontend
```

**Invalid package name:**

```
Error: Invalid package name: Package name must be lowercase
```

### Next Steps

After adding a package:

1. Define infrastructure in `packages/{package-name}/bin/app.ts`
2. Build the project: `npm run build`
3. Synthesize templates: `npm run synth` (or `npx atakora synth --package {package-name}`)

---

## set-default

Set which package is synthesized when no `--package` flag is provided.

### Usage

```bash
atakora set-default <package-name>
```

### Arguments

| Argument         | Description                           | Required |
| ---------------- | ------------------------------------- | -------- |
| `<package-name>` | Name of the package to set as default | Yes      |

### Examples

**Set backend as default:**

```bash
atakora set-default backend
```

**Set frontend as default:**

```bash
atakora set-default frontend
```

### What It Does

Updates the `defaultPackage` field in `.atakora/manifest.json`:

```json
{
  "defaultPackage": "frontend",
  "updatedAt": "2025-10-08T14:45:00.000Z"
}
```

After setting the default, running `npm run synth` (or `atakora synth`) will synthesize only the default package.

### When to Use

Change the default package when:

- You switch focus to a different package
- A new package becomes the primary infrastructure
- You want `npm run synth` to target a specific package by default

### Validation

**Checks performed:**

- Project must be initialized
- Package must exist in manifest
- Package name must match exactly

### Error Handling

**Project not initialized:**

```
Error: Project not initialized!
Run: atakora init
```

**Package not found:**

```
Error: Package 'frontend' not found in manifest!

Available packages:
  - backend
  - networking
```

---

## synth

Synthesize ARM templates from TypeScript infrastructure code.

### Usage

```bash
atakora synth [app] [options]
```

### Arguments

| Argument | Description      | Default      |
| -------- | ---------------- | ------------ |
| `[app]`  | Path to app file | `bin/app.ts` |

### Options

| Option               | Description                       | Default         |
| -------------------- | --------------------------------- | --------------- |
| `-o, --output <dir>` | Output directory for templates    | `arm.out`       |
| `--skip-validation`  | Skip template validation          | false           |
| `--validate-only`    | Validate without writing files    | false           |
| `--stack <stack>`    | Only synthesize specific stack(s) | All stacks      |
| `--single-file`      | Merge stacks into single template | false           |
| `--package <name>`   | Synthesize specific package       | Default package |
| `--all`              | Synthesize all packages           | false           |

### Basic Usage

**Synthesize default package:**

```bash
atakora synth
# or
npm run synth
```

**Synthesize specific package:**

```bash
atakora synth --package frontend
```

**Synthesize all packages:**

```bash
atakora synth --all
```

### Advanced Options

**Synthesize specific stack only:**

```bash
atakora synth --stack Foundation
```

**Validate templates without writing:**

```bash
atakora synth --validate-only
```

**Skip validation (faster synthesis):**

```bash
atakora synth --skip-validation
```

**Custom output directory:**

```bash
atakora synth --output dist/templates
```

**Single file output (nested deployments):**

```bash
atakora synth --single-file
```

### Output Structure

**Default output (per-package):**

```
.atakora/arm.out/
├── backend/
│   ├── Foundation.json      # ARM template for Foundation stack
│   ├── Application.json     # ARM template for Application stack
│   └── manifest.json        # Stack metadata
└── frontend/
    ├── CDN.json
    └── manifest.json
```

**Single file output:**

```
.atakora/arm.out/
└── backend/
    ├── main.json            # All stacks in one template
    └── manifest.json
```

### Validation

Templates are validated for:

- ARM schema compliance
- Resource type correctness
- Required properties
- Location constraints
- Naming conventions
- Dependency correctness

**Validation output:**

```
✓ Compiled TypeScript
✓ Synthesized 2 stacks
✓ Validated templates

Stacks:
  ✓ Foundation (5 resources)
  ✓ Application (8 resources)

Output: .atakora/arm.out/backend/
```

### Error Handling

**App file not found:**

```
Error: App file not found: bin/app.ts
Make sure your app file exists at the specified path
```

**Compilation errors:**

```
Error: TypeScript compilation failed
{compilation error details}
```

**Validation errors:**

```
Error: Template validation failed

Foundation.json:
  - Missing required property: location
  - Invalid resource type: Microsoft.Storage/storageAccounts/v2
```

### Environment Variables

Synthesis respects environment variables in your code:

```typescript
const stack = new SubscriptionStack(app, 'Main', {
  subscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
  location: process.env.AZURE_LOCATION || 'eastus',
});
```

Set before synthesis:

```bash
export AZURE_SUBSCRIPTION_ID="12345678-1234-1234-1234-123456789012"
export AZURE_LOCATION="westus"
atakora synth
```

### CI/CD Usage

**Synthesize all packages in CI:**

```bash
atakora synth --all --skip-validation
```

**Validate all templates in PR checks:**

```bash
atakora synth --all --validate-only
```

---

## deploy

Deploy synthesized ARM templates to Azure.

### Usage

```bash
atakora deploy [options]
```

### Options

| Option             | Description                 | Default         |
| ------------------ | --------------------------- | --------------- |
| `--package <name>` | Deploy specific package     | Default package |
| `--stack <name>`   | Deploy specific stack       | All stacks      |
| `--all`            | Deploy all packages         | false           |
| `--skip-confirm`   | Skip confirmation prompt    | false           |
| `--dry-run`        | Show what would be deployed | false           |

### Examples

**Deploy default package:**

```bash
atakora deploy
```

**Deploy specific package:**

```bash
atakora deploy --package frontend
```

**Deploy all packages:**

```bash
atakora deploy --all
```

**Deploy specific stack:**

```bash
atakora deploy --stack Foundation
```

**Dry run (preview changes):**

```bash
atakora deploy --dry-run
```

### Prerequisites

- Azure CLI installed and authenticated
- ARM templates synthesized (`atakora synth`)
- Appropriate Azure permissions

---

## diff

Show infrastructure changes between current code and deployed state.

### Usage

```bash
atakora diff [options]
```

### Options

| Option             | Description           | Default         |
| ------------------ | --------------------- | --------------- |
| `--package <name>` | Diff specific package | Default package |
| `--stack <name>`   | Diff specific stack   | All stacks      |
| `--all`            | Diff all packages     | false           |

### Examples

**Show changes for default package:**

```bash
atakora diff
```

**Show changes for specific package:**

```bash
atakora diff --package backend
```

**Show changes for all packages:**

```bash
atakora diff --all
```

### Output

Displays changes between local templates and deployed resources:

```
Stack: Foundation

Resources to add:
  + Microsoft.Storage/storageAccounts/mystorage

Resources to modify:
  ~ Microsoft.Network/virtualNetworks/myvnet
    - addressSpace: 10.0.0.0/16
    + addressSpace: 10.0.0.0/8

Resources to remove:
  - Microsoft.Compute/virtualMachines/oldvm
```

---

## config

Manage Azure configuration and authentication.

### Subcommands

- `config login` - Authenticate with Azure
- `config show` - Show current configuration
- `config list` - List available subscriptions
- `config select` - Select active subscription
- `config validate` - Validate configuration

### Examples

**Login to Azure:**

```bash
atakora config login
```

**Show current config:**

```bash
atakora config show
```

**List subscriptions:**

```bash
atakora config list
```

**Select subscription:**

```bash
atakora config select
```

---

## Global Options

These options work with all commands:

| Option          | Description              |
| --------------- | ------------------------ |
| `-h, --help`    | Display help for command |
| `-V, --version` | Display version number   |

### Examples

**Show version:**

```bash
atakora --version
```

**Show help:**

```bash
atakora --help
```

**Show command help:**

```bash
atakora init --help
atakora synth --help
```

---

## Common Workflows

### Initial Setup

```bash
# Initialize project
atakora init

# Install dependencies
npm install

# Define infrastructure
# Edit packages/backend/bin/app.ts

# Synthesize templates
npm run synth

# Deploy to Azure
npm run deploy
```

### Adding a Package

```bash
# Add new package
atakora add frontend --set-default

# Define infrastructure
# Edit packages/frontend/bin/app.ts

# Build and synthesize
npm run build
npm run synth

# Deploy
npm run deploy
```

### Multi-Package Development

```bash
# Synthesize all packages
atakora synth --all

# Deploy specific package
atakora deploy --package backend

# Switch default package
atakora set-default frontend

# Synthesize new default
npm run synth
```

### CI/CD Pipeline

```bash
# Install dependencies
npm ci

# Build all packages
npm run build

# Synthesize and validate all
atakora synth --all --validate-only

# Deploy to staging (if validation passes)
atakora deploy --all --package staging
```

---

## Troubleshooting

### Command Not Found

If `atakora` command is not found:

1. Install globally: `npm install -g @atakora/cli`
2. Or use npx: `npx @atakora/cli <command>`
3. Check PATH includes npm global bin

### Project Not Initialized

Most commands require an initialized project:

```bash
atakora init
```

### Package Not Found

Ensure package exists in manifest:

```bash
# List packages
cat .atakora/manifest.json

# Add package if missing
atakora add <package-name>
```

### Synthesis Errors

Common issues:

- TypeScript compilation errors - check your code syntax
- Missing environment variables - set required variables
- Import errors - ensure dependencies are installed

### Validation Errors

Check:

- ARM template schema compliance
- Required resource properties
- Valid resource types and API versions
- Proper dependency references

---

## See Also

- **[Getting Started Guide](../guides/getting-started.md)** - Initialize your first project
- **[Multi-Package Projects](../guides/multi-package-projects.md)** - Manage multiple packages
- **[Manifest Schema](./manifest-schema.md)** - Understand project configuration
- **[Error Codes](./error-codes.md)** - Error reference and troubleshooting
