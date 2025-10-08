/**
 * Validation framework for Azure resources.
 *
 * @packageDocumentation
 */

export {
  ValidationSeverity,
  ValidationIssue,
  ValidationResult,
  ValidationError,
  ValidationResultBuilder,
  isValidCIDR,
  parseCIDR,
  isWithinCIDR,
  cidrsOverlap,
  isValidPortRange,
} from './validation-helpers';

export { ResourceValidator } from './resource-validator';

// Error catalog exports
export {
  ErrorCatalog,
  ErrorCategory,
  ErrorSeverity as CatalogErrorSeverity,
  ErrorDefinition,
  ErrorCode,
  ValidationError as CatalogValidationError,
  createValidationError,
  getErrorDefinition,
  getErrorsByCategory,
  searchErrors,
  getAllErrors,
} from './error-catalog';
