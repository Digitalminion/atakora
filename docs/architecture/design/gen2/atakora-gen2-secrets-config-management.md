# Atakora Gen 2: Secrets & Configuration Management

**Status**: Draft
**Created**: 2025-10-14
**Related**: [Gen 2 Core Design](./atakora-gen2-design.md), [Default Infrastructure](./atakora-gen2-default-backend-infrastructure.md)

---

## Overview

This document defines how secrets and configuration are managed in Atakora Gen 2, using **Azure Key Vault as the foundation** for all secrets management.

### Core Principles

1. **Key Vault Always Provisioned** - Every backend gets a Key Vault automatically
2. **Secrets Declared in Code** - Type-safe, compile-time validation
3. **Local .env for Development** - Simple, familiar workflow
4. **CLI for Production Secrets** - Secure, auditable secret management
5. **Managed Identity First** - Minimize secrets through Azure RBAC
6. **Fail Fast** - Validate required secrets before deployment

---

## Architecture

### Key Vault as Default Infrastructure

Key Vault is **always provisioned** as part of `defineBackend()`, alongside Functions, Storage, and Cosmos.

**Provisioned Automatically:**
```typescript
// This is what defineBackend() provisions under the hood
- Key Vault with:
  - Soft delete enabled (90 days retention)
  - Purge protection enabled (prod only)
  - RBAC enabled (not access policies)
  - Private endpoint (prod only)
  - Diagnostic logging to Log Analytics
```

**Naming Convention:**
```
kv-{project}-{environment}-{hash}
Example: kv-colorai-nonprod-a8b2c4
```

**RBAC Assignments:**
- Backend Managed Identity: `Key Vault Secrets User` (read secrets)
- CI/CD Service Principal: `Key Vault Secrets Officer` (set secrets during deployment)
- Developers: `Key Vault Secrets Officer` (dev/nonprod only)
- Developers: No access to prod secrets (security best practice)

---

## Configuration vs Secrets

### Configuration (Non-Sensitive)

**Definition**: Values that can be committed to source control.

**Storage**: Defined in `defineBackend()` and compiled into code.

**Examples**: Feature toggles, API endpoints, timeouts, allowed origins

**Usage:**
```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  config: {
    // Non-sensitive configuration
    maxUploadSizeMb: 10,
    maxRequestSizeMb: 6,
    allowedOrigins: [
      'https://app.colorai.com',
      'https://staging.colorai.com',
    ],
    defaultPageSize: 50,
    maxPageSize: 500,
    enableBetaFeatures: false,
  },
});
```

**Environment-Specific Config:**
```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  config: {
    // Use environment-aware values
    maxUploadSizeMb: process.env.AZURE_ENVIRONMENT === 'prod' ? 50 : 10,
    allowedOrigins: process.env.AZURE_ENVIRONMENT === 'prod'
      ? ['https://app.colorai.com']
      : ['http://localhost:3000', 'https://staging.colorai.com'],
  },
});
```

### Secrets (Sensitive)

**Definition**: Values that should NEVER be committed to source control.

**Storage**: Stored in Azure Key Vault in deployed environments, `.env.local` for local development.

**Examples**: API keys, connection strings, OAuth secrets, encryption keys

**Usage:**
```typescript
const backend = defineBackend({
  feedbackApi,
  emailService,
}, {
  secrets: {
    // External API keys
    SENDGRID_API_KEY: {
      required: true,
      description: 'SendGrid API key for sending emails',
    },

    STRIPE_SECRET_KEY: {
      required: true,
      description: 'Stripe secret key for payment processing',
    },

    // OAuth secrets
    GITHUB_CLIENT_SECRET: {
      required: true,
      description: 'GitHub OAuth client secret',
    },

    // Optional secrets
    SLACK_WEBHOOK_URL: {
      required: false,
      description: 'Slack webhook for notifications (optional)',
    },

    // Encryption keys
    ENCRYPTION_KEY: {
      required: true,
      description: 'AES-256 encryption key for sensitive data',
      generate: 'aes-256', // Auto-generate if not provided
    },
  },
});
```

---

## Developer Workflow

### Local Development

**Step 1: Create `.env.local`** (gitignored, never committed)

```bash
# .env.local (automatically loaded by atakora dev)
SENDGRID_API_KEY=SG.test-key-local
STRIPE_SECRET_KEY=sk_test_51A...
GITHUB_CLIENT_SECRET=abc123...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

**Step 2: Run locally**
```bash
atakora dev

