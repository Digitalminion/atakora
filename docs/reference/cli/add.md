# atakora add

**Navigation**: [Docs Home](../../README.md) > [Reference](../README.md) > [CLI Reference](./README.md) > add

---

## Synopsis

```bash
atakora add <package-name> [options]
```

## Description

Adds a new infrastructure package to an existing Atakora workspace. Creates a complete package directory with TypeScript entry point, configuration files, and registers it in the project manifest.

Use this command to:
- Add environment-specific infrastructure (dev, staging, production)
- Create component-based packages (frontend, backend, database)
- Organize infrastructure into logical units
- Set up multi-region deployments

## Arguments

### `<package-name>`

Name of the package to create.

- **Required**: yes
- **Type**: string
- **Format**: lowercase letters, numbers, hyphens (1-30 characters)
- **Examples**: `production`, `dev-environment`, `api-backend`

## Options

### `--environment <env>`

The deployment environment for this package.

- **Type**: string
- **Default**: Prompts user or "production" in non-interactive mode
- **Values**: `development`, `staging`, `production`, or custom
- **Example**: `--environment staging`

Affects:
- Resource naming conventions
- Tag values
- Stack configuration

### `--location <region>`

Azure region where resources will be deployed.

- **Type**: string
- **Default**: Prompts user or "eastus" in non-interactive mode
- **Examples**: `eastus`, `westus2`, `northeurope`, `usgovvirginia`
- **Example**: `--location westus2`

