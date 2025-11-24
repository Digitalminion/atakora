/**
 * Function Synthesizer - Azure Functions Infrastructure and Code Generation
 *
 * Orchestrates the creation of Azure Function Apps and generates CRUD function code
 * from schema definitions using CDK L2 constructs.
 *
 * @module @atakora/component/synthesis/function-synthesizer
 *
 * @remarks
 * The FunctionSynthesizer creates:
 * 1. App Service Plan (Consumption Y1 or Premium EP1/EP2/EP3)
 * 2. Function App with system-assigned managed identity
 * 3. CRUD functions for each model (5 functions per model: list, create, get, update, delete)
 * 4. HTTP triggers with proper routing
 * 5. Cosmos DB bindings for data access
 *
 * **Architecture:**
 * - Uses CDK L2 constructs (ServerFarms, Sites)
 * - Generates TypeScript function handlers
 * - Configures runtime settings (Node.js 18)
 * - Sets up Cosmos DB connection strings
 * - Applies security best practices (HTTPS only, managed identity)
 *
 * @example
 * Basic usage:
 * ```typescript
 * const synthesizer = new FunctionSynthesizer();
 * const resources = await synthesizer.synthesize(
 *   context,
 *   stack,
 *   dataResources,
 *   { sku: 'Y1' }
 * );
 *
 * console.log(`Created Function App: ${resources.functionApp?.siteName}`);
 * console.log(`Generated ${resources.functions.length} functions`);
 * ```
 */

import { ServerFarms, Sites } from '@atakora/cdk/web';
import type { IServerFarm, ISite, ServerFarmSkuName, ServerFarmSkuTier } from '@atakora/cdk/web';
import { ServerFarmKind, AppServiceKind } from '@atakora/cdk/web';
import type { ResourceGroupStack } from '@atakora/lib';
import { ManagedIdentityType } from '@atakora/lib';
import type {
  FunctionResources,
  FunctionDefinition,
  FunctionSynthesisOptions,
  HttpTriggerConfig,
  CosmosBindingConfig,
  FunctionTemplate,
} from './function-synthesizer-types';
import type { SynthesisContext, BackendDataResources } from './types';
import { ResourceNamingUtility } from './naming-utils';
import { SchemaIntrospector } from './schema-introspection';
import { pluralize } from './pluralization';

/**
 * Interface for the FunctionSynthesizer class
 *
 * @remarks
 * This interface is separate to allow for easier testing and mocking.
 */
export interface IFunctionSynthesizer {
  /**
   * Synthesize Azure Functions resources from schema
   *
   * @param context - Synthesis context with naming and environment configuration
   * @param stack - Resource group stack for CDK construct placement
   * @param dataResources - Cosmos DB resources for data layer integration
   * @param options - Optional function app configuration
   * @returns Promise resolving to generated function resources
   */
  synthesize(
    context: SynthesisContext,
    stack: ResourceGroupStack,
    dataResources: BackendDataResources,
    options?: FunctionSynthesisOptions
  ): Promise<FunctionResources>;
}

/**
 * Function Synthesizer - Creates Azure Functions infrastructure and CRUD code
 *
 * @remarks
 * Orchestrates the creation of Azure Functions resources:
 * 1. Creates App Service Plan (hosting infrastructure)
 * 2. Creates Function App (runtime environment)
 * 3. Generates CRUD functions for each model
 * 4. Configures HTTP triggers and Cosmos DB bindings
 * 5. Sets up application settings and connection strings
 *
 * **Synthesis Pipeline:**
 * - Analyze schema to discover CRUD models
 * - Create App Service Plan with appropriate SKU
 * - Create Function App with Node.js 18 runtime
 * - Generate 5 functions per CRUD model (list, create, get, update, delete)
 * - Configure Cosmos DB connection strings
 * - Enable system-assigned managed identity
 * - Set HTTPS only requirement
 *
 * @example
 * ```typescript
 * const synthesizer = new FunctionSynthesizer();
 *
 * const resources = await synthesizer.synthesize(
 *   context,
 *   stack,
 *   dataResources,
 *   {
 *     sku: 'EP1',
 *     alwaysOn: true,
 *     appSettings: {
 *       'NODE_ENV': 'production',
 *       'LOG_LEVEL': 'info'
 *     }
 *   }
 * );
 *
 * // Access generated resources
 * console.log(`Function App: ${resources.functionApp?.siteName}`);
 * console.log(`App Service Plan: ${resources.appServicePlan?.planName}`);
 * console.log(`Functions: ${resources.functions.length}`);
 *
 * // List generated functions
 * for (const func of resources.functions) {
 *   console.log(`  - ${func.name} (${func.type}): ${func.httpTrigger.route}`);
 * }
 * ```
 */