# Atakora automatically:
# 1. Loads .env.local
# 2. Validates required secrets are present
# 3. Makes secrets available to functions via process.env
```

**Step 3: Access secrets in code**
```typescript
// packages/backend/src/email/send.ts
import { getSecret } from '@atakora/component/runtime';

export async function sendEmail(to: string, subject: string, body: string) {
  // Type-safe secret access
  const apiKey = await getSecret('SENDGRID_API_KEY');

  // Use secret
  const client = new SendGridClient(apiKey);
  await client.send({ to, subject, body });
}
```

**Type Safety:**
```typescript
// Auto-generated from defineBackend() secrets declaration
declare module '@atakora/component/runtime' {
  interface Secrets {
    SENDGRID_API_KEY: string;
    STRIPE_SECRET_KEY: string;
    GITHUB_CLIENT_SECRET: string;
    SLACK_WEBHOOK_URL?: string; // Optional
  }
}
```

### Deployed Environments

**Step 1: Set secrets via CLI**

```bash
# Set a secret in nonprod environment
atakora secrets set SENDGRID_API_KEY "SG.prod-key-..." --env nonprod

# Set multiple secrets from a file
atakora secrets set --from-file .env.nonprod --env nonprod

# Generate a secret automatically
atakora secrets generate ENCRYPTION_KEY --type aes-256 --env nonprod

# Set secret for prod (requires elevated permissions)
atakora secrets set SENDGRID_API_KEY "SG.prod-key-..." --env prod
```

**Step 2: Validate secrets before deployment**

```bash
# Check which secrets are set/missing
atakora secrets validate --env nonprod

# Output:
# ✓ SENDGRID_API_KEY - Set
# ✓ STRIPE_SECRET_KEY - Set
# ✓ GITHUB_CLIENT_SECRET - Set
# ✗ ENCRYPTION_KEY - Missing (required)
# ⚠ SLACK_WEBHOOK_URL - Not set (optional)
```

**Step 3: Deploy**

```bash
atakora deploy --env nonprod

# Deployment automatically:
# 1. Validates all required secrets are in Key Vault
# 2. Grants backend Managed Identity access to Key Vault
# 3. Injects Key Vault reference into Function App settings
```

**Step 4: Access secrets in deployed functions**

```typescript
// Same code works in local AND deployed!
import { getSecret } from '@atakora/component/runtime';

export async function handler(context: FunctionContext) {
  const apiKey = await getSecret('SENDGRID_API_KEY');
  // Use apiKey...
}
```

**How it works deployed:**
- Function App has Managed Identity
- Managed Identity has `Key Vault Secrets User` role
- `getSecret()` fetches from Key Vault at runtime
- Secrets are cached in memory for performance

---

## CLI Commands

### `atakora secrets list`

List all declared secrets and their status.

```bash
atakora secrets list --env nonprod

# Output:
# Secret                    Status    Last Updated       Description
# SENDGRID_API_KEY          Set       2025-10-14 10:23   SendGrid API key for sending emails
# STRIPE_SECRET_KEY         Set       2025-10-14 10:23   Stripe secret key for payment processing
# GITHUB_CLIENT_SECRET      Set       2025-10-14 10:24   GitHub OAuth client secret
# SLACK_WEBHOOK_URL         Not Set   -                  Slack webhook for notifications (optional)
# ENCRYPTION_KEY            Set       2025-10-14 10:25   AES-256 encryption key for sensitive data
```

### `atakora secrets set`

Set a secret in Key Vault.

```bash
# Interactive prompt (secure, hidden input)
atakora secrets set SENDGRID_API_KEY --env nonprod

# From stdin (useful for CI/CD)
echo "SG.prod-key-..." | atakora secrets set SENDGRID_API_KEY --env nonprod

# From environment variable
export SENDGRID_API_KEY="SG.prod-key-..."
atakora secrets set SENDGRID_API_KEY --from-env --env nonprod

# From file (multiple secrets)
atakora secrets set --from-file .env.nonprod --env nonprod

# With expiration (auto-rotate reminder)
atakora secrets set SENDGRID_API_KEY --expires-in 90d --env prod
```

**Security Features:**
- Secrets never appear in command history (interactive prompt)
- All secret operations are logged to Azure Activity Log
- Requires Azure authentication (`az login`)
- Requires appropriate RBAC permissions

### `atakora secrets get`

Retrieve a secret value (use sparingly, audit logged).

```bash
# Get a secret (requires Key Vault Secrets Officer role)
atakora secrets get SENDGRID_API_KEY --env nonprod

