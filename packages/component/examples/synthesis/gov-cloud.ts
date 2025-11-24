/**
 * Example: Azure Government Cloud Deployment
 *
 * Demonstrates backend configuration for Azure Government Cloud
 * with required compliance tags and region selection.
 */

import { defineBackend, defineSchema, defineAuth } from '@atakora/component';
import { storage, compute } from '@atakora/component/builders';
import { a, c, auth } from '@atakora/component';

// Schema for government application
const schema = defineSchema({
  schema: a.schema({
    User: c.model({
      id: a.id(),
      email: a.string().email().required(),
      clearanceLevel: a.enum(['Unclassified', 'CUI', 'Secret']),
      department: a.string().required()
    }).authorization((allow) => [
      allow.owner('id'),
      allow.groups(['admin']).all()
    ]),

    Document: c.model({
      id: a.id(),
      title: a.string().required(),
      classification: a.enum(['Unclassified', 'CUI', 'Secret']),
      ownerId: a.ref('User').required()
    }).authorization((allow) => [
      allow.owner('ownerId'),
      allow.groups(['admin']).all()
    ])
  })
});

// Authentication using Azure AD Government
const authentication = defineAuth({
  Primary: auth.entra()
    .tenant(process.env.GOV_AZURE_TENANT_ID!)
    .clientId(process.env.GOV_AZURE_CLIENT_ID!)
    .authority('https://login.microsoftonline.us')  // Government Cloud authority
});

// Create backend for Government Cloud
const backend = defineBackend({
  schema,
  authentication,
  settings: {
    name: 'gov-secure-app',
    region: 'usgovvirginia',  // Government Cloud region
    environment: 'production',
    cloud: 'AzureUSGovernment',
    tags: {
      // Required compliance tags
      'compliance-framework': 'FedRAMP High',
      'data-classification': 'CUI',
      'impact-level': 'IL4',
      'system-owner': 'Department of Defense',
      'information-system': 'Document Management System',
      'authorization-date': '2024-01-15',
      'environment': 'production',
      'managed-by': 'atakora'
    },
    features: {
      monitoring: true,
      networking: true,
      performance: true
    }
  }
});

// Government Cloud database with encryption
backend.storage.database.attach(
  storage.cosmosDb()
    .name('gov-secure-app-db')
    .mode('Provisioned')
    .throughput({ mode: 'manual', RU: 2000 })
    .consistencyLevel('Strong')  // Highest consistency for compliance
    .multiRegion({
      regions: ['usgovvirginia', 'usgovtexas'],
      writeRegion: 'usgovvirginia'
    })
    .backup({
      type: 'Continuous',
      retention: 90  // 90 days retention for compliance
    })
    .enableAnalyticalStorage(false)  // Disable if not FedRAMP authorized
    .encryption({
      type: 'SystemAssigned'  // Use system-assigned encryption
    })
    .tags({
      'data-at-rest-encryption': 'AES-256',
      'encryption-key-management': 'Azure Key Vault'
    })
);

// Government Cloud blob storage with strict access controls
backend.storage.blobs.attach(
  storage.blobStorage()
    .name('govsecureapp')
    .sku('Standard_GRS')  // Geo-redundant within Gov Cloud
    .accessTier('Hot')
    .allowBlobPublicAccess(false)  // No public access
    .deleteRetentionDays(90)
    .encryption({
      keySource: 'Microsoft.KeyVault',
      keyVaultKeyId: process.env.GOV_ENCRYPTION_KEY_ID!
    })
    .tags({
      'encryption-at-rest': 'Customer-managed keys',
      'data-classification': 'CUI'
    })
);

// Storage account with network restrictions
backend.storage.account.attach(
  storage.account()
    .name('govsecureapp')
    .sku('Standard_GRS')
    .httpsOnly(true)
    .minimumTlsVersion('TLS1_2')
    .allowBlobPublicAccess(false)
    .allowSharedKeyAccess(false)  // Require Azure AD only
    .networkRules({
      defaultAction: 'Deny',
      bypass: [],  // No bypasses
      ipRules: [
        // Only allow access from approved IP ranges
        process.env.GOV_ALLOWED_IP_RANGE!
      ]
    })
    .tags({
      'network-isolation': 'Private endpoints only',
      'access-method': 'Azure AD authentication only'
    })
);

