/**
 * Validation pipeline orchestrator
 *
 * @remarks
 * Coordinates multi-layer validation in the correct order:
 * 1. Construct validation (done in constructors)
 * 2. Transformation validation (type-safe transforms)
 * 3. ARM structure validation
 * 4. Deployment sequence validation
 * 5. Schema validation
 *
 * Provides early exit on errors and configurable strictness levels.
 *
 * @packageDocumentation
 */

import { Resource } from '../../core/resource';
import { ArmTemplate, ValidationResult, ValidationError, ValidationSeverity } from '../types';
import { ValidatorRegistry } from './validator-registry';

/**
 * Validation level configuration
 */
export enum ValidationLevel {
  /**
   * Lenient - only fail on critical errors
   */
  LENIENT = 'lenient',

  /**
   * Normal - fail on errors, warn on issues
   */
  NORMAL = 'normal',

  /**
   * Strict - treat warnings as errors
   */
  STRICT = 'strict',
}

/**
 * Options for validation pipeline
 */
export interface ValidationOptions {
  /**
   * Validation strictness level
   * @default ValidationLevel.NORMAL
   */
  level?: ValidationLevel;

  /**
   * Treat warnings as errors (same as level: STRICT)
   * @default false
   */
  strict?: boolean;

  /**
   * Skip specific validation layers
   */
  skip?: {
    transformation?: boolean;
    structure?: boolean;
    deployment?: boolean;
    schema?: boolean;
  };
}

/**
 * Result from a single validation layer
 */
interface LayerValidationResult {
  layer: string;
  errors: ValidationError[];
  warnings: ValidationError[];
  duration: number;
}

/**
 * Orchestrates multi-layer validation pipeline
 */
export class ValidationPipeline {
  private validatorRegistry: ValidatorRegistry;

  constructor(validatorRegistry?: ValidatorRegistry) {
    this.validatorRegistry = validatorRegistry || new ValidatorRegistry();
  }

  /**
   * Run complete validation pipeline
   *
   * @param resources - Resources from construct tree
   * @param template - Generated ARM template
   * @param stackName - Name of the stack being validated
   * @param options - Validation options
   * @returns Aggregated validation result
   */
  async validate(
    resources: Resource[],
    template: ArmTemplate,
    stackName: string,
    options?: ValidationOptions
  ): Promise<ValidationResult> {
    const opts = this.normalizeOptions(options);
    const layerResults: LayerValidationResult[] = [];

    // Layer 1: Construct validation
    // (Already done in constructors - no action needed here)

    // Layer 2: Transformation validation
    if (!opts.skip?.transformation) {
      const transformResult = await this.runLayer('Transformation', () =>
        this.validateTransformations(resources, template)
      );
      layerResults.push(transformResult);

      // Early exit if errors found and strict mode
      if (this.shouldEarlyExit(transformResult, opts)) {
        return this.aggregateResults(layerResults, stackName);
      }
    }

    // Layer 3: ARM structure validation
    if (!opts.skip?.structure) {
      const structureResult = await this.runLayer('ARM Structure', () =>
        this.validateArmStructure(template)
      );
      layerResults.push(structureResult);

      // Early exit if errors found and strict mode
      if (this.shouldEarlyExit(structureResult, opts)) {
        return this.aggregateResults(layerResults, stackName);
      }
    }

    // Layer 4: Deployment sequence validation
    if (!opts.skip?.deployment) {
      const deploymentResult = await this.runLayer('Deployment Sequence', () =>
        this.validateDeploymentSequence(template)
      );
      layerResults.push(deploymentResult);

      // Early exit if errors found and strict mode
      if (this.shouldEarlyExit(deploymentResult, opts)) {
        return this.aggregateResults(layerResults, stackName);
      }
    }

    // Layer 5: Schema validation (always runs last)
    if (!opts.skip?.schema) {
      const schemaResult = await this.runLayer('Schema', () =>
        this.validateSchema(template, stackName)
      );
      layerResults.push(schemaResult);
    }

    return this.aggregateResults(layerResults, stackName);
  }

  /**
   * Normalize validation options with defaults
   */
  private normalizeOptions(options?: ValidationOptions): Required<ValidationOptions> {
    const level = options?.strict
      ? ValidationLevel.STRICT
      : options?.level || ValidationLevel.NORMAL;

    return {
      level,
      strict: level === ValidationLevel.STRICT,
      skip: options?.skip || {},
    };
  }