# Output to file (useful for local testing)
atakora secrets get SENDGRID_API_KEY --env nonprod > .env.local
```

**Security Warning:**
- This operation is audit logged
- Only available to developers with Key Vault Secrets Officer role
- NOT available for prod environment (security best practice)
- Recommend using `atakora dev --remote` instead for testing with real secrets

### `atakora secrets generate`

Generate a secret automatically.

```bash
# Generate random secret
atakora secrets generate ENCRYPTION_KEY --type aes-256 --env nonprod

# Generate JWT signing key
atakora secrets generate JWT_SIGNING_KEY --type rsa-2048 --env nonprod

# Generate random API key
atakora secrets generate API_KEY --type random --length 32 --env nonprod
```

**Supported Types:**
- `aes-256` - AES-256 encryption key (base64)
- `rsa-2048` - RSA 2048-bit key pair (PEM)
- `rsa-4096` - RSA 4096-bit key pair (PEM)
- `random` - Random string (alphanumeric)
- `uuid` - UUID v4

### `atakora secrets delete`

Delete a secret from Key Vault.

```bash
# Delete a secret (soft delete, recoverable for 90 days)
atakora secrets delete SLACK_WEBHOOK_URL --env nonprod

# Permanently delete (requires purge permission, prod only with confirmation)
atakora secrets delete SENDGRID_API_KEY --purge --env prod
```

### `atakora secrets validate`

Validate all required secrets are set.

```bash
# Validate secrets for an environment
atakora secrets validate --env nonprod

# Exit codes:
# 0 - All required secrets present
# 1 - One or more required secrets missing
# 2 - Authentication/permission error
```

**Automatic Validation:**
- Runs automatically during `atakora deploy`
- Runs automatically during `atakora dev` (checks .env.local)
- Can be added to CI/CD pipelines

### `atakora secrets rotate`

Rotate a secret (advanced).

```bash
# Rotate a secret (creates new version, old version still accessible)
atakora secrets rotate SENDGRID_API_KEY --env prod

# Schedule rotation reminder
atakora secrets rotate SENDGRID_API_KEY --schedule 90d --env prod
```

**Rotation Workflow:**
1. Generate new secret value externally (e.g., in SendGrid dashboard)
2. Set new value: `atakora secrets set SENDGRID_API_KEY --env prod`
3. Deploy with new value: `atakora deploy --env prod`
4. Old value remains accessible for rollback period (30 days)
5. Purge old value: `atakora secrets delete SENDGRID_API_KEY --version 1 --purge`

### `atakora secrets sync`

Sync secrets between environments (useful for dev → staging).

```bash
# Copy secrets from nonprod to staging
atakora secrets sync --from nonprod --to staging

# Copy specific secrets only
atakora secrets sync --from nonprod --to staging --only SENDGRID_API_KEY,STRIPE_SECRET_KEY

# Dry run (show what would be copied)
atakora secrets sync --from nonprod --to staging --dry-run
```

**Safety:**
- Cannot sync FROM prod (one-way protection)
- Requires confirmation for each secret
- Audit logged

---

## Type Generation

### Auto-Generated Types

When you declare secrets in `defineBackend()`, Atakora automatically generates TypeScript types.

**Input (in `packages/backend/src/index.ts`):**
```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  secrets: {
    SENDGRID_API_KEY: { required: true },
    STRIPE_SECRET_KEY: { required: true },
    SLACK_WEBHOOK_URL: { required: false },
  },
  config: {
    maxUploadSizeMb: 10,
    allowedOrigins: ['https://app.colorai.com'],
  },
});
```

**Generated (in `packages/backend/.atakora/types.d.ts`):**
```typescript
// Auto-generated by Atakora - DO NOT EDIT

declare module '@atakora/component/runtime' {
  // Secrets interface
  interface Secrets {
    SENDGRID_API_KEY: string;
    STRIPE_SECRET_KEY: string;
    SLACK_WEBHOOK_URL?: string;
  }

  // Config interface
  interface Config {
    maxUploadSizeMb: number;
    allowedOrigins: string[];
  }

  // Runtime functions
  export function getSecret<K extends keyof Secrets>(
    key: K
  ): Promise<Secrets[K]>;

