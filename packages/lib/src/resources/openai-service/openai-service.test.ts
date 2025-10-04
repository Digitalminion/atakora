import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { ResourceGroup } from '../resource-group/resource-group';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { OpenAIService } from './openai-service';
import { PublicNetworkAccess, NetworkRuleAction } from './types';

describe('resources/openai-service/OpenAIService', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-products'),
      project: new Project('colorai'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
      tags: {
        managed_by: 'terraform',
      },
    });
    resourceGroup = new ResourceGroup(stack, 'DataRG');
  });

  describe('constructor', () => {
    it('should create OpenAI Service with auto-generated name', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT');

      // Should auto-generate name with oai prefix
      expect(openai.accountName).toMatch(/^oai-/);
      expect(openai.accountName).toContain('colorai'); // Project name
      expect(openai.accountName.length).toBeLessThanOrEqual(64);
      expect(openai.accountName.endsWith('-')).toBe(false); // Should not end with hyphen
    });

    it('should use provided account name when specified', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT', {
        accountName: 'my-openai-service',
      });

      expect(openai.accountName).toBe('my-openai-service');
    });

    it('should auto-generate customSubDomainName to match account name', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT', {
        accountName: 'oai-colorai-test',
      });

      expect(openai.customSubDomainName).toBe('oai-colorai-test');
    });

    it('should use provided customSubDomainName when specified', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT', {
        accountName: 'oai-colorai-test',
        customSubDomainName: 'custom-subdomain',
      });

      expect(openai.customSubDomainName).toBe('custom-subdomain');
    });

    it('should default location to resource group location', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT');

      expect(openai.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT', {
        location: 'westus2',
      });

      expect(openai.location).toBe('westus2');
    });

    it('should set resource group name from parent', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT');

      expect(openai.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should merge tags with parent', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT', {
        tags: {
          purpose: 'ml-inference',
        },
      });

      expect(openai.tags).toMatchObject({
        managed_by: 'terraform',
        purpose: 'ml-inference',
      });
    });

    it('should default SKU to S0', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT');

      expect(openai.sku.name).toBe('S0');
    });

    it('should use provided SKU when specified', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT', {
        sku: 'S0',
      });

      expect(openai.sku.name).toBe('S0');
    });

    it('should default publicNetworkAccess to Disabled', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT');

      // Check the underlying ARM resource
      const armTemplate = (openai as any).armOpenAIService.toArmTemplate();
      expect(armTemplate.properties.publicNetworkAccess).toBe('Disabled');
    });

    it('should use provided publicNetworkAccess when specified', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT', {
        publicNetworkAccess: PublicNetworkAccess.ENABLED,
      });

      const armTemplate = (openai as any).armOpenAIService.toArmTemplate();
      expect(armTemplate.properties.publicNetworkAccess).toBe('Enabled');
    });

    it('should default networkAcls to Deny', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT');

      const armTemplate = (openai as any).armOpenAIService.toArmTemplate();
      expect(armTemplate.properties.networkAcls.defaultAction).toBe('Deny');
    });

    it('should use provided networkAcls when specified', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT', {
        networkAcls: {
          defaultAction: NetworkRuleAction.ALLOW,
          ipRules: [{ value: '1.2.3.4' }],
        },
      });

      const armTemplate = (openai as any).armOpenAIService.toArmTemplate();
      expect(armTemplate.properties.networkAcls.defaultAction).toBe('Allow');
      expect(armTemplate.properties.networkAcls.ipRules).toHaveLength(1);
    });

    it('should generate resource ID', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT');

      expect(openai.accountId).toBeDefined();
      expect(openai.accountId).toContain('/accounts/');
    });
  });

  describe('auto-naming with different IDs', () => {
    it('should generate unique names for different IDs', () => {
      const openai1 = new OpenAIService(resourceGroup, 'GPT');
      const openai2 = new OpenAIService(resourceGroup, 'DALLE');

      expect(openai1.accountName).not.toBe(openai2.accountName);
      expect(openai1.accountName).toContain('gpt');
      expect(openai2.accountName).toContain('dalle');
    });

    it('should truncate name to 64 characters', () => {
      const openai = new OpenAIService(
        resourceGroup,
        'VeryLongOpenAIServiceNameThatExceedsTheLimitAndShouldBeTruncated'
      );

      expect(openai.accountName.length).toBeLessThanOrEqual(64);
    });

    it('should allow hyphens in auto-generated names', () => {
      const openai = new OpenAIService(resourceGroup, 'gpt-service');

      expect(openai.accountName).toContain('gpt');
    });

    it('should convert auto-generated names to lowercase', () => {
      const openai = new OpenAIService(resourceGroup, 'GPTService');

      expect(openai.accountName).toBe(openai.accountName.toLowerCase());
    });

    it('should not end with hyphen after truncation', () => {
      const openai = new OpenAIService(resourceGroup, 'LongNameTest');

      expect(openai.accountName.endsWith('-')).toBe(false);
    });
  });

  describe('customSubDomainName auto-generation', () => {
    it('should auto-set customSubDomainName to match account name when not provided', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT', {
        accountName: 'oai-test-001',
      });

      expect(openai.customSubDomainName).toBe('oai-test-001');
    });

    it('should auto-set customSubDomainName for auto-generated account names', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT');

      expect(openai.customSubDomainName).toBe(openai.accountName);
    });

    it('should respect explicit customSubDomainName', () => {
      const openai = new OpenAIService(resourceGroup, 'GPT', {
        accountName: 'oai-test-002',
        customSubDomainName: 'custom-domain-002',
      });

      expect(openai.customSubDomainName).toBe('custom-domain-002');
      expect(openai.customSubDomainName).not.toBe(openai.accountName);
    });
  });

  describe('defaults validation', () => {
    it('should create with minimal configuration', () => {
      const openai = new OpenAIService(resourceGroup, 'Minimal');

      expect(openai.accountName).toBeDefined();
      expect(openai.location).toBe('eastus');
      expect(openai.sku.name).toBe('S0');
      expect(openai.customSubDomainName).toBe(openai.accountName);
    });

    it('should apply ColorAI secure defaults', () => {
      const openai = new OpenAIService(resourceGroup, 'Secure');

      const armTemplate = (openai as any).armOpenAIService.toArmTemplate();

      // Public network should be disabled
      expect(armTemplate.properties.publicNetworkAccess).toBe('Disabled');

      // Network ACLs should default to Deny
      expect(armTemplate.properties.networkAcls.defaultAction).toBe('Deny');
    });

    it('should override defaults when specified', () => {
      const openai = new OpenAIService(resourceGroup, 'Custom', {
        publicNetworkAccess: PublicNetworkAccess.ENABLED,
        networkAcls: {
          defaultAction: NetworkRuleAction.ALLOW,
        },
      });

      const armTemplate = (openai as any).armOpenAIService.toArmTemplate();

      expect(armTemplate.properties.publicNetworkAccess).toBe('Enabled');
      expect(armTemplate.properties.networkAcls.defaultAction).toBe('Allow');
    });
  });

  describe('fromAccountId', () => {
    it('should import OpenAI Service by account ID', () => {
      const accountId =
        '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/rg-test/providers/Microsoft.CognitiveServices/accounts/oai-existing';

      const openai = OpenAIService.fromAccountId(stack, 'ExistingOpenAI', accountId);

      expect(openai.accountName).toBe('oai-existing');
      expect(openai.accountId).toBe(accountId);
      expect(openai.sku.name).toBe('S0');
      expect(openai.customSubDomainName).toBe('oai-existing');
    });

    it('should throw error for invalid account ID format', () => {
      expect(() => {
        OpenAIService.fromAccountId(stack, 'Invalid', 'invalid-id-format');
      }).toThrow('Invalid account ID format');
    });

    it('should extract account name from complex resource ID', () => {
      const accountId =
        '/subscriptions/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/resourceGroups/rg-colorai-data-nonprod-eus-01/providers/Microsoft.CognitiveServices/accounts/oai-colorai-prod-001';

      const openai = OpenAIService.fromAccountId(stack, 'Imported', accountId);

      expect(openai.accountName).toBe('oai-colorai-prod-001');
    });
  });

  describe('error handling', () => {
    it('should throw error when not created within ResourceGroup', () => {
      expect(() => {
        new OpenAIService(stack, 'NoRG');
      }).toThrow('OpenAIService must be created within or under a ResourceGroup');
    });
  });

  describe('tag inheritance', () => {
    it('should inherit all parent tags', () => {
      const openai = new OpenAIService(resourceGroup, 'Tagged');

      expect(openai.tags.managed_by).toBe('terraform');
    });

    it('should allow tag override', () => {
      const openai = new OpenAIService(resourceGroup, 'Tagged', {
        tags: {
          managed_by: 'custom',
          additional: 'tag',
        },
      });

      expect(openai.tags.managed_by).toBe('custom');
      expect(openai.tags.additional).toBe('tag');
    });

    it('should merge parent and custom tags', () => {
      const openai = new OpenAIService(resourceGroup, 'Tagged', {
        tags: {
          custom: 'value',
        },
      });

      expect(openai.tags.managed_by).toBe('terraform');
      expect(openai.tags.custom).toBe('value');
    });
  });

  describe('network configuration', () => {
    it('should support IP rules in network ACLs', () => {
      const openai = new OpenAIService(resourceGroup, 'Network', {
        networkAcls: {
          defaultAction: NetworkRuleAction.DENY,
          ipRules: [
            { value: '1.2.3.4' },
            { value: '5.6.7.0/24' },
          ],
        },
      });

      const armTemplate = (openai as any).armOpenAIService.toArmTemplate();
      expect(armTemplate.properties.networkAcls.ipRules).toHaveLength(2);
    });

    it('should support virtual network rules in network ACLs', () => {
      const openai = new OpenAIService(resourceGroup, 'Network', {
        networkAcls: {
          defaultAction: NetworkRuleAction.DENY,
          virtualNetworkRules: [
            {
              id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/virtualNetworks/vnet/subnets/subnet1',
            },
          ],
        },
      });

      const armTemplate = (openai as any).armOpenAIService.toArmTemplate();
      expect(armTemplate.properties.networkAcls.virtualNetworkRules).toHaveLength(1);
    });
  });
});
