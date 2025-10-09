# Network Resources API (@atakora/cdk/network)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > Network

---

## Overview

The network namespace provides constructs for Azure networking resources including virtual networks, subnets, network security groups, application gateways, and private endpoints.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import {
  VirtualNetwork,
  Subnet,
  NetworkSecurityGroup,
  PublicIPAddress,
  ApplicationGateway,
  PrivateEndpoint
} from '@atakora/cdk/network';
```

## Classes

### VirtualNetwork

Creates an Azure Virtual Network.

#### Class Signature

```typescript
class VirtualNetwork extends Resource implements IVirtualNetwork {
  constructor(scope: Construct, id: string, props?: VirtualNetworkProps);
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ARM resource ID |
| `name` | `string` | Virtual network name |
| `subnets` | `ISubnet[]` | Subnets in this VNet |
| `addressSpace` | `AddressSpace` | Address space |

#### VirtualNetworkProps

```typescript
interface VirtualNetworkProps extends ResourceProps {
  /**
   * Resource group containing the VNet
   */
  readonly resourceGroup?: IResourceGroup;

  /**
   * Address space for the virtual network
   */
  readonly addressSpace: AddressSpace;

  /**
   * DNS servers for the VNet
   */
  readonly dhcpOptions?: DhcpOptions;

  /**
   * Enable DDoS protection
   * @default false
   */
  readonly enableDdosProtection?: boolean;

  /**
   * Enable VM protection
   * @default false
   */
  readonly enableVmProtection?: boolean;
}
```

#### Types

```typescript
interface AddressSpace {
  /**
   * Address prefixes in CIDR notation
   * @example ['10.0.0.0/16', '10.1.0.0/16']
   */
  readonly addressPrefixes: string[];
}

interface DhcpOptions {
  /**
   * Custom DNS servers
   * @example ['10.0.0.4', '10.0.0.5']
   */
  readonly dnsServers?: string[];
}
```

#### Examples

**Basic Virtual Network**:
```typescript
import { VirtualNetwork } from '@atakora/cdk/network';

const vnet = new VirtualNetwork(this, 'VNet', {
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16']
  }
});
```

**With Custom DNS**:
```typescript
const vnet = new VirtualNetwork(this, 'VNet', {
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16']
  },
  dhcpOptions: {
    dnsServers: ['10.0.0.4', '10.0.0.5']
  }
});
```

**Multi-Region VNet**:
```typescript
const vnet = new VirtualNetwork(this, 'VNet', {
  addressSpace: {
    addressPrefixes: ['10.0.0.0/16', '10.1.0.0/16']
  },
  enableDdosProtection: true,
  enableVmProtection: true
});
```

---

### Subnet

Creates a subnet within a virtual network.

#### Class Signature

```typescript
class Subnet extends Resource implements ISubnet {
  constructor(scope: Construct, id: string, props: SubnetProps);
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ARM resource ID |
| `name` | `string` | Subnet name |
| `addressPrefix` | `string` | Address range |
| `networkSecurityGroup` | `INetworkSecurityGroup` | Associated NSG |

#### SubnetProps

```typescript
interface SubnetProps extends ResourceProps {
  /**
   * Parent virtual network
   * Required
   */
  readonly virtualNetwork: IVirtualNetwork;

  /**
   * Address prefix in CIDR notation
   * @example '10.0.1.0/24'
   */
  readonly addressPrefix: string;

  /**
   * Network security group
   */
  readonly networkSecurityGroup?: INetworkSecurityGroup;

  /**
   * Service endpoints to enable
   */
  readonly serviceEndpoints?: ServiceEndpoint[];

  /**
   * Delegations for this subnet
   */
  readonly delegations?: Delegation[];

  /**
   * Private endpoint network policies
   * @default 'Enabled'
   */
  readonly privateEndpointNetworkPolicies?: PrivateEndpointNetworkPolicies;

  /**
   * Private link service network policies
   * @default 'Enabled'
   */
  readonly privateLinkServiceNetworkPolicies?: PrivateLinkServiceNetworkPolicies;
}
```

#### Types

```typescript
interface ServiceEndpoint {
  /**
   * Service type
   * @example 'Microsoft.Storage', 'Microsoft.Sql'
   */
  readonly service: string;

