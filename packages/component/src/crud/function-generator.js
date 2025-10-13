"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateCrudFunctions = generateCrudFunctions;
exports.generateDeploymentManifest = generateDeploymentManifest;
var functions_1 = require("./functions");
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
function generateCrudFunctions(config) {
    var entityName = config.entityName, entityNamePlural = config.entityNamePlural, databaseName = config.databaseName, containerName = config.containerName, schema = config.schema, partitionKey = config.partitionKey;
    var entityKebab = toKebabCase(entityName);
    var entityNameLower = entityName.toLowerCase();
    var entityPluralKebab = toKebabCase(entityNamePlural);
    var entityNamePluralLower = entityNamePlural.toLowerCase();
    var partitionKeyField = partitionKey.startsWith('/') ? partitionKey.slice(1) : partitionKey;
    var schemaJson = JSON.stringify(schema);
    var functions = [
        {
            operation: 'create',
            functionName: "create-".concat(entityKebab),
            fileName: "create-".concat(entityKebab, "/index.js"),
            code: (0, functions_1.generatecreate)({
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
            functionName: "read-".concat(entityKebab),
            fileName: "read-".concat(entityKebab, "/index.js"),
            code: (0, functions_1.generateread)({
                entity_name: entityName,
                entity_name_lower: entityNameLower,
                database_name: databaseName,
                container_name: containerName,
            }),
        },
        {
            operation: 'update',
            functionName: "update-".concat(entityKebab),
            fileName: "update-".concat(entityKebab, "/index.js"),
            code: (0, functions_1.generateupdate)({
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
            functionName: "delete-".concat(entityKebab),
            fileName: "delete-".concat(entityKebab, "/index.js"),
            code: (0, functions_1.generatedelete)({
                entity_name: entityName,
                entity_name_lower: entityNameLower,
                database_name: databaseName,
                container_name: containerName,
            }),
        },
        {
            operation: 'list',
            functionName: "list-".concat(entityPluralKebab),
            fileName: "list-".concat(entityPluralKebab, "/index.js"),
            code: (0, functions_1.generatelist)({
                entity_name_plural: entityNamePlural,
                entity_name_plural_lower: entityNamePluralLower,
                database_name: databaseName,
                container_name: containerName,
            }),
        },
    ];
    return {
        packageJson: generatePackageJson(),
        functions: functions,
        environmentVariables: {
            COSMOS_ENDPOINT: '${cosmosEndpoint}', // Will be replaced during deployment
            AZURE_CLIENT_ID: '${managedIdentityClientId}', // Will be replaced during deployment
            FUNCTIONS_WORKER_RUNTIME: 'node',
            AzureWebJobsStorage: '${storageConnectionString}', // Will be replaced during deployment
        },
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
function generatePackageJson() {
    return JSON.stringify({
        name: 'crud-functions',
        version: '1.0.0',
        description: 'Auto-generated CRUD functions for Azure Functions',
        main: 'index.js',
        // No dependencies - everything is bundled!
        dependencies: {},
    }, null, 2);
}
/**
 * Converts string to kebab-case
 */
function toKebabCase(str) {
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
function generateDeploymentManifest(config) {
    var generated = generateCrudFunctions(config);
    var files = __spreadArray([
        {
            path: 'package.json',
            content: generated.packageJson,
        }
    ], generated.functions.map(function (fn) { return ({
        path: fn.fileName,
        content: fn.code,
    }); }), true);
    return { files: files };
}
