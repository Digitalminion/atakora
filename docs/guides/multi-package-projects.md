# Multi-Package Projects

[Home](../README.md) > [Guides](./README.md) > Multi-Package Projects

## Overview

Multi-package projects allow you to organize infrastructure code into separate, independent packages within a single workspace. Each package has its own infrastructure code, dependencies, and synthesized ARM templates, but shares the workspace-level configuration.

This approach is ideal for managing complex infrastructure that spans multiple deployment boundaries, teams, or lifecycles.

## When to Use Multiple Packages

Consider using multiple packages to organize infrastructure by:

### Deployment Boundary

Separate infrastructure that deploys independently:

- **Backend infrastructure** - Databases, app services, storage
- **Frontend infrastructure** - CDN, static web apps, DNS
- **Shared services** - Monitoring, logging, key vault

### Team Ownership

Divide infrastructure by team responsibility:

- **Platform team** - Networking, security, foundational resources
- **Application team** - App-specific resources and configurations
- **Data team** - Data lakes, analytics, processing pipelines

### Environment Separation

Isolate environments in separate packages:

- **Development** - Dev/test resources with relaxed policies
- **Staging** - Pre-production validation environment
- **Production** - Production resources with strict governance

### Lifecycle Management

Organize by change frequency:

- **Network** - Rarely changed foundational networking
- **Security** - Periodic updates to security policies
- **Applications** - Frequently updated app infrastructure

## Adding a New Package

After initial project setup with `atakora init`, add additional packages using:

```bash
npx atakora add <package-name>
```

### Interactive Prompts

The `add` command will ask:

1. **Set as default package?** (y/N) - Whether this package should be the default for synthesis

### Example: Adding a Frontend Package

```bash
npx atakora add frontend
```

Output:

```
✓ Package 'frontend' added successfully
✓ Created packages/frontend/
✓ Generated package.json
✓ Generated tsconfig.json
✓ Generated bin/app.ts
✓ Updated manifest

Package 'frontend' is ready. Edit packages/frontend/bin/app.ts to define infrastructure.
```

## Package Structure

Each package is an independent infrastructure module with its own:

```
packages/frontend/
├── bin/
│   └── app.ts          # Infrastructure entry point
├── package.json        # Package-specific dependencies
└── tsconfig.json       # TypeScript configuration
```

### Independent Configurations

Each package can:

- Have different dependencies in its `package.json`
- Use different TypeScript configurations
- Define completely different infrastructure stacks
- Be synthesized and deployed independently

### Shared Workspace Configuration

Packages share:

- Root `node_modules` (via npm workspaces)
- Organization and project names (from manifest)
- Output directory structure (under `.atakora/arm.out/`)

## Synthesizing Packages

### Synthesize Default Package

When no package is specified, the default package is synthesized:

```bash
npm run synth
```

Or directly:

```bash
npx atakora synth
```

### Synthesize Specific Package

Target a specific package by name:

```bash
npx atakora synth --package frontend
```

You can create convenience scripts in your root `package.json`:

```json
{
  "scripts": {
    "synth": "atakora synth",
    "synth:backend": "atakora synth --package backend",
    "synth:frontend": "atakora synth --package frontend"
  }
}
```

Then run:

```bash
npm run synth:frontend
```

### Synthesize All Packages

Synthesize every package in the workspace:

```bash
npx atakora synth --all
```

This is useful for:

- CI/CD pipelines that need to build all packages
- Validating all infrastructure before deployment
- Ensuring consistency across packages

## Output Organization

Synthesized ARM templates are organized by package:

```
.atakora/
└── arm.out/
    ├── backend/
    │   ├── Foundation.json
    │   ├── Application.json
    │   └── manifest.json
    └── frontend/
        ├── CDN.json
        ├── StaticWebApp.json
        └── manifest.json
```

Each package's templates are isolated, making it easy to:

- Deploy packages independently
- Track changes per package
- Review package-specific outputs

## Setting the Default Package

Change which package synthesizes when no `--package` flag is provided:

```bash
npx atakora set-default frontend
```

This updates the `defaultPackage` field in `.atakora/manifest.json`.

### When to Change Default

Set the default to the package you work with most frequently:

- If you primarily work on backend infrastructure, set it to `backend`
- For frontend-focused work, set it to `frontend`
- For platform teams, set it to `platform` or `networking`

## Example: Backend + Frontend Split

A common pattern separates backend infrastructure from frontend delivery.

### Project Structure

