# Government Cloud Example

**Navigation**: [Docs Home](../../README.md) > [Examples](../README.md) > Government Cloud

---

## Overview

This example demonstrates Azure Government Cloud deployment with compliance-focused infrastructure:
- Government region deployment (US Gov Virginia)
- Enhanced security configuration
- Compliance tags
- Private networking

## Architecture

```
┌─────────────────────────────────────┐
│     US Gov Virginia Region          │
│  ┌─────────────────────────────┐    │
│  │   Virtual Network           │    │
│  │  ┌───────────┐ ┌──────────┐│    │
│  │  │Private    │ │Private   ││    │
│  │  │Endpoint   │ │Endpoint  ││    │
│  │  └─────┬─────┘ └────┬─────┘│    │
│  └────────┼────────────┼──────┘    │
│           ▼            ▼            │
│     Web App       Storage           │
│  (Private Access)  (No Public)      │
└─────────────────────────────────────┘
```

## Prerequisites

- Azure Government subscription
- Government cloud access
- FedRAMP compliance requirements

## Infrastructure Code

### bin/app.ts

```typescript
import { App, Stack } from '@atakora/lib';
import { ResourceGroup } from '@atakora/cdk/resources';
import { VirtualNetwork, Subnet, PrivateEndpoint } from '@atakora/cdk/network';
import { StorageAccount } from '@atakora/cdk/storage';
import { KeyVault } from '@atakora/cdk/keyvault';

class GovCloudStack extends Stack {
  constructor(scope: App, id: string) {
    super(scope, id, {
      environment: 'production',
      location: 'usgovvirginia',  // Government region
      tags: {
        compliance: 'FedRAMP-High',
        classification: 'Sensitive',
        department: 'Defense'
      }
    });

    const rg = new ResourceGroup(this, 'ResourceGroup', {
      location: this.location
    });

    // Virtual Network
    const vnet = new VirtualNetwork(this, 'VNet', {
      resourceGroup: rg,
      addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
    });

    const privateSubnet = new Subnet(this, 'PrivateSubnet', {
      virtualNetwork: vnet,
      addressPrefix: '10.0.1.0/24',
      privateEndpointNetworkPolicies: 'Disabled'
    });

    // Storage (no public access)
    const storage = new StorageAccount(this, 'Storage', {
      resourceGroup: rg,
      sku: { name: 'Standard_GRS' },
      publicNetworkAccess: 'Disabled',
      minimumTlsVersion: 'TLS1_2',
      allowBlobPublicAccess: false
    });

    // Private Endpoint
    new PrivateEndpoint(this, 'StorageEndpoint', {
      resourceGroup: rg,
      subnet: privateSubnet,
      privateLinkServiceId: storage.id,
      groupIds: ['blob']
    });

    // Key Vault (FIPS-compliant)
    new KeyVault(this, 'Vault', {
      resourceGroup: rg,
      tenantId: process.env.AZURE_TENANT_ID!,
      enableRbacAuthorization: true,
      enablePurgeProtection: true,
      softDeleteRetentionInDays: 90
    });
  }
}

const app = new App();
new GovCloudStack(app, 'govcloud');
app.synth();
```

## Government Cloud Configuration

### Configure Gov Cloud Credentials

```bash
# Set Government cloud environment
export AZURE_ENVIRONMENT=AzureUSGovernment

# Configure credentials
atakora config set-credentials \
  --tenant-id <gov-tenant-id> \
  --client-id <gov-client-id> \
  --client-secret <gov-secret> \
  --subscription-id <gov-subscription-id>
```

### Login with Azure CLI (Gov Cloud)

```bash
az cloud set --name AzureUSGovernment
az login
az account set --subscription <gov-subscription-id>
```

## Compliance Features

### Enhanced Security
- No public network access
- Private endpoints only
- TLS 1.2 minimum
- Purge protection enabled
- Soft delete (90 days)

### Compliance Tags
- FedRAMP level
- Data classification
- Department/agency
- Cost center
- System owner

### Audit Logging
All resources automatically tagged for:
- Compliance tracking
- Cost allocation
- Access auditing
- Change management

## Deployment

```bash
# Synthesize
atakora synth

# Review Gov Cloud-specific configuration
atakora diff

# Deploy
atakora deploy
```

## Verification

### Check Network Isolation

```bash
# Verify no public endpoints
az storage account show \
  --name st-govcloud-prod \
  --query publicNetworkAccess
# Output: "Disabled"
```

### Verify Compliance Tags

```bash
az resource list \
  --resource-group rg-govcloud-production-usgovvirginia \
  --query "[].tags"
```

## Cost Estimate

Monthly cost (US Gov Virginia):
- Storage (GRS): ~$30
- Virtual Network: ~$5
- Private Endpoints: ~$15
- Key Vault: ~$2

**Total**: ~$52/month

Note: Government cloud pricing may differ from commercial Azure.

## See Also

- [Government Cloud Tutorial](../../guides/tutorials/government-cloud-deployment.md)
- [Gov Cloud Deployment Guide](../../guides/fundamentals/deployment.md)

---

**Last Updated**: 2025-10-08
