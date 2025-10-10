# DocumentDB Resources API (@atakora/cdk/documentdb)

**Navigation**: [Docs Home](../../../README.md) > [Reference](../../README.md) > [API Reference](../README.md) > DocumentDB

---

## Overview

The documentdb namespace provides constructs for Azure Cosmos DB, Microsoft's globally distributed, multi-model database service. Cosmos DB supports SQL (Core) API, MongoDB API, Cassandra API, Gremlin API, and Table API with guaranteed low latency, automatic scaling, and comprehensive SLAs.

## Installation

```bash
npm install @atakora/cdk
```

## Import

```typescript
import {
  DatabaseAccounts,
  CosmosDbKind,
  ConsistencyLevel,
  PublicNetworkAccess
} from '@atakora/cdk/documentdb';
```

## Classes

### DatabaseAccounts (Cosmos DB Account)

Creates an Azure Cosmos DB database account.

#### Class Signature

```typescript
class DatabaseAccounts extends Construct implements IDatabaseAccount {
  constructor(scope: Construct, id: string, props?: DatabaseAccountsProps);
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `databaseAccountName` | `string` | Account name (globally unique) |
| `location` | `string` | Primary Azure region |
| `accountId` | `string` | ARM resource ID |
| `resourceId` | `string` | ARM resource ID (alias) |
| `documentEndpoint` | `string` | Endpoint URI |

#### DatabaseAccountsProps

```typescript
interface DatabaseAccountsProps {
  readonly databaseAccountName?: string;  // Auto-generated if not provided
  readonly location?: string;             // Defaults to parent location
  readonly kind?: CosmosDbKind;           // Default: GlobalDocumentDB (SQL API)
  readonly consistencyLevel?: ConsistencyLevel;  // Default: Session
  readonly enableAutomaticFailover?: boolean;
  readonly enableFreeTier?: boolean;      // Default: false (one per subscription)
  readonly enableServerless?: boolean;    // Default: false
  readonly publicNetworkAccess?: PublicNetworkAccess;  // Default: Disabled
  readonly virtualNetworkRules?: VirtualNetworkRule[];
  readonly additionalLocations?: string[];  // Multi-region deployment
  readonly tags?: Record<string, string>;
}
```

#### Types

```typescript
enum CosmosDbKind {
  GLOBAL_DOCUMENT_DB = 'GlobalDocumentDB',  // SQL API
  MONGO_DB = 'MongoDB',                      // MongoDB API
  PARSE = 'Parse'                            // Deprecated
}

enum ConsistencyLevel {
  EVENTUAL = 'Eventual',              // Lowest latency, lowest consistency
  SESSION = 'Session',                // Default - session consistency
  BOUNDED_STALENESS = 'BoundedStaleness',  // Configurable staleness
  STRONG = 'Strong',                  // Highest consistency, highest latency
  CONSISTENT_PREFIX = 'ConsistentPrefix'   // Ordered reads
}

enum PublicNetworkAccess {
  ENABLED = 'enabled',
  DISABLED = 'disabled'
}

interface VirtualNetworkRule {
  readonly id: string;  // Subnet resource ID
  readonly ignoreMissingVNetServiceEndpoint?: boolean;
}
```

#### Examples

**Basic SQL API Cosmos DB**:
```typescript
import { DatabaseAccounts } from '@atakora/cdk/documentdb';

const cosmosDb = new DatabaseAccounts(resourceGroup, 'Database', {
  consistencyLevel: ConsistencyLevel.SESSION
});
```

**Multi-Region Cosmos DB**:
```typescript
const cosmosDb = new DatabaseAccounts(resourceGroup, 'GlobalDatabase', {
  consistencyLevel: ConsistencyLevel.SESSION,
  enableAutomaticFailover: true,
  additionalLocations: ['westus2', 'northeurope'],
  tags: { purpose: 'global-distribution' }
});
```

**Serverless Cosmos DB**:
```typescript
const cosmosDb = new DatabaseAccounts(resourceGroup, 'ServerlessDB', {
  enableServerless: true,
  consistencyLevel: ConsistencyLevel.SESSION
});
```

**Private Cosmos DB with VNet Integration**:
```typescript
const cosmosDb = new DatabaseAccounts(resourceGroup, 'PrivateDB', {
  publicNetworkAccess: PublicNetworkAccess.DISABLED,
  virtualNetworkRules: [
    {
      id: subnet.id,
      ignoreMissingVNetServiceEndpoint: false
    }
  ]
});
```

**MongoDB API Cosmos DB**:
```typescript
const mongoDb = new DatabaseAccounts(resourceGroup, 'MongoDatabase', {
  kind: CosmosDbKind.MONGO_DB,
  consistencyLevel: ConsistencyLevel.SESSION
});
```

**Free Tier Cosmos DB (Dev/Test)**:
```typescript
const devDb = new DatabaseAccounts(devResourceGroup, 'DevDatabase', {
  enableFreeTier: true,  // Only one per subscription
  consistencyLevel: ConsistencyLevel.EVENTUAL
});
```

---

## Consistency Levels Explained

### Session (Recommended Default)
- Guarantees monotonic reads within a session
- Best balance of performance and consistency
- Perfect for most applications

### Eventual
- Lowest latency, highest throughput
- No ordering guarantees
- Use for scenarios where consistency isn't critical

### Strong
- Linearizability guarantee
- Highest latency
- Use for financial systems, inventory management

### Bounded Staleness
- Configurable staleness window
- Reads lag behind writes by K versions or T time
- Use for scenarios requiring some consistency with global distribution

### Consistent Prefix
- Reads never see out-of-order writes
- Use for scenarios requiring ordered reads without full consistency

---

## Common Patterns

### Application with Cosmos DB

```typescript
import { DatabaseAccounts } from '@atakora/cdk/documentdb';
import { WebApps } from '@atakora/cdk/web';

// Create Cosmos DB account
const cosmosDb = new DatabaseAccounts(resourceGroup, 'AppDatabase', {
  consistencyLevel: ConsistencyLevel.SESSION,
  publicNetworkAccess: PublicNetworkAccess.DISABLED
});

// Create web app with connection string
const webApp = new WebApps(resourceGroup, 'Api', {
  appSettings: {
    COSMOS_ENDPOINT: cosmosDb.documentEndpoint,
    // Use Key Vault reference for connection string in production
  }
});
```

### Multi-Region Active-Active

```typescript
const cosmosDb = new DatabaseAccounts(resourceGroup, 'GlobalApp', {
  consistencyLevel: ConsistencyLevel.SESSION,
  enableAutomaticFailover: true,
  enableMultipleWriteLocations: true,
  additionalLocations: ['westus2', 'eastasia', 'northeurope']
});
```

---

## Government Cloud Considerations

### Availability
Cosmos DB is fully available in Azure Government Cloud with feature parity.

**Available Regions**:
- US Gov Virginia
- US Gov Texas
- US Gov Arizona

### Endpoint Differences
- Commercial: `https://{account}.documents.azure.com`
- Gov Cloud: `https://{account}.documents.azure.us`

### Features
All Cosmos DB features available including:
- Multi-region writes
- All consistency levels
- All APIs (SQL, MongoDB, Cassandra, Gremlin, Table)
- Private Link support
- Customer-managed keys

### Compliance
- FedRAMP High
- DoD Impact Level 5
- ITAR compliant

---

## See Also

- [Storage Resources](./storage.md)
- [Network Resources](./network.md)
- [Web Resources](./web.md)

---

**Last Updated**: 2025-10-09
**Version**: @atakora/cdk 1.0.0
