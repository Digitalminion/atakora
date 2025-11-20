/**
 * Storage Configuration
 *
 * Configures all storage backends:
 * - Blob storage (Azure Storage Account)
 * - Database storage (Cosmos DB)
 * - File shares
 */

import { defineStorage, storage } from '@atakora/component/storage';

const isProd = process.env.NODE_ENV === 'production';

export const data = defineStorage({
  // Blob Storage Account
  BlobStorage: storage.account()
    .name('dataplatformstorage')
    .redundancy(isProd ? 'GRS' : 'LRS')
    .tier(isProd ? 'Premium' : 'Standard')
    .performance(perf =>
      perf
        .largeFileShares(isProd)
        .disablePublicAccess()
    )
    .container('datasets', c =>
      c
        .private()
        .when(isProd, c => c.immutable(7))
    )
    .container('reports', c =>
      c
        .private()
        .deleteAfter(30)
    )
    .container('uploads', c =>
      c
        .private()
        .deleteAfter(7)
    )
    .container('archives', c =>
      c
        .private()
        .archiveAfter(90)
        .deleteAfter(365)
        .when(isProd, c => c.immutable(365))
    )
    .container('audit-logs', c =>
      c
        .private()
        .archiveAfter(30)
        .deleteAfter(2555) // 7 years compliance
        .when(isProd, c => c.immutable(2555))
    )
    .container('temp', c =>
      c
        .private()
        .deleteAfter(1)
    )
    .when(isProd, b =>
      b.fileShare('function-content', share =>
        share
          .quota(100) // GB
          .protocol('SMB')
      )
    )
    .encryption(enc =>
      enc
        .keySource(isProd ? 'Microsoft.KeyVault' : 'Microsoft.Storage')
        .when(isProd, e =>
          e
            .keyVaultKey(process.env.STORAGE_ENCRYPTION_KEY!)
            .requireInfrastructureEncryption()
        )
    )
    .network(net =>
      net
        .when(isProd, n =>
          n
            .deny()
            .bypass(['AzureServices'])
            .allowIPs(['203.0.113.0/24'])
            .allowVNet(process.env.VNET_SUBNET_ID!)
        )
        .when(!isProd, n => n.allow())
    )
    .softDelete(del =>
      del
        .enable()
        .retainFor(isProd ? 30 : 7)
    )
    .versioning(ver =>
      ver.enable(isProd)
    )
    .changeFeed(feed =>
      feed
        .enable(isProd)
        .retainFor(90)
    ),

  // Cosmos DB Database
  Database: storage.cosmosDb()
    .name('data-platform-db')
    .mode(isProd ? 'Autoscale' : 'Serverless')
    .when(isProd, d =>
      d.throughput(400, 10000) // min, max RU/s
    )
    .consistency('Session')
    .when(isProd, d =>
      d.multiRegion(regions =>
        regions
          .location('East US', 0)
          .location('West US', 1)
          .automaticFailover()
      )
    )
    .backup(backup =>
      backup
        .enable(isProd)
        .type(isProd ? 'Continuous' : 'Periodic')
        .when(isProd, b =>
          b.continuous('Continuous7Days')
        )
        .when(!isProd, b =>
          b
            .periodic(240) // 4 hours
            .retain(168) // 7 days
        )
    )
    .when(isProd, d =>
      d.analyticalStorage(analytics =>
        analytics
          .enable()
          .schema('WellDefined')
      )
    )
    .network(net =>
      net
        .when(isProd, n =>
          n
            .disablePublicAccess()
            .allowVNet(process.env.FUNCTION_SUBNET_ID!)
            .allowIPs(['203.0.113.0/24'])
        )
        .when(!isProd, n =>
          n.enablePublicAccess()
        )
    )
    .encryption(enc =>
      enc
        .keySource(isProd ? 'Microsoft.KeyVault' : 'Microsoft.Azure')
        .when(isProd, e =>
          e.keyVaultKey(process.env.COSMOS_ENCRYPTION_KEY!)
        )
    )
    .freeTier(!isProd)
    .performance(perf =>
      perf
        .when(isProd, p =>
          p.dedicatedGateway('Cosmos.D4s', 2)
        )
        .queryMetrics()
        .indexing(idx =>
          idx
            .automatic()
            .mode('consistent')
            .include('/*')
            .exclude('/_etag/?', '/_attachments/*')
        )
    ),
});
