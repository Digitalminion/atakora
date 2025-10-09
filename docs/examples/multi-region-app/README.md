# Multi-Region App Example

**Navigation**: [Docs Home](../../README.md) > [Examples](../README.md) > Multi-Region App

---

## Overview

This example demonstrates a multi-region, highly available web application with:
- Regional deployments (East US, West US 2)
- Traffic Manager for global load balancing
- Geo-replicated storage
- Regional databases

## Architecture

```
                   Traffic Manager (Global)
                           │
        ┌──────────────────┴──────────────────┐
        ▼                                     ▼
   East US Region                        West US 2 Region
   ┌─────────────┐                       ┌─────────────┐
   │  Web App    │                       │  Web App    │
   │  SQL DB     │                       │  SQL DB     │
   │  Storage    │◄─────Replication─────►│  Storage    │
   └─────────────┘                       └─────────────┘
```

## Prerequisites

- Node.js 18+
- Azure subscription with multi-region support
- Atakora CLI installed

## Infrastructure Code

### bin/app.ts

```typescript
import { App, Stack } from '@atakora/lib';
import { ResourceGroup } from '@atakora/cdk/resources';
import { AppServicePlan, WebApp } from '@atakora/cdk/web';
import { StorageAccount } from '@atakora/cdk/storage';

// Regional Stack
class RegionalStack extends Stack {
  public readonly webApp: WebApp;
  public readonly storage: StorageAccount;

  constructor(scope: App, id: string, region: string) {
    super(scope, id, {
      environment: 'production',
      location: region
    });

    const rg = new ResourceGroup(this, 'ResourceGroup', {
      location: this.location
    });

    const plan = new AppServicePlan(this, 'AppPlan', {
      resourceGroup: rg,
      sku: { name: 'P1v2', tier: 'PremiumV2' }
    });

    this.webApp = new WebApp(this, 'WebApp', {
      resourceGroup: rg,
      serverFarmId: plan.id,
      httpsOnly: true
    });

    this.storage = new StorageAccount(this, 'Storage', {
      resourceGroup: rg,
      sku: { name: 'Standard_GRS' }  // Geo-replicated
    });
  }
}

const app = new App();
new RegionalStack(app, 'multiregion-eastus', 'eastus');
new RegionalStack(app, 'multiregion-westus2', 'westus2');
app.synth();
```

## Deployment

### Deploy Both Regions

```bash
# Deploy East US
atakora deploy --package multiregion-eastus

# Deploy West US 2
atakora deploy --package multiregion-westus2
```

### Configure Traffic Manager

```bash
# Create Traffic Manager profile
az network traffic-manager profile create \
  --name tm-multiregion-prod \
  --resource-group rg-multiregion-global \
  --routing-method Performance \
  --unique-dns-name multiregion-prod

# Add endpoints
az network traffic-manager endpoint create \
  --name eastus-endpoint \
  --profile-name tm-multiregion-prod \
  --resource-group rg-multiregion-global \
  --type azureEndpoints \
  --target-resource-id /subscriptions/.../eastus-webapp \
  --priority 1

az network traffic-manager endpoint create \
  --name westus2-endpoint \
  --profile-name tm-multiregion-prod \
  --resource-group rg-multiregion-global \
  --type azureEndpoints \
  --target-resource-id /subscriptions/.../westus2-webapp \
  --priority 2
```

## Testing Failover

### Simulate Region Failure

```bash
# Disable East US endpoint
az network traffic-manager endpoint update \
  --name eastus-endpoint \
  --profile-name tm-multiregion-prod \
  --resource-group rg-multiregion-global \
  --endpoint-status Disabled

# Traffic now routes to West US 2
```

## Cost Estimate

Monthly cost (per region):
- App Service Plan (P1v2): ~$150
- Storage (GRS): ~$25
- Traffic Manager: ~$1

**Total**: ~$326/month (2 regions + Traffic Manager)

## See Also

- [Simple Web App Example](../simple-web-app/README.md)
- [Multi-Region Tutorial](../../guides/tutorials/multi-region-setup.md)

---

**Last Updated**: 2025-10-08
