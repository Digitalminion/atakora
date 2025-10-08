import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmOpenAIService } from './arm-openai-service';
import { CognitiveServicesSku, PublicNetworkAccess, NetworkRuleAction } from './types';
import type { ArmOpenAIServiceProps } from './types';

describe('resources/openai-service/ArmOpenAIService', () => {
  let app: App;
  let stack: SubscriptionStack;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-minion'),
      project: new Project('authr'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
    });
  });

  describe('constructor', () => {
    it('should create OpenAI Service with required properties', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-001',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
      });

      expect(openai.accountName).toBe('oai-test-001');
      expect(openai.name).toBe('oai-test-001');
      expect(openai.location).toBe('eastus');
      expect(openai.sku.name).toBe('S0');
      expect(openai.kind).toBe('OpenAI');
      expect(openai.tags).toEqual({});
    });

    it('should always set kind to OpenAI', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-002',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
      });

      expect(openai.kind).toBe('OpenAI');
    });

    it('should create OpenAI Service with all properties', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-003',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
        properties: {
          customSubDomainName: 'oai-test-003',
          publicNetworkAccess: PublicNetworkAccess.DISABLED,
          networkAcls: {
            defaultAction: NetworkRuleAction.DENY,
            ipRules: [{ value: '1.2.3.4' }],
            virtualNetworkRules: [{ id: '/subscriptions/xxx/xxx' }],
          },
        },
        tags: {
          environment: 'test',
        },
      });

      expect(openai.customSubDomainName).toBe('oai-test-003');
      expect(openai.publicNetworkAccess).toBe('Disabled');
      expect(openai.networkAcls?.defaultAction).toBe('Deny');
      expect(openai.networkAcls?.ipRules).toHaveLength(1);
      expect(openai.networkAcls?.virtualNetworkRules).toHaveLength(1);
      expect(openai.tags).toEqual({ environment: 'test' });
    });

    it('should set correct resource type', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-004',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
      });

      expect(openai.resourceType).toBe('Microsoft.CognitiveServices/accounts');
    });

    it('should set correct API version', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-005',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
      });

      expect(openai.apiVersion).toBe('2023-05-01');
    });

    it('should set correct resource ID format', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-006',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
      });

      expect(openai.resourceId).toBe(
        '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.CognitiveServices/accounts/oai-test-006'
      );
      expect(openai.accountId).toBe(openai.resourceId);
    });

    it('should accept custom subdomain name', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-007',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
        properties: {
          customSubDomainName: 'custom-subdomain',
        },
      });

      expect(openai.customSubDomainName).toBe('custom-subdomain');
    });
  });

  describe('validation', () => {
    it('should throw error if account name is empty', () => {
      expect(() => {
        new ArmOpenAIService(stack, 'OpenAI', {
          accountName: '',
          location: 'eastus',
          sku: {
            name: CognitiveServicesSku.S0,
          },
        });
      }).toThrow('OpenAI Service account name cannot be empty');
    });

    it('should throw error if account name is whitespace', () => {
      expect(() => {
        new ArmOpenAIService(stack, 'OpenAI', {
          accountName: '   ',
          location: 'eastus',
          sku: {
            name: CognitiveServicesSku.S0,
          },
        });
      }).toThrow('OpenAI Service account name cannot be empty');
    });

    it('should throw error if account name contains uppercase letters', () => {
      expect(() => {
        new ArmOpenAIService(stack, 'OpenAI', {
          accountName: 'Oai-Test-001',
          location: 'eastus',
          sku: {
            name: CognitiveServicesSku.S0,
          },
        });
      }).toThrow('must be 2-64 characters, lowercase letters, numbers, and hyphens only');
    });

    it('should throw error if account name starts with hyphen', () => {
      expect(() => {
        new ArmOpenAIService(stack, 'OpenAI', {
          accountName: '-oai-test-001',
          location: 'eastus',
          sku: {
            name: CognitiveServicesSku.S0,
          },
        });
      }).toThrow('cannot start or end with a hyphen');
    });

    it('should throw error if account name ends with hyphen', () => {
      expect(() => {
        new ArmOpenAIService(stack, 'OpenAI', {
          accountName: 'oai-test-001-',
          location: 'eastus',
          sku: {
            name: CognitiveServicesSku.S0,
          },
        });
      }).toThrow('cannot start or end with a hyphen');
    });

    it('should throw error if account name is too short (1 char)', () => {
      expect(() => {
        new ArmOpenAIService(stack, 'OpenAI', {
          accountName: 'a',
          location: 'eastus',
          sku: {
            name: CognitiveServicesSku.S0,
          },
        });
      }).toThrow('must be 2-64 characters');
    });

    it('should throw error if account name is too long (65 chars)', () => {
      expect(() => {
        new ArmOpenAIService(stack, 'OpenAI', {
          accountName: 'a'.repeat(65),
          location: 'eastus',
          sku: {
            name: CognitiveServicesSku.S0,
          },
        });
      }).toThrow('must be 2-64 characters');
    });

    it('should accept valid 2-character account name', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'aa',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
      });

      expect(openai.accountName).toBe('aa');
    });

    it('should accept valid 64-character account name', () => {
      const validName = 'a' + 'b'.repeat(62) + 'c';
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: validName,
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
      });

      expect(openai.accountName).toBe(validName);
      expect(openai.accountName.length).toBe(64);
    });

    it('should throw error if location is empty', () => {
      expect(() => {
        new ArmOpenAIService(stack, 'OpenAI', {
          accountName: 'oai-test-001',
          location: '',
          sku: {
            name: CognitiveServicesSku.S0,
          },
        });
      }).toThrow('Location cannot be empty');
    });

    it('should throw error if SKU is not provided', () => {
      expect(() => {
        new ArmOpenAIService(stack, 'OpenAI', {
          accountName: 'oai-test-001',
          location: 'eastus',
          sku: undefined as any,
        });
      }).toThrow('SKU must be provided');
    });

    it('should throw error if SKU name is not provided', () => {
      expect(() => {
        new ArmOpenAIService(stack, 'OpenAI', {
          accountName: 'oai-test-001',
          location: 'eastus',
          sku: {} as any,
        });
      }).toThrow('SKU name must be provided');
    });

    it('should throw error if custom subdomain name is invalid', () => {
      expect(() => {
        new ArmOpenAIService(stack, 'OpenAI', {
          accountName: 'oai-test-001',
          location: 'eastus',
          sku: {
            name: CognitiveServicesSku.S0,
          },
          properties: {
            customSubDomainName: '-invalid-subdomain',
          },
        });
      }).toThrow('Custom subdomain name');
    });

    it('should accept valid custom subdomain name', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-001',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
        properties: {
          customSubDomainName: 'valid-subdomain-123',
        },
      });

      expect(openai.customSubDomainName).toBe('valid-subdomain-123');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate correct ARM template with required properties', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-001',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
      });

      const template = openai.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.CognitiveServices/accounts',
        apiVersion: '2023-05-01',
        name: 'oai-test-001',
        location: 'eastus',
        kind: 'OpenAI',
        sku: {
          name: 'S0',
        },
        properties: undefined,
        tags: undefined,
      });
    });

    it('should include kind=OpenAI in ARM template', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-002',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
      });

      const template = openai.toArmTemplate();

      expect(template.kind).toBe('OpenAI');
    });

    it('should generate correct ARM template with all properties', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-003',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
        properties: {
          customSubDomainName: 'oai-test-003',
          publicNetworkAccess: PublicNetworkAccess.DISABLED,
          networkAcls: {
            defaultAction: NetworkRuleAction.DENY,
            ipRules: [{ value: '1.2.3.4/32' }],
          },
        },
        tags: {
          environment: 'test',
          project: 'authr',
        },
      });

      const template = openai.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.CognitiveServices/accounts',
        apiVersion: '2023-05-01',
        name: 'oai-test-003',
        location: 'eastus',
        kind: 'OpenAI',
        sku: {
          name: 'S0',
        },
        properties: {
          customSubDomainName: 'oai-test-003',
          publicNetworkAccess: 'Disabled',
          networkAcls: {
            defaultAction: 'Deny',
            ipRules: [{ value: '1.2.3.4/32' }],
          },
        },
        tags: {
          environment: 'test',
          project: 'authr',
        },
      });
    });

    it('should include customSubDomainName in ARM template properties', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-004',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
        properties: {
          customSubDomainName: 'custom-domain',
        },
      });

      const template = openai.toArmTemplate();

      expect(template.properties).toEqual({
        customSubDomainName: 'custom-domain',
      });
    });

    it('should include network ACLs with virtual network rules', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-005',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
        properties: {
          networkAcls: {
            defaultAction: NetworkRuleAction.DENY,
            virtualNetworkRules: [
              {
                id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet',
              },
            ],
          },
        },
      });

      const template = openai.toArmTemplate();

      expect(template.properties).toEqual({
        networkAcls: {
          defaultAction: 'Deny',
          virtualNetworkRules: [
            {
              id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet',
            },
          ],
        },
      });
    });

    it('should handle empty tags correctly', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-006',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
      });

      const template = openai.toArmTemplate();

      expect(template.tags).toBeUndefined();
    });

    it('should handle multiple IP rules in network ACLs', () => {
      const openai = new ArmOpenAIService(stack, 'OpenAI', {
        accountName: 'oai-test-007',
        location: 'eastus',
        sku: {
          name: CognitiveServicesSku.S0,
        },
        properties: {
          networkAcls: {
            defaultAction: NetworkRuleAction.DENY,
            ipRules: [{ value: '1.2.3.4' }, { value: '5.6.7.8' }, { value: '10.0.0.0/24' }],
          },
        },
      });

      const template = openai.toArmTemplate();

      expect(template.properties).toEqual({
        networkAcls: {
          defaultAction: 'Deny',
          ipRules: [{ value: '1.2.3.4' }, { value: '5.6.7.8' }, { value: '10.0.0.0/24' }],
        },
      });
    });
  });
});
