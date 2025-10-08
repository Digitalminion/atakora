/**
 * Validation framework helper types and utilities.
 *
 * @packageDocumentation
 */

/**
 * Severity level for validation issues.
 */
export enum ValidationSeverity {
  /** Error that will prevent deployment */
  ERROR = 'error',
  /** Warning that may cause issues but won't prevent deployment */
  WARNING = 'warning',
  /** Informational message about best practices */
  INFO = 'info',
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
export class ValidationError extends Error {
  /**
   * Detailed explanation of what went wrong.
   */
  public readonly details?: string;

  /**
   * Suggested fix or remediation steps.
   */
  public readonly suggestion?: string;

  /**
   * Property path where the error occurred.
   */
  public readonly propertyPath?: string;

  /**
   * Creates a new ValidationError.
   *
   * @param message - Short description of the problem
   * @param details - Detailed explanation of what went wrong
   * @param suggestion - Suggested fix or remediation steps
   * @param propertyPath - Property path where the error occurred
   */
  constructor(message: string, details?: string, suggestion?: string, propertyPath?: string) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
    this.suggestion = suggestion;
    this.propertyPath = propertyPath;

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }

  /**
   * Formats the error message with all available context.
   */
  public toString(): string {
    let result = `${this.name}: ${this.message}`;

    if (this.propertyPath) {
      result += `\n  Property: ${this.propertyPath}`;
    }

    if (this.details) {
      result += `\n  Details: ${this.details}`;
    }

    if (this.suggestion) {
      result += `\n  Suggestion: ${this.suggestion}`;
    }

    return result;
  }
}

/**
 * Builder for creating ValidationResult objects.
 */
export class ValidationResultBuilder {
  private readonly issues: ValidationIssue[] = [];

  /**
   * Adds an error to the validation result.
   *
   * @param message - Short description of the problem
   * @param details - Detailed explanation
   * @param suggestion - Suggested fix
   * @param propertyPath - Property path where the error occurred
   */
  public addError(
    message: string,
    details?: string,
    suggestion?: string,
    propertyPath?: string
  ): this {
    this.issues.push({
      severity: ValidationSeverity.ERROR,
      message,
      details,
      suggestion,
      propertyPath,
    });
    return this;
  }

  /**
   * Adds a warning to the validation result.
   *
   * @param message - Short description of the problem
   * @param details - Detailed explanation
   * @param suggestion - Suggested fix
   * @param propertyPath - Property path where the warning occurred
   */
  public addWarning(
    message: string,
    details?: string,
    suggestion?: string,
    propertyPath?: string
  ): this {
    this.issues.push({
      severity: ValidationSeverity.WARNING,
      message,
      details,
      suggestion,
      propertyPath,
    });
    return this;
  }

  /**
   * Adds an info message to the validation result.
   *
   * @param message - Short description
   * @param details - Detailed explanation
   * @param suggestion - Suggested improvement
   * @param propertyPath - Property path where the info applies
   */
  public addInfo(
    message: string,
    details?: string,
    suggestion?: string,
    propertyPath?: string
  ): this {
    this.issues.push({
      severity: ValidationSeverity.INFO,
      message,
      details,
      suggestion,
      propertyPath,
    });
    return this;
  }

  /**
   * Merges another validation result into this builder.
   *
   * @param result - Validation result to merge
   */
  public merge(result: ValidationResult): this {
    this.issues.push(...result.issues);
    return this;
  }

  /**
   * Builds the final ValidationResult.
   */
  public build(): ValidationResult {
    const errorCount = this.issues.filter((i) => i.severity === ValidationSeverity.ERROR).length;
    const warningCount = this.issues.filter(
      (i) => i.severity === ValidationSeverity.WARNING
    ).length;
    const infoCount = this.issues.filter((i) => i.severity === ValidationSeverity.INFO).length;

    return {
      isValid: errorCount === 0,
      issues: [...this.issues],
      errorCount,
      warningCount,
      infoCount,
    };
  }
}