```
ecommerce-infra/
├── .atakora/
│   └── manifest.json
├── packages/
│   ├── backend/
│   │   └── bin/
│   │       └── app.ts
│   └── frontend/
│       └── bin/
│           └── app.ts
└── package.json
```

### Backend Package (`packages/backend/bin/app.ts`)

```typescript
import { App, SubscriptionStack } from '@atakora/cdk';
import { ResourceGroups } from '@atakora/cdk/resources';
import { ServerFarms, Sites } from '@atakora/cdk/web';
import { Servers, Databases } from '@atakora/cdk/sql';

const app = new App({
  organization: 'Contoso',
  project: 'ECommerce',
});

const backend = new SubscriptionStack(app, 'Backend', {
  subscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
  environment: 'prod',
  instance: 1,
});

const rg = new ResourceGroups(backend, 'Backend', {
  tags: { tier: 'backend' },
});

const appPlan = new ServerFarms(backend, 'AppPlan', {
  resourceGroup: rg,
  sku: { name: 'P1V2', tier: 'PremiumV2' },
});

const api = new Sites(backend, 'API', {
  resourceGroup: rg,
  serverFarmId: appPlan.id,
});

const sqlServer = new Servers(backend, 'Database', {
  resourceGroup: rg,
  administratorLogin: 'sqladmin',
});

const sqlDb = new Databases(backend, 'Products', {
  resourceGroup: rg,
  sku: { name: 'S0', tier: 'Standard' },
});

app.synth();
```

### Frontend Package (`packages/frontend/bin/app.ts`)

```typescript
import { App, SubscriptionStack } from '@atakora/cdk';
import { ResourceGroups } from '@atakora/cdk/resources';
import { StaticSites } from '@atakora/cdk/web';
import { Profiles, Endpoints } from '@atakora/cdk/cdn';

const app = new App({
  organization: 'Contoso',
  project: 'ECommerce',
});

const frontend = new SubscriptionStack(app, 'Frontend', {
  subscriptionId: process.env.AZURE_SUBSCRIPTION_ID!,
  environment: 'prod',
  instance: 1,
});

const rg = new ResourceGroups(frontend, 'Frontend', {
  tags: { tier: 'frontend' },
});

const staticSite = new StaticSites(frontend, 'WebApp', {
  resourceGroup: rg,
  sku: { name: 'Standard', tier: 'Standard' },
});

const cdn = new Profiles(frontend, 'CDN', {
  resourceGroup: rg,
  sku: { name: 'Standard_Microsoft' },
});

const endpoint = new Endpoints(frontend, 'Endpoint', {
  resourceGroup: rg,
  originHostName: staticSite.defaultHostname,
});

app.synth();
```

### Deployment Workflow

```bash
# Synthesize both packages
npx atakora synth --all

# Deploy backend first (creates databases, APIs)
az deployment sub create \
  --location eastus \
  --template-file .atakora/arm.out/backend/Backend.json

# Deploy frontend second (connects to backend APIs)
az deployment sub create \
  --location eastus \
  --template-file .atakora/arm.out/frontend/Frontend.json
```

## Example: Environment-Based Packages

Separate environments into distinct packages for isolation and different configurations.

### Project Structure

```
multi-env-infra/
├── .atakora/
│   └── manifest.json
├── packages/
│   ├── dev/
│   ├── staging/
│   └── prod/
└── package.json
```

### Development Package (`packages/dev/bin/app.ts`)

```typescript
import { App, SubscriptionStack } from '@atakora/cdk';
import { ResourceGroups } from '@atakora/cdk/resources';

const app = new App({
  organization: 'Contoso',
  project: 'MultiEnv',
});

const dev = new SubscriptionStack(app, 'Dev', {
  subscriptionId: process.env.AZURE_DEV_SUBSCRIPTION_ID!,
  environment: 'nonprod',
  instance: 1,
});

const rg = new ResourceGroups(dev, 'DevResources', {
  tags: {
    environment: 'development',
    costCenter: 'engineering',
  },
});

// Dev-specific resources with relaxed configurations
// - Lower SKUs for cost savings
// - Less restrictive network policies
// - Shorter retention periods

app.synth();
```

### Production Package (`packages/prod/bin/app.ts`)

