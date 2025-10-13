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
export declare class Instance extends NamingComponent {
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
    constructor(options: string | NamingComponentOptions);
    /**
     * Normalizes instance value to Title Case.
     * For numeric values, returns as-is.
     *
     * @param value - Input value
     * @returns Normalized title
     */
    protected normalizeToTitle(value: string): string;
    /**
     * Validates the instance value.
     *
     * @throws {Error} If validation fails
     */
    protected validate(): void;
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
    static fromNumber(num: number, padLength?: number): Instance;
    /**
     * Checks if the instance identifier is numeric.
     *
     * @returns True if instance is purely numeric
     */
    isNumeric(): boolean;
    /**
     * Gets the numeric value if instance is numeric.
     *
     * @returns Numeric value or undefined if not numeric
     */
    toNumber(): number | undefined;
    /**
     * Predefined instance identifiers for common use cases.
     */
    static readonly INSTANCE_01: Instance;
    static readonly INSTANCE_02: Instance;
    static readonly INSTANCE_03: Instance;
    static readonly PRIMARY: Instance;
    static readonly SECONDARY: Instance;
    static readonly TERTIARY: Instance;
}
//# sourceMappingURL=instance.d.ts.map