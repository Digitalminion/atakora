# Managing Secrets Securely

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Workflows](./README.md) > **Managing Secrets**

---

Handling sensitive data like passwords, API keys, and connection strings requires careful attention to security. This guide shows you how to manage secrets securely in your Atakora infrastructure, from development through production deployment.

## Table of Contents

- [Understanding Secret Management](#understanding-secret-management)
- [Azure Key Vault Integration](#azure-key-vault-integration)
- [Secret References in Infrastructure](#secret-references-in-infrastructure)
- [Managing Secrets Across Environments](#managing-secrets-across-environments)
- [CI/CD Secret Handling](#cicd-secret-handling)
- [Local Development](#local-development)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Security Checklist](#security-checklist)

## Understanding Secret Management

### What Are Secrets?

Secrets are sensitive values that should never be committed to source control:

- Database passwords and connection strings
- API keys and tokens
- Storage account access keys
- Certificate private keys
- Service principal credentials
- Encryption keys

### Secret Management Principles

1. **Never commit secrets to source control**
2. **Use managed identities when possible**
3. **Store secrets in Azure Key Vault**
4. **Rotate secrets regularly**
5. **Limit secret access with RBAC**
6. **Audit secret access**
7. **Use separate secrets per environment**

## Azure Key Vault Integration

### Creating a Key Vault

Create Key Vault for secret storage:

```typescript
import { Stack, ResourceGroup, KeyVault } from '@atakora/lib';

export class SecurityStack extends Stack {
  public readonly keyVault: KeyVault;

  constructor(environment: string) {
    super(`security-${environment}`);

    const rg = new ResourceGroup(this, 'security-rg', {
      location: 'eastus',
      tags: { environment }
    });

    this.keyVault = new KeyVault(this, 'secrets-kv', {
      resourceGroup: rg,
      location: rg.location,
      properties: {
        sku: {
          family: 'A',
          name: 'standard'
        },
        tenantId: '${tenantId}',
        enabledForDeployment: true,
        enabledForTemplateDeployment: true,
        enableSoftDelete: true,
        softDeleteRetentionInDays: 90,
        enablePurgeProtection: true,
        accessPolicies: []
      }
    });
  }
}
```

### Storing Secrets in Key Vault

Add secrets to Key Vault:

```typescript
import { Secret } from '@atakora/lib';

export class ApplicationStack extends Stack {
  constructor(environment: string) {
    super(`app-${environment}`);

    const securityStack = new SecurityStack(environment);

    // Store database password
    const dbPasswordSecret = new Secret(this, 'db-password', {
      keyVaultId: securityStack.keyVault.id,
      properties: {
        value: '${secretValue:dbPassword}' // Provided at deployment
      }
    });

    // Store API key
    const apiKeySecret = new Secret(this, 'api-key', {
      keyVaultId: securityStack.keyVault.id,
      properties: {
        value: '${secretValue:apiKey}'
      }
    });

    // Store connection string
    const storageConnSecret = new Secret(this, 'storage-connection', {
      keyVaultId: securityStack.keyVault.id,
      properties: {
        value: '${secretValue:storageConnection}'
      }
    });
  }
}
```

### Granting Access to Key Vault

Use managed identities and access policies:

```typescript
export class WebAppStack extends Stack {
  constructor(environment: string) {
    super(`webapp-${environment}`);

    const rg = new ResourceGroup(this, 'app-rg', {
      location: 'eastus'
    });

    // Create managed identity for web app
    const identity = new ManagedIdentity(this, 'webapp-identity', {
      resourceGroup: rg,
      location: rg.location
    });

    const securityStack = new SecurityStack(environment);

    // Grant web app identity access to Key Vault
    const accessPolicy = new KeyVaultAccessPolicy(this, 'kv-access', {
      keyVaultId: securityStack.keyVault.id,
      tenantId: '${tenantId}',
      objectId: identity.principalId,
      permissions: {
        secrets: ['get', 'list']
      }
    });

    const webApp = new WebApp(this, 'webapp', {
      resourceGroup: rg,
      location: rg.location,
      serverFarmId: plan.id,
      identity: {
        type: 'UserAssigned',
        userAssignedIdentities: {
          [identity.id]: {}
        }
      }
    });
  }
}
```

## Secret References in Infrastructure

### Key Vault Secret References

Reference secrets from Key Vault in your resources:

```typescript
export class WebAppStack extends Stack {
  constructor(environment: string) {
    super(`webapp-${environment}`);

    const securityStack = new SecurityStack(environment);

    const webApp = new WebApp(this, 'webapp', {
      resourceGroup: rg,
      location: 'eastus',
      serverFarmId: plan.id,
      properties: {
        siteConfig: {
          appSettings: [
            {
              name: 'DatabasePassword',
              value: `@Microsoft.KeyVault(SecretUri=${securityStack.keyVault.vaultUri}secrets/db-password/)`
            },
            {
              name: 'ApiKey',
              value: `@Microsoft.KeyVault(SecretUri=${securityStack.keyVault.vaultUri}secrets/api-key/)`
            }
          ],
          connectionStrings: [
            {
              name: 'DefaultConnection',
              connectionString: `@Microsoft.KeyVault(SecretUri=${securityStack.keyVault.vaultUri}secrets/storage-connection/)`,
              type: 'Custom'
            }
          ]
        }
      }
    });
  }
}
```

### Secret Versioning

Reference specific secret versions:

```typescript
// Reference latest version (recommended for most cases)
const latestSecret = `@Microsoft.KeyVault(SecretUri=${keyVault.vaultUri}secrets/my-secret/)`;

// Reference specific version (for guaranteed consistency)
const versionedSecret = `@Microsoft.KeyVault(SecretUri=${keyVault.vaultUri}secrets/my-secret/abc123def456)`;

// Use in app settings
const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus',
  serverFarmId: plan.id,
  properties: {
    siteConfig: {
      appSettings: [
        { name: 'SECRET_LATEST', value: latestSecret },
        { name: 'SECRET_PINNED', value: versionedSecret }
      ]
    }
  }
});
```

### Dynamic Secret Generation

Generate secrets during deployment:

```typescript
import { randomBytes } from 'crypto';

export class DatabaseStack extends Stack {
  constructor(environment: string) {
    super(`database-${environment}`);

    const securityStack = new SecurityStack(environment);

    // Generate strong password
    const adminPassword = randomBytes(32).toString('base64');

    // Store in Key Vault
    const passwordSecret = new Secret(this, 'sql-admin-password', {
      keyVaultId: securityStack.keyVault.id,
      properties: {
        value: adminPassword
      }
    });

    const sqlServer = new SqlServer(this, 'sql-server', {
      resourceGroup: rg,
      location: 'eastus',
      properties: {
        administratorLogin: 'sqladmin',
        administratorLoginPassword: `@Microsoft.KeyVault(SecretUri=${passwordSecret.secretUri})`
      }
    });
  }
}
```

## Managing Secrets Across Environments

### Environment-Specific Key Vaults

Create separate Key Vault per environment:

```typescript
export class EnvironmentSecrets {
  private keyVaults: Map<string, KeyVault> = new Map();

  constructor() {
    this.createKeyVaults();
  }

  private createKeyVaults() {
    const environments = ['dev', 'staging', 'production'];

    for (const env of environments) {
      const stack = new Stack(`secrets-${env}`);
      const rg = new ResourceGroup(stack, `secrets-rg-${env}`, {
        location: 'eastus',
        tags: { environment: env }
      });

      const kv = new KeyVault(stack, `kv-${env}`, {
        resourceGroup: rg,
        location: rg.location,
        properties: {
          sku: { family: 'A', name: 'standard' },
          tenantId: '${tenantId}',
          enableSoftDelete: true,
          enablePurgeProtection: env === 'production'
        }
      });

      this.keyVaults.set(env, kv);
    }
  }

  getKeyVault(environment: string): KeyVault {
    const kv = this.keyVaults.get(environment);
    if (!kv) {
      throw new Error(`Key Vault not found for environment: ${environment}`);
    }
    return kv;
  }
}
```

### Secret Configuration Files

Manage environment-specific secrets:

```typescript
// src/config/secrets.ts
export interface SecretConfig {
  keyVaultName: string;
  secrets: {
    databasePassword: string;
    apiKey: string;
    storageConnection: string;
  };
}

export const secretConfig: Record<string, SecretConfig> = {
  dev: {
    keyVaultName: 'kv-dev-abc123',
    secrets: {
      databasePassword: 'db-password-dev',
      apiKey: 'api-key-dev',
      storageConnection: 'storage-connection-dev'
    }
  },
  production: {
    keyVaultName: 'kv-prod-xyz789',
    secrets: {
      databasePassword: 'db-password-prod',
      apiKey: 'api-key-prod',
      storageConnection: 'storage-connection-prod'
    }
  }
};
```

Use in stacks:

```typescript
import { secretConfig } from './config/secrets';

export class WebAppStack extends Stack {
  constructor(environment: string) {
    super(`webapp-${environment}`);

    const config = secretConfig[environment];
    const keyVaultUri = `https://${config.keyVaultName}.vault.azure.net/`;

    const webApp = new WebApp(this, 'webapp', {
      resourceGroup: rg,
      location: 'eastus',
      serverFarmId: plan.id,
      properties: {
        siteConfig: {
          appSettings: [
            {
              name: 'DatabasePassword',
              value: `@Microsoft.KeyVault(SecretUri=${keyVaultUri}secrets/${config.secrets.databasePassword}/)`
            }
          ]
        }
      }
    });
  }
}
```

## CI/CD Secret Handling

### GitHub Actions

Store secrets in GitHub and inject at deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy Infrastructure
        env:
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          API_KEY: ${{ secrets.API_KEY }}
          STORAGE_CONNECTION: ${{ secrets.STORAGE_CONNECTION }}
        run: |
          # Store secrets in Key Vault during deployment
          az keyvault secret set --vault-name kv-prod --name db-password --value "$DB_PASSWORD"
          az keyvault secret set --vault-name kv-prod --name api-key --value "$API_KEY"
          az keyvault secret set --vault-name kv-prod --name storage-connection --value "$STORAGE_CONNECTION"

          # Deploy infrastructure
          npm run deploy
```

### Azure DevOps

Use Azure Pipelines with Key Vault task:

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: production-secrets  # Variable group linked to Key Vault

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'

  - script: npm ci
    displayName: 'Install dependencies'

  - task: AzureKeyVault@2
    inputs:
      azureSubscription: 'Azure Subscription'
      KeyVaultName: 'kv-prod'
      SecretsFilter: '*'
      RunAsPreJob: true

  - script: |
      # Secrets are now available as environment variables
      npm run deploy
    displayName: 'Deploy infrastructure'
    env:
      DB_PASSWORD: $(db-password)
      API_KEY: $(api-key)
      STORAGE_CONNECTION: $(storage-connection)
```

### Terraform-Style Variable Files

Use deployment-time variable substitution:

```bash
# secrets.tfvars (DO NOT COMMIT)
db_password = "SecurePassword123!"
api_key = "sk-1234567890abcdef"
storage_connection = "DefaultEndpointsProtocol=https;..."
```

```bash
# Deploy with secrets file
atakora deploy --var-file secrets.tfvars
```

## Local Development

### Environment Variables

Use `.env` files for local development (add to `.gitignore`):

```bash
# .env.local (DO NOT COMMIT)
DB_PASSWORD=local-dev-password
API_KEY=local-dev-key
STORAGE_CONNECTION=UseDevelopmentStorage=true
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
```

Load in your code:

```typescript
// src/config/env.ts
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

export const env = {
  dbPassword: process.env.DB_PASSWORD || '',
  apiKey: process.env.API_KEY || '',
  storageConnection: process.env.STORAGE_CONNECTION || '',
  azureTenantId: process.env.AZURE_TENANT_ID || '',
  azureClientId: process.env.AZURE_CLIENT_ID || '',
  azureClientSecret: process.env.AZURE_CLIENT_SECRET || ''
};

// Validate required secrets
const requiredEnvVars = ['DB_PASSWORD', 'API_KEY', 'STORAGE_CONNECTION'];
const missing = requiredEnvVars.filter(v => !process.env[v]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}
```

### Local Key Vault Access

Access Azure Key Vault from local development:

```typescript
import { SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';

export class LocalSecretManager {
  private client: SecretClient;

  constructor(keyVaultName: string) {
    const credential = new DefaultAzureCredential();
    const vaultUrl = `https://${keyVaultName}.vault.azure.net`;

    this.client = new SecretClient(vaultUrl, credential);
  }

  async getSecret(secretName: string): Promise<string> {
    const secret = await this.client.getSecret(secretName);
    return secret.value || '';
  }

  async setSecret(secretName: string, secretValue: string): Promise<void> {
    await this.client.setSecret(secretName, secretValue);
  }
}

// Usage
const secretManager = new LocalSecretManager('kv-dev');
const dbPassword = await secretManager.getSecret('db-password');
```

### Mock Secrets for Testing

Use mock secrets in tests:

```typescript
// test/helpers/mock-secrets.ts
export const mockSecrets = {
  dbPassword: 'test-password-123',
  apiKey: 'test-key-abc',
  storageConnection: 'test-connection-string'
};

export function setupMockSecrets() {
  process.env.DB_PASSWORD = mockSecrets.dbPassword;
  process.env.API_KEY = mockSecrets.apiKey;
  process.env.STORAGE_CONNECTION = mockSecrets.storageConnection;
}
```

```typescript
// test/stacks/webapp.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockSecrets } from '../helpers/mock-secrets';

describe('WebAppStack', () => {
  beforeEach(() => {
    setupMockSecrets();
  });

  it('configures web app with secrets', () => {
    const stack = new WebAppStack('test');
    const template = stack.toTemplate();

    const webApp = template.resources.find(r => r.type === 'Microsoft.Web/sites');
    const appSettings = webApp.properties.siteConfig.appSettings;

    const dbPasswordSetting = appSettings.find(s => s.name === 'DatabasePassword');
    expect(dbPasswordSetting).toBeDefined();
  });
});
```

## Best Practices

### 1. Never Commit Secrets

```bash
# .gitignore
.env
.env.local
.env.*.local
secrets.tfvars
*.key
*.pem
```

Scan for accidentally committed secrets:

```bash
# Use git-secrets or similar tools
git secrets --scan
```

### 2. Use Managed Identities

```typescript
// ✅ Good: Use managed identity
const webApp = new WebApp(this, 'webapp', {
  resourceGroup: rg,
  location: 'eastus',
  serverFarmId: plan.id,
  identity: {
    type: 'SystemAssigned'
  }
});

// Grant access to resources without credentials
const roleAssignment = new RoleAssignment(this, 'storage-access', {
  scope: storage.id,
  roleDefinitionId: 'Storage Blob Data Contributor',
  principalId: webApp.identity.principalId
});

// ❌ Avoid: Storing credentials in app settings
const webApp = new WebApp(this, 'webapp', {
  properties: {
    siteConfig: {
      appSettings: [
        { name: 'STORAGE_ACCOUNT_KEY', value: 'hardcoded-key-123' }
      ]
    }
  }
});
```

### 3. Rotate Secrets Regularly

```typescript
export class SecretRotation {
  async rotateSecret(secretName: string): Promise<void> {
    const newSecret = this.generateStrongSecret();

    // Update Key Vault
    await this.keyVaultClient.setSecret(secretName, newSecret);

    // Update dependent resources
    await this.updateDependentResources(secretName);

    // Verify new secret works
    await this.verifySecret(secretName);

    // Delete old version after grace period
    setTimeout(() => {
      this.deleteOldSecretVersion(secretName);
    }, 7 * 24 * 60 * 60 * 1000); // 7 days
  }

  private generateStrongSecret(): string {
    return randomBytes(32).toString('base64');
  }
}
```

### 4. Audit Secret Access

Enable Key Vault diagnostics:

```typescript
const diagnostics = new DiagnosticSetting(this, 'kv-diagnostics', {
  name: 'audit-logs',
  scope: keyVault.id,
  workspaceId: logAnalytics.id,
  logs: [
    {
      category: 'AuditEvent',
      enabled: true,
      retentionPolicy: {
        enabled: true,
        days: 365
      }
    }
  ]
});
```

### 5. Limit Secret Permissions

```typescript
// ✅ Good: Least privilege access
const accessPolicy = new KeyVaultAccessPolicy(this, 'app-access', {
  keyVaultId: keyVault.id,
  tenantId: '${tenantId}',
  objectId: identity.principalId,
  permissions: {
    secrets: ['get', 'list']  // Read-only
  }
});

// ❌ Avoid: Overly permissive access
const accessPolicy = new KeyVaultAccessPolicy(this, 'app-access', {
  keyVaultId: keyVault.id,
  tenantId: '${tenantId}',
  objectId: identity.principalId,
  permissions: {
    secrets: ['all']  // Too permissive
  }
});
```

## Common Patterns

### Connection String Builder

Build connection strings from Key Vault secrets:

```typescript
export class SecureConnectionString {
  constructor(
    private keyVault: KeyVault,
    private secretPrefix: string
  ) {}

  buildSqlConnection(): string {
    const kvUri = this.keyVault.vaultUri;
    return [
      `Server=@Microsoft.KeyVault(SecretUri=${kvUri}secrets/${this.secretPrefix}-server/)`,
      `Database=@Microsoft.KeyVault(SecretUri=${kvUri}secrets/${this.secretPrefix}-database/)`,
      `User Id=@Microsoft.KeyVault(SecretUri=${kvUri}secrets/${this.secretPrefix}-username/)`,
      `Password=@Microsoft.KeyVault(SecretUri=${kvUri}secrets/${this.secretPrefix}-password/)`
    ].join(';');
  }

  buildStorageConnection(): string {
    const kvUri = this.keyVault.vaultUri;
    return `@Microsoft.KeyVault(SecretUri=${kvUri}secrets/${this.secretPrefix}-storage-connection/)`;
  }
}

// Usage
const connectionBuilder = new SecureConnectionString(keyVault, 'prod-app');
const sqlConnection = connectionBuilder.buildSqlConnection();
```

### Multi-Tenant Secrets

Manage secrets for multiple tenants:

```typescript
export class MultiTenantSecrets {
  private keyVaults: Map<string, KeyVault> = new Map();

  addTenant(tenantId: string, keyVault: KeyVault) {
    this.keyVaults.set(tenantId, keyVault);
  }

  getSecretReference(tenantId: string, secretName: string): string {
    const kv = this.keyVaults.get(tenantId);
    if (!kv) {
      throw new Error(`Key Vault not found for tenant: ${tenantId}`);
    }

    return `@Microsoft.KeyVault(SecretUri=${kv.vaultUri}secrets/${secretName}/)`;
  }
}

// Usage
const tenantSecrets = new MultiTenantSecrets();
tenantSecrets.addTenant('tenant-a', keyVaultA);
tenantSecrets.addTenant('tenant-b', keyVaultB);

const secretRef = tenantSecrets.getSecretReference('tenant-a', 'api-key');
```

## Security Checklist

Before deploying to production:

- [ ] No secrets committed to source control
- [ ] All secrets stored in Azure Key Vault
- [ ] Managed identities used where possible
- [ ] Key Vault has soft delete and purge protection enabled
- [ ] Access policies follow least privilege principle
- [ ] Audit logging enabled on Key Vault
- [ ] Secrets have retention policies
- [ ] Secret rotation process documented
- [ ] CI/CD pipeline secrets stored securely
- [ ] Local development uses separate secrets
- [ ] Production secrets never used in dev/test
- [ ] Secret access limited to necessary resources
- [ ] Emergency secret rotation procedure exists
- [ ] Secret expiration dates set where applicable

## Next Steps

- **[Deploying Environments](./deploying-environments.md)**: Deploy infrastructure with secrets
- **[CI/CD Integration](../tutorials/cicd-integration.md)**: Automate secret management
- **[Government Cloud](../government-cloud/compliance.md)**: Gov Cloud secret requirements

## Related Documentation

- [Azure Key Vault](../../getting-started/common-resources/key-vault.md) - Key Vault resource guide
- [Security Patterns](../patterns/security-patterns.md) - Security best practices
- [Troubleshooting](../../troubleshooting/common-issues.md) - Secret-related issues

---

**Feedback**: Found an issue or have a suggestion? [Open an issue](https://github.com/your-org/atakora/issues) on GitHub.
