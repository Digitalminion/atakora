# Atakora Gen 2 - Networking & Security Architecture

**Extension to**: atakora-gen2-default-backend-infrastructure.md
**Created**: 2025-10-28
**Status**: Design Phase

## Overview

This document defines the comprehensive networking and security architecture for Atakora Gen 2 backends. It balances enterprise-grade security requirements with Gen 2's philosophy of radical simplicity, providing automatic security in production while maintaining developer flexibility in development environments.

## Philosophy

**Zero-Trust by Default, Progressive Security Enhancement**

Our networking and security model follows these principles:

1. **Environment-Aware Defaults** - Production is locked down by default, development is open by default
2. **Progressive Enhancement** - Start simple, add security layers as needed
3. **Cost-Conscious** - Make security decisions transparent about cost implications
4. **Developer-Friendly** - Security shouldn't hinder development velocity
5. **Compliance-Ready** - Meet enterprise requirements out of the box

## Core Security Model

### Three-Tier Security Approach

```
┌─────────────────────────────────────────────────────────────┐
│                     PUBLIC INTERNET                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 1: Edge Security (API Management / Application Gateway)│
│  • DDoS Protection                                           │
│  • WAF Rules                                                 │
│  • Rate Limiting                                             │
│  • Geographic Restrictions                                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 2: Network Isolation (VNet + NSGs)                    │
│  • Private Subnets                                           │
│  • Network Security Groups                                   │
│  • Service Endpoints / Private Endpoints                    │
│  • Network Segmentation                                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  TIER 3: Resource Security (Identity + Access)              │
│  • Managed Identity                                          │
│  • RBAC                                                      │
│  • Key Vault                                                 │
│  • Encryption at Rest/Transit                               │
└─────────────────────────────────────────────────────────────┘
```

## 1. Virtual Network Architecture

### Default Network Topology

```typescript
interface NetworkingConfig {
  // Base configuration
  addressSpace?: string; // Default: "10.0.0.0/16"
  dnsServers?: string[]; // Default: Azure DNS
  enableDdosProtection?: boolean; // Default: true in prod

  // Subnet configuration
  subnets?: {
    functions?: SubnetConfig; // Default: "10.0.1.0/24"
    privateEndpoints?: SubnetConfig; // Default: "10.0.2.0/24"
    apim?: SubnetConfig; // Default: "10.0.3.0/24"
    bastion?: SubnetConfig; // Default: "10.0.4.0/26"
    firewall?: SubnetConfig; // Default: "10.0.5.0/26"
  };

  // Security
  enablePrivateEndpoints?: boolean; // Default: true in prod
  enableServiceEndpoints?: boolean; // Default: true
  enableFirewall?: boolean; // Default: false (opt-in)
}
```

### Environment-Specific Network Defaults

#### Development Environment

```typescript
const devNetworking = {
  enabled: false, // No VNet by default in dev
  privateEndpoints: false,
  publicAccess: true,

  // Developer can opt-in
  override: {
    enabled: true,
    addressSpace: '10.0.0.0/16',
    privateEndpoints: false, // Keep public for easier debugging
  },
};
```

#### Production Environment

```typescript
const prodNetworking = {
  enabled: true, // Always VNet in production
  privateEndpoints: true,
  publicAccess: false,
  ddosProtection: true,

  vnet: {
    addressSpace: '10.0.0.0/16',
    subnets: [
      {
        name: 'functions',
        addressPrefix: '10.0.1.0/24',
        delegation: 'Microsoft.Web/serverFarms',
        serviceEndpoints: ['Microsoft.Storage', 'Microsoft.KeyVault', 'Microsoft.AzureCosmosDB'],
      },
      {
        name: 'private-endpoints',
        addressPrefix: '10.0.2.0/24',
        privateEndpointNetworkPolicies: 'Disabled',
      },
      {
        name: 'apim',
        addressPrefix: '10.0.3.0/24',
        networkSecurityGroup: 'apim-nsg',
      },
      {
        name: 'bastion',
        addressPrefix: '10.0.4.0/26',
        networkSecurityGroup: 'bastion-nsg',
      },
    ],
  },
};
```

