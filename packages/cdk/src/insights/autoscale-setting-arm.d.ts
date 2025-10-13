import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmAutoscaleSettingsProps } from './autoscale-setting-types';
/**
 * L1 construct for Azure Autoscale Setting.
 *
 * @remarks
 * Direct mapping to Microsoft.Insights/autoscaleSettings ARM resource.
 *
 * **ARM Resource Type**: `Microsoft.Insights/autoscaleSettings`
 * **API Version**: `2022-10-01`
 * **Deployment Scope**: ResourceGroup
 *
 * @example
 * ```typescript
 * const autoscale = new ArmAutoscaleSetting(resourceGroup, 'Autoscale', {
 *   name: 'autoscale-appplan',
 *   location: 'eastus',
 *   targetResourceId: appServicePlan.resourceId,
 *   profiles: [{
 *     name: 'Default',
 *     capacity: { minimum: '1', maximum: '10', default: '1' },
 *     rules: [...]
 *   }]
 * });
 * ```
 */
export declare class ArmAutoscaleSettings extends Resource {
    readonly resourceType: string;
    readonly apiVersion: string;
    readonly scope: DeploymentScope.ResourceGroup;
    readonly name: string;
    readonly location: string;
    readonly targetResourceId: string;
    readonly enabled: boolean;
    readonly profiles: readonly any[];
    readonly notifications?: readonly any[];
    readonly tags: Record<string, string>;
    readonly resourceId: string;
    constructor(scope: Construct, id: string, props: ArmAutoscaleSettingsProps);
    protected validateProps(props: ArmAutoscaleSettingsProps): void;
    toArmTemplate(): ArmResource;
}
//# sourceMappingURL=autoscale-setting-arm.d.ts.map