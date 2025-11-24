/**
 * Unit tests for Network utilities
 *
 * @remarks
 * Tests IP address validation, CIDR notation handling, and subnet calculations.
 */

import { describe, it, expect } from 'vitest';
import { IPAddress, CIDR, ipAddress, cidr, subnet } from './network';

describe('Network', () => {
  describe('IPAddress', () => {
    describe('validation', () => {
      it('should accept valid IPv4 addresses', () => {
        expect(() => new IPAddress('192.168.1.1')).not.toThrow();
        expect(() => new IPAddress('10.0.0.1')).not.toThrow();
        expect(() => new IPAddress('172.16.0.1')).not.toThrow();
        expect(() => new IPAddress('0.0.0.0')).not.toThrow();
        expect(() => new IPAddress('255.255.255.255')).not.toThrow();
      });

      it('should reject invalid IPv4 addresses', () => {
        expect(() => new IPAddress('256.0.0.1')).toThrow('Invalid IP address');
        expect(() => new IPAddress('192.168.1.256')).toThrow('Invalid IP address');
        expect(() => new IPAddress('192.168.1')).toThrow('Invalid IP address');
        expect(() => new IPAddress('192.168.1.1.1')).toThrow('Invalid IP address');
        expect(() => new IPAddress('192.168.-1.1')).toThrow('Invalid IP address');
      });

      it('should reject malformed addresses', () => {
        expect(() => new IPAddress('')).toThrow('Invalid IP address');
        expect(() => new IPAddress('abc.def.ghi.jkl')).toThrow('Invalid IP address');
        expect(() => new IPAddress('192.168.1.1a')).toThrow('Invalid IP address');
        expect(() => new IPAddress('192.168.1.01')).toThrow('Invalid IP address'); // Leading zero
      });

      it('should reject addresses with leading zeros', () => {
        expect(() => new IPAddress('192.168.001.1')).toThrow('Invalid IP address');
        expect(() => new IPAddress('192.168.1.01')).toThrow('Invalid IP address');
      });

      it('should accept edge case valid addresses', () => {
        expect(() => new IPAddress('0.0.0.0')).not.toThrow();
        expect(() => new IPAddress('255.255.255.255')).not.toThrow();
        expect(() => new IPAddress('127.0.0.1')).not.toThrow();
      });
    });

    describe('toString()', () => {
      it('should return IP address string', () => {
        const ip = new IPAddress('192.168.1.1');

        expect(ip.toString()).toBe('192.168.1.1');
      });

      it('should preserve original format', () => {
        const addresses = ['10.0.0.1', '172.16.0.1', '192.168.1.1', '0.0.0.0', '255.255.255.255'];

        addresses.forEach((addr) => {
          expect(new IPAddress(addr).toString()).toBe(addr);
        });
      });
    });
  });

  describe('ipAddress() factory', () => {
    it('should create IPAddress instance', () => {
      const ip = ipAddress('192.168.1.1');

      expect(ip).toBeInstanceOf(IPAddress);
      expect(ip.toString()).toBe('192.168.1.1');
    });

    it('should throw on invalid address', () => {
      expect(() => ipAddress('invalid')).toThrow('Invalid IP address');
    });

    it('should work with common private ranges', () => {
      expect(() => ipAddress('10.0.0.1')).not.toThrow(); // Class A private
      expect(() => ipAddress('172.16.0.1')).not.toThrow(); // Class B private
      expect(() => ipAddress('192.168.0.1')).not.toThrow(); // Class C private
    });
  });

  describe('CIDR', () => {
    describe('validation', () => {
      it('should accept valid CIDR notation', () => {
        expect(() => new CIDR('10.0.0.0', 8)).not.toThrow();
        expect(() => new CIDR('172.16.0.0', 12)).not.toThrow();
        expect(() => new CIDR('192.168.0.0', 16)).not.toThrow();
        expect(() => new CIDR('192.168.1.0', 24)).not.toThrow();
      });

      it('should accept full range of valid CIDR bits', () => {
        expect(() => new CIDR('0.0.0.0', 0)).not.toThrow(); // All addresses
        expect(() => new CIDR('192.168.1.1', 32)).not.toThrow(); // Single host
      });

      it('should reject invalid CIDR bits', () => {
        expect(() => new CIDR('192.168.1.0', -1)).toThrow('Invalid CIDR');
        expect(() => new CIDR('192.168.1.0', 33)).toThrow('Invalid CIDR');
        expect(() => new CIDR('192.168.1.0', 64)).toThrow('Invalid CIDR');
      });

      it('should reject invalid network addresses', () => {
        expect(() => new CIDR('256.0.0.0', 24)).toThrow('Invalid CIDR');
        expect(() => new CIDR('192.168.1.256', 24)).toThrow('Invalid CIDR');
        expect(() => new CIDR('invalid', 24)).toThrow('Invalid CIDR');
      });

      it('should reject malformed network addresses', () => {
        expect(() => new CIDR('192.168.1', 24)).toThrow('Invalid CIDR');
        expect(() => new CIDR('192.168.1.1.1', 24)).toThrow('Invalid CIDR');
        expect(() => new CIDR('192.168.01.1', 24)).toThrow('Invalid CIDR');
      });
    });

    describe('toString()', () => {
      it('should return CIDR notation string', () => {
        const network = new CIDR('192.168.1.0', 24);

        expect(network.toString()).toBe('192.168.1.0/24');
      });

      it('should format different CIDR sizes', () => {
        expect(new CIDR('10.0.0.0', 8).toString()).toBe('10.0.0.0/8');
        expect(new CIDR('172.16.0.0', 12).toString()).toBe('172.16.0.0/12');
        expect(new CIDR('192.168.0.0', 16).toString()).toBe('192.168.0.0/16');
        expect(new CIDR('192.168.1.0', 24).toString()).toBe('192.168.1.0/24');
      });

      it('should handle edge cases', () => {
        expect(new CIDR('0.0.0.0', 0).toString()).toBe('0.0.0.0/0');
        expect(new CIDR('192.168.1.1', 32).toString()).toBe('192.168.1.1/32');
      });
    });

    describe('getAddressCount()', () => {
      it('should calculate address count for common CIDR sizes', () => {
        expect(new CIDR('192.168.1.0', 24).getAddressCount()).toBe(256); // /24
        expect(new CIDR('192.168.0.0', 16).getAddressCount()).toBe(65536); // /16
        expect(new CIDR('10.0.0.0', 8).getAddressCount()).toBe(16777216); // /8
      });

      it('should handle /32 (single host)', () => {
        expect(new CIDR('192.168.1.1', 32).getAddressCount()).toBe(1);
      });

      it('should handle /0 (entire Internet)', () => {
        expect(new CIDR('0.0.0.0', 0).getAddressCount()).toBe(4294967296);
      });

      it('should calculate for various subnet sizes', () => {
        expect(new CIDR('192.168.1.0', 28).getAddressCount()).toBe(16); // /28
        expect(new CIDR('192.168.1.0', 27).getAddressCount()).toBe(32); // /27
        expect(new CIDR('192.168.1.0', 26).getAddressCount()).toBe(64); // /26
        expect(new CIDR('192.168.1.0', 25).getAddressCount()).toBe(128); // /25
      });

      it('should use power of 2 calculation', () => {
        // /24 = 32 - 24 = 8 bits for hosts = 2^8 = 256
        // /16 = 32 - 16 = 16 bits for hosts = 2^16 = 65536
        expect(new CIDR('192.168.1.0', 24).getAddressCount()).toBe(Math.pow(2, 8));
        expect(new CIDR('192.168.0.0', 16).getAddressCount()).toBe(Math.pow(2, 16));
      });
    });

    describe('getMaskBits()', () => {
      it('should return mask bits', () => {
        expect(new CIDR('192.168.1.0', 24).getMaskBits()).toBe(24);
        expect(new CIDR('10.0.0.0', 8).getMaskBits()).toBe(8);
        expect(new CIDR('172.16.0.0', 12).getMaskBits()).toBe(12);
      });

      it('should work for all valid bit counts', () => {
        expect(new CIDR('0.0.0.0', 0).getMaskBits()).toBe(0);
        expect(new CIDR('192.168.1.1', 32).getMaskBits()).toBe(32);
      });
    });

    describe('getNetwork()', () => {
      it('should return network address', () => {
        expect(new CIDR('192.168.1.0', 24).getNetwork()).toBe('192.168.1.0');
        expect(new CIDR('10.0.0.0', 8).getNetwork()).toBe('10.0.0.0');
      });

      it('should preserve original network address', () => {
        const networks = ['10.0.0.0', '172.16.0.0', '192.168.0.0', '192.168.1.0'];

        networks.forEach((net) => {
          expect(new CIDR(net, 24).getNetwork()).toBe(net);
        });
      });
    });
  });

  describe('cidr() factory', () => {
    it('should create CIDR instance', () => {
      const network = cidr('192.168.1.0', 24);

      expect(network).toBeInstanceOf(CIDR);
      expect(network.toString()).toBe('192.168.1.0/24');
    });

    it('should throw on invalid CIDR', () => {
      expect(() => cidr('invalid', 24)).toThrow('Invalid CIDR');
      expect(() => cidr('192.168.1.0', 33)).toThrow('Invalid CIDR');
    });

    it('should work with common subnet sizes', () => {
      expect(cidr('192.168.1.0', 24).getAddressCount()).toBe(256);
      expect(cidr('192.168.0.0', 16).getAddressCount()).toBe(65536);
      expect(cidr('10.0.0.0', 8).getAddressCount()).toBe(16777216);
    });
  });

  describe('subnet() factory', () => {
    it('should be an alias for cidr()', () => {
      const cidrResult = cidr('192.168.1.0', 24);
      const subnetResult = subnet('192.168.1.0', 24);

      expect(subnetResult).toBeInstanceOf(CIDR);
      expect(subnetResult.toString()).toBe(cidrResult.toString());
    });

    it('should work identically to cidr()', () => {
      const mask = 24;
      const network = '192.168.1.0';

      expect(subnet(network, mask).getAddressCount()).toBe(cidr(network, mask).getAddressCount());
      expect(subnet(network, mask).getMaskBits()).toBe(cidr(network, mask).getMaskBits());
    });
  });

  describe('common use cases', () => {
    describe('private network ranges', () => {
      it('should support Class A private network (10.0.0.0/8)', () => {
        const classA = cidr('10.0.0.0', 8);

        expect(classA.getAddressCount()).toBe(16777216);
        expect(classA.toString()).toBe('10.0.0.0/8');
      });

      it('should support Class B private network (172.16.0.0/12)', () => {
        const classB = cidr('172.16.0.0', 12);

        expect(classB.getAddressCount()).toBe(1048576);
        expect(classB.toString()).toBe('172.16.0.0/12');
      });

      it('should support Class C private network (192.168.0.0/16)', () => {
        const classC = cidr('192.168.0.0', 16);

        expect(classC.getAddressCount()).toBe(65536);
        expect(classC.toString()).toBe('192.168.0.0/16');
      });
    });

    describe('VNet configurations', () => {
      it('should support Azure VNet address space', () => {
        const vnet = cidr('10.0.0.0', 16);

        expect(vnet.getAddressCount()).toBe(65536);
      });

      it('should support subnet within VNet', () => {
        const defaultSubnet = subnet('10.0.1.0', 24);
        const appSubnet = subnet('10.0.2.0', 24);
        const dataSubnet = subnet('10.0.3.0', 24);

        expect(defaultSubnet.getAddressCount()).toBe(256);
        expect(appSubnet.getAddressCount()).toBe(256);
        expect(dataSubnet.getAddressCount()).toBe(256);
      });
    });

    describe('subnet sizing', () => {
      it('should calculate sizes for different subnet needs', () => {
        const small = subnet('10.0.1.0', 28); // 16 addresses
        const medium = subnet('10.0.2.0', 26); // 64 addresses
        const large = subnet('10.0.3.0', 24); // 256 addresses

        expect(small.getAddressCount()).toBe(16);
        expect(medium.getAddressCount()).toBe(64);
        expect(large.getAddressCount()).toBe(256);
      });
    });

    describe('IP address usage', () => {
      it('should validate gateway addresses', () => {
        const gateway = ipAddress('192.168.1.1');

        expect(gateway.toString()).toBe('192.168.1.1');
      });

      it('should validate DNS server addresses', () => {
        const primaryDns = ipAddress('8.8.8.8');
        const secondaryDns = ipAddress('8.8.4.4');

        expect(primaryDns.toString()).toBe('8.8.8.8');
        expect(secondaryDns.toString()).toBe('8.8.4.4');
      });

      it('should validate load balancer addresses', () => {
        const loadBalancer = ipAddress('10.0.1.100');

        expect(loadBalancer.toString()).toBe('10.0.1.100');
      });
    });
  });

  describe('special addresses', () => {
    it('should accept loopback address', () => {
      const loopback = ipAddress('127.0.0.1');

      expect(loopback.toString()).toBe('127.0.0.1');
    });

    it('should accept broadcast address', () => {
      const broadcast = ipAddress('255.255.255.255');

      expect(broadcast.toString()).toBe('255.255.255.255');
    });

    it('should accept any address (0.0.0.0)', () => {
      const any = ipAddress('0.0.0.0');

      expect(any.toString()).toBe('0.0.0.0');
    });
  });

  describe('edge cases', () => {
    it('should handle minimum CIDR (entire Internet)', () => {
      const internet = cidr('0.0.0.0', 0);

      expect(internet.getAddressCount()).toBe(4294967296); // 2^32
      expect(internet.toString()).toBe('0.0.0.0/0');
    });

    it('should handle maximum CIDR (single host)', () => {
      const singleHost = cidr('192.168.1.1', 32);

      expect(singleHost.getAddressCount()).toBe(1);
      expect(singleHost.toString()).toBe('192.168.1.1/32');
    });

    it('should handle boundary addresses in range', () => {
      expect(() => ipAddress('0.0.0.0')).not.toThrow();
      expect(() => ipAddress('255.255.255.255')).not.toThrow();
    });

    it('should reject out-of-range addresses', () => {
      expect(() => ipAddress('256.0.0.0')).toThrow();
      expect(() => ipAddress('0.0.0.256')).toThrow();
      expect(() => ipAddress('192.168.256.1')).toThrow();
    });
  });

  describe('type safety', () => {
    it('should have correct IPAddress interface', () => {
      const ip = ipAddress('192.168.1.1');

      expect(ip).toHaveProperty('toString');
      expect(typeof ip.toString).toBe('function');
    });

    it('should have correct CIDR interface', () => {
      const network = cidr('192.168.1.0', 24);

      expect(network).toHaveProperty('toString');
      expect(network).toHaveProperty('getAddressCount');
      expect(network).toHaveProperty('getMaskBits');
      expect(network).toHaveProperty('getNetwork');
    });
  });

  describe('performance', () => {
    it('should validate IP addresses quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        ipAddress('192.168.1.1');
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should create CIDR blocks quickly', () => {
      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        cidr('10.0.0.0', 16);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should calculate address counts quickly', () => {
      const network = cidr('10.0.0.0', 16);
      const startTime = Date.now();

      for (let i = 0; i < 10000; i++) {
        network.getAddressCount();
        network.getMaskBits();
        network.getNetwork();
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(50); // Should complete in < 50ms
    });
  });

  describe('error messages', () => {
    it('should provide clear error for invalid IP', () => {
      try {
        ipAddress('invalid');
      } catch (error) {
        expect((error as Error).message).toContain('Invalid IP address');
        expect((error as Error).message).toContain('invalid');
      }
    });

    it('should provide clear error for invalid CIDR', () => {
      try {
        cidr('invalid', 24);
      } catch (error) {
        expect((error as Error).message).toContain('Invalid CIDR');
      }
    });

    it('should provide clear error for out-of-range octets', () => {
      try {
        ipAddress('256.0.0.1');
      } catch (error) {
        expect((error as Error).message).toContain('Invalid IP address');
        expect((error as Error).message).toContain('256.0.0.1');
      }
    });

    it('should provide clear error for invalid CIDR bits', () => {
      try {
        cidr('192.168.1.0', 33);
      } catch (error) {
        expect((error as Error).message).toContain('Invalid CIDR');
      }
    });
  });
});
