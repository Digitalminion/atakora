# Tutorial: CI/CD Pipeline Integration

[Getting Started](../../getting-started/README.md) > [Guides](../README.md) > [Tutorials](./README.md) > CI/CD Pipeline

Learn how to automate your infrastructure deployments with GitHub Actions, Azure DevOps, and GitLab CI/CD pipelines.

## What You'll Build

A complete CI/CD pipeline that:

- **Validates** infrastructure code on every pull request
- **Tests** ARM templates for errors
- **Previews** changes with diff output
- **Deploys** to multiple environments (dev, staging, production)
- **Implements** approval gates for production
- **Rollback** capability on deployment failures
- **Notifies** team of deployment status

## Architecture

```
┌──────────────┐
│  Git Commit  │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌─────────────────┐
│  PR Created  │────→│  Validate       │
└──────────────┘     │  - Lint         │
       │             │  - Synth        │
       │             │  - Test         │
       ▼             └─────────────────┘
┌──────────────┐
│  PR Merged   │
└──────┬───────┘
       │
       ├──→ ┌─────────────────┐
       │    │  Deploy Dev     │ (automatic)
       │    └─────────────────┘
       │
       ├──→ ┌─────────────────┐
       │    │  Deploy Staging │ (automatic)
       │    └─────────────────┘
       │
       └──→ ┌─────────────────┐
            │  Deploy Prod    │ (manual approval)
            └─────────────────┘
```

## GitHub Actions Pipeline

### Prerequisites

```bash
# Create Azure service principal
az ad sp create-for-rbac \
  --name "github-actions-atakora" \
  --role Contributor \
  --scopes /subscriptions/{subscription-id} \
  --sdk-auth

# Store output as GitHub secret: AZURE_CREDENTIALS
```

### Workflow File

Create `.github/workflows/infrastructure.yml`:

```yaml
name: Infrastructure Deployment

on:
  pull_request:
    branches: [main]
    paths:
      - 'infrastructure/**'
      - '.github/workflows/infrastructure.yml'
  push:
    branches: [main]
    paths:
      - 'infrastructure/**'
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
  NODE_VERSION: '18.x'
  WORKING_DIRECTORY: './infrastructure'

jobs:
  # Job 1: Validate and test infrastructure code
  validate:
    name: Validate Infrastructure
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: ${{ env.WORKING_DIRECTORY }}/package-lock.json

      - name: Install dependencies
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: npm ci

      - name: Lint code
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: npm run lint

      - name: Run tests
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: npm test

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Synthesize ARM templates
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: npm run synth

      - name: Validate templates
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: npx atakora validate

      - name: Upload ARM templates
        uses: actions/upload-artifact@v4
        with:
          name: arm-templates
          path: ${{ env.WORKING_DIRECTORY }}/arm.out/
          retention-days: 7

  # Job 2: Preview changes on PRs
  preview:
    name: Preview Changes
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: validate
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: npm ci

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Generate diff
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: |
          npx atakora diff --all > diff-output.txt 2>&1 || true
          cat diff-output.txt

      - name: Comment PR with diff
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const diff = fs.readFileSync('${{ env.WORKING_DIRECTORY }}/diff-output.txt', 'utf8');

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Infrastructure Changes\n\n\`\`\`\n${diff}\n\`\`\``
            });

  # Job 3: Deploy to development
  deploy-dev:
    name: Deploy to Development
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: validate
    environment:
      name: development
      url: https://webapp-dev.azurewebsites.net
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: npm ci

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Set environment
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: echo "ENVIRONMENT=dev" >> $GITHUB_ENV

      - name: Deploy infrastructure
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: |
          npm run synth
          npx atakora deploy --auto-approve --verbose

      - name: Run smoke tests
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: npm run test:smoke -- --env=dev

  # Job 4: Deploy to staging
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    needs: deploy-dev
    environment:
      name: staging
      url: https://webapp-staging.azurewebsites.net
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: npm ci

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Set environment
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: echo "ENVIRONMENT=staging" >> $GITHUB_ENV

      - name: Deploy infrastructure
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: |
          npm run synth
          npx atakora deploy --auto-approve --verbose

      - name: Run integration tests
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: npm run test:integration -- --env=staging

  # Job 5: Deploy to production
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch')
    needs: deploy-staging
    environment:
      name: production
      url: https://webapp-prod.azurewebsites.net
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install dependencies
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: npm ci

      - name: Login to Azure
        uses: azure/login@v1
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Set environment
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: echo "ENVIRONMENT=production" >> $GITHUB_ENV

      - name: Create backup
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: |
          TIMESTAMP=$(date +%Y%m%d-%H%M%S)
          mkdir -p backups
          cp -r arm.out "backups/backup-$TIMESTAMP"

      - name: Deploy infrastructure
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: |
          npm run synth
          npx atakora deploy --require-approval --verbose

      - name: Verify deployment
        working-directory: ${{ env.WORKING_DIRECTORY }}
        run: npm run test:smoke -- --env=production

      - name: Notify team
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Production deployment ${{ job.status }}",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "Production deployment *${{ job.status }}*\nCommit: ${{ github.sha }}\nActor: ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### Setting Up GitHub Secrets

