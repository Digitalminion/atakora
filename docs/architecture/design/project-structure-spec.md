# Atakora Project Structure Specification

**Version**: 1.0.0
**Date**: 2025-10-08
**Author**: Becky (Staff Architect)
**Status**: Approved

---

## Overview

This document specifies the standard project structure created by `atakora init` and maintained throughout the project lifecycle. The structure supports multi-package Azure infrastructure projects using npm workspaces, TypeScript, and the Atakora synthesis pipeline.

---

## Core Principles

1. **Convention over Configuration**: Predictable structure reduces cognitive load
2. **npm Workspace Native**: Leverage npm's built-in workspace support
3. **TypeScript First**: Full TypeScript support with project references
4. **Clear Separation**: Infrastructure code, application code, and generated output are clearly separated
5. **Progressive Complexity**: Start simple, grow as needed without restructuring
6. **Git-Friendly**: Clear gitignore patterns and no generated files in source control

---

## Directory Structure

### Initial Structure (After `atakora init`)

```
my-project/
├── .atakora/                      # Atakora-specific files
│   ├── manifest.json              # Project manifest (source controlled)
│   └── arm.out/                   # Generated ARM templates (git ignored)
│       └── backend/               # Package-specific output
│           ├── main.json          # Synthesized ARM template
│           ├── parameters.json    # ARM parameters file
│           └── metadata.json      # Synthesis metadata
├── packages/                      # npm workspace packages
│   └── backend/                   # First package (name from init)
│       ├── package.json          # Package configuration
│       ├── tsconfig.json         # TypeScript configuration
│       ├── README.md             # Package documentation
│       ├── src/                  # Source code
│       │   ├── main.ts          # Entry point for synthesis
│       │   └── stacks/          # Stack definitions
│       │       └── app-stack.ts # Example stack
│       ├── bin/                  # Alternative entry points
│       │   └── app.ts           # CDK-style entry point
│       └── test/                # Tests
│           └── main.test.ts     # Entry point tests
├── node_modules/                 # Dependencies (git ignored)
├── package.json                  # Workspace root configuration
├── package-lock.json            # Lock file (source controlled)
├── tsconfig.json                # Root TypeScript configuration
├── tsconfig.base.json           # Shared TypeScript settings
├── .gitignore                   # Git ignore patterns
├── .npmrc                       # npm configuration
└── README.md                    # Project documentation
```

### Expanded Structure (Multi-Package Project)

```
my-project/
├── .atakora/
│   ├── manifest.json
│   ├── arm.out/
│   │   ├── backend/             # Backend package output
│   │   ├── frontend/            # Frontend package output
│   │   └── infrastructure/      # Infrastructure package output
│   └── cache/                   # Build cache (git ignored)
│       └── synthesis.cache      # Synthesis cache
├── packages/
│   ├── backend/                 # Backend API resources
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── main.ts
│   │       ├── stacks/
│   │       ├── constructs/      # Package-specific constructs
│   │       └── config/          # Configuration
│   ├── frontend/                # Frontend/SPA resources
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── main.ts
│   │       └── stacks/
│   ├── infrastructure/          # Shared infrastructure
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── main.ts
│   │       ├── stacks/
│   │       │   ├── network-stack.ts
│   │       │   └── security-stack.ts
│   │       └── constructs/
│   └── shared/                  # Shared libraries
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── constants/
│           └── utils/
├── docs/                        # Project documentation
│   ├── architecture/
│   ├── deployment/
│   └── operations/
├── scripts/                     # Build and deployment scripts
│   ├── deploy.sh
│   └── validate.sh
├── .github/                     # GitHub-specific files
│   └── workflows/
│       └── ci.yml
├── package.json
├── tsconfig.json
├── .gitignore
├── .prettierrc                  # Code formatting
├── .eslintrc.js                # Linting configuration
└── README.md
```

---

## File Specifications

### `.atakora/manifest.json`

Project manifest following ADR-002 schema. Source controlled.

```json
{
  "version": "1.0.0",
  "organization": "Digital Minion",
  "project": "MyProject",
  "defaultPackage": "backend",
  "packages": {
    "backend": {
      "path": "packages/backend",
      "entry": "src/main.ts"
    }
  },
  "createdAt": "2025-10-08T10:00:00Z",
  "updatedAt": "2025-10-08T10:00:00Z"
}
```

### Root `package.json`

