# Phase 7 Implementation Plan: Synthesis & ARM Template Generation

**Date**: 2025-11-20
**Author**: Becky (Staff Architect)
**Phase**: 7 of 10
**Duration**: 3 weeks (15 business days)
**Status**: Planning Complete - Ready for Implementation

---

## Executive Summary

Phase 7 implements the synthesis system that transforms the backend definition (from Phase 4) into deployable ARM templates. This is the critical bridge from developer-friendly configuration to production Azure infrastructure.

**Key Innovation**: Context-aware synthesis pipeline that assigns resources to templates BEFORE ARM generation, enabling correct cross-template references and dependency resolution.

**Timeline**: 3 weeks (vs 2 weeks for Phase 4) - More complex due to ARM generation

**Prerequisites**:

- ✅ Phase 1: Schema System (Complete)
- ✅ Phase 2: Authentication System (Complete)
- 🚧 Phase 4: Backend Assembly (In Progress - 5 Devon agents)
- ⬜ Phase 7: Synthesis (This plan)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Context-Aware Synthesis Pipeline](#2-context-aware-synthesis-pipeline)
3. [ARM Template Generation](#3-arm-template-generation)
4. [Asset Management](#4-asset-management)
5. [Resource Dependencies](#5-resource-dependencies)
6. [CLI Integration](#6-cli-integration)
7. [Implementation Tasks](#7-implementation-tasks)
8. [Testing Strategy](#8-testing-strategy)
9. [Success Criteria](#9-success-criteria)
10. [Risk Assessment](#10-risk-assessment)

---

## 1. Architecture Overview

### 1.1 Synthesis Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ USER CODE: defineBackend({ schema, auth, settings })           │
│   - CRUD models → 5 REST endpoints + Cosmos container          │
│   - Event models → Queue + Processor function                  │
│   - Function models → HTTP endpoint                            │
│   - Infrastructure attachments (optional)                      │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: METADATA COLLECTION                                   │
│   - BackendObject → Resource Metadata (lightweight)            │
│   - No ARM generation yet                                      │
│   - Estimate sizes, identify dependencies                      │
│   - Determine grouping requirements                            │
│                                                                 │
│   Output: ResourceMetadata[] per resource                      │
│     { id, type, name, dependencies, sizeEstimate }             │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: TEMPLATE ASSIGNMENT                                   │
│   - TemplateSplitter analyzes metadata                         │
│   - Decides which resources go in which templates              │
│   - Groups related resources (e.g., function + storage)        │
│   - Respects size limits (3MB default)                         │
│                                                                 │
│   Output: TemplateAssignments                                  │
│     { 'resource1': 'main.json', 'resource2': 'linked1.json' }  │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: ARM GENERATION WITH CONTEXT                           │
│   - SynthesisContext provides template assignments             │
│   - Resources generate correct expressions for their location  │
│   - Cross-template references use parameters                   │
│   - No post-processing needed                                  │
│                                                                 │
│   Output: ArmTemplate[] with correct references                │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 4: ASSET PACKAGING                                       │
│   - Bundle function code                                       │
│   - Upload file assets to blob storage                         │
│   - Generate SAS tokens for deployment                         │
│   - Create deployment packages                                 │
│                                                                 │
│   Output: FunctionPackage[], AssetManifest                     │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 5: VALIDATION                                            │
│   - ARM schema validation                                      │
│   - Naming conventions                                         │
│   - Azure limits (template size, resource count)               │
│   - Dependency cycles                                          │
│                                                                 │
│   Output: ValidationResult                                     │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 6: ASSEMBLY & FILE WRITING                               │
│   - Write main.json                                            │
│   - Write linked templates (if split)                          │
│   - Write function packages                                    │
│   - Generate manifest.json                                     │
│   - Create deployment scripts                                  │
│                                                                 │
│   Output: arm.out/ directory ready for deployment              │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Design Decisions

1. **Context-Aware Synthesis**: Metadata collection happens BEFORE ARM generation (ADR-019)
2. **Linked Templates by Default**: Use linked templates to avoid size limits
3. **Function Code Bundling**: Package functions as deployment artifacts
4. **Deterministic Output**: Same input always produces same ARM templates
5. **Clear Error Messages**: Validation failures include actionable suggestions

### 1.3 Backend to ARM Transformation

**Example: Simple Backend**

```typescript
// INPUT: User's backend definition
const backend = defineBackend({
  schema: defineSchema({
    schema: a.schema({
      User: c.model({ id: a.id(), email: a.string().required() }),
    }),
  }),
  authentication: defineAuth({
    Primary: auth.entra().tenant('...').clientId('...'),
  }),
  settings: { name: 'my-app' },
});
```

**OUTPUT: ARM Templates**

```
arm.out/
├── main.json                 # Main deployment template
│   ├── Storage Account      # For queues, blobs, function packages
│   ├── Cosmos DB            # User container with partition key
│   ├── Function App         # 5 CRUD endpoints (GET, POST, PUT, DELETE, LIST)
│   ├── Application Insights # Monitoring
│   └── Key Vault            # Secrets management
├── linked/
│   └── functions.json       # If template split due to size
├── packages/
│   └── functions.zip        # Bundled function code
└── manifest.json            # Deployment metadata
```

---

## 2. Context-Aware Synthesis Pipeline

### 2.1 Metadata Collection (Phase 1)

**Purpose**: Collect lightweight metadata WITHOUT generating ARM templates.

**Interface**:

```typescript
// src/synthesis/metadata-collector.ts

export interface ResourceMetadata {
  /**
   * Unique resource identifier (used for dependency tracking)
   */
  id: string;

  /**
   * ARM resource type (e.g., 'Microsoft.Storage/storageAccounts')
   */
  type: string;

  /**
   * Resource name
   */
  name: string;

  /**
   * Resource IDs this depends on
   */
  dependencies: string[];

  /**
   * Estimated ARM JSON size in bytes
   */
  sizeEstimate: number;

  /**
   * Resources that must be in same template
   */
  requiresSameTemplate?: string[];

  /**
   * Template preference: 'main', 'linked', or 'any'
   */
  templatePreference?: 'main' | 'linked' | 'any';

  /**
   * Resource-specific metadata for synthesis
   */
  metadata?: Record<string, any>;
}

export class MetadataCollector {
  /**
   * Collect metadata from backend object
   */
  collect(backend: BackendObject<any, any>): ResourceMetadata[] {
    const metadata: ResourceMetadata[] = [];

    // Core infrastructure
    metadata.push(...this.collectStorageMetadata(backend));
    metadata.push(...this.collectDatabaseMetadata(backend));
    metadata.push(...this.collectComputeMetadata(backend));
    metadata.push(...this.collectMonitoringMetadata(backend));

    // Optional infrastructure
    if (backend.network) {
      metadata.push(...this.collectNetworkMetadata(backend));
    }
    if (backend.performance) {
      metadata.push(...this.collectPerformanceMetadata(backend));
    }

    // Schema-generated resources
    metadata.push(...this.collectSchemaResourceMetadata(backend));

    return metadata;
  }

  private collectStorageMetadata(backend: BackendObject<any, any>): ResourceMetadata[] {
    const config = backend.storage.account.getConfig();

    return [
      {
        id: 'storage-account',
        type: 'Microsoft.Storage/storageAccounts',
        name: config.name || `${backend.settings.name}storage`,
        dependencies: [],
        sizeEstimate: 800, // Typical storage account ARM size
        templatePreference: 'main', // Core resource in main template
        metadata: {
          sku: config.sku,
          tier: config.tier,
        },
      },
    ];
  }

  private collectDatabaseMetadata(backend: BackendObject<any, any>): ResourceMetadata[] {
    const config = backend.storage.database.getConfig();
    const metadata: ResourceMetadata[] = [];

    // Cosmos DB account
    metadata.push({
      id: 'cosmos-account',
      type: 'Microsoft.DocumentDB/databaseAccounts',
      name: config.name || `${backend.settings.name}-cosmos`,
      dependencies: [],
      sizeEstimate: 1200,
      templatePreference: 'main',
    });

    // Cosmos DB database
    metadata.push({
      id: 'cosmos-database',
      type: 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases',
      name: `${config.name}/database`,
      dependencies: ['cosmos-account'],
      sizeEstimate: 400,
      requiresSameTemplate: ['cosmos-account'],
    });

    // Containers for each CRUD model
    for (const modelName in backend.schema.models) {
      const model = backend.schema.models[modelName];
      if (model.type === 'crud') {
        metadata.push({
          id: `cosmos-container-${modelName.toLowerCase()}`,
          type: 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers',
          name: `${config.name}/database/${modelName}`,
          dependencies: ['cosmos-database'],
          sizeEstimate: 600,
          requiresSameTemplate: ['cosmos-account', 'cosmos-database'],
        });
      }
    }

    return metadata;
  }

  private collectComputeMetadata(backend: BackendObject<any, any>): ResourceMetadata[] {
    const config = backend.compute.functionApp.getConfig();
    const metadata: ResourceMetadata[] = [];

    // Function App
    metadata.push({
      id: 'function-app',
      type: 'Microsoft.Web/sites',
      name: config.name || `${backend.settings.name}-func`,
      dependencies: ['storage-account', 'cosmos-account', 'app-insights'],
      sizeEstimate: 2000, // Functions can be large with app settings
      templatePreference: 'linked', // Complex resource, prefer linked template
      metadata: {
        plan: config.plan,
        runtime: config.runtime,
      },
    });

    // App Service Plan (if Premium/Dedicated)
    if (config.plan !== 'Consumption') {
      metadata.push({
        id: 'app-service-plan',
        type: 'Microsoft.Web/serverfarms',
        name: `${config.name}-plan`,
        dependencies: [],
        sizeEstimate: 500,
        templatePreference: 'main',
      });
    }

    return metadata;
  }

  private collectSchemaResourceMetadata(backend: BackendObject<any, any>): ResourceMetadata[] {
    const metadata: ResourceMetadata[] = [];

    for (const modelName in backend.schema.models) {
      const model = backend.schema.models[modelName];

      if (model.type === 'event') {
        // Queue for event model
        metadata.push({
          id: `queue-${modelName.toLowerCase()}`,
          type: 'Microsoft.Storage/storageAccounts/queueServices/queues',
          name: `storage-account/default/${modelName.toLowerCase()}`,
          dependencies: ['storage-account'],
          sizeEstimate: 300,
          requiresSameTemplate: ['storage-account'],
        });
      }
    }

    return metadata;
  }
}
```

### 2.2 Template Assignment (Phase 2)

**Purpose**: Decide which resources go in which templates based on metadata.

**Strategy**:

```typescript
// src/synthesis/template-assigner.ts

export interface TemplateAssignments {
  /**
   * Map of resource ID to template name
   */
  assignments: Map<string, string>;

  /**
   * Metadata about each template
   */
  templates: Map<string, TemplateMetadata>;
}

export interface TemplateMetadata {
  name: string;
  type: 'main' | 'linked';
  estimatedSize: number;
  resources: string[]; // Resource IDs in this template
}

export interface AssignmentOptions {
  maxTemplateSize: number;
  groupingStrategy: 'minimize-cross-refs' | 'balance-size' | 'type-based';
  preferLinkedTemplates: boolean;
}

export class TemplateAssigner {
  assign(metadata: ResourceMetadata[], options: AssignmentOptions): TemplateAssignments {
    const assignments = new Map<string, string>();
    const templates = new Map<string, TemplateMetadata>();

    // Start with main template
    let currentTemplate: TemplateMetadata = {
      name: 'main',
      type: 'main',
      estimatedSize: 0,
      resources: [],
    };
    templates.set('main', currentTemplate);

    // Sort resources by dependency order (topological sort)
    const sorted = this.topologicalSort(metadata);

    // Assign resources to templates
    for (const resource of sorted) {
      // Check if resource has preference or requirements
      const preferredTemplate = this.getPreferredTemplate(resource, assignments);

      // Check if adding resource would exceed size limit
      const wouldExceedLimit =
        currentTemplate.estimatedSize + resource.sizeEstimate > options.maxTemplateSize;

      if (wouldExceedLimit && options.preferLinkedTemplates) {
        // Create new linked template
        const linkedName = `linked${templates.size}`;
        currentTemplate = {
          name: linkedName,
          type: 'linked',
          estimatedSize: 0,
          resources: [],
        };
        templates.set(linkedName, currentTemplate);
      }

      // Assign resource to current template
      assignments.set(resource.id, currentTemplate.name);
      currentTemplate.resources.push(resource.id);
      currentTemplate.estimatedSize += resource.sizeEstimate;
    }

    return { assignments, templates };
  }

  private getPreferredTemplate(
    resource: ResourceMetadata,
    assignments: Map<string, string>
  ): string | undefined {
    // Check if resource must be in same template as others
    if (resource.requiresSameTemplate) {
      for (const requiredId of resource.requiresSameTemplate) {
        const template = assignments.get(requiredId);
        if (template) {
          return template;
        }
      }
    }

    // Check template preference
    if (resource.templatePreference === 'main') {
      return 'main';
    }

    return undefined;
  }

  private topologicalSort(metadata: ResourceMetadata[]): ResourceMetadata[] {
    // Topological sort based on dependencies
    const visited = new Set<string>();
    const result: ResourceMetadata[] = [];
    const metadataMap = new Map(metadata.map((m) => [m.id, m]));

    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const resource = metadataMap.get(id);
      if (!resource) return;

      // Visit dependencies first
      for (const dep of resource.dependencies) {
        visit(dep);
      }

      result.push(resource);
    };

    for (const resource of metadata) {
      visit(resource.id);
    }

    return result;
  }
}
```

### 2.3 Synthesis Context (Phase 3)

**Purpose**: Provide template assignment context during ARM generation.

```typescript
// src/synthesis/synthesis-context.ts

export class SynthesisContext {
  constructor(
    private assignments: TemplateAssignments,
    private currentTemplate: string
  ) {}

  /**
   * Get the template assigned to a resource
   */
  getResourceTemplate(resourceId: string): string {
    const template = this.assignments.assignments.get(resourceId);
    if (!template) {
      throw new Error(`No template assigned to resource: ${resourceId}`);
    }
    return template;
  }

  /**
   * Check if a resource is in the current template
   */
  isInCurrentTemplate(resourceId: string): boolean {
    return this.getResourceTemplate(resourceId) === this.currentTemplate;
  }

  /**
   * Generate ARM expression for resource reference.
   *
   * If resource is in same template: direct reference
   * If resource is in different template: parameter reference
   */
  resourceReference(resourceId: string, property?: string): string {
    if (this.isInCurrentTemplate(resourceId)) {
      // Same template - direct reference
      const expr = `resourceId('${resourceId}')`;
      return property ? `${expr}.${property}` : expr;
    } else {
      // Different template - use parameter
      const paramName = this.getParameterName(resourceId, property);
      return `parameters('${paramName}')`;
    }
  }

  /**
   * Generate ARM expression for resource output.
   * Used when exposing values to linked templates.
   */
  resourceOutput(resourceId: string, property?: string): string {
    const expr = `resourceId('${resourceId}')`;
    return property ? `${expr}.${property}` : expr;
  }

  /**
   * Get parameter name for cross-template reference
   */
  private getParameterName(resourceId: string, property?: string): string {
    const baseName = resourceId.replace(/[^a-zA-Z0-9]/g, '');
    return property ? `${baseName}${property}` : baseName;
  }
}
```

---

## 3. ARM Template Generation

### 3.1 Resource to ARM Transformation

**Interface**:

```typescript
// Each resource type implements this interface

export abstract class SynthesizableResource {
  /**
   * Phase 1: Generate lightweight metadata
   */
  abstract toMetadata(): ResourceMetadata;

  /**
   * Phase 3: Generate ARM template with context awareness
   */
  abstract toArmTemplate(context: SynthesisContext): ArmResource;
}
```

**Example: Storage Account**

```typescript
export class StorageAccountResource extends SynthesizableResource {
  constructor(private config: StorageAccountConfig) {
    super();
  }

  toMetadata(): ResourceMetadata {
    return {
      id: 'storage-account',
      type: 'Microsoft.Storage/storageAccounts',
      name: this.config.name,
      dependencies: [],
      sizeEstimate: 800,
      templatePreference: 'main',
    };
  }

  toArmTemplate(context: SynthesisContext): ArmResource {
    return {
      type: 'Microsoft.Storage/storageAccounts',
      apiVersion: '2023-01-01',
      name: this.config.name,
      location: '[resourceGroup().location]',
      sku: {
        name: this.config.sku,
      },
      kind: 'StorageV2',
      properties: {
        supportsHttpsTrafficOnly: true,
        minimumTlsVersion: 'TLS1_2',
        allowBlobPublicAccess: false,
        networkAcls: {
          defaultAction: this.config.publicAccess ? 'Allow' : 'Deny',
        },
      },
    };
  }
}
```

**Example: Function App with Cross-Template References**

```typescript
export class FunctionAppResource extends SynthesizableResource {
  constructor(
    private config: FunctionAppConfig,
    private dependencies: {
      storageAccountId: string;
      cosmosAccountId: string;
      appInsightsId: string;
    }
  ) {
    super();
  }

  toMetadata(): ResourceMetadata {
    return {
      id: 'function-app',
      type: 'Microsoft.Web/sites',
      name: this.config.name,
      dependencies: [
        this.dependencies.storageAccountId,
        this.dependencies.cosmosAccountId,
        this.dependencies.appInsightsId,
      ],
      sizeEstimate: 2000,
      templatePreference: 'linked',
    };
  }

  toArmTemplate(context: SynthesisContext): ArmResource {
    // Context-aware: references may be in different templates
    const storageConnection = this.getStorageConnection(context);
    const cosmosConnection = this.getCosmosConnection(context);
    const appInsightsKey = this.getAppInsightsKey(context);

    return {
      type: 'Microsoft.Web/sites',
      apiVersion: '2023-01-01',
      name: this.config.name,
      location: '[resourceGroup().location]',
      kind: 'functionapp',
      dependsOn: this.getDependsOn(context),
      properties: {
        serverFarmId: this.getAppServicePlanId(context),
        siteConfig: {
          appSettings: [
            {
              name: 'AzureWebJobsStorage',
              value: storageConnection, // May be parameter if in different template
            },
            {
              name: 'COSMOS_ENDPOINT',
              value: cosmosConnection, // May be parameter if in different template
            },
            {
              name: 'APPINSIGHTS_INSTRUMENTATIONKEY',
              value: appInsightsKey, // May be parameter if in different template
            },
            // ... other settings
          ],
        },
      },
    };
  }

  private getStorageConnection(context: SynthesisContext): string {
    const storageId = this.dependencies.storageAccountId;

    if (context.isInCurrentTemplate(storageId)) {
      // Same template - generate connection string directly
      return `[concat('DefaultEndpointsProtocol=https;AccountName=', ${context.resourceReference(storageId, 'name')}, ';AccountKey=', listKeys(${context.resourceReference(storageId)}, '2023-01-01').keys[0].value)]`;
    } else {
      // Different template - use parameter
      return context.resourceReference(storageId, 'connectionString');
    }
  }

  private getDependsOn(context: SynthesisContext): string[] {
    const deps: string[] = [];

    // Only add dependsOn for resources in same template
    for (const depId of Object.values(this.dependencies)) {
      if (context.isInCurrentTemplate(depId)) {
        deps.push(context.resourceReference(depId));
      }
    }

    return deps;
  }
}
```

### 3.2 Template Structure

**Main Template**:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "type": "string",
      "defaultValue": "development",
      "allowedValues": ["development", "staging", "production"]
    },
    "location": {
      "type": "string",
      "defaultValue": "[resourceGroup().location]"
    }
  },
  "variables": {
    "appName": "my-app",
    "storageAccountName": "[concat(variables('appName'), uniqueString(resourceGroup().id))]",
    "cosmosAccountName": "[concat(variables('appName'), '-cosmos')]"
  },
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "apiVersion": "2023-01-01",
      "name": "[variables('storageAccountName')]",
      "location": "[parameters('location')]",
      "sku": { "name": "Standard_LRS" },
      "kind": "StorageV2",
      "properties": { "supportsHttpsTrafficOnly": true }
    },
    {
      "type": "Microsoft.DocumentDB/databaseAccounts",
      "apiVersion": "2023-04-15",
      "name": "[variables('cosmosAccountName')]",
      "location": "[parameters('location')]",
      "kind": "GlobalDocumentDB",
      "properties": { "databaseAccountOfferType": "Standard" }
    },
    {
      "type": "Microsoft.Resources/deployments",
      "apiVersion": "2022-09-01",
      "name": "linked-functions",
      "properties": {
        "mode": "Incremental",
        "templateLink": {
          "uri": "[concat(deployment().properties.templateLink.uri, '/../linked/functions.json')]"
        },
        "parameters": {
          "storageAccountId": {
            "value": "[resourceId('Microsoft.Storage/storageAccounts', variables('storageAccountName'))]"
          },
          "cosmosAccountId": {
            "value": "[resourceId('Microsoft.DocumentDB/databaseAccounts', variables('cosmosAccountName'))]"
          }
        }
      },
      "dependsOn": [
        "[resourceId('Microsoft.Storage/storageAccounts', variables('storageAccountName'))]",
        "[resourceId('Microsoft.DocumentDB/databaseAccounts', variables('cosmosAccountName'))]"
      ]
    }
  ],
  "outputs": {
    "functionAppName": {
      "type": "string",
      "value": "[reference('linked-functions').outputs.functionAppName.value]"
    }
  }
}
```

**Linked Template** (functions.json):

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "storageAccountId": {
      "type": "string"
    },
    "cosmosAccountId": {
      "type": "string"
    }
  },
  "variables": {
    "functionAppName": "my-app-func"
  },
  "resources": [
    {
      "type": "Microsoft.Web/sites",
      "apiVersion": "2023-01-01",
      "name": "[variables('functionAppName')]",
      "location": "[resourceGroup().location]",
      "kind": "functionapp",
      "properties": {
        "siteConfig": {
          "appSettings": [
            {
              "name": "AzureWebJobsStorage",
              "value": "[concat('DefaultEndpointsProtocol=https;AccountName=', reference(parameters('storageAccountId')).name, ';AccountKey=', listKeys(parameters('storageAccountId'), '2023-01-01').keys[0].value)]"
            }
          ]
        }
      }
    }
  ],
  "outputs": {
    "functionAppName": {
      "type": "string",
      "value": "[variables('functionAppName')]"
    }
  }
}
```

---

## 4. Asset Management

### 4.1 Function Code Bundling

**Purpose**: Package function handler code for deployment.

```typescript
// src/synthesis/function-packager.ts

export interface FunctionPackage {
  name: string;
  packagePath: string; // Path to .zip file
  runtime: string;
  handler: string;
  size: number;
}

export class FunctionPackager {
  async packageFunctions(
    backend: BackendObject<any, any>,
    outdir: string
  ): Promise<FunctionPackage[]> {
    const packages: FunctionPackage[] = [];

    // Package CRUD handlers
    for (const modelName in backend.schema.models) {
      const model = backend.schema.models[modelName];

      if (model.type === 'crud') {
        packages.push(await this.packageCrudHandlers(modelName, outdir));
      } else if (model.type === 'event') {
        packages.push(await this.packageEventProcessor(modelName, outdir));
      } else if (model.type === 'function') {
        packages.push(await this.packageFunctionHandler(modelName, outdir));
      }
    }

    return packages;
  }

  private async packageCrudHandlers(modelName: string, outdir: string): Promise<FunctionPackage> {
    // Create temporary directory for function code
    const tempDir = path.join(outdir, 'temp', modelName);
    await fs.promises.mkdir(tempDir, { recursive: true });

    // Copy generated handler code
    await this.copyHandlerCode(modelName, tempDir);

    // Copy dependencies (node_modules)
    await this.copyDependencies(tempDir);

    // Create function.json for each CRUD operation
    await this.createFunctionMetadata(modelName, tempDir);

    // Zip the directory
    const zipPath = path.join(outdir, 'packages', `${modelName}.zip`);
    await this.zipDirectory(tempDir, zipPath);

    // Clean up temp directory
    await fs.promises.rm(tempDir, { recursive: true });

    return {
      name: modelName,
      packagePath: zipPath,
      runtime: 'node:18',
      handler: 'index.handler',
      size: (await fs.promises.stat(zipPath)).size,
    };
  }

  private async createFunctionMetadata(modelName: string, dir: string): Promise<void> {
    const operations = ['get', 'post', 'put', 'delete', 'list'];

    for (const op of operations) {
      const metadata = {
        bindings: [
          {
            authLevel: 'function',
            type: 'httpTrigger',
            direction: 'in',
            name: 'req',
            methods: [op === 'list' ? 'get' : op],
            route: op === 'list' ? `${modelName}` : `${modelName}/{id?}`,
          },
          {
            type: 'http',
            direction: 'out',
            name: 'res',
          },
          {
            type: 'cosmosDB',
            direction: 'inout',
            name: 'database',
            databaseName: 'database',
            collectionName: modelName,
            connectionStringSetting: 'COSMOS_CONNECTION',
          },
        ],
      };

      await fs.promises.writeFile(
        path.join(dir, op, 'function.json'),
        JSON.stringify(metadata, null, 2)
      );
    }
  }

  private async zipDirectory(source: string, target: string): Promise<void> {
    // Implementation using archiver or similar
    // ...
  }
}
```

### 4.2 File Asset Upload

**Purpose**: Upload static assets and function packages to blob storage.

```typescript
// src/synthesis/asset-uploader.ts

export interface AssetManifest {
  assets: AssetMetadata[];
  storageAccount: string;
  container: string;
}

export interface AssetMetadata {
  path: string; // Local file path
  blobUrl: string; // Uploaded blob URL
  sasToken: string; // SAS token for deployment
  hash: string; // SHA256 hash for change detection
}

export class AssetUploader {
  async uploadAssets(
    packages: FunctionPackage[],
    storageAccount: string,
    container: string = 'deployment-assets'
  ): Promise<AssetManifest> {
    const assets: AssetMetadata[] = [];

    for (const pkg of packages) {
      const asset = await this.uploadPackage(pkg, storageAccount, container);
      assets.push(asset);
    }

    return {
      assets,
      storageAccount,
      container,
    };
  }

  private async uploadPackage(
    pkg: FunctionPackage,
    storageAccount: string,
    container: string
  ): Promise<AssetMetadata> {
    // Read file
    const content = await fs.promises.readFile(pkg.packagePath);

    // Calculate hash
    const hash = this.calculateHash(content);

    // Check if already uploaded (by hash)
    const existingBlob = await this.findBlobByHash(storageAccount, container, hash);
    if (existingBlob) {
      return existingBlob;
    }

    // Upload to blob storage
    const blobName = `${pkg.name}-${hash.substring(0, 8)}.zip`;
    const blobUrl = await this.uploadBlob(storageAccount, container, blobName, content);

    // Generate SAS token (valid for deployment duration)
    const sasToken = await this.generateSasToken(storageAccount, container, blobName, {
      permissions: 'r', // Read only
      expiresIn: 3600, // 1 hour
    });

    return {
      path: pkg.packagePath,
      blobUrl,
      sasToken,
      hash,
    };
  }

  private calculateHash(content: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
```

---

## 5. Resource Dependencies

### 5.1 Dependency Resolution

**Purpose**: Ensure resources are deployed in correct order.

```typescript
// src/synthesis/dependency-resolver.ts

export interface DependencyGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, Set<string>>;
}

export interface GraphNode {
  id: string;
  resource: ResourceMetadata;
  depth: number; // Depth in dependency tree (0 = no dependencies)
}

export class DependencyResolver {
  /**
   * Build dependency graph from resource metadata
   */
  buildGraph(metadata: ResourceMetadata[]): DependencyGraph {
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, Set<string>>();

    // Create nodes
    for (const resource of metadata) {
      nodes.set(resource.id, {
        id: resource.id,
        resource,
        depth: 0,
      });
      edges.set(resource.id, new Set(resource.dependencies));
    }

    // Calculate depths
    this.calculateDepths(nodes, edges);

    return { nodes, edges };
  }

  /**
   * Topologically sort resources by dependencies
   */
  topologicalSort(graph: DependencyGraph): ResourceMetadata[] {
    const sorted: ResourceMetadata[] = [];
    const visited = new Set<string>();

    // Sort by depth (resources with no dependencies first)
    const nodesByDepth = Array.from(graph.nodes.values()).sort((a, b) => a.depth - b.depth);

    for (const node of nodesByDepth) {
      this.visit(node.id, graph, visited, sorted);
    }

    return sorted;
  }

  /**
   * Detect circular dependencies
   */
  detectCycles(graph: DependencyGraph): string[][] {
    const cycles: string[][] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    for (const nodeId of graph.nodes.keys()) {
      this.detectCyclesRecursive(nodeId, graph, visiting, visited, [], cycles);
    }

    return cycles;
  }

  private visit(
    id: string,
    graph: DependencyGraph,
    visited: Set<string>,
    result: ResourceMetadata[]
  ): void {
    if (visited.has(id)) return;
    visited.add(id);

    // Visit dependencies first
    const deps = graph.edges.get(id);
    if (deps) {
      for (const depId of deps) {
        this.visit(depId, graph, visited, result);
      }
    }

    // Add this resource
    const node = graph.nodes.get(id);
    if (node) {
      result.push(node.resource);
    }
  }

  private calculateDepths(nodes: Map<string, GraphNode>, edges: Map<string, Set<string>>): void {
    let changed = true;
    let iterations = 0;
    const maxIterations = nodes.size * 2;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const [nodeId, node] of nodes) {
        const deps = edges.get(nodeId);
        if (!deps || deps.size === 0) {
          continue;
        }

        const maxDepDepth = Math.max(
          ...Array.from(deps).map((depId) => nodes.get(depId)?.depth ?? 0)
        );

        if (node.depth <= maxDepDepth) {
          node.depth = maxDepDepth + 1;
          changed = true;
        }
      }
    }

    if (iterations >= maxIterations) {
      throw new Error('Circular dependency detected during depth calculation');
    }
  }

  private detectCyclesRecursive(
    nodeId: string,
    graph: DependencyGraph,
    visiting: Set<string>,
    visited: Set<string>,
    path: string[],
    cycles: string[][]
  ): void {
    if (visited.has(nodeId)) return;

    if (visiting.has(nodeId)) {
      // Cycle detected
      const cycleStart = path.indexOf(nodeId);
      const cycle = path.slice(cycleStart).concat(nodeId);
      cycles.push(cycle);
      return;
    }

    visiting.add(nodeId);
    path.push(nodeId);

    const deps = graph.edges.get(nodeId);
    if (deps) {
      for (const depId of deps) {
        this.detectCyclesRecursive(depId, graph, visiting, visited, path, cycles);
      }
    }

    visiting.delete(nodeId);
    path.pop();
    visited.add(nodeId);
  }
}
```

### 5.2 Cross-Template Dependencies

**Handling**:

1. **Parameters**: Pass resource IDs as parameters to linked templates
2. **Outputs**: Expose values from linked templates via outputs
3. **dependsOn**: Linked template deployment depends on main template resources

**Example**:

```json
// main.json
{
  "resources": [
    {
      "type": "Microsoft.Storage/storageAccounts",
      "name": "storage123",
      "..."
    },
    {
      "type": "Microsoft.Resources/deployments",
      "name": "linked-functions",
      "dependsOn": [
        "[resourceId('Microsoft.Storage/storageAccounts', 'storage123')]"
      ],
      "properties": {
        "mode": "Incremental",
        "templateLink": { "uri": "..." },
        "parameters": {
          "storageAccountId": {
            "value": "[resourceId('Microsoft.Storage/storageAccounts', 'storage123')]"
          }
        }
      }
    }
  ]
}

// linked/functions.json
{
  "parameters": {
    "storageAccountId": { "type": "string" }
  },
  "resources": [
    {
      "type": "Microsoft.Web/sites",
      "dependsOn": [], // No dependsOn - dependency handled by main template
      "properties": {
        "siteConfig": {
          "appSettings": [
            {
              "name": "AzureWebJobsStorage",
              "value": "[listKeys(parameters('storageAccountId'), '2023-01-01').keys[0].value]"
            }
          ]
        }
      }
    }
  ]
}
```

---

## 6. CLI Integration

### 6.1 Commands

**Synthesis Commands**:

```bash
# Synthesize backend to ARM templates
atakora synth [--outdir ./arm.out] [--validate] [--verbose]

# Deploy backend
atakora deploy [--environment dev|staging|prod] [--subscription <id>] [--dry-run]

# Diff current deployment vs new templates
atakora diff [--environment dev|staging|prod]

# Destroy deployed resources
atakora destroy [--environment dev|staging|prod] [--force]
```

**Implementation**:

```typescript
// packages/cli/src/commands/synth.ts

import { Command } from 'commander';
import { BackendSynthesizer } from '@atakora/component/synthesis';
import { loadBackend } from '../utils/backend-loader';

export const synthCommand = new Command('synth')
  .description('Synthesize backend to ARM templates')
  .option('-o, --outdir <dir>', 'Output directory', './arm.out')
  .option('-v, --validate', 'Run validation after synthesis', true)
  .option('--verbose', 'Verbose output', false)
  .option('--skip-function-package', 'Skip function packaging', false)
  .action(async (options) => {
    try {
      console.log('Loading backend definition...');
      const backend = await loadBackend('./src/index.ts');

      console.log('Synthesizing ARM templates...');
      const synthesizer = new BackendSynthesizer();

      const result = await synthesizer.synthesize(backend, {
        outdir: options.outdir,
        validate: options.validate,
        verbose: options.verbose,
        skipFunctionPackage: options.skipFunctionPackage,
      });

      console.log(`✅ Synthesis complete`);
      console.log(`  Templates: ${result.templates.length}`);
      console.log(`  Resources: ${result.resourceCount}`);
      console.log(`  Functions: ${result.functionPackages.length}`);
      console.log(`  Output: ${options.outdir}`);

      if (result.validationErrors.length > 0) {
        console.error(`\n❌ Validation errors:`);
        for (const error of result.validationErrors) {
          console.error(`  - ${error.message}`);
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(`❌ Synthesis failed:`, error);
      process.exit(1);
    }
  });
```

### 6.2 Developer Workflow

**Typical Flow**:

```bash
# 1. Define backend
vi src/index.ts

export const backend = defineBackend({
  schema,
  authentication,
  settings: { name: 'my-app' }
});

# 2. Synthesize to ARM templates
atakora synth --validate --verbose

# Output:
# Loading backend definition...
# Synthesizing ARM templates...
#   Phase 1: Collecting metadata (5 resources)
#   Phase 2: Assigning templates (1 main, 1 linked)
#   Phase 3: Generating ARM templates
#   Phase 4: Packaging functions (3 packages)
#   Phase 5: Validating templates
#   Phase 6: Writing output
# ✅ Synthesis complete
#   Templates: 2 (main.json, linked/functions.json)
#   Resources: 5
#   Functions: 3 packages
#   Output: ./arm.out

# 3. Review generated templates
ls -lh arm.out/
# main.json (2.1 MB)
# linked/
#   functions.json (1.8 MB)
# packages/
#   User.zip (120 KB)
#   DataUploaded.zip (95 KB)
#   GenerateReport.zip (105 KB)
# manifest.json (5 KB)

# 4. Deploy to Azure
atakora deploy --environment development --subscription <id>

# Output:
# Deploying to Azure...
#   Subscription: ...
#   Resource Group: my-app-dev-rg
#   Location: eastus
#   Uploading function packages (3)...
#   Deploying main template...
#   Deploying linked templates...
# ✅ Deployment complete (2m 34s)
#   Resources created: 5
#   Outputs:
#     functionAppUrl: https://my-app-dev-func.azurewebsites.net
#     cosmosEndpoint: https://my-app-dev-cosmos.documents.azure.com

# 5. Test deployed backend
curl https://my-app-dev-func.azurewebsites.net/api/User
```

### 6.3 Error Handling

**Example Error Messages**:

```
❌ Synthesis failed: Circular dependency detected

  The following resources have circular dependencies:
    • cosmos-account → storage-account → cosmos-account

  Suggestion:
    Remove the dependency from storage-account to cosmos-account.
    Storage accounts should not depend on Cosmos DB.

---

❌ Validation failed: Template size exceeds limit

  The main template size (4.2 MB) exceeds Azure's limit (4 MB).

  Affected template: main.json
  Current size: 4,389,120 bytes
  Maximum size: 4,194,304 bytes
  Excess: 194,816 bytes

  Suggestion:
    Enable linked templates to split large templates:
      atakora synth --enable-linked-templates

---

❌ Deployment failed: Invalid resource name

  Resource name 'my-storage-account!' contains invalid characters.

  Resource: Microsoft.Storage/storageAccounts
  Name: my-storage-account!
  Valid characters: lowercase letters, numbers, hyphens
  Max length: 24 characters

  Suggestion:
    Update the storage account name in your backend configuration:
      storage.account().name('mystorageaccount')
```

---

## 7. Implementation Tasks

### Task Breakdown (20 tasks total, 3 weeks)

#### Week 1: Core Synthesis Pipeline (Tasks 1-8)

**Task 1: Metadata Collection System [Day 1-2]**
**Owner**: Grace-Synthesis-1
**Files**:

- `src/synthesis/metadata-collector.ts`
- `src/synthesis/types.ts`

**Deliverables**:

- ResourceMetadata interface
- MetadataCollector class
- Metadata collection for all resource types

**Success Criteria**:

- Can collect metadata from backend without ARM generation
- Accurate size estimates
- Complete dependency tracking

---

**Task 2: Template Assignment Logic [Day 2-3]**
**Owner**: Grace-Synthesis-2
**Files**:

- `src/synthesis/template-assigner.ts`
- `src/synthesis/assignment-strategies.ts`

**Deliverables**:

- TemplateAssigner class
- Assignment strategies (minimize-cross-refs, balance-size, type-based)
- TemplateAssignments output

**Success Criteria**:

- Resources assigned to templates based on metadata
- Respects size limits
- Groups related resources correctly

---

**Task 3: Synthesis Context [Day 3-4]**
**Owner**: Grace-Synthesis-3
**Files**:

- `src/synthesis/synthesis-context.ts`

**Deliverables**:

- SynthesisContext class
- Cross-template reference helpers
- Parameter generation logic

**Success Criteria**:

- Provides template assignment info during ARM generation
- Generates correct references for same-template resources
- Generates parameters for cross-template resources

---

**Task 4: Storage Resource Generation [Day 4]**
**Owner**: Grace-Synthesis-4
**Files**:

- `src/synthesis/resources/storage-account.ts`
- `src/synthesis/resources/storage-queue.ts`
- `src/synthesis/resources/storage-blob.ts`

**Deliverables**:

- Storage account ARM generation
- Queue ARM generation
- Blob container ARM generation

**Success Criteria**:

- Correct ARM JSON for storage resources
- Context-aware cross-template references
- Environment-specific configurations applied

---

**Task 5: Cosmos DB Resource Generation [Day 4-5]**
**Owner**: Grace-Synthesis-5
**Files**:

- `src/synthesis/resources/cosmos-account.ts`
- `src/synthesis/resources/cosmos-database.ts`
- `src/synthesis/resources/cosmos-container.ts`

**Deliverables**:

- Cosmos account ARM generation
- Database ARM generation
- Container ARM generation (one per CRUD model)

**Success Criteria**:

- Correct partition key configuration
- Indexing policies from schema
- Throughput based on environment

---

**Task 6: Function App Resource Generation [Day 5]**
**Owner**: Grace-Synthesis-1 (continuation)
**Files**:

- `src/synthesis/resources/function-app.ts`
- `src/synthesis/resources/app-service-plan.ts`

**Deliverables**:

- Function app ARM generation
- App settings with context-aware connections
- App service plan (if not Consumption)

**Success Criteria**:

- Correct app settings for storage, cosmos, insights
- Cross-template references as parameters
- Runtime and plan based on environment

---

**Task 7: Monitoring Resource Generation [Day 5]**
**Owner**: Grace-Synthesis-2 (continuation)
**Files**:

- `src/synthesis/resources/app-insights.ts`
- `src/synthesis/resources/log-analytics.ts`

**Deliverables**:

- Application Insights ARM generation
- Log Analytics ARM generation (if configured)

**Success Criteria**:

- Correct sampling based on environment
- Retention policies applied
- Linked to function app

---

**Task 8: Dependency Resolution [Day 5]**
**Owner**: Grace-Synthesis-3 (continuation)
**Files**:

- `src/synthesis/dependency-resolver.ts`

**Deliverables**:

- Topological sort implementation
- Circular dependency detection
- Dependency graph visualization

**Success Criteria**:

- Resources sorted by dependencies
- Cycles detected and reported
- Clear error messages

---

#### Week 2: Asset Management & Templates (Tasks 9-15)

**Task 9: Function Code Bundler [Day 6-7]**
**Owner**: Grace-Synthesis-4 (continuation)
**Files**:

- `src/synthesis/function-packager.ts`
- `src/synthesis/function-bundler.ts`

**Deliverables**:

- Function code bundling
- function.json generation
- CRUD handler packaging

**Success Criteria**:

- Bundles function code with dependencies
- Creates correct function.json for bindings
- Generates deployment-ready .zip files

---

**Task 10: Asset Upload System [Day 7-8]**
**Owner**: Grace-Synthesis-5 (continuation)
**Files**:

- `src/synthesis/asset-uploader.ts`

**Deliverables**:

- Blob storage upload
- SAS token generation
- Asset manifest

**Success Criteria**:

- Uploads function packages to blob storage
- Generates time-limited SAS tokens
- Tracks assets by hash (avoid re-upload)

---

**Task 11: Main Template Generator [Day 8-9]**
**Owner**: Grace-Synthesis-1 (continuation)
**Files**:

- `src/synthesis/template-generator.ts`
- `src/synthesis/template-main.ts`

**Deliverables**:

- Main template generation
- Parameter definitions
- Variable definitions
- Output definitions

**Success Criteria**:

- Generates valid ARM main template
- Includes all main-template resources
- Links to linked templates correctly

---

**Task 12: Linked Template Generator [Day 9]**
**Owner**: Grace-Synthesis-2 (continuation)
**Files**:

- `src/synthesis/template-linked.ts`

**Deliverables**:

- Linked template generation
- Parameter passing from main template
- Output generation

**Success Criteria**:

- Generates valid linked templates
- Receives parameters correctly
- Exposes outputs for main template

---

**Task 13: Template Splitter Integration [Day 9-10]**
**Owner**: Grace-Synthesis-3 (continuation)
**Files**:

- `src/synthesis/template-splitter.ts`

**Deliverables**:

- Integrate existing TemplateSplitter
- Adapt for context-aware synthesis
- Size limit enforcement

**Success Criteria**:

- Uses metadata for split decisions
- Respects maxTemplateSize
- Generates deployment dependencies

---

**Task 14: File Writer [Day 10]**
**Owner**: Grace-Synthesis-4 (continuation)
**Files**:

- `src/synthesis/file-writer.ts`

**Deliverables**:

- Write main.json
- Write linked templates
- Write manifest.json
- Create deployment scripts

**Success Criteria**:

- All files written to outdir
- Pretty-print JSON (configurable)
- Correct file structure

---

**Task 15: Manifest Generation [Day 10]**
**Owner**: Grace-Synthesis-5 (continuation)
**Files**:

- `src/synthesis/manifest-generator.ts`

**Deliverables**:

- Generate manifest.json
- Include template metadata
- Include function package metadata
- Include deployment order

**Success Criteria**:

- Complete deployment metadata
- Version information
- Resource counts
- Dependency information

---

#### Week 3: Validation & CLI (Tasks 16-20)

**Task 16: ARM Schema Validation [Day 11]**
**Owner**: Grace-Synthesis-1 (continuation)
**Files**:

- `src/synthesis/validation/schema-validator.ts`

**Deliverables**:

- Validate ARM JSON against schema
- Check required fields
- Validate resource types

**Success Criteria**:

- Detects invalid ARM JSON
- Clear error messages
- Suggests fixes

---

**Task 17: Naming Validation [Day 11]**
**Owner**: Grace-Synthesis-2 (continuation)
**Files**:

- `src/synthesis/validation/naming-validator.ts`

**Deliverables**:

- Validate resource names
- Check length limits
- Check character restrictions

**Success Criteria**:

- Detects invalid resource names
- Type-specific rules
- Actionable suggestions

---

**Task 18: Limit Validation [Day 12]**
**Owner**: Grace-Synthesis-3 (continuation)
**Files**:

- `src/synthesis/validation/limit-validator.ts`

**Deliverables**:

- Validate template size limits
- Validate resource count limits
- Validate parameter count limits

**Success Criteria**:

- Detects limit violations
- Suggests linked templates if needed
- Clear error messages

---

**Task 19: CLI Synthesis Command [Day 12-13]**
**Owner**: Grace-Synthesis-4 (continuation)
**Files**:

- `packages/cli/src/commands/synth.ts`
- `packages/cli/src/utils/backend-loader.ts`

**Deliverables**:

- `atakora synth` command
- Backend loading from file
- Progress reporting
- Error handling

**Success Criteria**:

- Loads backend from TypeScript file
- Runs synthesis pipeline
- Reports progress clearly
- Handles errors gracefully

---

**Task 20: CLI Deploy Command [Day 13-15]**
**Owner**: Grace-Synthesis-5 (continuation)
**Files**:

- `packages/cli/src/commands/deploy.ts`
- `packages/cli/src/azure/deployment-client.ts`

**Deliverables**:

- `atakora deploy` command
- Azure deployment integration
- Progress tracking
- Rollback on failure

**Success Criteria**:

- Deploys ARM templates to Azure
- Uploads function packages
- Shows deployment progress
- Handles deployment failures

---

## 8. Testing Strategy

### 8.1 Unit Tests (Target: >90% coverage)

**Test Structure**:

```
src/synthesis/
├── metadata-collector.spec.ts
├── template-assigner.spec.ts
├── synthesis-context.spec.ts
├── dependency-resolver.spec.ts
├── function-packager.spec.ts
├── asset-uploader.spec.ts
├── template-generator.spec.ts
├── file-writer.spec.ts
├── manifest-generator.spec.ts
└── validation/
    ├── schema-validator.spec.ts
    ├── naming-validator.spec.ts
    └── limit-validator.spec.ts
```

**Example Test**:

```typescript
// metadata-collector.spec.ts

describe('MetadataCollector', () => {
  it('should collect storage account metadata', () => {
    const backend = createTestBackend({
      storage: { account: { name: 'test-storage' } },
    });

    const collector = new MetadataCollector();
    const metadata = collector.collectStorageMetadata(backend);

    expect(metadata).toHaveLength(1);
    expect(metadata[0]).toMatchObject({
      id: 'storage-account',
      type: 'Microsoft.Storage/storageAccounts',
      name: 'test-storage',
      dependencies: [],
      templatePreference: 'main',
    });
  });

  it('should estimate size correctly', () => {
    const backend = createTestBackend();
    const collector = new MetadataCollector();
    const metadata = collector.collect(backend);

    const totalSize = metadata.reduce((sum, m) => sum + m.sizeEstimate, 0);
    expect(totalSize).toBeGreaterThan(0);
    expect(totalSize).toBeLessThan(10000); // Reasonable for small backend
  });

  it('should track dependencies', () => {
    const backend = createTestBackend({
      schema: { User: c.model({ id: a.id() }) },
    });

    const collector = new MetadataCollector();
    const metadata = collector.collect(backend);

    const container = metadata.find((m) => m.type.includes('containers'));
    expect(container?.dependencies).toContain('cosmos-database');
  });
});
```

### 8.2 Integration Tests

**Test Scenarios**:

1. **Simple Backend**: Minimal config, single template
2. **Complex Backend**: Multiple models, linked templates
3. **Cross-Template References**: Function app in linked template
4. **Size Limit**: Backend that requires template splitting
5. **Circular Dependency**: Detect and reject cycles
6. **Asset Upload**: Function packaging and upload
7. **Validation Failures**: Invalid names, size limits

**Example**:

```typescript
// synthesis-integration.spec.ts

describe('Synthesis Integration', () => {
  it('should synthesize simple backend', async () => {
    const backend = defineBackend({
      schema: defineSchema({
        schema: a.schema({
          User: c.model({ id: a.id(), email: a.string() }),
        }),
      }),
      authentication: defineAuth({
        Primary: auth.entra().tenant('test').clientId('test'),
      }),
      settings: { name: 'test-app' },
    });

    const synthesizer = new BackendSynthesizer();
    const result = await synthesizer.synthesize(backend, {
      outdir: './test-output',
      validate: true,
    });

    expect(result.templates).toHaveLength(1);
    expect(result.templates[0].name).toBe('main.json');
    expect(result.resourceCount).toBeGreaterThan(0);
    expect(result.functionPackages).toHaveLength(1);
  });

  it('should split large backend into linked templates', async () => {
    const backend = createLargeBackend(); // Creates backend that exceeds size limit

    const synthesizer = new BackendSynthesizer();
    const result = await synthesizer.synthesize(backend, {
      outdir: './test-output',
      maxTemplateSize: 1024 * 1024, // 1MB limit
    });

    expect(result.templates.length).toBeGreaterThan(1);
    expect(result.templates.some((t) => t.type === 'linked')).toBe(true);
  });

  it('should detect circular dependencies', async () => {
    const backend = createBackendWithCycle();

    const synthesizer = new BackendSynthesizer();

    await expect(synthesizer.synthesize(backend, { outdir: './test-output' })).rejects.toThrow(
      /circular dependency/i
    );
  });
});
```

### 8.3 E2E Tests

**Test Flow**:

1. Define backend in TypeScript
2. Run `atakora synth`
3. Verify ARM templates generated
4. Deploy to Azure test subscription
5. Verify resources created
6. Clean up

**Example**:

```typescript
// e2e/synthesis.e2e.spec.ts

describe('Synthesis E2E', () => {
  const testSubscription = process.env.AZURE_TEST_SUBSCRIPTION;
  const testResourceGroup = 'atakora-test-rg';

  beforeAll(async () => {
    // Create test resource group
    await azureClient.resourceGroups.createOrUpdate(testResourceGroup, {
      location: 'eastus',
    });
  });

  afterAll(async () => {
    // Clean up test resources
    await azureClient.resourceGroups.delete(testResourceGroup);
  });

  it('should deploy simple backend to Azure', async () => {
    // 1. Synthesize
    const backend = defineBackend({
      schema,
      authentication,
      settings: { name: 'e2e-test' },
    });

    const synthesizer = new BackendSynthesizer();
    const result = await synthesizer.synthesize(backend, {
      outdir: './test-output',
    });

    // 2. Deploy
    const deployment = await azureClient.deployments.createOrUpdate(
      testResourceGroup,
      'test-deployment',
      {
        properties: {
          mode: 'Incremental',
          template: result.templates[0].content,
        },
      }
    );

    expect(deployment.provisioningState).toBe('Succeeded');

    // 3. Verify resources
    const resources = await azureClient.resources.listByResourceGroup(testResourceGroup);

    expect(resources.some((r) => r.type === 'Microsoft.Storage/storageAccounts')).toBe(true);
    expect(resources.some((r) => r.type === 'Microsoft.DocumentDB/databaseAccounts')).toBe(true);
    expect(resources.some((r) => r.type === 'Microsoft.Web/sites')).toBe(true);
  });
});
```

---

## 9. Success Criteria

### 9.1 Functional Requirements

**Must Have**:

- ✅ Context-aware synthesis pipeline (metadata → assign → generate)
- ✅ Correct cross-template references
- ✅ Function code bundling and packaging
- ✅ Asset upload to blob storage
- ✅ Dependency resolution (topological sort)
- ✅ Circular dependency detection
- ✅ ARM template validation
- ✅ CLI `synth` and `deploy` commands
- ✅ Environment-specific configurations applied
- ✅ Deterministic output (same input = same templates)

**Should Have**:

- ✅ Template splitting based on size
- ✅ Linked templates for large backends
- ✅ Asset caching (hash-based)
- ✅ Deployment progress reporting
- ✅ Rollback on deployment failure

**Nice to Have**:

- ⬜ Incremental deployment (only changed resources)
- ⬜ Deployment previews (what-if analysis)
- ⬜ Cost estimation
- ⬜ Resource tagging strategy

### 9.2 Quality Requirements

- **Test Coverage**: >90% for synthesis code
- **Performance**: Synthesis completes in <10 seconds for typical backend
- **Error Messages**: Clear, actionable suggestions for all errors
- **Documentation**: All public APIs documented
- **Type Safety**: Full TypeScript type inference

### 9.3 Validation Metrics

- ✅ No unresolved placeholders in templates
- ✅ All cross-template references use parameters
- ✅ No circular dependencies pass validation
- ✅ Template size limits respected
- ✅ Resource names pass Azure validation
- ✅ All templates pass ARM schema validation

---

## 10. Risk Assessment

### 10.1 Technical Risks

**Risk 1: Context-Aware Synthesis Complexity** (Medium)

- **Impact**: Complex to implement correctly
- **Mitigation**: Follow ADR-019 pattern, extensive testing
- **Contingency**: Simplify to single-template initially

**Risk 2: Asset Upload Reliability** (Medium)

- **Impact**: Failed uploads block deployment
- **Mitigation**: Retry logic, hash-based caching
- **Contingency**: Manual upload fallback

**Risk 3: ARM Expression Generation** (High)

- **Impact**: Incorrect expressions break deployments
- **Mitigation**: Comprehensive test coverage, E2E validation
- **Contingency**: Extensive pre-deployment validation

**Risk 4: Circular Dependency Detection** (Low)

- **Impact**: Could miss subtle cycles
- **Mitigation**: Multiple detection algorithms
- **Contingency**: Runtime detection during deployment

### 10.2 Timeline Risks

**Risk 1: Function Packaging Complexity** (Medium)

- **Impact**: Could delay by 2-3 days
- **Mitigation**: Start early, parallelize with template generation
- **Contingency**: Use simplified packaging initially

**Risk 2: Azure Deployment Integration** (Medium)

- **Impact**: Azure SDK complexity could cause delays
- **Mitigation**: Use existing deployment patterns from lib package
- **Contingency**: Provide manual deployment instructions

### 10.3 Integration Risks

**Risk 1: Backend Assembly Integration** (Low)

- **Impact**: Changes to Phase 4 could affect Phase 7
- **Mitigation**: Clear interface contracts, regular coordination
- **Contingency**: Adapter layer if needed

**Risk 2: CLI Package Integration** (Low)

- **Impact**: CLI structure may need refactoring
- **Mitigation**: Design CLI commands early
- **Contingency**: Separate CLI package if needed

---

## 11. Team Assignments

### Grace Agent Allocation

**Grace-Synthesis-1** (Core Pipeline)

- Days 1-2: Task 1 (Metadata Collection)
- Day 4: Task 4 (Storage Resources)
- Day 5: Task 6 (Function App Resources)
- Days 8-9: Task 11 (Main Template Generator)
- Day 11: Task 16 (ARM Schema Validation)
- Day 12-13: Task 19 (CLI Synth Command)

**Grace-Synthesis-2** (Assignment & Templates)

- Days 2-3: Task 2 (Template Assignment)
- Day 5: Task 7 (Monitoring Resources)
- Days 9: Task 12 (Linked Template Generator)
- Day 11: Task 17 (Naming Validation)

**Grace-Synthesis-3** (Context & Dependencies)

- Days 3-4: Task 3 (Synthesis Context)
- Day 5: Task 8 (Dependency Resolution)
- Days 9-10: Task 13 (Template Splitter Integration)
- Day 12: Task 18 (Limit Validation)

**Grace-Synthesis-4** (Resources & Assets)

- Day 4: Task 4 (Storage Resources)
- Days 6-7: Task 9 (Function Bundler)
- Day 10: Task 14 (File Writer)
- Day 12-13: Task 19 (CLI Synth - support)

**Grace-Synthesis-5** (Database & Deployment)

- Days 4-5: Task 5 (Cosmos DB Resources)
- Days 7-8: Task 10 (Asset Upload)
- Day 10: Task 15 (Manifest Generation)
- Days 13-15: Task 20 (CLI Deploy Command)

### Charlie Agent Allocation

5 Charlie agents for testing, following Grace agents' work:

- Testing synthesis pipeline components
- E2E deployment tests
- Validation testing
- CLI command testing

---

## 12. Dependencies

### 12.1 From Previous Phases

**Required from Phase 1**:

- ✅ Schema definitions
- ✅ Model types (CRUD, Event, Function)
- ✅ Type inference utilities

**Required from Phase 2**:

- ✅ Auth configurations
- ✅ Provider types

**Required from Phase 4**:

- 🚧 BackendObject structure
- 🚧 Attachment point system
- 🚧 Configuration resolution

### 12.2 For Future Phases

**Phase 7 enables**:

- Phase 8: Context API (uses generated infrastructure)
- Phase 9: Type Generation (exports from synthesis)
- Phase 10: Documentation (deployment guides)

---

## 13. Next Steps

### Immediate Actions

1. **Review this plan** with team
2. **Create Digital Minion tasks** for all 20 tasks
3. **Assign Grace agents** to tasks
4. **Set up test infrastructure** (Azure test subscription)
5. **Begin Task 1** (Metadata Collection)

### Week 1 Goals

- Metadata collection complete
- Template assignment working
- Core resource generation (storage, cosmos, functions)
- Dependency resolution functional

### Week 2 Goals

- Function packaging working
- Asset upload functional
- Template generation complete
- File writing operational

### Week 3 Goals

- All validation passing
- CLI commands functional
- E2E tests passing
- Documentation complete

---

## Appendix A: File Size Estimates

| Module                 | Estimated LOC  |
| ---------------------- | -------------- |
| Metadata Collector     | 600            |
| Template Assigner      | 500            |
| Synthesis Context      | 400            |
| Dependency Resolver    | 500            |
| Storage Resources      | 800            |
| Cosmos Resources       | 900            |
| Function App Resources | 1000           |
| Monitoring Resources   | 400            |
| Function Packager      | 700            |
| Asset Uploader         | 600            |
| Template Generator     | 800            |
| File Writer            | 400            |
| Validation             | 900            |
| CLI Integration        | 600            |
| **Total**              | **~9,200 LOC** |

---

## Appendix B: ARM Template Examples

See synthesis implementation for complete ARM template examples:

- `packages/lib/src/synthesis/examples/main.json`
- `packages/lib/src/synthesis/examples/linked/functions.json`
- `packages/lib/src/synthesis/examples/manifest.json`

---

## Appendix C: References

- **ADR-019**: Context-Aware Synthesis Pipeline Refactoring
- **ADR-018**: Backend API Redesign
- **Phase 4 Plan**: Backend Assembly architecture
- **Phase 1 Summary**: Schema system completion
- **Implementation Plan**: Overall project structure

---

## Document History

| Version | Date       | Author                  | Changes              |
| ------- | ---------- | ----------------------- | -------------------- |
| 1.0     | 2025-11-20 | Becky (Staff Architect) | Initial Phase 7 plan |

---

**End of Phase 7 Implementation Plan**
