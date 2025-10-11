# Simple Web App Example

**Navigation**: [Docs Home](../../README.md) > [Examples](../README.md) > Simple Web App

A complete, production-ready web application infrastructure demonstrating best practices for deploying a Node.js web application with database, storage, and monitoring on Azure.

## What This Example Includes

- **App Service** with Linux Node.js 18 LTS runtime
- **App Service Plan** with environment-specific SKU tiers
- **SQL Database** with SQL Server for application data
- **Storage Account** with blob containers for files and logs
- **Application Insights** for monitoring and diagnostics
- **Virtual Network** with subnet delegation for App Service integration
- **Staging slot** support for zero-downtime deployments
- **Environment-specific configuration** (dev, staging, prod)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│            Azure Resource Group                     │
│                                                     │
│  ┌───────────────────────────────────────────┐     │
│  │  Virtual Network (10.0.0.0/16)            │     │
│  │  └─ App Subnet (10.0.1.0/24)              │     │
│  │     └─ Delegated to App Service           │     │
│  └───────────────────────────────────────────┘     │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐               │
│  │  App Service │  │  SQL Server  │               │
│  │  ┌────────┐  │  │  ┌────────┐  │               │
│  │  │ WebApp │  │  │  │Database│  │               │
│  │  │Node 18 │◄─┼──┼─►│webapp  │  │               │
│  │  └────────┘  │  │  │  -db   │  │               │
│  └──────────────┘  │  └────────┘  │               │
│         │          └──────────────┘               │
│         │                                          │
│         ▼                                          │
│  ┌──────────────┐  ┌──────────────┐               │
│  │   Storage    │  │ Application  │               │
│  │   Account    │  │   Insights   │               │
│  │ ┌──────────┐ │  │              │               │
│  │ │files     │ │  │  Monitoring  │               │
│  │ │logs      │ │  │  Telemetry   │               │
│  │ └──────────┘ │  │  Logs        │               │
│  └──────────────┘  └──────────────┘               │
└─────────────────────────────────────────────────────┘
```

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed
- **Azure CLI** installed and authenticated (`az login`)
- **Atakora CLI** installed (`npm install -g @atakora/cli`)
- **Active Azure subscription** with contributor access
- **TypeScript** knowledge (basic understanding)

## Quick Start

### 1. Clone or Navigate to Example

```bash
cd docs/examples/simple-web-app
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- `@atakora/lib` - Core framework
- `@atakora/cdk` - Azure resource constructs
- TypeScript and type definitions

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set required variables:

```env
# Required
AZURE_SUBSCRIPTION_ID=your-subscription-id-here
ENVIRONMENT=dev

# SQL Server Admin (CHANGE THESE!)
SQL_ADMIN_USERNAME=sqladmin
SQL_ADMIN_PASSWORD=YourSecurePassword123!

# Optional
AZURE_LOCATION=eastus2
ORGANIZATION=Contoso
PROJECT=SimpleWebApp
```

**Security Note**: Never commit `.env` files to version control. For production, use Azure Key Vault to manage secrets.

### 4. Get Your Subscription ID

```bash
# Get current subscription ID
az account show --query id --output tsv

# Or list all subscriptions
az account list --output table
```

### 5. Synthesize ARM Templates

Generate ARM templates from TypeScript code:

```bash
npm run synth
```

**Expected output**:
```
✓ Compiled TypeScript
✓ Synthesized 1 stack
✓ Validated templates

Resources Created:
- Resource Group: rg-webapp-dev
- Virtual Network: vnet-webapp-dev
- Storage Account: stwebappdev######
- SQL Server: sql-webapp-dev-######
- SQL Database: webapp-db
- Application Insights: ai-webapp-dev
- App Service Plan: asp-webapp-dev
- Web App: webapp-dev-######
```

Templates are generated in `.atakora/arm.out/`.

### 6. Review What Will Be Deployed

```bash
npm run diff
```

This shows a preview of resources that will be created.

### 7. Deploy to Azure

```bash
npm run deploy
```

The deployment takes approximately 3-5 minutes. You'll be prompted to confirm before deployment begins.

### 8. Access Your Web App

After deployment completes, access your web app:

```bash
# Get the web app URL from deployment outputs
# or construct it manually:
echo "https://webapp-dev-[random].azurewebsites.net"
```

Visit the URL in your browser to see your deployed application.

## Project Structure

