# atakora function

**Navigation**: [Docs Home](../../README.md) > [Reference](../README.md) > [CLI](./README.md) > function

---

## Overview

The `atakora function` command provides a suite of tools for managing Azure Functions within your infrastructure project. It bridges the gap between infrastructure-as-code and serverless function development, allowing you to create, test, deploy, and monitor Azure Functions alongside your ARM templates.

## Command Syntax

```bash
atakora function <subcommand> [options]
```

## Subcommands

### create

Scaffolds a new Azure Function with both infrastructure and handler code.

```bash
atakora function create --name <function-name> --trigger <trigger-type> [options]
```

#### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--name, -n` | string | Function name | Required |
| `--trigger, -t` | string | Trigger type (http, timer, queue, blob) | `http` |
| `--package, -p` | string | Package to add function to | Active package |
| `--auth-level` | string | HTTP auth level (anonymous, function, admin) | `function` |
| `--schedule` | string | CRON schedule for timer triggers | `0 */5 * * * *` |

#### Examples

```bash
# Create HTTP-triggered function
atakora function create --name api --trigger http

# Create timer-triggered function with custom schedule
atakora function create --name cleanup --trigger timer --schedule "0 0 * * * *"

# Create queue-triggered function
atakora function create --name processOrder --trigger queue
```

#### Generated Structure

```
packages/<package>/
├── functions/
│   └── <function-name>/
│       ├── handler.ts        # Function implementation
│       ├── resource.ts        # Infrastructure definition
│       └── function.json      # Binding configuration
```

#### Generated Files

**handler.ts** - Function implementation:
```typescript
import { AzureFunction, Context, HttpRequest } from '@azure/functions';

const handler: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  context.log('HTTP trigger function processed a request.');

  const name = req.query.name || (req.body && req.body.name);
  const responseMessage = name
    ? `Hello, ${name}!`
    : 'Please pass a name on the query string or in the request body';

  context.res = {
    status: 200,
    body: responseMessage
  };
};

export default handler;
```

**resource.ts** - Infrastructure definition:
```typescript
import { FunctionApp } from '@atakora/cdk/web';
import { Construct } from '@atakora/lib';

export function createApiFunction(scope: Construct, id: string) {
  const functionApp = new FunctionApp(scope, id, {
    runtime: 'node',
    version: '18',
    triggers: [{
      type: 'http',
      name: 'api',
      authLevel: 'function',
      methods: ['GET', 'POST']
    }]
  });

  return functionApp;
}
```

### deploy

Deploys functions to Azure Function App.

```bash
atakora function deploy [options]
```

#### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--package, -p` | string | Package containing functions | Active package |
| `--function, -f` | string | Specific function to deploy | All functions |
| `--skip-build` | boolean | Skip TypeScript compilation | `false` |
| `--dry-run` | boolean | Preview deployment without executing | `false` |

#### Examples

```bash
# Deploy all functions in active package
atakora function deploy

# Deploy specific function
atakora function deploy --function api

# Preview deployment
atakora function deploy --dry-run
```

#### What Happens

1. **Compilation**: TypeScript functions compiled to JavaScript
2. **Packaging**: Creates deployment ZIP with dependencies
3. **Upload**: Pushes package to Azure Function App
4. **Configuration**: Updates function app settings
5. **Verification**: Confirms successful deployment

### invoke

Tests functions locally or remotely.

```bash
atakora function invoke <function-name> [options]
```

#### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--payload, -d` | string | JSON payload for request | `{}` |
| `--file, -f` | string | File containing request payload | - |
| `--remote` | boolean | Invoke deployed function (vs local) | `false` |
| `--method` | string | HTTP method (GET, POST, etc.) | `POST` |
| `--headers` | string | JSON object with HTTP headers | `{}` |

#### Examples

```bash
# Invoke locally with JSON payload
atakora function invoke api --payload '{"name": "Alice"}'

# Invoke with payload from file
atakora function invoke processOrder --file ./test-data/order.json

# Invoke deployed function
atakora function invoke api --remote --payload '{"test": true}'

# Custom HTTP method and headers
atakora function invoke api \
  --method GET \
  --headers '{"Authorization": "Bearer token123"}'
```

#### Local Invocation

Local invocations run against a lightweight development server:

- **Hot Reload**: Automatically recompiles on code changes
- **Debugging**: Supports Node.js debugger attachment
- **Fast Iteration**: No deployment required

```bash
# Start local server (automatic with invoke)
atakora function invoke api --payload '{"name": "Bob"}'

# Output:
# ✓ Starting local function runtime...
# ✓ Function 'api' ready on http://localhost:7071
# ⚡ Invoking function...
#
# Response (200 OK):
# {
#   "message": "Hello, Bob!"
# }
```

### list

Lists all discovered functions in the project.

```bash
atakora function list [options]
```

#### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--package, -p` | string | Package to list functions from | All packages |
| `--trigger` | string | Filter by trigger type | All types |
| `--format` | string | Output format (table, json) | `table` |

