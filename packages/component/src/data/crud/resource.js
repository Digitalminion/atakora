"use strict";
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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrudResource = void 0;
var cdk_1 = require("@atakora/cdk");
var crud_1 = require("../../crud");
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
var CrudResource = /** @class */ (function (_super) {
    __extends(CrudResource, _super);
    function CrudResource(scope, id, props) {
        var _this = _super.call(this, scope, id) || this;
        // Wrap CrudApi component
        _this.crudApi = new crud_1.CrudApi(_this, 'CrudApi', props);
        return _this;
    }
    Object.defineProperty(CrudResource.prototype, "database", {
        /**
         * Cosmos DB account
         */
        get: function () {
            return this.crudApi.database;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CrudResource.prototype, "functionsApp", {
        /**
         * Functions App hosting the CRUD operations
         */
        get: function () {
            return this.crudApi.functionsApp;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CrudResource.prototype, "databaseName", {
        /**
         * Database name
         */
        get: function () {
            return this.crudApi.databaseName;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CrudResource.prototype, "containerName", {
        /**
         * Container name
         */
        get: function () {
            return this.crudApi.containerName;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CrudResource.prototype, "entityName", {
        /**
         * Entity name (singular)
         */
        get: function () {
            return this.crudApi.entityName;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CrudResource.prototype, "entityNamePlural", {
        /**
         * Entity name (plural)
         */
        get: function () {
            return this.crudApi.entityNamePlural;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CrudResource.prototype, "partitionKey", {
        /**
         * Partition key path
         */
        get: function () {
            return this.crudApi.partitionKey;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CrudResource.prototype, "operations", {
        /**
         * Generated CRUD operations metadata
         */
        get: function () {
            return this.crudApi.operations;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CrudResource.prototype, "generatedFunctions", {
        /**
         * Generated function code for deployment
         */
        get: function () {
            return this.crudApi.generatedFunctions;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(CrudResource.prototype, "apiEndpoint", {
        /**
         * API endpoint URL
         */
        get: function () {
            return this.crudApi.apiEndpoint;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Get operation by name
     *
     * @param operation - Operation name (create, read, update, delete, list)
     * @returns Operation metadata
     */
    CrudResource.prototype.getOperation = function (operation) {
        return this.operations.find(function (op) { return op.operation === operation; });
    };
    /**
     * Get function code for deployment
     *
     * @remarks
     * Returns the generated function code that can be deployed to Azure Functions.
     * Each function is self-contained with all dependencies bundled.
     *
     * @returns Object mapping operation names to function code
     */
    CrudResource.prototype.getFunctionCode = function () {
        return this.generatedFunctions.functions;
    };
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
    CrudResource.prototype.getDeploymentManifest = function () {
        return {
            entityName: this.entityName,
            databaseName: this.databaseName,
            containerName: this.containerName,
            partitionKey: this.partitionKey,
            operations: this.operations.map(function (op) { return ({
                operation: op.operation,
                functionName: op.functionName,
                httpMethod: op.httpMethod,
                pathPattern: op.pathPattern,
            }); }),
            environmentVariables: this.generatedFunctions.environmentVariables,
        };
    };
    return CrudResource;
}(cdk_1.Construct));
exports.CrudResource = CrudResource;
