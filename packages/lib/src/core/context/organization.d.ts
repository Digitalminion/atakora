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
 * const org = new Organization('Digital Minion');
 * console.log(org.value);        // "Digital Minion"
 * console.log(org.title);        // "Digital Minion"
 * console.log(org.resourceName); // "digital-minion"
 * ```
 *
 * @example
 * With custom values:
 * ```typescript
 * const org = new Organization({
 *   value: 'Digital Minion Division',
 *   resourceName: 'dp',
 *   title: 'Digital Minion'
 * });
 * console.log(org.resourceName); // "dp"
 * ```
 */
export declare class Organization extends NamingComponent {
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
     * const org1 = new Organization('Digital Minion');
     *
     * // With custom resource name
     * const org2 = new Organization({
     *   value: 'Digital Minion',
     *   resourceName: 'dp'
     * });
     * ```
     */
    constructor(options: string | NamingComponentOptions);
    /**
     * Validates the organization value.
     *
     * @throws {Error} If validation fails
     */
    protected validate(): void;
    /**
     * Common organization abbreviations for well-known organizations.
     */
    static readonly ABBREVIATIONS: Record<string, string>;
    /**
     * Creates an Organization from a known abbreviation or full name.
     *
     * @param value - Organization name or abbreviation
     * @returns Organization instance
     *
     * @example
     * ```typescript
     * const org = Organization.fromValue('Digital Minion');
     * // Uses abbreviation "dp" for resource name
     * ```
     */
    static fromValue(value: string): Organization;
}
//# sourceMappingURL=organization.d.ts.map