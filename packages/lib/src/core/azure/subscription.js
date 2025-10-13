"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscription = void 0;
/**
 * Represents an Azure Subscription.
 *
 * @remarks
 * Subscriptions are the billing and deployment boundary in Azure.
 * They contain resource groups and have a default location.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const subscription = new Subscription({
 *   subscriptionId: '12345678-1234-1234-1234-123456789abc',
 *   displayName: 'NonProd Subscription',
 *   tenantId: '87654321-4321-4321-4321-cba987654321'
 * });
 *
 * console.log(subscription.subscriptionId);  // Full GUID
 * console.log(subscription.abbreviation);    // 'sub01' for naming
 * console.log(subscription.resourceName);    // 'sub-nonprod'
 * ```
 *
 * @example
 * From ID only:
 * ```typescript
 * const sub = Subscription.fromId('12345678-1234-1234-1234-123456789abc');
 * ```
 */
var Subscription = /** @class */ (function () {
    /**
     * Creates a new Subscription instance.
     *
     * @param props - Subscription configuration
     * @throws {Error} If subscription ID is invalid
     *
     * @example
     * ```typescript
     * const sub = new Subscription({
     *   subscriptionId: '12345678-1234-1234-1234-123456789abc',
     *   displayName: 'Production Subscription',
     *   abbreviation: 'prod'
     * });
     * ```
     */
    function Subscription(props) {
        var _a, _b;
        // Validate subscription ID format
        if (!Subscription.validateSubscriptionId(props.subscriptionId)) {
            throw new Error("Invalid subscription ID format: ".concat(props.subscriptionId, ". Must be a valid GUID."));
        }
        this.subscriptionId = props.subscriptionId;
        this.displayName = props.displayName;
        this.tenantId = props.tenantId;
        // Auto-generate abbreviation if not provided
        this.abbreviation = (_a = props.abbreviation) !== null && _a !== void 0 ? _a : this.generateAbbreviation();
        // Auto-generate resource name if not provided
        this.resourceName = (_b = props.resourceName) !== null && _b !== void 0 ? _b : this.generateResourceName(props.displayName);
    }
    /**
     * Create a Subscription from subscription ID only.
     *
     * @param subscriptionId - Azure subscription GUID
     * @returns Subscription instance
     *
     * @example
     * ```typescript
     * const sub = Subscription.fromId('12345678-1234-1234-1234-123456789abc');
     * ```
     */
    Subscription.fromId = function (subscriptionId) {
        return new Subscription({ subscriptionId: subscriptionId });
    };
    /**
     * Validate subscription ID format (GUID).
     *
     * @param id - Subscription ID to validate
     * @returns True if valid GUID format
     *
     * @example
     * ```typescript
     * Subscription.validateSubscriptionId('12345678-1234-1234-1234-123456789abc'); // true
     * Subscription.validateSubscriptionId('invalid'); // false
     * ```
     */
    Subscription.validateSubscriptionId = function (id) {
        var guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return guidRegex.test(id);
    };
    /**
     * Generate a default abbreviation from subscription ID.
     * Uses last 2 characters of the GUID for uniqueness.
     *
     * @returns Abbreviated form
     */
    Subscription.prototype.generateAbbreviation = function () {
        var _a;
        var lastSegment = (_a = this.subscriptionId.split('-').pop()) !== null && _a !== void 0 ? _a : '';
        return "sub".concat(lastSegment.slice(-2));
    };
    /**
     * Generate resource name from display name or subscription ID.
     *
     * @param displayName - Optional display name
     * @returns Resource name
     */
    Subscription.prototype.generateResourceName = function (displayName) {
        if (displayName) {
            // Convert display name to kebab-case
            return "sub-".concat(displayName
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, ''));
        }
        // Use abbreviation as fallback
        return "sub-".concat(this.abbreviation);
    };
    return Subscription;
}());
exports.Subscription = Subscription;
