# Storage Resources API (@atakora/cdk/storage)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > Storage

---

## Overview

The storage namespace provides constructs for Azure Storage accounts, blob containers, file shares, queues, and tables.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import {
  StorageAccount,
  BlobContainer,
  FileShare,
  Queue,
  Table
} from '@atakora/cdk/storage';
```

## Classes

### StorageAccount

Creates an Azure Storage Account.

#### Class Signature

```typescript
class StorageAccount extends Resource implements IStorageAccount {
  constructor(scope: Construct, id: string, props?: StorageAccountProps);
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | ARM resource ID |
| `name` | `string` | Storage account name (auto-generated, lowercase alphanumeric) |
| `primaryEndpoints` | `StorageEndpoints` | Primary service endpoints |
| `primaryConnectionString` | `string` | Primary connection string |
| `primaryAccessKey` | `string` | Primary access key |

#### StorageAccountProps

```typescript
interface StorageAccountProps extends ResourceProps {
  readonly resourceGroup?: IResourceGroup;
  readonly kind?: StorageAccountKind;
  readonly sku?: StorageAccountSku;
  readonly accessTier?: 'Hot' | 'Cool';
  readonly enableHttpsTrafficOnly?: boolean;
  readonly minimumTlsVersion?: 'TLS1_0' | 'TLS1_1' | 'TLS1_2';
  readonly allowBlobPublicAccess?: boolean;
  readonly publicNetworkAccess?: 'Enabled' | 'Disabled';
  readonly networkAcls?: NetworkRuleSet;
}
```

#### Examples

**Basic Storage Account**:
```typescript
import { StorageAccount } from '@atakora/cdk/storage';

const storage = new StorageAccount(this, 'Storage', {
  kind: 'StorageV2',
  sku: { name: 'Standard_LRS' }
});
```

**Secure Storage**:
```typescript
const storage = new StorageAccount(this, 'Storage', {
  kind: 'StorageV2',
  sku: { name: 'Standard_GRS' },
  enableHttpsTrafficOnly: true,
  minimumTlsVersion: 'TLS1_2',
  allowBlobPublicAccess: false,
  publicNetworkAccess: 'Disabled'
});
```

---

### BlobContainer

Creates a blob container in a storage account.

#### Class Signature

```typescript
class BlobContainer extends Resource implements IBlobContainer {
  constructor(scope: Construct, id: string, props: BlobContainerProps);
}
```

#### BlobContainerProps

```typescript
interface BlobContainerProps extends ResourceProps {
  readonly storageAccount: IStorageAccount;
  readonly publicAccess?: 'None' | 'Blob' | 'Container';
  readonly metadata?: Record<string, string>;
}
```

#### Examples

```typescript
import { BlobContainer } from '@atakora/cdk/storage';

const container = new BlobContainer(this, 'Assets', {
  storageAccount: storage,
  publicAccess: 'None'
});
```

---

## See Also

- [Network Resources](./network.md)
- [Web Resources](./web.md)

---

**Last Updated**: 2025-10-08
**Version**: @atakora/cdk 1.0.0
