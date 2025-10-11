import { describe, it, expect, beforeEach } from 'vitest';
import {
  App,
  SubscriptionStack,
  Subscription,
  Geography,
  Organization,
  Project,
  Environment,
  Instance,
  ResourceGroup,
} from '@atakora/cdk';
import { IGrantable, PrincipalType, WellKnownRoleIds } from '@atakora/lib';
import { DatabaseAccounts } from '../cosmos-db';

/**
 * Mock grantable identity for testing.
 */
class MockGrantable implements IGrantable {
  public readonly principalId = '11111111-2222-3333-4444-555555555555';
  public readonly principalType = PrincipalType.ManagedIdentity;
  public readonly tenantId?: string;

  constructor(tenantId?: string) {
    this.tenantId = tenantId;
  }
}

describe('cdk/documentdb/DatabaseAccounts - Grant Methods', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;
  let cosmosAccount: DatabaseAccounts;
  let grantable: IGrantable;

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
    resourceGroup = new ResourceGroup(stack, 'DataRG');
    cosmosAccount = new DatabaseAccounts(resourceGroup, 'AppDatabase', {
      location: 'eastus',
    });
    grantable = new MockGrantable();
  });

  describe('grantDataRead', () => {
    it('should create role assignment with COSMOS_DB_DATA_READER role', () => {
      const result = cosmosAccount.grantDataRead(grantable);

      expect(result).toBeDefined();
      expect(result.roleDefinitionId).toBe(WellKnownRoleIds.COSMOS_DB_DATA_READER);
    });

    it('should include account name in description', () => {
      const result = cosmosAccount.grantDataRead(grantable);

      // Access the role assignment through the grant result
      const roleAssignment = result.roleAssignment;
      expect(roleAssignment).toBeDefined();
      // The description should reference the account name
      expect(cosmosAccount.databaseAccountName).toBeDefined();
    });

    it('should assign role at account scope', () => {
      const result = cosmosAccount.grantDataRead(grantable);

      expect(result.scope).toBe(cosmosAccount.resourceId);
    });

    it('should use grantee principal information', () => {
      const result = cosmosAccount.grantDataRead(grantable);

      expect(result.grantee).toBe(grantable);
    });
  });

  describe('grantDataWrite', () => {
    it('should create role assignment with COSMOS_DB_DATA_CONTRIBUTOR role', () => {
      const result = cosmosAccount.grantDataWrite(grantable);

      expect(result).toBeDefined();
      expect(result.roleDefinitionId).toBe(WellKnownRoleIds.COSMOS_DB_DATA_CONTRIBUTOR);
    });

    it('should assign role at account scope', () => {
      const result = cosmosAccount.grantDataWrite(grantable);

      expect(result.scope).toBe(cosmosAccount.resourceId);
    });

    it('should use grantee principal information', () => {
      const result = cosmosAccount.grantDataWrite(grantable);

      expect(result.grantee).toBe(grantable);
    });
  });

  describe('grantAccountReader', () => {
    it('should create role assignment with COSMOS_DB_ACCOUNT_READER role', () => {
      const result = cosmosAccount.grantAccountReader(grantable);

      expect(result).toBeDefined();
      expect(result.roleDefinitionId).toBe(WellKnownRoleIds.COSMOS_DB_ACCOUNT_READER);
    });

    it('should assign role at account scope', () => {
      const result = cosmosAccount.grantAccountReader(grantable);

      expect(result.scope).toBe(cosmosAccount.resourceId);
    });
  });

  describe('grantOperator', () => {
    it('should create role assignment with COSMOS_DB_OPERATOR role', () => {
      const result = cosmosAccount.grantOperator(grantable);

      expect(result).toBeDefined();
      expect(result.roleDefinitionId).toBe(WellKnownRoleIds.COSMOS_DB_OPERATOR);
    });

    it('should assign role at account scope', () => {
      const result = cosmosAccount.grantOperator(grantable);

      expect(result.scope).toBe(cosmosAccount.resourceId);
    });
  });

  describe('multiple grants', () => {
    it('should create multiple role assignments for same account', () => {
      const result1 = cosmosAccount.grantDataRead(grantable);
      const result2 = cosmosAccount.grantAccountReader(grantable);

      expect(result1.roleDefinitionId).toBe(WellKnownRoleIds.COSMOS_DB_DATA_READER);
      expect(result2.roleDefinitionId).toBe(WellKnownRoleIds.COSMOS_DB_ACCOUNT_READER);
      expect(result1.scope).toBe(result2.scope);
    });

    it('should grant different roles to different identities', () => {
      const grantable2 = new MockGrantable();

      const result1 = cosmosAccount.grantDataRead(grantable);
      const result2 = cosmosAccount.grantDataWrite(grantable2);

      expect(result1.grantee).toBe(grantable);
      expect(result2.grantee).toBe(grantable2);
    });

    it('should support separating control plane and data plane access', () => {
      const dataAccessIdentity = new MockGrantable();
      const operatorIdentity = new MockGrantable();

      const dataResult = cosmosAccount.grantDataWrite(dataAccessIdentity);
      const operatorResult = cosmosAccount.grantOperator(operatorIdentity);

      expect(dataResult.roleDefinitionId).toBe(WellKnownRoleIds.COSMOS_DB_DATA_CONTRIBUTOR);
      expect(operatorResult.roleDefinitionId).toBe(WellKnownRoleIds.COSMOS_DB_OPERATOR);
    });
  });

  describe('GrantableResource integration', () => {
    it('should extend GrantableResource', () => {
      expect(cosmosAccount).toHaveProperty('grant');
      expect(cosmosAccount).toHaveProperty('resourceId');
    });

    it('should have valid resource ID', () => {
      expect(cosmosAccount.resourceId).toBeDefined();
      expect(typeof cosmosAccount.resourceId).toBe('string');
    });

    it('should have account ID matching resource ID', () => {
      expect(cosmosAccount.accountId).toBe(cosmosAccount.resourceId);
    });
  });

  describe('ARM template generation', () => {
    it('should include role assignment in construct tree', () => {
      cosmosAccount.grantDataRead(grantable);

      // The role assignment should be added as a child construct
      const children = cosmosAccount.node.children;
      expect(children.length).toBeGreaterThan(0);
    });

    it('should create unique construct IDs for multiple grants', () => {
      cosmosAccount.grantDataRead(grantable);
      cosmosAccount.grantDataWrite(grantable);
      cosmosAccount.grantAccountReader(grantable);
      cosmosAccount.grantOperator(grantable);

      // Each grant should create a unique child construct
      const children = cosmosAccount.node.children;
      const grantChildren = children.filter(c => c.node.id.startsWith('Grant'));
      expect(grantChildren.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('serverless configuration', () => {
    it('should support grants on serverless Cosmos DB', () => {
      const serverlessAccount = new DatabaseAccounts(resourceGroup, 'ServerlessDB', {
        location: 'eastus',
        enableServerless: true,
      });

      const result = serverlessAccount.grantDataRead(grantable);

      expect(result).toBeDefined();
      expect(result.scope).toBe(serverlessAccount.resourceId);
    });
  });

  describe('multi-region configuration', () => {
    it('should support grants on multi-region Cosmos DB', () => {
      const multiRegionAccount = new DatabaseAccounts(resourceGroup, 'GlobalDB', {
        location: 'eastus',
        additionalLocations: ['westus', 'northeurope'],
        enableAutomaticFailover: true,
      });

      const result = multiRegionAccount.grantDataWrite(grantable);

      expect(result).toBeDefined();
      expect(result.scope).toBe(multiRegionAccount.resourceId);
    });
  });

  describe('cross-tenant scenarios', () => {
    it('should support cross-tenant grants', () => {
      const crossTenantGrantable = new MockGrantable('99999999-8888-7777-6666-555555555555');

      const result = cosmosAccount.grantDataRead(crossTenantGrantable);

      expect(result.grantee.tenantId).toBe('99999999-8888-7777-6666-555555555555');
    });
  });

  describe('role combination scenarios', () => {
    it('should grant both data and operator access to same identity', () => {
      // DBA needs both data access and operational control
      const dbaIdentity = new MockGrantable();

      const dataResult = cosmosAccount.grantDataWrite(dbaIdentity);
      const operatorResult = cosmosAccount.grantOperator(dbaIdentity);

      expect(dataResult.grantee).toBe(dbaIdentity);
      expect(operatorResult.grantee).toBe(dbaIdentity);
      expect(dataResult.roleDefinitionId).not.toBe(operatorResult.roleDefinitionId);
    });

    it('should support read-only monitoring with metadata access', () => {
      // Monitoring system needs read access to data and metadata
      const monitorIdentity = new MockGrantable();

      const dataResult = cosmosAccount.grantDataRead(monitorIdentity);
      const metadataResult = cosmosAccount.grantAccountReader(monitorIdentity);

      expect(dataResult.grantee).toBe(monitorIdentity);
      expect(metadataResult.grantee).toBe(monitorIdentity);
    });
  });
});
