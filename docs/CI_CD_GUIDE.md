# CI/CD Integration Guide

## Table of Contents

- [Overview](#overview)
- [GitHub Actions Integration](#github-actions-integration)
- [Azure DevOps Integration](#azure-devops-integration)
- [GitLab CI Integration](#gitlab-ci-integration)
- [Local Development Workflow](#local-development-workflow)
- [Deployment Strategies](#deployment-strategies)
- [Environment Management](#environment-management)
- [Secrets Management](#secrets-management)
- [Best Practices](#best-practices)

## Overview

This guide provides examples and best practices for integrating atakora into various CI/CD pipelines. The library supports multiple deployment workflows and can be integrated with any modern CI/CD platform.

### CI/CD Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Code Changes                                             │
│    - Developer modifies infrastructure code                 │
│    - Commits to feature branch                              │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Continuous Integration (CI)                              │
│    - Run quality checks (lint, typecheck, format)           │
│    - Run unit tests                                         │
│    - Run integration tests                                  │
│    - Generate code coverage report                          │
│    - Build packages                                         │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Synthesis & Validation                                   │
│    - Synthesize ARM templates                               │
│    - Validate template syntax                               │
│    - Run ARM template validation (what-if)                  │
│    - Check for breaking changes                             │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Deployment (Continuous Deployment)                       │
│    - Deploy to dev environment (automatic)                  │
│    - Deploy to staging (manual approval)                    │
│    - Deploy to production (manual approval)                 │
└─────────────────────────────────────────────────────────────┘
```

## GitHub Actions Integration

### Complete CI/CD Workflow

**File**: `.github/workflows/infrastructure.yml`

```yaml
name: Infrastructure CI/CD

on:
  push:
    branches: [main, develop]
    paths:
      - 'packages/**'
      - 'infrastructure/**'
  pull_request:
    branches: [main, develop]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - dev
          - staging
          - production

env:
  NODE_VERSION: '20.x'
  AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS }}

jobs:
  quality:
    name: Code Quality Checks
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check formatting
        run: npm run format:check

      - name: Lint code
        run: npm run lint

      - name: Type check
        run: npm run typecheck

  test:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    needs: quality

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npm run build

      - name: Run tests
        run: npm test

      - name: Generate coverage
        run: npm run coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
        continue-on-error: true

  synthesize:
    name: Synthesize ARM Templates
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npm run build

      - name: Synthesize infrastructure
        run: |
          cd infrastructure
          npm run synth

      - name: Upload ARM templates
        uses: actions/upload-artifact@v4
        with:
          name: arm-templates
          path: infrastructure/arm.out/
          retention-days: 30

  validate:
    name: Validate ARM Templates
    runs-on: ubuntu-latest
    needs: synthesize
    if: github.event_name == 'pull_request'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Download ARM templates
        uses: actions/download-artifact@v4
        with:
          name: arm-templates
          path: arm.out/

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Validate ARM templates
        uses: azure/arm-deploy@v1
        with:
          scope: subscription
          subscriptionId: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
          region: eastus
          template: arm.out/foundation.template.json
          parameters: arm.out/foundation.parameters.json
          deploymentMode: Validate

      - name: Run What-If analysis
        run: |
          az deployment sub what-if \
            --location eastus \
            --template-file arm.out/foundation.template.json \
            --parameters arm.out/foundation.parameters.json

  deploy-dev:
    name: Deploy to Development
    runs-on: ubuntu-latest
    needs: [synthesize, validate]
    if: github.ref == 'refs/heads/develop'
    environment:
      name: development
      url: https://portal.azure.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npm run build

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS_DEV }}

      - name: Deploy infrastructure
        run: |
          cd infrastructure
          npm run deploy -- --environment dev

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [synthesize, validate]
    if: github.ref == 'refs/heads/main'
    environment:
      name: staging
      url: https://portal.azure.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npm run build

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS_STAGING }}

      - name: Deploy infrastructure
        run: |
          cd infrastructure
          npm run deploy -- --environment staging

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://portal.azure.com

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npm run build

      - name: Azure Login
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS_PROD }}

      - name: Deploy infrastructure
        run: |
          cd infrastructure
          npm run deploy -- --environment production

      - name: Create deployment tag
        run: |
          git tag -a "deploy-prod-$(date +%Y%m%d-%H%M%S)" -m "Production deployment"
          git push origin --tags
```

### Pull Request Workflow

**File**: `.github/workflows/pr-checks.yml`

```yaml
name: Pull Request Checks

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  pr-quality:
    name: PR Quality Gate
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run quality checks
        run: npm run quality

      - name: Build
        run: npm run build

      - name: Run tests
        run: npm test

      - name: Check coverage
        run: npm run coverage

      - name: Comment coverage on PR
        uses: romeovs/lcov-reporter-action@v0.3.1
        with:
          lcov-file: ./coverage/lcov.info
          github-token: ${{ secrets.GITHUB_TOKEN }}
        continue-on-error: true
```

### Infrastructure Change Detection

**File**: `.github/workflows/infrastructure-diff.yml`

```yaml
name: Infrastructure Diff

on:
  pull_request:
    paths:
      - 'infrastructure/**'
      - 'packages/lib/src/**'

jobs:
  diff:
    name: Show Infrastructure Changes
    runs-on: ubuntu-latest

    steps:
      - name: Checkout PR branch
        uses: actions/checkout@v4
        with:
          path: pr

      - name: Checkout base branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.base_ref }}
          path: base

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
          cache-dependency-path: pr/package-lock.json

      - name: Install dependencies (PR)
        run: |
          cd pr
          npm ci

      - name: Install dependencies (base)
        run: |
          cd base
          npm ci

      - name: Build and synth PR branch
        run: |
          cd pr
          npm run build
          cd infrastructure
          npm run synth

      - name: Build and synth base branch
        run: |
          cd base
          npm run build
          cd infrastructure
          npm run synth

      - name: Compare ARM templates
        run: |
          diff -u base/infrastructure/arm.out/ pr/infrastructure/arm.out/ > diff.txt || true

      - name: Comment diff on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const diff = fs.readFileSync('diff.txt', 'utf8');

            const body = `## Infrastructure Changes\n\n\`\`\`diff\n${diff}\n\`\`\``;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