```bash
# Required secrets in GitHub repository settings:
# - AZURE_CREDENTIALS (service principal JSON)
# - SLACK_WEBHOOK (optional, for notifications)
```

## Azure DevOps Pipeline

### Service Connection

1. Go to **Project Settings** > **Service Connections**
2. Create **Azure Resource Manager** connection
3. Name it `azure-production`
4. Grant access to all pipelines

### Pipeline YAML

Create `azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main
  paths:
    include:
      - infrastructure/**

pr:
  branches:
    include:
      - main
  paths:
    include:
      - infrastructure/**

pool:
  vmImage: 'ubuntu-latest'

variables:
  nodeVersion: '18.x'
  workingDirectory: 'infrastructure'

stages:
  - stage: Validate
    displayName: 'Validate Infrastructure'
    jobs:
      - job: ValidateJob
        displayName: 'Validate and Test'
        steps:
          - task: NodeTool@0
            inputs:
              versionSpec: $(nodeVersion)
            displayName: 'Install Node.js'

          - script: |
              cd $(workingDirectory)
              npm ci
            displayName: 'Install dependencies'

          - script: |
              cd $(workingDirectory)
              npm run lint
            displayName: 'Lint code'

          - script: |
              cd $(workingDirectory)
              npm test
            displayName: 'Run tests'

          - task: AzureCLI@2
            inputs:
              azureSubscription: 'azure-production'
              scriptType: 'bash'
              scriptLocation: 'inlineScript'
              inlineScript: |
                cd $(workingDirectory)
                npm run synth
                npx atakora validate
            displayName: 'Synthesize and validate'

          - task: PublishBuildArtifacts@1
            inputs:
              pathToPublish: '$(workingDirectory)/arm.out'
              artifactName: 'arm-templates'
            displayName: 'Publish ARM templates'

  - stage: DeployDev
    displayName: 'Deploy to Development'
    dependsOn: Validate
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: DeployDevJob
        displayName: 'Deploy Dev Environment'
        environment: 'development'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: NodeTool@0
                  inputs:
                    versionSpec: $(nodeVersion)

                - task: DownloadBuildArtifacts@1
                  inputs:
                    artifactName: 'arm-templates'
                    downloadPath: '$(System.DefaultWorkingDirectory)'

                - task: AzureCLI@2
                  inputs:
                    azureSubscription: 'azure-production'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      cd $(workingDirectory)
                      export ENVIRONMENT=dev
                      npx atakora deploy --auto-approve
                  displayName: 'Deploy to dev'

  - stage: DeployStaging
    displayName: 'Deploy to Staging'
    dependsOn: DeployDev
    condition: succeeded()
    jobs:
      - deployment: DeployStagingJob
        displayName: 'Deploy Staging Environment'
        environment: 'staging'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: 'azure-production'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      cd $(workingDirectory)
                      export ENVIRONMENT=staging
                      npx atakora deploy --auto-approve
                  displayName: 'Deploy to staging'

  - stage: DeployProduction
    displayName: 'Deploy to Production'
    dependsOn: DeployStaging
    condition: succeeded()
    jobs:
      - deployment: DeployProductionJob
        displayName: 'Deploy Production Environment'
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: AzureCLI@2
                  inputs:
                    azureSubscription: 'azure-production'
                    scriptType: 'bash'
                    scriptLocation: 'inlineScript'
                    inlineScript: |
                      cd $(workingDirectory)
                      export ENVIRONMENT=production
                      npx atakora deploy --require-approval
                  displayName: 'Deploy to production'
```

## GitLab CI/CD Pipeline

Create `.gitlab-ci.yml`:

```yaml
image: node:18

variables:
  WORKING_DIR: infrastructure

stages:
  - validate
  - deploy-dev
  - deploy-staging
  - deploy-prod

before_script:
  - cd $WORKING_DIR
  - npm ci
  - curl -sL https://aka.ms/InstallAzureCLIDeb | bash
  - az login --service-principal -u $AZURE_CLIENT_ID -p $AZURE_CLIENT_SECRET --tenant $AZURE_TENANT_ID

validate:
  stage: validate
  script:
    - npm run lint
    - npm test
    - npm run synth
    - npx atakora validate
  artifacts:
    paths:
      - $WORKING_DIR/arm.out/
    expire_in: 1 week
  only:
    - merge_requests
    - main

deploy-dev:
  stage: deploy-dev
  script:
    - export ENVIRONMENT=dev
    - npx atakora deploy --auto-approve
  environment:
    name: development
    url: https://webapp-dev.azurewebsites.net
  only:
    - main

deploy-staging:
  stage: deploy-staging
  script:
    - export ENVIRONMENT=staging
    - npx atakora deploy --auto-approve
  environment:
    name: staging
    url: https://webapp-staging.azurewebsites.net
  only:
    - main
  when: manual

deploy-prod:
  stage: deploy-prod
  script:
    - export ENVIRONMENT=production
    - npx atakora deploy --require-approval
  environment:
    name: production
    url: https://webapp-prod.azurewebsites.net
  only:
    - main
  when: manual
```