See [Azure Regions](https://azure.microsoft.com/en-us/global-infrastructure/geographies/) for available regions.

### `--template <name>`

Template to use for package scaffolding.

- **Type**: string
- **Default**: `basic`
- **Values**: `basic`, `webapp`, `api`, `database`, `minimal`
- **Example**: `--template webapp`

Available templates:
- **basic**: Virtual network, storage account, key vault
- **webapp**: App Service, database, storage
- **api**: API Management, Functions, Application Insights
- **database**: SQL Server, Cosmos DB, Redis
- **minimal**: Empty stack with comments

### `--non-interactive`

Skip prompts and use defaults or provided options.

- **Type**: boolean (flag)
- **Default**: `false`
- **Example**: `atakora add staging --non-interactive`

## Examples

### Interactive Mode (Default)

Add package with prompts:

```bash
atakora add production
```

Prompts:
```
? Environment: (production)
? Azure region: (eastus)
? Template: (Use arrow keys)
  ❯ basic - Virtual network, storage, and key vault
    webapp - Full web application stack
    api - API backend infrastructure
    database - Database-centric infrastructure
    minimal - Empty stack to build from scratch
```

### Add Environment-Specific Package

Create staging environment:

```bash
atakora add staging --environment staging --location eastus2
```

Creates:
```
packages/staging/
├── bin/
│   └── app.ts          # Stack with environment: 'staging'
├── package.json
└── tsconfig.json
```

### Add with Template

Create web application package:

```bash
atakora add webapp --template webapp --environment production
```

Generates stack with:
- App Service Plan
- Web App
- SQL Database
- Application Insights
- Storage Account

### Non-Interactive Mode

Add package without prompts:

```bash
atakora add production \
  --non-interactive \
  --environment production \
  --location westus2 \
  --template basic
```

### Multiple Packages

Add multiple environments:

```bash
atakora add dev --environment development --location eastus
atakora add staging --environment staging --location eastus
atakora add production --environment production --location westus2
```

## Package Structure

### Generated Files

Each package gets a complete TypeScript project:

```
packages/<package-name>/
├── bin/
│   └── app.ts          # Infrastructure entry point
├── package.json        # Package configuration
├── tsconfig.json       # TypeScript config
└── README.md           # Package documentation
```

### Entry Point (bin/app.ts)

**Basic Template**:

```typescript
import { App, Stack } from '@atakora/lib';
import { ResourceGroup } from '@atakora/cdk/resources';
import { VirtualNetwork } from '@atakora/cdk/network';
import { StorageAccount } from '@atakora/cdk/storage';
import { KeyVault } from '@atakora/cdk/keyvault';

class ProductionStack extends Stack {
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
    const vnet = new VirtualNetwork(this, 'VNet', {
      resourceGroup: rg,
      addressSpace: {
        addressPrefixes: ['10.0.0.0/16']
      }
    });

    // Storage Account
    const storage = new StorageAccount(this, 'Storage', {
      resourceGroup: rg,
      sku: { name: 'Standard_LRS' }
    });

    // Key Vault
    new KeyVault(this, 'Vault', {
      resourceGroup: rg,
      tenantId: process.env.AZURE_TENANT_ID!
    });
  }
}

const app = new App();
new ProductionStack(app, 'production');
app.synth();
```

**Web App Template**:

```typescript
import { App, Stack } from '@atakora/lib';
import { ResourceGroup } from '@atakora/cdk/resources';
import { AppServicePlan, WebApp } from '@atakora/cdk/web';
import { SqlServer, SqlDatabase } from '@atakora/cdk/sql';
import { ApplicationInsights } from '@atakora/cdk/insights';
import { StorageAccount, BlobContainer } from '@atakora/cdk/storage';

class WebAppStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      environment: 'production',
      location: 'eastus'
    });

    const rg = new ResourceGroup(this, 'ResourceGroup', {
      location: this.location
    });

    // App Service
    const plan = new AppServicePlan(this, 'AppPlan', {
      resourceGroup: rg,
      sku: { name: 'P1v2', tier: 'PremiumV2' }
    });

    const webapp = new WebApp(this, 'WebApp', {
      resourceGroup: rg,
      serverFarmId: plan.id,
      httpsOnly: true,
      siteConfig: {
        alwaysOn: true,
        minTlsVersion: '1.2'
      }
    });

    // Database
    const sqlServer = new SqlServer(this, 'SqlServer', {
      resourceGroup: rg,
      administratorLogin: 'sqladmin',
      administratorLoginPassword: process.env.SQL_ADMIN_PASSWORD!,
      version: '12.0'
    });

    new SqlDatabase(this, 'Database', {
      resourceGroup: rg,
      server: sqlServer,
      sku: { name: 'S1', tier: 'Standard' }
    });

    // Monitoring
    new ApplicationInsights(this, 'AppInsights', {
      resourceGroup: rg,
      applicationType: 'web'
    });

    // Storage
    const storage = new StorageAccount(this, 'Storage', {
      resourceGroup: rg,
      sku: { name: 'Standard_GRS' }
    });

    new BlobContainer(this, 'Assets', {
      storageAccount: storage,
      publicAccess: 'None'
    });
  }
}

const app = new App();
new WebAppStack(app, 'webapp');
app.synth();
```

### Package Configuration (package.json)

```json
{
  "name": "production",
  "version": "1.0.0",
  "private": true,
  "main": "bin/app.ts",
  "scripts": {
    "build": "tsc",
    "synth": "ts-node bin/app.ts",
    "watch": "tsc --watch"
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

### Manifest Update

The package is registered in `.atakora/manifest.json`:

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
    },
    {
      "name": "production",
      "path": "./packages/production",
      "entry": "./bin/app.ts",
      "environment": "production",
      "location": "eastus",
      "created": "2025-10-08T13:00:00.000Z"
    }
  ],
  "defaultPackage": "backend"
}
```

## Validation

### Package Name Validation

**Rules**:
- 1-30 characters
- Lowercase letters, numbers, hyphens only
- Must start with a letter
- No consecutive hyphens

**Valid Examples**:
- `production`
- `dev-environment`
- `api-backend-v2`

**Invalid Examples**:
- `Production` (uppercase)
- `my_package` (underscore)
- `123-package` (starts with number)
- `my--package` (consecutive hyphens)

### Duplicate Check

**Error if package already exists**:
```
Package 'production' already exists at packages/production
```

**Solution**: Use a different name or remove existing package:
```bash
rm -rf packages/production
atakora add production
```

### Directory Validation

**Checks**:
- `packages/` directory exists
- No existing directory with same name
- Write permissions on `packages/` folder

## Exit Codes

| Code | Condition | Solution |
|------|-----------|----------|
| 0 | Package created successfully | Install deps and start coding |
| 1 | Package already exists | Choose different name |
| 2 | Invalid package name | Fix validation error |
| 3 | Not in Atakora project | Run `atakora init` first |
| 4 | File system error | Check permissions |

## Common Issues

### Not in Atakora Project

**Error**:
```
Not in an Atakora project!
Run 'atakora init' to create a new project.
```

**Cause**: No `.atakora/manifest.json` found.

**Solution**: Initialize project first:
```bash
atakora init
```

### Package Already Exists

**Error**:
```
Package 'production' already exists
```

**Cause**: Directory `packages/production/` exists.

**Solutions**:
1. Use different name:
   ```bash
   atakora add production-v2
   ```

2. Remove existing package:
   ```bash
   rm -rf packages/production
   atakora add production
   ```

3. Edit existing package manually

### Invalid Environment Name

**Warning**:
```
Environment 'prod' is non-standard. Did you mean 'production'?
Continue anyway? (y/N)
```

**Cause**: Using custom environment name.

**Solution**:
- Use standard names (`development`, `staging`, `production`)
- Or confirm to use custom name

## Best Practices

### Environment Naming

Use consistent, standard environment names:

```bash
atakora add dev --environment development
atakora add staging --environment staging
atakora add prod --environment production
```

### Regional Separation

Create region-specific packages for multi-region:

```bash
atakora add prod-eastus --environment production --location eastus
atakora add prod-westus --environment production --location westus2
atakora add prod-europe --environment production --location northeurope
```

### Component-Based Organization

Organize by application component:

```bash
atakora add frontend --template webapp
atakora add backend --template api
atakora add database --template database
atakora add shared --template basic
```

### Template Selection

Choose templates based on use case:

**Basic**: General-purpose infrastructure
```bash
atakora add infra --template basic
```

**Web App**: Full web application
```bash
atakora add webapp --template webapp
```

**API**: Microservices backend
```bash
atakora add api --template api
```

**Database**: Data layer
```bash
atakora add data --template database
```

**Minimal**: Starting from scratch
```bash
atakora add custom --template minimal
```

## After Adding a Package

1. **Install dependencies**:
   ```bash
   cd packages/production
   npm install
   ```

2. **Edit infrastructure code**:
   ```bash
   code packages/production/bin/app.ts
   ```

3. **Synthesize templates**:
   ```bash
   atakora synth --package production
   ```

4. **Set as default** (optional):
   ```bash
   atakora set-default production
   ```

5. **Deploy**:
   ```bash
   atakora deploy --package production
   ```

## See Also

- [`atakora init`](./init.md) - Initialize project
- [`atakora set-default`](./set-default.md) - Set active package
- [`atakora synth`](./synth.md) - Synthesize templates
- [Organizing Projects Guide](../../guides/workflows/organizing-projects.md)
- [Multi-Environment Deployments](../../guides/workflows/deploying-environments.md)

---

**Last Updated**: 2025-10-08
**CLI Version**: 1.0.0+
