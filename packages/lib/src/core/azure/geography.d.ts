import { NamingComponent, type NamingComponentOptions } from '../types';
/**
 * Represents an Azure location/region where resources will be deployed.
 *
 * @remarks
 * This class defines the actual Azure region for template deployment and resource provisioning.
 * It provides:
 * - The Azure location string for ARM templates (e.g., "eastus")
 * - A short abbreviation for resource naming (e.g., "eus")
 * - Display name for documentation (e.g., "East US")
 *
 * The `location` property should be used when deploying ARM templates.
 * The `abbreviation` property should be used in resource names to keep them concise.
 *
 * @example
 * Defining deployment location:
 * ```typescript
 * const geo = new Geography('eastus');
 * console.log(geo.location);     // "eastus" - Use this for ARM template deployment
 * console.log(geo.abbreviation); // "eus" - Use this in resource names
 * console.log(geo.displayName);  // "East US"
 * console.log(geo.resourceName); // "eastus" - For naming components
 * ```
 *
 * @example
 * Using with ARM templates:
 * ```typescript
 * const geo = Geography.fromValue('eastus');
 *
 * // Deploy to this location
 * const template = {
 *   location: geo.location,  // "eastus"
 *   resources: [...]
 * };
 * ```
 */
export declare class Geography extends NamingComponent {
    /**
     * The Azure location string for ARM template deployment.
     * This is the value that should be used in the "location" field of ARM templates.
     *
     * @example "eastus", "westus2", "northeurope"
     */
    readonly location: string;
    /**
     * Short abbreviation for the geography, suitable for resource names.
     * Use this in resource names to keep them concise.
     *
     * @example "eus" for eastus, "wus2" for westus2
     */
    readonly abbreviation: string;
    /**
     * Human-readable display name for the region.
     *
     * @example "East US", "West US 2", "North Europe"
     */
    readonly displayName: string;
    /**
     * Creates a new Geography instance.
     *
     * @param options - Azure location name or configuration options
     *
     * @throws {Error} If geography value is empty or invalid
     *
     * @example
     * ```typescript
     * const geo1 = new Geography('eastus');
     * console.log(geo1.location);     // "eastus"
     * console.log(geo1.abbreviation); // "eus"
     * console.log(geo1.displayName);  // "East US"
     *
     * const geo2 = new Geography({
     *   value: 'eastus',
     *   resourceName: 'eastus',
     *   abbreviation: 'eus'
     * });
     * ```
     */
    constructor(options: string | (NamingComponentOptions & {
        abbreviation?: string;
        displayName?: string;
    }));
    /**
     * Validates the geography value.
     *
     * @throws {Error} If validation fails
     */
    protected validate(): void;
    /**
     * Azure region abbreviations for common regions.
     *
     * @see {@link https://learn.microsoft.com/en-us/azure/availability-zones/cross-region-replication-azure}
     */
    static readonly ABBREVIATIONS: Record<string, string>;
    /**
     * Human-readable display names for Azure regions.
     *
     * @see {@link https://learn.microsoft.com/en-us/azure/availability-zones/cross-region-replication-azure}
     */
    static readonly DISPLAY_NAMES: Record<string, string>;
    /**
     * Creates a Geography from an Azure region name, automatically applying abbreviations and display name.
     *
     * @param value - Azure region name (e.g., "eastus", "westus2")
     * @returns Geography instance representing the deployment location
     *
     * @example
     * ```typescript
     * const geo = Geography.fromValue('eastus');
     * console.log(geo.location);     // "eastus" - For ARM template deployment
     * console.log(geo.abbreviation); // "eus" - For resource naming
     * console.log(geo.displayName);  // "East US" - For documentation
     * ```
     */
    static fromValue(value: string): Geography;
    /**
     * Gets a list of all supported Azure regions.
     *
     * @returns Array of supported region names
     */
    static getSupportedRegions(): string[];
    /**
     * Checks if a region is supported.
     *
     * @param region - Region name to check
     * @returns True if region is supported
     */
    static isSupported(region: string): boolean;
}
//# sourceMappingURL=geography.d.ts.map