# atakora init

**Navigation**: [Docs Home](../../README.md) > [Reference](../README.md) > [CLI Reference](./README.md) > init

---

## Synopsis

```bash
atakora init [options]
```

## Description

Initializes a new Atakora infrastructure-as-code project in the current directory. Creates the workspace structure, project manifest, and your first infrastructure package with all necessary configuration files.

This command sets up everything you need to start defining Azure infrastructure:

- **Project manifest** (`.atakora/manifest.json`) to track packages
- **Workspace structure** (`packages/` directory)
- **First infrastructure package** with TypeScript entry point
- **Package configuration** (`package.json`, `tsconfig.json`)
- **Version control setup** (`.gitignore`)
- **Documentation** (`README.md`)

## Options

### `--org <organization>`

The organization or company name for this project.

- **Type**: string
- **Default**: Prompts user or "Digital Minion" in non-interactive mode
- **Example**: `--org "Acme Corporation"`

Used in:
- Resource naming conventions
- Documentation generation
- Manifest metadata

### `--project <project>`

The project name that groups related infrastructure packages.

- **Type**: string
- **Default**: Prompts user or "Atakora" in non-interactive mode
- **Example**: `--project "ProductionInfra"`

Used in:
- Manifest identification
- Root package.json name
- Resource group naming

### `--package <package>`

Name for the first infrastructure package to create.

- **Type**: string
- **Default**: Prompts user or "backend" in non-interactive mode
- **Example**: `--package "development"`

Common package names:
- `backend` - Backend infrastructure
- `frontend` - Frontend resources
- `dev`, `staging`, `production` - Environment-specific
- `shared` - Shared resources

### `--non-interactive`

Skip interactive prompts and use default values or provided options.

- **Type**: boolean (flag)
- **Default**: `false`
- **Example**: `atakora init --non-interactive`

Useful for:
- CI/CD pipelines
- Automated scripts
- Batch project creation

## Examples

### Interactive Mode (Default)

Start an interactive session that prompts for all configuration:

```bash
atakora init
```

Prompts for:
```
? Organization name: Digital Minion
? Project name: ProductionInfra
? First package name: backend
```

Creates structure:
```
.
├── .atakora/
│   └── manifest.json
├── packages/
│   └── backend/
│       ├── bin/
│       │   └── app.ts
│       ├── package.json
│       └── tsconfig.json
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

### Non-Interactive Mode

Create project without prompts using defaults:

```bash
atakora init --non-interactive
```

Uses defaults:
- Organization: "Digital Minion"
- Project: "Atakora"
- Package: "backend"

### Specify All Options

Provide all configuration upfront:

```bash
atakora init \
  --org "Acme Corporation" \
  --project "EcommerceInfra" \
  --package "production"
```

### Partial Options with Prompts

Provide some options, prompt for the rest:

```bash
atakora init --org "Acme Corporation"
```

Prompts only for:
```
? Project name:
? First package name:
```

## What Gets Created

### Project Manifest (.atakora/manifest.json)

Tracks all packages in the workspace:

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
      "environment": "production",
      "created": "2025-10-08T12:00:00.000Z"
    }
  ],
  "created": "2025-10-08T12:00:00.000Z",
  "defaultPackage": "backend"
}
```

### Infrastructure Package (packages/backend/)

Your first package contains a complete TypeScript project:

**bin/app.ts** - Entry point with sample infrastructure:

```typescript
import { App, Stack } from '@atakora/lib';
import { ResourceGroup } from '@atakora/cdk/resources';
import { VirtualNetwork } from '@atakora/cdk/network';

class BackendStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      environment: 'production',
      location: 'eastus'
    });

    // Resource Group
    const rg = new ResourceGroup(this, 'ResourceGroup', {
      location: this.location
    });

    // Virtual Network
    new VirtualNetwork(this, 'VNet', {
      resourceGroup: rg,
      addressSpace: {
        addressPrefixes: ['10.0.0.0/16']
      }
    });
  }
}

const app = new App();
new BackendStack(app, 'backend');
app.synth();
```

**package.json** - Package configuration:

```json
{
  "name": "backend",
  "version": "1.0.0",
  "main": "bin/app.ts",
  "scripts": {
    "build": "tsc",
    "synth": "ts-node bin/app.ts"
  },
  "dependencies": {
    "@atakora/lib": "^1.0.0",
    "@atakora/cdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^18.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.0.0"
  }
}
```

**tsconfig.json** - TypeScript configuration:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "."
  },
  "include": ["bin/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Root Configuration Files

**package.json** - Workspace root:

```json
{
  "name": "productioninfra",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "npm run build --workspaces",
    "synth": "atakora synth",
    "deploy": "atakora deploy"
  },
  "devDependencies": {
    "@atakora/cli": "^1.0.0"
  }
}
```

**tsconfig.json** - Root TypeScript config:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  }
}
```

**.gitignore** - Version control exclusions:

```gitignore
# Dependencies
node_modules/

# Build output
dist/
*.tsbuildinfo

