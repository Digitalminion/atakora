/**
 * Core synthesis types and interfaces for ARM template generation
 */

/**
 * ARM template structure
 */
export interface ArmTemplate {
  $schema: string;
  contentVersion: string;
  parameters?: Record<string, ArmParameter>;
  variables?: Record<string, any>;
  resources: ArmResource[];
  outputs?: Record<string, ArmOutput>;
}

/**
 * ARM resource definition
 */
export interface ArmResource {
  type: string;
  apiVersion: string;
  name: string;
  location?: string;
  tags?: Record<string, string>;
  dependsOn?: string[];
  properties?: Record<string, any>;
  sku?: {
    name: string;
    tier?: string;
    capacity?: number;
  };
  kind?: string;
  identity?: {
    type: string;
    userAssignedIdentities?: Record<string, any>;
  };
  [key: string]: any;
}

/**
 * ARM parameter definition
 */
export interface ArmParameter {
  type: 'string' | 'int' | 'bool' | 'object' | 'array' | 'secureString' | 'secureObject';
  defaultValue?: any;
  allowedValues?: any[];
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  metadata?: {
    description?: string;
  };
}

/**
 * ARM output definition
 */
export interface ArmOutput {
  type: 'string' | 'int' | 'bool' | 'object' | 'array';
  value: any;
  metadata?: {
    description?: string;
  };
}

/**
 * Stack manifest containing stack metadata
 */
export interface StackManifest {
  name: string;
  templatePath: string;
  resourceCount: number;
  parameterCount: number;
  outputCount: number;
  dependencies: string[];
}

/**
 * Cloud assembly containing all synthesized artifacts
 */
export interface CloudAssembly {
  version: string;
  stacks: Record<string, StackManifest>;
  directory: string;
}

/**
 * Synthesis options
 */
export interface SynthesisOptions {
  /**
   * Output directory for synthesized templates
   */
  outdir: string;

  /**
   * Skip validation during synthesis
   */
  skipValidation?: boolean;

  /**
   * Pretty-print JSON output
   */
  prettyPrint?: boolean;

  /**
   * Treat warnings as errors
   */
  strict?: boolean;
}

/**
 * Validation severity levels
 */
export enum ValidationSeverity {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Validation error details
 */
export interface ValidationError {
  severity: ValidationSeverity;
  message: string;
  path?: string;
  code?: string;
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Resource metadata collected during tree traversal
 */
export interface ResourceMetadata {
  id: string;
  stackName: string;
  resourceType: string;
  constructPath: string;
}
