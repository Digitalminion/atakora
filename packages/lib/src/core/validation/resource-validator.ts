/**
 * Base resource validator for common validation patterns.
 *
 * @packageDocumentation
 */

import {
  ValidationResult,
  ValidationResultBuilder,
  ValidationError,
  isValidCIDR,
} from './validation-helpers';

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
export class ResourceValidator {
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
  public static validateResourceName(
    name: string | undefined,
    resourceType: string,
    minLength: number = 1,
    maxLength: number = 64,
    pattern?: RegExp
  ): ValidationResult {
    const builder = new ValidationResultBuilder();

    if (!name || name.trim() === '') {
      builder.addError(
        `${resourceType} name cannot be empty`,
        'Resource names are required for all Azure resources',
        'Provide a valid name for the resource'
      );
      return builder.build();
    }

    if (name.length < minLength) {
      builder.addError(
        `${resourceType} name is too short`,
        `Name '${name}' has ${name.length} characters but minimum is ${minLength}`,
        `Provide a name with at least ${minLength} characters`
      );
    }

    if (name.length > maxLength) {
      builder.addError(
        `${resourceType} name is too long`,
        `Name '${name}' has ${name.length} characters but maximum is ${maxLength}`,
        `Shorten the name to ${maxLength} characters or less`
      );
    }

    if (pattern && !pattern.test(name)) {
      builder.addError(
        `${resourceType} name has invalid format`,
        `Name '${name}' does not match the required pattern: ${pattern}`,
        'Check Azure naming conventions for this resource type'
      );
    }

    return builder.build();
  }

  /**
   * Validates an Azure location/region.
   *
   * @param location - Location string to validate
   * @param required - Whether location is required (default: true)
   * @returns Validation result
   */
  public static validateLocation(
    location: string | undefined,
    required: boolean = true
  ): ValidationResult {
    const builder = new ValidationResultBuilder();

    if (!location || location.trim() === '') {
      if (required) {
        builder.addError(
          'Location cannot be empty',
          'Azure resources must be deployed to a specific region',
          'Provide a valid Azure region (e.g., "eastus", "westus2")'
        );
      }
    }

    return builder.build();
  }

  /**
   * Validates resource tags.
   *
   * @param tags - Tags object to validate
   * @param maxTags - Maximum number of tags allowed (default: 50)
   * @returns Validation result
   */
  public static validateTags(
    tags: Record<string, string> | undefined,
    maxTags: number = 50
  ): ValidationResult {
    const builder = new ValidationResultBuilder();

    if (!tags) {
      return builder.build();
    }

    const tagCount = Object.keys(tags).length;

    if (tagCount > maxTags) {
      builder.addError(
        'Too many tags',
        `Resource has ${tagCount} tags but maximum is ${maxTags}`,
        `Remove ${tagCount - maxTags} tags to meet Azure limits`
      );
    }

    // Validate tag names and values
    for (const [key, value] of Object.entries(tags)) {
      if (!key || key.trim() === '') {
        builder.addError('Tag name cannot be empty', undefined, 'Remove or rename the empty tag');
      }

      if (key.length > 512) {
        builder.addError(
          `Tag name '${key}' is too long`,
          `Tag names must be 512 characters or less (got ${key.length})`,
          'Shorten the tag name'
        );
      }

      if (value && value.length > 256) {
        builder.addError(
          `Tag value for '${key}' is too long`,
          `Tag values must be 256 characters or less (got ${value.length})`,
          'Shorten the tag value'
        );
      }
    }

    return builder.build();
  }

  /**
   * Validates a CIDR range.
   *
   * @param cidr - CIDR string to validate
   * @param propertyName - Name of the property being validated
   * @returns Validation result
   */
  public static validateCIDR(cidr: string | undefined, propertyName: string): ValidationResult {
    const builder = new ValidationResultBuilder();

    if (!cidr || cidr.trim() === '') {
      builder.addError(
        `${propertyName} cannot be empty`,
        'CIDR ranges are required for network configuration',
        'Provide a valid CIDR range (e.g., "10.0.0.0/16")'
      );
      return builder.build();
    }

    if (!isValidCIDR(cidr)) {
      builder.addError(
        `${propertyName} has invalid CIDR format`,
        `Value '${cidr}' is not valid CIDR notation`,
        'Use format: xxx.xxx.xxx.xxx/yy (e.g., "10.0.0.0/16")'
      );
    }

    return builder.build();
  }

  /**
   * Validates an array of CIDR ranges.
   *
   * @param cidrs - Array of CIDR strings to validate
   * @param propertyName - Name of the property being validated
   * @param minCount - Minimum number of CIDRs required (default: 1)
   * @returns Validation result
   */
  public static validateCIDRArray(
    cidrs: string[] | undefined,
    propertyName: string,
    minCount: number = 1
  ): ValidationResult {
    const builder = new ValidationResultBuilder();

    if (!cidrs || cidrs.length === 0) {
      if (minCount > 0) {
        builder.addError(
          `${propertyName} cannot be empty`,
          `At least ${minCount} CIDR range(s) required`,
          'Provide valid CIDR ranges (e.g., ["10.0.0.0/16"])'
        );
      }
      return builder.build();
    }

    if (cidrs.length < minCount) {
      builder.addError(
        `${propertyName} has too few entries`,
        `Found ${cidrs.length} entries but minimum is ${minCount}`,
        `Add ${minCount - cidrs.length} more CIDR range(s)`
      );
    }

    // Validate each CIDR
    cidrs.forEach((cidr, index) => {
      const result = this.validateCIDR(cidr, `${propertyName}[${index}]`);
      builder.merge(result);
    });

    return builder.build();
  }

  /**
   * Validates that required properties are present.
   *
   * @param value - Value to check
   * @param propertyName - Name of the property
   * @returns Validation result
   */
  public static validateRequired(value: unknown, propertyName: string): ValidationResult {
    const builder = new ValidationResultBuilder();

    if (value === undefined || value === null) {
      builder.addError(
        `${propertyName} is required`,
        'This property must be provided',
        `Set a value for ${propertyName}`
      );
    }

    return builder.build();
  }

  /**
   * Validates a string matches a pattern.
   *
   * @param value - String to validate
   * @param propertyName - Name of the property
   * @param pattern - Regex pattern to match
   * @param patternDescription - Human-readable description of the pattern
   * @returns Validation result
   */
  public static validatePattern(
    value: string | undefined,
    propertyName: string,
    pattern: RegExp,
    patternDescription?: string
  ): ValidationResult {
    const builder = new ValidationResultBuilder();

    if (!value) {
      return builder.build();
    }

    if (!pattern.test(value)) {
      builder.addError(
        `${propertyName} has invalid format`,
        patternDescription
          ? `Value '${value}' does not match required format: ${patternDescription}`
          : `Value '${value}' does not match pattern: ${pattern}`,
        'Check the expected format for this property'
      );
    }

    return builder.build();
  }

  /**
   * Validates a numeric value is within a range.
   *
   * @param value - Number to validate
   * @param propertyName - Name of the property
   * @param min - Minimum allowed value (inclusive)
   * @param max - Maximum allowed value (inclusive)
   * @returns Validation result
   */
  public static validateRange(
    value: number | undefined,
    propertyName: string,
    min: number,
    max: number
  ): ValidationResult {
    const builder = new ValidationResultBuilder();

    if (value === undefined) {
      return builder.build();
    }

    if (value < min || value > max) {
      builder.addError(
        `${propertyName} is out of range`,
        `Value ${value} must be between ${min} and ${max} (inclusive)`,
        `Choose a value between ${min} and ${max}`
      );
    }

    return builder.build();
  }
}
