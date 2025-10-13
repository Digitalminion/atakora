/**
 * Azure Budget types and interfaces.
 *
 * @packageDocumentation
 */
import { schema } from '@atakora/lib';
/**
 * Time period for budget evaluation.
 *
 * @public
 */
export interface BudgetTimePeriod {
    /**
     * Start date for the budget (ISO 8601 format: YYYY-MM-DD).
     *
     * @remarks
     * Must be the first day of a month for Monthly budgets.
     */
    readonly startDate: string;
    /**
     * End date for the budget (ISO 8601 format: YYYY-MM-DD).
     *
     * @remarks
     * Optional. If not specified, budget has no end date.
     * Must be the last day of a month for Monthly budgets.
     */
    readonly endDate?: string;
}
/**
 * Time grain for budget evaluation.
 *
 * @public
 */
export declare const BudgetTimeGrain: typeof schema.consumption.BudgetTimeGrain;
export type BudgetTimeGrain = typeof BudgetTimeGrain[keyof typeof BudgetTimeGrain];
/**
 * Budget category type.
 *
 * @public
 */
export declare const BudgetCategory: typeof schema.consumption.BudgetCategory;
export type BudgetCategory = typeof BudgetCategory[keyof typeof BudgetCategory];
/**
 * Budget filter operator.
 *
 * @public
 */
export declare const BudgetFilterOperator: typeof schema.consumption.BudgetFilterOperator;
export type BudgetFilterOperator = typeof BudgetFilterOperator[keyof typeof BudgetFilterOperator];
/**
 * Budget filter for scoping costs.
 *
 * @remarks
 * Filters allow you to scope the budget to specific resources, resource groups,
 * or resource types.
 *
 * @public
 *
 * @example
 * Filter by resource group:
 * ```typescript
 * {
 *   dimensions: {
 *     name: 'ResourceGroupName',
 *     operator: BudgetFilterOperator.IN,
 *     values: ['rg-prod-001', 'rg-prod-002']
 *   }
 * }
 * ```
 *
 * @example
 * Filter by resource type:
 * ```typescript
 * {
 *   dimensions: {
 *     name: 'ResourceType',
 *     operator: BudgetFilterOperator.IN,
 *     values: ['Microsoft.Compute/virtualMachines']
 *   }
 * }
 * ```
 */
export interface BudgetFilter {
    /**
     * Dimension-based filters.
     *
     * @remarks
     * Common dimensions:
     * - ResourceGroupName
     * - ResourceType
     * - ResourceLocation
     * - MeterCategory
     * - MeterSubCategory
     */
    readonly dimensions?: {
        readonly name: string;
        readonly operator: BudgetFilterOperator;
        readonly values: string[];
    };
    /**
     * Tag-based filters.
     *
     * @remarks
     * Filter by resource tags.
     */
    readonly tags?: {
        readonly name: string;
        readonly operator: BudgetFilterOperator;
        readonly values: string[];
    };
}
/**
 * Threshold type for budget notifications.
 *
 * @public
 */
export declare const BudgetThresholdType: typeof schema.consumption.BudgetThresholdType;
export type BudgetThresholdType = typeof BudgetThresholdType[keyof typeof BudgetThresholdType];
/**
 * Operator for threshold comparison.
 *
 * @public
 */
export declare const BudgetOperator: typeof schema.consumption.BudgetOperator;
export type BudgetOperator = typeof BudgetOperator[keyof typeof BudgetOperator];
/**
 * Notification recipient.
 *
 * @public
 */