  export function getConfig<K extends keyof Config>(
    key: K
  ): Config[K];
}
```

### Type-Safe Access

**In your function code:**
```typescript
import { getSecret, getConfig } from '@atakora/component/runtime';

export async function handler() {
  // ✓ Type-safe - autocomplete works
  const apiKey = await getSecret('SENDGRID_API_KEY');

  // ✗ TypeScript error - not declared in defineBackend()
  const invalid = await getSecret('INVALID_SECRET');

  // ✓ Config access (synchronous, no async)
  const maxSize = getConfig('maxUploadSizeMb');
}
```

### Environment Variables (Type-Safe)

**For config that varies by environment:**
```typescript
const backend = defineBackend({
  feedbackApi,
}, {
  config: {
    maxUploadSizeMb: env.number('MAX_UPLOAD_SIZE_MB', 10),
    allowedOrigins: env.array('ALLOWED_ORIGINS', [
      'https://app.colorai.com',
    ]),
    enableBetaFeatures: env.boolean('ENABLE_BETA_FEATURES', false),
  },
});
```

**Type-safe env helper:**
```typescript
// Provided by @atakora/component
const env = {
  string: (key: string, defaultValue: string) => process.env[key] ?? defaultValue,
  number: (key: string, defaultValue: number) => Number(process.env[key] ?? defaultValue),
  boolean: (key: string, defaultValue: boolean) => process.env[key] === 'true',
  array: (key: string, defaultValue: string[]) =>
    process.env[key]?.split(',') ?? defaultValue,
};
```

---

## Secret References in Components

### In `defineCrudApi()`

Secrets can be referenced in CRUD API handlers.

```typescript
export const feedbackApi = defineCrudApi({
  name: 'feedback',
  schema: {
    rating: a.number().required(),
    email: a.email().required(),
  },
  hooks: {
    afterCreate: async ({ record }) => {
      // Access secrets in hooks
      const apiKey = await getSecret('SENDGRID_API_KEY');
      await sendEmail(record.email, 'Thank you!', apiKey);
    },
  },
});
```

### In `defineFunction()`

Secrets are available via `getSecret()` in any function.

```typescript
export const sendWelcomeEmail = defineFunction({
  name: 'send-welcome-email',
  entry: './handler.ts',
  trigger: { type: 'queue', queueName: 'new-users' },
});

// handler.ts
import { getSecret } from '@atakora/component/runtime';

export async function handler(context: FunctionContext) {
  const apiKey = await getSecret('SENDGRID_API_KEY');
  // Send email...
}
```

### In `defineData()` Custom Mutations

```typescript
export const data = defineData({
  schema: a.schema({
    // ...models
  }),
  mutations: {
    initiatePasswordReset: a.mutation()
      .arguments({ email: a.string().required() })
      .handler(async ({ email }) => {
        const apiKey = await getSecret('SENDGRID_API_KEY');
        // Send password reset email
      }),
  },
});
```

---

## Managed Identity First

### Minimize Secrets Through Azure RBAC

Atakora uses **Managed Identity** wherever possible to eliminate secrets.

**Never Needed as Secrets:**
- Cosmos DB connection string → Use Managed Identity
- Storage Account connection string → Use Managed Identity
- Key Vault access → Use Managed Identity
- Service Bus connection string → Use Managed Identity
- Event Hubs connection string → Use Managed Identity

**Example (auto-configured by Atakora):**
```typescript
// Backend code (no secrets needed!)
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

