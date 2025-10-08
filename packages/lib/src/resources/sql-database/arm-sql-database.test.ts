import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmSqlDatabase } from './arm-sql-database';
import { DatabaseSkuTier } from './types';
import type { ArmSqlDatabaseProps } from './types';

describe('resources/sql-database/ArmSqlDatabase', () => {
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
    it('should create SQL Database with required properties', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-001',
        databaseName: 'mydb',
        location: 'eastus',
      });

      expect(database.serverName).toBe('sql-test-001');
      expect(database.databaseName).toBe('mydb');
      expect(database.name).toBe('mydb');
      expect(database.location).toBe('eastus');
      expect(database.tags).toEqual({});
    });

    it('should create SQL Database with SKU', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-002',
        databaseName: 'mydb',
        location: 'eastus',
        sku: {
          tier: DatabaseSkuTier.STANDARD,
          capacity: 10,
        },
      });

      expect(database.sku).toEqual({
        tier: 'Standard',
        capacity: 10,
      });
    });

    it('should create SQL Database with collation', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-003',
        databaseName: 'mydb',
        location: 'eastus',
        collation: 'SQL_Latin1_General_CP1_CI_AS',
      });

      expect(database.collation).toBe('SQL_Latin1_General_CP1_CI_AS');
    });

    it('should create SQL Database with maxSizeBytes', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-004',
        databaseName: 'mydb',
        location: 'eastus',
        maxSizeBytes: 268435456000,
      });

      expect(database.maxSizeBytes).toBe(268435456000);
    });

    it('should create SQL Database with all properties', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-005',
        databaseName: 'productiondb',
        location: 'westus',
        sku: {
          tier: DatabaseSkuTier.PREMIUM,
          capacity: 125,
        },
        maxSizeBytes: 536870912000,
        collation: 'SQL_Latin1_General_CP1_CI_AS',
        tags: {
          environment: 'production',
          project: 'authr',
        },
      });

      expect(database.serverName).toBe('sql-test-005');
      expect(database.databaseName).toBe('productiondb');
      expect(database.location).toBe('westus');
      expect(database.sku?.tier).toBe('Premium');
      expect(database.sku?.capacity).toBe(125);
      expect(database.maxSizeBytes).toBe(536870912000);
      expect(database.collation).toBe('SQL_Latin1_General_CP1_CI_AS');
      expect(database.tags).toEqual({
        environment: 'production',
        project: 'authr',
      });
    });

    it('should set correct resource type', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-006',
        databaseName: 'mydb',
        location: 'eastus',
      });

      expect(database.resourceType).toBe('Microsoft.Sql/servers/databases');
    });

    it('should set correct API version', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-007',
        databaseName: 'mydb',
        location: 'eastus',
      });

      expect(database.apiVersion).toBe('2021-11-01');
    });

    it('should set correct resource ID format', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-008',
        databaseName: 'mydb',
        location: 'eastus',
      });

      expect(database.databaseId).toBe(
        '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Sql/servers/sql-test-008/databases/mydb'
      );
      expect(database.resourceId).toBe(database.databaseId);
    });

    it('should accept database name with minimum length', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-009',
        databaseName: 'a',
        location: 'eastus',
      });

      expect(database.databaseName).toBe('a');
    });

    it('should accept database name with maximum length', () => {
      const longName = 'a'.repeat(128);
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-010',
        databaseName: longName,
        location: 'eastus',
      });

      expect(database.databaseName).toBe(longName);
      expect(database.databaseName.length).toBe(128);
    });
  });

  describe('validation', () => {
    it('should throw error when server name is empty', () => {
      expect(() => {
        new ArmSqlDatabase(stack, 'Database', {
          serverName: '',
          databaseName: 'mydb',
          location: 'eastus',
        });
      }).toThrow('SQL Server name cannot be empty');
    });

    it('should throw error when database name is empty', () => {
      expect(() => {
        new ArmSqlDatabase(stack, 'Database', {
          serverName: 'sql-test-001',
          databaseName: '',
          location: 'eastus',
        });
      }).toThrow('Database name cannot be empty');
    });

    it('should throw error when database name is too long', () => {
      const longName = 'a'.repeat(129);
      expect(() => {
        new ArmSqlDatabase(stack, 'Database', {
          serverName: 'sql-test-001',
          databaseName: longName,
          location: 'eastus',
        });
      }).toThrow('Database name must be 1-128 characters');
    });

    it('should throw error when database name ends with period', () => {
      expect(() => {
        new ArmSqlDatabase(stack, 'Database', {
          serverName: 'sql-test-001',
          databaseName: 'mydb.',
          location: 'eastus',
        });
      }).toThrow('Database name cannot end with period or hyphen');
    });

    it('should throw error when database name ends with hyphen', () => {
      expect(() => {
        new ArmSqlDatabase(stack, 'Database', {
          serverName: 'sql-test-001',
          databaseName: 'mydb-',
          location: 'eastus',
        });
      }).toThrow('Database name cannot end with period or hyphen');
    });

    it('should throw error when location is empty', () => {
      expect(() => {
        new ArmSqlDatabase(stack, 'Database', {
          serverName: 'sql-test-001',
          databaseName: 'mydb',
          location: '',
        });
      }).toThrow('Location cannot be empty');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with required properties', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-001',
        databaseName: 'mydb',
        location: 'eastus',
      });

      const template = database.toArmTemplate() as any;

      expect(template).toEqual({
        type: 'Microsoft.Sql/servers/databases',
        apiVersion: '2021-11-01',
        name: 'sql-test-001/mydb',
        location: 'eastus',
        dependsOn: ["[resourceId('Microsoft.Sql/servers', 'sql-test-001')]"],
      });
    });

    it('should generate ARM template with SKU', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-002',
        databaseName: 'mydb',
        location: 'eastus',
        sku: {
          tier: DatabaseSkuTier.STANDARD,
          capacity: 10,
        },
      });

      const template = database.toArmTemplate() as any;

      expect(template.sku).toEqual({
        tier: 'Standard',
        capacity: 10,
      });
    });

    it('should generate ARM template with properties', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-003',
        databaseName: 'mydb',
        location: 'eastus',
        maxSizeBytes: 268435456000,
        collation: 'SQL_Latin1_General_CP1_CI_AS',
      });

      const template = database.toArmTemplate() as any;

      expect(template.properties).toEqual({
        maxSizeBytes: 268435456000,
        collation: 'SQL_Latin1_General_CP1_CI_AS',
      });
    });

    it('should generate ARM template with tags', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-004',
        databaseName: 'mydb',
        location: 'eastus',
        tags: {
          environment: 'test',
          project: 'authr',
        },
      });

      const template = database.toArmTemplate() as any;

      expect(template.tags).toEqual({
        environment: 'test',
        project: 'authr',
      });
    });

    it('should include parent dependency', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-test-005',
        databaseName: 'mydb',
        location: 'eastus',
      });

      const template = database.toArmTemplate() as any;

      expect(template.dependsOn).toContain("[resourceId('Microsoft.Sql/servers', 'sql-test-005')]");
    });

    it('should use composite name format for child resource', () => {
      const database = new ArmSqlDatabase(stack, 'Database', {
        serverName: 'sql-server-001',
        databaseName: 'production-db',
        location: 'eastus',
      });

      const template = database.toArmTemplate() as any;

      expect(template.name).toBe('sql-server-001/production-db');
    });
  });
});