### Subnet Design Pattern

```typescript
class NetworkBuilder {
  private calculateSubnets(config: NetworkingConfig): Subnet[] {
    const baseAddress = config.addressSpace ?? '10.0.0.0/16';

    return [
      // Core compute subnet - largest allocation
      {
        name: 'functions',
        addressPrefix: this.getSubnetCIDR(baseAddress, 24, 1),
        delegations: [
          {
            name: 'function-delegation',
            serviceName: 'Microsoft.Web/serverFarms',
          },
        ],
        serviceEndpoints: this.getServiceEndpoints(config),
      },

      // Private endpoints subnet
      {
        name: 'private-endpoints',
        addressPrefix: this.getSubnetCIDR(baseAddress, 24, 2),
        privateEndpointNetworkPolicies: 'Disabled',
        privateLinkServiceNetworkPolicies: 'Disabled',
      },

      // API Management subnet (if enabled)
      ...(config.apim
        ? [
            {
              name: 'apim',
              addressPrefix: this.getSubnetCIDR(baseAddress, 24, 3),
              networkSecurityGroup: this.createApimNSG(),
            },
          ]
        : []),

      // Azure Bastion subnet (if enabled)
      ...(config.enableBastion
        ? [
            {
              name: 'AzureBastionSubnet', // Must be this exact name
              addressPrefix: this.getSubnetCIDR(baseAddress, 26, 4),
              networkSecurityGroup: this.createBastionNSG(),
            },
          ]
        : []),

      // Azure Firewall subnet (if enabled)
      ...(config.enableFirewall
        ? [
            {
              name: 'AzureFirewallSubnet', // Must be this exact name
              addressPrefix: this.getSubnetCIDR(baseAddress, 26, 5),
            },
          ]
        : []),
    ];
  }
}
```

## 2. Private Endpoints Strategy

### Automatic Private Endpoint Creation

Private endpoints are automatically created for all data services in production:

```typescript
class PrivateEndpointManager {
  createPrivateEndpoints(backend: Backend, config: NetworkingConfig): PrivateEndpoint[] {
    if (!config.enablePrivateEndpoints) return [];

    const endpoints: PrivateEndpoint[] = [];
    const subnet = backend.vnet.subnets.find((s) => s.name === 'private-endpoints');

    // Cosmos DB - One endpoint per API type
    if (backend.cosmos) {
      endpoints.push(
        this.createPrivateEndpoint({
          name: `${backend.cosmos.name}-pe`,
          targetResource: backend.cosmos,
          groupIds: ['Sql'], // Or 'MongoDB', 'Cassandra', 'Gremlin', 'Table'
          subnet,
          autoApproval: true,
        })
      );
    }

    // Storage - Separate endpoints per service
    if (backend.storage) {
      ['blob', 'queue', 'table', 'file'].forEach((service) => {
        endpoints.push(
          this.createPrivateEndpoint({
            name: `${backend.storage.name}-${service}-pe`,
            targetResource: backend.storage,
            groupIds: [service],
            subnet,
            autoApproval: true,
          })
        );
      });
    }

    // Key Vault
    if (backend.keyVault) {
      endpoints.push(
        this.createPrivateEndpoint({
          name: `${backend.keyVault.name}-pe`,
          targetResource: backend.keyVault,
          groupIds: ['vault'],
          subnet,
          autoApproval: true,
        })
      );
    }

    // Redis Cache
    if (backend.redis) {
      endpoints.push(
        this.createPrivateEndpoint({
          name: `${backend.redis.name}-pe`,
          targetResource: backend.redis,
          groupIds: ['redisCache'],
          subnet,
          autoApproval: true,
        })
      );
    }

    // Service Bus
    if (backend.serviceBus) {
      endpoints.push(
        this.createPrivateEndpoint({
          name: `${backend.serviceBus.name}-pe`,
          targetResource: backend.serviceBus,
          groupIds: ['namespace'],
          subnet,
          autoApproval: true,
        })
      );
    }

    return endpoints;
  }

  private configureDNS(endpoint: PrivateEndpoint): PrivateDnsZone {
    // Automatically create and link private DNS zones
    const dnsZoneMap = {
      blob: 'privatelink.blob.core.windows.net',
      queue: 'privatelink.queue.core.windows.net',
      table: 'privatelink.table.core.windows.net',
      file: 'privatelink.file.core.windows.net',
      vault: 'privatelink.vaultcore.azure.net',
      Sql: 'privatelink.documents.azure.com',
      redisCache: 'privatelink.redis.cache.windows.net',
      namespace: 'privatelink.servicebus.windows.net',
    };

    const zoneName = dnsZoneMap[endpoint.groupId];

    return new PrivateDnsZone(stack, `${endpoint.name}-dns`, {
      name: zoneName,
      virtualNetworkLinks: [
        {
          virtualNetworkId: backend.vnet.id,
          registrationEnabled: false,
        },
      ],
    });
  }
}
```

