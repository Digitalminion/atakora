# SQL Resources API (@atakora/cdk/sql)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > SQL

---

## Overview

The sql namespace provides constructs for Azure SQL Database resources including SQL servers, databases, firewall rules, and elastic pools. Azure SQL Database is a fully managed relational database service with built-in intelligence, security, and high availability.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import {
  SqlServers,
  SqlDatabases,
  SqlFirewallRules
} from '@atakora/cdk/sql';
```

## Status

The SQL namespace is currently under development. The following constructs are planned:

### Planned Constructs

#### SqlServers
Azure SQL logical server for hosting databases.

**Planned Features**:
- Auto-generated server names
- Azure AD admin configuration
- TLS version enforcement
- Public network access control
- Private Link support
- Managed identity integration

#### SqlDatabases
SQL databases within a SQL server.

**Planned Features**:
- DTU and vCore pricing models
- Serverless compute tier
- Auto-pause capabilities
- Backup retention configuration
- Zone redundancy
- Read replicas

#### SqlFirewallRules
IP firewall rules for SQL servers.

**Planned Features**:
- Azure service access rules
- IP range rules
- VNet rules

#### SqlElasticPools
Elastic pools for sharing resources across multiple databases.

**Planned Features**:
- DTU and vCore models
- Auto-scaling
- Per-database limits

---

## Planned Usage Examples

### Basic SQL Server and Database

```typescript
// Example of planned usage (not yet implemented)
import { SqlServers, SqlDatabases } from '@atakora/cdk/sql';

const sqlServer = new SqlServers(resourceGroup, 'Database', {
  administratorLogin: 'sqladmin',
  administratorLoginPassword: KeyVaultSecret.fromVault(vault, 'sql-admin-password'),
  minimalTlsVersion: '1.2',
  publicNetworkAccess: 'Disabled'
});

const database = new SqlDatabases(sqlServer, 'AppDb', {
  sku: {
    name: 'S0',  // Standard tier
    tier: 'Standard',
    capacity: 10
  },
  maxSizeBytes: 268435456000, // 250 GB
  zoneRedundant: true
});
```

### Serverless SQL Database

```typescript
// Planned usage
const database = new SqlDatabases(sqlServer, 'ServerlessDb', {
  sku: {
    name: 'GP_S_Gen5',
    tier: 'GeneralPurpose',
    family: 'Gen5',
    capacity: 2
  },
  autoPauseDelay: 60, // minutes
  minCapacity: 0.5,
  maxCapacity: 2
});
```

### SQL Server with Private Endpoint

```typescript
// Planned usage
import { PrivateEndpoint } from '@atakora/cdk/network';

const sqlServer = new SqlServers(resourceGroup, 'PrivateDb', {
  administratorLogin: 'sqladmin',
  administratorLoginPassword: secret,
  publicNetworkAccess: 'Disabled'
});

const endpoint = new PrivateEndpoint(resourceGroup, 'SqlEndpoint', {
  subnet: privateSubnet,
  privateLinkServiceId: sqlServer.id,
  groupIds: ['sqlServer']
});
```

---

## Government Cloud Considerations

### Availability
Azure SQL Database is fully available in Azure Government Cloud with feature parity to commercial cloud.

**Available Regions**:
- US Gov Virginia
- US Gov Texas
- US Gov Arizona
- US DoD East
- US DoD Central

### Endpoint Differences
- Commercial: `{server}.database.windows.net`
- Gov Cloud: `{server}.database.usgovcloudapi.net`

### Compliance
- FedRAMP High
- DoD Impact Level 5
- ITAR compliant
- CJIS compliant

### Feature Parity
All SQL Database features available including:
- Serverless compute
- Hyperscale tier
- Zone redundancy
- Active geo-replication
- Transparent Data Encryption (TDE)
- Always Encrypted
- Dynamic Data Masking

---

## Pricing Tiers Overview

### DTU-Based
- **Basic**: 5 DTUs, 2 GB max, dev/test workloads
- **Standard** (S0-S12): 10-3000 DTUs, general purpose
- **Premium** (P1-P15): 125-4000 DTUs, mission-critical

### vCore-Based
- **General Purpose**: Balanced compute and storage
- **Business Critical**: Low latency, high IOPS
- **Hyperscale**: Up to 100 TB, rapid scale

### Serverless
- Auto-scaling compute
- Auto-pause during inactivity
- Pay per second usage
- Ideal for intermittent workloads

---

## Best Practices

### Security
- Always use Azure AD authentication
- Disable public network access
- Use Private Link for connectivity
- Enable TDE (Transparent Data Encryption)
- Use Always Encrypted for sensitive columns
- Enable auditing and threat detection

### High Availability
- Enable zone redundancy in production
- Configure geo-replication for DR
- Set appropriate backup retention (7-35 days)
- Test failover procedures regularly

### Performance
- Right-size your tier based on workload
- Use Read Scale-Out for read-heavy workloads
- Consider elastic pools for multiple databases
- Implement connection pooling
- Monitor DTU/vCore usage

### Cost Optimization
- Use serverless for intermittent workloads
- Right-size compute resources
- Use elastic pools for multiple databases
- Implement auto-pause for serverless
- Archive old data to cheaper storage tiers

---

## Connection Strings

### Azure AD Authentication (Recommended)
```
Server=tcp:{server}.database.windows.net,1433;Database={database};Authentication=Active Directory Default;
```

### SQL Authentication (Not Recommended)
```
Server=tcp:{server}.database.windows.net,1433;Database={database};User ID={username};Password={password};Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
```

### Gov Cloud
```
Server=tcp:{server}.database.usgovcloudapi.net,1433;Database={database};Authentication=Active Directory Default;
```

---

## See Also

- [Network Resources](./network.md) - Private endpoints and VNet integration
- [Key Vault Resources](./keyvault.md) - Secret management
- [Insights Resources](./insights.md) - Monitoring and diagnostics
- [Azure SQL Documentation](https://docs.microsoft.com/azure/azure-sql/)

---

**Last Updated**: 2025-10-09
**Version**: @atakora/cdk 1.0.0
**Status**: Under Development