/**
 * Validates CIDR notation format.
 *
 * @param cidr - CIDR string to validate
 * @returns True if valid CIDR notation
 */
export function isValidCIDR(cidr: string): boolean {
  const cidrPattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;
  const match = cidrPattern.exec(cidr);

  if (!match) {
    return false;
  }

  // Validate each octet is 0-255
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) {
      return false;
    }
  }

  // Validate prefix length is 0-32
  const prefixLength = parseInt(match[5], 10);
  if (prefixLength < 0 || prefixLength > 32) {
    return false;
  }

  return true;
}

/**
 * Parses a CIDR range into its components.
 *
 * @param cidr - CIDR string to parse
 * @returns IP address and prefix length, or null if invalid
 */
export function parseCIDR(cidr: string): { ip: string; prefixLength: number } | null {
  if (!isValidCIDR(cidr)) {
    return null;
  }

  const [ip, prefixStr] = cidr.split('/');
  return {
    ip,
    prefixLength: parseInt(prefixStr, 10),
  };
}

/**
 * Converts an IP address to a 32-bit integer.
 *
 * @param ip - IP address string (e.g., "10.0.0.0")
 * @returns 32-bit integer representation
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
}

/**
 * Checks if one CIDR range is within another.
 *
 * @param childCidr - The CIDR range to check
 * @param parentCidr - The CIDR range that should contain the child
 * @returns True if childCidr is within parentCidr
 */
export function isWithinCIDR(childCidr: string, parentCidr: string): boolean {
  const child = parseCIDR(childCidr);
  const parent = parseCIDR(parentCidr);

  if (!child || !parent) {
    return false;
  }

  // Calculate network addresses
  const childInt = ipToInt(child.ip);
  const parentInt = ipToInt(parent.ip);

  // Calculate network masks
  const childMask = ~0 << (32 - child.prefixLength);
  const parentMask = ~0 << (32 - parent.prefixLength);

  // Calculate network addresses by applying masks
  const childNetwork = childInt & childMask;
  const parentNetwork = parentInt & parentMask;

  // Child prefix length must be >= parent prefix length
  if (child.prefixLength < parent.prefixLength) {
    return false;
  }

  // Check if child network address matches parent network address when masked
  return (childNetwork & parentMask) === parentNetwork;
}

/**
 * Checks if two CIDR ranges overlap.
 *
 * @param cidr1 - First CIDR range
 * @param cidr2 - Second CIDR range
 * @returns True if the ranges overlap
 */
export function cidrsOverlap(cidr1: string, cidr2: string): boolean {
  const range1 = parseCIDR(cidr1);
  const range2 = parseCIDR(cidr2);

  if (!range1 || !range2) {
    return false;
  }

  const ip1 = ipToInt(range1.ip);
  const ip2 = ipToInt(range2.ip);

  const mask1 = ~0 << (32 - range1.prefixLength);
  const mask2 = ~0 << (32 - range2.prefixLength);

  const network1 = ip1 & mask1;
  const network2 = ip2 & mask2;

  // Calculate broadcast addresses
  const broadcast1 = network1 | ~mask1;
  const broadcast2 = network2 | ~mask2;

  // Check if ranges overlap
  return network1 <= broadcast2 && network2 <= broadcast1;
}

/**
 * Validates port range format and values.
 *
 * @param portRange - Port range string (e.g., "80", "443-443", "1000-2000", "*")
 * @returns True if valid port range
 */
export function isValidPortRange(portRange: string): boolean {
  // Wildcard is allowed
  if (portRange === '*') {
    return true;
  }

  // Single port or port range
  const parts = portRange.split('-');

  if (parts.length === 1) {
    // Single port
    const port = parseInt(parts[0], 10);
    return !isNaN(port) && port >= 0 && port <= 65535;
  } else if (parts.length === 2) {
    // Port range
    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);
    return (
      !isNaN(start) &&
      !isNaN(end) &&
      start >= 0 &&
      start <= 65535 &&
      end >= 0 &&
      end <= 65535 &&
      start <= end
    );
  }

  return false;
}
