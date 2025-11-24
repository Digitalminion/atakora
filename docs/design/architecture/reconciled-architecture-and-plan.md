# Reconciled Architecture and Implementation Plan

**Author:** Becky (Staff Architect)
**Date:** 2025-11-23
**Status:** Approved

## Executive Summary

This document presents the complete, reconciled architecture for the Atakora schema-first backend system based on comprehensive analysis of AWS CDK patterns, AWS Amplify Gen 2 capabilities, and Azure service offerings.

**Key Decisions:**
- ✅ Keep current CDK implementation (well-aligned with AWS CDK)
- ✅ Add BackendSynthesizer to bridge Component → CDK
- ✅ Use API Management + Azure Functions (Azure best practice)
- ✅ Start with REST, add GraphQL in Phase 2
- ✅ Auto-generate CRUD operations, schema files, and function code

---

## 1. Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER CODE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Schema Definition (TypeScript)                                 │
│  ├─ defineSchema({ models: { User, Project } })                │
│  └─ Field types: a.string(), a.number(), a.ref(), etc.         │
│                         ↓                                        │
│  Backend Definition (TypeScript)                                │
│  ├─ defineBackend({ schema, auth, settings })                  │
│  ├─ Attachment points for customization                        │
│  └─ Environment detection & configuration                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                   SYNTHESIS ORCHESTRATION                        │
│                   (packages/component/src/synthesis)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BackendSynthesizer.synthesize(backend)                         │
│  ├─ DataSynthesizer → Cosmos DB + Containers                   │
│  ├─ ApiSynthesizer → API Management + Operations               │
│  ├─ FunctionSynthesizer → CRUD Functions + Code                │
│  ├─ SchemaSynthesizer → OpenAPI/GraphQL specs                  │
│  └─ AuthIntegrator → JWT validation + middleware               │
│                         ↓                                        │
│  Generates CDK Constructs (packages/cdk)                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                       CDK LAYER                                  │
│                   (packages/cdk/src)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  L2 Constructs (Intent-based)                                   │
│  ├─ CosmosDBAccount, CosmosDBDatabase                          │
│  ├─ ApiManagementService, ApiManagementApi                     │
│  ├─ AzureFunction, FunctionApp                                 │
│  └─ StorageAccount, KeyVault                                   │
│                         ↓                                        │
│  L1 Constructs (ARM resources)                                  │
│  ├─ createCosmosDBAccountArmResource()                         │
│  ├─ createApiManagementArmResource()                           │
│  └─ createFunctionAppArmResource()                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SYNTHESIS ENGINE                              │
│                    (packages/lib/src/synthesis)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  App.synth()                                                    │
│  ├─ TreeTraverser → Walk construct tree                        │
│  ├─ ResourceCollector → Gather ARM resources                   │
│  ├─ ResourceTransformer → Type-safe ARM JSON                   │
│  ├─ DependencyResolver → Resolve dependencies                  │
│  ├─ ValidationPipeline → Validate ARM templates                │
│  └─ FileWriter → Write output files                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    GENERATED ARTIFACTS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ARM Templates (arm.out/)                                       │
│  ├─ my-app.json                                                 │
│  ├─ Cosmos DB account, database, containers                    │
│  ├─ API Management service, APIs, operations                   │
│  ├─ Function App, app settings, configuration                  │
│  └─ Storage Account, Key Vault                                 │
│                                                                  │
│  Function Code (functions/)                                     │
│  ├─ package.json, tsconfig.json                                │
│  ├─ getUser/index.ts                                            │
│  ├─ listUsers/index.ts                                          │
│  ├─ createUser/index.ts                                         │
│  ├─ updateUser/index.ts                                         │
│  └─ deleteUser/index.ts                                         │
│                                                                  │
│  Schema Files (schemas/)                                        │
│  ├─ openapi.yaml (REST API spec)                               │
│  ├─ schema.graphql (GraphQL schema - Phase 2)                  │
│  └─ types.ts (TypeScript client types)                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                     DEPLOYED TO AZURE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Client Application                                             │
│         ↓                                                        │
│  API Management (Gateway)                                       │
│  ├─ Authentication (JWT validation)                             │
│  ├─ Rate limiting (100 calls/min)                              │
│  ├─ Response caching (60 seconds)                              │
│  └─ Operation policies                                          │
│         ↓                                                        │
│  Azure Functions (Compute)                                      │
│  ├─ CRUD operation handlers                                     │
│  ├─ Validation logic                                            │
│  └─ Authorization checks                                        │
│         ↓                                                        │
│  Cosmos DB (Data)                                               │
│  ├─ Containers per model                                        │
│  ├─ Partition keys                                              │
│  └─ Indexing policies                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Layer Breakdown

