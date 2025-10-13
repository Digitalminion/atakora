/**
 * Azure Budget - L1 ARM construct.
 *
 * @packageDocumentation
 */
import { Resource, ArmResource, ResourceProps, Construct } from '@atakora/lib';
import { BudgetTimeGrain, BudgetCategory, BudgetFilter, BudgetNotification } from './budget-types';
/**
 * ARM-level properties for budgets.
 *
 * @internal
 */
export interface BudgetArmProps extends ResourceProps {
    readonly budgetName: string;
    readonly amount: number;
    readonly timeGrain: BudgetTimeGrain;
    readonly timePeriod: {
        readonly startDate: string;
        readonly endDate?: string;
    };
    readonly category?: BudgetCategory;
    readonly filter?: BudgetFilter;
    readonly notifications?: Record<string, BudgetNotification>;
}
/**
 * L1 ARM construct for Azure Budgets.
 *
 * @remarks
 * Creates Microsoft.CostManagement/budgets resources at subscription scope.
 *
 * **Deployment Scope**: Subscription
 *
 * **ARM Resource Type**: `Microsoft.CostManagement/budgets`
 * **API Version**: `2023-11-01`
 *
 * @internal
 */
export declare class BudgetArm extends Resource {
    readonly resourceType = "Microsoft.CostManagement/budgets";
    readonly apiVersion = "2023-11-01";
    readonly name: string;
    readonly resourceId: string;
    private readonly props;
    constructor(scope: Construct, id: string, props: BudgetArmProps);
    protected validateProps(props: BudgetArmProps): void;
    /**
     * Validates a single notification configuration.
     *
     * @param name - Notification name
     * @param notification - Notification configuration
     * @internal
     */
    private validateNotification;
    toArmTemplate(): ArmResource;
    /**
     * Builds ARM filter object from BudgetFilter.
     *
     * @param filter - Budget filter
     * @returns ARM filter object
     * @internal
     */
    private buildFilterObject;
    /**
     * Builds ARM notifications object.
     *
     * @param notifications - Notification configurations
     * @returns ARM notifications object
     * @internal
     */
    private buildNotificationsObject;
}
//# sourceMappingURL=budget-arm.d.ts.map