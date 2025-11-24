/**
 * Example: Custom Storage Attachment
 *
 * This example demonstrates how to customize storage infrastructure
 * using attachment points. Shows configurations for different
 * environments and use cases.
 */

import { defineBackend, defineSchema, defineAuth } from '@atakora/component';
import { storage } from '@atakora/component/builders';
import { a, c, auth } from '@atakora/component';

// Define schema
const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().email().required(),
      name: a.string().required(),
      avatar: a.string().url()
    }).timestamps(true),

    Document: c.model({
      id: a.id(),
      title: a.string().required(),
      fileUrl: a.string().url(),
      uploadedBy: a.ref('User').required()
    }).timestamps(true)
  })
});

// Define authentication
const authentication = defineAuth({
  Primary: auth.jwt()
    .issuer(process.env.JWT_ISSUER || 'https://auth.example.com')
    .audience(process.env.JWT_AUDIENCE || 'https://api.example.com')
});

// Create backend
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'document-platform',
    environment: process.env.NODE_ENV as any || 'development'
  }
});

// ============================================================================
// Example 1: Development - Cost-Optimized Storage
// ============================================================================

if (backend.environment === 'development') {
  // Use Serverless Cosmos DB for dev (pay-per-request)
  backend.storage.database.attach(
    storage.cosmosDb()
      .name('document-platform-dev-db')
      .mode('Serverless')
      .consistencyLevel('Session')  // Good balance for dev
      .backup({
        type: 'Periodic',
        intervalInMinutes: 240,  // Every 4 hours
        retentionInHours: 24     // Keep for 1 day
      })
  );

  // Basic blob storage for dev
  backend.storage.blobs.attach(
    storage.blobStorage()
      .name('docplatformdev')
      .sku('Standard_LRS')  // Locally redundant (cheapest)
      .accessTier('Hot')
      .deleteRetentionDays(7)
  );
}

// ============================================================================
// Example 2: Production - High-Availability Storage
// ============================================================================

if (backend.environment === 'production') {
  // Provisioned Cosmos DB with multi-region
  backend.storage.database.attach(
    storage.cosmosDb()
      .name('document-platform-prod-db')
      .mode('Provisioned')
      .throughput({
        mode: 'autoscale',
        maxRU: 20000  // Autoscale up to 20K RU/s
      })
      .consistencyLevel('Session')
      .multiRegion({
        regions: ['eastus', 'westus', 'northeurope'],
        writeRegion: 'eastus'
      })
      .backup({
        type: 'Continuous',
        retention: 30  // 30 days continuous backup
      })
      .enableAnalyticalStorage(true)  // Enable Synapse Link
  );

  // Production blob storage with lifecycle management
  backend.storage.blobs.attach(
    storage.blobStorage()
      .name('docplatformprod')
      .sku('Standard_GRS')  // Geo-redundant
      .accessTier('Hot')
      .deleteRetentionDays(365)
      .lifecycle([
        {
          name: 'archive-old-documents',
          enabled: true,
          filters: {
            blobTypes: ['blockBlob'],
            prefixMatch: ['documents/']
          },
          actions: {
            baseBlob: {
              tierToCool: { daysAfterModificationGreaterThan: 30 },
              tierToArchive: { daysAfterModificationGreaterThan: 90 },
              delete: { daysAfterModificationGreaterThan: 2555 }  // 7 years
            }
          }
        },
        {
          name: 'delete-temp-files',
          enabled: true,
          filters: {
            blobTypes: ['blockBlob'],
            prefixMatch: ['temp/']
          },
          actions: {
            baseBlob: {
              delete: { daysAfterModificationGreaterThan: 7 }
            }
          }
        }
      ])
      .cors([
        {
          allowedOrigins: [
            'https://app.example.com',
            'https://www.example.com'
          ],
          allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
          allowedHeaders: ['*'],
          exposedHeaders: ['x-ms-request-id', 'x-ms-version'],
          maxAgeInSeconds: 3600
        }
      ])
      .encryption({
        keySource: 'Microsoft.Storage',
        requireInfrastructureEncryption: true
      })
  );

  // Storage account with network rules
  backend.storage.account.attach(
    storage.account()
      .name('docplatformprod')
      .sku('Standard_GRS')
      .httpsOnly(true)
      .minimumTlsVersion('TLS1_2')
      .allowBlobPublicAccess(false)
      .networkRules({
        defaultAction: 'Deny',
        bypass: ['AzureServices'],
        ipRules: [
          '203.0.113.0/24',  // Office IP range
          '198.51.100.0/24'  // Data center IP range
        ]
      })
  );
}

// ============================================================================
// Example 3: Staging - Balanced Configuration
// ============================================================================

if (backend.environment === 'staging') {
  // Serverless database (lower cost than prod, higher than dev)
  backend.storage.database.attach(
    storage.cosmosDb()
      .name('document-platform-staging-db')
      .mode('Serverless')
      .consistencyLevel('Session')
      .backup({
        type: 'Continuous',
        retention: 7  // 7 days for staging
      })
  );

  // Zone-redundant blob storage (better than dev, cheaper than prod)
  backend.storage.blobs.attach(
    storage.blobStorage()
      .name('docplatformstaging')
      .sku('Standard_ZRS')  // Zone-redundant
      .accessTier('Hot')
      .deleteRetentionDays(30)
      .lifecycle([
        {
          name: 'cleanup-old-files',
          enabled: true,
          filters: {
            blobTypes: ['blockBlob']
          },
          actions: {
            baseBlob: {
              delete: { daysAfterModificationGreaterThan: 30 }
            }
          }
        }
      ])
  );
}

// ============================================================================
// Example 4: Model-Specific Container Customization
// ============================================================================

// Customize User container with specific indexing
backend.schema.User.container.attach(
  storage.container()
    .name('users')
    .partitionKey('/id')
    .uniqueKeys(['/email'])  // Enforce unique emails
    .indexingPolicy({
      automatic: true,
      indexingMode: 'Consistent',
      includedPaths: [
        { path: '/email/?' },
        { path: '/name/?' }
      ],
      excludedPaths: [
        { path: '/_etag/?' },
        { path: '/passwordHash/?' }  // Don't index sensitive data
      ]
    })
    .defaultTtl(-1)  // No automatic deletion
);

// Customize Document container for multi-tenant access
backend.schema.Document.container.attach(
  storage.container()
    .name('documents')
    .partitionKey('/uploadedBy')  // Partition by user for efficient queries
    .indexingPolicy({
      automatic: true,
      indexingMode: 'Consistent',
      includedPaths: [
        { path: '/title/?' },
        { path: '/uploadedBy/?' },
        { path: '/createdAt/?' }
      ]
    })
    .throughput({
      mode: 'autoscale',
      maxRU: 4000  // Separate throughput for documents
    })
);

// Export backend
export { backend };
