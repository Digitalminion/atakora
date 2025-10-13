import { Construct } from '@atakora/cdk';
import type { AutoscaleSettingsProps, IAutoscaleSetting } from './autoscale-setting-types';
/**
 * L2 construct for Azure Autoscale Setting.
 *
 * @remarks
 * Provides both simplified and advanced interfaces for autoscaling.
 *
 * @example
 * Simple CPU-based autoscaling:
 * ```typescript
 * const autoscale = new AutoscaleSetting(resourceGroup, 'AppPlanAutoscale', {
 *   targetResourceId: appServicePlan.resourceId,
 *   minInstances: 1,
 *   maxInstances: 10,
 *   defaultInstances: 2,
 *   rules: [{
 *     metricTrigger: {
 *       metricResourceId: appServicePlan.resourceId,
 *       metricName: 'CpuPercentage',
 *       timeGrain: 'PT1M',
 *       statistic: 'Average',
 *       timeWindow: 'PT5M',
 *       timeAggregation: 'Average',
 *       operator: 'GreaterThan',
 *       threshold: 70
 *     },
 *     scaleAction: {
 *       direction: 'Increase',
 *       type: 'ChangeCount',
 *       value: '1',
 *       cooldown: 'PT5M'
 *     }
 *   }]
 * });
 * ```
 */
export declare class AutoscaleSettings extends Construct implements IAutoscaleSetting {
    private readonly armAutoscaleSetting;
    private readonly parentResourceGroup;
    readonly name: string;
    readonly location: string;
    readonly resourceGroupName: string;
    readonly resourceId: string;
    readonly tags: Record<string, string>;
    constructor(scope: Construct, id: string, props: AutoscaleSettingsProps);
    private buildProfiles;
    private getParentResourceGroup;
    private isResourceGroup;
    private getParentTags;
    private resolveSettingName;
    private getSubscriptionStack;
}
//# sourceMappingURL=autoscale-setting.d.ts.map