/**
 * Type definitions for Functions App components
 *
 * @packageDocumentation
 */

import type { FunctionApp } from '@atakora/cdk/functions';
import type { ServerFarms } from '@atakora/cdk/web';
import type { StorageAccounts } from '@atakora/cdk/storage';

/**
 * Function runtime environment
 */
export enum FunctionRuntime {
  NODE = 'node',
  PYTHON = 'python',
  DOTNET = 'dotnet',
  JAVA = 'java',
  POWERSHELL = 'powershell',
}

/**
 * App Service Plan tier configuration
 */
export interface PlanTier {
  /**
   * SKU name
   * - Y1: Consumption (serverless, pay-per-execution)
   * - EP1/EP2/EP3: Elastic Premium (pre-warmed instances)
   * - P1V2/P2V2/P3V2: Premium V2 (dedicated instances)
   */
  readonly name: 'Y1' | 'EP1' | 'EP2' | 'EP3' | 'P1V2' | 'P2V2' | 'P3V2';

  /**
   * Tier name
   */
  readonly tier: 'Dynamic' | 'ElasticPremium' | 'PremiumV2';
}

/**
 * Configuration options for FunctionsApp component
 */
export interface FunctionsAppProps {
  /**
   * Name for the functions app (used for naming resources)
   * @default Derived from construct ID
   */
  readonly name?: string;

  /**
   * Function runtime (Node.js, Python, .NET, etc.)
   * @default FunctionRuntime.NODE
   */
  readonly runtime?: FunctionRuntime;

  /**
   * Runtime version
   * - Node: '18', '20'
   * - Python: '3.9', '3.10', '3.11'
   * - .NET: '6.0', '7.0', '8.0'
   * @default '18' (for Node.js)
   */
  readonly runtimeVersion?: string;

  /**
   * App Service Plan configuration
   * @default Consumption plan (Y1/Dynamic)
   */
  readonly plan?: PlanTier;

  /**
   * Use an existing App Service Plan instead of creating new one
   */
  readonly existingPlan?: ServerFarms;

  /**
   * Global environment variables for all functions
   */
  readonly environment?: Record<string, string>;

  /**
   * Azure region for resources
   * @default Inherited from parent stack
   */
  readonly location?: string;

  /**
   * Enable system-assigned managed identity
   * @default true
   */
  readonly enableManagedIdentity?: boolean;

  /**
   * Enable Application Insights monitoring
   * @default true
   */
  readonly enableMonitoring?: boolean;

  /**
   * Enable HTTPS only
   * @default true
   */
  readonly httpsOnly?: boolean;

  /**
   * Custom tags for resources
   */
  readonly tags?: Record<string, string>;
}

/**
 * Common presets for function app configurations
 */
export const FunctionAppPresets = {
  /**
   * Serverless consumption plan (pay-per-execution)
   * - Best for: Variable workloads, event-driven processing
   * - Cost: Pay only for executions
   * - Limitations: 5-minute timeout, cold starts
   */
  CONSUMPTION: {
    plan: { name: 'Y1' as const, tier: 'Dynamic' as const },
  },

  /**
   * Elastic Premium plan (pre-warmed instances)
   * - Best for: APIs requiring low latency, longer execution times
   * - Features: No cold starts, VNet integration, unlimited execution time
   * - Cost: Per-second billing for pre-warmed instances
   */
  PREMIUM_EP1: {
    plan: { name: 'EP1' as const, tier: 'ElasticPremium' as const },
  },

  /**
   * Dedicated Premium V2 plan
   * - Best for: Production workloads requiring predictable performance
   * - Features: Dedicated compute, VNet integration
   * - Cost: Fixed monthly cost
   */
  DEDICATED_P1V2: {
    plan: { name: 'P1V2' as const, tier: 'PremiumV2' as const },
  },
} as const;