# Atakora output
.atakora/arm.out/
.atakora/cache/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
```

**README.md** - Project documentation:

```markdown
# ProductionInfra

Azure infrastructure as code using Atakora.

## Organization
Digital Minion

## Getting Started

### Install Dependencies
npm install

### Synthesize ARM Templates
npm run synth

### Deploy to Azure
npm run deploy

## Packages

- **backend** - Backend infrastructure (production)

## Adding More Packages

atakora add <package-name>

## Documentation

See [Atakora Documentation](https://github.com/Digital-Minion/atakora) for more information.
```

## Validation

The command validates inputs before creating files:

### Organization Name
- **Rule**: 1-50 characters, letters, numbers, spaces, hyphens
- **Valid**: "Digital Minion", "Acme-Corp", "Company 123"
- **Invalid**: "", "a", "x".repeat(51)

### Project Name
- **Rule**: 1-50 characters, letters, numbers, hyphens
- **Valid**: "ProductionInfra", "my-app", "Project123"
- **Invalid**: "", "project name" (spaces), "@#$%"

### Package Name
- **Rule**: 1-30 characters, lowercase letters, numbers, hyphens
- **Valid**: "backend", "dev-environment", "api2"
- **Invalid**: "Backend" (uppercase), "my_package" (underscore)

### Directory Checks
- **Empty directory**: Warns if current directory has files
- **Existing manifest**: Errors if `.atakora/manifest.json` exists
- **Git repository**: Warns if not in a git repository

## Exit Codes

| Code | Condition | Next Steps |
|------|-----------|------------|
| 0 | Success - project initialized | Run `atakora synth` |
| 1 | Already initialized | Use `atakora add` for new packages |
| 2 | Invalid organization/project name | Fix validation errors |
| 3 | Directory not empty (with --non-interactive) | Clear directory or run interactively |
| 4 | File system error | Check permissions |

## Common Issues

### Project Already Initialized

**Error**:
```
Project already initialized!
Manifest exists at: .atakora/manifest.json
```

**Cause**: Running `init` in a directory that already has an Atakora project.

**Solution**: Use `atakora add` to add packages to existing project:
```bash
atakora add production
```

### Directory Not Empty

**Warning**:
```
Current directory is not empty.
Continue anyway? (y/N)
```

**Cause**: Running `init` in a directory with existing files.

**Solution**:
- Choose `y` to proceed (Atakora won't overwrite existing files)
- Or initialize in a new directory:
```bash
mkdir my-infra && cd my-infra
atakora init
```

### Permission Denied

**Error**:
```
EACCES: permission denied, mkdir '.atakora'
```

**Cause**: Insufficient file system permissions.

**Solution**: Ensure write permissions:
```bash
chmod +w .
# or run in a directory you own
```

### Invalid Package Name

**Error**:
```
Invalid package name: must be lowercase letters, numbers, and hyphens only
```

**Cause**: Package name contains uppercase letters or special characters.

**Solution**: Use valid characters:
```bash
# Invalid
atakora init --package "My_Package"

# Valid
atakora init --package "my-package"
```

## Best Practices

### Naming Conventions

**Organization**: Use your company or team name
```bash
--org "Acme Corporation"
--org "Platform Team"
```

**Project**: Describe the infrastructure's purpose
```bash
--project "EcommerceInfra"
--project "DataPlatform"
--project "CustomerPortal"
```

**First Package**: Start with environment or component
```bash
--package "dev"           # Environment-based
--package "backend"       # Component-based
--package "shared"        # Shared resources
```

### Directory Structure

Initialize in a dedicated directory:
```bash
mkdir acme-infra
cd acme-infra
atakora init
```

Use version control from the start:
```bash
git init
atakora init
git add .
git commit -m "Initial Atakora project setup"
```

### Multi-Environment Projects

Plan for multiple environments from the beginning:

```bash
# Initialize with development
atakora init --package dev

# Add other environments
atakora add staging
atakora add production
```

### CI/CD Integration

Use non-interactive mode in automation:

```bash
#!/bin/bash
# setup-infrastructure.sh

atakora init \
  --non-interactive \
  --org "$ORG_NAME" \
  --project "$PROJECT_NAME" \
  --package "production"

cd packages/production
npm install
```

## Next Steps

After initializing your project:

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Edit infrastructure code**:
   ```bash
   # Open first package
   code packages/backend/bin/app.ts
   ```

3. **Synthesize ARM templates**:
   ```bash
   atakora synth
   # or
   npm run synth
   ```

4. **Configure Azure credentials**:
   ```bash
   atakora config set-credentials
   ```

5. **Deploy to Azure**:
   ```bash
   atakora deploy
   # or
   npm run deploy
   ```

## See Also

- [`atakora add`](./add.md) - Add more packages
- [`atakora synth`](./synth.md) - Synthesize templates
- [Getting Started Guide](../../getting-started/README.md)
- [Your First Stack Tutorial](../../getting-started/your-first-stack.md)
- [Manifest Schema Reference](../manifest-schema.md)

---

**Last Updated**: 2025-10-08
**CLI Version**: 1.0.0+
