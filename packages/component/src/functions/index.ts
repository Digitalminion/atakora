/**
 * Functions App Components
 *
 * @remarks
 * High-level components for Azure Functions that bundle all required dependencies:
 * - App Service Plan
 * - Storage Account
 * - Function App
 * - Managed Identity
 * - Application Insights (optional)
 *
 * @packageDocumentation
 */

export { FunctionsApp } from './functions-app';
export type { FunctionsAppProps } from './types';
export { FunctionRuntime, FunctionAppPresets } from './types';