```
simple-web-app/
├── src/
│   └── app.ts              # Infrastructure code (main entry point)
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── atakora.json            # Atakora manifest
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Infrastructure Code Overview

The infrastructure is defined in `src/app.ts`:

```typescript
// Import Atakora core and resource constructs
import { AzureApp, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks, Subnets } from '@atakora/cdk/network';
import { StorageAccounts, BlobContainers } from '@atakora/cdk/storage';
import { ServerFarms, Sites } from '@atakora/cdk/web';
import { Servers, Databases } from '@atakora/cdk/sql';
import { Components } from '@atakora/cdk/insights';

// Create application
const app = new AzureApp({
  organization: 'Contoso',
  project: 'SimpleWebApp',
});

// Create stack
const stack = new ResourceGroupStack(app, 'WebAppStack', {
  resourceGroupName: 'rg-webapp-dev',
  location: 'eastus2',
  tags: {
    environment: 'dev',
    application: 'simple-web-app',
  },
});

// Add resources...
// (See src/app.ts for complete implementation)

// Synthesize to ARM templates
app.synth();
```

### Key Features

**Environment-Specific Configuration**: Different SKUs and settings for dev/staging/prod:

```typescript
const config = {
  dev: {
    appServicePlanSku: 'B1',      // Basic tier
    sqlDatabaseSku: 'Basic',
    storageSku: 'Standard_LRS',
  },
  prod: {
    appServicePlanSku: 'P1v3',    // Premium tier
    sqlDatabaseSku: 'S1',
    storageSku: 'Standard_GRS',   // Geo-redundant
  },
}[environment];
```

**Virtual Network Integration**: Secure communication between services:

```typescript
const appSubnet = new Subnets(stack, 'AppSubnet', {
  virtualNetworkName: vnet.name,
  subnetName: 'snet-app',
  addressPrefix: '10.0.1.0/24',
  delegations: [{
    name: 'app-service-delegation',
    properties: {
      serviceName: 'Microsoft.Web/serverFarms',
    },
  }],
});
```

**Application Insights Integration**: Automatic monitoring:

```typescript
const appInsights = new Components(stack, 'AppInsights', {
  resourceName: 'ai-webapp-dev',
  applicationType: 'web',
  kind: 'web',
});

// Connected to Web App via app settings
appSettings: [
  {
    name: 'APPINSIGHTS_INSTRUMENTATIONKEY',
    value: appInsights.instrumentationKey,
  },
  // ...
]
```

## Available Commands

```bash
# Build TypeScript
npm run build

# Synthesize ARM templates
npm run synth

# Deploy to Azure
npm run deploy

# Show deployment diff
npm run diff

# Destroy all resources
npm run destroy

# Clean build artifacts
npm run clean
```

## Multi-Environment Deployment

Deploy to different environments by changing the `ENVIRONMENT` variable:

### Development

```bash
ENVIRONMENT=dev npm run deploy
```

### Staging

```bash
ENVIRONMENT=staging npm run deploy
```

### Production

```bash
ENVIRONMENT=prod npm run deploy
```

Each environment gets:
- Separate resource group
- Environment-appropriate SKUs
- Environment-specific tags
- Isolated resources

## Connecting Your Application Code

After infrastructure is deployed, configure your application:

### Environment Variables

Set these in your application code or CI/CD pipeline:

```env
DATABASE_URL=Server=tcp:sql-webapp-dev-######.database.windows.net,1433;Database=webapp-db;User ID=sqladmin;Password=***;Encrypt=true;
STORAGE_CONNECTION_STRING=[from Azure Portal or deployment outputs]
APPINSIGHTS_INSTRUMENTATIONKEY=[from deployment outputs]
```

### Node.js Example

```javascript
// app.js
const { DefaultAzureCredential } = require('@azure/identity');
const { BlobServiceClient } = require('@azure/storage-blob');
const sql = require('mssql');

// Database connection
const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
  },
  options: {
    encrypt: true,
  },
};

const pool = await sql.connect(dbConfig);

// Storage access
const blobServiceClient = BlobServiceClient.fromConnectionString(
  process.env.STORAGE_CONNECTION_STRING
);
const containerClient = blobServiceClient.getContainerClient('files');

// Application Insights
const appInsights = require('applicationinsights');
appInsights.setup(process.env.APPINSIGHTS_INSTRUMENTATIONKEY)
  .setAutoDependencyCorrelation(true)
  .setAutoCollectRequests(true)
  .start();
