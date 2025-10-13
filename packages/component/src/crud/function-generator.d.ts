/**
 * Function code generator for CRUD operations
 *
 * @remarks
 * Generates complete, ready-to-deploy JavaScript code for CRUD Azure Functions.
 * The generated code includes all necessary dependencies, validation logic, and
 * error handling.
 *
 * @packageDocumentation
 */
import type { CrudSchema } from './types';
/**
 * Configuration for function code generation
 */
export interface FunctionGeneratorConfig {
    /**
     * Entity name (singular, e.g., 'User', 'Product')
     */
    readonly entityName: string;
    /**
     * Entity name (plural, e.g., 'Users', 'Products')
     */
    readonly entityNamePlural: string;
    /**
     * Cosmos DB database name
     */
    readonly databaseName: string;
    /**
     * Cosmos DB container name
     */
    readonly containerName: string;
    /**
     * Entity schema definition
     */
    readonly schema: CrudSchema;
    /**
     * Partition key path (e.g., '/id', '/userId')
     */
    readonly partitionKey: string;
}
/**
 * Generated function code for a single operation
 */
export interface GeneratedFunction {
    /**
     * Operation name
     */
    readonly operation: 'create' | 'read' | 'update' | 'delete' | 'list';
    /**
     * Function name (e.g., 'create-user')
     */
    readonly functionName: string;
    /**
     * Generated JavaScript code
     */
    readonly code: string;
    /**
     * File name for the function (e.g., 'create-user/index.js')
     */
    readonly fileName: string;
}
/**
 * Complete generated function app code
 */
export interface GeneratedFunctionApp {
    /**
     * package.json content
     */
    readonly packageJson: string;
    /**
     * Generated function code for each operation
     */
    readonly functions: readonly GeneratedFunction[];
    /**
     * Environment variables required
     */
    readonly environmentVariables: Record<string, string>;
}
/**
 * Generates complete function app code for CRUD operations
 *
 * @param config - Configuration for code generation
 * @returns Generated function app with all files
 *
 * @example
 * ```typescript
 * const generated = generateCrudFunctions({
 *   entityName: 'User',
 *   entityNamePlural: 'Users',
 *   databaseName: 'users-db',
 *   containerName: 'users',
 *   schema: {
 *     id: 'string',
 *     name: { type: 'string', required: true },
 *     email: { type: 'string', format: 'email' }
 *   },
 *   partitionKey: '/id'
 * });
 *
 * // generated.packageJson contains the package.json
 * // generated.functions[0].code contains the create function code
 * // generated.environmentVariables contains required env vars
 * ```
 */
export declare function generateCrudFunctions(config: FunctionGeneratorConfig): GeneratedFunctionApp;
/**
 * Generates a deployment package (ZIP) content manifest
 *
 * @param config - Configuration for code generation
 * @returns Manifest of files to include in deployment package
 *
 * @remarks
 * This manifest can be used by the synthesis process to create a deployment
 * package (ZIP file) that can be deployed to Azure Functions.
 *
 * @example
 * ```typescript
 * const manifest = generateDeploymentManifest(config);
 *
 * // manifest.files contains:
 * // - package.json
 * // - create-user/index.js
 * // - read-user/index.js
 * // - update-user/index.js
 * // - delete-user/index.js
 * // - list-users/index.js
 * ```
 */
export declare function generateDeploymentManifest(config: FunctionGeneratorConfig): {
    files: Array<{
        path: string;
        content: string;
    }>;
};
//# sourceMappingURL=function-generator.d.ts.map