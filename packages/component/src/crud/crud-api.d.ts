/**
 * CRUD API Component
 *
 * @remarks
 * High-level component that creates a complete CRUD API infrastructure including:
 * - Cosmos DB database and container
 * - Azure Functions for each CRUD operation
 * - RBAC permissions and managed identities
 * - Optional API Management integration
 * - Optional Application Insights monitoring
 *
 * @packageDocumentation
 */
import { Construct } from '@atakora/cdk';
import { DatabaseAccounts } from '@atakora/cdk/documentdb';
import type { CrudApiProps, CrudOperation } from './types';
import { FunctionsApp } from '../functions';
import { type GeneratedFunctionApp } from './function-generator';
/**
 * CRUD API Component
 *
 * @example
 * ```typescript
 * import { CrudApi } from '@atakora/component/crud';
 * import { ResourceGroupStack } from '@atakora/cdk';
 *
 * const stack = new ResourceGroupStack(app, 'MyStack', {
 *   resourceGroupName: 'rg-myapp-prod',
 *   location: 'eastus'
 * });
 *
 * const userApi = new CrudApi(stack, 'UserApi', {
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
 * // Access generated resources
 * console.log(userApi.database.resourceId);
 * console.log(userApi.apiEndpoint);
 * console.log(userApi.operations);
 * ```
 */
export declare class CrudApi extends Construct {
    /**
     * Cosmos DB account
     */
    readonly database: DatabaseAccounts;
    /**
     * Functions App (hosting for Azure Functions)
     */
    readonly functionsApp: FunctionsApp;
    /**
     * Database name
     */
    readonly databaseName: string;
    /**
     * Container name
     */
    readonly containerName: string;
    /**
     * Entity name (singular)
     */
    readonly entityName: string;
    /**
     * Entity name (plural)
     */
    readonly entityNamePlural: string;
    /**
     * Generated CRUD operations
     */
    readonly operations: ReadonlyArray<CrudOperation>;
    /**
     * Generated function code for deployment
     */
    readonly generatedFunctions: GeneratedFunctionApp;
    /**
     * Partition key path
     */
    readonly partitionKey: string;
    /**
     * API endpoint (once API Management is implemented)
     */
    get apiEndpoint(): string;
    constructor(scope: Construct, id: string, props: CrudApiProps);
    /**
     * Convert string to kebab-case
     */
    private toKebabCase;
}
//# sourceMappingURL=crud-api.d.ts.map