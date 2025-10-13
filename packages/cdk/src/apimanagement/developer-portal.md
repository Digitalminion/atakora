# Azure API Management Developer Portal

A comprehensive specification for implementing Developer Portal functionality in Atakora.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Resource Specifications](#resource-specifications)
4. [Implementation Guide](#implementation-guide)
5. [Use Cases & Examples](#use-cases--examples)
6. [Best Practices](#best-practices)
7. [Security Considerations](#security-considerations)

---

## Overview

### What is the Developer Portal?

The Azure API Management Developer Portal is a **fully customizable, automatically generated website** that serves as a self-service hub for API consumers. It's hosted by Azure APIM and provides:

- **API Discovery**: Browse and search available APIs
- **Interactive Documentation**: Auto-generated from OpenAPI/GraphQL schemas
- **API Testing**: Try-it-out console with live requests
- **Self-Service Subscriptions**: Developers manage their own API keys
- **Community Features**: Issues, wikis, ratings, and comments
- **User Management**: Sign-up, authentication, and profile management

### Key Benefits

| Benefit | Without Portal | With Portal |
|---------|----------------|-------------|
| **Onboarding Time** | Hours to days | 15-30 minutes |
| **Documentation** | Manual, often outdated | Auto-generated, always current |
| **API Key Management** | Manual provisioning | Self-service |
| **Support Burden** | High (constant "how do I?" questions) | Low (self-documenting) |
| **Developer Experience** | Fragmented (docs, keys, testing separate) | Unified platform |

### When to Use the Developer Portal

✅ **Use it when**:
- You have 5+ APIs with multiple consumers
- You want to offer APIs to external partners or the public
- You need to reduce API onboarding friction
- You want self-service API key management
- You need to monetize APIs with tiered access
- You have compliance requirements for API access tracking

❌ **Skip it when**:
- You have 1-2 internal APIs with very few consumers
- APIs are purely machine-to-machine with no human interaction
- You have a custom developer portal already built
- Your team is tiny (< 5 people) and informal communication works

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Developer Portal Website                 │
│              https://{service}.developer.azure-api.net      │
│                  (or custom domain: developers.company.com) │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Manages
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Management Service                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Identity   │  │    Users     │  │    Groups    │      │
│  │  Providers   │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Products   │  │ Subscriptions│  │     APIs     │      │
│  │              │◄─┤              │─►│              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                                     │             │
│         │                                     ▼             │
│         │                          ┌──────────────┐         │
│         │                          │   Issues     │         │
│         │                          │   Wikis      │         │
│         │                          └──────────────┘         │
│         │                                                   │
│         ▼                                                   │
│  ┌──────────────┐                                          │
│  │   Product    │                                          │
│  │   Groups     │  (Access Control)                        │
│  └──────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

### Portal User Journey

```
Developer Journey:
┌──────────────┐
│  Discovers   │  → Searches Google, finds developers.company.com
│    Portal    │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Signs Up   │  → Creates account OR signs in with Azure AD/Google/etc.
│              │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Browses    │  → Views API catalog, reads interactive docs
│     APIs     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Subscribes  │  → Selects product tier (Free/Pro/Enterprise)
│  to Product  │  → Gets subscription key automatically
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Tests API   │  → Uses "Try it" console in browser
│              │  → Sees live request/response
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Integrates  │  → Copies code samples (C#, Python, curl, etc.)
│              │  → Starts using API in their app
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Manages    │  → Views usage analytics
│ Subscription │  → Regenerates keys, upgrades tier
└──────────────┘
```

---

## Resource Specifications

### 1. Users

**ARM Resource Type**: `Microsoft.ApiManagement/service/users`

**Purpose**: Represents a developer account in the portal.

#### TypeScript Interface

```typescript
/**
 * User properties for API Management service
 */
export interface UserProps {
  /**
   * Email address. Must be unique within the service instance.
   *
   * @example "developer@partner.com"
   */
  email: string;

  /**
   * First name
   *
   * @example "John"
   */
  firstName: string;

  /**
   * Last name
   *
   * @example "Developer"
   */
  lastName: string;

  /**
   * User state
   *
   * - `active`: User can sign in and use APIs
   * - `blocked`: User cannot sign in
   * - `pending`: User registered but not yet activated
   * - `deleted`: Soft-deleted user
   *
   * @default "active"
   */
  state?: 'active' | 'blocked' | 'pending' | 'deleted';

  /**
   * Optional note about the user
   *
   * @example "Partner integration team lead"
   */
  note?: string;

  /**
   * User identities for external authentication
   *
   * @remarks
   * Used when user signs in via Azure AD, Google, etc.
   */
  identities?: UserIdentity[];

  /**
   * Confirmation type for account activation
   *
   * - `signup`: Send signup email
   * - `invite`: Send invitation email
   *
   * @default "signup"
   */
  confirmation?: 'signup' | 'invite';

  /**
   * Password (only for basic authentication)
   *
   * @remarks
   * If not provided, user must reset password on first login
   * or use external identity provider
   */
  password?: string;
}

/**
 * User identity for external authentication
 */
export interface UserIdentity {
  /**
   * Identity provider name
   *
   * @example "aad", "google", "facebook", "twitter"
   */
  provider: string;

  /**
   * Identifier value within the provider
   *
   * @example "user@company.onmicrosoft.com"
   */
  id: string;
}
```

#### ARM Template Structure

```json
{
  "type": "Microsoft.ApiManagement/service/users",
  "apiVersion": "2023-03-01-preview",
  "name": "[concat(parameters('serviceName'), '/', parameters('userId'))]",
  "properties": {
    "email": "developer@partner.com",
    "firstName": "John",
    "lastName": "Developer",
    "state": "active",
    "note": "Partner integration team",
    "confirmation": "signup",
    "identities": [
      {
        "provider": "aad",
        "id": "john.developer@partner.onmicrosoft.com"
      }
    ]
  }
}
```

#### Construct Class

```typescript
import { Construct } from '@atakora/cdk/core';
import { generateUserArm } from './arm';
import type { UserProps } from './types';

/**
 * Represents a developer user in API Management
 *
 * @remarks
 * Users can sign in to the Developer Portal, subscribe to products,
 * and manage their API subscriptions.
 *
 * @example
 * Basic user creation:
 * ```typescript
 * const user = new User(this, 'PartnerDev', {
 *   email: 'dev@partner.com',
 *   firstName: 'John',
 *   lastName: 'Developer',
 *   state: 'active',
 *   confirmation: 'invite'
 * });
 * ```
 *
 * @example
 * User with Azure AD identity:
 * ```typescript
 * const user = new User(this, 'InternalDev', {
 *   email: 'internal@company.com',
 *   firstName: 'Jane',
 *   lastName: 'Engineer',
 *   identities: [{
 *     provider: 'aad',
 *     id: 'jane@company.onmicrosoft.com'
 *   }]
 * });
 * ```
 */
export class User extends Construct {
  public readonly userId: string;
  public readonly email: string;

  constructor(scope: Construct, id: string, props: UserProps) {
    super(scope, id);

    this.userId = id.toLowerCase();
    this.email = props.email;

    // Generate ARM template
    const armResource = generateUserArm(this.userId, props);
    this.addResource(armResource);
  }
}
```

#### Usage Examples

```typescript
// Example 1: Create partner developer
const partnerDev = new User(this, 'PartnerDev', {
  email: 'dev@partner.com',
  firstName: 'John',
  lastName: 'Developer',
  state: 'active',
  note: 'Partner integration team lead',
  confirmation: 'invite' // Send invitation email
});

// Example 2: Create internal developer with Azure AD
const internalDev = new User(this, 'InternalDev', {
  email: 'jane@company.com',
  firstName: 'Jane',
  lastName: 'Engineer',
  identities: [{
    provider: 'aad',
    id: 'jane@company.onmicrosoft.com'
  }]
});

// Example 3: Create blocked user (temporarily suspended)
const suspendedUser = new User(this, 'SuspendedDev', {
  email: 'suspended@example.com',
  firstName: 'Suspended',
  lastName: 'User',
  state: 'blocked',
  note: 'Violated API usage terms'
});
```

---

### 2. Groups

**ARM Resource Type**: `Microsoft.ApiManagement/service/groups`

**Purpose**: Organize users and control access to products.

#### Built-in Groups

Azure APIM includes three built-in groups:

| Group | ID | Description |
|-------|-----|-------------|
| **Administrators** | `administrators` | Azure subscription admins, full access |
| **Developers** | `developers` | All authenticated portal users |
| **Guests** | `guests` | Unauthenticated portal visitors |

#### TypeScript Interface

```typescript
/**
 * Group properties for API Management service
 */
export interface GroupProps {
  /**
   * Group display name
   *
   * @example "Partner Developers"
   */
  displayName: string;

  /**
   * Group description
   *
   * @example "External partner organizations with API access"
   */
  description?: string;

  /**
   * Group type
   *
   * - `custom`: User-defined group
   * - `system`: Built-in group (administrators, developers, guests)
   * - `external`: Azure AD group
   *
   * @default "custom"
   */
  type?: 'custom' | 'system' | 'external';

  /**
   * External group ID (for Azure AD groups)
   *
   * @remarks
   * Object ID of the Azure AD group
   *
   * @example "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
   */
  externalId?: string;
}
```

#### ARM Template Structure

```json
{
  "type": "Microsoft.ApiManagement/service/groups",
  "apiVersion": "2023-03-01-preview",
  "name": "[concat(parameters('serviceName'), '/', parameters('groupId'))]",
  "properties": {
    "displayName": "Partner Developers",
    "description": "External partner organizations",
    "type": "custom"
  }
}
```

#### Construct Class

```typescript
/**
 * Represents a group of users in API Management
 *
 * @remarks
 * Groups are used to control visibility and access to products.
 * You can assign users to groups and then grant products to groups.
 *
 * @example
 * Custom group:
 * ```typescript
 * const partners = new Group(this, 'Partners', {
 *   displayName: 'Partner Developers',
 *   description: 'Trusted partner organizations'
 * });
 * ```
 *
 * @example
 * Azure AD group sync:
 * ```typescript
 * const engineeringTeam = new Group(this, 'Engineering', {
 *   displayName: 'Engineering Team',
 *   type: 'external',
 *   externalId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 * });
 * ```
 */
export class Group extends Construct {
  public readonly groupId: string;
  public readonly displayName: string;

  constructor(scope: Construct, id: string, props: GroupProps) {
    super(scope, id);

    this.groupId = id.toLowerCase();
    this.displayName = props.displayName;

    const armResource = generateGroupArm(this.groupId, props);
    this.addResource(armResource);
  }
}
```

#### Usage Examples

```typescript
// Example 1: Partner developers group
const partnersGroup = new Group(this, 'Partners', {
  displayName: 'Partner Developers',
  description: 'External partner organizations with API access'
});

// Example 2: Internal developers group
const internalGroup = new Group(this, 'Internal', {
  displayName: 'Internal Developers',
  description: 'Company employees'
});

// Example 3: Premium tier customers
const premiumGroup = new Group(this, 'Premium', {
  displayName: 'Premium Customers',
  description: 'Customers on premium subscription tier'
});

// Example 4: Azure AD group synchronization
const engineeringTeam = new Group(this, 'EngineeringTeam', {
  displayName: 'Engineering Team',
  description: 'Synced from Azure AD Engineering group',
  type: 'external',
  externalId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
});
```

---

### 3. Group Users

**ARM Resource Type**: `Microsoft.ApiManagement/service/groups/users`

**Purpose**: Assign users to groups.

#### TypeScript Interface

```typescript
/**
 * Group user assignment properties
 */
export interface GroupUserProps {
  /**
   * Group ID
   */
  groupId: string;

  /**
   * User ID
   */
  userId: string;
}
```

#### ARM Template Structure

```json
{
  "type": "Microsoft.ApiManagement/service/groups/users",
  "apiVersion": "2023-03-01-preview",
  "name": "[concat(parameters('serviceName'), '/', parameters('groupId'), '/', parameters('userId'))]"
}
```

#### Construct Class

```typescript
/**
 * Assigns a user to a group
 *
 * @example
 * ```typescript
 * const user = new User(this, 'Dev', { ... });
 * const group = new Group(this, 'Partners', { ... });
 *
 * new GroupUser(this, 'DevInPartners', {
 *   groupId: group.groupId,
 *   userId: user.userId
 * });
 * ```
 */
export class GroupUser extends Construct {
  constructor(scope: Construct, id: string, props: GroupUserProps) {
    super(scope, id);

    const armResource = generateGroupUserArm(props);
    this.addResource(armResource);
  }
}
```

---

### 4. Product Groups

**ARM Resource Type**: `Microsoft.ApiManagement/service/products/groups`

**Purpose**: Control which groups have access to which products.

#### TypeScript Interface

```typescript
/**
 * Product group assignment properties
 */
export interface ProductGroupProps {
  /**
   * Product ID
   */
  productId: string;

  /**
   * Group ID
   */
  groupId: string;
}
```

#### ARM Template Structure

```json
{
  "type": "Microsoft.ApiManagement/service/products/groups",
  "apiVersion": "2023-03-01-preview",
  "name": "[concat(parameters('serviceName'), '/', parameters('productId'), '/', parameters('groupId'))]"
}
```

#### Construct Class

```typescript
/**
 * Grants a group access to a product
 *
 * @remarks
 * Users in the group will be able to see and subscribe to the product
 * in the Developer Portal.
 *
 * @example
 * ```typescript
 * const freeProduct = new Product(this, 'FreeTier', { ... });
 * const partnersGroup = new Group(this, 'Partners', { ... });
 *
 * new ProductGroup(this, 'PartnersGetFree', {
 *   productId: freeProduct.productId,
 *   groupId: partnersGroup.groupId
 * });
 * ```
 */
export class ProductGroup extends Construct {
  constructor(scope: Construct, id: string, props: ProductGroupProps) {
    super(scope, id);

    const armResource = generateProductGroupArm(props);
    this.addResource(armResource);
  }
}
```

---

### 5. Identity Providers

**ARM Resource Type**: `Microsoft.ApiManagement/service/identityProviders`

**Purpose**: Enable sign-in with external identity providers (Azure AD, Google, Facebook, etc.).

#### Supported Providers

| Provider | ID | Description |
|----------|-----|-------------|
| **Azure Active Directory** | `aad` | Microsoft work/school accounts |
| **Azure AD B2C** | `aadB2C` | Microsoft consumer identities |
| **Facebook** | `facebook` | Facebook login |
| **Google** | `google` | Google login |
| **Microsoft Account** | `microsoft` | Outlook.com, Live.com |
| **Twitter** | `twitter` | Twitter login |

#### TypeScript Interface

```typescript
/**
 * Identity provider properties
 */
export interface IdentityProviderProps {
  /**
   * Provider type
   */
  type: 'aad' | 'aadB2C' | 'facebook' | 'google' | 'microsoft' | 'twitter';

  /**
   * Client ID from the identity provider
   *
   * @example "1234567890abcdef"
   */
  clientId: string;

  /**
   * Client secret from the identity provider
   *
   * @remarks
   * Store this securely! Consider using Azure Key Vault.
   *
   * @example "your-client-secret-here"
   */
  clientSecret: string;

  /**
   * Allowed tenants (Azure AD only)
   *
   * @remarks
   * List of allowed Azure AD tenant IDs
   *
   * @example ["contoso.onmicrosoft.com"]
   */
  allowedTenants?: string[];

  /**
   * Authority URL (Azure AD B2C only)
   *
   * @example "https://login.microsoftonline.com/contoso.onmicrosoft.com"
   */
  authority?: string;

  /**
   * Sign-up policy name (Azure AD B2C only)
   *
   * @example "B2C_1_signup"
   */
  signupPolicyName?: string;

  /**
   * Sign-in policy name (Azure AD B2C only)
   *
   * @example "B2C_1_signin"
   */
  signinPolicyName?: string;

  /**
   * Profile editing policy name (Azure AD B2C only)
   *
   * @example "B2C_1_edit_profile"
   */
  profileEditingPolicyName?: string;

  /**
   * Password reset policy name (Azure AD B2C only)
   *
   * @example "B2C_1_password_reset"
   */
  passwordResetPolicyName?: string;
}
```

#### ARM Template Structure

```json
{
  "type": "Microsoft.ApiManagement/service/identityProviders",
  "apiVersion": "2023-03-01-preview",
  "name": "[concat(parameters('serviceName'), '/', parameters('identityProviderType'))]",
  "properties": {
    "type": "aad",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "allowedTenants": [
      "contoso.onmicrosoft.com"
    ]
  }
}
```

#### Construct Class

```typescript
/**
 * Configures an identity provider for Developer Portal sign-in
 *
 * @example
 * Azure AD:
 * ```typescript
 * new IdentityProvider(this, 'AzureAD', {
 *   type: 'aad',
 *   clientId: 'your-aad-app-id',
 *   clientSecret: 'your-secret',
 *   allowedTenants: ['company.onmicrosoft.com']
 * });
 * ```
 *
 * @example
 * Google:
 * ```typescript
 * new IdentityProvider(this, 'Google', {
 *   type: 'google',
 *   clientId: 'your-google-client-id.apps.googleusercontent.com',
 *   clientSecret: 'your-google-secret'
 * });
 * ```
 */
export class IdentityProvider extends Construct {
  public readonly providerType: string;

  constructor(scope: Construct, id: string, props: IdentityProviderProps) {
    super(scope, id);

    this.providerType = props.type;

    const armResource = generateIdentityProviderArm(props);
    this.addResource(armResource);
  }
}
```

#### Usage Examples

```typescript
// Example 1: Azure AD (work/school accounts)
new IdentityProvider(this, 'AzureAD', {
  type: 'aad',
  clientId: 'your-aad-app-id',
  clientSecret: 'your-secret',
  allowedTenants: ['company.onmicrosoft.com']
});

// Example 2: Google sign-in
new IdentityProvider(this, 'Google', {
  type: 'google',
  clientId: 'your-app.apps.googleusercontent.com',
  clientSecret: 'your-google-secret'
});

// Example 3: Azure AD B2C (consumer accounts)
new IdentityProvider(this, 'B2C', {
  type: 'aadB2C',
  clientId: 'your-b2c-app-id',
  clientSecret: 'your-secret',
  authority: 'https://login.microsoftonline.com/tfp/contoso.onmicrosoft.com',
  signupPolicyName: 'B2C_1_signup',
  signinPolicyName: 'B2C_1_signin',
  profileEditingPolicyName: 'B2C_1_edit_profile',
  passwordResetPolicyName: 'B2C_1_password_reset'
});

// Example 4: Facebook
new IdentityProvider(this, 'Facebook', {
  type: 'facebook',
  clientId: 'your-facebook-app-id',
  clientSecret: 'your-facebook-secret'
});
```

---

### 6. Authorization Servers (OAuth 2.0)

**ARM Resource Type**: `Microsoft.ApiManagement/service/authorizationServers`

**Purpose**: Configure OAuth 2.0 authorization for API access.

#### TypeScript Interface

```typescript
/**
 * Authorization server properties
 */
export interface AuthorizationServerProps {
  /**
   * Display name
   *
   * @example "Company OAuth Server"
   */
  displayName: string;

  /**
   * Client registration endpoint
   *
   * @example "https://auth.company.com/register"
   */
  clientRegistrationEndpoint?: string;

  /**
   * Authorization endpoint
   *
   * @example "https://auth.company.com/authorize"
   */
  authorizationEndpoint: string;

  /**
   * Token endpoint
   *
   * @example "https://auth.company.com/token"
   */
  tokenEndpoint?: string;

  /**
   * Client ID
   *
   * @example "api-client-id"
   */
  clientId: string;

  /**
   * Client secret
   *
   * @remarks
   * Store securely! Consider using Azure Key Vault.
   */
  clientSecret?: string;

  /**
   * Grant types supported
   *
   * @example ["authorizationCode", "clientCredentials"]
   */
  grantTypes: Array<
    'authorizationCode' |
    'implicit' |
    'resourceOwnerPassword' |
    'clientCredentials'
  >;

  /**
   * Authorization methods
   *
   * @default ["GET"]
   */
  authorizationMethods?: Array<'GET' | 'POST'>;

  /**
   * Client authentication methods
   *
   * @default ["Basic"]
   */
  clientAuthenticationMethods?: Array<'Basic' | 'Body'>;

  /**
   * Token body parameters
   *
   * @example [{ name: "resource", value: "https://api.company.com" }]
   */
  tokenBodyParameters?: Array<{
    name: string;
    value: string;
  }>;

  /**
   * Bearer token sending methods
   *
   * @default ["authorizationHeader"]
   */
  bearerTokenSendingMethods?: Array<'authorizationHeader' | 'query'>;

  /**
   * Default scope
   *
   * @example "read write"
   */
  defaultScope?: string;

  /**
   * Resource owner username
   * (for Resource Owner Password Credentials flow)
   */
  resourceOwnerUsername?: string;

  /**
   * Resource owner password
   * (for Resource Owner Password Credentials flow)
   */
  resourceOwnerPassword?: string;

  /**
   * Support state parameter
   *
   * @remarks
   * Recommended for security to prevent CSRF attacks
   *
   * @default true
   */
  supportState?: boolean;
}
```

#### ARM Template Structure

```json
{
  "type": "Microsoft.ApiManagement/service/authorizationServers",
  "apiVersion": "2023-03-01-preview",
  "name": "[concat(parameters('serviceName'), '/', parameters('authServerId'))]",
  "properties": {
    "displayName": "Company OAuth Server",
    "clientRegistrationEndpoint": "https://auth.company.com/register",
    "authorizationEndpoint": "https://auth.company.com/authorize",
    "tokenEndpoint": "https://auth.company.com/token",
    "clientId": "api-client-id",
    "clientSecret": "api-client-secret",
    "grantTypes": [
      "authorizationCode",
      "clientCredentials"
    ],
    "authorizationMethods": ["POST"],
    "bearerTokenSendingMethods": ["authorizationHeader"],
    "supportState": true
  }
}
```

#### Construct Class

```typescript
/**
 * Configures an OAuth 2.0 authorization server
 *
 * @remarks
 * Used to secure APIs with OAuth 2.0 tokens.
 * APIs can validate tokens issued by this authorization server.
 *
 * @example
 * Azure AD OAuth:
 * ```typescript
 * new AuthorizationServer(this, 'AzureADOAuth', {
 *   displayName: 'Azure AD OAuth',
 *   authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
 *   tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
 *   clientId: 'your-app-id',
 *   clientSecret: 'your-secret',
 *   grantTypes: ['authorizationCode'],
 *   defaultScope: 'api://your-api-id/.default'
 * });
 * ```
 */
export class AuthorizationServer extends Construct {
  public readonly authServerId: string;

  constructor(scope: Construct, id: string, props: AuthorizationServerProps) {
    super(scope, id);

    this.authServerId = id.toLowerCase();

    const armResource = generateAuthorizationServerArm(this.authServerId, props);
    this.addResource(armResource);
  }
}
```

#### Usage Examples

```typescript
// Example 1: Azure AD OAuth 2.0
new AuthorizationServer(this, 'AzureADOAuth', {
  displayName: 'Azure AD OAuth',
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  clientId: 'your-aad-app-id',
  clientSecret: 'your-secret',
  grantTypes: ['authorizationCode'],
  defaultScope: 'api://your-api-id/.default',
  supportState: true
});

// Example 2: Custom OAuth server
new AuthorizationServer(this, 'CustomOAuth', {
  displayName: 'Company OAuth Server',
  clientRegistrationEndpoint: 'https://auth.company.com/register',
  authorizationEndpoint: 'https://auth.company.com/authorize',
  tokenEndpoint: 'https://auth.company.com/token',
  clientId: 'api-client',
  clientSecret: 'api-secret',
  grantTypes: ['authorizationCode', 'clientCredentials'],
  authorizationMethods: ['POST'],
  bearerTokenSendingMethods: ['authorizationHeader'],
  defaultScope: 'read write'
});

// Example 3: Client credentials flow (machine-to-machine)
new AuthorizationServer(this, 'M2MOAuth', {
  displayName: 'Machine-to-Machine OAuth',
  tokenEndpoint: 'https://auth.company.com/token',
  clientId: 'm2m-client',
  clientSecret: 'm2m-secret',
  grantTypes: ['clientCredentials'],
  clientAuthenticationMethods: ['Basic'],
  defaultScope: 'api.read api.write'
});
```

---

### 7. API Issues

**ARM Resource Type**: `Microsoft.ApiManagement/service/apis/issues`

**Purpose**: Enable issue tracking for APIs in the Developer Portal.

#### TypeScript Interface

```typescript
/**
 * API issue properties
 */
export interface ApiIssueProps {
  /**
   * API ID
   */
  apiId: string;

  /**
   * Issue title
   *
   * @example "Rate limit too restrictive on search endpoint"
   */
  title: string;

  /**
   * Issue description
   *
   * @example "The /search endpoint has a rate limit of 10 requests/minute..."
   */
  description: string;

  /**
   * User ID who created the issue
   */
  userId: string;

  /**
   * Issue state
   *
   * @default "open"
   */
  state?: 'open' | 'closed' | 'proposed' | 'removed';

  /**
   * Creation date
   *
   * @default Current timestamp
   */
  createdDate?: Date;
}
```

#### Construct Class

```typescript
/**
 * Represents an issue reported on an API
 *
 * @example
 * ```typescript
 * const issue = new ApiIssue(this, 'RateLimitIssue', {
 *   apiId: api.apiId,
 *   title: 'Rate limit too restrictive',
 *   description: 'The search endpoint rate limit should be higher',
 *   userId: developer.userId,
 *   state: 'open'
 * });
 * ```
 */
export class ApiIssue extends Construct {
  public readonly issueId: string;

  constructor(scope: Construct, id: string, props: ApiIssueProps) {
    super(scope, id);

    this.issueId = id.toLowerCase();

    const armResource = generateApiIssueArm(this.issueId, props);
    this.addResource(armResource);
  }
}
```

---

### 8. API Wikis

**ARM Resource Type**: `Microsoft.ApiManagement/service/apis/wikis`

**Purpose**: Provide additional documentation for APIs beyond the auto-generated OpenAPI docs.

#### TypeScript Interface

```typescript
/**
 * API wiki properties
 */
export interface ApiWikiProps {
  /**
   * API ID
   */
  apiId: string;

  /**
   * Wiki documents
   */
  documents?: WikiDocument[];
}

/**
 * Wiki document
 */
export interface WikiDocument {
  /**
   * Document ID
   *
   * @example "getting-started"
   */
  documentId: string;

  /**
   * Document title
   *
   * @example "Getting Started Guide"
   */
  title: string;

  /**
   * Document content (Markdown)
   *
   * @example "# Getting Started\n\nThis guide will help you..."
   */
  content: string;
}
```

#### Construct Class

```typescript
/**
 * Represents a wiki for an API
 *
 * @example
 * ```typescript
 * new ApiWiki(this, 'UserGuide', {
 *   apiId: api.apiId,
 *   documents: [{
 *     documentId: 'getting-started',
 *     title: 'Getting Started',
 *     content: '# Getting Started\n\nThis guide will help you integrate...'
 *   }, {
 *     documentId: 'best-practices',
 *     title: 'Best Practices',
 *     content: '# Best Practices\n\n1. Always use pagination...'
 *   }]
 * });
 * ```
 */
export class ApiWiki extends Construct {
  constructor(scope: Construct, id: string, props: ApiWikiProps) {
    super(scope, id);

    const armResource = generateApiWikiArm(props);
    this.addResource(armResource);
  }
}
```

---

### 9. Email Templates

**ARM Resource Type**: `Microsoft.ApiManagement/service/templates`

**Purpose**: Customize email notifications sent to developers.

#### Available Templates

| Template Name | Purpose |
|---------------|---------|
| `ApplicationApprovedNotificationMessage` | Application subscription approved |
| `NewDeveloperNotificationMessage` | New developer account created |
| `EmailChangeIdentityDefault` | Email address change confirmation |
| `InviteUserNotificationMessage` | User invitation |
| `NewCommentNotificationMessage` | New comment on issue |
| `NewIssueNotificationMessage` | New issue submitted |
| `PasswordResetIdentityDefault` | Password reset |
| `PasswordResetByAdminNotificationMessage` | Admin reset password |
| `RejectDeveloperNotificationMessage` | Developer account rejected |
| `RequestDeveloperNotificationMessage` | Developer account approval request |

#### TypeScript Interface

```typescript
/**
 * Email template properties
 */
export interface EmailTemplateProps {
  /**
   * Template name (see available templates above)
   */
  templateName: string;

  /**
   * Email subject
   *
   * @example "Welcome to Our API Platform!"
   */
  subject: string;

  /**
   * Email body (HTML)
   *
   * @remarks
   * You can use template parameters like $DevFirstName, $DevLastName, etc.
   *
   * @example "<html><body>Hi $DevFirstName,<br/>Welcome to our platform!</body></html>"
   */
  body: string;

  /**
   * Email title
   *
   * @example "Welcome!"
   */
  title?: string;

  /**
   * Description
   */
  description?: string;

  /**
   * Whether this is the default template
   *
   * @default false
   */
  isDefault?: boolean;
}
```

#### Construct Class

```typescript
/**
 * Customizes an email template
 *
 * @example
 * ```typescript
 * new EmailTemplate(this, 'WelcomeEmail', {
 *   templateName: 'NewDeveloperNotificationMessage',
 *   subject: 'Welcome to Contoso APIs!',
 *   title: 'Welcome!',
 *   body: `
 *     <html>
 *       <body>
 *         <h1>Welcome, $DevFirstName $DevLastName!</h1>
 *         <p>Thank you for signing up for Contoso APIs.</p>
 *         <p>Your account email: $DevEmail</p>
 *         <p>Get started at: $DevPortalUrl</p>
 *       </body>
 *     </html>
 *   `
 * });
 * ```
 */
export class EmailTemplate extends Construct {
  constructor(scope: Construct, id: string, props: EmailTemplateProps) {
    super(scope, id);

    const armResource = generateEmailTemplateArm(props);
    this.addResource(armResource);
  }
}
```

---

## Implementation Guide

### File Structure

```
packages/cdk/src/apimanagement/
├── users/
│   ├── types.ts              # UserProps, UserIdentity interfaces
│   ├── arm.ts                # generateUserArm()
│   ├── user.ts               # User construct class
│   └── index.ts              # Barrel exports
├── groups/
│   ├── types.ts              # GroupProps interface
│   ├── arm.ts                # generateGroupArm()
│   ├── group.ts              # Group construct class
│   ├── group-user.ts         # GroupUser construct
│   └── index.ts
├── products/
│   ├── ...                   # (already implemented)
│   ├── product-group.ts      # ProductGroup construct (NEW)
│   └── index.ts              # (update exports)
├── identity/
│   ├── types.ts              # IdentityProviderProps, AuthorizationServerProps
│   ├── identity-provider-arm.ts
│   ├── identity-provider.ts
│   ├── authorization-server-arm.ts
│   ├── authorization-server.ts
│   └── index.ts
├── community/
│   ├── types.ts              # ApiIssueProps, ApiWikiProps
│   ├── api-issue-arm.ts
│   ├── api-issue.ts
│   ├── api-wiki-arm.ts
│   ├── api-wiki.ts
│   └── index.ts
├── templates/
│   ├── types.ts              # EmailTemplateProps
│   ├── arm.ts                # generateEmailTemplateArm()
│   ├── email-template.ts     # EmailTemplate construct
│   └── index.ts
└── index.ts                  # Main barrel export (update)
```

### Implementation Phases

#### Phase 1: Core Access Control (Week 1)

**Priority**: Highest - enables basic portal functionality

**Resources to Implement**:
1. Users (`packages/cdk/src/apimanagement/users/`)
2. Groups (`packages/cdk/src/apimanagement/groups/`)
3. Group Users (`packages/cdk/src/apimanagement/groups/group-user.ts`)
4. Product Groups (`packages/cdk/src/apimanagement/products/product-group.ts`)

**Estimated Effort**: 2-3 days

**Testing Checklist**:
- [ ] Create user programmatically
- [ ] User appears in Developer Portal
- [ ] Create custom group
- [ ] Assign user to group
- [ ] Grant product to group
- [ ] Verify user can see and subscribe to product

#### Phase 2: Authentication (Week 2)

**Priority**: High - enables SSO and modern auth

**Resources to Implement**:
1. Identity Providers (`packages/cdk/src/apimanagement/identity/`)
2. Authorization Servers (`packages/cdk/src/apimanagement/identity/`)

**Estimated Effort**: 2-3 days

**Testing Checklist**:
- [ ] Configure Azure AD identity provider
- [ ] Sign in to portal with Azure AD
- [ ] Configure OAuth 2.0 authorization server
- [ ] API validates OAuth tokens
- [ ] Developer Portal "Try it" uses OAuth

#### Phase 3: Community Features (Week 3)

**Priority**: Medium - nice-to-have for engagement

**Resources to Implement**:
1. API Issues (`packages/cdk/src/apimanagement/community/`)
2. API Wikis (`packages/cdk/src/apimanagement/community/`)

**Estimated Effort**: 1-2 days

**Testing Checklist**:
- [ ] Create API wiki with Markdown content
- [ ] Wiki appears on API page in portal
- [ ] Developer submits API issue
- [ ] Issue appears in portal
- [ ] Update issue state (open → closed)

#### Phase 4: Customization (Week 4)

**Priority**: Low - polish and branding

**Resources to Implement**:
1. Email Templates (`packages/cdk/src/apimanagement/templates/`)

**Estimated Effort**: 1-2 days

**Testing Checklist**:
- [ ] Customize welcome email
- [ ] New user receives custom email
- [ ] Customize invitation email
- [ ] Template parameters replaced correctly

---

## Use Cases & Examples

### Use Case 1: Internal Enterprise APIs

**Scenario**: Company with 50 microservices, 200 internal developers across 10 teams.

**Requirements**:
- Internal developers need self-service access
- Sign-in with company Azure AD
- Different teams have access to different API sets
- Audit trail of API key usage

**Implementation**:

```typescript
import { Stack } from '@atakora/cdk';
import {
  ApiManagementService,
  Product,
  Api,
  Group,
  ProductGroup,
  IdentityProvider,
} from '@atakora/cdk/apimanagement';

export class InternalApisStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // 1. Create APIM Service
    const apim = new ApiManagementService(this, 'InternalAPIM', {
      name: 'internal-apis',
      sku: 'Developer',
      publisherEmail: 'api-team@company.com',
      publisherName: 'Company API Team'
    });

    // 2. Create APIs (microservices)
    const customerApi = new Api(this, 'CustomerAPI', {
      serviceName: apim.name,
      name: 'customer-api',
      path: 'customers',
      displayName: 'Customer Service API',
      protocols: ['https']
    });

    const orderApi = new Api(this, 'OrderAPI', {
      serviceName: apim.name,
      name: 'order-api',
      path: 'orders',
      displayName: 'Order Management API',
      protocols: ['https']
    });

    const inventoryApi = new Api(this, 'InventoryAPI', {
      serviceName: apim.name,
      name: 'inventory-api',
      path: 'inventory',
      displayName: 'Inventory Service API',
      protocols: ['https']
    });

    // 3. Create products by team
    const frontendProduct = new Product(this, 'FrontendAPIs', {
      serviceName: apim.name,
      name: 'frontend-apis',
      displayName: 'Frontend Team APIs',
      description: 'APIs for frontend applications',
      subscriptionRequired: true,
      approvalRequired: false,
      state: 'published'
    });

    const backofficeProduct = new Product(this, 'BackofficeAPIs', {
      serviceName: apim.name,
      name: 'backoffice-apis',
      displayName: 'Backoffice Team APIs',
      description: 'APIs for internal backoffice applications',
      subscriptionRequired: true,
      approvalRequired: false,
      state: 'published'
    });

    // 4. Create groups by team
    const frontendTeam = new Group(this, 'FrontendTeam', {
      displayName: 'Frontend Team',
      description: 'Frontend application developers'
    });

    const backofficeTeam = new Group(this, 'BackofficeTeam', {
      displayName: 'Backoffice Team',
      description: 'Backoffice application developers'
    });

    // 5. Grant products to groups
    new ProductGroup(this, 'FrontendAccess', {
      productId: frontendProduct.productId,
      groupId: frontendTeam.groupId
    });

    new ProductGroup(this, 'BackofficeAccess', {
      productId: backofficeProduct.productId,
      groupId: backofficeTeam.groupId
    });

    // 6. Enable Azure AD SSO
    new IdentityProvider(this, 'CompanyAzureAD', {
      type: 'aad',
      clientId: 'your-aad-app-id',
      clientSecret: 'your-secret',
      allowedTenants: ['company.onmicrosoft.com']
    });

    // 7. Sync Azure AD groups (optional)
    const engineeringADGroup = new Group(this, 'EngineeringAD', {
      displayName: 'Engineering (from Azure AD)',
      type: 'external',
      externalId: 'azure-ad-group-object-id'
    });

    new ProductGroup(this, 'EngineeringGetsFrontend', {
      productId: frontendProduct.productId,
      groupId: engineeringADGroup.groupId
    });
  }
}
```

**Developer Experience**:

1. Developer visits `https://internal-apis.developer.azure-api.net/`
2. Clicks "Sign in with Azure AD"
3. Authenticates with company credentials
4. Automatically added to groups based on Azure AD membership
5. Sees only APIs their team has access to
6. Subscribes to product with one click
7. Gets API key immediately
8. Copies C# code sample and integrates

**Benefits**:
- ✅ Onboarding time: 5 minutes (vs. hours of manual provisioning)
- ✅ Zero manual API key distribution
- ✅ Automatic access control via AD groups
- ✅ Built-in usage analytics per team
- ✅ Reduced API support tickets

---

### Use Case 2: Partner APIs with Approval Workflow

**Scenario**: SaaS company offering integration APIs to partners (resellers, ISVs).

**Requirements**:
- Partners can sign up themselves
- Legal/business team approves access
- Different tiers (Bronze, Silver, Gold) with different rate limits
- Partners need sandbox environment to test

**Implementation**:

```typescript
export class PartnerApisStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const apim = new ApiManagementService(this, 'PartnerAPIM', {
      name: 'partner-apis',
      sku: 'Standard',
      publisherEmail: 'partners@company.com',
      publisherName: 'Company Partner Team'
    });

    // Create partner-facing APIs
    const integrationApi = new Api(this, 'IntegrationAPI', {
      serviceName: apim.name,
      name: 'partner-integration',
      path: 'integration/v1',
      displayName: 'Partner Integration API',
      protocols: ['https']
    });

    const webhooksApi = new Api(this, 'WebhooksAPI', {
      serviceName: apim.name,
      name: 'partner-webhooks',
      path: 'webhooks/v1',
      displayName: 'Partner Webhooks API',
      protocols: ['https']
    });

    // Create tiered products
    const sandboxProduct = new Product(this, 'Sandbox', {
      serviceName: apim.name,
      name: 'sandbox',
      displayName: 'Sandbox Environment',
      description: 'Test environment - 1,000 requests/day',
      subscriptionRequired: true,
      approvalRequired: false, // Auto-approve sandbox
      state: 'published',
      subscriptionsLimit: 10 // Each partner can have max 10 sandbox keys
    });

    const bronzeProduct = new Product(this, 'Bronze', {
      serviceName: apim.name,
      name: 'bronze-tier',
      displayName: 'Bronze Tier - Free',
      description: '10,000 requests/month, community support',
      subscriptionRequired: true,
      approvalRequired: true, // Requires approval
      state: 'published'
    });

    const silverProduct = new Product(this, 'Silver', {
      serviceName: apim.name,
      name: 'silver-tier',
      displayName: 'Silver Tier - $299/month',
      description: '100,000 requests/month, email support, SLA',
      subscriptionRequired: true,
      approvalRequired: true,
      state: 'published'
    });

    const goldProduct = new Product(this, 'Gold', {
      serviceName: apim.name,
      name: 'gold-tier',
      displayName: 'Gold Tier - Contact Sales',
      description: 'Unlimited requests, phone support, dedicated success manager',
      subscriptionRequired: true,
      approvalRequired: true,
      state: 'published'
    });

    // Create partner groups
    const allPartners = new Group(this, 'AllPartners', {
      displayName: 'All Partners',
      description: 'All verified partner organizations'
    });

    const premiumPartners = new Group(this, 'PremiumPartners', {
      displayName: 'Premium Partners',
      description: 'Gold tier partners'
    });

    // Grant access
    new ProductGroup(this, 'AllGetSandbox', {
      productId: sandboxProduct.productId,
      groupId: allPartners.groupId
    });

    new ProductGroup(this, 'AllGetBronze', {
      productId: bronzeProduct.productId,
      groupId: allPartners.groupId
    });

    new ProductGroup(this, 'AllGetSilver', {
      productId: silverProduct.productId,
      groupId: allPartners.groupId
    });

    new ProductGroup(this, 'PremiumGetGold', {
      productId: goldProduct.productId,
      groupId: premiumPartners.groupId
    });

    // Enable Google/Microsoft account sign-in (for partners)
    new IdentityProvider(this, 'Google', {
      type: 'google',
      clientId: 'your-google-client-id.apps.googleusercontent.com',
      clientSecret: 'your-google-secret'
    });

    new IdentityProvider(this, 'Microsoft', {
      type: 'microsoft',
      clientId: 'your-microsoft-client-id',
      clientSecret: 'your-microsoft-secret'
    });

    // Add comprehensive wiki for partners
    new ApiWiki(this, 'IntegrationGuide', {
      apiId: integrationApi.id,
      documents: [{
        documentId: 'getting-started',
        title: 'Getting Started',
        content: `
# Getting Started with Partner Integration API

## Prerequisites
- Active partner account
- API subscription key
- Basic knowledge of REST APIs

## Authentication
All requests must include your subscription key in the header:

\`\`\`
Ocp-Apim-Subscription-Key: your-subscription-key
\`\`\`

## Rate Limits
- Sandbox: 1,000 requests/day
- Bronze: 10,000 requests/month
- Silver: 100,000 requests/month
- Gold: Unlimited

## Support
- Bronze: Community forum
- Silver: Email support (24h response)
- Gold: Phone + dedicated Slack channel (4h response)
        `
      }, {
        documentId: 'best-practices',
        title: 'Best Practices',
        content: `
# Integration Best Practices

## 1. Use Webhooks
Instead of polling, subscribe to webhooks for real-time updates.

## 2. Implement Retry Logic
Use exponential backoff for failed requests.

## 3. Cache Responses
Many endpoints support ETags for efficient caching.

## 4. Monitor Your Usage
Check the developer portal for usage analytics.
        `
      }]
    });

    // Customize welcome email for partners
    new EmailTemplate(this, 'PartnerWelcome', {
      templateName: 'NewDeveloperNotificationMessage',
      subject: 'Welcome to Company Partner Program',
      title: 'Welcome, Partner!',
      body: `
        <html>
          <body style="font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto;">
              <h1 style="color: #0078D4;">Welcome to Company Partner Program</h1>

              <p>Hi $DevFirstName,</p>

              <p>Thank you for joining our partner program!</p>

              <h2>Next Steps:</h2>
              <ol>
                <li><a href="$DevPortalUrl">Visit the Developer Portal</a></li>
                <li>Subscribe to the Sandbox product to start testing</li>
                <li>Review our <a href="$DevPortalUrl/docs/integration-api">Integration Guide</a></li>
                <li>When ready, apply for Bronze tier access</li>
              </ol>

              <h2>Support</h2>
              <p>Questions? Email us at <a href="mailto:partners@company.com">partners@company.com</a></p>

              <p>Happy integrating!</p>
              <p>The Partner Team</p>
            </div>
          </body>
        </html>
      `
    });
  }
}
```

**Partner Experience**:

1. **Sign Up**: Partner visits portal, signs up with Google account
2. **Auto-Verify**: Receives welcome email with next steps
3. **Sandbox Access**: Immediately subscribes to Sandbox, gets API key
4. **Testing**: Uses "Try it" console to test APIs
5. **Apply for Bronze**: Submits request for Bronze tier
6. **Approval**: Partner team reviews and approves (email notification sent)
7. **Production**: Partner upgrades to production key, integrates
8. **Scale**: Later upgrades to Silver tier for higher limits

**Business Benefits**:
- ✅ Self-service onboarding reduces sales overhead
- ✅ Sandbox environment reduces support tickets
- ✅ Approval workflow ensures partner vetting
- ✅ Clear tier pricing drives upgrades
- ✅ Analytics show which partners are most active

---

### Use Case 3: Public API with Monetization

**Scenario**: Public API service (e.g., weather data, geocoding, payment processing).

**Requirements**:
- Anyone can sign up
- Free tier to trial
- Paid tiers with automatic billing
- Usage-based pricing
- Rate limiting by tier

**Implementation**:

```typescript
export class PublicApiStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const apim = new ApiManagementService(this, 'PublicAPIM', {
      name: 'weather-api',
      sku: 'Standard',
      publisherEmail: 'support@weatherapi.com',
      publisherName: 'Weather API Inc.',
      customProperties: {
        'Microsoft.WindowsAzure.ApiManagement.Gateway.Protocols.Server.Http2': 'true'
      }
    });

    // Public API
    const weatherApi = new Api(this, 'WeatherAPI', {
      serviceName: apim.name,
      name: 'weather-v2',
      path: 'v2',
      displayName: 'Weather API v2',
      description: 'Global weather data and forecasts',
      protocols: ['https'],
      subscriptionRequired: true
    });

    // Free tier with strict limits
    const freeTier = new Product(this, 'Free', {
      serviceName: apim.name,
      name: 'free-tier',
      displayName: 'Free Tier',
      description: '1,000 requests/month • Community support • Rate limit: 10 req/min',
      subscriptionRequired: true,
      approvalRequired: false, // Auto-approve
      state: 'published',
      subscriptionsLimit: 1 // One subscription per user
    });

    // Pro tier
    const proTier = new Product(this, 'Pro', {
      serviceName: apim.name,
      name: 'pro-tier',
      displayName: 'Pro Tier - $29/month',
      description: '100,000 requests/month • Email support • Rate limit: 100 req/min',
      subscriptionRequired: true,
      approvalRequired: false,
      state: 'published'
    });

    // Enterprise tier
    const enterpriseTier = new Product(this, 'Enterprise', {
      serviceName: apim.name,
      name: 'enterprise-tier',
      displayName: 'Enterprise - $499/month',
      description: 'Unlimited requests • Phone support • Custom rate limits • SLA',
      subscriptionRequired: true,
      approvalRequired: true, // Contact sales first
      state: 'published'
    });

    // Public developers group (everyone)
    const publicDevs = new Group(this, 'PublicDevelopers', {
      displayName: 'Public Developers',
      description: 'All registered developers'
    });

    // Grant all tiers to public developers
    new ProductGroup(this, 'PublicGetsFree', {
      productId: freeTier.productId,
      groupId: publicDevs.groupId
    });

    new ProductGroup(this, 'PublicGetsPro', {
      productId: proTier.productId,
      groupId: publicDevs.groupId
    });

    new ProductGroup(this, 'PublicGetsEnterprise', {
      productId: enterpriseTier.productId,
      groupId: publicDevs.groupId
    });

    // Enable multiple sign-in options
    new IdentityProvider(this, 'Google', {
      type: 'google',
      clientId: 'your-google-client-id',
      clientSecret: 'your-google-secret'
    });

    new IdentityProvider(this, 'Microsoft', {
      type: 'microsoft',
      clientId: 'your-microsoft-client-id',
      clientSecret: 'your-microsoft-secret'
    });

    new IdentityProvider(this, 'Facebook', {
      type: 'facebook',
      clientId: 'your-facebook-app-id',
      clientSecret: 'your-facebook-secret'
    });

    // Comprehensive documentation
    new ApiWiki(this, 'WeatherDocs', {
      apiId: weatherApi.id,
      documents: [{
        documentId: 'quickstart',
        title: 'Quickstart',
        content: `
# Quickstart Guide

Get weather data in 5 minutes.

## 1. Get Your API Key
Subscribe to a product tier to get your API key.

## 2. Make Your First Request

\`\`\`bash
curl -X GET "https://weather-api.azure-api.net/v2/current?q=London" \\
  -H "Ocp-Apim-Subscription-Key: your-key"
\`\`\`

## 3. Parse the Response

\`\`\`json
{
  "location": "London, UK",
  "temperature": 15,
  "condition": "Partly cloudy",
  "humidity": 72
}
\`\`\`

## 4. Check Your Usage
Visit the portal to see remaining quota.
        `
      }, {
        documentId: 'pricing',
        title: 'Pricing',
        content: `
# Pricing

## Free Tier - $0/month
- 1,000 requests/month
- 10 requests/minute rate limit
- Community forum support
- Perfect for: Hobby projects, learning

## Pro Tier - $29/month
- 100,000 requests/month
- 100 requests/minute rate limit
- Email support (24h response)
- Perfect for: Small businesses, startups

## Enterprise - $499/month
- Unlimited requests
- Custom rate limits
- Phone support (4h response SLA)
- Dedicated account manager
- Perfect for: Large businesses, mission-critical apps

## Overage Pricing
- Free tier: No overages (requests blocked)
- Pro tier: $0.0005 per additional request
- Enterprise: No overages (unlimited)
        `
      }]
    });

    // Custom emails
    new EmailTemplate(this, 'Welcome', {
      templateName: 'NewDeveloperNotificationMessage',
      subject: 'Welcome to Weather API',
      body: `
        <html>
          <body>
            <h1>Welcome to Weather API!</h1>
            <p>Hi $DevFirstName,</p>
            <p>You're now ready to access global weather data.</p>

            <h2>Your Next Steps:</h2>
            <ol>
              <li><strong>Subscribe to Free Tier</strong> - Get 1,000 free requests/month</li>
              <li><strong>Test the API</strong> - Use our interactive console</li>
              <li><strong>Integrate</strong> - Copy code samples in your language</li>
            </ol>

            <p><a href="$DevPortalUrl" style="background: #0078D4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Get Started</a></p>

            <p>Questions? Reply to this email or check our <a href="$DevPortalUrl/docs">documentation</a>.</p>
          </body>
        </html>
      `
    });
  }
}
```

**Customer Experience**:

1. **Discovery**: Developer finds Weather API via Google search
2. **Sign Up**: Creates account with Google in 30 seconds
3. **Free Tier**: Subscribes to free tier, gets key immediately
4. **Test**: Uses "Try it" console to test API
5. **Integrate**: Copies Python code sample, integrates in 10 minutes
6. **Usage**: Builds app, eventually hits 1,000 request limit
7. **Upgrade**: Sees upgrade prompt, subscribes to Pro tier
8. **Billing**: Credit card charged $29/month automatically
9. **Scale**: App grows, upgrades to Enterprise for unlimited access

**Business Model**:
- ✅ Viral free tier drives signups
- ✅ Low friction (no credit card) for trial
- ✅ Natural upgrade path as usage grows
- ✅ Self-service reduces sales costs
- ✅ Usage analytics identify power users for upselling

---

## Best Practices

### 1. Group Strategy

**Use built-in groups effectively**:

```typescript
// ✅ Good: Use built-in Developers group for all authenticated users
new ProductGroup(this, 'PublicAPIForAll', {
  productId: publicApi.productId,
  groupId: 'developers' // Built-in group
});

