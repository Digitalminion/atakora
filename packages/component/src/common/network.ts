/**
 * Network Utilities for Fluent APIs
 *
 * @remarks
 * Provides type-safe network configuration utilities including IP address
 * validation, CIDR notation handling, and subnet calculations.
 *
 * @example
 * ```typescript
 * import { ipAddress, cidr, subnet } from '@atakora/component/common';
 *
 * // Create validated IP address
 * const gateway = ipAddress('192.168.1.1');
 *
 * // Create CIDR block
 * const network = cidr('10.0.0.0', 16);
 * console.log(network.toString());        // "10.0.0.0/16"
 * console.log(network.getAddressCount()); // 65536
 *
 * // Create subnet (alias for CIDR)
 * const privateSubnet = subnet('172.16.0.0', 24);
 * ```
 *
 * @packageDocumentation
 */

/**
 * Represents a validated IPv4 address
 *
 * @public
 */
export class IPAddress {
  /**
   * Create a validated IP address
   *
   * @param address - IPv4 address string (e.g., "192.168.1.1")
   * @throws Error if the IP address is invalid
   */
  constructor(private readonly address: string) {
    if (!this.isValid()) {
      throw new Error(`Invalid IP address: ${address}`);
    }
  }

  /**
   * Validate the IP address format
   * @internal
   */
  private isValid(): boolean {
    const parts = this.address.split('.');
    if (parts.length !== 4) return false;

    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
    });
  }

  /**
   * Get the string representation of the IP address
   */
  toString(): string {
    return this.address;
  }
}

/**
 * Represents a CIDR (Classless Inter-Domain Routing) block
 *
 * @public
 */
export class CIDR {
  /**
   * Create a CIDR block
   *
   * @param network - Network address (e.g., "10.0.0.0")
   * @param bits - Number of network bits (0-32)
   * @throws Error if the CIDR notation is invalid
   */
  constructor(
    private readonly network: string,
    private readonly bits: number
  ) {
    if (!this.isValid()) {
      throw new Error(`Invalid CIDR: ${network}/${bits}`);
    }
  }

  /**
   * Validate the CIDR notation
   * @internal
   */
  private isValid(): boolean {
    if (this.bits < 0 || this.bits > 32) return false;

    const parts = this.network.split('.');
    if (parts.length !== 4) return false;

    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
    });
  }

  /**
   * Get the string representation in CIDR notation
   */
  toString(): string {
    return `${this.network}/${this.bits}`;
  }

  /**
   * Calculate the number of available addresses in this CIDR block
   *
   * @returns Number of IP addresses in the range
   *
   * @example
   * ```typescript
   * const network = cidr('192.168.0.0', 24);
   * console.log(network.getAddressCount()); // 256
   * ```
   */
  getAddressCount(): number {
    return Math.pow(2, 32 - this.bits);
  }

  /**
   * Get the subnet mask bits
   */
  getMaskBits(): number {
    return this.bits;
  }

  /**
   * Get the network address
   */
  getNetwork(): string {
    return this.network;
  }
}

/**
 * Create a validated IP address
 *
 * @param address - IPv4 address string
 * @returns IPAddress object
 * @throws Error if the IP address is invalid
 *
 * @example
 * ```typescript
 * const gateway = ipAddress('192.168.1.1');
 * console.log(gateway.toString()); // "192.168.1.1"
 *
 * // Invalid IP will throw
 * try {
 *   const invalid = ipAddress('256.0.0.1');
 * } catch (e) {
 *   console.error(e.message); // "Invalid IP address: 256.0.0.1"
 * }
 * ```
 *
 * @public
 */
export function ipAddress(address: string): IPAddress {
  return new IPAddress(address);
}

/**
 * Create a CIDR block
 *
 * @param network - Network address
 * @param bits - Number of network bits (0-32)
 * @returns CIDR object
 * @throws Error if the CIDR notation is invalid
 *
 * @example
 * ```typescript
 * // Class A network
 * const classA = cidr('10.0.0.0', 8);
 * console.log(classA.getAddressCount()); // 16777216
 *
 * // Class C network
 * const classC = cidr('192.168.1.0', 24);
 * console.log(classC.getAddressCount()); // 256
 *
 * // Custom subnet
 * const custom = cidr('172.16.0.0', 20);
 * console.log(custom.toString()); // "172.16.0.0/20"
 * ```
 *
 * @public
 */
export function cidr(network: string, bits: number): CIDR {
  return new CIDR(network, bits);
}

/**
 * Create a subnet (alias for CIDR)
 *
 * @param network - Network address
 * @param mask - Subnet mask bits (0-32)
 * @returns CIDR object
 * @throws Error if the subnet notation is invalid
 *
 * @example
 * ```typescript
 * // Private subnet
 * const privateNet = subnet('10.0.1.0', 24);
 * console.log(privateNet.toString());        // "10.0.1.0/24"
 * console.log(privateNet.getAddressCount()); // 256
 *
 * // Public subnet
 * const publicNet = subnet('203.0.113.0', 28);
 * console.log(publicNet.getAddressCount()); // 16
 * ```
 *
 * @public
 */
export function subnet(network: string, mask: number): CIDR {
  return cidr(network, mask);
}