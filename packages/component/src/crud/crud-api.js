"use strict";
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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrudApi = void 0;
var cdk_1 = require("@atakora/cdk");
var documentdb_1 = require("@atakora/cdk/documentdb");
var functions_1 = require("../functions");
var functions_2 = require("../functions");
var function_generator_1 = require("./function-generator");
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
var CrudApi = /** @class */ (function (_super) {
    __extends(CrudApi, _super);
    function CrudApi(scope, id, props) {
        var _a, _b, _c, _d, _e, _f;
        var _this = _super.call(this, scope, id) || this;
        _this.entityName = props.entityName;
        _this.entityNamePlural = (_a = props.entityNamePlural) !== null && _a !== void 0 ? _a : "".concat(props.entityName, "s");
        _this.partitionKey = (_b = props.partitionKey) !== null && _b !== void 0 ? _b : '/id';
        // Generate resource names
        var entityKebab = _this.toKebabCase(_this.entityName);
        var entityPluralKebab = _this.toKebabCase(_this.entityNamePlural);
        _this.databaseName = (_c = props.databaseName) !== null && _c !== void 0 ? _c : "".concat(entityKebab, "-db");
        _this.containerName = (_d = props.containerName) !== null && _d !== void 0 ? _d : entityPluralKebab;
        // Create or use existing Cosmos DB account
        _this.database = (_e = props.cosmosAccount) !== null && _e !== void 0 ? _e : new documentdb_1.DatabaseAccounts(_this, 'Database', {
            location: props.location,
            enableServerless: true,
            publicNetworkAccess: documentdb_1.PublicNetworkAccess.DISABLED,
            tags: props.tags,
        });
        // Create or use existing Functions App
        _this.functionsApp = (_f = props.functionsApp) !== null && _f !== void 0 ? _f : new functions_1.FunctionsApp(_this, 'Functions', {
            runtime: functions_2.FunctionRuntime.NODE,
            runtimeVersion: '20',
            location: props.location,
            tags: props.tags,
        });
        // Generate function code from templates
        _this.generatedFunctions = (0, function_generator_1.generateCrudFunctions)({
            entityName: _this.entityName,
            entityNamePlural: _this.entityNamePlural,
            databaseName: _this.databaseName,
            containerName: _this.containerName,
            schema: props.schema,
            partitionKey: _this.partitionKey,
        });
        // Add Cosmos DB environment variables to functions app
        _this.functionsApp.addEnvironmentVariables(__assign({ COSMOS_ENDPOINT: _this.database.documentEndpoint }, _this.generatedFunctions.environmentVariables));
        // Grant function app write access to Cosmos DB
        // This allows all CRUD operations (create, read, update, delete, list)
        _this.database.grantDataWrite(_this.functionsApp.functionApp);
        // TODO: Create Cosmos DB database and container
        // This requires SqlDatabases and SqlContainers constructs
        // const database = new SqlDatabases(this.database, 'Database', {
        //   name: this.databaseName
        // });
        //
        // const container = new SqlContainers(database, 'Container', {
        //   name: this.containerName,
        //   partitionKey: {
        //     paths: [props.partitionKey ?? '/id'],
        //     kind: 'Hash'
        //   }
        // });
        // Define CRUD operations metadata
        // Note: The actual functions will be deployed to functionsApp.functionApp
        // TODO: Create individual Azure Function definitions for each operation
        var operations = [
            {
                operation: 'create',
                functionApp: _this.functionsApp.functionApp,
                functionName: "create-".concat(entityKebab),
                httpMethod: 'POST',
                pathPattern: "/".concat(entityPluralKebab),
            },
            {
                operation: 'read',
                functionApp: _this.functionsApp.functionApp,
                functionName: "read-".concat(entityKebab),
                httpMethod: 'GET',
                pathPattern: "/".concat(entityPluralKebab, "/{id}"),
            },
            {
                operation: 'update',
                functionApp: _this.functionsApp.functionApp,
                functionName: "update-".concat(entityKebab),
                httpMethod: 'PUT',
                pathPattern: "/".concat(entityPluralKebab, "/{id}"),
            },
            {
                operation: 'delete',
                functionApp: _this.functionsApp.functionApp,
                functionName: "delete-".concat(entityKebab),
                httpMethod: 'DELETE',
                pathPattern: "/".concat(entityPluralKebab, "/{id}"),
            },
            {
                operation: 'list',
                functionApp: _this.functionsApp.functionApp,
                functionName: "list-".concat(entityPluralKebab),
                httpMethod: 'GET',
                pathPattern: "/".concat(entityPluralKebab),
            },
        ];
        _this.operations = operations;
        return _this;
        // TODO: Grant Cosmos DB RBAC permissions to function apps
        // Each function needs appropriate permissions (read/write)
        // createFunction: write permission
        // readFunction: read permission
        // updateFunction: write permission
        // deleteFunction: write permission
        // listFunction: read permission
        // TODO: Configure API Management (if enabled)
        // if (props.enableApiManagement) {
        //   const apim = new ApiManagementService(this, 'APIM', {
        //     location: props.location,
        //     identity: { type: ManagedServiceIdentityType.SYSTEM_ASSIGNED },
        //     tags: props.tags
        //   });
        //
        //   // Grant APIM permission to invoke functions
        //   operations.forEach(op => op.functionApp.grantInvoke(apim));
        //
        //   // Configure REST API operations
        //   // ... REST API configuration
        // }
        // TODO: Configure Application Insights (if enabled)
        // if (props.enableMonitoring !== false) {
        //   const insights = new Components(this, 'Insights', {
        //     location: props.location,
        //     applicationType: 'web',
        //     tags: props.tags
        //   });
        //
        //   // Link function apps to App Insights
        //   // ... monitoring configuration
        // }
    }
    Object.defineProperty(CrudApi.prototype, "apiEndpoint", {
        /**
         * API endpoint (once API Management is implemented)
         */
        get: function () {
            // TODO: Return APIM endpoint once implemented
            return "https://api.example.com/".concat(this.containerName);
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Convert string to kebab-case
     */
    CrudApi.prototype.toKebabCase = function (str) {
        return str
            .replace(/([a-z])([A-Z])/g, '$1-$2')
            .replace(/[\s_]+/g, '-')
            .toLowerCase();
    };
    return CrudApi;
}(cdk_1.Construct));
exports.CrudApi = CrudApi;
