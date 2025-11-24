/**
 * Network Attachments
 *
 * This file provides attachment logic for network-related infrastructure:
 * - Virtual Network (VNet) attachment
 * - Web Application Firewall (WAF) attachment
 * - DDoS Protection attachment
 * - Network Security Groups (NSG) attachment
 *
 * Network components are optional and primarily used in staging/production
 * environments. Development environments typically don't use network isolation.
 *
 * @module @atakora/component/backend/attachments
 */

import type {
  NetworkDefaults,
  VNetDefaults,
  WafDefaults,
  DdosDefaults,
  SubnetDefaults,
} from '../defaults/base';

/**
 * Validation result for network configurations.
 */
export interface NetworkValidationResult {
  /** Whether validation passed */
  readonly valid: boolean;

  /** Critical errors that prevent deployment */
  readonly errors?: readonly string[];

  /** Non-critical warnings */
  readonly warnings?: readonly string[];
}

/**
 * VNet attachment configuration.
 * Allows customization of Virtual Network settings.
 */
export interface VNetAttachment {
  /** Enable or disable VNet integration */
  readonly enabled: boolean;

  /** Address space in CIDR notation (e.g., '10.0.0.0/16') */
  readonly addressSpace?: string;

  /** Subnet configurations */
  readonly subnets?: readonly SubnetAttachment[];

  /** Enable service endpoints globally */
  readonly enableServiceEndpoints?: boolean;

  /** Enable private link */
  readonly enablePrivateLink?: boolean;
}

/**
 * Subnet attachment configuration.
 */
export interface SubnetAttachment {
  /** Subnet name */
  readonly name: string;

  /** Address range in CIDR notation (e.g., '10.0.1.0/24') */
  readonly addressRange: string;

  /** Service endpoints to enable */
  readonly serviceEndpoints?: readonly string[];

  /** Delegations for the subnet */
  readonly delegations?: readonly string[];

  /** Network Security Group name */
  readonly nsgName?: string;
}

/**
 * WAF attachment configuration.
 */
export interface WafAttachment {
  /** Enable or disable WAF */
  readonly enabled: boolean;

  /** WAF mode */
  readonly mode?: 'Detection' | 'Prevention';

  /** Rule set to use */
  readonly ruleSet?: 'OWASP';

  /** Rule set version */
  readonly ruleSetVersion?: string;

  /** Custom rules */
  readonly customRules?: readonly WafCustomRule[];

  /** Exclusions */
  readonly exclusions?: readonly WafExclusion[];
}

/**
 * WAF custom rule configuration.
 */
export interface WafCustomRule {
  /** Rule name */
  readonly name: string;

  /** Rule priority (lower = higher priority) */
  readonly priority: number;

  /** Rule action */
  readonly action: 'Allow' | 'Block' | 'Log';

  /** Match conditions */
  readonly conditions: readonly WafMatchCondition[];
}

/**
 * WAF match condition.
 */
export interface WafMatchCondition {
  /** Variable to match against */
  readonly variable:
    | 'RemoteAddr'
    | 'RequestMethod'
    | 'QueryString'
    | 'RequestUri'
    | 'RequestHeaders';

  /** Operator */
  readonly operator: 'IPMatch' | 'Equal' | 'Contains' | 'BeginsWith' | 'EndsWith' | 'Regex';

  /** Match values */
  readonly values: readonly string[];

  /** Negate the condition */
  readonly negate?: boolean;
}

/**
 * WAF exclusion configuration.
 */
export interface WafExclusion {
  /** Match variable */
  readonly matchVariable: 'RequestHeaderNames' | 'RequestCookieNames' | 'RequestArgNames';

  /** Selector to match */
  readonly selector: string;

  /** Selector match operator */
  readonly selectorMatchOperator: 'Equals' | 'Contains' | 'StartsWith' | 'EndsWith';
}

/**
 * DDoS protection attachment configuration.
 */
export interface DdosAttachment {
  /** Enable or disable DDoS protection */
  readonly enabled: boolean;

  /** DDoS protection plan */
  readonly plan?: 'Standard';

  /** Enable alerts */
  readonly enableAlerts?: boolean;

  /** Alert thresholds */
  readonly alertThresholds?: DdosAlertThresholds;
}

/**
 * DDoS alert thresholds.
 */
export interface DdosAlertThresholds {
  /** Packets per second threshold */
  readonly packetsPerSecond?: number;

  /** Bytes per second threshold */
  readonly bytesPerSecond?: number;

  /** TCP connections per second */
  readonly tcpConnectionsPerSecond?: number;
}

/**
 * Complete network attachment configuration.
 */
export interface NetworkAttachment {
  /** Virtual Network attachment */
  readonly vnet?: VNetAttachment;

  /** WAF attachment */
  readonly waf?: WafAttachment;

