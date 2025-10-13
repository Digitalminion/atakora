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
export declare class CrudResource extends Construct {
    /**
     * Underlying CrudApi component
     */
    readonly crudApi: CrudApi;
    /**
     * Cosmos DB account
     */
    get database(): import("@atakora/cdk/documentdb").DatabaseAccounts;
    /**
     * Functions App hosting the CRUD operations
     */
    get functionsApp(): import("../../functions").FunctionsApp;
    /**
     * Database name
     */
    get databaseName(): string;
    /**
     * Container name
     */
    get containerName(): string;
    /**
     * Entity name (singular)
     */
    get entityName(): string;
    /**
     * Entity name (plural)
     */
    get entityNamePlural(): string;
    /**
     * Partition key path
     */
    get partitionKey(): string;
    /**
     * Generated CRUD operations metadata
     */
    get operations(): readonly import("../../crud").CrudOperation[];
    /**
     * Generated function code for deployment
     */
    get generatedFunctions(): import("../../crud").GeneratedFunctionApp;
    /**
     * API endpoint URL
     */
    get apiEndpoint(): string;
    constructor(scope: Construct, id: string, props: CrudResourceProps);
    /**
     * Get operation by name
     *
     * @param operation - Operation name (create, read, update, delete, list)
     * @returns Operation metadata
     */
    getOperation(operation: 'create' | 'read' | 'update' | 'delete' | 'list'): import("../../crud").CrudOperation;
    /**
     * Get function code for deployment
     *
     * @remarks
     * Returns the generated function code that can be deployed to Azure Functions.
     * Each function is self-contained with all dependencies bundled.
     *
     * @returns Object mapping operation names to function code
     */
    getFunctionCode(): readonly import("../../crud").GeneratedFunction[];
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
    getDeploymentManifest(): {
        entityName: string;
        databaseName: string;
        containerName: string;
        partitionKey: string;
        operations: {
            operation: "create" | "read" | "update" | "delete" | "list";
            functionName: string;
            httpMethod: "GET" | "POST" | "PUT" | "DELETE";
            pathPattern: string;
        }[];
        environmentVariables: Record<string, string>;
    };
}
//# sourceMappingURL=resource.d.ts.map