import { describe, it, expect, beforeEach } from 'vitest';
import { Construct } from '../../core/construct';
import { ArmCosmosDbAccount } from './arm-cosmos-db-account';
import {
  DatabaseAccountOfferType,
  ConsistencyLevel,
  CosmosDbKind,
  PublicNetworkAccess,
} from './types';

describe('ArmCosmosDbAccount', () => {
  let mockScope: Construct;

  beforeEach(() => {
    mockScope = new Construct(null as any, `TestScope-${Math.random()}`);
  });

  describe('constructor', () => {
    it('should create a Cosmos DB account with required properties', () => {
      const account = new ArmCosmosDbAccount(mockScope, 'TestAccount', {
        databaseAccountName: 'cosmos-test-001',
        location: 'eastus',
        databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
        locations: [
          {
            locationName: 'eastus',
            failoverPriority: 0,
            isZoneRedundant: false,
          },
        ],
      });

      expect(account.databaseAccountName).toBe('cosmos-test-001');
      expect(account.name).toBe('cosmos-test-001');
      expect(account.location).toBe('eastus');
      expect(account.documentEndpoint).toBe('https://cosmos-test-001.documents.azure.com:443/');
      expect(account.resourceType).toBe('Microsoft.DocumentDB/databaseAccounts');
      expect(account.apiVersion).toBe('2024-08-15');
    });

    it('should create resource ID correctly', () => {
      const account = new ArmCosmosDbAccount(mockScope, 'TestAccount', {
        databaseAccountName: 'cosmos-colorai-001',
        location: 'eastus',
        databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
        locations: [
          {
            locationName: 'eastus',
            failoverPriority: 0,
          },
        ],
      });

      expect(account.resourceId).toBe(
        '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.DocumentDB/databaseAccounts/cosmos-colorai-001'
      );
      expect(account.accountId).toBe(account.resourceId);
    });

    it('should handle tags correctly', () => {
      const tags = { Environment: 'Test', Owner: 'TeamA' };
      const account = new ArmCosmosDbAccount(mockScope, 'TestAccount', {
        databaseAccountName: 'cosmos-test-001',
        location: 'eastus',
        databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
        locations: [
          {
            locationName: 'eastus',
            failoverPriority: 0,
          },
        ],
        tags,
      });

      const template = account.toArmTemplate();
      expect(template.tags).toEqual(tags);
    });

    it('should create account with multiple locations', () => {
      const account = new ArmCosmosDbAccount(mockScope, 'TestAccount', {
        databaseAccountName: 'cosmos-test-001',
        location: 'eastus',
        databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
        locations: [
          {
            locationName: 'eastus',
            failoverPriority: 0,
            isZoneRedundant: false,
          },
          {
            locationName: 'westus',
            failoverPriority: 1,
            isZoneRedundant: false,
          },
        ],
      });

      const template = account.toArmTemplate();
      expect(template.properties).toHaveProperty('locations');
      expect((template.properties as any).locations).toHaveLength(2);
    });

    it('should create account with consistency policy', () => {
      const account = new ArmCosmosDbAccount(mockScope, 'TestAccount', {
        databaseAccountName: 'cosmos-test-001',
        location: 'eastus',
        databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
        locations: [
          {
            locationName: 'eastus',
            failoverPriority: 0,
          },
        ],
        consistencyPolicy: {
          defaultConsistencyLevel: ConsistencyLevel.SESSION,
        },
      });

      const template = account.toArmTemplate();
      expect((template.properties as any).consistencyPolicy).toEqual({
        defaultConsistencyLevel: ConsistencyLevel.SESSION,
      });
    });

    it('should create account with kind', () => {
      const account = new ArmCosmosDbAccount(mockScope, 'TestAccount', {
        databaseAccountName: 'cosmos-test-001',
        location: 'eastus',
        kind: CosmosDbKind.GLOBAL_DOCUMENT_DB,
        databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
        locations: [
          {
            locationName: 'eastus',
            failoverPriority: 0,
          },
        ],
      });

      const template = account.toArmTemplate();
      expect(template.kind).toBe(CosmosDbKind.GLOBAL_DOCUMENT_DB);
    });
  });

  describe('validation', () => {
    it('should throw error for empty database account name', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: '',
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: 0,
            },
          ],
        });
      }).toThrow('Database account name cannot be empty');
    });

    it('should throw error for account name too short', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'ab',
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: 0,
            },
          ],
        });
      }).toThrow('Database account name must be 3-44 characters');
    });

    it('should throw error for account name too long', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'a'.repeat(45),
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: 0,
            },
          ],
        });
      }).toThrow('Database account name must be 3-44 characters');
    });

    it('should throw error for invalid account name pattern - starts with hyphen', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: '-cosmos-test',
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: 0,
            },
          ],
        });
      }).toThrow('Database account name must match pattern');
    });

    it('should throw error for invalid account name pattern - ends with hyphen', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'cosmos-test-',
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: 0,
            },
          ],
        });
      }).toThrow('Database account name must match pattern');
    });

    it('should throw error for invalid account name pattern - uppercase', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'Cosmos-Test-001',
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: 0,
            },
          ],
        });
      }).toThrow('Database account name must match pattern');
    });

    it('should throw error for invalid account name pattern - special characters', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'cosmos_test_001',
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: 0,
            },
          ],
        });
      }).toThrow('Database account name must match pattern');
    });

    it('should throw error for empty location', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'cosmos-test-001',
          location: '',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: 0,
            },
          ],
        });
      }).toThrow('Location cannot be empty');
    });

    it('should throw error for missing database account offer type', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'cosmos-test-001',
          location: 'eastus',
          databaseAccountOfferType: undefined as any,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: 0,
            },
          ],
        });
      }).toThrow('Database account offer type must be provided');
    });

    it('should throw error for empty locations array', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'cosmos-test-001',
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [],
        });
      }).toThrow('At least one location must be provided');
    });

    it('should throw error for missing locations', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'cosmos-test-001',
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: undefined as any,
        });
      }).toThrow('At least one location must be provided');
    });

    it('should throw error for location without locationName', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'cosmos-test-001',
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: '',
              failoverPriority: 0,
            },
          ],
        });
      }).toThrow('Location at index 0 must have a locationName');
    });

    it('should throw error for location without failoverPriority', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'cosmos-test-001',
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: undefined as any,
            },
          ],
        });
      }).toThrow('Location at index 0 must have a failoverPriority');
    });

    it('should throw error for negative failoverPriority', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'cosmos-test-001',
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: -1,
            },
          ],
        });
      }).toThrow('Location at index 0 failoverPriority must be >= 0');
    });

    it('should throw error for duplicate failoverPriorities', () => {
      expect(() => {
        new ArmCosmosDbAccount(mockScope, 'TestAccount', {
          databaseAccountName: 'cosmos-test-001',
          location: 'eastus',
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: 0,
            },
            {
              locationName: 'westus',
              failoverPriority: 0,
            },
          ],
        });
      }).toThrow('Each location must have a unique failoverPriority');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate correct ARM template with minimal properties', () => {
      const account = new ArmCosmosDbAccount(mockScope, 'TestAccount', {
        databaseAccountName: 'cosmos-test-001',
        location: 'eastus',
        databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
        locations: [
          {
            locationName: 'eastus',
            failoverPriority: 0,
            isZoneRedundant: false,
          },
        ],
      });

      const template = account.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.DocumentDB/databaseAccounts',
        apiVersion: '2024-08-15',
        name: 'cosmos-test-001',
        location: 'eastus',
        properties: {
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: 0,
              isZoneRedundant: false,
            },
          ],
        },
      });
    });

    it('should generate correct ARM template with all optional properties', () => {
      const account = new ArmCosmosDbAccount(mockScope, 'TestAccount', {
        databaseAccountName: 'cosmos-test-001',
        location: 'eastus',
        kind: CosmosDbKind.GLOBAL_DOCUMENT_DB,
        databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
        consistencyPolicy: {
          defaultConsistencyLevel: ConsistencyLevel.SESSION,
        },
        locations: [
          {
            locationName: 'eastus',
            failoverPriority: 0,
            isZoneRedundant: false,
          },
        ],
        enableAutomaticFailover: true,
        enableMultipleWriteLocations: false,
        isVirtualNetworkFilterEnabled: true,
        virtualNetworkRules: [],
        ipRules: [],
        publicNetworkAccess: PublicNetworkAccess.DISABLED,
        enableFreeTier: true,
        capabilities: [
          {
            name: 'EnableServerless',
          },
        ],
        tags: { Environment: 'Test' },
      });

      const template = account.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.DocumentDB/databaseAccounts',
        apiVersion: '2024-08-15',
        name: 'cosmos-test-001',
        location: 'eastus',
        kind: CosmosDbKind.GLOBAL_DOCUMENT_DB,
        properties: {
          databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
          consistencyPolicy: {
            defaultConsistencyLevel: ConsistencyLevel.SESSION,
          },
          locations: [
            {
              locationName: 'eastus',
              failoverPriority: 0,
              isZoneRedundant: false,
            },
          ],
          enableAutomaticFailover: true,
          enableMultipleWriteLocations: false,
          isVirtualNetworkFilterEnabled: true,
          virtualNetworkRules: [],
          ipRules: [],
          publicNetworkAccess: PublicNetworkAccess.DISABLED,
          enableFreeTier: true,
          capabilities: [
            {
              name: 'EnableServerless',
            },
          ],
        },
        tags: { Environment: 'Test' },
      });
    });

    it('should omit tags if empty', () => {
      const account = new ArmCosmosDbAccount(mockScope, 'TestAccount', {
        databaseAccountName: 'cosmos-test-001',
        location: 'eastus',
        databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
        locations: [
          {
            locationName: 'eastus',
            failoverPriority: 0,
          },
        ],
      });

      const template = account.toArmTemplate();

      expect(template.tags).toBeUndefined();
    });

    it('should include kind at top level only', () => {
      const account = new ArmCosmosDbAccount(mockScope, 'TestAccount', {
        databaseAccountName: 'cosmos-test-001',
        location: 'eastus',
        kind: CosmosDbKind.MONGO_DB,
        databaseAccountOfferType: DatabaseAccountOfferType.STANDARD,
        locations: [
          {
            locationName: 'eastus',
            failoverPriority: 0,
          },
        ],
      });

      const template = account.toArmTemplate();

      expect(template.kind).toBe(CosmosDbKind.MONGO_DB);
      expect((template.properties as any).kind).toBeUndefined();
    });
  });
});
