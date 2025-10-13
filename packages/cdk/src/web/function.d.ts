import { Construct } from '@atakora/cdk';
import { type HttpTriggerConfig, type CosmosDbTriggerConfig } from '@atakora/lib/synthesis/functions';
import { ArmFunction } from './function-arm';
import type { ArmFunctionApp } from './function-app-arm';
/**
 * Properties for Function construct
 */
export interface FunctionProps {
    /**
     * Parent Function App
     */
    readonly functionApp: ArmFunctionApp;
    /**
     * Path to the handler.ts file
     */
    readonly handlerPath: string;
    /**
     * Function name (defaults to parent directory name of handlerPath)
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
 * L2 construct for Azure Function with automatic handler bundling
 *
 * @remarks
 * High-level construct that automatically bundles TypeScript handlers and creates
 * Azure Function resources. This construct:
 *
 * - Bundles TypeScript handlers to minified JavaScript using esbuild
 * - Creates `Microsoft.Web/sites/functions` ARM resource with inline code
 * - Configures bindings (HTTP triggers, Cosmos DB triggers, etc.)
 * - Handles dependency management and tree-shaking
 * - Validates bundle size against ARM template limits
 *
 * **Bundling Process**:
 * 1. Uses esbuild to compile TypeScript → JavaScript
 * 2. Tree-shakes dependencies (only includes what's used)
 * 3. Minifies code for smaller ARM template size
 * 4. Bundles all dependencies into a single file
 * 5. Escapes strings for JSON embedding in ARM template
 * 6. Validates bundle size is under 4KB ARM property limit
 *
 * **Supported Trigger Types**:
 * - HTTP triggers (GET, POST, etc.)
 * - Cosmos DB change feed triggers
 * - (More triggers can be added as needed)
 *
 * @example
 * HTTP trigger function:
 * ```typescript
 * import { Function } from '@atakora/cdk/web';
 *
 * const createFunction = new Function(this, 'CreateFunction', {
 *   functionApp: functionApp,
 *   handlerPath: './src/functions/feedback-create/handler.ts',
 *   httpTrigger: {
 *     methods: ['POST'],
 *     authLevel: 'function',
 *     route: 'feedback'
 *   }
 * });
 * ```
 *
 * @example
 * Cosmos DB trigger function:
 * ```typescript
 * const onDocChange = new Function(this, 'OnDocChange', {
 *   functionApp: functionApp,
 *   handlerPath: './src/functions/on-change/handler.ts',
 *   cosmosDbTrigger: {
 *     connectionStringSetting: 'CosmosDbConnection',
 *     databaseName: 'mydb',
 *     containerName: 'users',
 *     leaseContainerName: 'leases',
 *     createLeaseContainerIfNotExists: true
 *   }
 * });
 * ```
 *
 * @example
 * Check bundle size:
 * ```typescript
 * const func = new Function(this, 'MyFunction', { ... });
 * const bundleInfo = func.getBundleInfo();
 * console.log(`Bundle size: ${bundleInfo.size} bytes`);
 * if (bundleInfo.warnings.length > 0) {
 *   console.warn('Bundle warnings:', bundleInfo.warnings);
 * }
 * ```
 */
export declare class Function extends Construct {
    /**
     * Underlying ARM function resource
     */
    readonly armFunction: ArmFunction;
    /**
     * Parent Function App
     */
    readonly functionApp: ArmFunctionApp;
    /**
     * Path to the handler TypeScript file
     */
    readonly handlerPath: string;
    /**
     * Function name
     */
    readonly functionName: string;
    /**
     * Function configuration
     */
    private readonly config;
    /**
     * Function synthesizer for bundling
     */
    private readonly synthesizer;
    constructor(scope: Construct, id: string, props: FunctionProps);
    /**
     * Build trigger configuration from high-level config
     */
    private buildTriggerConfig;
    /**
     * Get bundle information for debugging
     *
     * @returns Bundle result with code, size, and warnings
     *
     * @remarks
     * Useful for:
     * - Checking bundle size before deployment
     * - Identifying bundler warnings
     * - Debugging handler code issues
     * - Optimizing bundle size
     */
    getBundleInfo(): import("@atakora/lib/synthesis/functions").ArmFunctionBundleResult;
}
//# sourceMappingURL=function.d.ts.map