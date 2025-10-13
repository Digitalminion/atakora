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
exports.Resource = void 0;
var construct_1 = require("./construct");
var validation_1 = require("./validation");
/**
 * Base class for all ARM resources.
 *
 * @remarks
 * All Azure resources extend this class, which provides:
 * - Resource type identification
 * - Resource ID tracking
 * - Name management
 * - Common ARM properties (location, tags)
 * - Validation framework integration
 *
 * Subclasses must implement:
 * - `resourceType`: ARM resource type (e.g., "Microsoft.Storage/storageAccounts")
 * - `resourceId`: Fully qualified Azure resource ID
 * - `name`: Resource name
 * - `validateProps()`: Validate constructor properties
 * - `validateArmStructure()`: Validate ARM template structure before transformation
 * - `toArmTemplate()`: Transform to ARM template representation
 *
 * **Validation Lifecycle**:
 * 1. Constructor calls `validateProps()` - validates input properties
 * 2. Synthesis calls `validateArmStructure()` - validates ARM structure before template generation
 * 3. Synthesis calls `toArmTemplate()` - generates ARM template JSON
 *
 * @example
 * ```typescript
 * export class StorageAccount extends Resource {
 *   readonly resourceType = 'Microsoft.Storage/storageAccounts';
 *   readonly resourceId: string;
 *   readonly name: string;
 *
 *   constructor(scope: Construct, id: string, props: StorageAccountProps) {
 *     super(scope, id, props);
 *     this.validateProps(props);  // MUST be called in constructor
 *     this.name = props.accountName;
 *     this.resourceId = `${subscriptionId}/resourceGroups/${rgName}/providers/Microsoft.Storage/storageAccounts/${this.name}`;
 *   }
 *
 *   protected validateProps(props: StorageAccountProps): void {
 *     if (!props.accountName) {
 *       throw new ValidationError('Account name is required');
 *     }
 *   }
 *
 *   public validateArmStructure(): ValidationResult {
 *     const builder = new ValidationResultBuilder();
 *     // Validate ARM-specific constraints
 *     return builder.build();
 *   }
 *
 *   public toArmTemplate(): ArmResource {
 *     return {
 *       type: this.resourceType,
 *       apiVersion: '2023-01-01',
 *       name: this.name,
 *       location: this.location,
 *       properties: { ... }
 *     };
 *   }
 * }
 * ```
 */
var Resource = /** @class */ (function (_super) {
    __extends(Resource, _super);
    /**
     * Creates a new Resource instance.
     *
     * @param scope - Parent construct (usually a Stack)
     * @param id - Construct ID (must be unique within scope)
     * @param props - Resource properties
     */
    function Resource(scope, id, props) {
        var _this = _super.call(this, scope, id) || this;
        _this.location = props === null || props === void 0 ? void 0 : props.location;
        _this.tags = props === null || props === void 0 ? void 0 : props.tags;
        return _this;
    }
    /**
     * Validates ARM template structure before transformation.
     *
     * @remarks
     * **Called automatically during synthesis** before `toArmTemplate()`.
     *
     * This method validates:
     * - ARM-specific structure requirements
     * - Nested resource configurations
     * - Cross-resource dependencies
     * - ARM API version compatibility
     * - Deployment-time constraints
     *
     * Unlike `validateProps()`, this returns a `ValidationResult` instead of throwing,
     * allowing synthesis to collect all validation issues across resources.
     *
     * **Implementation Guidelines**:
     * - Use `ValidationResultBuilder` to collect issues
     * - Validate ARM template structure requirements
     * - Check nested resource configurations (e.g., inline subnets in VNet)
     * - Validate delegation structures match ARM format
     * - Ensure property nesting is correct for ARM API
     *
     * **Common Validations**:
     * - Delegation properties wrapper (e.g., `{ name, properties: { serviceName } }`)
     * - Subnet address prefixes within VNet CIDR
     * - No overlapping subnet ranges
     * - NSG reference format (ARM expression vs literal string)
     * - Service endpoint validity
     *
     * **Default Implementation**:
     * The base implementation returns a valid result (no errors). Resources should
     * override this method to add resource-specific ARM structure validation.
     *
     * @returns Validation result with any errors or warnings
     *
     * @example
     * ```typescript
     * public validateArmStructure(): ValidationResult {
     *   const builder = new ValidationResultBuilder();
     *
     *   // Validate inline subnets
     *   if (this.subnets) {
     *     for (const subnet of this.subnets) {
     *       if (subnet.delegations) {
     *         for (const delegation of subnet.delegations) {
     *           if (!delegation.properties || !delegation.properties.serviceName) {
     *             builder.addError(
     *               'Delegation missing properties wrapper',
     *               `Delegation in subnet ${subnet.name} must wrap serviceName in properties`,
     *               'Use format: { name: "delegation", properties: { serviceName: "Microsoft.Web/serverFarms" } }'
     *             );
     *           }
     *         }
     *       }
     *     }
     *   }
     *
     *   return builder.build();
     * }
     * ```
     */
    Resource.prototype.validateArmStructure = function () {
        // Default implementation: no validation errors
        // Resources should override this method for custom validation
        var builder = new validation_1.ValidationResultBuilder();
        return builder.build();
    };
    return Resource;
}(construct_1.Construct));
exports.Resource = Resource;
