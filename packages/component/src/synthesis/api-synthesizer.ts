/**
 * API Synthesizer - Azure API Management Orchestration
 *
 * Orchestrates the creation of Azure API Management resources including:
 * - API Management service instances
 * - APIs within APIM
 * - CRUD operations for each schema model
 *
 * @module @atakora/component/synthesis/api-synthesizer
 *
 * @remarks
 * The ApiSynthesizer generates REST API operations following Amplify-style conventions:
 * - GET /{models} (list all)
 * - POST /{models} (create)
 * - GET /{models}/{id} (get by ID)
 * - PUT /{models}/{id} (update)
 * - DELETE /{models}/{id} (delete)
 *
 * Model names are automatically pluralized for resource paths (e.g., "User" → "/users").
 *
 * @example
 * Basic usage:
 * ```typescript
 * const synthesizer = new ApiSynthesizer();
 * const apiResources = await synthesizer.synthesize(context, stack);
 *
 * console.log(apiResources.apim.serviceName); // apim-org-app-dev-eus-01
 * console.log(apiResources.operations.length); // 5 operations per CRUD model
 * ```
 */

import type {
  ApiResources,
  ApiOperation,
  BackendDataResources,
  SynthesisContext,
} from './types';
import type { ResourceGroupStack } from '@atakora/lib';
import type { IService, IServiceApi } from '@atakora/cdk/apimanagement';
import { Service } from '@atakora/cdk/apimanagement';
import { ApiManagementApi } from '@atakora/cdk/apimanagement';
import { ApiManagementSkuName, ApiProtocol } from '@atakora/cdk/apimanagement';
import { ResourceNamingUtility } from './naming-utils';
import { SchemaIntrospector } from './schema-introspection';
import { pluralize } from './pluralization';

/**
 * Interface for API Synthesizer
 *
 * @remarks
 * Defines the contract for synthesizing Azure API Management resources
 * from backend schema definitions.
 */
export interface IApiSynthesizer {
  /**
   * Synthesize API Management resources from backend schema
   *
   * @param context - Synthesis context containing backend configuration
   * @param stack - Resource group stack for CDK construct placement
   * @param dataResources - Backend data resources (optional, for integration)
   * @returns Promise resolving to generated API resources
   */
  synthesize(
    context: SynthesisContext,
    stack: ResourceGroupStack,
    dataResources?: BackendDataResources
  ): Promise<ApiResources>;
}

/**
 * API Synthesizer Implementation
 *
 * @remarks
 * Orchestrates the creation of Azure API Management resources using CDK L2 constructs.
 * Generates complete REST APIs with CRUD operations for each model in the schema.
 *
 * **Synthesis Pipeline:**
 * 1. Create API Management service instance
 * 2. Create API within APIM
 * 3. Generate CRUD operations for each model
 * 4. Return ApiResources with all generated constructs
 *
 * **Resource Naming:**
 * Uses ResourceNamingUtility to generate Azure-compliant names following
 * organizational conventions (e.g., "apim-{org}-{project}-{env}-{geo}-{instance}").
 *
 * **Operation Generation:**
 * For each CRUD model, generates 5 REST operations:
 * - List (GET /models)
 * - Create (POST /models)
 * - Get (GET /models/{id})
 * - Update (PUT /models/{id})
 * - Delete (DELETE /models/{id})
 *
 * @example
 * ```typescript
 * const synthesizer = new ApiSynthesizer();
 * const resources = await synthesizer.synthesize(context, stack);
 *
 * // Access APIM service
 * console.log(resources.apim.serviceName); // "apim-dm-myapp-dev-eus-01"
 *
 * // Access generated operations
 * console.log(resources.operations.length); // 5 per CRUD model
 * console.log(resources.operations[0].operationId); // "listUsers"
 * console.log(resources.operations[0].path); // "/users"
 * ```
 */
