import { Construct } from '../../core/construct';
import type { IResourceGroup } from '../resource-group/types';
import { ArmAutoscaleSetting } from './arm-autoscale-setting';
import type { AutoscaleSettingProps, IAutoscaleSetting, AutoscaleProfile } from './types';

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
export class AutoscaleSetting extends Construct implements IAutoscaleSetting {
  private readonly armAutoscaleSetting: ArmAutoscaleSetting;
  private readonly parentResourceGroup: IResourceGroup;

  public readonly name: string;
  public readonly location: string;
  public readonly resourceGroupName: string;
  public readonly resourceId: string;
  public readonly tags: Record<string, string>;

  constructor(scope: Construct, id: string, props: AutoscaleSettingProps) {
    super(scope, id);

    this.parentResourceGroup = this.getParentResourceGroup(scope);
    this.name = this.resolveSettingName(id, props);
    this.location = props?.location ?? this.parentResourceGroup.location;
    this.resourceGroupName = this.parentResourceGroup.resourceGroupName;

    this.tags = {
      ...this.getParentTags(scope),
      ...props?.tags,
    };

    // Build profiles
    const profiles = this.buildProfiles(props);

    this.armAutoscaleSetting = new ArmAutoscaleSetting(scope, `${id}-Resource`, {
      name: this.name,
      location: this.location,
      targetResourceId: props.targetResourceId,
      enabled: props.enabled ?? true,
      profiles,
      notifications: props.notifications,
      tags: this.tags,
    });

    this.resourceId = this.armAutoscaleSetting.resourceId;
  }

  private buildProfiles(props: AutoscaleSettingProps): AutoscaleProfile[] {
    // If advanced profiles provided, use them
    if (props.profiles && props.profiles.length > 0) {
      return [...props.profiles];
    }

    // Build simple default profile
    const profile: AutoscaleProfile = {
      name: 'Default',
      capacity: {
        minimum: String(props.minInstances ?? 1),
        maximum: String(props.maxInstances ?? 10),
        default: String(props.defaultInstances ?? 1),
      },
      rules: props.rules ?? [],
    };

    return [profile];
  }

  private getParentResourceGroup(scope: Construct): IResourceGroup {
    let current: Construct | undefined = scope;

    while (current) {
      if (this.isResourceGroup(current)) {
        return current as IResourceGroup;
      }
      current = current.node.scope;
    }

    throw new Error('AutoscaleSetting must be created within or under a ResourceGroup.');
  }

  private isResourceGroup(construct: any): construct is IResourceGroup {
    return (
      construct &&
      typeof construct.resourceGroupName === 'string' &&
      typeof construct.location === 'string'
    );
  }

  private getParentTags(scope: Construct): Record<string, string> {
    const parent = scope as any;
    if (parent && typeof parent.tags === 'object') {
      return parent.tags;
    }
    return {};
  }

  private resolveSettingName(id: string, props?: AutoscaleSettingProps): string {
    if (props?.name) {
      return props.name;
    }

    const subscriptionStack = this.getSubscriptionStack();
    if (subscriptionStack) {
      const purpose = id.toLowerCase();
      return subscriptionStack.generateResourceName('autoscale', purpose);
    }

    return `autoscale-${id.toLowerCase()}`;
  }

  private getSubscriptionStack(): any {
    let current: Construct | undefined = this.node.scope;

    while (current) {
      if (
        current &&
        typeof (current as any).generateResourceName === 'function' &&
        typeof (current as any).subscriptionId === 'string'
      ) {
        return current;
      }
      current = current.node.scope;
    }

    return undefined;
  }
}
