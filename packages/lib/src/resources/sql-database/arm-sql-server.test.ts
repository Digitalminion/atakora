import { describe, it, expect, beforeEach } from 'vitest';
import { App } from '../../core/app';
import { SubscriptionStack } from '../../core/subscription-stack';
import { Subscription } from '../../core/azure/subscription';
import { Geography } from '../../core/azure/geography';
import { Organization } from '../../core/context/organization';
import { Project } from '../../core/context/project';
import { Environment } from '../../core/context/environment';
import { Instance } from '../../core/context/instance';
import { ArmSqlServer } from './arm-sql-server';
import { SqlServerVersion, PublicNetworkAccess } from './types';
import type { ArmSqlServerProps } from './types';

describe('resources/sql-database/ArmSqlServer', () => {
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
    it('should create SQL Server with required properties', () => {
      const sqlServer = new ArmSqlServer(stack, 'SqlServer', {
        serverName: 'sql-test-001',
        location: 'eastus',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.serverName).toBe('sql-test-001');
      expect(sqlServer.name).toBe('sql-test-001');
      expect(sqlServer.location).toBe('eastus');
      expect(sqlServer.administratorLogin).toBe('sqladmin');
      expect(sqlServer.administratorLoginPassword).toBe('P@ssw0rd123!');
      expect(sqlServer.tags).toEqual({});
    });

    it('should create SQL Server with all properties', () => {
      const sqlServer = new ArmSqlServer(stack, 'SqlServer', {
        serverName: 'sql-test-002',
        location: 'eastus',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'SecureP@ss123!',
        version: SqlServerVersion.V12_0,
        publicNetworkAccess: PublicNetworkAccess.DISABLED,
        minimalTlsVersion: '1.2',
        tags: {
          environment: 'test',
        },
      });

      expect(sqlServer.version).toBe('12.0');
      expect(sqlServer.publicNetworkAccess).toBe('Disabled');
      expect(sqlServer.minimalTlsVersion).toBe('1.2');
      expect(sqlServer.tags).toEqual({ environment: 'test' });
    });

    it('should set correct resource type', () => {
      const sqlServer = new ArmSqlServer(stack, 'SqlServer', {
        serverName: 'sql-test-003',
        location: 'eastus',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.resourceType).toBe('Microsoft.Sql/servers');
    });

    it('should set correct API version', () => {
      const sqlServer = new ArmSqlServer(stack, 'SqlServer', {
        serverName: 'sql-test-004',
        location: 'eastus',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.apiVersion).toBe('2021-11-01');
    });

    it('should set correct resource ID format', () => {
      const sqlServer = new ArmSqlServer(stack, 'SqlServer', {
        serverName: 'sql-test-005',
        location: 'eastus',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.serverId).toBe(
        '/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Sql/servers/sql-test-005'
      );
      expect(sqlServer.resourceId).toBe(sqlServer.serverId);
    });

    it('should accept server name with minimum length', () => {
      const sqlServer = new ArmSqlServer(stack, 'SqlServer', {
        serverName: 'a',
        location: 'eastus',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.serverName).toBe('a');
    });

    it('should accept server name with maximum length', () => {
      const longName = 'a' + '-'.repeat(30) + 'b' + '-'.repeat(30) + 'c';
      const sqlServer = new ArmSqlServer(stack, 'SqlServer', {
        serverName: longName,
        location: 'eastus',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.serverName).toBe(longName);
      expect(sqlServer.serverName.length).toBe(63);
    });

    it('should accept server name with hyphens in middle', () => {
      const sqlServer = new ArmSqlServer(stack, 'SqlServer', {
        serverName: 'sql-test-server-001',
        location: 'eastus',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.serverName).toBe('sql-test-server-001');
    });
  });

  describe('validation', () => {
    it('should throw error when server name is empty', () => {
      expect(() => {
        new ArmSqlServer(stack, 'SqlServer', {
          serverName: '',
          location: 'eastus',
          administratorLogin: 'sqladmin',
          administratorLoginPassword: 'P@ssw0rd123!',
        });
      }).toThrow('SQL Server name cannot be empty');
    });

    it('should throw error when server name is too long', () => {
      const longName = 'a'.repeat(64);
      expect(() => {
        new ArmSqlServer(stack, 'SqlServer', {
          serverName: longName,
          location: 'eastus',
          administratorLogin: 'sqladmin',
          administratorLoginPassword: 'P@ssw0rd123!',
        });
      }).toThrow('SQL Server name must be 1-63 characters');
    });

    it('should throw error when server name starts with hyphen', () => {
      expect(() => {
        new ArmSqlServer(stack, 'SqlServer', {
          serverName: '-sqltest',
          location: 'eastus',
          administratorLogin: 'sqladmin',
          administratorLoginPassword: 'P@ssw0rd123!',
        });
      }).toThrow('SQL Server name must match pattern');
    });

    it('should throw error when server name ends with hyphen', () => {
      expect(() => {
        new ArmSqlServer(stack, 'SqlServer', {
          serverName: 'sqltest-',
          location: 'eastus',
          administratorLogin: 'sqladmin',
          administratorLoginPassword: 'P@ssw0rd123!',
        });
      }).toThrow('SQL Server name must match pattern');
    });

    it('should throw error when server name contains uppercase letters', () => {
      expect(() => {
        new ArmSqlServer(stack, 'SqlServer', {
          serverName: 'Sql-Test-001',
          location: 'eastus',
          administratorLogin: 'sqladmin',
          administratorLoginPassword: 'P@ssw0rd123!',
        });
      }).toThrow('SQL Server name must match pattern');
    });

    it('should throw error when location is empty', () => {
      expect(() => {
        new ArmSqlServer(stack, 'SqlServer', {
          serverName: 'sql-test-001',
          location: '',
          administratorLogin: 'sqladmin',
          administratorLoginPassword: 'P@ssw0rd123!',
        });
      }).toThrow('Location cannot be empty');
    });

    it('should throw error when administrator login is empty', () => {
      expect(() => {
        new ArmSqlServer(stack, 'SqlServer', {
          serverName: 'sql-test-001',
          location: 'eastus',
          administratorLogin: '',
          administratorLoginPassword: 'P@ssw0rd123!',
        });
      }).toThrow('Administrator login cannot be empty');
    });

    it('should throw error when administrator login is reserved name - admin', () => {
      expect(() => {
        new ArmSqlServer(stack, 'SqlServer', {
          serverName: 'sql-test-001',
          location: 'eastus',
          administratorLogin: 'admin',
          administratorLoginPassword: 'P@ssw0rd123!',
        });
      }).toThrow('Administrator login cannot be a reserved name');
    });

    it('should throw error when administrator login is reserved name - sa', () => {
      expect(() => {
        new ArmSqlServer(stack, 'SqlServer', {
          serverName: 'sql-test-001',
          location: 'eastus',
          administratorLogin: 'sa',
          administratorLoginPassword: 'P@ssw0rd123!',
        });
      }).toThrow('Administrator login cannot be a reserved name');
    });

    it('should throw error when administrator password is too short', () => {
      expect(() => {
        new ArmSqlServer(stack, 'SqlServer', {
          serverName: 'sql-test-001',
          location: 'eastus',
          administratorLogin: 'sqladmin',
          administratorLoginPassword: 'Pass1!',
        });
      }).toThrow('Administrator login password must be at least 8 characters');
    });
  });

  describe('toArmTemplate', () => {
    it('should generate ARM template with required properties', () => {
      const sqlServer = new ArmSqlServer(stack, 'SqlServer', {
        serverName: 'sql-test-001',
        location: 'eastus',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      const template = sqlServer.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Sql/servers',
        apiVersion: '2021-11-01',
        name: 'sql-test-001',
        location: 'eastus',
        properties: {
          administratorLogin: 'sqladmin',
          administratorLoginPassword: 'P@ssw0rd123!',
        },
        tags: undefined,
      });
    });

    it('should generate ARM template with all properties', () => {
      const sqlServer = new ArmSqlServer(stack, 'SqlServer', {
        serverName: 'sql-test-002',
        location: 'westus',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'SecureP@ss123!',
        version: SqlServerVersion.V12_0,
        publicNetworkAccess: PublicNetworkAccess.DISABLED,
        minimalTlsVersion: '1.2',
        tags: {
          environment: 'production',
          project: 'colorai',
        },
      });

      const template = sqlServer.toArmTemplate();

      expect(template).toEqual({
        type: 'Microsoft.Sql/servers',
        apiVersion: '2021-11-01',
        name: 'sql-test-002',
        location: 'westus',
        properties: {
          administratorLogin: 'sqladmin',
          administratorLoginPassword: 'SecureP@ss123!',
          version: '12.0',
          publicNetworkAccess: 'Disabled',
          minimalTlsVersion: '1.2',
        },
        tags: {
          environment: 'production',
          project: 'colorai',
        },
      });
    });

    it('should omit tags when empty', () => {
      const sqlServer = new ArmSqlServer(stack, 'SqlServer', {
        serverName: 'sql-test-003',
        location: 'eastus',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      const template = sqlServer.toArmTemplate() as any;

      expect(template.tags).toBeUndefined();
    });
  });
});
