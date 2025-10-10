# Resources API (@atakora/cdk/resources)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > Resources

---

## Overview

The resources namespace provides constructs for fundamental Azure resource management including resource groups. Resource groups are logical containers that hold related Azure resources, providing a way to organize, manage, and control access to resources as a unit.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import { ResourceGroups } from '@atakora/cdk/resources';
```

## Classes

### ResourceGroups

Creates an Azure Resource Group for organizing and managing related Azure resources.

#### Class Signature

```typescript
class ResourceGroups extends Construct implements IResourceGroup {
  constructor(scope: Construct, id: string, props?: ResourceGroupsProps);
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `resourceGroupName` | `string` | Resource group name |
| `location` | `string` | Azure region |
| `tags` | `Record<string, string>` | Resource tags |

#### ResourceGroupsProps

```typescript
interface ResourceGroupsProps {
  /**
   * Name of the resource group
   * Auto-generated if not provided
   * Format: rg-{org}-{project}-{purpose}-{env}-{geo}-{instance}
   */
  readonly resourceGroupName?: string;

  /**
   * Azure region
   * Defaults to parent stack's geography location
   */
  readonly location?: string;

  /**
   * Tags to apply
   * Merged with parent stack's tags
   */
  readonly tags?: Record<string, string>;
}
```

#### Types

```typescript
interface IResourceGroup {
  readonly resourceGroupName: string;
  readonly location: string;
}
```

#### Examples

**Basic Resource Group**:
```typescript
import { ResourceGroups } from '@atakora/cdk/resources';
import { SubscriptionStack } from '@atakora/core';

// Create subscription stack
const stack = new SubscriptionStack(app, 'Production', {
  subscriptionId: '00000000-0000-0000-0000-000000000000',
  location: 'eastus',
  tags: {
    environment: 'production',
    project: 'myapp'
  }
});

// Create resource group with auto-generated name
const resourceGroup = new ResourceGroups(stack, 'DataRG');
// Name: rg-myorg-myapp-datarg-prod-eus-00
```

**Custom Resource Group Name**:
```typescript
const resourceGroup = new ResourceGroups(stack, 'DataRG', {
  resourceGroupName: 'rg-myapp-data-prod-001',
  tags: { purpose: 'database-hosting' }
});
```

**Resource Group in Different Region**:
```typescript
// Stack is in East US, but this resource group is in West US 2
const westResourceGroup = new ResourceGroups(stack, 'WestRG', {
  location: 'westus2',
  tags: { purpose: 'west-coast-services' }
});
```

**Resource Group as Parent**:
```typescript
import { ResourceGroups } from '@atakora/cdk/resources';
import { VirtualNetwork } from '@atakora/cdk/network';
import { StorageAccount } from '@atakora/cdk/storage';

// Create resource group
const networkRG = new ResourceGroups(stack, 'NetworkRG', {
  tags: { purpose: 'networking' }
});

// Create resources within the resource group
const vnet = new VirtualNetwork(networkRG, 'MainVNet', {
  addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
});

const storage = new StorageAccount(networkRG, 'Logs', {
  sku: { name: 'Standard_LRS' }
});
```

---

## Naming Convention

Resource groups follow the standard Azure naming convention:

**Format**: `rg-{org}-{project}-{purpose}-{env}-{geo}-{instance}`

**Components**:
- `rg`: Resource type abbreviation
- `org`: Organization name (from stack)
- `project`: Project name (from stack)
- `purpose`: Derived from construct ID
- `env`: Environment (dev/test/prod from stack)
- `geo`: Geography abbreviation (eus, wus2, etc.)
- `instance`: Instance number (00, 01, etc.)

**Examples**:
```typescript
// Construct ID: 'DataRG'
// Generated: rg-contoso-webapp-datarg-prod-eus-00

// Construct ID: 'NetworkRG'
// Generated: rg-contoso-webapp-networkrg-prod-eus-00

// Construct ID: 'Compute'
// Generated: rg-contoso-webapp-compute-prod-eus-00
```

---

## Resource Organization Patterns

### Single Resource Group

Simplest pattern - all resources in one group:

```typescript
const rg = new ResourceGroups(stack, 'Main');

const storage = new StorageAccount(rg, 'Storage');
const vnet = new VirtualNetwork(rg, 'VNet');
const appService = new AppServicePlan(rg, 'AppPlan');
```

**Best For**:
- Simple applications
- Development environments
- Single-purpose workloads

### Resource Groups by Type

Organize by resource type:

```typescript
const networkRG = new ResourceGroups(stack, 'Network', {
  tags: { layer: 'network' }
});

const computeRG = new ResourceGroups(stack, 'Compute', {
  tags: { layer: 'compute' }
});

const dataRG = new ResourceGroups(stack, 'Data', {
  tags: { layer: 'data' }
});

const vnet = new VirtualNetwork(networkRG, 'VNet');
const appPlan = new AppServicePlan(computeRG, 'AppPlan');
const sqlServer = new SqlServer(dataRG, 'SqlServer');
```

**Best For**:
- Medium to large applications
- Different lifecycle requirements
- Separate RBAC requirements

### Resource Groups by Environment Layer

Organize by application tier:

```typescript
const webRG = new ResourceGroups(stack, 'Web', {
  tags: { tier: 'presentation' }
});

const apiRG = new ResourceGroups(stack, 'Api', {
  tags: { tier: 'business-logic' }
});

const databaseRG = new ResourceGroups(stack, 'Database', {
  tags: { tier: 'data' }
});
```

**Best For**:
- Multi-tier applications
- Microservices architectures
- Team-based resource ownership

### Resource Groups by Lifecycle

Organize by deployment lifecycle:

```typescript
const sharedRG = new ResourceGroups(stack, 'Shared', {
  tags: { lifecycle: 'permanent' }
});

const appRG = new ResourceGroups(stack, 'Application', {
  tags: { lifecycle: 'frequent-updates' }
});

const tempRG = new ResourceGroups(stack, 'Temporary', {
  tags: { lifecycle: 'ephemeral' }
});
```

**Best For**:
- Resources with different update frequencies
- Shared infrastructure vs. application resources
- Testing and experimentation

---

## Tagging Strategy

### Standard Tags

```typescript
const rg = new ResourceGroups(stack, 'Production', {
  tags: {
    environment: 'production',
    project: 'customer-portal',
    costCenter: 'IT-1234',
    owner: 'platform-team@company.com',
    criticality: 'tier-1',
    dataClassification: 'confidential'
  }
});
```

### Inheriting Stack Tags

```typescript
// Stack-level tags
const stack = new SubscriptionStack(app, 'Production', {
  subscriptionId: '...',
  location: 'eastus',
  tags: {
    environment: 'production',
    managedBy: 'atakora-cdk'
  }
});

// Resource group inherits and merges tags
const rg = new ResourceGroups(stack, 'Web', {
  tags: {
    layer: 'web-tier'  // Merged with stack tags
  }
});
// Result: { environment: 'production', managedBy: 'atakora-cdk', layer: 'web-tier' }
```

### Tagging for Cost Allocation

```typescript
const rg = new ResourceGroups(stack, 'CustomerPortal', {
  tags: {
    costCenter: '12345',
    department: 'Engineering',
    project: 'customer-portal',
    billTo: 'Product-Team-A'
  }
});
```

---

## Access Control (RBAC)

Resource groups are the primary scope for role-based access control:

### Owner Access
```typescript
// Grant team full control over a resource group
const teamRG = new ResourceGroups(stack, 'Team', {
  tags: { team: 'platform-engineers' }
});

// Use Azure Portal or CLI to assign Owner role to the team
// az role assignment create --assignee <team-group-id> \
//   --role Owner --resource-group <resource-group-name>
```

### Contributor Access
```typescript
// Developers can manage resources but not assign roles
const devRG = new ResourceGroups(stack, 'Development', {
  tags: { access: 'development-team-contributor' }
});
```

### Reader Access
```typescript
// Read-only access for auditing
const auditRG = new ResourceGroups(stack, 'Audit', {
  tags: { access: 'auditors-read-only' }
});
```

---

## Lifecycle Management

### Resource Group Deletion

When you delete a resource group:
- All resources within are deleted
- Deletion cannot be undone
- Use locks to prevent accidental deletion

```typescript
const criticalRG = new ResourceGroups(stack, 'Critical', {
  tags: { protected: 'true' }
});

// Apply lock via Azure Portal or CLI
// az lock create --name DontDelete --lock-type CanNotDelete \
//   --resource-group <resource-group-name>
```

### Moving Resources

Resources can be moved between resource groups:

```typescript
// Original resource group
const devRG = new ResourceGroups(devStack, 'Development');
const storage = new StorageAccount(devRG, 'DevStorage');

// Later, move storage to production using Azure Portal or CLI
const prodRG = new ResourceGroups(prodStack, 'Production');
// az resource move --destination-group <prod-rg-name> \
//   --ids <storage-resource-id>
```

---

## Multi-Region Deployments

### Regional Resource Groups

```typescript
const eastStack = new SubscriptionStack(app, 'East', {
  subscriptionId: '...',
  location: 'eastus'
});

const westStack = new SubscriptionStack(app, 'West', {
  subscriptionId: '...',
  location: 'westus2'
});

const eastRG = new ResourceGroups(eastStack, 'Application');
// Name: rg-myorg-myapp-application-prod-eus-00

const westRG = new ResourceGroups(westStack, 'Application');
// Name: rg-myorg-myapp-application-prod-wus2-00
```

### Cross-Region Resource Groups

```typescript
// Stack in East US
const stack = new SubscriptionStack(app, 'Production', {
  subscriptionId: '...',
  location: 'eastus'
});

// Resource group in West US 2
const westRG = new ResourceGroups(stack, 'WestServices', {
  location: 'westus2',
  tags: { region: 'west-coast' }
});
```

---

## Government Cloud Considerations

### Availability
Resource groups are fully available in Azure Government Cloud with identical functionality to commercial cloud.

**Available Regions**:
- US Gov Virginia
- US Gov Texas
- US Gov Arizona
- US DoD East
- US DoD Central

### Naming Conventions
Use the same naming patterns in Gov Cloud:

```typescript
const govStack = new SubscriptionStack(app, 'GovProd', {
  subscriptionId: '...',
  location: 'usgovvirginia',
  tags: { cloud: 'government' }
});

const rg = new ResourceGroups(govStack, 'Secure', {
  tags: {
    classification: 'controlled-unclassified',
    compliance: 'FedRAMP-High'
  }
});
```

### Compliance Tagging
```typescript
const complianceRG = new ResourceGroups(stack, 'Compliance', {
  tags: {
    classification: 'CUI',
    compliance: 'FedRAMP-High',
    impactLevel: 'IL5',
    dataResidency: 'US-Government'
  }
});
```

### No Feature Differences
- Same API
- Same naming rules
- Same RBAC model
- Same tagging capabilities
- Same resource limits

---

## Best Practices

### Naming
- Use descriptive construct IDs that become part of the name
- Let the framework auto-generate names for consistency
- Only override names when required by external systems

```typescript
// Good: Descriptive ID
const dataRG = new ResourceGroups(stack, 'CustomerData');

// Avoid: Generic ID requiring manual naming
const rg = new ResourceGroups(stack, 'RG1', {
  resourceGroupName: 'rg-customer-data-prod-001'
});
```

### Organization
- Create separate resource groups for different lifecycles
- Use resource groups to align with team structure
- Group resources that are managed together

### Tagging
- Inherit common tags from the stack
- Add resource-group-specific tags for granular control
- Use tags for cost allocation and governance

### Security
- Apply principle of least privilege
- Use RBAC at resource group level
- Consider resource locks for critical groups

### Cleanup
- Delete resource groups to remove all contained resources
- Use naming conventions to identify environment-specific groups
- Implement automated cleanup for development/test groups

---

## Limitations

### Per Subscription
- Maximum 980 resource groups per subscription
- Can request limit increase to subscription limit

### Per Resource Group
- Maximum 800 resources per resource group per resource type
- Some resource types have lower limits

### Naming
- Maximum 90 characters
- Can contain alphanumeric, underscore, parentheses, hyphen, period
- Cannot end with a period

### Location
- Resource group location is metadata only
- Resources within can be in different regions
- Cannot change location after creation (must recreate)

---

## See Also

- [Network Resources](./network.md) - Virtual networks and networking
- [Storage Resources](./storage.md) - Storage accounts and blobs
- [Web Resources](./web.md) - App Services and hosting
- [Getting Started Guide](../../../getting-started/your-first-stack.md) - Creating your first stack

---

**Last Updated**: 2025-10-09
**Version**: @atakora/cdk 1.0.0
