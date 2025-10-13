import { BaseValidationRule, ValidationContext } from '../validation-rule';
import { ValidationResult, ValidationResultBuilder, ValidationSeverity } from '../validation-result';
import {
  validateLength,
  validatePattern,
  validateRange,
  validateStartsWith,
  validateEndsWith,
  validateNoConsecutive,
  warnGloballyUnique,
  collectResults,
} from '../common-validators';

/**
 * Validates Key Vault name format
 */
export class KeyVaultNameValidator extends BaseValidationRule {
  constructor() {
    super(
      'keyvault-name-format',
      'Validates Key Vault name follows Azure naming rules',
      ValidationSeverity.ERROR,
      ['Microsoft.KeyVault/vaults']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const name = resource.name || resource.vaultName;

    if (!name) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Key Vault name is required')
        .build();
    }

    const results: (ValidationResult | null)[] = [];

    // Length check (3-24)
    results.push(validateLength(name, 3, 24, 'Key Vault name', this.name));

    // Must start with letter
    results.push(validateStartsWith(name, 'letter', 'Key Vault name', this.name));

    // Must end with letter or number
    results.push(validateEndsWith(name, 'alphanumeric', 'Key Vault name', this.name));

    // No consecutive hyphens
    results.push(validateNoConsecutive(name, '-', 'Key Vault name', this.name));

    // Pattern check (alphanumeric and hyphens only)
    const pattern = /^[a-zA-Z][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    results.push(
      validatePattern(
        name,
        pattern,
        'Key Vault name',
        this.name,
        'Key Vault names must contain only alphanumeric characters and hyphens'
      )
    );

    // Add global uniqueness warning
    results.push(warnGloballyUnique(this.name, 'Key Vault'));

    return collectResults(...results);
  }
}

/**
 * Validates Key Vault soft delete and purge protection configuration
 */
export class KeyVaultSoftDeleteValidator extends BaseValidationRule {
  constructor() {
    super(
      'keyvault-soft-delete',
      'Validates Key Vault soft delete and purge protection settings',
      ValidationSeverity.ERROR,
      ['Microsoft.KeyVault/vaults']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const props = resource.properties || {};
    const enablePurgeProtection = props.enablePurgeProtection;
    const enableSoftDelete = props.enableSoftDelete;

    const results: ValidationResult[] = [];

    // Purge protection requires soft delete
    if (enablePurgeProtection && enableSoftDelete === false) {
      results.push(
        ValidationResultBuilder.error(this.name)
          .withMessage('Purge protection requires soft delete to be enabled')
          .withSuggestion('Set enableSoftDelete: true')
          .build()
      );
    }

    // Soft delete cannot be disabled (Azure policy requirement)
    if (enableSoftDelete === false) {
      results.push(
        ValidationResultBuilder.error(this.name)
          .withMessage('Soft delete cannot be disabled (Azure policy requirement)')
          .withSuggestion('Remove enableSoftDelete property or set to true')
          .withDetails('Soft delete is required for compliance and data protection')
          .build()
      );
    }

    return results.length > 0 ? results : ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Key Vault soft delete retention period
 */
export class KeyVaultRetentionValidator extends BaseValidationRule {
  constructor() {
    super(
      'keyvault-retention-period',
      'Validates Key Vault soft delete retention period is within valid range',
      ValidationSeverity.ERROR,
      ['Microsoft.KeyVault/vaults']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const retentionDays = resource.properties?.softDeleteRetentionInDays;

    if (!retentionDays) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('No soft delete retention period specified')
        .withSuggestion('Consider setting softDeleteRetentionInDays to 90 for maximum protection')
        .build();
    }

    const rangeResult = validateRange(
      retentionDays,
      7,
      90,
      'Soft delete retention period',
      this.name
    );

    if (rangeResult) {
      return rangeResult;
    }

    if (retentionDays < 90) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage(`Soft delete retention period is ${retentionDays} days`)
        .withSuggestion('Consider using 90-day retention for maximum data protection')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Key Vault RBAC vs Access Policies configuration
 */
export class KeyVaultRbacAccessPolicyValidator extends BaseValidationRule {
  constructor() {
    super(
      'keyvault-rbac-access-policy',
      'Warns when both RBAC and access policies are configured',
      ValidationSeverity.WARNING,
      ['Microsoft.KeyVault/vaults']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const props = resource.properties || {};
    const rbacEnabled = props.enableRbacAuthorization;
    const hasAccessPolicies = props.accessPolicies && props.accessPolicies.length > 0;

    if (rbacEnabled && hasAccessPolicies) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('Both RBAC and access policies are configured')
        .withSuggestion('Use RBAC exclusively for simpler management')
        .withDetails('RBAC is the recommended authorization method')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Key Vault network ACLs configuration
 */
export class KeyVaultNetworkAclsValidator extends BaseValidationRule {
  constructor() {
    super(
      'keyvault-network-acls',
      'Validates Key Vault network ACLs allow Azure services when needed',
      ValidationSeverity.WARNING,
      ['Microsoft.KeyVault/vaults']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const networkAcls = resource.properties?.networkAcls;

    if (!networkAcls) {
      return ValidationResultBuilder.success(this.name).build();
    }

    const defaultAction = networkAcls.defaultAction;
    const bypass = networkAcls.bypass;

    if (
      defaultAction === 'Deny' &&
      (!bypass || !bypass.includes('AzureServices'))
    ) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('Network ACLs deny all access without Azure Services bypass')
        .withSuggestion('Consider adding bypass: "AzureServices" to allow trusted Azure services')
        .withDetails('This allows services like Azure Backup and Azure Site Recovery to access the vault')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Key Vault public network access with private endpoints
 */
export class KeyVaultPublicAccessValidator extends BaseValidationRule {
  constructor() {
    super(
      'keyvault-public-access',
      'Validates Key Vault has private endpoints before disabling public access',
      ValidationSeverity.ERROR,
      ['Microsoft.KeyVault/vaults']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const publicAccess = resource.properties?.publicNetworkAccess;
    const hasPrivateEndpoints = context?.hasPrivateEndpoints;

    if (
      publicAccess === 'disabled' &&
      (!hasPrivateEndpoints || hasPrivateEndpoints === false)
    ) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Public network access disabled without private endpoints')
        .withSuggestion('Create private endpoints before disabling public access')
        .withDetails('Without either, the vault will be inaccessible')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Export all Key Vault validators
 */
export const keyVaultValidators = [
  new KeyVaultNameValidator(),
  new KeyVaultSoftDeleteValidator(),
  new KeyVaultRetentionValidator(),
  new KeyVaultRbacAccessPolicyValidator(),
  new KeyVaultNetworkAclsValidator(),
  new KeyVaultPublicAccessValidator(),
];