  /**
   * Locations where endpoint is available
   */
  readonly locations?: string[];
}

interface Delegation {
  /**
   * Service to delegate to
   * @example 'Microsoft.Web/serverFarms'
   */
  readonly serviceName: string;
}

enum PrivateEndpointNetworkPolicies {
  Enabled = 'Enabled',
  Disabled = 'Disabled'
}

enum PrivateLinkServiceNetworkPolicies {
  Enabled = 'Enabled',
  Disabled = 'Disabled'
}
```

#### Examples

**Basic Subnet**:
```typescript
import { Subnet } from '@atakora/cdk/network';

const subnet = new Subnet(this, 'AppSubnet', {
  virtualNetwork: vnet,
  addressPrefix: '10.0.1.0/24'
});
```

**With Service Endpoints**:
```typescript
const subnet = new Subnet(this, 'DataSubnet', {
  virtualNetwork: vnet,
  addressPrefix: '10.0.2.0/24',
  serviceEndpoints: [
    { service: 'Microsoft.Storage' },
    { service: 'Microsoft.Sql' }
  ]
});
```

**For Private Endpoints**:
```typescript
const subnet = new Subnet(this, 'PrivateSubnet', {
  virtualNetwork: vnet,
  addressPrefix: '10.0.3.0/24',
  privateEndpointNetworkPolicies: PrivateEndpointNetworkPolicies.Disabled
});
```

**With Delegation**:
```typescript
const subnet = new Subnet(this, 'AppServiceSubnet', {
  virtualNetwork: vnet,
  addressPrefix: '10.0.4.0/24',
  delegations: [
    { serviceName: 'Microsoft.Web/serverFarms' }
  ]
});
```

---

### NetworkSecurityGroup

Creates a network security group with security rules.

#### Class Signature

```typescript
class NetworkSecurityGroup extends Resource implements INetworkSecurityGroup {
  constructor(scope: Construct, id: string, props?: NetworkSecurityGroupProps);

  addInboundRule(rule: SecurityRule): void;
  addOutboundRule(rule: SecurityRule): void;
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ARM resource ID |
| `name` | `string` | NSG name |
| `securityRules` | `SecurityRule[]` | All security rules |

#### NetworkSecurityGroupProps

```typescript
interface NetworkSecurityGroupProps extends ResourceProps {
  /**
   * Resource group
   */
  readonly resourceGroup?: IResourceGroup;

  /**
   * Security rules
   */
  readonly securityRules?: SecurityRule[];
}
```

#### Types

```typescript
interface SecurityRule {
  /**
   * Rule name
   */
  readonly name: string;

  /**
   * Rule priority (100-4096)
   */
  readonly priority: number;

  /**
   * Traffic direction
   */
  readonly direction: 'Inbound' | 'Outbound';

  /**
   * Allow or deny
   */
  readonly access: 'Allow' | 'Deny';

  /**
   * Protocol
   */
  readonly protocol: 'Tcp' | 'Udp' | 'Icmp' | 'Esp' | 'Ah' | '*';

  /**
   * Source address prefix
   * @example '10.0.0.0/16', 'Internet', 'VirtualNetwork'
   */
  readonly sourceAddressPrefix?: string;

  /**
   * Source port range
   * @example '80', '443', '1024-65535', '*'
   */
  readonly sourcePortRange?: string;

  /**
   * Destination address prefix
   */
  readonly destinationAddressPrefix?: string;

  /**
   * Destination port range
   */
  readonly destinationPortRange?: string;

  /**
   * Rule description
   */
  readonly description?: string;
}
```

#### Examples

**Basic NSG**:
```typescript
import { NetworkSecurityGroup } from '@atakora/cdk/network';

const nsg = new NetworkSecurityGroup(this, 'WebNSG', {
  securityRules: [
    {
      name: 'AllowHTTPS',
      priority: 100,
      direction: 'Inbound',
      access: 'Allow',
      protocol: 'Tcp',
      sourceAddressPrefix: 'Internet',
      sourcePortRange: '*',
      destinationAddressPrefix: '*',
      destinationPortRange: '443'
    }
  ]
});
```

**Multi-Rule NSG**:
```typescript
const nsg = new NetworkSecurityGroup(this, 'AppNSG');

nsg.addInboundRule({
  name: 'AllowHTTP',
  priority: 100,
  direction: 'Inbound',
  access: 'Allow',
  protocol: 'Tcp',
  sourceAddressPrefix: 'Internet',
  sourcePortRange: '*',
  destinationAddressPrefix: '*',
  destinationPortRange: '80',
  description: 'Allow HTTP traffic'
});

nsg.addInboundRule({
  name: 'AllowHTTPS',
  priority: 110,
  direction: 'Inbound',
  access: 'Allow',
  protocol: 'Tcp',
  sourceAddressPrefix: 'Internet',
  sourcePortRange: '*',
  destinationAddressPrefix: '*',
  destinationPortRange: '443',
  description: 'Allow HTTPS traffic'
});

nsg.addInboundRule({
  name: 'DenyAll',
  priority: 4096,
  direction: 'Inbound',
  access: 'Deny',
  protocol: '*',
  sourceAddressPrefix: '*',
  sourcePortRange: '*',
  destinationAddressPrefix: '*',
  destinationPortRange: '*',
  description: 'Deny all other inbound traffic'
});
```

**Associate with Subnet**:
```typescript
const subnet = new Subnet(this, 'AppSubnet', {
  virtualNetwork: vnet,
  addressPrefix: '10.0.1.0/24',
  networkSecurityGroup: nsg
});
```

---

### PublicIPAddress

Creates a public IP address.

#### Class Signature

```typescript
class PublicIPAddress extends Resource implements IPublicIPAddress {
  constructor(scope: Construct, id: string, props?: PublicIPAddressProps);
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ARM resource ID |
| `name` | `string` | Public IP name |
| `ipAddress` | `string` | IP address (resolved) |

#### PublicIPAddressProps

```typescript
interface PublicIPAddressProps extends ResourceProps {
  /**
   * Resource group
   */
  readonly resourceGroup?: IResourceGroup;

