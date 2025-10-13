/**
 * Base interface for naming component value objects.
 * All naming components (Organization, Project, Geography, etc.) implement this interface.
 */
export interface INamingComponent {
    /**
     * The original input value provided by the user.
     */
    readonly value: string;
    /**
     * Title-cased representation suitable for display.
     * @example "Digital Minion"
     */
    readonly title: string;
    /**
     * Kebab-cased representation suitable for resource names.
     * @example "digital-minion"
     */
    readonly resourceName: string;
    /**
     * Returns the resource name representation.
     * Convenience method for string coercion.
     */
    toString(): string;
}
/**
 * Configuration options for creating naming components.
 */
export interface NamingComponentOptions {
    /**
     * The input value to normalize.
     */
    readonly value: string;
    /**
     * Optional custom resource name override.
     * If not provided, will be auto-generated from value.
     */
    readonly resourceName?: string;
    /**
     * Optional custom title override.
     * If not provided, will be auto-generated from value.
     */
    readonly title?: string;
}
/**
 * Abstract base class for naming component value objects.
 * Provides common normalization and validation logic.
 *
 * @abstract
 */
export declare abstract class NamingComponent implements INamingComponent {
    readonly value: string;
    readonly title: string;
    readonly resourceName: string;
    /**
     * Creates a new naming component.
     *
     * @param options - Configuration options or simple string value
     */
    constructor(options: string | NamingComponentOptions);
    /**
     * Validates the component value.
     * Subclasses can override to provide specific validation.
     *
     * @throws {Error} If validation fails
     */
    protected validate(): void;
    /**
     * Normalizes a value to kebab-case for resource names.
     *
     * @param value - Input value
     * @returns Kebab-cased string
     *
     * @example
     * ```typescript
     * normalizeToResourceName("Digital Minion") // "digital-minion"
     * normalizeToResourceName("authr") // "authr"
     * normalizeToResourceName("East US 2") // "east-us-2"
     * ```
     */
    protected normalizeToResourceName(value: string): string;
    /**
     * Normalizes a value to Title Case for display.
     *
     * @param value - Input value
     * @returns Title-cased string
     *
     * @example
     * ```typescript
     * normalizeToTitle("Digital Minion") // "Digital Minion"
     * normalizeToTitle("authr") // "Colorai"
     * normalizeToTitle("east-us-2") // "East-Us-2"
     * ```
     */
    protected normalizeToTitle(value: string): string;
    /**
     * Returns the resource name representation when coerced to string.
     */
    toString(): string;
    /**
     * Returns a JSON representation of the component.
     */
    toJSON(): {
        value: string;
        title: string;
        resourceName: string;
    };
}
//# sourceMappingURL=types.d.ts.map