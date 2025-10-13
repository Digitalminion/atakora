/**
 * Azure Activity Log Alert - L1 ARM construct.
 *
 * @packageDocumentation
 */
import { Resource, ArmResource, ResourceProps, Construct } from '@atakora/lib';
import { ActivityLogAlertCondition, ActivityLogAlertAction } from './activity-log-alert-types';
/**
 * ARM-level properties for activity log alerts.
 *
 * @internal
 */
export interface ActivityLogAlertArmProps extends ResourceProps {
    readonly activityLogAlertName: string;
    readonly description?: string;
    readonly enabled?: boolean;
    readonly scopes: string[];
    readonly conditions: ActivityLogAlertCondition[];
    readonly actions: ActivityLogAlertAction[];
    readonly location?: string;
}
/**
 * L1 ARM construct for Azure Activity Log Alerts.
 *
 * @remarks
 * Creates Microsoft.Insights/activityLogAlerts resources at subscription scope.
 *
 * **Deployment Scope**: Subscription
 *
 * **ARM Resource Type**: `Microsoft.Insights/activityLogAlerts`
 * **API Version**: `2020-10-01`
 *
 * @internal
 */
export declare class ActivityLogAlertArm extends Resource {
    readonly resourceType = "Microsoft.Insights/activityLogAlerts";
    readonly apiVersion = "2020-10-01";
    readonly name: string;
    readonly resourceId: string;
    private readonly props;
    constructor(scope: Construct, id: string, props: ActivityLogAlertArmProps);
    protected validateProps(props: ActivityLogAlertArmProps): void;
    /**
     * Validates a single condition.
     *
     * @param condition - Condition to validate
     * @internal
     */
    private validateCondition;
    toArmTemplate(): ArmResource;
    /**
     * Builds ARM condition object from ActivityLogAlertCondition.
     *
     * @param condition - Activity log alert condition
     * @returns ARM condition object
     * @internal
     */
    private buildConditionObject;
    /**
     * Builds ARM action object from ActivityLogAlertAction.
     *
     * @param action - Activity log alert action
     * @returns ARM action object
     * @internal
     */
    private buildActionObject;
}
//# sourceMappingURL=activity-log-alert-arm.d.ts.map