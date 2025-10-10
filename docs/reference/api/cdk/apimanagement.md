# API Management Resources API (@atakora/cdk/apimanagement)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > API Management

---

## Overview

The apimanagement namespace provides constructs for Azure API Management (APIM), a fully managed service for publishing, securing, transforming, maintaining, and monitoring APIs. APIM acts as a facade for backend services and provides features like rate limiting, authentication, caching, and request/response transformation.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import {
  Service,
  ServiceApis,
  ServiceProducts,
  ServiceSubscriptions,
  ServicePolicies,
  ApiManagementSkuName,
  VirtualNetworkType
} from '@atakora/cdk/apimanagement';
```

## Classes

### Service (API Management Service)

Creates an Azure API Management service instance.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `serviceName` | `string` | Service name (globally unique) |
| `location` | `string` | Azure region |
| `apiManagementId` | `string` | ARM resource ID |
| `gatewayUrl` | `string` | Gateway URL for API calls |
| `managementUrl` | `string` | Management API URL |

#### ServiceProps

```typescript
interface ServiceProps {
  readonly serviceName?: string;  // Auto-generated if not provided
  readonly location?: string;     // Defaults to parent location
  readonly sku?: ApiManagementSkuName;  // Default: Developer (non-prod) / Premium (prod)
  readonly capacity?: number;     // Default: 1
  readonly publisherName: string; // Required
  readonly publisherEmail: string; // Required
  readonly notificationSenderEmail?: string;
  readonly enableSystemIdentity?: boolean;  // Default: true
  readonly virtualNetworkType?: VirtualNetworkType;  // Default: None
  readonly subnetId?: string;  // Required if VNet integration
  readonly additionalLocations?: AdditionalLocation[];
  readonly hostnameConfigurations?: HostnameConfiguration[];
  readonly disableLegacyTls?: boolean;  // Default: true
  readonly publicNetworkAccess?: 'Enabled' | 'Disabled';
  readonly tags?: Record<string, string>;
}
```

#### Types

```typescript
enum ApiManagementSkuName {
  DEVELOPER = 'Developer',      // Dev/test, no SLA
  BASIC = 'Basic',              // Light production
  STANDARD = 'Standard',        // Production
  PREMIUM = 'Premium',          // Enterprise, multi-region
  CONSUMPTION = 'Consumption',  // Serverless
  ISOLATED = 'Isolated'         // Dedicated infrastructure
}

enum VirtualNetworkType {
  NONE = 'None',               // No VNet integration
  EXTERNAL = 'External',       // Gateway accessible from internet
  INTERNAL = 'Internal'        // Gateway only accessible from VNet
}

interface AdditionalLocation {
  readonly location: string;
  readonly sku: ApiManagementSku;
  readonly virtualNetworkConfiguration?: VirtualNetworkConfiguration;
  readonly publicIpAddressId?: string;
}
```

#### Examples

**Basic API Management**:
```typescript
import { Service } from '@atakora/cdk/apimanagement';

const apim = new Service(resourceGroup, 'Gateway', {
  publisherName: 'Contoso',
  publisherEmail: 'admin@contoso.com'
});
```

**Premium with VNet Integration**:
```typescript
const apim = new Service(resourceGroup, 'EnterpriseGateway', {
  sku: ApiManagementSkuName.PREMIUM,
  capacity: 2,
  publisherName: 'Contoso',
  publisherEmail: 'admin@contoso.com',
  virtualNetworkType: VirtualNetworkType.INTERNAL,
  subnetId: apimSubnet.id,
  publicNetworkAccess: 'Disabled'
});
```

**Multi-Region Deployment**:
```typescript
const apim = new Service(resourceGroup, 'GlobalGateway', {
  sku: ApiManagementSkuName.PREMIUM,
  capacity: 2,
  publisherName: 'Contoso',
  publisherEmail: 'admin@contoso.com',
  additionalLocations: [
    {
      location: 'westus2',
      sku: { name: ApiManagementSkuName.PREMIUM, capacity: 2 }
    },
    {
      location: 'northeurope',
      sku: { name: ApiManagementSkuName.PREMIUM, capacity: 2 }
    }
  ]
});
```

---

### ServiceApis

Creates an API within an API Management service.

#### ServiceApisProps

```typescript
interface ServiceApisProps {
  readonly apiManagementService: IService;
  readonly apiName?: string;  // Derived from construct ID if not provided
  readonly displayName: string;
  readonly description?: string;
  readonly serviceUrl: string;  // Backend service URL
  readonly path?: string;  // API path, defaults to API name
  readonly protocols?: readonly ApiProtocol[];  // Default: HTTPS only
  readonly type?: ApiType;  // Default: HTTP
  readonly subscriptionRequired?: boolean;  // Default: true
  readonly subscriptionKeyParameterNames?: SubscriptionKeyParameterNames;
}
```

#### Examples

**Basic API**:
```typescript
import { ServiceApis, ApiProtocol } from '@atakora/cdk/apimanagement';

