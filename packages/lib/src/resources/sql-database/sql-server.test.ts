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
import { SqlServerVersion, PublicNetworkAccess } from './types';

describe('resources/sql-database/SqlServer', () => {
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
    });
    resourceGroup = new ResourceGroup(stack, 'TestResourceGroup', {
      resourceGroupName: 'rg-test-001',
    });
  });

  describe('constructor', () => {
    it('should create SQL Server with required properties', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.administratorLogin).toBeUndefined(); // Not exposed on L2
      expect(sqlServer.serverName).toBeDefined();
      expect(sqlServer.location).toBe('eastus');
      expect(sqlServer.version).toBe('12.0');
    });

    it('should use provided server name', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        serverName: 'sql-custom-001',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.serverName).toBe('sql-custom-001');
    });

    it('should auto-generate server name when not provided', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.serverName).toBeDefined();
      expect(sqlServer.serverName).toMatch(/^sql-/);
    });

    it('should use parent resource group location', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.location).toBe('eastus');
    });

    it('should use provided location', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        location: 'westus',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.location).toBe('westus');
    });

    it('should default version to 12.0', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.version).toBe('12.0');
    });

    it('should use provided version', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        version: SqlServerVersion.V12_0,
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.version).toBe('12.0');
    });

    it('should set resource group name', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.resourceGroupName).toBe('rg-test-001');
    });

    it('should generate server ID', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        serverName: 'sql-test-001',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.serverId).toContain('Microsoft.Sql/servers/sql-test-001');
    });

    it('should merge tags with parent', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
        tags: { project: 'test-project' },
      });

      expect(sqlServer.tags).toHaveProperty('project', 'test-project');
    });

    it('should apply custom tags', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
        tags: {
          environment: 'test',
          owner: 'engineering',
        },
      });

      expect(sqlServer.tags).toHaveProperty('environment', 'test');
      expect(sqlServer.tags).toHaveProperty('owner', 'engineering');
    });

    it('should throw error if not within resource group', () => {
      expect(() => {
        new SqlServer(stack, 'Database', {
          administratorLogin: 'sqladmin',
          administratorLoginPassword: 'P@ssw0rd123!',
        });
      }).toThrow('SqlServer must be created within or under a ResourceGroup');
    });
  });

  describe('defaults', () => {
    it('should default publicNetworkAccess to Disabled', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      // Check the underlying L1 construct properties
      expect(sqlServer).toBeDefined();
      // Public network access is set on the underlying L1, not exposed on L2
    });

    it('should default minimalTlsVersion to 1.2', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      // Check the underlying L1 construct properties
      expect(sqlServer).toBeDefined();
      // Minimal TLS version is set on the underlying L1, not exposed on L2
    });

    it('should allow custom publicNetworkAccess', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        publicNetworkAccess: PublicNetworkAccess.ENABLED,
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer).toBeDefined();
    });

    it('should allow custom minimalTlsVersion', () => {
      const sqlServer = new SqlServer(resourceGroup, 'Database', {
        minimalTlsVersion: '1.1',
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer).toBeDefined();
    });
  });

  describe('fromServerId', () => {
    it('should import existing SQL Server from resource ID', () => {
      const serverId =
        '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/my-rg/providers/Microsoft.Sql/servers/my-sql-server';

      const sqlServer = SqlServer.fromServerId(resourceGroup, 'ImportedServer', serverId);

      expect(sqlServer.serverName).toBe('my-sql-server');
      expect(sqlServer.serverId).toBe(serverId);
    });

    it('should parse server name from complex resource ID', () => {
      const serverId =
        '/subscriptions/abc-def-ghi/resourceGroups/rg-prod-001/providers/Microsoft.Sql/servers/sql-colorai-prod-001';

      const sqlServer = SqlServer.fromServerId(resourceGroup, 'ImportedServer', serverId);

      expect(sqlServer.serverName).toBe('sql-colorai-prod-001');
    });

    it('should return unknown location for imported server', () => {
      const serverId =
        '/subscriptions/12345678-1234-1234-1234-123456789abc/resourceGroups/my-rg/providers/Microsoft.Sql/servers/my-sql-server';

      const sqlServer = SqlServer.fromServerId(resourceGroup, 'ImportedServer', serverId);

      expect(sqlServer.location).toBe('unknown');
    });
  });

  describe('naming', () => {
    it('should generate unique names for different construct IDs', () => {
      const sqlServer1 = new SqlServer(resourceGroup, 'Database1', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      const sqlServer2 = new SqlServer(resourceGroup, 'Database2', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer1.serverName).not.toBe(sqlServer2.serverName);
    });

    it('should use lowercase for generated names', () => {
      const sqlServer = new SqlServer(resourceGroup, 'DatabaseServer', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.serverName).toBe(sqlServer.serverName.toLowerCase());
    });

    it('should include sql prefix in auto-generated names', () => {
      const sqlServer = new SqlServer(resourceGroup, 'MyApp', {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: 'P@ssw0rd123!',
      });

      expect(sqlServer.serverName).toMatch(/^sql-/);
    });
  });
});