// ❌ Bad: Creating custom group when built-in works
const allUsers = new Group(this, 'AllUsers', { ... }); // Unnecessary
```

**Create custom groups for access control**:

```typescript
// ✅ Good: Granular access control
const financeTeam = new Group(this, 'Finance', {
  displayName: 'Finance Team'
});

const hris Team = new Group(this, 'HR', {
  displayName: 'HR Team'
});

// Finance APIs only for finance team
new ProductGroup(this, 'FinanceAccess', {
  productId: financeApis.productId,
  groupId: financeTeam.groupId
});
```

**Sync Azure AD groups for enterprises**:

```typescript
// ✅ Good: Leverage existing AD groups
const engineeringAD = new Group(this, 'Engineering', {
  displayName: 'Engineering (synced from Azure AD)',
  type: 'external',
  externalId: 'azure-ad-engineering-group-object-id'
});

// Users automatically added/removed based on AD membership
```

### 2. Product Strategy

**Create products by audience, not by API**:

```typescript
// ✅ Good: Products represent tiers/audiences
const partnerTier = new Product(this, 'PartnerTier', {
  displayName: 'Partner Access',
  // Contains multiple APIs
});

// ❌ Bad: One product per API
const customerApiProduct = new Product(this, 'CustomerAPI', { ... });
const orderApiProduct = new Product(this, 'OrderAPI', { ... });
// Forces users to subscribe to many products
```

**Use approval workflow strategically**:

```typescript
// ✅ Good: Auto-approve for internal/sandbox
const sandboxProduct = new Product(this, 'Sandbox', {
  approvalRequired: false // Instant access
});