#### Examples

```bash
# List all functions
atakora function list

# List functions in specific package
atakora function list --package backend

# Filter by trigger type
atakora function list --trigger http

# JSON output for scripting
atakora function list --format json
```

#### Output

```
╔════════════╤═════════╤══════════╤═════════════╗
║ Function   │ Trigger │ Package  │ Status      ║
╠════════════╪═════════╪══════════╪═════════════╣
║ api        │ http    │ backend  │ Deployed    ║
║ cleanup    │ timer   │ backend  │ Local only  ║
║ process    │ queue   │ worker   │ Deployed    ║
╚════════════╧═════════╧══════════╧═════════════╝
```

JSON format:
```json
{
  "functions": [
    {
      "name": "api",
      "trigger": "http",
      "package": "backend",
      "path": "./packages/backend/functions/api",
      "status": "deployed",
      "url": "https://my-app.azurewebsites.net/api/api"
    }
  ]
}
```

### logs

Streams function execution logs.

```bash
atakora function logs <function-name> [options]
```

#### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `--follow, -f` | boolean | Stream logs in real-time | `false` |
| `--tail, -n` | number | Number of recent lines to show | `100` |
| `--since` | string | Show logs since timestamp | `1h` |
| `--filter` | string | Filter logs by pattern | - |
| `--level` | string | Minimum log level (info, warn, error) | `info` |

#### Examples

```bash
# Show recent logs
atakora function logs api

# Stream logs in real-time
atakora function logs api --follow

# Show last 50 lines
atakora function logs api --tail 50

# Logs from last 30 minutes
atakora function logs api --since 30m

# Filter by pattern
atakora function logs api --filter "error" --level error
```

#### Output

```
2025-10-10T14:23:45.123Z [Information] Executing 'api' (Reason='This function was programmatically called', Id=abc123)
2025-10-10T14:23:45.234Z [Information] HTTP trigger function processed a request.
2025-10-10T14:23:45.345Z [Information] User: Alice authenticated
2025-10-10T14:23:45.456Z [Information] Executed 'api' (Succeeded, Id=abc123, Duration=333ms)
```

## Common Workflows

### Development Workflow

```bash
# 1. Create new function
atakora function create --name userService --trigger http

# 2. Implement handler logic
# Edit packages/<package>/functions/userService/handler.ts

# 3. Test locally
atakora function invoke userService --payload '{"userId": "123"}'

# 4. Deploy to Azure
atakora function deploy --function userService

# 5. Monitor logs
atakora function logs userService --follow
```

### Testing Workflow

```bash
# Create test payloads directory
mkdir -p test-data

# Create test payload
echo '{"userId": "123", "action": "create"}' > test-data/user-create.json

# Test different scenarios
atakora function invoke userService --file test-data/user-create.json
atakora function invoke userService --file test-data/user-update.json
atakora function invoke userService --file test-data/user-delete.json

# Verify against deployed version
atakora function invoke userService --remote --file test-data/user-create.json
```

### Multi-Function Deployment

```bash
# Deploy all functions in package
atakora function deploy --package backend

# Verify deployment
atakora function list --package backend

# Test each function
atakora function invoke api --remote
atakora function invoke processOrder --remote --file test-data/order.json
```

## Trigger Types

### HTTP Trigger

**Use Case**: RESTful APIs, webhooks, HTTP endpoints

```typescript
// handler.ts
import { AzureFunction, Context, HttpRequest } from '@azure/functions';

const httpTrigger: AzureFunction = async (context: Context, req: HttpRequest) => {
  context.res = {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    body: { message: 'Hello from HTTP trigger' }
  };
};

export default httpTrigger;
```

**Invocation**:
```bash
atakora function invoke api --method POST --payload '{"name": "Alice"}'
```

### Timer Trigger

**Use Case**: Scheduled tasks, batch processing, cleanup jobs

```typescript
// handler.ts
import { AzureFunction, Context } from '@azure/functions';

const timerTrigger: AzureFunction = async (context: Context, timer: any) => {
  const timestamp = new Date().toISOString();

  if (timer.isPastDue) {
    context.log('Timer is running late!');
  }

  context.log(`Timer trigger executed at ${timestamp}`);
};

export default timerTrigger;
```

**Schedule Format** (CRON):
```bash
# Every 5 minutes
atakora function create --name cleanup --trigger timer --schedule "0 */5 * * * *"

# Daily at midnight
atakora function create --name dailyReport --trigger timer --schedule "0 0 0 * * *"

# Every Monday at 9 AM
atakora function create --name weeklyTask --trigger timer --schedule "0 0 9 * * MON"
```

### Queue Trigger

**Use Case**: Asynchronous processing, message handling, event-driven tasks