## Azure DevOps Integration

### Pipeline Configuration

**File**: `azure-pipelines.yml`

```yaml
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    include:
      - packages/**
      - infrastructure/**

pr:
  branches:
    include:
      - main
      - develop

variables:
  nodeVersion: '20.x'
  azureServiceConnection: 'atakora-connection'

stages:
  - stage: Quality
    displayName: 'Code Quality'
    jobs:
      - job: QualityChecks
        displayName: 'Quality Checks'
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(nodeVersion)
            displayName: 'Install Node.js'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npm run format:check
            displayName: 'Check formatting'

          - script: npm run lint
            displayName: 'Lint code'

          - script: npm run typecheck
            displayName: 'Type check'

  - stage: Test
    displayName: 'Test'
    dependsOn: Quality
    jobs:
      - job: UnitTests
        displayName: 'Unit Tests'
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(nodeVersion)
            displayName: 'Install Node.js'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npm run build
            displayName: 'Build packages'

          - script: npm test
            displayName: 'Run tests'

          - script: npm run coverage
            displayName: 'Generate coverage'

          - task: PublishCodeCoverageResults@1
            inputs:
              codeCoverageTool: 'Cobertura'
              summaryFileLocation: '$(System.DefaultWorkingDirectory)/coverage/cobertura-coverage.xml'
            displayName: 'Publish coverage'

  - stage: Synthesize
    displayName: 'Synthesize ARM Templates'
    dependsOn: Test
    jobs:
      - job: SynthTemplates
        displayName: 'Synthesize Templates'
        pool:
          vmImage: 'ubuntu-latest'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(nodeVersion)
            displayName: 'Install Node.js'

          - script: npm ci
            displayName: 'Install dependencies'

          - script: npm run build
            displayName: 'Build packages'

          - script: |
              cd infrastructure
              npm run synth
            displayName: 'Synthesize infrastructure'

          - task: PublishPipelineArtifact@1
            inputs:
              targetPath: 'infrastructure/arm.out'
              artifact: 'arm-templates'
            displayName: 'Publish ARM templates'

  - stage: DeployDev
    displayName: 'Deploy to Development'
    dependsOn: Synthesize
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/develop'))
    jobs:
      - deployment: DeployDevelopment
        displayName: 'Deploy Development'
        pool:
          vmImage: 'ubuntu-latest'
        environment: 'development'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: NodeTool@0
                  inputs:
                    versionSpec: $(nodeVersion)
                  displayName: 'Install Node.js'

                - script: npm ci
                  displayName: 'Install dependencies'

                - script: npm run build
                  displayName: 'Build packages'

                - task: AzureCLI@2
                  inputs:
                    azureSubscription: $(azureServiceConnection)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      cd infrastructure
                      npm run deploy -- --environment dev
                  displayName: 'Deploy infrastructure'

  - stage: DeployProd
    displayName: 'Deploy to Production'
    dependsOn: Synthesize
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployProduction
        displayName: 'Deploy Production'
        pool:
          vmImage: 'ubuntu-latest'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: NodeTool@0
                  inputs:
                    versionSpec: $(nodeVersion)
                  displayName: 'Install Node.js'

                - script: npm ci
                  displayName: 'Install dependencies'

                - script: npm run build
                  displayName: 'Build packages'

                - task: AzureCLI@2
                  inputs:
                    azureSubscription: $(azureServiceConnection)
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      cd infrastructure
                      npm run deploy -- --environment production
                  displayName: 'Deploy infrastructure'
```

