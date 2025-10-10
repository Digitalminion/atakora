# Key Vault Resources API (@atakora/cdk/keyvault)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > Key Vault

---

## Overview

The keyvault namespace provides constructs for Azure Key Vault resources including vaults, secrets, keys, and certificates. Azure Key Vault helps safeguard cryptographic keys and secrets used by cloud applications and services.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import {
  Vaults,
  VaultsSecrets,
  VaultsKeys
} from '@atakora/cdk/keyvault';
```

## Status

The Key Vault namespace is currently under development. The following constructs are planned:

### Planned Constructs

#### Vaults
Azure Key Vault for storing secrets, keys, and certificates.

**Planned Features**:
- Auto-generated vault names
- SKU selection (Standard/Premium)
- Access policies configuration
- RBAC support
- Network ACLs
- Private Link support
- Soft delete and purge protection
- Enable for deployment/template/disk encryption

#### VaultsSecrets
Secrets stored in Key Vault.

**Planned Features**:
- Secret value management
- Content type specification
- Expiration dates
- Activation dates
- Version management
- Tags

#### VaultsKeys
Cryptographic keys stored in Key Vault.

**Planned Features**:
- RSA and EC keys
- Key operations (encrypt, decrypt, sign, verify)
- Key size configuration
- Expiration and activation
- Hardware Security Module (HSM) backing

#### VaultsCertificates
X.509 certificates stored in Key Vault.

**Planned Features**:
- Import existing certificates
- Generate new certificates
- Auto-renewal
- Certificate policies
- Integration with Certificate Authorities

---

## Planned Usage Examples

### Basic Key Vault

```typescript
// Example of planned usage (not yet implemented)
import { Vaults } from '@atakora/cdk/keyvault';

const vault = new Vaults(resourceGroup, 'AppSecrets', {
  sku: 'Standard',
  enableSoftDelete: true,
  softDeleteRetentionDays: 90,
  enablePurgeProtection: true,
  enableRbacAuthorization: true,
  publicNetworkAccess: 'Disabled'
});
```

### Key Vault with Access Policy

```typescript
// Planned usage
const vault = new Vaults(resourceGroup, 'Secrets', {
  sku: 'Standard',
  accessPolicies: [
    {
      tenantId: 'tenant-id',
      objectId: 'user-or-app-id',
      permissions: {
        secrets: ['get', 'list', 'set'],
        keys: ['get', 'list', 'create'],
        certificates: ['get', 'list']
      }
    }
  ]
});
```

### Private Key Vault

```typescript
// Planned usage
import { PrivateEndpoint } from '@atakora/cdk/network';

const vault = new Vaults(resourceGroup, 'PrivateVault', {
  sku: 'Premium',
  publicNetworkAccess: 'Disabled',
  networkAcls: {
    defaultAction: 'Deny',
    bypass: 'AzureServices'
  }
});

const endpoint = new PrivateEndpoint(resourceGroup, 'VaultEndpoint', {
  subnet: privateSubnet,
  privateLinkServiceId: vault.id,
  groupIds: ['vault']
});
```

### Store and Retrieve Secrets

```typescript
// Planned usage
import { VaultsSecrets } from '@atakora/cdk/keyvault';

const connectionString = new VaultsSecrets(vault, 'DbConnectionString', {
  secretValue: 'Server=...;Database=...;',
  contentType: 'text/plain',
  expiresOn: new Date('2026-01-01'),
  tags: { environment: 'production' }
});

// Reference in Web App
const webApp = new WebApps(resourceGroup, 'Api', {
  appSettings: {
    DB_CONNECTION: `@Microsoft.KeyVault(SecretUri=${connectionString.secretUri})`
  },
  enableSystemIdentity: true
});
```

### Encryption Keys

```typescript
// Planned usage
import { VaultsKeys } from '@atakora/cdk/keyvault';

const encryptionKey = new VaultsKeys(vault, 'DataEncryptionKey', {
  keyType: 'RSA',
  keySize: 2048,
  keyOps: ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey'],
  expiresOn: new Date('2027-01-01')
});
```

---

## Government Cloud Considerations

### Availability
Azure Key Vault is fully available in Azure Government Cloud with feature parity.

**Available Regions**:
- US Gov Virginia
- US Gov Texas
- US Gov Arizona
- US DoD East
- US DoD Central

### Endpoint Differences
- Commercial: `https://{vault}.vault.azure.net/`
- Gov Cloud: `https://{vault}.vault.usgovcloudapi.net/`