Workspace configuration with Atakora CLI as dependency:

```json
{
  "name": "@myorg/my-project",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "synth": "atakora synth",
    "synth:backend": "atakora synth --package backend",
    "synth:all": "atakora synth --all",
    "deploy": "atakora deploy",
    "deploy:backend": "atakora deploy --package backend",
    "diff": "atakora diff",
    "test": "npm run test --workspaces",
    "build": "npm run build --workspaces --if-present",
    "lint": "eslint packages/*/src/**/*.ts",
    "format": "prettier --write packages/*/src/**/*.ts"
  },
  "devDependencies": {
    "@atakora/cli": "^1.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

### Root `tsconfig.json`

TypeScript project references configuration:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true
  },
  "references": [
    { "path": "./packages/backend" },
    { "path": "./packages/frontend" },
    { "path": "./packages/infrastructure" },
    { "path": "./packages/shared" }
  ],
  "files": []
}
```

### Root `tsconfig.base.json`

Shared TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./",
    "baseUrl": ".",
    "paths": {
      "@myorg/shared": ["packages/shared/src"],
      "@myorg/shared/*": ["packages/shared/src/*"]
    }
  },
  "exclude": ["node_modules", "dist", ".atakora/arm.out", "**/*.test.ts", "**/*.spec.ts"]
}
```

### Package `package.json`

Individual package configuration:

```json
{
  "name": "@myorg/my-project-backend",
  "version": "1.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -b",
    "synth": "atakora synth --package backend",
    "test": "vitest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "@atakora/lib": "^1.0.0",
    "constructs": "^10.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### Package `tsconfig.json`

Package-specific TypeScript configuration:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts", "src/**/*.spec.ts"],
  "references": [{ "path": "../shared" }]
}
```

### Package Entry Point (`src/main.ts`)

Standard synthesis entry point:

```typescript
import { App } from '@atakora/lib';
import { AppStack } from './stacks/app-stack';

const app = new App({
  name: 'backend',
  environment: process.env.ATAKORA_ENV || 'dev',
});

// Define stacks
new AppStack(app, 'AppStack', {
  prefix: 'backend',
  location: 'eastus2',
  tags: {
    Project: 'MyProject',
    Package: 'backend',
    Environment: app.environment,
  },
});

// Synthesize
app.synth();
```

### `.gitignore`

Standard ignore patterns:

```gitignore
# Dependencies
node_modules/
*.tsbuildinfo

# Build output
dist/
build/
*.js
*.js.map
*.d.ts
*.d.ts.map

