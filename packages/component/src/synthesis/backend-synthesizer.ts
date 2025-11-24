/**
 * Backend Synthesizer - CDK Orchestration
 *
 * Main orchestrator for synthesizing backend objects to ARM templates using CDK constructs.
 * This is the NEW implementation that replaces manual ARM JSON generation with proper
 * CDK App/Stack synthesis.
 *
 * @module @atakora/component/synthesis/backend-synthesizer
 *
 * @remarks
 * The BackendSynthesizer is the main entry point for backend-to-infrastructure synthesis.
 * It orchestrates multiple specialized synthesizers to generate complete Azure deployments:
 *
 * **Architecture:**
 * - Uses CDK App and ResourceGroupStack for infrastructure modeling
 * - Coordinates DataSynthesizer, ApiSynthesizer, FunctionSynthesizer
 * - Generates ARM templates via CDK synthesis pipeline
 * - Produces function code packages and schema artifacts
 *
 * **Synthesis Pipeline:**
 * 1. Create CDK App with backend configuration
 * 2. Create ResourceGroupStack as deployment target
 * 3. Analyze backend structure (models, attachments, features)
 * 4. Synthesize data layer (Cosmos DB) via DataSynthesizer
 * 5. Synthesize API layer (API Management) via ApiSynthesizer
 * 6. Synthesize compute layer (Functions) via FunctionSynthesizer
 * 7. Synthesize schema files (OpenAPI, GraphQL)
 * 8. Run CDK synthesis to generate ARM templates
 * 9. Return complete SynthesisResult
 *
 * @example
 * Basic synthesis:
 * ```typescript
 * const backend = defineBackend({
 *   schema: defineSchema({ models: { User: { ... } } }),
 *   settings: { name: 'my-app' },
 * });
 *
 * const synthesizer = new BackendSynthesizer();
 * const result = await synthesizer.synthesize(backend);
 *
 * // Access ARM template
 * console.log(result.armTemplate);
 *
 * // Access function code
 * console.log(result.functions.handlers);
 *
 * // Access metadata
 * console.log(result.metadata.resourceCount);
 * ```
 */

import {
  App,
  SubscriptionStack,
  ResourceGroupStack,
  Geography,
  Subscription,
  Organization,
  Project,
  Environment as EnvironmentNaming,
  Instance
} from '@atakora/lib';
import type { CloudAssembly } from '@atakora/lib';
import * as fs from 'fs';
import * as path from 'path';
import type { BackendObject } from '../backend/types';
import type { SchemaObject } from '../schema/types';
import { DataSynthesizer } from './data-synthesizer';
import { ApiSynthesizer } from './api-synthesizer';
import type {
  IBackendSynthesizer,
  SynthesisResult,
  SynthesisOptions,
  SynthesisContext,
  BackendAnalysis,
  ModelInfo,
  AttachmentInfo,
  ARMTemplate,
  FunctionPackage,
  SchemaFiles,
  SynthesisMetadata,
  DataResources,
  ApiResources,
  FunctionResources,
} from './types';

/**
 * Backend Synthesizer Implementation
 *
 * @remarks
 * Implements IBackendSynthesizer interface using CDK constructs for infrastructure generation.
 * This is the main orchestration class that coordinates all synthesis activities.
 *
 * **Key Responsibilities:**
 * - Analyze backend configuration to identify required resources
 * - Create CDK App and Stack hierarchy
 * - Delegate to specialized synthesizers (Data, API, Function)
 * - Coordinate resource dependencies and ordering
 * - Generate ARM templates via CDK synthesis
 * - Produce function code packages and schema files
 * - Handle errors and validation
 *
 * **Design Principles:**
 * - Use CDK constructs instead of manual ARM JSON
 * - Delegate to specialized synthesizers for each layer
 * - Maintain backward compatibility with existing interfaces
 * - Provide helpful error messages
 * - Support progressive enhancement via attachments
 *
 * @example
 * ```typescript
 * const synthesizer = new BackendSynthesizer();
 * const result = await synthesizer.synthesize(backend, {
 *   validate: true,
 *   environment: 'production',
 * });
 * ```
 */
