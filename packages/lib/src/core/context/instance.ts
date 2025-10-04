import { NamingComponent, type NamingComponentOptions } from '../types';

/**
 * Represents an instance identifier in Azure resource naming.
 *
 * @remarks
 * Instances differentiate multiple deployments of the same resource type.
 * Typically numeric (e.g., "01", "02") but can be alphanumeric.
 *
 * @example
 * Numeric instance:
 * ```typescript
 * const instance = new Instance('01');
 * console.log(instance.value);        // "01"
 * console.log(instance.title);        // "01"
 * console.log(instance.resourceName); // "01"
 * ```
 *
 * @example
 * Alphanumeric instance:
 * ```typescript
 * const instance = new Instance('primary');
 * console.log(instance.value);        // "primary"
 * console.log(instance.title);        // "Primary"
 * console.log(instance.resourceName); // "primary"
 * ```
 */
export class Instance extends NamingComponent {
  /**
   * Creates a new Instance instance.
   *
   * @param options - Instance identifier or configuration options
   *
   * @throws {Error} If instance value is empty or invalid
   *
   * @example
   * ```typescript
   * const instance1 = new Instance('01');
   * const instance2 = new Instance('primary');
   * const instance3 = new Instance({
   *   value: '1',
   *   resourceName: '01'
   * });
   * ```
   */
  constructor(options: string | NamingComponentOptions) {
    super(options);
  }

  /**
   * Normalizes instance value to Title Case.
   * For numeric values, returns as-is.
   *
   * @param value - Input value
   * @returns Normalized title
   */
  protected normalizeToTitle(value: string): string {
    // If it's purely numeric, return as-is
    if (/^\d+$/.test(value.trim())) {
      return value.trim();
    }

    // Otherwise use standard title casing
    return super.normalizeToTitle(value);
  }

  /**
   * Validates the instance value.
   *
   * @throws {Error} If validation fails
   */
  protected validate(): void {
    super.validate();

    // Instance-specific validation
    if (this.resourceName.length > 10) {
      throw new Error(
        `Instance identifier must not exceed 10 characters (current: ${this.resourceName.length})`
      );
    }

    if (!/^[a-z0-9-]+$/.test(this.resourceName)) {
      throw new Error(
        `Instance identifier can only contain lowercase letters, numbers, and hyphens`
      );
    }
  }

  /**
   * Creates an Instance from a numeric value, ensuring proper zero-padding.
   *
   * @param num - Numeric instance identifier
   * @param padLength - Number of digits to pad to (default: 2)
   * @returns Instance with zero-padded identifier
   *
   * @example
   * ```typescript
   * const instance1 = Instance.fromNumber(1);    // "01"
   * const instance2 = Instance.fromNumber(42);   // "42"
   * const instance3 = Instance.fromNumber(3, 3); // "003"
   * ```
   */
  public static fromNumber(num: number, padLength: number = 2): Instance {
    if (!Number.isInteger(num) || num < 0) {
      throw new Error('Instance number must be a non-negative integer');
    }

    const padded = num.toString().padStart(padLength, '0');
    return new Instance(padded);
  }

  /**
   * Checks if the instance identifier is numeric.
   *
   * @returns True if instance is purely numeric
   */
  public isNumeric(): boolean {
    return /^\d+$/.test(this.resourceName);
  }

  /**
   * Gets the numeric value if instance is numeric.
   *
   * @returns Numeric value or undefined if not numeric
   */
  public toNumber(): number | undefined {
    if (this.isNumeric()) {
      return parseInt(this.resourceName, 10);
    }
    return undefined;
  }

  /**
   * Predefined instance identifiers for common use cases.
   */
  public static readonly INSTANCE_01 = new Instance('01');
  public static readonly INSTANCE_02 = new Instance('02');
  public static readonly INSTANCE_03 = new Instance('03');
  public static readonly PRIMARY = new Instance('primary');
  public static readonly SECONDARY = new Instance('secondary');
  public static readonly TERTIARY = new Instance('tertiary');
}
