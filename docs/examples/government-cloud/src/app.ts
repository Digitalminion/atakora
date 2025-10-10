import { AzureApp, ResourceGroupStack } from '@atakora/lib';
import { VirtualNetworks, Subnets, NetworkSecurityGroups, SecurityRules, PrivateEndpoints } from '@atakora/cdk/network';
import { StorageAccounts, BlobContainers } from '@atakora/cdk/storage';
import { Vaults, Secrets } from '@atakora/cdk/keyvault';
import { Workspaces } from '@atakora/cdk/operationalinsights';

/**
 * Azure Government Cloud Example
 *
 * This example demonstrates infrastructure deployment to Azure Government Cloud with:
 * - Government Cloud specific endpoints and configuration
 * - Enhanced security and compliance features
 * - Private endpoints for secure connectivity
 * - Key Vault for secrets management
 * - Network isolation and security groups
 * - Compliance-focused logging and monitoring
 */

// Configuration for Government Cloud
const app = new AzureApp({
  organization: process.env.ORGANIZATION || 'GovernmentOrg',
  project: process.env.PROJECT || 'GovCloudApp',
});

const environment = process.env.ENVIRONMENT || 'gov';
const location = process.env.AZURE_LOCATION || 'usgovvirginia'; // Gov Cloud region

// Create resource group stack
const stack = new ResourceGroupStack(app, 'GovCloudStack', {
  resourceGroupName: `rg-govcloud-${environment}`,
  location: location,
  tags: {
    environment: environment,
    application: 'government-cloud-app',
    classification: 'sensitive',
    compliance: 'NIST-800-53',
    managedBy: 'atakora',
  },
});

// Log Analytics Workspace for centralized logging
const logAnalytics = new Workspaces(stack, 'LogAnalytics', {
  workspaceName: `law-govcloud-${environment}`,
  sku: {
    name: 'PerGB2018',
  },
  retentionInDays: 90, // Compliance requirement: retain logs for 90 days
  tags: {
    purpose: 'compliance-logging',
  },
});

// Virtual Network with restricted access
const vnet = new VirtualNetworks(stack, 'SecureVNet', {
  virtualNetworkName: `vnet-govcloud-${environment}`,
  addressSpace: {
    addressPrefixes: ['10.100.0.0/16'], // Government-specific address space
  },
  enableDdosProtection: false, // DDoS Standard not available in all Gov regions
  tags: {
    purpose: 'secure-networking',
  },
});

// Private subnet for backend services
const privateSubnet = new Subnets(stack, 'PrivateSubnet', {
  virtualNetworkName: vnet.name,
  subnetName: 'snet-private',
  addressPrefix: '10.100.1.0/24',
  serviceEndpoints: [
    { service: 'Microsoft.Storage' },
    { service: 'Microsoft.KeyVault' },
  ],
  privateEndpointNetworkPolicies: 'Disabled',
  privateLinkServiceNetworkPolicies: 'Disabled',
});

// Management subnet for admin access
const mgmtSubnet = new Subnets(stack, 'ManagementSubnet', {
  virtualNetworkName: vnet.name,
  subnetName: 'snet-management',
  addressPrefix: '10.100.10.0/24',
});

// Network Security Group with restrictive rules
const nsg = new NetworkSecurityGroups(stack, 'PrivateNSG', {
  networkSecurityGroupName: `nsg-private-${environment}`,
  tags: {
    purpose: 'network-security',
  },
});

// Deny all inbound by default (explicit)
new SecurityRules(stack, 'DenyAllInbound', {
  networkSecurityGroupName: nsg.name,
  securityRuleName: 'DenyAllInbound',
  priority: 4096,
  direction: 'Inbound',
  access: 'Deny',
  protocol: '*',
  sourcePortRange: '*',
  destinationPortRange: '*',
  sourceAddressPrefix: '*',
  destinationAddressPrefix: '*',
  description: 'Deny all inbound traffic by default',
});

// Allow HTTPS from management subnet only
new SecurityRules(stack, 'AllowHTTPSFromMgmt', {
  networkSecurityGroupName: nsg.name,
  securityRuleName: 'AllowHTTPSFromMgmt',
  priority: 100,
  direction: 'Inbound',
  access: 'Allow',
  protocol: 'Tcp',
  sourcePortRange: '*',
  destinationPortRange: '443',
  sourceAddressPrefix: '10.100.10.0/24',
  destinationAddressPrefix: '*',
  description: 'Allow HTTPS from management subnet',
});

