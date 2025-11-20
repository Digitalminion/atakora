/**
 * Unit tests for ServerFarms L2 construct.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { App, Construct } from '@atakora/cdk';
import { ServerFarms } from '../server-farms';
import { ServerFarmKind } from '../server-farm-types';
import { MockResourceGroup } from '../../../__tests__/helpers/test-fixtures';

describe('cdk/web/ServerFarms', () => {
  let app: App;
  let resourceGroup: MockResourceGroup;

  beforeEach(() => {
    app = new App();
    resourceGroup = new MockResourceGroup(app, 'TestRG', {
      resourceGroupName: 'test-rg',
      location: 'eastus',
      tags: {
        environment: 'test',
        project: 'authr',
      },
    });
  });

  describe('constructor', () => {
    it('should create server farm with auto-generated name', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      expect(plan.planName).toBeDefined();
      expect(plan.planId).toBeDefined();
    });

    it('should use provided plan name when specified', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan', {
        planName: 'my-custom-plan',
      });

      expect(plan.planName).toBe('my-custom-plan');
    });

    it('should default location to parent resource group location', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      expect(plan.location).toBe('eastus');
    });

    it('should use provided location when specified', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan', {
        location: 'westus2',
      });

      expect(plan.location).toBe('westus2');
    });

    it('should default to B1 SKU', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      expect(plan.sku).toBe('B1');
    });

    it('should default to Basic tier', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      expect(plan.tier).toBe('Basic');
    });

    it('should default to Linux kind', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      expect(plan.kind).toBe('linux');
    });

    it('should default reserved to true for Linux', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      expect(plan.reserved).toBe(true);
    });

    it('should default capacity to 1', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      expect(plan.capacity).toBe(1);
    });

    it('should set resource group name from parent', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      expect(plan.resourceGroupName).toBe('test-rg');
    });
  });

  describe('parent validation', () => {
    it('should throw error if not created within a ResourceGroup', () => {
      const plainConstruct = new Construct(app, 'PlainConstruct');

      expect(() => {
        new ServerFarms(plainConstruct, 'Plan');
      }).toThrow(/must be created within or under a ResourceGroup/);
    });

    it('should work when created directly within ResourceGroup', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      expect(plan.planName).toBeDefined();
    });

    it('should work when created within nested construct under ResourceGroup', () => {
      const nestedConstruct = new Construct(resourceGroup, 'Nested');
      const plan = new ServerFarms(nestedConstruct, 'ApiPlan');

      expect(plan.planName).toBeDefined();
      expect(plan.resourceGroupName).toBe(resourceGroup.resourceGroupName);
    });
  });

  describe('tag merging', () => {
    it('should inherit tags from parent', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      expect(plan.tags).toMatchObject({
        environment: 'test',
        project: 'authr',
      });
    });

    it('should merge provided tags with parent tags', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan', {
        tags: {
          costCenter: '1234',
          owner: 'platform-team',
        },
      });

      expect(plan.tags).toMatchObject({
        environment: 'test',
        project: 'authr',
        costCenter: '1234',
        owner: 'platform-team',
      });
    });

    it('should override parent tags with provided tags', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan', {
        tags: {
          project: 'custom-project', // overrides parent
        },
      });

      expect(plan.tags.project).toBe('custom-project');
    });
  });

  describe('SKU configuration', () => {
    it('should support Free tier (F1)', () => {
      const plan = new ServerFarms(resourceGroup, 'FreePlan', {
        sku: 'F1' as any,
      });

      expect(plan.sku).toBe('F1');
      expect(plan.tier).toBe('Free');
    });

    it('should support Basic tier (B1, B2, B3)', () => {
      const b1Plan = new ServerFarms(resourceGroup, 'B1Plan', {
        sku: 'B1' as any,
      });
      const b2Plan = new ServerFarms(resourceGroup, 'B2Plan', {
        sku: 'B2' as any,
      });
      const b3Plan = new ServerFarms(resourceGroup, 'B3Plan', {
        sku: 'B3' as any,
      });

      expect(b1Plan.tier).toBe('Basic');
      expect(b2Plan.tier).toBe('Basic');
      expect(b3Plan.tier).toBe('Basic');
    });

    it('should support Standard tier (S1, S2, S3)', () => {
      const s1Plan = new ServerFarms(resourceGroup, 'S1Plan', {
        sku: 'S1' as any,
      });
      const s2Plan = new ServerFarms(resourceGroup, 'S2Plan', {
        sku: 'S2' as any,
      });

      expect(s1Plan.sku).toBe('S1');
      expect(s1Plan.tier).toBe('Standard');
      expect(s2Plan.tier).toBe('Standard');
    });

    it('should support Premium tier (P1, P2, P3)', () => {
      const p1Plan = new ServerFarms(resourceGroup, 'P1Plan', {
        sku: 'P1' as any,
      });

      expect(p1Plan.sku).toBe('P1');
      expect(p1Plan.tier).toBe('Premium');
    });

    it('should support PremiumV2 tier (P1v2, P2v2, P3v2)', () => {
      const pv2Plan = new ServerFarms(resourceGroup, 'PV2Plan', {
        sku: 'P1v2' as any,
      });

      expect(pv2Plan.sku).toBe('P1v2');
      expect(pv2Plan.tier).toBe('PremiumV2');
    });

    it('should support PremiumV3 tier (P1v3, P2v3, P3v3)', () => {
      const pv3Plan = new ServerFarms(resourceGroup, 'PV3Plan', {
        sku: 'P1v3' as any,
      });

      expect(pv3Plan.sku).toBe('P1v3');
      expect(pv3Plan.tier).toBe('PremiumV3');
    });

    it('should infer tier from SKU name', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan', {
        sku: 'S2' as any,
      });

      expect(plan.tier).toBe('Standard');
    });
  });

  describe('kind configuration', () => {
    it('should support Linux kind', () => {
      const plan = new ServerFarms(resourceGroup, 'LinuxPlan', {
        kind: 'linux' as ServerFarmKind,
      });

      expect(plan.kind).toBe('linux');
      expect(plan.reserved).toBe(true);
    });

    it('should support Windows kind', () => {
      const plan = new ServerFarms(resourceGroup, 'WindowsPlan', {
        kind: 'app' as ServerFarmKind,
      });

      expect(plan.kind).toBe('app');
    });

    it('should support function app kind', () => {
      const plan = new ServerFarms(resourceGroup, 'FunctionPlan', {
        kind: 'functionapp' as ServerFarmKind,
      });

      expect(plan.kind).toBe('functionapp');
    });

    it('should support Linux function app kind', () => {
      const plan = new ServerFarms(resourceGroup, 'LinuxFunctionPlan', {
        kind: 'linux' as ServerFarmKind,
      });

      expect(plan.kind).toBe('linux');
    });
  });

  describe('reserved flag', () => {
    it('should auto-detect reserved as true for Linux', () => {
      const plan = new ServerFarms(resourceGroup, 'LinuxPlan', {
        kind: 'linux' as ServerFarmKind,
      });

      expect(plan.reserved).toBe(true);
    });

    it('should auto-detect reserved as false for Windows (app)', () => {
      const plan = new ServerFarms(resourceGroup, 'WindowsPlan', {
        kind: 'app' as ServerFarmKind,
      });

      expect(plan.reserved).toBe(false);
    });

    it('should use explicit reserved value when provided', () => {
      const plan = new ServerFarms(resourceGroup, 'CustomPlan', {
        kind: 'app' as ServerFarmKind,
        reserved: true, // explicitly set to true even though kind is 'app'
      });

      expect(plan.reserved).toBe(true);
    });

    it('should allow overriding auto-detected value', () => {
      const plan = new ServerFarms(resourceGroup, 'CustomLinuxPlan', {
        kind: 'linux' as ServerFarmKind,
        reserved: false, // explicitly override
      });

      expect(plan.reserved).toBe(false);
    });
  });

  describe('capacity configuration', () => {
    it('should support custom capacity', () => {
      const plan = new ServerFarms(resourceGroup, 'ScaledPlan', {
        capacity: 3,
      });

      expect(plan.capacity).toBe(3);
    });

    it('should support scaling to max capacity', () => {
      const plan = new ServerFarms(resourceGroup, 'MaxScaledPlan', {
        capacity: 10,
      });

      expect(plan.capacity).toBe(10);
    });

    it('should default to 1 instance', () => {
      const plan = new ServerFarms(resourceGroup, 'SinglePlan');

      expect(plan.capacity).toBe(1);
    });
  });

  describe('zone redundancy', () => {
    it('should support zone redundancy', () => {
      const plan = new ServerFarms(resourceGroup, 'ZonePlan', {
        sku: 'P1v3' as any,
        zoneRedundant: true,
      });

      expect(plan.planName).toBeDefined();
    });

    it('should not be zone redundant by default', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      expect(plan.planName).toBeDefined();
    });
  });

  describe('IServerFarm interface', () => {
    it('should implement IServerFarm interface', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      // Should have required properties
      expect(plan).toHaveProperty('planName');
      expect(plan).toHaveProperty('planId');
      expect(plan).toHaveProperty('location');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan', {
        planName: 'test-plan',
      });

      const template = plan.toArmTemplate();

      expect(template).toBeDefined();
      expect(template.type).toBe('Microsoft.Web/serverfarms');
      expect(template.apiVersion).toBe('2023-01-01');
      expect(template.name).toBe('test-plan');
    });

    it('should include SKU configuration', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan', {
        sku: 'S1' as any,
        capacity: 2,
      });

      const template = plan.toArmTemplate();

      expect(template.sku).toBeDefined();
      expect(template.sku.name).toBe('S1');
      expect(template.sku.tier).toBe('Standard');
      expect(template.sku.capacity).toBe(2);
    });

    it('should include kind', () => {
      const plan = new ServerFarms(resourceGroup, 'LinuxPlan', {
        kind: 'linux' as ServerFarmKind,
      });

      const template = plan.toArmTemplate();

      expect(template.kind).toBe('linux');
    });

    it('should include reserved flag', () => {
      const plan = new ServerFarms(resourceGroup, 'LinuxPlan', {
        kind: 'linux' as ServerFarmKind,
      });

      const template = plan.toArmTemplate();

      expect(template.properties.reserved).toBe(true);
    });

    it('should include tags', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan', {
        tags: {
          costCenter: '1234',
        },
      });

      const template = plan.toArmTemplate();

      expect(template.tags).toBeDefined();
      expect(template.tags.costCenter).toBe('1234');
    });

    it('should include location', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan', {
        location: 'westus2',
      });

      const template = plan.toArmTemplate();

      expect(template.location).toBe('westus2');
    });

    it('should include zone redundancy when specified', () => {
      const plan = new ServerFarms(resourceGroup, 'ZonePlan', {
        zoneRedundant: true,
      });

      const template = plan.toArmTemplate();

      expect(template.properties.zoneRedundant).toBe(true);
    });
  });

  describe('toMetadata', () => {
    it('should generate resource metadata', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      const metadata = plan.toMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.type).toBe('Microsoft.Web/serverfarms');
      expect(metadata.sizeEstimate).toBeGreaterThan(0);
    });

    it('should have no dependencies', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      const metadata = plan.toMetadata();

      expect(metadata.dependencies).toEqual([]);
    });

    it('should prefer compute tier placement', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      const metadata = plan.toMetadata();

      expect(metadata.templatePreference).toBe('compute');
    });
  });

  describe('fromPlanId', () => {
    it('should import existing plan by resource ID', () => {
      const planId =
        '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Web/serverfarms/asp-existing';

      const imported = ServerFarms.fromPlanId(resourceGroup, 'ExistingPlan', planId);

      expect(imported.planName).toBe('asp-existing');
      expect(imported.planId).toBe(planId);
    });

    it('should extract plan name from resource ID', () => {
      const planId =
        '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Web/serverfarms/my-plan-123';

      const imported = ServerFarms.fromPlanId(resourceGroup, 'ImportedPlan', planId);

      expect(imported.planName).toBe('my-plan-123');
    });

    it('should throw error for invalid resource ID', () => {
      const invalidPlanId = 'not-a-valid-resource-id';

      expect(() => {
        ServerFarms.fromPlanId(resourceGroup, 'InvalidPlan', invalidPlanId);
      }).toThrow(/Invalid Server Farm resource ID/);
    });

    it('should extract location from parent resource group', () => {
      const planId =
        '/subscriptions/test-sub/resourceGroups/test-rg/providers/Microsoft.Web/serverfarms/asp-existing';

      const imported = ServerFarms.fromPlanId(resourceGroup, 'ExistingPlan', planId);

      expect(imported.location).toBe('eastus');
    });
  });

  describe('integration scenarios', () => {
    it('should create multiple plans in same resource group', () => {
      const apiPlan = new ServerFarms(resourceGroup, 'ApiPlan');
      const workerPlan = new ServerFarms(resourceGroup, 'WorkerPlan');

      expect(apiPlan.planName).not.toBe(workerPlan.planName);
      expect(apiPlan.resourceGroupName).toBe(workerPlan.resourceGroupName);
    });

    it('should be addable to construct tree', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');

      expect(plan.node.scope).toBe(resourceGroup);
      expect(plan.node.id).toBe('ApiPlan');
    });

    it('should support nested constructs', () => {
      const plan = new ServerFarms(resourceGroup, 'ApiPlan');
      const child = new Construct(plan, 'ChildConstruct');

      expect(child.node.scope).toBe(plan);
      expect(plan.node.children).toContainEqual(child);
    });
  });

  describe('advanced scenarios', () => {
    it('should work with all properties specified', () => {
      const plan = new ServerFarms(resourceGroup, 'CompleteP lan', {
        planName: 'asp-custom-plan',
        location: 'westus2',
        sku: 'P1v3' as any,
        kind: 'linux' as ServerFarmKind,
        reserved: true,
        capacity: 3,
        zoneRedundant: true,
        tags: {
          costCenter: '1234',
          environment: 'production',
        },
      });

      expect(plan.planName).toBe('asp-custom-plan');
      expect(plan.location).toBe('westus2');
      expect(plan.sku).toBe('P1v3');
      expect(plan.tier).toBe('PremiumV3');
      expect(plan.kind).toBe('linux');
      expect(plan.reserved).toBe(true);
      expect(plan.capacity).toBe(3);
      expect(plan.tags).toMatchObject({
        costCenter: '1234',
        environment: 'production',
      });
    });

    it('should support consumption plan for function apps', () => {
      const plan = new ServerFarms(resourceGroup, 'ConsumptionPlan', {
        sku: 'Y1' as any,
        kind: 'functionapp' as ServerFarmKind,
      });

      expect(plan.sku).toBe('Y1');
      expect(plan.kind).toBe('functionapp');
    });

    it('should support elastic premium plan', () => {
      const plan = new ServerFarms(resourceGroup, 'ElasticPlan', {
        sku: 'EP1' as any,
        kind: 'elastic' as ServerFarmKind,
      });

      expect(plan.sku).toBe('EP1');
      expect(plan.kind).toBe('elastic');
    });

    it('should support Windows plans', () => {
      const plan = new ServerFarms(resourceGroup, 'WindowsPlan', {
        sku: 'S1' as any,
        kind: 'app' as ServerFarmKind,
        reserved: false,
      });

      expect(plan.sku).toBe('S1');
      expect(plan.kind).toBe('app');
      expect(plan.reserved).toBe(false);
    });

    it('should support Linux plans with Standard tier', () => {
      const plan = new ServerFarms(resourceGroup, 'LinuxStandardPlan', {
        sku: 'S2' as any,
        kind: 'linux' as ServerFarmKind,
        capacity: 2,
      });

      expect(plan.sku).toBe('S2');
      expect(plan.tier).toBe('Standard');
      expect(plan.kind).toBe('linux');
      expect(plan.reserved).toBe(true);
      expect(plan.capacity).toBe(2);
    });

    it('should support high-availability configuration', () => {
      const plan = new ServerFarms(resourceGroup, 'HAPlan', {
        sku: 'P2v3' as any,
        capacity: 3,
        zoneRedundant: true,
      });

      expect(plan.sku).toBe('P2v3');
      expect(plan.tier).toBe('PremiumV3');
      expect(plan.capacity).toBe(3);
    });
  });

  describe('naming conventions', () => {
    it('should respect maximum plan name length of 40 characters', () => {
      const longId = 'VeryLongPlanIdentifierThatExceedsTheMaximumAllowedLengthForAzureAppServicePlans';
      const plan = new ServerFarms(resourceGroup, longId);

      expect(plan.planName.length).toBeLessThanOrEqual(40);
    });

    it('should generate different names for different construct IDs', () => {
      const plan1 = new ServerFarms(resourceGroup, 'ApiPlan');
      const plan2 = new ServerFarms(resourceGroup, 'WorkerPlan');

      expect(plan1.planName).not.toBe(plan2.planName);
    });
  });
});
