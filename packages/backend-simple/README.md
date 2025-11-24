# @atakora/backend-simple

A minimal Atakora backend package that uses sensible defaults for everything. This package provides the simplest possible setup - **just define your schema and authentication**, everything else is handled automatically.

## What You Get

With just ~30 lines of code, you get a production-ready backend with:

✅ **REST APIs** - All CRUD operations auto-generated
✅ **Event Processing** - Queues and processors created automatically
✅ **Custom Functions** - HTTP endpoints with validation
✅ **Azure Cosmos DB** - Database with optimized settings
✅ **Azure Functions** - Serverless compute, auto-scaling
✅ **Azure Storage** - Blob storage and queues
✅ **Application Insights** - Monitoring and logging
✅ **Key Vault** - Secrets management
✅ **Authentication** - Entra ID (Azure AD) integration
✅ **Authorization** - Role-based access control
✅ **TypeScript Types** - Fully type-safe

## Philosophy: Progressive Enhancement

Start simple with defaults, customize only when needed:

1. **Start here** - Define schema + auth (this package)
2. **Grow as needed** - Add custom infrastructure only when defaults don't fit
3. **Never over-configure** - Let Atakora handle the boilerplate

## Package Structure

```
packages/backend-simple/
├── src/
│   ├── auth/
│   │   └── resource.ts         # Authentication configuration
│   ├── schema/
│   │   └── resource.ts         # Data models (CRUD, Events, Functions)
│   └── index.ts                # Backend assembly (minimal)
├── package.json
├── tsconfig.json
└── README.md
```

**What's NOT here (because defaults handle it):**

- ❌ No `network/` folder - uses default VNet settings
- ❌ No `storage/` folder - uses default Cosmos DB + Blob storage settings
- ❌ No `compute/` folder - uses default Function App settings
- ❌ No `log/` folder - uses default Application Insights settings
- ❌ No `performance/` folder - uses default performance settings
- ❌ No `event/` or `function/` folders - uses default event processors and function handlers

## Example: Complete Backend in 30 Lines

### Authentication (`src/auth/resource.ts`)

```typescript
import { defineAuth, auth } from '@atakora/component/auth';

export const authentication = defineAuth({
  Primary: auth.entra().tenant(process.env.AZURE_TENANT_ID!).clientId(process.env.AZURE_CLIENT_ID!),
});
```

### Schema (`src/schema/resource.ts`)

```typescript
import { defineSchema, a, c, e, f } from '@atakora/component';

export const schema = defineSchema({
  schema: a.schema({
    // CRUD Model - Auto-generates 5 REST endpoints
    User: c
      .model({
        id: a.id(),
        email: a.string().required().email(),
        name: a.string().required(),
        role: a.enum(['user', 'admin']).default('user'),
      })
      .authorization((allow) => [allow.owner('id'), allow.groups(['admin']).all()]),

    // Event Model - Auto-generates queue + processor
    DataUploaded: e.model({
      datasetId: a.string().required(),
      fileUrl: a.string().url().required(),
      fileSizeBytes: a.number().required(),
      uploadedAt: a.datetime().required(),
    }),

    // Function Model - Auto-generates HTTP endpoint
    GenerateReport: f.model({
      input: {
        datasetId: a.string().required(),
        format: a.enum(['pdf', 'csv', 'xlsx']).default('pdf'),
      },
      output: {
        reportUrl: a.string().url().required(),
      },
    }),
  }),
});
```

### Backend Assembly (`src/index.ts`)

```typescript
import { defineBackend } from '@atakora/component';
import { schema } from './schema/resource';
import { authentication } from './auth/resource';

export const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'my-app',
    environment: process.env.NODE_ENV || 'development',
  },
});

// That's it! No infrastructure attachments needed.
// Everything uses sensible defaults.
```

## What Gets Deployed

When you deploy this backend:

### Azure Resources (Auto-Provisioned)

**Compute:**

- Function App (Consumption plan in dev, Premium in prod)
- 7 Azure Functions (5 for User CRUD, 1 for DataUploaded, 1 for GenerateReport)

**Storage:**

- Cosmos DB account (Serverless in dev, Autoscale in prod)
- Cosmos DB containers: `users`
- Storage Account
- Storage Queues: `data-uploaded`, `data-uploaded-deadletter`
- Blob containers: Auto-created as needed

**Security:**

- Managed Identity (for Function App)
- Key Vault (for secrets)
- Entra ID integration

**Monitoring:**

- Application Insights
- Log Analytics workspace

### REST Endpoints (Auto-Generated)

**User CRUD:**

```
POST   /api/users           Create user
GET    /api/users/:id       Get user
PUT    /api/users/:id       Update user
DELETE /api/users/:id       Delete user
GET    /api/users           List users (with filters, pagination, sorting)
```

**Events:**

```
POST   /api/events/data-uploaded    Publish event
```

**Functions:**

```
POST   /api/functions/generate-report    Invoke function
```

## Default Configurations

This backend uses Atakora's intelligent defaults:

### Development Environment

```yaml
Cosmos DB: Serverless mode
Function App: Consumption plan
Storage Queue: Standard tier
Monitoring: Basic Application Insights
```