  /** DDoS protection attachment */
  readonly ddos?: DdosAttachment;
}

/**
 * Validate VNet configuration.
 *
 * Checks for:
 * - Valid CIDR notation
 * - Non-overlapping subnet ranges
 * - Subnet ranges within VNet address space
 * - Valid service endpoint names
 *
 * @param vnet - VNet configuration to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * import { validateVNetConfig } from '@atakora/component/backend/attachments';
 *
 * const result = validateVNetConfig({
 *   enabled: true,
 *   addressSpace: '10.0.0.0/16',
 *   subnets: [
 *     { name: 'functions', addressRange: '10.0.1.0/24' }
 *   ]
 * });
 *
 * if (!result.valid) {
 *   console.error('VNet validation failed:', result.errors);
 * }
 * ```
 */
export function validateVNetConfig(vnet: VNetAttachment | VNetDefaults): NetworkValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!vnet.enabled) {
    return { valid: true };
  }

  // Validate address space
  if (vnet.addressSpace) {
    if (!isValidCidr(vnet.addressSpace)) {
      errors.push(`Invalid CIDR notation for address space: ${vnet.addressSpace}`);
    }
  } else {
    errors.push('Address space is required when VNet is enabled');
  }

  // Validate subnets
  if (vnet.subnets && vnet.subnets.length > 0) {
    const subnetRanges = new Set<string>();

    for (const subnet of vnet.subnets) {
      // Check for duplicate subnet names
      if (!subnet.name || subnet.name.trim() === '') {
        errors.push('Subnet name cannot be empty');
        continue;
      }

      // Validate CIDR notation
      if (!isValidCidr(subnet.addressRange)) {
        errors.push(`Invalid CIDR notation for subnet ${subnet.name}: ${subnet.addressRange}`);
        continue;
      }

      // Check for duplicate subnet ranges
      if (subnetRanges.has(subnet.addressRange)) {
        errors.push(`Duplicate subnet range detected: ${subnet.addressRange}`);
      }
      subnetRanges.add(subnet.addressRange);

      // Validate subnet is within VNet address space
      if (vnet.addressSpace && !isSubnetInAddressSpace(subnet.addressRange, vnet.addressSpace)) {
        errors.push(
          `Subnet ${subnet.name} (${subnet.addressRange}) is not within VNet address space (${vnet.addressSpace})`
        );
      }

      // Validate service endpoints
      if ('serviceEndpoints' in subnet && subnet.serviceEndpoints) {
        for (const endpoint of subnet.serviceEndpoints) {
          if (!isValidServiceEndpoint(endpoint)) {
            warnings.push(`Unknown service endpoint: ${endpoint} in subnet ${subnet.name}`);
          }
        }
      }
    }

    // Check for subnet overlap
    const overlaps = findOverlappingSubnets(vnet.subnets);
    if (overlaps.length > 0) {
      for (const overlap of overlaps) {
        errors.push(
          `Subnets ${overlap.subnet1} and ${overlap.subnet2} have overlapping address ranges`
        );
      }
    }
  } else if (vnet.enabled) {
    warnings.push('VNet is enabled but no subnets are configured');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate WAF configuration.
 *
 * Checks for:
 * - Valid mode selection
 * - Valid rule set version
 * - Custom rule priorities are unique
 * - Match conditions are valid
 *
 * @param waf - WAF configuration to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * import { validateWafConfig } from '@atakora/component/backend/attachments';
 *
 * const result = validateWafConfig({
 *   enabled: true,
 *   mode: 'Prevention',
 *   ruleSet: 'OWASP',
 *   ruleSetVersion: '3.2'
 * });
 * ```
 */
export function validateWafConfig(waf: WafAttachment | WafDefaults): NetworkValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!waf.enabled) {
    return { valid: true };
  }

  // Validate mode
  if (waf.mode && !['Detection', 'Prevention'].includes(waf.mode)) {
    errors.push(`Invalid WAF mode: ${waf.mode}. Must be 'Detection' or 'Prevention'`);
  }

  // Validate rule set
  if (waf.ruleSet && waf.ruleSet !== 'OWASP') {
    warnings.push(`Unknown rule set: ${waf.ruleSet}. Only 'OWASP' is currently supported`);
  }

  // Validate rule set version
  if (waf.ruleSetVersion) {
    const validVersions = ['3.0', '3.1', '3.2'];
    if (!validVersions.includes(waf.ruleSetVersion)) {
      warnings.push(
        `Unknown rule set version: ${waf.ruleSetVersion}. Supported versions: ${validVersions.join(', ')}`
      );
    }
  }

  // Validate custom rules
  if ('customRules' in waf && waf.customRules && waf.customRules.length > 0) {
    const priorities = new Set<number>();

    for (const rule of waf.customRules) {
      // Check for duplicate priorities
      if (priorities.has(rule.priority)) {
        errors.push(`Duplicate WAF rule priority: ${rule.priority} for rule ${rule.name}`);
      }
      priorities.add(rule.priority);

      // Validate priority range
      if (rule.priority < 1 || rule.priority > 1000) {
        errors.push(
          `WAF rule priority must be between 1 and 1000: ${rule.name} has priority ${rule.priority}`
        );
      }

      // Validate action
      if (!['Allow', 'Block', 'Log'].includes(rule.action)) {
        errors.push(`Invalid WAF rule action: ${rule.action} for rule ${rule.name}`);
      }

      // Validate conditions
      if (!rule.conditions || rule.conditions.length === 0) {
        errors.push(`WAF rule ${rule.name} must have at least one match condition`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate DDoS protection configuration.
 *
 * @param ddos - DDoS configuration to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * import { validateDdosConfig } from '@atakora/component/backend/attachments';
 *
 * const result = validateDdosConfig({
 *   enabled: true,
 *   plan: 'Standard'
 * });
 * ```
 */
export function validateDdosConfig(ddos: DdosAttachment | DdosDefaults): NetworkValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!ddos.enabled) {
    return { valid: true };
  }

  // Validate plan
  if (ddos.plan && ddos.plan !== 'Standard') {
    errors.push(`Invalid DDoS plan: ${ddos.plan}. Only 'Standard' is supported`);
  }

  // Validate alert thresholds
  if ('alertThresholds' in ddos && ddos.alertThresholds) {
    const thresholds = ddos.alertThresholds;

    if (thresholds.packetsPerSecond !== undefined && thresholds.packetsPerSecond <= 0) {
      errors.push('DDoS packets per second threshold must be positive');
    }

    if (thresholds.bytesPerSecond !== undefined && thresholds.bytesPerSecond <= 0) {
      errors.push('DDoS bytes per second threshold must be positive');
    }

    if (
      thresholds.tcpConnectionsPerSecond !== undefined &&
      thresholds.tcpConnectionsPerSecond <= 0
    ) {
      errors.push('DDoS TCP connections per second threshold must be positive');
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate complete network configuration.
 *
 * @param network - Network configuration to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * import { validateNetworkConfig } from '@atakora/component/backend/attachments';
 *
 * const result = validateNetworkConfig({
 *   vnet: { enabled: true, addressSpace: '10.0.0.0/16' },
 *   waf: { enabled: true, mode: 'Prevention' },
 *   ddos: { enabled: true, plan: 'Standard' }
 * });
 *
 * if (!result.valid) {
 *   console.error('Network validation failed:', result.errors);
 * }
 * ```
 */
export function validateNetworkConfig(
  network: NetworkAttachment | NetworkDefaults
): NetworkValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate VNet
  if (network.vnet) {
    const vnetResult = validateVNetConfig(network.vnet);
    if (vnetResult.errors) {
      allErrors.push(...vnetResult.errors);
    }
    if (vnetResult.warnings) {
      allWarnings.push(...vnetResult.warnings);
    }
  }

  // Validate WAF
  if (network.waf) {
    const wafResult = validateWafConfig(network.waf);
    if (wafResult.errors) {
      allErrors.push(...wafResult.errors);
    }
    if (wafResult.warnings) {
      allWarnings.push(...wafResult.warnings);
    }
  }

  // Validate DDoS
  if (network.ddos) {
    const ddosResult = validateDdosConfig(network.ddos);
    if (ddosResult.errors) {
      allErrors.push(...ddosResult.errors);
    }
    if (ddosResult.warnings) {
      allWarnings.push(...ddosResult.warnings);
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors.length > 0 ? allErrors : undefined,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a string is valid CIDR notation.
 */
function isValidCidr(cidr: string): boolean {
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (!cidrRegex.test(cidr)) {
    return false;
  }

  const [ip, prefix] = cidr.split('/');
  const prefixNum = parseInt(prefix, 10);

  // Validate prefix length
  if (prefixNum < 0 || prefixNum > 32) {
    return false;
  }

  // Validate IP address octets
  const octets = ip.split('.').map(Number);
  return octets.every((octet) => octet >= 0 && octet <= 255);
}

/**
 * Check if a subnet range is within a VNet address space.
 */
function isSubnetInAddressSpace(subnetCidr: string, vnetCidr: string): boolean {
  const [subnetIp, subnetPrefix] = subnetCidr.split('/');
  const [vnetIp, vnetPrefix] = vnetCidr.split('/');

  const subnetPrefixNum = parseInt(subnetPrefix, 10);
  const vnetPrefixNum = parseInt(vnetPrefix, 10);

  // Subnet prefix must be equal to or larger than VNet prefix
  if (subnetPrefixNum < vnetPrefixNum) {
    return false;
  }

  // Convert IPs to numbers for comparison
  const subnetNum = ipToNumber(subnetIp);
  const vnetNum = ipToNumber(vnetIp);

  // Calculate network masks
  const vnetMask = (-1 << (32 - vnetPrefixNum)) >>> 0;

  // Check if subnet network address matches VNet network address
  return (subnetNum & vnetMask) === (vnetNum & vnetMask);
}

/**
 * Convert IP address string to number.
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Find overlapping subnet ranges.
 */
function findOverlappingSubnets(
  subnets: readonly (SubnetAttachment | SubnetDefaults)[]
): Array<{ subnet1: string; subnet2: string }> {
  const overlaps: Array<{ subnet1: string; subnet2: string }> = [];

  for (let i = 0; i < subnets.length; i++) {
    for (let j = i + 1; j < subnets.length; j++) {
      const subnet1 = subnets[i];
      const subnet2 = subnets[j];

      if (doSubnetsOverlap(subnet1.addressRange, subnet2.addressRange)) {
        overlaps.push({ subnet1: subnet1.name, subnet2: subnet2.name });
      }
    }
  }

  return overlaps;
}

/**
 * Check if two subnet ranges overlap.
 */
function doSubnetsOverlap(cidr1: string, cidr2: string): boolean {
  const [ip1, prefix1] = cidr1.split('/');
  const [ip2, prefix2] = cidr2.split('/');

  const prefix1Num = parseInt(prefix1, 10);
  const prefix2Num = parseInt(prefix2, 10);

  const num1 = ipToNumber(ip1);
  const num2 = ipToNumber(ip2);

  const mask1 = (-1 << (32 - prefix1Num)) >>> 0;
  const mask2 = (-1 << (32 - prefix2Num)) >>> 0;

  const network1 = num1 & mask1;
  const network2 = num2 & mask2;

  // Check if one network contains the other
  const minPrefix = Math.min(prefix1Num, prefix2Num);
  const commonMask = (-1 << (32 - minPrefix)) >>> 0;

  return (network1 & commonMask) === (network2 & commonMask);
}

/**
 * Check if a service endpoint name is valid.
 */
function isValidServiceEndpoint(endpoint: string): boolean {
  const validEndpoints = [
    'Microsoft.Storage',
    'Microsoft.Sql',
    'Microsoft.AzureCosmosDB',
    'Microsoft.KeyVault',
    'Microsoft.ServiceBus',
    'Microsoft.EventHub',
    'Microsoft.AzureActiveDirectory',
    'Microsoft.Web',
    'Microsoft.ContainerRegistry',
  ];

  return validEndpoints.includes(endpoint);
}

// ============================================================================
// Network Builder API (Stub Implementation)
// ============================================================================

/**
 * TODO: Full implementation of network builder API
 * This is a stub to allow example code to compile.
 */

/**
 * Network builder stub
 * @internal
 */
export interface NetworkResourceBuilder {
  when(condition: boolean, callback: (builder: this) => any): this;
  _build(): any;
  // Allow any method for fluent API
  [key: string]: any;
}

class NetworkResourceBuilderImpl implements NetworkResourceBuilder {
  private config: any = {};

  constructor() {
    // Return a proxy that accepts any method call
    return new Proxy(this, {
      get(target, prop: string) {
        if (prop === '_build') {
          return () => target.config;
        }
        if (prop === 'when') {
          return (condition: boolean, callback: (builder: any) => any) => {
            if (condition) callback(target);
            return target;
          };
        }
        // Any other method call returns the builder for chaining
        return (...args: any[]) => {
          target.config[prop] = args;
          return target;
        };
      },
    }) as any;
  }

  when(condition: boolean, callback: (builder: any) => any): this {
    if (condition) callback(this);
    return this;
  }

  _build(): any {
    return this.config;
  }

  [key: string]: any;
}

/**
 * Network namespace with builder factory methods
 */
export const network = {
  /**
   * Create a virtual network builder (stub)
   */
  vnet(): NetworkResourceBuilder {
    return new NetworkResourceBuilderImpl();
  },

  /**
   * Create a WAF builder (stub)
   */
  waf(): NetworkResourceBuilder {
    return new NetworkResourceBuilderImpl();
  },

  /**
   * Create a DDoS protection builder (stub)
   */
  ddos(): NetworkResourceBuilder {
    return new NetworkResourceBuilderImpl();
  },
};

/**
 * Define network configuration
 *
 * @param configs - Network configuration
 * @returns Network configuration
 */
export function defineNetwork(configs: Record<string, any>): any {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(configs)) {
    if (value && typeof value === 'object' && '_build' in value) {
      result[key] = value._build();
    } else {
      result[key] = value;
    }
  }
  return result;
}
