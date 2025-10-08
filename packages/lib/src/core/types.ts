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
   * @example "Digital Products"
   */
  readonly title: string;

  /**
   * Kebab-cased representation suitable for resource names.
   * @example "digital-products"
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
export abstract class NamingComponent implements INamingComponent {
  public readonly value: string;
  public readonly title: string;
  public readonly resourceName: string;

  /**
   * Creates a new naming component.
   *
   * @param options - Configuration options or simple string value
   */
  constructor(options: string | NamingComponentOptions) {
    if (typeof options === 'string') {
      this.value = options;
      this.resourceName = this.normalizeToResourceName(options);
      this.title = this.normalizeToTitle(options);
    } else {
      this.value = options.value;
      this.resourceName = options.resourceName ?? this.normalizeToResourceName(options.value);
      this.title = options.title ?? this.normalizeToTitle(options.value);
    }

    this.validate();
  }

  /**
   * Validates the component value.
   * Subclasses can override to provide specific validation.
   *
   * @throws {Error} If validation fails
   */
  protected validate(): void {
    if (!this.value || this.value.trim().length === 0) {
      throw new Error(`${this.constructor.name} value cannot be empty`);
    }

    if (!this.resourceName || this.resourceName.trim().length === 0) {
      throw new Error(`${this.constructor.name} resource name cannot be empty`);
    }
  }

  /**
   * Normalizes a value to kebab-case for resource names.
   *
   * @param value - Input value
   * @returns Kebab-cased string
   *
   * @example
   * ```typescript
   * normalizeToResourceName("Digital Products") // "digital-products"
   * normalizeToResourceName("colorai") // "colorai"
   * normalizeToResourceName("East US 2") // "east-us-2"
   * ```
   */
  protected normalizeToResourceName(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-') // Replace whitespace with hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove non-alphanumeric except hyphens
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  /**
   * Normalizes a value to Title Case for display.
   *
   * @param value - Input value
   * @returns Title-cased string
   *
   * @example
   * ```typescript
   * normalizeToTitle("digital products") // "Digital Products"
   * normalizeToTitle("colorai") // "Colorai"
   * normalizeToTitle("east-us-2") // "East-Us-2"
   * ```
   */
  protected normalizeToTitle(value: string): string {
    return value
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Returns the resource name representation when coerced to string.
   */
  public toString(): string {
    return this.resourceName;
  }

  /**
   * Returns a JSON representation of the component.
   */
  public toJSON(): { value: string; title: string; resourceName: string } {
    return {
      value: this.value,
      title: this.title,
      resourceName: this.resourceName,
    };
  }
}