  /**
   * Run a validation layer with timing
   */
  private async runLayer(
    layerName: string,
    validator: () => Promise<Omit<LayerValidationResult, 'layer' | 'duration'>>
  ): Promise<LayerValidationResult> {
    const startTime = Date.now();

    try {
      const result = await validator();
      const duration = Date.now() - startTime;

      return {
        layer: layerName,
        ...result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        layer: layerName,
        errors: [
          {
            severity: ValidationSeverity.ERROR,
            message: `${layerName} validation failed: ${error instanceof Error ? error.message : String(error)}`,
            code: 'LAYER_FAILURE',
          },
        ],
        warnings: [],
        duration,
      };
    }
  }

  /**
   * Check if validation should exit early
   */
  private shouldEarlyExit(
    result: LayerValidationResult,
    options: Required<ValidationOptions>
  ): boolean {
    // Always exit early on errors
    if (result.errors.length > 0) {
      return true;
    }

    // In strict mode, exit on warnings too
    if (options.strict && result.warnings.length > 0) {
      return true;
    }

    return false;
  }

  /**
   * Layer 2: Validate transformations
   *
   * @remarks
   * Validates that resources were correctly transformed to ARM format.
   * This layer checks for type-safe transformation errors.
   */
  private async validateTransformations(
    resources: Resource[],
    template: ArmTemplate
  ): Promise<Omit<LayerValidationResult, 'layer' | 'duration'>> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check that all resources have valid ARM structure
    for (const armResource of template.resources) {
      // Validate required ARM properties
      if (!armResource.type) {
        errors.push({
          severity: ValidationSeverity.ERROR,
          message: `Resource missing required "type" property`,
          path: armResource.name || 'unknown',
          code: 'MISSING_TYPE',
        });
      }

      if (!armResource.apiVersion) {
        errors.push({
          severity: ValidationSeverity.ERROR,
          message: `Resource '${armResource.name}' missing required "apiVersion" property`,
          path: armResource.name || 'unknown',
          code: 'MISSING_API_VERSION',
        });
      }

      if (!armResource.name) {
        errors.push({
          severity: ValidationSeverity.ERROR,
          message: `Resource missing required "name" property`,
          path: armResource.type || 'unknown',
          code: 'MISSING_NAME',
        });
      }

      // Validate properties wrapper exists for resources that need it
      if (this.requiresProperties(armResource.type) && !armResource.properties) {
        warnings.push({
          severity: ValidationSeverity.WARNING,
          message: `Resource '${armResource.name}' of type '${armResource.type}' typically requires a "properties" object`,
          path: armResource.name,
          code: 'MISSING_PROPERTIES',
          suggestion: 'Add a properties object with resource-specific configuration',
        });
      }
    }

    // Validate resource count matches
    if (template.resources.length !== resources.length) {
      warnings.push({
        severity: ValidationSeverity.WARNING,
        message: `Resource count mismatch: ${resources.length} constructs transformed to ${template.resources.length} ARM resources`,
        code: 'RESOURCE_COUNT_MISMATCH',
      });
    }