### Service Endpoints vs Private Endpoints

Decision matrix for choosing between Service Endpoints and Private Endpoints:

| Aspect             | Service Endpoints                | Private Endpoints               |
| ------------------ | -------------------------------- | ------------------------------- |
| **Cost**           | Free                             | ~$10/month per endpoint         |
| **Network Path**   | Azure backbone                   | Fully private                   |
| **DNS Changes**    | None required                    | Private DNS zones needed        |
| **IP Address**     | Public IP (secured)              | Private IP from VNet            |
| **Firewall Rules** | Allow VNet/Subnet                | Not needed                      |
| **Use When**       | Dev environments, Cost-sensitive | Production, Compliance required |

### Smart Defaults Based on Environment

```typescript
function determineEndpointStrategy(
  environment: string,
  config?: NetworkingConfig
): EndpointStrategy {
  // Override if explicitly configured
  if (config?.forcePrivateEndpoints) return 'private';
  if (config?.forceServiceEndpoints) return 'service';

  // Smart defaults
  switch (environment) {
    case 'dev':
      return 'none'; // Public access for development

    case 'test':
    case 'staging':
      return 'service'; // Service endpoints for cost savings

    case 'prod':
      return 'private'; // Private endpoints for maximum security

    default:
      return 'service';
  }
}
```

## 3. Network Security Groups (NSGs)

### Hierarchical NSG Strategy