export class FunctionSynthesizer implements IFunctionSynthesizer {
  private readonly namingUtility: ResourceNamingUtility;
  private readonly introspector: SchemaIntrospector;

  /**
   * Creates a new FunctionSynthesizer instance.
   *
   * @example
   * ```typescript
   * const synthesizer = new FunctionSynthesizer();
   * ```
   */
  constructor() {
    this.namingUtility = new ResourceNamingUtility();
    this.introspector = new SchemaIntrospector();
  }

  /**
   * Synthesize Azure Functions resources from schema
   *
   * @param context - Synthesis context with naming and environment configuration
   * @param stack - Resource group stack for CDK construct placement
   * @param dataResources - Cosmos DB resources for data layer integration
   * @param options - Optional function app configuration
   * @returns Promise resolving to generated function resources
   *
   * @remarks
   * This method performs the following steps:
   * 1. Create App Service Plan with specified or default SKU
   * 2. Create Function App with Node.js 18 runtime
   * 3. Discover CRUD models from schema
   * 4. Generate 5 functions per model (list, create, get, update, delete)
   * 5. Configure HTTP triggers with REST routes
   * 6. Configure Cosmos DB bindings for data access
   * 7. Set application settings (runtime, Cosmos connection)
   * 8. Enable system-assigned managed identity
   *
   * @example
   * Production configuration:
   * ```typescript
   * const resources = await synthesizer.synthesize(
   *   context,
   *   stack,
   *   dataResources,
   *   {
   *     sku: 'EP1',
   *     alwaysOn: true,
   *     appSettings: {
   *       'NODE_ENV': 'production',
   *       'APPINSIGHTS_INSTRUMENTATIONKEY': '...'
   *     }
   *   }
   * );
   * ```
   *
   * @example
   * Development configuration:
   * ```typescript
   * const resources = await synthesizer.synthesize(
   *   context,
   *   stack,
   *   dataResources,
   *   { sku: 'Y1' } // Consumption plan for development
   * );
   * ```
   */
  async synthesize(
    context: SynthesisContext,
    stack: ResourceGroupStack,
    dataResources: BackendDataResources,
    options?: FunctionSynthesisOptions
  ): Promise<FunctionResources> {
    // 1. Create App Service Plan (Consumption or Premium)
    const appServicePlan = this.createAppServicePlan(context, stack, options);

    // 2. Create Function App with system-assigned identity
    const functionApp = this.createFunctionApp(
      context,
      stack,
      appServicePlan,
      dataResources,
      options
    );

    // 3. Generate CRUD functions for each model
    const functions = this.generateCrudFunctions(context, dataResources);

    return {
      functionApp,
      appServicePlan,
      functions,
    };
  }

  /**
   * Create App Service Plan for hosting Function App
   *
   * @param context - Synthesis context
   * @param stack - Resource group stack
   * @param options - Function synthesis options
   * @returns App Service Plan (IServerFarm)
   *
   * @remarks
   * Creates an App Service Plan with:
   * - Auto-generated name using naming utility
   * - SKU from options or default (Y1 for dev, EP1 for prod)
   * - Linux OS (reserved: true)
   * - Location from context
   *
   * **SKU Options:**
   * - **Y1** (Consumption): Pay-per-execution, auto-scale, 1.5GB memory
   * - **EP1** (Elastic Premium): Pre-warmed instances, VNet, 3.5GB memory
   * - **EP2** (Elastic Premium): Pre-warmed instances, VNet, 7GB memory
   * - **EP3** (Elastic Premium): Pre-warmed instances, VNet, 14GB memory
   *
   * @example
   * ```typescript
   * const plan = this.createAppServicePlan(context, stack, { sku: 'EP1' });
   * console.log(`Created plan: ${plan.planName}`);
   * ```
   */
  private createAppServicePlan(
    context: SynthesisContext,
    stack: ResourceGroupStack,
    options?: FunctionSynthesisOptions
  ): IServerFarm {
    // Generate App Service Plan name using naming utility
    const planName = this.namingUtility.generateAppServicePlanName(context);

    // Determine SKU (default: Y1 for dev, EP1 for prod)
    const skuName = options?.sku || this.getDefaultSku(context);

    // Create App Service Plan using CDK L2 construct
    const plan = new ServerFarms(stack, 'FunctionAppServicePlan', {
      planName,
      sku: skuName as ServerFarmSkuName,
      kind: ServerFarmKind.LINUX,
      reserved: true, // Linux plans must have reserved: true
      location: context.region,
      tags: context.tags,
    });

    return plan;
  }

