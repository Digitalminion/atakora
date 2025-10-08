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
export class Environment extends NamingComponent {
  /**
   * Short abbreviation for the environment, suitable for resource names.
   */
  public readonly abbreviation: string;

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
  constructor(options: string | (NamingComponentOptions & { abbreviation?: string })) {
    super(options);

    if (typeof options === 'string') {
      this.abbreviation = Environment.ABBREVIATIONS[options.toLowerCase()] ?? this.resourceName;
    } else {
      this.abbreviation =
        options.abbreviation ??
        Environment.ABBREVIATIONS[options.value.toLowerCase()] ??
        this.resourceName;
    }
  }

  /**
   * Validates the environment value.
   *
   * @throws {Error} If validation fails
   */
  protected validate(): void {
    super.validate();

    // Environment-specific validation
    if (this.resourceName.length > 15) {
      throw new Error(
        `Environment resource name must not exceed 15 characters (current: ${this.resourceName.length})`
      );
    }

    if (!/^[a-z0-9-]+$/.test(this.resourceName)) {
      throw new Error(
        `Environment resource name can only contain lowercase letters, numbers, and hyphens`
      );
    }
  }

  /**
   * Standard environment abbreviations.
   */
  public static readonly ABBREVIATIONS: Record<string, string> = {
    development: 'dev',
    dev: 'dev',
    test: 'test',
    testing: 'test',
    qa: 'qa',
    'quality-assurance': 'qa',
    staging: 'stg',
    stg: 'stg',
    uat: 'uat',
    'user-acceptance': 'uat',
    nonprod: 'nonprod',
    'non-prod': 'nonprod',
    'non-production': 'nonprod',
    production: 'prod',
    prod: 'prod',
    sandbox: 'sbx',
    sbx: 'sbx',
    demo: 'demo',
    poc: 'poc',
    'proof-of-concept': 'poc',
  };

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
  public static fromValue(value: string): Environment {
    const normalized = value.toLowerCase().trim();
    const abbreviation = Environment.ABBREVIATIONS[normalized];

    return new Environment({
      value,
      abbreviation,
    });
  }

  /**
   * Gets a list of all supported environments.
   *
   * @returns Array of supported environment names
   */
  public static getSupportedEnvironments(): string[] {
    return Object.keys(Environment.ABBREVIATIONS);
  }

  /**
   * Checks if an environment is supported.
   *
   * @param environment - Environment name to check
   * @returns True if environment is supported
   */
  public static isSupported(environment: string): boolean {
    return environment.toLowerCase() in Environment.ABBREVIATIONS;
  }

  /**
   * Predefined environment instances for common use cases.
   */
  public static readonly DEV = new Environment('development');
  public static readonly TEST = new Environment('test');
  public static readonly QA = new Environment('qa');
  public static readonly STAGING = new Environment('staging');
  public static readonly UAT = new Environment('uat');
  public static readonly NONPROD = new Environment('nonprod');
  public static readonly PROD = new Environment('production');
  public static readonly SANDBOX = new Environment('sandbox');
  public static readonly DEMO = new Environment('demo');
  public static readonly POC = new Environment('poc');
}