## GitLab CI Integration

### Pipeline Configuration

**File**: `.gitlab-ci.yml`

```yaml
image: node:20

stages:
  - quality
  - test
  - synthesize
  - deploy-dev
  - deploy-staging
  - deploy-prod

variables:
  npm_config_cache: '$CI_PROJECT_DIR/.npm'

cache:
  paths:
    - .npm
    - node_modules

before_script:
  - npm ci

quality:formatting:
  stage: quality
  script:
    - npm run format:check
  only:
    - merge_requests
    - main
    - develop

quality:lint:
  stage: quality
  script:
    - npm run lint
  only:
    - merge_requests
    - main
    - develop

quality:typecheck:
  stage: quality
  script:
    - npm run typecheck
  only:
    - merge_requests
    - main
    - develop

test:unit:
  stage: test
  script:
    - npm run build
    - npm test
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
  only:
    - merge_requests
    - main
    - develop

synthesize:templates:
  stage: synthesize
  script:
    - npm run build
    - cd infrastructure
    - npm run synth
  artifacts:
    paths:
      - infrastructure/arm.out/
    expire_in: 30 days
  only:
    - merge_requests
    - main
    - develop

deploy:development:
  stage: deploy-dev
  script:
    - npm run build
    - cd infrastructure
    - npm run deploy -- --environment dev
  environment:
    name: development
    url: https://portal.azure.com
  only:
    - develop
  when: manual

deploy:staging:
  stage: deploy-staging
  script:
    - npm run build
    - cd infrastructure
    - npm run deploy -- --environment staging
  environment:
    name: staging
    url: https://portal.azure.com
  only:
    - main
  when: manual

deploy:production:
  stage: deploy-prod
  script:
    - npm run build
    - cd infrastructure
    - npm run deploy -- --environment production
  environment:
    name: production
    url: https://portal.azure.com
  only:
    - main
  when: manual
```

## Local Development Workflow

### Pre-Commit Hooks

**File**: `.husky/pre-commit`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint-staged
```

**File**: `.husky/pre-push`

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run test
```

### Development Scripts

**File**: `package.json` (scripts section)

```json
{
  "scripts": {
    "dev": "npm run build && npm run synth:watch",
    "synth:watch": "cd infrastructure && npm run synth -- --watch",
    "deploy:dev": "npm run build && cd infrastructure && npm run deploy -- --environment dev",
    "deploy:local": "npm run synth && npm run validate:local",
    "validate:local": "cd infrastructure && npm run validate",
    "diff": "cd infrastructure && npm run diff"
  }
}
```

