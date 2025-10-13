/**
 * L2 construct for DNS CNAME Record.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { ArmDnsCNameRecords } from './dns-cname-record-arm';
import type { DnsCNameRecordsProps, IDnsCNameRecord } from './dns-record-types';

/**
 * L2 construct for DNS CNAME Record.
 *
 * @example
 * ```typescript
 * import { DnsCNameRecords } from '@atakora/cdk/network';
 *
 * const cnameRecord = new DnsCNameRecords(resourceGroup, 'WwwCName', {
 *   zone: dnsZone,
 *   recordName: 'www',
 *   cname: 'mycdn.azureedge.net'
 * });
 * ```
 */
export class DnsCNameRecords extends Construct implements IDnsCNameRecord {
  private readonly armCNameRecord: ArmDnsCNameRecords;

  public readonly recordName: string;
  public readonly zoneName: string;
  public readonly cname: string;
  public readonly recordId: string;

  constructor(scope: Construct, id: string, props: DnsCNameRecordsProps) {
    super(scope, id);

    this.recordName = props.recordName;
    this.zoneName = props.zone.zoneName;
    this.cname = props.cname;

    this.armCNameRecord = new ArmDnsCNameRecords(scope, `${id}CNameRecord`, props);

    this.recordId = this.armCNameRecord.recordId;
  }
}
