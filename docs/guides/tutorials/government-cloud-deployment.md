# Tutorial: Azure Government Cloud Deployment

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Tutorials](./README.md) > Government Cloud Deployment

Deploy infrastructure to Azure Government Cloud with specialized configurations for compliance, security, and government regulations.

## What You'll Build

- Azure Government Cloud infrastructure
- Compliance-ready configurations (FedRAMP, DoD IL5)
- Government-specific networking (ExpressRoute, Private Endpoints)
- Enhanced security controls
- Audit logging and compliance monitoring

## Azure Government vs Commercial Cloud

| Feature | Commercial | Government |
|---------|------------|------------|
| **Endpoints** | `.azure.com` | `.usgovcloudapi.net` |
| **Regions** | Worldwide | US-only (Gov regions) |
| **Compliance** | Standard | FedRAMP High, DoD IL5/IL6 |
| **Services** | All services | Subset of services |
| **Data residency** | Global | US-only |
| **Personnel** | Global | US persons only |

## Prerequisites

- **Azure Government subscription**
- **US-based personnel** for cloud access
- **Compliance requirements** understanding (FedRAMP, CJIS, IRS 1075)
- **Atakora CLI** configured for Government Cloud

## Step 1: Configure Azure Government Authentication

Configure CLI for Government Cloud:

```bash
# Set Azure Government cloud
az cloud set --name AzureUSGovernment

# Login to Government Cloud
az login

# Verify Government Cloud endpoints
az cloud show --name AzureUSGovernment

# List Government subscriptions
az account list --output table

# Set Government subscription
az account set --subscription "Government Subscription Name"

# Configure Atakora for Government Cloud
atakora config set cloud AzureUSGovernment
atakora config set subscription "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**Government Cloud endpoints**:
```
Resource Manager: https://management.usgovcloudapi.net
Portal: https://portal.azure.us
Storage: .blob.core.usgovcloudapi.net
Key Vault: .vault.usgovcloudapi.net
SQL Database: .database.usgovcloudapi.net
```

## Step 2: Define Government-Compliant Infrastructure

```typescript
// main.ts
import { AzureApp, ResourceGroupStack, Output } from '@atakora/lib';
import {
  VirtualNetworks,
  Subnets,
  NetworkSecurityGroups,
  PrivateEndpoints,
  ExpressRouteCircuits,
} from '@atakora/cdk/network';
import {
  StorageAccounts,
  BlobServices,
} from '@atakora/cdk/storage';
import {
  Servers as SqlServers,
  Databases as SqlDatabases,
  TransparentDataEncryptions,
  AuditingSettings,
} from '@atakora/cdk/sql';
import {
  Vaults as KeyVaults,
  Secrets,
} from '@atakora/cdk/keyvault';
import {
  Workspaces as LogAnalyticsWorkspaces,
} from '@atakora/cdk/insights';

// Government Cloud configuration
const config = {
  organization: 'GovernmentAgency',
  project: 'SecureApp',
  environment: 'production',

  // Use Government Cloud regions only
  location: 'usgovvirginia', // or 'usgovtexas', 'usgovarizona', 'usdodeast', 'usdodcentral'

  // Compliance tags
  tags: {
    classification: 'Controlled Unclassified Information',
    compliance: 'FedRAMP High',
    dataResidency: 'US',
    costCenter: 'AGENCY-001',
  },
};

const app = new AzureApp({
  organization: config.organization,
  project: config.project,
  // Government Cloud uses different ARM endpoints
  armEndpoint: 'https://management.usgovcloudapi.net',
});

const stack = new ResourceGroupStack(app, 'GovStack', {
  resourceGroupName: 'rg-govapp-prod',
  location: config.location,
  tags: config.tags,
});

// 1. Virtual Network with Government security standards
const vnet = new VirtualNetworks(stack, 'VNet', {
  virtualNetworkName: 'vnet-govapp',
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16'],
  },
  // Enable DDoS protection (recommended for Government)
  enableDdosProtection: true,
  ddosProtectionPlan: {
    id: '/subscriptions/.../ddosProtectionPlans/ddos-standard',
  },
});

// 2. Subnets with service endpoints
const appSubnet = new Subnets(vnet, 'AppSubnet', {
  subnetName: 'snet-app',
  addressPrefix: '10.0.1.0/24',
  serviceEndpoints: [
    { service: 'Microsoft.Storage' },
    { service: 'Microsoft.Sql' },
    { service: 'Microsoft.KeyVault' },
  ],
});

