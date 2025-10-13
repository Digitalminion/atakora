"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Geography = void 0;
var types_1 = require("../types");
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
var Geography = /** @class */ (function (_super) {
    __extends(Geography, _super);
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
    function Geography(options) {
        var _a, _b, _c, _d, _e, _f;
        var _this = _super.call(this, options) || this;
        // Set the Azure location (normalized to lowercase, no spaces)
        _this.location = _this.resourceName;
        // Set abbreviation
        if (typeof options === 'string') {
            _this.abbreviation = (_a = Geography.ABBREVIATIONS[options.toLowerCase()]) !== null && _a !== void 0 ? _a : _this.resourceName;
            _this.displayName = (_b = Geography.DISPLAY_NAMES[options.toLowerCase()]) !== null && _b !== void 0 ? _b : _this.title;
        }
        else {
            _this.abbreviation =
                (_d = (_c = options.abbreviation) !== null && _c !== void 0 ? _c : Geography.ABBREVIATIONS[options.value.toLowerCase()]) !== null && _d !== void 0 ? _d : _this.resourceName;
            _this.displayName =
                (_f = (_e = options.displayName) !== null && _e !== void 0 ? _e : Geography.DISPLAY_NAMES[options.value.toLowerCase()]) !== null && _f !== void 0 ? _f : _this.title;
        }
        return _this;
    }
    /**
     * Validates the geography value.
     *
     * @throws {Error} If validation fails
     */
    Geography.prototype.validate = function () {
        _super.prototype.validate.call(this);
        // Geography-specific validation
        if (this.resourceName.length > 20) {
            throw new Error("Geography resource name must not exceed 20 characters (current: ".concat(this.resourceName.length, ")"));
        }
        if (!/^[a-z0-9-]+$/.test(this.resourceName)) {
            throw new Error("Geography resource name can only contain lowercase letters, numbers, and hyphens");
        }
    };
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
    Geography.fromValue = function (value) {
        return new Geography(value);
    };
    /**
     * Gets a list of all supported Azure regions.
     *
     * @returns Array of supported region names
     */
    Geography.getSupportedRegions = function () {
        return Object.keys(Geography.ABBREVIATIONS);
    };
    /**
     * Checks if a region is supported.
     *
     * @param region - Region name to check
     * @returns True if region is supported
     */
    Geography.isSupported = function (region) {
        return region.toLowerCase() in Geography.ABBREVIATIONS;
    };
    /**
     * Azure region abbreviations for common regions.
     *
     * @see {@link https://learn.microsoft.com/en-us/azure/availability-zones/cross-region-replication-azure}
     */
    Geography.ABBREVIATIONS = {
        // US Regions
        eastus: 'eus',
        'east-us': 'eus',
        eastus2: 'eus2',
        'east-us-2': 'eus2',
        westus: 'wus',
        'west-us': 'wus',
        westus2: 'wus2',
        'west-us-2': 'wus2',
        westus3: 'wus3',
        'west-us-3': 'wus3',
        centralus: 'cus',
        'central-us': 'cus',
        northcentralus: 'ncus',
        'north-central-us': 'ncus',
        southcentralus: 'scus',
        'south-central-us': 'scus',
        westcentralus: 'wcus',
        'west-central-us': 'wcus',
        // Europe Regions
        northeurope: 'neu',
        'north-europe': 'neu',
        westeurope: 'weu',
        'west-europe': 'weu',
        francecentral: 'frc',
        'france-central': 'frc',
        germanywestcentral: 'dewc',
        'germany-west-central': 'dewc',
        norwayeast: 'noe',
        'norway-east': 'noe',
        swedencentral: 'sec',
        'sweden-central': 'sec',
        switzerlandnorth: 'chn',
        'switzerland-north': 'chn',
        uksouth: 'uks',
        'uk-south': 'uks',
        ukwest: 'ukw',
        'uk-west': 'ukw',
        // Asia Pacific Regions
        australiaeast: 'aue',
        'australia-east': 'aue',
        australiasoutheast: 'ause',
        'australia-southeast': 'ause',
        centralindia: 'inc',
        'central-india': 'inc',
        eastasia: 'ea',
        'east-asia': 'ea',
        japaneast: 'jpe',
        'japan-east': 'jpe',
        japanwest: 'jpw',
        'japan-west': 'jpw',
        koreacentral: 'krc',
        'korea-central': 'krc',
        southeastasia: 'sea',
        'southeast-asia': 'sea',
        southindia: 'ins',
        'south-india': 'ins',
        // Government Regions
        usgovvirginia: 'usgv',
        'us-gov-virginia': 'usgv',
        usgovarizona: 'usga',
        'us-gov-arizona': 'usga',
        usgovtexas: 'usgt',
        'us-gov-texas': 'usgt',
        // Other Regions
        brazilsouth: 'brs',
        'brazil-south': 'brs',
        canadacentral: 'cac',
        'canada-central': 'cac',
        canadaeast: 'cae',
        'canada-east': 'cae',
        southafricanorth: 'san',
        'south-africa-north': 'san',
        uaenorth: 'uaen',
        'uae-north': 'uaen',
    };
    /**
     * Human-readable display names for Azure regions.
     *
     * @see {@link https://learn.microsoft.com/en-us/azure/availability-zones/cross-region-replication-azure}
     */
    Geography.DISPLAY_NAMES = {
        // US Regions
        eastus: 'East US',
        'east-us': 'East US',
        eastus2: 'East US 2',
        'east-us-2': 'East US 2',
        westus: 'West US',
        'west-us': 'West US',
        westus2: 'West US 2',
        'west-us-2': 'West US 2',
        westus3: 'West US 3',
        'west-us-3': 'West US 3',
        centralus: 'Central US',
        'central-us': 'Central US',
        northcentralus: 'North Central US',
        'north-central-us': 'North Central US',
        southcentralus: 'South Central US',
        'south-central-us': 'South Central US',
        westcentralus: 'West Central US',
        'west-central-us': 'West Central US',
        // Europe Regions
        northeurope: 'North Europe',
        'north-europe': 'North Europe',
        westeurope: 'West Europe',
        'west-europe': 'West Europe',
        francecentral: 'France Central',
        'france-central': 'France Central',
        germanywestcentral: 'Germany West Central',
        'germany-west-central': 'Germany West Central',
        norwayeast: 'Norway East',
        'norway-east': 'Norway East',
        swedencentral: 'Sweden Central',
        'sweden-central': 'Sweden Central',
        switzerlandnorth: 'Switzerland North',
        'switzerland-north': 'Switzerland North',
        uksouth: 'UK South',
        'uk-south': 'UK South',
        ukwest: 'UK West',
        'uk-west': 'UK West',
        // Asia Pacific Regions
        australiaeast: 'Australia East',
        'australia-east': 'Australia East',
        australiasoutheast: 'Australia Southeast',
        'australia-southeast': 'Australia Southeast',
        centralindia: 'Central India',
        'central-india': 'Central India',
        eastasia: 'East Asia',
        'east-asia': 'East Asia',
        japaneast: 'Japan East',
        'japan-east': 'Japan East',
        japanwest: 'Japan West',
        'japan-west': 'Japan West',
        koreacentral: 'Korea Central',
        'korea-central': 'Korea Central',
        southeastasia: 'Southeast Asia',
        'southeast-asia': 'Southeast Asia',
        southindia: 'South India',
        'south-india': 'South India',
        // Government Regions
        usgovvirginia: 'US Gov Virginia',
        'us-gov-virginia': 'US Gov Virginia',
        usgovarizona: 'US Gov Arizona',
        'us-gov-arizona': 'US Gov Arizona',
        usgovtexas: 'US Gov Texas',
        'us-gov-texas': 'US Gov Texas',
        // Other Regions
        brazilsouth: 'Brazil South',
        'brazil-south': 'Brazil South',
        canadacentral: 'Canada Central',
        'canada-central': 'Canada Central',
        canadaeast: 'Canada East',
        'canada-east': 'Canada East',
        southafricanorth: 'South Africa North',
        'south-africa-north': 'South Africa North',
        uaenorth: 'UAE North',
        'uae-north': 'UAE North',
    };
    return Geography;
}(types_1.NamingComponent));
exports.Geography = Geography;
