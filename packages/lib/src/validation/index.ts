/**
 * Validation Framework for Azure CDK Resources
 *
 * This module provides a comprehensive validation framework for Azure resources
 * to catch common configuration errors before deployment.
 */

// Core validation framework
export { ValidationSeverity, ValidationResult, ValidationResultBuilder } from './validation-result';
export { ValidationRule, ValidationContext, BaseValidationRule } from './validation-rule';
export { ValidatorRegistry, validatorRegistry } from './validator-registry';

// Common validators and helpers
export {
  validateLength,
  validatePattern,
  validateRequired,
  validateRange,
  validateEnum,
  validateAzureResourceName,
  warnGloballyUnique,
  validateLowercase,
  validateNoConsecutive,
  validateStartsWith,
  validateEndsWith,
  collectResults,
} from './common-validators';

// Resource-specific validators
export { networkValidators } from './validators/network-validators';
export { storageValidators } from './validators/storage-validators';
export { keyVaultValidators } from './validators/keyvault-validators';
export { databaseValidators } from './validators/database-validators';
export { cognitiveServicesValidators } from './validators/cognitiveservices-validators';
export { webValidators } from './validators/web-validators';

// All validators combined
import { networkValidators } from './validators/network-validators';
import { storageValidators } from './validators/storage-validators';
import { keyVaultValidators } from './validators/keyvault-validators';
import { databaseValidators } from './validators/database-validators';
import { cognitiveServicesValidators } from './validators/cognitiveservices-validators';
import { webValidators } from './validators/web-validators';
import { validatorRegistry } from './validator-registry';

export const allValidators = [
  ...networkValidators,
  ...storageValidators,
  ...keyVaultValidators,
  ...databaseValidators,
  ...cognitiveServicesValidators,
  ...webValidators,
];

/**
 * Register all validators with the global registry
 */
export function registerAllValidators(): void {
  const registry = validatorRegistry;

  allValidators.forEach((validator) => {
    if (validator.resourceTypes && validator.resourceTypes.length > 0) {
      validator.resourceTypes.forEach((resourceType) => {
        registry.register(resourceType, validator);
      });
    } else {
      registry.registerGlobal(validator);
    }
  });
}