  /**
   * SKU
   * @default 'Standard'
   */
  readonly sku?: { name: 'Basic' | 'Standard' };

  /**
   * Allocation method
   * @default 'Static' for Standard SKU, 'Dynamic' for Basic
   */
  readonly publicIPAllocationMethod?: 'Static' | 'Dynamic';

  /**
   * IP version
   * @default 'IPv4'
   */
  readonly publicIPAddressVersion?: 'IPv4' | 'IPv6';

  /**
   * DNS label
   * Creates FQDN: <dns-label>.<region>.cloudapp.azure.com
   */
  readonly dnsSettings?: {
    readonly domainNameLabel: string;
  };

  /**
   * Availability zones
   * @example ['1', '2', '3']
   */
  readonly zones?: string[];
}
```

#### Examples

**Basic Public IP**:
```typescript
import { PublicIPAddress } from '@atakora/cdk/network';

const pip = new PublicIPAddress(this, 'AppGatewayIP', {
  sku: { name: 'Standard' },
  publicIPAllocationMethod: 'Static'
});
```

**With DNS Label**:
```typescript
const pip = new PublicIPAddress(this, 'WebIP', {
  sku: { name: 'Standard' },
  publicIPAllocationMethod: 'Static',
  dnsSettings: {
    domainNameLabel: 'myapp-prod'
  }
});
// FQDN: myapp-prod.eastus.cloudapp.azure.com
```

**Zone-Redundant**:
```typescript
const pip = new PublicIPAddress(this, 'LBPublicIP', {
  sku: { name: 'Standard' },
  publicIPAllocationMethod: 'Static',
  zones: ['1', '2', '3']
});
```

---

### PrivateEndpoint

Creates a private endpoint for private link services.

#### Class Signature

```typescript
class PrivateEndpoint extends Resource implements IPrivateEndpoint {
  constructor(scope: Construct, id: string, props: PrivateEndpointProps);
}
```

#### PrivateEndpointProps

```typescript
interface PrivateEndpointProps extends ResourceProps {
  /**
   * Resource group
   */
  readonly resourceGroup?: IResourceGroup;

  /**
   * Subnet for private endpoint
   */
  readonly subnet: ISubnet;

  /**
   * Private link service ID
   * Usually the resource ID to connect to
   */
  readonly privateLinkServiceId: string;

  /**
   * Group IDs (sub-resources)
   * @example ['blob'], ['sqlServer'], ['vault']
   */
  readonly groupIds: string[];

  /**
   * Private DNS zone integration
   */
  readonly privateDnsZoneGroups?: PrivateDnsZoneGroup[];
}

interface PrivateDnsZoneGroup {
  /**
   * DNS zone group name
   */
  readonly name: string;

  /**
   * Private DNS zone configurations
   */
  readonly privateDnsZoneConfigs: Array<{
    readonly name: string;
    readonly privateDnsZoneId: string;
  }>;
}
```

#### Examples

**Storage Account Private Endpoint**:
```typescript
import { PrivateEndpoint } from '@atakora/cdk/network';
import { StorageAccount } from '@atakora/cdk/storage';

const storage = new StorageAccount(this, 'Storage', {
  publicNetworkAccess: 'Disabled'
});

const endpoint = new PrivateEndpoint(this, 'StorageEndpoint', {
  subnet: privateSubnet,
  privateLinkServiceId: storage.id,
  groupIds: ['blob']
});
```

**SQL Server Private Endpoint**:
```typescript
import { SqlServer } from '@atakora/cdk/sql';

const sqlServer = new SqlServer(this, 'SqlServer', {
  publicNetworkAccess: 'Disabled'
});

const endpoint = new PrivateEndpoint(this, 'SqlEndpoint', {
  subnet: dataSubnet,
  privateLinkServiceId: sqlServer.id,
  groupIds: ['sqlServer']
});
```

**With Private DNS Integration**:
```typescript
const endpoint = new PrivateEndpoint(this, 'StorageEndpoint', {
  subnet: privateSubnet,
  privateLinkServiceId: storage.id,
  groupIds: ['blob'],
  privateDnsZoneGroups: [{
    name: 'default',
    privateDnsZoneConfigs: [{
      name: 'config1',
      privateDnsZoneId: privateDnsZone.id
    }]
  }]
});
```

---

### ApplicationGateway

Creates an Application Gateway with WAF.

#### Class Signature

```typescript
class ApplicationGateway extends Resource implements IApplicationGateway {
  constructor(scope: Construct, id: string, props: ApplicationGatewayProps);
}
```

#### ApplicationGatewayProps

```typescript
interface ApplicationGatewayProps extends ResourceProps {
  /**
   * Resource group
   */
  readonly resourceGroup?: IResourceGroup;

