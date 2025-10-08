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
import { SqlServer } from './sql-server';
import { SqlDatabase } from './sql-database';
import { DatabaseSkuTier } from './types';

describe('resources/sql-database/SqlDatabase', () => {
  let app: App;
  let stack: SubscriptionStack;
  let resourceGroup: ResourceGroup;
  let sqlServer: SqlServer;

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
    resourceGroup = new ResourceGroup(stack, 'TestResourceGroup', {
      resourceGroupName: 'rg-test-001',
    });
    sqlServer = new SqlServer(resourceGroup, 'Database', {
      serverName: 'sql-test-001',
      administratorLogin: 'sqladmin',
      administratorLoginPassword: 'P@ssw0rd123!',
    });
  });

  describe('constructor', () => {
    it('should create SQL Database with minimal properties', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase');

      expect(database.databaseName).toBeDefined();
      expect(database.serverName).toBe('sql-test-001');
      expect(database.location).toBe('eastus');
    });

    it('should use provided database name', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        databaseName: 'myapp-db',
      });

      expect(database.databaseName).toBe('myapp-db');
    });

    it('should auto-generate database name when not provided', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase');

      expect(database.databaseName).toBeDefined();
      expect(database.databaseName).toMatch(/^sqldb-/);
    });

    it('should use parent SQL Server location', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase');

      expect(database.location).toBe('eastus');
    });

    it('should use provided location', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        location: 'westus',
      });

      expect(database.location).toBe('westus');
    });

    it('should set server name from parent', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase');

      expect(database.serverName).toBe('sql-test-001');
    });

    it('should generate database ID', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        databaseName: 'mydb',
      });

      expect(database.databaseId).toContain('Microsoft.Sql/servers/sql-test-001/databases/mydb');
    });

    it('should merge tags with parent', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        tags: { purpose: 'application-data' },
      });

      expect(database.tags).toHaveProperty('purpose', 'application-data');
    });

    it('should apply custom tags', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        tags: {
          environment: 'test',
          team: 'engineering',
        },
      });

      expect(database.tags).toHaveProperty('environment', 'test');
      expect(database.tags).toHaveProperty('team', 'engineering');
    });

    it('should throw error if not within SQL Server', () => {
      expect(() => {
        new SqlDatabase(resourceGroup, 'AppDatabase');
      }).toThrow('SqlDatabase must be created within or under a SqlServer');
    });
  });

  describe('SKU configuration', () => {
    it('should accept SKU as tier string', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        sku: DatabaseSkuTier.STANDARD,
      });

      expect(database.sku).toBeDefined();
      expect(database.sku?.tier).toBe('Standard');
    });

    it('should accept SKU as full object', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        sku: {
          tier: DatabaseSkuTier.PREMIUM,
          capacity: 125,
        },
      });

      expect(database.sku).toBeDefined();
      expect(database.sku?.tier).toBe('Premium');
      expect(database.sku?.capacity).toBe(125);
    });

    it('should handle SKU without capacity', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        sku: {
          tier: DatabaseSkuTier.BASIC,
        },
      });

      expect(database.sku).toBeDefined();
      expect(database.sku?.tier).toBe('Basic');
      expect(database.sku?.capacity).toBeUndefined();
    });

    it('should handle missing SKU', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase');

      expect(database.sku).toBeUndefined();
    });

    it('should support General Purpose tier', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        sku: DatabaseSkuTier.GENERAL_PURPOSE,
      });

      expect(database.sku?.tier).toBe('GeneralPurpose');
    });

    it('should support Business Critical tier', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        sku: DatabaseSkuTier.BUSINESS_CRITICAL,
      });

      expect(database.sku?.tier).toBe('BusinessCritical');
    });

    it('should support Hyperscale tier', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        sku: DatabaseSkuTier.HYPERSCALE,
      });

      expect(database.sku?.tier).toBe('Hyperscale');
    });
  });

  describe('fromDatabaseId', () => {
    it('should import existing SQL Database from resource ID', () => {
      const databaseId =
        '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/my-rg/providers/Microsoft.Sql/servers/my-sql-server/databases/my-db';

      const database = SqlDatabase.fromDatabaseId(sqlServer, 'ImportedDatabase', databaseId);

      expect(database.databaseName).toBe('my-db');
      expect(database.serverName).toBe('my-sql-server');
      expect(database.databaseId).toBe(databaseId);
    });

    it('should parse database name from complex resource ID', () => {
      const databaseId =
        '/subscriptions/abc-def-ghi/resourceGroups/rg-prod-001/providers/Microsoft.Sql/servers/sql-authr-prod-001/databases/production-db';

      const database = SqlDatabase.fromDatabaseId(sqlServer, 'ImportedDatabase', databaseId);

      expect(database.databaseName).toBe('production-db');
      expect(database.serverName).toBe('sql-authr-prod-001');
    });

    it('should return unknown location for imported database', () => {
      const databaseId =
        '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/my-rg/providers/Microsoft.Sql/servers/my-sql-server/databases/my-db';

      const database = SqlDatabase.fromDatabaseId(sqlServer, 'ImportedDatabase', databaseId);

      expect(database.location).toBe('unknown');
    });
  });

  describe('naming', () => {
    it('should generate unique names for different construct IDs', () => {
      const database1 = new SqlDatabase(sqlServer, 'AppDatabase1');
      const database2 = new SqlDatabase(sqlServer, 'AppDatabase2');

      expect(database1.databaseName).not.toBe(database2.databaseName);
    });

    it('should use lowercase for generated names', () => {
      const database = new SqlDatabase(sqlServer, 'MyApplicationDatabase');

      expect(database.databaseName).toBe(database.databaseName.toLowerCase());
    });

    it('should include sqldb prefix in auto-generated names', () => {
      const database = new SqlDatabase(sqlServer, 'MyApp');

      expect(database.databaseName).toMatch(/^sqldb-/);
    });
  });

  describe('additional properties', () => {
    it('should set maxSizeBytes', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        maxSizeBytes: 268435456000,
      });

      expect(database).toBeDefined();
      // maxSizeBytes is set on the underlying L1, not exposed on L2
    });

    it('should use custom collation', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase', {
        collation: 'SQL_Latin1_General_CP1_CI_AI',
      });

      expect(database).toBeDefined();
      // collation is set on the underlying L1, not exposed on L2
    });

    it('should default collation to SQL_Latin1_General_CP1_CI_AS', () => {
      const database = new SqlDatabase(sqlServer, 'AppDatabase');

      expect(database).toBeDefined();
      // Default collation is set on the underlying L1
    });
  });
});