// ✅ Good: Require approval for production/paid
const productionProduct = new Product(this, 'Production', {
  approvalRequired: true // Business team approves
});
```

### 3. Authentication Strategy

**Choose the right identity provider**:

```typescript
// Internal enterprise APIs: Azure AD only
new IdentityProvider(this, 'AzureAD', {
  type: 'aad',
  clientId: 'your-app-id',
  clientSecret: 'your-secret',
  allowedTenants: ['company.onmicrosoft.com'] // Lock to your tenant
});

// Partner APIs: Multiple options
new IdentityProvider(this, 'Google', { type: 'google', ... });
new IdentityProvider(this, 'Microsoft', { type: 'microsoft', ... });

// Public APIs: All options + basic auth
// (Allow email/password signup too)
```

**Use OAuth for API authorization**:

```typescript
// ✅ Good: OAuth for user-context APIs
const oauth = new AuthorizationServer(this, 'OAuth', {
  displayName: 'User OAuth',
  authorizationEndpoint: 'https://auth.company.com/authorize',
  tokenEndpoint: 'https://auth.company.com/token',
  grantTypes: ['authorizationCode'], // User login
  ...
});

// Use in API policy:
// <validate-jwt header-name="Authorization">
//   <openid-config url="..." />
// </validate-jwt>
```

### 4. Email Template Strategy

**Keep emails concise and actionable**:

```typescript
// ✅ Good: Clear next steps
new EmailTemplate(this, 'Welcome', {
  templateName: 'NewDeveloperNotificationMessage',
  subject: 'Welcome - Get started in 3 steps',
  body: `
    <h1>Welcome!</h1>
    <ol>
      <li><a href="$DevPortalUrl">Visit portal</a></li>
      <li>Subscribe to product</li>
      <li>Test API</li>
    </ol>
  `
});