```typescript
class NSGBuilder {
  // Application-level NSG (applied to function subnet)
  createFunctionNSG(): NetworkSecurityGroup {
    return {
      name: 'functions-nsg',
      rules: [
        // Inbound Rules
        {
          name: 'AllowAPIM',
          priority: 100,
          direction: 'Inbound',
          access: 'Allow',
          protocol: 'Tcp',
          sourceAddressPrefix: '10.0.3.0/24', // APIM subnet
          destinationPortRange: '443',
        },
        {
          name: 'AllowAppGateway',
          priority: 110,
          direction: 'Inbound',
          access: 'Allow',
          protocol: 'Tcp',
          sourceAddressPrefix: 'GatewayManager',
          destinationPortRange: '65200-65535',
        },
        {
          name: 'DenyAllInbound',
          priority: 4096,
          direction: 'Inbound',
          access: 'Deny',
          protocol: '*',
          sourceAddressPrefix: '*',
          destinationPortRange: '*',
        },

        // Outbound Rules
        {
          name: 'AllowStorage',
          priority: 100,
          direction: 'Outbound',
          access: 'Allow',
          protocol: 'Tcp',
          destinationAddressPrefix: 'Storage.EastUS2',
          destinationPortRange: '443',
        },
        {
          name: 'AllowKeyVault',
          priority: 110,
          direction: 'Outbound',
          access: 'Allow',
          protocol: 'Tcp',
          destinationAddressPrefix: 'AzureKeyVault.EastUS2',
          destinationPortRange: '443',
        },
        {
          name: 'AllowCosmosDB',
          priority: 120,
          direction: 'Outbound',
          access: 'Allow',
          protocol: 'Tcp',
          destinationAddressPrefix: 'AzureCosmosDB.EastUS2',
          destinationPortRange: '443',
        },
      ],
    };
  }

  // APIM NSG
  createAPIMNSG(): NetworkSecurityGroup {
    return {
      name: 'apim-nsg',
      rules: [
        {
          name: 'AllowInternetHTTPS',
          priority: 100,
          direction: 'Inbound',
          access: 'Allow',
          protocol: 'Tcp',
          sourceAddressPrefix: 'Internet',
          destinationPortRange: '443',
        },
        {
          name: 'AllowManagementEndpoint',
          priority: 110,
          direction: 'Inbound',
          access: 'Allow',
          protocol: 'Tcp',
          sourceAddressPrefix: 'ApiManagement',
          destinationPortRange: '3443',
        },
        {
          name: 'AllowLoadBalancer',
          priority: 120,
          direction: 'Inbound',
          access: 'Allow',
          protocol: 'Tcp',
          sourceAddressPrefix: 'AzureLoadBalancer',
          destinationPortRange: '6390',
        },
      ],
    };
  }

  // Database subnet NSG
  createDataNSG(): NetworkSecurityGroup {
    return {
      name: 'data-nsg',
      rules: [
        {
          name: 'AllowFunctionSubnet',
          priority: 100,
          direction: 'Inbound',
          access: 'Allow',
          protocol: 'Tcp',
          sourceAddressPrefix: '10.0.1.0/24', // Functions subnet
          destinationPortRange: '*',
        },
        {
          name: 'DenyAllInbound',
          priority: 4096,
          direction: 'Inbound',
          access: 'Deny',
          protocol: '*',
          sourceAddressPrefix: '*',
          destinationPortRange: '*',
        },
      ],
    };
  }
}
```

### Application Security Groups (ASGs)

For more granular control:

```typescript
interface ApplicationSecurityGroups {
  frontend: ApplicationSecurityGroup;
  backend: ApplicationSecurityGroup;
  database: ApplicationSecurityGroup;
  management: ApplicationSecurityGroup;
}

const asgs = {
  frontend: { name: 'asg-frontend', description: 'Frontend services' },
  backend: { name: 'asg-backend', description: 'Backend APIs' },
  database: { name: 'asg-database', description: 'Database services' },
  management: { name: 'asg-management', description: 'Management tools' },
};

// NSG rules using ASGs
const asgRules = [
  {
    name: 'AllowBackendToDatabase',
    sourceApplicationSecurityGroupIds: [asgs.backend.id],
    destinationApplicationSecurityGroupIds: [asgs.database.id],
    protocol: 'Tcp',
    destinationPortRange: '1433,3306,5432,27017', // SQL, MySQL, PostgreSQL, MongoDB
    access: 'Allow',
  },
];
```

## 4. Firewall and DDoS Protection

### Azure Firewall Configuration (Optional)

```typescript
interface FirewallConfig {
  enabled: boolean;
  sku: 'Basic' | 'Standard' | 'Premium';

  rules: {
    application: ApplicationRule[];
    network: NetworkRule[];
    nat: NatRule[];
  };

  threatIntelMode?: 'Alert' | 'Deny' | 'Off';
  intrusionDetection?: boolean; // Premium only
  tlsInspection?: boolean; // Premium only
}

class FirewallBuilder {
  createFirewall(config: FirewallConfig): AzureFirewall {
    if (!config.enabled) return null;

    return {
      name: 'hub-firewall',
      sku: {
        name: 'AZFW_VNet',
        tier: config.sku,
      },

      threatIntelMode: config.threatIntelMode ?? 'Alert',

      // Application rules for outbound HTTP/HTTPS
      applicationRuleCollections: [
        {
          name: 'AllowAzureServices',
          priority: 100,
          action: 'Allow',
          rules: [
            {
              name: 'AllowAzurePortal',
              fqdnTags: ['AzurePortal'],
              protocols: [{ protocolType: 'Https', port: 443 }],
            },
            {
              name: 'AllowMicrosoftServices',
              targetFqdns: ['*.microsoft.com', '*.azure.com', '*.windows.net'],
              protocols: [{ protocolType: 'Https', port: 443 }],
            },
          ],
        },
      ],

      // Network rules for non-HTTP traffic
      networkRuleCollections: [
        {
          name: 'AllowDNS',
          priority: 100,
          action: 'Allow',
          rules: [
            {
              name: 'AllowDNS',
              protocols: ['UDP'],
              sourceAddresses: ['10.0.0.0/16'],
              destinationAddresses: ['*'],
              destinationPorts: ['53'],
            },
          ],
        },
      ],

      // NAT rules for inbound traffic
      natRuleCollections: config.rules.nat
        ? [
            {
              name: 'InboundNAT',
              priority: 100,
              action: 'Dnat',
              rules: config.rules.nat,
            },
          ]
        : [],
    };
  }
}
```