**Estimated cost:** $0-10/month

### Production Environment

```yaml
Cosmos DB: Autoscale (400-4000 RU/s)
Function App: Premium plan (EP1, 2 instances)
Storage Queue: Standard tier with dead letter
Monitoring: Full Application Insights with alerts
```

**Estimated cost:** $250-500/month

See [design defaults documentation](../../docs/reference/backend/design/) for complete details.

## When to Customize

This simple setup works great for:

- ✅ MVPs and prototypes
- ✅ Small to medium applications
- ✅ Standard CRUD + events + functions
- ✅ Single region deployments
- ✅ Standard security requirements

**When to add custom infrastructure:**

- Need VNet integration → Add `network/resource.ts`
- Need multi-region Cosmos DB → Add `storage/resource.ts`
- Need larger Function App → Add `compute/resource.ts`
- Need custom logging → Add `log/resource.ts`
- Need CDN or caching → Add `performance/resource.ts`
- Need custom event processors → Add `event/resource.ts`
- Need custom function handlers → Add `function/resource.ts`

See the full `@atakora/backend` package for examples of all customizations.

## Deployment

```bash
# Install dependencies
npm install

# Build
npm run build

# Deploy to development
npx atakora deploy --environment development

# Deploy to production
npx atakora deploy --environment production
```

## Environment Variables

Create a `.env` file:

```bash
# Azure AD (Entra ID)
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id

# Environment
NODE_ENV=development
```

## Next Steps

### Add Custom Event Processor

If you need custom logic for the `DataUploaded` event:

1. Create `src/event/resource.ts`:

```typescript
import { defineEvents, configureEvent } from '@atakora/component/events';

export const event = defineEvents({
  DataUploaded: configureEvent('DataUploaded').withProcessor(async (context, event) => {
    // Your custom processing logic
    await context.db.datasets.update(event.datasetId, {
      status: 'uploaded',
    });
  }),
});
```

2. Attach in `src/index.ts`:

```typescript
backend.schema.DataUploaded.queue.attach(event.DataUploaded);
```

### Add Custom Function Handler

If you need custom logic for the `GenerateReport` function:

1. Create `src/function/resource.ts`:

```typescript
import { defineFunctions, configureFunction } from '@atakora/component/functions';

export const func = defineFunctions({
  GenerateReport: configureFunction('GenerateReport').withHandler(async (context, input) => {
    // Your custom report generation logic
    const reportUrl = await generateReport(input.datasetId, input.format);
    return { reportUrl };
  }),
});
```

2. Attach in `src/index.ts`:

```typescript
backend.schema.GenerateReport.function.attach(func.GenerateReport);
```

### Add Custom Infrastructure

If defaults don't fit your needs, add resource files:

**Network:** `src/network/resource.ts`
**Storage:** `src/storage/resource.ts`
**Compute:** `src/compute/resource.ts`
**Logging:** `src/log/resource.ts`
**Performance:** `src/performance/resource.ts`

Then attach them in `src/index.ts`:

```typescript
backend.network.primary.attach(networking.Primary);
backend.storage.database.attach(data.Database);
// etc.
```

## Documentation

Complete documentation for this package is available at:

- **[Overview & Concepts](../../docs/guides/patterns/backend-simple/overview.md)** - Package introduction and when to use it
- **[Getting Started Guide](../../docs/guides/patterns/backend-simple/getting-started.md)** - Deploy your first backend in 5 minutes
- **[Common Examples](../../docs/guides/patterns/backend-simple/examples.md)** - Real-world patterns and use cases
- **[Comparison with Full Backend](../../docs/guides/patterns/backend-simple/comparison.md)** - Understand the differences

### Reference Documentation

- [Backend Reference](../../docs/reference/backend/) - Complete feature documentation
- [Schema Reference](../../docs/reference/backend/schema.md) - All model types and field types
- [Authentication Reference](../../docs/reference/backend/authentication.md) - Auth configuration
- [Design Defaults](../../docs/reference/backend/design/) - What happens when you don't customize

## Comparison: Simple vs. Full Backend

| Feature            | backend-simple                      | backend (full)                             |
| ------------------ | ----------------------------------- | ------------------------------------------ |
| **Lines of code**  | ~30 lines                           | ~200+ lines                                |
| **Files**          | 3 files                             | 10+ files                                  |
| **Customization**  | Uses all defaults                   | Full control over all infrastructure       |
| **Best for**       | MVPs, prototypes, simple apps       | Production apps with specific requirements |
| **Learning curve** | 5 minutes                           | 1-2 hours                                  |
| **Flexibility**    | High (can add customizations later) | Maximum                                    |

**Recommendation:** Start with `backend-simple`, add customizations from `backend` as you need them.

## Example Projects

See working examples in `/examples`:

- `examples/simple-crud` - Basic CRUD API
- `examples/simple-events` - Event processing
- `examples/simple-functions` - Custom functions

## Support

- GitHub Issues: https://github.com/digitalminion/atakora/issues
- Documentation: https://docs.atakora.dev
- Discord: https://discord.gg/atakora
