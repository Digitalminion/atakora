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
import type { ArmResource } from '../types';
import { type FunctionBundleResult } from './function-bundler';
/**
 * HTTP trigger configuration
 */
export interface HttpTriggerConfig {
    /**
     * HTTP methods allowed (e.g., ['GET', 'POST'])
     */
    readonly methods?: string[];
    /**
     * Authorization level
     * - 'anonymous': No auth required
     * - 'function': Requires function key
     * - 'admin': Requires admin/host key
     */
    readonly authLevel?: 'anonymous' | 'function' | 'admin';
    /**
     * Route template (e.g., 'users/{id}')
     * If not specified, uses function name
     */
    readonly route?: string;
}
/**
 * Cosmos DB trigger configuration
 */
export interface CosmosDbTriggerConfig {
    /**
     * Cosmos DB connection string app setting name
     */
    readonly connectionStringSetting: string;
    /**
     * Database name
     */
    readonly databaseName: string;
    /**
     * Container name to monitor
     */
    readonly containerName: string;
    /**
     * Lease container name (defaults to 'leases')
     */
    readonly leaseContainerName?: string;
    /**
     * Create lease container if it doesn't exist (default: false)
     */
    readonly createLeaseContainerIfNotExists?: boolean;
    /**
     * Start from beginning of change feed (default: false)
     */
    readonly startFromBeginning?: boolean;
}
/**
 * Function configuration
 */
export interface FunctionConfig {
    /**
     * Path to the handler.ts file
     */
    readonly handlerPath: string;
    /**
     * Function name (defaults to parent directory name)
     */
    readonly functionName?: string;
    /**
     * HTTP trigger configuration (if this is an HTTP function)
     */
    readonly httpTrigger?: HttpTriggerConfig;
    /**
     * Cosmos DB trigger configuration (if this is a Cosmos DB trigger function)
     */
    readonly cosmosDbTrigger?: CosmosDbTriggerConfig;
    /**
     * Whether to minify the bundled code (default: true)
     */
    readonly minify?: boolean;
}
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
export declare class FunctionSynthesizer {
    private readonly bundler;
    constructor();
    /**
     * Synthesize a function to an ARM resource
     *
     * @param functionAppName - Name of the parent Function App
     * @param config - Function configuration
     * @returns ARM resource for Microsoft.Web/sites/functions
     */
    synthesize(functionAppName: string, config: FunctionConfig): ArmResource;
    /**
     * Synthesize multiple functions
     *
     * @param functionAppName - Name of the parent Function App
     * @param configs - Array of function configurations
     * @returns Array of ARM resources
     */
    synthesizeMany(functionAppName: string, configs: FunctionConfig[]): ArmResource[];
    /**
     * Build ARM bindings from configuration
     */
    private buildBindings;
    /**
     * Get bundle statistics for debugging
     *
     * @param config - Function configuration
     * @returns Bundle result with size and warnings
     */
    getBundleInfo(config: FunctionConfig): FunctionBundleResult;
}
//# sourceMappingURL=function-synthesizer.d.ts.map