```

## Cost Estimation

Approximate monthly costs (US East 2 region):

### Development Environment
- **App Service Plan (B1)**: $13.14/month
- **SQL Database (Basic)**: $4.99/month
- **Storage Account (LRS, 10GB)**: $0.20/month
- **Application Insights**: $2-5/month (depends on usage)
- **Virtual Network**: Free (< 500GB egress)

**Total**: ~$20-25/month

### Production Environment
- **App Service Plan (P1v3)**: $182.50/month
- **SQL Database (S1)**: $30/month
- **Storage Account (GRS, 100GB)**: $5/month
- **Application Insights**: $10-20/month
- **Virtual Network**: Free (< 500GB egress)

**Total**: ~$227-257/month

**Note**: Actual costs may vary based on usage, data transfer, and region.

## Security Best Practices

This example implements several security best practices:

1. **HTTPS Only**: All web traffic encrypted
2. **Minimum TLS 1.2**: Modern encryption standards
3. **SQL Server Firewall**: Restricted access
4. **Storage Account**: Public access disabled
5. **FTP Disabled**: FTPS only for deployments
6. **Virtual Network Integration**: Isolated network communication
7. **Application Insights**: Security monitoring and anomaly detection

### For Production Deployments

Additional security measures to implement:

- **Azure Key Vault**: Store secrets and connection strings
- **Managed Identity**: Eliminate hardcoded credentials
- **Private Endpoints**: Completely private connectivity
- **Azure AD Authentication**: Replace SQL username/password
- **WAF/Application Gateway**: DDoS protection
- **Network Security Groups**: Fine-grained traffic control

## Troubleshooting

### Deployment Fails: Storage Account Name Already Exists

**Problem**: Storage account names must be globally unique.

**Solution**: The code automatically appends random characters. If deployment still fails, manually set a unique name in `src/app.ts`.

### Cannot Connect to SQL Database

**Problem**: SQL Server firewall blocks connections.

**Solution**: Add your IP address to SQL Server firewall:

```bash
az sql server firewall-rule create \
  --resource-group rg-webapp-dev \
  --server sql-webapp-dev-###### \
  --name AllowMyIP \
  --start-ip-address YOUR_IP \
  --end-ip-address YOUR_IP
```

### TypeScript Compilation Errors

**Problem**: Missing type definitions or syntax errors.

**Solution**:

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Verify TypeScript version
npx tsc --version
```

### Environment Variables Not Found

**Problem**: `.env` file not loaded or variables not set.

**Solution**:

```bash
# Verify .env file exists
cat .env

# Export manually for testing
export AZURE_SUBSCRIPTION_ID=your-sub-id
export ENVIRONMENT=dev
export SQL_ADMIN_PASSWORD=YourPassword123!
```

## Cleanup

To delete all resources and avoid ongoing costs:

```bash
# Using npm script
npm run destroy

# Or manually using Azure CLI
az group delete \
  --name rg-webapp-dev \
  --yes \
  --no-wait
```

**Warning**: This permanently deletes all resources in the resource group, including databases and storage. Ensure you have backups if needed.

## Next Steps

After deploying this example, you can:

1. **Deploy Your Application Code**: Use Azure DevOps, GitHub Actions, or VS Code to deploy your Node.js application
2. **Add Custom Domain**: Configure a custom domain name with SSL certificate
3. **Configure CI/CD**: Automate deployments with GitHub Actions (see [CI/CD Tutorial](../../guides/tutorials/ci-cd-pipeline.md))
4. **Scale Up**: Increase App Service Plan SKU for better performance
5. **Add Redis Cache**: Improve application performance with Azure Cache for Redis
6. **Enable Autoscaling**: Configure autoscaling rules based on metrics
7. **Multi-Region**: Deploy to multiple regions (see [Multi-Region Example](../multi-region-app/README.md))

## Learn More

- **[App Service Documentation](https://docs.microsoft.com/azure/app-service/)**
- **[SQL Database Documentation](https://docs.microsoft.com/azure/azure-sql/)**
- **[Application Insights Documentation](https://docs.microsoft.com/azure/azure-monitor/app/app-insights-overview)**
- **[Web App Tutorial](../../guides/tutorials/web-app-with-database.md)**
- **[CI/CD Pipeline Guide](../../guides/tutorials/ci-cd-pipeline.md)**

## See Also

- [Multi-Region Application Example](../multi-region-app/README.md) - Cross-region deployment
- [Government Cloud Example](../government-cloud/README.md) - Azure Government Cloud
- [Web Resources API Reference](../../reference/api/cdk/web.md) - Complete API documentation
- [Storage Resources API Reference](../../reference/api/cdk/storage.md)
- [SQL Resources API Reference](../../reference/api/cdk/sql.md)

---

**Example Status**: Production-Ready
**Last Updated**: 2025-10-09
**Atakora Version**: 1.0.0+