    return { errors, warnings };
  }

  /**
   * Layer 3: Validate ARM structure
   *
   * @remarks
   * Validates the overall ARM template structure and relationships.
   */
  private async validateArmStructure(
    template: ArmTemplate
  ): Promise<Omit<LayerValidationResult, 'layer' | 'duration'>> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Validate template schema
    if (!template.$schema) {
      errors.push({
        severity: ValidationSeverity.ERROR,
        message: 'ARM template missing required "$schema" property',
        code: 'MISSING_SCHEMA',
      });
    }

    if (!template.contentVersion) {
      errors.push({
        severity: ValidationSeverity.ERROR,
        message: 'ARM template missing required "contentVersion" property',
        code: 'MISSING_CONTENT_VERSION',
      });
    }

    // Validate resources array
    if (!Array.isArray(template.resources)) {
      errors.push({
        severity: ValidationSeverity.ERROR,
        message: 'ARM template "resources" must be an array',
        code: 'INVALID_RESOURCES_TYPE',
      });
    }

    // Check for duplicate resource names
    const resourceNames = new Set<string>();
    for (const resource of template.resources) {
      if (resourceNames.has(resource.name)) {
        errors.push({
          severity: ValidationSeverity.ERROR,
          message: `Duplicate resource name: '${resource.name}'`,
          path: resource.name,
          code: 'DUPLICATE_RESOURCE_NAME',
          suggestion: 'Resource names must be unique within a template',
        });
      }
      resourceNames.add(resource.name);
    }

    return { errors, warnings };
  }

  /**
   * Layer 4: Validate deployment sequence
   *
   * @remarks
   * Validates that resource dependencies form a valid deployment graph.
   */
  private async validateDeploymentSequence(
    template: ArmTemplate
  ): Promise<Omit<LayerValidationResult, 'layer' | 'duration'>> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Build dependency graph
    const resourceMap = new Map<string, any>();
    for (const resource of template.resources) {
      resourceMap.set(resource.name, resource);
    }

    // Validate dependencies
    for (const resource of template.resources) {
      if (resource.dependsOn && Array.isArray(resource.dependsOn)) {
        for (const dep of resource.dependsOn) {
          // Extract resource name from dependency (handle both formats)
          const depName = this.extractResourceNameFromDependency(dep);

          if (!resourceMap.has(depName)) {
            errors.push({
              severity: ValidationSeverity.ERROR,
              message: `Resource '${resource.name}' depends on '${depName}' which does not exist in template`,
              path: resource.name,
              code: 'MISSING_DEPENDENCY',
              suggestion: 'Ensure all dependencies are defined in the same template',
            });
          }
        }
      }
    }

    // Check for circular dependencies (simple cycle detection)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const detectCycle = (resourceName: string): boolean => {
      if (recursionStack.has(resourceName)) {
        return true; // Cycle detected
      }

      if (visited.has(resourceName)) {
        return false; // Already checked this path
      }

      visited.add(resourceName);
      recursionStack.add(resourceName);

      const resource = resourceMap.get(resourceName);
      if (resource?.dependsOn) {
        for (const dep of resource.dependsOn) {
          const depName = this.extractResourceNameFromDependency(dep);
          if (detectCycle(depName)) {
            return true;
          }
        }
      }

      recursionStack.delete(resourceName);
      return false;
    };

    for (const resourceName of resourceMap.keys()) {
      if (detectCycle(resourceName)) {
        errors.push({
          severity: ValidationSeverity.ERROR,
          message: `Circular dependency detected involving resource '${resourceName}'`,
          path: resourceName,
          code: 'CIRCULAR_DEPENDENCY',
          suggestion: 'Review resource dependencies to remove cycles',
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Layer 5: Validate schema
   *
   * @remarks
   * Delegates to existing schema validator from registry.
   */
  private async validateSchema(
    template: ArmTemplate,
    stackName: string
  ): Promise<Omit<LayerValidationResult, 'layer' | 'duration'>> {
    const result = await this.validatorRegistry.validateAll(template, stackName);

    return {
      errors: result.errors,
      warnings: result.warnings,
    };
  }

  /**
   * Aggregate results from all layers
   */
  private aggregateResults(results: LayerValidationResult[], stackName?: string): ValidationResult {
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    for (const result of results) {
      // Prefix errors/warnings with layer name
      for (const error of result.errors) {
        allErrors.push({
          ...error,
          path: `[${result.layer}] ${error.path || stackName || ''}`,
        });
      }

      for (const warning of result.warnings) {
        allWarnings.push({
          ...warning,
          path: `[${result.layer}] ${warning.path || stackName || ''}`,
        });
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  /**
   * Extract resource name from dependency string
   *
   * @remarks
   * Handles both formats:
   * - "[resourceId('Microsoft.Network/virtualNetworks', 'vnet-name')]"
   * - "vnet-name"
   */
  private extractResourceNameFromDependency(dep: string): string {
    // If it's an ARM expression, try to extract the name
    if (dep.startsWith('[resourceId(')) {
      const match = dep.match(/,\s*'([^']+)'\s*\)/);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Otherwise, assume it's the resource name directly
    return dep;
  }

  /**
   * Check if a resource type typically requires a properties object
   */
  private requiresProperties(resourceType: string): boolean {
    // Most Azure resources require properties, except for a few like resource groups
    const noPropertiesRequired = ['Microsoft.Resources/resourceGroups'];

    return !noPropertiesRequired.includes(resourceType);
  }
}
