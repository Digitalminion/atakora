/**
 * Validation result severity levels
 */
export declare enum ValidationSeverity {
    /**
     * Critical error - deployment will fail
     */
    ERROR = "error",
    /**
     * Warning - deployment may succeed but could cause runtime issues
     */
    WARNING = "warning",
    /**
     * Informational - best practice recommendation
     */
    INFO = "info"
}
/**
 * Result of a validation check
 */
export interface ValidationResult {
    /**
     * Whether the validation passed
     */
    valid: boolean;
    /**
     * Severity level of the result
     */
    severity: ValidationSeverity;
    /**
     * Validation rule name that produced this result
     */
    ruleName: string;
    /**
     * Human-readable message describing the issue
     */
    message?: string;
    /**
     * Suggested fix or remediation
     */
    suggestion?: string;
    /**
     * Additional contextual details
     */
    details?: string;
    /**
     * Path to the resource or property with the issue
     */
    path?: string;
}
/**
 * Builder for creating validation results
 */
export declare class ValidationResultBuilder {
    private result;
    constructor(ruleName: string, severity: ValidationSeverity);
    /**
     * Mark validation as failed
     */
    invalid(): this;
    /**
     * Set error message
     */
    withMessage(message: string): this;
    /**
     * Set suggestion for fixing the issue
     */
    withSuggestion(suggestion: string): this;
    /**
     * Set additional details
     */
    withDetails(details: string): this;
    /**
     * Set resource path
     */
    withPath(path: string): this;
    /**
     * Build and return the validation result
     */
    build(): ValidationResult;
    /**
     * Create an error result
     */
    static error(ruleName: string): ValidationResultBuilder;
    /**
     * Create a warning result
     */
    static warning(ruleName: string): ValidationResultBuilder;
    /**
     * Create an info result
     */
    static info(ruleName: string): ValidationResultBuilder;
    /**
     * Create a success result
     */
    static success(ruleName: string): ValidationResultBuilder;
}
//# sourceMappingURL=validation-result.d.ts.map