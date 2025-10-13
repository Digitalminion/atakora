/**
 * CRUD Resource - Data-oriented wrapper for CrudApi
 *
 * @remarks
 * This is a thin wrapper around the CrudApi component that fits into the
 * data architecture pattern. It provides the same functionality but with
 * naming and structure consistent with other data resources.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { CrudApi } from '../../crud';
import type { CrudApiProps } from '../../crud';

/**
 * CRUD Resource configuration
 *
 * @remarks
 * Extends CrudApiProps with no additional properties.
 * This type alias provides consistent naming within the data module.
 */
export type CrudResourceProps = CrudApiProps;

/**
 * CRUD Resource - Data infrastructure for entity CRUD operations
 *
 * @remarks
 * Creates a complete CRUD API for a single entity type including:
 * - Cosmos DB database and container
 * - Azure Functions for each operation (create, read, update, delete, list)
 * - RBAC permissions and managed identities
 * - Generated function code ready for deployment
 *
 * This is a data-focused wrapper around the CrudApi component.
 *
 * @example
 * **Simple entity with auto-generated infrastructure:**
 * ```typescript
 * import { CrudResource } from '@atakora/component/data/crud';
 * import { ResourceGroupStack } from '@atakora/cdk';
 *
 * const stack = new ResourceGroupStack(app, 'MyStack', {
 *   resourceGroupName: 'rg-myapp-prod',
 *   location: 'eastus'
 * });
 *
 * const userResource = new CrudResource(stack, 'UserData', {
 *   entityName: 'User',
 *   schema: {
 *     id: 'string',
 *     name: { type: 'string', required: true },
 *     email: { type: 'string', format: 'email', required: true },
 *     role: { type: 'string', validation: { enum: ['admin', 'user'] } },
 *     createdAt: 'timestamp'
 *   },
 *   partitionKey: '/id'
 * });
 *
 * // Access resources
 * console.log(userResource.database.resourceId);
 * console.log(userResource.containerName);
 * console.log(userResource.apiEndpoint);
 * ```
 *
 * @example
 * **Multiple entities sharing infrastructure:**
 * ```typescript
 * import { CrudResource } from '@atakora/component/data/crud';
 * import { DatabaseAccounts } from '@atakora/cdk/documentdb';
 * import { FunctionsApp, FunctionRuntime } from '@atakora/component/functions';
 *
 * // Shared Cosmos DB account
 * const cosmosDb = new DatabaseAccounts(stack, 'SharedDB', {
 *   enableServerless: true,
 *   location: 'eastus'
 * });
 *
 * // Shared Functions App
 * const functionsApp = new FunctionsApp(stack, 'SharedFunctions', {
 *   runtime: FunctionRuntime.NODE,
 *   runtimeVersion: '20'
 * });
 *
 * // User CRUD
 * const userResource = new CrudResource(stack, 'UserData', {
 *   entityName: 'User',
 *   schema: {
 *     id: 'string',
 *     name: { type: 'string', required: true },
 *     email: { type: 'string', required: true }
 *   },
 *   cosmosAccount: cosmosDb,
 *   functionsApp: functionsApp,
 *   databaseName: 'app-db',
 *   partitionKey: '/id'
 * });
 *
 * // Post CRUD (same database, same function app)
 * const postResource = new CrudResource(stack, 'PostData', {
 *   entityName: 'Post',
 *   schema: {
 *     id: 'string',
 *     userId: { type: 'string', required: true },
 *     title: { type: 'string', required: true },
 *     content: 'string',
 *     publishedAt: 'timestamp'
 *   },
 *   cosmosAccount: cosmosDb,
 *   functionsApp: functionsApp,
 *   databaseName: 'app-db',
 *   partitionKey: '/userId'
 * });
 * ```
 *
 * @example
 * **Complex schema with validation:**
 * ```typescript
 * const productResource = new CrudResource(stack, 'ProductData', {
 *   entityName: 'Product',
 *   entityNamePlural: 'Products',
 *   schema: {
 *     id: 'string',
 *     sku: {
 *       type: 'string',
 *       required: true,
 *       validation: {
 *         pattern: '^[A-Z]{3}-\\d{6}$',
 *         minLength: 10,
 *         maxLength: 10
 *       },
 *       description: 'Product SKU in format ABC-123456'
 *     },
 *     name: {
 *       type: 'string',
 *       required: true,
 *       validation: {
 *         minLength: 3,
 *         maxLength: 100
 *       }
 *     },
 *     price: {
 *       type: 'number',
 *       required: true,
 *       validation: {
 *         min: 0,
 *         max: 999999.99
 *       }
 *     },
 *     category: {
 *       type: 'string',
 *       required: true,
 *       validation: {
 *         enum: ['electronics', 'clothing', 'food', 'books', 'toys']
 *       }
 *     },
 *     inStock: { type: 'boolean', required: true },
 *     metadata: { type: 'object' },
 *     tags: { type: 'array' },
 *     createdAt: 'timestamp',
 *     updatedAt: 'timestamp'
 *   },
 *   partitionKey: '/category',
 *   tags: {
 *     environment: 'production',
 *     application: 'e-commerce'
 *   }
 * });
 * ```
 */
