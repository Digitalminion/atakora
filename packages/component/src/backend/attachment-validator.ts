/**
 * Attachment Validation System
 *
 * This module provides validators for different configuration types used in
 * attachment points. Validators ensure configurations are valid before being
 * attached to the backend.
 *
 * @module @atakora/component/backend/attachment-validator
 */

import type { ConfigValidator } from './attachment-point';

/**
 * Validation error class for attachment validation failures.
 */
export class AttachmentValidationError extends Error {
  constructor(
    public readonly path: string,
    public readonly reason: string
  ) {
    super(`Attachment validation failed at ${path}: ${reason}`);
    this.name = 'AttachmentValidationError';
  }
}

/**
 * Common configuration types that attachments may use.
 * These are generic types that can be extended for specific resources.
 */

/**
 * Base resource configuration with common properties.
 */
export interface BaseResourceConfig {
  readonly name?: string;
  readonly location?: string;
  readonly tags?: Record<string, string>;
}

/**
 * Storage account configuration.
 */
export interface StorageAccountConfig extends BaseResourceConfig {
  readonly sku?:
    | 'Standard_LRS'
    | 'Standard_GRS'
    | 'Standard_RAGRS'
    | 'Standard_ZRS'
    | 'Premium_LRS';
  readonly tier?: 'Hot' | 'Cool';
  readonly kind?: 'Storage' | 'StorageV2' | 'BlobStorage';
}

/**
 * Database configuration (Cosmos DB).
 */
export interface DatabaseConfig extends BaseResourceConfig {
  readonly mode?: 'Serverless' | 'Autoscale' | 'Provisioned';
  readonly consistency?:
    | 'Eventual'
    | 'ConsistentPrefix'
    | 'Session'
    | 'BoundedStaleness'
    | 'Strong';
  readonly throughput?: number | [number, number]; // Single value or [min, max] for autoscale
}

/**
 * Function App configuration.
 */
export interface FunctionAppConfig extends BaseResourceConfig {
  readonly plan?: 'Consumption' | 'Premium' | 'Dedicated';
  readonly runtime?: { language: string; version: string };
  readonly alwaysOn?: boolean;
  readonly minInstances?: number;
  readonly maxInstances?: number;
}

/**
 * VNet configuration.
 */
export interface VNetConfig extends BaseResourceConfig {
  readonly addressSpace?: string[];
  readonly subnets?: Array<{ name: string; range: string }>;
}

/**
 * Application Insights configuration.
 */
export interface AppInsightsConfig extends BaseResourceConfig {
  readonly samplingPercentage?: number;
  readonly retentionDays?: number;
  readonly enableLiveMetrics?: boolean;
}

/**
 * Type guards for configuration validation.
 */

/**
 * Check if value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Check if value is a valid Azure resource name.
 * Azure resource names have specific constraints.
 */
export function isValidResourceName(name: string): boolean {
  // Azure resource names:
  // - 3-24 characters
  // - Lowercase letters, numbers, and hyphens
  // - Must start with letter
  // - Cannot end with hyphen
  const pattern = /^[a-z][a-z0-9-]{1,22}[a-z0-9]$/;
  return pattern.test(name);
}

/**
 * Check if value is a valid SKU.
 */
export function isValidSku(sku: string, validSkus: string[]): boolean {
  return validSkus.includes(sku);
}

/**
 * Check if value is a positive integer.
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Check if value is within a valid range.
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validators for specific resource types.
 */

/**
 * Validator for storage account configurations.
 */
export const validateStorageAccountConfig: ConfigValidator<StorageAccountConfig> = (config) => {
  // Validate name if provided
  if (config.name !== undefined) {
    if (!isNonEmptyString(config.name)) {
      return 'Storage account name must be a non-empty string';
    }
    if (!isValidResourceName(config.name)) {
      return 'Storage account name must be 3-24 characters, lowercase letters/numbers/hyphens, start with letter';
    }
  }

  // Validate SKU if provided
  if (config.sku !== undefined) {
    const validSkus = [
      'Standard_LRS',
      'Standard_GRS',
      'Standard_RAGRS',
      'Standard_ZRS',
      'Premium_LRS',
    ];
    if (!validSkus.includes(config.sku)) {
      return `Storage account SKU must be one of: ${validSkus.join(', ')}`;
    }
  }

  // Validate tier if provided
  if (config.tier !== undefined) {
    const validTiers = ['Hot', 'Cool'];
    if (!validTiers.includes(config.tier)) {
      return `Storage account tier must be one of: ${validTiers.join(', ')}`;
    }
  }

  return undefined;
};

