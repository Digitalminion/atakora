# Simple Web App Example

**Navigation**: [Docs Home](../../README.md) > [Examples](../README.md) > Simple Web App

---

## Overview

This example demonstrates a basic web application infrastructure including:
- Resource Group
- App Service Plan
- Web App
- SQL Server and Database
- Application Insights
- Storage Account

## Architecture

```
┌─────────────────────────────────┐
│      Resource Group             │
│  ┌────────────┐  ┌────────────┐ │
│  │  Web App   │  │  SQL DB    │ │
│  │ (App Plan) │  │ (SQL Svr)  │ │
│  └────────────┘  └────────────┘ │
│  ┌────────────┐  ┌────────────┐ │
│  │   Storage  │  │  App       │ │
│  │            │  │ Insights   │ │
│  └────────────┘  └────────────┘ │
└─────────────────────────────────┘
```

## Prerequisites

- Node.js 18+
- Azure subscription
- Atakora CLI installed

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
SQL_ADMIN_PASSWORD=YourSecurePassword123!
AZURE_TENANT_ID=00000000-0000-0000-0000-000000000000
AZURE_CLIENT_ID=11111111-1111-1111-1111-111111111111
AZURE_CLIENT_SECRET=your-secret
AZURE_SUBSCRIPTION_ID=22222222-2222-2222-2222-222222222222
```

### 3. Configure Azure Credentials

```bash
atakora config set-credentials
```

## Infrastructure Code

### bin/app.ts

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

    // Resource Group
    const rg = new ResourceGroup(this, 'ResourceGroup', {
      location: this.location
    });

    // App Service
    const plan = new AppServicePlan(this, 'AppPlan', {
      resourceGroup: rg,
      sku: { name: 'B1', tier: 'Basic' }
    });

    const webapp = new WebApp(this, 'WebApp', {
      resourceGroup: rg,
      serverFarmId: plan.id,
      httpsOnly: true,
      siteConfig: {
        alwaysOn: false,  // Not available in Basic tier
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
      sku: { name: 'Basic', tier: 'Basic' }
    });

    // Storage
    const storage = new StorageAccount(this, 'Storage', {
      resourceGroup: rg,
      sku: { name: 'Standard_LRS' }
    });

    new BlobContainer(this, 'Assets', {
      storageAccount: storage,
      publicAccess: 'None'
    });

    // Monitoring
    new ApplicationInsights(this, 'AppInsights', {
      resourceGroup: rg,
      applicationType: 'web'
    });
  }
}

const app = new App();
new WebAppStack(app, 'simple-web-app');
app.synth();
```

## Deployment

### Synthesize Templates

```bash
atakora synth
```

### Review Changes

```bash
atakora diff
```

### Deploy to Azure

```bash
atakora deploy
```

## Accessing Resources

After deployment:

### Web App URL

```bash
# Get web app URL
az webapp show \
  --name app-simple-web-app-production-eastus \
  --resource-group rg-simple-web-app-production-eastus \
  --query defaultHostName -o tsv
```

### SQL Connection String

```bash
# Get SQL server FQDN
az sql server show \
  --name sql-simple-web-app-production-eastus \
  --resource-group rg-simple-web-app-production-eastus \
  --query fullyQualifiedDomainName -o tsv
```

Connection string:
```
Server=tcp:sql-simple-web-app-production-eastus.database.windows.net,1433;Initial Catalog=sqldb-database;Persist Security Info=False;User ID=sqladmin;Password={password};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

## Cost Estimate

Monthly cost (East US region):
- App Service Plan (B1): ~$13
- SQL Database (Basic): ~$5
- Storage Account (LRS): ~$1
- Application Insights: ~$2

**Total**: ~$21/month

## Cleanup

```bash
az group delete \
  --name rg-simple-web-app-production-eastus \
  --yes --no-wait
```

## Next Steps

- Scale up to production tier
- Add custom domain
- Configure CI/CD
- Add caching layer

## See Also

- [Multi-Region Example](../multi-region-app/README.md)
- [Web App Tutorial](../../guides/tutorials/web-app-with-database.md)
- [App Service API Reference](../../reference/api/cdk/web.md)

---

**Last Updated**: 2025-10-08