// ❌ Bad: Long marketing copy
body: `
  <p>Welcome to the most amazing API platform in the world...</p>
  <p>We're thrilled to have you...</p>
  <p>Our vision is to...</p>
  <!-- User stops reading -->
`;
```

**Use template variables**:

Available variables:
- `$DevFirstName` - User first name
- `$DevLastName` - User last name
- `$DevEmail` - User email
- `$DevPortalUrl` - Developer portal URL
- `$OrganizationName` - APIM service publisher name

### 5. Wiki Strategy

**Use wikis for guides, not API reference**:

```typescript
// ✅ Good: Supplementary guides
new ApiWiki(this, 'Guides', {
  apiId: api.id,
  documents: [{
    documentId: 'getting-started',
    title: 'Getting Started',
    content: '# How to integrate in 5 minutes...'
  }, {
    documentId: 'best-practices',
    title: 'Best Practices',
    content: '# Performance tips...'
  }]
});

// ❌ Bad: Duplicating OpenAPI docs
// OpenAPI already generates perfect API reference
// Don't maintain docs in two places
```

### 6. Security Best Practices

**Never hardcode secrets**:

```typescript
// ❌ Bad: Hardcoded secret
new IdentityProvider(this, 'Google', {
  type: 'google',
  clientId: 'abc123',
  clientSecret: 'hardcoded-secret' // NEVER DO THIS
});

