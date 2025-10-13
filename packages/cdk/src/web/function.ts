import { Construct } from '@atakora/cdk';
import {
  ArmFunctionBundler,
  FunctionSynthesizer,
  type ArmFunctionConfig,
  type HttpTriggerConfig,
  type CosmosDbTriggerConfig,
} from '@atakora/lib/synthesis/functions';
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
export class Function extends Construct {
  /**
   * Underlying ARM function resource
   */
  public readonly armFunction: ArmFunction;

  /**
   * Parent Function App
   */
  public readonly functionApp: ArmFunctionApp;

  /**
   * Path to the handler TypeScript file
   */
  public readonly handlerPath: string;

  /**
   * Function name
   */
  public readonly functionName: string;

  /**
   * Function configuration
   */
  private readonly config: ArmFunctionConfig;

  /**
   * Function synthesizer for bundling
   */
  private readonly synthesizer: FunctionSynthesizer;

  constructor(scope: Construct, id: string, props: FunctionProps) {
    super(scope, id);

    this.functionApp = props.functionApp;
    this.handlerPath = props.handlerPath;
    this.config = props;
    this.synthesizer = new FunctionSynthesizer();

    // Determine function name
    this.functionName =
      props.functionName || ArmFunctionBundler.getFunctionName(props.handlerPath);

    // Bundle the handler
    const bundleResult = this.synthesizer.getBundleInfo(this.config);

    // Validate bundle size (ARM inline code limit is 4KB)
    if (bundleResult.size > 4096) {
      throw new Error(
        `Bundled function code is too large (${bundleResult.size} bytes). ` +
          `ARM template inline code limit is 4KB. Consider:\n` +
          `  1. Moving to package deployment instead of inline\n` +
          `  2. Reducing dependencies\n` +
          `  3. Splitting into multiple functions`
      );
    }

    // Warn about bundle size
    if (bundleResult.size > 2048) {
      console.warn(
        `Warning: Function '${this.functionName}' bundle is ${bundleResult.size} bytes. ` +
          `Consider optimizing to stay under ARM limits.`
      );
    }

    // Log warnings from bundler
    if (bundleResult.warnings.length > 0) {
      console.warn(`Bundler warnings for '${this.functionName}':`);
      bundleResult.warnings.forEach((warning: string) => {
        console.warn(`  - ${warning}`);
      });
    }

    // Escape bundled code for JSON
    const escapedCode = ArmFunctionBundler.escapeForJson(bundleResult.code);

    // Build trigger configuration for ArmFunction
    const triggerConfig = this.buildTriggerConfig();

    // Create underlying ARM function with bundled code
    this.armFunction = new ArmFunction(this, 'Resource', {
      functionName: this.functionName,
      trigger: triggerConfig,
      inlineCode: escapedCode,
    });
  }

  /**
   * Build trigger configuration from high-level config
   */
  private buildTriggerConfig(): any {
    // HTTP trigger
    if (this.config.httpTrigger) {
      return {
        type: 'http',
        ...this.config.httpTrigger,
      };
    }

    // Cosmos DB trigger
    if (this.config.cosmosDbTrigger) {
      return {
        type: 'cosmosDB',
        ...this.config.cosmosDbTrigger,
      };
    }

    throw new Error('Function must have either httpTrigger or cosmosDbTrigger configured');
  }

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
  public getBundleInfo() {
    return this.synthesizer.getBundleInfo(this.config);
  }
}