### DDoS Protection

```typescript
interface DDoSConfig {
  enabled: boolean;
  tier: 'Basic' | 'Standard';

  // Standard tier only
  customPolicies?: {
    protocolsToProtect: ('Tcp' | 'Udp' | 'All')[];
    triggerRateInPps?: number;
    triggerSensitivity?: 'Low' | 'Default' | 'High' | 'Relaxed';
  };
}

const ddosProtection = {
  development: {
    enabled: false, // Basic (free) protection
  },

  production: {
    enabled: true,
    tier: 'Standard', // ~$2,944/month but protects entire VNet
    customPolicies: {
      protocolsToProtect: ['Tcp'],
      triggerSensitivity: 'Default',
    },
  },
};
```

## 5. Web Application Firewall (WAF)

### Application Gateway with WAF

```typescript
interface WAFConfig {
  enabled: boolean;
  mode: 'Detection' | 'Prevention';
  ruleSetType: 'OWASP';
  ruleSetVersion: '3.2' | '3.1' | '3.0';

  customRules?: CustomWAFRule[];
  exclusions?: WAFExclusion[];

  // Rate limiting
  rateLimiting?: {
    ruleGroupOverrides: Array<{
      ruleGroupName: string;
      rules: Array<{
        ruleId: string;
        enabled: boolean;
        action?: 'Allow' | 'Block' | 'Log';
      }>;
    }>;
  };
}

class WAFBuilder {
  createWAF(config: WAFConfig): ApplicationGatewayWebApplicationFirewallConfiguration {
    return {
      enabled: config.enabled,
      firewallMode: config.mode,
      ruleSetType: config.ruleSetType,
      ruleSetVersion: config.ruleSetVersion,

      // OWASP Core Rule Set
      disabledRuleGroups: [],

      // Custom rules (e.g., IP restrictions, geo-blocking)
      customRules: [
        {
          name: 'BlockCountries',
          priority: 1,
          ruleType: 'MatchRule',
          action: 'Block',
          matchConditions: [
            {
              matchVariables: [{ variableName: 'RemoteAddr' }],
              operator: 'GeoMatch',
              matchValues: ['CN', 'RU', 'KP'], // Block specific countries
            },
          ],
        },
        {
          name: 'RateLimitAPI',
          priority: 2,
          ruleType: 'RateLimitRule',
          action: 'Block',
          rateLimitThreshold: 1000,
          rateLimitDurationInMinutes: 1,
          matchConditions: [
            {
              matchVariables: [{ variableName: 'RequestUri' }],
              operator: 'Contains',
              matchValues: ['/api/'],
            },
          ],
        },
      ],

      // Exclusions for false positives
      exclusions: config.exclusions ?? [],
    };
  }
}
```

## 6. Zero Trust Network Access (ZTNA)

### Identity-Based Network Access

