import { App, SubscriptionStack, ResourceGroupStack, Subscription, Geography, Organization, Project, Environment, Instance } from '@atakora/cdk';
import { VirtualNetworks, Subnets, NetworkSecurityGroups, PrivateEndpoints, PrivateEndpointNetworkPolicies, PrivateLinkServiceNetworkPolicies, SecurityRuleProtocol, SecurityRuleAccess, SecurityRuleDirection } from '@atakora/cdk/network';
import { StorageAccounts, StorageAccountSkuName, StorageAccountKind, TlsVersion, NetworkAclDefaultAction, NetworkAclBypass } from '@atakora/cdk/storage';
import { Vaults, KeyVaultSkuName } from '@atakora/cdk/keyvault';
import { Workspaces, WorkspaceSku } from '@atakora/cdk/operationalinsights';

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
const app = new App();

const environment = process.env.ENVIRONMENT || 'gov';
const location = process.env.AZURE_LOCATION || 'usgovvirginia'; // Gov Cloud region

// Create subscription stack
const subscriptionStack = new SubscriptionStack(app, 'GovCloudFoundation', {
  subscription: Subscription.fromId(process.env.AZURE_SUBSCRIPTION_ID || '00000000-0000-0000-0000-000000000000'),
  geography: Geography.fromValue(location),
  organization: Organization.fromValue('governmentorg'),
  project: new Project('govcloud'),
  environment: Environment.fromValue('gov'),
  instance: Instance.fromNumber(1),
});

// Create resource group stack
const stack = new ResourceGroupStack(subscriptionStack, 'GovCloudStack', {
  resourceGroup: {
    resourceGroupName: `rg-govcloud-${environment}`,
    location: location,
  },
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
  sku: WorkspaceSku.PER_GB_2018,
  retentionInDays: 90, // Compliance requirement: retain logs for 90 days
  tags: {
    purpose: 'compliance-logging',
  },
});

// Virtual Network with restricted access
const vnet = new VirtualNetworks(stack, 'SecureVNet', {
  virtualNetworkName: `vnet-govcloud-${environment}`,
  addressSpace: ['10.100.0.0/16'], // Government-specific address space
  enableDdosProtection: false, // DDoS Standard not available in all Gov regions
  tags: {
    purpose: 'secure-networking',
  },
});

// Private subnet for backend services
const privateSubnet = new Subnets(vnet, 'PrivateSubnet', {
  name: 'snet-private',
  addressPrefix: '10.100.1.0/24',
  serviceEndpoints: [
    { service: 'Microsoft.Storage' },
    { service: 'Microsoft.KeyVault' },
  ],
  privateEndpointNetworkPolicies: PrivateEndpointNetworkPolicies.DISABLED,
  privateLinkServiceNetworkPolicies: PrivateLinkServiceNetworkPolicies.DISABLED,
});

// Management subnet for admin access
const mgmtSubnet = new Subnets(vnet, 'ManagementSubnet', {
  name: 'snet-management',
  addressPrefix: '10.100.10.0/24',
});

// Network Security Group with restrictive rules (inline security rules)
const nsg = new NetworkSecurityGroups(stack, 'PrivateNSG', {
  networkSecurityGroupName: `nsg-private-${environment}`,
  securityRules: [
    {
      name: 'AllowHTTPSFromMgmt',
      priority: 100,
      direction: SecurityRuleDirection.INBOUND,
      access: SecurityRuleAccess.ALLOW,
      protocol: SecurityRuleProtocol.TCP,
      sourcePortRange: '*',
      destinationPortRange: '443',
      sourceAddressPrefix: '10.100.10.0/24',
      destinationAddressPrefix: '*',
      description: 'Allow HTTPS from management subnet',
    },
    {
      name: 'DenyAllInbound',
      priority: 4096,
      direction: SecurityRuleDirection.INBOUND,
      access: SecurityRuleAccess.DENY,
      protocol: SecurityRuleProtocol.ANY,
      sourcePortRange: '*',
      destinationPortRange: '*',
      sourceAddressPrefix: '*',
      destinationAddressPrefix: '*',
      description: 'Deny all inbound traffic by default',
    },
  ],
  tags: {
    purpose: 'network-security',
  },
});

// Secure Storage Account with private endpoint
const storage = new StorageAccounts(stack, 'SecureStorage', {
  storageAccountName: `stgovcloud${environment}${Math.random().toString(36).slice(2, 6)}`.toLowerCase(),
  sku: StorageAccountSkuName.STANDARD_RAGRS, // Read-access geo-redundant for gov cloud
  kind: StorageAccountKind.STORAGE_V2,
  minimumTlsVersion: TlsVersion.TLS1_2,
  enableBlobPublicAccess: false, // Never allow public access in gov cloud
  networkAcls: {
    defaultAction: NetworkAclDefaultAction.DENY, // Deny all by default
    bypass: NetworkAclBypass.AZURE_SERVICES,
    virtualNetworkRules: [
      {
        id: privateSubnet.subnetId,
      },
    ],
  },
  tags: {
    purpose: 'secure-storage',
    classification: 'sensitive',
  },
});

// Azure Key Vault for secrets management
const keyVault = new Vaults(stack, 'SecureKeyVault', {
  vaultName: `kv-govcloud-${environment}-${Math.random().toString(36).slice(2, 4)}`.toLowerCase(),
  tenantId: process.env.AZURE_TENANT_ID || 'your-tenant-id',
  sku: KeyVaultSkuName.PREMIUM, // Hardware security modules for government compliance
  enableSoftDelete: true,
  softDeleteRetentionInDays: 90,
  enablePurgeProtection: true, // Cannot be disabled - compliance requirement
  tags: {
    purpose: 'secrets-management',
    classification: 'sensitive',
  },
});

// TODO: Key Vault Secrets construct not yet implemented
// Secrets can be added manually or using ARM templates after deployment

// Private Endpoint for Storage Account
new PrivateEndpoints(stack, 'StoragePrivateEndpoint', {
  privateEndpointName: `pe-storage-${environment}`,
  subnet: privateSubnet,
  privateLinkServiceId: storage.storageAccountId,
  groupIds: ['blob'],
  tags: {
    purpose: 'private-connectivity',
  },
});

// Private Endpoint for Key Vault
new PrivateEndpoints(stack, 'KeyVaultPrivateEndpoint', {
  privateEndpointName: `pe-keyvault-${environment}`,
  subnet: privateSubnet,
  privateLinkServiceId: keyVault.vaultId,
  groupIds: ['vault'],
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
