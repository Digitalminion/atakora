# ADR-026: Linked Template Architecture

**Status:** Proposed
**Date:** 2025-11-22
**Architect:** Becky (Staff Architect)
**Stakeholders:** Grace (Synthesis), Devon (Implementation)

---

## Context

ARM templates have a 4MB size limit. Large backend definitions with many models can exceed this limit. Azure supports linked templates to decompose large deployments into smaller, modular templates.

### Current State

- Single monolithic ARM template generated
- No template decomposition
- Risk of exceeding 4MB limit with large schemas
- No template reusability

### Problem Statement

We need a linked template strategy that:

1. **Handles Large Backends:** Decompose templates to stay under 4MB
2. **Manages Dependencies:** Correctly handle resource dependencies across templates
3. **Enables Modularity:** Reusable template modules
4. **Simplifies Deployment:** Orchestrate linked template deployment
5. **Maintains Type Safety:** Parameter passing between templates
6. **Supports Testing:** Test templates independently

---

## Decision

Implement **intelligent template decomposition** with automatic linked template generation based on resource count and template size.

### Architecture

```
Main Template (main.json)
├── Foundation Template (foundation.json)
│   ├── Resource Group
│   ├── KeyVault
│   └── Managed Identity
├── Networking Template (networking.json)
│   ├── VNet
│   ├── Subnets
│   └── NSGs
├── Storage Template (storage.json)
│   ├── Cosmos DB Account
│   ├── Cosmos DB Database
│   └── Cosmos Containers (per model)
├── Compute Template (compute.json)
│   ├── App Service Plan
│   ├── Function App
│   └── Function Configurations
└── Monitoring Template (monitoring.json)
    ├── Application Insights
    ├── Log Analytics
    └── Alerts
```

### Configuration

```typescript
/**
 * Linked template configuration
 */
export interface LinkedTemplateConfig {
  /**
   * Enable linked templates
   * Auto-enabled when template size > 3MB or resource count > 200
   */
  enabled?: boolean;

  /**
   * Template storage account
   * Required for linked templates
   */
  storage?: {
    /**
     * Storage account for template artifacts
     */
    accountName: string;

    /**
     * Container for templates
     */
    containerName: string;

    /**
     * SAS token for template access
     */
    sasToken?: string;
  };

  /**
   * Decomposition strategy
   */
  decomposition?: {
    /**
     * Maximum resources per template
     */
    maxResourcesPerTemplate: number;

    /**
     * Maximum template size (bytes)
     */
    maxTemplateSize: number;

    /**
     * Module boundaries
     */
    modules: ('foundation' | 'networking' | 'storage' | 'compute' | 'monitoring')[];
  };
}
```

### Template Decomposition

