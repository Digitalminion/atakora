/**
 * L2 construct for DNS TXT Record.
 *
 * @packageDocumentation
 */

import { Construct } from '@atakora/cdk';
import { ArmDnsTxtRecords } from './dns-txt-record-arm';
import type { DnsTxtRecordsProps, IDnsTxtRecord } from './dns-record-types';

/**
 * L2 construct for DNS TXT Record.
 *
 * @example
 * ```typescript
 * import { DnsTxtRecords } from '@atakora/cdk/network';
 *
 * const txtRecord = new DnsTxtRecords(resourceGroup, 'CdnVerification', {
 *   zone: dnsZone,
 *   recordName: '_dnsauth.www',
 *   txtValues: ['mycdn.azureedge.net']
 * });
 * ```
 */
export class DnsTxtRecords extends Construct implements IDnsTxtRecord {
  private readonly armTxtRecord: ArmDnsTxtRecords;

  public readonly recordName: string;
  public readonly zoneName: string;
  public readonly txtValues: readonly string[];
  public readonly recordId: string;

  constructor(scope: Construct, id: string, props: DnsTxtRecordsProps) {
    super(scope, id);

    this.recordName = props.recordName;
    this.zoneName = props.zone.zoneName;
    this.txtValues = props.txtValues;

    this.armTxtRecord = new ArmDnsTxtRecords(scope, `${id}TxtRecord`, props);

    this.recordId = this.armTxtRecord.recordId;
  }
}
