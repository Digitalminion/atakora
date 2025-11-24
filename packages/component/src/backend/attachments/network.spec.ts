/**
 * Network Attachments Tests
 *
 * Validates network attachment logic:
 * - VNet attachment validation
 * - WAF attachment validation
 * - DDoS attachment validation
 * - Network security rules validation
 * - CIDR notation validation
 * - Subnet overlap detection
 *
 * @module @atakora/component/backend/attachments
 */

import { describe, it, expect } from 'vitest';
import {
  validateVNetConfig,
  validateWafConfig,
  validateDdosConfig,
  validateNetworkConfig,
  type VNetAttachment,
  type WafAttachment,
  type DdosAttachment,
  type NetworkAttachment,
} from './network';

describe('Network Attachments', () => {
  describe('validateVNetConfig', () => {
    describe('Basic Validation', () => {
      it('should pass validation when VNet is disabled', () => {
        const vnet: VNetAttachment = {
          enabled: false,
        };

        const result = validateVNetConfig(vnet);
        expect(result.valid).toBe(true);
        expect(result.errors).toBeUndefined();
      });

      it('should require address space when enabled', () => {
        const vnet: VNetAttachment = {
          enabled: true,
        };

        const result = validateVNetConfig(vnet);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Address space is required when VNet is enabled');
      });

      it('should pass with valid address space and no subnets', () => {
        const vnet: VNetAttachment = {
          enabled: true,
          addressSpace: '10.0.0.0/16',
        };

        const result = validateVNetConfig(vnet);
        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('VNet is enabled but no subnets are configured');
      });
    });

    describe('CIDR Validation', () => {
      it('should accept valid CIDR notation', () => {
        const validCidrs = ['10.0.0.0/16', '192.168.1.0/24', '172.16.0.0/12', '10.0.0.0/8'];

        for (const cidr of validCidrs) {
          const vnet: VNetAttachment = {
            enabled: true,
            addressSpace: cidr,
          };

          const result = validateVNetConfig(vnet);
          expect(result.valid).toBe(true);
        }
      });

      it('should reject invalid CIDR notation', () => {
        const invalidCidrs = [
          '10.0.0.0', // Missing prefix
          '10.0.0.0/33', // Invalid prefix (> 32)
          '256.0.0.0/16', // Invalid octet
          '10.0.0/16', // Missing octet
          '10.0.0.0.0/16', // Too many octets
          'invalid', // Not a CIDR
        ];

        for (const cidr of invalidCidrs) {
          const vnet: VNetAttachment = {
            enabled: true,
            addressSpace: cidr,
          };

          const result = validateVNetConfig(vnet);
          expect(result.valid).toBe(false);
          expect(result.errors).toBeDefined();
        }
      });
    });

    describe('Subnet Validation', () => {
      it('should validate subnets are within VNet address space', () => {
        const vnet: VNetAttachment = {
          enabled: true,
          addressSpace: '10.0.0.0/16',
          subnets: [
            { name: 'subnet1', addressRange: '10.0.1.0/24' },
            { name: 'subnet2', addressRange: '10.0.2.0/24' },
          ],
        };

        const result = validateVNetConfig(vnet);
        expect(result.valid).toBe(true);
      });

      it('should detect subnets outside VNet address space', () => {
        const vnet: VNetAttachment = {
          enabled: true,
          addressSpace: '10.0.0.0/16',
          subnets: [
            { name: 'subnet1', addressRange: '10.0.1.0/24' },
            { name: 'subnet2', addressRange: '192.168.1.0/24' }, // Outside
          ],
        };

        const result = validateVNetConfig(vnet);
        expect(result.valid).toBe(false);
        expect(result.errors?.some((e) => e.includes('not within VNet address space'))).toBe(true);
      });

      it('should detect overlapping subnets', () => {
        const vnet: VNetAttachment = {
          enabled: true,
          addressSpace: '10.0.0.0/16',
          subnets: [
            { name: 'subnet1', addressRange: '10.0.1.0/24' },
            { name: 'subnet2', addressRange: '10.0.1.0/25' }, // Overlaps with subnet1
          ],
        };

        const result = validateVNetConfig(vnet);
        expect(result.valid).toBe(false);
        expect(result.errors?.some((e) => e.includes('overlapping'))).toBe(true);
      });

      it('should detect duplicate subnet ranges', () => {
        const vnet: VNetAttachment = {
          enabled: true,
          addressSpace: '10.0.0.0/16',
          subnets: [
            { name: 'subnet1', addressRange: '10.0.1.0/24' },
            { name: 'subnet2', addressRange: '10.0.1.0/24' }, // Duplicate
          ],
        };

        const result = validateVNetConfig(vnet);
        expect(result.valid).toBe(false);
        expect(result.errors?.some((e) => e.includes('Duplicate subnet range'))).toBe(true);
      });

      it('should reject empty subnet names', () => {
        const vnet: VNetAttachment = {
          enabled: true,
          addressSpace: '10.0.0.0/16',
          subnets: [{ name: '', addressRange: '10.0.1.0/24' }],
        };

        const result = validateVNetConfig(vnet);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Subnet name cannot be empty');
      });

      it('should validate service endpoints', () => {
        const vnet: VNetAttachment = {
          enabled: true,
          addressSpace: '10.0.0.0/16',
          subnets: [
            {
              name: 'subnet1',
              addressRange: '10.0.1.0/24',
              serviceEndpoints: [
                'Microsoft.Storage',
                'Microsoft.AzureCosmosDB',
                'UnknownEndpoint', // Invalid
              ],
            },
          ],
        };

        const result = validateVNetConfig(vnet);
        expect(result.valid).toBe(true); // Warnings don't fail validation
        expect(result.warnings?.some((w) => w.includes('Unknown service endpoint'))).toBe(true);
      });
    });

    describe('Complex Scenarios', () => {
      it('should handle multiple non-overlapping subnets', () => {
        const vnet: VNetAttachment = {
          enabled: true,
          addressSpace: '10.0.0.0/16',
          subnets: [
            { name: 'functions', addressRange: '10.0.1.0/24' },
            { name: 'data', addressRange: '10.0.2.0/24' },
            { name: 'gateway', addressRange: '10.0.3.0/24' },
            { name: 'management', addressRange: '10.0.4.0/24' },
          ],
        };

        const result = validateVNetConfig(vnet);
        expect(result.valid).toBe(true);
      });

      it('should handle different subnet prefix lengths', () => {
        const vnet: VNetAttachment = {
          enabled: true,
          addressSpace: '10.0.0.0/16',
          subnets: [
            { name: 'large', addressRange: '10.0.0.0/20' }, // 4096 addresses
            { name: 'medium', addressRange: '10.0.16.0/22' }, // 1024 addresses
            { name: 'small', addressRange: '10.0.20.0/24' }, // 256 addresses
          ],
        };

        const result = validateVNetConfig(vnet);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('validateWafConfig', () => {
    describe('Basic Validation', () => {
      it('should pass validation when WAF is disabled', () => {
        const waf: WafAttachment = {
          enabled: false,
        };

        const result = validateWafConfig(waf);
        expect(result.valid).toBe(true);
      });

      it('should pass with valid basic configuration', () => {
        const waf: WafAttachment = {
          enabled: true,
          mode: 'Prevention',
          ruleSet: 'OWASP',
          ruleSetVersion: '3.2',
        };

        const result = validateWafConfig(waf);
        expect(result.valid).toBe(true);
      });

      it('should reject invalid mode', () => {
        const waf: WafAttachment = {
          enabled: true,
          mode: 'InvalidMode' as any,
        };

        const result = validateWafConfig(waf);
        expect(result.valid).toBe(false);
        expect(result.errors?.some((e) => e.includes('Invalid WAF mode'))).toBe(true);
      });

      it('should warn about unknown rule set', () => {
        const waf: WafAttachment = {
          enabled: true,
          ruleSet: 'CustomRuleSet' as any,
        };

        const result = validateWafConfig(waf);
        expect(result.valid).toBe(true); // Warnings don't fail
        expect(result.warnings?.some((w) => w.includes('Unknown rule set'))).toBe(true);
      });

      it('should warn about unknown rule set version', () => {
        const waf: WafAttachment = {
          enabled: true,
          ruleSet: 'OWASP',
          ruleSetVersion: '4.0',
        };

        const result = validateWafConfig(waf);
        expect(result.valid).toBe(true); // Warnings don't fail
        expect(result.warnings?.some((w) => w.includes('Unknown rule set version'))).toBe(true);
      });
    });

    describe('Custom Rules Validation', () => {
      it('should validate custom rules with unique priorities', () => {
        const waf: WafAttachment = {
          enabled: true,
          customRules: [
            {
              name: 'BlockBadIPs',
              priority: 1,
              action: 'Block',
              conditions: [
                {
                  variable: 'RemoteAddr',
                  operator: 'IPMatch',
                  values: ['192.168.1.1'],
                },
              ],
            },
            {
              name: 'AllowGoodIPs',
              priority: 2,
              action: 'Allow',
              conditions: [
                {
                  variable: 'RemoteAddr',
                  operator: 'IPMatch',
                  values: ['10.0.0.1'],
                },
              ],
            },
          ],
        };

        const result = validateWafConfig(waf);
        expect(result.valid).toBe(true);
      });

      it('should detect duplicate priorities', () => {
        const waf: WafAttachment = {
          enabled: true,
          customRules: [
            {
              name: 'Rule1',
              priority: 1,
              action: 'Block',
              conditions: [{ variable: 'RemoteAddr', operator: 'IPMatch', values: ['1.1.1.1'] }],
            },
            {
              name: 'Rule2',
              priority: 1, // Duplicate
              action: 'Allow',
              conditions: [{ variable: 'RemoteAddr', operator: 'IPMatch', values: ['2.2.2.2'] }],
            },
          ],
        };

        const result = validateWafConfig(waf);
        expect(result.valid).toBe(false);
        expect(result.errors?.some((e) => e.includes('Duplicate WAF rule priority'))).toBe(true);
      });

      it('should reject priorities outside valid range', () => {
        const waf: WafAttachment = {
          enabled: true,
          customRules: [
            {
              name: 'InvalidPriority',
              priority: 1001, // Too high
              action: 'Block',
              conditions: [{ variable: 'RemoteAddr', operator: 'IPMatch', values: ['1.1.1.1'] }],
            },
          ],
        };

        const result = validateWafConfig(waf);
        expect(result.valid).toBe(false);
        expect(result.errors?.some((e) => e.includes('priority must be between 1 and 1000'))).toBe(
          true
        );
      });

      it('should reject invalid actions', () => {
        const waf: WafAttachment = {
          enabled: true,
          customRules: [
            {
              name: 'InvalidAction',
              priority: 1,
              action: 'InvalidAction' as any,
              conditions: [{ variable: 'RemoteAddr', operator: 'IPMatch', values: ['1.1.1.1'] }],
            },
          ],
        };

        const result = validateWafConfig(waf);
        expect(result.valid).toBe(false);
        expect(result.errors?.some((e) => e.includes('Invalid WAF rule action'))).toBe(true);
      });

      it('should require at least one condition', () => {
        const waf: WafAttachment = {
          enabled: true,
          customRules: [
            {
              name: 'NoConditions',
              priority: 1,
              action: 'Block',
              conditions: [],
            },
          ],
        };

        const result = validateWafConfig(waf);
        expect(result.valid).toBe(false);
        expect(
          result.errors?.some((e) => e.includes('must have at least one match condition'))
        ).toBe(true);
      });
    });
  });

  describe('validateDdosConfig', () => {
    describe('Basic Validation', () => {
      it('should pass validation when DDoS is disabled', () => {
        const ddos: DdosAttachment = {
          enabled: false,
        };

        const result = validateDdosConfig(ddos);
        expect(result.valid).toBe(true);
      });

      it('should pass with valid configuration', () => {
        const ddos: DdosAttachment = {
          enabled: true,
          plan: 'Standard',
        };

        const result = validateDdosConfig(ddos);
        expect(result.valid).toBe(true);
      });

      it('should reject invalid plan', () => {
        const ddos: DdosAttachment = {
          enabled: true,
          plan: 'Premium' as any,
        };

        const result = validateDdosConfig(ddos);
        expect(result.valid).toBe(false);
        expect(result.errors?.some((e) => e.includes('Invalid DDoS plan'))).toBe(true);
      });
    });

    describe('Alert Thresholds Validation', () => {
      it('should validate positive thresholds', () => {
        const ddos: DdosAttachment = {
          enabled: true,
          plan: 'Standard',
          alertThresholds: {
            packetsPerSecond: 10000,
            bytesPerSecond: 1000000,
            tcpConnectionsPerSecond: 1000,
          },
        };

        const result = validateDdosConfig(ddos);
        expect(result.valid).toBe(true);
      });

      it('should reject non-positive packetsPerSecond', () => {
        const ddos: DdosAttachment = {
          enabled: true,
          alertThresholds: {
            packetsPerSecond: 0,
          },
        };

        const result = validateDdosConfig(ddos);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('DDoS packets per second threshold must be positive');
      });

      it('should reject non-positive bytesPerSecond', () => {
        const ddos: DdosAttachment = {
          enabled: true,
          alertThresholds: {
            bytesPerSecond: -100,
          },
        };

        const result = validateDdosConfig(ddos);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('DDoS bytes per second threshold must be positive');
      });

      it('should reject non-positive tcpConnectionsPerSecond', () => {
        const ddos: DdosAttachment = {
          enabled: true,
          alertThresholds: {
            tcpConnectionsPerSecond: 0,
          },
        };

        const result = validateDdosConfig(ddos);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          'DDoS TCP connections per second threshold must be positive'
        );
      });
    });
  });

  describe('validateNetworkConfig', () => {
    it('should validate complete network configuration', () => {
      const network: NetworkAttachment = {
        vnet: {
          enabled: true,
          addressSpace: '10.0.0.0/16',
          subnets: [
            { name: 'functions', addressRange: '10.0.1.0/24' },
            { name: 'data', addressRange: '10.0.2.0/24' },
          ],
        },
        waf: {
          enabled: true,
          mode: 'Prevention',
          ruleSet: 'OWASP',
          ruleSetVersion: '3.2',
        },
        ddos: {
          enabled: true,
          plan: 'Standard',
        },
      };

      const result = validateNetworkConfig(network);
      expect(result.valid).toBe(true);
    });

    it('should aggregate errors from all components', () => {
      const network: NetworkAttachment = {
        vnet: {
          enabled: true,
          addressSpace: 'invalid', // Invalid CIDR
        },
        waf: {
          enabled: true,
          mode: 'InvalidMode' as any, // Invalid mode
        },
        ddos: {
          enabled: true,
          plan: 'InvalidPlan' as any, // Invalid plan
        },
      };

      const result = validateNetworkConfig(network);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(2); // Should have errors from all components
    });

    it('should aggregate warnings from all components', () => {
      const network: NetworkAttachment = {
        vnet: {
          enabled: true,
          addressSpace: '10.0.0.0/16',
          subnets: [
            {
              name: 'subnet1',
              addressRange: '10.0.1.0/24',
              serviceEndpoints: ['UnknownEndpoint'], // Warning
            },
          ],
        },
        waf: {
          enabled: true,
          ruleSet: 'CustomRuleSet' as any, // Warning
        },
      };

      const result = validateNetworkConfig(network);
      expect(result.valid).toBe(true); // Warnings don't fail
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(1);
    });

    it('should pass with partial network configuration', () => {
      const network: NetworkAttachment = {
        vnet: {
          enabled: true,
          addressSpace: '10.0.0.0/16',
        },
        // Only VNet configured
      };

      const result = validateNetworkConfig(network);
      expect(result.valid).toBe(true);
    });

    it('should pass when all components are disabled', () => {
      const network: NetworkAttachment = {
        vnet: {
          enabled: false,
        },
        waf: {
          enabled: false,
        },
        ddos: {
          enabled: false,
        },
      };

      const result = validateNetworkConfig(network);
      expect(result.valid).toBe(true);
    });
  });
});