// ✅ Good: Reference Key Vault
import { KeyVault } from '@atakora/cdk/keyvault';

const vault = new KeyVault(this, 'Secrets', { ... });

new IdentityProvider(this, 'Google', {
  type: 'google',
  clientId: 'abc123',
  clientSecret: vault.getSecret('google-client-secret').secretValue
});
```

**Use HTTPS only**:

```typescript
// ✅ Good: HTTPS only
const api = new Api(this, 'API', {
  protocols: ['https'] // Never 'http'
});
```

**Enable rate limiting in products**:

```typescript
// ✅ Good: Protect your backend
const freeProduct = new Product(this, 'Free', {
  displayName: 'Free Tier',
  ...
  // Add rate-limit policy at product level
});

// Policy XML:
// <rate-limit calls="10" renewal-period="60" />
```

---

## Security Considerations

### Identity Provider Security

**Azure AD Configuration**:

1. **Create App Registration** in Azure AD
2. **Set Redirect URI**: `https://{service}.developer.azure-api.net/signin-aad`
3. **Generate Client Secret**: Store in Key Vault
4. **Grant API Permissions**: User.Read (minimum)
5. **Restrict Tenants**: Use `allowedTenants` to lock to your organization

**OAuth 2.0 Security**:

1. **Always use `supportState: true`** to prevent CSRF attacks
2. **Use HTTPS** for all redirect URIs
3. **Validate tokens** in API policies with `<validate-jwt>`
4. **Rotate client secrets** regularly
5. **Use authorization code flow** (not implicit flow)