### Compliance
- FedRAMP High
- DoD Impact Level 5
- ITAR compliant
- FIPS 140-2 Level 2 validated HSMs

### Features
All Key Vault features available including:
- Premium SKU with HSM backing
- Private Link
- Customer-managed keys
- Soft delete and purge protection
- RBAC authorization

---

## Security Best Practices

### Access Control
- Use RBAC instead of access policies when possible
- Follow principle of least privilege
- Use managed identities for Azure resources
- Regularly audit access logs

### Network Security
- Disable public network access
- Use Private Link/Private Endpoints
- Configure network ACLs to allow only trusted networks
- Enable Azure Services bypass carefully

### Operational Security
- Enable soft delete (cannot be disabled)
- Enable purge protection for production vaults
- Set appropriate retention periods (7-90 days)
- Use separate vaults for different environments
- Implement secret rotation policies

### Key Management
- Use HSM-backed keys for high-value keys (Premium SKU)
- Set expiration dates for keys and secrets
- Implement automated rotation
- Backup keys regularly
- Use key versioning

---

## Common Patterns

### Application Secrets Management

```typescript
// Planned pattern
const vault = new Vaults(resourceGroup, 'AppVault', {
  enableRbacAuthorization: true
});

// Store secrets
const secrets = {
  dbPassword: new VaultsSecrets(vault, 'DbPassword', { secretValue: '...' }),
  apiKey: new VaultsSecrets(vault, 'ApiKey', { secretValue: '...' }),
  certificatePassword: new VaultsSecrets(vault, 'CertPassword', { secretValue: '...' })
};

// Grant app access
vault.grantSecretsUser(webApp.identity);
```

### Certificate Management

```typescript
// Planned pattern
const cert = new VaultsCertificates(vault, 'SslCertificate', {
  certificatePolicy: {
    keyProperties: {
      exportable: true,
      keyType: 'RSA',
      keySize: 2048,
      reuseKey: false
    },
    secretProperties: {
      contentType: 'application/x-pkcs12'
    },
    x509CertificateProperties: {
      subject: 'CN=myapp.contoso.com',
      subjectAlternativeNames: {
        dnsNames: ['myapp.contoso.com', 'www.myapp.contoso.com']
      },
      validityInMonths: 12
    },
    issuerParameters: {
      name: 'Self'
    }
  }
});
```

### Encryption at Rest

```typescript
// Planned pattern
const encryptionKey = new VaultsKeys(vault, 'StorageEncryption', {
  keyType: 'RSA',
  keySize: 2048
});

const storage = new StorageAccounts(resourceGroup, 'Data', {
  encryption: {
    keySource: 'Microsoft.Keyvault',
    keyVaultProperties: {
      keyName: encryptionKey.keyName,
      keyVaultUri: vault.vaultUri
    }
  }
});
```

---

## Secret Reference Syntax

### In App Service Configuration

```typescript
// Reference Key Vault secret
appSettings: {
  DB_CONNECTION: '@Microsoft.KeyVault(SecretUri=https://myvault.vault.azure.net/secrets/DbConnection/version)',
  API_KEY: '@Microsoft.KeyVault(VaultName=myvault;SecretName=ApiKey)'
}
```

### In ARM Templates

```json
{
  "type": "Microsoft.KeyVault/vaults/secrets",
  "apiVersion": "2023-07-01",
  "name": "[concat(variables('vaultName'), '/secret-name')]",
  "properties": {
    "value": "[parameters('secretValue')]"
  }
}
```

---

## Pricing

### Standard SKU
- $0.03 per 10,000 transactions
- Software-protected keys
- Suitable for most applications

### Premium SKU
- $0.15 per 10,000 transactions
- HSM-protected keys (FIPS 140-2 Level 2)
- Required for high-security scenarios
- Customer-managed key support

### Additional Costs
- Advanced threat protection: ~$2/vault/month
- Certificate operations: Varies by operation
- Key operations: Included in transaction costs

---

## See Also

- [Managed Identity Resources](./managedidentity.md) - Identity for resource access
- [Storage Resources](./storage.md) - Storage encryption with CMK
- [Web Resources](./web.md) - App Service Key Vault integration
- [Azure Key Vault Documentation](https://docs.microsoft.com/azure/key-vault/)

---

**Last Updated**: 2025-10-09
**Version**: @atakora/cdk 1.0.0
**Status**: Under Development