export interface BudgetNotificationRecipient {
    /**
     * Email addresses to notify.
     *
     * @remarks
     * Maximum 50 email addresses.
     */
    readonly contactEmails: string[];
    /**
     * Contact roles to notify.
     *
     * @remarks
     * Built-in Azure RBAC roles to notify (e.g., Owner, Contributor, Reader).
     */
    readonly contactRoles?: string[];
    /**
     * Action groups to trigger.
     *
     * @remarks
     * Resource IDs of Azure Monitor Action Groups.
     * Allows integration with webhooks, Azure Functions, Logic Apps, etc.
     */
    readonly contactGroups?: string[];
}
/**
 * Budget notification configuration.
 *
 * @remarks
 * Defines when and how to send notifications when budget thresholds are exceeded.
 *
 * @public
 *
 * @example
 * Alert at 80% of actual spend:
 * ```typescript
 * {
 *   enabled: true,
 *   operator: BudgetOperator.GREATER_THAN,
 *   threshold: 80,
 *   thresholdType: BudgetThresholdType.ACTUAL,
 *   contactEmails: ['finance@example.com']
 * }
 * ```
 *
 * @example
 * Alert at 100% forecasted spend:
 * ```typescript
 * {
 *   enabled: true,
 *   operator: BudgetOperator.GREATER_THAN_OR_EQUAL_TO,
 *   threshold: 100,
 *   thresholdType: BudgetThresholdType.FORECASTED,
 *   contactEmails: ['alerts@example.com'],
 *   contactRoles: ['Owner']
 * }
 * ```
 */
export interface BudgetNotification extends BudgetNotificationRecipient {
    /**
     * Whether notification is enabled.
     */
    readonly enabled: boolean;
    /**
     * Comparison operator.
     */
    readonly operator: BudgetOperator;
    /**
     * Threshold percentage (0-1000).
     *
     * @remarks
     * For cost budgets: percentage of budget amount.
     * For usage budgets: percentage of usage amount.
     *
     * Examples:
     * - 80 = 80% of budget
     * - 100 = 100% of budget
     * - 150 = 150% of budget
     */
    readonly threshold: number;
    /**
     * Type of threshold.
     */
    readonly thresholdType: BudgetThresholdType;
    /**
     * Locale for notification emails.
     *
     * @remarks
     * Default: 'en-us'
     */
    readonly locale?: string;
}
/**
 * Properties for Budget construct.
 *
 * @public
 *
 * @example
 * Monthly cost budget with notifications:
 * ```typescript
 * {
 *   amount: 10000,
 *   timeGrain: BudgetTimeGrain.MONTHLY,
 *   timePeriod: {
 *     startDate: '2024-01-01'
 *   },
 *   category: BudgetCategory.COST,
 *   notifications: {
 *     'Alert80': {
 *       enabled: true,
 *       operator: BudgetOperator.GREATER_THAN,
 *       threshold: 80,
 *       thresholdType: BudgetThresholdType.ACTUAL,
 *       contactEmails: ['finance@example.com']
 *     },
 *     'Alert100': {
 *       enabled: true,
 *       operator: BudgetOperator.GREATER_THAN_OR_EQUAL_TO,
 *       threshold: 100,
 *       thresholdType: BudgetThresholdType.ACTUAL,
 *       contactEmails: ['alerts@example.com'],
 *       contactRoles: ['Owner']
 *     }
 *   }
 * }
 * ```
 */
export interface BudgetProps {
    /**
     * Budget amount.
     *
     * @remarks
     * For cost budgets: amount in currency (USD, EUR, etc.).
     * For usage budgets: quantity amount.
     */
    readonly amount: number;
    /**
     * Time grain for budget evaluation.
     */
    readonly timeGrain: BudgetTimeGrain;
    /**
     * Time period for budget.
     */
    readonly timePeriod: BudgetTimePeriod;
    /**
     * Budget category.
     *
     * @remarks
     * Default: Cost
     */
    readonly category?: BudgetCategory;
    /**
     * Filter to scope the budget.
     *
     * @remarks
     * Optional. If not specified, budget applies to entire subscription.
     */
    readonly filter?: BudgetFilter;
    /**
     * Notification configurations.
     *
     * @remarks
     * Key is notification name, value is notification configuration.
     * Maximum 5 notifications per budget.
     *
     * Notification names must:
     * - Be 1-260 characters
     * - Contain only alphanumeric, underscore, hyphen, and period characters
     */
    readonly notifications?: Record<string, BudgetNotification>;
    /**
     * Display name for the budget.
     *
     * @remarks
     * Optional. If not specified, construct ID is used.
     */
    readonly displayName?: string;
}
//# sourceMappingURL=budget-types.d.ts.map