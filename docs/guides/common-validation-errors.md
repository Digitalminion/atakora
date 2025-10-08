# Common Validation Errors

This guide documents all known deployment failures and validation errors in Atakora, with detailed explanations and fixes for each. Use this as a troubleshooting reference when you encounter validation errors.

## How to Use This Guide

Each error is documented with:

- **Error Code**: Unique identifier for the error
- **What Went Wrong**: Description of the problem
- **Why It Happened**: Root cause explanation
- **How to Fix**: Step-by-step solution
- **Example**: Before and after code

## Table of Contents

- [ARM Structure Errors](#arm-structure-errors)
  - [ARM001: Invalid Delegation Structure](#arm001-invalid-delegation-structure)
  - [ARM002: Subnet Address Prefix Incorrect](#arm002-subnet-address-prefix-incorrect)
  - [ARM003: Invalid Resource Reference](#arm003-invalid-resource-reference)
- [Deployment Timing Errors](#deployment-timing-errors)
  - [ARM004: Network Access Lockdown](#arm004-network-access-lockdown)
- [Networking Errors](#networking-errors)
  - [NET001: Subnet CIDR Outside VNet Range](#net001-subnet-cidr-outside-vnet-range)
  - [NET002: Overlapping Subnet Address Spaces](#net002-overlapping-subnet-address-spaces)
- [Security Errors](#security-errors)
  - [SEC001: NSG Rule Priority Conflict](#sec001-nsg-rule-priority-conflict)

---

## ARM Structure Errors

These errors occur when the generated ARM template structure doesn't match Azure's requirements.

### ARM001: Invalid Delegation Structure

**Error Message:**

```
ValidationError [ARM001]: Delegation structure requires properties wrapper
  at: MyStack/VNet/AppSubnet/delegation
  expected: { properties: { serviceName: "..." } }
  actual: { serviceName: "..." }
```

#### What Went Wrong

Subnet delegations in ARM templates must wrap the `serviceName` field inside a `properties` object. Atakora detected that your delegation object is missing this wrapper.

#### Why It Happened

Azure Resource Manager (ARM) requires specific structural patterns for nested resources. Delegations are nested resources within subnets, and ARM's schema mandates that delegation properties be wrapped in a `properties` field, even though this seems redundant.

This is an ARM-specific requirement that doesn't exist in other cloud providers, making it a common source of confusion.

#### How to Fix

Wrap your delegation's `serviceName` in a `properties` object:

**Before (Incorrect):**

```typescript
const subnet = new Subnet(vnet, 'AppSubnet', {
  addressPrefix: '10.0.1.0/24',
  delegation: {
    serviceName: 'Microsoft.Web/serverFarms', // ❌ Missing properties wrapper
  },
});
```

**After (Correct):**

```typescript
const subnet = new Subnet(vnet, 'AppSubnet', {
  addressPrefix: '10.0.1.0/24',
  delegation: {
    properties: {
      serviceName: 'Microsoft.Web/serverFarms', // ✅ Properly wrapped
    },
  },
});
```

#### Generated ARM JSON

The correct structure produces this ARM JSON:

```json
{
  "type": "Microsoft.Network/virtualNetworks/subnets",
  "name": "VNet/AppSubnet",
  "properties": {
    "addressPrefix": "10.0.1.0/24",
    "delegations": [
      {
        "name": "delegation",
        "properties": {
          "serviceName": "Microsoft.Web/serverFarms"
        }
      }
    ]
  }
}
```

#### Related Errors

- If you see deployment errors like `InvalidServiceNameOnDelegation`, this is the same root cause
- Gov Cloud deployments have the same requirement

---

### ARM002: Subnet Address Prefix Incorrect

**Error Message:**

```
ValidationError [ARM002]: Subnet addressPrefix must be inside properties object
  at: MyStack/VNet/AppSubnet
  expected: properties.addressPrefix = "10.0.1.0/24"
  actual: addressPrefix = "10.0.1.0/24" (wrong nesting level)
```

#### What Went Wrong

The subnet's `addressPrefix` field is at the wrong nesting level in the ARM template. It must be inside the `properties` object, not at the root of the subnet definition.

#### Why It Happened

This typically occurs when using older code or when the subnet properties haven't been properly transformed. ARM requires all subnet configuration (addressPrefix, delegations, serviceEndpoints, etc.) to be nested inside the `properties` field.

#### How to Fix

Ensure `addressPrefix` is properly nested in the subnet properties:

**Before (Incorrect):**

```typescript
// This is usually an internal transformation issue, but if you're
// manually constructing ARM templates or using raw props:
{
  name: 'MySubnet',
  addressPrefix: '10.0.1.0/24', // ❌ Wrong level
  properties: {
    // Other properties
  }
}
```

**After (Correct):**

```typescript
const subnet = new Subnet(vnet, 'MySubnet', {
  addressPrefix: '10.0.1.0/24', // ✅ Atakora handles nesting
});

// Generates correct ARM structure:
{
  name: 'MySubnet',
  properties: {
    addressPrefix: '10.0.1.0/24', // ✅ Properly nested
  }
}
```

#### If Using Subnet Construct

If you're using Atakora's `Subnet` construct and still seeing this error, it's likely a bug. Please report it with your code sample.

#### Azure Deployment Error

If you see this error during Azure deployment:

```
Code: NoAddressPrefixOrPoolProvided
Message: Subnet 'MySubnet' does not have address prefix or pool provided
```

This indicates the `addressPrefix` wasn't found at the expected location in your ARM template.

---

### ARM003: Invalid Resource Reference

**Error Message:**

```
ValidationError [ARM003]: Resource reference must use ARM expression syntax
  at: MyStack/AppSubnet/networkSecurityGroup
  expected: "[resourceId('Microsoft.Network/networkSecurityGroups', 'MyNSG')]"
  actual: "/subscriptions/.../networkSecurityGroups/MyNSG" (literal string)
```

#### What Went Wrong

Resource references in ARM templates must use ARM expression syntax (`[resourceId(...)]`), not literal strings. Atakora detected you're using a literal string where an ARM expression is required.

#### Why It Happened

ARM templates use a specific expression language for resource references. Literal strings don't establish proper dependencies, and ARM won't be able to resolve the resource correctly during deployment.

This often happens when:

- Copying resource IDs from Azure Portal
- Using hardcoded strings from documentation
- Trying to reference existing resources incorrectly

#### How to Fix

Use ARM expression syntax for resource references:

**Before (Incorrect):**

```typescript
const subnet = new Subnet(vnet, 'AppSubnet', {
  addressPrefix: '10.0.1.0/24',
  networkSecurityGroup: {
    // ❌ Literal string - no dependency tracking
    id: '/subscriptions/xxx/resourceGroups/rg/providers/Microsoft.Network/networkSecurityGroups/MyNSG',
  },
});
```

**After (Correct):**

For resources in the same template:

```typescript
const nsg = new NetworkSecurityGroup(stack, 'MyNSG', {
  // ... NSG configuration
});

const subnet = new Subnet(vnet, 'AppSubnet', {
  addressPrefix: '10.0.1.0/24',
  networkSecurityGroup: nsg, // ✅ Pass the construct
});

// Generates: "[resourceId('Microsoft.Network/networkSecurityGroups', 'MyNSG')]"
```

For existing resources:

```typescript
import { ResourceReference } from '@atakora/lib';

const existingNsg = ResourceReference.fromId(
  stack,
  'ExistingNSG',
  '/subscriptions/xxx/.../networkSecurityGroups/MyNSG'
);

const subnet = new Subnet(vnet, 'AppSubnet', {
  addressPrefix: '10.0.1.0/24',
  networkSecurityGroup: existingNsg, // ✅ Proper reference
});
```

#### Generated ARM JSON

Correct references use ARM expressions:

```json
{
  "type": "Microsoft.Network/virtualNetworks/subnets",
  "properties": {
    "networkSecurityGroup": {
      "id": "[resourceId('Microsoft.Network/networkSecurityGroups', 'MyNSG')]"
    }
  },
  "dependsOn": ["[resourceId('Microsoft.Network/networkSecurityGroups', 'MyNSG')]"]
}
```

---

## Deployment Timing Errors

These errors occur when resource configurations prevent Azure from provisioning them correctly.

### ARM004: Network Access Lockdown

**Error Message:**

```
ValidationError [ARM004]: Network access locked down before deployment
  resource: MyStack/Storage
  issue: publicNetworkAccess is 'Disabled' before deployment
  Azure Resource Manager needs network access to provision the resource
```

#### What Went Wrong

You've configured a service (like Storage Account, Key Vault, or Cosmos DB) with `publicNetworkAccess: 'Disabled'` in the initial deployment template. This prevents Azure Resource Manager from provisioning the resource.

#### Why It Happened

Azure Resource Manager needs network access to create and configure resources. When you set `publicNetworkAccess: 'Disabled'` in the deployment template, ARM can't complete the provisioning process, causing the deployment to timeout or fail.

This is a chicken-and-egg problem:

- You want the resource locked down for security
- But ARM needs access to create it
- The resource doesn't exist yet to lock down

#### How to Fix

**Option 1: Two-Phase Deployment (Recommended)**

Deploy the resource with network access enabled, then lock it down in a second step:

```typescript
// Phase 1: Initial deployment (first template)
const storage = new StorageAccount(stack, 'Storage', {
  name: 'mystorageaccount',
  publicNetworkAccess: 'Enabled', // ✅ Allow during deployment
  // Other configuration
});

// Deploy this template first

// Phase 2: Lock down (second template or policy)
// Use Azure Policy or update template after deployment
```

**Option 2: Use Private Endpoints with Delayed Lockdown**

```typescript
const storage = new StorageAccount(stack, 'Storage', {
  name: 'mystorageaccount',
  publicNetworkAccess: 'Enabled', // ✅ Enabled for deployment
});

const privateEndpoint = new PrivateEndpoint(stack, 'StoragePE', {
  resource: storage,
  subnet: privateSubnet,
});

// After successful deployment, update template or use policy:
// - Set publicNetworkAccess: 'Disabled'
// - Deploy update
```

**Option 3: Use Azure Policy (Best for Production)**

```typescript
// Deploy resources with network access enabled
const storage = new StorageAccount(stack, 'Storage', {
  publicNetworkAccess: 'Enabled',
});

// Apply Azure Policy to enforce network lockdown post-deployment
// Policy will lock down after resource is fully provisioned
```

#### Gov Cloud Considerations

Azure Government Cloud has the same requirement. Some organizations require network lockdown before deployment due to compliance, but Azure's architecture doesn't support this. Work with your security team to approve the two-phase approach.

#### Timeline

```
1. Deploy with publicNetworkAccess: 'Enabled'
   ↓ (ARM provisions resource - 2-5 minutes)
2. Resource fully provisioned
   ↓
3. Apply lockdown (policy, template update, or manual)
   ↓ (Lockdown applied - 1-2 minutes)
4. Resource secured
```

**Total time from deployment to secured: 3-7 minutes**

This is acceptable for most security frameworks when documented in deployment procedures.

---

## Networking Errors

These errors relate to network configuration and CIDR ranges.

### NET001: Subnet CIDR Outside VNet Range

**Error Message:**

```
ValidationError [NET001]: Subnet CIDR not within VNet range
  at: MyStack/VNet/AppSubnet
  subnet: 192.168.1.0/24
  vnet: 10.0.0.0/16
  Subnet must be within the VNet's address space
```

#### What Went Wrong

You've configured a subnet with an `addressPrefix` (CIDR range) that falls outside the VNet's `addressSpace`. All subnets must be within their parent VNet's address range.

#### Why It Happened

This usually happens when:

- Copy-pasting subnet configurations between different VNets
- Using default examples without updating CIDR ranges
- Misunderstanding CIDR notation

#### How to Fix

Ensure the subnet CIDR is within the VNet range:

**Before (Incorrect):**

```typescript
const vnet = new VirtualNetwork(stack, 'VNet', {
  addressSpace: ['10.0.0.0/16'], // VNet: 10.0.0.0 - 10.0.255.255
});

const subnet = new Subnet(vnet, 'AppSubnet', {
  addressPrefix: '192.168.1.0/24', // ❌ Outside VNet range!
});
```

**After (Correct):**

```typescript
const vnet = new VirtualNetwork(stack, 'VNet', {
  addressSpace: ['10.0.0.0/16'], // VNet: 10.0.0.0 - 10.0.255.255
});

const subnet = new Subnet(vnet, 'AppSubnet', {
  addressPrefix: '10.0.1.0/24', // ✅ Within VNet range
});
```

#### CIDR Range Quick Reference

```
VNet: 10.0.0.0/16
  ↓ Available range: 10.0.0.0 - 10.0.255.255
  ↓
  ├── Subnet 1: 10.0.1.0/24   ✅ (10.0.1.0 - 10.0.1.255)
  ├── Subnet 2: 10.0.2.0/24   ✅ (10.0.2.0 - 10.0.2.255)
  └── Subnet 3: 192.168.1.0/24 ❌ (outside range)
```

---

### NET002: Overlapping Subnet Address Spaces

**Error Message:**

```
ValidationError [NET002]: Overlapping subnet address spaces
  subnet1: MyStack/VNet/Subnet1 (10.0.1.0/24)
  subnet2: MyStack/VNet/Subnet2 (10.0.1.0/25)
  Subnet address spaces cannot overlap
```

#### What Went Wrong

You've defined two subnets with overlapping CIDR ranges. Each subnet must have a unique, non-overlapping address space.

#### Why It Happened

This typically occurs when:

- Reusing subnet configurations
- Incorrectly calculating CIDR ranges
- Not accounting for all subnets in the VNet

#### How to Fix

Ensure each subnet has a unique address range:

**Before (Incorrect):**

```typescript
const subnet1 = new Subnet(vnet, 'Subnet1', {
  addressPrefix: '10.0.1.0/24', // 10.0.1.0 - 10.0.1.255
});

const subnet2 = new Subnet(vnet, 'Subnet2', {
  addressPrefix: '10.0.1.0/25', // ❌ Overlaps with Subnet1!
  // 10.0.1.0 - 10.0.1.127 (contained within Subnet1)
});
```

**After (Correct):**

```typescript
const subnet1 = new Subnet(vnet, 'Subnet1', {
  addressPrefix: '10.0.1.0/24', // 10.0.1.0 - 10.0.1.255
});

const subnet2 = new Subnet(vnet, 'Subnet2', {
  addressPrefix: '10.0.2.0/24', // ✅ No overlap
  // 10.0.2.0 - 10.0.2.255
});
```

#### Subnet Planning Tool

Use this pattern to plan non-overlapping subnets:

```typescript
const VNetCIDR = '10.0.0.0/16';

// /24 subnets (256 addresses each)
const subnets = {
  gateway: '10.0.0.0/24', // .0 - .255
  app: '10.0.1.0/24', // .0 - .255
  data: '10.0.2.0/24', // .0 - .255
  private: '10.0.3.0/24', // .0 - .255
  // ... up to 10.0.255.0/24
};
```

---

## Security Errors

These errors relate to security configurations like Network Security Groups.

### SEC001: NSG Rule Priority Conflict

**Error Message:**

```
ValidationError [SEC001]: NSG rule priority conflict
  rule1: AllowHTTPS (priority: 100)
  rule2: AllowHTTP (priority: 100)
  Each rule must have a unique priority
```

#### What Went Wrong

You've configured two or more NSG rules with the same priority value. Each security rule in a Network Security Group must have a unique priority between 100 and 4096.

#### Why It Happened

This typically occurs when:

- Copy-pasting rule configurations
- Not tracking priority assignments
- Using default priority values

#### How to Fix

Assign unique priorities to each rule:

**Before (Incorrect):**

```typescript
const nsg = new NetworkSecurityGroup(stack, 'AppNSG', {
  securityRules: [
    {
      name: 'AllowHTTPS',
      priority: 100, // ❌
      direction: 'Inbound',
      access: 'Allow',
      protocol: 'Tcp',
      sourceAddressPrefix: '*',
      destinationAddressPrefix: '*',
      destinationPortRange: '443',
    },
    {
      name: 'AllowHTTP',
      priority: 100, // ❌ Duplicate priority!
      direction: 'Inbound',
      access: 'Allow',
      protocol: 'Tcp',
      sourceAddressPrefix: '*',
      destinationAddressPrefix: '*',
      destinationPortRange: '80',
    },
  ],
});
```

**After (Correct):**

```typescript
const nsg = new NetworkSecurityGroup(stack, 'AppNSG', {
  securityRules: [
    {
      name: 'AllowHTTPS',
      priority: 100, // ✅ Unique
      direction: 'Inbound',
      access: 'Allow',
      protocol: 'Tcp',
      sourceAddressPrefix: '*',
      destinationAddressPrefix: '*',
      destinationPortRange: '443',
    },
    {
      name: 'AllowHTTP',
      priority: 110, // ✅ Unique
      direction: 'Inbound',
      access: 'Allow',
      protocol: 'Tcp',
      sourceAddressPrefix: '*',
      destinationAddressPrefix: '*',
      destinationPortRange: '80',
    },
  ],
});
```

#### Priority Best Practices

Organize rules with a priority scheme:

```typescript
// Scheme: 100s = Critical allow, 200s = Standard allow,
//         300s = Logging, 4000s = Deny all

const securityRules = [
  // Critical allow rules
  { name: 'AllowHTTPS', priority: 100 },
  { name: 'AllowHTTP', priority: 110 },

  // Standard allow rules
  { name: 'AllowSSH', priority: 200 },
  { name: 'AllowRDP', priority: 210 },

  // Logging rules
  { name: 'LogDenied', priority: 3000 },

  // Deny all (lowest priority)
  { name: 'DenyAll', priority: 4096 },
];
```

**Priority rules:**

- Lower numbers = higher priority (processed first)
- Range: 100-4096
- Leave gaps (10-100) between rules for future additions
- Azure has default deny rules at priority 65000+

---

## Getting Help

### Can't Find Your Error?

If you're experiencing an error not listed here:

1. **Check Error Code Reference**: See [Error Codes](../reference/error-codes.md) for all error codes
2. **Search Issues**: Check [GitHub Issues](https://github.com/digital-minion/atakora/issues) for similar problems
3. **Create Issue**: Open a new issue with:
   - Error message and code
   - Minimal code sample that reproduces the error
   - Generated ARM template (if available)
   - Azure deployment error (if it got that far)

### Additional Resources

- [Validation Architecture](./validation-architecture.md) - Understanding the validation system
- [Error Code Reference](../reference/error-codes.md) - Complete error code index
- [ARM Template Structure](./arm-template-structure.md) - Understanding ARM requirements
- [Testing Guide](./testing-infrastructure.md) - Testing your infrastructure code

### Contributing

Found an error not documented here? Please contribute:

1. Fork the repository
2. Add the error to this guide following the format
3. Include code examples showing the problem and solution
4. Submit a pull request

Help us build a comprehensive error catalog for the community!
