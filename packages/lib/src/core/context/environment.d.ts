import { NamingComponent, type NamingComponentOptions } from '../types';
/**
 * Represents an environment in Azure resource naming.
 *
 * @remarks
 * Environments represent deployment stages such as development, staging, and production.
 * This class normalizes environment names and provides standard abbreviations.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const env = new Environment('production');
 * console.log(env.value);        // "production"
 * console.log(env.title);        // "Production"
 * console.log(env.resourceName); // "production"
 * console.log(env.abbreviation); // "prod"
 * ```
 *
 * @example
 * Using abbreviations:
 * ```typescript
 * const env = Environment.fromValue('development');
 * console.log(env.abbreviation); // "dev"
 * ```
 */
export declare class Environment extends NamingComponent {
    /**
     * Short abbreviation for the environment, suitable for resource names.
     */
    readonly abbreviation: string;
    /**
     * Creates a new Environment instance.
     *
     * @param options - Environment name or configuration options
     *
     * @throws {Error} If environment value is empty or invalid
     *
     * @example
     * ```typescript
     * const env1 = new Environment('production');
     * const env2 = new Environment({
     *   value: 'production',
     *   resourceName: 'prod',
     *   abbreviation: 'prod'
     * });
     * ```
     */
    constructor(options: string | (NamingComponentOptions & {
        abbreviation?: string;
    }));
    /**
     * Validates the environment value.
     *
     * @throws {Error} If validation fails
     */
    protected validate(): void;
    /**
     * Standard environment abbreviations.
     */
    static readonly ABBREVIATIONS: Record<string, string>;
    /**
     * Creates an Environment from a value, automatically applying abbreviations.
     *
     * @param value - Environment name
     * @returns Environment instance with appropriate abbreviation
     *
     * @example
     * ```typescript
     * const env = Environment.fromValue('production');
     * console.log(env.abbreviation); // "prod"
     * console.log(env.resourceName); // "production"
     * ```
     */
    static fromValue(value: string): Environment;
    /**
     * Gets a list of all supported environments.
     *
     * @returns Array of supported environment names
     */
    static getSupportedEnvironments(): string[];
    /**
     * Checks if an environment is supported.
     *
     * @param environment - Environment name to check
     * @returns True if environment is supported
     */
    static isSupported(environment: string): boolean;
    /**
     * Predefined environment instances for common use cases.
     */
    static readonly DEV: Environment;
    static readonly TEST: Environment;
    static readonly QA: Environment;
    static readonly STAGING: Environment;
    static readonly UAT: Environment;
    static readonly NONPROD: Environment;
    static readonly PROD: Environment;
    static readonly SANDBOX: Environment;
    static readonly DEMO: Environment;
    static readonly POC: Environment;
}
//# sourceMappingURL=environment.d.ts.map