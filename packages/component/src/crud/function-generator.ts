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
import {
  generatecreate,
  generateread,
  generateupdate,
  generatedelete,
  generatelist,
} from './functions';

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

  /**
   * Application Insights connection string (optional)
   */
  readonly applicationInsightsConnectionString?: string;
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
export function generateCrudFunctions(config: FunctionGeneratorConfig): GeneratedFunctionApp {
  const {
    entityName,
    entityNamePlural,
    databaseName,
    containerName,
    schema,
    partitionKey,
  } = config;

  const entityKebab = toKebabCase(entityName);
  const entityNameLower = entityName.toLowerCase();
  const entityPluralKebab = toKebabCase(entityNamePlural);
  const entityNamePluralLower = entityNamePlural.toLowerCase();
  const partitionKeyField = partitionKey.startsWith('/') ? partitionKey.slice(1) : partitionKey;
  const schemaJson = JSON.stringify(schema);

  const functions: GeneratedFunction[] = [
    {
      operation: 'create',
      functionName: `create-${entityKebab}`,
      fileName: `create-${entityKebab}/index.js`,
      code: generatecreate({
        entity_name: entityName,
        entity_name_lower: entityNameLower,
        database_name: databaseName,
        container_name: containerName,
        partition_key: partitionKeyField,
        schema_json: schemaJson,
        schemaJson: schemaJson,
      }),
    },
    {
      operation: 'read',
      functionName: `read-${entityKebab}`,
      fileName: `read-${entityKebab}/index.js`,
      code: generateread({
        entity_name: entityName,
        entity_name_lower: entityNameLower,
        database_name: databaseName,
        container_name: containerName,
      }),
    },
    {
      operation: 'update',
      functionName: `update-${entityKebab}`,
      fileName: `update-${entityKebab}/index.js`,
      code: generateupdate({
        entity_name: entityName,
        entity_name_lower: entityNameLower,
        database_name: databaseName,
        container_name: containerName,
        partition_key: partitionKeyField,
        schema_json: schemaJson,
        schemaJson: schemaJson,
      }),
    },
    {
      operation: 'delete',
      functionName: `delete-${entityKebab}`,
      fileName: `delete-${entityKebab}/index.js`,
      code: generatedelete({
        entity_name: entityName,
        entity_name_lower: entityNameLower,
        database_name: databaseName,
        container_name: containerName,
      }),
    },
    {
      operation: 'list',
      functionName: `list-${entityPluralKebab}`,
      fileName: `list-${entityPluralKebab}/index.js`,
      code: generatelist({
        entity_name_plural: entityNamePlural,
        entity_name_plural_lower: entityNamePluralLower,
        database_name: databaseName,
        container_name: containerName,
      }),
    },
  ];

  const envVars: Record<string, string> = {
    COSMOS_ENDPOINT: '${cosmosEndpoint}', // Will be replaced during deployment
    AZURE_CLIENT_ID: '${managedIdentityClientId}', // Will be replaced during deployment
    FUNCTIONS_WORKER_RUNTIME: 'node',
    AzureWebJobsStorage: '${storageConnectionString}', // Will be replaced during deployment
  };

  // Add Application Insights environment variables if provided
  if (config.applicationInsightsConnectionString) {
    envVars.APPLICATIONINSIGHTS_CONNECTION_STRING = config.applicationInsightsConnectionString;
    envVars.ApplicationInsightsAgent_EXTENSION_VERSION = '~3';
  }

  return {
    packageJson: generatePackageJson(),
    functions,
    environmentVariables: envVars,
  };
}

/**
 * Generates package.json for CRUD functions
 *
 * @remarks
 * No dependencies needed! All code is bundled and self-contained.
 * The only runtime requirement is @azure/functions-core which is
 * injected by the Azure Functions runtime.
 */
function generatePackageJson(): string {
  return JSON.stringify(
    {
      name: 'crud-functions',
      version: '1.0.0',
      description: 'Auto-generated CRUD functions for Azure Functions',
      main: 'index.js',
      // No dependencies - everything is bundled!
      dependencies: {},
    },
    null,
    2
  );
}

/**
 * Converts string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

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
export function generateDeploymentManifest(
  config: FunctionGeneratorConfig
): { files: Array<{ path: string; content: string }> } {
  const generated = generateCrudFunctions(config);

  const files = [
    {
      path: 'package.json',
      content: generated.packageJson,
    },
    ...generated.functions.map(fn => ({
      path: fn.fileName,
      content: fn.code,
    })),
  ];

  return { files };
}