### User Data Protection

**GDPR Compliance**:

```typescript
// Allow users to be deleted (GDPR "right to be forgotten")
const user = new User(this, 'User', {
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  state: 'active'
});

// Later, to delete:
// user.state = 'deleted';
```

**PII in Logs**:

- ✅ Avoid logging email addresses, names in diagnostic logs
- ✅ Use user IDs instead of emails for tracking
- ✅ Anonymize analytics data

### API Key Security

**Best Practices**:

1. **Enable key regeneration**: Users should be able to rotate keys
2. **Use subscription headers**: `Ocp-Apim-Subscription-Key` (not query string)
3. **Set subscription expiration**: For temporary access
4. **Monitor for leaked keys**: Check public repos (GitHub, GitLab)
5. **Revoke compromised keys**: Immediately if leaked

### Rate Limiting

**Implement at multiple levels**:

```typescript
// 1. Product-level rate limit (applies to all APIs in product)
const product = new Product(this, 'FreeTier', {
  displayName: 'Free Tier',
  // Add policy:
  // <rate-limit calls="1000" renewal-period="2592000" /> <!-- 1000/month -->
});

// 2. API-level rate limit (applies to all operations in API)
const api = new Api(this, 'API', {
  // Add policy:
  // <rate-limit calls="100" renewal-period="60" /> <!-- 100/minute -->
});

// 3. Operation-level rate limit (specific endpoints)
// Add policy to specific operation:
// <rate-limit calls="10" renewal-period="60" /> <!-- 10/minute for search -->
```

