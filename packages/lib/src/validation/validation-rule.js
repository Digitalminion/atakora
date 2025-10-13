"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseValidationRule = void 0;
/**
 * Base class for implementing validation rules
 */
var BaseValidationRule = /** @class */ (function () {
    function BaseValidationRule(name, description, severity, resourceTypes) {
        this.name = name;
        this.description = description;
        this.severity = severity;
        this.resourceTypes = resourceTypes;
    }
    BaseValidationRule.prototype.condition = function (resource, context) {
        return true;
    };
    return BaseValidationRule;
}());
exports.BaseValidationRule = BaseValidationRule;