  /**
   * Create Function App with Node.js runtime
   *
   * @param context - Synthesis context
   * @param stack - Resource group stack
   * @param plan - App Service Plan
   * @param dataResources - Cosmos DB resources
   * @param options - Function synthesis options
   * @returns Function App (ISite)
   *
   * @remarks
   * Creates a Function App (Sites resource with kind 'functionapp,linux') with:
   * - Auto-generated name using naming utility
   * - Node.js 18 runtime
   * - System-assigned managed identity
   * - HTTPS only enabled
   * - Application settings:
   *   - FUNCTIONS_WORKER_RUNTIME: 'node'
   *   - FUNCTIONS_EXTENSION_VERSION: '~4'
   *   - WEBSITE_NODE_DEFAULT_VERSION: '~18'
   *   - CosmosDB connection string (if available)
   *   - Custom settings from options
   *
   * @example
   * ```typescript
   * const functionApp = this.createFunctionApp(
   *   context,
   *   stack,
   *   plan,
   *   dataResources,
   *   { alwaysOn: true }
   * );
   * console.log(`Created Function App: ${functionApp.siteName}`);
   * ```
   */
  private createFunctionApp(
    context: SynthesisContext,
    stack: ResourceGroupStack,
    plan: IServerFarm,
    dataResources: BackendDataResources,
    options?: FunctionSynthesisOptions
  ): ISite {
    // Generate Function App name using naming utility
    const functionAppName = this.namingUtility.generateFunctionAppName(context);

    // Prepare application settings
    const appSettings: Record<string, string> = {
      // Azure Functions runtime settings
      FUNCTIONS_WORKER_RUNTIME: 'node',
      FUNCTIONS_EXTENSION_VERSION: '~4',
      WEBSITE_NODE_DEFAULT_VERSION: '~18',
      AzureWebJobsStorage: '', // Required but will be auto-provisioned by Azure

      // Cosmos DB connection (if available)
      ...(dataResources.cosmosAccount
        ? {
            CosmosDB__connectionString: `AccountEndpoint=https://${dataResources.cosmosAccount.databaseAccountName}.documents.azure.com:443/;AccountKey=[secure-reference]`,
            CosmosDB__databaseName: dataResources.cosmosDatabase?.databaseName || context.naming.project,
          }
        : {}),

      // Custom app settings from options
      ...(options?.appSettings || {}),
    };

    // Create Function App using CDK L2 construct
    // Note: Sites resource kind should be 'functionapp' for Linux functions
    // The L2 construct handles the appropriate configuration
    const functionApp = new Sites(stack, 'FunctionApp', {
      siteName: functionAppName,
      serverFarmId: plan.planId,
      kind: AppServiceKind.FUNCTIONAPP,
      location: context.region,
      tags: context.tags,

      // Runtime configuration
      linuxFxVersion: 'NODE|18',
      httpsOnly: true,
      alwaysOn: options?.alwaysOn ?? this.getDefaultAlwaysOn(options?.sku || this.getDefaultSku(context)),

      // Managed identity
      identity: {
        type: ManagedIdentityType.SYSTEM_ASSIGNED,
      },

      // Application settings
      appSettings: Object.entries(appSettings).map(([name, value]) => ({
        name,
        value,
      })),
    });

    return functionApp;
  }