```typescript
/**
 * Template decomposer
 */
export class TemplateDecomposer {
  async decompose(
    backend: BackendObject,
    resources: ARMResource[]
  ): Promise<LinkedTemplateSet> {
    // Determine if linked templates needed
    if (!this.shouldUseLinkedTemplates(resources, backend.settings.linkedTemplates)) {
      return {
        main: this.createMainTemplate(resources),
        linked: [],
      };
    }

    // Create module templates
    const modules: LinkedTemplate[] = [];

    // Foundation module (always first)
    modules.push(await this.createFoundationModule(backend));

    // Networking module (if enabled)
    if (backend.settings.features.networking) {
      modules.push(await this.createNetworkingModule(backend));
    }

    // Storage module
    modules.push(await this.createStorageModule(backend, resources));

    // Compute module
    modules.push(await this.createComputeModule(backend, resources));

    // Monitoring module (if enabled)
    if (backend.settings.features.monitoring) {
      modules.push(await this.createMonitoringModule(backend));
    }

    // Create main orchestration template
    const main = this.createOrchestratorTemplate(modules);

    return {
      main,
      linked: modules,
    };
  }

  /**
   * Determine if linked templates should be used
   */
  private shouldUseLinkedTemplates(
    resources: ARMResource[],
    config?: LinkedTemplateConfig
  ): boolean {
    // Explicit configuration
    if (config?.enabled !== undefined) {
      return config.enabled;
    }

    // Auto-enable based on size
    const resourceCount = resources.length;
    const estimatedSize = JSON.stringify({ resources }).length;

    return resourceCount > 200 || estimatedSize > 3 * 1024 * 1024; // 3MB
  }

  /**
   * Create main orchestrator template
   */
  private createOrchestratorTemplate(
    modules: LinkedTemplate[]
  ): ARMTemplate {
    return {
      $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
      contentVersion: '1.0.0.0',
      parameters: this.generateMainParameters(modules),
      variables: this.generateMainVariables(modules),
      resources: modules.map(module => this.createLinkedDeploymentResource(module)),
      outputs: this.generateMainOutputs(modules),
    };
  }

  /**
   * Create linked deployment resource
   */
  private createLinkedDeploymentResource(module: LinkedTemplate): ARMResource {
    return {
      type: 'Microsoft.Resources/deployments',
      apiVersion: '2022-09-01',
      name: `${module.name}-deployment`,
      properties: {
        mode: 'Incremental',
        templateLink: {
          uri: `[concat(parameters('_artifactsLocation'), '/${module.name}.json', parameters('_artifactsLocationSasToken'))]`,
          contentVersion: '1.0.0.0',
        },
        parameters: this.generateModuleParameters(module),
      },
      dependsOn: module.dependsOn.map(dep => `[resourceId('Microsoft.Resources/deployments', '${dep}-deployment')]`),
    };
  }

  /**
   * Create storage module
   */
  private async createStorageModule(
    backend: BackendObject,
    resources: ARMResource[]
  ): Promise<LinkedTemplate> {
    const storageResources = resources.filter(r =>
      r.type.startsWith('Microsoft.DocumentDB') ||
      r.type.startsWith('Microsoft.Storage')
    );

    return {
      name: 'storage',
      template: {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        parameters: {
          location: { type: 'string' },
          cosmosAccountName: { type: 'string' },
          databaseName: { type: 'string' },
          storageAccountName: { type: 'string' },
        },
        resources: storageResources,
        outputs: {
          cosmosEndpoint: {
            type: 'string',
            value: '[reference(resourceId(\'Microsoft.DocumentDB/databaseAccounts\', parameters(\'cosmosAccountName\'))).documentEndpoint]',
          },
          storagePrimaryKey: {
            type: 'string',
            value: '[listKeys(resourceId(\'Microsoft.Storage/storageAccounts\', parameters(\'storageAccountName\')), \'2021-09-01\').keys[0].value]',
          },
        },
      },
      dependsOn: ['foundation'],
      parameters: {
        location: '[parameters(\'location\')]',
        cosmosAccountName: '[variables(\'cosmosAccountName\')]',
        databaseName: '[variables(\'databaseName\')]',
        storageAccountName: '[variables(\'storageAccountName\')]',
      },
    };
  }
}
```

### Parameter Passing

```typescript
/**
 * Parameter passing between templates
 */
{
  // Main template parameters
  parameters: {
    location: {
      type: 'string',
      defaultValue: '[resourceGroup().location]',
    },
    _artifactsLocation: {
      type: 'string',
      metadata: {
        description: 'Container URI of linked templates',
      },
    },
    _artifactsLocationSasToken: {
      type: 'securestring',
      defaultValue: '',
      metadata: {
        description: 'SAS token for accessing linked templates',
      },
    },
  },

  // Variables (computed values)
  variables: {
    cosmosAccountName: '[concat(parameters(\'appName\'), \'-cosmos\')]',
    databaseName: '[concat(parameters(\'appName\'), \'-db\')]',
    functionAppName: '[concat(parameters(\'appName\'), \'-func\')]',
  },

  // Linked deployment with parameter passing
  resources: [
    {
      type: 'Microsoft.Resources/deployments',
      name: 'storage-deployment',
      properties: {
        templateLink: {
          uri: '[concat(parameters(\'_artifactsLocation\'), \'/storage.json\', parameters(\'_artifactsLocationSasToken\'))]',
        },
        parameters: {
          // Pass parameters to linked template
          location: { value: '[parameters(\'location\')]' },
          cosmosAccountName: { value: '[variables(\'cosmosAccountName\')]' },
          databaseName: { value: '[variables(\'databaseName\')]' },
        },
      },
    },
    {
      type: 'Microsoft.Resources/deployments',
      name: 'compute-deployment',
      properties: {
        templateLink: {
          uri: '[concat(parameters(\'_artifactsLocation\'), \'/compute.json\', parameters(\'_artifactsLocationSasToken\'))]',
        },
        parameters: {
          location: { value: '[parameters(\'location\')]' },
          functionAppName: { value: '[variables(\'functionAppName\')]' },
          // Reference output from storage deployment
          cosmosConnectionString: { value: '[reference(\'storage-deployment\').outputs.cosmosConnectionString.value]' },
        },
      },
      dependsOn: [
        '[resourceId(\'Microsoft.Resources/deployments\', \'storage-deployment\')]',
      ],
    },
  ],
}
```