export class CrudResource extends Construct {
  /**
   * Underlying CrudApi component
   */
  public readonly crudApi: CrudApi;

  /**
   * Cosmos DB account
   */
  public get database() {
    return this.crudApi.database;
  }

  /**
   * Functions App hosting the CRUD operations
   */
  public get functionsApp() {
    return this.crudApi.functionsApp;
  }

  /**
   * Database name
   */
  public get databaseName() {
    return this.crudApi.databaseName;
  }

  /**
   * Container name
   */
  public get containerName() {
    return this.crudApi.containerName;
  }

  /**
   * Entity name (singular)
   */
  public get entityName() {
    return this.crudApi.entityName;
  }

  /**
   * Entity name (plural)
   */
  public get entityNamePlural() {
    return this.crudApi.entityNamePlural;
  }

  /**
   * Partition key path
   */
  public get partitionKey() {
    return this.crudApi.partitionKey;
  }

  /**
   * Generated CRUD operations metadata
   */
  public get operations() {
    return this.crudApi.operations;
  }

  /**
   * Generated function code for deployment
   */
  public get generatedFunctions() {
    return this.crudApi.generatedFunctions;
  }

  /**
   * API endpoint URL
   */
  public get apiEndpoint() {
    return this.crudApi.apiEndpoint;
  }

  constructor(scope: Construct, id: string, props: CrudResourceProps) {
    super(scope, id);

    // Wrap CrudApi component
    this.crudApi = new CrudApi(this, 'CrudApi', props);
  }

  /**
   * Get operation by name
   *
   * @param operation - Operation name (create, read, update, delete, list)
   * @returns Operation metadata
   */
  public getOperation(operation: 'create' | 'read' | 'update' | 'delete' | 'list') {
    return this.operations.find(op => op.operation === operation);
  }

  /**
   * Get function code for deployment
   *
   * @remarks
   * Returns the generated function code that can be deployed to Azure Functions.
   * Each function is self-contained with all dependencies bundled.
   *
   * @returns Object mapping operation names to function code
   */
  public getFunctionCode() {
    return this.generatedFunctions.functions;
  }

  /**
   * Get deployment manifest
   *
   * @remarks
   * Returns metadata about the generated functions including:
   * - Function names
   * - HTTP triggers and routes
   * - Environment variables required
   * - Cosmos DB bindings
   *
   * @returns Deployment manifest
   */
  public getDeploymentManifest() {
    return {
      entityName: this.entityName,
      databaseName: this.databaseName,
      containerName: this.containerName,
      partitionKey: this.partitionKey,
      operations: this.operations.map(op => ({
        operation: op.operation,
        functionName: op.functionName,
        httpMethod: op.httpMethod,
        pathPattern: op.pathPattern,
      })),
      environmentVariables: this.generatedFunctions.environmentVariables,
    };
  }
}