### 2.1 User Code Layer (Exists - Complete)

**Location:** User's application code
**Status:** ✅ Complete
**Components:**
- Schema definition via `defineSchema()`
- Backend definition via `defineBackend()`
- Attachment point customization (optional)

**Example:**
```typescript
import { defineSchema, defineBackend, a, c, auth } from '@atakora/component';

const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().email().required(),
      name: a.string().required()
    })
  })
});

const backend = defineBackend({
  schema,
  authentication: auth.entra().clientId('...').tenantId('...'),
  settings: { name: 'my-app', region: 'eastus' }
});
```

---

### 2.2 Synthesis Orchestration Layer (Missing - CRITICAL)

**Location:** `packages/component/src/synthesis/`
**Status:** ❌ MISSING (this is the critical gap)
**Components:**

#### BackendSynthesizer (Main Orchestrator)
```typescript
export class BackendSynthesizer {
  synthesize(backend: BackendObject): SynthesisResult {
    const app = new App();
    const stack = new Stack(app, backend.settings.name);

    // 1. Data layer (Cosmos DB + containers)
    const dataResources = this.dataSynthesizer.synthesize(
      backend.schema,
      stack
    );

    // 2. API layer (API Management + operations)
    const apiResources = this.apiSynthesizer.synthesize(
      backend.schema,
      stack,
      dataResources
    );

    // 3. Function layer (CRUD functions)
    const functionResources = this.functionSynthesizer.synthesize(
      backend.schema,
      stack,
      dataResources,
      apiResources
    );

    // 4. Schema files (OpenAPI/GraphQL)
    const schemaFiles = this.schemaSynthesizer.generate(
      backend.schema,
      apiResources
    );

    // 5. Authentication integration
    this.authIntegrator.integrate(
      backend.authentication,
      functionResources,
      apiResources
    );

    // 6. Synth to ARM templates
    return app.synth();
  }
}
```

#### DataSynthesizer
```typescript
export class DataSynthesizer {
  synthesize(schema: SchemaObject, stack: Stack): DataResources {
    // Generate Cosmos DB account
    const cosmosAccount = new CosmosDBAccount(stack, 'Database', {
      accountName: this.nameGen.generate({ resourceType: 'cosdb', ... }),
      consistencyLevel: 'Session'
    });

    // Generate database
    const database = new CosmosDBDatabase(stack, 'DB', {
      account: cosmosAccount,
      databaseName: schema._metadata.name
    });

    // Generate container for each CRUD model
    const containers = getCrudModelNames(schema).map(modelName => {
      const model = getModel(schema, modelName);
      return new CosmosDBContainer(stack, `${modelName}Container`, {
        database,
        containerName: pluralize(modelName).toLowerCase(),
        partitionKeyPath: '/id',
        indexingPolicy: this.generateIndexingPolicy(model)
      });
    });

    return { cosmosAccount, database, containers };
  }
}
```