// Atakora provides this pre-configured client
const client = new CosmosClient({
  endpoint: backend.cosmos.endpoint,
  aadCredentials: new DefaultAzureCredential(),
});
```

**RBAC Assignments (automatic):**
- Backend Managed Identity → Cosmos DB Data Contributor
- Backend Managed Identity → Storage Blob Data Contributor
- Backend Managed Identity → Key Vault Secrets User
- Backend Managed Identity → Service Bus Data Sender/Receiver

**Only Need Secrets For:**
- External SaaS APIs (SendGrid, Stripe, Twilio)
- OAuth secrets (GitHub, Google, Auth0)
- Encryption keys
- Webhook URLs
- API keys for non-Azure services

---

## Security & Access Control

### RBAC Roles

**Key Vault Secrets User** (Read-Only)
- Backend Managed Identity (all environments)
- Read secrets at runtime

**Key Vault Secrets Officer** (Read/Write)
- CI/CD Service Principal (all environments)
- Developers (dev/nonprod only)
- Set/update secrets via CLI

**No Access**
- Developers to prod Key Vault (security best practice)
- External services (use Managed Identity instead)

### Audit Logging

All secret operations are logged to Azure Activity Log and Log Analytics.

**Logged Events:**
- Secret created/updated/deleted
- Secret accessed (who, when, from where)
- Failed access attempts
- RBAC changes

**Pre-Built Queries:**
```kql
// Who accessed SENDGRID_API_KEY in the last 7 days?
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where OperationName == "SecretGet"
| where id_s contains "SENDGRID-API-KEY"
| where TimeGenerated > ago(7d)
| project TimeGenerated, CallerIPAddress, identity_claim_oid_g, ResultSignature
| order by TimeGenerated desc
```

### Security Best Practices

**DO:**
- ✓ Use `.env.local` for local development (gitignored)
- ✓ Use `atakora secrets set` for deployed environments
- ✓ Rotate secrets regularly (90-day reminder)
- ✓ Use Managed Identity for Azure resources
- ✓ Grant least privilege RBAC
- ✓ Monitor secret access in production

**DON'T:**
- ✗ Commit secrets to Git (use `.env.local`, never `.env`)
- ✗ Share secrets via Slack/email
- ✗ Grant developers access to prod secrets
- ✗ Use connection strings when Managed Identity is available
- ✗ Store secrets in code or config files
- ✗ Use the same secrets across environments

---

## Deployment Validation

### Pre-Deployment Checks

Before `atakora deploy` runs, the following validations occur:

**1. Required Secrets Validation**
```bash
atakora deploy --env nonprod

# Step 1: Validate required secrets
✓ SENDGRID_API_KEY - Present in Key Vault
✓ STRIPE_SECRET_KEY - Present in Key Vault
✓ GITHUB_CLIENT_SECRET - Present in Key Vault
✗ ENCRYPTION_KEY - Missing (required)

Error: Missing required secrets. Run:
  atakora secrets set ENCRYPTION_KEY --env nonprod
```

**2. RBAC Permissions Check**
```bash
# Verify backend Managed Identity has Key Vault access
✓ Managed Identity has 'Key Vault Secrets User' role
✓ Managed Identity has 'Cosmos DB Data Contributor' role
✓ Managed Identity has 'Storage Blob Data Contributor' role
```

**3. Key Vault Configuration Check**
```bash
✓ Soft delete enabled
✓ Purge protection enabled (prod only)
✓ Private endpoint configured (prod only)
✓ Diagnostic logging enabled
```

### Deployment Failures

**Missing Secret:**
```bash
Error: Secret 'SENDGRID_API_KEY' is required but not found in Key Vault

To fix:
  atakora secrets set SENDGRID_API_KEY --env nonprod

Or generate automatically:
  atakora secrets generate SENDGRID_API_KEY --type random --env nonprod
```

**Permission Denied:**
```bash
Error: Unable to access Key Vault 'kv-colorai-nonprod-a8b2c4'

You need 'Key Vault Secrets Officer' role assignment.

Ask your Azure administrator to run:
  az role assignment create \
    --assignee <your-email> \
    --role "Key Vault Secrets Officer" \
    --scope /subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/kv-colorai-nonprod-a8b2c4
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Nonprod

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Set Secrets
        run: |
          # Set secrets from GitHub Secrets
          echo "${{ secrets.SENDGRID_API_KEY }}" | \
            atakora secrets set SENDGRID_API_KEY --from-stdin --env nonprod

          echo "${{ secrets.STRIPE_SECRET_KEY }}" | \
            atakora secrets set STRIPE_SECRET_KEY --from-stdin --env nonprod

      - name: Validate Secrets
        run: atakora secrets validate --env nonprod

      - name: Deploy
        run: atakora deploy --env nonprod
```

### Azure DevOps Example

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: AzureCLI@2
    displayName: 'Set Secrets'
    inputs:
      azureSubscription: 'Atakora-Nonprod'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        echo "$(SENDGRID_API_KEY)" | \
          atakora secrets set SENDGRID_API_KEY --from-stdin --env nonprod

        echo "$(STRIPE_SECRET_KEY)" | \
          atakora secrets set STRIPE_SECRET_KEY --from-stdin --env nonprod

  - task: Bash@3
    displayName: 'Validate Secrets'
    inputs:
      targetType: 'inline'
      script: atakora secrets validate --env nonprod

  - task: Bash@3
    displayName: 'Deploy'
    inputs:
      targetType: 'inline'
      script: atakora deploy --env nonprod
```

