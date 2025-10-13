/**
 * Validation framework helper types and utilities.
 *
 * @packageDocumentation
 */
/**
 * Severity level for validation issues.
 */
export declare enum ValidationSeverity {
    /** Error that will prevent deployment */
    ERROR = "error",
    /** Warning that may cause issues but won't prevent deployment */
    WARNING = "warning",
    /** Informational message about best practices */
    INFO = "info"
}
/**
 * Validation issue details.
 */
export interface ValidationIssue {
    /**
     * Severity of the issue.
     */
    readonly severity: ValidationSeverity;
    /**
     * Short description of the problem.
     */
    readonly message: string;
    /**
     * Detailed explanation of what went wrong.
     */
    readonly details?: string;
    /**
     * Suggested fix or remediation steps.
     */
    readonly suggestion?: string;
    /**
     * Property path where the issue occurred.
     */
    readonly propertyPath?: string;
    /**
     * Resource identifier where the issue occurred.
     */
    readonly resourceId?: string;
}
/**
 * Result of a validation operation.
 */
export interface ValidationResult {
    /**
     * Whether validation passed (no errors).
     */
    readonly isValid: boolean;
    /**
     * List of validation issues found.
     */
    readonly issues: readonly ValidationIssue[];
    /**
     * Count of errors.
     */
    readonly errorCount: number;
    /**
     * Count of warnings.
     */
    readonly warningCount: number;
    /**
     * Count of info messages.
     */
    readonly infoCount: number;
}
/**
 * Custom error class for validation failures.
 *
 * @remarks
 * Thrown when validation fails with actionable error messages.
 * Includes detailed context to help developers fix the issue.
 */
export declare class ValidationError extends Error {
    /**
     * Detailed explanation of what went wrong.
     */
    readonly details?: string;
    /**
     * Suggested fix or remediation steps.
     */
    readonly suggestion?: string;
    /**
     * Property path where the error occurred.
     */
    readonly propertyPath?: string;
    /**
     * Creates a new ValidationError.
     *
     * @param message - Short description of the problem
     * @param details - Detailed explanation of what went wrong
     * @param suggestion - Suggested fix or remediation steps
     * @param propertyPath - Property path where the error occurred
     */
    constructor(message: string, details?: string, suggestion?: string, propertyPath?: string);
    /**
     * Formats the error message with all available context.
     */
    toString(): string;
}
/**
 * Builder for creating ValidationResult objects.
 */
export declare class ValidationResultBuilder {
    private readonly issues;
    /**
     * Adds an error to the validation result.
     *
     * @param message - Short description of the problem
     * @param details - Detailed explanation
     * @param suggestion - Suggested fix
     * @param propertyPath - Property path where the error occurred
     */
    addError(message: string, details?: string, suggestion?: string, propertyPath?: string): this;
    /**
     * Adds a warning to the validation result.
     *
     * @param message - Short description of the problem
     * @param details - Detailed explanation
     * @param suggestion - Suggested fix
     * @param propertyPath - Property path where the warning occurred
     */
    addWarning(message: string, details?: string, suggestion?: string, propertyPath?: string): this;
    /**
     * Adds an info message to the validation result.
     *
     * @param message - Short description
     * @param details - Detailed explanation
     * @param suggestion - Suggested improvement
     * @param propertyPath - Property path where the info applies
     */
    addInfo(message: string, details?: string, suggestion?: string, propertyPath?: string): this;
    /**
     * Merges another validation result into this builder.
     *
     * @param result - Validation result to merge
     */
    merge(result: ValidationResult): this;
    /**
     * Builds the final ValidationResult.
     */
    build(): ValidationResult;
}
/**
 * Validates CIDR notation format.
 *
 * @param cidr - CIDR string to validate
 * @returns True if valid CIDR notation
 */
export declare function isValidCIDR(cidr: string): boolean;
/**
 * Parses a CIDR range into its components.
 *
 * @param cidr - CIDR string to parse
 * @returns IP address and prefix length, or null if invalid
 */
export declare function parseCIDR(cidr: string): {
    ip: string;
    prefixLength: number;
} | null;
/**
 * Checks if one CIDR range is within another.
 *
 * @param childCidr - The CIDR range to check
 * @param parentCidr - The CIDR range that should contain the child
 * @returns True if childCidr is within parentCidr
 */
export declare function isWithinCIDR(childCidr: string, parentCidr: string): boolean;
/**
 * Checks if two CIDR ranges overlap.
 *
 * @param cidr1 - First CIDR range
 * @param cidr2 - Second CIDR range
 * @returns True if the ranges overlap
 */
export declare function cidrsOverlap(cidr1: string, cidr2: string): boolean;
/**
 * Validates port range format and values.
 *
 * @param portRange - Port range string (e.g., "80", "443-443", "1000-2000", "*")
 * @returns True if valid port range
 */
export declare function isValidPortRange(portRange: string): boolean;
//# sourceMappingURL=validation-helpers.d.ts.map