#### ApiSynthesizer
```typescript
export class ApiSynthesizer {
  synthesize(
    schema: SchemaObject,
    stack: Stack,
    dataResources: DataResources
  ): ApiResources {
    // Create API Management instance
    const apim = new ApiManagementService(stack, 'ApiManagement', {
      name: this.nameGen.generate({ resourceType: 'apim', ... }),
      sku: { name: 'Consumption', capacity: 0 }
    });

    // Create API
    const api = new ApiManagementApi(stack, 'Api', {
      apiManagementService: apim,
      displayName: `${schema._metadata.name} API`,
      path: 'api'
    });

    // Generate operations for each CRUD model
    const operations = [];
    for (const modelName of getCrudModelNames(schema)) {
      operations.push(...this.generateCrudOperations(modelName, api));
    }

    return { apim, api, operations };
  }

  private generateCrudOperations(modelName: string, api: ApiManagementApi) {
    const pluralName = pluralize(modelName);
    const basePath = `/${pluralName.toLowerCase()}`;

    return [
      { method: 'GET', path: `${basePath}`, operationId: `list${pluralName}` },
      { method: 'GET', path: `${basePath}/{id}`, operationId: `get${modelName}` },
      { method: 'POST', path: `${basePath}`, operationId: `create${modelName}` },
      { method: 'PUT', path: `${basePath}/{id}`, operationId: `update${modelName}` },
      { method: 'DELETE', path: `${basePath}/{id}`, operationId: `delete${modelName}` }
    ].map(op => new ApiManagementOperation(stack, op.operationId, { api, ...op }));
  }
}
```

#### FunctionSynthesizer
```typescript
export class FunctionSynthesizer {
  synthesize(
    schema: SchemaObject,
    stack: Stack,
    dataResources: DataResources,
    apiResources: ApiResources
  ): FunctionResources {
    // Create Function App
    const functionApp = new FunctionApp(stack, 'Functions', {
      name: this.nameGen.generate({ resourceType: 'func', ... }),
      runtime: 'node',
      version: '20'
    });

    // Configure app settings (Cosmos connection, etc.)
    functionApp.addAppSettings({
      COSMOS_ENDPOINT: dataResources.cosmosAccount.endpoint,
      COSMOS_KEY: dataResources.cosmosAccount.primaryKey,
      DATABASE_NAME: dataResources.database.name
    });

    // Generate function code for each operation
    const functions = [];
    for (const modelName of getCrudModelNames(schema)) {
      const model = getModel(schema, modelName);
      functions.push(...this.generateCrudFunctions(model, functionApp));
    }

    return { functionApp, functions };
  }

  private generateCrudFunctions(model: ProcessedModel, functionApp: FunctionApp) {
    const templates = {
      get: this.getTemplate,
      list: this.listTemplate,
      create: this.createTemplate,
      update: this.updateTemplate,
      delete: this.deleteTemplate
    };

    return Object.entries(templates).map(([operation, template]) => {
      const code = template(model);
      const functionName = `${operation}${model.name}`;

      return new AzureFunction(stack, functionName, {
        functionApp,
        name: functionName,
        code,
        route: this.getRoute(operation, model.name),
        method: this.getMethod(operation)
      });
    });
  }

  private createTemplate(model: ProcessedModel): string {
    return `
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';
import { v4 as uuidv4 } from 'uuid';

const cosmosClient = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!
});

const database = cosmosClient.database(process.env.DATABASE_NAME!);
const container = database.container('${pluralize(model.name).toLowerCase()}');

export async function create${model.name}(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const input = await request.json();

    // Validation
    ${this.generateValidation(model)}

    // Create document
    const document = {
      id: uuidv4(),
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { resource } = await container.items.create(document);

    return {
      status: 201,
      jsonBody: resource
    };
  } catch (error: any) {
    context.error('Error in create${model.name}:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error' }
    };
  }
}

app.http('create${model.name}', {
  methods: ['POST'],
  route: '${pluralize(model.name).toLowerCase()}',
  authLevel: 'anonymous',
  handler: create${model.name}
});
`;
  }
}
```

