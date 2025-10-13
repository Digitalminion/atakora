import { BaseValidationRule, ValidationContext } from '../validation-rule';
import { ValidationResult, ValidationResultBuilder, ValidationSeverity } from '../validation-result';
import {
  validateLength,
  validatePattern,
  validateEnum,
  validateLowercase,
  warnGloballyUnique,
  collectResults,
} from '../common-validators';

/**
 * Validates Cosmos DB account name format
 */
export class CosmosDbAccountNameValidator extends BaseValidationRule {
  constructor() {
    super(
      'cosmosdb-account-name-format',
      'Validates Cosmos DB account name follows Azure naming rules',
      ValidationSeverity.ERROR,
      ['Microsoft.DocumentDB/databaseAccounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const name = resource.name || resource.accountName;

    if (!name) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Cosmos DB account name is required')
        .build();
    }

    const results: (ValidationResult | null)[] = [];

    // Must be lowercase
    results.push(validateLowercase(name, 'Cosmos DB account name', this.name));

    // Length check (3-44)
    results.push(validateLength(name, 3, 44, 'Cosmos DB account name', this.name));

    // Pattern check (lowercase alphanumeric and hyphens only)
    const pattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    results.push(
      validatePattern(
        name,
        pattern,
        'Cosmos DB account name',
        this.name,
        'Cosmos DB account names must contain only lowercase letters, numbers, and hyphens, and cannot start or end with a hyphen'
      )
    );

    // Add global uniqueness warning
    results.push(warnGloballyUnique(this.name, 'Cosmos DB account'));

    return collectResults(...results);
  }
}

/**
 * Validates Cosmos DB consistency level configuration
 */
export class CosmosDbConsistencyValidator extends BaseValidationRule {
  constructor() {
    super(
      'cosmosdb-consistency-level',
      'Validates Cosmos DB consistency level is valid',
      ValidationSeverity.ERROR,
      ['Microsoft.DocumentDB/databaseAccounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const consistency = resource.properties?.consistencyPolicy;

    if (!consistency) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('No consistency policy specified')
        .withSuggestion('Consider setting consistencyPolicy with defaultConsistencyLevel')
        .withDetails('Default is "Session" if not specified')
        .build();
    }

    const validLevels = ['Strong', 'BoundedStaleness', 'Session', 'ConsistentPrefix', 'Eventual'];
    const level = consistency.defaultConsistencyLevel;

    if (!level) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('defaultConsistencyLevel is required in consistencyPolicy')
        .withSuggestion(`Valid values: ${validLevels.join(', ')}`)
        .build();
    }

    const enumResult = validateEnum(level, validLevels, 'defaultConsistencyLevel', this.name);
    if (enumResult) {
      return enumResult;
    }

    // Validate BoundedStaleness parameters
    if (level === 'BoundedStaleness') {
      const maxStalenessPrefix = consistency.maxStalenessPrefix;
      const maxIntervalInSeconds = consistency.maxIntervalInSeconds;

      if (maxStalenessPrefix === undefined && maxIntervalInSeconds === undefined) {
        return ValidationResultBuilder.error(this.name)
          .withMessage('BoundedStaleness requires maxStalenessPrefix or maxIntervalInSeconds')
          .withSuggestion('Set maxStalenessPrefix (10-2147483647) or maxIntervalInSeconds (5-86400)')
          .build();
      }
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Cosmos DB multi-region configuration
 */
export class CosmosDbMultiRegionValidator extends BaseValidationRule {
  constructor() {
    super(
      'cosmosdb-multi-region',
      'Validates Cosmos DB multi-region consistency requirements',
      ValidationSeverity.WARNING,
      ['Microsoft.DocumentDB/databaseAccounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const locations = resource.properties?.locations;

    if (!locations || locations.length <= 1) {
      return ValidationResultBuilder.success(this.name).build();
    }

    const consistency = resource.properties?.consistencyPolicy?.defaultConsistencyLevel;

    if (consistency === 'Strong') {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('Strong consistency with multiple regions increases latency')
        .withSuggestion('Consider using BoundedStaleness for multi-region deployments')
        .withDetails('Strong consistency requires synchronous replication across all regions')
        .build();
    }

    // Check for write regions
    const writeRegions = locations.filter((loc: any) => loc.failoverPriority === 0);
    if (writeRegions.length > 1) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Only one region can have failoverPriority: 0 (primary write region)')
        .withSuggestion('Ensure failoverPriority values are unique starting from 0')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Cosmos DB backup policy configuration
 */
export class CosmosDbBackupPolicyValidator extends BaseValidationRule {
  constructor() {
    super(
      'cosmosdb-backup-policy',
      'Validates Cosmos DB backup policy configuration',
      ValidationSeverity.WARNING,
      ['Microsoft.DocumentDB/databaseAccounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const backupPolicy = resource.properties?.backupPolicy;

    if (!backupPolicy) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('No backup policy specified')
        .withSuggestion('Consider configuring continuous or periodic backup')
        .withDetails('Default is periodic backup with 8-hour intervals')
        .build();
    }

    const backupType = backupPolicy.type;

    if (backupType === 'Periodic') {
      const intervalInMinutes = backupPolicy.periodicModeProperties?.backupIntervalInMinutes;
      const retentionInHours = backupPolicy.periodicModeProperties?.backupRetentionIntervalInHours;

      if (!intervalInMinutes || intervalInMinutes < 60) {
        return ValidationResultBuilder.warning(this.name)
          .withMessage('Backup interval should be at least 60 minutes')
          .withSuggestion('Set backupIntervalInMinutes to 60 or higher')
          .build();
      }

      if (!retentionInHours || retentionInHours < 8) {
        return ValidationResultBuilder.warning(this.name)
          .withMessage('Backup retention should be at least 8 hours')
          .withSuggestion('Set backupRetentionIntervalInHours to 8 or higher')
          .build();
      }
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Cosmos DB automatic failover configuration
 */
export class CosmosDbAutomaticFailoverValidator extends BaseValidationRule {
  constructor() {
    super(
      'cosmosdb-automatic-failover',
      'Validates Cosmos DB automatic failover settings',
      ValidationSeverity.WARNING,
      ['Microsoft.DocumentDB/databaseAccounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const locations = resource.properties?.locations;
    const enableAutomaticFailover = resource.properties?.enableAutomaticFailover;

    if (!locations || locations.length <= 1) {
      if (enableAutomaticFailover) {
        return ValidationResultBuilder.warning(this.name)
          .withMessage('Automatic failover requires multiple regions')
          .withSuggestion('Add additional regions to locations array')
          .build();
      }
      return ValidationResultBuilder.success(this.name).build();
    }

    // Multi-region deployment
    if (!enableAutomaticFailover) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('Multi-region deployment without automatic failover')
        .withSuggestion('Consider enabling automatic failover for high availability')
        .withDetails('Set enableAutomaticFailover: true')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Cosmos DB capabilities are compatible
 */
export class CosmosDbCapabilitiesValidator extends BaseValidationRule {
  constructor() {
    super(
      'cosmosdb-capabilities',
      'Validates Cosmos DB capabilities are compatible',
      ValidationSeverity.ERROR,
      ['Microsoft.DocumentDB/databaseAccounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const capabilities = resource.properties?.capabilities || [];

    if (capabilities.length === 0) {
      return ValidationResultBuilder.success(this.name).build();
    }

    const capabilityNames = capabilities.map((c: any) => c.name);

    // Check for incompatible capabilities
    const apiCapabilities = [
      'EnableCassandra',
      'EnableGremlin',
      'EnableMongo',
      'EnableTable',
    ];

    const enabledApis = apiCapabilities.filter((api) => capabilityNames.includes(api));

    if (enabledApis.length > 1) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Cannot enable multiple API capabilities')
        .withSuggestion('Use only one API capability (Cassandra, Gremlin, Mongo, or Table)')
        .withDetails(`Currently enabled: ${enabledApis.join(', ')}`)
        .build();
    }

    // Serverless incompatibilities
    if (capabilityNames.includes('EnableServerless')) {
      if (capabilityNames.includes('EnableAnalyticalStorage')) {
        return ValidationResultBuilder.error(this.name)
          .withMessage('Serverless mode is incompatible with analytical storage')
          .withSuggestion('Remove EnableAnalyticalStorage capability')
          .build();
      }

      const locations = resource.properties?.locations || [];
      if (locations.length > 1) {
        return ValidationResultBuilder.error(this.name)
          .withMessage('Serverless mode does not support multi-region writes')
          .withSuggestion('Use single region for serverless accounts')
          .build();
      }
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Cosmos DB network ACLs configuration
 */
export class CosmosDbNetworkAclsValidator extends BaseValidationRule {
  constructor() {
    super(
      'cosmosdb-network-acls',
      'Validates Cosmos DB network ACLs and firewall rules',
      ValidationSeverity.WARNING,
      ['Microsoft.DocumentDB/databaseAccounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const publicNetworkAccess = resource.properties?.publicNetworkAccess;
    const ipRules = resource.properties?.ipRules || [];
    const virtualNetworkRules = resource.properties?.virtualNetworkRules || [];

    if (publicNetworkAccess === 'Disabled') {
      if (virtualNetworkRules.length === 0) {
        return ValidationResultBuilder.warning(this.name)
          .withMessage('Public network access disabled without virtual network rules')
          .withSuggestion('Add virtual network rules or use private endpoints for access')
          .withDetails('Account will be inaccessible without private connectivity')
          .build();
      }
    }

    // Check for overly permissive IP rules
    const hasWildcard = ipRules.some((rule: any) =>
      rule.ipAddressOrRange === '0.0.0.0/0' || rule.ipAddressOrRange === '*'
    );

    if (hasWildcard) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('IP rules allow access from all addresses (0.0.0.0/0)')
        .withSuggestion('Restrict IP rules to specific address ranges')
        .withDetails('Consider using virtual network rules or private endpoints instead')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Export all database validators
 */
export const databaseValidators = [
  new CosmosDbAccountNameValidator(),
  new CosmosDbConsistencyValidator(),
  new CosmosDbMultiRegionValidator(),
  new CosmosDbBackupPolicyValidator(),
  new CosmosDbAutomaticFailoverValidator(),
  new CosmosDbCapabilitiesValidator(),
  new CosmosDbNetworkAclsValidator(),
];
