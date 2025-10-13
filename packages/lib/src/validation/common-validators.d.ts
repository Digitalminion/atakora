import { ValidationResult } from './validation-result';
/**
 * Common validation patterns and helpers
 */
/**
 * Validate string length
 */
export declare function validateLength(value: string, min: number, max: number, fieldName: string, ruleName: string): ValidationResult | null;
/**
 * Validate string pattern (regex)
 */
export declare function validatePattern(value: string, pattern: RegExp, fieldName: string, ruleName: string, errorMessage?: string): ValidationResult | null;
/**
 * Validate required field
 */
export declare function validateRequired(value: any, fieldName: string, ruleName: string): ValidationResult | null;
/**
 * Validate number range
 */
export declare function validateRange(value: number, min: number, max: number, fieldName: string, ruleName: string): ValidationResult | null;
/**
 * Validate enum value
 */
export declare function validateEnum<T>(value: T, validValues: T[], fieldName: string, ruleName: string): ValidationResult | null;
/**
 * Validate Azure resource name format (general)
 */
export declare function validateAzureResourceName(name: string, minLength: number, maxLength: number, pattern: RegExp, ruleName: string, additionalRules?: string): ValidationResult | null;
/**
 * Validate globally unique resource name (add warning)
 */
export declare function warnGloballyUnique(ruleName: string, resourceType: string): ValidationResult;
/**
 * Validate lowercase requirement
 */
export declare function validateLowercase(value: string, fieldName: string, ruleName: string): ValidationResult | null;
/**
 * Validate no consecutive characters (e.g., no '--')
 */
export declare function validateNoConsecutive(value: string, char: string, fieldName: string, ruleName: string): ValidationResult | null;
/**
 * Validate string starts with specific character type
 */
export declare function validateStartsWith(value: string, requirement: 'letter' | 'alphanumeric' | 'lowercase', fieldName: string, ruleName: string): ValidationResult | null;
/**
 * Validate string ends with specific character type
 */
export declare function validateEndsWith(value: string, requirement: 'letter' | 'alphanumeric' | 'lowercase', fieldName: string, ruleName: string): ValidationResult | null;
/**
 * Create a validation result array from nullable results
 */
export declare function collectResults(...results: (ValidationResult | null)[]): ValidationResult[];
//# sourceMappingURL=common-validators.d.ts.map