```typescript
interface ZeroTrustConfig {
  // Conditional Access Policies
  conditionalAccess: {
    requireMFA: boolean;
    trustedLocations?: string[]; // IP ranges
    blockLegacyAuth: boolean;
    sessionControls?: {
      signInFrequency: number; // hours
      persistentBrowser: boolean;
    };
  };

  // Device compliance
  deviceCompliance?: {
    requireCompliant: boolean;
    requireHybridJoin: boolean;
    allowedPlatforms: ('Windows' | 'macOS' | 'iOS' | 'Android')[];
  };

  // Network locations
  namedLocations?: Array<{
    name: string;
    ipRanges: string[];
    isTrusted: boolean;
  }>;
}

class ZeroTrustNetworking {
  configureConditionalAccess(config: ZeroTrustConfig): ConditionalAccessPolicy[] {
    return [
      {
        displayName: 'Require MFA for Backend Access',
        state: 'Enabled',
        conditions: {
          applications: { includeApplications: ['backend-app-id'] },
          users: { includeUsers: ['All'] },
          locations: {
            includeLocations: ['All'],
            excludeLocations: config.conditionalAccess.trustedLocations,
          },
        },
        grantControls: {
          operator: 'AND',
          builtInControls: ['mfa', 'compliantDevice'],
        },
      },

      {
        displayName: 'Block Legacy Authentication',
        state: config.conditionalAccess.blockLegacyAuth ? 'Enabled' : 'Report',
        conditions: {
          applications: { includeApplications: ['All'] },
          users: { includeUsers: ['All'] },
          clientAppTypes: ['exchangeActiveSync', 'other'],
        },
        grantControls: {
          operator: 'OR',
          builtInControls: ['block'],
        },
      },
    ];
  }
}
```

## 7. Network Isolation Patterns

### Environment Isolation

```typescript
interface EnvironmentIsolation {
  strategy: 'shared-vnet' | 'separate-vnets' | 'hub-spoke';

  // Shared VNet with subnet isolation
  sharedVNet?: {
    addressSpace: string;
    environments: {
      dev: { subnetPrefix: string }; // e.g., "10.0.0.0/20"
      test: { subnetPrefix: string }; // e.g., "10.0.16.0/20"
      staging: { subnetPrefix: string }; // e.g., "10.0.32.0/20"
      prod: { subnetPrefix: string }; // e.g., "10.0.48.0/20"
    };
  };

  // Separate VNets per environment
  separateVNets?: {
    dev: { addressSpace: string }; // e.g., "10.1.0.0/16"
    test: { addressSpace: string }; // e.g., "10.2.0.0/16"
    staging: { addressSpace: string }; // e.g., "10.3.0.0/16"
    prod: { addressSpace: string }; // e.g., "10.0.0.0/16"
  };

  // Hub-spoke topology
  hubSpoke?: {
    hub: {
      addressSpace: string;
      sharedServices: ('firewall' | 'vpn' | 'dns' | 'bastion')[];
    };
    spokes: {
      [environment: string]: {
        addressSpace: string;
        peeringToHub: boolean;
        transitivity: boolean;
      };
    };
  };
}
```

### Recommended Patterns by Organization Size

```typescript
function recommendNetworkTopology(
  orgSize: 'small' | 'medium' | 'enterprise'
): EnvironmentIsolation {
  switch (orgSize) {
    case 'small':
      // Single VNet with subnet isolation
      return {
        strategy: 'shared-vnet',
        sharedVNet: {
          addressSpace: '10.0.0.0/16',
          environments: {
            dev: { subnetPrefix: '10.0.0.0/20' },
            test: { subnetPrefix: '10.0.16.0/20' },
            staging: { subnetPrefix: '10.0.32.0/20' },
            prod: { subnetPrefix: '10.0.48.0/20' },
          },
        },
      };

    case 'medium':
      // Separate VNets with peering
      return {
        strategy: 'separate-vnets',
        separateVNets: {
          dev: { addressSpace: '10.1.0.0/16' },
          test: { addressSpace: '10.2.0.0/16' },
          staging: { addressSpace: '10.3.0.0/16' },
          prod: { addressSpace: '10.0.0.0/16' },
        },
      };

    case 'enterprise':
      // Hub-spoke with centralized services
      return {
        strategy: 'hub-spoke',
        hubSpoke: {
          hub: {
            addressSpace: '10.0.0.0/16',
            sharedServices: ['firewall', 'vpn', 'dns', 'bastion'],
          },
          spokes: {
            dev: {
              addressSpace: '10.1.0.0/16',
              peeringToHub: true,
              transitivity: false,
            },
            prod: {
              addressSpace: '10.10.0.0/16',
              peeringToHub: true,
              transitivity: false,
            },
          },
        },
      };
  }
}
```