---

## Appendix: Complete Example

### Full-Featured Developer Portal Stack

```typescript
import { Stack, Construct } from '@atakora/cdk';
import {
  ApiManagementService,
  Api,
  Product,
  Group,
  User,
  GroupUser,
  ProductGroup,
  IdentityProvider,
  AuthorizationServer,
  ApiWiki,
  EmailTemplate,
} from '@atakora/cdk/apimanagement';

/**
 * Complete Developer Portal implementation
 *
 * Features:
 * - Azure AD SSO
 * - OAuth 2.0 API authorization
 * - Tiered products (Free/Pro/Enterprise)
 * - Custom groups for access control
 * - API wikis
 * - Custom email templates
 */
export class CompleteDeveloperPortalStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // ========================================
    // 1. API Management Service
    // ========================================
    const apim = new ApiManagementService(this, 'APIM', {
      name: 'contoso-apis',
      sku: 'Standard',
      publisherEmail: 'api-team@contoso.com',
      publisherName: 'Contoso API Team',
      publisherUrl: 'https://www.contoso.com'
    });

    // ========================================
    // 2. APIs
    // ========================================
    const customerApi = new Api(this, 'CustomerAPI', {
      serviceName: apim.name,
      name: 'customer-api',
      path: 'customers/v1',
      displayName: 'Customer API',
      description: 'Customer management operations',
      protocols: ['https'],
      subscriptionRequired: true
    });

    const orderApi = new Api(this, 'OrderAPI', {
      serviceName: apim.name,
      name: 'order-api',
      path: 'orders/v1',
      displayName: 'Order API',
      description: 'Order management operations',
      protocols: ['https'],
      subscriptionRequired: true
    });

    const analyticsApi = new Api(this, 'AnalyticsAPI', {
      serviceName: apim.name,
      name: 'analytics-api',
      path: 'analytics/v1',
      displayName: 'Analytics API',
      description: 'Usage analytics and reporting',
      protocols: ['https'],
      subscriptionRequired: true
    });

    // ========================================
    // 3. Products (Tiers)
    // ========================================
    const freeProduct = new Product(this, 'FreeTier', {
      serviceName: apim.name,
      name: 'free-tier',
      displayName: 'Free Tier',
      description: '1,000 requests/month • Community support',
      subscriptionRequired: true,
      approvalRequired: false,
      state: 'published',
      subscriptionsLimit: 1
    });

    const proProduct = new Product(this, 'ProTier', {
      serviceName: apim.name,
      name: 'pro-tier',
      displayName: 'Pro Tier - $99/month',
      description: '100,000 requests/month • Email support • SLA',
      subscriptionRequired: true,
      approvalRequired: false,
      state: 'published'
    });

    const enterpriseProduct = new Product(this, 'EnterpriseTier', {
      serviceName: apim.name,
      name: 'enterprise-tier',
      displayName: 'Enterprise - Contact Sales',
      description: 'Unlimited requests • Phone support • Dedicated success manager',
      subscriptionRequired: true,
      approvalRequired: true,
      state: 'published'
    });

    // ========================================
    // 4. Groups
    // ========================================
    const publicDevelopers = new Group(this, 'PublicDevelopers', {
      displayName: 'Public Developers',
      description: 'All registered public developers'
    });

    const partnerDevelopers = new Group(this, 'PartnerDevelopers', {
      displayName: 'Partner Developers',
      description: 'Verified partner organizations'
    });

    const internalDevelopers = new Group(this, 'InternalDevelopers', {
      displayName: 'Internal Developers',
      type: 'external',
      externalId: 'azure-ad-developers-group-id', // Synced from Azure AD
      description: 'Contoso employees (synced from Azure AD)'
    });

    // ========================================
    // 5. Product Access Control
    // ========================================

    // Public developers get Free tier
    new ProductGroup(this, 'PublicGetsFree', {
      productId: freeProduct.productId,
      groupId: publicDevelopers.groupId
    });

    new ProductGroup(this, 'PublicGetsPro', {
      productId: proProduct.productId,
      groupId: publicDevelopers.groupId
    });

    // Partners get Pro + Enterprise
    new ProductGroup(this, 'PartnersGetPro', {
      productId: proProduct.productId,
      groupId: partnerDevelopers.groupId
    });

    new ProductGroup(this, 'PartnersGetEnterprise', {
      productId: enterpriseProduct.productId,
      groupId: partnerDevelopers.groupId
    });

    // Internal developers get all tiers
    new ProductGroup(this, 'InternalGetsFree', {
      productId: freeProduct.productId,
      groupId: internalDevelopers.groupId
    });

    new ProductGroup(this, 'InternalGetsPro', {
      productId: proProduct.productId,
      groupId: internalDevelopers.groupId
    });

    new ProductGroup(this, 'InternalGetsEnterprise', {
      productId: enterpriseProduct.productId,
      groupId: internalDevelopers.groupId
    });

    // ========================================
    // 6. Identity Providers (SSO)
    // ========================================

    // Azure AD for internal employees
    new IdentityProvider(this, 'AzureAD', {
      type: 'aad',
      clientId: 'your-azure-ad-app-id',
      clientSecret: 'your-azure-ad-secret',
      allowedTenants: ['contoso.onmicrosoft.com']
    });

    // Google for public/partner developers
    new IdentityProvider(this, 'Google', {
      type: 'google',
      clientId: 'your-app.apps.googleusercontent.com',
      clientSecret: 'your-google-secret'
    });

    // Microsoft Account
    new IdentityProvider(this, 'Microsoft', {
      type: 'microsoft',
      clientId: 'your-microsoft-app-id',
      clientSecret: 'your-microsoft-secret'
    });

    // ========================================
    // 7. OAuth 2.0 Authorization
    // ========================================

    const oauth = new AuthorizationServer(this, 'OAuth2', {
      displayName: 'Contoso OAuth 2.0',
      authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId: 'api-oauth-client-id',
      clientSecret: 'api-oauth-secret',
      grantTypes: ['authorizationCode', 'clientCredentials'],
      authorizationMethods: ['POST'],
      bearerTokenSendingMethods: ['authorizationHeader'],
      supportState: true,
      defaultScope: 'api://contoso-api/.default'
    });

    // ========================================
    // 8. Sample Users (for demo/testing)
    // ========================================

    const partnerUser = new User(this, 'PartnerUser', {
      email: 'partner@example.com',
      firstName: 'Alice',
      lastName: 'Partner',
      state: 'active',
      note: 'Sample partner user',
      confirmation: 'invite'
    });

    // Add partner user to partner group
    new GroupUser(this, 'AliceInPartners', {
      groupId: partnerDevelopers.groupId,
      userId: partnerUser.userId
    });

    // ========================================
    // 9. API Documentation (Wikis)
    // ========================================

    new ApiWiki(this, 'CustomerAPIWiki', {
      apiId: customerApi.id,
      documents: [{
        documentId: 'getting-started',
        title: 'Getting Started',
        content: `
