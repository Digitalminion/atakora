/**
 * Base resource validator for common validation patterns.
 *
 * @packageDocumentation
 */
import { ValidationResult } from './validation-helpers';
/**
 * Base validator providing common validation methods.
 *
 * @remarks
 * This class provides reusable validation methods for:
 * - Resource names
 * - Location/region
 * - Tags
 * - CIDR ranges
 * - Common Azure resource constraints
 */
export declare class ResourceValidator {
    /**
     * Validates a resource name against Azure naming constraints.
     *
     * @param name - Resource name to validate
     * @param resourceType - Type of resource (for error messages)
     * @param minLength - Minimum allowed length (default: 1)
     * @param maxLength - Maximum allowed length (default: 64)
     * @param pattern - Optional regex pattern the name must match
     * @returns Validation result
     */
    static validateResourceName(name: string | undefined, resourceType: string, minLength?: number, maxLength?: number, pattern?: RegExp): ValidationResult;
    /**
     * Validates an Azure location/region.
     *
     * @param location - Location string to validate
     * @param required - Whether location is required (default: true)
     * @returns Validation result
     */
    static validateLocation(location: string | undefined, required?: boolean): ValidationResult;
    /**
     * Validates resource tags.
     *
     * @param tags - Tags object to validate
     * @param maxTags - Maximum number of tags allowed (default: 50)
     * @returns Validation result
     */
    static validateTags(tags: Record<string, string> | undefined, maxTags?: number): ValidationResult;
    /**
     * Validates a CIDR range.
     *
     * @param cidr - CIDR string to validate
     * @param propertyName - Name of the property being validated
     * @returns Validation result
     */
    static validateCIDR(cidr: string | undefined, propertyName: string): ValidationResult;
    /**
     * Validates an array of CIDR ranges.
     *
     * @param cidrs - Array of CIDR strings to validate
     * @param propertyName - Name of the property being validated
     * @param minCount - Minimum number of CIDRs required (default: 1)
     * @returns Validation result
     */
    static validateCIDRArray(cidrs: string[] | undefined, propertyName: string, minCount?: number): ValidationResult;
    /**
     * Validates that required properties are present.
     *
     * @param value - Value to check
     * @param propertyName - Name of the property
     * @returns Validation result
     */
    static validateRequired(value: unknown, propertyName: string): ValidationResult;
    /**
     * Validates a string matches a pattern.
     *
     * @param value - String to validate
     * @param propertyName - Name of the property
     * @param pattern - Regex pattern to match
     * @param patternDescription - Human-readable description of the pattern
     * @returns Validation result
     */
    static validatePattern(value: string | undefined, propertyName: string, pattern: RegExp, patternDescription?: string): ValidationResult;
    /**
     * Validates a numeric value is within a range.
     *
     * @param value - Number to validate
     * @param propertyName - Name of the property
     * @param min - Minimum allowed value (inclusive)
     * @param max - Maximum allowed value (inclusive)
     * @returns Validation result
     */
    static validateRange(value: number | undefined, propertyName: string, min: number, max: number): ValidationResult;
}
//# sourceMappingURL=resource-validator.d.ts.map