## 8. Integration with defineBackend()

### Simple Configuration

```typescript
const backend = defineBackend({
  feedbackApi,
  processUploadFunction,
});
// Result: Dev = public access, Prod = VNet + private endpoints
```

### Explicit Network Configuration

```typescript
const backend = defineBackend(
  {
    feedbackApi,
    processUploadFunction,
  },
  {
    networking: {
      // Force private networking even in dev
      forcePrivate: true,

      // Custom address space
      addressSpace: '192.168.0.0/16',

      // Enable optional features
      enableFirewall: true,
      enableBastion: true,
      enableDDoSProtection: true,
    },

    security: {
      // WAF configuration
      waf: {
        enabled: true,
        mode: 'Prevention',
        customRules: [
          // Custom WAF rules
        ],
      },

      // Network security
      allowedIPs: ['203.0.113.0/24'], // Whitelist specific IPs
      blockedCountries: ['CN', 'RU'], // Geo-blocking
    },
  }
);
```

### Advanced Enterprise Configuration

```typescript
const backend = defineBackend(
  {
    feedbackApi,
    processUploadFunction,
  },
  {
    networking: {
      topology: 'hub-spoke',

      hub: {
        vnetId: '/subscriptions/.../vnets/hub-vnet',
        firewall: {
          enabled: true,
          sku: 'Premium',
          intrusionDetection: true,
          tlsInspection: true,
        },
      },

      spoke: {
        addressSpace: '10.100.0.0/16',
        routes: [
          {
            name: 'ForceTrafficThroughFirewall',
            addressPrefix: '0.0.0.0/0',
            nextHopType: 'VirtualAppliance',
            nextHopIpAddress: '10.0.0.4', // Firewall IP
          },
        ],
      },
    },

    security: {
      zeroTrust: {
        requireMFA: true,
        requireCompliantDevice: true,
        blockLegacyAuth: true,
        trustedLocations: ['203.0.113.0/24'],
      },

      encryption: {
        inTransit: 'TLS1.3',
        atRest: 'AES256',
        keyRotation: 90, // days
      },
    },

    compliance: {
      frameworks: ['SOC2', 'HIPAA', 'PCI-DSS'],
      dataResidency: 'US',
      dataRetention: 2555, // 7 years
    },
  }
);
```

## 9. Cost Implications

### Network Security Cost Breakdown

| Component                     | Dev Environment | Production Environment       |
| ----------------------------- | --------------- | ---------------------------- |
| **VNet**                      | $0              | $0                           |
| **Subnets**                   | $0              | $0                           |
| **NSGs**                      | $0              | $0                           |
| **Service Endpoints**         | $0              | $0                           |
| **Private Endpoints**         | $0 (disabled)   | ~$7/endpoint/month × 5 = $35 |
| **Private DNS Zones**         | $0 (disabled)   | ~$0.50/zone × 5 = $2.50      |
| **Application Gateway (WAF)** | $0 (disabled)   | ~$235/month                  |
| **DDoS Standard**             | $0 (Basic)      | ~$2,944/month (optional)     |
| **Azure Firewall**            | $0 (disabled)   | ~$1,250/month (optional)     |
| **Azure Bastion**             | $0 (disabled)   | ~$140/month (optional)       |
| **Total (Minimal)**           | $0              | ~$273/month                  |
| **Total (Full Security)**     | $0              | ~$4,607/month                |

### Cost Optimization Strategies

