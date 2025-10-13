/**
 * Azure DNS Record type definitions.
 *
 * @remarks
 * Type definitions for DNS records in Public DNS Zones.
 *
 * **Resource Types**:
 * - Microsoft.Network/dnsZones/CNAME
 * - Microsoft.Network/dnsZones/TXT
 *
 * **API Version**: 2023-07-01-preview
 *
 * @packageDocumentation
 */

import { schema } from '@atakora/lib';
import type { IPublicDnsZone } from './public-dns-zone-types';

/**
 * DNS Record type enum.
 */
export const DnsRecordType = schema.network.DnsRecordType;
export type DnsRecordType = typeof DnsRecordType[keyof typeof DnsRecordType];

/**
 * Properties for DNS CNAME Record (L1).
 */
export interface ArmDnsCNameRecordProps {
  /**
   * Parent DNS zone.
   */
  readonly zone: IPublicDnsZone;

  /**
   * Record name (subdomain).
   * For example, 'www' for www.example.com
   */
  readonly recordName: string;

  /**
   * Canonical name (the target domain).
   * For example, 'example.azureedge.net'
   */
  readonly cname: string;

  /**
   * TTL in seconds (default: 3600).
   */
  readonly ttl?: number;

  /**
   * Tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Properties for DNS TXT Record (L1).
 */
export interface ArmDnsTxtRecordProps {
  /**
   * Parent DNS zone.
   */
  readonly zone: IPublicDnsZone;

  /**
   * Record name (subdomain).
   * For CDN verification, typically '_dnsauth.www' or similar
   */
  readonly recordName: string;

  /**
   * TXT record values (array of strings).
   * Each string can be up to 255 characters.
   */
  readonly txtValues: readonly string[];

  /**
   * TTL in seconds (default: 3600).
   */
  readonly ttl?: number;

  /**
   * Tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * L2 properties for DNS CNAME Record.
 */
export interface DnsCNameRecordsProps {
  /**
   * Parent DNS zone.
   */
  readonly zone: IPublicDnsZone;

  /**
   * Record name (subdomain).
   */
  readonly recordName: string;

  /**
   * Target domain (canonical name).
   */
  readonly cname: string;

  /**
   * TTL in seconds (default: 3600).
   */
  readonly ttl?: number;

  /**
   * Tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * L2 properties for DNS TXT Record.
 */
export interface DnsTxtRecordsProps {
  /**
   * Parent DNS zone.
   */
  readonly zone: IPublicDnsZone;

  /**
   * Record name (subdomain).
   */
  readonly recordName: string;

  /**
   * TXT record values.
   */
  readonly txtValues: readonly string[];

  /**
   * TTL in seconds (default: 3600).
   */
  readonly ttl?: number;

  /**
   * Tags.
   */
  readonly tags?: Record<string, string>;
}

/**
 * Interface for DNS CNAME Record reference.
 */
export interface IDnsCNameRecord {
  /**
   * Record name.
   */
  readonly recordName: string;

  /**
   * Zone name.
   */
  readonly zoneName: string;

  /**
   * CNAME target.
   */
  readonly cname: string;

  /**
   * Full record ID.
   */
  readonly recordId: string;
}

/**
 * Interface for DNS TXT Record reference.
 */
export interface IDnsTxtRecord {
  /**
   * Record name.
   */
  readonly recordName: string;

  /**
   * Zone name.
   */
  readonly zoneName: string;

  /**
   * TXT values.
   */
  readonly txtValues: readonly string[];

  /**
   * Full record ID.
   */
  readonly recordId: string;
}
