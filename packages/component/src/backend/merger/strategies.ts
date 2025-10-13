/**
 * Configuration merge strategies for the Backend pattern.
 *
 * This module implements various strategies for combining configuration
 * requirements from multiple components into a single, merged configuration.
 *
 * @module @atakora/component/backend/merger/strategies
 */

/**
 * Strategy type for merging configurations.
 */
export type MergeStrategy = 'union' | 'intersection' | 'maximum' | 'priority' | 'custom';

/**
 * Context provided during merge operations.
 */
export interface MergeContext {
  /**
   * Path to the current configuration property being merged.
   * Used for debugging and error reporting.
   *
   * @example 'config.databases[0].containers'
   */
  readonly path: string;

  /**
   * Source component IDs for each value being merged.
   * Parallel array to the values being merged.
   */
  readonly sources: ReadonlyArray<string>;

  /**
   * Priority values for each requirement.
   * Higher priority wins conflicts.
   *
   * Default: 10
   * Component-specific: 20
   * User-override: 30
   */
  readonly priorities: ReadonlyArray<number>;

  /**
   * Additional metadata for debugging and tracing.
   */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Result of a merge operation.
 */
export interface MergeResult<T> {
  /**
   * The merged value.
   */
  readonly value: T;

  /**
   * Warning messages about the merge operation.
   * Non-fatal issues that should be reported to users.
   */
  readonly warnings?: ReadonlyArray<string>;

  /**
   * Strategy used for the merge.
   */
  readonly strategyUsed: MergeStrategy;

  /**
   * Sources that contributed to the final value.
   */
  readonly contributingSources: ReadonlyArray<string>;
}

/**
 * Handler function for merge strategies.
 *
 * @template T The type of value being merged
 * @param values Array of values to merge
 * @param context Context information for the merge
 * @returns Merge result with merged value and metadata
 */
export type MergeStrategyHandler<T> = (
  values: ReadonlyArray<T>,
  context: MergeContext
) => MergeResult<T>;

/**
 * Custom merge function definition.
 */
export interface CustomMergeFunction<T = unknown> {
  /**
   * Property path this custom function applies to.
   * Supports wildcards (e.g., 'config.*.enabled')
   */
  readonly path: string | RegExp;

  /**
   * The merge handler function.
   */
  readonly handler: MergeStrategyHandler<T>;

  /**
   * Optional description of what this custom merger does.
   */
  readonly description?: string;
}

/**
 * Union strategy: Combines all values into a single collection.
 *
 * Use for:
 * - Environment variables
 * - Tags
 * - Capabilities
 * - Extensions
 *
 * @example
 * unionStrategy(['var1', 'var2'], ['var2', 'var3'])
 * // Returns: ['var1', 'var2', 'var3'] (deduplicated)
 *
 * @template T The array element type
 * @param values Arrays to union
 * @param context Merge context
 * @returns Union of all arrays with duplicates removed
 */
export function unionStrategy<T>(
  values: ReadonlyArray<ReadonlyArray<T>>,
  context: MergeContext
): MergeResult<ReadonlyArray<T>> {
  const seen = new Set<string>();
  const result: T[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < values.length; i++) {
    const array = values[i];
    const source = context.sources[i];

    for (const item of array) {
      const key = JSON.stringify(item);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
  }

  return {
    value: result,
    warnings: warnings.length > 0 ? warnings : undefined,
    strategyUsed: 'union',
    contributingSources: context.sources as string[]
  };
}

/**
 * Intersection strategy: Returns only values present in all collections.
 *
 * Use for:
 * - Required network rules
 * - Common capabilities
 * - Shared constraints
 *
 * @example
 * intersectionStrategy([['a', 'b', 'c'], ['b', 'c', 'd']])
 * // Returns: ['b', 'c']
 *
 * @template T The array element type
 * @param values Arrays to intersect
 * @param context Merge context
 * @returns Intersection of all arrays
 */
export function intersectionStrategy<T>(
  values: ReadonlyArray<ReadonlyArray<T>>,
  context: MergeContext
): MergeResult<ReadonlyArray<T>> {
  if (values.length === 0) {
    return {
      value: [],
      strategyUsed: 'intersection',
      contributingSources: []
    };
  }

  if (values.length === 1) {
    return {
      value: [...values[0]],
      strategyUsed: 'intersection',
      contributingSources: [context.sources[0]]
    };
  }

  // Start with the first array
  const firstArray = values[0];
  const result: T[] = [];
  const warnings: string[] = [];

  // Check each item in the first array
  for (const item of firstArray) {
    const key = JSON.stringify(item);
    let presentInAll = true;

    // Check if this item exists in all other arrays
    for (let i = 1; i < values.length; i++) {
      const array = values[i];
      const found = array.some(other => JSON.stringify(other) === key);
      if (!found) {
        presentInAll = false;
        warnings.push(
          `Value ${key} from ${context.sources[0]} not present in ${context.sources[i]}, excluding from intersection at ${context.path}`
        );
        break;
      }
    }

    if (presentInAll) {
      result.push(item);
    }
  }

  if (result.length === 0) {
    warnings.push(
      `Intersection at ${context.path} resulted in empty array. Sources: ${context.sources.join(', ')}`
    );
  }

  return {
    value: result,
    warnings: warnings.length > 0 ? warnings : undefined,
    strategyUsed: 'intersection',
    contributingSources: context.sources as string[]
  };
}

/**
 * Maximum strategy: Selects the highest value.
 *
 * Use for:
 * - SKU tiers
 * - Memory allocations
 * - Throughput limits
 * - Retention periods
 *
 * @example
 * maximumStrategy([512, 1024, 256])
 * // Returns: 1024
 *
 * @param values Numbers to compare
 * @param context Merge context
 * @returns The maximum value
 */
export function maximumStrategy(
  values: ReadonlyArray<number>,
  context: MergeContext
): MergeResult<number> {
  if (values.length === 0) {
    throw new Error(`Cannot find maximum of empty array at ${context.path}`);
  }

  let maxValue = values[0];
  let maxIndex = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] > maxValue) {
      maxValue = values[i];
      maxIndex = i;
    }
  }

  const warnings: string[] = [];
  if (values.length > 1) {
    const otherValues = values.filter((_, i) => i !== maxIndex);
    warnings.push(
      `Selected maximum value ${maxValue} from ${context.sources[maxIndex]} at ${context.path}. Other values: ${otherValues.join(', ')}`
    );
  }

  return {
    value: maxValue,
    warnings: warnings.length > 0 ? warnings : undefined,
    strategyUsed: 'maximum',
    contributingSources: [context.sources[maxIndex]]
  };
}

