# CI/CD Problems

**Navigation**: [Docs Home](../README.md) > [Troubleshooting](./README.md) > CI/CD Problems

---

## Overview

This guide helps you troubleshoot CI/CD pipeline issues.

## Common CI/CD Issues

### Authentication Failures

**Error**:
```
Error: Authentication failed in pipeline
```

**Solutions**:

1. **Check secrets/variables**:
   ```yaml
   # GitHub Actions: Verify secrets are set
   # Settings → Secrets and variables → Actions

   # Azure DevOps: Verify variables
   # Pipelines → Edit → Variables
   ```

2. **Use correct secret names**:
   ```yaml
   env:
     AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
     AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
     AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
     AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
   ```

3. **Verify service principal**:
   ```bash
   az login --service-principal \
     --username $AZURE_CLIENT_ID \
     --password $AZURE_CLIENT_SECRET \
     --tenant $AZURE_TENANT_ID
   ```

### Build Failures

**Error**:
```
npm ERR! code E404
npm ERR! 404 Not Found - GET https://registry.npmjs.org/@atakora/lib
```

**Solutions**:

1. **Install dependencies**:
   ```yaml
   - name: Install dependencies
     run: npm ci  # Use 'ci' not 'install' in CI
   ```

2. **Use correct Node version**:
   ```yaml
   - name: Setup Node
     uses: actions/setup-node@v3
     with:
       node-version: '18'
   ```

3. **Clear cache**:
   ```yaml
   - name: Clear npm cache
     run: npm cache clean --force
   ```

### Synthesis Failures

**Error**:
```
Synthesis failed: TypeScript compilation error
```

**Solutions**:

1. **Run build before synthesis**:
   ```yaml
   - name: Build
     run: npm run build

   - name: Synthesize
     run: atakora synth
   ```

2. **Check TypeScript version**:
   ```yaml
   - name: Install
     run: npm ci

   # Verify versions
   - name: Versions
     run: |
       node --version
       npm --version
       npx tsc --version
   ```

### Deployment Failures

**Error**:
```
Deployment failed: Resource already exists
```

**Solutions**:

1. **Use unique resource names**:
   ```typescript
   // Include timestamp or run number
   const storage = new StorageAccount(this, 'Storage', {
     name: `stapp${process.env.RUN_NUMBER}`
   });
   ```

2. **Clean up before deployment**:
   ```yaml
   - name: Cleanup
     run: |
       az group delete \
         --name rg-myapp-dev-eastus \
         --yes --no-wait

   - name: Deploy
     run: atakora deploy --no-confirm
   ```

### Timeout Issues

**Error**:
```
Error: The job running on runner has exceeded the maximum execution time
```

**Solutions**:

1. **Increase timeout**:
   ```yaml
   jobs:
     deploy:
       timeout-minutes: 60  # Default is 360
   ```

2. **Deploy asynchronously**:
   ```yaml
   - name: Deploy
     run: atakora deploy --no-wait
   ```

## Pipeline Configuration

### GitHub Actions

```yaml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install
        run: npm ci

      - name: Build
        run: npm run build

      - name: Synthesize
        run: atakora synth

      - name: Deploy
        env:
          AZURE_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          AZURE_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          AZURE_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
          AZURE_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
        run: atakora deploy --no-confirm --verbose
```

### Azure DevOps

```yaml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
    displayName: 'Install Node.js'

  - script: npm ci
    displayName: 'Install dependencies'

  - script: npm run build
    displayName: 'Build'

  - script: atakora synth
    displayName: 'Synthesize'

  - task: AzureCLI@2
    inputs:
      azureSubscription: 'Production'
      scriptType: 'bash'
      scriptLocation: 'inlineScript'
      inlineScript: |
        atakora deploy --no-confirm --verbose
    displayName: 'Deploy'
```

## Debugging Pipelines

### Enable Verbose Logging

```yaml
- name: Deploy
  run: atakora deploy --verbose
```

### Save Artifacts

```yaml
- name: Upload ARM Templates
  uses: actions/upload-artifact@v3
  with:
    name: arm-templates
    path: .atakora/arm.out/
```

### Add Debugging Steps

```yaml
- name: Debug Info
  run: |
    echo "Node: $(node --version)"
    echo "npm: $(npm --version)"
    echo "PWD: $(pwd)"
    ls -la .atakora/
    cat .atakora/manifest.json
```

## See Also

- [Common Issues](./common-issues.md)
- [CI/CD Tutorial](../guides/tutorials/ci-cd-pipeline.md)
- [Deployment Failures](./deployment-failures.md)

---

**Last Updated**: 2025-10-08