```typescript
// handler.ts
import { AzureFunction, Context } from '@azure/functions';

const queueTrigger: AzureFunction = async (context: Context, message: any) => {
  context.log(`Processing queue message: ${JSON.stringify(message)}`);

  // Process message
  const result = await processOrder(message);

  context.log(`Order processed: ${result.orderId}`);
};

export default queueTrigger;
```

**Invocation**:
```bash
atakora function invoke processOrder --payload '{"orderId": "123", "items": []}'
```

### Blob Trigger

**Use Case**: File processing, image transformation, data ingestion

```typescript
// handler.ts
import { AzureFunction, Context } from '@azure/functions';

const blobTrigger: AzureFunction = async (context: Context, blob: Buffer) => {
  context.log(`Blob trigger processing file: ${context.bindingData.name}`);
  context.log(`Blob size: ${blob.length} bytes`);

  // Process blob
  const processed = await transformImage(blob);

  context.bindings.outputBlob = processed;
};

export default blobTrigger;
```

## Local Development

### Development Server

The function runtime includes a local development server:

```bash
# Start server automatically with invoke
atakora function invoke api

# Server features:
# ✓ Hot reload on code changes
# ✓ Automatic TypeScript compilation
# ✓ Request/response logging
# ✓ Debugger support
```

### Debugging

Attach Node.js debugger to running functions:

```bash
# Start with debugger
NODE_OPTIONS='--inspect' atakora function invoke api

# Output:
# Debugger listening on ws://127.0.0.1:9229/...
# For help, see: https://nodejs.org/en/docs/inspector
```

Then attach your IDE debugger to port 9229.

**VS Code launch.json**:
```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Function",
  "port": 9229,
  "restart": true,
  "sourceMaps": true
}
```

### Environment Variables

Functions can access environment variables:

```bash
# Set environment variable
export DATABASE_URL="postgres://localhost:5432/db"

# Function code
process.env.DATABASE_URL
```

**.env file support**:
```bash
# .env (in package root)
DATABASE_URL=postgres://localhost:5432/db
API_KEY=secret123
```

## Integration with Infrastructure

Functions are automatically integrated with their infrastructure:

```typescript
// resource.ts - Infrastructure
import { FunctionApp } from '@atakora/cdk/web';
import { StorageAccount } from '@atakora/cdk/storage';

export function createOrderProcessor(scope: Construct) {
  const storage = new StorageAccount(scope, 'OrderStorage', {
    sku: 'Standard_LRS'
  });

  const func = new FunctionApp(scope, 'OrderProcessor', {
    triggers: [{
      type: 'queue',
      connection: storage.connectionString,
      queueName: 'orders'
    }]
  });

  return func;
}
```

```typescript
// handler.ts - Function code
import { AzureFunction, Context } from '@azure/functions';

const handler: AzureFunction = async (context: Context, message: any) => {
  // Connection string automatically injected via environment
  // Queue binding configured from resource.ts
  context.log(`Processing order: ${message.orderId}`);
};

export default handler;
```

## Configuration

### Function App Settings

Configure function app behavior:

```typescript
// resource.ts
new FunctionApp(scope, 'MyFunc', {
  runtime: 'node',
  version: '18',
  appSettings: {
    'DATABASE_URL': process.env.DATABASE_URL,
    'LOG_LEVEL': 'info'
  },
  scaleSettings: {
    maxInstances: 10,
    minInstances: 1
  }
});
```

### Host Configuration

Global function runtime settings:

```json
// host.json (auto-generated)
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[3.*, 4.0.0)"
  }
}
```

## Troubleshooting

### Function Not Found

**Problem**: `Error: Function 'api' not found`

**Solution**: Ensure function exists and is in correct location:
```bash
# List discovered functions
atakora function list

# Check function directory structure
ls -la packages/<package>/functions/<function-name>/
```

### Deployment Fails

**Problem**: `Error: Deployment failed - 409 Conflict`

**Solution**: Function app may be in use:
```bash
# Stop function app
az functionapp stop --name <app-name> --resource-group <rg>

# Deploy again
atakora function deploy

# Start function app
az functionapp start --name <app-name> --resource-group <rg>
```

### Local Invocation Fails

**Problem**: `Error: Cannot start local runtime`

**Solution**: Check Azure Functions Core Tools installation:
```bash
# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4

# Verify installation
func --version
```

### Authentication Errors

**Problem**: `Error: 401 Unauthorized when invoking remote function`

**Solution**: Get function key and pass it:
```bash
# Get function key
az functionapp keys list --name <app-name> --resource-group <rg>

# Invoke with key
atakora function invoke api --remote \
  --headers '{"x-functions-key": "your-key-here"}'
```

## See Also

- [Azure Functions Documentation](https://docs.microsoft.com/azure/azure-functions/)
- [Function App Construct Reference](../api/cdk/web.md#functionapp)
- [Testing Functions Guide](../../guides/workflows/testing-infrastructure.md)
- [Deployment Guide](./deploy.md)

---

**Last Updated**: 2025-10-10
**CLI Version**: 1.0.0+
