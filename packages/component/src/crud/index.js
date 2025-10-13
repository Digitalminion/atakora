"use strict";
/**
 * CRUD API Components
 *
 * @remarks
 * Production-ready CRUD API infrastructure pattern that automatically provisions:
 * - Cosmos DB for data storage
 * - Azure Functions for CRUD operations
 * - Managed Identity and RBAC configuration
 * - Optional API Management integration
 * - Optional Application Insights monitoring
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDeploymentManifest = exports.generateCrudFunctions = exports.CrudApi = void 0;
var crud_api_1 = require("./crud-api");
Object.defineProperty(exports, "CrudApi", { enumerable: true, get: function () { return crud_api_1.CrudApi; } });
// Export function generation utilities (for advanced users)
var function_generator_1 = require("./function-generator");
Object.defineProperty(exports, "generateCrudFunctions", { enumerable: true, get: function () { return function_generator_1.generateCrudFunctions; } });
Object.defineProperty(exports, "generateDeploymentManifest", { enumerable: true, get: function () { return function_generator_1.generateDeploymentManifest; } });
