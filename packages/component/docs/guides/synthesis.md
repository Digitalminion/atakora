# Synthesis Guide

> Transform your backend definitions into deployable Azure infrastructure

## Overview

Synthesis is the process of converting your high-level backend definition (schema, authentication, settings, attachments) into concrete Azure Resource Manager (ARM) templates that can be deployed to Azure.

```
Backend Definition  →  Synthesis  →  ARM Templates  →  Azure Deployment
(TypeScript code)     (atakora)     (JSON files)       (Real resources)
```

### What is Synthesis?

Think of synthesis like a compiler for infrastructure:

- **Input**: Your backend definition (`defineBackend()`)
- **Process**: Analyze schema, apply defaults, merge attachments, generate ARM
- **Output**: ARM templates ready for deployment

```typescript
// Your code (input)
const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' }
});

// Synthesis generates ARM for:
// ✓ Cosmos DB database with containers for each CRUD model
// ✓ Storage Queue for each event model
// ✓ Function App with functions for each model + event processors
// ✓ Key Vault for authentication secrets
// ✓ Application Insights (if monitoring enabled)
// ✓ Virtual Network (if networking enabled)
// ✓ And more...
```

---

## How Synthesis Works

### The Synthesis Pipeline

```
1. Discovery
   └─ Find all backend definitions in your project

2. Analysis
   └─ Extract schema models (c.model, e.model, f.model)
   └─ Identify attached customizations
   └─ Resolve environment and settings

3. Resource Generation
   └─ For each c.model: Generate Cosmos container + CRUD functions
   └─ For each e.model: Generate queue + validator + processor
   └─ For each f.model: Generate custom function
   └─ Generate shared infrastructure (Function App, Key Vault, etc.)

4. Attachment Processing
   └─ Replace defaults with attached configurations
   └─ Resolve dependencies between resources
   └─ Validate cross-resource constraints

5. ARM Template Generation
   └─ Convert to ARM template JSON
   └─ Add parameters for environment-specific values
   └─ Generate deployment metadata

6. Validation
   └─ Validate ARM template structure
   └─ Check Azure naming constraints
   └─ Verify resource dependencies
```

### Schema-to-Resource Mapping

**CRUD Models** (`c.model`)

```typescript
// Schema definition
User: c.model({
  id: a.id(),
  email: a.string().email(),
  name: a.string()
})

// Generates:
// 1. Cosmos DB container "users"
// 2. POST   /api/users       - Create user
// 3. GET    /api/users/:id   - Get user
// 4. PUT    /api/users/:id   - Update user
// 5. DELETE /api/users/:id   - Delete user
// 6. GET    /api/users       - List users (with filtering)
// 7. TypeScript types: User, CreateUserInput, UpdateUserInput
```

**Event Models** (`e.model`)

```typescript
// Schema definition
DataUploaded: e.model({
  fileId: a.string(),
  fileName: a.string(),
  uploadedBy: a.ref('User')
})

// Generates:
// 1. Azure Storage Queue "data-uploaded"
// 2. POST /api/events/data-uploaded - Publish event
// 3. Validator function (validates against schema)
// 4. Processor function (your custom logic)
// 5. Dead letter queue "data-uploaded-dlq"
// 6. TypeScript types: DataUploadedEvent, PublishDataUploadedInput
```

**Function Models** (`f.model`)

```typescript
// Schema definition
GenerateReport: f.model({
  input: a.object({
    reportType: a.enum(['pdf', 'excel']),
    dateRange: a.object({ start: a.datetime(), end: a.datetime() })
  }),
  output: a.object({
    reportUrl: a.string(),
    generatedAt: a.datetime()
  })
})

// Generates:
// 1. POST /api/functions/generate-report - Invoke function
// 2. Azure Function with custom handler
// 3. Input/output validation
// 4. TypeScript types: GenerateReportInput, GenerateReportOutput
```

---

## Running Synthesis

### Basic Usage

```bash
# Synthesize all backends in current project
atakora synth

# Synthesize to specific output directory
atakora synth --output ./build/templates

# Dry run (validate without writing files)
atakora synth --dry-run

# Verbose output (see what's being generated)
atakora synth --verbose

# Generate for specific environment
NODE_ENV=production atakora synth
```

### Common Workflows

**Development Workflow**