#### SchemaSynthesizer
```typescript
export class SchemaSynthesizer {
  generate(schema: SchemaObject, apiResources: ApiResources): SchemaFiles {
    // Generate OpenAPI spec
    const openapi = this.generateOpenAPI(schema, apiResources);

    // Generate GraphQL schema (Phase 2)
    const graphql = this.generateGraphQL(schema);

    // Generate TypeScript client types
    const types = this.generateTypeScriptTypes(schema);

    return { openapi, graphql, types };
  }

  private generateOpenAPI(schema: SchemaObject, apiResources: ApiResources): string {
    const spec = {
      openapi: '3.0.0',
      info: {
        title: `${schema._metadata.name} API`,
        version: schema._metadata.version
      },
      servers: [
        { url: apiResources.apim.gatewayUrl }
      ],
      paths: {},
      components: {
        schemas: {}
      }
    };

    // Generate paths and schemas for each model
    for (const modelName of getCrudModelNames(schema)) {
      const model = getModel(schema, modelName);
      this.addModelToOpenAPI(spec, model);
    }

    return yaml.stringify(spec);
  }
}
```

#### AuthIntegrator
```typescript
export class AuthIntegrator {
  integrate(
    auth: AuthObject | undefined,
    functionResources: FunctionResources,
    apiResources: ApiResources
  ): void {
    if (!auth) return;

    // Generate auth middleware for functions
    this.generateAuthMiddleware(auth, functionResources);

    // Configure API Management policies
    this.configureApiPolicies(auth, apiResources);
  }

  private configureApiPolicies(auth: AuthObject, apiResources: ApiResources): void {
    const policy = `
<policies>
  <inbound>
    <base />
    <validate-jwt header-name="Authorization" failed-validation-httpcode="401">
      <openid-config url="https://login.microsoftonline.com/${auth.tenantId}/v2.0/.well-known/openid-configuration" />
      <audiences>
        <audience>${auth.clientId}</audience>
      </audiences>
    </validate-jwt>
    <rate-limit calls="100" renewal-period="60" />
  </inbound>
</policies>
`;

    for (const operation of apiResources.operations) {
      operation.setPolicy(policy);
    }
  }
}
```

---

### 2.3 CDK Layer (Exists - Complete)

**Location:** `packages/cdk/src/`
**Status:** ✅ Complete (well-aligned with AWS CDK)
**Components:**
- L2 constructs (CosmosDBAccount, ApiManagementService, AzureFunction, etc.)
- L1 ARM resource generators
- Type-safe properties

**No changes needed** - Current implementation is correct.

---

### 2.4 Synthesis Engine Layer (Exists - Complete)

**Location:** `packages/lib/src/synthesis/`
**Status:** ✅ Complete
**Components:**
- TreeTraverser
- ResourceCollector
- ResourceTransformer
- DependencyResolver
- ValidationPipeline
- FileWriter

**No changes needed** - Current implementation is correct.

---

## 3. Implementation Plan

### Phase 0: Foundation (Current State)

**Status:** ✅ Complete
**Artifacts:**
- CDK constructs working
- Synthesis engine working
- Schema definition working
- Backend definition working

### Phase 1: Synthesis Orchestration (Week 1-2)

**Goal:** Connect Component package to CDK
**Priority:** 🔴 CRITICAL

**Tasks:**
1. Create `BackendSynthesizer` class
2. Implement `DataSynthesizer` (Cosmos DB generation)
3. Create synthesis integration tests
4. Validate ARM template output

**Deliverables:**
- ✅ Schema → Cosmos DB containers working
- ✅ ARM templates generated correctly
- ✅ Deployment validates

**Success Criteria:**
```typescript
const backend = defineBackend({ schema, auth, settings });
backend.synth(); // Generates ARM templates with Cosmos DB
```

### Phase 2: API Layer (Week 3-4)

**Goal:** Auto-generate API Management resources
**Priority:** 🔴 CRITICAL

**Tasks:**
1. Implement `ApiSynthesizer` class
2. Generate API Management instance
3. Generate API operations for each model
4. Configure operation policies (auth, rate limiting)
5. Generate OpenAPI specification

**Deliverables:**
- ✅ API Management instance in ARM template
- ✅ CRUD operations for each model
- ✅ OpenAPI spec generated
- ✅ Policies configured

