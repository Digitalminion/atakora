import { describe, it, expect, beforeEach } from 'vitest';
import { Construct } from '../../core/construct';
import { CosmosDbAccount } from './cosmos-db-account';
import { ConsistencyLevel, CosmosDbKind, PublicNetworkAccess } from './types';

describe('CosmosDbAccount', () => {
  let mockScope: Construct;

  beforeEach(() => {
    mockScope = new Construct(null as any, `TestScope-${Math.random()}`);
  });

  describe('constructor', () => {
    it('should create a Cosmos DB account with minimal properties', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
      });

      expect(account.databaseAccountName).toBeTruthy();
      expect(account.location).toBe('eastus');
      expect(account.documentEndpoint).toContain('.documents.azure.com:443/');
      expect(account.resourceId).toBeTruthy();
      expect(account.accountId).toBe(account.resourceId);
    });

    it('should use provided database account name', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        databaseAccountName: 'cosmos-colorai-001',
        location: 'eastus',
      });

      expect(account.databaseAccountName).toBe('cosmos-colorai-001');
    });

    it('should auto-generate database account name if not provided', () => {
      const account = new CosmosDbAccount(mockScope, 'MyCosmosAccount', {
        location: 'eastus',
      });

      expect(account.databaseAccountName).toBeTruthy();
      expect(account.databaseAccountName).toMatch(/^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$/);
    });

    it('should auto-generate name with cosmos prefix for numeric IDs', () => {
      const account = new CosmosDbAccount(mockScope, '123', {
        location: 'eastus',
      });

      expect(account.databaseAccountName).toMatch(/^cosmos-/);
    });

    it('should handle special characters in ID when auto-generating name', () => {
      const account = new CosmosDbAccount(mockScope, 'My@Cosmos#Account!', {
        location: 'eastus',
      });

      expect(account.databaseAccountName).toBeTruthy();
      expect(account.databaseAccountName).toMatch(/^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$/);
      expect(account.databaseAccountName).not.toContain('@');
      expect(account.databaseAccountName).not.toContain('#');
      expect(account.databaseAccountName).not.toContain('!');
    });

    it('should truncate long names to 44 characters', () => {
      const longId = 'a'.repeat(100);
      const account = new CosmosDbAccount(mockScope, longId, {
        location: 'eastus',
      });

      expect(account.databaseAccountName.length).toBeLessThanOrEqual(44);
      expect(account.databaseAccountName).toMatch(/^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$/);
    });

    it('should create account with enableServerless capability', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
        enableServerless: true,
      });

      expect(account.accountId).toBeTruthy();
    });

    it('should create account with additional locations', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
        additionalLocations: ['westus', 'northeurope'],
      });

      expect(account.accountId).toBeTruthy();
    });

    it('should create account with custom consistency level', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
        consistencyLevel: ConsistencyLevel.STRONG,
      });

      expect(account.accountId).toBeTruthy();
    });

    it('should create account with custom kind', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
        kind: CosmosDbKind.MONGO_DB,
      });

      expect(account.accountId).toBeTruthy();
    });

    it('should create account with public network access enabled', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
        publicNetworkAccess: PublicNetworkAccess.ENABLED,
      });

      expect(account.accountId).toBeTruthy();
    });

    it('should create account with virtual network rules', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
        virtualNetworkRules: [
          {
            id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/subnet1',
          },
        ],
      });

      expect(account.accountId).toBeTruthy();
    });

    it('should create account with free tier enabled', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
        enableFreeTier: true,
      });

      expect(account.accountId).toBeTruthy();
    });

    it('should create account with automatic failover enabled', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
        enableAutomaticFailover: true,
      });

      expect(account.accountId).toBeTruthy();
    });

    it('should create account with tags', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
        tags: { Environment: 'Test', Owner: 'TeamA' },
      });

      expect(account.accountId).toBeTruthy();
    });
  });

  describe('validation', () => {
    it('should throw error if location is not provided', () => {
      expect(() => {
        new CosmosDbAccount(mockScope, 'TestAccount', {});
      }).toThrow('Location must be provided');
    });
  });

  describe('default values', () => {
    it('should default consistency level to Session', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
      });

      // Access internal armAccount to verify defaults
      const armAccount = (account as any).armAccount;
      const template = armAccount.toArmTemplate();
      expect((template.properties as any).consistencyPolicy.defaultConsistencyLevel).toBe(
        ConsistencyLevel.SESSION
      );
    });

    it('should default publicNetworkAccess to disabled', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
      });

      const armAccount = (account as any).armAccount;
      const template = armAccount.toArmTemplate();
      expect((template.properties as any).publicNetworkAccess).toBe(PublicNetworkAccess.DISABLED);
    });

    it('should default kind to GlobalDocumentDB', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
      });

      const armAccount = (account as any).armAccount;
      const template = armAccount.toArmTemplate();
      expect(template.kind).toBe(CosmosDbKind.GLOBAL_DOCUMENT_DB);
    });

    it('should create single location by default', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
      });

      const armAccount = (account as any).armAccount;
      const template = armAccount.toArmTemplate();
      expect((template.properties as any).locations).toHaveLength(1);
      expect((template.properties as any).locations[0]).toEqual({
        locationName: 'eastus',
        failoverPriority: 0,
        isZoneRedundant: false,
      });
    });

    it('should not add capabilities if enableServerless is false', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
        enableServerless: false,
      });

      const armAccount = (account as any).armAccount;
      const template = armAccount.toArmTemplate();
      expect((template.properties as any).capabilities).toBeUndefined();
    });

    it('should add EnableServerless capability if enableServerless is true', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
        enableServerless: true,
      });

      const armAccount = (account as any).armAccount;
      const template = armAccount.toArmTemplate();
      expect((template.properties as any).capabilities).toEqual([
        {
          name: 'EnableServerless',
        },
      ]);
    });
  });

  describe('locations', () => {
    it('should build locations array with primary location only', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
      });

      const armAccount = (account as any).armAccount;
      const template = armAccount.toArmTemplate();
      const locations = (template.properties as any).locations;

      expect(locations).toHaveLength(1);
      expect(locations[0]).toEqual({
        locationName: 'eastus',
        failoverPriority: 0,
        isZoneRedundant: false,
      });
    });

    it('should build locations array with additional locations', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        location: 'eastus',
        additionalLocations: ['westus', 'northeurope'],
      });

      const armAccount = (account as any).armAccount;
      const template = armAccount.toArmTemplate();
      const locations = (template.properties as any).locations;

      expect(locations).toHaveLength(3);
      expect(locations[0]).toEqual({
        locationName: 'eastus',
        failoverPriority: 0,
        isZoneRedundant: false,
      });
      expect(locations[1]).toEqual({
        locationName: 'westus',
        failoverPriority: 1,
        isZoneRedundant: false,
      });
      expect(locations[2]).toEqual({
        locationName: 'northeurope',
        failoverPriority: 2,
        isZoneRedundant: false,
      });
    });
  });

  describe('fromAccountId', () => {
    it('should import existing account by accountId', () => {
      const accountId =
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-test-001';

      const account = CosmosDbAccount.fromAccountId(mockScope, 'ImportedAccount', accountId);

      expect(account.accountId).toBe(accountId);
      expect(account.resourceId).toBe(accountId);
      expect(account.databaseAccountName).toBe('cosmos-test-001');
      expect(account.documentEndpoint).toBe('https://cosmos-test-001.documents.azure.com:443/');
    });

    it('should throw error for invalid accountId format', () => {
      expect(() => {
        CosmosDbAccount.fromAccountId(mockScope, 'ImportedAccount', 'invalid-resource-id');
      }).toThrow('Invalid Cosmos DB account resource ID');
    });

    it('should set location to unknown for imported accounts', () => {
      const accountId =
        '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-test-001';

      const account = CosmosDbAccount.fromAccountId(mockScope, 'ImportedAccount', accountId);

      expect(account.location).toBe('unknown');
    });
  });

  describe('name generation edge cases', () => {
    it('should handle very short IDs', () => {
      const account = new CosmosDbAccount(mockScope, 'a', {
        location: 'eastus',
      });

      expect(account.databaseAccountName.length).toBeGreaterThanOrEqual(3);
      expect(account.databaseAccountName).toMatch(/^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$/);
    });

    it('should handle IDs with consecutive special characters', () => {
      const account = new CosmosDbAccount(mockScope, 'my---cosmos---db', {
        location: 'eastus',
      });

      expect(account.databaseAccountName).not.toContain('---');
      expect(account.databaseAccountName).toMatch(/^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$/);
    });

    it('should handle IDs starting with special characters', () => {
      const account = new CosmosDbAccount(mockScope, '---cosmos', {
        location: 'eastus',
      });

      expect(account.databaseAccountName).toMatch(/^[a-z0-9]/);
      expect(account.databaseAccountName).toMatch(/^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$/);
    });

    it('should handle IDs ending with special characters', () => {
      const account = new CosmosDbAccount(mockScope, 'cosmos---', {
        location: 'eastus',
      });

      expect(account.databaseAccountName).toMatch(/[a-z0-9]$/);
      expect(account.databaseAccountName).toMatch(/^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$/);
    });

    it('should handle all special characters ID', () => {
      const account = new CosmosDbAccount(mockScope, '!!!@@@###', {
        location: 'eastus',
      });

      expect(account.databaseAccountName).toBeTruthy();
      expect(account.databaseAccountName.length).toBeGreaterThanOrEqual(3);
      expect(account.databaseAccountName).toMatch(/^[a-z0-9][a-z0-9-]{1,42}[a-z0-9]$/);
    });
  });

  describe('integration with underlying L1 construct', () => {
    it('should pass all properties to underlying ArmCosmosDbAccount', () => {
      const account = new CosmosDbAccount(mockScope, 'TestAccount', {
        databaseAccountName: 'cosmos-test-001',
        location: 'eastus',
        kind: CosmosDbKind.GLOBAL_DOCUMENT_DB,
        consistencyLevel: ConsistencyLevel.EVENTUAL,
        enableAutomaticFailover: true,
        enableFreeTier: true,
        enableServerless: true,
        publicNetworkAccess: PublicNetworkAccess.ENABLED,
        additionalLocations: ['westus'],
        virtualNetworkRules: [
          {
            id: '/subscriptions/sub1/resourceGroups/rg1/providers/Microsoft.Network/virtualNetworks/vnet1/subnets/subnet1',
          },
        ],
        tags: { Environment: 'Test' },
      });

      const armAccount = (account as any).armAccount;
      const template = armAccount.toArmTemplate();

      expect(template.name).toBe('cosmos-test-001');
      expect(template.location).toBe('eastus');
      expect(template.kind).toBe(CosmosDbKind.GLOBAL_DOCUMENT_DB);
      expect((template.properties as any).consistencyPolicy.defaultConsistencyLevel).toBe(
        ConsistencyLevel.EVENTUAL
      );
      expect((template.properties as any).enableAutomaticFailover).toBe(true);
      expect((template.properties as any).enableFreeTier).toBe(true);
      expect((template.properties as any).publicNetworkAccess).toBe(PublicNetworkAccess.ENABLED);
      expect((template.properties as any).locations).toHaveLength(2);
      expect((template.properties as any).virtualNetworkRules).toHaveLength(1);
      expect((template.properties as any).capabilities).toEqual([{ name: 'EnableServerless' }]);
      expect(template.tags).toEqual({ Environment: 'Test' });
    });
  });
});