```typescript
import { App, SubscriptionStack } from '@atakora/cdk';
import { ResourceGroups } from '@atakora/cdk/resources';

const app = new App({
  organization: 'Contoso',
  project: 'MultiEnv',
});

const prod = new SubscriptionStack(app, 'Prod', {
  subscriptionId: process.env.AZURE_PROD_SUBSCRIPTION_ID!,
  environment: 'prod',
  instance: 1,
});

const rg = new ResourceGroups(prod, 'ProdResources', {
  tags: {
    environment: 'production',
    costCenter: 'operations',
    compliance: 'required',
  },
});

// Production resources with enterprise configurations
// - High availability SKUs
// - Strict network security
// - Extended retention and backup policies

app.synth();
```

## Cross-Package References

While packages are independent, you sometimes need to reference resources across packages.

### Using Outputs and Parameters

Export outputs from one package and import them as parameters in another.

**Backend package exports API URL:**

```typescript
// In backend package
import { StackOutput } from '@atakora/cdk';

new StackOutput(backend, 'APIUrl', {
  value: api.defaultHostName,
  description: 'Backend API URL',
});
```

**Frontend package imports API URL:**

```typescript
// In frontend package - use as deployment parameter
const apiUrl = process.env.BACKEND_API_URL || 'https://api.contoso.com';

const appSettings = {
  VITE_API_URL: apiUrl,
};
```

### Shared Configuration Module

Create a shared TypeScript module for common configuration:

```typescript
// packages/shared/config.ts
export const sharedConfig = {
  organization: 'Contoso',
  project: 'ECommerce',
  regions: {
    primary: 'eastus',
    secondary: 'westus',
  },
  tags: {
    managedBy: 'atakora',
    owner: 'platform-team',
  },
};
```

Import in any package:

```typescript
import { App } from '@atakora/cdk';
import { sharedConfig } from '../shared/config';

const app = new App({
  organization: sharedConfig.organization,
  project: sharedConfig.project,
});
```

## Best Practices

### 1. Keep Packages Focused

Each package should have a clear, single responsibility:

- One deployment boundary
- One team's ownership
- One logical grouping of resources

Avoid creating too many small packages or too few large ones.

### 2. Use Workspace Dependencies

Share common code using npm workspace dependencies:

```json
{
  "name": "@myorg/frontend",
  "dependencies": {
    "@myorg/shared-config": "*",
    "@atakora/cdk": "^1.0.0"
  }
}
```

### 3. Independent Deployment

Design packages to deploy independently without breaking dependencies:

- Use loose coupling between packages
- Avoid hard-coded references
- Use parameters for cross-package values

### 4. Consistent Naming

Use descriptive, consistent package names:

- `backend`, `frontend` - by tier
- `networking`, `security`, `applications` - by function
- `dev`, `staging`, `prod` - by environment
- `platform`, `data`, `analytics` - by team

### 5. Document Dependencies

If packages have deployment order requirements, document them:

```markdown
## Deployment Order

1. `networking` - Creates VNets and subnets
2. `security` - Creates Key Vault and policies
3. `backend` - Creates app services and databases
4. `frontend` - Creates CDN and static sites
```

### 6. Version Control

Each package can evolve independently:

- Track changes per package in commit messages
- Create pull requests scoped to specific packages
- Use separate CI/CD pipelines per package if needed

## Migrating to Multi-Package

If you have a single-package project, you can migrate to multi-package:

1. **Add new packages** for the new structure:

   ```bash
   npx atakora add networking
   npx atakora add applications
   ```

2. **Move resources** from the original package to new packages by copying and organizing the infrastructure code

3. **Update references** between packages using outputs and parameters

4. **Test synthesis** for each package:

   ```bash
   npx atakora synth --all
   ```

5. **Deploy incrementally**, starting with foundational packages

## Troubleshooting

### Package Not Found

If `atakora synth --package frontend` fails with "Package not found":

- Check `.atakora/manifest.json` has the package listed
- Verify the package directory exists at `packages/frontend/`
- Ensure `bin/app.ts` exists in the package

### Synthesis Errors

If synthesis fails for a specific package:

- Check the package's `bin/app.ts` for TypeScript errors
- Verify all imports are available
- Run `npm install` to ensure dependencies are installed

### Circular Dependencies

If packages reference each other circularly:

- Redesign to use a unidirectional dependency flow
- Extract shared code to a `shared` package
- Use environment variables or parameters instead of direct imports

## Next Steps

- **[Manifest Schema Reference](../reference/manifest-schema.md)** - Understand the manifest structure
- **[CLI Commands Reference](../reference/cli-commands.md)** - Learn all package management commands
- **Testing Multi-Package Projects** - Strategies for testing across packages (coming soon)
- **CI/CD for Multi-Package** - Set up pipelines for package-based deployment (coming soon)