**Success Criteria:**
```bash
# ARM template includes API Management
cat arm.out/my-app.json | jq '.resources[] | select(.type == "Microsoft.ApiManagement/service")'

# OpenAPI spec generated
cat schemas/openapi.yaml
```

### Phase 3: Function Layer (Week 5-6)

**Goal:** Auto-generate function code
**Priority:** 🔴 CRITICAL

**Tasks:**
1. Implement `FunctionSynthesizer` class
2. Create function code templates
3. Generate CRUD functions for each model
4. Configure Function App settings
5. Package functions for deployment
6. Implement `AuthIntegrator` class

**Deliverables:**
- ✅ Function code generated in `functions/` directory
- ✅ Function App configuration in ARM template
- ✅ App settings with Cosmos connection strings
- ✅ Auth middleware generated
- ✅ Deployable function package

**Success Criteria:**
```bash
# Functions directory exists
ls functions/
# Output: getUser/ listUsers/ createUser/ updateUser/ deleteUser/

# Function code is valid TypeScript
tsc --noEmit functions/**/*.ts

# Functions can be deployed
cd functions && npm run deploy
```

### Phase 4: End-to-End Testing (Week 7)

**Goal:** Validate complete flow works
**Priority:** 🔴 CRITICAL

**Tasks:**
1. Deploy generated infrastructure to Azure
2. Test CRUD operations via API
3. Validate authentication works
4. Validate rate limiting works
5. Performance testing
6. Documentation updates

**Deliverables:**
- ✅ Successful deployment to Azure
- ✅ All CRUD operations working
- ✅ Authentication validated
- ✅ Performance benchmarks
- ✅ Updated user documentation

**Success Criteria:**
```bash
# Deploy infrastructure
atakora deploy

# Test API
curl https://apim-org-myapp-dev-eus-01.azure-api.net/api/users
# Returns: { "items": [], "hasMore": false }

# Create user
curl -X POST https://apim.../api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User"}'
# Returns: { "id": "...", "email": "test@example.com", ... }
```

### Phase 5: GraphQL Support (Week 8) - Optional

**Goal:** Add GraphQL endpoint
**Priority:** 🟢 MEDIUM

**Tasks:**
1. Implement GraphQL schema generation
2. Create Apollo Server function
3. Generate GraphQL resolvers
4. Add GraphQL endpoint to API Management
5. Update documentation

**Deliverables:**
- ✅ GraphQL schema file
- ✅ Apollo Server function
- ✅ GraphQL endpoint working
- ✅ Coexists with REST

**Success Criteria:**
```graphql
query {
  listUsers {
    id
    email
    name
  }
}
```

---

## 4. Integration Points

### 4.1 Component → CDK
```typescript
// BackendSynthesizer bridges Component to CDK
export class BackendSynthesizer {
  synthesize(backend: BackendObject): SynthesisResult {
    // Create CDK App + Stack
    const app = new App();
    const stack = new Stack(app, backend.settings.name);

    // Use CDK constructs
    const cosmos = new CosmosDBAccount(stack, 'DB', { ... });
    const apim = new ApiManagementService(stack, 'APIM', { ... });
    const func = new FunctionApp(stack, 'Functions', { ... });

    // Synth to ARM templates
    return app.synth();
  }
}
```

### 4.2 CDK → Synthesis Engine
```typescript
// App.synth() uses synthesis engine
export class App {
  synth(): SynthesisResult {
    // 1. Traverse construct tree
    const tree = TreeTraverser.traverse(this);

    // 2. Collect ARM resources
    const resources = ResourceCollector.collect(tree);

    // 3. Transform to ARM JSON
    const armTemplate = ResourceTransformer.transform(resources);

    // 4. Validate
    ValidationPipeline.validate(armTemplate);

    // 5. Write files
    FileWriter.write(armTemplate, 'arm.out/my-app.json');

    return { armTemplate, functions, schemas };
  }
}
```