/**
 * Validator for database configurations.
 */
export const validateDatabaseConfig: ConfigValidator<DatabaseConfig> = (config) => {
  // Validate name if provided
  if (config.name !== undefined) {
    if (!isNonEmptyString(config.name)) {
      return 'Database name must be a non-empty string';
    }
    if (!isValidResourceName(config.name)) {
      return 'Database name must be 3-24 characters, lowercase letters/numbers/hyphens, start with letter';
    }
  }

  // Validate mode if provided
  if (config.mode !== undefined) {
    const validModes = ['Serverless', 'Autoscale', 'Provisioned'];
    if (!validModes.includes(config.mode)) {
      return `Database mode must be one of: ${validModes.join(', ')}`;
    }
  }

  // Validate consistency if provided
  if (config.consistency !== undefined) {
    const validLevels = ['Eventual', 'ConsistentPrefix', 'Session', 'BoundedStaleness', 'Strong'];
    if (!validLevels.includes(config.consistency)) {
      return `Database consistency must be one of: ${validLevels.join(', ')}`;
    }
  }

  // Validate throughput if provided
  if (config.throughput !== undefined) {
    if (Array.isArray(config.throughput)) {
      const [min, max] = config.throughput;
      if (!isPositiveInteger(min) || !isPositiveInteger(max)) {
        return 'Throughput range must be positive integers';
      }
      if (min >= max) {
        return 'Throughput minimum must be less than maximum';
      }
      if (min < 400 || max > 1000000) {
        return 'Throughput must be between 400 and 1,000,000 RU/s';
      }
    } else {
      if (!isPositiveInteger(config.throughput)) {
        return 'Throughput must be a positive integer';
      }
      if (!isInRange(config.throughput, 400, 1000000)) {
        return 'Throughput must be between 400 and 1,000,000 RU/s';
      }
    }
  }

  return undefined;
};

/**
 * Validator for function app configurations.
 */
export const validateFunctionAppConfig: ConfigValidator<FunctionAppConfig> = (config) => {
  // Validate name if provided
  if (config.name !== undefined) {
    if (!isNonEmptyString(config.name)) {
      return 'Function app name must be a non-empty string';
    }
    if (!isValidResourceName(config.name)) {
      return 'Function app name must be 3-24 characters, lowercase letters/numbers/hyphens, start with letter';
    }
  }

  // Validate plan if provided
  if (config.plan !== undefined) {
    const validPlans = ['Consumption', 'Premium', 'Dedicated'];
    if (!validPlans.includes(config.plan)) {
      return `Function app plan must be one of: ${validPlans.join(', ')}`;
    }
  }

  // Validate alwaysOn compatibility
  if (config.alwaysOn === true && config.plan === 'Consumption') {
    return 'AlwaysOn is not supported on Consumption plan';
  }

  // Validate instance counts
  if (config.minInstances !== undefined) {
    if (!isPositiveInteger(config.minInstances)) {
      return 'Minimum instances must be a positive integer';
    }
    if (config.minInstances > 100) {
      return 'Minimum instances cannot exceed 100';
    }
  }

  if (config.maxInstances !== undefined) {
    if (!isPositiveInteger(config.maxInstances)) {
      return 'Maximum instances must be a positive integer';
    }
    if (config.maxInstances > 200) {
      return 'Maximum instances cannot exceed 200';
    }
  }

  if (config.minInstances !== undefined && config.maxInstances !== undefined) {
    if (config.minInstances > config.maxInstances) {
      return 'Minimum instances cannot exceed maximum instances';
    }
  }

  return undefined;
};

/**
 * Validator for VNet configurations.
 */
