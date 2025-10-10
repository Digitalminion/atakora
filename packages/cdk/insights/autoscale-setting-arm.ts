import { Construct } from '@atakora/lib';
import { Resource } from '@atakora/lib';
import { DeploymentScope } from '@atakora/lib';
import type { ArmResource } from '@atakora/lib';
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
export class ArmAutoscaleSettings extends Resource {
  public readonly resourceType: string = 'Microsoft.Insights/autoscaleSettings';
  public readonly apiVersion: string = '2022-10-01';
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  public readonly name: string;
  public readonly location: string;
  public readonly targetResourceId: string;
  public readonly enabled: boolean;
  public readonly profiles: readonly any[];
  public readonly notifications?: readonly any[];
  public readonly tags: Record<string, string>;
  public readonly resourceId: string;

  constructor(scope: Construct, id: string, props: ArmAutoscaleSettingsProps) {
    super(scope, id);

    this.validateProps(props);

    this.name = props.name;
    this.location = props.location;
    this.targetResourceId = props.targetResourceId;
    this.enabled = props.enabled ?? true;
    this.profiles = props.profiles;
    this.notifications = props.notifications;
    this.tags = props.tags ?? {};

    this.resourceId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Insights/autoscaleSettings/${this.name}`;
  }

  protected validateProps(props: ArmAutoscaleSettingsProps): void {
    if (!props.name || props.name.trim() === '') {
      throw new Error('Autoscale setting name cannot be empty');
    }

    if (!props.location || props.location.trim() === '') {
      throw new Error('Location cannot be empty');
    }

    if (!props.targetResourceId || props.targetResourceId.trim() === '') {
      throw new Error('Target resource ID cannot be empty');
    }

    if (!props.profiles || props.profiles.length === 0) {
      throw new Error('At least one profile must be provided');
    }
  }

  public toArmTemplate(): ArmResource {
    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: this.name,
      location: this.location,
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
      properties: {
        enabled: this.enabled,
        targetResourceUri: this.targetResourceId,
        profiles: this.profiles,
        notifications: this.notifications,
      },
    };
  }
}
