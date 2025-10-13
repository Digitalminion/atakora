/**
 * L1 ARM construct for DNS TXT Record.
 *
 * @packageDocumentation
 */

import { Construct, Resource, DeploymentScope } from '@atakora/cdk';
import type { ArmResource } from '@atakora/cdk';
import type { ArmDnsTxtRecordProps } from './dns-record-types';

/**
 * L1 construct for DNS TXT Record.
 *
 * @remarks
 * Direct mapping to Microsoft.Network/dnsZones/TXT ARM resource.
 *
 * **ARM Resource Type**: `Microsoft.Network/dnsZones/TXT`
 * **API Version**: `2023-07-01-preview`
 */
export class ArmDnsTxtRecords extends Resource {
  public readonly resourceType: string = 'Microsoft.Network/dnsZones/TXT';
  public readonly apiVersion: string = '2023-07-01-preview';
  public readonly scope: DeploymentScope.ResourceGroup = DeploymentScope.ResourceGroup;

  public readonly recordName: string;
  public readonly zoneName: string;
  public readonly txtValues: readonly string[];
  public readonly ttl: number;
  public readonly tags: Record<string, string>;
  public readonly recordId: string;
  public readonly resourceId: string;
  public readonly name: string;

  constructor(scope: Construct, id: string, props: ArmDnsTxtRecordProps) {
    super(scope, id);

    this.recordName = props.recordName;
    this.zoneName = props.zone.zoneName;
    this.txtValues = props.txtValues;
    this.ttl = props.ttl ?? 3600;
    this.tags = props.tags ?? {};
    this.name = `${this.zoneName}/${this.recordName}`;

    this.recordId = `/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Network/dnsZones/${this.zoneName}/TXT/${this.recordName}`;
    this.resourceId = this.recordId;
  }

  protected validateProps(props: ArmDnsTxtRecordProps): void {
    if (!props.recordName) {
      throw new Error('recordName is required');
    }
    if (!props.zone) {
      throw new Error('zone is required');
    }
    if (!props.txtValues || props.txtValues.length === 0) {
      throw new Error('txtValues is required and must contain at least one value');
    }
  }

  public toArmTemplate(): ArmResource {
    return {
      type: this.resourceType,
      apiVersion: this.apiVersion,
      name: `${this.zoneName}/${this.recordName}`,
      properties: {
        TTL: this.ttl,
        TXTRecords: this.txtValues.map((value) => ({ value: [value] })),
      },
      tags: Object.keys(this.tags).length > 0 ? this.tags : undefined,
    } as ArmResource;
  }
}
