/**
 * Enums for Azure Consumption (Microsoft.Consumption).
 *
 * @remarks
 * Curated enums extracted from Microsoft.Consumption Azure schema.
 *
 * **Resource Type**: Microsoft.Consumption/budgets
 * **API Version**: 2023-11-01
 *
 * @packageDocumentation
 */

/**
 * Time grain for budget evaluation.
 */
export enum BudgetTimeGrain {
  /**
   * Monthly budget evaluation.
   */
  MONTHLY = 'Monthly',

  /**
   * Quarterly budget evaluation.
   */
  QUARTERLY = 'Quarterly',

  /**
   * Annual budget evaluation.
   */
  ANNUALLY = 'Annually',

  /**
   * Budget for a specific billing month (legacy).
   * @deprecated Use Monthly with specific time period instead.
   */
  BILLING_MONTH = 'BillingMonth',

  /**
   * Budget for a specific billing quarter (legacy).
   * @deprecated Use Quarterly with specific time period instead.
   */
  BILLING_QUARTER = 'BillingQuarter',

  /**
   * Budget for a specific billing year (legacy).
   * @deprecated Use Annually with specific time period instead.
   */
  BILLING_ANNUAL = 'BillingAnnual',
}

/**
 * Budget category type.
 */
export enum BudgetCategory {
  /**
   * Track actual costs.
   */
  COST = 'Cost',

  /**
   * Track usage (quantity-based).
   */
  USAGE = 'Usage',
}

/**
 * Budget filter operator.
 */
export enum BudgetFilterOperator {
  IN = 'In',
}

/**
 * Threshold type for budget notifications.
 */
export enum BudgetThresholdType {
  /**
   * Actual costs threshold.
   */
  ACTUAL = 'Actual',

  /**
   * Forecasted costs threshold.
   */
  FORECASTED = 'Forecasted',
}

/**
 * Operator for threshold comparison.
 */
export enum BudgetOperator {
  /**
   * Threshold is met when value equals or exceeds threshold.
   */
  GREATER_THAN = 'GreaterThan',

  /**
   * Threshold is met when value equals or exceeds threshold (alias).
   */
  GREATER_THAN_OR_EQUAL_TO = 'GreaterThanOrEqualTo',

  /**
   * Threshold is met when value equals threshold.
   */
  EQUAL_TO = 'EqualTo',
}