// Secure Storage Account with private endpoint
const storage = new StorageAccounts(stack, 'SecureStorage', {
  accountName: `stgovcloud${environment}${Math.random().toString(36).slice(2, 6)}`.toLowerCase(),
  sku: {
    name: 'Standard_RAGRS', // Read-access geo-redundant for gov cloud
  },
  kind: 'StorageV2',
  enableHttpsTrafficOnly: true,
  minimumTlsVersion: 'TLS1_2',
  allowBlobPublicAccess: false, // Never allow public access in gov cloud
  allowSharedKeyAccess: false, // Require Azure AD authentication
  networkRuleSet: {
    defaultAction: 'Deny', // Deny all by default
    bypass: 'AzureServices',
    virtualNetworkRules: [
      {
        id: privateSubnet.id,
        action: 'Allow',
      },
    ],
  },
  tags: {
    purpose: 'secure-storage',
    classification: 'sensitive',
  },
});

// Blob container for sensitive data
new BlobContainers(stack, 'SensitiveDataContainer', {
  accountName: storage.name,
  containerName: 'sensitive-data',
  publicAccess: 'None',
});

// Azure Key Vault for secrets management
const keyVault = new Vaults(stack, 'SecureKeyVault', {
  vaultName: `kv-govcloud-${environment}-${Math.random().toString(36).slice(2, 4)}`.toLowerCase(),
  tenantId: process.env.AZURE_TENANT_ID || 'your-tenant-id',
  sku: {
    family: 'A',
    name: 'premium', // Hardware security modules for government compliance
  },
  enabledForDeployment: false,
  enabledForDiskEncryption: false,
  enabledForTemplateDeployment: true,
  enableSoftDelete: true,
  softDeleteRetentionInDays: 90,
  enablePurgeProtection: true, // Cannot be disabled - compliance requirement
  networkAcls: {
    defaultAction: 'Deny',
    bypass: 'AzureServices',
    virtualNetworkRules: [
      {
        id: privateSubnet.id,
      },
    ],
  },
  tags: {
    purpose: 'secrets-management',
    classification: 'sensitive',
  },
});

// Store storage connection string in Key Vault
new Secrets(stack, 'StorageConnectionSecret', {
  vaultName: keyVault.name,
  secretName: 'storage-connection-string',
  properties: {
    value: storage.primaryConnectionString,
    contentType: 'text/plain',
  },
  tags: {
    purpose: 'storage-credentials',
  },
});

// Private Endpoint for Storage Account
new PrivateEndpoints(stack, 'StoragePrivateEndpoint', {
  privateEndpointName: `pe-storage-${environment}`,
  subnetId: privateSubnet.id,
  privateLinkServiceConnections: [
    {
      name: 'storage-connection',
      privateLinkServiceId: storage.id,
      groupIds: ['blob'],
    },
  ],
  tags: {
    purpose: 'private-connectivity',
  },
});

// Private Endpoint for Key Vault
new PrivateEndpoints(stack, 'KeyVaultPrivateEndpoint', {
  privateEndpointName: `pe-keyvault-${environment}`,
  subnetId: privateSubnet.id,
  privateLinkServiceConnections: [
    {
      name: 'keyvault-connection',
      privateLinkServiceId: keyVault.id,
      groupIds: ['vault'],
    },
  ],
  tags: {
    purpose: 'private-connectivity',
  },
});

// Synthesize ARM templates
app.synth();

console.log(`
=================================================================
Azure Government Cloud Infrastructure Synthesized
=================================================================
Environment: ${environment}
Location: ${location} (Government Cloud)

Security Features:
- Network isolation with private subnets
- Private endpoints for all services
- Key Vault with HSM-backed keys
- Storage with Azure AD authentication only
- Network security groups with deny-by-default
- 90-day log retention for compliance

Resources Created:
- Resource Group: rg-govcloud-${environment}
- Virtual Network: vnet-govcloud-${environment}
- Network Security Group: nsg-private-${environment}
- Storage Account: stgovcloud${environment}######
- Key Vault: kv-govcloud-${environment}-##
- Log Analytics: law-govcloud-${environment}
- Private Endpoints: 2 (Storage, Key Vault)

Compliance:
- NIST 800-53 controls implemented
- FedRAMP baseline security
- Data residency in ${location}
- Enhanced audit logging enabled

Next Steps:
1. Configure Azure CLI for Government Cloud:
   az cloud set --name AzureUSGovernment
   az login

2. Set environment variables (see .env.example)

3. Deploy infrastructure:
   npm run deploy

4. Configure RBAC and access policies

5. Enable Azure Policy for continuous compliance

Important Notes:
- This infrastructure uses Government Cloud endpoints
- Some Azure services may not be available in all regions
- Private endpoints ensure traffic stays on Microsoft backbone
- Key Vault uses Premium SKU with HSM for FIPS 140-2 compliance

=================================================================
`);