const dataSubnet = new Subnets(vnet, 'DataSubnet', {
  subnetName: 'snet-data',
  addressPrefix: '10.0.2.0/24',
  privateEndpointNetworkPolicies: 'Disabled',
});

// 3. Network Security Groups with restrictive rules
const nsg = new NetworkSecurityGroups(stack, 'NSG', {
  networkSecurityGroupName: 'nsg-govapp',
  securityRules: [
    // Only HTTPS allowed
    {
      name: 'AllowHTTPSInbound',
      priority: 100,
      direction: 'Inbound',
      access: 'Allow',
      protocol: 'Tcp',
      sourcePortRange: '*',
      destinationPortRange: '443',
      sourceAddressPrefix: 'VirtualNetwork',
      destinationAddressPrefix: '*',
    },
    // Deny all other inbound
    {
      name: 'DenyAllInbound',
      priority: 4096,
      direction: 'Inbound',
      access: 'Deny',
      protocol: '*',
      sourcePortRange: '*',
      destinationPortRange: '*',
      sourceAddressPrefix: '*',
      destinationAddressPrefix: '*',
    },
  ],
});

// 4. Log Analytics for compliance monitoring
const logAnalytics = new LogAnalyticsWorkspaces(stack, 'LogAnalytics', {
  workspaceName: 'law-govapp',
  sku: {
    name: 'PerGB2018',
  },
  retentionInDays: 730, // 2 years retention for compliance
  publicNetworkAccessForIngestion: 'Disabled',
  publicNetworkAccessForQuery: 'Disabled',
});

// 5. Key Vault with Government compliance settings
const keyVault = new KeyVaults(stack, 'KeyVault', {
  vaultName: 'kv-govapp-prod',
  sku: {
    family: 'A',
    name: 'premium', // HSM-backed keys for Government
  },
  enabledForDeployment: true,
  enabledForTemplateDeployment: true,
  enabledForDiskEncryption: true,
  enableSoftDelete: true,
  softDeleteRetentionInDays: 90,
  enablePurgeProtection: true, // Required for Government compliance
  enableRbacAuthorization: true,
  publicNetworkAccess: 'Disabled', // Private endpoint only
  networkAcls: {
    defaultAction: 'Deny',
    bypass: 'None', // No bypass for Government
  },
});

// 6. Storage Account with Government security
const storage = new StorageAccounts(stack, 'Storage', {
  storageAccountName: 'stgovappprod',
  sku: {
    name: 'Standard_RAGRS', // Geo-redundant for Government
  },
  kind: 'StorageV2',
  enableHttpsTrafficOnly: true, // Required
  minimumTlsVersion: 'TLS1_2', // Required minimum
  allowBlobPublicAccess: false, // Prohibited in Government
  allowSharedKeyAccess: false, // Use Azure AD only
  publicNetworkAccess: 'Disabled', // Private endpoint only
  supportsHttpsTrafficOnly: true,
  networkRuleSet: {
    defaultAction: 'Deny',
    bypass: 'None',
  },
  encryption: {
    services: {
      blob: {
        enabled: true,
        keyType: 'Account',
      },
      file: {
        enabled: true,
        keyType: 'Account',
      },
      table: {
        enabled: true,
        keyType: 'Account',
      },
      queue: {
        enabled: true,
        keyType: 'Account',
      },
    },
    keySource: 'Microsoft.Keyvault', // Use Key Vault managed keys
    keyvaultproperties: {
      keyname: 'storage-encryption-key',
      keyvaulturi: `https://${keyVault.vaultName}.vault.usgovcloudapi.net`,
    },
  },
});

// 7. SQL Server with Government compliance
const sqlServer = new SqlServers(stack, 'SqlServer', {
  serverName: 'sql-govapp-prod',
  administratorLogin: 'sqladmin',
  administratorLoginPassword: '${SQL_ADMIN_PASSWORD}',
  version: '12.0',
  minimalTlsVersion: '1.2',
  publicNetworkAccess: 'Disabled', // Required for Government
});

// 8. SQL Database with Transparent Data Encryption
const sqlDatabase = new SqlDatabases(sqlServer, 'Database', {
  databaseName: 'govappdb',
  sku: {
    name: 'BC_Gen5_4', // Business Critical for Government
    tier: 'BusinessCritical',
  },
  zoneRedundant: true, // High availability required
  maxSizeBytes: 268435456000,
});