```bash
# 1. Make changes to backend definition
vim src/backend.ts

# 2. Validate configuration
atakora synth --dry-run

# 3. Generate templates
atakora synth --output ./synth

# 4. Review generated ARM
cat ./synth/template.json

# 5. Deploy to dev environment
az deployment group create \
  --resource-group rg-myapp-dev \
  --template-file ./synth/template.json \
  --parameters ./synth/parameters.dev.json
```

**CI/CD Pipeline**

```yaml
# .github/workflows/deploy.yml
name: Deploy Backend

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Synthesize backend
        run: npm run synth
        env:
          NODE_ENV: production
          AZURE_REGION: eastus

      - name: Validate ARM template
        run: |
          az deployment group validate \
            --resource-group rg-myapp-prod \
            --template-file ./synth/template.json \
            --parameters ./synth/parameters.prod.json

      - name: Deploy to Azure
        run: |
          az deployment group create \
            --resource-group rg-myapp-prod \
            --template-file ./synth/template.json \
            --parameters ./synth/parameters.prod.json
```

---

## Environment Configuration

### Environment Detection

Synthesis automatically detects the environment and applies appropriate defaults:

```typescript
// Detected from NODE_ENV or ENVIRONMENT variable
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app'
    // environment automatically detected
  }
});

// Or explicitly specified
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    environment: 'production'  // Override detection
  }
});
```

**Environment Mapping:**

- `production` or `prod` → `production`
- `staging`, `stage`, or `test` → `staging`
- `development`, `dev`, `local`, or undefined → `development`

### Environment-Specific Resources

Different environments get different default configurations:

**Development:**
- Serverless Cosmos DB (pay-per-request)
- Consumption Function App (pay-per-execution)
- No VNet, no CDN, basic monitoring
- Lower throughput limits
- Shorter retention periods

**Staging:**
- Serverless or Provisioned Cosmos DB (based on testing needs)
- Premium Function App (for realistic testing)
- VNet enabled, basic monitoring
- Medium throughput
- Medium retention

**Production:**
- Provisioned Cosmos DB with autoscale
- Premium Function App with always-on
- Full VNet, CDN, comprehensive monitoring
- High throughput
- Long retention periods

### Parameter Files

Synthesis generates parameter files for each environment:

```bash
synth/
├── template.json                  # ARM template (same for all envs)
├── parameters.development.json    # Dev parameters
├── parameters.staging.json        # Staging parameters
└── parameters.production.json     # Production parameters
```

**Example parameters file:**

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "backendName": {
      "value": "my-app"
    },
    "environment": {
      "value": "production"
    },
    "location": {
      "value": "eastus"
    },
    "cosmosDbMode": {
      "value": "Provisioned"
    },
    "cosmosDbMaxThroughput": {
      "value": 20000
    },
    "functionAppPlan": {
      "value": "Premium"
    },
    "functionAppSku": {
      "value": "EP2"
    }
  }
}
```

---

## Government Cloud Support

### Enabling Government Cloud

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    region: 'usgovvirginia',  // Government Cloud region
    tags: {
      'compliance': 'FedRAMP High',
      'data-classification': 'CUI'
    }
  }
});
```

### Government Cloud Regions

Available regions in Azure Government:

- `usgovvirginia` - US Gov Virginia
- `usgovtexas` - US Gov Texas
- `usgovarizona` - US Gov Arizona
- `usdodeast` - US DoD East
- `usdodcentral` - US DoD Central

### Synthesis Differences

When synthesizing for Government Cloud:

1. **Endpoint URLs**: Uses `.usgovcloudapi.net` instead of `.azure.net`
2. **Service Availability**: Validates services available in Government Cloud
3. **Compliance Tags**: Automatically adds required tags
4. **ARM Template**: Uses Government Cloud ARM endpoints

```bash
# Synthesize for Government Cloud
AZURE_CLOUD=AzureUSGovernment atakora synth

# Or set in backend
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    cloud: 'AzureUSGovernment'
  }
});
```

### Government Cloud Limitations

Some features may not be available or have different SKUs:

```typescript
// Check feature availability at synthesis time
if (backend.performance) {
  // CDN may have limited SKUs in Gov Cloud
  backend.performance.cdn.attach(
    performance.cdn()
      .sku('Standard_Microsoft')  // Verify availability
  );
}
```

---

## Output Structure

### Generated Files