## Best Practices

### 1. Use Separate Service Principals

```bash
# Development service principal
az ad sp create-for-rbac \
  --name "sp-atakora-dev" \
  --role Contributor \
  --scopes /subscriptions/{dev-sub-id}

# Production service principal (more restricted)
az ad sp create-for-rbac \
  --name "sp-atakora-prod" \
  --role Contributor \
  --scopes /subscriptions/{prod-sub-id}/resourceGroups/rg-prod
```

### 2. Implement Approval Gates

GitHub Actions:
```yaml
environment:
  name: production
  # Requires manual approval in GitHub environment settings
```

Azure DevOps:
- Go to **Environments** > **production**
- Add **Approvals** > Add required approvers

### 3. Use Matrix Builds for Multiple Regions

```yaml
jobs:
  deploy:
    strategy:
      matrix:
        region: [eastus2, westus2, centralus]
    steps:
      - name: Deploy to ${{ matrix.region }}
        run: |
          export AZURE_REGION=${{ matrix.region }}
          npx atakora deploy
```

### 4. Cache Dependencies

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### 5. Implement Rollback on Failure

```yaml
- name: Deploy infrastructure
  id: deploy
  run: npx atakora deploy --auto-approve
  continue-on-error: true

- name: Rollback on failure
  if: steps.deploy.outcome == 'failure'
  run: |
    echo "Deployment failed, rolling back..."
    git checkout HEAD~1
    npm run synth
    npx atakora deploy --auto-approve
```

### 6. Tag Deployments

```yaml
- name: Tag successful deployment
  if: success()
  run: |
    git tag -a "deploy-prod-$(date +%Y%m%d-%H%M%S)" -m "Production deployment"
    git push origin --tags
```

## Testing in CI/CD

### Unit Tests

```typescript
// infrastructure.test.ts
import { AzureApp, ResourceGroupStack } from '@atakora/lib';
import { StorageAccounts } from '@atakora/cdk/storage';

describe('Infrastructure Tests', () => {
  test('Storage account has correct SKU', () => {
    const app = new AzureApp({ organization: 'Test', project: 'Test' });
    const stack = new ResourceGroupStack(app, 'Test', {
      resourceGroupName: 'rg-test',
      location: 'eastus2',
    });

    const storage = new StorageAccounts(stack, 'Storage', {
      storageAccountName: 'sttest',
      sku: { name: 'Standard_GRS' },
      kind: 'StorageV2',
    });

    expect(storage.sku.name).toBe('Standard_GRS');
  });
});
```

### Smoke Tests

```javascript
// smoke-tests.js
const axios = require('axios');

async function smokeTest(environment) {
  const url = `https://webapp-${environment}.azurewebsites.net/health`;

  try {
    const response = await axios.get(url, { timeout: 10000 });

    if (response.status === 200) {
      console.log(`✓ ${environment} health check passed`);
      return true;
    }
  } catch (error) {
    console.error(`✗ ${environment} health check failed:`, error.message);
    process.exit(1);
  }
}

const env = process.argv[2] || 'dev';
smokeTest(env);
```

## Troubleshooting

### Authentication Failures

```bash
# Verify service principal
az ad sp show --id $AZURE_CLIENT_ID

# Test login
az login --service-principal \
  -u $AZURE_CLIENT_ID \
  -p $AZURE_CLIENT_SECRET \
  --tenant $AZURE_TENANT_ID
```

### Deployment Timeouts

```yaml
# Increase timeout
- name: Deploy infrastructure
  timeout-minutes: 60  # Default is 360 (6 hours)
  run: npx atakora deploy
```

### Artifact Upload Issues

```yaml
# Use v4 of upload-artifact
- uses: actions/upload-artifact@v4
  with:
    name: arm-templates
    path: infrastructure/arm.out/
    if-no-files-found: error
```

## See Also

- **[Deployment Guide](../fundamentals/deployment.md)** - Deployment fundamentals
- **[Testing Infrastructure](../workflows/testing-infrastructure.md)** - Testing strategies
- **[CI/CD Problems](../../troubleshooting/ci-cd-problems.md)** - Common CI/CD issues
- **[CLI deploy Command](../../reference/cli/deploy.md)** - Deploy command reference

---

**Congratulations!** You've set up automated infrastructure deployments with CI/CD.
