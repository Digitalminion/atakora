import { ValidationResult, ValidationResultBuilder, ValidationSeverity } from './validation-result';

/**
 * Common validation patterns and helpers
 */

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  min: number,
  max: number,
  fieldName: string,
  ruleName: string
): ValidationResult | null {
  if (value.length < min || value.length > max) {
    return ValidationResultBuilder.error(ruleName)
      .withMessage(`${fieldName} must be ${min}-${max} characters`)
      .withDetails(`Current length: ${value.length}`)
      .build();
  }
  return null;
}

/**
 * Validate string pattern (regex)
 */
export function validatePattern(
  value: string,
  pattern: RegExp,
  fieldName: string,
  ruleName: string,
  errorMessage?: string
): ValidationResult | null {
  if (!pattern.test(value)) {
    return ValidationResultBuilder.error(ruleName)
      .withMessage(errorMessage || `${fieldName} does not match required pattern`)
      .withDetails(`Value: ${value}, Pattern: ${pattern}`)
      .build();
  }
  return null;
}

/**
 * Validate required field
 */
export function validateRequired(
  value: any,
  fieldName: string,
  ruleName: string
): ValidationResult | null {
  if (value === undefined || value === null || value === '') {
    return ValidationResultBuilder.error(ruleName)
      .withMessage(`${fieldName} is required`)
      .build();
  }
  return null;
}

/**
 * Validate number range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string,
  ruleName: string
): ValidationResult | null {
  if (value < min || value > max) {
    return ValidationResultBuilder.error(ruleName)
      .withMessage(`${fieldName} must be between ${min} and ${max}`)
      .withDetails(`Current value: ${value}`)
      .build();
  }
  return null;
}

/**
 * Validate enum value
 */
export function validateEnum<T>(
  value: T,
  validValues: T[],
  fieldName: string,
  ruleName: string
): ValidationResult | null {
  if (!validValues.includes(value)) {
    return ValidationResultBuilder.error(ruleName)
      .withMessage(`Invalid value for ${fieldName}`)
      .withSuggestion(`Valid values: ${validValues.join(', ')}`)
      .withDetails(`Current value: ${value}`)
      .build();
  }
  return null;
}

/**
 * Validate Azure resource name format (general)
 */
export function validateAzureResourceName(
  name: string,
  minLength: number,
  maxLength: number,
  pattern: RegExp,
  ruleName: string,
  additionalRules?: string
): ValidationResult | null {
  // Check length
  const lengthResult = validateLength(name, minLength, maxLength, 'Resource name', ruleName);
  if (lengthResult) return lengthResult;

  // Check pattern
  const patternResult = validatePattern(
    name,
    pattern,
    'Resource name',
    ruleName,
    additionalRules || 'Name contains invalid characters'
  );
  if (patternResult) return patternResult;

  return null;
}

/**
 * Validate globally unique resource name (add warning)
 */
export function warnGloballyUnique(
  ruleName: string,
  resourceType: string
): ValidationResult {
  return ValidationResultBuilder.warning(ruleName)
    .withMessage(`${resourceType} names must be globally unique across Azure`)
    .withSuggestion('Consider adding a hash suffix for uniqueness')
    .build();
}

/**
 * Validate lowercase requirement
 */
export function validateLowercase(
  value: string,
  fieldName: string,
  ruleName: string
): ValidationResult | null {
  if (value !== value.toLowerCase()) {
    return ValidationResultBuilder.error(ruleName)
      .withMessage(`${fieldName} must be lowercase`)
      .withSuggestion(`Use: ${value.toLowerCase()}`)
      .build();
  }
  return null;
}

/**
 * Validate no consecutive characters (e.g., no '--')
 */
export function validateNoConsecutive(
  value: string,
  char: string,
  fieldName: string,
  ruleName: string
): ValidationResult | null {
  const pattern = new RegExp(`${char}{2,}`);
  if (pattern.test(value)) {
    return ValidationResultBuilder.error(ruleName)
      .withMessage(`${fieldName} cannot contain consecutive '${char}' characters`)
      .build();
  }
  return null;
}

/**
 * Validate string starts with specific character type
 */
export function validateStartsWith(
  value: string,
  requirement: 'letter' | 'alphanumeric' | 'lowercase',
  fieldName: string,
  ruleName: string
): ValidationResult | null {
  const patterns = {
    letter: /^[a-zA-Z]/,
    alphanumeric: /^[a-zA-Z0-9]/,
    lowercase: /^[a-z]/,
  };

  if (!patterns[requirement].test(value)) {
    return ValidationResultBuilder.error(ruleName)
      .withMessage(`${fieldName} must start with ${requirement} character`)
      .build();
  }
  return null;
}

/**
 * Validate string ends with specific character type
 */
export function validateEndsWith(
  value: string,
  requirement: 'letter' | 'alphanumeric' | 'lowercase',
  fieldName: string,
  ruleName: string
): ValidationResult | null {
  const patterns = {
    letter: /[a-zA-Z]$/,
    alphanumeric: /[a-zA-Z0-9]$/,
    lowercase: /[a-z]$/,
  };

  if (!patterns[requirement].test(value)) {
    return ValidationResultBuilder.error(ruleName)
      .withMessage(`${fieldName} must end with ${requirement} character`)
      .build();
  }
  return null;
}

/**
 * Create a validation result array from nullable results
 */
export function collectResults(...results: (ValidationResult | null)[]): ValidationResult[] {
  return results.filter((r): r is ValidationResult => r !== null);
}
