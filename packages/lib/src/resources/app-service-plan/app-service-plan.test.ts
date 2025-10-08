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
import { AppServicePlan } from './app-service-plan';
import { AppServicePlanSkuName, AppServicePlanKind } from './types';

describe('resources/app-service-plan/AppServicePlan', () => {
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
    resourceGroup = new ResourceGroup(stack, 'AppRG');
  });

  describe('constructor', () => {
    it('should create App Service Plan with auto-generated name', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan');

      // Should auto-generate name with asp prefix
      expect(plan.planName).toMatch(/^asp-/);
      expect(plan.planName).toContain('dp'); // Abbreviated org
      expect(plan.planName).toContain('colorai'); // Project
    });

    it('should use provided plan name when specified', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan', {
        planName: 'asp-custom-plan',
      });

      expect(plan.planName).toBe('asp-custom-plan');
    });

    it('should default location to resource group location', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan');

      expect(plan.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan', {
        location: 'westus2',
      });

      expect(plan.location).toBe('westus2');
    });

    it('should set resource group name from parent', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan');

      expect(plan.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should merge tags with parent', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan', {
        tags: {
          purpose: 'api-hosting',
        },
      });

      expect(plan.tags).toMatchObject({
        managed_by: 'terraform',
        purpose: 'api-hosting',
      });
    });

    it('should default SKU to B1', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan');

      expect(plan.sku).toBe('B1');
    });

    it('should use provided SKU when specified', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan', {
        sku: AppServicePlanSkuName.S1,
      });

      expect(plan.sku).toBe('S1');
    });

    it('should default kind to linux', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan');

      expect(plan.kind).toBe('linux');
    });

    it('should use provided kind when specified', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan', {
        kind: AppServicePlanKind.WINDOWS,
      });

      expect(plan.kind).toBe('windows');
    });

    it('should default reserved to true (Linux)', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan');

      expect(plan.reserved).toBe(true);
    });

    it('should auto-detect reserved from kind', () => {
      const linuxPlan = new AppServicePlan(resourceGroup, 'LinuxPlan', {
        kind: AppServicePlanKind.LINUX,
      });

      const windowsPlan = new AppServicePlan(resourceGroup, 'WindowsPlan', {
        kind: AppServicePlanKind.WINDOWS,
      });

      expect(linuxPlan.reserved).toBe(true);
      expect(windowsPlan.reserved).toBe(false);
    });

    it('should use explicit reserved value when provided', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan', {
        kind: AppServicePlanKind.LINUX,
        reserved: false,
      });

      expect(plan.reserved).toBe(false);
    });

    it('should default capacity to 1', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan');

      expect(plan.capacity).toBe(1);
    });

    it('should use provided capacity when specified', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan', {
        capacity: 3,
      });

      expect(plan.capacity).toBe(3);
    });

    it('should generate resource ID', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan');

      expect(plan.planId).toBeDefined();
      expect(plan.planId).toContain('/serverfarms/');
    });
  });

  describe('tier inference', () => {
    it('should infer Free tier from F1 SKU', () => {
      const plan = new AppServicePlan(resourceGroup, 'FreePlan', {
        sku: AppServicePlanSkuName.F1,
      });

      expect(plan.tier).toBe('Free');
    });

    it('should infer Basic tier from B1 SKU', () => {
      const plan = new AppServicePlan(resourceGroup, 'BasicPlan', {
        sku: AppServicePlanSkuName.B1,
      });

      expect(plan.tier).toBe('Basic');
    });

    it('should infer Basic tier from B2 SKU', () => {
      const plan = new AppServicePlan(resourceGroup, 'BasicPlan', {
        sku: AppServicePlanSkuName.B2,
      });

      expect(plan.tier).toBe('Basic');
    });

    it('should infer Standard tier from S1 SKU', () => {
      const plan = new AppServicePlan(resourceGroup, 'StandardPlan', {
        sku: AppServicePlanSkuName.S1,
      });

      expect(plan.tier).toBe('Standard');
    });

    it('should infer PremiumV2 tier from P1v2 SKU', () => {
      const plan = new AppServicePlan(resourceGroup, 'PremiumV2Plan', {
        sku: AppServicePlanSkuName.P1V2,
      });

      expect(plan.tier).toBe('PremiumV2');
    });

    it('should infer PremiumV3 tier from P1v3 SKU', () => {
      const plan = new AppServicePlan(resourceGroup, 'PremiumV3Plan', {
        sku: AppServicePlanSkuName.P1V3,
      });

      expect(plan.tier).toBe('PremiumV3');
    });
  });

  describe('auto-naming with different IDs', () => {
    it('should generate different names for different IDs', () => {
      const apiPlan = new AppServicePlan(resourceGroup, 'ApiPlan');
      const webPlan = new AppServicePlan(resourceGroup, 'WebPlan');

      expect(apiPlan.planName).not.toBe(webPlan.planName);
    });

    it('should convert construct ID to lowercase in name', () => {
      const plan = new AppServicePlan(resourceGroup, 'APIBackend');

      expect(plan.planName.toLowerCase()).toContain('apibackend');
    });

    it('should include construct ID purpose in name', () => {
      const plan = new AppServicePlan(resourceGroup, 'api-backend');

      // Purpose should be derived from ID
      expect(plan.planName).toContain('api-backend');
    });
  });

  describe('parent validation', () => {
    it('should throw error when not created within ResourceGroup', () => {
      expect(() => {
        new AppServicePlan(stack, 'Plan');
      }).toThrow(/AppServicePlan must be created within or under a ResourceGroup/);
    });

    it('should work when created directly within ResourceGroup', () => {
      const plan = new AppServicePlan(resourceGroup, 'Plan');

      expect(plan.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });
  });

  describe('Linux vs Windows plans', () => {
    it('should create Linux plan by default', () => {
      const plan = new AppServicePlan(resourceGroup, 'DefaultPlan');

      expect(plan.kind).toBe('linux');
      expect(plan.reserved).toBe(true);
    });

    it('should create Windows plan when specified', () => {
      const plan = new AppServicePlan(resourceGroup, 'WindowsPlan', {
        kind: AppServicePlanKind.WINDOWS,
      });

      expect(plan.kind).toBe('windows');
      expect(plan.reserved).toBe(false);
    });

    it('should create Linux plan with explicit kind', () => {
      const plan = new AppServicePlan(resourceGroup, 'LinuxPlan', {
        kind: AppServicePlanKind.LINUX,
      });

      expect(plan.kind).toBe('linux');
      expect(plan.reserved).toBe(true);
    });

    it('should override reserved flag for Windows plan', () => {
      const plan = new AppServicePlan(resourceGroup, 'WindowsPlan', {
        kind: AppServicePlanKind.WINDOWS,
        reserved: true, // Override auto-detection
      });

      expect(plan.kind).toBe('windows');
      expect(plan.reserved).toBe(true);
    });
  });

  describe('SKU options', () => {
    it('should support Free tier (F1)', () => {
      const plan = new AppServicePlan(resourceGroup, 'FreePlan', {
        sku: AppServicePlanSkuName.F1,
      });

      expect(plan.sku).toBe('F1');
      expect(plan.tier).toBe('Free');
    });

    it('should support all Basic tier SKUs', () => {
      const skus = [AppServicePlanSkuName.B1, AppServicePlanSkuName.B2, AppServicePlanSkuName.B3];

      skus.forEach((sku, index) => {
        const plan = new AppServicePlan(resourceGroup, `BasicPlan${index}`, { sku });
        expect(plan.tier).toBe('Basic');
      });
    });

    it('should support all Standard tier SKUs', () => {
      const skus = [AppServicePlanSkuName.S1, AppServicePlanSkuName.S2, AppServicePlanSkuName.S3];

      skus.forEach((sku, index) => {
        const plan = new AppServicePlan(resourceGroup, `StandardPlan${index}`, { sku });
        expect(plan.tier).toBe('Standard');
      });
    });

    it('should support all Premium V2 tier SKUs', () => {
      const skus = [
        AppServicePlanSkuName.P1V2,
        AppServicePlanSkuName.P2V2,
        AppServicePlanSkuName.P3V2,
      ];

      skus.forEach((sku, index) => {
        const plan = new AppServicePlan(resourceGroup, `PremiumV2Plan${index}`, { sku });
        expect(plan.tier).toBe('PremiumV2');
      });
    });

    it('should support all Premium V3 tier SKUs', () => {
      const skus = [
        AppServicePlanSkuName.P1V3,
        AppServicePlanSkuName.P2V3,
        AppServicePlanSkuName.P3V3,
      ];

      skus.forEach((sku, index) => {
        const plan = new AppServicePlan(resourceGroup, `PremiumV3Plan${index}`, { sku });
        expect(plan.tier).toBe('PremiumV3');
      });
    });
  });

  describe('integration with underlying L1', () => {
    it('should create L1 construct with correct properties', () => {
      const plan = new AppServicePlan(resourceGroup, 'ApiPlan', {
        planName: 'asp-custom',
        location: 'westus2',
        sku: AppServicePlanSkuName.S1,
        kind: AppServicePlanKind.LINUX,
        capacity: 2,
        tags: { purpose: 'testing' },
      });

      expect(plan.planName).toBe('asp-custom');
      expect(plan.location).toBe('westus2');
      expect(plan.sku).toBe('S1');
      expect(plan.kind).toBe('linux');
      expect(plan.capacity).toBe(2);
    });
  });

  describe('multiple App Service Plans', () => {
    it('should allow creating multiple plans with different IDs', () => {
      const apiPlan = new AppServicePlan(resourceGroup, 'ApiPlan');
      const webPlan = new AppServicePlan(resourceGroup, 'WebPlan');
      const workerPlan = new AppServicePlan(resourceGroup, 'WorkerPlan');

      // All should have unique auto-generated names
      expect(apiPlan.planName).not.toBe(webPlan.planName);
      expect(apiPlan.planName).not.toBe(workerPlan.planName);
      expect(webPlan.planName).not.toBe(workerPlan.planName);

      // All should reference the same resource group
      expect(apiPlan.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(webPlan.resourceGroupName).toBe(resourceGroup.resourceGroupName);
      expect(workerPlan.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });

    it('should allow creating multiple plans with explicit names', () => {
      const plan1 = new AppServicePlan(resourceGroup, 'Plan1', {
        planName: 'asp-plan-001',
      });

      const plan2 = new AppServicePlan(resourceGroup, 'Plan2', {
        planName: 'asp-plan-002',
      });

      expect(plan1.planName).toBe('asp-plan-001');
      expect(plan2.planName).toBe('asp-plan-002');
    });
  });

  describe('zone redundancy', () => {
    it('should support zone redundancy when enabled', () => {
      const plan = new AppServicePlan(resourceGroup, 'ZonePlan', {
        sku: AppServicePlanSkuName.P1V3,
        zoneRedundant: true,
      });

      expect(plan.planId).toBeDefined();
    });

    it('should support zone redundancy when disabled', () => {
      const plan = new AppServicePlan(resourceGroup, 'NoZonePlan', {
        sku: AppServicePlanSkuName.B1,
        zoneRedundant: false,
      });

      expect(plan.planId).toBeDefined();
    });
  });

  describe('fromPlanId static method', () => {
    it('should create plan reference from resource ID', () => {
      const planId =
        '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/rg-test/providers/Microsoft.Web/serverfarms/asp-existing';

      const plan = AppServicePlan.fromPlanId(resourceGroup, 'ExistingPlan', planId);

      expect(plan.planName).toBe('asp-existing');
      expect(plan.planId).toBe(planId);
    });

    it('should extract location from parent resource group', () => {
      const planId =
        '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/rg-test/providers/Microsoft.Web/serverfarms/asp-existing';

      const plan = AppServicePlan.fromPlanId(resourceGroup, 'ExistingPlan', planId);

      expect(plan.location).toBe('eastus');
    });

    it('should throw error for invalid resource ID', () => {
      const invalidId = '/subscriptions/12345678-1234-1234-1234-123456789abc/invalid';

      expect(() => {
        AppServicePlan.fromPlanId(resourceGroup, 'InvalidPlan', invalidId);
      }).toThrow(/Invalid App Service Plan resource ID/);
    });

    it('should handle plan names with hyphens', () => {
      const planId =
        '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/rg-test/providers/Microsoft.Web/serverfarms/asp-my-custom-plan';

      const plan = AppServicePlan.fromPlanId(resourceGroup, 'CustomPlan', planId);

      expect(plan.planName).toBe('asp-my-custom-plan');
    });
  });

  describe('capacity options', () => {
    it('should support capacity of 1', () => {
      const plan = new AppServicePlan(resourceGroup, 'Plan', {
        capacity: 1,
      });

      expect(plan.capacity).toBe(1);
    });

    it('should support capacity of 10', () => {
      const plan = new AppServicePlan(resourceGroup, 'Plan', {
        capacity: 10,
      });

      expect(plan.capacity).toBe(10);
    });

    it('should support capacity of 30', () => {
      const plan = new AppServicePlan(resourceGroup, 'Plan', {
        capacity: 30,
      });

      expect(plan.capacity).toBe(30);
    });
  });
});