---

## Migration from Gen 1

### Current State (Gen 1)

Gen 1 requires manual Key Vault management:

```typescript
// Gen 1 - Manual Key Vault reference
const backend = createBackend({
  providers: {
    functions: new FunctionsProvider(),
    cosmos: new CosmosProvider(),
  },
  components: [feedbackApi],
});

// Manual Function App settings
functionApp.appSettings = {
  SENDGRID_API_KEY: `@Microsoft.KeyVault(SecretUri=${keyVault.uri}/secrets/SENDGRID-API-KEY/)`,
};
```

### Gen 2 Migration

```typescript
// Gen 2 - Automatic Key Vault management
const backend = defineBackend({
  feedbackApi,
}, {
  secrets: {
    SENDGRID_API_KEY: { required: true },
  },
});

// Everything else automatic:
// - Key Vault provisioned
// - RBAC assigned
// - Function App settings configured
// - Type generation
```

### Migration Steps

1. **Add secrets declaration to `defineBackend()`**
2. **Set secrets via CLI**: `atakora secrets set SENDGRID_API_KEY --env nonprod`
3. **Remove manual Key Vault code**
4. **Update secret access**: Use `getSecret()` instead of `process.env`
5. **Deploy**: `atakora deploy --env nonprod`

---

## Cost Analysis

### Key Vault Costs

**Operations:**
- First 10,000 operations/month: Free
- Additional operations: $0.03 per 10,000

**Secrets:**
- Secret storage: $0.033 per secret per month
- Certificate renewals: $3.00 per renewal

**Hardware Security Module (HSM):**
- Protected keys: $1.00 per key per month
- HSM operations: $0.30 per 10,000

**Typical Backend Costs:**
- 10 secrets × $0.033 = $0.33/month
- 100,000 operations × $0.03 / 10,000 = $0.30/month
- **Total: ~$0.63/month per environment**

**Negligible compared to other Azure resources** (Functions, Cosmos, Storage cost $25-4000/month).

---

## Future Enhancements

### V2 Features (Post-Launch)

1. **Secret Versioning UI**
   - Web interface for viewing secret versions
   - Rollback to previous versions
   - Compare versions

2. **Automatic Rotation**
   - Auto-rotate database credentials
   - Integration with Azure AD app registration rotation
   - Rotation workflows for external APIs

3. **Secret Scanning**
   - Scan Git history for accidentally committed secrets
   - Pre-commit hooks to prevent secret commits
   - Integration with GitHub secret scanning

4. **App Configuration Integration**
   - Optional App Configuration for feature flags
   - Runtime configuration changes without redeployment
   - Gradual rollout of feature flags

5. **Secret Sharing Groups**
   - Define secret groups (e.g., "email-service" group)
   - Components declare group dependencies
   - Easier secret management for large backends

---

## Summary

### Key Takeaways

1. **Key Vault is automatic** - Every backend gets one, no manual setup
2. **Secrets are type-safe** - Compile-time validation, autocomplete
3. **Local .env workflow** - Simple development experience
4. **CLI for production** - `atakora secrets` commands
5. **Managed Identity first** - Minimize secrets through RBAC
6. **Fail fast** - Validate before deployment
7. **Audit everything** - All secret access logged

### Developer Experience

**Before (Gen 1):**
- Manual Key Vault provisioning
- Manual RBAC assignments
- Manual Function App settings
- No type safety
- No validation

**After (Gen 2):**
- Key Vault provisioned automatically
- RBAC assigned automatically
- Type-safe secret access
- Pre-deployment validation
- Simple CLI commands

**Time Savings**: ~30 minutes per secret, ~4 hours per backend setup

---

## Related Documents

- [Gen 2 Core Design](./atakora-gen2-design.md)
- [Default Infrastructure](./atakora-gen2-default-backend-infrastructure.md)
- [Authentication](./atakora-gen2-authentication.md)
- [Local Development](./atakora-gen2-local-development.md) (TODO)
- [Deployment & State Management](./atakora-gen2-deployment-state.md) (TODO)

---

**Last Updated**: 2025-10-14
**Status**: Draft - Ready for Review
