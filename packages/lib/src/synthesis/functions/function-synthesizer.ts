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
import { FunctionBundler, type FunctionBundleResult } from './function-bundler';

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
 * ARM binding definition
 */
interface ArmBinding {
  readonly type: string;
  readonly direction: 'in' | 'out';
  readonly name: string;
  [key: string]: any;
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
export class FunctionSynthesizer {
  private readonly bundler: FunctionBundler;

  constructor() {
    this.bundler = new FunctionBundler();
  }

  /**
   * Synthesize a function to an ARM resource
   *
   * @param functionAppName - Name of the parent Function App
   * @param config - Function configuration
   * @returns ARM resource for Microsoft.Web/sites/functions
   */
  public synthesize(functionAppName: string, config: FunctionConfig): ArmResource {
    // Bundle the handler
    const bundle = this.bundler.bundle({
      handlerPath: config.handlerPath,
      minify: config.minify !== false,
    });

    // Determine function name
    const functionName = config.functionName || FunctionBundler.getFunctionName(config.handlerPath);

    // Build bindings
    const bindings = this.buildBindings(config);

    // Escape code for JSON
    const escapedCode = FunctionBundler.escapeForJson(bundle.code);

    // Create ARM resource
    return {
      type: 'Microsoft.Web/sites/functions',
      apiVersion: '2023-01-01',
      name: `[concat(parameters('functionAppName'), '/', '${functionName}')]`,
      properties: {
        config: {
          bindings,
        },
        files: {
          'index.js': escapedCode,
        },
      },
      dependsOn: [
        `[resourceId('Microsoft.Web/sites', parameters('functionAppName'))]`,
      ],
    };
  }

  /**
   * Synthesize multiple functions
   *
   * @param functionAppName - Name of the parent Function App
   * @param configs - Array of function configurations
   * @returns Array of ARM resources
   */
  public synthesizeMany(functionAppName: string, configs: FunctionConfig[]): ArmResource[] {
    return configs.map((config) => this.synthesize(functionAppName, config));
  }

  /**
   * Build ARM bindings from configuration
   */
  private buildBindings(config: FunctionConfig): ArmBinding[] {
    const bindings: ArmBinding[] = [];

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
  }

  /**
   * Get bundle statistics for debugging
   *
   * @param config - Function configuration
   * @returns Bundle result with size and warnings
   */
  public getBundleInfo(config: FunctionConfig): FunctionBundleResult {
    return this.bundler.bundle({
      handlerPath: config.handlerPath,
      minify: config.minify !== false,
    });
  }
}
