# Deploying Multi-Environment Infrastructure

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Workflows](./README.md) > **Deploying Environments**

---

Managing multiple environments (development, staging, production) is essential for safe infrastructure delivery. This guide shows you how to structure, configure, and deploy infrastructure across environments with confidence.

## Table of Contents

- [Environment Strategy](#environment-strategy)
- [Configuration Management](#configuration-management)
- [Deployment Workflows](#deployment-workflows)
- [Environment Promotion](#environment-promotion)
- [Managing Environment Drift](#managing-environment-drift)
- [Production Deployment](#production-deployment)
- [Rollback Strategies](#rollback-strategies)
- [Common Patterns](#common-patterns)
- [Best Practices](#best-practices)

## Environment Strategy

### Standard Environment Tiers

Most organizations use three core environments:

```
Development → Staging → Production
```

**Development (Dev)**
- Purpose: Active development and experimentation
- Changes: Frequent, sometimes breaking
- Cost: Optimized for minimal spend
- Data: Synthetic test data
- Availability: Best effort

**Staging (Pre-Production)**
- Purpose: Production validation and testing
- Changes: Controlled, tested changes only
- Cost: Similar to production sizing
- Data: Anonymized production data or realistic synthetic data
- Availability: High, mirrors production

**Production (Prod)**
- Purpose: Serve real users
- Changes: Carefully reviewed and tested
- Cost: Optimized for performance and reliability
- Data: Real production data
- Availability: Maximum, with SLA commitments

### Extended Environment Models

Some teams add additional environments:

```
Development → Integration → QA → Staging → Production
```

Or per-feature environments:

```
feature-branches → dev → staging → production
```

## Configuration Management

### Environment Configuration Files

Create configuration files per environment:

```typescript
// src/config/base.ts
export interface EnvironmentConfig {
  environment: string;
  location: string;
  resourceGroup: string;
  tags: Record<string, string>;
  appService: {
    sku: { name: string; tier: string };
    alwaysOn: boolean;
  };
  database: {
    sku: { name: string; tier: string };
    backupRetentionDays: number;
  };
  monitoring: {
    enabled: boolean;
    retentionDays: number;
  };
}
```

```typescript
// src/config/dev.ts
import { EnvironmentConfig } from './base';

export const devConfig: EnvironmentConfig = {
  environment: 'dev',
  location: 'eastus',
  resourceGroup: 'rg-dev',
  tags: {
    environment: 'development',
    managedBy: 'atakora',
    costCenter: 'engineering'
  },
  appService: {
    sku: { name: 'B1', tier: 'Basic' },
    alwaysOn: false
  },
  database: {
    sku: { name: 'Basic', tier: 'Basic' },
    backupRetentionDays: 7
  },
  monitoring: {
    enabled: false,
    retentionDays: 30
  }
};
```

```typescript
// src/config/production.ts
import { EnvironmentConfig } from './base';

export const productionConfig: EnvironmentConfig = {
  environment: 'production',
  location: 'eastus',
  resourceGroup: 'rg-prod',
  tags: {
    environment: 'production',
    managedBy: 'atakora',
    costCenter: 'engineering',
    businessUnit: 'platform'
  },
  appService: {
    sku: { name: 'P1v2', tier: 'PremiumV2' },
    alwaysOn: true
  },
  database: {
    sku: { name: 'S2', tier: 'Standard' },
    backupRetentionDays: 35
  },
  monitoring: {
    enabled: true,
    retentionDays: 90
  }
};
```

### Configuration Loader

Load configuration based on environment:

```typescript
// src/config/index.ts
import { devConfig } from './dev';
import { stagingConfig } from './staging';
import { productionConfig } from './production';
import { EnvironmentConfig } from './base';

const configs: Record<string, EnvironmentConfig> = {
  dev: devConfig,
  staging: stagingConfig,
  production: productionConfig
};

export function getConfig(environment?: string): EnvironmentConfig {
  const env = environment || process.env.ENVIRONMENT || 'dev';

  const config = configs[env];
  if (!config) {
    throw new Error(
      `No configuration found for environment: ${env}. ` +
      `Available environments: ${Object.keys(configs).join(', ')}`
    );
  }

  return config;
}

export { EnvironmentConfig };
```

### Using Configuration in Stacks

Apply environment-specific configuration:

```typescript
import { Stack, ResourceGroup, AppServicePlan, WebApp } from '@atakora/lib';
import { getConfig } from './config';

export class WebApplicationStack extends Stack {
  constructor(environment?: string) {
    const config = getConfig(environment);
    super(`webapp-${config.environment}`);

    const rg = new ResourceGroup(this, 'rg', {
      location: config.location,
      tags: config.tags
    });

    const plan = new AppServicePlan(this, 'plan', {
      resourceGroup: rg,
      location: config.location,
      sku: config.appService.sku
    });

    const webApp = new WebApp(this, 'webapp', {
      resourceGroup: rg,
      location: config.location,
      serverFarmId: plan.id,
      properties: {
        siteConfig: {
          alwaysOn: config.appService.alwaysOn
        }
      },
      tags: config.tags
    });

    // Conditional resources based on environment
    if (config.monitoring.enabled) {
      const appInsights = new ApplicationInsights(this, 'insights', {
        resourceGroup: rg,
        location: config.location,
        kind: 'web',
        properties: {
          retentionInDays: config.monitoring.retentionDays
        }
      });

      webApp.addAppSetting(
        'APPINSIGHTS_INSTRUMENTATIONKEY',
        appInsights.instrumentationKey
      );
    }
  }
}
```

## Deployment Workflows

### Single Environment Deployment

Deploy to a specific environment:

```bash
# Deploy to development
atakora deploy --package webapp --var environment=dev

# Deploy to staging
atakora deploy --package webapp --var environment=staging

# Deploy to production
atakora deploy --package webapp --var environment=production
```

### Multi-Environment Deployment Script

Automate deployment across environments:

```bash
#!/bin/bash
# scripts/deploy-all.sh

set -e

ENVIRONMENTS=("dev" "staging" "production")

for env in "${ENVIRONMENTS[@]}"; do
  echo "Deploying to $env..."

  # Set Azure context for environment
  az account set --subscription "subscription-$env"

  # Deploy infrastructure
  atakora deploy --package webapp --var environment=$env

  # Wait for deployment to stabilize
  sleep 30

  # Verify deployment
  atakora verify --package webapp --var environment=$env

  echo "✓ Successfully deployed to $env"
done

echo "All environments deployed successfully!"
```

### Progressive Deployment

Deploy to environments sequentially with validation:

```bash
#!/bin/bash
# scripts/progressive-deploy.sh

set -e

deploy_and_verify() {
  local env=$1

  echo "Deploying to $env..."
  atakora deploy --package webapp --var environment=$env

  echo "Running smoke tests for $env..."
  npm run test:smoke -- --env=$env

  if [ $? -ne 0 ]; then
    echo "❌ Smoke tests failed for $env. Aborting deployment."
    exit 1
  fi

  echo "✓ $env deployment verified"
}

# Deploy progressively
deploy_and_verify "dev"

read -p "Proceed to staging? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  deploy_and_verify "staging"
else
  echo "Staging deployment skipped"
  exit 0
fi

read -p "Proceed to production? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  deploy_and_verify "production"
  echo "🎉 Production deployment complete!"
else
  echo "Production deployment skipped"
fi
```

### CI/CD Pipeline Deployment

GitHub Actions workflow for multi-environment deployment:

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main

jobs:
  deploy-dev:
    name: Deploy to Development
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop' || github.event_name == 'pull_request'
    environment: development

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
          creds: ${{ secrets.AZURE_CREDENTIALS_DEV }}

      - name: Deploy to Dev
        run: |
          atakora deploy --package webapp --var environment=dev

      - name: Run Smoke Tests
        run: npm run test:smoke -- --env=dev

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: deploy-dev
    if: github.ref == 'refs/heads/main'
    environment: staging

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
          creds: ${{ secrets.AZURE_CREDENTIALS_STAGING }}

      - name: Deploy to Staging
        run: |
          atakora deploy --package webapp --var environment=staging

      - name: Run Integration Tests
        run: npm run test:integration -- --env=staging

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://app.example.com

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
          creds: ${{ secrets.AZURE_CREDENTIALS_PROD }}

      - name: Deploy to Production
        run: |
          atakora deploy --package webapp --var environment=production

      - name: Run Smoke Tests
        run: npm run test:smoke -- --env=production

      - name: Notify Success
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: '✓ Production deployment successful'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Environment Promotion

### Manual Promotion

Promote tested infrastructure to next environment:

```bash
#!/bin/bash
# scripts/promote.sh

FROM_ENV=$1
TO_ENV=$2

if [ -z "$FROM_ENV" ] || [ -z "$TO_ENV" ]; then
  echo "Usage: ./promote.sh <from-env> <to-env>"
  echo "Example: ./promote.sh staging production"
  exit 1
fi

echo "Promoting infrastructure from $FROM_ENV to $TO_ENV..."

# Compare configurations
echo "Comparing $FROM_ENV and $TO_ENV..."
atakora diff --from-env=$FROM_ENV --to-env=$TO_ENV

read -p "Proceed with promotion? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Promotion cancelled"
  exit 0
fi

# Deploy to target environment
echo "Deploying to $TO_ENV..."
atakora deploy --package webapp --var environment=$TO_ENV

echo "✓ Promotion complete: $FROM_ENV → $TO_ENV"
```

### Automated Promotion

Promote automatically after successful testing:

```typescript
// scripts/auto-promote.ts
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PromotionConfig {
  from: string;
  to: string;
  tests: string[];
  approvalRequired: boolean;
}

const promotions: PromotionConfig[] = [
  {
    from: 'dev',
    to: 'staging',
    tests: ['unit', 'integration'],
    approvalRequired: false
  },
  {
    from: 'staging',
    to: 'production',
    tests: ['smoke', 'security'],
    approvalRequired: true
  }
];

async function runTests(tests: string[]): Promise<boolean> {
  for (const test of tests) {
    console.log(`Running ${test} tests...`);
    try {
      await execAsync(`npm run test:${test}`);
      console.log(`✓ ${test} tests passed`);
    } catch (error) {
      console.error(`❌ ${test} tests failed`);
      return false;
    }
  }
  return true;
}

async function promote(config: PromotionConfig): Promise<void> {
  console.log(`\nPromoting from ${config.from} to ${config.to}...`);

  // Run tests
  const testsPass = await runTests(config.tests);
  if (!testsPass) {
    throw new Error('Tests failed, promotion aborted');
  }

  // Check for approval if required
  if (config.approvalRequired) {
    console.log('Approval required for this promotion');
    // Implement approval logic (e.g., check for GitHub approval)
    return;
  }

  // Deploy to target environment
  console.log(`Deploying to ${config.to}...`);
  await execAsync(
    `atakora deploy --package webapp --var environment=${config.to}`
  );

  console.log(`✓ Successfully promoted to ${config.to}`);
}

async function main() {
  for (const promotion of promotions) {
    try {
      await promote(promotion);
    } catch (error) {
      console.error(`Promotion failed: ${error}`);
      process.exit(1);
    }
  }
}

main();
```

## Managing Environment Drift

### Detecting Drift

Compare deployed infrastructure with code:

```bash
# Check for drift in development
atakora diff --var environment=dev

# Check for drift in production
atakora diff --var environment=production

# Detailed drift analysis
atakora diff --var environment=production --detailed
```

### Drift Detection Automation

Automated drift detection:

```yaml
# .github/workflows/drift-detection.yml
name: Drift Detection

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, production]

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
          creds: ${{ secrets[format('AZURE_CREDENTIALS_{0}', matrix.environment)] }}

      - name: Detect Drift
        id: drift
        run: |
          OUTPUT=$(atakora diff --var environment=${{ matrix.environment }})
          echo "drift_output<<EOF" >> $GITHUB_OUTPUT
          echo "$OUTPUT" >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

          if [ -n "$OUTPUT" ]; then
            echo "drift_detected=true" >> $GITHUB_OUTPUT
          else
            echo "drift_detected=false" >> $GITHUB_OUTPUT
          fi

      - name: Create Issue if Drift Detected
        if: steps.drift.outputs.drift_detected == 'true'
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `Infrastructure Drift Detected: ${{ matrix.environment }}`,
              body: `Drift detected in ${{ matrix.environment }} environment:\n\n\`\`\`\n${{ steps.drift.outputs.drift_output }}\n\`\`\``,
              labels: ['infrastructure', 'drift', '${{ matrix.environment }}']
            })
```

### Reconciling Drift

Fix drift by re-deploying or updating code:

```bash
# Option 1: Re-deploy from code (preferred)
atakora deploy --var environment=production

# Option 2: Import manual changes into code
atakora import --resource-type Microsoft.Web/sites --resource-name myapp-prod

# Option 3: Accept manual changes
# Update your code to match the manual changes
```

## Production Deployment

### Pre-Deployment Checklist

Before deploying to production:

```typescript
// scripts/pre-deploy-checks.ts
interface PreDeploymentCheck {
  name: string;
  check: () => Promise<boolean>;
  critical: boolean;
}

const checks: PreDeploymentCheck[] = [
  {
    name: 'All tests passing',
    check: async () => {
      const { stdout } = await execAsync('npm test');
      return !stdout.includes('failed');
    },
    critical: true
  },
  {
    name: 'No secrets in code',
    check: async () => {
      const { stdout } = await execAsync('git secrets --scan');
      return stdout === '';
    },
    critical: true
  },
  {
    name: 'Dependencies up to date',
    check: async () => {
      const { stdout } = await execAsync('npm outdated');
      return !stdout.includes('MAJOR');
    },
    critical: false
  },
  {
    name: 'Staging tests passed',
    check: async () => {
      // Check staging test results
      return true;
    },
    critical: true
  },
  {
    name: 'Change approval received',
    check: async () => {
      // Check for approval in ticketing system
      return true;
    },
    critical: true
  }
];

async function runPreDeploymentChecks(): Promise<void> {
  console.log('Running pre-deployment checks...\n');

  let criticalFailures = false;

  for (const check of checks) {
    process.stdout.write(`Checking: ${check.name}... `);
    try {
      const result = await check.check();
      if (result) {
        console.log('✓');
      } else {
        console.log('✗');
        if (check.critical) {
          criticalFailures = true;
        }
      }
    } catch (error) {
      console.log('✗ (error)');
      if (check.critical) {
        criticalFailures = true;
      }
    }
  }

  if (criticalFailures) {
    console.error('\n❌ Critical checks failed. Deployment aborted.');
    process.exit(1);
  }

  console.log('\n✓ All pre-deployment checks passed');
}

runPreDeploymentChecks();
```

### Production Deployment Process

```bash
#!/bin/bash
# scripts/deploy-production.sh

set -e

echo "=== Production Deployment ==="
echo

# 1. Pre-deployment checks
echo "Step 1: Running pre-deployment checks..."
npm run predeploy:checks

# 2. Backup current state
echo "Step 2: Backing up current production state..."
atakora export --var environment=production > backup-$(date +%Y%m%d-%H%M%S).json

# 3. Show changes
echo "Step 3: Reviewing changes..."
atakora diff --var environment=production

read -p "Continue with deployment? (yes/no) " -r
if [[ ! $REPLY == "yes" ]]; then
  echo "Deployment cancelled"
  exit 0
fi

# 4. Deploy
echo "Step 4: Deploying to production..."
atakora deploy --var environment=production

# 5. Verify deployment
echo "Step 5: Verifying deployment..."
npm run test:smoke -- --env=production

# 6. Monitor
echo "Step 6: Monitoring deployment..."
npm run monitor -- --env=production --duration=5m

echo
echo "✓ Production deployment complete!"
```

## Rollback Strategies

### Quick Rollback

Revert to previous version:

```bash
#!/bin/bash
# scripts/rollback.sh

ENVIRONMENT=$1
BACKUP_FILE=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./rollback.sh <environment> <backup-file>"
  exit 1
fi

echo "Rolling back $ENVIRONMENT to $BACKUP_FILE..."

# Import previous state
atakora import --var environment=$ENVIRONMENT --file=$BACKUP_FILE

# Deploy previous state
atakora deploy --var environment=$ENVIRONMENT

echo "✓ Rollback complete"
```

### Git-Based Rollback

Revert to previous commit:

```bash
#!/bin/bash
# scripts/rollback-git.sh

ENVIRONMENT=$1
COMMIT=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$COMMIT" ]; then
  echo "Usage: ./rollback-git.sh <environment> <commit-sha>"
  exit 1
fi

# Checkout previous commit
git checkout $COMMIT

# Deploy
atakora deploy --var environment=$ENVIRONMENT

# Return to latest
git checkout -

echo "✓ Rolled back $ENVIRONMENT to commit $COMMIT"
```

### Blue-Green Deployment

Deploy new version alongside current:

```typescript
export class BlueGreenStack extends Stack {
  constructor(environment: string, version: 'blue' | 'green') {
    super(`webapp-${environment}-${version}`);

    const config = getConfig(environment);

    const rg = new ResourceGroup(this, `rg-${version}`, {
      location: config.location,
      tags: {
        ...config.tags,
        version
      }
    });

    const plan = new AppServicePlan(this, `plan-${version}`, {
      resourceGroup: rg,
      location: config.location,
      sku: config.appService.sku
    });

    const webApp = new WebApp(this, `webapp-${version}`, {
      resourceGroup: rg,
      location: config.location,
      serverFarmId: plan.id,
      tags: {
        ...config.tags,
        version
      }
    });

    // Traffic manager for switching
    const trafficManager = new TrafficManagerProfile(this, 'tm', {
      resourceGroup: rg,
      location: 'global',
      properties: {
        trafficRoutingMethod: 'Weighted',
        endpoints: [
          {
            name: 'blue',
            type: 'Microsoft.Network/trafficManagerProfiles/azureEndpoints',
            properties: {
              targetResourceId: webApp.id,
              weight: version === 'blue' ? 100 : 0
            }
          },
          {
            name: 'green',
            type: 'Microsoft.Network/trafficManagerProfiles/azureEndpoints',
            properties: {
              targetResourceId: webApp.id,
              weight: version === 'green' ? 100 : 0
            }
          }
        ]
      }
    });
  }
}
```

## Common Patterns

### Environment-Specific Resources

Create resources only in certain environments:

```typescript
export class ConditionalStack extends Stack {
  constructor(environment: string) {
    super(`app-${environment}`);

    const config = getConfig(environment);

    // Always create
    const webApp = new WebApp(this, 'webapp', {
      // ...
    });

    // Production only
    if (config.environment === 'production') {
      const cdn = new CdnProfile(this, 'cdn', {
        // ...
      });

      const frontDoor = new FrontDoor(this, 'frontdoor', {
        // ...
      });
    }

    // Non-production only
    if (config.environment !== 'production') {
      const testStorage = new StorageAccount(this, 'test-storage', {
        // ...
      });
    }
  }
}
```

### Environment Parity

Ensure environments are similar:

```typescript
export function validateEnvironmentParity(
  env1: EnvironmentConfig,
  env2: EnvironmentConfig
): string[] {
  const differences: string[] = [];

  // Check resource types match
  if (env1.appService.sku.tier !== env2.appService.sku.tier.replace('Premium', 'Basic')) {
    differences.push(`SKU tier mismatch: ${env1.appService.sku.tier} vs ${env2.appService.sku.tier}`);
  }

  // Check features match
  const env1Features = Object.keys(env1).sort();
  const env2Features = Object.keys(env2).sort();

  if (JSON.stringify(env1Features) !== JSON.stringify(env2Features)) {
    differences.push('Feature set mismatch');
  }

  return differences;
}
```

## Best Practices

### 1. Consistent Naming

```typescript
// ✅ Good: Consistent naming across environments
const resourceName = `webapp-${config.environment}`;

// ❌ Avoid: Inconsistent naming
const resourceName = config.environment === 'prod' ? 'webapp' : 'webapp-dev';
```

### 2. Environment Isolation

```typescript
// ✅ Good: Separate resource groups per environment
const rg = new ResourceGroup(this, 'rg', {
  location: config.location,
  name: `rg-${config.environment}`
});

// ❌ Avoid: Shared resource group
const rg = new ResourceGroup(this, 'rg', {
  location: 'eastus',
  name: 'rg-shared'
});
```

### 3. Progressive Rollout

Deploy to environments sequentially, not all at once.

### 4. Automated Testing

Test each environment after deployment.

### 5. Change Documentation

Document what changes in each deployment.

## Next Steps

- **[Managing Secrets](./managing-secrets.md)**: Secure environment-specific secrets
- **[Testing Infrastructure](./testing-infrastructure.md)**: Test across environments
- **[CI/CD Integration](../tutorials/cicd-integration.md)**: Automate deployments

## Related Documentation

- [Core Concepts](../core-concepts/README.md) - Understanding stacks and synthesis
- [CLI Reference](../../reference/cli/README.md) - Deployment commands
- [Troubleshooting](../../troubleshooting/deployment-failures.md) - Deployment issues

---

**Feedback**: Found an issue or have a suggestion? [Open an issue](https://github.com/your-org/atakora/issues) on GitHub.