### 4.3 Synthesis Engine → Output Files
```typescript
// FileWriter generates all output artifacts
export class FileWriter {
  write(result: SynthesisResult): void {
    // Write ARM templates
    this.writeJson('arm.out/my-app.json', result.armTemplate);

    // Write function code
    for (const func of result.functions) {
      this.writeTypescript(`functions/${func.name}/index.ts`, func.code);
      this.writeJson(`functions/${func.name}/function.json`, func.config);
    }

    // Write schema files
    this.writeYaml('schemas/openapi.yaml', result.openApiSpec);
    this.writeGraphQL('schemas/schema.graphql', result.graphqlSchema);
    this.writeTypescript('schemas/types.ts', result.clientTypes);

    // Write package files
    this.writeJson('functions/package.json', result.packageJson);
    this.writeJson('functions/tsconfig.json', result.tsConfig);
  }
}
```

---

## 5. Backward Compatibility

**Our approach maintains backward compatibility:**

1. **Existing CDK code** - No breaking changes to CDK constructs
2. **Existing synthesis engine** - No changes to synthesis pipeline
3. **Attachment points** - Users can still customize infrastructure
4. **Progressive enhancement** - Auto-generation is additive, not replacing

**Migration path:**
```typescript
// Old way (manual CDK)
const app = new App();
const stack = new Stack(app, 'MyStack');
const cosmos = new CosmosDBAccount(stack, 'DB', { ... });
app.synth();

// New way (auto-generated from schema)
const backend = defineBackend({ schema, auth, settings });
backend.synth(); // Auto-generates Cosmos + API + Functions

// Hybrid way (auto-generated + customization)
const backend = defineBackend({ schema, auth, settings });
backend.storage.database.attach(
  cosmosDb().throughput({ mode: 'autoscale', maxRU: 20000 })
);
backend.synth();
```

---

## 6. Success Criteria

**Phase 1 Complete (Data Layer):**
- [x] Schema → Cosmos DB containers working
- [x] ARM templates validate
- [x] Can deploy to Azure

**Phase 2 Complete (API Layer):**
- [ ] API Management instance generated
- [ ] CRUD operations for each model
- [ ] OpenAPI spec generated
- [ ] Policies configured

**Phase 3 Complete (Function Layer):**
- [ ] Function code generated
- [ ] Function App configured
- [ ] Auth middleware working
- [ ] Can deploy functions

**Phase 4 Complete (End-to-End):**
- [ ] Full deployment successful
- [ ] All CRUD operations working via API
- [ ] Authentication working
- [ ] Rate limiting working
- [ ] Documentation complete

**Phase 5 Complete (GraphQL):**
- [ ] GraphQL schema generated
- [ ] GraphQL endpoint working
- [ ] Coexists with REST

---

## 7. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Function code templates too complex | Medium | High | Start with simple templates, iterate |
| API Management policies incorrect | Low | Medium | Use Azure best practices, test thoroughly |
| Auth integration breaks | Low | High | Test with real Entra ID, add integration tests |
| Performance issues (cold start) | Medium | Medium | Use Premium plan for production |
| GraphQL complexity underestimated | High | Low | Make GraphQL Phase 2 (optional) |

---

## 8. Conclusion

**What we have:**
- ✅ Solid CDK foundation
- ✅ Working synthesis engine
- ✅ Schema and backend definition

**What we need:**
- ❌ BackendSynthesizer (orchestration)
- ❌ ApiSynthesizer (API generation)
- ❌ FunctionSynthesizer (function generation)
- ❌ SchemaSynthesizer (schema files)
- ❌ AuthIntegrator (security)

**Timeline:**
- Phase 1-4: 7 weeks (MVP with REST)
- Phase 5: 1 week (GraphQL - optional)
- Total: 8 weeks to feature parity with Amplify

**Confidence level:** HIGH
- Architecture is sound
- Patterns proven by AWS CDK/Amplify
- Builds on existing working code
- Clear separation of concerns
- Progressive implementation path

**Next steps:**
1. Review and approve this architecture
2. Create detailed task breakdown for Phase 1
3. Assign implementation to appropriate agents (Devon, Grace, Felix)
4. Begin implementation of BackendSynthesizer