### Deployment Orchestration

```typescript
/**
 * Linked template deployment orchestrator
 */
export class LinkedTemplateDeployer {
  async deploy(
    templateSet: LinkedTemplateSet,
    config: LinkedTemplateConfig,
    resourceGroup: string
  ): Promise<DeploymentResult> {
    // 1. Upload linked templates to storage
    const storageUrls = await this.uploadTemplates(templateSet.linked, config.storage);

    // 2. Generate SAS token for template access
    const sasToken = await this.generateSASToken(config.storage);

    // 3. Deploy main template with template links
    const deployment = await this.deployMainTemplate(
      templateSet.main,
      resourceGroup,
      {
        _artifactsLocation: storageUrls.baseUri,
        _artifactsLocationSasToken: sasToken,
      }
    );

    return deployment;
  }

  /**
   * Upload linked templates to storage
   */
  private async uploadTemplates(
    templates: LinkedTemplate[],
    storage: LinkedTemplateConfig['storage']
  ): Promise<{ baseUri: string; urls: Map<string, string> }> {
    const urls = new Map<string, string>();

    for (const template of templates) {
      const blobName = `${template.name}.json`;
      const content = JSON.stringify(template.template, null, 2);

      await this.uploadBlob(storage, blobName, content);

      urls.set(template.name, `https://${storage.accountName}.blob.core.windows.net/${storage.containerName}/${blobName}`);
    }

    return {
      baseUri: `https://${storage.accountName}.blob.core.windows.net/${storage.containerName}`,
      urls,
    };
  }
}
```

---

## Alternatives Considered

### Alternative 1: Always Use Linked Templates

**Rejected:** Adds unnecessary complexity for small backends.

### Alternative 2: Manual Template Splitting

**Rejected:** Error-prone, poor developer experience.

### Alternative 3: Bicep Modules

**Considered:** Great for future, but want ARM parity first.

---

## Consequences

### Positive

1. **Handles Large Backends:** No 4MB limit concerns
2. **Modular:** Reusable template modules
3. **Testable:** Test modules independently
4. **Maintainable:** Easier to understand smaller templates
5. **Flexible:** Can deploy modules selectively

### Negative

1. **Complexity:** More templates to manage
2. **Dependencies:** Must track cross-template dependencies
3. **Storage Required:** Need storage account for template artifacts
4. **Deployment Time:** Slightly slower than monolithic

---

## Success Criteria

1. ✅ Auto-detect when linked templates needed
2. ✅ Correct dependency ordering
3. ✅ Parameter passing works
4. ✅ Outputs propagate correctly
5. ✅ Deployment succeeds
6. ✅ No resource duplication

---

## Implementation Plan

- Phase 1: Decomposition logic (3 days)
- Phase 2: Module creation (4 days)
- Phase 3: Deployment orchestration (3 days)
- Phase 4: Testing (3 days)

**Total:** 13 days

---

**Status:** Proposed
**Implementation Target:** Week 8-10