// Enable TDE with customer-managed key
const tde = new TransparentDataEncryptions(sqlDatabase, 'TDE', {
  state: 'Enabled',
});

// Enable auditing (required for compliance)
const auditing = new AuditingSettings(sqlServer, 'Auditing', {
  state: 'Enabled',
  storageAccountAccessKey: storage.primaryAccessKey,
  storageEndpoint: storage.primaryBlobEndpoint,
  retentionDays: 730, // 2 years
  auditActionsAndGroups: [
    'SUCCESSFUL_DATABASE_AUTHENTICATION_GROUP',
    'FAILED_DATABASE_AUTHENTICATION_GROUP',
    'BATCH_COMPLETED_GROUP',
  ],
  isStorageSecondaryKeyInUse: false,
});

// 9. Private Endpoints (required for Government)
const storagePrivateEndpoint = new PrivateEndpoints(stack, 'StoragePE', {
  privateEndpointName: 'pe-storage',
  subnet: {
    id: dataSubnet.id,
  },
  privateLinkServiceConnections: [
    {
      name: 'storage-connection',
      privateLinkServiceId: storage.id,
      groupIds: ['blob'],
    },
  ],
});

const sqlPrivateEndpoint = new PrivateEndpoints(stack, 'SqlPE', {
  privateEndpointName: 'pe-sql',
  subnet: {
    id: dataSubnet.id,
  },
  privateLinkServiceConnections: [
    {
      name: 'sql-connection',
      privateLinkServiceId: sqlServer.id,
      groupIds: ['sqlServer'],
    },
  ],
});

// 10. Outputs
new Output(stack, 'KeyVaultUri', {
  value: `https://${keyVault.vaultName}.vault.usgovcloudapi.net/`,
  description: 'Key Vault URI (Government Cloud)',
});

new Output(stack, 'StorageEndpoint', {
  value: storage.primaryBlobEndpoint,
  description: 'Storage blob endpoint (Government Cloud)',
});

new Output(stack, 'SqlServerFqdn', {
  value: `${sqlServer.serverName}.database.usgovcloudapi.net`,
  description: 'SQL Server FQDN (Government Cloud)',
});

app.synth();
```

## Step 3: Deploy to Government Cloud

```bash
# Verify Government Cloud configuration
az cloud show

# Synth with Government endpoints
npm run synth

# Validate
atakora validate

# Deploy
atakora deploy GovStack --require-approval
```

## Government Cloud Compliance Features

### FedRAMP High Compliance

```typescript
// Additional configurations for FedRAMP High
const stack = new ResourceGroupStack(app, 'FedRAMP', {
  resourceGroupName: 'rg-fedramp',
  location: 'usgovvirginia',
  tags: {
    compliance: 'FedRAMP High',
    authorization: 'ATO-2024-001',
    dataClassification: 'CUI',
    systemOwner: 'system.owner@agency.gov',
  },
});

// Enable advanced threat protection
const storage = new StorageAccounts(stack, 'Storage', {
  advancedThreatProtectionSettings: {
    isEnabled: true,
  },
});

// Enable Microsoft Defender for SQL
const sqlServer = new SqlServers(stack, 'SqlServer', {
  securityAlertPolicy: {
    state: 'Enabled',
    emailAccountAdmins: true,
    emailAddresses: ['security@agency.gov'],
    retentionDays: 730,
    storageAccountAccessKey: storage.primaryAccessKey,
    storageEndpoint: storage.primaryBlobEndpoint,
  },
  vulnerabilityAssessment: {
    storageContainerPath: `${storage.primaryBlobEndpoint}vulnerability-assessment`,
    storageAccountAccessKey: storage.primaryAccessKey,
    recurringScans: {
      isEnabled: true,
      emailSubscriptionAdmins: true,
      emails: ['security@agency.gov'],
    },
  },
});
```

### DoD Impact Level 5 (IL5) Compliance

```typescript
// DoD IL5 specific configurations
const stack = new ResourceGroupStack(app, 'DoD-IL5', {
  resourceGroupName: 'rg-dod-il5',
  location: 'usdodeast', // DoD regions only
  tags: {
    compliance: 'DoD IL5',
    classification: 'SECRET',
    impactLevel: 'IL5',
    controlSet: 'NIST 800-53',
  },
});