## Deployment Strategies

### Blue-Green Deployment

```yaml
# .github/workflows/blue-green-deploy.yml
name: Blue-Green Deployment

on:
  workflow_dispatch:
    inputs:
      environment:
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  deploy-green:
    name: Deploy Green Environment
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Install and build
        run: |
          npm ci
          npm run build

      - name: Deploy green stack
        run: |
          cd infrastructure
          npm run deploy -- --environment ${{ inputs.environment }} --stack green

  test-green:
    name: Test Green Environment
    needs: deploy-green
    runs-on: ubuntu-latest
    steps:
      - name: Run smoke tests
        run: |
          # Run smoke tests against green environment
          npm run test:smoke -- --environment ${{ inputs.environment }} --stack green

  switch-traffic:
    name: Switch Traffic to Green
    needs: test-green
    runs-on: ubuntu-latest
    steps:
      - name: Update traffic manager
        run: |
          # Switch traffic from blue to green
          az network traffic-manager endpoint update \
            --name green \
            --profile-name ${{ inputs.environment }}-tm \
            --resource-group ${{ inputs.environment }}-rg \
            --type azureEndpoints \
            --priority 1

  cleanup-blue:
    name: Cleanup Blue Environment
    needs: switch-traffic
    runs-on: ubuntu-latest
    steps:
      - name: Delete blue stack
        run: |
          cd infrastructure
          npm run destroy -- --environment ${{ inputs.environment }} --stack blue
```

### Canary Deployment

```yaml
# .github/workflows/canary-deploy.yml
name: Canary Deployment

on:
  workflow_dispatch:
    inputs:
      traffic_percentage:
        description: 'Percentage of traffic to canary'
        required: true
        default: '10'

jobs:
  deploy-canary:
    name: Deploy Canary
    runs-on: ubuntu-latest
    steps:
      - name: Deploy canary stack
        run: |
          cd infrastructure
          npm run deploy -- --environment production --stack canary

      - name: Route traffic to canary
        run: |
          # Route specified percentage to canary
          az network application-gateway rule update \
            --gateway-name prod-agw \
            --resource-group prod-rg \
            --name canary-rule \
            --priority 100 \
            --rule-type PathBasedRouting \
            --http-settings canary-settings \
            --address-pool canary-pool

  monitor-canary:
    name: Monitor Canary
    needs: deploy-canary
    runs-on: ubuntu-latest
    steps:
      - name: Monitor metrics
        run: |
          # Monitor error rate, latency, etc.
          # Automatically rollback if metrics exceed thresholds
          npm run monitor:canary -- --duration 30m --threshold 5%

  promote-canary:
    name: Promote Canary
    needs: monitor-canary
    runs-on: ubuntu-latest
    steps:
      - name: Route all traffic to canary
        run: |
          # Route 100% traffic to canary
          # Then make canary the new production
```

## Environment Management

### Environment Configuration

**File**: `infrastructure/environments/dev.ts`

```typescript
import { EnvironmentConfig } from './types';

export const devConfig: EnvironmentConfig = {
  environment: 'nonprod',
  region: 'eastus',
  instance: 1,

  subscription: {
    id: process.env.AZURE_DEV_SUBSCRIPTION_ID!,
  },

  tags: {
    environment: 'development',
    cost_center: '1234',
    managed_by: 'atakora',
  },

  features: {
    enableMonitoring: true,
    enableBackups: false,
    enableHighAvailability: false,
  },

  sizing: {
    vmSize: 'Standard_B2s',
    storageTier: 'Standard_LRS',
  },
};
```

**File**: `infrastructure/environments/production.ts`

```typescript
import { EnvironmentConfig } from './types';

export const productionConfig: EnvironmentConfig = {
  environment: 'production',
  region: 'eastus',
  instance: 1,

  subscription: {
    id: process.env.AZURE_PROD_SUBSCRIPTION_ID!,
  },

  tags: {
    environment: 'production',
    cost_center: '1234',
    managed_by: 'atakora',
  },

  features: {
    enableMonitoring: true,
    enableBackups: true,
    enableHighAvailability: true,
  },

  sizing: {
    vmSize: 'Standard_D4s_v3',
    storageTier: 'Premium_LRS',
  },
};
```

