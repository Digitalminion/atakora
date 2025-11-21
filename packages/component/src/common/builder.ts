/**
 * Base Builder Infrastructure
 *
 * @remarks
 * Provides the foundation for all fluent API builders in the component package.
 * Implements method chaining, conditional configuration, and internal state management.
 *
 * @example
 * ```typescript
 * class MyBuilder extends BaseBuilder<MyConfig> {
 *   constructor() {
 *     super({ type: 'my-type' });
 *   }
 *
 *   name(value: string): this {
 *     this.config.name = value;
 *     return this;
 *   }
 *
 *   build(): MyConfig {
 *     this.validate();
 *     return this.config;
 *   }
 * }
 * ```
 *
 * @packageDocumentation
 */

/**
 * Base class for all fluent API builders
 *
 * @typeParam TConfig - The configuration object type that this builder produces
 *
 * @public
 */
export abstract class BaseBuilder<TConfig extends Record<string, any>> {
  /**
   * Internal configuration state
   * @protected
   */
  protected config: TConfig;

  /**
   * Create a new builder with initial configuration
   *
   * @param initialConfig - Initial configuration values
   */
  constructor(initialConfig: TConfig) {
    this.config = { ...initialConfig };
  }

  /**
   * Conditionally apply configuration
   *
   * @param condition - Condition to evaluate
   * @param configureFn - Function to apply configuration if condition is true
   * @returns This builder instance for chaining
   *
   * @example
   * ```typescript
   * const isProd = process.env.NODE_ENV === 'production';
   *
   * const database = storage.cosmosDb()
   *   .name('my-db')
   *   .when(isProd, db => db
   *     .mode('Autoscale')
   *     .multiRegion(['eastus', 'westus'])
   *   )
   *   .when(!isProd, db => db.mode('Serverless'));
   * ```
   *
   * @public
   */
  when(condition: boolean, configureFn: (builder: this) => this): this {
    if (condition) {
      return configureFn(this);
    }
    return this;
  }

  /**
   * Build the final configuration object
   *
   * @returns The built configuration
   *
   * @remarks
   * Subclasses should override this method to perform validation
   * and return the final configuration object.
   *
   * @public
   */
  abstract build(): TConfig;

  /**
   * Validate the current configuration
   *
   * @throws Error if validation fails
   *
   * @remarks
   * Subclasses should override this method to implement custom validation logic.
   * This method is typically called from the build() method.
   *
   * @protected
   */
  protected validate(): void {
    // Default: no validation
    // Subclasses can override to add validation
  }

  /**
   * Get a clone of the current configuration
   *
   * @returns A deep copy of the current configuration
   *
   * @remarks
   * Useful for creating snapshots or comparing configurations.
   *
   * @protected
   */
  protected getConfigClone(): TConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Merge additional configuration into the current state
   *
   * @param additional - Additional configuration to merge
   * @returns This builder instance for chaining
   *
   * @remarks
   * Performs a shallow merge. For deep merging, use mergeDeep() instead.
   *
   * @protected
   */
  protected merge(additional: Partial<TConfig>): this {
    this.config = { ...this.config, ...additional };
    return this;
  }

  /**
   * Deep merge additional configuration into the current state
   *
   * @param additional - Additional configuration to merge
   * @returns This builder instance for chaining
   *
   * @remarks
   * Recursively merges nested objects.
   *
   * @protected
   */
  protected mergeDeep(additional: Partial<TConfig>): this {
    this.config = this.deepMerge(this.config, additional);
    return this;
  }

  /**
   * Deep merge two objects
   * @internal
   */
  private deepMerge<T extends Record<string, any>>(
    target: T,
    source: Partial<T>
  ): T {
    const result = { ...target };

    for (const key in source) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (this.isPlainObject(sourceValue) && this.isPlainObject(targetValue)) {
        // Recursively merge objects
        result[key] = this.deepMerge(targetValue, sourceValue) as T[Extract<keyof T, string>];
      } else if (sourceValue !== undefined) {
        // Override with source value
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }

    return result;
  }

  /**
   * Check if value is a plain object
   * @internal
   */
  private isPlainObject(value: unknown): value is Record<string, any> {
    return (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    );
  }
}

/**
 * Builder configuration type helper
 *
 * @typeParam T - The builder type
 *
 * @remarks
 * Extracts the configuration type from a builder class.
 *
 * @example
 * ```typescript
 * type MyConfig = BuilderConfig<MyBuilder>;
 * ```
 *
 * @public
 */
export type BuilderConfig<T> = T extends BaseBuilder<infer C> ? C : never;

/**
 * Type-safe builder helper for creating nested builders
 *
 * @typeParam TConfig - The configuration type
 * @typeParam TBuilder - The builder type
 *
 * @public
 */
export type NestedBuilder<TConfig, TBuilder extends BaseBuilder<TConfig>> = (
  builder: TBuilder
) => TBuilder;