```bash
synth/
├── template.json              # Main ARM template
├── parameters.development.json
├── parameters.staging.json
├── parameters.production.json
├── metadata.json              # Deployment metadata
├── resources/
│   ├── storage.json          # Storage account ARM
│   ├── cosmosdb.json         # Cosmos DB ARM
│   ├── functions.json        # Function App ARM
│   ├── keyvault.json         # Key Vault ARM
│   ├── monitoring.json       # App Insights ARM (if enabled)
│   └── network.json          # VNet ARM (if enabled)
└── functions/
    ├── src/                  # Function source code
    │   ├── users/
    │   │   ├── create.ts
    │   │   ├── read.ts
    │   │   ├── update.ts
    │   │   ├── delete.ts
    │   │   └── list.ts
    │   ├── events/
    │   │   ├── data-uploaded-validator.ts
    │   │   └── data-uploaded-processor.ts
    │   └── functions/
    │       └── generate-report.ts
    ├── host.json            # Function App configuration
    ├── package.json
    └── tsconfig.json
```

### ARM Template Structure

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "metadata": {
    "generator": "atakora",
    "version": "1.0.0",
    "backend": "my-app",
    "environment": "production",
    "generatedAt": "2024-11-22T10:30:00Z"
  },
  "parameters": {
    "backendName": { "type": "string" },
    "environment": { "type": "string" },
    "location": { "type": "string" }
  },
  "variables": {
    "resourcePrefix": "[concat(parameters('backendName'), '-', parameters('environment'))]"
  },
  "resources": [
    {
      "type": "Microsoft.DocumentDB/databaseAccounts",
      "name": "[concat(variables('resourcePrefix'), '-db')]",
      "apiVersion": "2023-04-15",
      "location": "[parameters('location')]",
      "properties": { /* ... */ }
    },
    {
      "type": "Microsoft.Storage/storageAccounts",
      "name": "[concat(variables('resourcePrefix'), 'storage')]",
      "apiVersion": "2023-01-01",
      "location": "[parameters('location')]",
      "properties": { /* ... */ }
    },
    {
      "type": "Microsoft.Web/serverfarms",
      "name": "[concat(variables('resourcePrefix'), '-plan')]",
      "apiVersion": "2023-01-01",
      "location": "[parameters('location')]",
      "sku": { "name": "Y1" },
      "properties": { /* ... */ }
    },
    {
      "type": "Microsoft.Web/sites",
      "name": "[concat(variables('resourcePrefix'), '-func')]",
      "apiVersion": "2023-01-01",
      "location": "[parameters('location')]",
      "kind": "functionapp",
      "properties": { /* ... */ },
      "dependsOn": [
        "[resourceId('Microsoft.Web/serverfarms', concat(variables('resourcePrefix'), '-plan'))]",
        "[resourceId('Microsoft.Storage/storageAccounts', concat(variables('resourcePrefix'), 'storage'))]"
      ]
    }
  ],
  "outputs": {
    "functionAppName": {
      "type": "string",
      "value": "[concat(variables('resourcePrefix'), '-func')]"
    },
    "functionAppUrl": {
      "type": "string",
      "value": "[concat('https://', reference(resourceId('Microsoft.Web/sites', concat(variables('resourcePrefix'), '-func'))).defaultHostName)]"
    }
  }
}
```

### Metadata File

The `metadata.json` file contains information about what was synthesized:

```json
{
  "backend": {
    "name": "my-app",
    "version": "1.0.0",
    "environment": "production"
  },
  "schema": {
    "modelCount": 4,
    "models": {
      "crud": ["User", "Project", "Dataset", "Feedback"],
      "events": ["DataUploaded", "DataValidated"],
      "functions": ["GenerateReport", "ValidateData"]
    }
  },
  "resources": {
    "storage": {
      "account": true,
      "database": true,
      "blobs": true
    },
    "compute": {
      "functionApp": true
    },
    "monitoring": {
      "appInsights": true,
      "logAnalytics": true
    },
    "network": {
      "vnet": false
    }
  },
  "attachments": {
    "storage.database": "custom",
    "compute.functionApp": "default"
  },
  "synthesizedAt": "2024-11-22T10:30:00Z",
  "synthesizer": {
    "name": "atakora",
    "version": "1.0.0"
  }
}
```

---

## Advanced Customization

### Custom Resource Names

Override default naming conventions:

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    naming: {
      database: 'custom-db-name',
      storage: 'customstorageacct',
      functionApp: 'custom-func-app'
    }
  }
});
```

