import { NamingComponent, type NamingComponentOptions } from '../types';

/**
 * Represents an organization name in Azure resource naming.
 *
 * @remarks
 * Organizations are typically business units or departments that own Azure resources.
 * This class normalizes organization names for consistent use across resource names.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const org = new Organization('digital products');
 * console.log(org.value);        // "digital products"
 * console.log(org.title);        // "Digital Products"
 * console.log(org.resourceName); // "digital-products"
 * ```
 *
 * @example
 * With custom values:
 * ```typescript
 * const org = new Organization({
 *   value: 'Digital Products Division',
 *   resourceName: 'dp',
 *   title: 'Digital Products'
 * });
 * console.log(org.resourceName); // "dp"
 * ```
 */
export class Organization extends NamingComponent {
  /**
   * Creates a new Organization instance.
   *
   * @param options - Organization name or configuration options
   *
   * @throws {Error} If organization value is empty or invalid
   *
   * @example
   * ```typescript
   * // Simple string
   * const org1 = new Organization('digital products');
   *
   * // With custom resource name
   * const org2 = new Organization({
   *   value: 'Digital Products',
   *   resourceName: 'dp'
   * });
   * ```
   */
  constructor(options: string | NamingComponentOptions) {
    super(options);
  }

  /**
   * Validates the organization value.
   *
   * @throws {Error} If validation fails
   */
  protected validate(): void {
    super.validate();

    // Organization-specific validation
    if (this.resourceName.length > 30) {
      throw new Error(
        `Organization resource name must not exceed 30 characters (current: ${this.resourceName.length})`
      );
    }

    if (!/^[a-z0-9-]+$/.test(this.resourceName)) {
      throw new Error(
        `Organization resource name can only contain lowercase letters, numbers, and hyphens`
      );
    }

    if (this.resourceName.startsWith('-') || this.resourceName.endsWith('-')) {
      throw new Error(`Organization resource name cannot start or end with a hyphen`);
    }
  }

  /**
   * Common organization abbreviations for well-known organizations.
   */
  public static readonly ABBREVIATIONS: Record<string, string> = {
    'digital products': 'dp',
    'digital-products': 'dp',
    engineering: 'eng',
    marketing: 'mkt',
    'information technology': 'it',
    finance: 'fin',
    'human resources': 'hr',
    operations: 'ops',
    sales: 'sales',
  };

  /**
   * Creates an Organization from a known abbreviation or full name.
   *
   * @param value - Organization name or abbreviation
   * @returns Organization instance
   *
   * @example
   * ```typescript
   * const org = Organization.fromValue('digital products');
   * // Uses abbreviation "dp" for resource name
   * ```
   */
  public static fromValue(value: string): Organization {
    const normalized = value.toLowerCase().trim();
    const abbreviation = Organization.ABBREVIATIONS[normalized];

    if (abbreviation) {
      return new Organization({
        value,
        resourceName: abbreviation,
      });
    }

    return new Organization(value);
  }
}
