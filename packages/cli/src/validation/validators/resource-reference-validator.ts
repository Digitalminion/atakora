import { Validator, ValidationContext, ValidationResult, ValidationSeverity } from '../types';

/**
 * Validates resource references to ensure they use proper ARM expressions
 */
export class ResourceReferenceValidator implements Validator {
  name = 'ResourceReferenceValidator';

  validate(context: ValidationContext): ValidationResult[] {
    const results: ValidationResult[] = [];
    const templateStr = JSON.stringify(context.template, null, 2);

    // Check for resource IDs with INCORRECT casing (lowercase 'id')
    const subscriptionTokenPattern = /\/subscriptions\/\[subscription\(\)\.subscriptionid\]/g;
    if (subscriptionTokenPattern.test(templateStr)) {
      results.push({
        severity: ValidationSeverity.ERROR,
        code: 'ResourceReferenceUsesWrongSubscriptionId',
        message:
          'Resource reference contains incorrect casing: [subscription().subscriptionid] - should be subscriptionId with capital I',
        suggestion: 'Use proper casing: [subscription().subscriptionId] with capital I',
      });
    }

    // Check for resource group references with capital N (should be lowercase)
    const rgTokenPattern = /\/resourceGroups\/\[resourceGroup\(\)\.Name\]/g;
    if (rgTokenPattern.test(templateStr)) {
      results.push({
        severity: ValidationSeverity.ERROR,
        code: 'ResourceReferenceUsesWrongResourceGroup',
        message:
          'Resource reference contains incorrect casing: [resourceGroup().Name] - should be name with lowercase n',
        suggestion: 'Use proper casing: [resourceGroup().name] with lowercase n',
      });
    }

    return results;
  }
}