// Function app with VNet integration
backend.compute.functionApp.attach(
  compute.functionApp()
    .name('gov-secure-app-func')
    .plan('Premium')
    .sku('EP2')
    .runtime('node', '20')
    .alwaysOn(true)
    .httpsOnly(true)
    .clientCertificateMode('Required')
    .vnetIntegration({
      subnetId: process.env.GOV_VNET_SUBNET_ID!
    })
    .appSettings({
      NODE_ENV: 'production',
      AZURE_CLOUD: 'AzureUSGovernment',
      ENABLE_AUDIT_LOGGING: 'true',
      LOG_RETENTION_DAYS: '365',
      TLS_VERSION: '1.2'
    })
    .tags({
      'network-isolation': 'VNet integrated',
      'certificate-authentication': 'Required'
    })
);

// Network configuration for Government Cloud
if (backend.network) {
  backend.network.vnet.attach(
    network.vnet()
      .name('gov-secure-vnet')
      .addressSpace(['10.0.0.0/16'])
      .subnets([
        {
          name: 'functions',
          addressPrefix: '10.0.1.0/24',
          serviceEndpoints: [
            'Microsoft.Storage',
            'Microsoft.AzureCosmosDB',
            'Microsoft.KeyVault'
          ],
          delegations: [{
            name: 'delegation',
            serviceName: 'Microsoft.Web/serverFarms'
          }]
        },
        {
          name: 'private-endpoints',
          addressPrefix: '10.0.2.0/24',
          privateEndpointNetworkPolicies: 'Disabled',
          privateLinkServiceNetworkPolicies: 'Disabled'
        }
      ])
      .tags({
        'network-segmentation': 'Enabled',
        'service-endpoints': 'Azure services only'
      })
  );
}

// Monitoring configuration for audit compliance
if (backend.monitoring) {
  backend.monitoring.appInsights.attach(
    monitoring.appInsights()
      .name('gov-secure-insights')
      .retentionInDays(365)  // 1 year retention for compliance
      .samplingPercentage(100)  // 100% sampling for audit
      .disableIpMasking(false)  // Keep IP masking for privacy
      .tags({
        'audit-logging': 'Enabled',
        'retention-policy': '365 days'
      })
  );

  backend.monitoring.alerts.attach(
    monitoring.alerts()
      .alert({
        name: 'unauthorized-access-attempt',
        description: 'Alert on 401/403 responses',
        severity: 'Critical',
        frequency: 1,
        timeWindow: 5,
        condition: {
          metric: 'requests/failed',
          aggregation: 'Count',
          operator: 'GreaterThan',
          threshold: 10
        }
      })
      .alert({
        name: 'high-error-rate',
        description: 'Alert on high error rate',
        severity: 'Error',
        frequency: 5,
        timeWindow: 15,
        condition: {
          metric: 'requests/failed',
          aggregation: 'Average',
          operator: 'GreaterThan',
          threshold: 1  // More than 1% error rate
        }
      })
  );
}

export { backend };

/**
 * Deployment:
 *
 * 1. Set environment variables:
 *    export GOV_AZURE_TENANT_ID=...
 *    export GOV_AZURE_CLIENT_ID=...
 *    export GOV_ALLOWED_IP_RANGE=...
 *    export GOV_VNET_SUBNET_ID=...
 *    export GOV_ENCRYPTION_KEY_ID=...
 *
 * 2. Login to Azure Government:
 *    az cloud set --name AzureUSGovernment
 *    az login
 *
 * 3. Synthesize:
 *    atakora synth
 *
 * 4. Deploy:
 *    az deployment group create \
 *      --resource-group rg-gov-secure-app \
 *      --template-file ./synth/template.json \
 *      --parameters ./synth/parameters.production.json
 */
