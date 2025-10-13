import { BaseValidationRule, ValidationContext } from '../validation-rule';
import { ValidationResult, ValidationResultBuilder, ValidationSeverity } from '../validation-result';
import {
  validateLength,
  validatePattern,
  validateEnum,
  warnGloballyUnique,
  collectResults,
} from '../common-validators';

/**
 * Validates Cognitive Services account name format
 */
export class CognitiveServicesAccountNameValidator extends BaseValidationRule {
  constructor() {
    super(
      'cognitiveservices-account-name-format',
      'Validates Cognitive Services account name follows Azure naming rules',
      ValidationSeverity.ERROR,
      ['Microsoft.CognitiveServices/accounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const name = resource.name || resource.accountName;

    if (!name) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Cognitive Services account name is required')
        .build();
    }

    const results: (ValidationResult | null)[] = [];

    // Length check (2-64)
    results.push(validateLength(name, 2, 64, 'Cognitive Services account name', this.name));

    // Pattern check (alphanumeric and hyphens only)
    const pattern = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/;
    results.push(
      validatePattern(
        name,
        pattern,
        'Cognitive Services account name',
        this.name,
        'Cognitive Services account names must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen'
      )
    );

    // Add global uniqueness warning
    results.push(warnGloballyUnique(this.name, 'Cognitive Services account'));

    return collectResults(...results);
  }
}

/**
 * Validates OpenAI deployment model and version
 */
export class OpenAIDeploymentModelValidator extends BaseValidationRule {
  constructor() {
    super(
      'openai-deployment-model',
      'Validates OpenAI deployment has valid model and version',
      ValidationSeverity.ERROR,
      ['Microsoft.CognitiveServices/accounts/deployments']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const model = resource.properties?.model;

    if (!model) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('OpenAI deployment must specify a model')
        .withSuggestion('Set properties.model with name and version')
        .build();
    }

    const results: ValidationResult[] = [];

    if (!model.name) {
      results.push(
        ValidationResultBuilder.error(this.name)
          .withMessage('Model name is required')
          .withSuggestion('Set model.name (e.g., "gpt-4", "gpt-35-turbo", "text-embedding-ada-002")')
          .build()
      );
    }

    if (!model.version) {
      results.push(
        ValidationResultBuilder.error(this.name)
          .withMessage('Model version is required')
          .withSuggestion('Set model.version (e.g., "0613", "1106")')
          .build()
      );
    }

    return results.length > 0 ? results : ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates OpenAI deployment capacity (TPM) is within limits
 */
export class OpenAIDeploymentCapacityValidator extends BaseValidationRule {
  constructor() {
    super(
      'openai-deployment-capacity',
      'Validates OpenAI deployment capacity is within quota limits',
      ValidationSeverity.WARNING,
      ['Microsoft.CognitiveServices/accounts/deployments']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const sku = resource.sku;
    const capacity = sku?.capacity;

    if (!capacity) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('No capacity specified for OpenAI deployment')
        .withSuggestion('Set sku.capacity in thousands of tokens per minute (TPM)')
        .withDetails('Default capacity may be insufficient for production workloads')
        .build();
    }

    // Warn about very low capacity
    if (capacity < 10) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage(`Deployment capacity is ${capacity}K TPM, which may be too low`)
        .withSuggestion('Consider increasing capacity for production workloads')
        .withDetails('Low capacity may cause throttling under load')
        .build();
    }

    // Warn about very high capacity
    if (capacity > 300) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage(`Deployment capacity is ${capacity}K TPM, which may exceed quota`)
        .withSuggestion('Verify your subscription has sufficient quota')
        .withDetails('High capacity may require quota increase request')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates OpenAI deployment naming for uniqueness
 */
export class OpenAIDeploymentNameValidator extends BaseValidationRule {
  constructor() {
    super(
      'openai-deployment-name',
      'Validates OpenAI deployment name is unique and descriptive',
      ValidationSeverity.WARNING,
      ['Microsoft.CognitiveServices/accounts/deployments']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const name = resource.name || resource.deploymentName;

    if (!name) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('OpenAI deployment name is required')
        .build();
    }

    const model = resource.properties?.model?.name;

    // Warn if deployment name doesn't indicate the model
    if (model && !name.toLowerCase().includes(model.toLowerCase())) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('Deployment name does not indicate the model type')
        .withSuggestion(`Consider including "${model}" in the deployment name for clarity`)
        .withDetails('Descriptive names help identify deployments when multiple models are used')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Cognitive Services network ACLs configuration
 */
export class CognitiveServicesNetworkAclsValidator extends BaseValidationRule {
  constructor() {
    super(
      'cognitiveservices-network-acls',
      'Validates Cognitive Services network ACLs are configured appropriately',
      ValidationSeverity.WARNING,
      ['Microsoft.CognitiveServices/accounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const networkAcls = resource.properties?.networkAcls;

    if (!networkAcls) {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('No network ACLs configured')
        .withSuggestion('Consider restricting access with network ACLs or private endpoints')
        .withDetails('By default, Cognitive Services accounts are accessible from all networks')
        .build();
    }

    const defaultAction = networkAcls.defaultAction;

    if (defaultAction === 'Allow') {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('Network ACLs allow access from all networks')
        .withSuggestion('Set defaultAction to "Deny" and specify allowed networks')
        .withDetails('Unrestricted access may pose security risks')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Cognitive Services SKU is appropriate for workload
 */
export class CognitiveServicesSkuValidator extends BaseValidationRule {
  constructor() {
    super(
      'cognitiveservices-sku',
      'Validates Cognitive Services SKU is appropriate for the workload',
      ValidationSeverity.WARNING,
      ['Microsoft.CognitiveServices/accounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const sku = resource.sku;

    if (!sku || !sku.name) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('SKU name is required')
        .withSuggestion('Set sku.name (e.g., "S0", "S1", "F0")')
        .build();
    }

    const skuName = sku.name;
    const kind = resource.kind;

    // Warn about free tier in production
    if (skuName === 'F0' && context?.environment === 'production') {
      return ValidationResultBuilder.warning(this.name)
        .withMessage('Free tier (F0) SKU in production environment')
        .withSuggestion('Use a standard SKU (S0 or higher) for production workloads')
        .withDetails('Free tier has limited quota and no SLA')
        .build();
    }

    // OpenAI-specific SKU validation
    if (kind === 'OpenAI' && skuName !== 'S0') {
      return ValidationResultBuilder.warning(this.name)
        .withMessage(`SKU "${skuName}" may not be supported for OpenAI`)
        .withSuggestion('Use "S0" SKU for OpenAI accounts')
        .build();
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Validates Cognitive Services custom subdomain configuration
 */
export class CognitiveServicesCustomSubdomainValidator extends BaseValidationRule {
  constructor() {
    super(
      'cognitiveservices-custom-subdomain',
      'Validates custom subdomain is configured when required',
      ValidationSeverity.ERROR,
      ['Microsoft.CognitiveServices/accounts']
    );
  }

  validate(resource: any, context?: ValidationContext): ValidationResult | ValidationResult[] {
    const customSubDomainName = resource.properties?.customSubDomainName;
    const kind = resource.kind;
    const networkAcls = resource.properties?.networkAcls;
    const privateEndpoints = resource.properties?.privateEndpointConnections?.length > 0;

    // Custom subdomain is required for certain scenarios
    const requiresCustomSubdomain =
      kind === 'OpenAI' ||
      privateEndpoints ||
      (networkAcls && networkAcls.defaultAction === 'Deny');

    if (requiresCustomSubdomain && !customSubDomainName) {
      return ValidationResultBuilder.error(this.name)
        .withMessage('Custom subdomain is required for this configuration')
        .withSuggestion('Set properties.customSubDomainName')
        .withDetails(
          kind === 'OpenAI'
            ? 'OpenAI accounts require a custom subdomain'
            : 'Private endpoints and network restrictions require a custom subdomain'
        )
        .build();
    }

    // Validate subdomain format
    if (customSubDomainName) {
      const pattern = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
      if (!pattern.test(customSubDomainName)) {
        return ValidationResultBuilder.error(this.name)
          .withMessage('Custom subdomain name has invalid format')
          .withSuggestion('Use only lowercase letters, numbers, and hyphens')
          .withDetails('Cannot start or end with a hyphen')
          .build();
      }

      if (customSubDomainName.length < 2 || customSubDomainName.length > 64) {
        return ValidationResultBuilder.error(this.name)
          .withMessage('Custom subdomain name must be 2-64 characters')
          .withDetails(`Current length: ${customSubDomainName.length}`)
          .build();
      }
    }

    return ValidationResultBuilder.success(this.name).build();
  }
}

/**
 * Export all cognitive services validators
 */
export const cognitiveServicesValidators = [
  new CognitiveServicesAccountNameValidator(),
  new OpenAIDeploymentModelValidator(),
  new OpenAIDeploymentCapacityValidator(),
  new OpenAIDeploymentNameValidator(),
  new CognitiveServicesNetworkAclsValidator(),
  new CognitiveServicesSkuValidator(),
  new CognitiveServicesCustomSubdomainValidator(),
];
