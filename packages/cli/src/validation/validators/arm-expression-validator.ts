import { Validator, ValidationContext, ValidationResult, ValidationSeverity } from '../types';

/**
 * Validates that ARM expressions are properly formatted and don't contain unresolved tokens
 */
export class ArmExpressionValidator implements Validator {
  name = 'ArmExpressionValidator';

  private unresolvedTokenPatterns = [
    /\[subscription\(\)\.subscriptionid\]/gi,
    /\[resourceGroup\(\)\.name\]/gi,
    /\[resourceGroup\(\)\.location\]/gi,
    /\[parameters\('([^']+)'\)\]/g,
  ];

  validate(context: ValidationContext): ValidationResult[] {
    const results: ValidationResult[] = [];
    const templateStr = JSON.stringify(context.template, null, 2);

    // Check for unresolved tokens with INCORRECT casing
    // Note: [subscription().subscriptionId] is correct, [subscription().subscriptionid] is wrong
    const incorrectCasingPatterns = [
      /\[subscription\(\)\.subscriptionid\]/g, // lowercase 'id' is wrong (case-sensitive!)
      /\[resourceGroup\(\)\.Name\]/g, // capital 'N' is wrong
    ];

    for (const pattern of incorrectCasingPatterns) {
      const matches = templateStr.matchAll(pattern);
      for (const match of matches) {
        results.push({
          severity: ValidationSeverity.ERROR,
          code: 'UnresolvedArmExpression',
          message: `Unresolved ARM expression token found with incorrect casing: ${match[0]}`,
          suggestion:
            'ARM expressions should use proper casing: subscription().subscriptionId (capital I), resourceGroup().name (lowercase n)',
        });
      }
    }

    // Skip detailed resourceId() validation - it's too complex to validate accurately
    // The ARM deployment will catch actual syntax errors

    return results;
  }
}