### Resource Tags

Add tags to all generated resources:

```typescript
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    tags: {
      application: 'my-app',
      team: 'engineering',
      costCenter: 'eng-001',
      environment: process.env.NODE_ENV
    }
  }
});
```

### Custom ARM Template Sections

Add custom ARM resources or modify generated templates:

```typescript
// synthesis-hooks.ts
export const beforeSynthesis = (context) => {
  // Add custom logic before synthesis
  console.log('Starting synthesis for', context.backend.settings.name);
};

export const afterSynthesis = (template, context) => {
  // Modify ARM template after generation
  template.resources.push({
    type: 'Microsoft.Insights/actionGroups',
    name: 'custom-alert-group',
    apiVersion: '2023-01-01',
    location: 'global',
    properties: {
      groupShortName: 'alerts',
      enabled: true,
      emailReceivers: [
        {
          name: 'oncall',
          emailAddress: 'oncall@example.com'
        }
      ]
    }
  });

  return template;
};
```

```typescript
// backend.ts
import { beforeSynthesis, afterSynthesis } from './synthesis-hooks';

const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' },
  synthesis: {
    hooks: {
      before: beforeSynthesis,
      after: afterSynthesis
    }
  }
});
```

---

## Troubleshooting

### Synthesis Fails with "Model not found"

**Cause**: Schema model referenced but not defined.

```typescript
// ERROR: DataUploaded referenced but not defined
User: c.model({
  lastUpload: a.ref('DataUploaded')  // Model doesn't exist
})
```

**Solution**: Define the referenced model:

```typescript
DataUploaded: e.model({
  fileId: a.string()
})

User: c.model({
  lastUpload: a.ref('DataUploaded')  // Now works
})
```

### Synthesis Produces Invalid ARM Template

**Cause**: Configuration violates Azure constraints.

**Solution**: Run validation:

```bash
# Validate ARM template
az deployment group validate \
  --resource-group rg-myapp-dev \
  --template-file ./synth/template.json \
  --parameters ./synth/parameters.dev.json

# Check for specific errors
atakora synth --validate
```

### Generated Resources Have Wrong Names

**Cause**: Naming collision or invalid characters.

**Solution**: Check naming rules:

```typescript
// GOOD: Valid Azure names
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app-123'  // Alphanumeric + hyphens
  }
});

// BAD: Invalid characters
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'My App!'  // Spaces and special chars
  }
});
```

### Synthesis is Slow

**Cause**: Large number of models or complex attachments.

**Solutions:**

1. **Use synthesis cache:**
```bash
atakora synth --cache
```

2. **Synthesize only changed models:**
```bash
atakora synth --incremental
```

3. **Parallelize synthesis:**
```bash
atakora synth --parallel
```

### ARM Deployment Fails

**Cause**: Resource quotas, naming conflicts, or region unavailability.

**Solution**: Check Azure status and quotas:

```bash
# Check subscription quotas
az vm list-usage --location eastus --output table

# Check resource exists
az resource list --name my-app-prod-db

# Try different region
AZURE_REGION=westus atakora synth
```

---

## Performance Optimization

### Synthesis Caching

Cache synthesis results to speed up subsequent runs:

```bash
# Enable caching
atakora synth --cache

# Clear cache
atakora synth --clear-cache

# Use cache directory
atakora synth --cache-dir ./.atakora/cache
```

### Incremental Synthesis

Only synthesize changed models:

```bash
# First run: Synthesize everything
atakora synth

# Make changes to one model
vim src/schema.ts

# Second run: Only synthesize changed models
atakora synth --incremental
```

### Parallel Synthesis

Synthesize models in parallel (faster for large schemas):

```bash
# Use all CPU cores
atakora synth --parallel

# Limit parallelism
atakora synth --parallel --max-workers 4
```

---

## Next Steps

- [Attachment Points Guide](./attachment-points.md) - Customize infrastructure
- [Testing Guide](./testing.md) - Test synthesis output
- [Deployment Guide](./deployment.md) - Deploy to Azure
- [API Reference](../api/synthesis.md) - Synthesis API documentation

---

**Tip**: Enable verbose logging to understand what's being synthesized:

```bash
DEBUG=atakora:synthesis atakora synth --verbose
```
