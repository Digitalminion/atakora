"use strict";
/**
 * Function Synthesizer - Converts function handlers to ARM function resources with inline code
 *
 * @remarks
 * This module synthesizes `Microsoft.Web/sites/functions` ARM resources with
 * inline bundled code from TypeScript handlers.
 *
 * **Synthesis Process**:
 * 1. Bundle handler TypeScript → minified JavaScript
 * 2. Create ARM function resource with inline code
 * 3. Configure bindings (HTTP triggers, Cosmos DB triggers, etc.)
 * 4. Set up dependencies on Function App
 *
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FunctionSynthesizer = void 0;
var function_bundler_1 = require("./function-bundler");
/**
 * Synthesizes Azure Function resources with inline code for ARM deployment
 *
 * @remarks
 * This class creates `Microsoft.Web/sites/functions` ARM resources with bundled
 * JavaScript code embedded directly in the template.
 *
 * **Supported Trigger Types**:
 * - HTTP triggers (GET, POST, etc.)
 * - Cosmos DB change feed triggers
 *
 * @example
 * Synthesize an HTTP function:
 * ```typescript
 * const synthesizer = new FunctionSynthesizer();
 * const armResource = synthesizer.synthesize(
 *   'myFunctionApp',
 *   {
 *     handlerPath: './feedback-create/handler.ts',
 *     httpTrigger: {
 *       methods: ['POST'],
 *       authLevel: 'function'
 *     }
 *   }
 * );
 * ```
 *
 * @example
 * Synthesize a Cosmos DB trigger function:
 * ```typescript
 * const armResource = synthesizer.synthesize(
 *   'myFunctionApp',
 *   {
 *     handlerPath: './on-document-change/handler.ts',
 *     cosmosDbTrigger: {
 *       connectionStringSetting: 'CosmosDbConnection',
 *       databaseName: 'mydb',
 *       containerName: 'users'
 *     }
 *   }
 * );
 * ```
 */
var FunctionSynthesizer = /** @class */ (function () {
    function FunctionSynthesizer() {
        this.bundler = new function_bundler_1.FunctionBundler();
    }
    /**
     * Synthesize a function to an ARM resource
     *
     * @param functionAppName - Name of the parent Function App
     * @param config - Function configuration
     * @returns ARM resource for Microsoft.Web/sites/functions
     */
    FunctionSynthesizer.prototype.synthesize = function (functionAppName, config) {
        // Bundle the handler
        var bundle = this.bundler.bundle({
            handlerPath: config.handlerPath,
            minify: config.minify !== false,
        });
        // Determine function name
        var functionName = config.functionName || function_bundler_1.FunctionBundler.getFunctionName(config.handlerPath);
        // Build bindings
        var bindings = this.buildBindings(config);
        // Escape code for JSON
        var escapedCode = function_bundler_1.FunctionBundler.escapeForJson(bundle.code);
        // Create ARM resource
        return {
            type: 'Microsoft.Web/sites/functions',
            apiVersion: '2023-01-01',
            name: "[concat(parameters('functionAppName'), '/', '".concat(functionName, "')]"),
            properties: {
                config: {
                    bindings: bindings,
                },
                files: {
                    'index.js': escapedCode,
                },
            },
            dependsOn: [
                "[resourceId('Microsoft.Web/sites', parameters('functionAppName'))]",
            ],
        };
    };
    /**
     * Synthesize multiple functions
     *
     * @param functionAppName - Name of the parent Function App
     * @param configs - Array of function configurations
     * @returns Array of ARM resources
     */
    FunctionSynthesizer.prototype.synthesizeMany = function (functionAppName, configs) {
        var _this = this;
        return configs.map(function (config) { return _this.synthesize(functionAppName, config); });
    };
    /**
     * Build ARM bindings from configuration
     */
    FunctionSynthesizer.prototype.buildBindings = function (config) {
        var bindings = [];
        // HTTP trigger
        if (config.httpTrigger) {
            bindings.push({
                type: 'httpTrigger',
                direction: 'in',
                name: 'req',
                authLevel: config.httpTrigger.authLevel || 'function',
                methods: config.httpTrigger.methods || ['get', 'post'],
                route: config.httpTrigger.route,
            });
            bindings.push({
                type: 'http',
                direction: 'out',
                name: 'res',
            });
        }
        // Cosmos DB trigger
        if (config.cosmosDbTrigger) {
            bindings.push({
                type: 'cosmosDBTrigger',
                direction: 'in',
                name: 'documents',
                connectionStringSetting: config.cosmosDbTrigger.connectionStringSetting,
                databaseName: config.cosmosDbTrigger.databaseName,
                collectionName: config.cosmosDbTrigger.containerName,
                leaseCollectionName: config.cosmosDbTrigger.leaseContainerName || 'leases',
                createLeaseCollectionIfNotExists: config.cosmosDbTrigger.createLeaseContainerIfNotExists || false,
                startFromBeginning: config.cosmosDbTrigger.startFromBeginning || false,
            });
        }
        return bindings;
    };
    /**
     * Get bundle statistics for debugging
     *
     * @param config - Function configuration
     * @returns Bundle result with size and warnings
     */
    FunctionSynthesizer.prototype.getBundleInfo = function (config) {
        return this.bundler.bundle({
            handlerPath: config.handlerPath,
            minify: config.minify !== false,
        });
    };
    return FunctionSynthesizer;
}());
exports.FunctionSynthesizer = FunctionSynthesizer;
