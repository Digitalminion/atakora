/**
 * Configuration merger system for the Backend pattern.
 *
 * This module provides the main configuration merger that combines requirements
 * from multiple components, resolves conflicts, and validates the final configuration.
 *
 * @module @atakora/component/backend/merger
 */

import type {
  MergeStrategy,
  MergeContext,
  MergeResult,
  MergeStrategyHandler,
  CustomMergeFunction
} from './strategies';
import {
  unionStrategy,
  intersectionStrategy,
  maximumStrategy,
  priorityStrategy,
  minimumStrategy,
  objectMergeStrategy,
  MergeStrategyRegistry
} from './strategies';
import type {
  ValidationResult,
  ValidationError,
  ConfigConflict,
  ValidatorFn,
  ConfigSchema,
  IncompatibilityRule
} from './validators';
import {
  ConflictDetector,
  ConfigValidator,
  AzureValidators
} from './validators';

/**
 * Minimal interface for resource requirements.
 * This will be replaced with the actual interface from interfaces.ts when available.
 */
export interface IResourceRequirement {
  readonly resourceType: string;
  readonly requirementKey: string;
  readonly config: Record<string, unknown>;
  readonly priority?: number;
  readonly componentId?: string;
}

/**
 * Configuration merger options.
 */
export interface ConfigurationMergerOptions {
  /**
   * Default merge strategy to use when not specified.
   * @default 'priority'
   */
  readonly defaultStrategy?: MergeStrategy;

  /**
   * Whether to throw errors on conflicts or return them as warnings.
   * @default false
   */
  readonly strictMode?: boolean;

  /**
   * Enable detailed debug tracing.
   * @default false
   */
  readonly enableTracing?: boolean;

  /**
   * Custom merge strategies for specific property paths.
   */
  readonly customStrategies?: ReadonlyArray<CustomMergeFunction>;

  /**
   * Incompatibility rules to check.
   */
  readonly incompatibilityRules?: ReadonlyArray<IncompatibilityRule>;

  /**
   * Custom validators to apply.
   */
  readonly validators?: Map<string, ValidatorFn>;

  /**
   * Configuration schemas for validation.
   */
  readonly schemas?: Map<string, ConfigSchema>;
}

/**
 * Merge operation trace for debugging.
 */
export interface MergeTrace {
  readonly path: string;
  readonly strategy: MergeStrategy;
  readonly inputs: ReadonlyArray<{
    readonly value: unknown;
    readonly source: string;
    readonly priority: number;
  }>;
  readonly output: unknown;
  readonly warnings?: ReadonlyArray<string>;
  readonly timestamp: number;
}

/**
 * Result of merging configurations.
 */
export interface MergedConfiguration {
  /**
   * The merged configuration object.
   */
  readonly config: Record<string, unknown>;

  /**
   * Conflicts that were detected and resolved.
   */
  readonly conflicts: ReadonlyArray<ConfigConflict>;

  /**
   * Unresolvable conflicts that require manual intervention.
   */
  readonly unresolvableConflicts: ReadonlyArray<ConfigConflict>;

  /**
   * Validation errors.
   */
  readonly errors: ReadonlyArray<ValidationError>;

  /**
   * Warning messages.
   */
  readonly warnings: ReadonlyArray<string>;

  /**
   * Trace of merge operations (if tracing enabled).
   */
  readonly trace?: ReadonlyArray<MergeTrace>;

  /**
   * Whether the merge was successful.
   */
  readonly success: boolean;
}

/**
 * Main configuration merger class.
 *
 * Intelligently combines requirements from multiple components and resolves conflicts.
 */
export class ConfigurationMerger {
  private readonly options: Required<ConfigurationMergerOptions>;
  private readonly strategyRegistry: MergeStrategyRegistry;
  private readonly conflictDetector: ConflictDetector;
  private readonly validator: ConfigValidator;
  private readonly traces: MergeTrace[] = [];

  constructor(options: ConfigurationMergerOptions = {}) {
    this.options = {
      defaultStrategy: options.defaultStrategy ?? 'priority',
      strictMode: options.strictMode ?? false,
      enableTracing: options.enableTracing ?? false,
      customStrategies: options.customStrategies ?? [],
      incompatibilityRules: options.incompatibilityRules ?? [],
      validators: options.validators ?? new Map(),
      schemas: options.schemas ?? new Map()
    };

    this.strategyRegistry = new MergeStrategyRegistry();
    this.conflictDetector = new ConflictDetector();
    this.validator = new ConfigValidator();

    // Register custom strategies
    for (const strategy of this.options.customStrategies) {
      this.strategyRegistry.register(strategy);
    }

    // Register validators
    for (const [path, validatorFn] of this.options.validators) {
      this.validator.registerValidator(path, validatorFn);
    }

    // Register schemas
    for (const [path, schema] of this.options.schemas) {
      this.validator.registerSchema(path, schema);
    }
  }

