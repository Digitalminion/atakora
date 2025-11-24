# Getting Started with Atakora Backend Simple

This guide walks you through creating your first Atakora backend in **5 minutes**.

## Prerequisites

- Node.js 20+ installed
- Azure account
- Azure CLI installed (`az` command)

## Step 1: Set Up Azure AD

You need an Azure AD app registration for authentication.

### Option A: Using Azure Portal (GUI)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** (or **Microsoft Entra ID**)
3. Click **App registrations** → **New registration**
   - Name: `my-atakora-app`
   - Supported account types: **Accounts in this organizational directory only**
   - Click **Register**
4. Copy these values:
   - **Application (client) ID** → Save as `AZURE_CLIENT_ID`
   - **Directory (tenant) ID** → Save as `AZURE_TENANT_ID`

### Option B: Using Azure CLI (Command Line)

```bash
# Login to Azure
az login

# Create app registration
az ad app create --display-name "my-atakora-app"

# Get the values
AZURE_CLIENT_ID=$(az ad app list --display-name "my-atakora-app" --query "[0].appId" -o tsv)
AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)

# Print them
echo "AZURE_CLIENT_ID=$AZURE_CLIENT_ID"
echo "AZURE_TENANT_ID=$AZURE_TENANT_ID"
```

## Step 2: Configure Environment

Create a `.env` file in this directory:

```bash
# Copy the example
cp .env.example .env

# Edit with your values
nano .env  # or use your favorite editor
```

Update these values in `.env`:

```bash
AZURE_TENANT_ID=your-tenant-id-here
AZURE_CLIENT_ID=your-client-id-here
NODE_ENV=development
```

## Step 3: Install Dependencies

```bash
# From the monorepo root
npm install

# Or from this package
cd packages/backend-simple
npm install
```

## Step 4: Build

```bash
npm run build
```

You should see TypeScript compile successfully.

## Step 5: Review Your Schema

Open `src/schema/resource.ts` to see what's defined:

**CRUD Models:**

- `User` - Auto-generates 5 REST endpoints
- `Project` - Demonstrates foreign keys and organization-based access

**Event Models:**

- `DataUploaded` - Queue + processor for async file processing
- `ValidationRequested` - Example of event chaining

**Function Models:**

- `GenerateReport` - Custom function with complex input/output
- `SearchData` - Search functionality

**What you get automatically:**

- REST APIs for all CRUD operations
- Event publishing endpoints
- Custom function endpoints
- Cosmos DB containers
- Azure Storage queues
- TypeScript types
- Input/output validation
- Authentication on all endpoints
- Authorization rules enforced

## Step 6: Deploy (Development)

```bash
# Deploy to Azure
npx atakora deploy --environment development
```

This will:

1. Provision all Azure resources (takes 3-5 minutes first time)
2. Deploy your functions
3. Set up Cosmos DB containers
4. Configure authentication
5. Output your API URLs

**Resources created:**

- Function App (Consumption plan - free tier)
- Cosmos DB (Serverless - pay per use)
- Storage Account (for queues)
- Application Insights
- Key Vault
- Managed Identity

**Estimated cost:** $0-10/month

## Step 7: Test Your APIs

Once deployed, you'll get endpoint URLs like:

```
https://my-app-dev.azurewebsites.net
```

### Test CRUD Endpoints

**Create a user:**

```bash
# Get auth token first (use your Azure AD credentials)
TOKEN=$(az account get-access-token --resource $AZURE_CLIENT_ID --query accessToken -o tsv)

# Create user
curl -X POST https://my-app-dev.azurewebsites.net/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user"
  }'
```

**List users:**

```bash
curl https://my-app-dev.azurewebsites.net/api/users \
  -H "Authorization: Bearer $TOKEN"
```

**Get user by ID:**

```bash
curl https://my-app-dev.azurewebsites.net/api/users/USER_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Test Event Publishing

**Publish DataUploaded event:**

```bash
curl -X POST https://my-app-dev.azurewebsites.net/api/events/data-uploaded \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "datasetId": "dataset_123",
    "projectId": "project_456",
    "fileUrl": "https://storage.blob.core.windows.net/datasets/file.csv",
    "fileSizeBytes": 1048576,
    "uploadedAt": "2025-01-15T10:30:00Z",
    "uploadedBy": "user_789"
  }'
```

The event is queued and processed asynchronously. Check Application Insights to see processing logs.

### Test Custom Function

**Call GenerateReport:**

```bash
curl -X POST https://my-app-dev.azurewebsites.net/api/functions/generate-report \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "datasetId": "dataset_123",
    "reportType": "summary",
    "format": "pdf",
    "dateRange": {
      "start": "2025-01-01T00:00:00Z",
      "end": "2025-01-15T00:00:00Z"
    }
  }'
```

**Note:** This returns 501 Not Implemented by default. See Step 8 to add custom logic.

## Step 8: Add Custom Logic (Optional)

### Add Event Processor

If you want custom logic when `DataUploaded` events are processed:

1. Create `src/event/resource.ts`:

```typescript
import { defineEvents, configureEvent } from '@atakora/component/events';