  /**
   * Generate CRUD functions for all models in schema
   *
   * @param context - Synthesis context
   * @param dataResources - Cosmos DB resources
   * @returns Array of function definitions
   *
   * @remarks
   * For each CRUD model, generates 5 functions:
   * 1. **list{Models}** - GET /{models} - List all resources
   * 2. **create{Model}** - POST /{models} - Create new resource
   * 3. **get{Model}** - GET /{models}/{id} - Get single resource by ID
   * 4. **update{Model}** - PUT /{models}/{id} - Update resource
   * 5. **delete{Model}** - DELETE /{models}/{id} - Delete resource
   *
   * Each function includes:
   * - HTTP trigger with appropriate method and route
   * - Cosmos DB binding for data access
   * - TypeScript code template
   *
   * @example
   * For a "User" model:
   * ```typescript
   * [
   *   { name: 'listUsers', type: 'list', route: 'users', methods: ['GET'] },
   *   { name: 'createUser', type: 'create', route: 'users', methods: ['POST'] },
   *   { name: 'getUser', type: 'get', route: 'users/{id}', methods: ['GET'] },
   *   { name: 'updateUser', type: 'update', route: 'users/{id}', methods: ['PUT'] },
   *   { name: 'deleteUser', type: 'delete', route: 'users/{id}', methods: ['DELETE'] }
   * ]
   * ```
   */
  private generateCrudFunctions(
    context: SynthesisContext,
    dataResources: BackendDataResources
  ): readonly FunctionDefinition[] {
    const functions: FunctionDefinition[] = [];

    // Get CRUD models from schema
    const crudModels = this.introspector.getCrudModels(context.backend.schema);

    // Generate 5 functions for each CRUD model
    for (const model of crudModels) {
      const modelName = model.name;
      const resourceName = pluralize(modelName).toLowerCase();
      const containerName = resourceName;
      const databaseName = dataResources.cosmosDatabase?.databaseName || context.naming.project;

      // 1. List function (GET /resources)
      functions.push(
        this.createListFunction(modelName, resourceName, containerName, databaseName)
      );

      // 2. Create function (POST /resources)
      functions.push(
        this.createCreateFunction(modelName, resourceName, containerName, databaseName)
      );

      // 3. Get function (GET /resources/{id})
      functions.push(
        this.createGetFunction(modelName, resourceName, containerName, databaseName)
      );

      // 4. Update function (PUT /resources/{id})
      functions.push(
        this.createUpdateFunction(modelName, resourceName, containerName, databaseName)
      );

      // 5. Delete function (DELETE /resources/{id})
      functions.push(
        this.createDeleteFunction(modelName, resourceName, containerName, databaseName)
      );
    }

    return functions;
  }

  /**
   * Create list function (GET /resources)
   */
  private createListFunction(
    modelName: string,
    resourceName: string,
    containerName: string,
    databaseName: string
  ): FunctionDefinition {
    return {
      name: `list${modelName}s`,
      type: 'list',
      modelName,
      httpTrigger: {
        methods: ['GET'],
        route: resourceName,
        authLevel: 'function',
      },
      cosmosBinding: {
        connection: 'CosmosDB',
        databaseName,
        containerName,
      },
      template: {
        language: 'typescript',
        templateType: 'crud',
        sourceCode: this.generateListFunctionCode(modelName, resourceName),
        dependencies: {
          '@azure/functions': '^4.0.0',
          '@azure/cosmos': '^4.0.0',
        },
      },
    };
  }

  /**
   * Create create function (POST /resources)
   */
  private createCreateFunction(
    modelName: string,
    resourceName: string,
    containerName: string,
    databaseName: string
  ): FunctionDefinition {
    return {
      name: `create${modelName}`,
      type: 'create',
      modelName,
      httpTrigger: {
        methods: ['POST'],
        route: resourceName,
        authLevel: 'function',
      },
      cosmosBinding: {
        connection: 'CosmosDB',
        databaseName,
        containerName,
      },
      template: {
        language: 'typescript',
        templateType: 'crud',
        sourceCode: this.generateCreateFunctionCode(modelName, resourceName),
        dependencies: {
          '@azure/functions': '^4.0.0',
          '@azure/cosmos': '^4.0.0',
        },
      },
    };
  }

  /**
   * Create get function (GET /resources/{id})
   */
  private createGetFunction(
    modelName: string,
    resourceName: string,
    containerName: string,
    databaseName: string
  ): FunctionDefinition {
    return {
      name: `get${modelName}`,
      type: 'get',
      modelName,
      httpTrigger: {
        methods: ['GET'],
        route: `${resourceName}/{id}`,
        authLevel: 'function',
      },
      cosmosBinding: {
        connection: 'CosmosDB',
        databaseName,
        containerName,
      },
      template: {
        language: 'typescript',
        templateType: 'crud',
        sourceCode: this.generateGetFunctionCode(modelName, resourceName),
        dependencies: {
          '@azure/functions': '^4.0.0',
          '@azure/cosmos': '^4.0.0',
        },
      },
    };
  }

