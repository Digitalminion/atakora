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
exports.Project = void 0;
var types_1 = require("../types");
/**
 * Represents a project name in Azure resource naming.
 *
 * @remarks
 * Projects are applications, workloads, or initiatives that use Azure resources.
 * This class normalizes project names for consistent use across resource names.
 *
 * @example
 * Basic usage:
 * ```typescript
 * const project = new Project('authr');
 * console.log(project.value);        // "authr"
 * console.log(project.title);        // "Colorai"
 * console.log(project.resourceName); // "authr"
 * ```
 *
 * @example
 * Multi-word project:
 * ```typescript
 * const project = new Project('customer portal');
 * console.log(project.value);        // "customer portal"
 * console.log(project.title);        // "Customer Portal"
 * console.log(project.resourceName); // "customer-portal"
 * ```
 */
var Project = /** @class */ (function (_super) {
    __extends(Project, _super);
    /**
     * Creates a new Project instance.
     *
     * @param options - Project name or configuration options
     *
     * @throws {Error} If project value is empty or invalid
     *
     * @example
     * ```typescript
     * // Simple string
     * const project1 = new Project('authr');
     *
     * // With custom values
     * const project2 = new Project({
     *   value: 'AuthR',
     *   resourceName: 'authr',
     *   title: 'AuthR Platform'
     * });
     * ```
     */
    function Project(options) {
        return _super.call(this, options) || this;
    }
    /**
     * Validates the project value.
     *
     * @throws {Error} If validation fails
     */
    Project.prototype.validate = function () {
        _super.prototype.validate.call(this);
        // Project-specific validation
        if (this.resourceName.length < 2) {
            throw new Error("Project resource name must be at least 2 characters (current: ".concat(this.resourceName.length, ")"));
        }
        if (this.resourceName.length > 40) {
            throw new Error("Project resource name must not exceed 40 characters (current: ".concat(this.resourceName.length, ")"));
        }
        if (!/^[a-z0-9-]+$/.test(this.resourceName)) {
            throw new Error("Project resource name can only contain lowercase letters, numbers, and hyphens");
        }
        if (this.resourceName.startsWith('-') || this.resourceName.endsWith('-')) {
            throw new Error("Project resource name cannot start or end with a hyphen");
        }
    };
    return Project;
}(types_1.NamingComponent));
exports.Project = Project;
