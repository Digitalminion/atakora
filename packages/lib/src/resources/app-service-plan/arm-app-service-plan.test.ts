import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmAppServicePlan } from './arm-app-service-plan';
import {
  AppServicePlanSkuName,
  AppServicePlanSkuTier,
  AppServicePlanKind,
} from './types';
import type { ArmAppServicePlanProps } from './types';

describe('resources/app-service-plan/ArmAppServicePlan', () => {
  let app: App;
  let stack: SubscriptionStack;

  beforeEach(() => {
    app = new App();
    stack = new SubscriptionStack(app, 'TestStack', {
      subscription: Subscription.fromId('12345678-1234-1234-1234-123456789abc'),
      geography: Geography.fromValue('eastus'),
      organization: Organization.fromValue('digital-products'),
      project: new Project('colorai'),
      environment: Environment.fromValue('nonprod'),
      instance: Instance.fromNumber(1),
    });
  });

  describe('constructor', () => {
    it('should create App Service Plan with required properties', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-test-001',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
      });

      expect(plan.planName).toBe('asp-test-001');
      expect(plan.name).toBe('asp-test-001');
      expect(plan.location).toBe('eastus');
      expect(plan.sku.name).toBe('B1');
      expect(plan.sku.tier).toBe('Basic');
      expect(plan.tags).toEqual({});
    });

    it('should create App Service Plan with all properties', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-test-002',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.S1,
          tier: AppServicePlanSkuTier.STANDARD,
          capacity: 2,
        },
        kind: AppServicePlanKind.LINUX,
        reserved: true,
        zoneRedundant: false,
        tags: {
          environment: 'test',
        },
      });

      expect(plan.sku.capacity).toBe(2);
      expect(plan.kind).toBe('linux');
      expect(plan.reserved).toBe(true);
      expect(plan.zoneRedundant).toBe(false);
      expect(plan.tags).toEqual({ environment: 'test' });
    });

    it('should set correct resource type', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-test-003',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
      });

      expect(plan.resourceType).toBe('Microsoft.Web/serverfarms');
    });

    it('should set correct API version', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-test-004',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
      });

      expect(plan.apiVersion).toBe('2023-01-01');
    });

    it('should generate resource ID', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-test-005',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
      });

      expect(plan.resourceId).toContain('/serverfarms/asp-test-005');
      expect(plan.planId).toBe(plan.resourceId);
    });

    it('should have ResourceGroup deployment scope', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-test-006',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
      });

      expect(plan.scope).toBe('resourceGroup');
    });

    it('should create Linux App Service Plan', () => {
      const plan = new ArmAppServicePlan(stack, 'LinuxPlan', {
        planName: 'asp-linux-001',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
        kind: AppServicePlanKind.LINUX,
        reserved: true,
      });

      expect(plan.kind).toBe('linux');
      expect(plan.reserved).toBe(true);
    });

    it('should create Windows App Service Plan', () => {
      const plan = new ArmAppServicePlan(stack, 'WindowsPlan', {
        planName: 'asp-windows-001',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
        kind: AppServicePlanKind.WINDOWS,
        reserved: false,
      });

      expect(plan.kind).toBe('windows');
      expect(plan.reserved).toBe(false);
    });
  });

  describe('validation', () => {
    it('should throw error for empty plan name', () => {
      expect(() => {
        new ArmAppServicePlan(stack, 'Plan', {
          planName: '',
          location: 'eastus',
          sku: {
            name: AppServicePlanSkuName.B1,
            tier: AppServicePlanSkuTier.BASIC,
          },
        });
      }).toThrow(/App Service Plan name cannot be empty/);
    });

    it('should throw error for plan name longer than 40 characters', () => {
      expect(() => {
        new ArmAppServicePlan(stack, 'Plan', {
          planName: 'a'.repeat(41),
          location: 'eastus',
          sku: {
            name: AppServicePlanSkuName.B1,
            tier: AppServicePlanSkuTier.BASIC,
          },
        });
      }).toThrow(/must be 1-40 characters/);
    });

    it('should accept plan name at exactly 1 character', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'a',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
      });

      expect(plan.planName).toBe('a');
    });

    it('should accept plan name at exactly 40 characters', () => {
      const name = 'a'.repeat(40);
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: name,
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
      });

      expect(plan.planName).toBe(name);
    });

    it('should throw error for plan name with special characters', () => {
      expect(() => {
        new ArmAppServicePlan(stack, 'Plan', {
          planName: 'asp_test_001',
          location: 'eastus',
          sku: {
            name: AppServicePlanSkuName.B1,
            tier: AppServicePlanSkuTier.BASIC,
          },
        });
      }).toThrow(/only alphanumeric characters and hyphens/);
    });

    it('should accept valid alphanumeric names with hyphens', () => {
      const validNames = ['asp-test-001', 'AppPlan', 'app-service-plan', 'ASP123'];

      validNames.forEach((name) => {
        const plan = new ArmAppServicePlan(stack, `Plan-${name}`, {
          planName: name,
          location: 'eastus',
          sku: {
            name: AppServicePlanSkuName.B1,
            tier: AppServicePlanSkuTier.BASIC,
          },
        });

        expect(plan.planName).toBe(name);
      });
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmAppServicePlan(stack, 'Plan', {
          planName: 'asp-test',
          location: '',
          sku: {
            name: AppServicePlanSkuName.B1,
            tier: AppServicePlanSkuTier.BASIC,
          },
        });
      }).toThrow(/Location cannot be empty/);
    });

    it('should throw error when SKU name is not provided', () => {
      expect(() => {
        new ArmAppServicePlan(stack, 'Plan', {
          planName: 'asp-test',
          location: 'eastus',
          sku: {
            tier: AppServicePlanSkuTier.BASIC,
          } as any,
        });
      }).toThrow(/SKU with name and tier must be provided/);
    });

    it('should throw error when SKU tier is not provided', () => {
      expect(() => {
        new ArmAppServicePlan(stack, 'Plan', {
          planName: 'asp-test',
          location: 'eastus',
          sku: {
            name: AppServicePlanSkuName.B1,
          } as any,
        });
      }).toThrow(/SKU with name and tier must be provided/);
    });

    it('should throw error for capacity less than 1', () => {
      expect(() => {
        new ArmAppServicePlan(stack, 'Plan', {
          planName: 'asp-test',
          location: 'eastus',
          sku: {
            name: AppServicePlanSkuName.B1,
            tier: AppServicePlanSkuTier.BASIC,
            capacity: 0,
          },
        });
      }).toThrow(/capacity must be between 1 and 30/);
    });

    it('should throw error for capacity greater than 30', () => {
      expect(() => {
        new ArmAppServicePlan(stack, 'Plan', {
          planName: 'asp-test',
          location: 'eastus',
          sku: {
            name: AppServicePlanSkuName.B1,
            tier: AppServicePlanSkuTier.BASIC,
            capacity: 31,
          },
        });
      }).toThrow(/capacity must be between 1 and 30/);
    });

    it('should accept capacity at exactly 1', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-test',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
          capacity: 1,
        },
      });

      expect(plan.sku.capacity).toBe(1);
    });

    it('should accept capacity at exactly 30', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-test',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
          capacity: 30,
        },
      });

      expect(plan.sku.capacity).toBe(30);
    });
  });

  describe('SKU options', () => {
    it('should support Free tier (F1)', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-free',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.F1,
          tier: AppServicePlanSkuTier.FREE,
        },
      });

      expect(plan.sku.name).toBe('F1');
      expect(plan.sku.tier).toBe('Free');
    });

    it('should support Basic tier (B1)', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-basic',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
      });

      expect(plan.sku.name).toBe('B1');
      expect(plan.sku.tier).toBe('Basic');
    });

    it('should support Standard tier (S1)', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-standard',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.S1,
          tier: AppServicePlanSkuTier.STANDARD,
        },
      });

      expect(plan.sku.name).toBe('S1');
      expect(plan.sku.tier).toBe('Standard');
    });

    it('should support Premium V2 tier (P1v2)', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-premium-v2',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.P1V2,
          tier: AppServicePlanSkuTier.PREMIUM_V2,
        },
      });

      expect(plan.sku.name).toBe('P1v2');
      expect(plan.sku.tier).toBe('PremiumV2');
    });

    it('should support Premium V3 tier (P1v3)', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-premium-v3',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.P1V3,
          tier: AppServicePlanSkuTier.PREMIUM_V3,
        },
      });

      expect(plan.sku.name).toBe('P1v3');
      expect(plan.sku.tier).toBe('PremiumV3');
    });

    it('should support SKU with size and family', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-custom',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
          size: 'B1',
          family: 'B',
        },
      });

      expect(plan.sku.size).toBe('B1');
      expect(plan.sku.family).toBe('B');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with minimal properties', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-test',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
      });

      const template: any = plan.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Web/serverfarms',
        apiVersion: '2023-01-01',
        name: 'asp-test',
        location: 'eastus',
        sku: {
          name: 'B1',
          tier: 'Basic',
        },
        properties: undefined,
        tags: undefined,
      });
    });

    it('should generate ARM template with all properties', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-full',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.S1,
          tier: AppServicePlanSkuTier.STANDARD,
          size: 'S1',
          family: 'S',
          capacity: 3,
        },
        kind: AppServicePlanKind.LINUX,
        reserved: true,
        zoneRedundant: true,
        tags: {
          environment: 'prod',
        },
      });

      const template: any = plan.toArmTemplate();

      expect(template.kind).toBe('linux');
      expect(template.sku).toMatchObject({
        name: 'S1',
        tier: 'Standard',
        size: 'S1',
        family: 'S',
        capacity: 3,
      });
      expect(template.properties).toMatchObject({
        reserved: true,
        zoneRedundant: true,
      });
      expect(template.tags).toEqual({ environment: 'prod' });
    });

    it('should generate ARM template for Linux plan', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-linux',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
        kind: AppServicePlanKind.LINUX,
        reserved: true,
      });

      const template: any = plan.toArmTemplate();

      expect(template.kind).toBe('linux');
      expect(template.properties.reserved).toBe(true);
    });

    it('should generate ARM template for Windows plan', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-windows',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
        kind: AppServicePlanKind.WINDOWS,
        reserved: false,
      });

      const template: any = plan.toArmTemplate();

      expect(template.kind).toBe('windows');
      expect(template.properties.reserved).toBe(false);
    });

    it('should omit properties when not provided', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-minimal',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
      });

      const template: any = plan.toArmTemplate();

      expect(template.properties).toBeUndefined();
      expect(template.tags).toBeUndefined();
    });
  });

  describe('zone redundancy', () => {
    it('should support zone redundancy enabled', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-zone-redundant',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.P1V3,
          tier: AppServicePlanSkuTier.PREMIUM_V3,
        },
        zoneRedundant: true,
      });

      expect(plan.zoneRedundant).toBe(true);
    });

    it('should support zone redundancy disabled', () => {
      const plan = new ArmAppServicePlan(stack, 'Plan', {
        planName: 'asp-no-zone-redundancy',
        location: 'eastus',
        sku: {
          name: AppServicePlanSkuName.B1,
          tier: AppServicePlanSkuTier.BASIC,
        },
        zoneRedundant: false,
      });

      expect(plan.zoneRedundant).toBe(false);
    });
  });
});