```typescript
class CostOptimizer {
  optimizeNetworkCosts(environment: string, budget: number): NetworkingConfig {
    if (environment === 'dev') {
      // Minimal security in dev
      return {
        enabled: false,
        privateEndpoints: false,
      };
    }

    if (budget < 300) {
      // Budget-conscious production
      return {
        enabled: true,
        privateEndpoints: false, // Use service endpoints instead
        enableServiceEndpoints: true,
        waf: { enabled: false }, // Skip WAF
        ddos: { enabled: false }, // Use Basic DDoS
      };
    }

    if (budget < 1500) {
      // Balanced security
      return {
        enabled: true,
        privateEndpoints: true,
        waf: { enabled: true },
        ddos: { enabled: false }, // Still use Basic DDoS
        firewall: { enabled: false }, // Skip firewall
      };
    }

    // Full enterprise security
    return {
      enabled: true,
      privateEndpoints: true,
      waf: { enabled: true, mode: 'Prevention' },
      ddos: { enabled: true, tier: 'Standard' },
      firewall: { enabled: true, sku: 'Premium' },
      bastion: { enabled: true },
    };
  }
}
```

## 10. Security Best Practices

### Default Security Posture

```typescript
const securityDefaults = {
  development: {
    networking: 'public',
    authentication: 'basic',
    encryption: 'standard',
    monitoring: 'minimal',
    cost: 'optimize',
  },

  staging: {
    networking: 'service-endpoints',
    authentication: 'oauth',
    encryption: 'standard',
    monitoring: 'standard',
    cost: 'balanced',
  },

  production: {
    networking: 'private-endpoints',
    authentication: 'mfa+conditional',
    encryption: 'enhanced',
    monitoring: 'comprehensive',
    cost: 'security-first',
  },
};
```

### Progressive Security Enhancement

1. **Level 1 - Basic Security (Dev)**
   - Public endpoints with IP restrictions
   - Service authentication
   - Basic monitoring

2. **Level 2 - Enhanced Security (Test/Staging)**
   - VNet with service endpoints
   - OAuth/JWT authentication
   - NSGs with strict rules
   - Application Insights

3. **Level 3 - Enterprise Security (Prod)**
   - Private endpoints only
   - Zero Trust with MFA
   - WAF + DDoS protection
   - Comprehensive audit logging

4. **Level 4 - Regulated Industries**
   - Hub-spoke with firewall
   - TLS inspection
   - Data residency controls
   - Compliance automation

## 11. Troubleshooting Guide

### Common Network Issues

```typescript
class NetworkTroubleshooter {
  diagnoseConnectivity(error: string): DiagnosticResult {
    const diagnostics = [
      {
        pattern: /timeout|timed out/i,
        checks: [
          'Verify NSG rules allow traffic',
          'Check if private endpoint is created',
          'Validate DNS resolution',
          'Test with Network Watcher',
        ],
      },
      {
        pattern: /unauthorized|403/i,
        checks: [
          'Verify managed identity has RBAC role',
          'Check firewall IP restrictions',
          'Validate service principal permissions',
          'Review conditional access policies',
        ],
      },
      {
        pattern: /not resolve|dns/i,
        checks: [
          'Verify private DNS zone exists',
          'Check VNet link to DNS zone',
          'Validate DNS forwarders',
          'Test with nslookup from within VNet',
        ],
      },
    ];

    return this.runDiagnostics(error, diagnostics);
  }
}
```

## Summary

The Atakora Gen 2 networking and security architecture provides:

1. **Environment-aware defaults** - Secure in production, open in development
2. **Progressive enhancement** - Add security layers as needed
3. **Cost transparency** - Clear understanding of security costs
4. **Zero-config for common cases** - Works out of the box
5. **Enterprise-ready** - Supports complex security requirements

Key innovations:

- Automatic private endpoint provisioning in production
- Smart selection between service/private endpoints based on environment
- Integrated WAF and DDoS protection options
- Zero Trust networking with conditional access
- Cost-optimized security configurations

The architecture maintains Gen 2's philosophy of radical simplicity while providing enterprise-grade security when needed.