# Getting Started with Customer API

## Authentication
Include your subscription key in the header:

\`\`\`
Ocp-Apim-Subscription-Key: your-key
\`\`\`

## Example Request

\`\`\`bash
curl -X GET "https://contoso-apis.azure-api.net/customers/v1/123" \\
  -H "Ocp-Apim-Subscription-Key: your-key"
\`\`\`

## Response

\`\`\`json
{
  "id": "123",
  "name": "Acme Corp",
  "industry": "Technology"
}
\`\`\`
        `
      }, {
        documentId: 'best-practices',
        title: 'Best Practices',
        content: `
# Best Practices

## 1. Cache Responses
Use ETags for efficient caching.

## 2. Handle Rate Limits
Implement exponential backoff.

## 3. Use Webhooks
Subscribe to customer.updated events.
        `
      }]
    });

    // ========================================
    // 10. Email Templates
    // ========================================

    new EmailTemplate(this, 'WelcomeEmail', {
      templateName: 'NewDeveloperNotificationMessage',
      subject: 'Welcome to Contoso APIs',
      title: 'Welcome!',
      body: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0078D4; padding: 20px; color: white;">
              <h1>Welcome to Contoso APIs</h1>
            </div>

            <div style="padding: 20px;">
              <p>Hi $DevFirstName,</p>

              <p>Thank you for joining Contoso API platform!</p>

              <h2>Get Started in 3 Steps:</h2>
              <ol>
                <li><a href="$DevPortalUrl">Sign in to the Developer Portal</a></li>
                <li>Subscribe to the Free Tier</li>
                <li>Test the APIs with our interactive console</li>
              </ol>

              <h2>Resources</h2>
              <ul>
                <li><a href="$DevPortalUrl/docs">API Documentation</a></li>
                <li><a href="$DevPortalUrl/api/customer-api">Customer API</a></li>
                <li><a href="mailto:support@contoso.com">Support</a></li>
              </ul>

              <p>Happy coding!</p>
              <p><strong>The Contoso API Team</strong></p>
            </div>

            <div style="background: #f5f5f5; padding: 20px; font-size: 12px; color: #666;">
              <p>Questions? Reply to this email or visit our <a href="$DevPortalUrl/support">support page</a>.</p>
            </div>
          </body>
        </html>
      `
    });

    new EmailTemplate(this, 'InvitationEmail', {
      templateName: 'InviteUserNotificationMessage',
      subject: "You're invited to Contoso APIs",
      title: 'Invitation',
      body: `
        <html>
          <body>
            <h1>You're Invited!</h1>
            <p>Hi $DevFirstName,</p>
            <p>You've been invited to join Contoso API platform.</p>
            <p><a href="$ConfirmUrl">Accept Invitation</a></p>
          </body>
        </html>
      `
    });
  }
}
```

---

## Next Steps

1. **Review this specification** with your team
2. **Prioritize resources** based on your use case (internal vs. partner vs. public)
3. **Start with Phase 1** (Users, Groups, Product Groups) - highest ROI
4. **Add authentication** in Phase 2 (Identity Providers, OAuth)
5. **Polish with Phase 3-4** (Wikis, Email Templates) when ready

**Estimated Total Effort**: 6-10 days for full Developer Portal implementation

**Business Impact**:
- 80-90% reduction in API onboarding time
- 70-80% reduction in API support tickets
- Self-service enables scaling to 100s-1000s of developers
- Professional developer experience drives adoption

---

**Last Updated**: 2025-10-12
**Maintainer**: Atakora CDK Team
**Related**: [README.md](./README.md) - Full resource roadmap
