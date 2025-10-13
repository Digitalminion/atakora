import { BaseValidationRule, ValidationContext } from '../validation-rule';
import { ValidationResult, ValidationResultBuilder, ValidationSeverity } from '../validation-result';
import {
  validateLength,
  validatePattern,
  validateLowercase,
  warnGloballyUnique,
  collectResults,
} from '../common-validators';

/**
 * Validates Storage Account name format
 */
export class StorageAccountNameValidator extends BaseValidationRule {
  constructor() {
    super(
      'storage-account-name-format',
      'Validates Storage Account name follows Azure naming rules',
      ValidationSeverity.ERROR,
      ['Microsoft.Storage/storageAccounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const name = resource.name || resource.storageAccountName;

    if (!name) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Storage Account name is required')
        .build();
    }

    const results: (ValidationResult | null)[] = [];

    // Must be lowercase
    results.push(validateLowercase(name, 'Storage Account name', this.name));

    // Length check (3-24)
    results.push(validateLength(name, 3, 24, 'Storage Account name', this.name));

    // Pattern check (lowercase alphanumeric only, no hyphens)
    const pattern = /^[a-z0-9]+$/;
    results.push(
      validatePattern(
        name,
        pattern,
        'Storage Account name',
        this.name,
        'Storage Account names can only contain lowercase letters and numbers (no hyphens or special characters)'
      )
    );

    // Add global uniqueness warning
    results.push(warnGloballyUnique(this.name, 'Storage Account'));

    return collectResults(...results);
  }
}

/**
 * Validates Storage Account public access consistency
 */
export class StorageAccountPublicAccessValidator extends BaseValidationRule {
  constructor() {
    super(
      'storage-account-public-access',
      'Validates Storage Account public access settings are consistent',
      ValidationSeverity.ERROR,
      ['Microsoft.Storage/storageAccounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const props = resource.properties || {};
    const allowBlobPublicAccess = props.allowBlobPublicAccess;
    const publicNetworkAccess = props.publicNetworkAccess;

    if (allowBlobPublicAccess && publicNetworkAccess === 'Disabled') {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Cannot allow blob public access when public network access is disabled')
        .withSuggestion('Set allowBlobPublicAccess: false or publicNetworkAccess: "Enabled"')
        .withDetails('These settings are mutually exclusive')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Storage Account network ACLs have default action
 */
export class StorageAccountNetworkAclsValidator extends BaseValidationRule {
  constructor() {
    super(
      'storage-account-network-acls',
      'Validates Storage Account network ACLs have default action specified',
      ValidationSeverity.ERROR,
      ['Microsoft.Storage/storageAccounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const networkAcls = resource.properties?.networkAcls;

    if (!networkAcls) {
      return ValidationResultBuilder.success(this.name).build();
    }

    if (!networkAcls.defaultAction) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Network ACLs must specify defaultAction')
        .withSuggestion('Set networkAcls.defaultAction to "Allow" or "Deny"')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Storage Account TLS version
 */
export class StorageAccountTlsVersionValidator extends BaseValidationRule {
  constructor() {
    super(
      'storage-account-tls-version',
      'Validates Storage Account uses secure TLS version',
      ValidationSeverity.WARNING,
      ['Microsoft.Storage/storageAccounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const tlsVersion = resource.properties?.minimumTlsVersion;

    if (!tlsVersion) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('No minimum TLS version specified')
        .withSuggestion('Set minimumTlsVersion to "TLS1_2" or higher for security')
        .build();
    }

    if (['TLS1_0', 'TLS1_1'].includes(tlsVersion)) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage(`TLS version ${tlsVersion} is deprecated`)
        .withSuggestion('Use TLS1_2 or TLS1_3 for better security')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Export all storage validators
 */
export const storageValidators = [
  new StorageAccountNameValidator(),
  new StorageAccountPublicAccessValidator(),
  new StorageAccountNetworkAclsValidator(),
  new StorageAccountTlsVersionValidator(),
];