export const event = defineEvents({
  DataUploaded: configureEvent('DataUploaded').withProcessor(async (context, event) => {
    // Your custom processing logic
    context.log(`Processing file: ${event.fileUrl}`);

    // Update database
    await context.db.projects.update(event.projectId, {
      lastUploadedAt: event.uploadedAt,
    });

    // Trigger next event
    await context.publish('ValidationRequested', {
      datasetId: event.datasetId,
      fileUrl: event.fileUrl,
      requestedAt: new Date().toISOString(),
    });
  }),
});
```

2. Attach in `src/index.ts`:

```typescript
import { event } from './event/resource';

// After defineBackend
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
```

3. Redeploy:

```bash
npm run build
npx atakora deploy --environment development
```

### Add Function Handler

If you want custom logic for `GenerateReport`:

1. Create `src/function/resource.ts`:

```typescript
import { defineFunctions, configureFunction } from '@atakora/component/functions';

export const func = defineFunctions({
  GenerateReport: configureFunction('GenerateReport')
    .timeout(600) // 10 minutes
    .withHandler(async (context, input) => {
      // Your custom report generation logic
      context.log(`Generating ${input.reportType} report for ${input.datasetId}`);

      // Fetch data
      const dataset = await context.db.projects.get(input.datasetId);

      // Generate report (your custom logic here)
      const reportUrl = await generateReport(dataset, input);

      return {
        reportId: `rpt_${Date.now()}`,
        reportUrl,
        status: 'completed',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }),
});

async function generateReport(dataset: any, input: any) {
  // Your report generation implementation
  return 'https://storage.blob.core.windows.net/reports/report.pdf';
}
```

2. Attach in `src/index.ts`:

```typescript
import { func } from './function/resource';

// After defineBackend
backend.schema.GenerateReport.function.attach(func.GenerateReport);
```

3. Redeploy:

```bash
npm run build
npx atakora deploy --environment development
```

## Step 9: Monitor Your Backend

### Application Insights

View logs and metrics in Azure Portal:

1. Go to your Function App in Azure Portal
2. Click **Application Insights**
3. View:
   - **Live Metrics** - Real-time requests/failures
   - **Logs** - All application logs
   - **Performance** - Request duration, dependencies
   - **Failures** - Errors and exceptions

### Cosmos DB

View your data in Azure Portal:

1. Go to your Cosmos DB account
2. Click **Data Explorer**
3. Expand database → containers
4. Query your data:

```sql
SELECT * FROM users
SELECT * FROM users WHERE users.role = 'admin'
SELECT * FROM users WHERE users.email = 'john@example.com'
```

### Storage Queues

View queued events:

1. Go to your Storage Account in Azure Portal
2. Click **Queues**
3. See queues:
   - `data-uploaded` - Pending events
   - `data-uploaded-deadletter` - Failed events

## Step 10: Deploy to Production

When ready for production:

1. Update `.env`:

```bash
NODE_ENV=production
```

2. Deploy:

```bash
npx atakora deploy --environment production
```

**Production changes automatically:**

- Cosmos DB: Autoscale mode (400-4000 RU/s)
- Function App: Premium plan (EP1, 2 instances)
- Storage: Geo-redundant (GRS)
- Monitoring: Full sampling + alerts

**Estimated cost:** $250-500/month

## Next Steps

### Customize Infrastructure

If defaults don't fit, add resource files:

**Network:** Create `src/network/resource.ts` for VNet config
**Storage:** Create `src/storage/resource.ts` for Cosmos DB config
**Compute:** Create `src/compute/resource.ts` for Function App config

See `../backend/` package for examples.

### Learn More

- [Schema Reference](../../../reference/backend/schema.md) - All model types and features
- [Authentication](../../../reference/backend/authentication.md) - Auth configuration
- [Design Defaults](../../../reference/backend/design/) - What defaults provide
- [Migration Guides](../migration-guide.md) - Migrating from existing backends

### Get Help

- **Documentation**: https://docs.atakora.dev
- **GitHub Issues**: https://github.com/digitalminion/atakora/issues
- **Discord**: https://discord.gg/atakora

## Troubleshooting

### Authentication Errors

**401 Unauthorized:**

- Check `AZURE_TENANT_ID` and `AZURE_CLIENT_ID` are correct
- Verify token is valid: `az account get-access-token`
- Ensure app registration exists in Azure AD

**403 Forbidden:**

- Check authorization rules in schema
- Verify user has required roles
- For admin endpoints, ensure user is in 'Admin' group

### Deployment Errors

**Resource already exists:**

- Choose a different `settings.name` in `src/index.ts`
- Or delete existing resources in Azure Portal

**Insufficient permissions:**

- Ensure you have Contributor role on Azure subscription
- Run: `az role assignment list --assignee $(az account show --query user.name -o tsv)`

### Function Errors

**Function not found:**

- Verify build succeeded: `npm run build`
- Check `dist/` folder contains compiled files
- Redeploy: `npx atakora deploy`

**Database errors:**

- Ensure Cosmos DB is provisioned
- Check connection in Azure Portal
- Verify container names match model names (lowercase, plural)

### Queue Errors

**Events not processing:**

- Check dead letter queue in Storage Account
- View Application Insights logs
- Verify event processor is attached (if custom)

## Clean Up

To delete all resources:

```bash
# Delete resource group
az group delete --name my-app-dev-rg --yes

# Or use Atakora
npx atakora destroy --environment development
```

**Warning:** This deletes all data permanently. Backup first if needed!