const api = new ServiceApis(apim, 'UsersApi', {
  apiManagementService: apim,
  displayName: 'Users API',
  serviceUrl: 'https://backend.contoso.com/users',
  path: 'users',
  protocols: [ApiProtocol.HTTPS]
});
```

---

### ServiceProducts

Creates a product (collection of APIs) in API Management.

#### ServiceProductsProps

```typescript
interface ServiceProductsProps {
  readonly apiManagementService: IService;
  readonly productName?: string;
  readonly displayName: string;
  readonly description?: string;
  readonly subscriptionRequired?: boolean;  // Default: true
  readonly approvalRequired?: boolean;  // Default: false
  readonly subscriptionsLimit?: number;
  readonly state?: ProductState;  // Default: Published
  readonly terms?: string;
}
```

#### Examples

**Basic Product**:
```typescript
import { ServiceProducts, ProductState } from '@atakora/cdk/apimanagement';

const product = new ServiceProducts(apim, 'StandardProduct', {
  apiManagementService: apim,
  displayName: 'Standard API Access',
  description: 'Standard tier API access',
  subscriptionRequired: true,
  approvalRequired: false,
  state: ProductState.PUBLISHED
});
```

---

### ServiceSubscriptions

Creates a subscription for accessing APIs.

#### Examples

**API Subscription**:
```typescript
import { ServiceSubscriptions } from '@atakora/cdk/apimanagement';

const subscription = new ServiceSubscriptions(apim, 'ClientSubscription', {
  apiManagementService: apim,
  displayName: 'Client App Subscription',
  scopeProduct: product
});
```

---

### ServicePolicies

Applies policies to APIs or the global service.

#### Examples

**Global Policy**:
```typescript
import { ServicePolicies } from '@atakora/cdk/apimanagement';

const globalPolicy = new ServicePolicies(apim, 'GlobalPolicy', {
  parent: apim,
  policyXml: `
    <policies>
      <inbound>
        <rate-limit calls="100" renewal-period="60" />
        <cors allow-credentials="true">
          <allowed-origins>
            <origin>https://app.contoso.com</origin>
          </allowed-origins>
          <allowed-methods>
            <method>GET</method>
            <method>POST</method>
          </allowed-methods>
        </cors>
      </inbound>
      <backend>
        <forward-request />
      </backend>
      <outbound />
      <on-error />
    </policies>
  `
});
```

**API-Specific Policy**:
```typescript
const apiPolicy = new ServicePolicies(api, 'ApiPolicy', {
  parent: api,
  policyXml: `
    <policies>
      <inbound>
        <set-header name="X-API-Version" exists-action="override">
          <value>v1</value>
        </set-header>
        <cache-lookup vary-by-developer="false" vary-by-developer-groups="false" />
      </inbound>
      <backend>
        <forward-request />
      </backend>
      <outbound>
        <cache-store duration="3600" />
      </outbound>
    </policies>
  `
});
```

---

## Common Patterns

### Complete API Gateway Setup

```typescript
import { Service, ServiceApis, ServiceProducts, ServiceSubscriptions, ServicePolicies } from '@atakora/cdk/apimanagement';