  /**
   * Merge multiple resource requirements into a single configuration.
   *
   * @param requirements Array of resource requirements to merge
   * @returns Merged configuration with conflict information
   */
  mergeRequirements(
    requirements: ReadonlyArray<IResourceRequirement>
  ): MergedConfiguration {
    if (requirements.length === 0) {
      return {
        config: {},
        conflicts: [],
        unresolvableConflicts: [],
        errors: [],
        warnings: [],
        success: true
      };
    }

    if (requirements.length === 1) {
      return {
        config: { ...requirements[0].config },
        conflicts: [],
        unresolvableConflicts: [],
        errors: [],
        warnings: [],
        success: true
      };
    }

    // Clear previous traces if tracing is enabled
    if (this.options.enableTracing) {
      this.traces.length = 0;
    }

    const allConflicts: ConfigConflict[] = [];
    const allWarnings: string[] = [];
    const allErrors: ValidationError[] = [];

    // Extract configurations
    const configs = requirements.map(req => req.config);
    const sources = requirements.map(req => req.componentId ?? 'unknown');
    const priorities = requirements.map(req => req.priority ?? 10);

    // Merge configurations
    const mergedConfig = this.deepMergeObjects(
      configs,
      sources,
      priorities,
      'config'
    );

    if (mergedConfig.warnings) {
      allWarnings.push(...mergedConfig.warnings);
    }

    // Detect conflicts
    const conflicts = this.detectAllConflicts(
      configs,
      sources,
      priorities,
      'config'
    );
    allConflicts.push(...conflicts);

    // Check for incompatibilities
    const incompatibilities = this.conflictDetector.detectIncompatibilities(
      mergedConfig.value,
      this.options.incompatibilityRules
    );
    allConflicts.push(...incompatibilities);

    // Separate resolvable from unresolvable conflicts
    const unresolvableConflicts = allConflicts.filter(c => !c.resolvable);
    const resolvableConflicts = allConflicts.filter(c => c.resolvable);

    // Validate merged configuration
    for (const req of requirements) {
      const validationResult = this.validator.validate(mergedConfig.value, {
        path: 'config',
        source: req.componentId ?? 'unknown',
        fullConfig: mergedConfig.value
      });

      if (!validationResult.valid && validationResult.errors) {
        allErrors.push(...validationResult.errors);
      }
      if (validationResult.warnings) {
        allWarnings.push(...validationResult.warnings);
      }
    }

    // Determine success
    const hasUnresolvableConflicts = unresolvableConflicts.length > 0;
    const hasErrors = allErrors.length > 0;
    const success = !hasUnresolvableConflicts && !hasErrors;

    // In strict mode, throw on any conflicts or errors
    if (this.options.strictMode && !success) {
      const errorMessage = this.formatErrorMessage(
        unresolvableConflicts,
        allErrors
      );
      throw new Error(`Configuration merge failed:\n${errorMessage}`);
    }

    return {
      config: mergedConfig.value,
      conflicts: resolvableConflicts,
      unresolvableConflicts,
      errors: allErrors,
      warnings: allWarnings,
      trace: this.options.enableTracing ? [...this.traces] : undefined,
      success
    };
  }

  /**
   * Deep merge multiple objects using configured strategies.
   */
  private deepMergeObjects(
    objects: ReadonlyArray<Record<string, unknown>>,
    sources: ReadonlyArray<string>,
    priorities: ReadonlyArray<number>,
    path: string
  ): MergeResult<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    const allWarnings: string[] = [];
    const contributingSources = new Set<string>();

    // Collect all unique keys
    const allKeys = new Set<string>();
    for (const obj of objects) {
      for (const key of Object.keys(obj)) {
        allKeys.add(key);
      }
    }

