/**
 * Type definitions for Azure Function constructs.
 *
 * @packageDocumentation
 */

import type { FunctionConfig, BuildOptions } from './types';

/**
 * Properties for AzureFunction (L2 construct).
 *
 * @remarks
 * Configuration for an individual Azure Function within a Function App.
 * Follows the Amplify Gen 2 pattern with separate handler.ts and resource.ts files.
 *
 * @example
 * ```typescript
 * // Minimal usage with resource.ts
 * const myFunction = new AzureFunction(functionApp, 'MyFunction', {
 *   handler: './functions/myFunc/handler.ts',
 *   resource: './functions/myFunc/resource.ts',
 *   environment: {
 *     COSMOS_ENDPOINT: cosmosDb.endpoint
 *   }
 * });
 *
 * // Inline configuration (without resource.ts)
 * const myFunction = new AzureFunction(functionApp, 'MyFunction', {
 *   handler: './functions/myFunc/handler.ts',
 *   inlineConfig: {
 *     trigger: {
 *       type: 'http',
 *       route: 'api/users',
 *       methods: ['GET', 'POST']
 *     }
 *   }
 * });
 * ```
 */
export interface AzureFunctionProps {
  /**
   * Path to handler.ts file (required).
   *
   * @remarks
   * This file contains the runtime code for the function.
   * Must export a handler function matching the trigger type.
   *
   * @example
   * ```typescript
   * handler: './functions/api/handler.ts'
   * ```
   */
  readonly handler: string;

  /**
   * Path to resource.ts file (optional).
   *
   * @remarks
   * This file contains the function configuration using defineFunction().
   * If not provided, inlineConfig must be specified.
   *
   * @example
   * ```typescript
   * resource: './functions/api/resource.ts'
   * ```
   */
  readonly resource?: string;

  /**
   * Inline configuration (alternative to resource.ts).
   *
   * @remarks
   * Use this for simple functions or when you don't want a separate resource.ts file.
   * Cannot be used together with resource property.
   *
   * @example
   * ```typescript
   * inlineConfig: {
   *   trigger: {
   *     type: 'http',
   *     route: 'api/hello'
   *   }
   * }
   * ```
   */
  readonly inlineConfig?: FunctionConfig;

  /**
   * Function name (optional).
   *
   * @remarks
   * If not provided, will be auto-generated from the construct ID.
   *
   * @example
   * ```typescript
   * functionName: 'GetUser'
   * ```
   */
  readonly functionName?: string;

  /**
   * Environment variable overrides.
   *
   * @remarks
   * These values are merged with:
   * 1. Function App global environment variables
   * 2. resource.ts environment variables
   *
   * This allows app.ts to provide actual values for placeholders in resource.ts.
   *
   * @example
   * ```typescript
   * environment: {
   *   COSMOS_ENDPOINT: cosmosDb.endpoint,
   *   API_KEY: keyVault.secret('api-key')
   * }
   * ```
   */
  readonly environment?: Record<string, string | IResourceReference>;

  /**
   * Build options overrides.
   *
   * @remarks
   * Override build options defined in resource.ts for this specific function.
   *
   * @example
   * ```typescript
   * buildOptions: {
   *   external: ['@azure/cosmos'],
   *   minify: false,
   *   sourcemap: 'inline'
   * }
   * ```
   */
  readonly buildOptions?: BuildOptions;
}

/**
 * Interface for Azure Function reference.
 *
 * @remarks
 * Allows resources to reference a function without depending on the construct class.
 */
export interface IAzureFunction {
  /**
   * Name of the function.
   */
  readonly functionName: string;

  /**
   * Resource ID of the function.
   */
  readonly functionId: string;

  /**
   * Trigger URL (for HTTP triggers).
   *
   * @remarks
   * Only available for HTTP-triggered functions.
   */
  readonly triggerUrl?: string;

  /**
   * Function key (for secured functions).
   *
   * @remarks
   * Used for authentication when authLevel is 'function' or 'admin'.
   */
  readonly functionKey?: string;
}

/**
 * Generic resource reference interface.
 *
 * @remarks
 * Allows referencing other Azure resources in a type-safe manner.
 * Used for cross-resource dependencies (e.g., Cosmos DB, Storage Account).
 */
export interface IResourceReference {
  /**
   * Resource ID in ARM format.
   */
  readonly resourceId: string;

  /**
   * Resource type (e.g., 'Microsoft.DocumentDB/databaseAccounts').
   */
  readonly resourceType: string;

  /**
   * Resource name.
   */
  readonly resourceName: string;
}