export class BackendSynthesizer implements IBackendSynthesizer {
  /**
   * Synthesize backend to deployable ARM template and artifacts
   *
   * @param backend - Backend object to synthesize
   * @param options - Synthesis options
   * @returns Synthesis result with ARM template, function code, and schemas
   *
   * @throws {Error} If backend is invalid
   * @throws {Error} If synthesis fails at any phase
   *
   * @remarks
   * This is the main entry point for synthesis. It orchestrates the complete pipeline:
   *
   * **Phase 1: Setup** - Create CDK App and Stack
   * **Phase 2: Analyze** - Discover models, attachments, and features
   * **Phase 3: Synthesize Data** - Generate Cosmos DB resources
   * **Phase 4: Synthesize API** - Generate API Management resources
   * **Phase 5: Synthesize Compute** - Generate Azure Functions resources
   * **Phase 6: Synthesize Schemas** - Generate OpenAPI and GraphQL schemas
   * **Phase 7: Generate ARM** - Run CDK synthesis to produce ARM templates
   * **Phase 8: Assemble Result** - Package all artifacts together
   *
   * Error Handling: If any phase fails, synthesis stops immediately with
   * a clear error message indicating which phase failed and why.
   *
   * @example
   * ```typescript
   * const result = await synthesizer.synthesize(backend);
   * console.log('Resources:', result.metadata.resourceCount);
   * console.log('Functions:', result.metadata.functionCount);
   * ```
   */
  async synthesize(
    backend: BackendObject,
    options: SynthesisOptions = {}
  ): Promise<SynthesisResult> {
    try {
      // ========================================================================
      // Phase 1: Setup - Create CDK App and Stack
      // ========================================================================

      const app = new App({
        outdir: options.outputDir || 'cdk.out',
      });

      // Create SubscriptionStack as parent for ResourceGroupStack
      const region = backend.settings.region || 'eastus';
      const subscriptionStack = new SubscriptionStack(app, `${backend.settings.name}-subscription`, {
        subscription: new Subscription({
          subscriptionId: '00000000-0000-0000-0000-000000000000', // Placeholder - will be configurable in future
          displayName: `${backend.settings.name} Subscription`,
        }),
        geography: new Geography(region),
        organization: new Organization(backend.settings.organization || 'default-org'),
        project: new Project(backend.settings.name),
        environment: new EnvironmentNaming(backend.environment),
        instance: new Instance(backend.settings.instance || '01'),
        tags: backend.settings.tags || {},
      });

      // Create ResourceGroupStack for deployment
      const stack = new ResourceGroupStack(subscriptionStack, backend.settings.name, {
        resourceGroup: {
          resourceGroupName: backend.settings.resourceGroup || `${backend.settings.name}-rg`,
          location: backend.settings.region || 'eastus',
        },
        tags: backend.settings.tags,
      });

      // ========================================================================
      // Phase 2: Analyze - Discover backend structure
      // ========================================================================

      const analysis = this.analyzeBackend(backend);
      const context = this.createSynthesisContext(backend, analysis, options);

      // Validate attachments
      await this.validateAttachments(backend, context);

      // ========================================================================
      // Phase 3: Synthesize Data Layer (Cosmos DB)
      // ========================================================================

      const dataResources = await this.synthesizeData(backend, stack, analysis);

      // ========================================================================
      // Phase 4: Synthesize API Layer (API Management)
      // ========================================================================

      const apiResources = await this.synthesizeApi(
        backend,
        stack,
        dataResources,
        analysis
      );

      // ========================================================================
      // Phase 5: Synthesize Compute Layer (Azure Functions)
      // ========================================================================

      const functionResources = await this.synthesizeFunction(
        backend,
        stack,
        dataResources,
        apiResources,
        analysis
      );

      // ========================================================================
      // Phase 6: Synthesize Schema Files (OpenAPI, GraphQL)
      // ========================================================================

      const schemas = await this.synthesizeSchemas(backend, apiResources, analysis);

      // ========================================================================
      // Phase 7: Generate ARM Template Directly (No lib Synthesizer)
      // ========================================================================
      //
      // Per ADR-022: Component synthesis does NOT use lib's Synthesizer.
      // We generate the ARM template directly from the stack construct tree.
      // This avoids the need for template metadata from lib's prepare phase.

      const armTemplate = this.generateArmTemplateFromStack(stack, backend, context);

      // ========================================================================
      // Phase 8: Assemble Complete Result
      // ========================================================================

      const metadata: SynthesisMetadata = {
        synthesizedAt: new Date(),
        version: '0.1.0', // TODO: Get from package.json
        backendName: backend.settings.name,
        environment: context.environment,
        region: context.region,
        resourceCount: armTemplate.resources.length,
        functionCount: analysis.models.function.length,
        modelCount:
          analysis.models.crud.length +
          analysis.models.event.length +
          analysis.models.function.length,
        features: context.features,
        warnings: [],
      };

      return {
        // New properties (primary)
        armTemplate,
        functions: functionResources.package,
        schemas,
        metadata,

        // Deprecated properties (backward compatibility)
        template: armTemplate,
        context,
        analysis,
        resourceCount: armTemplate.resources.length,
      };
    } catch (error) {
      throw new Error(
        `Backend synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ==========================================================================
  // Private Methods - Analysis
  // ==========================================================================

  /**
   * Analyze backend structure
   *
   * @param backend - Backend to analyze
   * @returns Backend analysis
   *
   * @remarks
   * Discovers:
   * - Models (CRUD, Event, Function)
   * - Attachments (Storage, Compute, Networking, Monitoring, Performance)
   * - Feature flags
   * - Dependencies between resources
   */
  private analyzeBackend(backend: BackendObject): BackendAnalysis {
    const models = this.discoverModels(backend.schema);
    const attachments = this.discoverAttachments(backend);
    const features = backend.settings.features;

    return {
      models: {
        crud: models.filter((m) => m.type === 'crud'),
        event: models.filter((m) => m.type === 'event'),
        function: models.filter((m) => m.type === 'function'),
      },
      attachments: {
        storage: attachments.filter((a) => a.category === 'storage'),
        compute: attachments.filter((a) => a.category === 'compute'),
        networking: attachments.filter((a) => a.category === 'networking'),
        monitoring: attachments.filter((a) => a.category === 'monitoring'),
        performance: attachments.filter((a) => a.category === 'performance'),
      },
      features,
      dependencies: this.analyzeDependencies(models, attachments),
    };
  }

  /**
   * Discover models from schema
   *
   * @param schema - Schema object
   * @returns Discovered models
   */
  private discoverModels(schema: SchemaObject): ModelInfo[] {
    const models: ModelInfo[] = [];

    for (const [modelName, modelDef] of Object.entries(schema.models)) {
      const modelType = this.determineModelType(modelName, modelDef);

      models.push({
        name: modelName,
        type: modelType,
        definition: modelDef,
      });
    }

    return models;
  }

  /**
   * Determine model type from definition
   *
   * @param modelName - Model name
   * @param modelDef - Model definition
   * @returns Model type ('crud', 'event', or 'function')
   */
  private determineModelType(
    modelName: string,
    modelDef: any
  ): 'crud' | 'event' | 'function' {
    // Check model metadata or naming conventions
    if (modelDef._modelType) {
      return modelDef._modelType;
    }

    // Heuristic: function models have 'input' and 'output' fields
    if (modelDef.input !== undefined && modelDef.output !== undefined) {
      return 'function';
    }

    // Default to crud
    return 'crud';
  }

  /**
   * Discover attachments from backend
   *
   * @param backend - Backend object
   * @returns Discovered attachments
   */
  private discoverAttachments(backend: BackendObject): AttachmentInfo[] {
    const attachments: AttachmentInfo[] = [];

    // Check storage attachments
    if (backend.storage.database.isAttached()) {
      attachments.push({
        path: 'storage.database',
        category: 'storage',
        config: backend.storage.database.getConfig(),
      });
    }

    if (backend.storage.account.isAttached()) {
      attachments.push({
        path: 'storage.account',
        category: 'storage',
        config: backend.storage.account.getConfig(),
      });
    }

    if (backend.storage.blobs.isAttached()) {
      attachments.push({
        path: 'storage.blobs',
        category: 'storage',
        config: backend.storage.blobs.getConfig(),
      });
    }

    // Check compute attachments
    if (backend.compute.functionApp.isAttached()) {
      attachments.push({
        path: 'compute.functionApp',
        category: 'compute',
        config: backend.compute.functionApp.getConfig(),
      });
    }

    // Check networking attachments (if enabled)
    if (backend.network) {
      if (backend.network.vnet.isAttached()) {
        attachments.push({
          path: 'network.vnet',
          category: 'networking',
          config: backend.network.vnet.getConfig(),
        });
      }
    }

    // Check monitoring attachments (if enabled)
    if (backend.monitoring) {
      if (backend.monitoring.appInsights.isAttached()) {
        attachments.push({
          path: 'monitoring.appInsights',
          category: 'monitoring',
          config: backend.monitoring.appInsights.getConfig(),
        });
      }
    }

    // Check performance attachments (if enabled)
    if (backend.performance) {
      if (backend.performance.cdn.isAttached()) {
        attachments.push({
          path: 'performance.cdn',
          category: 'performance',
          config: backend.performance.cdn.getConfig(),
        });
      }
    }

    return attachments;
  }

  /**
   * Analyze dependencies between models and attachments
   *
   * @param models - Discovered models
   * @param attachments - Discovered attachments
   * @returns Dependency map
   */
  private analyzeDependencies(
    models: ModelInfo[],
    attachments: AttachmentInfo[]
  ): Map<string, string[]> {
    const dependencies = new Map<string, string[]>();

    // CRUD models depend on Cosmos DB
    const crudModels = models.filter((m) => m.type === 'crud');
    if (crudModels.length > 0) {
      dependencies.set('cosmos-db', crudModels.map((m) => m.name));
    }

    // Event models depend on Service Bus
    const eventModels = models.filter((m) => m.type === 'event');
    if (eventModels.length > 0) {
      dependencies.set('service-bus', eventModels.map((m) => m.name));
    }

    // Function models depend on Function App
    const functionModels = models.filter((m) => m.type === 'function');
    if (functionModels.length > 0) {
      dependencies.set('function-app', functionModels.map((m) => m.name));
    }

    return dependencies;
  }

  /**
   * Create synthesis context
   *
   * @param backend - Backend object
   * @param analysis - Backend analysis
   * @param options - Synthesis options
   * @returns Synthesis context
   */
  private createSynthesisContext(
    backend: BackendObject,
    analysis: BackendAnalysis,
    options: SynthesisOptions
  ): SynthesisContext {
    const environment = options.environment || backend.environment;
    const cloudType = this.detectCloudType(backend.settings.region || 'eastus');
    const region = backend.settings.region || 'eastus';

    return {
      backend,
      analysis,
      environment,
      cloudType,
      region,
      resourceGroup: backend.settings.resourceGroup || `${backend.settings.name}-rg`,
      tags: backend.settings.tags || {},
      naming: {
        organization: backend.settings.organization || 'org',
        project: backend.settings.name,
        environment: this.normalizeEnvironment(environment),
        geography:
          backend.settings.geography || this.regionToGeographyCode(region),
        instance: backend.settings.instance || '01',
      },
      features: backend.settings.features,
    };
  }

  /**
   * Normalize environment to short code for naming
   *
   * @param env - Environment name
   * @returns Short environment code
   */
  private normalizeEnvironment(env: string): string {
    const normalized = env.toLowerCase();
    if (normalized === 'production' || normalized === 'prod') return 'prod';
    if (normalized === 'staging' || normalized === 'stg') return 'stg';
    if (normalized === 'development' || normalized === 'dev') return 'dev';
    return normalized.substring(0, 4); // Max 4 chars for custom environments
  }

  /**
   * Convert Azure region to short geography code
   *
   * @param region - Azure region (e.g., 'eastus', 'westus2')
   * @returns Short geography code (e.g., 'eus', 'wus2')
   */
  private regionToGeographyCode(region: string): string {
    const mapping: Record<string, string> = {
      eastus: 'eus',
      eastus2: 'eus2',
      westus: 'wus',
      westus2: 'wus2',
      westus3: 'wus3',
      centralus: 'cus',
      northcentralus: 'ncus',
      southcentralus: 'scus',
      westcentralus: 'wcus',
    };

    const code = mapping[region.toLowerCase()];
    if (code) return code;

    // Fallback: take first letter of each word segment
    return region
      .toLowerCase()
      .replace(/[^a-z]+/g, ' ')
      .split(' ')
      .map((word) => word[0])
      .join('')
      .substring(0, 4);
  }

  /**
   * Detect cloud type from region
   *
   * @param region - Azure region
   * @returns Cloud type ('commercial' or 'government')
   */
  private detectCloudType(region: string): 'commercial' | 'government' {
    // Government cloud regions typically start with 'usgov' or 'usdod'
    if (
      region.toLowerCase().startsWith('usgov') ||
      region.toLowerCase().startsWith('usdod')
    ) {
      return 'government';
    }
    return 'commercial';
  }

  /**
   * Validate attachments
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   */
  private async validateAttachments(
    backend: BackendObject,
    context: SynthesisContext
  ): Promise<void> {
    const attachments = context.analysis.attachments;

    // Validate storage attachments
    for (const attachment of attachments.storage) {
      this.validateAttachmentConfig(attachment);
    }

    // Validate compute attachments
    for (const attachment of attachments.compute) {
      this.validateAttachmentConfig(attachment);
    }

    // Validate networking attachments
    for (const attachment of attachments.networking) {
      this.validateAttachmentConfig(attachment);
    }
  }

  /**
   * Validate attachment configuration
   *
   * @param attachment - Attachment to validate
   */
  private validateAttachmentConfig(attachment: AttachmentInfo): void {
    // Basic validation - ensure config is not null/undefined
    if (!attachment.config) {
      throw new Error(`Attachment at ${attachment.path} has invalid configuration`);
    }
  }

  // ==========================================================================
  // Private Methods - Synthesis Delegation
  // ==========================================================================

  /**
   * Synthesize data layer (Cosmos DB)
   *
   * @param backend - Backend object
   * @param stack - Resource group stack
   * @param analysis - Backend analysis
   * @returns Data resources
   *
   * @remarks
   * Delegates to DataSynthesizer to create Cosmos DB resources.
   * Creates account, database, and containers for CRUD models.
   */
  private async synthesizeData(
    backend: BackendObject,
    stack: ResourceGroupStack,
    analysis: BackendAnalysis
  ): Promise<DataResources> {
    // Create synthesis context for data synthesizer
    const context = this.createSynthesisContext(backend, analysis, {});

    // Use DataSynthesizer to create Cosmos DB resources
    const dataSynthesizer = new DataSynthesizer();
    return await dataSynthesizer.synthesize(context, stack, {
      // cosmos: backend.settings.data, // TODO: Add data settings to backend settings type
    });
  }

  /**
   * Synthesize API layer (API Management)
   *
   * @param backend - Backend object
   * @param stack - Resource group stack
   * @param dataResources - Data layer resources
   * @param analysis - Backend analysis
   * @returns API resources
   *
   * @remarks
   * Creates Azure API Management service and generates REST API operations
   * for all CRUD models in the schema using the ApiSynthesizer.
   *
   * The synthesizer generates:
   * - API Management service instance (Consumption tier)
   * - Backend API within APIM
   * - 5 CRUD operations per model (list, create, get, update, delete)
   */
  private async synthesizeApi(
    backend: BackendObject,
    stack: ResourceGroupStack,
    dataResources: DataResources,
    analysis: BackendAnalysis
  ): Promise<ApiResources> {
    // Create synthesis context for ApiSynthesizer
    const context = this.createSynthesisContext(backend, analysis, {});

    // Create backend data resources for API integration
    const backendDataResources = {
      cosmosAccount: dataResources.cosmosAccount ?? undefined,
      cosmosDatabase: dataResources.database ?? undefined,
    };

    // Synthesize API resources using ApiSynthesizer
    const apiSynthesizer = new ApiSynthesizer();
    return await apiSynthesizer.synthesize(
      context,
      stack,
      backendDataResources
    );
  }

  /**
   * Synthesize compute layer (Azure Functions)
   *
   * @param backend - Backend object
   * @param stack - Resource group stack
   * @param dataResources - Data layer resources
   * @param apiResources - API layer resources
   * @param analysis - Backend analysis
   * @returns Function resources
   *
   * @remarks
   * Delegates to FunctionSynthesizer to create Function App and generate CRUD functions.
   * Generates function code packages from function definitions.
   */
  private async synthesizeFunction(
    backend: BackendObject,
    stack: ResourceGroupStack,
    dataResources: DataResources,
    apiResources: ApiResources,
    analysis: BackendAnalysis
  ): Promise<FunctionResources & { package: FunctionPackage }> {
    const { FunctionSynthesizer } = await import('./function-synthesizer');
    const functionSynthesizer = new FunctionSynthesizer();

    // Create synthesis context
    const context = this.createSynthesisContext(backend, analysis, {});

    // Create backend data resources for function integration
    const backendDataResources = {
      cosmosAccount: dataResources.cosmosAccount ?? undefined,
      cosmosDatabase: dataResources.database ?? undefined,
    };

    // Synthesize function resources
    const functionResources = await functionSynthesizer.synthesize(
      context,
      stack,
      backendDataResources,
      // backend.settings.function // TODO: Add function settings to backend settings type
    );

    // Generate function code package from function definitions
    const packageResult = this.generateFunctionPackage(functionResources.functions);

    return {
      ...functionResources,
      package: packageResult,
    };
  }

  /**
   * Synthesize schema files (OpenAPI, GraphQL)
   *
   * @param backend - Backend object
   * @param apiResources - API layer resources
   * @param analysis - Backend analysis
   * @returns Schema files
   *
   * @remarks
   * Delegates to SchemaSynthesizer for OpenAPI and GraphQL generation.
   * Converts SchemaArtifacts to SchemaFiles format for compatibility.
   */
  private async synthesizeSchemas(
    backend: BackendObject,
    apiResources: ApiResources,
    analysis: BackendAnalysis
  ): Promise<SchemaFiles> {
    const { SchemaSynthesizer } = await import('./schema-synthesizer');
    const schemaSynthesizer = new SchemaSynthesizer();

    // Create minimal context for schema synthesis
    const context: SynthesisContext = {
      backend,
      analysis,
      environment: backend.environment,
      cloudType: this.detectCloudType(backend.settings.region || 'eastus'),
      region: backend.settings.region || 'eastus',
      resourceGroup: backend.settings.resourceGroup || `${backend.settings.name}-rg`,
      tags: backend.settings.tags || {},
      naming: {
        organization: backend.settings.organization || 'org',
        project: backend.settings.name,
        environment: this.normalizeEnvironment(backend.environment),
        geography:
          backend.settings.geography ||
          this.regionToGeographyCode(backend.settings.region || 'eastus'),
        instance: backend.settings.instance || '01',
      },
      features: backend.settings.features,
    };

    // Generate schema artifacts
    const artifacts = await schemaSynthesizer.synthesize(context);

    // Convert SchemaArtifacts to SchemaFiles format
    return {
      openapi: artifacts.openapi ? JSON.stringify(artifacts.openapi, null, 2) : undefined,
      graphql: artifacts.graphql || undefined,
      jsonSchemas: undefined, // Not yet implemented
    };
  }

  /**
   * Generate function code package from function definitions
   *
   * @param functions - Function definitions
   * @returns Function package
   *
   * @remarks
   * Generates a deployable function package containing:
   * - Handler files (one per function)
   * - Shared utilities (empty for now)
   * - package.json with dependencies
   * - tsconfig.json for TypeScript compilation
   */
  private generateFunctionPackage(
    functions: readonly import('./function-synthesizer-types').FunctionDefinition[]
  ): FunctionPackage {
    // Generate handler files from function definitions
    const handlers: Record<string, string> = {};
    const allDependencies: Record<string, string> = {};

    for (const func of functions) {
      handlers[func.name] = func.template.sourceCode;

      // Collect dependencies
      if (func.template.dependencies) {
        Object.assign(allDependencies, func.template.dependencies);
      }
    }

    // Generate package.json
    const packageJson = JSON.stringify(
      {
        name: 'azure-functions-app',
        version: '1.0.0',
        description: 'Generated Azure Functions application',
        main: 'index.js',
        scripts: {
          build: 'tsc',
          start: 'npm run build && func start',
        },
        dependencies: {
          ...allDependencies,
        },
        devDependencies: {
          '@types/node': '^18.0.0',
          typescript: '^5.0.0',
        },
      },
      null,
      2
    );

    // Generate tsconfig.json
    const tsConfig = JSON.stringify(
      {
        compilerOptions: {
          module: 'commonjs',
          target: 'ES2021',
          outDir: 'dist',
          rootDir: '.',
          sourceMap: true,
          strict: false,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
        },
        include: ['**/*.ts'],
        exclude: ['node_modules'],
      },
      null,
      2
    );

    return {
      handlers,
      shared: {},
      packageJson,
      tsConfig,
    };
  }

  // ==========================================================================
  // Private Methods - ARM Template Generation
  // ==========================================================================

  /**
   * Generate ARM template directly from stack construct tree
   *
   * @param stack - ResourceGroupStack containing resources
   * @param backend - Backend object
   * @param context - Synthesis context
   * @returns ARM template
   *
   * @remarks
   * Per ADR-022, component synthesis does NOT use lib's Synthesizer.
   * Instead, we generate the ARM template directly by traversing the
   * construct tree and collecting ARM resources from each child construct.
   *
   * This approach:
   * - Avoids dependency on lib's prepare/transform pipeline
   * - Doesn't require template metadata from lib's TemplateSplitter
   * - Produces complete, self-contained ARM templates
   * - Maintains clean separation between component and lib synthesis
   *
   * @throws {Error} If template generation fails
   */
  private generateArmTemplateFromStack(
    stack: ResourceGroupStack,
    backend: BackendObject,
    context: SynthesisContext
  ): ARMTemplate {
    try {
      // Collect all ARM resources from the construct tree
      const resources = this.collectArmResources(stack);

      // Generate template sections
      const parameters = this.generateParameters(backend, context);
      const variables = this.generateVariables(backend, context);
      const outputs = this.generateOutputs(backend, context, resources);

      // Return complete ARM template
      return {
        $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
        contentVersion: '1.0.0.0',
        parameters,
        variables,
        resources,
        outputs,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate ARM template from stack: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Collect all ARM resources from construct tree
   *
   * @param construct - Root construct to traverse
   * @returns Array of ARM resources
   *
   * @remarks
   * Recursively traverses the construct tree and collects ARM resource
   * definitions from each construct. If a construct has a `toArmTemplate()`
   * method (i.e., it's a Resource), we call that method to get its ARM JSON.
   * Resources are collected in tree order to maintain proper dependency relationships.
   */
  private collectArmResources(construct: any): any[] {
    const resources: any[] = [];

    // Check if this is a Resource construct with toArmTemplate() method
    if (typeof construct.toArmTemplate === 'function') {
      try {
        const armResource = construct.toArmTemplate();
        if (armResource) {
          resources.push(armResource);
        }
      } catch (error) {
        // Log but don't fail if a resource can't be transformed
        console.warn(`Failed to transform construct ${construct.node.id} to ARM:`, error);
      }
    }

    // Recursively collect from children
    if (construct.node && construct.node.children) {
      for (const child of construct.node.children) {
        resources.push(...this.collectArmResources(child));
      }
    }

    return resources;
  }

  /**
   * Generate ARM template parameters
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @returns ARM parameters
   */
  private generateParameters(
    backend: BackendObject,
    context: SynthesisContext
  ): Record<string, any> {
    const parameters: Record<string, any> = {
      location: {
        type: 'string',
        defaultValue: context.region,
        metadata: {
          description: 'Azure region for deployment',
        },
      },
    };

    return parameters;
  }

  /**
   * Generate ARM template variables
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @returns ARM variables
   */
  private generateVariables(
    backend: BackendObject,
    context: SynthesisContext
  ): Record<string, any> {
    return {
      resourcePrefix: `${context.naming.organization}-${context.naming.project}-${context.naming.environment}-${context.naming.geography}-${context.naming.instance}`,
      tags: context.tags,
    };
  }

  /**
   * Generate ARM template outputs
   *
   * @param backend - Backend object
   * @param context - Synthesis context
   * @param resources - ARM resources
   * @returns ARM outputs
   */
  private generateOutputs(
    backend: BackendObject,
    context: SynthesisContext,
    resources: any[]
  ): Record<string, any> {
    const outputs: Record<string, any> = {};

    // Add resource group name output
    outputs.resourceGroupName = {
      type: 'string',
      value: context.resourceGroup,
    };

    return outputs;
  }
}

// ============================================================================
// Types (for backward compatibility with existing code)
// ============================================================================

/**
 * Synthesis options
 *
 * @remarks
 * Re-exported from types.ts but kept here for backward compatibility
 * with existing code that imports from backend-synthesizer.ts
 */
export type { SynthesisOptions };