export const validateVNetConfig: ConfigValidator<VNetConfig> = (config) => {
  // Validate name if provided
  if (config.name !== undefined) {
    if (!isNonEmptyString(config.name)) {
      return 'VNet name must be a non-empty string';
    }
    if (!isValidResourceName(config.name)) {
      return 'VNet name must be 3-24 characters, lowercase letters/numbers/hyphens, start with letter';
    }
  }

  // Validate address space if provided
  if (config.addressSpace !== undefined) {
    if (!Array.isArray(config.addressSpace) || config.addressSpace.length === 0) {
      return 'Address space must be a non-empty array';
    }

    for (const addr of config.addressSpace) {
      if (!isNonEmptyString(addr)) {
        return 'Address space entries must be non-empty strings';
      }
      // Basic CIDR validation
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(addr)) {
        return `Invalid CIDR notation: ${addr}`;
      }
    }
  }

  // Validate subnets if provided
  if (config.subnets !== undefined) {
    if (!Array.isArray(config.subnets)) {
      return 'Subnets must be an array';
    }

    for (const subnet of config.subnets) {
      if (!subnet.name || !isNonEmptyString(subnet.name)) {
        return 'Subnet name is required and must be non-empty';
      }
      if (!subnet.range || !isNonEmptyString(subnet.range)) {
        return 'Subnet range is required and must be non-empty';
      }
      // Basic CIDR validation
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(subnet.range)) {
        return `Invalid subnet CIDR notation: ${subnet.range}`;
      }
    }
  }

  return undefined;
};

/**
 * Validator for Application Insights configurations.
 */
export const validateAppInsightsConfig: ConfigValidator<AppInsightsConfig> = (config) => {
  // Validate name if provided
  if (config.name !== undefined) {
    if (!isNonEmptyString(config.name)) {
      return 'Application Insights name must be a non-empty string';
    }
    if (!isValidResourceName(config.name)) {
      return 'Application Insights name must be 3-24 characters, lowercase letters/numbers/hyphens, start with letter';
    }
  }

  // Validate sampling percentage if provided
  if (config.samplingPercentage !== undefined) {
    if (typeof config.samplingPercentage !== 'number') {
      return 'Sampling percentage must be a number';
    }
    if (!isInRange(config.samplingPercentage, 0, 100)) {
      return 'Sampling percentage must be between 0 and 100';
    }
  }

  // Validate retention days if provided
  if (config.retentionDays !== undefined) {
    if (!isPositiveInteger(config.retentionDays)) {
      return 'Retention days must be a positive integer';
    }
    const validRetentions = [30, 60, 90, 120, 180, 270, 365, 550, 730];
    if (!validRetentions.includes(config.retentionDays)) {
      return `Retention days must be one of: ${validRetentions.join(', ')}`;
    }
  }

  return undefined;
};

/**
 * Generic validator factory.
 * Creates a validator that checks required fields.
 *
 * @typeParam T - Configuration type
 * @param requiredFields - Array of required field names
 * @returns Validator function
 */
export function createRequiredFieldsValidator<T extends Record<string, unknown>>(
  requiredFields: Array<keyof T>
): ConfigValidator<T> {
  return (config: T) => {
    for (const field of requiredFields) {
      if (config[field] === undefined || config[field] === null) {
        return `Required field '${String(field)}' is missing`;
      }
    }
    return undefined;
  };
}

/**
 * Compose multiple validators into a single validator.
 * Runs all validators and returns the first error encountered.
 *
 * @typeParam T - Configuration type
 * @param validators - Array of validators to compose
 * @returns Composed validator function
 */
export function composeValidators<T>(...validators: Array<ConfigValidator<T>>): ConfigValidator<T> {
  return (config: T) => {
    for (const validator of validators) {
      const error = validator(config);
      if (error) {
        return error;
      }
    }
    return undefined;
  };
}

/**
 * Validator registry for looking up validators by type.
 */
export class ValidatorRegistry {
  private readonly validators = new Map<string, ConfigValidator<unknown>>();

  /**
   * Register a validator for a specific type.
   *
   * @param type - Resource type identifier
   * @param validator - Validator function
   */
  public register<T>(type: string, validator: ConfigValidator<T>): void {
    this.validators.set(type, validator as ConfigValidator<unknown>);
  }

  /**
   * Get validator for a specific type.
   *
   * @param type - Resource type identifier
   * @returns Validator function or undefined if not registered
   */
  public get<T>(type: string): ConfigValidator<T> | undefined {
    return this.validators.get(type) as ConfigValidator<T> | undefined;
  }

  /**
   * Check if validator exists for a type.
   *
   * @param type - Resource type identifier
   * @returns True if validator is registered
   */
  public has(type: string): boolean {
    return this.validators.has(type);
  }
}

/**
 * Default validator registry with common validators pre-registered.
 */
export const defaultValidators = new ValidatorRegistry();

// Register default validators
defaultValidators.register('storage-account', validateStorageAccountConfig);
defaultValidators.register('database', validateDatabaseConfig);
defaultValidators.register('function-app', validateFunctionAppConfig);
defaultValidators.register('vnet', validateVNetConfig);
defaultValidators.register('app-insights', validateAppInsightsConfig);