    // Merge each property
    for (const key of allKeys) {
      const propertyPath = `${path}.${key}`;

      // Get values for this property
      const propertyValues = objects
        .map((obj, i) => ({
          value: obj[key],
          source: sources[i],
          priority: priorities[i],
          index: i
        }))
        .filter(x => x.value !== undefined);

      if (propertyValues.length === 0) {
        continue;
      }

      if (propertyValues.length === 1) {
        result[key] = propertyValues[0].value;
        contributingSources.add(propertyValues[0].source);
        continue;
      }

      // Determine merge strategy for this property
      const strategy = this.getStrategyForPath(propertyPath);

      const context: MergeContext = {
        path: propertyPath,
        sources: propertyValues.map(pv => pv.source),
        priorities: propertyValues.map(pv => pv.priority)
      };

      try {
        const mergeResult = this.mergeProperty(
          propertyValues.map(pv => pv.value),
          context,
          strategy
        );

        result[key] = mergeResult.value;
        if (mergeResult.warnings) {
          allWarnings.push(...mergeResult.warnings);
        }
        for (const source of mergeResult.contributingSources) {
          contributingSources.add(source);
        }

        // Add trace
        if (this.options.enableTracing) {
          this.traces.push({
            path: propertyPath,
            strategy: mergeResult.strategyUsed,
            inputs: propertyValues.map(pv => ({
              value: pv.value,
              source: pv.source,
              priority: pv.priority
            })),
            output: mergeResult.value,
            warnings: mergeResult.warnings,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        allWarnings.push(
          `Failed to merge property ${propertyPath}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return {
      value: result,
      warnings: allWarnings.length > 0 ? allWarnings : undefined,
      strategyUsed: 'custom',
      contributingSources: Array.from(contributingSources)
    };
  }

  /**
   * Merge a single property using the appropriate strategy.
   */
  private mergeProperty(
    values: ReadonlyArray<unknown>,
    context: MergeContext,
    strategy: MergeStrategy
  ): MergeResult<unknown> {
    // Check for custom strategy first
    const customStrategy = this.strategyRegistry.find(context.path);
    if (customStrategy) {
      return customStrategy.handler(values, context);
    }

    // Detect value types
    const firstValue = values[0];
    const isArray = Array.isArray(firstValue);
    const isObject = typeof firstValue === 'object' && firstValue !== null && !isArray;
    const isNumber = typeof firstValue === 'number';

    // Apply built-in strategies
    switch (strategy) {
      case 'union':
        if (!isArray) {
          throw new Error(`Union strategy requires array values at ${context.path}`);
        }
        return unionStrategy(values as ReadonlyArray<ReadonlyArray<unknown>>, context);

      case 'intersection':
        if (!isArray) {
          throw new Error(`Intersection strategy requires array values at ${context.path}`);
        }
        return intersectionStrategy(values as ReadonlyArray<ReadonlyArray<unknown>>, context);

      case 'maximum':
        if (!isNumber) {
          throw new Error(`Maximum strategy requires number values at ${context.path}`);
        }
        return maximumStrategy(values as ReadonlyArray<number>, context);

      case 'priority':
        return priorityStrategy(values, context);

      case 'custom':
        // If we get here, no custom strategy was found, fall back to priority
        return priorityStrategy(values, context);

      default:
        return priorityStrategy(values, context);
    }
  }

  /**
   * Detect all conflicts in the configurations.
   */
  private detectAllConflicts(
    configs: ReadonlyArray<Record<string, unknown>>,
    sources: ReadonlyArray<string>,
    priorities: ReadonlyArray<number>,
    path: string
  ): ConfigConflict[] {
    const conflicts: ConfigConflict[] = [];

    // Collect all unique keys
    const allKeys = new Set<string>();
    for (const config of configs) {
      for (const key of Object.keys(config)) {
        allKeys.add(key);
      }
    }

    // Check each property for conflicts
    for (const key of allKeys) {
      const propertyPath = `${path}.${key}`;
      const propertyValues = configs
        .map((config, i) => ({
          value: config[key],
          source: sources[i],
          priority: priorities[i]
        }))
        .filter(x => x.value !== undefined);

      if (propertyValues.length < 2) {
        continue;
      }

      const context: MergeContext = {
        path: propertyPath,
        sources: propertyValues.map(pv => pv.source),
        priorities: propertyValues.map(pv => pv.priority)
      };

      // Detect value conflicts
      const valueConflicts = this.conflictDetector.detectConflicts(
        propertyValues.map(pv => pv.value),
        context
      );
      conflicts.push(...valueConflicts);

      // Detect type conflicts
      const typeConflicts = this.conflictDetector.detectTypeConflicts(
        propertyValues.map(pv => pv.value),
        context
      );
      conflicts.push(...typeConflicts);

      // Recursively check nested objects
      const firstValue = propertyValues[0].value;
      if (typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue)) {
        const nestedConfigs = propertyValues.map(pv => pv.value as Record<string, unknown>);
        const nestedConflicts = this.detectAllConflicts(
          nestedConfigs,
          propertyValues.map(pv => pv.source),
          propertyValues.map(pv => pv.priority),
          propertyPath
        );
        conflicts.push(...nestedConflicts);
      }
    }

    return conflicts;
  }

  /**
   * Get the appropriate merge strategy for a property path.
   */
  private getStrategyForPath(path: string): MergeStrategy {
    // Check for custom strategy
    if (this.strategyRegistry.find(path)) {
      return 'custom';
    }

    // Use heuristics based on path patterns
    if (path.includes('environmentVariables') || path.includes('tags') || path.includes('capabilities')) {
      return 'union';
    }

    if (path.includes('memory') || path.includes('throughput') || path.includes('size') || path.includes('retention')) {
      return 'maximum';
    }

    if (path.includes('required') || path.includes('common')) {
      return 'intersection';
    }

    // Default strategy
    return this.options.defaultStrategy;
  }

  /**
   * Format error message for reporting.
   */
  private formatErrorMessage(
    conflicts: ReadonlyArray<ConfigConflict>,
    errors: ReadonlyArray<ValidationError>
  ): string {
    const lines: string[] = [];

    if (conflicts.length > 0) {
      lines.push('Unresolvable Conflicts:');
      for (const conflict of conflicts) {
        lines.push(`  - ${conflict.path}: ${conflict.reason}`);
        for (const val of conflict.values) {
          lines.push(`    ${val.source}: ${JSON.stringify(val.value)}`);
        }
      }
    }

    if (errors.length > 0) {
      lines.push('Validation Errors:');
      for (const error of errors) {
        lines.push(`  - ${error.path}: ${error.message}`);
        if (error.actualValue !== undefined) {
          lines.push(`    Actual: ${JSON.stringify(error.actualValue)}`);
        }
        if (error.expected) {
          lines.push(`    Expected: ${error.expected}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Get merge traces (if tracing is enabled).
   */
  getTraces(): ReadonlyArray<MergeTrace> {
    return [...this.traces];
  }

  /**
   * Clear merge traces.
   */
  clearTraces(): void {
    this.traces.length = 0;
  }
}

/**
 * Environment variable namespacing utilities.
 */
export class EnvironmentVariableNamespace {
  /**
   * Create a namespaced environment variable name.
   *
   * @param componentId Component identifier
   * @param varName Variable name
   * @returns Namespaced variable name
   *
   * @example
   * namespaceEnvVar('UserApi', 'COSMOS_ENDPOINT')
   * // Returns: 'USER_API_COSMOS_ENDPOINT'
   */
  static namespace(componentId: string, varName: string): string {
    const normalizedId = componentId
      .replace(/([a-z])([A-Z])/g, '$1_$2') // CamelCase to snake_case
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_') // Remove non-alphanumeric except underscore
      .replace(/_+/g, '_') // Collapse multiple underscores
      .replace(/^_|_$/g, ''); // Trim underscores

    const normalizedVar = varName
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    return `${normalizedId}_${normalizedVar}`;
  }

  /**
   * Merge environment variables from multiple components with namespacing.
   *
   * @param requirements Resource requirements with environment variables
   * @returns Merged environment variables map
   */
  static mergeEnvironmentVariables(
    requirements: ReadonlyArray<IResourceRequirement>
  ): Record<string, string> {
    const merged: Record<string, string> = {};
    const conflicts: string[] = [];

    for (const req of requirements) {
      const envVars = (req.config.environmentVariables as Record<string, string>) ?? {};
      const componentId = req.componentId ?? 'unknown';

      for (const [key, value] of Object.entries(envVars)) {
        const namespacedKey = this.namespace(componentId, key);

        if (merged[namespacedKey] && merged[namespacedKey] !== value) {
          conflicts.push(
            `Conflict for ${namespacedKey}: ${merged[namespacedKey]} vs ${value}`
          );
        }

        merged[namespacedKey] = value;
      }
    }

    if (conflicts.length > 0) {
      console.warn('Environment variable conflicts detected:', conflicts);
    }

    return merged;
  }

  /**
   * Extract the component ID from a namespaced variable.
   *
   * @param namespacedVar Namespaced variable name
   * @returns Component ID
   *
   * @example
   * extractComponentId('USER_API_COSMOS_ENDPOINT')
   * // Returns: 'USER_API'
   */
  static extractComponentId(namespacedVar: string): string {
    const parts = namespacedVar.split('_');
    // Assume the last part is the variable name, everything else is the component ID
    if (parts.length < 2) {
      return namespacedVar;
    }
    return parts.slice(0, -1).join('_');
  }
}

// Re-export types and utilities
export type {
  MergeStrategy,
  MergeContext,
  MergeResult,
  MergeStrategyHandler,
  CustomMergeFunction,
  ValidationResult,
  ValidationError,
  ConfigConflict,
  ValidatorFn,
  ConfigSchema,
  IncompatibilityRule
};

export {
  unionStrategy,
  intersectionStrategy,
  maximumStrategy,
  priorityStrategy,
  minimumStrategy,
  objectMergeStrategy,
  MergeStrategyRegistry,
  ConflictDetector,
  ConfigValidator,
  AzureValidators
};