export class ApiSynthesizer implements IApiSynthesizer {
  private readonly namingUtility: ResourceNamingUtility;
  private readonly introspector: SchemaIntrospector;

  /**
   * Creates a new ApiSynthesizer instance.
   *
   * @example
   * ```typescript
   * const synthesizer = new ApiSynthesizer();
   * ```
   */
  constructor() {
    this.namingUtility = new ResourceNamingUtility();
    this.introspector = new SchemaIntrospector();
  }

  /**
   * Synthesize API Management resources from backend schema
   *
   * @param context - Synthesis context containing backend configuration
   * @param stack - Resource group stack for CDK construct placement
   * @param dataResources - Backend data resources (optional)
   * @returns Promise resolving to generated API resources
   *
   * @remarks
   * Creates complete API Management infrastructure including:
   * 1. API Management service with Consumption tier (default)
   * 2. Backend API within the service
   * 3. CRUD operations for each model
   *
   * The synthesizer uses the backend schema to discover CRUD models and
   * automatically generates REST operations following RESTful conventions.
   */
  async synthesize(
    context: SynthesisContext,
    stack: ResourceGroupStack,
    dataResources?: BackendDataResources
  ): Promise<ApiResources> {
    // ========================================================================
    // Phase 1: Create API Management Service
    // ========================================================================

    const apimService = this.createApimService(context, stack);

    // ========================================================================
    // Phase 2: Create API within APIM
    // ========================================================================

    const api = this.createApi(context, stack, apimService);

    // ========================================================================
    // Phase 3: Generate CRUD Operations
    // ========================================================================

    const operations = this.generateCrudOperations(context);

    // ========================================================================
    // Phase 4: Return Complete API Resources
    // ========================================================================

    return {
      apim: apimService,
      api,
      operations,
    };
  }

  /**
   * Create API Management service instance
   *
   * @param context - Synthesis context
   * @param stack - Resource group stack
   * @returns API Management service construct
   *
   * @remarks
   * Creates an Azure API Management service with:
   * - Auto-generated name following naming conventions
   * - Consumption tier (serverless, pay-per-use)
   * - Publisher info from backend settings
   * - System-assigned managed identity enabled
   * - HTTPS-only protocols
   *
   * @example
   * Generated name format: "apim-{org}-{project}-{env}-{geo}-{instance}"
   * Example: "apim-digitalminion-myapp-dev-eus-01"
   */
  private createApimService(
    context: SynthesisContext,
    stack: ResourceGroupStack
  ): IService {
    // Generate API Management service name using naming utility
    const serviceName = this.namingUtility.generateApiManagementName(context);

    // Extract publisher information from backend settings
    const publisherName =
      context.backend.settings.organization || context.naming.organization;
    const publisherEmail = `noreply@${context.naming.organization}.com`;

    // Create API Management service using L2 construct
    const apimService = new Service(stack, 'ApiManagement', {
      serviceName,
      publisherName,
      publisherEmail,
      sku: ApiManagementSkuName.CONSUMPTION,
      capacity: 0, // Consumption tier doesn't use capacity
      enableSystemIdentity: true,
      location: context.region,
      tags: context.tags,
    });

    return apimService;
  }

  /**
   * Create API within API Management service
   *
   * @param context - Synthesis context
   * @param stack - Resource group stack
   * @param apimService - Parent API Management service
   * @returns API construct
   *
   * @remarks
   * Creates a logical API grouping within APIM that contains all CRUD operations.
   * The API path is based on the backend name (e.g., "myapp" → "/api/myapp").
   *
   * **Configuration:**
   * - Display name: "{Backend Name} API"
   * - Path: "api/{backend-name}"
   * - Protocols: HTTPS only
   * - Subscription required: true (default APIM security)
   *
   * @example
   * For backend named "myapp":
   * - Display name: "MyApp API"
   * - Path: "api/myapp"
   * - Full URL: "https://{apim-gateway}/api/myapp/users"
   */
  private createApi(
    context: SynthesisContext,
    stack: ResourceGroupStack,
    apimService: IService
  ): IServiceApi {
    // Generate API configuration
    const apiName = `${context.backend.settings.name}-api`;
    const displayName = `${this.capitalize(context.backend.settings.name)} API`;
    const apiPath = `api/${context.backend.settings.name}`;

    // Create API within APIM using L2 construct
    const api = new ApiManagementApi(stack, 'BackendApi', {
      apiManagementService: apimService,
      apiName,
      displayName,
      description: `Backend API for ${context.backend.settings.name}`,
      serviceUrl: `https://${context.backend.settings.name}.azurewebsites.net`,
      path: apiPath,
      protocols: [ApiProtocol.HTTPS],
      subscriptionRequired: true,
    });

    return api;
  }