  /**
   * Create update function (PUT /resources/{id})
   */
  private createUpdateFunction(
    modelName: string,
    resourceName: string,
    containerName: string,
    databaseName: string
  ): FunctionDefinition {
    return {
      name: `update${modelName}`,
      type: 'update',
      modelName,
      httpTrigger: {
        methods: ['PUT'],
        route: `${resourceName}/{id}`,
        authLevel: 'function',
      },
      cosmosBinding: {
        connection: 'CosmosDB',
        databaseName,
        containerName,
      },
      template: {
        language: 'typescript',
        templateType: 'crud',
        sourceCode: this.generateUpdateFunctionCode(modelName, resourceName),
        dependencies: {
          '@azure/functions': '^4.0.0',
          '@azure/cosmos': '^4.0.0',
        },
      },
    };
  }

  /**
   * Create delete function (DELETE /resources/{id})
   */
  private createDeleteFunction(
    modelName: string,
    resourceName: string,
    containerName: string,
    databaseName: string
  ): FunctionDefinition {
    return {
      name: `delete${modelName}`,
      type: 'delete',
      modelName,
      httpTrigger: {
        methods: ['DELETE'],
        route: `${resourceName}/{id}`,
        authLevel: 'function',
      },
      cosmosBinding: {
        connection: 'CosmosDB',
        databaseName,
        containerName,
      },
      template: {
        language: 'typescript',
        templateType: 'crud',
        sourceCode: this.generateDeleteFunctionCode(modelName, resourceName),
        dependencies: {
          '@azure/functions': '^4.0.0',
          '@azure/cosmos': '^4.0.0',
        },
      },
    };
  }

  // ==========================================================================
  // Code Generation Methods
  // ==========================================================================

  /**
   * Generate TypeScript code for list function
   */
  private generateListFunctionCode(modelName: string, resourceName: string): string {
    return `import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

/**
 * List all ${modelName} resources
 *
 * @remarks
 * HTTP GET /${resourceName}
 * Returns array of all ${modelName} documents from Cosmos DB
 */
const handler: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    // Get Cosmos DB connection
    const connectionString = process.env.CosmosDB__connectionString;
    const databaseName = process.env.CosmosDB__databaseName;

    if (!connectionString || !databaseName) {
      context.res = {
        status: 500,
        body: { error: 'Database configuration missing' }
      };
      return;
    }

    // Query all documents
    const client = new CosmosClient(connectionString);
    const database = client.database(databaseName);
    const container = database.container('${resourceName}');

    const { resources } = await container.items.readAll().fetchAll();

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: resources
    };
  } catch (error) {
    context.log.error('Error listing ${resourceName}:', error);
    context.res = {
      status: 500,
      body: { error: 'Internal server error' }
    };
  }
};

export default handler;
`;
  }

  /**
   * Generate TypeScript code for create function
   */
  private generateCreateFunctionCode(modelName: string, resourceName: string): string {
    return `import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

/**
 * Create new ${modelName} resource
 *
 * @remarks
 * HTTP POST /${resourceName}
 * Creates new ${modelName} document in Cosmos DB
 */
const handler: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    const body = req.body;

    if (!body) {
      context.res = {
        status: 400,
        body: { error: 'Request body required' }
      };
      return;
    }

    // Get Cosmos DB connection
    const connectionString = process.env.CosmosDB__connectionString;
    const databaseName = process.env.CosmosDB__databaseName;

    if (!connectionString || !databaseName) {
      context.res = {
        status: 500,
        body: { error: 'Database configuration missing' }
      };
      return;
    }

    // Create document
    const client = new CosmosClient(connectionString);
    const database = client.database(databaseName);
    const container = database.container('${resourceName}');

    const { resource } = await container.items.create(body);

    context.res = {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
      body: resource
    };
  } catch (error) {
    context.log.error('Error creating ${modelName}:', error);
    context.res = {
      status: 500,
      body: { error: 'Internal server error' }
    };
  }
};

export default handler;
`;
  }

  /**
   * Generate TypeScript code for get function
   */
  private generateGetFunctionCode(modelName: string, resourceName: string): string {
    return `import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

/**
 * Get single ${modelName} resource by ID
 *
 * @remarks
 * HTTP GET /${resourceName}/{id}
 * Returns single ${modelName} document from Cosmos DB
 */
const handler: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    const id = context.bindingData.id;

    if (!id) {
      context.res = {
        status: 400,
        body: { error: 'ID parameter required' }
      };
      return;
    }

    // Get Cosmos DB connection
    const connectionString = process.env.CosmosDB__connectionString;
    const databaseName = process.env.CosmosDB__databaseName;

    if (!connectionString || !databaseName) {
      context.res = {
        status: 500,
        body: { error: 'Database configuration missing' }
      };
      return;
    }

    // Read document
    const client = new CosmosClient(connectionString);
    const database = client.database(databaseName);
    const container = database.container('${resourceName}');

    const { resource } = await container.item(id, id).read();

    if (!resource) {
      context.res = {
        status: 404,
        body: { error: '${modelName} not found' }
      };
      return;
    }

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: resource
    };
  } catch (error: any) {
    if (error.code === 404) {
      context.res = {
        status: 404,
        body: { error: '${modelName} not found' }
      };
    } else {
      context.log.error('Error getting ${modelName}:', error);
      context.res = {
        status: 500,
        body: { error: 'Internal server error' }
      };
    }
  }
};

export default handler;
`;
  }