  /**
   * SKU configuration
   */
  readonly sku: ApplicationGatewaySku;

  /**
   * Gateway IP configurations
   */
  readonly gatewayIPConfigurations: GatewayIPConfiguration[];

  /**
   * Frontend IP configurations
   */
  readonly frontendIPConfigurations: FrontendIPConfiguration[];

  /**
   * Frontend ports
   */
  readonly frontendPorts: FrontendPort[];

  /**
   * Backend address pools
   */
  readonly backendAddressPools: BackendAddressPool[];

  /**
   * Backend HTTP settings
   */
  readonly backendHttpSettingsCollection: BackendHttpSettings[];

  /**
   * HTTP listeners
   */
  readonly httpListeners: HttpListener[];

  /**
   * Request routing rules
   */
  readonly requestRoutingRules: RequestRoutingRule[];

  /**
   * WAF policy
   */
  readonly firewallPolicyId?: string;

  /**
   * Enable HTTP/2
   * @default false
   */
  readonly enableHttp2?: boolean;
}
```

#### Examples

**Basic Application Gateway**:
```typescript
import { ApplicationGateway, PublicIPAddress } from '@atakora/cdk/network';

const pip = new PublicIPAddress(this, 'AppGwIP', {
  sku: { name: 'Standard' }
});

const appGw = new ApplicationGateway(this, 'AppGateway', {
  sku: {
    name: 'WAF_v2',
    tier: 'WAF_v2',
    capacity: 2
  },
  gatewayIPConfigurations: [{
    name: 'gatewayIP',
    subnet: gatewaySubnet
  }],
  frontendIPConfigurations: [{
    name: 'frontendIP',
    publicIPAddress: pip
  }],
  frontendPorts: [{
    name: 'port80',
    port: 80
  }],
  backendAddressPools: [{
    name: 'backendPool',
    backendAddresses: [
      { ipAddress: '10.0.1.4' },
      { ipAddress: '10.0.1.5' }
    ]
  }],
  backendHttpSettingsCollection: [{
    name: 'httpSettings',
    port: 80,
    protocol: 'Http',
    cookieBasedAffinity: 'Disabled'
  }],
  httpListeners: [{
    name: 'listener',
    frontendIPConfiguration: { id: 'frontendIP' },
    frontendPort: { id: 'port80' },
    protocol: 'Http'
  }],
  requestRoutingRules: [{
    name: 'rule1',
    ruleType: 'Basic',
    httpListener: { id: 'listener' },
    backendAddressPool: { id: 'backendPool' },
    backendHttpSettings: { id: 'httpSettings' }
  }]
});
```

---

## Government Cloud Considerations

### Naming Conventions

Network resource names in Gov Cloud follow same patterns as commercial:

```typescript
// Commercial Cloud
const vnet = new VirtualNetwork(this, 'VNet', {
  name: 'vnet-myapp-prod-eastus'
});

// Government Cloud
const vnet = new VirtualNetwork(this, 'VNet', {
  name: 'vnet-myapp-prod-usgovvirginia'
});
```

### Region Availability

Not all network features are available in all Gov Cloud regions:

**Generally Available**:
- Virtual Networks
- Subnets
- Network Security Groups
- Public IP Addresses
- Private Endpoints

**Limited Availability**:
- Application Gateway WAF v2 (check region support)
- DDoS Protection Standard (limited regions)

### DNS Considerations

Private endpoints use different DNS zones in Gov Cloud:

```typescript
// Commercial: privatelink.blob.core.windows.net
// Gov Cloud: privatelink.blob.core.usgovcloudapi.net

const endpoint = new PrivateEndpoint(this, 'Endpoint', {
  subnet: subnet,
  privateLinkServiceId: storage.id,
  groupIds: ['blob']
  // DNS suffix automatically adjusted based on cloud
});
```

## See Also

- [Storage Resources](./storage.md)
- [Web Resources](./web.md)
- [Core Library](../core/README.md)
- [Network Examples](../../../examples/README.md)

---

**Last Updated**: 2025-10-08
**Version**: @atakora/cdk 1.0.0