  /**
   * Generate CRUD operations for all models in schema
   *
   * @param context - Synthesis context
   * @returns Array of CRUD operations
   *
   * @remarks
   * Analyzes the backend schema to discover CRUD models and generates
   * 5 REST operations for each model:
   *
   * 1. **List** - GET /{models} - Retrieve all resources
   * 2. **Create** - POST /{models} - Create new resource
   * 3. **Get** - GET /{models}/{id} - Retrieve specific resource
   * 4. **Update** - PUT /{models}/{id} - Update existing resource
   * 5. **Delete** - DELETE /{models}/{id} - Delete resource
   *
   * Model names are automatically pluralized using the pluralize utility.
   *
   * @example
   * For a "User" model, generates:
   * - listUsers: GET /users
   * - createUser: POST /users
   * - getUser: GET /users/{id}
   * - updateUser: PUT /users/{id}
   * - deleteUser: DELETE /users/{id}
   */
  private generateCrudOperations(context: SynthesisContext): readonly ApiOperation[] {
    const operations: ApiOperation[] = [];

    // Get all CRUD models from schema
    const crudModels = this.introspector.getCrudModels(context.backend.schema);

    // Generate 5 operations for each CRUD model
    for (const modelInfo of crudModels) {
      const modelName = modelInfo.name;
      const pluralName = pluralize(modelName);
      const resourcePath = `/${pluralName.toLowerCase()}`;

      // 1. List operation - GET /{models}
      operations.push({
        operationId: `list${pluralName}`,
        displayName: `List ${pluralName}`,
        method: 'GET',
        path: resourcePath,
        description: `Retrieve all ${pluralName.toLowerCase()}`,
      });

      // 2. Create operation - POST /{models}
      operations.push({
        operationId: `create${modelName}`,
        displayName: `Create ${modelName}`,
        method: 'POST',
        path: resourcePath,
        description: `Create a new ${modelName.toLowerCase()}`,
      });

      // 3. Get operation - GET /{models}/{id}
      operations.push({
        operationId: `get${modelName}`,
        displayName: `Get ${modelName}`,
        method: 'GET',
        path: `${resourcePath}/{id}`,
        description: `Retrieve a specific ${modelName.toLowerCase()} by ID`,
      });

      // 4. Update operation - PUT /{models}/{id}
      operations.push({
        operationId: `update${modelName}`,
        displayName: `Update ${modelName}`,
        method: 'PUT',
        path: `${resourcePath}/{id}`,
        description: `Update an existing ${modelName.toLowerCase()}`,
      });

      // 5. Delete operation - DELETE /{models}/{id}
      operations.push({
        operationId: `delete${modelName}`,
        displayName: `Delete ${modelName}`,
        method: 'DELETE',
        path: `${resourcePath}/{id}`,
        description: `Delete a ${modelName.toLowerCase()}`,
      });
    }

    return operations;
  }

  /**
   * Capitalize first letter of string
   *
   * @param str - String to capitalize
   * @returns Capitalized string
   *
   * @example
   * ```typescript
   * capitalize('myapp') // 'Myapp'
   * capitalize('MyApp') // 'MyApp'
   * ```
   */
  private capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
