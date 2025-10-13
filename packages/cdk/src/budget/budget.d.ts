/**
 * Azure Budget - L2 construct.
 *
 * @packageDocumentation
 */
import { Construct } from '@atakora/lib';
import { BudgetProps, BudgetCategory } from './budget-types';
/**
 * L2 construct for Azure Budgets.
 *
 * @remarks
 * Creates and manages Azure Cost Management budgets at subscription scope.
 * Budgets help you plan for and drive organizational accountability by tracking
 * Azure costs and usage over time.
 *
 * **Use Cases**:
 * - Cost control and monitoring
 * - Department/team budget allocation
 * - Project cost tracking
 * - Prevent cost overruns
 * - Compliance and governance
 *
 * **Key Features**:
 * - Multiple notification thresholds (up to 5)
 * - Actual or forecasted cost alerts
 * - Email and Action Group integration
 * - Resource/tag filtering
 * - Monthly, Quarterly, or Annual tracking
 *
 * @public
 *
 * @example
 * Simple monthly cost budget:
 * ```typescript
 * import { Budget, BudgetTimeGrain, BudgetCategory } from '@atakora/cdk';
 * import { BudgetThresholdType, BudgetOperator } from '@atakora/cdk';
 *
 * const monthlyBudget = new Budget(subscriptionStack, 'MonthlyBudget', {
 *   amount: 10000,
 *   timeGrain: BudgetTimeGrain.MONTHLY,
 *   timePeriod: {
 *     startDate: '2024-01-01'
 *   },
 *   notifications: {
 *     'Alert80': {
 *       enabled: true,
 *       operator: BudgetOperator.GREATER_THAN,
 *       threshold: 80,
 *       thresholdType: BudgetThresholdType.ACTUAL,
 *       contactEmails: ['finance@example.com']
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * Budget with multiple alert thresholds:
 * ```typescript
 * const tieredBudget = new Budget(subscriptionStack, 'TieredBudget', {
 *   amount: 50000,
 *   timeGrain: BudgetTimeGrain.MONTHLY,
 *   timePeriod: {
 *     startDate: '2024-01-01',
 *     endDate: '2024-12-31'
 *   },
 *   notifications: {
 *     'Warning50': {
 *       enabled: true,
 *       operator: BudgetOperator.GREATER_THAN,
 *       threshold: 50,
 *       thresholdType: BudgetThresholdType.ACTUAL,
 *       contactEmails: ['team@example.com']
 *     },
 *     'Alert80': {
 *       enabled: true,
 *       operator: BudgetOperator.GREATER_THAN,
 *       threshold: 80,
 *       thresholdType: BudgetThresholdType.ACTUAL,
 *       contactEmails: ['manager@example.com'],
 *       contactRoles: ['Contributor']
 *     },
 *     'Critical100': {
 *       enabled: true,
 *       operator: BudgetOperator.GREATER_THAN_OR_EQUAL_TO,
 *       threshold: 100,
 *       thresholdType: BudgetThresholdType.ACTUAL,
 *       contactEmails: ['alerts@example.com'],
 *       contactRoles: ['Owner']
 *     },
 *     'Forecast110': {
 *       enabled: true,
 *       operator: BudgetOperator.GREATER_THAN,
 *       threshold: 110,
 *       thresholdType: BudgetThresholdType.FORECASTED,
 *       contactEmails: ['forecasting@example.com']
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * Budget scoped to specific resource groups:
 * ```typescript
 * import { BudgetFilterOperator } from '@atakora/cdk';
 *
 * const projectBudget = new Budget(subscriptionStack, 'ProjectBudget', {
 *   amount: 5000,
 *   timeGrain: BudgetTimeGrain.MONTHLY,
 *   timePeriod: {
 *     startDate: '2024-01-01'
 *   },
 *   filter: {
 *     dimensions: {
 *       name: 'ResourceGroupName',
 *       operator: BudgetFilterOperator.IN,
 *       values: ['rg-project-dev', 'rg-project-test', 'rg-project-prod']
 *     }
 *   },
 *   notifications: {
 *     'ProjectAlert90': {
 *       enabled: true,
 *       operator: BudgetOperator.GREATER_THAN,
 *       threshold: 90,
 *       thresholdType: BudgetThresholdType.ACTUAL,
 *       contactEmails: ['project-team@example.com']
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * Budget with Action Group integration:
 * ```typescript
 * import { ActionGroups } from '@atakora/cdk/insights';
 *
 * const actionGroup = new ActionGroups(resourceGroupStack, 'CostAlerts', {
 *   // ... action group configuration
 * });
 *
 * const automatedBudget = new Budget(subscriptionStack, 'AutomatedBudget', {
 *   amount: 20000,
 *   timeGrain: BudgetTimeGrain.MONTHLY,
 *   timePeriod: {
 *     startDate: '2024-01-01'
 *   },
 *   notifications: {
 *     'AutomatedAlert': {
 *       enabled: true,
 *       operator: BudgetOperator.GREATER_THAN,
 *       threshold: 85,
 *       thresholdType: BudgetThresholdType.ACTUAL,
 *       contactEmails: ['alerts@example.com'],
 *       contactGroups: [actionGroup.resourceId] // Trigger automation
 *     }
 *   }
 * });
 * ```
 *
 * @example
 * Budget filtered by tags:
 * ```typescript
 * const departmentBudget = new Budget(subscriptionStack, 'EngineeringBudget', {
 *   amount: 15000,
 *   timeGrain: BudgetTimeGrain.QUARTERLY,
 *   timePeriod: {
 *     startDate: '2024-01-01'
 *   },
 *   filter: {
 *     tags: {
 *       name: 'Department',
 *       operator: BudgetFilterOperator.IN,
 *       values: ['Engineering']
 *     }
 *   },
 *   notifications: {
 *     'DeptAlert75': {
 *       enabled: true,
 *       operator: BudgetOperator.GREATER_THAN,
 *       threshold: 75,
 *       thresholdType: BudgetThresholdType.ACTUAL,
 *       contactEmails: ['engineering-finance@example.com']
 *     }
 *   }
 * });
 * ```
 */
export declare class Budget extends Construct {
    /**
     * Underlying L1 construct.
     * @internal
     */
    private readonly armBudget;
    /**
     * Budget amount.
     */
    readonly amount: number;
    /**
     * Budget name.
     */
    readonly budgetName: string;
    /**
     * Resource ID of the budget.
     */
    readonly budgetId: string;
    /**
     * Budget category (Cost or Usage).
     */
    readonly category: BudgetCategory;
    /**
     * Creates a new Budget.
     *
     * @param scope - Parent construct (must be SubscriptionStack)
     * @param id - Unique construct ID
     * @param props - Budget properties
     *
     * @throws {Error} If scope is not a SubscriptionStack
     * @throws {Error} If budget configuration is invalid
     */
    constructor(scope: Construct, id: string, props: BudgetProps);
    /**
     * Validates that the parent scope is a SubscriptionStack.
     *
     * @param scope - Parent construct
     * @throws {Error} If parent is not a SubscriptionStack
     * @internal
     */
    private validateParentScope;
    /**
     * Checks if a construct is a SubscriptionStack using duck typing.
     *
     * @param construct - Construct to check
     * @returns True if construct has SubscriptionStack properties
     * @internal
     */
    private isSubscriptionStack;
    /**
     * Generates a budget name from display name or construct ID.
     *
     * @param name - Display name or construct ID
     * @returns Budget name
     * @internal
     */
    private generateBudgetName;
}
//# sourceMappingURL=budget.d.ts.map