  /**
   * Generate TypeScript code for update function
   */
  private generateUpdateFunctionCode(modelName: string, resourceName: string): string {
    return `import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

/**
 * Update existing ${modelName} resource
 *
 * @remarks
 * HTTP PUT /${resourceName}/{id}
 * Updates ${modelName} document in Cosmos DB
 */
const handler: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    const id = context.bindingData.id;
    const body = req.body;

    if (!id) {
      context.res = {
        status: 400,
        body: { error: 'ID parameter required' }
      };
      return;
    }

    if (!body) {
      context.res = {
        status: 400,
        body: { error: 'Request body required' }
      };
      return;
    }

    // Get Cosmos DB connection
    const connectionString = process.env.CosmosDB__connectionString;
    const databaseName = process.env.CosmosDB__databaseName;

    if (!connectionString || !databaseName) {
      context.res = {
        status: 500,
        body: { error: 'Database configuration missing' }
      };
      return;
    }

    // Update document
    const client = new CosmosClient(connectionString);
    const database = client.database(databaseName);
    const container = database.container('${resourceName}');

    const { resource } = await container.item(id, id).replace({ ...body, id });

    context.res = {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      body: resource
    };
  } catch (error: any) {
    if (error.code === 404) {
      context.res = {
        status: 404,
        body: { error: '${modelName} not found' }
      };
    } else {
      context.log.error('Error updating ${modelName}:', error);
      context.res = {
        status: 500,
        body: { error: 'Internal server error' }
      };
    }
  }
};

export default handler;
`;
  }

  /**
   * Generate TypeScript code for delete function
   */
  private generateDeleteFunctionCode(modelName: string, resourceName: string): string {
    return `import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { CosmosClient } from '@azure/cosmos';

/**
 * Delete ${modelName} resource
 *
 * @remarks
 * HTTP DELETE /${resourceName}/{id}
 * Deletes ${modelName} document from Cosmos DB
 */
const handler: AzureFunction = async (context: Context, req: HttpRequest): Promise<void> => {
  try {
    const id = context.bindingData.id;

    if (!id) {
      context.res = {
        status: 400,
        body: { error: 'ID parameter required' }
      };
      return;
    }

    // Get Cosmos DB connection
    const connectionString = process.env.CosmosDB__connectionString;
    const databaseName = process.env.CosmosDB__databaseName;

    if (!connectionString || !databaseName) {
      context.res = {
        status: 500,
        body: { error: 'Database configuration missing' }
      };
      return;
    }

    // Delete document
    const client = new CosmosClient(connectionString);
    const database = client.database(databaseName);
    const container = database.container('${resourceName}');

    await container.item(id, id).delete();

    context.res = {
      status: 204
    };
  } catch (error: any) {
    if (error.code === 404) {
      context.res = {
        status: 404,
        body: { error: '${modelName} not found' }
      };
    } else {
      context.log.error('Error deleting ${modelName}:', error);
      context.res = {
        status: 500,
        body: { error: 'Internal server error' }
      };
    }
  }
};

export default handler;
`;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get default SKU based on environment
   *
   * @param context - Synthesis context
   * @returns Default SKU name
   *
   * @remarks
   * - Development: Y1 (Consumption)
   * - Production: EP1 (Elastic Premium)
   */
  private getDefaultSku(context: SynthesisContext): string {
    return context.naming.environment === 'prod' ? 'EP1' : 'Y1';
  }

  /**
   * Get default alwaysOn setting based on SKU
   *
   * @param sku - SKU name
   * @returns Default alwaysOn value
   *
   * @remarks
   * - Y1 (Consumption): false (not supported)
   * - EP1/EP2/EP3 (Premium): true (recommended)
   */
  private getDefaultAlwaysOn(sku: string): boolean {
    return sku !== 'Y1';
  }
}