// Create APIM service
const apim = new Service(resourceGroup, 'Gateway', {
  sku: ApiManagementSkuName.STANDARD,
  publisherName: 'Contoso',
  publisherEmail: 'admin@contoso.com'
});

// Create APIs
const usersApi = new ServiceApis(apim, 'UsersApi', {
  apiManagementService: apim,
  displayName: 'Users API',
  serviceUrl: 'https://backend.contoso.com/users',
  path: 'users'
});

const ordersApi = new ServiceApis(apim, 'OrdersApi', {
  apiManagementService: apim,
  displayName: 'Orders API',
  serviceUrl: 'https://backend.contoso.com/orders',
  path: 'orders'
});

// Create product
const product = new ServiceProducts(apim, 'StandardProduct', {
  apiManagementService: apim,
  displayName: 'Standard Access',
  subscriptionRequired: true
});

// Apply rate limiting policy
const policy = new ServicePolicies(apim, 'RateLimiting', {
  parent: apim,
  policyXml: `
    <policies>
      <inbound>
        <rate-limit calls="1000" renewal-period="3600" />
      </inbound>
      <backend><forward-request /></backend>
      <outbound />
    </policies>
  `
});
```

---

## Government Cloud Considerations

### Availability
API Management is available in Azure Government Cloud with most features.

**Available Regions**:
- US Gov Virginia
- US Gov Texas
- US Gov Arizona

### Limitations
- Consumption tier not available in Gov Cloud
- Some portal features may have limited functionality
- Developer portal customization may be restricted

### Endpoints
- Commercial: `{service}.azure-api.net`
- Gov Cloud: `{service}.azure-api.us`

### Compliance
- FedRAMP High
- DoD Impact Level 5

---

## SKU Comparison

### Developer
- **Capacity**: 1 unit (fixed)
- **Throughput**: ~500 requests/sec
- **Use Case**: Development and testing
- **SLA**: None
- **Features**: Full features except multi-region

### Standard
- **Capacity**: 1-4 units
- **Throughput**: ~2,500 requests/sec per unit
- **Use Case**: Production workloads
- **SLA**: 99.95%
- **Features**: Full features except multi-region

### Premium
- **Capacity**: 1-12 units per region
- **Throughput**: ~4,000 requests/sec per unit
- **Use Case**: Enterprise, multi-region
- **SLA**: 99.95% (99.99% with zones)
- **Features**: All features including multi-region, VNet, zones

### Consumption
- **Capacity**: Auto-scale
- **Throughput**: Varies
- **Use Case**: Serverless, event-driven
- **SLA**: 99.95%
- **Features**: Serverless execution model

---

## Policy Examples

### JWT Validation
```xml
<policies>
  <inbound>
    <validate-jwt header-name="Authorization" failed-validation-httpcode="401">
      <openid-config url="https://login.microsoftonline.com/{tenant}/.well-known/openid-configuration" />
      <audiences>
        <audience>api://{app-id}</audience>
      </audiences>
      <required-claims>
        <claim name="roles" match="any">
          <value>user</value>
        </claim>
      </required-claims>
    </validate-jwt>
  </inbound>
</policies>
```

### Response Caching
```xml
<policies>
  <inbound>
    <cache-lookup vary-by-developer="false" vary-by-developer-groups="false">
      <vary-by-query-parameter>category</vary-by-query-parameter>
    </cache-lookup>
  </inbound>
  <outbound>
    <cache-store duration="3600" />
  </outbound>
</policies>
```

### Request Transformation
```xml
<policies>
  <inbound>
    <set-header name="X-Forwarded-For" exists-action="override">
      <value>@(context.Request.IpAddress)</value>
    </set-header>
    <rewrite-uri template="/api/v2/{path}" />
  </inbound>
</policies>
```

---

## See Also

- [Network Resources](./network.md) - VNet integration
- [Key Vault Resources](./keyvault.md) - Secret management for backend credentials
- [Insights Resources](./insights.md) - Monitoring and analytics
- [Azure APIM Documentation](https://docs.microsoft.com/azure/api-management/)

---

**Last Updated**: 2025-10-09
**Version**: @atakora/cdk 1.0.0
