import { BaseValidationRule, ValidationContext } from '../validation-rule';
import { ValidationResult, ValidationResultBuilder, ValidationSeverity } from '../validation-result';
import {
  validateLength,
  validatePattern,
  validateEnum,
  collectResults,
} from '../common-validators';

/**
 * Validates App Service Plan name format
 */
export class AppServicePlanNameValidator extends BaseValidationRule {
  constructor() {
    super(
      'appserviceplan-name-format',
      'Validates App Service Plan name follows Azure naming rules',
      ValidationSeverity.ERROR,
      ['Microsoft.Web/serverfarms']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const name = resource.name || resource.planName;

    if (!name) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('App Service Plan name is required')
        .build();
    }

    const results: (ValidationResult | null)[] = [];

    // Length check (1-40)
    results.push(validateLength(name, 1, 40, 'App Service Plan name', this.name));

    // Pattern check (alphanumeric and hyphens only)
    const pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    results.push(
      validatePattern(
        name,
        pattern,
        'App Service Plan name',
        this.name,
        'App Service Plan names must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen'
      )
    );

    return collectResults(...results);
  }
}

/**
 * Validates App Service Plan SKU configuration
 */
export class AppServicePlanSkuValidator extends BaseValidationRule {
  constructor() {
    super(
      'appserviceplan-sku',
      'Validates App Service Plan SKU is valid and appropriate',
      ValidationSeverity.ERROR,
      ['Microsoft.Web/serverfarms']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const sku = resource.sku;

    if (!sku) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('App Service Plan SKU is required')
        .withSuggestion('Set sku with name, tier, size, family, and capacity')
        .build();
    }

    const results: ValidationResult[] = [];

    // Validate SKU name
    const validSkuNames = [
      'F1',
      'D1',
      'B1',
      'B2',
      'B3',
      'S1',
      'S2',
      'S3',
      'P1',
      'P2',
      'P3',
      'P1v2',
      'P2v2',
      'P3v2',
      'P1v3',
      'P2v3',
      'P3v3',
      'EP1',
      'EP2',
      'EP3',
      'Y1',
    ];

    if (sku.name && !validSkuNames.includes(sku.name)) {
      results.push(
        ValidationResultBuilder.error(this.name)
          .withMessage(`Invalid SKU name: ${sku.name}`)
          .withSuggestion(`Valid SKU names: ${validSkuNames.join(', ')}`)
          .build()
      );
    }

    // Validate tier matches name
    const tierMapping: Record<string, string> = {
      F1: 'Free',
      D1: 'Shared',
      B1: 'Basic',
      B2: 'Basic',
      B3: 'Basic',
      S1: 'Standard',
      S2: 'Standard',
      S3: 'Standard',
      P1: 'Premium',
      P2: 'Premium',
      P3: 'Premium',
      P1v2: 'PremiumV2',
      P2v2: 'PremiumV2',
      P3v2: 'PremiumV2',
      P1v3: 'PremiumV3',
      P2v3: 'PremiumV3',
      P3v3: 'PremiumV3',
      EP1: 'ElasticPremium',
      EP2: 'ElasticPremium',
      EP3: 'ElasticPremium',
      Y1: 'Dynamic',
    };

    const expectedTier = tierMapping[sku.name];
    if (expectedTier && sku.tier && sku.tier !== expectedTier) {
      results.push(
        ValidationResultBuilder.error(this.name)
          .withMessage(`SKU tier "${sku.tier}" does not match name "${sku.name}"`)
          .withSuggestion(`Use tier: "${expectedTier}"`)
          .build()
      );
    }

    // Warn about free tier in production
    if (sku.name === 'F1' && context?.environment === 'production') {
      results.push(
        ValidationResultBuilder.warning(this.name)
          .withMessage('Free tier (F1) in production environment')
          .withSuggestion('Use Basic, Standard, or Premium tier for production')
          .withDetails('Free tier has limited resources and no SLA')
          .build()
      );
    }

    return results.length > 0 ? results : ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates App Service Plan zone redundancy configuration
 */
export class AppServicePlanZoneRedundancyValidator extends BaseValidationRule {
  constructor() {
    super(
      'appserviceplan-zone-redundancy',
      'Validates App Service Plan zone redundancy is properly configured',
      ValidationSeverity.WARNING,
      ['Microsoft.Web/serverfarms']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const zoneRedundant = resource.properties?.zoneRedundant;
    const sku = resource.sku;

    if (zoneRedundant && sku?.name) {
      // Zone redundancy is only supported on specific SKUs
      const supportsZoneRedundancy = ['P1v2', 'P2v2', 'P3v2', 'P1v3', 'P2v3', 'P3v3'].includes(
        sku.name
      );

      if (!supportsZoneRedundancy) {
        return ValidationResultBuilder.error(this.name)
          .withMessage(`SKU ${sku.name} does not support zone redundancy`)
          .withSuggestion('Use PremiumV2 or PremiumV3 SKU for zone redundancy')
          .build();
      }

      // Requires minimum capacity of 3
      if (sku.capacity && sku.capacity < 3) {
        return ValidationResultBuilder.error(this.name)
          .withMessage('Zone redundancy requires minimum capacity of 3')
          .withSuggestion('Set sku.capacity to 3 or higher')
          .build();
      }
    }

    // Recommend zone redundancy for production
    if (
      !zoneRedundant &&
      context?.environment === 'production' &&
      sku?.name?.startsWith('P')
    ) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('Production App Service Plan without zone redundancy')
        .withSuggestion('Enable zoneRedundant for high availability')
        .withDetails('Zone redundancy provides automatic failover across availability zones')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Function App name format
 */
export class FunctionAppNameValidator extends BaseValidationRule {
  constructor() {
    super(
      'functionapp-name-format',
      'Validates Function App name follows Azure naming rules',
      ValidationSeverity.ERROR,
      ['Microsoft.Web/sites']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const kind = resource.kind;
    if (!kind || !kind.includes('functionapp')) {
      return ValidationResultBuilder.success(this.name).build();
    }

    const name = resource.name || resource.siteName;

    if (!name) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Function App name is required')
        .build();
    }

    const results: (ValidationResult | null)[] = [];

    // Length check (2-60)
    results.push(validateLength(name, 2, 60, 'Function App name', this.name));

    // Pattern check (alphanumeric and hyphens only)
    const pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    results.push(
      validatePattern(
        name,
        pattern,
        'Function App name',
        this.name,
        'Function App names must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen'
      )
    );

    return collectResults(...results);
  }
}

/**
 * Validates Function App storage account configuration
 */
export class FunctionAppStorageValidator extends BaseValidationRule {
  constructor() {
    super(
      'functionapp-storage',
      'Validates Function App has required storage account configuration',
      ValidationSeverity.ERROR,
      ['Microsoft.Web/sites']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const kind = resource.kind;
    if (!kind || !kind.includes('functionapp')) {
      return ValidationResultBuilder.success(this.name).build();
    }

    const appSettings = resource.properties?.siteConfig?.appSettings || [];
    const azureWebJobsStorage = appSettings.find(
      (s: any) => s.name === 'AzureWebJobsStorage'
    );

    if (!azureWebJobsStorage) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Function App requires AzureWebJobsStorage app setting')
        .withSuggestion('Add AzureWebJobsStorage connection string to app settings')
        .withDetails('This storage account is used for internal function runtime operations')
        .build();
    }

    // Validate it's not empty
    if (!azureWebJobsStorage.value) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('AzureWebJobsStorage connection string is empty')
        .withSuggestion('Provide a valid storage account connection string')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Function App runtime version
 */
export class FunctionAppRuntimeValidator extends BaseValidationRule {
  constructor() {
    super(
      'functionapp-runtime',
      'Validates Function App runtime stack and version',
      ValidationSeverity.WARNING,
      ['Microsoft.Web/sites']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const kind = resource.kind;
    if (!kind || !kind.includes('functionapp')) {
      return ValidationResultBuilder.success(this.name).build();
    }

    const appSettings = resource.properties?.siteConfig?.appSettings || [];
    const runtimeVersion = appSettings.find(
      (s: any) => s.name === 'FUNCTIONS_EXTENSION_VERSION'
    );

    if (!runtimeVersion) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('FUNCTIONS_EXTENSION_VERSION not specified')
        .withSuggestion('Set FUNCTIONS_EXTENSION_VERSION to ~4 for latest runtime')
        .build();
    }

    // Warn about old runtime versions
    if (runtimeVersion.value && ['~1', '~2', '~3'].includes(runtimeVersion.value)) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage(`Runtime version ${runtimeVersion.value} is outdated`)
        .withSuggestion('Upgrade to ~4 for latest features and support')
        .withDetails('Older runtime versions may have reduced support')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Function App always-on configuration
 */
export class FunctionAppAlwaysOnValidator extends BaseValidationRule {
  constructor() {
    super(
      'functionapp-always-on',
      'Validates Function App always-on setting is appropriate for plan',
      ValidationSeverity.WARNING,
      ['Microsoft.Web/sites']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const kind = resource.kind;
    if (!kind || !kind.includes('functionapp')) {
      return ValidationResultBuilder.success(this.name).build();
    }

    const alwaysOn = resource.properties?.siteConfig?.alwaysOn;
    const appServicePlanId = resource.properties?.serverFarmId;

    // Get plan SKU from context if available
    const planSku = context?.resources?.get(appServicePlanId)?.sku?.name;

    // Always-on is not supported on Consumption plan (Y1)
    if (alwaysOn && planSku === 'Y1') {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Always-on is not supported on Consumption plan')
        .withSuggestion('Remove alwaysOn setting or use Premium/Dedicated plan')
        .build();
    }

    // Recommend always-on for non-consumption plans
    if (
      !alwaysOn &&
      planSku &&
      planSku !== 'Y1' &&
      context?.environment === 'production'
    ) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('Always-on is disabled on non-consumption plan')
        .withSuggestion('Enable always-on to prevent cold starts')
        .withDetails('Set siteConfig.alwaysOn: true')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Function App Application Insights configuration
 */
export class FunctionAppApplicationInsightsValidator extends BaseValidationRule {
  constructor() {
    super(
      'functionapp-appinsights',
      'Validates Function App has Application Insights configured',
      ValidationSeverity.WARNING,
      ['Microsoft.Web/sites']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const kind = resource.kind;
    if (!kind || !kind.includes('functionapp')) {
      return ValidationResultBuilder.success(this.name).build();
    }

    const appSettings = resource.properties?.siteConfig?.appSettings || [];
    const instrumentationKey = appSettings.find(
      (s: any) => s.name === 'APPINSIGHTS_INSTRUMENTATIONKEY'
    );
    const connectionString = appSettings.find(
      (s: any) => s.name === 'APPLICATIONINSIGHTS_CONNECTION_STRING'
    );

    if (!instrumentationKey && !connectionString) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('Application Insights not configured')
        .withSuggestion('Add APPLICATIONINSIGHTS_CONNECTION_STRING app setting')
        .withDetails('Application Insights provides monitoring, logging, and diagnostics')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Export all web validators
 */
export const webValidators = [
  new AppServicePlanNameValidator(),
  new AppServicePlanSkuValidator(),
  new AppServicePlanZoneRedundancyValidator(),
  new FunctionAppNameValidator(),
  new FunctionAppStorageValidator(),
  new FunctionAppRuntimeValidator(),
  new FunctionAppAlwaysOnValidator(),
  new FunctionAppApplicationInsightsValidator(),
];