/**
 * Priority strategy: Selects value from highest priority requirement.
 *
 * Priority levels:
 * - Default: 10
 * - Component-specific: 20
 * - User-override: 30
 *
 * Use for:
 * - Boolean flags
 * - String values
 * - Enum selections
 * - Single-value configurations
 *
 * @example
 * priorityStrategy(
 *   ['serverless', 'provisioned', 'serverless'],
 *   { priorities: [10, 20, 15], sources: ['A', 'B', 'C'] }
 * )
 * // Returns: 'provisioned' (priority 20 from source B)
 *
 * @template T The value type
 * @param values Values to select from
 * @param context Merge context with priorities
 * @returns Value from highest priority source
 */
export function priorityStrategy<T>(
  values: ReadonlyArray<T>,
  context: MergeContext
): MergeResult<T> {
  if (values.length === 0) {
    throw new Error(`Cannot select from empty values at ${context.path}`);
  }

  if (values.length === 1) {
    return {
      value: values[0],
      strategyUsed: 'priority',
      contributingSources: [context.sources[0]]
    };
  }

  // Find the highest priority
  let maxPriority = context.priorities[0];
  let maxIndex = 0;

  for (let i = 1; i < context.priorities.length; i++) {
    if (context.priorities[i] > maxPriority) {
      maxPriority = context.priorities[i];
      maxIndex = i;
    }
  }

  const warnings: string[] = [];

  // Check for conflicts (different values with same priority)
  const samePriorityIndices = context.priorities
    .map((p, i) => ({ priority: p, index: i }))
    .filter(x => x.priority === maxPriority)
    .map(x => x.index);

  if (samePriorityIndices.length > 1) {
    const conflictValues = samePriorityIndices.map(i => ({
      value: values[i],
      source: context.sources[i]
    }));

    const allSame = conflictValues.every(
      cv => JSON.stringify(cv.value) === JSON.stringify(conflictValues[0].value)
    );

    if (!allSame) {
      warnings.push(
        `Conflict at ${context.path}: Multiple sources with priority ${maxPriority} have different values. ` +
        `Using value from ${context.sources[maxIndex]}. ` +
        `Conflicting sources: ${samePriorityIndices.map(i => context.sources[i]).join(', ')}`
      );
    }
  }

  // Warn about overridden values
  const overriddenIndices = context.priorities
    .map((p, i) => ({ priority: p, index: i }))
    .filter(x => x.priority < maxPriority && JSON.stringify(values[x.index]) !== JSON.stringify(values[maxIndex]))
    .map(x => x.index);

  if (overriddenIndices.length > 0) {
    warnings.push(
      `Value from ${context.sources[maxIndex]} (priority ${maxPriority}) overriding ` +
      `${overriddenIndices.length} lower priority value(s) at ${context.path}`
    );
  }

  return {
    value: values[maxIndex],
    warnings: warnings.length > 0 ? warnings : undefined,
    strategyUsed: 'priority',
    contributingSources: [context.sources[maxIndex]]
  };
}

