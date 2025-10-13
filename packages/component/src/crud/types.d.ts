/**
 * Type definitions for CRUD API components
 *
 * @packageDocumentation
 */
import type { DatabaseAccounts } from '@atakora/cdk/documentdb';
import type { FunctionApp } from '@atakora/cdk/functions';
import type { FunctionsApp } from '../functions';
/**
 * Schema field definition for CRUD entities
 */
export interface CrudFieldSchema {
    /**
     * Field type (string, number, boolean, object, array)
     */
    readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'timestamp';
    /**
     * Whether this field is required
     */
    readonly required?: boolean;
    /**
     * Format hint for string types (e.g., 'email', 'uri', 'date-time')
     */
    readonly format?: string;
    /**
     * Description of the field
     */
    readonly description?: string;
    /**
     * Validation rules
     */
    readonly validation?: {
        readonly minLength?: number;
        readonly maxLength?: number;
        readonly min?: number;
        readonly max?: number;
        readonly pattern?: string;
        readonly enum?: readonly string[];
    };
}
/**
 * Entity schema definition
 */
export interface CrudSchema {
    readonly [fieldName: string]: CrudFieldSchema | 'string' | 'number' | 'boolean' | 'timestamp';
}
/**
 * Configuration options for CRUD API component
 */
export interface CrudApiProps {
    /**
     * Name of the entity (singular, e.g., 'User', 'Product')
     * Used for naming resources and generating code
     */
    readonly entityName: string;
    /**
     * Plural form of entity name (defaults to entityName + 's')
     */
    readonly entityNamePlural?: string;
    /**
     * Schema definition for the entity
     */
    readonly schema: CrudSchema;
    /**
     * Partition key path for Cosmos DB (e.g., '/id', '/userId')
     * @default '/id'
     */
    readonly partitionKey?: string;
    /**
     * Use an existing Cosmos DB account instead of creating a new one
     */
    readonly cosmosAccount?: DatabaseAccounts;
    /**
     * Use an existing FunctionsApp for hosting the CRUD operations
     * If not provided, a new one will be created with consumption plan
     */
    readonly functionsApp?: FunctionsApp;
    /**
     * Database name
     * @default Generated based on entity name
     */
    readonly databaseName?: string;
    /**
     * Container name
     * @default Generated based on entity name (plural)
     */
    readonly containerName?: string;
    /**
     * Azure region for resources
     * @default Inherited from parent stack
     */
    readonly location?: string;
    /**
     * Enable API Management integration
     * @default false (coming soon)
     */
    readonly enableApiManagement?: boolean;
    /**
     * Enable Application Insights monitoring
     * @default true
     */
    readonly enableMonitoring?: boolean;
    /**
     * Custom tags for resources
     */
    readonly tags?: Record<string, string>;
}
/**
 * Generated CRUD operation function
 */
export interface CrudOperation {
    /**
     * Operation name (create, read, update, delete, list)
     */
    readonly operation: 'create' | 'read' | 'update' | 'delete' | 'list';
    /**
     * Azure Function App for this operation
     */
    readonly functionApp: FunctionApp;
    /**
     * Function name
     */
    readonly functionName: string;
    /**
     * HTTP method
     */
    readonly httpMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
    /**
     * URL path pattern
     */
    readonly pathPattern: string;
}
//# sourceMappingURL=types.d.ts.map