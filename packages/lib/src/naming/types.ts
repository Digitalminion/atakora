/**
 * Resource type patterns mapping resource types to their naming prefixes.
 *
 * @example
 * ```typescript
 * const patterns: ResourceTypePatterns = {
 *   storage: 'st',
 *   keyvault: 'kv',
 *   vnet: 'vnet'
 * };
 * ```
 */
export interface ResourceTypePatterns {
  // Core Infrastructure
  readonly rg?: string;
  readonly rgLandingZone?: string;
  readonly rgPlatform?: string;
  readonly stack?: string;
  readonly vnet?: string;
  readonly subnet?: string;
  readonly nsg?: string;
  readonly publicIp?: string;
  readonly privateEndpoint?: string;
  readonly privateLinkService?: string;
  readonly dnsZoneLink?: string;

  // Compute Services
  readonly appService?: string;
  readonly appServicePlan?: string;
  readonly appGateway?: string;
  readonly wafPolicy?: string;

  // Data Services
  readonly storage?: string;
  readonly keyvault?: string;
  readonly cosmos?: string;
  readonly search?: string;

  // AI Services
  readonly openai?: string;

  // API Services
  readonly apim?: string;

  // Monitoring Services
  readonly logAnalytics?: string;
  readonly applicationInsights?: string;
  readonly actionGroup?: string;
  readonly dashboard?: string;
  readonly alert?: string;

  // External Services
  readonly snowflake?: string;

  // Allow custom resource types
  [resourceType: string]: string | undefined;
}

/**
 * Resource-specific maximum name lengths.
 *
 * @example
 * ```typescript
 * const maxLengths: ResourceTypeMaxLengths = {
 *   storage: 24,
 *   keyvault: 24,
 *   rg: 90
 * };
 * ```
 */
export interface ResourceTypeMaxLengths {
  readonly rg?: number;
  readonly rgLandingZone?: number;
  readonly rgPlatform?: number;
  readonly stack?: number;
  readonly vnet?: number;
  readonly storage?: number;
  readonly keyvault?: number;
  readonly cosmos?: number;
  readonly search?: number;
  readonly openai?: number;
  readonly apim?: number;
  readonly appGateway?: number;
  readonly appService?: number;

  // Allow custom resource types
  [resourceType: string]: number | undefined;
}

/**
 * Complete naming conventions configuration.
 */
export interface NamingConventions {
  /**
   * Separator character used between name components.
   * @default "-"
   */
  readonly separator: string;

  /**
   * Default maximum length for resource names when no specific limit is defined.
   * @default 60
   */
  readonly maxLength: number;

  /**
   * Prefix patterns for each resource type.
   */
  readonly patterns: ResourceTypePatterns;

  /**
   * Resource-specific maximum lengths.
   */
  readonly maxLengths: ResourceTypeMaxLengths;
}

/**
 * Configuration for customizing resource naming conventions.
 * All properties are optional and will be merged with defaults.
 *
 * @example
 * ```typescript
 * const config: NamingConventionConfig = {
 *   separator: '_',
 *   patterns: {
 *     storage: 'stor',
 *     keyvault: 'vault'
 *   }
 * };
 * ```
 */
export interface NamingConventionConfig {
  /**
   * Custom separator character to use between name components.
   */
  readonly separator?: string;

  /**
   * Custom default maximum length for resource names.
   */
  readonly maxLength?: number;

  /**
   * Custom prefix patterns for resource types.
   * These will be merged with defaults, overriding matching keys.
   */
  readonly patterns?: Partial<ResourceTypePatterns>;

  /**
   * Custom resource-specific maximum lengths.
   * These will be merged with defaults, overriding matching keys.
   */
  readonly maxLengths?: Partial<ResourceTypeMaxLengths>;
}

/**
 * Parameters for generating a resource name.
 *
 * @example
 * ```typescript
 * const params: ResourceNameParams = {
 *   resourceType: 'vnet',
 *   organization: 'digital-products',
 *   project: 'colorai',
 *   environment: 'nonprod',
 *   geography: 'eastus',
 *   instance: '01'
 * };
 * ```
 */
export interface ResourceNameParams {
  /**
   * Resource type identifier (e.g., 'vnet', 'storage', 'keyvault').
   * Must match a key in the patterns configuration.
   */
  readonly resourceType: string;

  /**
   * Organization name (e.g., 'digital-products', 'engineering').
   */
  readonly organization: string;

  /**
   * Project name (e.g., 'colorai', 'analytics').
   */
  readonly project: string;

  /**
   * Environment name (e.g., 'dev', 'nonprod', 'prod').
   */
  readonly environment: string;

  /**
   * Geography or region identifier (e.g., 'eastus', 'westus2').
   */
  readonly geography: string;

  /**
   * Instance identifier (e.g., '01', '02').
   */
  readonly instance: string;

  /**
   * Optional purpose identifier for more specific naming (e.g., 'data', 'gateway').
   * When provided, appears in format: {prefix}-{org}-{project}-{purpose}-{env}-{geo}-{instance}
   */
  readonly purpose?: string;

  /**
   * Optional additional suffix to append to the resource name.
   */
  readonly additionalSuffix?: string;
}

/**
 * Result of resource name validation.
 *
 * @example
 * ```typescript
 * const result: ValidationResult = {
 *   isValid: false,
 *   errors: ['Name exceeds maximum length of 24 characters'],
 *   warnings: ['Name contains uppercase letters which will be converted to lowercase']
 * };
 * ```
 */
export interface ValidationResult {
  /**
   * Whether the name passes all validation rules.
   */
  readonly isValid: boolean;

  /**
   * Error messages for validation failures.
   * Empty array if validation passes.
   */
  readonly errors: readonly string[];

  /**
   * Warning messages for potential issues.
   * Empty array if no warnings.
   */
  readonly warnings: readonly string[];
}

/**
 * Rules for validating a specific resource type's name.
 */
export interface ResourceValidationRules {
  /**
   * Minimum allowed length for the resource name.
   */
  readonly minLength?: number;

  /**
   * Maximum allowed length for the resource name.
   */
  readonly maxLength?: number;

  /**
   * Regular expression pattern the name must match.
   */
  readonly pattern?: RegExp;

  /**
   * Whether the name must be globally unique in Azure.
   */
  readonly globallyUnique?: boolean;

  /**
   * Whether the name is case-sensitive.
   */
  readonly caseSensitive?: boolean;

  /**
   * Custom validation function.
   */
  readonly customValidator?: (name: string) => ValidationResult;
}