// All resources must use private endpoints
// No public network access allowed
// Enhanced encryption required
// Dedicated tenant isolation
```

## Government Cloud Networking

### ExpressRoute for Secure Connectivity

```typescript
import { ExpressRouteCircuits, ExpressRouteCircuitPeerings } from '@atakora/cdk/network';

const expressRoute = new ExpressRouteCircuits(stack, 'ExpressRoute', {
  circuitName: 'er-govagency',
  serviceProviderName: 'AT&T Government Solutions',
  peeringLocation: 'Washington DC',
  bandwidthInMbps: 1000,
  sku: {
    name: 'Premium_MeteredData',
    tier: 'Premium',
    family: 'MeteredData',
  },
  allowClassicOperations: false,
});

const peering = new ExpressRouteCircuitPeerings(expressRoute, 'Peering', {
  peeringName: 'AzurePrivatePeering',
  peeringType: 'AzurePrivatePeering',
  peerASN: 65001,
  primaryPeerAddressPrefix: '192.168.1.0/30',
  secondaryPeerAddressPrefix: '192.168.2.0/30',
  vlanId: 100,
});
```

## Monitoring and Compliance

### Enable Diagnostic Logs

```typescript
import { DiagnosticSettings } from '@atakora/cdk/insights';

// Storage diagnostic logs
const storageDiagnostics = new DiagnosticSettings(storage, 'Diagnostics', {
  name: 'storage-diagnostics',
  workspaceId: logAnalytics.id,
  logs: [
    {
      category: 'StorageRead',
      enabled: true,
      retentionPolicy: {
        enabled: true,
        days: 730,
      },
    },
    {
      category: 'StorageWrite',
      enabled: true,
      retentionPolicy: {
        enabled: true,
        days: 730,
      },
    },
    {
      category: 'StorageDelete',
      enabled: true,
      retentionPolicy: {
        enabled: true,
        days: 730,
      },
    },
  ],
  metrics: [
    {
      category: 'AllMetrics',
      enabled: true,
      retentionPolicy: {
        enabled: true,
        days: 730,
      },
    },
  ],
});
```

### Azure Policy for Compliance

```bash
# Assign FedRAMP High policy initiative
az policy assignment create \
  --name 'FedRAMP-High' \
  --scope '/subscriptions/{subscription-id}' \
  --policy-set-definition '/providers/Microsoft.Authorization/policySetDefinitions/fedramp-high'

# Assign DoD IL5 policy initiative
az policy assignment create \
  --name 'DoD-IL5' \
  --scope '/subscriptions/{subscription-id}' \
  --policy-set-definition '/providers/Microsoft.Authorization/policySetDefinitions/dod-impact-level-5'
```

## Government Cloud Limitations

### Service Availability

Not all Azure services are available in Government Cloud:

**Available**:
- Virtual Machines, Virtual Networks
- Storage Accounts, SQL Database
- App Service, Functions
- Key Vault, Monitor
- Cosmos DB, Redis Cache

**Limited availability**:
- Azure Kubernetes Service
- Cognitive Services
- Azure DevOps

**Not available**:
- Some preview features
- Certain AI/ML services
- Some third-party marketplace offerings

### Region Limitations

Government regions:
- US Gov Virginia
- US Gov Texas
- US Gov Arizona
- US DoD East
- US DoD Central

## Best Practices

1. **Use private endpoints** for all services
2. **Enable audit logging** with long retention (2+ years)
3. **Implement RBAC** with least privilege
4. **Use customer-managed keys** for encryption
5. **Enable Microsoft Defender** for all services
6. **Disable public network access** by default
7. **Tag all resources** with compliance metadata
8. **Use Premium SKUs** where required
9. **Implement network isolation** with NSGs
10. **Regular compliance scanning** with Azure Policy

## Troubleshooting

### Wrong Cloud Endpoints

```bash
# Verify cloud configuration
az cloud show

# Switch to Government Cloud
az cloud set --name AzureUSGovernment

# Re-authenticate
az login
```

### Service Not Available

Check service availability:
```bash
# List available services in Government Cloud
az provider list --query "[].{namespace:namespace, state:registrationState}" --output table
```

## See Also

- **[Deployment Guide](../fundamentals/deployment.md)** - Deployment fundamentals
- **[Multi-Region Setup](./multi-region-setup.md)** - Regional deployment
- **[Managing Secrets](../workflows/managing-secrets.md)** - Secrets management

---

**Important**: Always verify compliance requirements with your agency's security team before deploying to Government Cloud.