# Atakora generated files
.atakora/arm.out/
.atakora/cache/
.atakora/*.log

# Environment files
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
.DS_Store

# Test coverage
coverage/
.nyc_output/

# Temporary files
tmp/
temp/
*.tmp
*.temp

# Keep these
!.atakora/manifest.json
!jest.config.js
!vitest.config.js
!.eslintrc.js
```

---

## Package Naming Conventions

### Package Names

Package names follow npm naming conventions with additional semantic meaning:

- **infrastructure**: Core infrastructure (networking, security, shared resources)
- **backend**: Backend API and services
- **frontend**: Frontend applications and static sites
- **shared**: Shared libraries and utilities
- **data**: Data layer resources (databases, storage)
- **integration**: External service integrations
- **monitoring**: Observability and monitoring resources

Examples:

- `packages/infrastructure`
- `packages/backend-api`
- `packages/frontend-web`
- `packages/shared-utils`

### Resource Naming

Resources follow a consistent pattern:

- **Pattern**: `{prefix}-{resource-type}-{name}-{environment}`
- **Example**: `myproj-rg-backend-prod`

### File Naming

- **Stacks**: `{name}-stack.ts` (e.g., `network-stack.ts`)
- **Constructs**: `{name}.construct.ts` (e.g., `database.construct.ts`)
- **Tests**: `{name}.test.ts` or `{name}.spec.ts`
- **Configuration**: `{name}.config.ts`

---

## ARM Output Organization

Synthesized ARM templates are organized by package:

```
.atakora/arm.out/
├── backend/
│   ├── main.json                 # Main ARM template
│   ├── parameters.json           # Parameters file
│   ├── metadata.json            # Synthesis metadata
│   ├── main.expanded.json       # Expanded template (if applicable)
│   └── validation-report.json   # Validation results
├── frontend/
│   └── ...
└── infrastructure/
    └── ...
```

### Output File Specifications

#### `main.json`

The synthesized ARM template ready for deployment.

#### `parameters.json`

ARM parameters file with environment-specific values:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "location": {
      "value": "eastus2"
    }
  }
}
```

#### `metadata.json`

Synthesis metadata for debugging and auditing:

```json
{
  "synthesizedAt": "2025-10-08T10:00:00Z",
  "synthesizedBy": "atakora@1.0.0",
  "package": "backend",
  "stackCount": 1,
  "resourceCount": 15,
  "environment": "dev",
  "cloudEnvironment": "AzureCloud"
}
```

---

## npm Workspace Integration

### Workspace Benefits

1. **Single node_modules**: Dependencies are hoisted to root
2. **Cross-package references**: Packages can depend on each other
3. **Unified commands**: Run commands across all packages
4. **Version management**: Coordinated versioning for releases

### Workspace Commands

```bash
# Install dependencies for all packages
npm install

# Run command in specific workspace
npm run build --workspace=@myorg/my-project-backend

# Run command in all workspaces
npm run test --workspaces

# Add dependency to specific package
npm install express --workspace=@myorg/my-project-backend

# Add dev dependency to root
npm install -D eslint
```

### Cross-Package Dependencies

Packages can reference each other:

```json
// packages/backend/package.json
{
  "dependencies": {
    "@myorg/shared": "^1.0.0"
  }
}
```

TypeScript project references ensure proper build order:

```json
// packages/backend/tsconfig.json
{
  "references": [{ "path": "../shared" }]
}
```

---

## Adding New Packages

Use the `atakora add` command to add packages to existing projects:

```bash
# Add a new package
atakora add frontend

# Add with specific type
atakora add data --type infrastructure

# Add and set as default
atakora add api --set-default
```

This will:

1. Create package directory structure
2. Generate package.json and tsconfig.json
3. Update manifest.json
4. Update root tsconfig.json references
5. Create entry point and example stack

---

## Migration Path

For existing projects migrating to Atakora:

1. **Initialize in existing directory**:

   ```bash
   atakora init --import
   ```

2. **Move existing code to packages**:

   ```bash
   mkdir -p packages/backend/src
   mv src/* packages/backend/src/
   ```

3. **Update imports and references**

4. **Verify synthesis**:
   ```bash
   atakora synth --all
   ```

---

## Best Practices

### 1. Package Organization

- **Single Responsibility**: Each package has one clear purpose
- **Clear Dependencies**: Explicit dependencies between packages
- **Shared Code**: Common utilities in shared package
- **No Circular Dependencies**: Enforce acyclic dependency graph

### 2. Entry Points

- **Consistent Structure**: All packages follow same entry point pattern
- **Environment Handling**: Use environment variables for configuration
- **Error Handling**: Comprehensive error handling in entry points

### 3. Version Control

- **Commit manifest.json**: Always source control the manifest
- **Ignore generated files**: Never commit .atakora/arm.out/
- **Lock files**: Always commit package-lock.json

### 4. Development Workflow

```bash
# 1. Make changes to constructs
edit packages/backend/src/stacks/app-stack.ts

# 2. Synthesize to check output
npm run synth:backend

# 3. Review generated ARM template
cat .atakora/arm.out/backend/main.json

# 4. Test synthesis
npm test

# 5. Deploy
npm run deploy:backend
```

---

## Validation Rules

The CLI enforces these validation rules:

1. **Package Names**: Must be valid npm package names
2. **Package Paths**: Must exist and contain package.json
3. **Entry Points**: Must exist and be valid TypeScript/JavaScript
4. **Circular Dependencies**: Detected and prevented
5. **Manifest Consistency**: Package references must be valid
6. **TypeScript References**: Must match package dependencies

---

## Future Enhancements

Planned enhancements to the project structure:

1. **Monorepo Tools**: Support for nx, lerna, or rush
2. **Custom Templates**: User-defined package templates
3. **Package Generators**: Specialized generators for common patterns
4. **Dependency Graph**: Visualization of package dependencies
5. **Build Caching**: Incremental builds with proper caching
6. **Package Versioning**: Automated version management

---

## References

- [npm Workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Monorepo Best Practices](https://monorepo.tools/)
- [Azure Resource Manager](https://docs.microsoft.com/en-us/azure/azure-resource-manager/)