/**
 * Minimum strategy: Selects the lowest value.
 *
 * Use for:
 * - Cost optimization
 * - Resource minimums
 * - Conservative limits
 *
 * @param values Numbers to compare
 * @param context Merge context
 * @returns The minimum value
 */
export function minimumStrategy(
  values: ReadonlyArray<number>,
  context: MergeContext
): MergeResult<number> {
  if (values.length === 0) {
    throw new Error(`Cannot find minimum of empty array at ${context.path}`);
  }

  let minValue = values[0];
  let minIndex = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] < minValue) {
      minValue = values[i];
      minIndex = i;
    }
  }

  const warnings: string[] = [];
  if (values.length > 1) {
    const otherValues = values.filter((_, i) => i !== minIndex);
    warnings.push(
      `Selected minimum value ${minValue} from ${context.sources[minIndex]} at ${context.path}. Other values: ${otherValues.join(', ')}`
    );
  }

  return {
    value: minValue,
    warnings: warnings.length > 0 ? warnings : undefined,
    strategyUsed: 'maximum', // Note: reusing maximum type for consistency
    contributingSources: [context.sources[minIndex]]
  };
}

/**
 * Object merge strategy: Deep merges objects using specified strategies for nested properties.
 *
 * @template T The object type
 * @param values Objects to merge
 * @param context Merge context
 * @param strategies Strategy map for nested properties
 * @returns Merged object
 */
export function objectMergeStrategy<T extends Record<string, unknown>>(
  values: ReadonlyArray<T>,
  context: MergeContext,
  strategies: Map<string, MergeStrategyHandler<unknown>>
): MergeResult<T> {
  if (values.length === 0) {
    throw new Error(`Cannot merge empty object array at ${context.path}`);
  }

  if (values.length === 1) {
    return {
      value: { ...values[0] },
      strategyUsed: 'custom',
      contributingSources: [context.sources[0]]
    };
  }

  const result: Record<string, unknown> = {};
  const allWarnings: string[] = [];
  const allContributingSources = new Set<string>();

  // Collect all unique keys
  const allKeys = new Set<string>();
  for (const obj of values) {
    for (const key of Object.keys(obj)) {
      allKeys.add(key);
    }
  }

  // Merge each key
  for (const key of allKeys) {
    const propertyPath = `${context.path}.${key}`;
    const propertyValues = values
      .map((obj, i) => ({ value: obj[key], source: context.sources[i], priority: context.priorities[i] }))
      .filter(x => x.value !== undefined);

    if (propertyValues.length === 0) {
      continue;
    }

    if (propertyValues.length === 1) {
      result[key] = propertyValues[0].value;
      allContributingSources.add(propertyValues[0].source);
      continue;
    }

    // Find appropriate strategy for this property
    const strategy = strategies.get(propertyPath) || strategies.get(`*.${key}`) || priorityStrategy;

    const propertyContext: MergeContext = {
      path: propertyPath,
      sources: propertyValues.map(pv => pv.source),
      priorities: propertyValues.map(pv => pv.priority),
      metadata: context.metadata
    };

    try {
      const mergeResult = strategy(
        propertyValues.map(pv => pv.value),
        propertyContext
      );

      result[key] = mergeResult.value;
      if (mergeResult.warnings) {
        allWarnings.push(...mergeResult.warnings);
      }
      for (const source of mergeResult.contributingSources) {
        allContributingSources.add(source);
      }
    } catch (error) {
      allWarnings.push(
        `Failed to merge property ${propertyPath}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return {
    value: result as T,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
    strategyUsed: 'custom',
    contributingSources: Array.from(allContributingSources)
  };
}

/**
 * Registry for custom merge functions.
 */
export class MergeStrategyRegistry {
  private readonly customStrategies = new Map<string, CustomMergeFunction>();

  /**
   * Register a custom merge function for a specific property path.
   *
   * @param customFn Custom merge function definition
   */
  register(customFn: CustomMergeFunction): void {
    const key = typeof customFn.path === 'string' ? customFn.path : customFn.path.source;
    this.customStrategies.set(key, customFn);
  }

  /**
   * Find a custom merge function for a property path.
   *
   * @param path Property path to search for
   * @returns Custom merge function if found
   */
  find(path: string): CustomMergeFunction | undefined {
    // Exact match
    if (this.customStrategies.has(path)) {
      return this.customStrategies.get(path);
    }

    // Pattern match
    for (const [key, fn] of this.customStrategies) {
      if (fn.path instanceof RegExp && fn.path.test(path)) {
        return fn;
      }
    }

    return undefined;
  }

  /**
   * Get all registered custom strategies.
   */
  getAll(): ReadonlyArray<CustomMergeFunction> {
    return Array.from(this.customStrategies.values());
  }

  /**
   * Clear all custom strategies.
   */
  clear(): void {
    this.customStrategies.clear();
  }
}