## Secrets Management

### Azure Key Vault Integration

```typescript
// infrastructure/secrets.ts
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

export async function loadSecrets(environment: string) {
  const credential = new DefaultAzureCredential();
  const vaultUrl = `https://kv-${environment}.vault.azure.net`;
  const client = new SecretClient(vaultUrl, credential);

  const secrets = {
    databasePassword: await client.getSecret('db-password'),
    apiKey: await client.getSecret('api-key'),
    // ... more secrets
  };

  return secrets;
}
```

### GitHub Secrets Setup

Required secrets in GitHub repository settings:

```
AZURE_CREDENTIALS_DEV
AZURE_CREDENTIALS_STAGING
AZURE_CREDENTIALS_PROD
AZURE_SUBSCRIPTION_ID
AZURE_TENANT_ID
AZURE_CLIENT_ID
AZURE_CLIENT_SECRET
```

### Azure DevOps Variable Groups

```yaml
# Reference variable group in pipeline
variables:
  - group: 'atakora-dev'
  - group: 'atakora-shared'
```

## Best Practices

### 1. Separate Infrastructure Code

Keep infrastructure definitions separate from library code:

```
atakora/
├── packages/           # Library code
│   ├── lib/
│   ├── cli/
│   └── color/
└── infrastructure/     # Infrastructure definitions
    ├── src/
    │   ├── foundation.ts
    │   ├── networking.ts
    │   └── application.ts
    ├── environments/
    └── package.json
```

### 2. Use Environment-Specific Configuration

Never hardcode environment-specific values:

```typescript
// Bad
const rg = new ResourceGroup(stack, 'RG', {
  location: 'eastus',  // Hardcoded
});

// Good
const rg = new ResourceGroup(stack, 'RG', {
  location: config.region,  // From environment config
});
```

### 3. Version Lock Dependencies

Use exact versions in `package-lock.json`:

```json
{
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "@atakora/lib": {
      "version": "1.0.0",
      "resolved": "...",
      "integrity": "..."
    }
  }
}
```

### 4. Validate Before Deploy

Always run validation in CI/CD:

```yaml
- name: Validate ARM templates
  run: |
    az deployment sub validate \
      --location ${{ env.REGION }} \
      --template-file arm.out/main.template.json \
      --parameters arm.out/main.parameters.json
```

### 5. Use What-If for Change Preview

Show changes before deployment:

```yaml
- name: Preview changes
  run: |
    az deployment sub what-if \
      --location ${{ env.REGION }} \
      --template-file arm.out/main.template.json \
      --parameters arm.out/main.parameters.json
```

### 6. Tag All Resources

Ensure proper tagging for cost tracking:

```typescript
const stack = new SubscriptionStack(app, 'Stack', {
  tags: {
    environment: process.env.ENVIRONMENT,
    cost_center: process.env.COST_CENTER,
    managed_by: 'atakora',
    git_commit: process.env.GITHUB_SHA,
    deployed_by: process.env.GITHUB_ACTOR,
  },
});
```

### 7. Implement Rollback Strategy

Have a plan for rolling back failed deployments:

```yaml
- name: Deploy with rollback
  run: |
    az deployment sub create \
      --location ${{ env.REGION }} \
      --template-file arm.out/main.template.json \
      --parameters arm.out/main.parameters.json \
      --rollback-on-error
```

### 8. Monitor Deployments

Track deployment status and metrics:

```yaml
- name: Send deployment notification
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Deployment to ${{ env.ENVIRONMENT }} completed'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Related Documentation

- [Architecture Guide](./ARCHITECTURE.md)
- [Best Practices](./BEST_PRACTICES.md)
- [Naming Conventions](./NAMING_CONVENTIONS.md)

---

**Maintained by**: Team Azure ARM Priv
**Last Updated**: 2025-10-04
