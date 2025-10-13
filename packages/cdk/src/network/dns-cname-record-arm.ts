/**
 * L1 ARM construct for DNS CNAME Record.
 *
 * @packageDocumentation
 */

import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmDnsCNameRecordProps } from './dns-record-types';

/**
 * L1 construct for DNS CNAME Record.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/dnsZones/CNAME ARM resource.
 *
 * **ARM Resource Type**: `Microsoft.Network/dnsZones/CNAME`
 * **API Version**: `2023-07-01-preview`
 */
export class ArmDnsCNameRecords extends Resource {
  public readonly resourceType: string = 'Microsoft.Network/dnsZones/CNAME';
  public readonly apiVersion: string = '2023-07-01-preview';
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  public readonly recordName: string;
  public readonly zoneName: string;
  public readonly cname: string;
  public readonly ttl: number;
  public readonly tags: Record<string, string>;
  public readonly recordId: string;
  public readonly resourceId: string;
  public readonly name: string;

  constructor(scope: Construct, id: string, props: ArmDnsCNameRecordProps) {
    super(scope, id);

    this.recordName = props.recordName;
    this.zoneName = props.zone.zoneName;
    this.cname = props.cname;
    this.ttl = props.ttl ?? 3600;
    this.tags = props.tags ?? {};
    this.name = `${this.zoneName}/${this.recordName}`;

    this.recordId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/dnsZones/${this.zoneName}/CNAME/${this.recordName}`;
    this.resourceId = this.recordId;
  }

  protected validateProps(props: ArmDnsCNameRecordProps): void {
    if (!props.recordName) {
      throw new Error('recordName is required');
    }
    if (!props.zone) {
      throw new Error('zone is required');
    }
    if (!props.cname) {
      throw new Error('cname is required');
    }
  }

  public toArmTemplate(): ArmResource {
    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.zoneName}/${this.recordName}`,
      properties: {
        TTL: this.ttl,
        CNAMERecord: {
          cname: this.cname,
        },
      },
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    } as ArmResource;
  }
}
